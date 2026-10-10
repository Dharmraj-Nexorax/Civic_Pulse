import crypto from 'crypto';
import { PoolClient } from '../lib/db';
import { validateTransition } from '../domain/stateMachine';
import { recommendWorkers, RecommendationResult } from '../domain/recommendation';
import { notifyIssueAssigned } from './notificationService';
import { notFound, validationError } from '../lib/errors';

export async function getAssignmentRecommendations(
  client: PoolClient,
  issueId: string,
  orgId: string
): Promise<RecommendationResult[]> {
  // 1. Fetch issue category & default team
  const { rows: issueRows } = await client.query<{
    category_id: string;
    default_team_id: string | null;
  }>(
    `SELECT i.category_id, c.default_team_id
     FROM issues i
     JOIN categories c ON c.id = i.category_id
     WHERE i.id = $1 AND i.organization_id = $2`,
    [issueId, orgId]
  );

  if (issueRows.length === 0) {
    throw notFound('Issue not found.');
  }
  const defaultTeamId = issueRows[0].default_team_id;

  // 2. Fetch all active workers in organization with team stats
  const { rows: workers } = await client.query<{
    worker_id: string;
    worker_name: string;
    team_id: string;
    team_name: string;
    is_active: boolean | number;
    active_issues: string | number;
    category_verified: string | number;
  }>(
    `SELECT u.id as worker_id, u.full_name as worker_name,
            t.id as team_id, t.name as team_name, u.is_active,
            (SELECT COUNT(*) FROM issues a
             WHERE a.assigned_worker_id = u.id
               AND a.status IN ('ASSIGNED', 'IN_PROGRESS', 'REOPENED')) as active_issues,
            (SELECT COUNT(*) FROM resolutions r
             JOIN issues ri ON ri.id = r.issue_id
             WHERE r.worker_id = u.id
               AND ri.category_id = $1
               AND r.citizen_decision = 'VERIFIED') as category_verified
     FROM users u
     JOIN teams t ON t.id = u.team_id
     WHERE u.organization_id = $2 AND u.role = 'WORKER' AND u.is_active = 1`,
    [issueRows[0].category_id, orgId]
  );

  // Compute team average active issues
  const teamMap = new Map<string, { totalActive: number; workerCount: number }>();
  for (const w of workers) {
    const act = parseInt(String(w.active_issues), 10);
    const curr = teamMap.get(w.team_id) || { totalActive: 0, workerCount: 0 };
    curr.totalActive += act;
    curr.workerCount += 1;
    teamMap.set(w.team_id, curr);
  }

  const candidates = workers.map((w) => {
    const teamStats = teamMap.get(w.team_id);
    const teamAvg = teamStats && teamStats.workerCount > 0
      ? teamStats.totalActive / teamStats.workerCount
      : 0;

    return {
      workerId: w.worker_id,
      workerName: w.worker_name,
      teamId: w.team_id,
      teamName: w.team_name,
      isActive: Boolean(w.is_active),
      activeIssuesCount: parseInt(String(w.active_issues), 10),
      teamAvgActiveIssues: teamAvg,
      categoryVerifiedCount: parseInt(String(w.category_verified), 10),
      workerScore: null, // Computed on read if available
    };
  });

  return recommendWorkers(candidates, defaultTeamId);
}

export interface AssignIssueOptions {
  issueId: string;
  orgId?: string;
  teamId: string;
  workerId: string;
  adminId: string;
  reassignReason?: string;
}

export async function assignIssue(
  client: PoolClient,
  issueIdOrOptions: string | AssignIssueOptions,
  orgIdParam?: string,
  teamIdParam?: string,
  workerIdParam?: string,
  adminIdParam?: string,
  reassignReasonParam?: string
): Promise<void> {
  let issueId: string;
  let orgId: string | undefined;
  let teamId: string;
  let workerId: string;
  let adminId: string;
  let reassignReason: string | undefined;

  if (typeof issueIdOrOptions === 'object') {
    issueId = issueIdOrOptions.issueId;
    orgId = issueIdOrOptions.orgId;
    teamId = issueIdOrOptions.teamId;
    workerId = issueIdOrOptions.workerId;
    adminId = issueIdOrOptions.adminId;
    reassignReason = issueIdOrOptions.reassignReason;
  } else {
    issueId = issueIdOrOptions;
    orgId = orgIdParam;
    teamId = teamIdParam!;
    workerId = workerIdParam!;
    adminId = adminIdParam!;
    reassignReason = reassignReasonParam;
  }

  const { rows: issueRows } = await client.query<{
    id: string;
    organization_id: string;
    status: any;
    title: string;
    priority_band: any;
    priority_override_band: any;
    assigned_worker_id: string | null;
  }>(
    orgId
      ? `SELECT id, organization_id, status, title, priority_band, priority_override_band, assigned_worker_id
         FROM issues WHERE id = $1 AND organization_id = $2 FOR UPDATE`
      : `SELECT id, organization_id, status, title, priority_band, priority_override_band, assigned_worker_id
         FROM issues WHERE id = $1 FOR UPDATE`,
    orgId ? [issueId, orgId] : [issueId]
  );

  if (issueRows.length === 0) {
    throw notFound('Issue not found.');
  }
  const issue = issueRows[0];
  orgId = issue.organization_id;
  const effectiveBand = issue.priority_override_band ?? issue.priority_band;

  // Validate worker and team
  const { rows: workerRows } = await client.query<{
    id: string;
    is_active: boolean | number;
    team_id: string;
    team_active: boolean | number;
  }>(
    `SELECT u.id, u.is_active, u.team_id, t.is_active as team_active
     FROM users u
     JOIN teams t ON t.id = u.team_id
     WHERE u.id = $1 AND u.organization_id = $2`,
    [workerId, orgId]
  );

  if (workerRows.length === 0) {
    throw validationError('Assigned worker not found.');
  }
  const worker = workerRows[0];

  validateTransition({
    fromStatus: issue.status,
    toStatus: 'ASSIGNED',
    actorRole: 'ADMIN',
    teamActive: Boolean(worker.team_active),
    workerActive: Boolean(worker.is_active),
    workerTeamIdMatches: worker.team_id === teamId,
    reassignReason,
  });

  // Get SLA hours setting
  const slaKey = `sla_hours.${effectiveBand}`;
  const { rows: slaRows } = await client.query<{ value: any }>(
    `SELECT \`value\` FROM org_settings WHERE organization_id = $1 AND \`key\` = $2`,
    [orgId, slaKey]
  );
  let slaHours = 96; // Default HIGH SLA fallback
  if (slaRows.length > 0) {
    const rawVal = slaRows[0].value;
    slaHours = parseInt(typeof rawVal === 'string' ? rawVal.replace(/"/g, '') : String(rawVal), 10) || 96;
  }

  const isReassign = issue.status === 'ASSIGNED' || issue.status === 'IN_PROGRESS' || issue.status === 'REOPENED';

  if (isReassign && issue.assigned_worker_id) {
    // End old assignment
    await client.query(
      `UPDATE assignments
       SET ended_at = NOW(), ended_reason = 'REASSIGNED', reassign_reason = $1
       WHERE issue_id = $2 AND ended_at IS NULL`,
      [reassignReason, issue.id]
    );
  }

  // Create new assignment
  const newAssignId = crypto.randomUUID();
  await client.query(
    `INSERT INTO assignments (
       id, issue_id, team_id, worker_id, assigned_by, band_at_assignment, expected_hours
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [newAssignId, issue.id, teamId, workerId, adminId, effectiveBand, slaHours]
  );

  // Update issue
  await client.query(
    `UPDATE issues
     SET status = 'ASSIGNED', assigned_team_id = $1, assigned_worker_id = $2,
         assigned_at = NOW(), updated_at = NOW()
     WHERE id = $3`,
    [teamId, workerId, issue.id]
  );

  // Log event
  const note = isReassign
    ? `Reassigned to worker. Reason: ${reassignReason}`
    : 'Assigned to team and worker.';

  await client.query(
    `INSERT INTO issue_events (issue_id, actor_id, actor_role, event_type, from_status, to_status, note, metadata)
     VALUES ($1, $2, 'ADMIN', 'STATUS_CHANGE', $3, 'ASSIGNED', $4, '{}')`,
    [issue.id, adminId, issue.status, note]
  );

  await notifyIssueAssigned(client, workerId, issue.id, issue.title);
}

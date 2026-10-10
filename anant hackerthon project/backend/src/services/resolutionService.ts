import crypto from 'crypto';
import { PoolClient } from '../lib/db';
import { validateTransition } from '../domain/stateMachine';
import {
  notifyIssueStatusChange,
  notifyIssueResolved,
  notifyIssueReopened,
  notifyIssueVerified,
} from './notificationService';
import { ValidatedFile, saveFileToDisk } from '../lib/uploads';
import { notFound, validationError } from '../lib/errors';
import { getCitizenIssueView, CitizenIssueView } from './issueService';

export async function startWork(
  client: PoolClient,
  issueId: string,
  workerId: string
): Promise<void> {
  const { rows: issueRows } = await client.query<{
    id: string;
    status: any;
    assigned_worker_id: string | null;
  }>(
    'SELECT id, status, assigned_worker_id FROM issues WHERE id = $1 FOR UPDATE',
    [issueId]
  );

  if (issueRows.length === 0) {
    throw notFound('Issue not found.');
  }
  const issue = issueRows[0];

  validateTransition({
    fromStatus: issue.status,
    toStatus: 'IN_PROGRESS',
    actorRole: 'WORKER',
    isAssignedWorker: issue.assigned_worker_id === workerId,
  });

  // Check timely start
  const { rows: assignRows } = await client.query<{
    id: string;
    assigned_at: Date | string;
    expected_hours: number;
  }>(
    'SELECT id, assigned_at, expected_hours FROM assignments WHERE issue_id = $1 AND ended_at IS NULL',
    [issue.id]
  );

  let timelyStart = true;
  if (assignRows.length > 0) {
    const assignedAt = new Date(assignRows[0].assigned_at).getTime();
    const diffHours = (Date.now() - assignedAt) / (1000 * 60 * 60);
    // start_work_window_hours default 24h
    timelyStart = diffHours <= 24;

    await client.query(
      `UPDATE assignments
       SET accepted_at = NOW(), start_was_timely = $1
       WHERE id = $2`,
      [timelyStart ? 1 : 0, assignRows[0].id]
    );
  }

  await client.query(
    `UPDATE issues
     SET status = 'IN_PROGRESS', started_at = COALESCE(started_at, NOW()), updated_at = NOW()
     WHERE id = $1`,
    [issue.id]
  );

  await client.query(
    `INSERT INTO issue_events (issue_id, actor_id, actor_role, event_type, from_status, to_status, note, metadata)
     VALUES ($1, $2, 'WORKER', 'STATUS_CHANGE', $3, 'IN_PROGRESS', 'Worker started on-site work.', '{}')`,
    [issue.id, workerId, issue.status]
  );
}

export async function addWorkerNote(
  client: PoolClient,
  issueId: string,
  workerId: string,
  note: string
): Promise<void> {
  const { rows: issueRows } = await client.query<{ id: string; assigned_worker_id: string | null }>(
    'SELECT id, assigned_worker_id FROM issues WHERE id = $1',
    [issueId]
  );

  if (issueRows.length === 0 || issueRows[0].assigned_worker_id !== workerId) {
    throw notFound('Issue not found or unauthorized.');
  }

  await client.query(
    `INSERT INTO issue_events (issue_id, actor_id, actor_role, event_type, note, metadata)
     VALUES ($1, $2, 'WORKER', 'NOTE', $3, '{}')`,
    [issueId, workerId, note]
  );
}

export interface ResolveIssueOptions {
  issueId: string;
  callerId?: string;
  workerId?: string;
  callerRole?: 'WORKER' | 'ADMIN';
  note?: string;
  summary?: string;
  internalNotes?: string;
  proofFiles: ValidatedFile[];
  aiDraftUsed?: boolean;
  adminReason?: string;
}

export async function resolveIssue(
  client: PoolClient,
  issueIdOrOpts: string | ResolveIssueOptions,
  callerIdParam?: string,
  callerRoleParam?: 'WORKER' | 'ADMIN',
  noteParam?: string,
  proofFilesParam?: ValidatedFile[],
  aiDraftUsedParam = false,
  adminReasonParam?: string
): Promise<{ message: string; resolutionId: string }> {
  let issueId: string;
  let callerId: string;
  let callerRole: 'WORKER' | 'ADMIN';
  let note: string;
  let proofFiles: ValidatedFile[];
  let aiDraftUsed = false;
  let adminReason: string | undefined;

  if (typeof issueIdOrOpts === 'object') {
    issueId = issueIdOrOpts.issueId;
    callerId = (issueIdOrOpts.workerId || issueIdOrOpts.callerId)!;
    callerRole = issueIdOrOpts.callerRole || 'WORKER';
    note = issueIdOrOpts.note || issueIdOrOpts.summary || '';
    if (issueIdOrOpts.internalNotes) {
      note = note ? `${note}\n\nInternal Notes: ${issueIdOrOpts.internalNotes}` : issueIdOrOpts.internalNotes;
    }
    proofFiles = issueIdOrOpts.proofFiles || [];
    aiDraftUsed = issueIdOrOpts.aiDraftUsed ?? false;
    adminReason = issueIdOrOpts.adminReason;
  } else {
    issueId = issueIdOrOpts;
    callerId = callerIdParam!;
    callerRole = callerRoleParam!;
    note = noteParam!;
    proofFiles = proofFilesParam || [];
    aiDraftUsed = aiDraftUsedParam;
    adminReason = adminReasonParam;
  }

  const { rows: issueRows } = await client.query<{
    id: string;
    organization_id: string;
    status: any;
    assigned_worker_id: string | null;
    primary_complaint_id: string;
    approved_external_delay_hours: string | number;
  }>(
    'SELECT id, organization_id, status, assigned_worker_id, primary_complaint_id, approved_external_delay_hours FROM issues WHERE id = $1 FOR UPDATE',
    [issueId]
  );

  if (issueRows.length === 0) {
    throw notFound('Issue not found.');
  }
  const issue = issueRows[0];

  validateTransition({
    fromStatus: issue.status,
    toStatus: 'RESOLVED',
    actorRole: callerRole,
    isAssignedWorker: callerRole === 'WORKER' ? issue.assigned_worker_id === callerId : undefined,
    proofCount: proofFiles.length,
    note,
    adminReason,
  });

  // Calculate resolution timing
  const { rows: assignRows } = await client.query<{
    id: string;
    assigned_at: Date | string;
    expected_hours: number;
  }>(
    'SELECT id, assigned_at, expected_hours FROM assignments WHERE issue_id = $1 AND ended_at IS NULL ORDER BY assigned_at DESC LIMIT 1',
    [issue.id]
  );

  const assign = assignRows[0];
  const now = new Date();
  const assignedAt = assign ? new Date(assign.assigned_at).getTime() : now.getTime();
  const elapsedHours = Number(((now.getTime() - assignedAt) / (1000 * 60 * 60)).toFixed(2));
  const externalDelay = parseFloat(String(issue.approved_external_delay_hours || '0'));
  const effectiveHours = Math.max(0, Number((elapsedHours - externalDelay).toFixed(2)));
  const expectedHours = assign ? assign.expected_hours : 96;
  const onTime = effectiveHours <= expectedHours;

  // Insert resolution
  const resolutionId = crypto.randomUUID();
  const workerIdForRes = callerRole === 'WORKER' ? callerId : issue.assigned_worker_id ?? callerId;

  await client.query(
    `INSERT INTO resolutions (
       id, issue_id, assignment_id, worker_id, resolved_by_role, note,
       ai_draft_used, proof_count, elapsed_hours, external_delay_hours,
       effective_hours, expected_hours, on_time, citizen_decision
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'PENDING')`,
    [
      resolutionId,
      issue.id,
      assign ? assign.id : null,
      workerIdForRes,
      callerRole,
      note,
      aiDraftUsed ? 1 : 0,
      proofFiles.length,
      elapsedHours,
      externalDelay,
      effectiveHours,
      expectedHours,
      onTime ? 1 : 0,
    ]
  );

  // Save proof files
  for (const pf of proofFiles) {
    const saved = await saveFileToDisk(pf);
    const mediaId = crypto.randomUUID();
    await client.query(
      `INSERT INTO media (
         id, organization_id, uploader_id, kind, issue_id, resolution_id,
         storage_path, mime, size_bytes, original_name
       ) VALUES ($1, $2, $3, 'RESOLUTION_PROOF', $4, $5, $6, $7, $8, $9)`,
      [
        mediaId,
        issue.organization_id,
        callerId,
        issue.id,
        resolutionId,
        saved.storagePath,
        pf.mime,
        pf.sizeBytes,
        pf.originalName,
      ]
    );
  }

  // End active assignment
  if (assign) {
    await client.query(
      `UPDATE assignments SET ended_at = NOW(), ended_reason = 'RESOLVED' WHERE id = $1`,
      [assign.id]
    );
  }

  // Update issue status to RESOLVED
  await client.query(
    `UPDATE issues SET status = 'RESOLVED', resolved_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [issue.id]
  );

  // Log event
  const eventNote =
    callerRole === 'ADMIN'
      ? `Resolved on behalf by administrator. Reason: ${adminReason}`
      : 'Work marked resolved by worker. Awaiting citizen confirmation.';

  await client.query(
    `INSERT INTO issue_events (issue_id, actor_id, actor_role, event_type, from_status, to_status, note, metadata)
     VALUES ($1, $2, $3, 'STATUS_CHANGE', 'IN_PROGRESS', 'RESOLVED', $4, '{}')`,
    [issue.id, callerId, callerRole, eventNote]
  );

  // Fetch primary reporter
  const { rows: primaryRows } = await client.query<{ citizen_id: string }>(
    'SELECT citizen_id FROM complaints WHERE id = $1',
    [issue.primary_complaint_id]
  );

  if (primaryRows.length > 0) {
    await notifyIssueResolved(client, issue.id, primaryRows[0].citizen_id);
  }

  return { message: 'Issue marked resolved successfully', resolutionId };
}

export interface VerifyResolutionOptions {
  issueId?: string;
  complaintId: string;
  citizenId: string;
  decision: 'VERIFIED' | 'REJECTED' | 'NOT_FIXED';
  reason?: string;
  rejectReason?: string;
  stars?: number;
}

export async function verifyResolution(
  client: PoolClient,
  complaintIdOrOpts: string | VerifyResolutionOptions,
  citizenIdParam?: string,
  decisionParam?: 'VERIFIED' | 'REJECTED' | 'NOT_FIXED',
  reasonParam?: string,
  starsParam?: number
): Promise<CitizenIssueView> {
  let complaintId: string;
  let citizenId: string;
  let decision: 'VERIFIED' | 'REJECTED' | 'NOT_FIXED';
  let reason: string | undefined;
  let stars: number | undefined;

  if (typeof complaintIdOrOpts === 'object') {
    complaintId = complaintIdOrOpts.complaintId;
    citizenId = complaintIdOrOpts.citizenId;
    decision = complaintIdOrOpts.decision;
    reason = complaintIdOrOpts.rejectReason || complaintIdOrOpts.reason;
    stars = complaintIdOrOpts.stars;
  } else {
    complaintId = complaintIdOrOpts;
    citizenId = citizenIdParam!;
    decision = decisionParam!;
    reason = reasonParam;
    stars = starsParam;
  }
  const { rows: compRows } = await client.query<{
    id: string;
    issue_id: string;
    is_primary: boolean | number;
  }>('SELECT id, issue_id, is_primary FROM complaints WHERE id = $1', [complaintId]);

  if (compRows.length === 0) {
    throw notFound('Complaint not found.');
  }
  const comp = compRows[0];

  const { rows: issueRows } = await client.query<{
    id: string;
    organization_id: string;
    status: any;
    assigned_worker_id: string | null;
  }>('SELECT id, organization_id, status, assigned_worker_id FROM issues WHERE id = $1 FOR UPDATE', [
    comp.issue_id,
  ]);

  if (issueRows.length === 0) {
    throw notFound('Issue not found.');
  }
  const issue = issueRows[0];

  const targetStatus = decision === 'VERIFIED' ? 'CITIZEN_VERIFIED' : 'REOPENED';

  validateTransition({
    fromStatus: issue.status,
    toStatus: targetStatus,
    actorRole: 'CITIZEN',
    isPrimaryReporter: Boolean(comp.is_primary),
    citizenDecision: decision === 'VERIFIED' ? 'VERIFIED' : 'REJECTED',
    reopenReason: reason,
  });

  // Fetch latest resolution row
  const { rows: resRows } = await client.query<{ id: string; worker_id: string }>(
    'SELECT id, worker_id FROM resolutions WHERE issue_id = $1 ORDER BY resolved_at DESC LIMIT 1',
    [issue.id]
  );

  if (resRows.length === 0) {
    throw validationError('No resolution found to verify.');
  }
  const resolution = resRows[0];

  if (decision === 'VERIFIED') {
    // 1. Mark resolution as VERIFIED
    await client.query(
      `UPDATE resolutions
       SET citizen_decision = 'VERIFIED', decided_at = NOW()
       WHERE id = $1`,
      [resolution.id]
    );

    // 2. Mark issue as CITIZEN_VERIFIED (Final closure)
    await client.query(
      `UPDATE issues
       SET status = 'CITIZEN_VERIFIED', verified_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [issue.id]
    );

    // 3. Optional Rating
    if (stars && stars >= 1 && stars <= 5) {
      const ratingId = crypto.randomUUID();
      await client.query(
        `INSERT INTO ratings (id, resolution_id, issue_id, citizen_id, worker_id, stars)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON DUPLICATE KEY UPDATE stars = VALUES(stars)`,
        [ratingId, resolution.id, issue.id, citizenId, resolution.worker_id, stars]
      );
    }

    // 4. Log event
    await client.query(
      `INSERT INTO issue_events (issue_id, actor_id, actor_role, event_type, from_status, to_status, note, metadata)
       VALUES ($1, $2, 'CITIZEN', 'STATUS_CHANGE', 'RESOLVED', 'CITIZEN_VERIFIED', 'Citizen verified resolution.', '{}')`,
      [issue.id, citizenId]
    );

    await notifyIssueVerified(client, issue.id, issue.assigned_worker_id);
  } else {
    // Decision is NOT_FIXED -> REOPENED
    await client.query(
      `UPDATE resolutions
       SET citizen_decision = 'REJECTED', decided_at = NOW(), reject_reason = $1
       WHERE id = $2`,
      [reason, resolution.id]
    );

    await client.query(
      `UPDATE issues
       SET status = 'REOPENED',
           reopened_count = reopened_count + 1,
           approved_external_delay_hours = 0,
           updated_at = NOW()
       WHERE id = $1`,
      [issue.id]
    );

    await client.query(
      `INSERT INTO issue_events (issue_id, actor_id, actor_role, event_type, from_status, to_status, note, metadata)
       VALUES ($1, $2, 'CITIZEN', 'STATUS_CHANGE', 'RESOLVED', 'REOPENED', $3, '{}')`,
      [issue.id, citizenId, `Issue reopened: ${reason}`]
    );

    // Fetch admins
    const { rows: adminRows } = await client.query<{ id: string }>(
      `SELECT id FROM users WHERE organization_id = $1 AND role = 'ADMIN'`,
      [issue.organization_id]
    );
    const adminIds = adminRows.map((a) => a.id);

    await notifyIssueReopened(
      client,
      issue.id,
      issue.assigned_worker_id,
      adminIds,
      reason || 'Not fixed'
    );
  }

  return getCitizenIssueView(client, complaintId, citizenId);
}

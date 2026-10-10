import crypto from 'crypto';
import { PoolClient } from '../lib/db';

export async function createNotification(
  client: PoolClient,
  userId: string,
  issueId: string | null,
  type: string,
  message: string
): Promise<void> {
  const notifId = crypto.randomUUID();
  await client.query(
    `INSERT INTO notifications (id, user_id, issue_id, type, message, is_read)
     VALUES ($1, $2, $3, $4, $5, 0)`,
    [notifId, userId, issueId, type, message]
  );
}

export async function notifyIssueAssigned(
  client: PoolClient,
  workerId: string,
  issueId: string,
  title: string
): Promise<void> {
  await createNotification(
    client,
    workerId,
    issueId,
    'ASSIGNMENT',
    `You have been assigned to issue: ${title}`
  );
}

export async function notifyIssueStatusChange(
  client: PoolClient,
  issueId: string,
  fromStatus: string | null,
  toStatus: string,
  primaryReporterId: string,
  joinedReporterIds: string[] = []
): Promise<void> {
  const msg = `Issue status updated to ${toStatus}.`;
  await createNotification(client, primaryReporterId, issueId, 'STATUS_CHANGE', msg);

  for (const jId of joinedReporterIds) {
    if (jId !== primaryReporterId) {
      await createNotification(client, jId, issueId, 'STATUS_CHANGE', msg);
    }
  }
}

export async function notifyIssueResolved(
  client: PoolClient,
  issueId: string,
  primaryReporterId: string
): Promise<void> {
  await createNotification(
    client,
    primaryReporterId,
    issueId,
    'AWAITING_VERIFICATION',
    'The responsible team marked your issue resolved. Please verify if it is fixed.'
  );
}

export async function notifyIssueReopened(
  client: PoolClient,
  issueId: string,
  workerId: string | null,
  adminIds: string[],
  reason: string
): Promise<void> {
  const msg = `Issue resolution was rejected by the citizen (Reopened): "${reason}"`;
  if (workerId) {
    await createNotification(client, workerId, issueId, 'REOPENED', msg);
  }
  for (const aId of adminIds) {
    await createNotification(client, aId, issueId, 'REOPENED', msg);
  }
}

export async function notifyIssueVerified(
  client: PoolClient,
  issueId: string,
  workerId: string | null
): Promise<void> {
  if (workerId) {
    await createNotification(
      client,
      workerId,
      issueId,
      'VERIFIED',
      'Citizen confirmed and verified the fix! Good job.'
    );
  }
}

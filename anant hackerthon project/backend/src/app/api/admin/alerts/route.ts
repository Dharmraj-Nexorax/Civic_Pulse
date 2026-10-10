import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { generateAlerts } from '@/domain/alerts';
import { errorResponse, okResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ['ADMIN']);
    const { rows: issues } = await query(
      `SELECT id, title, status, priority_band, priority_override_band, created_at, assigned_at
       FROM issues
       WHERE organization_id = $1 AND status NOT IN ('CITIZEN_VERIFIED', 'DUPLICATE')`,
      [user.organization_id]
    );

    const { rows: workers } = await query(
      `SELECT u.id, u.full_name,
              (SELECT COUNT(*) FROM issues i WHERE i.assigned_worker_id = u.id AND i.status IN ('ASSIGNED', 'IN_PROGRESS', 'REOPENED')) as active_issues
       FROM users u
       WHERE u.organization_id = $1 AND u.role = 'WORKER'`,
      [user.organization_id]
    );

    const alerts = generateAlerts({
      issues: issues.map(i => ({
        id: i.id,
        title: i.title,
        status: i.status,
        effectiveBand: i.priority_override_band || i.priority_band,
        createdAt: new Date(i.created_at),
        assignedAt: i.assigned_at ? new Date(i.assigned_at) : null,
      })),
      workers: workers.map(w => ({
        id: w.id,
        name: w.full_name,
        activeIssuesCount: parseInt(w.active_issues, 10) || 0,
      })),
    });

    return okResponse({ alerts });
  } catch (error) {
    return errorResponse(error);
  }
}

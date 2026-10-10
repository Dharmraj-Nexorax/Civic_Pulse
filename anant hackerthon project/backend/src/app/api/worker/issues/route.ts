import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { errorResponse, okResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ['WORKER']);
    const { rows } = await query(
      `SELECT i.id, i.title, i.status, i.priority_band, i.priority_score, i.assigned_at,
              cat.name as category_name, w.name as ward_name
       FROM issues i
       JOIN categories cat ON cat.id = i.category_id
       JOIN wards w ON w.id = i.ward_id
       WHERE i.assigned_worker_id = $1 AND i.organization_id = $2
         AND i.status IN ('ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REOPENED')
       ORDER BY i.priority_score DESC, i.assigned_at ASC`,
      [user.id, user.organization_id]
    );

    return okResponse({ issues: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

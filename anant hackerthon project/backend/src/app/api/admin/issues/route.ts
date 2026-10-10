import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { errorResponse, okResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ['ADMIN']);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let sql = `
      SELECT i.id, i.title, i.status, i.priority_band, i.priority_score,
             i.priority_override_band, i.created_at, cat.name as category_name,
             w.name as ward_name,
             (SELECT COUNT(*) FROM complaints c WHERE c.issue_id = i.id) as complaint_count
      FROM issues i
      JOIN categories cat ON cat.id = i.category_id
      JOIN wards w ON w.id = i.ward_id
      WHERE i.organization_id = $1
    `;
    const params: any[] = [user.organization_id];

    if (status) {
      params.push(status);
      sql += ` AND i.status = $2`;
    }

    sql += ` ORDER BY i.priority_score DESC, i.created_at DESC`;

    const { rows } = await query(sql, params);

    return okResponse({ issues: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

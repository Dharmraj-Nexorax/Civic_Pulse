import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { errorResponse, okResponse } from '@/lib/http';
import { notFound } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(req, ['WORKER']);
    const { rows } = await query(
      `SELECT i.id, i.title, i.summary, i.status, i.priority_band, i.priority_score,
              i.lat, i.lng, i.assigned_at, cat.name as category_name, w.name as ward_name
       FROM issues i
       JOIN categories cat ON cat.id = i.category_id
       JOIN wards w ON w.id = i.ward_id
       WHERE i.id = $1 AND i.assigned_worker_id = $2 AND i.organization_id = $3`,
      [params.id, user.id, user.organization_id]
    );

    if (rows.length === 0) {
      throw notFound('Assigned task not found.');
    }

    return okResponse({ issue: rows[0] });
  } catch (error) {
    return errorResponse(error);
  }
}

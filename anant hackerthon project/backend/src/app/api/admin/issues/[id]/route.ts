import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { errorResponse, okResponse } from '@/lib/http';
import { notFound, validationError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(req, ['ADMIN']);
    const { rows } = await query(
      `SELECT i.*, cat.name as category_name, w.name as ward_name,
              u.full_name as assigned_worker_name, t.name as assigned_team_name
       FROM issues i
       JOIN categories cat ON cat.id = i.category_id
       JOIN wards w ON w.id = i.ward_id
       LEFT JOIN users u ON u.id = i.assigned_worker_id
       LEFT JOIN teams t ON t.id = i.assigned_team_id
       WHERE i.id = $1 AND i.organization_id = $2`,
      [params.id, user.organization_id]
    );

    if (rows.length === 0) {
      throw notFound('Issue not found.');
    }

    return okResponse({ issue: rows[0] });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(req, ['ADMIN']);
    const body = await req.json();
    const { priority_override_band, priority_override_reason } = body;

    if (!priority_override_band || !priority_override_reason) {
      throw validationError('Both priority_override_band and priority_override_reason are required.');
    }

    await query(
      `UPDATE issues
       SET priority_override_band = $1, priority_override_reason = $2,
           priority_overridden_by = $3, priority_overridden_at = now(), updated_at = now()
       WHERE id = $4 AND organization_id = $5`,
      [priority_override_band, priority_override_reason, user.id, params.id, user.organization_id]
    );

    return okResponse({ message: 'Priority override updated' });
  } catch (error) {
    return errorResponse(error);
  }
}

import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { okResponse, errorResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ['ADMIN']);
    const { rows } = await query(
      `SELECT u.id, u.full_name, u.mobile, u.email, u.role, u.is_active, t.name as team_name
       FROM users u
       LEFT JOIN teams t ON t.id = u.team_id
       WHERE u.organization_id = $1
       ORDER BY u.full_name ASC`,
      [user.organization_id]
    );
    const users = rows.map((r: any) => ({
      id: r.id,
      full_name: r.full_name,
      mobile: r.mobile,
      email: r.email,
      role: r.role,
      is_active: Boolean(r.is_active),
      team_name: r.team_name,
    }));
    return okResponse({ users });
  } catch (error) {
    return errorResponse(error);
  }
}

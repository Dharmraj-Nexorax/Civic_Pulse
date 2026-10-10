import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { okResponse, errorResponse } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    const { rows: userRows } = await query<{
      id: string;
      role: any;
      full_name: string;
      mobile: string | null;
      email: string | null;
      ward_id: string | null;
      ward_name: string | null;
      team_id: string | null;
      team_name: string | null;
    }>(
      `SELECT u.id, u.role, u.full_name, u.mobile, u.email,
              u.ward_id, w.name as ward_name,
              u.team_id, t.name as team_name
       FROM users u
       LEFT JOIN wards w ON w.id = u.ward_id
       LEFT JOIN teams t ON t.id = u.team_id
       WHERE u.id = $1`,
      [user.id]
    );

    if (userRows.length === 0) {
      return okResponse({ user: null });
    }

    const u = userRows[0];
    return okResponse({
      user: {
        id: u.id,
        role: u.role,
        full_name: u.full_name,
        mobile: u.mobile,
        email: u.email,
        ward: u.ward_id ? { id: u.ward_id, name: u.ward_name } : null,
        team: u.team_id ? { id: u.team_id, name: u.team_name } : null,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

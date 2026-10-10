import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { requireRole, hashPassword, normalizeMobile } from '@/lib/auth';
import { query } from '@/lib/db';
import { errorResponse, okResponse } from '@/lib/http';
import { validationError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ['ADMIN']);
    const { rows } = await query(
      `SELECT u.id, u.full_name, u.mobile, u.email, u.is_active, u.team_id,
              t.name as team_name,
              (SELECT COUNT(*) FROM issues i WHERE i.assigned_worker_id = u.id AND i.status IN ('ASSIGNED', 'IN_PROGRESS', 'REOPENED')) as active_count
       FROM users u
       LEFT JOIN teams t ON t.id = u.team_id
       WHERE u.organization_id = $1 AND u.role = 'WORKER'
       ORDER BY u.full_name ASC`,
      [user.organization_id]
    );

    const workers = rows.map((r) => ({
      ...r,
      is_active: Boolean(r.is_active),
      active_count: parseInt(String(r.active_count || 0), 10),
    }));

    return okResponse({ workers });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ['ADMIN']);
    const body = await req.json();
    const { full_name, mobile, email, password, team_id } = body;

    if (!full_name || full_name.trim().length === 0) {
      throw validationError('Full name is required.');
    }
    if (!team_id) {
      throw validationError('Worker must be assigned to a team.');
    }

    const { rows: teamRows } = await query(
      `SELECT id FROM teams WHERE id = $1 AND organization_id = $2 AND is_active = 1`,
      [team_id, user.organization_id]
    );
    if (teamRows.length === 0) {
      throw validationError('Selected active team not found.');
    }

    const normMobile = normalizeMobile(mobile);
    if (!normMobile) {
      throw validationError('Valid mobile number is required.');
    }
    if (!password || password.length < 8) {
      throw validationError('Password must be at least 8 characters.');
    }

    const passwordHash = await hashPassword(password);
    const workerId = crypto.randomUUID();

    await query(
      `INSERT INTO users (id, organization_id, role, full_name, mobile, email, password_hash, team_id, is_active)
       VALUES ($1, $2, 'WORKER', $3, $4, $5, $6, $7, 1)`,
      [workerId, user.organization_id, full_name.trim(), normMobile, email || null, passwordHash, team_id]
    );

    return okResponse({
      worker: {
        id: workerId,
        full_name: full_name.trim(),
        mobile: normMobile,
        email: email || null,
        team_id,
        is_active: true,
      },
    }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { errorResponse, okResponse } from '@/lib/http';
import { validationError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireRole(req, ['ADMIN']);
    const { rows } = await query(
      `SELECT id, name, is_active
       FROM teams
       WHERE organization_id = $1
       ORDER BY name ASC`,
      [user.organization_id]
    );

    const teams = rows.map((r) => ({
      ...r,
      is_active: Boolean(r.is_active),
      description: '',
    }));

    return okResponse({ teams });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ['ADMIN']);
    const body = await req.json();
    const { name } = body;

    if (!name || name.trim().length === 0) {
      throw validationError('Team name is required.');
    }

    const teamId = crypto.randomUUID();
    await query(
      `INSERT INTO teams (id, organization_id, name, is_active)
       VALUES ($1, $2, $3, 1)`,
      [teamId, user.organization_id, name.trim()]
    );

    return okResponse({ team: { id: teamId, name: name.trim(), is_active: true, description: '' } }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

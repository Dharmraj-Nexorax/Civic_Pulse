import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { config } from '@/lib/config';
import { hashPassword, createAuthToken, normalizeMobile, AuthUser } from '@/lib/auth';
import { okResponse, errorResponse } from '@/lib/http';
import { conflict, validationError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const RegisterSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  mobile: z.string().min(7, 'Mobile must be at least 7 digits'),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  ward_id: z.string().uuid('Valid ward is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = RegisterSchema.parse(body);

    const normMobile = normalizeMobile(data.mobile);
    if (!normMobile) {
      throw validationError('Invalid mobile number format.');
    }
    const normEmail = data.email && data.email.trim() ? data.email.trim().toLowerCase() : null;

    // Get default org
    const { rows: orgRows } = await query<{ id: string }>(
      'SELECT id FROM organizations WHERE slug = $1',
      [config.defaultOrgSlug]
    );
    if (orgRows.length === 0) {
      throw validationError('Default organization not configured.');
    }
    const orgId = orgRows[0].id;

    // Check ward
    const { rows: wardRows } = await query(
      'SELECT id FROM wards WHERE id = $1 AND organization_id = $2',
      [data.ward_id, orgId]
    );
    if (wardRows.length === 0) {
      throw validationError('Selected ward does not exist.');
    }

    // Check uniqueness
    const { rows: existing } = await query(
      `SELECT id, mobile, email FROM users
       WHERE organization_id = $1 AND (
         mobile = $2 OR ($3 IS NOT NULL AND email = $3)
       )`,
      [orgId, normMobile, normEmail]
    );

    if (existing.length > 0) {
      throw conflict('A user with this mobile number or email already exists.');
    }

    const pwdHash = await hashPassword(data.password);
    const userId = crypto.randomUUID();

    await query(
      `INSERT INTO users (
         id, organization_id, role, full_name, mobile, email, password_hash, ward_id, is_active
       ) VALUES ($1, $2, 'CITIZEN', $3, $4, $5, $6, $7, 1)`,
      [userId, orgId, data.full_name.trim(), normMobile, normEmail, pwdHash, data.ward_id]
    );

    const newUser: AuthUser = {
      id: userId,
      organization_id: orgId,
      role: 'CITIZEN',
      full_name: data.full_name.trim(),
      mobile: normMobile,
      email: normEmail,
      ward_id: data.ward_id,
      team_id: null,
    };

    const token = await createAuthToken(newUser, false);

    const res = okResponse({ user: newUser }, 201);
    res.cookies.set({
      name: config.cookieName,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    });

    return res;
  } catch (error) {
    return errorResponse(error);
  }
}

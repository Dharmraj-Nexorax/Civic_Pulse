import { NextRequest } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { config } from '@/lib/config';
import { verifyPassword, createAuthToken, normalizeMobile, AuthUser } from '@/lib/auth';
import { okResponse, errorResponse } from '@/lib/http';
import { unauthenticated } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const LoginSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = LoginSchema.parse(body);

    const normMobile = normalizeMobile(data.identifier);
    const normEmail = data.identifier.trim().toLowerCase();

    // Query user by mobile or email
    const { rows: users } = await query<AuthUser & { password_hash: string }>(
      `SELECT u.id, u.organization_id, u.role, u.full_name, u.mobile, u.email,
              u.ward_id, u.team_id, u.password_hash, u.is_active
       FROM users u
       WHERE (u.mobile = $1 OR u.email = $2) AND u.is_active = 1`,
      [normMobile, normEmail]
    );

    if (users.length === 0) {
      throw unauthenticated('Invalid credentials.');
    }

    const user = users[0];
    const passwordValid = await verifyPassword(data.password, user.password_hash);
    if (!passwordValid) {
      throw unauthenticated('Invalid credentials.');
    }

    const authUser: AuthUser = {
      id: user.id,
      organization_id: user.organization_id,
      role: user.role,
      full_name: user.full_name,
      mobile: user.mobile,
      email: user.email,
      ward_id: user.ward_id,
      team_id: user.team_id,
    };

    const token = await createAuthToken(authUser, !!data.remember);

    const res = okResponse({ user: authUser });
    const cookieOptions: any = {
      name: config.cookieName,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    };

    if (data.remember) {
      cookieOptions.maxAge = config.cookieMaxAgeSeconds;
    }

    res.cookies.set(cookieOptions);
    return res;
  } catch (error) {
    return errorResponse(error);
  }
}

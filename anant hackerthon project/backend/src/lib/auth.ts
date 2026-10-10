import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { config } from './config';
import { unauthenticated, forbidden } from './errors';

export type UserRole = 'CITIZEN' | 'WORKER' | 'ADMIN';

export interface AuthUser {
  id: string;
  organization_id: string;
  role: UserRole;
  full_name: string;
  mobile: string | null;
  email: string | null;
  ward_id: string | null;
  team_id: string | null;
}

export interface JWTPayload {
  sub: string; // user id
  org: string; // organization id
  role: UserRole;
  name: string;
  mobile?: string | null;
  email?: string | null;
  wardId?: string | null;
  teamId?: string | null;
}

const secretKey = new TextEncoder().encode(config.jwtSecret);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createAuthToken(user: AuthUser, remember = false): Promise<string> {
  const expiresIn = remember ? `${config.cookieMaxAgeSeconds}s` : '24h';

  return new SignJWT({
    org: user.organization_id,
    role: user.role,
    name: user.full_name,
    mobile: user.mobile,
    email: user.email,
    wardId: user.ward_id,
    teamId: user.team_id,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}


export async function verifyAuthToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return {
      sub: payload.sub as string,
      org: payload.org as string,
      role: payload.role as UserRole,
      name: payload.name as string,
      mobile: payload.mobile as string | undefined,
      email: payload.email as string | undefined,
      wardId: payload.wardId as string | undefined,
      teamId: payload.teamId as string | undefined,
    };
  } catch {
    return null;
  }
}

export function normalizeMobile(mobile: string | null | undefined): string | null {
  // Accept various user inputs (e.g., '+91 9876543210', '987-654-3210')
  // Strip all non‑digit characters first.
  if (!mobile) return null;
  let digits = mobile.replace(/[^\d]/g, '');
  // If the number includes a country code (often longer than 10 digits), keep only the last 10 digits.
  if (digits.length > 10) {
    digits = digits.slice(-10);
  }
  if (digits.length < 7 || digits.length > 15) {
    return null;
  }
  return digits;
}

export async function getAuthUserFromCookie(): Promise<AuthUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(config.cookieName)?.value;
  if (!token) return null;

  const payload = await verifyAuthToken(token);
  if (!payload) return null;

  return {
    id: payload.sub,
    organization_id: payload.org,
    role: payload.role,
    full_name: payload.name,
    mobile: payload.mobile ?? null,
    email: payload.email ?? null,
    ward_id: payload.wardId ?? null,
    team_id: payload.teamId ?? null,
  };
}

export async function getAuthUserFromRequest(req: NextRequest): Promise<AuthUser | null> {
  const token = req.cookies.get(config.cookieName)?.value;
  if (!token) return null;

  const payload = await verifyAuthToken(token);
  if (!payload) return null;

  return {
    id: payload.sub,
    organization_id: payload.org,
    role: payload.role,
    full_name: payload.name,
    mobile: payload.mobile ?? null,
    email: payload.email ?? null,
    ward_id: payload.wardId ?? null,
    team_id: payload.teamId ?? null,
  };
}

export async function requireAuth(req: NextRequest): Promise<AuthUser> {
  const user = await getAuthUserFromRequest(req);
  if (!user) {
    throw unauthenticated();
  }
  return user;
}

export async function requireRole(req: NextRequest, allowedRoles: UserRole[]): Promise<AuthUser> {
  const user = await requireAuth(req);
  if (!allowedRoles.includes(user.role)) {
    throw forbidden(`Access restricted to [${allowedRoles.join(', ')}]`);
  }
  return user;
}

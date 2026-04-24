import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;         // userId
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = 'cc_session';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// ─── Sign token ───────────────────────────────────────────────────────────────

export async function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(secret);
}

// ─── Verify token ─────────────────────────────────────────────────────────────

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

// ─── Get session from cookie (Server Component / Route Handler) ───────────────

export async function getSession(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ─── Get session from request (middleware) ────────────────────────────────────

export async function getSessionFromRequest(req: NextRequest): Promise<JwtPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value
    ?? req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

export function makeSessionCookie(token: string): { name: string; value: string; options: Record<string, unknown> } {
  return {
    name: COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 hours
    },
  };
}

export function clearSessionCookie() {
  return { name: COOKIE_NAME, value: '', options: { maxAge: 0, path: '/' } };
}

// ─── Permission checks ────────────────────────────────────────────────────────

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  visitor: 0,
  registered_user: 1,
  compliance_officer: 2,
  finance_operator: 2,
  admin: 10,
};

export function hasRole(session: JwtPayload | null, ...roles: UserRole[]): boolean {
  if (!session) return false;
  return roles.includes(session.role);
}

export function isAdmin(session: JwtPayload | null): boolean {
  return hasRole(session, 'admin');
}

export function isComplianceOrAdmin(session: JwtPayload | null): boolean {
  return hasRole(session, 'admin', 'compliance_officer');
}

export function isFinanceOrAdmin(session: JwtPayload | null): boolean {
  return hasRole(session, 'admin', 'finance_operator');
}

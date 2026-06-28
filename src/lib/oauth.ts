import { SignJWT, createRemoteJWKSet, jwtVerify } from 'jose';
import { OAuth2Client } from 'google-auth-library';

export interface OAuthProfile {
  providerId: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

function getRedirectBase(): string {
  return process.env.OAUTH_REDIRECT_BASE_URL || 'http://localhost:3000';
}

// ─── Google ─────────────────────────────────────────────────────────────────

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: `${getRedirectBase()}/api/auth/oauth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string): Promise<OAuthProfile> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: `${getRedirectBase()}/api/auth/oauth/google/callback`,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) throw new Error('GOOGLE_TOKEN_EXCHANGE_FAILED');
  const { id_token } = await tokenRes.json();
  if (!id_token) throw new Error('GOOGLE_NO_ID_TOKEN');

  const ticket = await googleClient.verifyIdToken({
    idToken: id_token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) throw new Error('GOOGLE_INVALID_PAYLOAD');

  return {
    providerId: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email.split('@')[0],
    emailVerified: payload.email_verified === true,
  };
}

// ─── Apple ──────────────────────────────────────────────────────────────────

const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

export function getAppleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.APPLE_CLIENT_ID ?? '',
    redirect_uri: `${getRedirectBase()}/api/auth/oauth/apple/callback`,
    response_type: 'code',
    scope: 'name email',
    response_mode: 'form_post',
    state,
  });
  return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
}

async function buildAppleClientSecret(): Promise<string> {
  const privateKey = (process.env.APPLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');
  const { importPKCS8 } = await import('jose');
  const key = await importPKCS8(privateKey, 'ES256');

  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: process.env.APPLE_KEY_ID })
    .setIssuer(process.env.APPLE_TEAM_ID ?? '')
    .setIssuedAt()
    .setExpirationTime('5m')
    .setAudience('https://appleid.apple.com')
    .setSubject(process.env.APPLE_CLIENT_ID ?? '')
    .sign(key);
}

export async function exchangeAppleCode(code: string): Promise<OAuthProfile> {
  const clientSecret = await buildAppleClientSecret();

  const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.APPLE_CLIENT_ID ?? '',
      client_secret: clientSecret,
      redirect_uri: `${getRedirectBase()}/api/auth/oauth/apple/callback`,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) throw new Error('APPLE_TOKEN_EXCHANGE_FAILED');
  const { id_token } = await tokenRes.json();
  if (!id_token) throw new Error('APPLE_NO_ID_TOKEN');

  const { payload } = await jwtVerify(id_token, APPLE_JWKS, {
    issuer: 'https://appleid.apple.com',
    audience: process.env.APPLE_CLIENT_ID,
  });
  if (!payload.sub || typeof payload.email !== 'string') throw new Error('APPLE_INVALID_PAYLOAD');

  return {
    providerId: payload.sub,
    email: payload.email,
    name: payload.email.split('@')[0], // Apple only sends `name` on first-ever auth, via form body — not in id_token
    emailVerified: payload.email_verified === true || payload.email_verified === 'true',
  };
}

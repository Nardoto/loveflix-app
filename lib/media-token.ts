// Shared JWT format used to authorize media playback through the Cloudflare Worker.
// Next.js signs; Worker validates. Both sides use HS256 with R2_MEDIA_SECRET.

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

const SECRET = process.env.JWT_MEDIA_SECRET ?? '';

const encoded = () => {
  if (!SECRET) throw new Error('JWT_MEDIA_SECRET not set');
  return new TextEncoder().encode(SECRET);
};

export type MediaTokenClaims = JWTPayload & {
  /** Supabase user id. */
  sub: string;
  /** "active" | "trialing" | "free" — gates which keys the Worker will serve. */
  tier: 'active' | 'trialing' | 'free';
};

/** Sign a token valid for `expirySeconds` (default 2h). */
export async function signMediaToken(claims: {
  userId: string;
  tier: MediaTokenClaims['tier'];
  expirySeconds?: number;
}): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + (claims.expirySeconds ?? 7200);
  return new SignJWT({ tier: claims.tier })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.userId)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(encoded());
}

export async function verifyMediaToken(token: string): Promise<MediaTokenClaims> {
  const { payload } = await jwtVerify(token, encoded(), { algorithms: ['HS256'] });
  return payload as MediaTokenClaims;
}

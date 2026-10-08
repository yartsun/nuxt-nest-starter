import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Opaque refresh token `<sessionId>.<secret>`. Only sha256(secret) is stored,
 * so a database leak does not hand out working sessions.
 */
export function newSecret(): { secret: string; hash: string } {
  const secret = randomBytes(32).toString('base64url');
  return { secret, hash: hashSecret(secret) };
}

export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export function formatRefreshToken(sessionId: string, secret: string): string {
  return `${sessionId}.${secret}`;
}

export function parseRefreshToken(token: unknown): { sessionId: string; secret: string } | null {
  if (typeof token !== 'string') return null;
  const match = /^([a-z0-9]{10,40})\.([A-Za-z0-9_-]{43})$/.exec(token);
  return match ? { sessionId: match[1], secret: match[2] } : null;
}

export function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

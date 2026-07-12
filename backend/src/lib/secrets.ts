import { createHash, timingSafeEqual } from 'node:crypto';

// Constant-time comparison for the shared server-to-server secret (x-admin-secret).
// Hashing both sides to a fixed 32 bytes means the compare never leaks length via
// timing or an early return, and it tolerates any input type/shape the header
// might carry (string | string[] | undefined). Replaces the plain `!==` checks in
// the admin + surveyor routes.
export function safeSecretEqual(provided: unknown, expected: string | undefined): boolean {
  if (typeof provided !== 'string' || typeof expected !== 'string' || expected.length === 0) {
    return false;
  }
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

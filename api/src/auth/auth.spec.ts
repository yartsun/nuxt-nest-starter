import { hashPassword, verifyPassword, TIMING_DUMMY_HASH } from './password';
import { formatRefreshToken, hashSecret, newSecret, parseRefreshToken, sameHash } from './refresh-token';
import { stateMatches } from './oauth.guard';

describe('password hashing', () => {
  it('verifies the right password and rejects others', async () => {
    const stored = await hashPassword('correct horse battery staple');
    expect(stored.startsWith('scrypt$32768$8$1$')).toBe(true);
    await expect(verifyPassword('correct horse battery staple', stored)).resolves.toBe(true);
    await expect(verifyPassword('Correct horse battery staple', stored)).resolves.toBe(false);
  });

  it('salts every hash and never accepts the timing dummy', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
    await expect(verifyPassword('', TIMING_DUMMY_HASH)).resolves.toBe(false);
    await expect(verifyPassword('x', 'bcrypt$whatever')).resolves.toBe(false);
  });
});

describe('refresh tokens', () => {
  it('round-trips and stores only a hash', () => {
    const { secret, hash } = newSecret();
    const token = formatRefreshToken('clx0abc123def456', secret);
    expect(parseRefreshToken(token)).toEqual({ sessionId: 'clx0abc123def456', secret });
    expect(hash).toBe(hashSecret(secret));
    expect(hash).not.toContain(secret);
    expect(sameHash(hash, hashSecret(secret))).toBe(true);
    expect(sameHash(hash, hashSecret(newSecret().secret))).toBe(false);
  });

  it('rejects malformed tokens', () => {
    for (const token of [undefined, '', 'abc', 'UPPER.' + 'a'.repeat(43), 'clx0abc123def456.short', 42]) {
      expect(parseRefreshToken(token)).toBeNull();
    }
  });
});

describe('oauth state', () => {
  it('requires an exact, non-empty match', () => {
    expect(stateMatches('abc', 'abc')).toBe(true);
    expect(stateMatches('abc', 'abd')).toBe(false);
    expect(stateMatches(undefined, undefined)).toBe(false);
    expect(stateMatches(['abc'], 'abc')).toBe(false);
    expect(stateMatches('', '')).toBe(false);
  });
});

import { validateEnv } from './env';

const base = { DATABASE_URL: 'postgresql://localhost/db' };

describe('validateEnv', () => {
  it('fills development defaults', () => {
    const env = validateEnv(base);
    expect(env.PORT).toBe(3001);
    expect(env.WEB_URL).toBe('http://localhost:3000');
    expect(env.COOKIE_SECURE).toBe(false);
    expect(env.JWT_SECRET.length).toBeGreaterThanOrEqual(32);
  });

  it('requires a real secret and secure cookies in production', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'production' })).toThrow('Missing required environment variable JWT_SECRET');
    const env = validateEnv({ ...base, NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(40) });
    expect(env.COOKIE_SECURE).toBe(true);
  });

  it('rejects short secrets, missing database and half-configured OAuth', () => {
    expect(() => validateEnv({ ...base, JWT_SECRET: 'short' })).toThrow('at least 32');
    expect(() => validateEnv({})).toThrow('DATABASE_URL');
    expect(() => validateEnv({ ...base, GOOGLE_CLIENT_ID: 'id' })).toThrow('must be set together');
  });

  it('strips trailing slashes from public URLs', () => {
    expect(validateEnv({ ...base, WEB_URL: 'https://app.example.com/' }).WEB_URL).toBe('https://app.example.com');
  });
});

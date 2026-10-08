/**
 * Typed, validated environment. The app refuses to start with a missing
 * database URL or a weak JWT secret instead of failing later at runtime.
 */
export interface Env {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  WEB_URL: string;
  DATABASE_URL: string;
  REDIS_URL: string;
  QUEUE_PREFIX: string;
  MEILI_HOST: string;
  MEILI_API_KEY: string;
  SEARCH_INDEX: string;
  JWT_SECRET: string;
  JWT_TTL: string;
  REFRESH_TTL_DAYS: number;
  COOKIE_SECURE: boolean;
  AUTH_RATE_LIMIT: number;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  API_URL: string;
}

const DEV_SECRET = 'dev-only-secret-change-me-dev-only-secret';

export function validateEnv(raw: Record<string, unknown>): Env {
  const str = (key: string, fallback?: string) => {
    const value = raw[key];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required environment variable ${key}`);
  };
  const int = (key: string, fallback: number) => {
    const value = Number(raw[key] ?? fallback);
    if (!Number.isInteger(value) || value <= 0) throw new Error(`${key} must be a positive integer`);
    return value;
  };
  const optional = (key: string) => (typeof raw[key] === 'string' && raw[key] !== '' ? (raw[key] as string) : undefined);

  const nodeEnv = str('NODE_ENV', 'development');
  if (!['development', 'production', 'test'].includes(nodeEnv)) throw new Error(`Unknown NODE_ENV ${nodeEnv}`);
  const production = nodeEnv === 'production';

  const jwtSecret = str('JWT_SECRET', production ? undefined : DEV_SECRET);
  if (jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
  if (production && jwtSecret === DEV_SECRET) throw new Error('JWT_SECRET must be set in production');

  const port = int('PORT', 3001);
  const env: Env = {
    NODE_ENV: nodeEnv as Env['NODE_ENV'],
    PORT: port,
    WEB_URL: str('WEB_URL', 'http://localhost:3000').replace(/\/$/, ''),
    API_URL: str('API_URL', `http://localhost:${port}`).replace(/\/$/, ''),
    DATABASE_URL: str('DATABASE_URL'),
    REDIS_URL: str('REDIS_URL', 'redis://localhost:6379'),
    QUEUE_PREFIX: str('QUEUE_PREFIX', 'starter'),
    MEILI_HOST: str('MEILI_HOST', 'http://localhost:7700'),
    MEILI_API_KEY: str('MEILI_API_KEY', ''),
    SEARCH_INDEX: str('SEARCH_INDEX', 'items'),
    JWT_SECRET: jwtSecret,
    JWT_TTL: str('JWT_TTL', '15m'),
    REFRESH_TTL_DAYS: int('REFRESH_TTL_DAYS', 30),
    COOKIE_SECURE: str('COOKIE_SECURE', production ? 'true' : 'false') === 'true',
    AUTH_RATE_LIMIT: int('AUTH_RATE_LIMIT', 10),
    GOOGLE_CLIENT_ID: optional('GOOGLE_CLIENT_ID'),
    GOOGLE_CLIENT_SECRET: optional('GOOGLE_CLIENT_SECRET'),
    GITHUB_CLIENT_ID: optional('GITHUB_CLIENT_ID'),
    GITHUB_CLIENT_SECRET: optional('GITHUB_CLIENT_SECRET'),
  };
  for (const provider of ['GOOGLE', 'GITHUB'] as const) {
    if (Boolean(env[`${provider}_CLIENT_ID`]) !== Boolean(env[`${provider}_CLIENT_SECRET`])) {
      throw new Error(`${provider}_CLIENT_ID and ${provider}_CLIENT_SECRET must be set together`);
    }
  }
  return env;
}

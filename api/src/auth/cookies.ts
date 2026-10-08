import type { Response } from 'express';
import type { Env } from '../config/env';

export const REFRESH_COOKIE = 'refresh_token';
export const STATE_COOKIE = 'oauth_state';

/** httpOnly, scoped to /auth: page scripts never see it and other routes never receive it. */
export function setRefreshCookie(res: Response, token: string, env: Pick<Env, 'COOKIE_SECURE' | 'REFRESH_TTL_DAYS'>) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/auth',
    maxAge: env.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response, env: Pick<Env, 'COOKIE_SECURE'>) {
  res.clearCookie(REFRESH_COOKIE, { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: 'lax', path: '/auth' });
}

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  ExecutionContext,
  HttpException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  mixin,
  type Type,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard, type IAuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Env } from '../config/env';
import { STATE_COOKIE } from './cookies';

export function stateMatches(received: unknown, expected: unknown): boolean {
  if (typeof received !== 'string' || typeof expected !== 'string' || !received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Passport OAuth guard without server sessions: the authorize step stores a
 * random `state` in a short-lived httpOnly cookie and the callback must echo it,
 * which blocks login-CSRF. Unconfigured providers answer 404.
 */
export function OAuthGuard(provider: 'google' | 'github'): Type<IAuthGuard> {
  const key = provider === 'google' ? 'GOOGLE_CLIENT_ID' : 'GITHUB_CLIENT_ID';

  @Injectable()
  class Guard extends AuthGuard(provider) {
    constructor(private readonly config: ConfigService<Env, true>) {
      super();
    }

    override async canActivate(context: ExecutionContext): Promise<boolean> {
      if (!this.config.get(key, { infer: true })) throw new NotFoundException(`${provider} sign-in is not configured`);
      const http = context.switchToHttp();
      const req = http.getRequest<Request>();
      if ('code' in req.query || 'error' in req.query) {
        const expected = req.cookies?.[STATE_COOKIE];
        http.getResponse<Response>().clearCookie(STATE_COOKIE, { path: '/auth' });
        if (!stateMatches(req.query.state, expected)) throw new UnauthorizedException('Invalid OAuth state');
      }
      return (await super.canActivate(context)) as boolean;
    }

    override getAuthenticateOptions(context: ExecutionContext) {
      const http = context.switchToHttp();
      if ('code' in http.getRequest<Request>().query) return { session: false };
      const state = randomBytes(24).toString('base64url');
      http.getResponse<Response>().cookie(STATE_COOKIE, state, {
        httpOnly: true,
        secure: this.config.get('COOKIE_SECURE', { infer: true }),
        sameSite: 'lax',
        path: '/auth',
        maxAge: 10 * 60 * 1000,
      });
      return { session: false, state };
    }
  }

  return mixin(Guard);
}

/** Failed or cancelled OAuth returns the user to the login page instead of a JSON error. */
@Catch(HttpException)
@Injectable()
export class OAuthErrorFilter implements ExceptionFilter {
  constructor(private readonly config: ConfigService<Env, true>) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const reason = exception instanceof NotFoundException ? 'oauth_unavailable' : 'oauth_failed';
    const webUrl = this.config.get('WEB_URL', { infer: true });
    host.switchToHttp().getResponse<Response>().redirect(`${webUrl}/login?error=${reason}`);
  }
}

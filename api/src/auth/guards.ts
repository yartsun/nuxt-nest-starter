import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { Env } from '../config/env';
import { IS_PUBLIC } from './decorators';

/** Global guard: every route needs a valid access token unless marked @Public(). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()])) return true;
    return super.canActivate(context);
  }
}

/**
 * Cookie-authenticated endpoints (refresh, logout) only accept browser requests
 * from the web app's origin. SameSite=Lax already blocks cross-site POSTs; this
 * also closes the door for other same-site origins.
 */
@Injectable()
export class SameOriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const origin = context.switchToHttp().getRequest<Request>().headers.origin;
    if (origin && origin !== this.config.get('WEB_URL', { infer: true })) {
      throw new ForbiddenException('Cross-origin request rejected');
    }
    return true;
  }
}

import { Body, ConflictException, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException, UseFilters, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { Env } from '../config/env';
import { AuthService, type SessionTokens } from './auth.service';
import { clearRefreshCookie, REFRESH_COOKIE, setRefreshCookie } from './cookies';
import { CurrentUser, Public } from './decorators';
import { LoginDto, RegisterDto } from './dto/credentials.dto';
import { SameOriginGuard } from './guards';
import { OAuthErrorFilter, OAuthGuard } from './oauth.guard';
import type { OAuthProfile } from './strategies';

const meta = (req: Request) => ({ userAgent: req.headers['user-agent'] });

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.respond(res, await this.auth.register(dto, meta(req)));
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @HttpCode(200)
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.respond(res, await this.auth.login(dto, meta(req)));
  }

  /** Exchanges the httpOnly refresh cookie for a new access token and a rotated cookie. */
  @Public()
  @UseGuards(SameOriginGuard, ThrottlerGuard)
  @HttpCode(200)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw new UnauthorizedException('Not signed in');
    try {
      return this.respond(res, await this.auth.refresh(token, meta(req)));
    } catch (error) {
      if (!(error instanceof UnauthorizedException && error.message === 'Session was just rotated')) {
        clearRefreshCookie(res, this.env());
      }
      throw error;
    }
  }

  @Public()
  @UseGuards(SameOriginGuard)
  @HttpCode(204)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    clearRefreshCookie(res, this.env());
  }

  @Get('me')
  me(@CurrentUser() userId: string) {
    return this.auth.me(userId);
  }

  /** Lets the web app show only the sign-in buttons that are configured. */
  @Public()
  @Get('providers')
  providers() {
    return {
      google: Boolean(this.config.get('GOOGLE_CLIENT_ID', { infer: true })),
      github: Boolean(this.config.get('GITHUB_CLIENT_ID', { infer: true })),
    };
  }

  @Public()
  @UseGuards(OAuthGuard('google'))
  @UseFilters(OAuthErrorFilter)
  @Get('google')
  google() {}

  @Public()
  @UseGuards(OAuthGuard('google'))
  @UseFilters(OAuthErrorFilter)
  @Get('google/callback')
  googleCallback(@Req() req: Request, @Res() res: Response) {
    return this.finishOAuth(req, res);
  }

  @Public()
  @UseGuards(OAuthGuard('github'))
  @UseFilters(OAuthErrorFilter)
  @Get('github')
  github() {}

  @Public()
  @UseGuards(OAuthGuard('github'))
  @UseFilters(OAuthErrorFilter)
  @Get('github/callback')
  githubCallback(@Req() req: Request, @Res() res: Response) {
    return this.finishOAuth(req, res);
  }

  /** Tokens never travel in the URL: the web app picks the session up through /auth/refresh. */
  private async finishOAuth(req: Request, res: Response) {
    const web = this.config.get('WEB_URL', { infer: true });
    try {
      const session = await this.auth.oauthLogin(req.user as OAuthProfile, meta(req));
      setRefreshCookie(res, session.refreshToken, this.env());
      res.redirect(`${web}/auth/callback`);
    } catch (error) {
      res.redirect(`${web}/login?error=${error instanceof ConflictException ? 'account_exists' : 'oauth_failed'}`);
    }
  }

  private respond(res: Response, session: SessionTokens) {
    setRefreshCookie(res, session.refreshToken, this.env());
    return { accessToken: session.accessToken, user: session.user };
  }

  private env() {
    return {
      COOKIE_SECURE: this.config.get('COOKIE_SECURE', { infer: true }),
      REFRESH_TTL_DAYS: this.config.get('REFRESH_TTL_DAYS', { infer: true }),
    };
  }
}

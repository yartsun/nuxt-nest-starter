import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import type { Env } from '../config/env';
import type { LoginDto, RegisterDto } from './dto/credentials.dto';
import { hashPassword, TIMING_DUMMY_HASH, verifyPassword } from './password';
import { formatRefreshToken, hashSecret, newSecret, parseRefreshToken, sameHash } from './refresh-token';
import type { OAuthProfile } from './strategies';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  provider: 'local' | 'google' | 'github';
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

interface ClientMeta {
  userAgent?: string;
}

/** A rotated token presented again within this window is a parallel refresh, not theft. */
const ROTATION_GRACE_MS = 10_000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async register(dto: RegisterDto, meta: ClientMeta): Promise<SessionTokens> {
    if (await this.prisma.user.findUnique({ where: { email: dto.email } })) {
      throw new ConflictException('This email is already registered');
    }
    const user = await this.prisma.user.create({
      data: { email: dto.email, name: dto.name, passwordHash: await hashPassword(dto.password) },
    });
    return this.startSession(user, meta);
  }

  async login(dto: LoginDto, meta: ClientMeta): Promise<SessionTokens> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const valid = await verifyPassword(dto.password, user?.passwordHash ?? TIMING_DUMMY_HASH);
    if (!user || !user.passwordHash || !valid) throw new UnauthorizedException('Invalid email or password');
    return this.startSession(user, meta);
  }

  /** Sign in with a provider. An email that already belongs to another sign-in method is never auto-linked. */
  async oauthLogin(profile: OAuthProfile, meta: ClientMeta): Promise<SessionTokens> {
    let user = await this.prisma.user.findUnique({
      where: { provider_providerId: { provider: profile.provider, providerId: profile.providerId } },
    });
    if (!user) {
      if (await this.prisma.user.findUnique({ where: { email: profile.email } })) {
        throw new ConflictException('This email is registered with another sign-in method');
      }
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          provider: profile.provider,
          providerId: profile.providerId,
          avatarUrl: profile.avatarUrl,
        },
      });
    }
    return this.startSession(user, meta);
  }

  /**
   * Rotate a refresh token. Every token works once: presenting an already
   * rotated token (outside a short grace window) means it was copied, so all
   * sessions of that user are revoked.
   */
  async refresh(token: string, meta: ClientMeta): Promise<SessionTokens> {
    const parsed = parseRefreshToken(token);
    const session = parsed && (await this.prisma.session.findUnique({ where: { id: parsed.sessionId }, include: { user: true } }));
    if (!parsed || !session || !sameHash(session.tokenHash, hashSecret(parsed.secret))) {
      throw new UnauthorizedException('Invalid session');
    }
    if (session.revokedAt) {
      if (session.replacedBy && Date.now() - session.revokedAt.getTime() < ROTATION_GRACE_MS) {
        throw new UnauthorizedException('Session was just rotated');
      }
      await this.revokeAll(session.userId);
      throw new UnauthorizedException('Session reuse detected; all sessions were signed out');
    }
    if (session.expiresAt.getTime() <= Date.now()) throw new UnauthorizedException('Session expired');

    const { secret, hash } = newSecret();
    const next = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.session.updateMany({ where: { id: session.id, revokedAt: null }, data: { revokedAt: new Date() } });
      if (claimed.count === 0) return null; // A parallel refresh won the race.
      const created = await tx.session.create({ data: this.sessionData(session.userId, hash, meta) });
      await tx.session.update({ where: { id: session.id }, data: { replacedBy: created.id } });
      return created;
    });
    if (!next) throw new UnauthorizedException('Session was just rotated');
    return this.tokens(session.user, next.id, secret);
  }

  async logout(token: string | undefined): Promise<void> {
    const parsed = parseRefreshToken(token);
    if (!parsed) return;
    const session = await this.prisma.session.findUnique({ where: { id: parsed.sessionId } });
    if (session && sameHash(session.tokenHash, hashSecret(parsed.secret))) {
      await this.prisma.session.updateMany({ where: { id: session.id, revokedAt: null }, data: { revokedAt: new Date() } });
    }
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    return toPublicUser(user);
  }

  private async revokeAll(userId: string) {
    await this.prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  private async startSession(user: User, meta: ClientMeta): Promise<SessionTokens> {
    const { secret, hash } = newSecret();
    const session = await this.prisma.session.create({ data: this.sessionData(user.id, hash, meta) });
    return this.tokens(user, session.id, secret);
  }

  private sessionData(userId: string, tokenHash: string, meta: ClientMeta) {
    const days = this.config.get('REFRESH_TTL_DAYS', { infer: true });
    return {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      userAgent: meta.userAgent?.slice(0, 300),
    };
  }

  private tokens(user: User, sessionId: string, secret: string): SessionTokens {
    return {
      accessToken: this.jwt.sign({ sub: user.id }),
      refreshToken: formatRefreshToken(sessionId, secret),
      user: toPublicUser(user),
    };
  }
}


export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    provider: user.provider.toLowerCase() as PublicUser['provider'],
  };
}

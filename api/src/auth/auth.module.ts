import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import type { Env } from '../config/env';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards';
import { OAuthErrorFilter } from './oauth.guard';
import { GithubStrategy, GoogleStrategy, JwtStrategy } from './strategies';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: { expiresIn: config.get('JWT_TTL', { infer: true }) as `${number}m`, algorithm: 'HS256' },
      }),
    }),
    // Applied only to the sign-in endpoints via @UseGuards(ThrottlerGuard).
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => [{ ttl: 60_000, limit: config.get('AUTH_RATE_LIMIT', { infer: true }) }],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    OAuthErrorFilter,
    {
      // OAuth strategies exist only when their credentials are configured.
      provide: 'OAUTH_STRATEGIES',
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => [
        config.get('GOOGLE_CLIENT_ID', { infer: true }) ? new GoogleStrategy(config) : null,
        config.get('GITHUB_CLIENT_ID', { infer: true }) ? new GithubStrategy(config) : null,
      ].filter(Boolean),
    },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}

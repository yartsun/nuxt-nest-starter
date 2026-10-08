import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { AuthProvider } from '@prisma/client';
import { Strategy as GithubPassport } from 'passport-github2';
import { Strategy as GooglePassport, type Profile as GoogleProfile } from 'passport-google-oauth20';
import { ExtractJwt, Strategy as JwtPassport } from 'passport-jwt';
import type { Env } from '../config/env';

export interface OAuthProfile {
  provider: AuthProvider;
  providerId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(JwtPassport) {
  constructor(config: ConfigService<Env, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
      algorithms: ['HS256'],
    });
  }

  validate(payload: { sub: string }) {
    return { userId: payload.sub };
  }
}

/** Registered only when GOOGLE_CLIENT_ID/SECRET are set; see AuthModule. */
export class GoogleStrategy extends PassportStrategy(GooglePassport, 'google') {
  constructor(config: ConfigService<Env, true>) {
    super({
      clientID: config.get('GOOGLE_CLIENT_ID', { infer: true })!,
      clientSecret: config.get('GOOGLE_CLIENT_SECRET', { infer: true })!,
      callbackURL: `${config.get('API_URL', { infer: true })}/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: GoogleProfile): OAuthProfile | false {
    // Only a verified address may identify an account.
    const email = profile.emails?.find((entry) => String(entry.verified) === 'true')?.value;
    if (!email) return false;
    return {
      provider: AuthProvider.GOOGLE,
      providerId: profile.id,
      email: email.toLowerCase(),
      name: profile.displayName || email,
      avatarUrl: profile.photos?.[0]?.value,
    };
  }
}

interface GithubProfile {
  id: string;
  displayName?: string;
  username?: string;
  emails?: { value: string; verified?: boolean; primary?: boolean }[];
  photos?: { value: string }[];
}

/** Registered only when GITHUB_CLIENT_ID/SECRET are set; see AuthModule. */
export class GithubStrategy extends PassportStrategy(GithubPassport, 'github') {
  constructor(config: ConfigService<Env, true>) {
    super({
      clientID: config.get('GITHUB_CLIENT_ID', { infer: true })!,
      clientSecret: config.get('GITHUB_CLIENT_SECRET', { infer: true })!,
      callbackURL: `${config.get('API_URL', { infer: true })}/auth/github/callback`,
      scope: ['user:email'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: GithubProfile): OAuthProfile | false {
    const emails = profile.emails ?? [];
    const email = (emails.find((entry) => entry.primary && entry.verified !== false) ?? emails.find((entry) => entry.verified !== false))?.value;
    if (!email) return false;
    return {
      provider: AuthProvider.GITHUB,
      providerId: String(profile.id),
      email: email.toLowerCase(),
      name: profile.displayName || profile.username || email,
      avatarUrl: profile.photos?.[0]?.value,
    };
  }
}

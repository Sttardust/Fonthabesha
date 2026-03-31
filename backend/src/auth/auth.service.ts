import { createHash, randomBytes, randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { PasswordResetToken, RefreshSession, User, UserRole } from '@prisma/client';
import argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';
import type { AppEnvironment } from '../shared/config/app-env';
import { AuthContextService } from './auth-context.service';
import type { AuthenticatedRequest } from './auth-request';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterContributorDto } from './dto/register-contributor.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

type CurrentUserProfile = Pick<
  User,
  | 'id'
  | 'email'
  | 'displayName'
  | 'legalFullName'
  | 'countryCode'
  | 'organizationName'
  | 'phoneNumber'
  | 'role'
  | 'status'
>;

type AuthTokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
  sid?: string;
  typ: 'access' | 'refresh';
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authContext: AuthContextService,
    private readonly jwtService: JwtService,
    @Inject(ConfigService)
    private readonly configService: ConfigService<AppEnvironment, true>,
  ) {}

  async registerContributor(payload: RegisterContributorDto, request: AuthenticatedRequest) {
    const email = payload.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      throw new ConflictException('An account already exists for this email address');
    }

    const passwordHash = await argon2.hash(payload.password);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: payload.displayName.trim(),
        legalFullName: payload.legalFullName.trim(),
        countryCode: payload.countryCode.trim().toUpperCase(),
        organizationName: this.normalizeOptionalString(payload.organizationName, null),
        phoneNumber: this.normalizeOptionalString(payload.phoneNumber, null),
        role: 'contributor',
        status: 'active',
      },
    });

    const sessionId = randomUUID();
    const refreshToken = await this.signRefreshToken(user, sessionId);
    const accessToken = await this.signAccessToken(user);

    await this.prisma.refreshSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdByIpHash: this.hashValue(request.ip),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: this.toCurrentUserProfile(user),
    };
  }

  async login(payload: LoginDto, request: AuthenticatedRequest) {
    const email = payload.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await argon2.verify(user.passwordHash, payload.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const sessionId = randomUUID();
    const refreshToken = await this.signRefreshToken(user, sessionId);
    const accessToken = await this.signAccessToken(user);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
        createdByIpHash: this.hashValue(request.ip),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: this.toCurrentUserProfile(user),
    };
  }

  async refresh(payload: RefreshTokenDto, request: AuthenticatedRequest) {
    const tokenPayload = this.verifyRefreshToken(payload.refreshToken);
    const session = await this.prisma.refreshSession.findUnique({
      where: {
        id: tokenPayload.sid,
      },
      include: {
        user: true,
      },
    });

    if (!session || session.user.status !== 'active') {
      throw new UnauthorizedException('Refresh session not found');
    }

    this.assertRefreshSessionIsUsable(session, payload.refreshToken);

    const newSessionId = randomUUID();
    const newRefreshToken = await this.signRefreshToken(session.user, newSessionId);
    const accessToken = await this.signAccessToken(session.user);
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.refreshSession.update({
        where: {
          id: session.id,
        },
        data: {
          revokedAt: now,
          lastUsedAt: now,
          replacedBySessionId: newSessionId,
        },
      }),
      this.prisma.refreshSession.create({
        data: {
          id: newSessionId,
          userId: session.userId,
          tokenHash: this.hashToken(newRefreshToken),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          createdByIpHash: this.hashValue(request.ip),
          lastUsedAt: now,
        },
      }),
    ]);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: this.toCurrentUserProfile(session.user),
    };
  }

  async logout(payload: RefreshTokenDto) {
    const tokenPayload = this.verifyRefreshToken(payload.refreshToken);
    const session = await this.prisma.refreshSession.findUnique({
      where: {
        id: tokenPayload.sid,
      },
    });

    if (session && session.tokenHash === this.hashToken(payload.refreshToken) && !session.revokedAt) {
      await this.prisma.refreshSession.update({
        where: {
          id: session.id,
        },
        data: {
          revokedAt: new Date(),
          lastUsedAt: new Date(),
        },
      });
    }

    return {
      success: true,
    };
  }

  async changePassword(request: AuthenticatedRequest, payload: ChangePasswordDto) {
    const user = await this.authContext.requireUserFromRequest(request);
    const passwordMatches = await argon2.verify(user.passwordHash, payload.currentPassword);

    if (!passwordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (payload.currentPassword === payload.newPassword) {
      throw new BadRequestException('New password must be different from the current password');
    }

    const passwordHash = await argon2.hash(payload.newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          passwordHash,
        },
      }),
      this.prisma.refreshSession.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          lastUsedAt: new Date(),
        },
      }),
      this.prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(),
        },
      }),
    ]);

    return {
      success: true,
      revokedRefreshSessions: true,
    };
  }

  async requestPasswordReset(
    payload: RequestPasswordResetDto,
    request: AuthenticatedRequest,
  ): Promise<{
    success: true;
    expiresInMinutes: number;
    resetToken?: string;
  }> {
    const email = payload.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });
    const expiresInMinutes = 30;

    if (!user || user.status !== 'active') {
      return {
        success: true,
        expiresInMinutes,
      };
    }

    const resetToken = randomBytes(32).toString('hex');

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          consumedAt: null,
        },
        data: {
          consumedAt: new Date(),
        },
      }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: this.hashToken(resetToken),
          expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000),
          createdByIpHash: this.hashValue(request.ip),
        },
      }),
    ]);

    return {
      success: true,
      expiresInMinutes,
      ...(this.isProduction()
        ? {}
        : {
            resetToken,
          }),
    };
  }

  async resetPassword(payload: ResetPasswordDto) {
    const token = await this.prisma.passwordResetToken.findUnique({
      where: {
        tokenHash: this.hashToken(payload.token),
      },
      include: {
        user: true,
      },
    });

    this.assertPasswordResetTokenIsUsable(token);

    const passwordHash = await argon2.hash(payload.newPassword);
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          id: token.user.id,
        },
        data: {
          passwordHash,
        },
      }),
      this.prisma.passwordResetToken.update({
        where: {
          id: token.id,
        },
        data: {
          consumedAt: now,
        },
      }),
      this.prisma.passwordResetToken.updateMany({
        where: {
          userId: token.user.id,
          consumedAt: null,
          id: {
            not: token.id,
          },
        },
        data: {
          consumedAt: now,
        },
      }),
      this.prisma.refreshSession.updateMany({
        where: {
          userId: token.user.id,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
          lastUsedAt: now,
        },
      }),
    ]);

    return {
      success: true,
      revokedRefreshSessions: true,
    };
  }

  async getCurrentUser(request: AuthenticatedRequest): Promise<CurrentUserProfile> {
    const user = await this.authContext.requireUserFromRequest(request);
    return this.toCurrentUserProfile(user);
  }

  async updateCurrentUserProfile(
    request: AuthenticatedRequest,
    payload: UpdateProfileDto,
  ): Promise<CurrentUserProfile> {
    const user = await this.authContext.requireUserFromRequest(request);

    const updated = await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        displayName: payload.displayName?.trim() ?? user.displayName,
        legalFullName: this.normalizeOptionalString(payload.legalFullName, user.legalFullName),
        countryCode: this.normalizeCountryCode(payload.countryCode, user.countryCode),
        organizationName: this.normalizeOptionalString(
          payload.organizationName,
          user.organizationName,
        ),
        phoneNumber: this.normalizeOptionalString(payload.phoneNumber, user.phoneNumber),
      },
    });

    return this.toCurrentUserProfile(updated);
  }

  private async signAccessToken(user: User): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        typ: 'access',
      } satisfies AuthTokenPayload,
      {
        secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: '15m',
      },
    );
  }

  private async signRefreshToken(user: User, sessionId: string): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        sid: sessionId,
        typ: 'refresh',
      } satisfies AuthTokenPayload,
      {
        secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
        expiresIn: '30d',
      },
    );
  }

  private verifyRefreshToken(refreshToken: string): AuthTokenPayload & { sid: string } {
    try {
      const payload = this.jwtService.verify<AuthTokenPayload & { sid?: string }>(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
      });

      if (payload.typ !== 'refresh' || !payload.sid || !payload.sub || !payload.email) {
        throw new UnauthorizedException('Invalid refresh token payload');
      }

      return payload as AuthTokenPayload & { sid: string };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private assertRefreshSessionIsUsable(session: RefreshSession, refreshToken: string): void {
    if (session.revokedAt) {
      throw new UnauthorizedException('Refresh session has been revoked');
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh session has expired');
    }

    if (session.tokenHash !== this.hashToken(refreshToken)) {
      throw new UnauthorizedException('Refresh token does not match the active session');
    }
  }

  private assertPasswordResetTokenIsUsable(
    token: (PasswordResetToken & { user: User }) | null,
  ): asserts token is PasswordResetToken & { user: User } {
    if (!token || token.user.status !== 'active') {
      throw new UnauthorizedException('Password reset token is invalid');
    }

    if (token.consumedAt) {
      throw new UnauthorizedException('Password reset token has already been used');
    }

    if (token.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Password reset token has expired');
    }
  }

  private hashToken(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private hashValue(value: string | null | undefined): string | null {
    const normalized = value?.trim();

    if (!normalized) {
      return null;
    }

    return this.hashToken(normalized);
  }

  private normalizeOptionalString(
    value: string | null | undefined,
    fallback: string | null,
  ): string | null {
    if (value === undefined) {
      return fallback;
    }

    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private normalizeCountryCode(
    value: string | null | undefined,
    fallback: string | null,
  ): string | null {
    if (value === undefined) {
      return fallback;
    }

    const normalized = value?.trim().toUpperCase();
    return normalized ? normalized : null;
  }

  private isProduction(): boolean {
    return this.configService.get('NODE_ENV', { infer: true }) === 'production';
  }

  private toCurrentUserProfile(user: User): CurrentUserProfile {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      legalFullName: user.legalFullName,
      countryCode: user.countryCode,
      organizationName: user.organizationName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      status: user.status,
    };
  }
}

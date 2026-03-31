import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User, UserRole } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';
import type { AppEnvironment } from '../shared/config/app-env';
import type { AuthenticatedRequest } from './auth-request';

type AccessTokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
  typ: 'access';
};

@Injectable()
export class AuthContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppEnvironment, true>,
  ) {}

  async findActiveUserByEmail(email: string | undefined): Promise<User | null> {
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user || user.status !== 'active') {
      return null;
    }

    return user;
  }

  async requireUserByEmail(email: string | undefined, allowedRoles?: UserRole[]): Promise<User> {
    if (!email?.trim()) {
      throw new UnauthorizedException('x-user-email header is required');
    }

    const user = await this.findActiveUserByEmail(email);

    if (!user) {
      throw new UnauthorizedException('No user exists for the supplied x-user-email header');
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      throw new ForbiddenException('The current user does not have access to this resource');
    }

    return user;
  }

  async findActiveUserFromRequest(request: AuthenticatedRequest): Promise<User | null> {
    const bearerToken = this.extractBearerToken(request);

    if (bearerToken) {
      const payload = this.verifyAccessToken(bearerToken);

      const user = await this.prisma.user.findUnique({
        where: {
          id: payload.sub,
        },
      });

      if (!user || user.status !== 'active' || user.email !== payload.email) {
        throw new UnauthorizedException('The access token is no longer valid');
      }

      return user;
    }

    return this.findActiveUserByEmail(this.getHeaderValue(request, 'x-user-email'));
  }

  async requireUserFromRequest(
    request: AuthenticatedRequest,
    allowedRoles?: UserRole[],
  ): Promise<User> {
    const user = await this.findActiveUserFromRequest(request);

    if (!user) {
      throw new UnauthorizedException('A valid bearer token is required');
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      throw new ForbiddenException('The current user does not have access to this resource');
    }

    return user;
  }

  extractBearerToken(request: AuthenticatedRequest): string | null {
    const authorization = this.getHeaderValue(request, 'authorization');

    if (!authorization) {
      return null;
    }

    const [scheme, token] = authorization.split(' ');

    if (scheme?.toLowerCase() !== 'bearer' || !token?.trim()) {
      throw new UnauthorizedException('Authorization header must use Bearer token format');
    }

    return token.trim();
  }

  private verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const payload = this.jwtService.verify<AccessTokenPayload>(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
      });

      if (payload.typ !== 'access' || !payload.sub || !payload.email || !payload.role) {
        throw new UnauthorizedException('Invalid access token payload');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private getHeaderValue(request: AuthenticatedRequest, name: string): string | undefined {
    const rawValue = request.headers[name];

    if (Array.isArray(rawValue)) {
      return rawValue[0];
    }

    return typeof rawValue === 'string' ? rawValue : undefined;
  }
}

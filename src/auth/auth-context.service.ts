import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { User, UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthContextService {
  constructor(private readonly prisma: PrismaService) {}

  async requireUserByEmail(email: string | undefined, allowedRoles?: UserRole[]): Promise<User> {
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      throw new UnauthorizedException('x-user-email header is required');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      throw new UnauthorizedException('No user exists for the supplied x-user-email header');
    }

    if (user.status !== 'active') {
      throw new ForbiddenException('The current user is not active');
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      throw new ForbiddenException('The current user does not have access to this resource');
    }

    return user;
  }
}

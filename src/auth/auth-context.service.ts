import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { User, UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthContextService {
  constructor(private readonly prisma: PrismaService) {}

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
}

import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { AuthContextService } from './auth-context.service';
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

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authContext: AuthContextService,
  ) {}

  async getCurrentUser(email: string | undefined): Promise<CurrentUserProfile> {
    const user = await this.authContext.requireUserByEmail(email);
    return this.toCurrentUserProfile(user);
  }

  async updateCurrentUserProfile(
    email: string | undefined,
    payload: UpdateProfileDto,
  ): Promise<CurrentUserProfile> {
    const user = await this.authContext.requireUserByEmail(email);

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

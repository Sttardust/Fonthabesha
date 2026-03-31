import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';

import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './auth-request';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ConfirmEmailVerificationDto } from './dto/confirm-email-verification.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterContributorDto } from './dto/register-contributor.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() payload: LoginDto, @Req() request: AuthenticatedRequest) {
    return this.authService.login(payload, request);
  }

  @Post('register')
  register(@Body() payload: RegisterContributorDto, @Req() request: AuthenticatedRequest) {
    return this.authService.registerContributor(payload, request);
  }

  @Post('refresh')
  refresh(@Body() payload: RefreshTokenDto, @Req() request: AuthenticatedRequest) {
    return this.authService.refresh(payload, request);
  }

  @Post('logout')
  logout(@Body() payload: RefreshTokenDto) {
    return this.authService.logout(payload);
  }

  @Post('email/verification/request')
  requestEmailVerification(@Req() request: AuthenticatedRequest) {
    return this.authService.requestEmailVerification(request);
  }

  @Post('email/verification/confirm')
  confirmEmailVerification(@Body() payload: ConfirmEmailVerificationDto) {
    return this.authService.confirmEmailVerification(payload);
  }

  @Post('password/change')
  changePassword(@Req() request: AuthenticatedRequest, @Body() payload: ChangePasswordDto) {
    return this.authService.changePassword(request, payload);
  }

  @Post('password/reset/request')
  requestPasswordReset(
    @Body() payload: RequestPasswordResetDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.requestPasswordReset(payload, request);
  }

  @Post('password/reset/confirm')
  resetPassword(@Body() payload: ResetPasswordDto) {
    return this.authService.resetPassword(payload);
  }

  @Get('me')
  getCurrentUser(@Req() request: AuthenticatedRequest) {
    return this.authService.getCurrentUser(request);
  }

  @Patch('me/profile')
  updateCurrentUserProfile(@Req() request: AuthenticatedRequest, @Body() payload: UpdateProfileDto) {
    return this.authService.updateCurrentUserProfile(request, payload);
  }
}

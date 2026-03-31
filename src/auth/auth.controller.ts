import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';

import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './auth-request';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() payload: LoginDto, @Req() request: AuthenticatedRequest) {
    return this.authService.login(payload, request);
  }

  @Post('refresh')
  refresh(@Body() payload: RefreshTokenDto, @Req() request: AuthenticatedRequest) {
    return this.authService.refresh(payload, request);
  }

  @Post('logout')
  logout(@Body() payload: RefreshTokenDto) {
    return this.authService.logout(payload);
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

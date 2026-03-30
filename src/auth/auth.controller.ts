import { Body, Controller, Get, Headers, Patch } from '@nestjs/common';

import { AuthService } from './auth.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  getCurrentUser(@Headers('x-user-email') userEmail?: string) {
    return this.authService.getCurrentUser(userEmail);
  }

  @Patch('me/profile')
  updateCurrentUserProfile(
    @Headers('x-user-email') userEmail: string | undefined,
    @Body() payload: UpdateProfileDto,
  ) {
    return this.authService.updateCurrentUserProfile(userEmail, payload);
  }
}

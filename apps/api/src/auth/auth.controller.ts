import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ActiveUserGuard } from './guards/active-user.guard';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';
import { MessageResponseDto } from './dto/message-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Email and password are required',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  login(@Request() req): LoginResponseDto {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return this.authService.login(req.user);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    type: MessageResponseDto,
  })
  logout(): MessageResponseDto {
    return this.authService.logout();
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  getProfile(@Request() req): any {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return req.user;
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current user password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password updated successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid password input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'User account is inactive' })
  changePassword(
    @Request() req,
    @Body() body: ChangePasswordDto,
  ): Promise<MessageResponseDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return this.authService.changePassword(
      req.user.id,
      body.currentPassword,
      body.newPassword,
    );
  }

  @Post('password-reset/request')
  @ApiOperation({ summary: 'Request a password reset' })
  @ApiBody({ type: PasswordResetRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset request accepted',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid email address',
  })
  async requestPasswordReset(
    @Request() req,
    @Body() body: PasswordResetRequestDto,
  ): Promise<MessageResponseDto> {
    await this.authService.requestPasswordReset(body.email, {
      requestIp: req.ip as string | undefined,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      userAgent: req.headers?.['user-agent'] as string | undefined,
      frontendBaseUrl: body.frontendBaseUrl,
    });

    return {
      message:
        'If an account exists for this email, a password reset link will be sent.',
    };
  }

  @Post('password-reset/confirm')
  @ApiOperation({ summary: 'Confirm password reset' })
  @ApiBody({ type: PasswordResetConfirmDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired token',
  })
  @ApiResponse({
    status: 400,
    description: 'Passwords do not match',
  })
  resetPassword(
    @Body() body: PasswordResetConfirmDto,
  ): Promise<MessageResponseDto> {
    return this.authService.resetPassword(
      body.token,
      body.newPassword,
      body.confirmPassword,
    );
  }
}

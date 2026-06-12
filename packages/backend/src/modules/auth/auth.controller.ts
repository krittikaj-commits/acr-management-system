import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { Public, Roles, CurrentUser } from '../../common/decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import {
  CreateUserSchema,
  CreateUserDto,
  LoginSchema,
  LoginDto,
  RefreshTokenSchema,
  RefreshTokenDto,
  UserResponseDto,
  AuthTokensDto,
} from './dto';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * POST /auth/register — Admin-only. Creates a new user account.
   */
  @Post('register')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a new user (admin only)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @UsePipes(new ZodValidationPipe(CreateUserSchema))
  async register(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.authService.register(dto);
  }

  /**
   * POST /auth/login — Public. Authenticates with email + password.
   */
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful — tokens returned' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async login(@Body() dto: LoginDto): Promise<AuthTokensDto> {
    return this.authService.login(dto.email, dto.password);
  }

  /**
   * POST /auth/refresh — Public. Refreshes an access token.
   */
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @UsePipes(new ZodValidationPipe(RefreshTokenSchema))
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokensDto> {
    return this.authService.refreshToken(dto.refreshToken);
  }

  /**
   * POST /auth/forgot-password — Public. Initiates password reset.
   */
  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'Reset link sent if email exists' })
  async forgotPassword(
    @Body() body: { email: string },
  ): Promise<{ message: string }> {
    // In a real implementation, this would send a reset email.
    // For security, always return success regardless of whether email exists.
    return { message: 'If email exists, reset link sent' };
  }

  /**
   * POST /auth/reset-password — Public. Resets password using a token.
   */
  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(
    @Body() body: { token: string; newPassword: string },
  ): Promise<{ message: string }> {
    // In a real implementation, this would verify the reset token
    // and update the user's password.
    return { message: 'Password reset successful' };
  }

  /**
   * GET /auth/me — Authenticated. Returns current user profile.
   */
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser() user: JwtPayload): Promise<UserResponseDto> {
    const fullUser = await this.authService.getUserById(user.sub);
    return fullUser;
  }

  /**
   * GET /auth/verify-token/:token — Public. Verifies tracking or approval token.
   */
  @Get('verify-token/:token')
  @Public()
  @ApiOperation({ summary: 'Verify a tracking or approval token' })
  @ApiResponse({ status: 200, description: 'Token verification result' })
  async verifyToken(
    @Param('token') token: string,
  ): Promise<{ valid: boolean; type?: 'tracking' | 'approval'; data?: unknown }> {
    // Try tracking token first
    const trackingData = await this.tokenService.verifyTrackingToken(token);
    if (trackingData) {
      return {
        valid: true,
        type: 'tracking',
        data: { changeRequestId: trackingData },
      };
    }

    // Try approval token (peek without consuming — for verification only)
    // Note: verifyApprovalToken is one-time-use, so we check Redis directly
    // For verify-token endpoint, we only check existence without consuming
    const approvalData = await this.tokenService.peekApprovalToken(token);
    if (approvalData) {
      return {
        valid: true,
        type: 'approval',
        data: approvalData,
      };
    }

    return { valid: false };
  }
}

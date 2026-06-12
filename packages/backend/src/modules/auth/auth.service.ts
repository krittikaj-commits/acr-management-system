import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { UserRepository } from './user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto, toUserResponseDto } from './dto/user-response.dto';
import { AuthTokensDto } from './dto/auth-tokens.dto';

const BCRYPT_ROUNDS = 10;

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Register a new user (admin-only operation).
   * Hashes the password, creates the user, and returns a safe response DTO.
   */
  async register(dto: CreateUserDto): Promise<UserResponseDto> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await this.hashPassword(dto.password);
    const user = await this.userRepository.create({ ...dto, passwordHash });
    return toUserResponseDto(user);
  }

  /**
   * Authenticate a user with email and password.
   * Returns access + refresh tokens on success.
   */
  async login(email: string, password: string): Promise<AuthTokensDto> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await this.validatePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  /**
   * Refresh an access token using a valid refresh token.
   * Returns a new access token (and the same refresh token).
   */
  async refreshToken(refreshToken: string): Promise<AuthTokensDto> {
    const jwtSecret = this.getJwtSecret();

    let payload: JwtPayload;
    try {
      payload = jwt.verify(refreshToken, jwtSecret) as JwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    return this.generateTokens(user);
  }

  /**
   * Get a user by ID. Throws NotFoundException if not found.
   */
  async getUserById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toUserResponseDto(user);
  }

  /**
   * Compare a plain-text password with a bcrypt hash.
   */
  async validatePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  /**
   * Hash a plain-text password with bcrypt.
   */
  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  /**
   * Generate access and refresh JWT tokens for a user.
   */
  generateTokens(user: {
    id: string;
    email: string;
    role: { name: string };
  }): AuthTokensDto {
    const jwtSecret = this.getJwtSecret();
    const jwtExpiry = process.env.JWT_EXPIRY ?? '15m';
    const jwtRefreshExpiry = process.env.JWT_REFRESH_EXPIRY ?? '7d';

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
    };

    const accessToken = jwt.sign(payload, jwtSecret, {
      expiresIn: jwtExpiry,
    });

    const refreshToken = jwt.sign(payload, jwtSecret, {
      expiresIn: jwtRefreshExpiry,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: jwtExpiry,
    };
  }

  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }
    return secret;
  }
}

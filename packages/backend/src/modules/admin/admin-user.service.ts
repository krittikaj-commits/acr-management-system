import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { UserRepository } from '../auth/user.repository';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { UserResponseDto, toUserResponseDto } from '../auth/dto/user-response.dto';

export interface ListUsersOptions {
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string;
}

export interface PaginatedUsersResult {
  data: UserResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class AdminUserService {
  constructor(
    private readonly authService: AuthService,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * Create a new user (admin operation).
   * Delegates to AuthService.register for password hashing and duplicate checks.
   */
  async createUser(dto: AdminCreateUserDto, _adminUserId: string): Promise<UserResponseDto> {
    return this.authService.register(dto);
  }

  /**
   * Update user fields (name, email, position, role, isActive).
   * If password is provided, it will be hashed before storing.
   */
  async updateUser(userId: string, dto: AdminUpdateUserDto): Promise<UserResponseDto> {
    const existing = await this.userRepository.findById(userId);
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    // Check for email conflict if email is being changed
    if (dto.email && dto.email !== existing.email) {
      const emailConflict = await this.userRepository.findByEmail(dto.email);
      if (emailConflict) {
        throw new ConflictException('Email already in use');
      }
    }

    // Hash password if provided
    let passwordHash: string | undefined;
    if (dto.password) {
      passwordHash = await this.authService.hashPassword(dto.password);
    }

    const { password, ...updateFields } = dto as AdminUpdateUserDto & { password?: string };
    const updateData = passwordHash
      ? { ...updateFields, passwordHash }
      : { ...updateFields };

    const updated = await this.userRepository.update(userId, updateData);
    return toUserResponseDto(updated);
  }

  /**
   * Deactivate a user (soft delete — sets isActive=false).
   */
  async deactivateUser(userId: string): Promise<UserResponseDto> {
    const existing = await this.userRepository.findById(userId);
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const deactivated = await this.userRepository.deactivate(userId);
    return toUserResponseDto(deactivated);
  }

  /**
   * Reactivate a previously deactivated user (sets isActive=true).
   */
  async reactivateUser(userId: string): Promise<UserResponseDto> {
    const existing = await this.userRepository.findById(userId);
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const reactivated = await this.userRepository.update(userId, { isActive: true });
    return toUserResponseDto(reactivated);
  }

  /**
   * Assign a role to a user.
   */
  async assignRole(userId: string, roleId: string): Promise<UserResponseDto> {
    const existing = await this.userRepository.findById(userId);
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const role = await this.userRepository.findRoleById(roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const updated = await this.userRepository.update(userId, { roleId });
    return toUserResponseDto(updated);
  }

  /**
   * List users with pagination and optional filters (isActive, search).
   */
  async listUsers(options?: ListUsersOptions): Promise<PaginatedUsersResult> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const { users, total } = await this.userRepository.findAll({
      skip,
      take: limit,
      isActive: options?.isActive,
    });

    const data = users.map((user) => toUserResponseDto(user));
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: { total, page, limit, totalPages },
    };
  }

  /**
   * Get a single user by ID with role info.
   */
  async getUserById(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toUserResponseDto(user);
  }
}

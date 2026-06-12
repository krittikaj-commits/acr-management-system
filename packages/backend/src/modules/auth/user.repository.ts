import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find a user by ID with their role.
   */
  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
  }

  /**
   * Find a user by email with their role.
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
  }

  /**
   * List all users with pagination.
   */
  async findAll(options?: { skip?: number; take?: number; isActive?: boolean }) {
    const where = options?.isActive !== undefined ? { isActive: options.isActive } : {};
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { role: true },
        skip: options?.skip ?? 0,
        take: options?.take ?? 50,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { users, total };
  }

  /**
   * Create a new user.
   */
  async create(data: CreateUserDto & { passwordHash: string }) {
    const { passwordHash, ...rest } = data;
    return this.prisma.user.create({
      data: {
        email: rest.email,
        passwordHash,
        firstName: rest.firstName,
        lastName: rest.lastName,
        position: rest.position ?? null,
        roleId: rest.roleId,
      },
      include: { role: true },
    });
  }

  /**
   * Update an existing user.
   */
  async update(id: string, data: UpdateUserDto & { passwordHash?: string }) {
    const { password, passwordHash, ...rest } = data as UpdateUserDto & {
      passwordHash?: string;
    };
    const updateData: Record<string, unknown> = { ...rest };
    if (passwordHash) {
      updateData.passwordHash = passwordHash;
    }
    return this.prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true },
    });
  }

  /**
   * Deactivate a user (soft delete).
   */
  async deactivate(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      include: { role: true },
    });
  }

  /**
   * Find all roles.
   */
  async findAllRoles() {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Find a role by ID.
   */
  async findRoleById(id: string) {
    return this.prisma.role.findUnique({
      where: { id },
    });
  }

  /**
   * Find a role by name.
   */
  async findRoleByName(name: string) {
    return this.prisma.role.findUnique({
      where: { name },
    });
  }
}

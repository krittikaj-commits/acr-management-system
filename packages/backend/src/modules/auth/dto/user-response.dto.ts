/**
 * UserResponseDto — User data returned to clients (excludes passwordHash).
 */
export interface UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  position: string | null;
  roleId: string;
  role: {
    id: string;
    name: string;
    permissions: Record<string, string[]>;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Maps a Prisma User (with role) to the response DTO, omitting passwordHash.
 */
export function toUserResponseDto(user: {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  position: string | null;
  roleId: string;
  role: {
    id: string;
    name: string;
    permissions: unknown;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    position: user.position,
    roleId: user.roleId,
    role: {
      id: user.role.id,
      name: user.role.name,
      permissions: user.role.permissions as Record<string, string[]>,
    },
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

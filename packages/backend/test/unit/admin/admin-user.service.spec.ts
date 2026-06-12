import { NotFoundException, ConflictException } from '@nestjs/common';
import { AdminUserService } from '../../../src/modules/admin/admin-user.service';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { UserRepository } from '../../../src/modules/auth/user.repository';

describe('AdminUserService', () => {
  let adminUserService: AdminUserService;
  let authService: jest.Mocked<AuthService>;
  let userRepository: jest.Mocked<UserRepository>;

  const mockRole = {
    id: 'role-uuid-001',
    name: 'Admin',
    permissions: { users: ['read', 'write'] },
  };

  const mockUser = {
    id: 'user-uuid-001',
    email: 'admin@dits.co.th',
    passwordHash: '$2b$10$hashedpasswordhere',
    firstName: 'Admin',
    lastName: 'User',
    position: 'System Administrator',
    roleId: 'role-uuid-001',
    role: mockRole,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    authService = {
      register: jest.fn(),
      hashPassword: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
      getUserById: jest.fn(),
      validatePassword: jest.fn(),
      generateTokens: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    userRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
      findAllRoles: jest.fn(),
      findRoleById: jest.fn(),
      findRoleByName: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    adminUserService = new AdminUserService(authService, userRepository);
  });

  describe('createUser', () => {
    it('should create a user via AuthService.register', async () => {
      const dto = {
        email: 'newuser@dits.co.th',
        password: 'SecurePass123!',
        firstName: 'New',
        lastName: 'User',
        roleId: 'role-uuid-001',
      };

      const expectedResponse = {
        id: 'user-uuid-002',
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        position: null,
        roleId: dto.roleId,
        role: { id: mockRole.id, name: mockRole.name, permissions: mockRole.permissions },
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      authService.register.mockResolvedValue(expectedResponse);

      const result = await adminUserService.createUser(dto, 'admin-user-id');

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResponse);
      expect(result.email).toBe(dto.email);
      expect(result.firstName).toBe(dto.firstName);
    });

    it('should propagate ConflictException when email already exists', async () => {
      const dto = {
        email: 'existing@dits.co.th',
        password: 'SecurePass123!',
        firstName: 'Existing',
        lastName: 'User',
        roleId: 'role-uuid-001',
      };

      authService.register.mockRejectedValue(new ConflictException('Email already registered'));

      await expect(adminUserService.createUser(dto, 'admin-user-id')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updateUser', () => {
    it('should update user fields successfully', async () => {
      const updateDto = {
        firstName: 'Updated',
        lastName: 'Name',
        position: 'Senior Developer',
      };

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue({
        ...mockUser,
        firstName: updateDto.firstName,
        lastName: updateDto.lastName,
        position: updateDto.position,
      });

      const result = await adminUserService.updateUser('user-uuid-001', updateDto);

      expect(userRepository.findById).toHaveBeenCalledWith('user-uuid-001');
      expect(userRepository.update).toHaveBeenCalledWith('user-uuid-001', updateDto);
      expect(result.firstName).toBe('Updated');
      expect(result.lastName).toBe('Name');
      expect(result.position).toBe('Senior Developer');
    });

    it('should hash password when password is provided in update', async () => {
      const updateDto = {
        password: 'NewSecurePass123!',
      };

      userRepository.findById.mockResolvedValue(mockUser);
      authService.hashPassword.mockResolvedValue('$2b$10$newhashedpassword');
      userRepository.update.mockResolvedValue(mockUser);

      await adminUserService.updateUser('user-uuid-001', updateDto);

      expect(authService.hashPassword).toHaveBeenCalledWith('NewSecurePass123!');
      expect(userRepository.update).toHaveBeenCalledWith(
        'user-uuid-001',
        expect.objectContaining({ passwordHash: '$2b$10$newhashedpassword' }),
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(
        adminUserService.updateUser('nonexistent-id', { firstName: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when changing email to one already in use', async () => {
      const updateDto = { email: 'taken@dits.co.th' };

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        id: 'other-user-id',
        email: 'taken@dits.co.th',
      });

      await expect(
        adminUserService.updateUser('user-uuid-001', updateDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow updating email if same as current user email', async () => {
      const updateDto = { email: 'admin@dits.co.th', firstName: 'Updated' };

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue({
        ...mockUser,
        firstName: 'Updated',
      });

      const result = await adminUserService.updateUser('user-uuid-001', updateDto);

      expect(userRepository.findByEmail).not.toHaveBeenCalled();
      expect(result.firstName).toBe('Updated');
    });
  });

  describe('deactivateUser', () => {
    it('should set isActive=false for the user', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.deactivate.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      const result = await adminUserService.deactivateUser('user-uuid-001');

      expect(userRepository.deactivate).toHaveBeenCalledWith('user-uuid-001');
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(
        adminUserService.deactivateUser('nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reactivateUser', () => {
    it('should set isActive=true for a deactivated user', async () => {
      const deactivatedUser = { ...mockUser, isActive: false };
      userRepository.findById.mockResolvedValue(deactivatedUser);
      userRepository.update.mockResolvedValue({
        ...mockUser,
        isActive: true,
      });

      const result = await adminUserService.reactivateUser('user-uuid-001');

      expect(userRepository.update).toHaveBeenCalledWith('user-uuid-001', { isActive: true });
      expect(result.isActive).toBe(true);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(
        adminUserService.reactivateUser('nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignRole', () => {
    it('should change the user role successfully', async () => {
      const newRole = {
        id: 'role-uuid-002',
        name: 'IT Reviewer',
        permissions: { changeRequests: ['read', 'review'] },
      };

      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.findRoleById.mockResolvedValue(newRole);
      userRepository.update.mockResolvedValue({
        ...mockUser,
        roleId: newRole.id,
        role: newRole,
      });

      const result = await adminUserService.assignRole('user-uuid-001', 'role-uuid-002');

      expect(userRepository.findRoleById).toHaveBeenCalledWith('role-uuid-002');
      expect(userRepository.update).toHaveBeenCalledWith('user-uuid-001', {
        roleId: 'role-uuid-002',
      });
      expect(result.roleId).toBe('role-uuid-002');
      expect(result.role.name).toBe('IT Reviewer');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(
        adminUserService.assignRole('nonexistent-id', 'role-uuid-002'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when role does not exist', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.findRoleById.mockResolvedValue(null);

      await expect(
        adminUserService.assignRole('user-uuid-001', 'nonexistent-role'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listUsers', () => {
    it('should return paginated results with default pagination', async () => {
      const users = [mockUser, { ...mockUser, id: 'user-uuid-002', email: 'user2@dits.co.th' }];
      userRepository.findAll.mockResolvedValue({ users, total: 2 });

      const result = await adminUserService.listUsers();

      expect(userRepository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        isActive: undefined,
      });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should apply pagination parameters', async () => {
      userRepository.findAll.mockResolvedValue({ users: [mockUser], total: 25 });

      const result = await adminUserService.listUsers({ page: 2, limit: 10 });

      expect(userRepository.findAll).toHaveBeenCalledWith({
        skip: 10,
        take: 10,
        isActive: undefined,
      });
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(3);
    });

    it('should filter by isActive status', async () => {
      userRepository.findAll.mockResolvedValue({ users: [mockUser], total: 1 });

      await adminUserService.listUsers({ isActive: true });

      expect(userRepository.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        isActive: true,
      });
    });

    it('should return empty data when no users found', async () => {
      userRepository.findAll.mockResolvedValue({ users: [], total: 0 });

      const result = await adminUserService.listUsers();

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('getUserById', () => {
    it('should return the user with role info', async () => {
      userRepository.findById.mockResolvedValue(mockUser);

      const result = await adminUserService.getUserById('user-uuid-001');

      expect(userRepository.findById).toHaveBeenCalledWith('user-uuid-001');
      expect(result.id).toBe('user-uuid-001');
      expect(result.email).toBe('admin@dits.co.th');
      expect(result.role.name).toBe('Admin');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(
        adminUserService.getUserById('nonexistent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { UserRepository } from '../../../src/modules/auth/user.repository';

const JWT_SECRET = 'test-secret-key-for-unit-tests-minimum-16-chars';

describe('AuthService', () => {
  let authService: AuthService;
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

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.JWT_EXPIRY = '15m';
    process.env.JWT_REFRESH_EXPIRY = '7d';
  });

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
      findAllRoles: jest.fn(),
      findRoleById: jest.fn(),
      findRoleByName: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    authService = new AuthService(userRepository);
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_EXPIRY;
    delete process.env.JWT_REFRESH_EXPIRY;
  });

  describe('register', () => {
    it('should create a user with a hashed password and return response without passwordHash', async () => {
      const dto = {
        email: 'new@dits.co.th',
        password: 'SecurePass123!',
        firstName: 'New',
        lastName: 'User',
        roleId: 'role-uuid-001',
      };

      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({
        ...mockUser,
        id: 'user-uuid-002',
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        position: null,
      });

      const result = await authService.register(dto);

      // Verify password was hashed (not stored as plain text)
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          roleId: dto.roleId,
          passwordHash: expect.any(String),
        }),
      );

      // Verify the hash is not the plain password
      const callArgs = userRepository.create.mock.calls[0][0];
      expect(callArgs.passwordHash).not.toBe(dto.password);

      // Verify bcrypt hash format
      expect(callArgs.passwordHash).toMatch(/^\$2[aby]\$\d+\$/);

      // Verify response does not contain passwordHash
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email', dto.email);
      expect(result).toHaveProperty('role');
    });

    it('should throw ConflictException when email already exists', async () => {
      const dto = {
        email: 'admin@dits.co.th',
        password: 'SecurePass123!',
        firstName: 'Duplicate',
        lastName: 'User',
        roleId: 'role-uuid-001',
      };

      userRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(authService.register(dto)).rejects.toThrow(ConflictException);
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      // Create a real hash for verification
      const plainPassword = 'SecurePass123!';
      const realHash = await bcrypt.hash(plainPassword, 10);

      userRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        passwordHash: realHash,
      });

      const result = await authService.login('admin@dits.co.th', plainPassword);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn', '15m');

      // Verify access token payload
      const decoded = jwt.verify(result.accessToken, JWT_SECRET) as jwt.JwtPayload;
      expect(decoded.sub).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role.name);
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login('nonexistent@dits.co.th', 'anypassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      const realHash = await bcrypt.hash('CorrectPassword123!', 10);
      userRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        passwordHash: realHash,
      });

      await expect(
        authService.login('admin@dits.co.th', 'WrongPassword123!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for deactivated user', async () => {
      const realHash = await bcrypt.hash('SecurePass123!', 10);
      userRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        passwordHash: realHash,
        isActive: false,
      });

      await expect(
        authService.login('admin@dits.co.th', 'SecurePass123!'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens for a valid refresh token', async () => {
      const payload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role.name,
      };
      const validRefreshToken = jwt.sign(payload, JWT_SECRET, {
        expiresIn: '7d',
      });

      userRepository.findById.mockResolvedValue(mockUser);

      const result = await authService.refreshToken(validRefreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn', '15m');

      // Verify new access token is valid
      const decoded = jwt.verify(result.accessToken, JWT_SECRET) as jwt.JwtPayload;
      expect(decoded.sub).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role.name);
    });

    it('should throw UnauthorizedException for an invalid refresh token', async () => {
      await expect(authService.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for an expired refresh token', async () => {
      const payload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role.name,
      };
      const expiredToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '0s' });

      // Small delay to ensure token is expired
      await new Promise((resolve) => setTimeout(resolve, 10));

      await expect(authService.refreshToken(expiredToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for deactivated user on refresh', async () => {
      const payload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role.name,
      };
      const validRefreshToken = jwt.sign(payload, JWT_SECRET, {
        expiresIn: '7d',
      });

      userRepository.findById.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(authService.refreshToken(validRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validatePassword', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'MyPassword123!';
      const hash = await bcrypt.hash(password, 10);

      const result = await authService.validatePassword(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const hash = await bcrypt.hash('OriginalPassword', 10);

      const result = await authService.validatePassword('WrongPassword', hash);
      expect(result).toBe(false);
    });
  });

  describe('hashPassword', () => {
    it('should produce a valid bcrypt hash', async () => {
      const password = 'TestPassword123!';
      const hash = await authService.hashPassword(password);

      // Verify it's a bcrypt hash
      expect(hash).toMatch(/^\$2[aby]\$\d+\$/);

      // Verify the hash validates against the original password
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it('should produce different hashes for the same password (salt)', async () => {
      const password = 'TestPassword123!';
      const hash1 = await authService.hashPassword(password);
      const hash2 = await authService.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens with correct payload', () => {
      const user = {
        id: 'user-uuid-001',
        email: 'admin@dits.co.th',
        role: { name: 'Admin' },
      };

      const tokens = authService.generateTokens(user);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBe('15m');

      // Verify access token payload
      const accessPayload = jwt.verify(tokens.accessToken, JWT_SECRET) as jwt.JwtPayload;
      expect(accessPayload.sub).toBe(user.id);
      expect(accessPayload.email).toBe(user.email);
      expect(accessPayload.role).toBe(user.role.name);

      // Verify refresh token payload
      const refreshPayload = jwt.verify(tokens.refreshToken, JWT_SECRET) as jwt.JwtPayload;
      expect(refreshPayload.sub).toBe(user.id);
      expect(refreshPayload.email).toBe(user.email);
      expect(refreshPayload.role).toBe(user.role.name);
    });
  });
});

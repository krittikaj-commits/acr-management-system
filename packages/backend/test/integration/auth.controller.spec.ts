import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RedisService } from '../../src/modules/redis/redis.service';

const JWT_SECRET = 'test-jwt-secret-for-integration';

const mockAdminUser = {
  id: 'admin-uuid-1',
  email: 'admin@dits.co.th',
  passwordHash: '', // will be set in beforeAll
  firstName: 'Admin',
  lastName: 'User',
  position: 'System Admin',
  roleId: 'role-admin-uuid',
  role: {
    id: 'role-admin-uuid',
    name: 'admin',
    permissions: { all: ['*'] },
  },
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockRegularUser = {
  id: 'user-uuid-1',
  email: 'user@dits.co.th',
  passwordHash: '', // will be set in beforeAll
  firstName: 'Regular',
  lastName: 'User',
  position: 'Developer',
  roleId: 'role-user-uuid',
  role: {
    id: 'role-user-uuid',
    name: 'requester',
    permissions: { changeRequests: ['create', 'read'] },
  },
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

function generateAdminToken(): string {
  return jwt.sign(
    { sub: mockAdminUser.id, email: mockAdminUser.email, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '15m' },
  );
}

function generateUserToken(): string {
  return jwt.sign(
    { sub: mockRegularUser.id, email: mockRegularUser.email, role: 'requester' },
    JWT_SECRET,
    { expiresIn: '15m' },
  );
}

function generateRefreshToken(): string {
  return jwt.sign(
    { sub: mockRegularUser.id, email: mockRegularUser.email, role: 'requester' },
    JWT_SECRET,
    { expiresIn: '7d' },
  );
}

describe('AuthController (Integration)', () => {
  let app: INestApplication;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    role: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(false),
    getClient: jest.fn().mockReturnValue({}),
    onModuleDestroy: jest.fn(),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET;

    // Hash passwords for mock users
    const hash = await bcrypt.hash('ValidPass123', 10);
    mockAdminUser.passwordHash = hash;
    mockRegularUser.passwordHash = hash;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.JWT_SECRET;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset default redis mock behavior
    mockRedisService.get.mockResolvedValue(null);
  });

  describe('POST /auth/register', () => {
    const createUserPayload = {
      email: 'newuser@dits.co.th',
      password: 'SecurePass123',
      firstName: 'New',
      lastName: 'User',
      position: 'Developer',
      roleId: '550e8400-e29b-41d4-a716-446655440000',
    };

    it('should create a user when called by admin', async () => {
      const createdUser = {
        id: 'new-user-uuid',
        email: createUserPayload.email,
        passwordHash: '$2b$10$hashed',
        firstName: createUserPayload.firstName,
        lastName: createUserPayload.lastName,
        position: createUserPayload.position,
        roleId: createUserPayload.roleId,
        role: {
          id: createUserPayload.roleId,
          name: 'requester',
          permissions: { changeRequests: ['create', 'read'] },
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // findByEmail returns null (no conflict)
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);
      // create returns the new user
      mockPrismaService.user.create.mockResolvedValueOnce(createdUser);

      const adminToken = generateAdminToken();

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createUserPayload)
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('id', 'new-user-uuid');
      expect(response.body).toHaveProperty('email', createUserPayload.email);
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should return 403 when called by non-admin', async () => {
      const userToken = generateUserToken();

      await request(app.getHttpServer())
        .post('/auth/register')
        .set('Authorization', `Bearer ${userToken}`)
        .send(createUserPayload)
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('POST /auth/login', () => {
    it('should return tokens with valid credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(mockRegularUser);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@dits.co.th', password: 'ValidPass123' })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');
    });

    it('should return 401 with invalid credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'wrong@dits.co.th', password: 'WrongPass123' })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should return new tokens with valid refresh token', async () => {
      const refreshToken = generateRefreshToken();
      mockPrismaService.user.findUnique.mockResolvedValueOnce(mockRegularUser);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('expiresIn');
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user data when authenticated', async () => {
      const token = generateUserToken();
      mockPrismaService.user.findUnique.mockResolvedValueOnce(mockRegularUser);

      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('id', mockRegularUser.id);
      expect(response.body).toHaveProperty('email', mockRegularUser.email);
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RedisService } from '../../src/modules/redis/redis.service';

const JWT_SECRET = 'test-jwt-secret-for-integration';

const mockAdminRole = {
  id: 'role-admin-uuid',
  name: 'admin',
  permissions: { all: ['*'] },
};

const mockRequesterRole = {
  id: 'role-requester-uuid',
  name: 'requester',
  permissions: { changeRequests: ['create', 'read'] },
};

const mockAdminUser = {
  id: 'admin-uuid-1',
  email: 'admin@dits.co.th',
  passwordHash: '$2b$10$hashedpassword',
  firstName: 'Admin',
  lastName: 'User',
  position: 'System Admin',
  roleId: mockAdminRole.id,
  role: mockAdminRole,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockRegularUser = {
  id: 'user-uuid-1',
  email: 'user@dits.co.th',
  passwordHash: '$2b$10$hashedpassword',
  firstName: 'Regular',
  lastName: 'User',
  position: 'Developer',
  roleId: mockRequesterRole.id,
  role: mockRequesterRole,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockMasterData = {
  id: 'md-uuid-1',
  category: 'service',
  code: 'APP_DEV',
  nameEn: 'Application Development',
  nameTh: 'พัฒนาแอปพลิเคชัน',
  description: 'Application development services',
  sortOrder: 1,
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

function generateRequesterToken(): string {
  return jwt.sign(
    { sub: mockRegularUser.id, email: mockRegularUser.email, role: 'requester' },
    JWT_SECRET,
    { expiresIn: '15m' },
  );
}

describe('AdminController (Integration)', () => {
  let app: INestApplication;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    masterData: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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
    mockRedisService.get.mockResolvedValue(null);
  });

  // ─── User Management ──────────────────────────────────────────────────────────

  describe('GET /admin/users', () => {
    it('should return paginated list of users for admin', async () => {
      mockPrismaService.user.findMany.mockResolvedValueOnce([mockAdminUser, mockRegularUser]);
      mockPrismaService.user.count.mockResolvedValueOnce(2);

      const adminToken = generateAdminToken();

      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('total', 2);
      expect(response.body.meta).toHaveProperty('page', 1);
      expect(response.body.meta).toHaveProperty('totalPages');
      expect(response.body.data).toHaveLength(2);
      // Should not expose passwordHash
      expect(response.body.data[0]).not.toHaveProperty('passwordHash');
    });

    it('should support pagination query params', async () => {
      mockPrismaService.user.findMany.mockResolvedValueOnce([mockRegularUser]);
      mockPrismaService.user.count.mockResolvedValueOnce(2);

      const adminToken = generateAdminToken();

      const response = await request(app.getHttpServer())
        .get('/admin/users?page=2&limit=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.meta).toHaveProperty('page', 2);
      expect(response.body.meta).toHaveProperty('limit', 1);
    });
  });

  describe('POST /admin/users', () => {
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
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createUserPayload)
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('id', 'new-user-uuid');
      expect(response.body).toHaveProperty('email', createUserPayload.email);
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should return 400 for invalid payload', async () => {
      const adminToken = generateAdminToken();

      await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'not-valid' }) // missing required fields
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  // ─── Master Data Management ────────────────────────────────────────────────────

  describe('POST /admin/master-data', () => {
    const createMasterDataPayload = {
      category: 'service',
      code: 'NET_INFRA',
      nameEn: 'Network Infrastructure',
      nameTh: 'โครงสร้างพื้นฐานเครือข่าย',
      description: 'Network infrastructure services',
      sortOrder: 2,
    };

    it('should create master data entry when called by admin', async () => {
      const createdEntry = {
        id: 'md-new-uuid',
        ...createMasterDataPayload,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // findByCode returns null (no conflict)
      mockPrismaService.masterData.findUnique.mockResolvedValueOnce(null);
      // create returns the new entry
      mockPrismaService.masterData.create.mockResolvedValueOnce(createdEntry);

      const adminToken = generateAdminToken();

      const response = await request(app.getHttpServer())
        .post('/admin/master-data')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createMasterDataPayload)
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('id', 'md-new-uuid');
      expect(response.body).toHaveProperty('category', 'service');
      expect(response.body).toHaveProperty('code', 'NET_INFRA');
      expect(response.body).toHaveProperty('isActive', true);
    });
  });

  describe('POST /admin/master-data/:id/disable', () => {
    it('should soft-disable a master data entry', async () => {
      const disabledEntry = { ...mockMasterData, isActive: false };

      // findById returns existing record
      mockPrismaService.masterData.findUnique.mockResolvedValueOnce(mockMasterData);
      // update returns disabled record
      mockPrismaService.masterData.update.mockResolvedValueOnce(disabledEntry);

      const adminToken = generateAdminToken();

      const response = await request(app.getHttpServer())
        .post(`/admin/master-data/${mockMasterData.id}/disable`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('id', mockMasterData.id);
      expect(response.body).toHaveProperty('isActive', false);
    });

    it('should return 404 for non-existent master data', async () => {
      mockPrismaService.masterData.findUnique.mockResolvedValueOnce(null);

      const adminToken = generateAdminToken();

      await request(app.getHttpServer())
        .post('/admin/master-data/non-existent-id/disable')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  // ─── Role-Based Access Control ─────────────────────────────────────────────────

  describe('Non-admin access control', () => {
    it('should return 403 for GET /admin/users when called by non-admin', async () => {
      const requesterToken = generateRequesterToken();

      await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${requesterToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return 403 for POST /admin/users when called by non-admin', async () => {
      const requesterToken = generateRequesterToken();

      await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          email: 'new@dits.co.th',
          password: 'SecurePass123',
          firstName: 'New',
          lastName: 'User',
          roleId: '550e8400-e29b-41d4-a716-446655440000',
        })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return 403 for POST /admin/master-data when called by non-admin', async () => {
      const requesterToken = generateRequesterToken();

      await request(app.getHttpServer())
        .post('/admin/master-data')
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({
          category: 'service',
          code: 'TEST',
          nameEn: 'Test',
          nameTh: 'ทดสอบ',
        })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return 401 when no token is provided', async () => {
      await request(app.getHttpServer())
        .get('/admin/users')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});

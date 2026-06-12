import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RedisService } from '../../src/modules/redis/redis.service';

const JWT_SECRET = 'test-jwt-secret-for-integration';

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const mockWorkflowDefinition = {
  id: 'wf-def-uuid-1',
  name: 'Standard CR Workflow',
  versionNumber: 1,
  isActive: true,
  isDefault: true,
  metadata: {},
  createdById: 'admin-uuid-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  steps: [
    {
      id: 'step-uuid-1',
      workflowDefinitionId: 'wf-def-uuid-1',
      name: 'Start',
      stepType: 'start',
      assignedRole: 'requester',
      requiredFields: null,
      defaultNextStepId: 'step-uuid-2',
      sortOrder: 1,
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'step-uuid-2',
      workflowDefinitionId: 'wf-def-uuid-1',
      name: 'IT Review',
      stepType: 'review',
      assignedRole: 'it_reviewer',
      requiredFields: null,
      defaultNextStepId: 'step-uuid-3',
      sortOrder: 2,
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'step-uuid-3',
      workflowDefinitionId: 'wf-def-uuid-1',
      name: 'End',
      stepType: 'end',
      assignedRole: null,
      requiredFields: null,
      defaultNextStepId: null,
      sortOrder: 3,
      createdAt: new Date('2024-01-01'),
    },
  ],
  conditions: [],
};

const mockPaginatedResult = {
  data: [mockWorkflowDefinition],
  pagination: {
    page: 1,
    pageSize: 20,
    total: 1,
    totalPages: 1,
  },
};

const mockValidationResult = {
  isValid: true,
  errors: [],
  warnings: [],
};

// ─── Token Helpers ─────────────────────────────────────────────────────────────

function generateAdminToken(): string {
  return jwt.sign(
    { sub: 'admin-uuid-1', email: 'admin@dits.co.th', role: 'admin' },
    JWT_SECRET,
    { expiresIn: '15m' },
  );
}

function generateUserToken(): string {
  return jwt.sign(
    { sub: 'user-uuid-1', email: 'user@dits.co.th', role: 'requester' },
    JWT_SECRET,
    { expiresIn: '15m' },
  );
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('WorkflowController (Integration)', () => {
  let app: INestApplication;

  const mockPrismaService = {
    workflowDefinition: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    workflowStep: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    workflowCondition: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    workflowInstance: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
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

  // ─── GET /workflows ────────────────────────────────────────────────────────

  describe('GET /workflows', () => {
    it('should return paginated list of workflow definitions', async () => {
      mockPrismaService.workflowDefinition.findMany.mockResolvedValueOnce(
        mockPaginatedResult.data,
      );
      mockPrismaService.workflowDefinition.count.mockResolvedValueOnce(1);

      const adminToken = generateAdminToken();

      const response = await request(app.getHttpServer())
        .get('/workflows')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toMatchObject({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('name', 'Standard CR Workflow');
    });

    it('should support pagination query params', async () => {
      mockPrismaService.workflowDefinition.findMany.mockResolvedValueOnce([]);
      mockPrismaService.workflowDefinition.count.mockResolvedValueOnce(0);

      const adminToken = generateAdminToken();

      const response = await request(app.getHttpServer())
        .get('/workflows?page=2&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.meta).toMatchObject({
        page: 2,
        limit: 5,
      });
    });
  });

  // ─── GET /workflows/:id ────────────────────────────────────────────────────

  describe('GET /workflows/:id', () => {
    it('should return workflow definition with steps and conditions', async () => {
      mockPrismaService.workflowDefinition.findUnique.mockResolvedValueOnce(
        mockWorkflowDefinition,
      );

      const adminToken = generateAdminToken();

      const response = await request(app.getHttpServer())
        .get('/workflows/wf-def-uuid-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('name', 'Standard CR Workflow');
      expect(response.body.data).toHaveProperty('steps');
      expect(response.body.data.steps).toHaveLength(3);
      expect(response.body.data).toHaveProperty('conditions');
    });

    it('should return 404 for non-existent workflow', async () => {
      mockPrismaService.workflowDefinition.findUnique.mockResolvedValueOnce(null);

      const adminToken = generateAdminToken();

      await request(app.getHttpServer())
        .get('/workflows/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  // ─── POST /workflows ───────────────────────────────────────────────────────

  describe('POST /workflows', () => {
    it('should create a new workflow definition (version 1)', async () => {
      const createdDefinition = {
        id: 'new-wf-uuid',
        name: 'Emergency CR Workflow',
        versionNumber: 1,
        isActive: true,
        isDefault: false,
        metadata: {},
        createdById: 'admin-uuid-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.workflowDefinition.findFirst.mockResolvedValueOnce(null); // no active default
      mockPrismaService.workflowDefinition.create.mockResolvedValueOnce(createdDefinition);

      const adminToken = generateAdminToken();

      const response = await request(app.getHttpServer())
        .post('/workflows')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Emergency CR Workflow' })
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('name', 'Emergency CR Workflow');
      expect(response.body.data).toHaveProperty('versionNumber', 1);
    });

    it('should return 400 for invalid payload (missing name)', async () => {
      const adminToken = generateAdminToken();

      await request(app.getHttpServer())
        .post('/workflows')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  // ─── POST /workflows/:id/validate ──────────────────────────────────────────

  describe('POST /workflows/:id/validate', () => {
    it('should return validation result for a valid workflow', async () => {
      mockPrismaService.workflowDefinition.findUnique.mockResolvedValueOnce(
        mockWorkflowDefinition,
      );

      const adminToken = generateAdminToken();

      const response = await request(app.getHttpServer())
        .post('/workflows/wf-def-uuid-1/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('isValid');
      expect(response.body.data).toHaveProperty('errors');
      expect(response.body.data).toHaveProperty('warnings');
    });

    it('should return 404 when validating non-existent workflow', async () => {
      mockPrismaService.workflowDefinition.findUnique.mockResolvedValueOnce(null);

      const adminToken = generateAdminToken();

      await request(app.getHttpServer())
        .post('/workflows/00000000-0000-0000-0000-000000000000/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  // ─── Role Guard ────────────────────────────────────────────────────────────

  describe('Role Guard (non-admin gets 403)', () => {
    it('GET /workflows should return 403 for non-admin user', async () => {
      const userToken = generateUserToken();

      await request(app.getHttpServer())
        .get('/workflows')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('POST /workflows should return 403 for non-admin user', async () => {
      const userToken = generateUserToken();

      await request(app.getHttpServer())
        .post('/workflows')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test Workflow' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('POST /workflows/:id/validate should return 403 for non-admin user', async () => {
      const userToken = generateUserToken();

      await request(app.getHttpServer())
        .post('/workflows/wf-def-uuid-1/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return 401 when no token is provided', async () => {
      await request(app.getHttpServer())
        .get('/workflows')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});

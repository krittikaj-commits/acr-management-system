import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RedisService } from '../../src/modules/redis/redis.service';

const JWT_SECRET = 'test-jwt-secret-for-integration';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockWorkflowInstance = {
  id: 'wf-instance-uuid-1',
  status: 'active',
  currentStep: {
    id: 'step-uuid-1',
    name: 'Draft',
    stepType: 'start',
    assignedRole: 'requester',
    requiredFields: null,
  },
};

const mockChangeRequest = {
  id: 'cr-uuid-1',
  crNumber: 'CR-2026-0001',
  requesterId: null,
  assignedToId: null,
  changeType: 'normal',
  impactLevel: 'medium',
  affectedService: 'Email System',
  description: 'Update mail server configuration',
  justification: 'Performance improvement',
  requesterName: 'John Doe',
  requesterEmail: 'john@dits.co.th',
  requesterDepartment: 'IT',
  approverRequestEmail: null,
  impactAnalysis: null,
  riskAssessment: null,
  implementationPlan: null,
  rolloutPlan: null,
  rollbackPlan: null,
  testResult: null,
  testAction: null,
  implementerNotes: null,
  versionBefore: null,
  versionAfter: null,
  downtimeStart: null,
  downtimeEnd: null,
  verificationResult: null,
  closureReason: null,
  emergencyReason: null,
  version: 1,
  createdAt: new Date('2026-01-15'),
  updatedAt: new Date('2026-01-15'),
  workflowInstance: mockWorkflowInstance,
};

const mockSubmittedCr = {
  ...mockChangeRequest,
  workflowInstance: {
    ...mockWorkflowInstance,
    currentStep: {
      id: 'step-uuid-2',
      name: 'Submitted',
      stepType: 'submitted',
      assignedRole: 'call_center',
      requiredFields: null,
    },
  },
};

// ─── Token Helpers ────────────────────────────────────────────────────────────

function generateToken(sub: string, email: string, role: string): string {
  return jwt.sign({ sub, email, role }, JWT_SECRET, { expiresIn: '15m' });
}

const adminToken = () => generateToken('admin-uuid', 'admin@dits.co.th', 'admin');
const requesterToken = () => generateToken('user-uuid', 'user@dits.co.th', 'requester');
const callCenterToken = () => generateToken('cc-uuid', 'cc@dits.co.th', 'call_center');
const itReviewerToken = () => generateToken('it-uuid', 'it@dits.co.th', 'it_reviewer');
const approverToken = () => generateToken('approver-uuid', 'approver@dits.co.th', 'approver');

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('ChangeRequestController (Integration)', () => {
  let app: INestApplication;

  const mockPrismaService = {
    changeRequest: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    workflowDefinition: {
      findFirst: jest.fn(),
    },
    workflowInstance: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    workflowStep: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    workflowCondition: {
      findMany: jest.fn(),
    },
    auditLog: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn((fn: Function) => fn(mockPrismaService)),
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

  // ─── POST /change-requests (public, creates CR) ──────────────────────────

  describe('POST /change-requests', () => {
    const validPayload = {
      changeType: 'normal',
      impactLevel: 'medium',
      affectedService: 'Email System',
      description: 'Update mail server configuration',
      requesterName: 'John Doe',
      requesterEmail: 'john@dits.co.th',
    };

    it('should create a CR successfully without authentication (public)', async () => {
      // Mock: find active default workflow
      mockPrismaService.workflowDefinition.findFirst.mockResolvedValueOnce({
        id: 'wf-def-uuid',
        name: 'Default Workflow',
        isActive: true,
        isDefault: true,
      });
      // Mock: create CR
      mockPrismaService.changeRequest.findFirst.mockResolvedValueOnce(null); // no existing CR for number gen
      mockPrismaService.changeRequest.create.mockResolvedValueOnce(mockChangeRequest);
      // Mock: create workflow instance
      mockPrismaService.workflowStep.findFirst.mockResolvedValueOnce(mockWorkflowInstance.currentStep);
      mockPrismaService.workflowInstance.create.mockResolvedValueOnce(mockWorkflowInstance);
      // Mock: re-fetch CR with workflow
      mockPrismaService.changeRequest.findUnique.mockResolvedValueOnce(mockChangeRequest);

      const response = await request(app.getHttpServer())
        .post('/change-requests')
        .send(validPayload)
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('crNumber', 'CR-2026-0001');
      expect(response.body.data).toHaveProperty('changeType', 'normal');
      expect(response.body.data).toHaveProperty('requesterName', 'John Doe');
      expect(response.body.data).toHaveProperty('workflowStatus', 'active');
      expect(response.body.data).toHaveProperty('currentStepName', 'Draft');
    });

    it('should return 400 with invalid payload', async () => {
      const invalidPayload = {
        changeType: 'invalid_type',
        impactLevel: 'medium',
        affectedService: 'Email System',
        description: 'Test',
        requesterName: 'John',
        requesterEmail: 'not-an-email',
      };

      const response = await request(app.getHttpServer())
        .post('/change-requests')
        .send(invalidPayload)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  // ─── GET /change-requests (authenticated, returns list) ──────────────────

  describe('GET /change-requests', () => {
    it('should return paginated list when authenticated', async () => {
      mockPrismaService.changeRequest.findMany.mockResolvedValueOnce([mockChangeRequest]);
      mockPrismaService.changeRequest.count.mockResolvedValueOnce(1);

      const response = await request(app.getHttpServer())
        .get('/change-requests')
        .set('Authorization', `Bearer ${requesterToken()}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('total', 1);
      expect(response.body.meta).toHaveProperty('page', 1);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0]).toHaveProperty('crNumber', 'CR-2026-0001');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get('/change-requests')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  // ─── GET /change-requests/:id (authenticated) ────────────────────────────

  describe('GET /change-requests/:id', () => {
    it('should return CR by ID when authenticated', async () => {
      mockPrismaService.changeRequest.findUnique.mockResolvedValueOnce(mockChangeRequest);

      const response = await request(app.getHttpServer())
        .get('/change-requests/cr-uuid-1')
        .set('Authorization', `Bearer ${requesterToken()}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', 'cr-uuid-1');
      expect(response.body.data).toHaveProperty('crNumber', 'CR-2026-0001');
    });

    it('should return 404 when CR not found', async () => {
      mockPrismaService.changeRequest.findUnique.mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .get('/change-requests/non-existent-id')
        .set('Authorization', `Bearer ${requesterToken()}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get('/change-requests/cr-uuid-1')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  // ─── POST /change-requests/:id/submit (transitions) ──────────────────────

  describe('POST /change-requests/:id/submit', () => {
    it('should submit CR and transition workflow when authenticated', async () => {
      // findById for validation
      mockPrismaService.changeRequest.findUnique.mockResolvedValueOnce(mockChangeRequest);
      // Workflow transition mocks
      mockPrismaService.workflowInstance.findUnique.mockResolvedValueOnce({
        ...mockWorkflowInstance,
        workflowDefinitionId: 'wf-def-uuid',
      });
      mockPrismaService.workflowStep.findMany.mockResolvedValueOnce([
        { ...mockWorkflowInstance.currentStep, order: 1 },
        { id: 'step-uuid-2', name: 'Submitted', stepType: 'submitted', order: 2, assignedRole: 'call_center' },
      ]);
      mockPrismaService.workflowCondition.findMany.mockResolvedValueOnce([]);
      mockPrismaService.workflowInstance.update.mockResolvedValueOnce({
        ...mockWorkflowInstance,
        currentStep: { id: 'step-uuid-2', name: 'Submitted', stepType: 'submitted', assignedRole: 'call_center' },
      });
      // Re-fetch updated CR
      mockPrismaService.changeRequest.findUnique.mockResolvedValueOnce(mockSubmittedCr);

      const response = await request(app.getHttpServer())
        .post('/change-requests/cr-uuid-1/submit')
        .set('Authorization', `Bearer ${requesterToken()}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('currentStepName', 'Submitted');
    });
  });

  // ─── POST /change-requests/:id/assign (call_center role) ─────────────────

  describe('POST /change-requests/:id/assign', () => {
    it('should assign CR when called by call_center role', async () => {
      const assignedCr = {
        ...mockSubmittedCr,
        assignedToId: 'it-uuid',
        workflowInstance: {
          ...mockWorkflowInstance,
          currentStep: {
            id: 'step-uuid-3',
            name: 'IT Review',
            stepType: 'review',
            assignedRole: 'it_reviewer',
            requiredFields: null,
          },
        },
      };

      // findById for validation
      mockPrismaService.changeRequest.findUnique.mockResolvedValueOnce(mockSubmittedCr);
      // Update assignedToId
      mockPrismaService.changeRequest.update.mockResolvedValueOnce(assignedCr);
      // Workflow transition mocks
      mockPrismaService.workflowInstance.findUnique.mockResolvedValueOnce({
        ...mockWorkflowInstance,
        workflowDefinitionId: 'wf-def-uuid',
        currentStep: mockSubmittedCr.workflowInstance.currentStep,
      });
      mockPrismaService.workflowStep.findMany.mockResolvedValueOnce([
        { ...mockSubmittedCr.workflowInstance.currentStep, order: 2 },
        { id: 'step-uuid-3', name: 'IT Review', stepType: 'review', order: 3, assignedRole: 'it_reviewer' },
      ]);
      mockPrismaService.workflowCondition.findMany.mockResolvedValueOnce([]);
      mockPrismaService.workflowInstance.update.mockResolvedValueOnce({
        ...mockWorkflowInstance,
        currentStep: { id: 'step-uuid-3', name: 'IT Review', stepType: 'review', assignedRole: 'it_reviewer' },
      });
      // Re-fetch updated CR
      mockPrismaService.changeRequest.findUnique.mockResolvedValueOnce(assignedCr);

      const response = await request(app.getHttpServer())
        .post('/change-requests/cr-uuid-1/assign')
        .set('Authorization', `Bearer ${callCenterToken()}`)
        .send({ assignedToId: 'it-uuid' })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('assignedToId', 'it-uuid');
      expect(response.body.data).toHaveProperty('currentStepName', 'IT Review');
    });

    it('should return 403 when called by wrong role (requester)', async () => {
      await request(app.getHttpServer())
        .post('/change-requests/cr-uuid-1/assign')
        .set('Authorization', `Bearer ${requesterToken()}`)
        .send({ assignedToId: 'it-uuid' })
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  // ─── Unauthorized access returns 401 ─────────────────────────────────────

  describe('Unauthorized access', () => {
    it('GET /change-requests should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/change-requests')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('GET /change-requests/:id should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/change-requests/cr-uuid-1')
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('PATCH /change-requests/:id should return 401 without token', async () => {
      await request(app.getHttpServer())
        .patch('/change-requests/cr-uuid-1')
        .send({ description: 'Updated', version: 1 })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('POST /change-requests/:id/submit should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/change-requests/cr-uuid-1/submit')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  // ─── Wrong role returns 403 ───────────────────────────────────────────────

  describe('Wrong role returns 403', () => {
    it('POST /change-requests/:id/assign should return 403 for requester role', async () => {
      await request(app.getHttpServer())
        .post('/change-requests/cr-uuid-1/assign')
        .set('Authorization', `Bearer ${requesterToken()}`)
        .send({ assignedToId: 'it-uuid' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('POST /change-requests/:id/submit-for-approval should return 403 for requester role', async () => {
      await request(app.getHttpServer())
        .post('/change-requests/cr-uuid-1/submit-for-approval')
        .set('Authorization', `Bearer ${requesterToken()}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('POST /change-requests/:id/approve should return 403 for requester role', async () => {
      await request(app.getHttpServer())
        .post('/change-requests/cr-uuid-1/approve')
        .set('Authorization', `Bearer ${requesterToken()}`)
        .send({ reason: 'Looks good' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('POST /change-requests/:id/reject should return 403 for requester role', async () => {
      await request(app.getHttpServer())
        .post('/change-requests/cr-uuid-1/reject')
        .set('Authorization', `Bearer ${requesterToken()}`)
        .send({ reason: 'Not approved' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('POST /change-requests/:id/implement should return 403 for requester role', async () => {
      await request(app.getHttpServer())
        .post('/change-requests/cr-uuid-1/implement')
        .set('Authorization', `Bearer ${requesterToken()}`)
        .send({ notes: 'Deployed' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('POST /change-requests/:id/close should return 403 for requester role', async () => {
      await request(app.getHttpServer())
        .post('/change-requests/cr-uuid-1/close')
        .set('Authorization', `Bearer ${requesterToken()}`)
        .send({})
        .expect(HttpStatus.FORBIDDEN);
    });

    it('GET /change-requests/:id/history should return 403 for requester role', async () => {
      await request(app.getHttpServer())
        .get('/change-requests/cr-uuid-1/history')
        .set('Authorization', `Bearer ${requesterToken()}`)
        .expect(HttpStatus.FORBIDDEN);
    });
  });
});

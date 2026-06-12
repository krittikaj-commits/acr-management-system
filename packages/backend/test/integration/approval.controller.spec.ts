import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RedisService } from '../../src/modules/redis/redis.service';

const JWT_SECRET = 'test-jwt-secret-for-integration';

const mockApproverUser = {
  id: 'approver-uuid-1',
  email: 'approver@dits.co.th',
  firstName: 'Approver',
  lastName: 'User',
  position: 'IT Manager',
  roleId: 'role-approver-uuid',
  role: {
    id: 'role-approver-uuid',
    name: 'approver',
    permissions: { approvals: ['approve', 'reject'] },
  },
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockAdminUser = {
  id: 'admin-uuid-1',
  email: 'admin@dits.co.th',
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

const mockRequesterUser = {
  id: 'requester-uuid-1',
  email: 'requester@dits.co.th',
  firstName: 'Requester',
  lastName: 'User',
  position: 'Developer',
  roleId: 'role-requester-uuid',
  role: {
    id: 'role-requester-uuid',
    name: 'requester',
    permissions: { changeRequests: ['create', 'read'] },
  },
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

function generateToken(user: typeof mockApproverUser): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role.name },
    JWT_SECRET,
    { expiresIn: '15m' },
  );
}

describe('ApprovalController (Integration)', () => {
  let app: INestApplication;

  const mockApprovalRecords = [
    {
      id: 'approval-uuid-1',
      changeRequestId: 'cr-uuid-1',
      approverId: mockApproverUser.id,
      action: 'approve',
      reason: null,
      approverName: 'Approver User',
      approverPosition: 'IT Manager',
      createdAt: new Date('2024-06-01T10:00:00Z'),
      changeRequest: {
        id: 'cr-uuid-1',
        crNumber: 'CR-2026-0001',
        title: 'Update firewall rules',
        changeType: 'normal',
        impactLevel: 'medium',
      },
    },
  ];

  const mockPostApproveApproval = {
    id: 'approval-uuid-2',
    changeRequestId: 'cr-uuid-2',
    approverId: mockApproverUser.id,
    action: 'post_approve',
    reason: 'Emergency resolved',
    approverName: 'Approver User',
    approverPosition: 'IT Manager',
    createdAt: new Date('2024-06-02T14:00:00Z'),
  };

  const mockEmergencyCr = {
    id: 'cr-uuid-2',
    crNumber: 'CR-2026-0002',
    title: 'Emergency server patch',
    changeType: 'emergency',
    assignedToId: 'impl-uuid-1',
    workflowInstance: {
      currentStep: {
        stepType: 'implementation',
      },
    },
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    approval: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    changeRequest: {
      findUnique: jest.fn(),
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

  describe('GET /approvals/pending', () => {
    it('should return pending approvals for the current user', async () => {
      mockPrismaService.approval.findMany.mockResolvedValueOnce(mockApprovalRecords);

      const token = generateToken(mockApproverUser);

      const response = await request(app.getHttpServer())
        .get('/approvals/pending')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('id', 'approval-uuid-1');
      expect(response.body.data[0]).toHaveProperty('changeRequestId', 'cr-uuid-1');
    });

    it('should return 403 for non-approver user', async () => {
      const token = generateToken(mockRequesterUser);

      await request(app.getHttpServer())
        .get('/approvals/pending')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/approvals/pending')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /approvals/post-approve/:crId', () => {
    it('should post-approve an emergency change request', async () => {
      mockPrismaService.changeRequest.findUnique.mockResolvedValueOnce(mockEmergencyCr);
      mockPrismaService.approval.create.mockResolvedValueOnce(mockPostApproveApproval);

      const token = generateToken(mockApproverUser);

      const response = await request(app.getHttpServer())
        .post('/approvals/post-approve/cr-uuid-2')
        .set('Authorization', `Bearer ${token}`)
        .send({
          approverName: 'Approver User',
          approverPosition: 'IT Manager',
          reason: 'Emergency resolved',
        })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('action', 'post_approve');
      expect(response.body.data).toHaveProperty('reason', 'Emergency resolved');
    });

    it('should return 400 for non-emergency CR', async () => {
      const normalCr = {
        id: 'cr-uuid-1',
        changeType: 'normal',
        workflowInstance: { currentStep: { stepType: 'approval' } },
      };
      mockPrismaService.changeRequest.findUnique.mockResolvedValueOnce(normalCr);

      const token = generateToken(mockApproverUser);

      await request(app.getHttpServer())
        .post('/approvals/post-approve/cr-uuid-1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          approverName: 'Approver User',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 403 for non-approver user', async () => {
      const token = generateToken(mockRequesterUser);

      await request(app.getHttpServer())
        .post('/approvals/post-approve/cr-uuid-2')
        .set('Authorization', `Bearer ${token}`)
        .send({
          approverName: 'Requester User',
        })
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('GET /approvals/history/:crId', () => {
    it('should return approval history for a change request', async () => {
      const historyRecords = [
        {
          id: 'approval-uuid-1',
          changeRequestId: 'cr-uuid-1',
          approverId: mockApproverUser.id,
          action: 'approve',
          reason: null,
          approverName: 'Approver User',
          approverPosition: 'IT Manager',
          createdAt: new Date('2024-06-01T10:00:00Z'),
        },
      ];
      mockPrismaService.approval.findMany.mockResolvedValueOnce(historyRecords);

      const token = generateToken(mockApproverUser);

      const response = await request(app.getHttpServer())
        .get('/approvals/history/cr-uuid-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('action', 'approve');
      expect(response.body.data[0]).toHaveProperty('changeRequestId', 'cr-uuid-1');
    });

    it('should allow admin to access approval history', async () => {
      mockPrismaService.approval.findMany.mockResolvedValueOnce([]);

      const token = generateToken(mockAdminUser);

      const response = await request(app.getHttpServer())
        .get('/approvals/history/cr-uuid-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(0);
    });

    it('should return 403 for non-approver/non-admin/non-auditor user', async () => {
      const token = generateToken(mockRequesterUser);

      await request(app.getHttpServer())
        .get('/approvals/history/cr-uuid-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.FORBIDDEN);
    });
  });
});

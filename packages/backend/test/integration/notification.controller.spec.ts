import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RedisService } from '../../src/modules/redis/redis.service';

const JWT_SECRET = 'test-jwt-secret-for-integration';

const mockUser = {
  id: 'user-uuid-1',
  email: 'user@dits.co.th',
  firstName: 'Test',
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

function generateToken(user: typeof mockUser): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role.name },
    JWT_SECRET,
    { expiresIn: '15m' },
  );
}

describe('NotificationController (Integration)', () => {
  let app: INestApplication;

  const mockNotifications = [
    {
      id: 'notif-uuid-1',
      userId: mockUser.id,
      type: 'cr-submitted',
      title: 'CR Submitted',
      message: 'Your change request has been submitted',
      isRead: false,
      readAt: null,
      metadata: { crId: 'cr-uuid-1' },
      createdAt: new Date('2024-06-01T10:00:00Z'),
      updatedAt: new Date('2024-06-01T10:00:00Z'),
    },
    {
      id: 'notif-uuid-2',
      userId: mockUser.id,
      type: 'cr-approved',
      title: 'CR Approved',
      message: 'Your change request has been approved',
      isRead: true,
      readAt: new Date('2024-06-02T08:00:00Z'),
      metadata: { crId: 'cr-uuid-2' },
      createdAt: new Date('2024-06-02T09:00:00Z'),
      updatedAt: new Date('2024-06-02T09:00:00Z'),
    },
  ];

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
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
    getClient: jest.fn().mockReturnValue({
      publish: jest.fn().mockResolvedValue(1),
    }),
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

  describe('GET /notifications', () => {
    it('should return paginated list of notifications', async () => {
      mockPrismaService.notification.findMany.mockResolvedValueOnce(mockNotifications);

      const token = generateToken(mockUser);

      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(2);
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('page', 1);
      expect(response.body.meta).toHaveProperty('limit', 20);
    });

    it('should support pagination parameters', async () => {
      mockPrismaService.notification.findMany.mockResolvedValueOnce([mockNotifications[1]]);

      const token = generateToken(mockUser);

      const response = await request(app.getHttpServer())
        .get('/notifications?page=2&limit=1')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
      expect(response.body.meta).toHaveProperty('page', 2);
      expect(response.body.meta).toHaveProperty('limit', 1);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/notifications')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /notifications/unread-count', () => {
    it('should return the unread notification count', async () => {
      mockPrismaService.notification.count.mockResolvedValueOnce(5);

      const token = generateToken(mockUser);

      const response = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('unreadCount', 5);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('PATCH /notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      const readNotification = {
        ...mockNotifications[0],
        isRead: true,
        readAt: new Date(),
      };
      mockPrismaService.notification.update.mockResolvedValueOnce(readNotification);

      const token = generateToken(mockUser);

      const response = await request(app.getHttpServer())
        .patch('/notifications/notif-uuid-1/read')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('isRead', true);
      expect(response.body.data).toHaveProperty('id', 'notif-uuid-1');
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .patch('/notifications/notif-uuid-1/read')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('PATCH /notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValueOnce({ count: 3 });

      const token = generateToken(mockUser);

      const response = await request(app.getHttpServer())
        .patch('/notifications/read-all')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('success', true);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .patch('/notifications/read-all')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});

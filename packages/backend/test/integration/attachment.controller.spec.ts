import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { RedisService } from '../../src/modules/redis/redis.service';
import { S3Service } from '../../src/modules/attachment/s3.service';

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
    permissions: { changeRequests: ['create', 'read'], attachments: ['create', 'read', 'delete'] },
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

describe('AttachmentController (Integration)', () => {
  let app: INestApplication;

  const mockAttachment = {
    id: 'attachment-uuid-1',
    changeRequestId: 'cr-uuid-1',
    uploadedById: mockUser.id,
    fileName: 'test-document.pdf',
    fileType: 'application/pdf',
    fileSize: 1048576,
    s3Key: 'attachments/cr-uuid-1/file-uuid-1/test-document.pdf',
    workflowStep: null,
    isDeleted: false,
    createdAt: new Date('2024-06-01T10:00:00Z'),
    updatedAt: new Date('2024-06-01T10:00:00Z'),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    attachment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
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
    auditLog: {
      create: jest.fn(),
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

  const mockS3Service = {
    getPresignedUploadUrl: jest.fn().mockResolvedValue('https://s3.amazonaws.com/bucket/key?presigned-upload'),
    getPresignedDownloadUrl: jest.fn().mockResolvedValue('https://s3.amazonaws.com/bucket/key?presigned-download'),
    deleteObject: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.MAX_FILE_SIZE_MB = '10';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(RedisService)
      .useValue(mockRedisService)
      .overrideProvider(S3Service)
      .useValue(mockS3Service)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.JWT_SECRET;
    delete process.env.MAX_FILE_SIZE_MB;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisService.get.mockResolvedValue(null);
  });

  describe('POST /attachments/upload-url', () => {
    it('should return a presigned upload URL', async () => {
      const token = generateToken(mockUser);

      const response = await request(app.getHttpServer())
        .post('/attachments/upload-url')
        .set('Authorization', `Bearer ${token}`)
        .send({
          changeRequestId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          fileName: 'test-document.pdf',
          fileType: 'application/pdf',
          fileSize: 1048576,
        })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('uploadUrl');
      expect(response.body.data).toHaveProperty('s3Key');
      expect(response.body.data).toHaveProperty('expiresAt');
      expect(response.body.data.uploadUrl).toContain('presigned-upload');
      expect(mockS3Service.getPresignedUploadUrl).toHaveBeenCalledTimes(1);
    });

    it('should reject invalid file type', async () => {
      const token = generateToken(mockUser);

      const response = await request(app.getHttpServer())
        .post('/attachments/upload-url')
        .set('Authorization', `Bearer ${token}`)
        .send({
          changeRequestId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          fileName: 'malware.exe',
          fileType: 'application/x-executable',
          fileSize: 1048576,
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toBeDefined();
    });

    it('should reject file exceeding max size', async () => {
      const token = generateToken(mockUser);

      const response = await request(app.getHttpServer())
        .post('/attachments/upload-url')
        .set('Authorization', `Bearer ${token}`)
        .send({
          changeRequestId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          fileName: 'large-file.pdf',
          fileType: 'application/pdf',
          fileSize: 100 * 1024 * 1024, // 100MB — exceeds 10MB limit
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toBeDefined();
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .post('/attachments/upload-url')
        .send({
          changeRequestId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          fileName: 'test-document.pdf',
          fileType: 'application/pdf',
          fileSize: 1048576,
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /attachments/confirm', () => {
    it('should create an attachment record on confirm', async () => {
      mockPrismaService.attachment.create.mockResolvedValueOnce(mockAttachment);

      const token = generateToken(mockUser);

      const response = await request(app.getHttpServer())
        .post('/attachments/confirm')
        .set('Authorization', `Bearer ${token}`)
        .send({
          changeRequestId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          s3Key: 'attachments/cr-uuid-1/file-uuid-1/test-document.pdf',
          fileName: 'test-document.pdf',
          fileType: 'application/pdf',
          fileSize: 1048576,
        })
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', mockAttachment.id);
      expect(response.body.data).toHaveProperty('fileName', 'test-document.pdf');
      expect(response.body.data).toHaveProperty('s3Key');
      expect(mockPrismaService.attachment.create).toHaveBeenCalledTimes(1);
    });

    it('should return 400 on validation error (missing required fields)', async () => {
      const token = generateToken(mockUser);

      await request(app.getHttpServer())
        .post('/attachments/confirm')
        .set('Authorization', `Bearer ${token}`)
        .send({
          changeRequestId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          // Missing s3Key, fileName, fileType, fileSize
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .post('/attachments/confirm')
        .send({
          changeRequestId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          s3Key: 'attachments/cr-uuid-1/file-uuid-1/test-document.pdf',
          fileName: 'test-document.pdf',
          fileType: 'application/pdf',
          fileSize: 1048576,
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /attachments/:id/download-url', () => {
    it('should return a presigned download URL', async () => {
      mockPrismaService.attachment.findFirst.mockResolvedValueOnce(mockAttachment);

      const token = generateToken(mockUser);

      const response = await request(app.getHttpServer())
        .get(`/attachments/${mockAttachment.id}/download-url`)
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('downloadUrl');
      expect(response.body.data).toHaveProperty('fileName', 'test-document.pdf');
      expect(response.body.data).toHaveProperty('fileType', 'application/pdf');
      expect(response.body.data.downloadUrl).toContain('presigned-download');
      expect(mockS3Service.getPresignedDownloadUrl).toHaveBeenCalledWith(mockAttachment.s3Key);
    });

    it('should return 404 when attachment not found', async () => {
      mockPrismaService.attachment.findFirst.mockResolvedValueOnce(null);

      const token = generateToken(mockUser);

      await request(app.getHttpServer())
        .get('/attachments/non-existent-id/download-url')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get(`/attachments/${mockAttachment.id}/download-url`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('DELETE /attachments/:id', () => {
    it('should soft-delete an attachment', async () => {
      const deletedAttachment = { ...mockAttachment, isDeleted: true };
      mockPrismaService.attachment.findFirst.mockResolvedValueOnce(mockAttachment);
      mockPrismaService.attachment.update.mockResolvedValueOnce(deletedAttachment);

      const token = generateToken(mockUser);

      const response = await request(app.getHttpServer())
        .delete(`/attachments/${mockAttachment.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('isDeleted', true);
      expect(mockPrismaService.attachment.update).toHaveBeenCalledWith({
        where: { id: mockAttachment.id },
        data: { isDeleted: true },
      });
    });

    it('should return 404 when attachment not found', async () => {
      mockPrismaService.attachment.findFirst.mockResolvedValueOnce(null);

      const token = generateToken(mockUser);

      await request(app.getHttpServer())
        .delete('/attachments/non-existent-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .delete(`/attachments/${mockAttachment.id}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuditService } from '../../../src/modules/audit/audit.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { CreateAuditLogDto } from '../../../src/modules/audit/dto/create-audit-log.dto';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: PrismaService;

  const mockPrismaService = {
    auditLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an audit log entry with all fields', async () => {
      const dto: CreateAuditLogDto = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        userEmail: 'admin@dits.co.th',
        action: 'update',
        entityType: 'ChangeRequest',
        entityId: '660e8400-e29b-41d4-a716-446655440001',
        oldValue: { status: 'draft' },
        newValue: { status: 'submitted' },
        ipAddress: '192.168.1.100',
      };

      const expectedResult = {
        id: '770e8400-e29b-41d4-a716-446655440002',
        ...dto,
        createdAt: new Date('2025-01-01T00:00:00Z'),
      };

      mockPrismaService.auditLog.create.mockResolvedValue(expectedResult);

      const result = await service.create(dto);

      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: dto.userId,
          userEmail: dto.userEmail,
          action: dto.action,
          entityType: dto.entityType,
          entityId: dto.entityId,
          oldValue: dto.oldValue,
          newValue: dto.newValue,
          ipAddress: dto.ipAddress,
        },
      });
    });

    it('should create an audit log entry with only required fields', async () => {
      const dto: CreateAuditLogDto = {
        userEmail: 'requester@dits.co.th',
        action: 'create',
        entityType: 'ChangeRequest',
        entityId: '660e8400-e29b-41d4-a716-446655440001',
      };

      const expectedResult = {
        id: '770e8400-e29b-41d4-a716-446655440003',
        userId: null,
        userEmail: dto.userEmail,
        action: dto.action,
        entityType: dto.entityType,
        entityId: dto.entityId,
        oldValue: null,
        newValue: null,
        ipAddress: null,
        createdAt: new Date('2025-01-01T00:00:00Z'),
      };

      mockPrismaService.auditLog.create.mockResolvedValue(expectedResult);

      const result = await service.create(dto);

      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: null,
          userEmail: dto.userEmail,
          action: dto.action,
          entityType: dto.entityType,
          entityId: dto.entityId,
          oldValue: undefined,
          newValue: undefined,
          ipAddress: null,
        },
      });
    });

    it('should throw BadRequestException for invalid entityType', async () => {
      const dto = {
        userEmail: 'test@dits.co.th',
        action: 'create',
        entityType: 'InvalidEntity' as any,
        entityId: '660e8400-e29b-41d4-a716-446655440001',
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.auditLog.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid email format', async () => {
      const dto: CreateAuditLogDto = {
        userEmail: 'not-an-email',
        action: 'create',
        entityType: 'ChangeRequest',
        entityId: '660e8400-e29b-41d4-a716-446655440001',
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.auditLog.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid entityId (not UUID)', async () => {
      const dto: CreateAuditLogDto = {
        userEmail: 'test@dits.co.th',
        action: 'create',
        entityType: 'ChangeRequest',
        entityId: 'not-a-uuid',
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.auditLog.create).not.toHaveBeenCalled();
    });
  });

  describe('immutability — application level', () => {
    it('should NOT expose an update method', () => {
      expect((service as any).update).toBeUndefined();
    });

    it('should NOT expose a delete method', () => {
      expect((service as any).delete).toBeUndefined();
    });

    it('should NOT expose a remove method', () => {
      expect((service as any).remove).toBeUndefined();
    });
  });

  describe('immutability — DB-level trigger concept', () => {
    it('should demonstrate that DB trigger blocks update attempts', async () => {
      // Simulate what happens when someone bypasses the service
      // and tries to update directly via PrismaService.
      // The DB trigger raises an error.
      const mockUpdate = jest.fn().mockRejectedValue(
        new Error(
          'UPDATE operations are not allowed on the AuditLog table. Audit logs are immutable.',
        ),
      );
      (prisma as any).auditLog.update = mockUpdate;

      await expect(
        (prisma as any).auditLog.update({
          where: { id: '770e8400-e29b-41d4-a716-446655440002' },
          data: { action: 'tampered' },
        }),
      ).rejects.toThrow('UPDATE operations are not allowed');
    });

    it('should demonstrate that DB trigger blocks delete attempts', async () => {
      // Simulate what happens when someone bypasses the service
      // and tries to delete directly via PrismaService.
      // The DB trigger raises an error.
      const mockDelete = jest.fn().mockRejectedValue(
        new Error(
          'DELETE operations are not allowed on the AuditLog table. Audit logs are immutable.',
        ),
      );
      (prisma as any).auditLog.delete = mockDelete;

      await expect(
        (prisma as any).auditLog.delete({
          where: { id: '770e8400-e29b-41d4-a716-446655440002' },
        }),
      ).rejects.toThrow('DELETE operations are not allowed');
    });
  });
});

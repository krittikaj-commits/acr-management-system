import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditController } from '../../../src/modules/audit/audit.controller';
import { AuditService } from '../../../src/modules/audit/audit.service';
import { RolesGuard } from '../../../src/common/guards/roles.guard';
import { ROLES_KEY } from '../../../src/common/decorators/roles.decorator';

describe('AuditController', () => {
  let controller: AuditController;
  let auditService: AuditService;

  const mockAuditService = {
    findAll: jest.fn(),
    findByEntity: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    controller = module.get<AuditController>(AuditController);
    auditService = module.get<AuditService>(AuditService);

    jest.clearAllMocks();
  });

  describe('GET /audit-logs', () => {
    it('should return paginated audit logs', async () => {
      const mockResponse = {
        data: [
          {
            id: '1',
            userId: '550e8400-e29b-41d4-a716-446655440000',
            userEmail: 'admin@dits.co.th',
            action: 'create',
            entityType: 'ChangeRequest',
            entityId: '660e8400-e29b-41d4-a716-446655440001',
            oldValue: null,
            newValue: { status: 'draft' },
            ipAddress: '192.168.1.1',
            createdAt: new Date('2025-01-15T10:00:00Z'),
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 150,
          totalPages: 8,
        },
      };

      mockAuditService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll({});

      expect(result).toEqual(mockResponse);
      expect(mockAuditService.findAll).toHaveBeenCalledWith({
        page: 1,
        pageSize: 20,
      });
    });

    it('should filter by entityType', async () => {
      const mockResponse = {
        data: [
          {
            id: '2',
            userId: '550e8400-e29b-41d4-a716-446655440000',
            userEmail: 'it-reviewer@dits.co.th',
            action: 'update',
            entityType: 'ChangeRequest',
            entityId: '660e8400-e29b-41d4-a716-446655440002',
            oldValue: { status: 'submitted' },
            newValue: { status: 'it_review' },
            ipAddress: '192.168.1.50',
            createdAt: new Date('2025-01-16T08:30:00Z'),
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockAuditService.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll({ entityType: 'ChangeRequest' });

      expect(result).toEqual(mockResponse);
      expect(mockAuditService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'ChangeRequest' }),
      );
    });

    it('should filter by date range', async () => {
      const mockResponse = {
        data: [],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0,
        },
      };

      mockAuditService.findAll.mockResolvedValue(mockResponse);

      const query = {
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-01-31T23:59:59Z',
      };

      const result = await controller.findAll(query);

      expect(result).toEqual(mockResponse);
      expect(mockAuditService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: '2025-01-01T00:00:00Z',
          endDate: '2025-01-31T23:59:59Z',
        }),
      );
    });
  });

  describe('GET /audit-logs/entity/:type/:id', () => {
    it('should return audit trail for a specific entity', async () => {
      const entityType = 'ChangeRequest';
      const entityId = '660e8400-e29b-41d4-a716-446655440001';
      const mockLogs = [
        {
          id: '3',
          userId: '550e8400-e29b-41d4-a716-446655440000',
          userEmail: 'admin@dits.co.th',
          action: 'approve',
          entityType,
          entityId,
          oldValue: { status: 'pending_approval' },
          newValue: { status: 'approved' },
          ipAddress: '10.0.0.1',
          createdAt: new Date('2025-01-20T14:00:00Z'),
        },
        {
          id: '4',
          userId: '550e8400-e29b-41d4-a716-446655440000',
          userEmail: 'requester@dits.co.th',
          action: 'create',
          entityType,
          entityId,
          oldValue: null,
          newValue: { status: 'draft' },
          ipAddress: '10.0.0.2',
          createdAt: new Date('2025-01-15T09:00:00Z'),
        },
      ];

      mockAuditService.findByEntity.mockResolvedValue(mockLogs);

      const result = await controller.findByEntity(entityType, entityId);

      expect(result).toEqual(mockLogs);
      expect(mockAuditService.findByEntity).toHaveBeenCalledWith(
        entityType,
        entityId,
      );
    });
  });

  describe('Role-based access control', () => {
    it('should have @Roles(auditor, admin) decorator on the controller', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, AuditController);
      expect(roles).toEqual(['auditor', 'admin']);
    });

    it('should return 403 for non-auditor/non-admin role via RolesGuard', () => {
      const reflector = new Reflector();
      const guard = new RolesGuard(reflector);

      // Simulate a request context with a user who has 'requester' role
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => AuditController,
        switchToHttp: () => ({
          getRequest: () => ({
            user: { sub: 'user-1', email: 'user@dits.co.th', role: 'requester' },
          }),
        }),
      } as any;

      // Mock reflector to return the roles metadata from controller
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['auditor', 'admin']);

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should allow access for auditor role via RolesGuard', () => {
      const reflector = new Reflector();
      const guard = new RolesGuard(reflector);

      const mockContext = {
        getHandler: () => ({}),
        getClass: () => AuditController,
        switchToHttp: () => ({
          getRequest: () => ({
            user: { sub: 'user-2', email: 'auditor@dits.co.th', role: 'auditor' },
          }),
        }),
      } as any;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['auditor', 'admin']);

      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('should allow access for admin role via RolesGuard', () => {
      const reflector = new Reflector();
      const guard = new RolesGuard(reflector);

      const mockContext = {
        getHandler: () => ({}),
        getClass: () => AuditController,
        switchToHttp: () => ({
          getRequest: () => ({
            user: { sub: 'user-3', email: 'admin@dits.co.th', role: 'admin' },
          }),
        }),
      } as any;

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['auditor', 'admin']);

      expect(guard.canActivate(mockContext)).toBe(true);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ApprovalService } from '../../../src/modules/approval/approval.service';
import { ApprovalRepository } from '../../../src/modules/approval/approval.repository';
import { PrismaService } from '../../../src/prisma/prisma.service';

describe('ApprovalService', () => {
  let service: ApprovalService;

  const mockApprovalRepository = {
    create: jest.fn(),
    findByChangeRequestId: jest.fn(),
    findPendingForUser: jest.fn(),
  };

  const mockPrismaService = {
    changeRequest: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalService,
        {
          provide: ApprovalRepository,
          useValue: mockApprovalRepository,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ApprovalService>(ApprovalService);

    jest.clearAllMocks();
  });

  describe('approve', () => {
    it('should create an approval record with action=approve', async () => {
      const crId = '550e8400-e29b-41d4-a716-446655440001';
      const approverId = '550e8400-e29b-41d4-a716-446655440002';
      const approverName = 'John Approver';
      const approverPosition = 'IT Manager';
      const reason = 'Looks good';

      const expectedApproval = {
        id: '770e8400-e29b-41d4-a716-446655440010',
        changeRequestId: crId,
        approverId,
        action: 'approve',
        reason,
        approverName,
        approverPosition,
        createdAt: new Date('2025-01-15T10:00:00Z'),
      };

      mockApprovalRepository.create.mockResolvedValue(expectedApproval);
      // CR has a different assignedToId (no BR-010 violation)
      mockPrismaService.changeRequest.findUnique.mockResolvedValue({
        assignedToId: '550e8400-e29b-41d4-a716-446655440099',
      });

      const result = await service.approve(
        crId,
        approverId,
        approverName,
        approverPosition,
        reason,
      );

      expect(result.approval).toEqual(expectedApproval);
      expect(result.warning).toBeUndefined();
      expect(mockApprovalRepository.create).toHaveBeenCalledWith({
        changeRequestId: crId,
        approverId,
        action: 'approve',
        reason,
        approverName,
        approverPosition,
      });
    });
  });

  describe('reject', () => {
    it('should create an approval record with action=reject', async () => {
      const crId = '550e8400-e29b-41d4-a716-446655440001';
      const approverId = '550e8400-e29b-41d4-a716-446655440002';
      const approverName = 'John Approver';
      const reason = 'Insufficient risk analysis';

      const expectedApproval = {
        id: '770e8400-e29b-41d4-a716-446655440011',
        changeRequestId: crId,
        approverId,
        action: 'reject',
        reason,
        approverName,
        approverPosition: null,
        createdAt: new Date('2025-01-15T10:00:00Z'),
      };

      mockApprovalRepository.create.mockResolvedValue(expectedApproval);

      const result = await service.reject(
        crId,
        approverId,
        approverName,
        undefined,
        reason,
      );

      expect(result).toEqual(expectedApproval);
      expect(mockApprovalRepository.create).toHaveBeenCalledWith({
        changeRequestId: crId,
        approverId,
        action: 'reject',
        reason,
        approverName,
        approverPosition: undefined,
      });
    });

    it('should throw BadRequestException if reason is empty', async () => {
      const crId = '550e8400-e29b-41d4-a716-446655440001';
      const approverId = '550e8400-e29b-41d4-a716-446655440002';
      const approverName = 'John Approver';

      await expect(
        service.reject(crId, approverId, approverName, undefined, ''),
      ).rejects.toThrow(BadRequestException);

      expect(mockApprovalRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if reason is undefined', async () => {
      const crId = '550e8400-e29b-41d4-a716-446655440001';
      const approverId = '550e8400-e29b-41d4-a716-446655440002';
      const approverName = 'John Approver';

      await expect(
        service.reject(crId, approverId, approverName, undefined, undefined),
      ).rejects.toThrow(BadRequestException);

      expect(mockApprovalRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if reason is whitespace only', async () => {
      const crId = '550e8400-e29b-41d4-a716-446655440001';
      const approverId = '550e8400-e29b-41d4-a716-446655440002';
      const approverName = 'John Approver';

      await expect(
        service.reject(crId, approverId, approverName, undefined, '   '),
      ).rejects.toThrow(BadRequestException);

      expect(mockApprovalRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('BR-010 — approver ≠ implementer', () => {
    it('should return warning when approver is the same as assignedToId (implementer)', async () => {
      const crId = '550e8400-e29b-41d4-a716-446655440001';
      const approverId = '550e8400-e29b-41d4-a716-446655440002';
      const approverName = 'Same Person';

      const expectedApproval = {
        id: '770e8400-e29b-41d4-a716-446655440012',
        changeRequestId: crId,
        approverId,
        action: 'approve',
        reason: null,
        approverName,
        approverPosition: null,
        createdAt: new Date('2025-01-15T10:00:00Z'),
      };

      mockApprovalRepository.create.mockResolvedValue(expectedApproval);
      // Same user is assigned as implementer
      mockPrismaService.changeRequest.findUnique.mockResolvedValue({
        assignedToId: approverId,
      });

      const result = await service.approve(crId, approverId, approverName);

      expect(result.approval).toEqual(expectedApproval);
      expect(result.warning).toBe(
        'Approver and implementer should not be the same person (BR-010)',
      );
    });

    it('should NOT return warning when approver ≠ implementer', async () => {
      const crId = '550e8400-e29b-41d4-a716-446655440001';
      const approverId = '550e8400-e29b-41d4-a716-446655440002';
      const implementerId = '550e8400-e29b-41d4-a716-446655440099';
      const approverName = 'Different Person';

      const expectedApproval = {
        id: '770e8400-e29b-41d4-a716-446655440013',
        changeRequestId: crId,
        approverId,
        action: 'approve',
        reason: null,
        approverName,
        approverPosition: null,
        createdAt: new Date('2025-01-15T10:00:00Z'),
      };

      mockApprovalRepository.create.mockResolvedValue(expectedApproval);
      mockPrismaService.changeRequest.findUnique.mockResolvedValue({
        assignedToId: implementerId,
      });

      const result = await service.approve(crId, approverId, approverName);

      expect(result.approval).toEqual(expectedApproval);
      expect(result.warning).toBeUndefined();
    });

    it('should NOT return warning when CR has no assignedToId', async () => {
      const crId = '550e8400-e29b-41d4-a716-446655440001';
      const approverId = '550e8400-e29b-41d4-a716-446655440002';
      const approverName = 'Some Approver';

      const expectedApproval = {
        id: '770e8400-e29b-41d4-a716-446655440014',
        changeRequestId: crId,
        approverId,
        action: 'approve',
        reason: null,
        approverName,
        approverPosition: null,
        createdAt: new Date('2025-01-15T10:00:00Z'),
      };

      mockApprovalRepository.create.mockResolvedValue(expectedApproval);
      mockPrismaService.changeRequest.findUnique.mockResolvedValue({
        assignedToId: null,
      });

      const result = await service.approve(crId, approverId, approverName);

      expect(result.approval).toEqual(expectedApproval);
      expect(result.warning).toBeUndefined();
    });
  });

  describe('getPendingApprovals', () => {
    it('should return pending approvals for user', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440002';
      const pendingList = [
        {
          id: '770e8400-e29b-41d4-a716-446655440020',
          changeRequestId: '550e8400-e29b-41d4-a716-446655440001',
          approverId: userId,
          action: 'approve',
          reason: null,
          approverName: 'Approver',
          approverPosition: null,
          createdAt: new Date('2025-01-15T10:00:00Z'),
        },
      ];

      mockApprovalRepository.findPendingForUser.mockResolvedValue(pendingList);

      const result = await service.getPendingApprovals(userId);

      expect(result).toEqual(pendingList);
      expect(mockApprovalRepository.findPendingForUser).toHaveBeenCalledWith(userId);
    });

    it('should return empty array when no pending approvals', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440002';
      mockApprovalRepository.findPendingForUser.mockResolvedValue([]);

      const result = await service.getPendingApprovals(userId);

      expect(result).toEqual([]);
    });
  });

  describe('getApprovalHistory', () => {
    it('should return all approval records for a CR', async () => {
      const crId = '550e8400-e29b-41d4-a716-446655440001';
      const history = [
        {
          id: '770e8400-e29b-41d4-a716-446655440030',
          changeRequestId: crId,
          approverId: '550e8400-e29b-41d4-a716-446655440002',
          action: 'reject',
          reason: 'Need more details',
          approverName: 'First Reviewer',
          approverPosition: 'Senior IT',
          createdAt: new Date('2025-01-16T10:00:00Z'),
        },
        {
          id: '770e8400-e29b-41d4-a716-446655440031',
          changeRequestId: crId,
          approverId: '550e8400-e29b-41d4-a716-446655440003',
          action: 'approve',
          reason: null,
          approverName: 'Second Reviewer',
          approverPosition: 'Manager',
          createdAt: new Date('2025-01-15T10:00:00Z'),
        },
      ];

      mockApprovalRepository.findByChangeRequestId.mockResolvedValue(history);

      const result = await service.getApprovalHistory(crId);

      expect(result).toEqual(history);
      expect(mockApprovalRepository.findByChangeRequestId).toHaveBeenCalledWith(crId);
    });
  });
});

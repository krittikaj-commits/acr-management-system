import { Test, TestingModule } from '@nestjs/testing';
import { ReportingService } from '../../../src/modules/reporting/reporting.service';
import { PrismaService } from '../../../src/prisma/prisma.service';

describe('ReportingService', () => {
  let service: ReportingService;

  const mockPrismaService = {
    changeRequest: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
    },
    workflowInstance: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ReportingService>(ReportingService);

    jest.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    it('should return all stat categories', async () => {
      // Setup mocks for all sub-queries
      mockPrismaService.changeRequest.findMany.mockResolvedValue([]);
      mockPrismaService.workflowInstance.findMany.mockResolvedValue([]);
      mockPrismaService.changeRequest.groupBy.mockResolvedValue([]);
      mockPrismaService.changeRequest.count.mockResolvedValue(0);
      mockPrismaService.workflowInstance.count.mockResolvedValue(0);

      const result = await service.getDashboardStats();

      expect(result).toHaveProperty('crCountByMonth');
      expect(result).toHaveProperty('crCountByStatus');
      expect(result).toHaveProperty('crCountByImpact');
      expect(result).toHaveProperty('crCountByChangeType');
      expect(result).toHaveProperty('averageTimeToClose');
      expect(result).toHaveProperty('totalCrs');
      expect(result).toHaveProperty('openCrs');
      expect(result).toHaveProperty('closedCrs');

      expect(Array.isArray(result.crCountByMonth)).toBe(true);
      expect(Array.isArray(result.crCountByStatus)).toBe(true);
      expect(Array.isArray(result.crCountByImpact)).toBe(true);
      expect(Array.isArray(result.crCountByChangeType)).toBe(true);
      expect(typeof result.averageTimeToClose).toBe('number');
      expect(typeof result.totalCrs).toBe('number');
      expect(typeof result.openCrs).toBe('number');
      expect(typeof result.closedCrs).toBe('number');
    });
  });

  describe('getCrCountByMonth', () => {
    it('should return data for last 12 months', async () => {
      mockPrismaService.changeRequest.findMany.mockResolvedValue([]);

      const result = await service.getCrCountByMonth();

      expect(result).toHaveLength(12);
      // All months should have the 'YYYY-MM' format
      for (const item of result) {
        expect(item.month).toMatch(/^\d{4}-\d{2}$/);
        expect(typeof item.count).toBe('number');
      }
    });

    it('should correctly count CRs per month', async () => {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      mockPrismaService.changeRequest.findMany.mockResolvedValue([
        { createdAt: new Date() },
        { createdAt: new Date() },
        { createdAt: new Date() },
      ]);

      const result = await service.getCrCountByMonth();

      const currentMonthEntry = result.find((r) => r.month === currentMonth);
      expect(currentMonthEntry).toBeDefined();
      expect(currentMonthEntry!.count).toBe(3);
    });

    it('should return sorted results oldest first', async () => {
      mockPrismaService.changeRequest.findMany.mockResolvedValue([]);

      const result = await service.getCrCountByMonth();

      for (let i = 1; i < result.length; i++) {
        expect(result[i].month >= result[i - 1].month).toBe(true);
      }
    });
  });

  describe('getCrCountByStatus', () => {
    it('should group by workflow step name', async () => {
      mockPrismaService.workflowInstance.findMany.mockResolvedValue([
        { currentStep: { name: 'IT Review' } },
        { currentStep: { name: 'IT Review' } },
        { currentStep: { name: 'Approval' } },
        { currentStep: { name: 'Implementation' } },
      ]);

      const result = await service.getCrCountByStatus();

      expect(result).toHaveLength(3);
      const itReview = result.find((r) => r.status === 'IT Review');
      expect(itReview).toBeDefined();
      expect(itReview!.count).toBe(2);

      const approval = result.find((r) => r.status === 'Approval');
      expect(approval).toBeDefined();
      expect(approval!.count).toBe(1);
    });

    it('should return empty array when no workflow instances exist', async () => {
      mockPrismaService.workflowInstance.findMany.mockResolvedValue([]);

      const result = await service.getCrCountByStatus();

      expect(result).toEqual([]);
    });
  });

  describe('getCrCountByImpact', () => {
    it('should return grouped impact level counts', async () => {
      mockPrismaService.changeRequest.groupBy.mockResolvedValue([
        { impactLevel: 'High', _count: { id: 5 } },
        { impactLevel: 'Medium', _count: { id: 10 } },
        { impactLevel: 'Low', _count: { id: 3 } },
      ]);

      const result = await service.getCrCountByImpact();

      expect(result).toHaveLength(3);
      expect(result).toContainEqual({ impactLevel: 'High', count: 5 });
      expect(result).toContainEqual({ impactLevel: 'Medium', count: 10 });
      expect(result).toContainEqual({ impactLevel: 'Low', count: 3 });
    });
  });

  describe('getCrCountByChangeType', () => {
    it('should return grouped change type counts', async () => {
      mockPrismaService.changeRequest.groupBy.mockResolvedValue([
        { changeType: 'Application', _count: { id: 8 } },
        { changeType: 'Network', _count: { id: 4 } },
        { changeType: 'Server', _count: { id: 2 } },
      ]);

      const result = await service.getCrCountByChangeType();

      expect(result).toHaveLength(3);
      expect(result).toContainEqual({ changeType: 'Application', count: 8 });
      expect(result).toContainEqual({ changeType: 'Network', count: 4 });
      expect(result).toContainEqual({ changeType: 'Server', count: 2 });
    });
  });

  describe('getAverageTimeToClose', () => {
    it('should calculate correctly with completed instances', async () => {
      const startDate = new Date('2025-01-01T00:00:00Z');
      const endDate1 = new Date('2025-01-06T00:00:00Z'); // 5 days
      const endDate2 = new Date('2025-01-11T00:00:00Z'); // 10 days

      mockPrismaService.workflowInstance.findMany.mockResolvedValue([
        { startedAt: startDate, completedAt: endDate1 },
        { startedAt: startDate, completedAt: endDate2 },
      ]);

      const result = await service.getAverageTimeToClose();

      // Average of 5 and 10 = 7.5 days
      expect(result).toBe(7.5);
    });

    it('should return 0 when no completed instances exist', async () => {
      mockPrismaService.workflowInstance.findMany.mockResolvedValue([]);

      const result = await service.getAverageTimeToClose();

      expect(result).toBe(0);
    });

    it('should round to 2 decimal places', async () => {
      const startDate = new Date('2025-01-01T00:00:00Z');
      const endDate1 = new Date('2025-01-04T00:00:00Z'); // 3 days
      const endDate2 = new Date('2025-01-08T00:00:00Z'); // 7 days
      const endDate3 = new Date('2025-01-02T00:00:00Z'); // 1 day

      mockPrismaService.workflowInstance.findMany.mockResolvedValue([
        { startedAt: startDate, completedAt: endDate1 },
        { startedAt: startDate, completedAt: endDate2 },
        { startedAt: startDate, completedAt: endDate3 },
      ]);

      const result = await service.getAverageTimeToClose();

      // Average of 3, 7, 1 = 11/3 = 3.666... → rounded to 3.67
      expect(result).toBe(3.67);
    });
  });

  describe('getTotalCrs', () => {
    it('should return total count from prisma', async () => {
      mockPrismaService.changeRequest.count.mockResolvedValue(42);

      const result = await service.getTotalCrs();

      expect(result).toBe(42);
      expect(mockPrismaService.changeRequest.count).toHaveBeenCalled();
    });
  });

  describe('getOpenCrs', () => {
    it('should count workflow instances not completed', async () => {
      mockPrismaService.workflowInstance.count.mockResolvedValue(15);

      const result = await service.getOpenCrs();

      expect(result).toBe(15);
      expect(mockPrismaService.workflowInstance.count).toHaveBeenCalledWith({
        where: {
          status: {
            not: 'completed',
          },
        },
      });
    });
  });

  describe('getClosedCrs', () => {
    it('should count workflow instances with completed status', async () => {
      mockPrismaService.workflowInstance.count.mockResolvedValue(27);

      const result = await service.getClosedCrs();

      expect(result).toBe(27);
      expect(mockPrismaService.workflowInstance.count).toHaveBeenCalledWith({
        where: {
          status: 'completed',
        },
      });
    });
  });
});

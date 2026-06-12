import { Test, TestingModule } from '@nestjs/testing';
import { ExportService } from '../../../src/modules/reporting/export.service';
import { PrismaService } from '../../../src/prisma/prisma.service';

describe('ExportService', () => {
  let service: ExportService;

  const mockChangeRequests = [
    {
      id: 'cr-1',
      crNumber: 'CR-2025-0001',
      changeType: 'Application',
      impactLevel: 'High',
      affectedService: 'Payment Gateway',
      requesterName: 'John Doe',
      requesterEmail: 'john@example.com',
      createdAt: new Date('2025-01-15T10:00:00Z'),
      updatedAt: new Date('2025-01-16T08:00:00Z'),
      workflowInstance: {
        currentStep: { name: 'IT Review' },
      },
    },
    {
      id: 'cr-2',
      crNumber: 'CR-2025-0002',
      changeType: 'Network',
      impactLevel: 'Medium',
      affectedService: 'Internal Network',
      requesterName: 'Jane Smith',
      requesterEmail: 'jane@example.com',
      createdAt: new Date('2025-01-20T14:00:00Z'),
      updatedAt: new Date('2025-01-21T09:00:00Z'),
      workflowInstance: {
        currentStep: { name: 'Approval' },
      },
    },
    {
      id: 'cr-3',
      crNumber: 'CR-2025-0003',
      changeType: 'Application',
      impactLevel: 'Low',
      affectedService: 'CRM System',
      requesterName: 'Bob Wilson',
      requesterEmail: 'bob@example.com',
      createdAt: new Date('2025-02-01T09:00:00Z'),
      updatedAt: new Date('2025-02-02T11:00:00Z'),
      workflowInstance: {
        currentStep: { name: 'Implementation' },
      },
    },
  ];

  const mockPrismaService = {
    changeRequest: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);

    jest.clearAllMocks();
  });

  describe('exportToExcel', () => {
    it('should return a non-empty Buffer', async () => {
      mockPrismaService.changeRequest.findMany.mockResolvedValue(mockChangeRequests);

      const result = await service.exportToExcel({}, 'user-1');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should filter data correctly by changeType', async () => {
      const filteredData = mockChangeRequests.filter((cr) => cr.changeType === 'Application');
      mockPrismaService.changeRequest.findMany.mockResolvedValue(filteredData);

      const result = await service.exportToExcel({ changeType: 'Application' }, 'user-1');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);

      // Verify the query was called with the correct filter
      expect(mockPrismaService.changeRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            changeType: 'Application',
          }),
        }),
      );
    });

    it('should filter data correctly by impactLevel', async () => {
      const filteredData = mockChangeRequests.filter((cr) => cr.impactLevel === 'High');
      mockPrismaService.changeRequest.findMany.mockResolvedValue(filteredData);

      const result = await service.exportToExcel({ impactLevel: 'High' }, 'user-1');

      expect(result).toBeInstanceOf(Buffer);
      expect(mockPrismaService.changeRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            impactLevel: 'High',
          }),
        }),
      );
    });

    it('should filter data correctly by date range', async () => {
      const createdFrom = new Date('2025-01-01');
      const createdTo = new Date('2025-01-31');
      mockPrismaService.changeRequest.findMany.mockResolvedValue(mockChangeRequests.slice(0, 2));

      const result = await service.exportToExcel({ createdFrom, createdTo }, 'user-1');

      expect(result).toBeInstanceOf(Buffer);
      expect(mockPrismaService.changeRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: createdFrom,
              lte: createdTo,
            },
          }),
        }),
      );
    });

    it('should return a valid Excel buffer even with empty data', async () => {
      mockPrismaService.changeRequest.findMany.mockResolvedValue([]);

      const result = await service.exportToExcel({}, 'user-1');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('exportToPdf', () => {
    it('should return a non-empty Buffer', async () => {
      mockPrismaService.changeRequest.findMany.mockResolvedValue(mockChangeRequests);

      const result = await service.exportToPdf({}, 'user-1');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should contain expected headers and data in PDF content', async () => {
      mockPrismaService.changeRequest.findMany.mockResolvedValue(mockChangeRequests);

      const result = await service.exportToPdf({}, 'user-1');

      // PDF is binary, but we can check the buffer starts with the PDF magic bytes
      const pdfHeader = result.slice(0, 5).toString('ascii');
      expect(pdfHeader).toBe('%PDF-');

      // Check that the buffer contains text content (CR numbers and report title)
      const pdfContent = result.toString('latin1');
      expect(pdfContent).toContain('Change Request Report');
      expect(pdfContent).toContain('CR Number');
      expect(pdfContent).toContain('CR-2025-0001');
    });

    it('should filter data correctly when filters are applied', async () => {
      mockPrismaService.changeRequest.findMany.mockResolvedValue([mockChangeRequests[0]]);

      const result = await service.exportToPdf({ changeType: 'Application', impactLevel: 'High' }, 'user-1');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);

      expect(mockPrismaService.changeRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            changeType: 'Application',
            impactLevel: 'High',
          }),
        }),
      );
    });

    it('should generate PDF even with empty data', async () => {
      mockPrismaService.changeRequest.findMany.mockResolvedValue([]);

      const result = await service.exportToPdf({}, 'user-1');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);

      const pdfHeader = result.slice(0, 5).toString('ascii');
      expect(pdfHeader).toBe('%PDF-');
    });
  });
});

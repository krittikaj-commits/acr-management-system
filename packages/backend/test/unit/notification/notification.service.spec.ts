import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from '../../../src/modules/notification/notification.service';
import { NotificationRepository } from '../../../src/modules/notification/notification.repository';
import { EmailService } from '../../../src/modules/notification/email/email.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { RedisService } from '../../../src/modules/redis/redis.service';
import { renderEmailTemplate } from '../../../src/modules/notification/email/templates';
import { NotificationType } from '../../../src/modules/notification/dto';

describe('NotificationService', () => {
  let service: NotificationService;
  let notificationRepository: NotificationRepository;
  let emailService: EmailService;
  let prisma: PrismaService;
  let redisService: RedisService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockEmailService = {
    sendEmail: jest.fn(),
  };

  const mockNotificationRepository = {
    create: jest.fn(),
    findByUserId: jest.fn(),
    countUnread: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    findFailedEmails: jest.fn(),
    updateMetadata: jest.fn(),
  };

  const mockRedisService = {
    getClient: jest.fn().mockReturnValue({
      publish: jest.fn().mockResolvedValue(1),
    }),
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: NotificationRepository,
          useValue: mockNotificationRepository,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    notificationRepository = module.get<NotificationRepository>(NotificationRepository);
    emailService = module.get<EmailService>(EmailService);
    prisma = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);

    jest.clearAllMocks();
  });

  describe('notify', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    const metadata = {
      crNumber: 'CR-2025-0001',
      reviewerName: 'John Doe',
      requesterName: 'Jane Smith',
      changeType: 'normal',
      affectedService: 'VPN',
      description: 'Add new VPN user',
    };

    it('should create in-app notification and send email', async () => {
      const user = { email: 'john@dits.co.th', firstName: 'John', lastName: 'Doe' };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockNotificationRepository.create.mockResolvedValue({
        id: 'notif-1',
        userId,
        type: 'cr-assigned',
        title: '[ACR] Change Request Assigned to You: CR-2025-0001',
        message: '[ACR] Change Request Assigned to You: CR-2025-0001',
        metadata,
        isRead: false,
        createdAt: new Date(),
        readAt: null,
      });
      mockEmailService.sendEmail.mockResolvedValue(undefined);

      await service.notify('cr-assigned', userId, metadata);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true },
      });
      expect(mockNotificationRepository.create).toHaveBeenCalledWith({
        userId,
        type: 'cr-assigned',
        title: expect.stringContaining('CR-2025-0001'),
        message: expect.any(String),
        metadata,
      });
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        user.email,
        expect.stringContaining('CR-2025-0001'),
        expect.stringContaining('<!DOCTYPE html>'),
      );
    });

    it('should store in retry queue on email failure', async () => {
      const user = { email: 'john@dits.co.th', firstName: 'John', lastName: 'Doe' };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockNotificationRepository.create.mockResolvedValue({
        id: 'notif-2',
        userId,
        type: 'cr-assigned',
        title: '[ACR] Change Request Assigned to You: CR-2025-0001',
        message: '[ACR] Change Request Assigned to You: CR-2025-0001',
        metadata,
        isRead: false,
        createdAt: new Date(),
        readAt: null,
      });
      mockEmailService.sendEmail.mockRejectedValue(new Error('SES timeout'));
      mockNotificationRepository.updateMetadata.mockResolvedValue({});

      await service.notify('cr-assigned', userId, metadata);

      expect(mockNotificationRepository.updateMetadata).toHaveBeenCalledWith('notif-2', {
        ...metadata,
        emailFailed: true,
        emailTo: user.email,
      });
    });

    it('should not send email if user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await service.notify('cr-assigned', 'non-existent-user', metadata);

      expect(mockNotificationRepository.create).not.toHaveBeenCalled();
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('notifyByEmail', () => {
    it('should send email directly without creating in-app notification', async () => {
      const email = 'boss@company.com';
      const metadata = {
        crNumber: 'CR-2025-0001',
        approverName: 'Boss',
        requesterName: 'Jane Smith',
        changeType: 'normal',
        affectedService: 'VPN',
        description: 'Add new VPN user',
        approvalLink: 'https://acr.dits.co.th/approve/token-123',
      };

      mockEmailService.sendEmail.mockResolvedValue(undefined);

      await service.notifyByEmail('approval-link', email, metadata);

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        email,
        expect.stringContaining('CR-2025-0001'),
        expect.stringContaining('https://acr.dits.co.th/approve/token-123'),
      );
      expect(mockNotificationRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if email sending fails', async () => {
      mockEmailService.sendEmail.mockRejectedValue(new Error('SES error'));

      await expect(
        service.notifyByEmail('approval-link', 'boss@company.com', {
          crNumber: 'CR-2025-0001',
          approverName: 'Boss',
          requesterName: 'Jane',
          changeType: 'normal',
          affectedService: 'VPN',
          description: 'Test',
          approvalLink: 'https://acr.dits.co.th/approve/token',
        }),
      ).rejects.toThrow('SES error');
    });
  });

  describe('retryFailedEmails', () => {
    it('should retry failed emails and clear flag on success', async () => {
      const failedNotifications = [
        {
          id: 'notif-failed-1',
          userId: 'user-1',
          type: 'cr-assigned',
          title: 'Test',
          message: 'Test',
          metadata: {
            crNumber: 'CR-2025-0001',
            reviewerName: 'John',
            requesterName: 'Jane',
            changeType: 'normal',
            affectedService: 'VPN',
            description: 'Test',
            emailFailed: true,
            emailTo: 'john@dits.co.th',
          },
          isRead: false,
          createdAt: new Date(),
          readAt: null,
        },
      ];

      mockNotificationRepository.findFailedEmails.mockResolvedValue(failedNotifications);
      mockEmailService.sendEmail.mockResolvedValue(undefined);
      mockNotificationRepository.updateMetadata.mockResolvedValue({});

      const result = await service.retryFailedEmails();

      expect(result).toEqual({ retried: 1, failed: 0 });
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        'john@dits.co.th',
        expect.stringContaining('CR-2025-0001'),
        expect.stringContaining('<!DOCTYPE html>'),
      );
      // Should clear emailFailed and emailTo from metadata
      expect(mockNotificationRepository.updateMetadata).toHaveBeenCalledWith('notif-failed-1', {
        crNumber: 'CR-2025-0001',
        reviewerName: 'John',
        requesterName: 'Jane',
        changeType: 'normal',
        affectedService: 'VPN',
        description: 'Test',
      });
    });

    it('should count failures when retry still fails', async () => {
      const failedNotifications = [
        {
          id: 'notif-failed-2',
          userId: 'user-1',
          type: 'cr-submitted',
          title: 'Test',
          message: 'Test',
          metadata: {
            crNumber: 'CR-2025-0002',
            requesterName: 'Jane',
            requesterEmail: 'jane@dits.co.th',
            changeType: 'normal',
            affectedService: 'Server',
            description: 'OS Update',
            emailFailed: true,
            emailTo: 'callcenter@dits.co.th',
          },
          isRead: false,
          createdAt: new Date(),
          readAt: null,
        },
      ];

      mockNotificationRepository.findFailedEmails.mockResolvedValue(failedNotifications);
      mockEmailService.sendEmail.mockRejectedValue(new Error('SES still down'));

      const result = await service.retryFailedEmails();

      expect(result).toEqual({ retried: 0, failed: 1 });
    });
  });

  describe('template rendering', () => {
    it('should render cr-submitted template with valid HTML', () => {
      const result = renderEmailTemplate('cr-submitted', {
        crNumber: 'CR-2025-0001',
        requesterName: 'Jane Smith',
        requesterEmail: 'jane@dits.co.th',
        changeType: 'normal',
        affectedService: 'VPN',
        description: 'Add new VPN user',
      });

      expect(result).not.toBeNull();
      expect(result!.subject).toContain('CR-2025-0001');
      expect(result!.html).toContain('<!DOCTYPE html>');
      expect(result!.html).toContain('CR-2025-0001');
      expect(result!.html).toContain('Jane Smith');
      expect(result!.html).toContain('VPN');
    });

    it('should render approval-link template with approval URL', () => {
      const result = renderEmailTemplate('approval-link', {
        crNumber: 'CR-2025-0003',
        approverName: 'Boss Man',
        requesterName: 'Jane',
        changeType: 'emergency',
        affectedService: 'Firewall',
        description: 'Emergency rule change',
        approvalLink: 'https://acr.dits.co.th/approve/abc-123',
      });

      expect(result).not.toBeNull();
      expect(result!.subject).toContain('CR-2025-0003');
      expect(result!.html).toContain('https://acr.dits.co.th/approve/abc-123');
      expect(result!.html).toContain('Boss Man');
      expect(result!.html).toContain('href=');
    });

    it('should render all 9 template types', () => {
      const types: NotificationType[] = [
        'cr-submitted',
        'cr-assigned',
        'cr-approved',
        'cr-rejected',
        'approval-required',
        'implementation-ready',
        'verification-required',
        'cr-completed',
        'approval-link',
      ];

      for (const type of types) {
        const result = renderEmailTemplate(type, {
          crNumber: 'CR-2025-0001',
          reviewerName: 'Reviewer',
          requesterName: 'Requester',
          requesterEmail: 'req@dits.co.th',
          recipientName: 'Recipient',
          approverName: 'Approver',
          implementerName: 'Implementer',
          changeType: 'normal',
          impactLevel: 'medium',
          affectedService: 'VPN',
          description: 'Test description',
          reason: 'Test reason',
          closureReason: 'Completed successfully',
          approvalLink: 'https://acr.dits.co.th/approve/token',
        });

        expect(result).not.toBeNull();
        expect(result!.subject).toBeTruthy();
        expect(result!.html).toContain('<!DOCTYPE html>');
      }
    });

    it('should return null for unknown template type', () => {
      const result = renderEmailTemplate('unknown-type' as NotificationType, {});
      expect(result).toBeNull();
    });
  });

  describe('SES sendEmail', () => {
    it('should call EmailService.sendEmail with correct parameters', async () => {
      const user = { email: 'reviewer@dits.co.th', firstName: 'IT', lastName: 'Reviewer' };
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockNotificationRepository.create.mockResolvedValue({
        id: 'notif-ses-1',
        userId: 'user-1',
        type: 'cr-approved',
        title: 'Test',
        message: 'Test',
        metadata: {},
        isRead: false,
        createdAt: new Date(),
        readAt: null,
      });
      mockEmailService.sendEmail.mockResolvedValue(undefined);

      await service.notify('cr-approved', 'user-1', {
        crNumber: 'CR-2025-0005',
        recipientName: 'IT Reviewer',
        approverName: 'CTO',
        changeType: 'normal',
        affectedService: 'Server',
      });

      expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(1);
      const [to, subject, html] = mockEmailService.sendEmail.mock.calls[0];
      expect(to).toBe('reviewer@dits.co.th');
      expect(subject).toContain('Approved');
      expect(subject).toContain('CR-2025-0005');
      expect(html).toContain('CTO');
      expect(html).toContain('Server');
    });
  });
});

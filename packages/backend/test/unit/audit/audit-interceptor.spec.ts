import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import {
  AuditInterceptor,
  resolveEntityType,
} from '../../../src/common/interceptors/audit.interceptor';
import { AuditService } from '../../../src/modules/audit/audit.service';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let auditService: jest.Mocked<Pick<AuditService, 'create'>>;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    auditService = {
      create: jest.fn().mockResolvedValue({}),
    };
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<Reflector>;

    interceptor = new AuditInterceptor(
      auditService as unknown as AuditService,
      reflector,
    );
  });

  function createMockContext(options: {
    method: string;
    url: string;
    body?: unknown;
    user?: { sub?: string; email?: string };
    params?: Record<string, string>;
    ip?: string;
  }): ExecutionContext {
    const request = {
      method: options.method,
      url: options.url,
      body: options.body ?? {},
      user: options.user,
      params: options.params ?? {},
      ip: options.ip ?? '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  function createMockCallHandler(response: unknown): CallHandler {
    return {
      handle: () => of(response),
    };
  }

  describe('logs create action on POST request', () => {
    it('should call auditService.create with action "create" on POST', async () => {
      const responseBody = { id: '550e8400-e29b-41d4-a716-446655440000', title: 'New CR' };
      const context = createMockContext({
        method: 'POST',
        url: '/change-requests',
        body: { title: 'New CR' },
        user: { sub: 'user-123', email: 'test@example.com' },
      });
      const handler = createMockCallHandler(responseBody);

      const result$ = interceptor.intercept(context, handler);
      await lastValueFrom(result$);

      expect(auditService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'create',
          entityType: 'ChangeRequest',
          entityId: '550e8400-e29b-41d4-a716-446655440000',
          userEmail: 'test@example.com',
          newValue: responseBody,
        }),
      );
    });
  });

  describe('logs update action on PATCH/PUT request', () => {
    it('should call auditService.create with action "update" on PATCH', async () => {
      const entityId = '550e8400-e29b-41d4-a716-446655440000';
      const responseBody = { id: entityId, title: 'Updated CR' };
      const context = createMockContext({
        method: 'PATCH',
        url: `/change-requests/${entityId}`,
        body: { title: 'Updated CR' },
        user: { sub: 'user-123', email: 'test@example.com' },
        params: { id: entityId },
      });
      const handler = createMockCallHandler(responseBody);

      const result$ = interceptor.intercept(context, handler);
      await lastValueFrom(result$);

      expect(auditService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update',
          entityType: 'ChangeRequest',
          entityId,
          oldValue: { title: 'Updated CR' },
          newValue: responseBody,
        }),
      );
    });

    it('should call auditService.create with action "update" on PUT', async () => {
      const entityId = '550e8400-e29b-41d4-a716-446655440000';
      const responseBody = { id: entityId, title: 'Replaced CR' };
      const context = createMockContext({
        method: 'PUT',
        url: `/change-requests/${entityId}`,
        body: { title: 'Replaced CR' },
        user: { sub: 'user-123', email: 'test@example.com' },
        params: { id: entityId },
      });
      const handler = createMockCallHandler(responseBody);

      const result$ = interceptor.intercept(context, handler);
      await lastValueFrom(result$);

      expect(auditService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update',
          entityType: 'ChangeRequest',
          entityId,
        }),
      );
    });
  });

  describe('logs delete action on DELETE request', () => {
    it('should call auditService.create with action "delete" on DELETE', async () => {
      const entityId = '550e8400-e29b-41d4-a716-446655440000';
      const context = createMockContext({
        method: 'DELETE',
        url: `/change-requests/${entityId}`,
        user: { sub: 'user-123', email: 'test@example.com' },
        params: { id: entityId },
      });
      const handler = createMockCallHandler({ deleted: true });

      const result$ = interceptor.intercept(context, handler);
      await lastValueFrom(result$);

      expect(auditService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'delete',
          entityType: 'ChangeRequest',
          entityId,
          newValue: undefined,
        }),
      );
    });
  });

  describe('does NOT log GET requests', () => {
    it('should not call auditService.create on GET', async () => {
      const context = createMockContext({
        method: 'GET',
        url: '/change-requests',
        user: { sub: 'user-123', email: 'test@example.com' },
      });
      const handler = createMockCallHandler([]);

      const result$ = interceptor.intercept(context, handler);
      await lastValueFrom(result$);

      expect(auditService.create).not.toHaveBeenCalled();
    });
  });

  describe('does NOT log routes with @SkipAudit()', () => {
    it('should not call auditService.create when skipAudit metadata is true', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);

      const context = createMockContext({
        method: 'POST',
        url: '/change-requests',
        user: { sub: 'user-123', email: 'test@example.com' },
      });
      const handler = createMockCallHandler({ id: '550e8400-e29b-41d4-a716-446655440000' });

      const result$ = interceptor.intercept(context, handler);
      await lastValueFrom(result$);

      expect(auditService.create).not.toHaveBeenCalled();
    });
  });

  describe('does NOT log auth endpoints', () => {
    it('should not log /auth/login', async () => {
      const context = createMockContext({
        method: 'POST',
        url: '/auth/login',
        body: { email: 'user@example.com', password: 'secret' },
      });
      const handler = createMockCallHandler({ accessToken: 'xxx' });

      const result$ = interceptor.intercept(context, handler);
      await lastValueFrom(result$);

      expect(auditService.create).not.toHaveBeenCalled();
    });

    it('should not log /auth/refresh', async () => {
      const context = createMockContext({
        method: 'POST',
        url: '/auth/refresh',
        body: { refreshToken: 'xxx' },
      });
      const handler = createMockCallHandler({ accessToken: 'yyy' });

      const result$ = interceptor.intercept(context, handler);
      await lastValueFrom(result$);

      expect(auditService.create).not.toHaveBeenCalled();
    });
  });

  describe('extracts entity type from URL', () => {
    it('resolves ChangeRequest from /change-requests', () => {
      expect(resolveEntityType('/change-requests')).toBe('ChangeRequest');
    });

    it('resolves WorkflowDefinition from /workflows', () => {
      expect(resolveEntityType('/workflows')).toBe('WorkflowDefinition');
    });

    it('resolves User from /users', () => {
      expect(resolveEntityType('/users')).toBe('User');
    });

    it('resolves Attachment from /attachments', () => {
      expect(resolveEntityType('/attachments')).toBe('Attachment');
    });

    it('resolves Approval from /approvals', () => {
      expect(resolveEntityType('/approvals')).toBe('Approval');
    });

    it('resolves Notification from /notifications', () => {
      expect(resolveEntityType('/notifications')).toBe('Notification');
    });

    it('resolves MasterData from /master-data', () => {
      expect(resolveEntityType('/master-data')).toBe('MasterData');
    });

    it('returns null for /audit-logs (do not audit the audit)', () => {
      expect(resolveEntityType('/audit-logs')).toBeNull();
    });

    it('returns null for unknown paths', () => {
      expect(resolveEntityType('/unknown-entity')).toBeNull();
    });

    it('resolves entity type from nested URLs with ID', () => {
      expect(
        resolveEntityType('/change-requests/550e8400-e29b-41d4-a716-446655440000'),
      ).toBe('ChangeRequest');
    });
  });

  describe('captures user email from request.user', () => {
    it('should use user email from request.user', async () => {
      const entityId = '550e8400-e29b-41d4-a716-446655440000';
      const context = createMockContext({
        method: 'POST',
        url: '/change-requests',
        body: { title: 'Test' },
        user: { sub: 'user-uuid', email: 'john@dits.co.th' },
      });
      const handler = createMockCallHandler({ id: entityId });

      const result$ = interceptor.intercept(context, handler);
      await lastValueFrom(result$);

      expect(auditService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-uuid',
          userEmail: 'john@dits.co.th',
        }),
      );
    });
  });

  describe('handles anonymous requests (no user)', () => {
    it('should use fallback email when no user is present', async () => {
      const entityId = '550e8400-e29b-41d4-a716-446655440000';
      const context = createMockContext({
        method: 'POST',
        url: '/change-requests',
        body: { title: 'Anonymous CR' },
        user: undefined,
      });
      const handler = createMockCallHandler({ id: entityId });

      const result$ = interceptor.intercept(context, handler);
      await lastValueFrom(result$);

      expect(auditService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: undefined,
          userEmail: 'anonymous@system',
        }),
      );
    });
  });
});

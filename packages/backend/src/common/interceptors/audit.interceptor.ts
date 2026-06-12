import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../modules/audit/audit.service';
import { SKIP_AUDIT_KEY } from '../decorators/skip-audit.decorator';
import { KnownEntityType } from '../../modules/audit/dto/create-audit-log.dto';

/** Maps URL path segments to entity types. */
const ENTITY_TYPE_MAP: Record<string, KnownEntityType | null> = {
  'change-requests': 'ChangeRequest',
  workflows: 'WorkflowDefinition',
  'audit-logs': null, // Don't audit the audit
  users: 'User',
  attachments: 'Attachment',
  approvals: 'Approval',
  notifications: 'Notification',
  'master-data': 'MasterData',
};

/** Auth paths that should never be audited (sensitive data). */
const SKIP_AUTH_PATHS = ['/auth/login', '/auth/refresh'];

/** HTTP methods considered write operations. */
const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Resolve entity type from a URL path.
 * Looks for the first path segment that matches a known entity type.
 *
 * @returns The entity type string or null if the URL should be skipped.
 */
export function resolveEntityType(url: string): KnownEntityType | null {
  // Strip query params
  const path = url.split('?')[0];
  const segments = path.split('/').filter(Boolean);

  for (const segment of segments) {
    if (segment in ENTITY_TYPE_MAP) {
      return ENTITY_TYPE_MAP[segment];
    }
  }

  return null;
}

/**
 * Determines the audit action from an HTTP method.
 */
function resolveAction(method: string): string {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return 'unknown';
  }
}

/**
 * Extracts an entity ID from the URL path parameters or response body.
 * Looks for UUID-like segments in the URL after the entity type segment.
 */
function extractEntityId(
  url: string,
  params: Record<string, string> | undefined,
  responseBody: unknown,
): string | null {
  // Try from route params first (e.g. :id)
  if (params?.id) {
    return params.id;
  }

  // Try from URL path segments (look for UUID-like string)
  const path = url.split('?')[0];
  const segments = path.split('/').filter(Boolean);
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  for (const segment of segments) {
    if (uuidRegex.test(segment)) {
      return segment;
    }
  }

  // Try from response body
  if (responseBody && typeof responseBody === 'object' && 'id' in responseBody) {
    return (responseBody as { id: string }).id;
  }

  return null;
}

/**
 * AuditInterceptor — automatically captures audit log entries for write operations.
 *
 * Logs before/after state for POST, PUT, PATCH, DELETE requests.
 * Skips GET requests, @SkipAudit() decorated routes, and auth endpoints.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method: string = request.method?.toUpperCase() ?? '';

    // Skip non-write operations (GET, HEAD, OPTIONS)
    if (!WRITE_METHODS.includes(method)) {
      return next.handle();
    }

    // Skip routes with @SkipAudit() decorator
    const skipAudit = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipAudit) {
      return next.handle();
    }

    // Skip auth endpoints (sensitive data)
    const url: string = request.url ?? request.path ?? '';
    if (SKIP_AUTH_PATHS.some((authPath) => url.startsWith(authPath))) {
      return next.handle();
    }

    // Resolve entity type — skip if not recognized or audit-logs
    const entityType = resolveEntityType(url);
    if (!entityType) {
      return next.handle();
    }

    const action = resolveAction(method);
    const requestBody = request.body;
    const user = request.user as
      | { sub?: string; email?: string }
      | undefined;

    return next.handle().pipe(
      tap(async (responseBody) => {
        try {
          const entityId = extractEntityId(url, request.params, responseBody);

          if (!entityId) {
            this.logger.warn(
              `Could not determine entityId for audit log: ${method} ${url}`,
            );
            return;
          }

          await this.auditService.create({
            userId: user?.sub ?? undefined,
            userEmail: user?.email ?? 'anonymous@system',
            action,
            entityType,
            entityId,
            oldValue: method === 'POST' ? undefined : requestBody,
            newValue: method === 'DELETE' ? undefined : responseBody,
            ipAddress: request.ip ?? request.connection?.remoteAddress,
          });
        } catch (error) {
          // Never let audit logging failures affect the main request
          this.logger.error('Failed to create audit log entry', error);
        }
      }),
    );
  }
}

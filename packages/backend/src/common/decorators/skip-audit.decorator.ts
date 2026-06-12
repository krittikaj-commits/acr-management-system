import { SetMetadata } from '@nestjs/common';

export const SKIP_AUDIT_KEY = 'skipAudit';

/**
 * Marks a route to skip audit logging via the AuditInterceptor.
 * Useful for sensitive endpoints (e.g. auth) or internal routes.
 */
export const SkipAudit = () => SetMetadata(SKIP_AUDIT_KEY, true);

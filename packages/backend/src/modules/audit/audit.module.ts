import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

/**
 * AuditModule — Global module providing AuditService.
 *
 * Marked as @Global() so the audit interceptor and any module
 * can inject AuditService without explicitly importing AuditModule.
 */
@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}

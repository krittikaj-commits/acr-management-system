import { Module } from '@nestjs/common';
import { ApprovalController } from './approval.controller';
import { ApprovalService } from './approval.service';
import { ApprovalRepository } from './approval.repository';

/**
 * ApprovalModule — Encapsulates approval record management.
 *
 * Provides ApprovalService for creating and querying approval records,
 * including BR-010 business rule checks.
 */
@Module({
  controllers: [ApprovalController],
  providers: [ApprovalService, ApprovalRepository],
  exports: [ApprovalService],
})
export class ApprovalModule {}

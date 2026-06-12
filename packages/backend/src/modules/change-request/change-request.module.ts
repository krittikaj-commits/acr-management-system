import { Module } from '@nestjs/common';
import { ChangeRequestController } from './change-request.controller';
import { ChangeRequestRepository } from './change-request.repository';
import { ChangeRequestService } from './change-request.service';
import { WorkflowModule } from '../workflow/workflow.module';
import { ApprovalModule } from '../approval/approval.module';

/**
 * ChangeRequestModule — Manages change request lifecycle.
 *
 * Provides:
 * - ChangeRequestController for REST endpoints
 * - ChangeRequestRepository for data access (CR CRUD, CR number generation, optimistic locking)
 * - ChangeRequestService for business logic + workflow integration
 *
 * Imports:
 * - WorkflowModule for WorkflowEngineService and WorkflowRepository access
 * - ApprovalModule for ApprovalService access (emergency post-approval enforcement)
 */
@Module({
  imports: [WorkflowModule, ApprovalModule],
  controllers: [ChangeRequestController],
  providers: [ChangeRequestRepository, ChangeRequestService],
  exports: [ChangeRequestRepository, ChangeRequestService],
})
export class ChangeRequestModule {}

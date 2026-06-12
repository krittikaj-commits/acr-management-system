import { Module } from '@nestjs/common';
import { WorkflowRepository } from './workflow.repository';
import { WorkflowDefinitionService } from './workflow-definition.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowValidatorService } from './workflow-validator.service';
import { WorkflowController } from './workflow.controller';

/**
 * WorkflowModule — Manages workflow definitions, steps, conditions, and engine.
 *
 * Provides:
 * - WorkflowController for admin REST endpoints
 * - WorkflowRepository for data access
 * - WorkflowDefinitionService for CRUD operations + versioning
 * - WorkflowEngineService for step transitions and condition routing
 * - WorkflowValidatorService for workflow integrity validation
 */
@Module({
  controllers: [WorkflowController],
  providers: [
    WorkflowRepository,
    WorkflowDefinitionService,
    WorkflowEngineService,
    WorkflowValidatorService,
  ],
  exports: [
    WorkflowRepository,
    WorkflowDefinitionService,
    WorkflowEngineService,
    WorkflowValidatorService,
  ],
})
export class WorkflowModule {}

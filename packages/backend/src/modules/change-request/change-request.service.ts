import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AuditLog, WorkflowStep } from '@prisma/client';
import {
  ChangeRequestRepository,
  ChangeRequestFilters,
  PaginationOptions,
  PaginatedResult,
} from './change-request.repository';
import { WorkflowEngineService } from '../workflow/workflow-engine.service';
import { WorkflowRepository } from '../workflow/workflow.repository';
import { AuditService } from '../audit/audit.service';
import { ApprovalService } from '../approval/approval.service';
import { CreateChangeRequestDto } from './dto/create-change-request.dto';
import { UpdateChangeRequestDto } from './dto/update-change-request.dto';
import { ChangeRequestWithWorkflow } from './dto/change-request-response.dto';
import { CRSearchQuery } from './dto/search-query.dto';

/** Result of field validation for a workflow step */
export interface FieldValidationResult {
  allowed: boolean;
  reason?: string;
  disallowedFields?: string[];
}

/**
 * ChangeRequestService — Business logic for Change Request lifecycle.
 *
 * Responsibilities:
 * - Create CR (anonymous or authenticated) with workflow instance
 * - Update CR fields with optimistic locking and step-based field validation
 * - Query CRs by ID, CR number, or filters with pagination
 * - Validate fields against current workflow step configuration
 */
@Injectable()
export class ChangeRequestService {
  constructor(
    private readonly repository: ChangeRequestRepository,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly workflowRepository: WorkflowRepository,
    private readonly auditService: AuditService,
    private readonly approvalService: ApprovalService,
  ) {}

  /**
   * Create a new Change Request.
   * - Auto-generates CR number via repository
   * - Creates a workflow instance linked to the default active workflow
   * - Supports anonymous (no userId) and authenticated creation
   */
  async create(
    dto: CreateChangeRequestDto,
    userId?: string,
  ): Promise<ChangeRequestWithWorkflow> {
    // Find the default active workflow definition
    const defaultWorkflow = await this.workflowRepository.findActiveDefault();
    if (!defaultWorkflow) {
      throw new BadRequestException(
        'No active default workflow definition found. Please contact admin.',
      );
    }

    // Create the CR record first (without workflow link)
    const crData: Record<string, unknown> = {
      changeType: dto.changeType,
      impactLevel: dto.impactLevel,
      affectedService: dto.affectedService,
      description: dto.description,
      justification: dto.justification ?? null,
      requesterName: dto.requesterName,
      requesterEmail: dto.requesterEmail,
      requesterDepartment: dto.requesterDepartment ?? null,
      approverRequestEmail: dto.approverRequestEmail ?? null,
      emergencyReason: dto.emergencyReason ?? null,
    };

    // Link to user if authenticated
    if (userId) {
      crData.requester = { connect: { id: userId } };
    }

    const createdCr = await this.repository.create(crData as any);

    // Create workflow instance linked to this CR
    const workflowInstance = await this.workflowEngine.createInstance(
      defaultWorkflow.id,
      createdCr.id,
    );

    // Re-fetch the CR with the workflow instance relation populated
    const crWithWorkflow = await this.repository.findById(createdCr.id);
    if (!crWithWorkflow) {
      throw new NotFoundException(
        'Failed to retrieve newly created change request',
      );
    }

    return crWithWorkflow;
  }

  /**
   * Find a Change Request by ID with workflow info.
   */
  async findById(id: string): Promise<ChangeRequestWithWorkflow> {
    const cr = await this.repository.findById(id);
    if (!cr) {
      throw new NotFoundException(`Change request "${id}" not found`);
    }
    return cr;
  }

  /**
   * Find a Change Request by CR number (e.g. CR-2026-0001).
   */
  async findByCrNumber(crNumber: string): Promise<ChangeRequestWithWorkflow> {
    const cr = await this.repository.findByCrNumber(crNumber);
    if (!cr) {
      throw new NotFoundException(
        `Change request with number "${crNumber}" not found`,
      );
    }
    return cr;
  }

  /**
   * List Change Requests with pagination and filtering.
   */
  async findAll(
    filters: ChangeRequestFilters,
    pagination: PaginationOptions,
  ): Promise<PaginatedResult<ChangeRequestWithWorkflow>> {
    return this.repository.findAll(filters, pagination);
  }

  /**
   * Search Change Requests with multiple filters, pagination, and sorting.
   * Maps CRSearchQuery DTO to repository filters and pagination options.
   */
  async search(
    query: CRSearchQuery,
  ): Promise<PaginatedResult<ChangeRequestWithWorkflow>> {
    const filters: ChangeRequestFilters = {};

    if (query.search) {
      filters.search = query.search;
    }
    if (query.changeType) {
      filters.changeType = query.changeType;
    }
    if (query.impactLevel) {
      filters.impactLevel = query.impactLevel;
    }
    if (query.assignedToId) {
      filters.assignedToId = query.assignedToId;
    }
    if (query.requesterEmail) {
      filters.requesterEmail = query.requesterEmail;
    }
    if (query.createdFrom) {
      filters.createdFrom = new Date(query.createdFrom);
    }
    if (query.createdTo) {
      filters.createdTo = new Date(query.createdTo);
    }

    const pagination: PaginationOptions = {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      sortBy: query.sortBy ?? 'createdAt',
      sortOrder: query.sortOrder ?? 'desc',
    };

    return this.repository.findAll(filters, pagination);
  }

  /**
   * Get the audit trail (history) for a specific Change Request.
   * Delegates to AuditService.findByEntity for 'ChangeRequest' entity type.
   *
   * @param id - The Change Request ID
   * @returns Array of audit log entries for the CR, ordered newest first
   * @throws NotFoundException if the CR does not exist
   */
  async getHistory(id: string): Promise<AuditLog[]> {
    // Verify the CR exists
    const cr = await this.repository.findById(id);
    if (!cr) {
      throw new NotFoundException(`Change request "${id}" not found`);
    }

    return this.auditService.findByEntity('ChangeRequest', id);
  }

  /**
   * Update a Change Request with optimistic locking and step-based field validation.
   * - Validates fields are allowed at the current workflow step
   * - Uses version check for optimistic locking (via repository)
   */
  async update(
    id: string,
    dto: UpdateChangeRequestDto,
    userId?: string,
  ): Promise<ChangeRequestWithWorkflow> {
    // Fetch the existing CR to get current workflow step
    const existingCr = await this.repository.findById(id);
    if (!existingCr) {
      throw new NotFoundException(`Change request "${id}" not found`);
    }

    // Extract fields being updated (exclude 'version' from field list)
    const { version, ...updateFields } = dto;
    const fieldsToUpdate = Object.keys(updateFields).filter(
      (key) => updateFields[key as keyof typeof updateFields] !== undefined,
    );

    // Validate fields against current workflow step
    if (fieldsToUpdate.length > 0 && existingCr.workflowInstance?.currentStep) {
      const currentStep = existingCr.workflowInstance.currentStep as unknown as WorkflowStep;
      const validation = this.validateFieldsForStep(fieldsToUpdate, currentStep);
      if (!validation.allowed) {
        throw new BadRequestException(validation.reason);
      }
    }

    // Build the update data (only defined fields)
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updateFields)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    // Use repository's optimistic locking update
    const updatedCr = await this.repository.update(id, updateData as any, version);
    return updatedCr;
  }

  /**
   * Validate that the given fields are allowed for the current workflow step.
   *
   * Logic:
   * - If the step has no `requiredFields` config (null), all fields are allowed
   * - If `requiredFields` is an array, only those fields + always-editable fields are allowed
   * - Returns validation result with reason if not allowed
   */
  validateFieldsForStep(
    fields: string[],
    currentStep: WorkflowStep,
  ): FieldValidationResult {
    // If step has no requiredFields configuration, all fields are allowed
    const requiredFields = currentStep.requiredFields as string[] | null;
    if (!requiredFields || !Array.isArray(requiredFields)) {
      return { allowed: true };
    }

    // Check which fields are not in the allowed set
    const disallowedFields = fields.filter(
      (field) => !requiredFields.includes(field),
    );

    if (disallowedFields.length > 0) {
      return {
        allowed: false,
        reason: `Fields not allowed at step "${currentStep.name}": ${disallowedFields.join(', ')}. Allowed fields: ${requiredFields.join(', ')}`,
        disallowedFields,
      };
    }

    return { allowed: true };
  }

  // ─── Workflow Transition Methods ─────────────────────────────────────────────

  /**
   * Submit a CR from Draft step to Submitted.
   * - Validates CR is at the Draft (start) step
   * - Transitions workflow to next step (Submitted)
   * - If approverRequestEmail is set, triggers pre-approval email (placeholder)
   */
  async submit(id: string, userId?: string): Promise<ChangeRequestWithWorkflow> {
    const cr = await this.repository.findById(id);
    if (!cr) {
      throw new NotFoundException(`Change request "${id}" not found`);
    }

    // Validate current step is 'start' (Draft)
    this.validateCurrentStep(cr, 'start', 'submit');

    const workflowInstanceId = this.getWorkflowInstanceId(cr);

    // Transition workflow to next step
    await this.workflowEngine.transition(workflowInstanceId, {});

    // If approverRequestEmail is set, trigger pre-approval email (placeholder)
    if (cr.approverRequestEmail) {
      // TODO: Send pre-approval email to approverRequestEmail
    }

    // Re-fetch and return updated CR
    const updatedCr = await this.repository.findById(id);
    if (!updatedCr) {
      throw new NotFoundException(`Change request "${id}" not found after transition`);
    }

    return updatedCr;
  }

  /**
   * Assign a CR to an IT Reviewer.
   * - Validates CR is at the Submitted step
   * - Sets assignedToId on the CR
   * - Transitions workflow to IT Review
   */
  async assign(
    id: string,
    assignedToId: string,
    userId: string,
  ): Promise<ChangeRequestWithWorkflow> {
    const cr = await this.repository.findById(id);
    if (!cr) {
      throw new NotFoundException(`Change request "${id}" not found`);
    }

    // Validate current step is 'submitted'
    this.validateCurrentStep(cr, 'submitted', 'assign');

    const workflowInstanceId = this.getWorkflowInstanceId(cr);

    // Set assignedToId on the CR
    await this.repository.update(id, { assignedToId } as any, cr.version);

    // Transition workflow to IT Review
    await this.workflowEngine.transition(workflowInstanceId, {});

    // Re-fetch and return updated CR
    const updatedCr = await this.repository.findById(id);
    if (!updatedCr) {
      throw new NotFoundException(`Change request "${id}" not found after transition`);
    }

    return updatedCr;
  }

  /**
   * Submit CR for approval.
   * - Validates CR is at IT Review step
   * - Validates required fields are filled (impactAnalysis, riskAssessment, implementationPlan, rolloutPlan, rollbackPlan)
   * - Transitions workflow using context (evaluates conditions — e.g. emergency skips approval)
   */
  async submitForApproval(
    id: string,
    userId: string,
  ): Promise<ChangeRequestWithWorkflow> {
    const cr = await this.repository.findById(id);
    if (!cr) {
      throw new NotFoundException(`Change request "${id}" not found`);
    }

    // Validate current step is 'review' (IT Review)
    this.validateCurrentStep(cr, 'review', 'submitForApproval');

    // Validate required fields are filled
    const missingFields: string[] = [];
    if (!cr.impactAnalysis) missingFields.push('impactAnalysis');
    if (!cr.riskAssessment) missingFields.push('riskAssessment');
    if (!cr.implementationPlan) missingFields.push('implementationPlan');
    if (!cr.rolloutPlan) missingFields.push('rolloutPlan');
    if (!cr.rollbackPlan) missingFields.push('rollbackPlan');

    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Cannot submit for approval. Missing required fields: ${missingFields.join(', ')}`,
      );
    }

    const workflowInstanceId = this.getWorkflowInstanceId(cr);

    // Transition with context — conditions may route emergency to Implementation
    await this.workflowEngine.transition(workflowInstanceId, {
      changeType: cr.changeType,
      impactLevel: cr.impactLevel,
    });

    // Re-fetch and return updated CR
    const updatedCr = await this.repository.findById(id);
    if (!updatedCr) {
      throw new NotFoundException(`Change request "${id}" not found after transition`);
    }

    return updatedCr;
  }

  /**
   * Approve a CR.
   * - Validates CR is at Approval step
   * - Transitions workflow to Implementation
   */
  async approve(
    id: string,
    approverId: string,
    reason?: string,
  ): Promise<ChangeRequestWithWorkflow> {
    const cr = await this.repository.findById(id);
    if (!cr) {
      throw new NotFoundException(`Change request "${id}" not found`);
    }

    // Validate current step is 'approval'
    this.validateCurrentStep(cr, 'approval', 'approve');

    const workflowInstanceId = this.getWorkflowInstanceId(cr);

    // Transition workflow to Implementation
    await this.workflowEngine.transition(workflowInstanceId, {});

    // Re-fetch and return updated CR
    const updatedCr = await this.repository.findById(id);
    if (!updatedCr) {
      throw new NotFoundException(`Change request "${id}" not found after transition`);
    }

    return updatedCr;
  }

  /**
   * Reject a CR.
   * - Validates CR is at Approval step
   * - Reason is required for rejection
   * - Transitions workflow back (or to rejected/returned state)
   */
  async reject(
    id: string,
    approverId: string,
    reason: string,
  ): Promise<ChangeRequestWithWorkflow> {
    const cr = await this.repository.findById(id);
    if (!cr) {
      throw new NotFoundException(`Change request "${id}" not found`);
    }

    // Validate current step is 'approval'
    this.validateCurrentStep(cr, 'approval', 'reject');

    // Reason is required
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Rejection reason is required');
    }

    const workflowInstanceId = this.getWorkflowInstanceId(cr);

    // Transition workflow with rejection context
    await this.workflowEngine.transition(workflowInstanceId, {
      action: 'reject',
    });

    // Update CR with closure/rejection reason
    await this.repository.update(
      id,
      { closureReason: reason } as any,
      cr.version,
    );

    // Re-fetch and return updated CR
    const updatedCr = await this.repository.findById(id);
    if (!updatedCr) {
      throw new NotFoundException(`Change request "${id}" not found after transition`);
    }

    return updatedCr;
  }

  /**
   * Record implementation of a CR.
   * - Validates CR is at Implementation step
   * - Sets implementerNotes, versionBefore, versionAfter
   * - Transitions workflow to Verification
   */
  async implement(
    id: string,
    implementerId: string,
    notes: string,
    versionBefore?: string,
    versionAfter?: string,
  ): Promise<ChangeRequestWithWorkflow> {
    const cr = await this.repository.findById(id);
    if (!cr) {
      throw new NotFoundException(`Change request "${id}" not found`);
    }

    // Validate current step is 'implementation'
    this.validateCurrentStep(cr, 'implementation', 'implement');

    const workflowInstanceId = this.getWorkflowInstanceId(cr);

    // Update CR with implementation details
    const updateData: Record<string, unknown> = {
      implementerNotes: notes,
    };
    if (versionBefore) updateData.versionBefore = versionBefore;
    if (versionAfter) updateData.versionAfter = versionAfter;

    await this.repository.update(id, updateData as any, cr.version);

    // Transition workflow to Verification
    await this.workflowEngine.transition(workflowInstanceId, {});

    // Re-fetch and return updated CR
    const updatedCr = await this.repository.findById(id);
    if (!updatedCr) {
      throw new NotFoundException(`Change request "${id}" not found after transition`);
    }

    return updatedCr;
  }

  /**
   * Verify a CR after implementation.
   * - Validates CR is at Verification step
   * - Sets verificationResult
   * - If success: transitions to Closed (end step)
   * - If failed: transitions back to Implementation
   */
  async verify(
    id: string,
    userId: string,
    result: 'success' | 'failed',
  ): Promise<ChangeRequestWithWorkflow> {
    const cr = await this.repository.findById(id);
    if (!cr) {
      throw new NotFoundException(`Change request "${id}" not found`);
    }

    // Validate current step is 'verification'
    this.validateCurrentStep(cr, 'verification', 'verify');

    const workflowInstanceId = this.getWorkflowInstanceId(cr);

    // Update CR with verification result
    await this.repository.update(
      id,
      { verificationResult: result } as any,
      cr.version,
    );

    // Transition with testResult context to allow conditions to route
    await this.workflowEngine.transition(workflowInstanceId, {
      testResult: result,
    });

    // Re-fetch and return updated CR
    const updatedCr = await this.repository.findById(id);
    if (!updatedCr) {
      throw new NotFoundException(`Change request "${id}" not found after transition`);
    }

    return updatedCr;
  }

  /**
   * Close a CR.
   * - Validates CR is at or near end (Closed/Verification step)
   * - For emergency CRs, enforces post-approval requirement
   * - Sets closureReason
   * - Marks workflow as completed
   */
  async close(
    id: string,
    userId: string,
    reason?: string,
  ): Promise<ChangeRequestWithWorkflow> {
    const cr = await this.repository.findById(id);
    if (!cr) {
      throw new NotFoundException(`Change request "${id}" not found`);
    }

    // Validate current step is 'end' or 'verification' (allow close from near-end)
    const currentStepType = cr.workflowInstance?.currentStep?.stepType;
    if (currentStepType !== 'end' && currentStepType !== 'verification') {
      throw new BadRequestException(
        `Cannot close CR at step "${cr.workflowInstance?.currentStep?.name ?? 'unknown'}". CR must be at verification or end step.`,
      );
    }

    // Emergency CR enforcement: must have at least one approval record before closing
    if (cr.changeType === 'emergency') {
      const hasApproval = await this.approvalService.hasApproval(id);
      if (!hasApproval) {
        throw new BadRequestException(
          'Emergency changes require post-approval before closing',
        );
      }
    }

    // Update CR with closure reason if provided
    if (reason) {
      await this.repository.update(
        id,
        { closureReason: reason } as any,
        cr.version,
      );
    }

    // If not already at end step, transition to close
    if (currentStepType !== 'end') {
      const workflowInstanceId = this.getWorkflowInstanceId(cr);
      await this.workflowEngine.transition(workflowInstanceId, {
        testResult: 'success',
      });
    }

    // Re-fetch and return updated CR
    const updatedCr = await this.repository.findById(id);
    if (!updatedCr) {
      throw new NotFoundException(`Change request "${id}" not found after close`);
    }

    return updatedCr;
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Validate that the CR is at the expected workflow step type.
   * Throws BadRequestException if not at the expected step.
   */
  private validateCurrentStep(
    cr: ChangeRequestWithWorkflow,
    expectedStepType: string,
    action: string,
  ): void {
    const currentStepType = cr.workflowInstance?.currentStep?.stepType;
    if (currentStepType !== expectedStepType) {
      throw new BadRequestException(
        `Cannot ${action}: CR is at step "${cr.workflowInstance?.currentStep?.name ?? 'unknown'}" (type: ${currentStepType ?? 'none'}), expected step type "${expectedStepType}"`,
      );
    }
  }

  /**
   * Get the workflow instance ID from a CR, throwing if not found.
   */
  private getWorkflowInstanceId(cr: ChangeRequestWithWorkflow): string {
    // The CR's workflowInstance holds the ID — we need to access it
    // The repository loads workflowInstance with currentStep included
    const instance = cr.workflowInstance as any;
    if (!instance?.id) {
      // Fall back to looking for workflowInstanceId field on the CR
      const crAny = cr as any;
      if (crAny.workflowInstanceId) {
        return crAny.workflowInstanceId;
      }
      throw new BadRequestException(
        'Change request has no associated workflow instance',
      );
    }
    return instance.id;
  }
}

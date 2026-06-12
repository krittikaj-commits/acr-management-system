export { crSubmittedTemplate, CrSubmittedTemplateData } from './cr-submitted.template';
export { crAssignedTemplate, CrAssignedTemplateData } from './cr-assigned.template';
export { crApprovedTemplate, CrApprovedTemplateData } from './cr-approved.template';
export { crRejectedTemplate, CrRejectedTemplateData } from './cr-rejected.template';
export { approvalRequiredTemplate, ApprovalRequiredTemplateData } from './approval-required.template';
export { implementationReadyTemplate, ImplementationReadyTemplateData } from './implementation-ready.template';
export { verificationRequiredTemplate, VerificationRequiredTemplateData } from './verification-required.template';
export { crCompletedTemplate, CrCompletedTemplateData } from './cr-completed.template';
export { approvalLinkTemplate, ApprovalLinkTemplateData } from './approval-link.template';

import { NotificationType } from '../../dto';
import { crSubmittedTemplate } from './cr-submitted.template';
import { crAssignedTemplate } from './cr-assigned.template';
import { crApprovedTemplate } from './cr-approved.template';
import { crRejectedTemplate } from './cr-rejected.template';
import { approvalRequiredTemplate } from './approval-required.template';
import { implementationReadyTemplate } from './implementation-ready.template';
import { verificationRequiredTemplate } from './verification-required.template';
import { crCompletedTemplate } from './cr-completed.template';
import { approvalLinkTemplate } from './approval-link.template';

/**
 * Renders the appropriate email template based on notification type.
 */
export function renderEmailTemplate(
  type: NotificationType,
  metadata: Record<string, unknown>,
): { subject: string; html: string } | null {
  switch (type) {
    case 'cr-submitted':
      return crSubmittedTemplate(metadata as any);
    case 'cr-assigned':
      return crAssignedTemplate(metadata as any);
    case 'cr-approved':
      return crApprovedTemplate(metadata as any);
    case 'cr-rejected':
      return crRejectedTemplate(metadata as any);
    case 'approval-required':
      return approvalRequiredTemplate(metadata as any);
    case 'implementation-ready':
      return implementationReadyTemplate(metadata as any);
    case 'verification-required':
      return verificationRequiredTemplate(metadata as any);
    case 'cr-completed':
      return crCompletedTemplate(metadata as any);
    case 'approval-link':
      return approvalLinkTemplate(metadata as any);
    default:
      return null;
  }
}

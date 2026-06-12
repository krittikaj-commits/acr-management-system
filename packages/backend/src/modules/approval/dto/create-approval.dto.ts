import { z } from 'zod';

/**
 * Schema for creating an approval record.
 */
export const CreateApprovalSchema = z.object({
  changeRequestId: z.string().uuid(),
  approverId: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
  approverName: z.string().min(1),
  approverPosition: z.string().optional(),
});

export type CreateApprovalDto = z.infer<typeof CreateApprovalSchema>;

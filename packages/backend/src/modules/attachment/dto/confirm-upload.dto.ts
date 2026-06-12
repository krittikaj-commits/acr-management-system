import { z } from 'zod';

/**
 * Schema for confirming a completed upload and linking attachment to CR.
 */
export const ConfirmUploadSchema = z.object({
  changeRequestId: z.string().uuid(),
  s3Key: z.string().min(1).max(500),
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1).max(100),
  fileSize: z.number().int().positive(),
  workflowStep: z.string().max(50).optional(),
});

export type ConfirmUploadDto = z.infer<typeof ConfirmUploadSchema>;

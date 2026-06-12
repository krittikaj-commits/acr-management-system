import { z } from 'zod';

/**
 * Schema for requesting a presigned upload URL.
 */
export const RequestUploadSchema = z.object({
  changeRequestId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1).max(100),
  fileSize: z.number().int().positive(),
  workflowStep: z.string().max(50).optional(),
});

export type RequestUploadDto = z.infer<typeof RequestUploadSchema>;

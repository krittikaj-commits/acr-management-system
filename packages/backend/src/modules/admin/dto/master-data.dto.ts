import { z } from 'zod';

export const MASTER_DATA_CATEGORIES = ['service', 'impact_level', 'change_type'] as const;
export type MasterDataCategory = (typeof MASTER_DATA_CATEGORIES)[number];

export const CreateMasterDataSchema = z.object({
  category: z.enum(MASTER_DATA_CATEGORIES, {
    errorMap: () => ({ message: 'Category must be one of: service, impact_level, change_type' }),
  }),
  code: z
    .string()
    .min(1, 'Code is required')
    .max(50, 'Code must be at most 50 characters'),
  nameEn: z
    .string()
    .min(1, 'English name is required')
    .max(200, 'English name must be at most 200 characters'),
  nameTh: z
    .string()
    .min(1, 'Thai name is required')
    .max(200, 'Thai name must be at most 200 characters'),
  description: z
    .string()
    .max(2000, 'Description must be at most 2000 characters')
    .optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export type CreateMasterDataDto = z.infer<typeof CreateMasterDataSchema>;

export const UpdateMasterDataSchema = CreateMasterDataSchema.partial();

export type UpdateMasterDataDto = z.infer<typeof UpdateMasterDataSchema>;

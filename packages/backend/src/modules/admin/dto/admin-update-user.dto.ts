import { z } from 'zod';

export const AdminUpdateUserSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must be at most 255 characters')
    .optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters')
    .optional(),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must be at most 100 characters')
    .optional(),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be at most 100 characters')
    .optional(),
  position: z
    .string()
    .max(100, 'Position must be at most 100 characters')
    .nullable()
    .optional(),
  roleId: z.string().uuid('Role ID must be a valid UUID').optional(),
  isActive: z.boolean().optional(),
});

export type AdminUpdateUserDto = z.infer<typeof AdminUpdateUserSchema>;

import { z } from 'zod';

export const AdminCreateUserSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must be at most 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters'),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must be at most 100 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be at most 100 characters'),
  position: z
    .string()
    .max(100, 'Position must be at most 100 characters')
    .optional(),
  roleId: z.string().uuid('Role ID must be a valid UUID'),
});

export type AdminCreateUserDto = z.infer<typeof AdminCreateUserSchema>;

import { z } from 'zod';

export const LoginSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must be at most 255 characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(100, 'Password must be at most 100 characters'),
});

export type LoginDto = z.infer<typeof LoginSchema>;

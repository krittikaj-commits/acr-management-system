import { z } from 'zod';

export const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // AWS
  AWS_REGION: z.string().default('ap-southeast-1'),
  S3_BUCKET_ATTACHMENTS: z.string().default('acr-attachments-dev'),
  SES_FROM_EMAIL: z.string().email().default('no-reply@dits.co.th'),

  // Frontend
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Upload
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(10),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.format();
    const errors = Object.entries(formatted)
      .filter(([key]) => key !== '_errors')
      .map(([key, val]) => {
        const messages = (val as { _errors: string[] })._errors;
        return `  ${key}: ${messages.join(', ')}`;
      })
      .join('\n');

    throw new Error(`Environment validation failed:\n${errors}`);
  }

  return result.data;
}

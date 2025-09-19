import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, 'Set DATABASE_URL to your Supabase connection string.')
    .transform((value) => value.trim()),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters long.')
    .transform((value) => value.trim())
});

type EnvConfig = z.infer<typeof schema>;

let cachedEnv: EnvConfig | null = null;

export function getEnv(): EnvConfig {

  DATABASE_URL: z.string().url().or(z.string().min(1)).optional(),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters long.')
    .default('development-secret-please-update-32-char-min')
});

let cachedEnv: z.infer<typeof schema> | null = null;

export function getEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = schema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET
  });

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.message).join(', ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }

  cachedEnv = parsed.data;
  return parsed.data;
}

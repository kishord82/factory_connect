/**
 * Zod-validated environment configuration for the API server.
 * Fails fast on missing/invalid env vars at startup.
 */

import { z } from 'zod';

const EnvSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Database
  DATABASE_URL: z.string().min(1),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),

  // Keycloak
  KEYCLOAK_URL: z.string().default('http://localhost:8080'),
  KEYCLOAK_REALM: z.string().default('factory-connect'),
  KEYCLOAK_CLIENT_ID: z.string().default('fc-api'),

  // Vault
  VAULT_ADDR: z.string().default('http://localhost:8200'),
  VAULT_TOKEN: z.string().optional(),

  // MinIO
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_ACCESS_KEY: z.string().default('minioadmin'),
  MINIO_SECRET_KEY: z.string().default('minioadmin'),

  // Feature flags
  ENABLE_WEBSOCKET: z.coerce.boolean().default(false),
});

export type AppConfig = z.infer<typeof EnvSchema>;

let config: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (config) return config;
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }
  config = result.data;
  return config;
}

export function getConfig(): AppConfig {
  if (!config) throw new Error('Config not loaded. Call loadConfig() first.');
  return config;
}

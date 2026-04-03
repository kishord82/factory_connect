/**
 * D1: Bridge agent configuration.
 */
import { z } from 'zod';

const BridgeConfigSchema = z.object({
  BRIDGE_ID: z.string().uuid(),
  FACTORY_ID: z.string().uuid(),
  API_BASE_URL: z.string().url().default('http://localhost:3000'),
  API_TOKEN: z.string().min(1),
  POLL_INTERVAL_MS: z.coerce.number().default(30000),
  HEARTBEAT_INTERVAL_MS: z.coerce.number().default(60000),
  DATA_DIR: z.string().default('./data'),
  LOG_LEVEL: z.string().default('info'),
  ERP_TYPE: z.enum(['tally', 'zoho', 'sap_b1']).default('tally'),
  ERP_HOST: z.string().default('localhost'),
  ERP_PORT: z.coerce.number().default(9000),
  MAX_RETRY_ATTEMPTS: z.coerce.number().default(3),
  RETRY_DELAY_MS: z.coerce.number().default(5000),
});

export type BridgeConfig = z.infer<typeof BridgeConfigSchema>;

let config: BridgeConfig | null = null;

export function loadBridgeConfig(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>): BridgeConfig {
  const result = BridgeConfigSchema.safeParse(env);
  if (!result.success) {
    const formatted = result.error.issues.map((i: { path: (string | number)[]; message: string }) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Bridge config validation failed:\n${formatted}`);
  }
  config = result.data;
  return config;
}

export function getBridgeConfig(): BridgeConfig {
  if (!config) throw new Error('Bridge config not loaded — call loadBridgeConfig() first');
  return config;
}

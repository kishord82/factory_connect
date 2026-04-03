/**
 * Bridge Agent — on-premises ERP connector for FactoryConnect.
 */
import { loadBridgeConfig } from './config.js';
import { createErpAdapter } from './erp/index.js';
import { AdaptivePoller } from './polling/adaptive-poller.js';
import { CloudSync } from './sync/cloud-sync.js';
import { HealthReporter } from './health/health-reporter.js';

async function main(): Promise<void> {
  const config = loadBridgeConfig();
  console.log(`[Bridge] Starting bridge ${config.BRIDGE_ID} for factory ${config.FACTORY_ID}`);
  console.log(`[Bridge] ERP type: ${config.ERP_TYPE}, host: ${config.ERP_HOST}:${config.ERP_PORT}`);

  // Create ERP adapter
  const erp = createErpAdapter(config.ERP_TYPE, {
    host: config.ERP_HOST,
    port: config.ERP_PORT,
  });
  await erp.connect();

  // Create cloud sync
  const cloudSync = new CloudSync(config.API_BASE_URL, config.API_TOKEN, config.FACTORY_ID);

  // Create health reporter
  const health = new HealthReporter(config.BRIDGE_ID, config.FACTORY_ID);
  health.setErpConnected(await erp.healthCheck());
  health.setCloudConnected(true); // Will be updated on sync attempts

  // Adaptive poller for ERP data
  const poller = new AdaptivePoller(async () => {
    const orders = await erp.fetchOrders();
    if (orders.length > 0) {
      const result = await cloudSync.sendOrders(orders as unknown as Record<string, unknown>[]);
      health.setLastPollAt(new Date());
      return result.sent;
    }
    // Also drain queued messages
    const drainResult = await cloudSync.drainQueue();
    return drainResult.sent;
  }, {
    minIntervalMs: config.POLL_INTERVAL_MS / 6,
    maxIntervalMs: config.POLL_INTERVAL_MS * 10,
    initialIntervalMs: config.POLL_INTERVAL_MS,
  });

  await poller.start();
  console.log(`[Bridge] Polling started (interval: ${config.POLL_INTERVAL_MS}ms)`);

  // Heartbeat interval
  setInterval(() => {
    const status = health.getStatus();
    console.log(`[Bridge] Health: ${JSON.stringify(status)}`);
  }, config.HEARTBEAT_INTERVAL_MS);

  // Graceful shutdown
  const shutdown = async (): Promise<void> => {
    console.log('[Bridge] Shutting down...');
    poller.stop();
    await erp.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => { shutdown(); });
  process.on('SIGTERM', () => { shutdown(); });
}

main().catch((err) => {
  console.error('[Bridge] Fatal error:', err);
  process.exit(1);
});

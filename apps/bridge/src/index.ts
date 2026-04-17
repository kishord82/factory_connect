/**
 * Bridge Agent — on-premises ERP connector for FactoryConnect.
 * Integrates: config → OTP bootstrap → ERP adapter → cloud sync → WebSocket tunnel → health probes → auto-upgrade.
 */
import { OTPBootstrap } from './auth/otp-bootstrap.js';
import { loadBridgeConfig } from './config.js';
import { createErpAdapter } from './erp/index.js';
import { HealthProbeManager } from './health/health-probes.js';
import { HealthReporter } from './health/health-reporter.js';
import { logger } from './logger.js';
import { AdaptivePoller } from './polling/adaptive-poller.js';
import { initializeQueue } from './queue/local-queue.js';
import { CloudSync } from './sync/cloud-sync.js';
import { WebSocketTunnel } from './tunnel/websocket-tunnel.js';
import { AutoUpgrader } from './upgrade/auto-upgrade.js';

const BRIDGE_VERSION = '1.0.0';

async function main(): Promise<void> {
  const config = loadBridgeConfig();
  logger.info({ bridgeId: config.BRIDGE_ID, factoryId: config.FACTORY_ID }, 'Starting bridge');
  logger.info({ version: BRIDGE_VERSION }, 'Bridge version');
  logger.info({ erpType: config.ERP_TYPE, host: config.ERP_HOST, port: config.ERP_PORT }, 'ERP config');

  // Initialize local queue
  const queue = await initializeQueue(config.DATA_DIR);
  logger.info('Local queue initialized');

  // Initialize OTP bootstrap
  const otpBootstrap = new OTPBootstrap({
    dataDir: config.DATA_DIR,
    apiBaseUrl: config.API_BASE_URL,
  });

  // Check if already bootstrapped, or request OTP
  let apiToken = config.API_TOKEN;
  if (!apiToken || apiToken === 'BOOTSTRAP') {
    const isBootstrapped = await otpBootstrap.isBootstrapped();
    if (!isBootstrapped) {
      logger.info('Not bootstrapped. Requesting OTP...');
      const messageId = await otpBootstrap.requestOTP(config.FACTORY_ID);
      logger.info({ messageId }, 'OTP sent');
      throw new Error('Bootstrap required — OTP sent to factory admin. Re-run with verified OTP.');
    } else {
      apiToken = (await otpBootstrap.getToken()) || '';
      if (!apiToken) {
        throw new Error('Bootstrap token file found but empty');
      }
      logger.info('Using bootstrapped token');
    }
  }

  // Create ERP adapter
  const erp = createErpAdapter(config.ERP_TYPE, {
    host: config.ERP_HOST,
    port: config.ERP_PORT,
  });
  await erp.connect();
  logger.info('ERP connected');

  // Create cloud sync
  const cloudSync = new CloudSync(config.API_BASE_URL, apiToken, config.FACTORY_ID);

  // Create health reporter
  const health = new HealthReporter(config.BRIDGE_ID, config.FACTORY_ID);
  health.setErpConnected(await erp.healthCheck());
  health.setCloudConnected(true);

  // Initialize health probes
  const probeManager = new HealthProbeManager(config.BRIDGE_ID);

  // Register dynamic probes that depend on runtime state
  probeManager.registerProbe(
    'queue_depth',
    async () => {
      const depth = queue.getDepth();
      const status = depth < 10000 ? 'healthy' : 'degraded';
      return {
        status,
        message: `Queue depth: ${depth} items`,
        latency_ms: 1,
      };
    },
    10000,
    'warning'
  );

  probeManager.registerProbe(
    'erp_connectivity',
    async () => {
      const isHealthy = await erp.healthCheck();
      return {
        status: isHealthy ? 'healthy' : 'critical',
        message: isHealthy ? 'ERP reachable' : 'ERP unreachable',
        latency_ms: 5,
      };
    },
    30000,
    'critical'
  );

  probeManager.registerProbe(
    'api_connectivity',
    async () => {
      try {
        const response = await fetch(`${config.API_BASE_URL}/health`, {
          headers: { 'Authorization': `Bearer ${apiToken}` },
        });
        const status = response.ok ? 'healthy' : 'critical';
        return {
          status,
          message: response.ok ? 'API reachable' : `API error ${response.status}`,
          latency_ms: response.headers.get('x-response-time')
            ? parseInt(response.headers.get('x-response-time') || '0')
            : 50,
        };
      } catch (err) {
        return {
          status: 'critical',
          message: err instanceof Error ? err.message : 'API unreachable',
          latency_ms: -1,
        };
      }
    },
    30000,
    'critical'
  );

  probeManager.registerProbe(
    'last_sync_age',
    async () => {
      const lastPoll = health.getStatus().last_poll_at;
      const lastPollDate = lastPoll ? new Date(lastPoll) : null;
      const ageMs = lastPollDate ? Date.now() - lastPollDate.getTime() : Infinity;
      const maxAgeMs = config.POLL_INTERVAL_MS * 2; // 2x poll interval

      return {
        status: ageMs < maxAgeMs ? 'healthy' : 'degraded',
        message: lastPollDate
          ? `Last sync: ${Math.round(ageMs / 1000)}s ago`
          : 'No sync yet',
        latency_ms: 1,
      };
    },
    30000,
    'warning'
  );

  // Run health probes periodically
  setInterval(async () => {
    const report = await probeManager.runAllProbes();
    const status = report.overall === 'healthy' ? 'OK' : report.overall.toUpperCase();
    logger.info({ status, probeCount: report.probes.length }, 'Health check');
  }, 60000); // Every minute

  // Adaptive poller for ERP data
  const poller = new AdaptivePoller(async () => {
    try {
      const orders = await erp.fetchOrders();
      if (orders.length > 0) {
        const result = await cloudSync.sendOrders(
          orders as unknown as Record<string, unknown>[]
        );
        health.setLastPollAt(new Date());
        health.setCloudConnected(true);
        return result.sent;
      }

      // Also drain queued messages
      const drainResult = await cloudSync.drainQueue();
      health.setLastPollAt(new Date());
      health.setCloudConnected(true);
      return drainResult.sent;
    } catch (err) {
      logger.error({ err }, 'Sync error');
      health.setCloudConnected(false);
      return 0;
    }
  }, {
    minIntervalMs: config.POLL_INTERVAL_MS / 6,
    maxIntervalMs: config.POLL_INTERVAL_MS * 10,
    initialIntervalMs: config.POLL_INTERVAL_MS,
  });

  await poller.start();
  logger.info({ intervalMs: config.POLL_INTERVAL_MS }, 'Polling started');

  // WebSocket tunnel to cloud
  const tunnel = new WebSocketTunnel();
  tunnel.onCommand(async (cmd) => {
    logger.info({ action: cmd.action }, 'Received command');
    if (cmd.action === 'resync') {
      logger.info('Force resync requested');
      // Could trigger immediate sync or clear last timestamp
    } else if (cmd.action === 'update_config') {
      logger.info({ payload: cmd.payload }, 'Config update requested');
      // In production: update config and persist
    } else if (cmd.action === 'restart') {
      logger.info('Restart requested');
      await shutdown(true); // Exit code 0 → process manager restarts
    }
  });

  tunnel.onStateChange((state) => {
    logger.info({ state }, 'Tunnel state changed');
  });

  try {
    await tunnel.connect(config.API_BASE_URL, apiToken);
    logger.info('WebSocket tunnel connected');

    // Send periodic health reports over tunnel
    setInterval(async () => {
      if (tunnel.isConnected()) {
        const report = await probeManager.runAllProbes();
        try {
          const payload: Record<string, unknown> = {
            bridgeId: report.bridgeId,
            timestamp: report.timestamp,
            overall: report.overall,
            probes: report.probes,
          };
          await tunnel.send('health_report', payload);
        } catch (err) {
          logger.error({ err }, 'Failed to send health report');
        }
      }
    }, 60000); // Every minute
  } catch (err) {
    logger.warn({ err }, 'WebSocket connection failed (will retry)');
    // Tunnel will auto-reconnect, this is not fatal
  }

  // Auto-upgrade scheduled check (daily at 2 AM)
  const upgrader = new AutoUpgrader({
    currentVersion: BRIDGE_VERSION,
    apiBaseUrl: config.API_BASE_URL,
    apiToken,
    bridgeId: config.BRIDGE_ID,
    factoryId: config.FACTORY_ID,
    dataDir: config.DATA_DIR,
  });
  upgrader.scheduleDaily('02:00');
  logger.info('Auto-upgrade check scheduled daily at 02:00');

  // Heartbeat log
  setInterval(() => {
    const healthStatus = health.getStatus();
    const metrics = cloudSync.getMetrics();
    logger.info({
      health: healthStatus.status,
      queueDepth: healthStatus.queue_depth,
      itemsSynced: metrics.itemsSynced,
      tunnelState: tunnel.getState(),
    }, 'Heartbeat');
  }, config.HEARTBEAT_INTERVAL_MS);

  // Graceful shutdown
  const shutdown = async (restart = false): Promise<void> => {
    logger.info({ restart }, 'Shutting down');
    poller.stop();
    await tunnel.disconnect();
    await erp.disconnect();
    await queue.persist();
    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', () => {
    shutdown();
  });
  process.on('SIGTERM', () => {
    shutdown();
  });
}

main().catch((err: unknown) => {
  logger.error({ err }, 'Fatal error');
  process.exit(1);
});

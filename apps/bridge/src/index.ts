/**
 * Bridge Agent — on-premises ERP connector for FactoryConnect.
 * Integrates: config → OTP bootstrap → ERP adapter → cloud sync → WebSocket tunnel → health probes → auto-upgrade.
 */
import { OTPBootstrap } from './auth/otp-bootstrap.js';
import { loadBridgeConfig, type BridgeConfig } from './config.js';
import { createErpAdapter } from './erp/index.js';
import type { ErpAdapter } from './erp/types.js';
import { HealthProbeManager } from './health/health-probes.js';
import { HealthReporter } from './health/health-reporter.js';
import { logger } from './logger.js';
import { AdaptivePoller } from './polling/adaptive-poller.js';
import { initializeQueue, type LocalQueue } from './queue/local-queue.js';
import { CloudSync } from './sync/cloud-sync.js';
import { WebSocketTunnel } from './tunnel/websocket-tunnel.js';
import { AutoUpgrader } from './upgrade/auto-upgrade.js';

const BRIDGE_VERSION = '1.0.0';
const HEALTH_PROBE_INTERVAL_MS = 60_000;
const QUEUE_HEALTH_THRESHOLD = 10_000;

interface BridgeRuntime {
  config: BridgeConfig;
  queue: LocalQueue;
  apiToken: string;
  erp: ErpAdapter;
  cloudSync: CloudSync;
  health: HealthReporter;
  probeManager: HealthProbeManager;
  poller: AdaptivePoller;
  tunnel: WebSocketTunnel;
  upgrader: AutoUpgrader;
}

async function resolveApiToken(config: BridgeConfig): Promise<string> {
  const otpBootstrap = new OTPBootstrap({
    dataDir: config.DATA_DIR,
    apiBaseUrl: config.API_BASE_URL,
  });

  let apiToken = config.API_TOKEN;
  if (apiToken && apiToken !== 'BOOTSTRAP') {
    return apiToken;
  }

  const isBootstrapped = await otpBootstrap.isBootstrapped();
  if (!isBootstrapped) {
    logger.info('Not bootstrapped. Requesting OTP...');
    const messageId = await otpBootstrap.requestOTP(config.FACTORY_ID);
    logger.info({ messageId }, 'OTP sent');
    throw new Error('Bootstrap required — OTP sent to factory admin. Re-run with verified OTP.');
  }

  apiToken = (await otpBootstrap.getToken()) ?? '';
  if (!apiToken) {
    throw new Error('Bootstrap token file found but empty');
  }
  logger.info('Using bootstrapped token');
  return apiToken;
}

function registerDynamicProbes(
  probeManager: HealthProbeManager,
  deps: { queue: LocalQueue; erp: ErpAdapter; apiBaseUrl: string; apiToken: string; health: HealthReporter; pollIntervalMs: number },
): void {
  const { queue, erp, apiBaseUrl, apiToken, health, pollIntervalMs } = deps;

  probeManager.registerProbe(
    'queue_depth',
    async () => {
      const depth = queue.getDepth();
      return {
        status: depth < QUEUE_HEALTH_THRESHOLD ? 'healthy' : 'degraded',
        message: `Queue depth: ${depth} items`,
        latency_ms: 1,
      };
    },
    10_000,
    'warning',
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
    30_000,
    'critical',
  );

  probeManager.registerProbe(
    'api_connectivity',
    async () => probeApiConnectivity(apiBaseUrl, apiToken),
    30_000,
    'critical',
  );

  probeManager.registerProbe(
    'last_sync_age',
    async () => probeLastSyncAge(health, pollIntervalMs),
    30_000,
    'warning',
  );
}

async function probeApiConnectivity(apiBaseUrl: string, apiToken: string): Promise<{
  status: 'healthy' | 'degraded' | 'critical';
  message: string;
  latency_ms: number;
}> {
  try {
    const response = await fetch(`${apiBaseUrl}/health`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    const latencyHeader = response.headers.get('x-response-time');
    return {
      status: response.ok ? 'healthy' : 'critical',
      message: response.ok ? 'API reachable' : `API error ${response.status}`,
      latency_ms: latencyHeader ? parseInt(latencyHeader, 10) : 50,
    };
  } catch (err) {
    return {
      status: 'critical',
      message: err instanceof Error ? err.message : 'API unreachable',
      latency_ms: -1,
    };
  }
}

function probeLastSyncAge(health: HealthReporter, pollIntervalMs: number): {
  status: 'healthy' | 'degraded';
  message: string;
  latency_ms: number;
} {
  const lastPoll = health.getStatus().last_poll_at;
  const lastPollDate = lastPoll ? new Date(lastPoll) : null;
  const ageMs = lastPollDate ? Date.now() - lastPollDate.getTime() : Infinity;
  const maxAgeMs = pollIntervalMs * 2;

  return {
    status: ageMs < maxAgeMs ? 'healthy' : 'degraded',
    message: lastPollDate ? `Last sync: ${Math.round(ageMs / 1000)}s ago` : 'No sync yet',
    latency_ms: 1,
  };
}

function createPoller(deps: { erp: ErpAdapter; cloudSync: CloudSync; health: HealthReporter; pollIntervalMs: number }): AdaptivePoller {
  const { erp, cloudSync, health, pollIntervalMs } = deps;
  return new AdaptivePoller(
    async () => {
      try {
        const orders = await erp.fetchOrders();
        if (orders.length > 0) {
          const result = await cloudSync.sendOrders(orders as unknown as Record<string, unknown>[]);
          health.setLastPollAt(new Date());
          health.setCloudConnected(true);
          return result.sent;
        }
        const drainResult = await cloudSync.drainQueue();
        health.setLastPollAt(new Date());
        health.setCloudConnected(true);
        return drainResult.sent;
      } catch (err) {
        logger.error({ err }, 'Sync error');
        health.setCloudConnected(false);
        return 0;
      }
    },
    {
      minIntervalMs: pollIntervalMs / 6,
      maxIntervalMs: pollIntervalMs * 10,
      initialIntervalMs: pollIntervalMs,
    },
  );
}

function bindTunnelCommands(tunnel: WebSocketTunnel, shutdown: (restart?: boolean) => Promise<void>): void {
  tunnel.onCommand(async (cmd) => {
    logger.info({ action: cmd.action }, 'Received command');
    if (cmd.action === 'resync') {
      logger.info('Force resync requested');
    } else if (cmd.action === 'update_config') {
      logger.info({ payload: cmd.payload }, 'Config update requested');
    } else if (cmd.action === 'restart') {
      logger.info('Restart requested');
      await shutdown(true);
    }
  });

  tunnel.onStateChange((state) => {
    logger.info({ state }, 'Tunnel state changed');
  });
}

async function startTunnel(runtime: BridgeRuntime): Promise<void> {
  const { tunnel, config, apiToken, probeManager } = runtime;
  try {
    await tunnel.connect(config.API_BASE_URL, apiToken);
    logger.info('WebSocket tunnel connected');

    setInterval(async () => {
      if (!tunnel.isConnected()) return;
      const report = await probeManager.runAllProbes();
      try {
        await tunnel.send('health_report', {
          bridgeId: report.bridgeId,
          timestamp: report.timestamp,
          overall: report.overall,
          probes: report.probes,
        });
      } catch (err) {
        logger.error({ err }, 'Failed to send health report');
      }
    }, HEALTH_PROBE_INTERVAL_MS);
  } catch (err) {
    logger.warn({ err }, 'WebSocket connection failed (will retry)');
  }
}

function startHeartbeat(runtime: BridgeRuntime): void {
  const { health, cloudSync, tunnel, config } = runtime;
  setInterval(() => {
    const healthStatus = health.getStatus();
    const metrics = cloudSync.getMetrics();
    logger.info(
      {
        health: healthStatus.status,
        queueDepth: healthStatus.queue_depth,
        itemsSynced: metrics.itemsSynced,
        tunnelState: tunnel.getState(),
      },
      'Heartbeat',
    );
  }, config.HEARTBEAT_INTERVAL_MS);
}

function registerShutdownHandlers(runtime: BridgeRuntime): (restart?: boolean) => Promise<void> {
  const shutdown = async (restart = false): Promise<void> => {
    logger.info({ restart }, 'Shutting down');
    runtime.poller.stop();
    await runtime.tunnel.disconnect();
    await runtime.erp.disconnect();
    await runtime.queue.persist();
    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });
  return shutdown;
}

async function main(): Promise<void> {
  const config = loadBridgeConfig();
  logger.info({ bridgeId: config.BRIDGE_ID, factoryId: config.FACTORY_ID }, 'Starting bridge');
  logger.info({ version: BRIDGE_VERSION }, 'Bridge version');
  logger.info({ erpType: config.ERP_TYPE, host: config.ERP_HOST, port: config.ERP_PORT }, 'ERP config');

  const queue = await initializeQueue(config.DATA_DIR);
  logger.info('Local queue initialized');

  const apiToken = await resolveApiToken(config);

  const erp = createErpAdapter(config.ERP_TYPE, { host: config.ERP_HOST, port: config.ERP_PORT });
  await erp.connect();
  logger.info('ERP connected');

  const cloudSync = new CloudSync(config.API_BASE_URL, apiToken, config.FACTORY_ID);

  const health = new HealthReporter(config.BRIDGE_ID, config.FACTORY_ID);
  health.setErpConnected(await erp.healthCheck());
  health.setCloudConnected(true);

  const probeManager = new HealthProbeManager(config.BRIDGE_ID);
  registerDynamicProbes(probeManager, {
    queue,
    erp,
    apiBaseUrl: config.API_BASE_URL,
    apiToken,
    health,
    pollIntervalMs: config.POLL_INTERVAL_MS,
  });

  setInterval(async () => {
    const report = await probeManager.runAllProbes();
    const status = report.overall === 'healthy' ? 'OK' : report.overall.toUpperCase();
    logger.info({ status, probeCount: report.probes.length }, 'Health check');
  }, HEALTH_PROBE_INTERVAL_MS);

  const poller = createPoller({ erp, cloudSync, health, pollIntervalMs: config.POLL_INTERVAL_MS });
  await poller.start();
  logger.info({ intervalMs: config.POLL_INTERVAL_MS }, 'Polling started');

  const tunnel = new WebSocketTunnel();
  const upgrader = new AutoUpgrader({
    currentVersion: BRIDGE_VERSION,
    apiBaseUrl: config.API_BASE_URL,
    apiToken,
    bridgeId: config.BRIDGE_ID,
    factoryId: config.FACTORY_ID,
    dataDir: config.DATA_DIR,
  });

  const runtime: BridgeRuntime = {
    config,
    queue,
    apiToken,
    erp,
    cloudSync,
    health,
    probeManager,
    poller,
    tunnel,
    upgrader,
  };

  const shutdown = registerShutdownHandlers(runtime);
  bindTunnelCommands(tunnel, shutdown);
  await startTunnel(runtime);

  upgrader.scheduleDaily('02:00');
  logger.info('Auto-upgrade check scheduled daily at 02:00');

  startHeartbeat(runtime);
}

main().catch((err: unknown) => {
  logger.error({ err }, 'Fatal error');
  process.exit(1);
});

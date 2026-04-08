/**
 * D8: Health probe manager — runs periodic health checks and reports.
 */
import * as fs from 'fs';

export type ProbeStatus = 'healthy' | 'degraded' | 'critical';
export type ProbeSeverity = 'info' | 'warning' | 'critical';

export interface ProbeResult {
  name: string;
  status: ProbeStatus;
  latency_ms: number;
  message: string;
  severity: ProbeSeverity;
}

export interface HealthReport {
  bridgeId: string;
  timestamp: number;
  overall: ProbeStatus;
  probes: ProbeResult[];
}

export type ProbeCheckFn = () => Promise<{ status: ProbeStatus; message: string; latency_ms: number }>;

interface RegisteredProbe {
  name: string;
  checkFn: ProbeCheckFn;
  interval: number;
  severity: ProbeSeverity;
  lastRun?: number;
}

export class HealthProbeManager {
  private bridgeId: string;
  private probes = new Map<string, RegisteredProbe>();
  private lastReport: HealthReport | null = null;

  constructor(bridgeId: string) {
    this.bridgeId = bridgeId;
    this.registerBuiltinProbes();
  }

  registerProbe(
    name: string,
    checkFn: ProbeCheckFn,
    interval: number,
    severity: ProbeSeverity = 'warning'
  ): void {
    this.probes.set(name, { name, checkFn, interval, severity });
  }

  async runAllProbes(): Promise<HealthReport> {
    const results: ProbeResult[] = [];
    const now = Date.now();

    const probesArray = Array.from(this.probes.values());
    for (const probe of probesArray) {
      try {
        const startTime = Date.now();
        const { status, message } = await probe.checkFn();
        const latency = Date.now() - startTime;

        results.push({
          name: probe.name,
          status,
          latency_ms: latency,
          message,
          severity: probe.severity,
        });

        probe.lastRun = now;
      } catch (err) {
        results.push({
          name: probe.name,
          status: 'critical',
          latency_ms: -1,
          message: err instanceof Error ? err.message : 'Unknown error',
          severity: probe.severity,
        });
      }
    }

    // Determine overall status
    let overall: ProbeStatus = 'healthy';
    if (results.some(p => p.status === 'critical')) {
      overall = 'critical';
    } else if (results.some(p => p.status === 'degraded')) {
      overall = 'degraded';
    }

    const report: HealthReport = {
      bridgeId: this.bridgeId,
      timestamp: now,
      overall,
      probes: results,
    };

    this.lastReport = report;
    return report;
  }

  getLastReport(): HealthReport | null {
    return this.lastReport;
  }

  private registerBuiltinProbes(): void {
    // Disk space: check available disk > 100MB
    this.registerProbe(
      'disk_space',
      async () => {
        try {
          const diskSpace = await checkDiskSpace('/');
          const freeMB = diskSpace.free / (1024 * 1024);
          const thresholdMB = 100;
          const status = freeMB > thresholdMB ? 'healthy' : 'critical';
          return {
            status,
            message: `${freeMB.toFixed(2)} MB free (threshold: ${thresholdMB} MB)`,
            latency_ms: 5,
          };
        } catch (err) {
          return {
            status: 'degraded',
            message: 'Could not check disk space',
            latency_ms: -1,
          };
        }
      },
      60000,
      'warning'
    );

    // Memory usage: process memory < 512MB
    this.registerProbe(
      'memory_usage',
      async () => {
        const usage = process.memoryUsage();
        const heapUsedMB = usage.heapUsed / (1024 * 1024);
        const thresholdMB = 512;
        const status = heapUsedMB < thresholdMB ? 'healthy' : 'degraded';
        return {
          status,
          message: `${heapUsedMB.toFixed(2)} MB heap used (threshold: ${thresholdMB} MB)`,
          latency_ms: 1,
        };
      },
      30000,
      'warning'
    );

    // CPU usage: estimated from process.cpuUsage()
    this.registerProbe(
      'cpu_usage',
      async () => {
        const usage = process.cpuUsage();
        // Very rough estimate: if user + system CPU time is high, we're busy
        const totalMicros = usage.user + usage.system;
        const cpuPercent = Math.min(100, (totalMicros / 1000000) * 10); // Rough heuristic
        const threshold = 80;
        const status = cpuPercent < threshold ? 'healthy' : 'degraded';
        return {
          status,
          message: `~${cpuPercent.toFixed(1)}% CPU time (threshold: ${threshold}%)`,
          latency_ms: 1,
        };
      },
      30000,
      'info'
    );

    // Queue depth: local queue not overflowing (< 10000)
    this.registerProbe(
      'queue_depth',
      async () => {
        // Will be injected by bridge controller
        return {
          status: 'healthy',
          message: 'Queue check not initialized',
          latency_ms: 1,
        };
      },
      10000,
      'warning'
    );

    // ERP connectivity stub
    this.registerProbe(
      'erp_connectivity',
      async () => {
        // Will be injected by bridge controller
        return {
          status: 'healthy',
          message: 'ERP check not initialized',
          latency_ms: 1,
        };
      },
      30000,
      'critical'
    );

    // API connectivity stub
    this.registerProbe(
      'api_connectivity',
      async () => {
        // Will be injected by bridge controller
        return {
          status: 'healthy',
          message: 'API check not initialized',
          latency_ms: 1,
        };
      },
      30000,
      'critical'
    );

    // Last sync age stub
    this.registerProbe(
      'last_sync_age',
      async () => {
        // Will be injected by bridge controller
        return {
          status: 'healthy',
          message: 'Last sync check not initialized',
          latency_ms: 1,
        };
      },
      30000,
      'warning'
    );
  }
}

/**
 * Helper to create async statfs wrapper for non-blocking disk checks.
 */
export async function checkDiskSpace(path: string = '/'): Promise<{ free: number; total: number }> {
  return new Promise((resolve, reject) => {
    fs.statfs(path, (err, stats) => {
      if (err) reject(err);
      else resolve({ free: stats.bavail * stats.bsize, total: stats.blocks * stats.bsize });
    });
  });
}

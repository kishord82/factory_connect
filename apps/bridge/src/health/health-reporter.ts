/**
 * D6: Health reporter — sends heartbeats and health status to cloud.
 */
import { queueSize } from '../queue/local-queue.js';

export interface HealthStatus {
  bridge_id: string;
  factory_id: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  erp_connected: boolean;
  cloud_connected: boolean;
  queue_depth: number;
  uptime_seconds: number;
  last_poll_at: string | null;
  version: string;
}

export class HealthReporter {
  private bridgeId: string;
  private factoryId: string;
  private startTime: Date;
  private erpConnected = false;
  private cloudConnected = false;
  private lastPollAt: Date | null = null;

  constructor(bridgeId: string, factoryId: string) {
    this.bridgeId = bridgeId;
    this.factoryId = factoryId;
    this.startTime = new Date();
  }

  setErpConnected(connected: boolean): void { this.erpConnected = connected; }
  setCloudConnected(connected: boolean): void { this.cloudConnected = connected; }
  setLastPollAt(date: Date): void { this.lastPollAt = date; }

  getStatus(): HealthStatus {
    const qDepth = queueSize();
    let status: HealthStatus['status'] = 'healthy';
    if (!this.erpConnected || !this.cloudConnected) status = 'degraded';
    if (!this.erpConnected && !this.cloudConnected) status = 'unhealthy';
    if (qDepth > 1000) status = 'degraded';

    return {
      bridge_id: this.bridgeId,
      factory_id: this.factoryId,
      status,
      erp_connected: this.erpConnected,
      cloud_connected: this.cloudConnected,
      queue_depth: qDepth,
      uptime_seconds: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
      last_poll_at: this.lastPollAt?.toISOString() ?? null,
      version: '1.0.0',
    };
  }
}

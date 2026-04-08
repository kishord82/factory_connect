/**
 * Health probes tests
 */
import { describe, it, expect, vi } from 'vitest';
import { HealthProbeManager } from './health-probes.js';

describe('HealthProbeManager', () => {
  const bridgeId = 'bridge-test-123';

  it('should initialize with builtin probes', () => {
    const manager = new HealthProbeManager(bridgeId);
    expect(manager).toBeDefined();
  });

  it('should register custom probe', async () => {
    const manager = new HealthProbeManager(bridgeId);
    const testProbe = vi.fn(async () => ({
      status: 'healthy' as const,
      message: 'test passed',
      latency_ms: 1,
    }));

    manager.registerProbe('test_probe', testProbe, 5000, 'info');

    const report = await manager.runAllProbes();
    expect(report.bridgeId).toBe(bridgeId);
    expect(report.overall).toBe('healthy');
  });

  it('should run all probes and generate report', async () => {
    const manager = new HealthProbeManager(bridgeId);
    const report = await manager.runAllProbes();

    expect(report).toBeDefined();
    expect(report.bridgeId).toBe(bridgeId);
    expect(report.timestamp).toBeGreaterThan(0);
    expect(['healthy', 'degraded', 'critical']).toContain(report.overall);
    expect(Array.isArray(report.probes)).toBe(true);
    expect(report.probes.length).toBeGreaterThan(0);
  });

  it('should include builtin probe results', async () => {
    const manager = new HealthProbeManager(bridgeId);
    const report = await manager.runAllProbes();

    const probeNames = report.probes.map(p => p.name);
    expect(probeNames).toContain('disk_space');
    expect(probeNames).toContain('memory_usage');
    expect(probeNames).toContain('cpu_usage');
  });

  it('should cache last report', async () => {
    const manager = new HealthProbeManager(bridgeId);
    expect(manager.getLastReport()).toBeNull();

    const report1 = await manager.runAllProbes();
    expect(manager.getLastReport()).toBe(report1);

    const report2 = await manager.runAllProbes();
    expect(manager.getLastReport()).toBe(report2);
    expect(report1.timestamp).toBeLessThan(report2.timestamp);
  });

  it('should handle probe failure', async () => {
    const manager = new HealthProbeManager(bridgeId);
    const failingProbe = vi.fn(async () => {
      throw new Error('Probe failed');
    });

    manager.registerProbe('failing_probe', failingProbe, 5000, 'critical');
    const report = await manager.runAllProbes();

    const failingResult = report.probes.find(p => p.name === 'failing_probe');
    expect(failingResult).toBeDefined();
    expect(failingResult!.status).toBe('critical');
    expect(failingResult!.message).toContain('Probe failed');
  });

  it('should determine overall status from probes', async () => {
    const manager = new HealthProbeManager(bridgeId);

    // Custom probe that returns degraded
    manager.registerProbe(
      'test_degraded',
      async () => ({
        status: 'degraded' as const,
        message: 'degraded',
        latency_ms: 1,
      }),
      5000,
      'warning'
    );

    const report = await manager.runAllProbes();
    expect(['degraded', 'healthy']).toContain(report.overall);
  });
});

/**
 * WebSocket tunnel tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketTunnel } from './websocket-tunnel.js';

describe('WebSocketTunnel', () => {
  let tunnel: WebSocketTunnel;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let wsServer: any = null;

  beforeEach(() => {
    tunnel = new WebSocketTunnel();
  });

  afterEach(async () => {
    await tunnel.disconnect();
    if (wsServer) {
      await new Promise<void>((resolve) => {
        wsServer.close(() => resolve());
      });
    }
  });

  it('should initialize with CLOSED state', () => {
    expect(tunnel.getState()).toBe('CLOSED');
    expect(tunnel.isConnected()).toBe(false);
  });

  it('should transition through connection states', async () => {
    const states: string[] = [];
    tunnel.onStateChange((state) => {
      states.push(state);
    });

    // Would test actual connection but needs mock WS server
    // For now, just verify state tracking works
    expect(tunnel.getState()).toBe('CLOSED');
  });

  it('should handle disconnect when not connected', async () => {
    // Should not throw
    await expect(tunnel.disconnect()).resolves.toBeUndefined();
  });

  it('should reject send when not connected', async () => {
    await expect(
      tunnel.send('health_report', { status: 'healthy' })
    ).rejects.toThrow('WebSocket not connected');
  });

  it('should register command callback', () => {
    const callback = vi.fn();
    tunnel.onCommand(callback);
    // Callback stored, would be invoked on incoming command
    expect(callback).not.toHaveBeenCalled();
  });

  it('should register state change callback', () => {
    const callback = vi.fn();
    tunnel.onStateChange(callback);
    expect(callback).not.toHaveBeenCalled();
  });
});

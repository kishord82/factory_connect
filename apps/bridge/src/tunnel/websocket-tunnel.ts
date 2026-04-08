/**
 * D7: WebSocket tunnel — bidirectional real-time communication with cloud API.
 * Handles reconnection with exponential backoff, heartbeat, message framing,
 * and command dispatch from cloud.
 */
import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

export type ConnectionState = 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' | 'RECONNECTING';

export interface Message {
  type: 'sync_data' | 'health_report' | 'command' | 'ack';
  correlationId: string;
  payload: Record<string, unknown>;
  timestamp?: number;
}

export interface Command {
  action: 'resync' | 'update_config' | 'restart';
  payload?: Record<string, unknown>;
}

export class WebSocketTunnel {
  private ws: WebSocket | null = null;
  private url: string = '';
  private token: string = '';
  private state: ConnectionState = 'CLOSED';
  private reconnectAttempt = 0;
  private maxReconnectAttempt = 6; // 1s, 2s, 4s, 8s, 16s, 32s, 60s max
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private onMessageCallback: ((cmd: Command) => void) | null = null;
  private onStateChangeCallback: ((state: ConnectionState) => void) | null = null;
  private pendingMessages = new Map<string, { resolve: (v: Record<string, unknown>) => void; reject: (e: Error) => void; timeout: NodeJS.Timeout }>();

  async connect(apiUrl: string, token: string): Promise<void> {
    this.url = apiUrl;
    this.token = token;
    this.setState('CONNECTING');

    return new Promise((resolve, reject) => {
      try {
        // Convert HTTP/HTTPS to WS/WSS
        const wsUrl = this.url.replace(/^https?:/, 'ws:').replace(/\/$/, '') + '/ws/bridge';
        this.ws = new WebSocket(wsUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 5000);

        this.ws.on('open', () => {
          clearTimeout(timeout);
          this.reconnectAttempt = 0;
          this.setState('OPEN');
          this.startHeartbeat();
          resolve();
        });

        this.ws.on('message', (data: Buffer) => {
          this.handleMessage(data);
        });

        this.ws.on('close', () => {
          clearTimeout(timeout);
          this.setState('CLOSED');
          this.stopHeartbeat();
          if (this.reconnectAttempt < this.maxReconnectAttempt) {
            this.scheduleReconnect();
          }
        });

        this.ws.on('error', (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  disconnect(): Promise<void> {
    return new Promise((resolve) => {
      this.setState('CLOSING');
      this.stopHeartbeat();
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      if (this.ws) {
        this.ws.on('close', () => {
          this.setState('CLOSED');
          resolve();
        });
        this.ws.close();
      } else {
        this.setState('CLOSED');
        resolve();
      }
    });
  }

  isConnected(): boolean {
    return this.state === 'OPEN' && this.ws?.readyState === 1; // WebSocket.OPEN
  }

  getState(): ConnectionState {
    return this.state;
  }

  onCommand(callback: (cmd: Command) => void): void {
    this.onMessageCallback = callback;
  }

  onStateChange(callback: (state: ConnectionState) => void): void {
    this.onStateChangeCallback = callback;
  }

  async send(type: Message['type'], payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!this.isConnected()) {
      throw new Error('WebSocket not connected');
    }

    const correlationId = uuidv4();
    const message: Message = {
      type,
      correlationId,
      payload,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingMessages.delete(correlationId);
        reject(new Error(`Message timeout (${correlationId})`));
      }, 30000); // 30s timeout

      this.pendingMessages.set(correlationId, { resolve, reject, timeout });

      try {
        this.ws!.send(JSON.stringify(message));
      } catch (err) {
        this.pendingMessages.delete(correlationId);
        clearTimeout(timeout);
        reject(err);
      }
    });
  }

  private handleMessage(data: Buffer): void {
    try {
      const message = JSON.parse(data.toString()) as Message;

      if (message.type === 'ack') {
        // Response to our outgoing message
        const pending = this.pendingMessages.get(message.correlationId);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingMessages.delete(message.correlationId);
          pending.resolve(message.payload as Record<string, unknown>);
        }
      } else if (message.type === 'command') {
        // Incoming command from cloud
        const payload = message.payload as unknown;
        if (payload && typeof payload === 'object' && 'action' in payload) {
          const cmd = payload as Command;
          if (this.onMessageCallback) {
            this.onMessageCallback(cmd);
          }
        }
        // Send ACK
        this.sendAck(message.correlationId);
      }
    } catch (err) {
      console.error('[WebSocketTunnel] Message parse error:', err);
    }
  }

  private sendAck(correlationId: string): void {
    try {
      if (this.ws && this.ws.readyState === 1) {
        const ack: Message = {
          type: 'ack',
          correlationId,
          payload: { received: true },
        };
        this.ws.send(JSON.stringify(ack));
      }
    } catch (err) {
      console.error('[WebSocketTunnel] Error sending ACK:', err);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        try {
          this.ws!.ping();
        } catch (err) {
          console.error('[WebSocketTunnel] Heartbeat error:', err);
        }
      }
    }, 30000); // 30s
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.setState('RECONNECTING');

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, then cap at 60s
    const baseDelay = Math.pow(2, this.reconnectAttempt) * 1000;
    const delay = Math.min(baseDelay, 60000);
    this.reconnectAttempt++;

    console.log(`[WebSocketTunnel] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect(this.url, this.token);
      } catch (err) {
        console.error('[WebSocketTunnel] Reconnection failed:', err);
        if (this.reconnectAttempt < this.maxReconnectAttempt) {
          this.scheduleReconnect();
        }
      }
    }, delay);
  }

  private setState(newState: ConnectionState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      console.log(`[WebSocketTunnel] State: ${oldState} → ${newState}`);
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(newState);
      }
    }
  }
}

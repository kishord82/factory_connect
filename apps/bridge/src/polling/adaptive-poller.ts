/**
 * D3: Adaptive polling — adjusts interval based on data activity.
 */

export interface PollerOptions {
  minIntervalMs: number;
  maxIntervalMs: number;
  initialIntervalMs: number;
  backoffMultiplier: number;
  speedupDivisor: number;
}

const DEFAULT_OPTIONS: PollerOptions = {
  minIntervalMs: 5000,
  maxIntervalMs: 300000,
  initialIntervalMs: 30000,
  backoffMultiplier: 1.5,
  speedupDivisor: 2,
};

export class AdaptivePoller {
  private options: PollerOptions;
  private currentIntervalMs: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pollFn: () => Promise<number>;
  private running = false;

  constructor(pollFn: () => Promise<number>, options: Partial<PollerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.currentIntervalMs = this.options.initialIntervalMs;
    this.pollFn = pollFn;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.scheduleNext();
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  get interval(): number {
    return this.currentIntervalMs;
  }

  get isRunning(): boolean {
    return this.running;
  }

  private scheduleNext(): void {
    if (!this.running) return;
    this.timer = setTimeout(async () => {
      try {
        const itemsProcessed = await this.pollFn();
        this.adjustInterval(itemsProcessed);
      } catch {
        // On error, back off
        this.adjustInterval(0);
      }
      this.scheduleNext();
    }, this.currentIntervalMs);
  }

  private adjustInterval(itemsProcessed: number): void {
    if (itemsProcessed > 0) {
      // Data found — speed up
      this.currentIntervalMs = Math.max(
        this.options.minIntervalMs,
        Math.floor(this.currentIntervalMs / this.options.speedupDivisor),
      );
    } else {
      // No data — slow down
      this.currentIntervalMs = Math.min(
        this.options.maxIntervalMs,
        Math.floor(this.currentIntervalMs * this.options.backoffMultiplier),
      );
    }
  }
}

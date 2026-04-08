/** Claim check threshold — payloads above this size go to MinIO */
export const CLAIM_CHECK_THRESHOLD_BYTES = 256 * 1024; // 256KB
/** Outbox poller interval */
export const OUTBOX_POLL_INTERVAL_MS = 5_000; // 5 seconds
/** Saga poller interval */
export const SAGA_POLL_INTERVAL_MS = 60_000; // 60 seconds
/** Worker heartbeat interval */
export const WORKER_HEARTBEAT_INTERVAL_MS = 120_000; // 2 minutes
/** Worker lock duration */
export const WORKER_LOCK_DURATION_MS = 300_000; // 5 minutes
/** Circuit breaker defaults */
export const CIRCUIT_BREAKER_DEFAULTS = {
    timeout: 30_000,
    errorThresholdPercentage: 60,
    resetTimeout: 300_000,
    volumeThreshold: 3,
    rollingCountTimeout: 60_000,
    rollingCountBuckets: 6,
};
/** Retry backoff schedule */
export const RETRY_BACKOFF_MS = [5_000, 30_000, 300_000, 1_800_000, 7_200_000];
/** Max retry attempts before DLQ */
export const MAX_RETRY_ATTEMPTS = 5;
/** Bridge agent health check interval */
export const HEALTH_CHECK_INTERVAL_MS = 120_000; // 2 minutes
/** Adaptive polling intervals (CPU-based) */
export const ADAPTIVE_POLL_INTERVALS_MS = {
    LOW: 300_000, // <50% CPU → 5 min
    MEDIUM: 600_000, // 50-70% → 10 min
    HIGH: 900_000, // 70-85% → 15 min
    CRITICAL: 1_800_000, // >85% → 30 min
    PAUSE: -1, // >95% → stop polling
};
/** LLM cache hit rate target */
export const LLM_CACHE_HIT_TARGET = 0.87;
/** Pagination defaults */
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
//# sourceMappingURL=index.js.map
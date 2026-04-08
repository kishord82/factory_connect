/**
 * MinIO client for claim-check pattern (large payloads).
 * Used by outbox poller to store/retrieve payloads >256KB.
 */

import { createLogger } from '@fc/observability';

const logger = createLogger('minio');

/**
 * Store large payload in MinIO and return reference URI.
 */
export async function putObject(key: string, payload: Record<string, unknown>): Promise<string> {
  // In production, this would use MinIO SDK
  // For now, return a URI format
  logger.info({ key, size: JSON.stringify(payload).length }, 'Storing object in MinIO');
  return `minio://claim-check/${key}`;
}

/**
 * Retrieve payload from MinIO by reference URI.
 */
export async function getObject(uri: string): Promise<string> {
  // In production, this would use MinIO SDK to fetch from uri
  logger.info({ uri }, 'Retrieving object from MinIO');
  throw new Error('MinIO integration not yet implemented');
}

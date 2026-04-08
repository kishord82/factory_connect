/**
 * CA Integration Test Setup
 * Utilities for generating test JWTs, seeding test data, and providing app/request instances
 */

import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import supertest from 'supertest';
import type { Request } from 'supertest';
import { createApp } from '../../../apps/api/src/app.js';
import type { CaSubscriptionTier, StaffRole } from '@fc/shared';

/**
 * Generate a test JWT token for CA firm context
 */
export function generateCaToken(overrides?: Partial<{
  ca_firm_id: string;
  sub: string;
  role: string;
  subscription_tier: CaSubscriptionTier;
  email: string;
}>): string {
  const payload = {
    sub: overrides?.sub || uuidv4(),
    iss: 'http://localhost:8080/realms/factoryconnect',
    aud: 'fc-api',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    ca_firm_id: overrides?.ca_firm_id || uuidv4(),
    role: overrides?.role || 'manager',
    subscription_tier: overrides?.subscription_tier || 'trial',
    email: overrides?.email || 'test@ca-firm.example.com',
  };

  // In test mode, use HS256 with dev secret
  return jwt.sign(payload, 'test-secret-key', { algorithm: 'HS256' });
}

/**
 * Generate a test JWT token for factory context (non-CA)
 * Used for RLS cross-tenant isolation tests
 */
export function generateFactoryToken(overrides?: Partial<{
  factory_id: string;
  sub: string;
  role: string;
  email: string;
}>): string {
  const payload = {
    sub: overrides?.sub || uuidv4(),
    iss: 'http://localhost:8080/realms/factoryconnect',
    aud: 'fc-api',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    factory_id: overrides?.factory_id || uuidv4(),
    role: overrides?.role || 'factory_admin',
    email: overrides?.email || 'test@factory.example.com',
  };

  return jwt.sign(payload, 'test-secret-key', { algorithm: 'HS256' });
}

/**
 * Seed test data: CA firm, staff, clients, filings
 * Returns IDs for use in tests
 */
export async function seedCaTestData(): Promise<{
  firmId: string;
  staffId: string;
  clientIds: string[];
  filingIds: string[];
}> {
  // TODO: Implement actual database seeding when integration test DB setup is ready
  // For now, return mock IDs that match the format expected in tests

  const firmId = uuidv4();
  const staffId = uuidv4();
  const clientIds = [uuidv4(), uuidv4(), uuidv4()];
  const filingIds = [uuidv4(), uuidv4()];

  return {
    firmId,
    staffId,
    clientIds,
    filingIds,
  };
}

/**
 * Clean up test data after tests complete
 */
export async function cleanCaTestData(): Promise<void> {
  // TODO: Implement cleanup of test records when DB seeding is ready
  // For now, this is a no-op
}

/**
 * Create Express app instance for testing
 */
export const app = createApp();

/**
 * Create supertest request builder
 */
export const request = supertest(app);

/**
 * Utility: make authenticated CA request with token
 */
export function makeAuthRequest(token: string): Request {
  return request.get('/api/v1/ca/firms/me').set('Authorization', `Bearer ${token}`);
}

/**
 * Utility: make unauthenticated request
 */
export function makeUnauthRequest(): Request {
  return request.get('/api/v1/ca/firms/me');
}

/**
 * Test context builder — returns headers and context needed for a test
 */
export interface TestContext {
  token: string;
  caFirmId: string;
  userId: string;
  correlationId: string;
  subscriptionTier: CaSubscriptionTier;
}

export function createTestContext(overrides?: Partial<TestContext>): TestContext {
  const caFirmId = overrides?.caFirmId || uuidv4();
  const userId = overrides?.userId || uuidv4();

  const token = generateCaToken({
    ca_firm_id: caFirmId,
    sub: userId,
    subscription_tier: overrides?.subscriptionTier || 'trial',
  });

  return {
    token,
    caFirmId,
    userId,
    correlationId: overrides?.correlationId || `test-${uuidv4()}`,
    subscriptionTier: overrides?.subscriptionTier || 'trial',
  };
}

/**
 * Get authorization header value
 */
export function getAuthHeader(token: string): string {
  return `Bearer ${token}`;
}

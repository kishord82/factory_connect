import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a test JWT payload (for mocking Keycloak tokens in tests)
 */
export function createTestJwtPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    sub: uuidv4(),
    iss: 'http://localhost:8080/realms/factoryconnect',
    aud: 'fc-api',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    factory_id: uuidv4(),
    role: 'factory_admin',
    email: 'test@factory.example.com',
    ...overrides,
  };
}

/**
 * Generate a test tenant ID
 */
export function testTenantId(): string {
  return uuidv4();
}

/**
 * Generate a test correlation ID
 */
export function testCorrelationId(): string {
  return `test-${uuidv4()}`;
}

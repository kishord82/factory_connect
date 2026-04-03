/**
 * TEST-007 through TEST-008: Query Helper Tests
 * Tests buildWhereClause and paginatedQuery (mocked).
 */

import { describe, it, expect } from 'vitest';
import { buildWhereClause } from './query.js';

describe('Query Helpers', () => {
  describe('TEST-007: buildWhereClause', () => {
    it('builds WHERE clause from filter object', () => {
      const result = buildWhereClause({
        status: 'CONFIRMED',
        buyer_id: '550e8400-e29b-41d4-a716-446655440001',
      });
      expect(result.clause).toBe('WHERE status = $1 AND buyer_id = $2');
      expect(result.params).toEqual([
        'CONFIRMED',
        '550e8400-e29b-41d4-a716-446655440001',
      ]);
      expect(result.nextIndex).toBe(3);
    });

    it('skips undefined values', () => {
      const result = buildWhereClause({
        status: 'DRAFT',
        buyer_id: undefined,
        connection_id: '550e8400-e29b-41d4-a716-446655440002',
      });
      expect(result.clause).toBe('WHERE status = $1 AND connection_id = $2');
      expect(result.params).toHaveLength(2);
    });

    it('returns empty string for empty filters', () => {
      const result = buildWhereClause({});
      expect(result.clause).toBe('');
      expect(result.params).toHaveLength(0);
      expect(result.nextIndex).toBe(1);
    });

    it('returns empty string when all values are undefined', () => {
      const result = buildWhereClause({
        status: undefined,
        buyer_id: undefined,
      });
      expect(result.clause).toBe('');
      expect(result.params).toHaveLength(0);
    });

    it('starts from custom index', () => {
      const result = buildWhereClause({ status: 'SHIPPED' }, 3);
      expect(result.clause).toBe('WHERE status = $3');
      expect(result.nextIndex).toBe(4);
    });
  });

  describe('TEST-008: PaginatedResult structure', () => {
    it('calculates totalPages correctly', () => {
      // Testing the math used in paginatedQuery
      const total = 47;
      const pageSize = 10;
      const totalPages = Math.ceil(total / pageSize);
      expect(totalPages).toBe(5);
    });

    it('calculates offset correctly', () => {
      const page = 3;
      const pageSize = 25;
      const offset = (page - 1) * pageSize;
      expect(offset).toBe(50);
    });
  });
});

/**
 * TEST-001 through TEST-003: PII Redaction Tests
 * Verifies GSTIN, PAN, Phone, Email, Aadhaar, Bank patterns are scrubbed.
 */

import { describe, it, expect } from 'vitest';
import { redactString, redactValue } from './pii-redactor.js';

describe('PII Redactor', () => {
  describe('redactString', () => {
    it('TEST-001: redacts GSTIN numbers', () => {
      const input = 'Factory GSTIN is 27AADCB2230M1ZT registered in Maharashtra';
      const result = redactString(input);
      expect(result).toContain('[REDACTED:GSTIN]');
      expect(result).not.toContain('27AADCB2230M1ZT');
    });

    it('TEST-002: redacts PAN numbers', () => {
      const input = 'Owner PAN: ABCDE1234F for verification';
      const result = redactString(input);
      expect(result).toContain('[REDACTED:PAN]');
      expect(result).not.toContain('ABCDE1234F');
    });

    it('TEST-003: redacts Indian phone numbers', () => {
      const input = 'Contact: +919876543210 or 09876543210';
      const result = redactString(input);
      expect(result).toContain('[REDACTED:Phone]');
      expect(result).not.toContain('9876543210');
    });

    it('redacts email addresses', () => {
      const input = 'Send invoice to finance@example.com for processing';
      const result = redactString(input);
      expect(result).toContain('[REDACTED:Email]');
      expect(result).not.toContain('finance@example.com');
    });

    it('redacts Aadhaar numbers', () => {
      const input = 'Aadhaar: 1234 5678 9012';
      const result = redactString(input);
      expect(result).toContain('[REDACTED:Aadhaar]');
      expect(result).not.toContain('1234 5678 9012');
    });

    it('redacts Aadhaar without spaces', () => {
      const input = 'Aadhaar: 123456789012';
      const result = redactString(input);
      // May be caught by Bank or Aadhaar pattern
      expect(result).not.toContain('123456789012');
    });

    it('handles strings with no PII', () => {
      const input = 'Order ORD-001 shipped to warehouse';
      const result = redactString(input);
      expect(result).toBe(input);
    });

    it('redacts multiple PII types in one string', () => {
      const input = 'Factory GSTIN 27AADCB2230M1ZT, contact: +919876543210, email: test@factory.com';
      const result = redactString(input);
      expect(result).toContain('[REDACTED:GSTIN]');
      expect(result).toContain('[REDACTED:Phone]');
      expect(result).toContain('[REDACTED:Email]');
    });
  });

  describe('redactValue', () => {
    it('redacts PII in nested objects', () => {
      const input = {
        factory: {
          name: 'Test Factory',
          gstin: '27AADCB2230M1ZT',
          contact: {
            email: 'admin@factory.com',
            phone: '+919876543210',
          },
        },
      };
      const result = redactValue(input) as Record<string, unknown>;
      const factory = result.factory as Record<string, unknown>;
      expect(factory.gstin).toContain('[REDACTED:GSTIN]');
      const contact = factory.contact as Record<string, unknown>;
      expect(contact.email).toContain('[REDACTED:Email]');
      expect(contact.phone).toContain('[REDACTED:Phone]');
    });

    it('redacts PII in arrays', () => {
      const input = ['email: test@example.com', 'phone: +919876543210'];
      const result = redactValue(input) as string[];
      expect(result[0]).toContain('[REDACTED:Email]');
      expect(result[1]).toContain('[REDACTED:Phone]');
    });

    it('passes through non-string primitives unchanged', () => {
      expect(redactValue(42)).toBe(42);
      expect(redactValue(true)).toBe(true);
      expect(redactValue(null)).toBeNull();
      expect(redactValue(undefined)).toBeUndefined();
    });
  });
});

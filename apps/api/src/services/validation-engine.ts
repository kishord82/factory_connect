/**
 * B25: Pre-dispatch validation engine — validates documents before EDI send.
 */
import type { RequestContext } from '@fc/shared';
import type { PoolClient } from '@fc/database';
import { withTenantClient, findOne, findMany } from '@fc/database';
interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

interface ValidationIssue {
  field: string;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
}

type ValidationRule = (data: Record<string, unknown>, ctx: Record<string, unknown>) => ValidationIssue[];

const ORDER_RULES: ValidationRule[] = [
  // Required fields
  (data) => {
    const issues: ValidationIssue[] = [];
    const required = ['buyer_po_number', 'buyer_id', 'connection_id', 'order_date', 'currency'];
    for (const field of required) {
      if (!data[field]) {
        issues.push({ field, rule: 'REQUIRED', message: `${field} is required`, severity: 'error' });
      }
    }
    return issues;
  },
  // Numeric validation
  (data) => {
    const issues: ValidationIssue[] = [];
    const numericFields = ['subtotal', 'tax_amount', 'total_amount'];
    for (const field of numericFields) {
      if (data[field] !== undefined && data[field] !== null) {
        const val = Number(data[field]);
        if (isNaN(val) || val < 0) {
          issues.push({ field, rule: 'POSITIVE_NUMBER', message: `${field} must be a positive number`, severity: 'error' });
        }
      }
    }
    return issues;
  },
  // Total consistency check
  (data) => {
    const issues: ValidationIssue[] = [];
    const subtotal = Number(data.subtotal || 0);
    const tax = Number(data.tax_amount || 0);
    const total = Number(data.total_amount || 0);
    if (subtotal + tax !== total && total > 0) {
      issues.push({ field: 'total_amount', rule: 'TOTAL_CONSISTENCY', message: 'subtotal + tax_amount should equal total_amount', severity: 'warning' });
    }
    return issues;
  },
];

const SHIPMENT_RULES: ValidationRule[] = [
  (data) => {
    const issues: ValidationIssue[] = [];
    if (!data.order_id) issues.push({ field: 'order_id', rule: 'REQUIRED', message: 'order_id is required', severity: 'error' });
    if (!data.shipment_date) issues.push({ field: 'shipment_date', rule: 'REQUIRED', message: 'shipment_date is required', severity: 'error' });
    return issues;
  },
];

const INVOICE_RULES: ValidationRule[] = [
  (data) => {
    const issues: ValidationIssue[] = [];
    if (!data.invoice_number) issues.push({ field: 'invoice_number', rule: 'REQUIRED', message: 'invoice_number is required', severity: 'error' });
    if (!data.invoice_date) issues.push({ field: 'invoice_date', rule: 'REQUIRED', message: 'invoice_date is required', severity: 'error' });
    return issues;
  },
];

function runRules(rules: ValidationRule[], data: Record<string, unknown>, ruleCtx: Record<string, unknown> = {}): ValidationResult {
  const allIssues: ValidationIssue[] = [];
  for (const rule of rules) {
    allIssues.push(...rule(data, ruleCtx));
  }
  return {
    valid: allIssues.filter(i => i.severity === 'error').length === 0,
    errors: allIssues.filter(i => i.severity === 'error'),
    warnings: allIssues.filter(i => i.severity === 'warning'),
  };
}

export function validateOrder(data: Record<string, unknown>): ValidationResult {
  return runRules(ORDER_RULES, data);
}

export function validateShipment(data: Record<string, unknown>): ValidationResult {
  return runRules(SHIPMENT_RULES, data);
}

export function validateInvoice(data: Record<string, unknown>): ValidationResult {
  return runRules(INVOICE_RULES, data);
}

export async function validateOrderForDispatch(ctx: RequestContext, orderId: string): Promise<ValidationResult> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    const order = await findOne<Record<string, unknown>>(client, 'SELECT * FROM orders.canonical_orders WHERE id = $1', [orderId]);
    if (!order) {
      return { valid: false, errors: [{ field: 'id', rule: 'EXISTS', message: 'Order not found', severity: 'error' }], warnings: [] };
    }

    const baseResult = validateOrder(order);

    // Check line items exist
    const items = await findMany<Record<string, unknown>>(client, 'SELECT id FROM orders.canonical_order_line_items WHERE order_id = $1', [orderId]);
    if (items.length === 0) {
      baseResult.errors.push({ field: 'line_items', rule: 'HAS_LINE_ITEMS', message: 'Order must have at least one line item', severity: 'error' });
      baseResult.valid = false;
    }

    // Check connection is active
    if (order.connection_id) {
      const conn = await findOne<{status: string}>(client, 'SELECT status FROM core.connections WHERE id = $1', [order.connection_id as string]);
      if (conn && conn.status !== 'active') {
        baseResult.warnings.push({ field: 'connection_id', rule: 'ACTIVE_CONNECTION', message: 'Connection is not active', severity: 'warning' });
      }
    }

    return baseResult;
  });
}

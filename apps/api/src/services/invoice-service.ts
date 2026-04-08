/**
 * B9: Invoice service — CRUD + outbox for Invoice (810).
 */

import type { RequestContext } from '@fc/shared';
import type { PoolClient } from '@fc/database';
import { FcError } from '@fc/shared';
import type { CanonicalInvoiceCreate } from '@fc/shared';
import { withTenantTransaction, withTenantClient, insertOne, findOne, paginatedQuery } from '@fc/database';
import type { PaginatedResult } from '@fc/database';
import { buildSearchWhere, buildOrderBy } from '../utils/pagination.js';

const INVOICE_SORT_COLUMNS = ['created_at', 'invoice_date', 'due_date', 'total_amount', 'status'];
const INVOICE_SEARCH_COLUMNS = ['i.invoice_number', 'i.status'];

interface InvoiceRow {
  id: string;
  factory_id: string;
  order_id: string;
  shipment_id: string | null;
  connection_id: string;
  invoice_number: string;
  invoice_date: Date;
  due_date: Date | null;
  subtotal: string;
  tax_amount: string;
  tax_breakdown: Record<string, unknown> | null;
  total_amount: string;
  line_items: unknown[];
  status: string;
  created_at: Date;
  updated_at: Date;
}

export async function createInvoice(ctx: RequestContext, data: CanonicalInvoiceCreate): Promise<InvoiceRow> {
  return withTenantTransaction(ctx, async (client: PoolClient) => {
    const order = await findOne(client, 'SELECT id FROM orders.canonical_orders WHERE id = $1', [data.order_id]);
    if (!order) throw new FcError('FC_ERR_ORDER_NOT_FOUND', `Order ${data.order_id} not found`, {}, 404);

    const invoice = await insertOne<InvoiceRow>(
      client,
      `INSERT INTO orders.canonical_invoices (
        factory_id, order_id, shipment_id, connection_id, invoice_number,
        invoice_date, due_date, subtotal, tax_amount, tax_breakdown,
        total_amount, line_items
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        ctx.tenantId, data.order_id, data.shipment_id ?? null, data.connection_id,
        data.invoice_number, data.invoice_date, data.due_date ?? null,
        data.subtotal, data.tax_amount,
        data.tax_breakdown ? JSON.stringify(data.tax_breakdown) : null,
        data.total_amount, JSON.stringify(data.line_items),
      ],
    );

    // Outbox: INVOICE_CREATED triggers EDI 810
    await client.query(
      `INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
       VALUES ('canonical_invoice', $1, 'INVOICE_CREATED', $2)`,
      [invoice.id, JSON.stringify({ invoice_id: invoice.id, order_id: data.order_id })],
    );

    // Advance saga
    await client.query(
      `UPDATE workflow.order_sagas SET current_step = 'INVOICE_READY', updated_at = NOW()
       WHERE order_id = $1 AND current_step IN ('ASN_DELIVERED','SHIP_READY')`,
      [data.order_id],
    );

    // Audit
    await client.query(
      `INSERT INTO audit_log (tenant_id, action, entity_type, entity_id, actor_id, new_record, metadata)
       VALUES ($1, 'INVOICE', 'canonical_invoice', $2, $3, $4, $5)`,
      [ctx.tenantId, invoice.id, ctx.userId, JSON.stringify(invoice), JSON.stringify({ correlationId: ctx.correlationId })],
    );

    return invoice;
  });
}

export async function getInvoiceById(ctx: RequestContext, id: string): Promise<InvoiceRow | null> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    return findOne<InvoiceRow>(client, 'SELECT * FROM orders.canonical_invoices WHERE id = $1', [id]);
  });
}

export async function listInvoices(
  ctx: RequestContext,
  orderId: string | undefined,
  page: number,
  pageSize: number,
  search: string = '',
  sort: string = 'created_at',
  order: 'asc' | 'desc' = 'desc',
): Promise<PaginatedResult<InvoiceRow>> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    const params: unknown[] = [];
    let idx = 1;
    const conditions: string[] = [];

    if (orderId) { conditions.push(`i.order_id = $${idx++}`); params.push(orderId); }

    const { clause: searchClause, values: searchValues, nextIndex } = buildSearchWhere(
      search, INVOICE_SEARCH_COLUMNS, idx,
    );
    if (searchClause) { conditions.push(searchClause); params.push(...searchValues); idx = nextIndex; }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = buildOrderBy(sort, order, INVOICE_SORT_COLUMNS);

    return paginatedQuery<InvoiceRow>(
      client,
      `SELECT i.id, i.factory_id, i.order_id, i.shipment_id, i.connection_id,
              i.invoice_number, i.invoice_date, i.due_date, i.subtotal,
              i.tax_amount, i.total_amount, i.status, i.created_at, i.updated_at
       FROM orders.canonical_invoices i ${whereClause} ${orderBy}`,
      params, page, pageSize,
    );
  });
}

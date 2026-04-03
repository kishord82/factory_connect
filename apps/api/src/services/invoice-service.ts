/**
 * B9: Invoice service — CRUD + outbox for Invoice (810).
 */

import type { RequestContext } from '@fc/shared';
import { FcError } from '@fc/shared';
import type { CanonicalInvoiceCreate } from '@fc/shared';
import { withTenantTransaction, withTenantClient, insertOne, findOne, paginatedQuery } from '@fc/database';
import type { PaginatedResult } from '@fc/database';

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
  return withTenantTransaction(ctx, async (client) => {
    const order = await findOne(client, 'SELECT id FROM canonical_orders WHERE id = $1', [data.order_id]);
    if (!order) throw new FcError('FC_ERR_ORDER_NOT_FOUND', `Order ${data.order_id} not found`, {}, 404);

    const invoice = await insertOne<InvoiceRow>(
      client,
      `INSERT INTO canonical_invoices (
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
      `UPDATE order_sagas SET current_step = 'INVOICE_READY', updated_at = NOW()
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
  return withTenantClient(ctx, async (client) => {
    return findOne<InvoiceRow>(client, 'SELECT * FROM canonical_invoices WHERE id = $1', [id]);
  });
}

export async function listInvoices(ctx: RequestContext, orderId: string | undefined, page: number, pageSize: number): Promise<PaginatedResult<InvoiceRow>> {
  return withTenantClient(ctx, async (client) => {
    const params: unknown[] = [];
    let sql = 'SELECT * FROM canonical_invoices';
    if (orderId) { sql += ' WHERE order_id = $1'; params.push(orderId); }
    sql += ' ORDER BY created_at DESC';
    return paginatedQuery<InvoiceRow>(client, sql, params, page, pageSize);
  });
}

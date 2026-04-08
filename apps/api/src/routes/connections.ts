/**
 * B10: Connection routes — CRUD for buyer connections.
 */

import { Router } from 'express';
import { z } from 'zod';
import { ConnectionCreateSchema, PaginationSchema } from '@fc/shared';
import { authenticate } from '../middleware/auth.js';
import { tenantContext, getRequestContext } from '../middleware/tenant-context.js';
import { validate, getValidatedQuery, getValidatedParams } from '../middleware/validate.js';
import type { PoolClient } from '@fc/database';
import { withTenantTransaction, withTenantClient, insertOne, findOne, paginatedQuery } from '@fc/database';
export const connectionRouter = Router();
connectionRouter.use(authenticate, tenantContext);

const IdParams = z.object({ id: z.string().uuid() });

interface ConnectionRow {
  id: string;
  factory_id: string;
  buyer_id: string;
  source_type: string;
  mode: string;
  protocol: string;
  buyer_endpoint: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

connectionRouter.post('/', validate({ body: ConnectionCreateSchema }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const conn = await withTenantTransaction(ctx, async (client: PoolClient) => {
      return insertOne<ConnectionRow>(
        client,
        `INSERT INTO core.connections (
          factory_id, buyer_id, source_type, mode, protocol,
          buyer_endpoint, credentials, tax_config, currency_config,
          barcode_config, partial_shipment_allowed,
          sla_ack_hours, sla_ship_hours, sla_invoice_hours, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'active') RETURNING *`,
        [
          ctx.tenantId, req.body.buyer_id, req.body.source_type, req.body.connection_mode,
          req.body.protocol, req.body.buyer_endpoint ?? null,
          req.body.credentials ? JSON.stringify(req.body.credentials) : null,
          req.body.tax_config ? JSON.stringify(req.body.tax_config) : JSON.stringify({ rate: 18, type: 'GST', components: ['CGST', 'SGST'] }),
          req.body.currency_config ? JSON.stringify(req.body.currency_config) : null,
          req.body.barcode_config ? JSON.stringify(req.body.barcode_config) : null,
          req.body.partial_shipment_allowed,
          req.body.sla_ack_hours ?? null, req.body.sla_ship_hours ?? null, req.body.sla_invoice_hours ?? null,
        ],
      );
    });
    res.status(201).json({ data: conn });
  } catch (err) { next(err); }
});

connectionRouter.get('/', validate({ query: PaginationSchema }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const q = getValidatedQuery<z.infer<typeof PaginationSchema>>(req);
    const result = await withTenantClient(ctx, async (client: PoolClient) => {
      return paginatedQuery<ConnectionRow>(
        client, 'SELECT * FROM core.connections ORDER BY created_at DESC', [], q.page, q.pageSize,
      );
    });
    res.json(result);
  } catch (err) { next(err); }
});

connectionRouter.get('/:id', validate({ params: IdParams }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const conn = await withTenantClient(ctx, async (client: PoolClient) => {
      const { id } = getValidatedParams<z.infer<typeof IdParams>>(req);
      return findOne<ConnectionRow>(client, 'SELECT * FROM core.connections WHERE id = $1', [id]);
    });
    if (!conn) { res.status(404).json({ error: { code: 'FC_ERR_CONNECTION_NOT_FOUND' } }); return; }
    res.json({ data: conn });
  } catch (err) { next(err); }
});

/**
 * B9: Invoice routes.
 */

import { Router } from 'express';
import { z } from 'zod';
import { CanonicalInvoiceCreateSchema, PaginationSchema } from '@fc/shared';
import { authenticate } from '../middleware/auth.js';
import { tenantContext, getRequestContext } from '../middleware/tenant-context.js';
import { validate, getValidatedQuery, getValidatedParams } from '../middleware/validate.js';
import * as invoiceService from '../services/invoice-service.js';

export const invoiceRouter = Router();
invoiceRouter.use(authenticate, tenantContext);

const IdParams = z.object({ id: z.string().uuid() });
const ListQuery = PaginationSchema.extend({ order_id: z.string().uuid().optional() });

invoiceRouter.post('/', validate({ body: CanonicalInvoiceCreateSchema }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const invoice = await invoiceService.createInvoice(ctx, req.body);
    res.status(201).json({ data: invoice });
  } catch (err) { next(err); }
});

invoiceRouter.get('/', validate({ query: ListQuery }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const q = getValidatedQuery<z.infer<typeof ListQuery>>(req);
    const result = await invoiceService.listInvoices(ctx, q.order_id, q.page, q.pageSize);
    res.json(result);
  } catch (err) { next(err); }
});

invoiceRouter.get('/:id', validate({ params: IdParams }), async (req, res, next) => {
  try {
    const ctx = getRequestContext(req);
    const { id } = getValidatedParams<z.infer<typeof IdParams>>(req);
    const inv = await invoiceService.getInvoiceById(ctx, id);
    if (!inv) { res.status(404).json({ error: { code: 'FC_ERR_INVOICE_NOT_FOUND' } }); return; }
    res.json({ data: inv });
  } catch (err) { next(err); }
});

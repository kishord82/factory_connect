/**
 * CA Premium Tier Routes (F6, F8, F9)
 * Protected by subscription feature gate middleware
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { caTenantContext, getCaRequestContext } from '../../middleware/ca-tenant-context.js';
import { requireSubscriptionFeature } from '../../middleware/subscription-gate.js';
import { validate } from '../../middleware/validate.js';
import { z } from 'zod';
import * as exportEdi from '../../services/premium/export-edi-service.js';
import * as tradeFinance from '../../services/premium/trade-finance-service.js';
import * as ecommerce from '../../services/premium/ecommerce-service.js';

export const premiumRouter = Router();

// All premium routes require auth + CA tenant context
premiumRouter.use(authenticate, caTenantContext);

// ============================================================================
// F6: EXPORT EDI COMPLIANCE ROUTES
// ============================================================================

const GenerateShippingBillSchema = z.object({
  client_id: z.string().uuid('Invalid client ID'),
  invoice_ids: z.array(z.string().uuid('Invalid invoice ID')).nonempty('At least one invoice required'),
  fob_value: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid FOB value format'),
  currency: z.string().length(3, 'Currency must be 3 characters').toUpperCase(),
  hs_codes: z.record(z.string(), z.unknown()).optional(),
});

/** POST /api/v1/ca/premium/export/shipping-bill — Generate customs shipping bill */
premiumRouter.post(
  '/export/shipping-bill',
  requireSubscriptionFeature('F6'),
  validate({ body: GenerateShippingBillSchema }),
  async (req, res, next) => {
    try {
      const ctx = getCaRequestContext(req);
      const result = await exportEdi.generateShippingBill(
        ctx,
        req.body.client_id,
        req.body.invoice_ids,
        {
          fob_value: req.body.fob_value,
          currency: req.body.currency,
          hs_codes: req.body.hs_codes || {},
        },
      );

      res.status(201).json({
        data: result,
        correlationId: ctx.correlationId,
      });
    } catch (err) {
      next(err);
    }
  },
);

const GenerateBolSchema = z.object({
  client_id: z.string().uuid('Invalid client ID'),
  shipment_id: z.string().uuid('Invalid shipment ID'),
  origin_port: z.string().min(1, 'Origin port required'),
  destination_port: z.string().min(1, 'Destination port required'),
  vessel_name: z.string().optional(),
  voyage_number: z.string().optional(),
  weight_kg: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid weight format'),
});

/** POST /api/v1/ca/premium/export/bol — Generate Bill of Lading */
premiumRouter.post(
  '/export/bol',
  requireSubscriptionFeature('F6'),
  validate({ body: GenerateBolSchema }),
  async (req, res, next) => {
    try {
      const ctx = getCaRequestContext(req);
      const result = await exportEdi.generateBoL(ctx, req.body.client_id, {
        shipment_id: req.body.shipment_id,
        origin_port: req.body.origin_port,
        destination_port: req.body.destination_port,
        vessel_name: req.body.vessel_name,
        voyage_number: req.body.voyage_number,
        weight_kg: req.body.weight_kg,
      });

      res.status(201).json({
        data: result,
        correlationId: ctx.correlationId,
      });
    } catch (err) {
      next(err);
    }
  },
);

const PrepareIcegateSchema = z.object({
  client_id: z.string().uuid('Invalid client ID'),
  shipping_bill_id: z.string().uuid('Invalid shipping bill ID'),
});

/** POST /api/v1/ca/premium/export/icegate — Prepare ICEGATE submission */
premiumRouter.post(
  '/export/icegate',
  requireSubscriptionFeature('F6'),
  validate({ body: PrepareIcegateSchema }),
  async (req, res, next) => {
    try {
      const ctx = getCaRequestContext(req);
      const result = await exportEdi.prepareIcegateSubmission(
        ctx,
        req.body.client_id,
        req.body.shipping_bill_id,
      );

      res.status(201).json({
        data: result,
        correlationId: ctx.correlationId,
      });
    } catch (err) {
      next(err);
    }
  },
);

const TrackDrawbackQuerySchema = z.object({
  client_id: z.string().uuid('Invalid client ID'),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be YYYY-MM format'),
});

/** GET /api/v1/ca/premium/export/drawback — Track duty drawback claims */
premiumRouter.get(
  '/export/drawback',
  requireSubscriptionFeature('F6'),
  validate({ query: TrackDrawbackQuerySchema }),
  async (req, res, next) => {
    try {
      const ctx = getCaRequestContext(req);
      const result = await exportEdi.trackDutyDrawback(
        ctx,
        String(req.query.client_id),
        String(req.query.period),
      );

      res.json({
        data: result,
        count: result.length,
        correlationId: ctx.correlationId,
      });
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/premium/export/dashboard — Export compliance dashboard */
premiumRouter.get(
  '/export/dashboard',
  requireSubscriptionFeature('F6'),
  async (req, res, next) => {
    try {
      const ctx = getCaRequestContext(req);
      const result = await exportEdi.exportComplianceDashboard(ctx);

      res.json({
        data: result,
        correlationId: ctx.correlationId,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ============================================================================
// F8: TRADE FINANCE ROUTES
// ============================================================================

const ListEligibleInvoicesSchema = z.object({
  client_id: z.string().uuid('Invalid client ID'),
  min_amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format').optional().default('50000'),
  max_age_days: z.coerce.number().int().positive().optional().default(90),
});

/** GET /api/v1/ca/premium/finance/eligible — List eligible invoices */
premiumRouter.get(
  '/finance/eligible',
  requireSubscriptionFeature('F8'),
  validate({ query: ListEligibleInvoicesSchema }),
  async (req, res, next) => {
    try {
      const ctx = getCaRequestContext(req);
      const result = await tradeFinance.listEligibleInvoices(
        ctx,
        String(req.query.client_id),
        String(req.query.min_amount),
        Number(req.query.max_age_days),
      );

      res.json({
        data: result,
        count: result.length,
        correlationId: ctx.correlationId,
      });
    } catch (err) {
      next(err);
    }
  },
);

const SubmitToTredsSchema = z.object({
  client_id: z.string().uuid('Invalid client ID'),
  invoice_ids: z.array(z.string().uuid('Invalid invoice ID')).nonempty('At least one invoice required'),
  platform: z.enum(['rxil', 'invoicemart', 'm1xchange']),
});

/** POST /api/v1/ca/premium/finance/submit — Submit to TReDS platform */
premiumRouter.post(
  '/finance/submit',
  requireSubscriptionFeature('F8'),
  validate({ body: SubmitToTredsSchema }),
  async (req, res, next) => {
    try {
      const ctx = getCaRequestContext(req);
      const result = await tradeFinance.submitToTreds(
        ctx,
        req.body.client_id,
        req.body.invoice_ids,
        req.body.platform,
      );

      res.status(201).json({
        data: result,
        correlationId: ctx.correlationId,
      });
    } catch (err) {
      next(err);
    }
  },
);

const TrackDiscountingQuerySchema = z.object({
  client_id: z.string().uuid('Invalid client ID'),
});

/** GET /api/v1/ca/premium/finance/tracking — Track discounting status */
premiumRouter.get(
  '/finance/tracking',
  requireSubscriptionFeature('F8'),
  validate({ query: TrackDiscountingQuerySchema }),
  async (req, res, next) => {
    try {
      const ctx = getCaRequestContext(req);
      const result = await tradeFinance.trackDiscounting(ctx, String(req.query.client_id));

      res.json({
        data: result,
        count: result.length,
        correlationId: ctx.correlationId,
      });
    } catch (err) {
      next(err);
    }
  },
);

const CalculateFinancingCostSchema = z.object({
  invoice_amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format'),
  discount_rate: z.string().regex(/^0(\.\d{1,4})?$|^1(\.0{1,4})?$/, 'Rate must be 0-1'),
  tenor_days: z.coerce.number().int().positive('Tenor must be positive'),
});

/** POST /api/v1/ca/premium/finance/cost — Calculate financing cost */
premiumRouter.post(
  '/finance/cost',
  requireSubscriptionFeature('F8'),
  validate({ body: CalculateFinancingCostSchema }),
  async (req, res, next) => {
    try {
      const result = await tradeFinance.calculateFinancingCost(
        req.body.invoice_amount,
        req.body.discount_rate,
        req.body.tenor_days,
      );

      const ctx = getCaRequestContext(req);
      res.json({
        data: result,
        correlationId: ctx.correlationId,
      });
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/premium/finance/dashboard — Trade finance dashboard */
premiumRouter.get(
  '/finance/dashboard',
  requireSubscriptionFeature('F8'),
  async (req, res, next) => {
    try {
      const ctx = getCaRequestContext(req);
      const result = await tradeFinance.tradeFinanceDashboard(ctx);

      res.json({
        data: result,
        correlationId: ctx.correlationId,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ============================================================================
// F9: E-COMMERCE ROUTES
// ============================================================================

const ReconcileMarketplaceSchema = z.object({
  client_id: z.string().uuid('Invalid client ID'),
  platform: z.enum(['amazon', 'flipkart', 'meesho']),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be YYYY-MM format'),
  settlement_amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format'),
  order_count: z.coerce.number().int().nonnegative('Order count must be non-negative'),
  commission_rate: z.string().regex(/^0(\.\d{1,4})?$|^1(\.0{1,4})?$/, 'Rate must be 0-1'),
});

/** POST /api/v1/ca/premium/ecommerce/reconcile — Reconcile marketplace settlement */
premiumRouter.post(
  '/ecommerce/reconcile',
  requireSubscriptionFeature('F9'),
  validate({ body: ReconcileMarketplaceSchema }),
  async (req, res, next) => {
    try {
      const ctx = getCaRequestContext(req);
      const result = await ecommerce.reconcileMarketplace(
        ctx,
        req.body.client_id,
        req.body.platform,
        {
          period: req.body.period,
          settlementAmount: req.body.settlement_amount,
          orderCount: req.body.order_count,
          commissionRate: req.body.commission_rate,
        },
      );

      res.status(201).json({
        data: result,
        correlationId: ctx.correlationId,
      });
    } catch (err) {
      next(err);
    }
  },
);

const CalculateTcsQuerySchema = z.object({
  client_id: z.string().uuid('Invalid client ID'),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be YYYY-MM format'),
});

/** GET /api/v1/ca/premium/ecommerce/tcs — Calculate TCS on e-commerce sales */
premiumRouter.get(
  '/ecommerce/tcs',
  requireSubscriptionFeature('F9'),
  validate({ query: CalculateTcsQuerySchema }),
  async (req, res, next) => {
    try {
      const ctx = getCaRequestContext(req);
      const result = await ecommerce.calculateTcs(ctx, String(req.query.client_id), String(req.query.period));

      res.json({
        data: result,
        correlationId: ctx.correlationId,
      });
    } catch (err) {
      next(err);
    }
  },
);

const ReconcileTcsCreditsQuerySchema = z.object({
  client_id: z.string().uuid('Invalid client ID'),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be YYYY-MM format'),
});

/** GET /api/v1/ca/premium/ecommerce/tcs-credits — Reconcile TCS credits */
premiumRouter.get(
  '/ecommerce/tcs-credits',
  requireSubscriptionFeature('F9'),
  validate({ query: ReconcileTcsCreditsQuerySchema }),
  async (req, res, next) => {
    try {
      const ctx = getCaRequestContext(req);
      const result = await ecommerce.reconcileTcsCredits(
        ctx,
        String(req.query.client_id),
        String(req.query.period),
      );

      res.json({
        data: result,
        correlationId: ctx.correlationId,
      });
    } catch (err) {
      next(err);
    }
  },
);

const GenerateMarketplaceReportQuerySchema = z.object({
  client_id: z.string().uuid('Invalid client ID'),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be YYYY-MM format'),
});

/** GET /api/v1/ca/premium/ecommerce/report — Generate marketplace analytics */
premiumRouter.get(
  '/ecommerce/report',
  requireSubscriptionFeature('F9'),
  validate({ query: GenerateMarketplaceReportQuerySchema }),
  async (req, res, next) => {
    try {
      const ctx = getCaRequestContext(req);
      const result = await ecommerce.generateMarketplaceReport(
        ctx,
        String(req.query.client_id),
        String(req.query.period),
      );

      res.json({
        data: result,
        count: result.length,
        correlationId: ctx.correlationId,
      });
    } catch (err) {
      next(err);
    }
  },
);

/** GET /api/v1/ca/premium/ecommerce/dashboard — E-commerce dashboard */
premiumRouter.get(
  '/ecommerce/dashboard',
  requireSubscriptionFeature('F9'),
  async (req, res, next) => {
    try {
      const ctx = getCaRequestContext(req);
      const result = await ecommerce.ecommerceDashboard(ctx);

      res.json({
        data: result,
        correlationId: ctx.correlationId,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * CA9: CA Subscription routes — List tiers, features, upgrade
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { caTenantContext, getCaRequestContext } from '../../middleware/ca-tenant-context.js';
import { validate } from '../../middleware/validate.js';
import { z } from 'zod';

export const subscriptionRouter = Router();

// All subscription routes require auth + CA tenant context
subscriptionRouter.use(authenticate, caTenantContext);

const UpgradeRequestSchema = z.object({
  target_tier: z.enum(['professional', 'enterprise']),
  reason: z.string().optional(),
});

/** GET /api/v1/ca/subscription/tiers — List all available tiers */
subscriptionRouter.get('/tiers', async (req, res, next) => {
  try {
    const ctx = getCaRequestContext(req);
    // TODO: Implement list tiers service
    res.json({
      data: [
        {
          id: 'tier-trial',
          name: 'Trial',
          price_monthly: 0,
          price_yearly: 0,
          billing_period: 'monthly',
          features: [
            { id: 'f1', name: 'Up to 5 clients', included: true },
            { id: 'f2', name: 'Basic compliance tracking', included: true },
            { id: 'f3', name: 'Manual document requests', included: true },
            { id: 'f4', name: 'WhatsApp integration', included: false },
            { id: 'f5', name: 'Auto-reconciliation', included: false },
            { id: 'f6', name: 'Advanced analytics', included: false },
            { id: 'f7', name: 'Priority support', included: false },
          ],
          clients_limit: 5,
          support_level: 'email',
          description: 'Get started free for 30 days',
        },
        {
          id: 'tier-pro',
          name: 'Professional',
          price_monthly: 9999,
          price_yearly: 99990,
          billing_period: 'monthly',
          features: [
            { id: 'f1', name: 'Up to 50 clients', included: true },
            { id: 'f2', name: 'Basic compliance tracking', included: true },
            { id: 'f3', name: 'Manual document requests', included: true },
            { id: 'f4', name: 'WhatsApp integration', included: true },
            { id: 'f5', name: 'Auto-reconciliation', included: true },
            { id: 'f6', name: 'Advanced analytics', included: false },
            { id: 'f7', name: 'Priority support', included: false },
          ],
          clients_limit: 50,
          support_level: 'email',
          description: 'Perfect for growing CA firms',
          current: ctx.subscriptionTier === 'professional',
        },
        {
          id: 'tier-enterprise',
          name: 'Enterprise',
          price_monthly: null,
          price_yearly: null,
          billing_period: 'custom',
          features: [
            { id: 'f1', name: 'Unlimited clients', included: true },
            { id: 'f2', name: 'Basic compliance tracking', included: true },
            { id: 'f3', name: 'Manual document requests', included: true },
            { id: 'f4', name: 'WhatsApp integration', included: true },
            { id: 'f5', name: 'Auto-reconciliation', included: true },
            { id: 'f6', name: 'Advanced analytics', included: true },
            { id: 'f7', name: 'Priority support', included: true },
          ],
          clients_limit: -1,
          support_level: 'phone',
          description: 'Custom solutions for large firms',
          current: ctx.subscriptionTier === 'enterprise',
        },
      ],
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/v1/ca/subscription/features — Get features for current tier */
subscriptionRouter.get('/features', async (req, res, next) => {
  try {
    const ctx = getCaRequestContext(req);
    // TODO: Implement features service
    const tierFeatures: Record<string, Record<string, boolean>> = {
      trial: {
        basic_compliance: true,
        gst_filing: true,
        tds_management: true,
        whatsapp_integration: false,
        auto_reconciliation: false,
        advanced_analytics: false,
        priority_support: false,
        bulk_operations: false,
        custom_reports: false,
        api_access: false,
      },
      pro: {
        basic_compliance: true,
        gst_filing: true,
        tds_management: true,
        whatsapp_integration: true,
        auto_reconciliation: true,
        advanced_analytics: false,
        priority_support: false,
        bulk_operations: true,
        custom_reports: false,
        api_access: false,
      },
      enterprise: {
        basic_compliance: true,
        gst_filing: true,
        tds_management: true,
        whatsapp_integration: true,
        auto_reconciliation: true,
        advanced_analytics: true,
        priority_support: true,
        bulk_operations: true,
        custom_reports: true,
        api_access: true,
      },
    };

    res.json({
      data: {
        tier: ctx.subscriptionTier,
        features: tierFeatures[ctx.subscriptionTier] || tierFeatures.trial,
      },
    });
  } catch (err) {
    next(err);
  }
});

/** POST /api/v1/ca/subscription/upgrade — Request tier upgrade */
subscriptionRouter.post(
  '/upgrade',
  validate({ body: UpgradeRequestSchema }),
  async (req, res, next) => {
    try {
      const ctx = getCaRequestContext(req);
      // TODO: Implement upgrade request service
      res.status(202).json({
        data: {
          request_id: 'upgrade-1',
          firm_id: ctx.caFirmId,
          current_tier: ctx.subscriptionTier,
          requested_tier: req.body.target_tier,
          status: 'pending_review',
          reason: req.body.reason || '',
          requested_at: new Date().toISOString(),
          estimated_approval: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

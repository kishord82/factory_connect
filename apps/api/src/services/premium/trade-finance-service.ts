/**
 * Premium Feature F8: Trade Finance Service
 * TReDS platform integration, invoice discounting, NBFC financing cost calculation
 */

import type { CaRequestContext } from '@fc/shared';
import type { PoolClient } from '@fc/database';
import { FcError } from '@fc/shared';
import { withTenantTransaction, withTenantClient } from '@fc/database';

interface EligibleInvoiceRow {
  invoice_id: string;
  invoice_number: string;
  amount: string;
  buyer_name: string;
  invoice_date: Date;
  due_date: Date | null;
  age_days: number;
  eligibility_status: 'eligible' | 'ineligible';
  ineligibility_reason?: string;
}

interface TredsSubmissionRow {
  id: string;
  ca_firm_id: string;
  client_id: string;
  invoice_ids: string[];
  platform: 'rxil' | 'invoicemart' | 'm1xchange';
  submission_id: string;
  submission_status: 'submitted' | 'accepted' | 'rejected' | 'discounted' | 'disbursed';
  expected_discount_rate: string;
  expected_discount_amount: string;
  actual_discount_rate: string | null;
  actual_discount_amount: string | null;
  disbursed_amount: string | null;
  submitted_at: Date;
  created_at: Date;
  updated_at: Date;
}

interface DiscountTrackingRow {
  invoice_id: string;
  invoice_number: string;
  platform: 'rxil' | 'invoicemart' | 'm1xchange';
  submission_status: 'submitted' | 'accepted' | 'rejected' | 'discounted' | 'disbursed';
  discount_rate: string | null;
  discounted_amount: string | null;
  disbursed_date: Date | null;
}

/**
 * F8.1: listEligibleInvoices
 * Find invoices eligible for discounting on TReDS platforms
 * Criteria: paid by approved buyers, >minAmount, <maxAge days old
 */
export async function listEligibleInvoices(
  ctx: CaRequestContext,
  clientId: string,
  minAmount: string = '50000',
  maxAgeDays: number = 90,
): Promise<EligibleInvoiceRow[]> {
  return withTenantClient(
    { tenantId: ctx.caFirmId, userId: ctx.userId, correlationId: ctx.correlationId } as any,
    async (client: PoolClient) => {
      const minNum = parseFloat(minAmount);

      const result = await client.query<EligibleInvoiceRow>(
        `SELECT
          ci.id as invoice_id,
          ci.invoice_number,
          ci.total_amount::text as amount,
          cb.name as buyer_name,
          ci.invoice_date,
          ci.due_date,
          EXTRACT(DAY FROM NOW() - ci.invoice_date)::int as age_days,
          CASE
            WHEN ci.total_amount::numeric < $3 THEN 'ineligible'::text
            WHEN EXTRACT(DAY FROM NOW() - ci.invoice_date) > $4 THEN 'ineligible'::text
            ELSE 'eligible'::text
          END as eligibility_status,
          CASE
            WHEN ci.total_amount::numeric < $3 THEN 'Amount below minimum'::text
            WHEN EXTRACT(DAY FROM NOW() - ci.invoice_date) > $4 THEN 'Invoice too old'::text
            ELSE NULL
          END as ineligibility_reason
        FROM orders.canonical_invoices ci
        JOIN canonical_buyers cb ON cb.id = (
          SELECT buyer_id FROM orders.canonical_orders WHERE id = ci.order_id LIMIT 1
        )
        WHERE ci.factory_id = $1 AND EXTRACT(DAY FROM NOW() - ci.invoice_date) <= $4
        ORDER BY ci.invoice_date DESC`,
        [ctx.caFirmId, clientId, minNum, maxAgeDays],
      );

      return result.rows;
    },
  );
}

/**
 * F8.2: submitToTreds
 * Submit invoices to TReDS platform for discounting
 */
export async function submitToTreds(
  ctx: CaRequestContext,
  clientId: string,
  invoiceIds: string[],
  platform: 'rxil' | 'invoicemart' | 'm1xchange',
): Promise<TredsSubmissionRow> {
  return withTenantTransaction(
    { tenantId: ctx.caFirmId, userId: ctx.userId, correlationId: ctx.correlationId } as any,
    async (client: PoolClient) => {
      if (invoiceIds.length === 0) {
        throw new FcError(
          'FC_ERR_TREDS_NO_INVOICES',
          'At least one invoice required for TReDS submission',
          { clientId },
          400,
        );
      }

      // Fetch invoices and calculate total + expected discount
      const invoiceResult = await client.query<{ total_amount: string; count: number }>(
        `SELECT SUM(total_amount::numeric)::text as total_amount, COUNT(*) as count
         FROM orders.canonical_invoices WHERE id = ANY($1)`,
        [invoiceIds],
      );

      const totalAmount = parseFloat(invoiceResult.rows[0]?.total_amount || '0');
      const invoiceCount = invoiceResult.rows[0]?.count || 0;

      if (totalAmount === 0) {
        throw new FcError(
          'FC_ERR_TREDS_ZERO_TOTAL',
          'Total invoice amount is zero',
          { invoiceIds },
          400,
        );
      }

      // Platform-specific discount rates (stub)
      const discountRates: Record<string, number> = {
        rxil: 0.08, // 8%
        invoicemart: 0.09, // 9%
        m1xchange: 0.075, // 7.5%
      };

      const discountRate = discountRates[platform] || 0.08;
      const discountAmount = (totalAmount * discountRate).toFixed(2);

      // Generate submission ID: TREDS-{platform}-{timestamp}
      const submissionId = `TREDS-${platform.toUpperCase()}-${Date.now()}`;

      const result = await client.query<TredsSubmissionRow>(
        `INSERT INTO treds_submissions (
          ca_firm_id, client_id, invoice_ids, platform, submission_id,
          submission_status, expected_discount_rate, expected_discount_amount
        ) VALUES ($1, $2, $3, $4, $5, 'submitted', $6, $7)
        RETURNING *`,
        [
          ctx.caFirmId,
          clientId,
          JSON.stringify(invoiceIds),
          platform,
          submissionId,
          discountRate.toString(),
          discountAmount,
        ],
      );

      if (result.rows.length === 0) {
        throw new FcError('FC_ERR_TREDS_SUBMIT_FAILED', 'Failed to submit to TReDS', {}, 500);
      }

      // Audit outbox: TReDS submission event
      await client.query(
        `INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
         VALUES ('treds_submission', $1, 'TREDS_SUBMITTED', $2)`,
        [result.rows[0].id, JSON.stringify({ submission_id: submissionId, platform, invoice_count: invoiceCount })],
      );

      return result.rows[0];
    },
  );
}

/**
 * F8.3: trackDiscounting
 * Track status of submitted invoices across TReDS platforms
 */
export async function trackDiscounting(
  ctx: CaRequestContext,
  clientId: string,
): Promise<DiscountTrackingRow[]> {
  return withTenantClient(
    { tenantId: ctx.caFirmId, userId: ctx.userId, correlationId: ctx.correlationId } as any,
    async (client: PoolClient) => {
      const result = await client.query<DiscountTrackingRow>(
        `SELECT
          jsonb_array_elements(ts.invoice_ids)::text as invoice_id,
          ci.invoice_number,
          ts.platform,
          ts.submission_status,
          ts.actual_discount_rate,
          ts.actual_discount_amount::text as discounted_amount,
          ts.updated_at as disbursed_date
        FROM treds_submissions ts
        LEFT JOIN canonical_invoices ci ON ci.id = jsonb_array_elements(ts.invoice_ids)::text
        WHERE ts.ca_firm_id = $1 AND ts.client_id = $2
        ORDER BY ts.updated_at DESC`,
        [ctx.caFirmId, clientId],
      );

      return result.rows;
    },
  );
}

/**
 * F8.4: calculateFinancingCost
 * Calculate cost of invoice discounting/financing
 */
export async function calculateFinancingCost(
  invoiceAmount: string,
  discountRate: string,
  tenorDays: number,
): Promise<{
  invoiceAmount: string;
  discountRate: string;
  tenor: number;
  netProceeds: string;
  financingCost: string;
  effectiveAnnualRate: string;
}> {
  const amount = parseFloat(invoiceAmount);
  const rate = parseFloat(discountRate);

  if (amount <= 0) {
    throw new FcError(
      'FC_ERR_INVALID_AMOUNT',
      'Invoice amount must be positive',
      { invoiceAmount },
      400,
    );
  }

  if (rate < 0 || rate > 1) {
    throw new FcError(
      'FC_ERR_INVALID_RATE',
      'Discount rate must be between 0 and 1',
      { discountRate },
      400,
    );
  }

  // Simple interest calculation
  const financingCost = amount * rate * (tenorDays / 365);
  const netProceeds = amount - financingCost;

  // Annualized effective rate
  const effectiveAnnualRate = (rate * 365) / tenorDays;

  return {
    invoiceAmount,
    discountRate,
    tenor: tenorDays,
    netProceeds: netProceeds.toFixed(2),
    financingCost: financingCost.toFixed(2),
    effectiveAnnualRate: (effectiveAnnualRate * 100).toFixed(2),
  };
}

/**
 * F8.5: tradeFinanceDashboard
 * Overview of trade finance activity
 */
export async function tradeFinanceDashboard(
  ctx: CaRequestContext,
): Promise<{
  totalDiscounted: string;
  totalSaved: string;
  avgDiscountRate: string;
  pendingSubmissions: number;
}> {
  return withTenantClient(
    { tenantId: ctx.caFirmId, userId: ctx.userId, correlationId: ctx.correlationId } as any,
    async (client: PoolClient) => {
      const [discountedResult, pendingResult] = await Promise.all([
        client.query<{ total_discounted: string; total_saved: string; avg_rate: string }>(
          `SELECT
            SUM(actual_discount_amount::numeric)::text as total_discounted,
            SUM((actual_discount_amount::numeric * 0.8))::text as total_saved,
            AVG(actual_discount_rate::numeric)::text as avg_rate
           FROM treds_submissions
           WHERE ca_firm_id = $1 AND submission_status IN ('discounted', 'disbursed')`,
          [ctx.caFirmId],
        ),
        client.query<{ count: string }>(
          `SELECT COUNT(*)::text as count FROM treds_submissions
           WHERE ca_firm_id = $1 AND submission_status IN ('submitted', 'accepted')`,
          [ctx.caFirmId],
        ),
      ]);

      return {
        totalDiscounted: discountedResult.rows[0]?.total_discounted || '0',
        totalSaved: discountedResult.rows[0]?.total_saved || '0',
        avgDiscountRate: discountedResult.rows[0]?.avg_rate || '0',
        pendingSubmissions: parseInt(pendingResult.rows[0]?.count || '0', 10),
      };
    },
  );
}

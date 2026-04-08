/**
 * Premium Feature F9: E-commerce Seller Compliance Service
 * Multi-marketplace reconciliation, TCS calculation, credit matching
 */

import type { CaRequestContext } from '@fc/shared';
import type { PoolClient } from '@fc/database';
import { FcError } from '@fc/shared';
import { withTenantTransaction, withTenantClient } from '@fc/database';

interface ReconciliationSessionRow {
  id: string;
  ca_firm_id: string;
  client_id: string;
  platform: 'amazon' | 'flipkart' | 'meesho';
  period: string; // YYYY-MM
  session_status: 'in_progress' | 'completed' | 'failed';
  total_orders: number;
  total_sales_amount: string;
  total_commissions: string;
  total_returns: string;
  tcs_rate: string;
  tcs_collected: string;
  discrepancies: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

interface TcsCalculationRow {
  ca_firm_id: string;
  client_id: string;
  period: string;
  total_sales: string;
  tcs_rate: string;
  tcs_amount: string;
  already_collected: string;
  shortfall: string;
}


interface MarketplaceReportRow {
  platform: 'amazon' | 'flipkart' | 'meesho';
  period: string;
  total_sales: string;
  total_returns: string;
  return_percentage: string;
  total_commissions: string;
  commission_rate: string;
  tcs_collected: string;
  net_payable: string;
}

/**
 * F9.1: reconcileMarketplace
 * Match marketplace settlement payments with order records
 * Identifies commissions, returns, TCS differences
 */
export async function reconcileMarketplace(
  ctx: CaRequestContext,
  clientId: string,
  platform: 'amazon' | 'flipkart' | 'meesho',
  periodData: {
    period: string; // YYYY-MM
    settlementAmount: string;
    orderCount: number;
    commissionRate: string;
  },
): Promise<ReconciliationSessionRow> {
  return withTenantTransaction(
    { tenantId: ctx.caFirmId, userId: ctx.userId, correlationId: ctx.correlationId } as any,
    async (client: PoolClient) => {
      // Validate period format
      if (!/^\d{4}-\d{2}$/.test(periodData.period)) {
        throw new FcError(
          'FC_ERR_INVALID_PERIOD',
          'Period must be YYYY-MM format',
          { period: periodData.period },
          400,
        );
      }

      // Query order data for period from marketplace orders table
      const orderResult = await client.query<{
        order_count: number;
        total_sales: string;
        total_returns: string;
      }>(
        `SELECT
          COUNT(*) as order_count,
          SUM(sale_amount::numeric)::text as total_sales,
          SUM(COALESCE(return_amount::numeric, 0))::text as total_returns
         FROM marketplace_orders
         WHERE ca_firm_id = $1 AND client_id = $2 AND platform = $3
         AND TO_CHAR(order_date, 'YYYY-MM') = $4`,
        [ctx.caFirmId, clientId, platform, periodData.period],
      );

      const totalSales = orderResult.rows[0]?.total_sales || '0';
      const totalReturns = orderResult.rows[0]?.total_returns || '0';
      const salesNum = parseFloat(totalSales);

      // Calculate commissions
      const commRateNum = parseFloat(periodData.commissionRate);
      const totalCommissions = (salesNum * commRateNum).toFixed(2);

      // Calculate TCS (Tax Collected at Source) on e-commerce: 1% standard
      const tcsRate = '0.01'; // 1%
      const tcsAmount = (salesNum * 0.01).toFixed(2);

      // Calculate discrepancies
      const discrepancies = {
        settlement_vs_orders: (parseFloat(periodData.settlementAmount) - salesNum).toFixed(2),
        commissions_calculated: totalCommissions,
        tcs_due: tcsAmount,
      };

      const result = await client.query<ReconciliationSessionRow>(
        `INSERT INTO marketplace_reconciliation_sessions (
          ca_firm_id, client_id, platform, period, session_status,
          total_orders, total_sales_amount, total_commissions, total_returns,
          tcs_rate, tcs_collected, discrepancies
        ) VALUES ($1, $2, $3, $4, 'completed', $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          ctx.caFirmId,
          clientId,
          platform,
          periodData.period,
          orderResult.rows[0]?.order_count || 0,
          totalSales,
          totalCommissions,
          totalReturns,
          tcsRate,
          tcsAmount,
          JSON.stringify(discrepancies),
        ],
      );

      if (result.rows.length === 0) {
        throw new FcError('FC_ERR_RECONCILIATION_FAILED', 'Failed to create reconciliation session', {}, 500);
      }

      // Outbox event for reconciliation completion
      await client.query(
        `INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload)
         VALUES ('marketplace_reconciliation', $1, 'RECONCILIATION_COMPLETED', $2)`,
        [
          result.rows[0].id,
          JSON.stringify({
            platform,
            period: periodData.period,
            total_orders: orderResult.rows[0]?.order_count || 0,
          }),
        ],
      );

      return result.rows[0];
    },
  );
}

/**
 * F9.2: calculateTcs
 * Calculate TCS (Tax Collected at Source) on e-commerce sales
 * Standard rate: 1% for e-commerce seller sales
 */
export async function calculateTcs(
  ctx: CaRequestContext,
  clientId: string,
  period: string, // YYYY-MM
): Promise<TcsCalculationRow> {
  return withTenantClient(
    { tenantId: ctx.caFirmId, userId: ctx.userId, correlationId: ctx.correlationId } as any,
    async (client: PoolClient) => {
      // Validate period
      if (!/^\d{4}-\d{2}$/.test(period)) {
        throw new FcError(
          'FC_ERR_INVALID_PERIOD',
          'Period must be YYYY-MM format',
          { period },
          400,
        );
      }

      // Sum all e-commerce sales for the period
      const result = await client.query<{ total_sales: string; total_tcs: string }>(
        `SELECT
          SUM(sale_amount::numeric)::text as total_sales,
          SUM(sale_amount::numeric * 0.01)::text as total_tcs
         FROM marketplace_orders
         WHERE ca_firm_id = $1 AND client_id = $2
         AND TO_CHAR(order_date, 'YYYY-MM') = $3`,
        [ctx.caFirmId, clientId, period],
      );

      const totalSales = parseFloat(result.rows[0]?.total_sales || '0');
      const totalTcs = parseFloat(result.rows[0]?.total_tcs || '0');

      // Query how much was already collected by marketplaces
      const collectedResult = await client.query<{ total_collected: string }>(
        `SELECT SUM(tcs_collected::numeric)::text as total_collected
         FROM marketplace_orders
         WHERE ca_firm_id = $1 AND client_id = $2
         AND TO_CHAR(order_date, 'YYYY-MM') = $3`,
        [ctx.caFirmId, clientId, period],
      );

      const alreadyCollected = parseFloat(collectedResult.rows[0]?.total_collected || '0');
      const shortfall = totalTcs - alreadyCollected;

      return {
        ca_firm_id: ctx.caFirmId,
        client_id: clientId,
        period,
        total_sales: totalSales.toFixed(2),
        tcs_rate: '0.01', // 1%
        tcs_amount: totalTcs.toFixed(2),
        already_collected: alreadyCollected.toFixed(2),
        shortfall: shortfall.toFixed(2),
      };
    },
  );
}

/**
 * F9.3: reconcileTcsCredits
 * Match TCS claimed in 26AS vs credits available in AIS
 * Identifies mismatches and missing credits
 */
export async function reconcileTcsCredits(
  ctx: CaRequestContext,
  clientId: string,
  period: string, // YYYY-MM
): Promise<{
  claimed: string;
  available: string;
  matched: number;
  unmatched: number;
  mismatch: number;
}> {
  return withTenantClient(
    { tenantId: ctx.caFirmId, userId: ctx.userId, correlationId: ctx.correlationId } as any,
    async (client: PoolClient) => {
      // Validate period
      if (!/^\d{4}-\d{2}$/.test(period)) {
        throw new FcError(
          'FC_ERR_INVALID_PERIOD',
          'Period must be YYYY-MM format',
          { period },
          400,
        );
      }

      // Query TCS credits from tcs_certificates table
      const creditsResult = await client.query<{
        total_claimed: string;
        total_available: string;
        matched: number;
        unmatched: number;
        mismatches: number;
      }>(
        `SELECT
          SUM(CASE WHEN claimed_in_26as THEN amount::numeric ELSE 0 END)::text as total_claimed,
          SUM(CASE WHEN available_in_ais THEN amount::numeric ELSE 0 END)::text as total_available,
          SUM(CASE WHEN match_status = 'matched' THEN 1 ELSE 0 END)::int as matched,
          SUM(CASE WHEN match_status = 'unmatched' THEN 1 ELSE 0 END)::int as unmatched,
          SUM(CASE WHEN match_status = 'mismatch' THEN 1 ELSE 0 END)::int as mismatches
         FROM tcs_certificates
         WHERE ca_firm_id = $1 AND client_id = $2
         AND TO_CHAR(receipt_date, 'YYYY-MM') = $3`,
        [ctx.caFirmId, clientId, period],
      );

      const row = creditsResult.rows[0];

      return {
        claimed: row?.total_claimed || '0',
        available: row?.total_available || '0',
        matched: row?.matched || 0,
        unmatched: row?.unmatched || 0,
        mismatch: row?.mismatches || 0,
      };
    },
  );
}

/**
 * F9.4: generateMarketplaceReport
 * Combined marketplace analytics per platform
 */
export async function generateMarketplaceReport(
  ctx: CaRequestContext,
  clientId: string,
  period: string, // YYYY-MM
): Promise<MarketplaceReportRow[]> {
  return withTenantClient(
    { tenantId: ctx.caFirmId, userId: ctx.userId, correlationId: ctx.correlationId } as any,
    async (client: PoolClient) => {
      // Validate period
      if (!/^\d{4}-\d{2}$/.test(period)) {
        throw new FcError(
          'FC_ERR_INVALID_PERIOD',
          'Period must be YYYY-MM format',
          { period },
          400,
        );
      }

      const result = await client.query<MarketplaceReportRow>(
        `SELECT
          platform,
          $3::text as period,
          SUM(sale_amount::numeric)::text as total_sales,
          SUM(COALESCE(return_amount::numeric, 0))::text as total_returns,
          (SUM(COALESCE(return_amount::numeric, 0)) / NULLIF(SUM(sale_amount::numeric), 0) * 100)::text as return_percentage,
          SUM(commission_amount::numeric)::text as total_commissions,
          (SUM(commission_amount::numeric) / NULLIF(SUM(sale_amount::numeric), 0) * 100)::text as commission_rate,
          SUM(tcs_collected::numeric)::text as tcs_collected,
          (SUM(sale_amount::numeric) - SUM(COALESCE(return_amount::numeric, 0)) - SUM(commission_amount::numeric) - SUM(tcs_collected::numeric))::text as net_payable
         FROM marketplace_orders
         WHERE ca_firm_id = $1 AND client_id = $2
         AND TO_CHAR(order_date, 'YYYY-MM') = $3
         GROUP BY platform
         ORDER BY platform`,
        [ctx.caFirmId, clientId, period],
      );

      return result.rows;
    },
  );
}

/**
 * F9.5: ecommerceDashboard
 * Multi-marketplace overview
 */
export async function ecommerceDashboard(
  ctx: CaRequestContext,
): Promise<{
  totalSellers: number;
  totalGmv: string;
  tcsCollected: string;
  reconPending: number;
}> {
  return withTenantClient(
    { tenantId: ctx.caFirmId, userId: ctx.userId, correlationId: ctx.correlationId } as any,
    async (client: PoolClient) => {
      const [sellersResult, gmvResult, tcsResult, reconResult] = await Promise.all([
        client.query<{ count: string }>(
          'SELECT COUNT(DISTINCT client_id)::text as count FROM marketplace_orders WHERE ca_firm_id = $1',
          [ctx.caFirmId],
        ),
        client.query<{ total: string }>(
          'SELECT SUM(sale_amount::numeric)::text as total FROM marketplace_orders WHERE ca_firm_id = $1',
          [ctx.caFirmId],
        ),
        client.query<{ total: string }>(
          'SELECT SUM(tcs_collected::numeric)::text as total FROM marketplace_orders WHERE ca_firm_id = $1',
          [ctx.caFirmId],
        ),
        client.query<{ count: string }>(
          "SELECT COUNT(*)::text as count FROM marketplace_reconciliation_sessions WHERE ca_firm_id = $1 AND session_status IN ('in_progress', 'failed')",
          [ctx.caFirmId],
        ),
      ]);

      return {
        totalSellers: parseInt(sellersResult.rows[0]?.count || '0', 10),
        totalGmv: gmvResult.rows[0]?.total || '0',
        tcsCollected: tcsResult.rows[0]?.total || '0',
        reconPending: parseInt(reconResult.rows[0]?.count || '0', 10),
      };
    },
  );
}

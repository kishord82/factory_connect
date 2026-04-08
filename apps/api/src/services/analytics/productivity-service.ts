/**
 * F14: Staff Productivity Dashboard Service
 * Tracks activity, calculates productivity metrics, analyzes profitability
 */

import type { CaRequestContext } from '@fc/shared';

import type { PoolClient } from '@fc/database';
import { withTenantTransaction, withTenantClient, insertOne, findOne, findMany } from '@fc/database';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface StaffActivityLog {
  id: string;
  ca_firm_id: string;
  staff_id: string;
  client_id: string;
  activity_type: string;
  duration_minutes: number;
  description: string | null;
  activity_date: Date;
  created_at: Date;
}

export interface StaffProductivity {
  staffId: string;
  totalHours: number;
  clientCount: number;
  activitiesByType: Record<string, number>;
  avgTimePerClient: number;
  filingsPrepared: number;
  exceptionsResolved: number;
}

export interface ClientProfitability {
  clientId: string;
  totalTimeMinutes: number;
  estimatedCost: number;
  subscriptionRevenue: number;
  profitability: number;
  profitabilityRatio: number;
  recommendation: string;
}

export interface FirmAnalytics {
  totalClients: number;
  activeClients: number;
  filingVolume: number;
  exceptionRate: number;
  avgHealthScore: number;
  revenuePerClient: number;
}

// ═══════════════════════════════════════════════════════════════════
// LOG ACTIVITY
// ═══════════════════════════════════════════════════════════════════

export async function logActivity(
  ctx: CaRequestContext,
  staffId: string,
  clientId: string,
  activityType: string,
  durationMinutes: number,
  description: string | null,
  date: Date,
): Promise<StaffActivityLog> {
  return withTenantTransaction(ctx as any, async (client: PoolClient) => {
    const result = await insertOne<StaffActivityLog>(
      client,
      `INSERT INTO ca_activity_logs (
        ca_firm_id, staff_id, client_id, activity_type,
        duration_minutes, description, activity_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        ctx.caFirmId,
        staffId,
        clientId,
        activityType,
        durationMinutes,
        description,
        date,
      ],
    );

    return result;
  });
}

// ═══════════════════════════════════════════════════════════════════
// GET STAFF PRODUCTIVITY
// ═══════════════════════════════════════════════════════════════════

export async function getStaffProductivity(
  ctx: CaRequestContext,
  staffId: string,
  dateRange: { start: Date; end: Date },
): Promise<StaffProductivity> {
  return withTenantClient(ctx as any, async (client: PoolClient) => {
    // Total hours and client count
    const summaryStats = await findOne<{
      total_minutes: number;
      client_count: number;
    }>(
      client,
      `SELECT
        SUM(duration_minutes) as total_minutes,
        COUNT(DISTINCT client_id) as client_count
       FROM ca_activity_logs
       WHERE ca_firm_id = $1 AND staff_id = $2
       AND activity_date >= $3 AND activity_date <= $4`,
      [ctx.caFirmId, staffId, dateRange.start, dateRange.end],
    );

    const totalMinutes = summaryStats?.total_minutes ?? 0;
    const clientCount = summaryStats?.client_count ?? 0;
    const avgTimePerClient = clientCount > 0 ? totalMinutes / clientCount : 0;

    // Activities by type
    const activitiesByTypeRows = await findMany<{
      activity_type: string;
      count: number;
    }>(
      client,
      `SELECT activity_type, COUNT(*) as count
       FROM ca_activity_logs
       WHERE ca_firm_id = $1 AND staff_id = $2
       AND activity_date >= $3 AND activity_date <= $4
       GROUP BY activity_type`,
      [ctx.caFirmId, staffId, dateRange.start, dateRange.end],
    );

    const activitiesByType: Record<string, number> = {};
    for (const row of activitiesByTypeRows) {
      activitiesByType[row.activity_type] = row.count;
    }

    // Filings prepared and exceptions resolved
    const filingStats = await findOne<{
      filing_count: number;
      exception_count: number;
    }>(
      client,
      `SELECT
        COUNT(CASE WHEN activity_type = 'filing_preparation' THEN 1 END) as filing_count,
        COUNT(CASE WHEN activity_type = 'exception_resolution' THEN 1 END) as exception_count
       FROM ca_activity_logs
       WHERE ca_firm_id = $1 AND staff_id = $2
       AND activity_date >= $3 AND activity_date <= $4`,
      [ctx.caFirmId, staffId, dateRange.start, dateRange.end],
    );

    return {
      staffId,
      totalHours: Math.round((totalMinutes / 60) * 100) / 100,
      clientCount,
      activitiesByType,
      avgTimePerClient: Math.round(avgTimePerClient * 100) / 100,
      filingsPrepared: filingStats?.filing_count ?? 0,
      exceptionsResolved: filingStats?.exception_count ?? 0,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
// GET TEAM PRODUCTIVITY
// ═══════════════════════════════════════════════════════════════════

export async function getTeamProductivity(
  ctx: CaRequestContext,
  dateRange: { start: Date; end: Date },
): Promise<StaffProductivity[]> {
  return withTenantClient(ctx as any, async (client: PoolClient) => {
    const staffMembers = await findMany<{ id: string }>(
      client,
      `SELECT DISTINCT staff_id as id FROM ca_activity_logs
       WHERE ca_firm_id = $1`,
      [ctx.caFirmId],
    );

    const results: StaffProductivity[] = [];
    for (const staff of staffMembers) {
      const productivity = await getStaffProductivity(ctx, staff.id, dateRange);
      results.push(productivity);
    }

    return results;
  });
}

// ═══════════════════════════════════════════════════════════════════
// GET CLIENT PROFITABILITY
// ═══════════════════════════════════════════════════════════════════

export async function getClientProfitability(
  ctx: CaRequestContext,
  clientId: string,
): Promise<ClientProfitability> {
  return withTenantClient(ctx as any, async (client: PoolClient) => {
    // Total time spent
    const timeStats = await findOne<{ total_minutes: number }>(
      client,
      `SELECT SUM(duration_minutes) as total_minutes
       FROM ca_activity_logs
       WHERE ca_firm_id = $1 AND client_id = $2`,
      [ctx.caFirmId, clientId],
    );

    const totalMinutes = timeStats?.total_minutes ?? 0;

    // Hourly cost for firm (assume $150/hr average)
    const hourlyRate = 150;
    const estimatedCost = (totalMinutes / 60) * hourlyRate;

    // Subscription revenue
    const subscription = await findOne<{
      annual_price: number;
    }>(
      client,
      `SELECT annual_price FROM ca_subscriptions
       WHERE ca_firm_id = $1 AND client_id = $2 AND status = 'active'
       LIMIT 1`,
      [ctx.caFirmId, clientId],
    );

    const subscriptionRevenue = subscription?.annual_price ?? 0;

    const profitability = subscriptionRevenue - estimatedCost;
    const profitabilityRatio =
      subscriptionRevenue > 0 ? ((profitability / subscriptionRevenue) * 100) : 0;

    let recommendation = 'Profitable';
    if (profitabilityRatio < 0) {
      recommendation = 'Loss-making: Review scope or pricing';
    } else if (profitabilityRatio < 20) {
      recommendation = 'Marginal: Consider automation or upsell';
    } else if (profitabilityRatio > 60) {
      recommendation = 'Highly profitable: Candidate for premium features';
    }

    return {
      clientId,
      totalTimeMinutes: totalMinutes,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      subscriptionRevenue,
      profitability: Math.round(profitability * 100) / 100,
      profitabilityRatio: Math.round(profitabilityRatio * 100) / 100,
      recommendation,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
// GET FIRM ANALYTICS
// ═══════════════════════════════════════════════════════════════════

export async function getFirmAnalytics(
  ctx: CaRequestContext,
  period: { start: Date; end: Date },
): Promise<FirmAnalytics> {
  return withTenantClient(ctx as any, async (client: PoolClient) => {
    // Total and active clients
    const clientStats = await findOne<{
      total_clients: number;
      active_clients: number;
    }>(
      client,
      `SELECT
        COUNT(*) as total_clients,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_clients
       FROM ca_clients
       WHERE ca_firm_id = $1`,
      [ctx.caFirmId],
    );

    // Filing volume in period
    const filingStats = await findOne<{ filing_count: number }>(
      client,
      `SELECT COUNT(*) as filing_count
       FROM ca_filings
       WHERE ca_firm_id = $1
       AND created_at >= $2 AND created_at <= $3`,
      [ctx.caFirmId, period.start, period.end],
    );

    // Exception rate
    const exceptionStats = await findOne<{
      total_exceptions: number;
      total_filings: number;
    }>(
      client,
      `SELECT
        COUNT(DISTINCT ce.id) as total_exceptions,
        COUNT(DISTINCT cf.id) as total_filings
       FROM ca_exceptions ce
       LEFT JOIN ca_filings cf ON cf.id = ce.filing_id
       WHERE ce.ca_firm_id = $1
       AND cf.created_at >= $2 AND cf.created_at <= $3`,
      [ctx.caFirmId, period.start, period.end],
    );

    const exceptionRate =
      (exceptionStats?.total_filings ?? 0) > 0
        ? ((exceptionStats?.total_exceptions ?? 0) /
          (exceptionStats?.total_filings ?? 1)) *
        100
        : 0;

    // Average health score
    const healthStats = await findOne<{ avg_score: number }>(
      client,
      `SELECT AVG(overall_score) as avg_score
       FROM ca_health_scores
       WHERE ca_firm_id = $1`,
      [ctx.caFirmId],
    );

    // Revenue per client (total revenue / active clients)
    const revenueStats = await findOne<{ total_revenue: number }>(
      client,
      `SELECT COALESCE(SUM(annual_price), 0) as total_revenue
       FROM ca_subscriptions
       WHERE ca_firm_id = $1 AND status = 'active'`,
      [ctx.caFirmId],
    );

    const revenuePerClient =
      (clientStats?.active_clients ?? 0) > 0
        ? (revenueStats?.total_revenue ?? 0) /
        (clientStats?.active_clients ?? 1)
        : 0;

    return {
      totalClients: clientStats?.total_clients ?? 0,
      activeClients: clientStats?.active_clients ?? 0,
      filingVolume: filingStats?.filing_count ?? 0,
      exceptionRate: Math.round(exceptionRate * 100) / 100,
      avgHealthScore: healthStats?.avg_score ? Math.round(healthStats.avg_score * 100) / 100 : 0,
      revenuePerClient: Math.round(revenuePerClient * 100) / 100,
    };
  });
}

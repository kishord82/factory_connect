/**
 * F17: Client Health Score Service
 * AI-powered risk scoring for compliance clients
 */

import type { CaRequestContext } from '@fc/shared';
import { withTenantTransaction, withTenantClient, insertOne, findOne, findMany } from '@fc/database';
import type { PoolClient } from '@fc/database';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface ClientHealthScore {
  id: string;
  ca_firm_id: string;
  client_id: string;
  overall_score: number;
  compliance_score: number;
  financial_score: number;
  data_quality_score: number;
  responsiveness_score: number;
  risk_level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  last_calculated: Date;
  created_at: Date;
  updated_at: Date;
}

export interface HealthScoreHistory {
  scoreDate: Date;
  overall: number;
  compliance: number;
  financial: number;
  dataQuality: number;
  responsiveness: number;
}

export interface HealthDashboard {
  avgScore: number;
  distribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
    critical: number;
  };
  trends: HealthScoreHistory[];
}

// ═══════════════════════════════════════════════════════════════════
// SCORE CALCULATION
// ═══════════════════════════════════════════════════════════════════

async function calculateComplianceScore(client: PoolClient, caFirmId: string, clientId: string): Promise<number> {
  // On-time filing rate (past 6 months): 60% of compliance score
  const filingStats = await findOne<{ on_time_rate: number; late_count: number }>(
    client,
    `SELECT
      ROUND((COUNT(CASE WHEN filed_date <= due_date THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100), 2) as on_time_rate,
      COUNT(CASE WHEN filed_date > due_date THEN 1 END) as late_count
     FROM ca_filings
     WHERE ca_firm_id = $1 AND client_id = $2
     AND created_at > NOW() - INTERVAL '6 months'`,
    [caFirmId, clientId],
  );

  const onTimeRate = filingStats?.on_time_rate ?? 50;
  const filingScore = Math.min(10, (onTimeRate / 100) * 10);

  // Exception count (penalize): 40% of compliance score
  const exceptionStats = await findOne<{ critical_count: number; high_count: number; total_open: number }>(
    client,
    `SELECT
      COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count,
      COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_count,
      COUNT(*) as total_open
     FROM ca_exceptions
     WHERE ca_firm_id = $1 AND client_id = $2 AND status = 'open'`,
    [caFirmId, clientId],
  );

  let exceptionScore = 10;
  if (exceptionStats) {
    exceptionScore = Math.max(0, 10 - exceptionStats.critical_count * 2 - exceptionStats.high_count * 1);
  }

  return (filingScore * 0.6 + exceptionScore * 0.4);
}

async function calculateFinancialScore(client: PoolClient, caFirmId: string, clientId: string): Promise<number> {
  // GST return filing regularity: 50% of financial score
  const gstStats = await findOne<{ filing_rate: number }>(
    client,
    `SELECT
      ROUND((COUNT(*)::float / 12 * 100), 2) as filing_rate
     FROM ca_filings
     WHERE ca_firm_id = $1 AND client_id = $2 AND filing_type IN ('GSTR1', 'GSTR3B')
     AND created_at > NOW() - INTERVAL '1 year'`,
    [caFirmId, clientId],
  );

  const gstScore = Math.min(10, (gstStats?.filing_rate ?? 0) / 12 * 10);

  // TDS deposit timeliness: 30% of financial score
  const tdsStats = await findOne<{ on_time_rate: number }>(
    client,
    `SELECT
      ROUND((COUNT(CASE WHEN deposit_date <= due_date THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100), 2) as on_time_rate
     FROM ca_tds_records
     WHERE ca_firm_id = $1 AND client_id = $2
     AND created_at > NOW() - INTERVAL '6 months'`,
    [caFirmId, clientId],
  );

  const tdsScore = Math.min(10, ((tdsStats?.on_time_rate ?? 0) / 100) * 10);

  // Bank reconciliation match rate: 20% of financial score
  const bankReconStats = await findOne<{ match_rate: number }>(
    client,
    `SELECT
      ROUND((COUNT(CASE WHEN match_count > 0 THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100), 2) as match_rate
     FROM ca_bank_recon_sessions
     WHERE ca_firm_id = $1 AND client_id = $2`,
    [caFirmId, clientId],
  );

  const bankReconScore = Math.min(10, ((bankReconStats?.match_rate ?? 0) / 100) * 10);

  return gstScore * 0.5 + tdsScore * 0.3 + bankReconScore * 0.2;
}

async function calculateDataQualityScore(client: PoolClient, caFirmId: string, clientId: string): Promise<number> {
  // Tally extraction success rate: 50% of data quality score
  const extractionStats = await findOne<{ success_rate: number }>(
    client,
    `SELECT
      ROUND((COUNT(CASE WHEN status = 'completed' THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100), 2) as success_rate
     FROM ca_tally_extractions
     WHERE ca_firm_id = $1 AND client_id = $2
     AND created_at > NOW() - INTERVAL '3 months'`,
    [caFirmId, clientId],
  );

  const extractionScore = Math.min(10, ((extractionStats?.success_rate ?? 0) / 100) * 10);

  // Data completeness (% fields populated): 30% of data quality score
  const completenessStats = await findOne<{ completeness: number }>(
    client,
    `SELECT
      AVG(((char_length(gstin) > 0)::int + (char_length(pan) > 0)::int +
           (char_length(bank_account) > 0)::int + (char_length(ifsc) > 0)::int) * 25) as completeness
     FROM ca_clients
     WHERE ca_firm_id = $1 AND id = $2`,
    [caFirmId, clientId],
  );

  const completenessScore = Math.min(10, ((completenessStats?.completeness ?? 0) / 100) * 10);

  // Last extraction freshness: 20% of data quality score (0-5 days = 10, 30+ days = 2)
  const freshnessStats = await findOne<{ days_ago: number }>(
    client,
    `SELECT
      EXTRACT(DAY FROM NOW() - MAX(created_at)) as days_ago
     FROM ca_tally_extractions
     WHERE ca_firm_id = $1 AND client_id = $2`,
    [caFirmId, clientId],
  );

  let freshnessScore = 2;
  if (freshnessStats) {
    if (freshnessStats.days_ago <= 5) {
      freshnessScore = 10;
    } else if (freshnessStats.days_ago <= 15) {
      freshnessScore = 7;
    } else if (freshnessStats.days_ago <= 30) {
      freshnessScore = 4;
    }
  }

  return extractionScore * 0.5 + completenessScore * 0.3 + freshnessScore * 0.2;
}

async function calculateResponsivenessScore(client: PoolClient, caFirmId: string, clientId: string): Promise<number> {
  // Document submission time: 50% of responsiveness score (avg hours)
  const docStats = await findOne<{ avg_hours: number }>(
    client,
    `SELECT
      AVG(EXTRACT(EPOCH FROM (received_at - sent_at)) / 3600) as avg_hours
     FROM ca_document_requests
     WHERE ca_firm_id = $1 AND client_id = $2 AND received_at IS NOT NULL
     AND sent_at > NOW() - INTERVAL '3 months'`,
    [caFirmId, clientId],
  );

  let docScore = 5;
  if (docStats && docStats.avg_hours !== null && docStats.avg_hours !== undefined) {
    if (docStats.avg_hours <= 24) docScore = 10;
    else if (docStats.avg_hours <= 72) docScore = 8;
    else if (docStats.avg_hours <= 168) docScore = 6;
    else if (docStats.avg_hours <= 336) docScore = 4;
    else docScore = 2;
  }

  // WhatsApp response rate: 30% of responsiveness score
  const whatsappStats = await findOne<{ response_rate: number }>(
    client,
    `SELECT
      ROUND((COUNT(CASE WHEN response_time_hours < 24 THEN 1 END)::float / NULLIF(COUNT(*), 0) * 100), 2) as response_rate
     FROM ca_whatsapp_messages
     WHERE ca_firm_id = $1 AND client_id = $2 AND direction = 'inbound'
     AND created_at > NOW() - INTERVAL '1 month'`,
    [caFirmId, clientId],
  );

  const whatsappScore = Math.min(10, ((whatsappStats?.response_rate ?? 0) / 100) * 10);

  // Outstanding requests: 20% of responsiveness score
  const outstandingStats = await findOne<{ pending_count: number }>(
    client,
    `SELECT COUNT(*) as pending_count
     FROM ca_document_requests
     WHERE ca_firm_id = $1 AND client_id = $2 AND status = 'pending'`,
    [caFirmId, clientId],
  );

  let requestScore = 10;
  if (outstandingStats && outstandingStats.pending_count > 0) {
    requestScore = Math.max(2, 10 - outstandingStats.pending_count);
  }

  return docScore * 0.5 + whatsappScore * 0.3 + requestScore * 0.2;
}

function calculateOverallScore(
  compliance: number,
  financial: number,
  dataQuality: number,
  responsiveness: number,
): { score: number; riskLevel: 'excellent' | 'good' | 'fair' | 'poor' | 'critical' } {
  const overall = compliance * 0.4 + financial * 0.25 + dataQuality * 0.2 + responsiveness * 0.15;

  let riskLevel: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  if (overall >= 8.5) riskLevel = 'excellent';
  else if (overall >= 7) riskLevel = 'good';
  else if (overall >= 5) riskLevel = 'fair';
  else if (overall >= 3) riskLevel = 'poor';
  else riskLevel = 'critical';

  return { score: Math.round(overall * 100) / 100, riskLevel };
}

// ═══════════════════════════════════════════════════════════════════
// CALCULATE HEALTH SCORE
// ═══════════════════════════════════════════════════════════════════

export async function calculateHealthScore(
  ctx: CaRequestContext,
  clientId: string,
): Promise<ClientHealthScore> {
  return withTenantTransaction(ctx as any, async (client: PoolClient) => {
    const compliance = await calculateComplianceScore(client, ctx.caFirmId, clientId);
    const financial = await calculateFinancialScore(client, ctx.caFirmId, clientId);
    const dataQuality = await calculateDataQualityScore(client, ctx.caFirmId, clientId);
    const responsiveness = await calculateResponsivenessScore(client, ctx.caFirmId, clientId);

    const { score: overall, riskLevel } = calculateOverallScore(compliance, financial, dataQuality, responsiveness);

    const result = await insertOne<ClientHealthScore>(
      client,
      `INSERT INTO ca_health_scores (
        ca_firm_id, client_id, overall_score, compliance_score,
        financial_score, data_quality_score, responsiveness_score,
        risk_level, last_calculated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (client_id) DO UPDATE SET
        overall_score = $3, compliance_score = $4,
        financial_score = $5, data_quality_score = $6,
        responsiveness_score = $7, risk_level = $8, last_calculated = NOW()
      RETURNING *`,
      [ctx.caFirmId, clientId, overall, compliance, financial, dataQuality, responsiveness, riskLevel],
    );

    return result;
  });
}

// ═══════════════════════════════════════════════════════════════════
// BATCH CALCULATE HEALTH SCORES
// ═══════════════════════════════════════════════════════════════════

export async function batchCalculateHealthScores(
  ctx: CaRequestContext,
): Promise<{ calculated: number; errors: number }> {
  return withTenantClient(ctx as any, async (client: PoolClient) => {
    const clients = await findMany<{ id: string }>(
      client,
      `SELECT id FROM ca_clients WHERE ca_firm_id = $1`,
      [ctx.caFirmId],
    );

    let calculated = 0;
    let errors = 0;

    for (const c of clients) {
      try {
        await calculateHealthScore(ctx, c.id);
        calculated++;
      } catch (err) {
        errors++;
      }
    }

    return { calculated, errors };
  });
}

// ═══════════════════════════════════════════════════════════════════
// GET HEALTH SCORE HISTORY
// ═══════════════════════════════════════════════════════════════════

export async function getHealthScoreHistory(
  ctx: CaRequestContext,
  clientId: string,
  months = 6,
): Promise<HealthScoreHistory[]> {
  return withTenantClient(ctx as any, async (client: PoolClient) => {
    const records = await findMany<{
      created_at: Date;
      overall_score: number;
      compliance_score: number;
      financial_score: number;
      data_quality_score: number;
      responsiveness_score: number;
    }>(
      client,
      `SELECT created_at, overall_score, compliance_score, financial_score,
              data_quality_score, responsiveness_score
       FROM ca_health_scores
       WHERE ca_firm_id = $1 AND client_id = $2
       AND created_at > NOW() - INTERVAL '1 month' * $3
       ORDER BY created_at ASC`,
      [ctx.caFirmId, clientId, months],
    );

    return records.map((r: {
      created_at: Date;
      overall_score: number;
      compliance_score: number;
      financial_score: number;
      data_quality_score: number;
      responsiveness_score: number;
    }) => ({
      scoreDate: r.created_at,
      overall: r.overall_score,
      compliance: r.compliance_score,
      financial: r.financial_score,
      dataQuality: r.data_quality_score,
      responsiveness: r.responsiveness_score,
    }));
  });
}

// ═══════════════════════════════════════════════════════════════════
// GET AT-RISK CLIENTS
// ═══════════════════════════════════════════════════════════════════

export async function getAtRiskClients(
  ctx: CaRequestContext,
  threshold = 5.0,
): Promise<Array<{ id: string; name: string; score: number; riskLevel: string }>> {
  return withTenantClient(ctx as any, async (client: PoolClient) => {
    const results = await findMany<{
      id: string;
      name: string;
      overall_score: number;
      risk_level: string;
    }>(
      client,
      `SELECT c.id, c.name, hs.overall_score, hs.risk_level
       FROM ca_clients c
       LEFT JOIN ca_health_scores hs ON c.id = hs.client_id
       WHERE c.ca_firm_id = $1
       AND (hs.overall_score < $2 OR hs.overall_score IS NULL)
       ORDER BY hs.overall_score ASC NULLS LAST`,
      [ctx.caFirmId, threshold],
    );

    return results.map((r) => ({
      id: String(r.id ?? ''),
      name: String(r.name ?? ''),
      score: typeof r.overall_score === 'number' ? r.overall_score : 0,
      riskLevel: String(r.risk_level ?? 'unknown'),
    }));
  });
}

// ═══════════════════════════════════════════════════════════════════
// GET HEALTH DASHBOARD
// ═══════════════════════════════════════════════════════════════════

export async function getHealthDashboard(ctx: CaRequestContext): Promise<HealthDashboard> {
  return withTenantClient(ctx as any, async (client: PoolClient) => {
    const scores = await findMany<{
      overall_score: number;
      risk_level: string;
    }>(
      client,
      `SELECT overall_score, risk_level FROM ca_health_scores
       WHERE ca_firm_id = $1`,
      [ctx.caFirmId],
    );

    const distribution = {
      excellent: scores.filter((s: { overall_score: number; risk_level: string }) => s.risk_level === 'excellent').length,
      good: scores.filter((s: { overall_score: number; risk_level: string }) => s.risk_level === 'good').length,
      fair: scores.filter((s: { overall_score: number; risk_level: string }) => s.risk_level === 'fair').length,
      poor: scores.filter((s: { overall_score: number; risk_level: string }) => s.risk_level === 'poor').length,
      critical: scores.filter((s: { overall_score: number; risk_level: string }) => s.risk_level === 'critical').length,
    };

    const avgScore =
      scores.length > 0
        ? Math.round(
            (scores.reduce((sum: number, s: { overall_score: number; risk_level: string }) => sum + s.overall_score, 0) / scores.length) * 100,
          ) / 100
        : 0;

    const trends = await findMany<HealthScoreHistory>(
      client,
      `SELECT created_at as "scoreDate", overall_score as overall,
              compliance_score as compliance, financial_score as financial,
              data_quality_score as "dataQuality", responsiveness_score as responsiveness
       FROM ca_health_scores
       WHERE ca_firm_id = $1
       AND created_at > NOW() - INTERVAL '90 days'
       ORDER BY created_at ASC`,
      [ctx.caFirmId],
    );

    return {
      avgScore,
      distribution,
      trends,
    };
  });
}

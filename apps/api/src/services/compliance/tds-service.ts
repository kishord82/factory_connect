/**
 * CA6: TDS/TCS Reconciliation Service
 * Reconciles TDS entries with TRACES
 * Prepares 24Q and 26Q returns
 * Detects TDS mismatches and variances
 */

import type { CaRequestContext } from '@fc/shared';
import { FcError } from '@fc/shared';
import { withTenantTransaction, withTenantClient, insertOne, findOne, findMany } from '@fc/database';
import type { PoolClient } from '@fc/database';

interface ReconciliationSessionRow {
  id: string;
  ca_firm_id: string;
  client_id: string;
  recon_type: string;
  period: string;
  status: string;
  source_count: number | null;
  target_count: number | null;
  matched_count: number;
  unmatched_source: number;
  unmatched_target: number;
  variance_amount: number;
  summary: Record<string, unknown> | null;
  created_at: Date;
  completed_at: Date | null;
}

interface ReconciliationItemRow {
  id: string;
  session_id: string;
  source_record: Record<string, unknown> | null;
  target_record: Record<string, unknown> | null;
  match_status: string | null;
  variance_amount: number | null;
  variance_reason: string | null;
  resolution: string | null;
  resolved_by: string | null;
  created_at: Date;
}

interface ComplianceFilingRow {
  id: string;
  ca_firm_id: string;
  client_id: string;
  filing_type: string;
  period: string;
  status: string;
  due_date: Date | null;
  filed_date: Date | null;
  data_snapshot: Record<string, unknown> | null;
  validation_results: Record<string, unknown> | null;
  exceptions: unknown[];
  filed_reference: string | null;
  prepared_by: string | null;
  reviewed_by: string | null;
  created_at: Date;
  updated_at: Date;
}

interface TdsEntry {
  id: string;
  deductee_name: string;
  deductee_pan: string;
  amount_deducted: number;
  tax_deducted: number;
  quarter: string;
  deposited: boolean;
  deposit_reference: string | null;
}

interface ReconciliationSummary {
  totalDeducted: number;
  totalDeposited: number;
  variance: number;
  matchRate: number;
}


/**
 * Reconcile TDS entries from Tally with TRACES data
 * Creates reconciliation session and items
 */
export async function reconcileTds(
  ctx: CaRequestContext,
  clientId: string,
  period: string,
  quarter: string, // Q1-Q4
): Promise<ReconciliationSessionRow> {
  return withTenantTransaction(ctx, async (client: PoolClient) => {
    // Validate client exists
    const caClient = await findOne(client, 'SELECT id FROM ca_clients WHERE id = $1', [clientId]);
    if (!caClient) {
      throw new FcError('FC_ERR_COMPLIANCE_CLIENT_NOT_FOUND', `Client ${clientId} not found`, {}, 404);
    }

    // Fetch TDS entries from tally_extractions
    const tallyTdsEntries = await findMany<TdsEntry>(
      client,
      `SELECT id, deductee_name, deductee_pan, amount_deducted, tax_deducted,
              quarter, deposited, deposit_reference
       FROM tally_extractions
       WHERE client_id = $1 AND quarter = $2 AND extraction_type = 'TDS'
       ORDER BY created_at ASC`,
      [clientId, quarter],
    );

    // Fetch TRACES data (from tally_extractions with source = 'traces')
    const tracesData = await findMany<TdsEntry>(
      client,
      `SELECT id, deductee_name, deductee_pan, amount_deducted, tax_deducted,
              quarter, deposited, deposit_reference
       FROM tally_extractions
       WHERE client_id = $1 AND quarter = $2 AND extraction_type = 'TRACES'
       ORDER BY created_at ASC`,
      [clientId, quarter],
    );

    // Create reconciliation session
    const session = await insertOne<ReconciliationSessionRow>(
      client,
      `INSERT INTO reconciliation_sessions (
        ca_firm_id, client_id, recon_type, period, status,
        source_count, target_count, matched_count, unmatched_source, unmatched_target,
        variance_amount
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        ctx.tenantId, clientId, 'TDS', period, 'in_progress',
        tallyTdsEntries.length, tracesData.length, 0, 0, 0, 0,
      ],
    );

    // Match entries and create reconciliation items
    let matchedCount = 0;
    let unmatchedSource = 0;
    let unmatchedTarget = 0;
    let totalVariance = 0;
    const processedTracesIds = new Set<string>();

    for (const tallyEntry of tallyTdsEntries) {
      // Find matching TRACES entry
      const tracesMatch = tracesData.find((t: TdsEntry) => t.deductee_pan === tallyEntry.deductee_pan);

      if (tracesMatch) {
        processedTracesIds.add(tracesMatch.id);
        const variance = Math.abs(tallyEntry.tax_deducted - tracesMatch.tax_deducted);

        const matchStatus = variance < 100 ? 'matched' : 'variance'; // Tolerance: 100
        if (variance < 100) matchedCount++;
        totalVariance += variance;

        await insertOne<ReconciliationItemRow>(
          client,
          `INSERT INTO reconciliation_items (
            session_id, source_record, target_record, match_status,
            variance_amount, variance_reason
          ) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
          [
            session.id,
            JSON.stringify(tallyEntry),
            JSON.stringify(tracesMatch),
            matchStatus,
            variance > 0 ? variance : null,
            variance > 0 ? `Amount difference: ${variance}` : null,
          ],
        );
      } else {
        // Unmatched in source (Tally)
        unmatchedSource++;
        await insertOne<ReconciliationItemRow>(
          client,
          `INSERT INTO reconciliation_items (
            session_id, source_record, match_status
          ) VALUES ($1,$2,$3) RETURNING *`,
          [
            session.id,
            JSON.stringify(tallyEntry),
            'unmatched_source',
          ],
        );
      }
    }

    // Find TRACES entries not matched in Tally
    for (const tracesEntry of tracesData) {
      if (!processedTracesIds.has(tracesEntry.id)) {
        unmatchedTarget++;
        await insertOne<ReconciliationItemRow>(
          client,
          `INSERT INTO reconciliation_items (
            session_id, target_record, match_status
          ) VALUES ($1,$2,$3) RETURNING *`,
          [
            session.id,
            JSON.stringify(tracesEntry),
            'unmatched_target',
          ],
        );
      }
    }

    // Update session with counts
    const matchRate = tallyTdsEntries.length > 0 ? (matchedCount / tallyTdsEntries.length) * 100 : 0;

    const updatedSession = await findOne<ReconciliationSessionRow>(
      client,
      `UPDATE reconciliation_sessions
       SET matched_count = $1, unmatched_source = $2, unmatched_target = $3,
           variance_amount = $4, status = $5, completed_at = NOW(), updated_at = NOW()
       WHERE id = $6 AND ca_firm_id = $7 RETURNING *`,
      [matchedCount, unmatchedSource, unmatchedTarget, totalVariance, 'completed', session.id, ctx.tenantId],
    );

    if (!updatedSession) {
      throw new FcError('FC_ERR_COMPLIANCE_RECON_FAILED', 'Failed to complete reconciliation session');
    }

    // Audit log
    await client.query(
      `INSERT INTO audit_log (tenant_id, action, entity_type, entity_id, actor_id, metadata)
       VALUES ($1, 'TDS_RECONCILIATION', 'reconciliation_sessions', $2, $3, $4)`,
      [
        ctx.tenantId, updatedSession.id, ctx.userId,
        JSON.stringify({
          quarter, matched: matchedCount, unmatched_source: unmatchedSource,
          unmatched_target: unmatchedTarget, match_rate: matchRate,
        }),
      ],
    );

    return updatedSession;
  });
}

/**
 * Prepare 24Q (Salary TDS return)
 * Compiles salary TDS for the quarter
 */
export async function prepare24Q(
  ctx: CaRequestContext,
  clientId: string,
  quarter: string,
): Promise<ComplianceFilingRow> {
  return withTenantTransaction(ctx, async (client: PoolClient) => {
    // Validate client exists
    const caClient = await findOne(client, 'SELECT id FROM ca_clients WHERE id = $1', [clientId]);
    if (!caClient) {
      throw new FcError('FC_ERR_COMPLIANCE_CLIENT_NOT_FOUND', `Client ${clientId} not found`, {}, 404);
    }

    // Fetch salary TDS entries
    const salaryTds = await findMany<TdsEntry>(
      client,
      `SELECT id, deductee_name, deductee_pan, amount_deducted, tax_deducted, quarter
       FROM tally_extractions
       WHERE client_id = $1 AND quarter = $2 AND extraction_type = 'SALARY_TDS'`,
      [clientId, quarter],
    );

    // Prepare 24Q data
    const totalDeducted = salaryTds.reduce((sum: number, entry: TdsEntry) => sum + entry.amount_deducted, 0);
    const totalTaxDeducted = salaryTds.reduce((sum: number, entry: TdsEntry) => sum + entry.tax_deducted, 0);

    const filingData = {
      form_type: '24Q',
      quarter,
      total_deductees: salaryTds.length,
      total_amount_deducted: totalDeducted,
      total_tax_deducted: totalTaxDeducted,
      entries: salaryTds,
    };

    // Determine period (e.g., Q1 = 01-03, Q2 = 04-06, etc.)
    const periodMap = { Q1: '0103', Q2: '0406', Q3: '0709', Q4: '1012' };
    const period = periodMap[quarter as keyof typeof periodMap] || quarter;

    const filing = await insertOne<ComplianceFilingRow>(
      client,
      `INSERT INTO compliance_filings (
        ca_firm_id, client_id, filing_type, period, status, data_snapshot, prepared_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        ctx.tenantId, clientId, '24Q', period, 'completed',
        JSON.stringify(filingData), ctx.userId,
      ],
    );

    // Audit log
    await client.query(
      `INSERT INTO audit_log (tenant_id, action, entity_type, entity_id, actor_id, metadata)
       VALUES ($1, 'COMPLIANCE_FILING', 'compliance_filings', $2, $3, $4)`,
      [
        ctx.tenantId, filing.id, ctx.userId,
        JSON.stringify({ filing_type: '24Q', quarter, total_deductees: salaryTds.length }),
      ],
    );

    return filing;
  });
}

/**
 * Prepare 26Q (Non-salary TDS return)
 * Handles non-salary TDS, interest on securities, rent, etc.
 */
export async function prepare26Q(
  ctx: CaRequestContext,
  clientId: string,
  quarter: string,
): Promise<ComplianceFilingRow> {
  return withTenantTransaction(ctx, async (client: PoolClient) => {
    // Validate client exists
    const caClient = await findOne(client, 'SELECT id FROM ca_clients WHERE id = $1', [clientId]);
    if (!caClient) {
      throw new FcError('FC_ERR_COMPLIANCE_CLIENT_NOT_FOUND', `Client ${clientId} not found`, {}, 404);
    }

    // Fetch non-salary TDS entries (rent, interest, commission, professional fees, etc.)
    const nonSalaryTds = await findMany<TdsEntry>(
      client,
      `SELECT id, deductee_name, deductee_pan, amount_deducted, tax_deducted, quarter
       FROM tally_extractions
       WHERE client_id = $1 AND quarter = $2 AND extraction_type IN ('RENT_TDS', 'INTEREST_TDS', 'COMMISSION_TDS', 'PROFESSIONAL_TDS')`,
      [clientId, quarter],
    );

    // Prepare 26Q data
    const totalDeducted = nonSalaryTds.reduce((sum: number, entry: TdsEntry) => sum + entry.amount_deducted, 0);
    const totalTaxDeducted = nonSalaryTds.reduce((sum: number, entry: TdsEntry) => sum + entry.tax_deducted, 0);

    const filingData = {
      form_type: '26Q',
      quarter,
      total_deductees: nonSalaryTds.length,
      total_amount_deducted: totalDeducted,
      total_tax_deducted: totalTaxDeducted,
      entries: nonSalaryTds,
    };

    const periodMap = { Q1: '0103', Q2: '0406', Q3: '0709', Q4: '1012' };
    const period = periodMap[quarter as keyof typeof periodMap] || quarter;

    const filing = await insertOne<ComplianceFilingRow>(
      client,
      `INSERT INTO compliance_filings (
        ca_firm_id, client_id, filing_type, period, status, data_snapshot, prepared_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        ctx.tenantId, clientId, '26Q', period, 'completed',
        JSON.stringify(filingData), ctx.userId,
      ],
    );

    // Audit log
    await client.query(
      `INSERT INTO audit_log (tenant_id, action, entity_type, entity_id, actor_id, metadata)
       VALUES ($1, 'COMPLIANCE_FILING', 'compliance_filings', $2, $3, $4)`,
      [
        ctx.tenantId, filing.id, ctx.userId,
        JSON.stringify({ filing_type: '26Q', quarter, total_deductees: nonSalaryTds.length }),
      ],
    );

    return filing;
  });
}

/**
 * Detect TDS mismatches in reconciliation session
 * Returns array of items with variances
 */
export async function detectTdsMismatches(
  ctx: CaRequestContext,
  sessionId: string,
): Promise<ReconciliationItemRow[]> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    // Validate session belongs to tenant
    const session = await findOne(
      client,
      'SELECT id FROM reconciliation_sessions WHERE id = $1 AND ca_firm_id = $2',
      [sessionId, ctx.tenantId],
    );

    if (!session) {
      throw new FcError('FC_ERR_COMPLIANCE_SESSION_NOT_FOUND', `Session ${sessionId} not found`, {}, 404);
    }

    // Get all items with variances
    return findMany<ReconciliationItemRow>(
      client,
      `SELECT * FROM reconciliation_items
       WHERE session_id = $1 AND (match_status = 'variance' OR match_status LIKE 'unmatched%')
       ORDER BY variance_amount DESC NULLS LAST`,
      [sessionId],
    );
  });
}

/**
 * Get reconciliation summary dashboard
 * Shows total deducted, deposited, variance, match rate
 */
export async function getReconciliationSummary(
  ctx: CaRequestContext,
  clientId: string,
): Promise<ReconciliationSummary> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    // Get latest reconciliation session
    const session = await findOne<ReconciliationSessionRow>(
      client,
      `SELECT * FROM reconciliation_sessions
       WHERE ca_firm_id = $1 AND client_id = $2 AND status = 'completed'
       ORDER BY completed_at DESC LIMIT 1`,
      [ctx.tenantId, clientId],
    );

    if (!session) {
      return {
        totalDeducted: 0,
        totalDeposited: 0,
        variance: 0,
        matchRate: 0,
      };
    }

    // Calculate match rate
    const totalItems = session.matched_count + session.unmatched_source + session.unmatched_target;
    const matchRate = totalItems > 0 ? (session.matched_count / totalItems) * 100 : 0;

    // Fetch total deducted from items
    const items = await findMany<{
      source_record: Record<string, unknown> | null;
    }>(
      client,
      `SELECT source_record FROM reconciliation_items
       WHERE session_id = $1 AND source_record IS NOT NULL`,
      [session.id],
    );

    const totalDeducted = items.reduce((sum: number, item: { source_record: Record<string, unknown> | null }) => {
      if (item.source_record && typeof item.source_record === 'object' && 'tax_deducted' in item.source_record) {
        return sum + ((item.source_record.tax_deducted as number) || 0);
      }
      return sum;
    }, 0);

    return {
      totalDeducted,
      totalDeposited: totalDeducted, // Simplified: assume all deducted are deposited
      variance: session.variance_amount,
      matchRate,
    };
  });
}

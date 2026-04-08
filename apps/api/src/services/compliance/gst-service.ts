/**
 * CA5: GST Filing Preparation Service
 * Prepares GSTR-1 and GSTR-3B filings from Tally data
 * Validates HSN codes, detects exceptions, manages filing lifecycle
 */

import type { CaRequestContext } from '@fc/shared';
import { FcError } from '@fc/shared';
import type { PoolClient, PaginatedResult } from '@fc/database';
import { withTenantTransaction, withTenantClient, insertOne, findOne, findMany, paginatedQuery } from '@fc/database';

interface FilingRow {
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

interface ComplianceExceptionRow {
  id: string;
  filing_id: string;
  client_id: string;
  ca_firm_id: string;
  exception_type: string;
  severity: string;
  description: string | null;
  source_data: Record<string, unknown> | null;
  suggested_fix: string | null;
  status: string;
  resolved_by: string | null;
  resolved_at: Date | null;
  resolution_notes: string | null;
  created_at: Date;
}

interface HsnValidationResult {
  valid: boolean;
  description?: string;
  gstRate?: number;
}

interface TallyInvoice {
  invoice_number: string;
  invoice_date: string;
  gstin: string;
  hsn_code: string;
  amount: number;
  tax_amount: number;
}

interface FilingData {
  b2b: TallyInvoice[];
  b2c: TallyInvoice[];
  cdnr: TallyInvoice[];
  hsn_summary: Record<string, unknown>;
}


/**
 * Validate HSN code against master list
 * Returns validation result with GST rate
 */
export async function validateHsn(hsnCode: string): Promise<HsnValidationResult> {
  // Mock HST validation against master list
  // In production, this would query a master HSN table or external API
  const validHsns: Record<string, { desc: string; rate: number }> = {
    '1001': { desc: 'Cereals', rate: 5 },
    '1002': { desc: 'Rice', rate: 5 },
    '2304': { desc: 'Oil cake', rate: 5 },
    '2305': { desc: 'Oil cake', rate: 5 },
    '2309': { desc: 'Animal feed', rate: 5 },
    '6204': { desc: 'Women clothing', rate: 5 },
    '6205': { desc: 'Men clothing', rate: 5 },
    '6206': { desc: 'Shirts', rate: 5 },
    '7318': { desc: 'Fasteners', rate: 18 },
    '8504': { desc: 'Electrical machinery', rate: 18 },
  };

  const entry = validHsns[hsnCode];
  if (entry) {
    return {
      valid: true,
      description: entry.desc,
      gstRate: entry.rate,
    };
  }

  return {
    valid: false,
  };
}

/**
 * Detect exceptions in filing data
 * Checks for HSN mismatches, GSTIN format, amount thresholds, duplicates
 */
export async function detectExceptions(
  ctx: CaRequestContext,
  client: PoolClient,
  filingId: string,
  filingData: FilingData,
): Promise<ComplianceExceptionRow[]> {
  const exceptions: Array<{
    filing_id: string;
    client_id: string;
    ca_firm_id: string;
    exception_type: string;
    severity: string;
    description: string;
    source_data: Record<string, unknown>;
    suggested_fix: string;
    status: string;
  }> = [];

  // Get filing details
  const filing = await findOne<{ client_id: string }>(
    client,
    'SELECT client_id FROM compliance_filings WHERE id = $1',
    [filingId],
  );

  if (!filing) {
    throw new FcError('FC_ERR_COMPLIANCE_FILING_NOT_FOUND', `Filing ${filingId} not found`, {}, 404);
  }

  // Check for duplicate invoice numbers
  const invoiceNumbers = new Set<string>();
  const allInvoices = [...(filingData.b2b || []), ...(filingData.b2c || []), ...(filingData.cdnr || [])];

  for (const inv of allInvoices) {
    if (invoiceNumbers.has(inv.invoice_number)) {
      exceptions.push({
        filing_id: filingId,
        client_id: filing.client_id,
        ca_firm_id: ctx.caFirmId,
        exception_type: 'DUPLICATE_INVOICE',
        severity: 'high',
        description: `Duplicate invoice number detected: ${inv.invoice_number}`,
        source_data: { invoice_number: inv.invoice_number },
        suggested_fix: 'Review and remove duplicate entries',
        status: 'open',
      });
    }
    invoiceNumbers.add(inv.invoice_number);
  }

  // Validate HSN codes and GSTIN format
  for (const inv of allInvoices) {
    // Validate HSN
    const hsnResult = await validateHsn(inv.hsn_code);
    if (!hsnResult.valid) {
      exceptions.push({
        filing_id: filingId,
        client_id: filing.client_id,
        ca_firm_id: ctx.caFirmId,
        exception_type: 'INVALID_HSN',
        severity: 'high',
        description: `Invalid HSN code: ${inv.hsn_code}`,
        source_data: { hsn_code: inv.hsn_code, invoice_number: inv.invoice_number },
        suggested_fix: 'Correct HSN code or remove invoice',
        status: 'open',
      });
    }

    // Validate GSTIN format (should be 15 chars)
    if (inv.gstin && (inv.gstin.length !== 15 || !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(inv.gstin))) {
      exceptions.push({
        filing_id: filingId,
        client_id: filing.client_id,
        ca_firm_id: ctx.caFirmId,
        exception_type: 'GSTIN_FORMAT_ERROR',
        severity: 'high',
        description: `Invalid GSTIN format: ${inv.gstin}`,
        source_data: { gstin: inv.gstin, invoice_number: inv.invoice_number },
        suggested_fix: 'Verify and correct GSTIN',
        status: 'open',
      });
    }

    // Check amount thresholds
    if (inv.amount > 10000000) {
      // > 1 crore
      exceptions.push({
        filing_id: filingId,
        client_id: filing.client_id,
        ca_firm_id: ctx.caFirmId,
        exception_type: 'AMOUNT_THRESHOLD_EXCEEDED',
        severity: 'medium',
        description: `Invoice amount exceeds 1 crore: ${inv.amount}`,
        source_data: { amount: inv.amount, invoice_number: inv.invoice_number },
        suggested_fix: 'Review for accuracy',
        status: 'open',
      });
    }
  }

  // Insert exceptions into database
  for (const exc of exceptions) {
    await insertOne<ComplianceExceptionRow>(
      client,
      `INSERT INTO compliance_exceptions (
        filing_id, client_id, ca_firm_id, exception_type, severity,
        description, source_data, suggested_fix, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        exc.filing_id, exc.client_id, exc.ca_firm_id, exc.exception_type, exc.severity,
        exc.description, JSON.stringify(exc.source_data), exc.suggested_fix, exc.status,
      ],
    );
  }

  return exceptions as ComplianceExceptionRow[];
}

/**
 * Prepare GSTR-1 filing from Tally data
 * Collects B2B, B2C, and CDNR invoices
 * Validates HSN codes and detects exceptions
 */
export async function prepareGstr1(
  ctx: CaRequestContext,
  clientId: string,
  period: string, // MMYYYY format
): Promise<FilingRow> {
  return withTenantTransaction(ctx, async (client: PoolClient) => {
    // Validate client exists
    const caClient = await findOne(client, 'SELECT id FROM ca_clients WHERE id = $1', [clientId]);
    if (!caClient) {
      throw new FcError('FC_ERR_COMPLIANCE_CLIENT_NOT_FOUND', `Client ${clientId} not found`, {}, 404);
    }

    // Fetch invoices from tally_extractions (mock data)
    const invoices = await findMany<TallyInvoice>(
      client,
      `SELECT invoice_number, invoice_date, gstin, hsn_code, amount, tax_amount
       FROM tally_extractions
       WHERE client_id = $1 AND TO_CHAR(invoice_date, 'MMYYYY') = $2
       ORDER BY invoice_date ASC`,
      [clientId, period],
    );

    // Prepare filing data
    const filingData: FilingData = {
      b2b: invoices.filter((inv: TallyInvoice) => inv.gstin && inv.gstin.length === 15), // B2B = with valid GSTIN
      b2c: invoices.filter((inv: TallyInvoice) => !inv.gstin || inv.gstin.length !== 15), // B2C = no valid GSTIN
      cdnr: [], // Credit/Debit Notes (placeholder)
      hsn_summary: {}, // Will be populated with HSN summary
    };

    // Create filing record
    const filing = await insertOne<FilingRow>(
      client,
      `INSERT INTO compliance_filings (
        ca_firm_id, client_id, filing_type, period, status, data_snapshot, prepared_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        ctx.caFirmId, clientId, 'GSTR1', period, 'in_progress',
        JSON.stringify(filingData), ctx.userId,
      ],
    );

    // Detect exceptions
    await detectExceptions(ctx, client, filing.id, filingData);

    // Update filing status
    await client.query(
      `UPDATE compliance_filings SET status = $1, updated_at = NOW() WHERE id = $2`,
      ['completed', filing.id],
    );

    // Audit log
    await client.query(
      `INSERT INTO audit_log (tenant_id, action, entity_type, entity_id, actor_id, new_record, metadata)
       VALUES ($1, 'COMPLIANCE_FILING', 'compliance_filings', $2, $3, $4, $5)`,
      [
        ctx.caFirmId, filing.id, ctx.userId, JSON.stringify(filing),
        JSON.stringify({ correlationId: ctx.correlationId, filing_type: 'GSTR1' }),
      ],
    );

    return filing;
  });
}

/**
 * Prepare GSTR-3B filing (GST Summary Return)
 * Calculates outward supplies, inward supplies, ITC claims
 */
export async function prepareGstr3b(
  ctx: CaRequestContext,
  clientId: string,
  period: string,
): Promise<FilingRow> {
  return withTenantTransaction(ctx, async (client: PoolClient) => {
    // Validate client exists
    const caClient = await findOne(client, 'SELECT id FROM ca_clients WHERE id = $1', [clientId]);
    if (!caClient) {
      throw new FcError('FC_ERR_COMPLIANCE_CLIENT_NOT_FOUND', `Client ${clientId} not found`, {}, 404);
    }

    // Fetch invoices
    const invoices = await findMany<TallyInvoice>(
      client,
      `SELECT invoice_number, invoice_date, gstin, hsn_code, amount, tax_amount
       FROM tally_extractions
       WHERE client_id = $1 AND TO_CHAR(invoice_date, 'MMYYYY') = $2`,
      [clientId, period],
    );

    // Calculate summary
    const totalAmount = invoices.reduce((sum: number, inv: TallyInvoice) => sum + inv.amount, 0);
    const totalTax = invoices.reduce((sum: number, inv: TallyInvoice) => sum + inv.tax_amount, 0);

    const filingData = {
      outward_supplies: totalAmount,
      outward_tax: totalTax,
      inward_supplies: 0, // Placeholder
      inward_tax: 0, // Placeholder
      itc_claims: totalTax * 0.7, // Estimate 70% of tax as ITC (simplified)
      invoice_count: invoices.length,
    };

    // Create filing record
    const filing = await insertOne<FilingRow>(
      client,
      `INSERT INTO compliance_filings (
        ca_firm_id, client_id, filing_type, period, status, data_snapshot, prepared_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        ctx.caFirmId, clientId, 'GSTR3B', period, 'completed',
        JSON.stringify(filingData), ctx.userId,
      ],
    );

    // Audit log
    await client.query(
      `INSERT INTO audit_log (tenant_id, action, entity_type, entity_id, actor_id, new_record, metadata)
       VALUES ($1, 'COMPLIANCE_FILING', 'compliance_filings', $2, $3, $4, $5)`,
      [
        ctx.caFirmId, filing.id, ctx.userId, JSON.stringify(filing),
        JSON.stringify({ correlationId: ctx.correlationId, filing_type: 'GSTR3B' }),
      ],
    );

    return filing;
  });
}

/**
 * List filings with pagination and filters
 */
export async function listFilings(
  ctx: CaRequestContext,
  filters: {
    filing_type?: string;
    status?: string;
    client_id?: string;
    period?: string;
  },
  page: number,
  pageSize: number,
): Promise<PaginatedResult<FilingRow>> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    const params: unknown[] = [];
    let sql = 'SELECT * FROM compliance_filings WHERE ca_firm_id = $1';
    params.push(ctx.caFirmId);

    if (filters.filing_type) {
      sql += ` AND filing_type = $${params.length + 1}`;
      params.push(filters.filing_type);
    }
    if (filters.status) {
      sql += ` AND status = $${params.length + 1}`;
      params.push(filters.status);
    }
    if (filters.client_id) {
      sql += ` AND client_id = $${params.length + 1}`;
      params.push(filters.client_id);
    }
    if (filters.period) {
      sql += ` AND period = $${params.length + 1}`;
      params.push(filters.period);
    }

    sql += ' ORDER BY created_at DESC';

    return paginatedQuery<FilingRow>(client, sql, params, page, pageSize);
  });
}

/**
 * Get filing by ID with exceptions
 */
export async function getFilingById(ctx: CaRequestContext, filingId: string): Promise<FilingRow | null> {
  return withTenantClient(ctx, async (client: PoolClient) => {
    return findOne<FilingRow>(
      client,
      'SELECT * FROM compliance_filings WHERE id = $1 AND ca_firm_id = $2',
      [filingId, ctx.caFirmId],
    );
  });
}

/**
 * Update filing status with transition validation
 */
export async function updateFilingStatus(
  ctx: CaRequestContext,
  filingId: string,
  newStatus: string,
  reviewNotes?: string,
): Promise<FilingRow> {
  return withTenantTransaction(ctx, async (client: PoolClient) => {
    const filing = await findOne<FilingRow>(
      client,
      'SELECT * FROM compliance_filings WHERE id = $1 AND ca_firm_id = $2',
      [filingId, ctx.caFirmId],
    );

    if (!filing) {
      throw new FcError('FC_ERR_COMPLIANCE_FILING_NOT_FOUND', `Filing ${filingId} not found`, {}, 404);
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      pending: ['in_progress', 'rejected'],
      in_progress: ['completed', 'review_pending', 'failed'],
      review_pending: ['completed', 'rejected'],
      completed: [],
      failed: [],
      rejected: [],
    };

    if (!validTransitions[filing.status]?.includes(newStatus)) {
      throw new FcError(
        'FC_ERR_COMPLIANCE_INVALID_TRANSITION',
        `Cannot transition from ${filing.status} to ${newStatus}`,
      );
    }

    // Update status
    const updated = await findOne<FilingRow>(
      client,
      `UPDATE compliance_filings
       SET status = $1, reviewed_by = $2, updated_at = NOW()
       WHERE id = $3 AND ca_firm_id = $4 RETURNING *`,
      [newStatus, ctx.userId, filingId, ctx.caFirmId],
    );

    if (!updated) {
      throw new FcError('FC_ERR_COMPLIANCE_UPDATE_FAILED', 'Failed to update filing status');
    }

    // Audit log
    await client.query(
      `INSERT INTO audit_log (tenant_id, action, entity_type, entity_id, actor_id, metadata)
       VALUES ($1, 'COMPLIANCE_STATUS_UPDATE', 'compliance_filings', $2, $3, $4)`,
      [
        ctx.caFirmId, filingId, ctx.userId,
        JSON.stringify({ old_status: filing.status, new_status: newStatus, review_notes: reviewNotes }),
      ],
    );

    return updated;
  });
}

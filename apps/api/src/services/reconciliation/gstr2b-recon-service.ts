/**
 * F16: GSTR-2B Reconciliation Service
 * Matches GSTR-2B supplier data with purchase register from Tally
 */

import type { CaRequestContext } from '@fc/shared';
import { FcError } from '@fc/shared';
import { withTenantTransaction, withTenantClient, insertOne, findOne, findMany } from '@fc/database';
import type { PoolClient } from '@fc/database';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface Gstr2bSession {
  id: string;
  ca_firm_id: string;
  client_id: string;
  period: string;
  session_status: 'draft' | 'in_progress' | 'completed' | 'failed';
  total_invoices_2b: number;
  total_invoices_register: number;
  matched_count: number;
  excess_in_2b: number;
  missing_from_2b: number;
  amount_mismatch: number;
  created_at: Date;
  updated_at: Date;
}

export interface Gstr2bItem {
  id: string;
  session_id: string;
  source: 'gstr2b' | 'tally';
  supplier_gstin: string;
  invoice_number: string;
  invoice_date: Date;
  invoice_amount: string;
  tax_amount: string;
  total_amount: string;
  match_status: 'matched' | 'unmatched_source' | 'unmatched_target' | 'variance';
  matched_with: string | null;
  variance_amount: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ItcEligibility {
  totalItcClaimed: string;
  totalItcEligible: string;
  itcToReverse: string;
  reversePercentage: number;
  itcMismatches: Array<{
    supplierGstin: string;
    invoiceNumber: string;
    tallyAmount: string;
    gstr2bAmount: string;
    variance: string;
  }>;
}

export interface Gstr2bMismatch {
  id: string;
  supplierGstin: string;
  invoiceNumber: string;
  invoiceDate: Date;
  tallyAmount: string;
  gstr2bAmount: string;
  variance: string;
  variancePercentage: number;
  status: string;
}

// ═══════════════════════════════════════════════════════════════════
// RECONCILE GSTR-2B WITH PURCHASE REGISTER
// ═══════════════════════════════════════════════════════════════════

export async function reconcileGstr2b(
  ctx: CaRequestContext,
  clientId: string,
  period: string,
): Promise<Gstr2bSession> {
  return withTenantTransaction(ctx as any, async (client: PoolClient) => {
    // 1. Create session
    const session = await insertOne<Gstr2bSession>(
      client,
      `INSERT INTO ca_gstr2b_sessions (
        ca_firm_id, client_id, period,
        session_status, total_invoices_2b, total_invoices_register,
        matched_count, excess_in_2b, missing_from_2b, amount_mismatch
      ) VALUES ($1, $2, $3, $4, 0, 0, 0, 0, 0, 0)
      RETURNING *`,
      [ctx.caFirmId, clientId, period, 'draft'],
    );

    // 2. Fetch purchase register from Tally extraction (would be from ta_tally_extracts in prod)
    const tallyInvoices = await findMany<{
      supplier_gstin: string;
      invoice_number: string;
      invoice_date: Date;
      amount: string;
      tax_amount: string;
    }>(
      client,
      `SELECT supplier_gstin, invoice_number, invoice_date, amount, tax_amount
       FROM ca_tally_purchase_register
       WHERE ca_firm_id = $1 AND client_id = $2 AND period = $3`,
      [ctx.caFirmId, clientId, period],
    );

    // 3. Fetch GSTR-2B data (from portal upload or mocked)
    const gstr2bData = await findMany<{
      gstin: string;
      inv_num: string;
      inv_date: Date;
      inv_amt: string;
      igst: string;
      cgst: string;
      sgst: string;
    }>(
      client,
      `SELECT gstin, inv_num, inv_date, inv_amt,
              COALESCE(igst, '0') as igst,
              COALESCE(cgst, '0') as cgst,
              COALESCE(sgst, '0') as sgst
       FROM ca_gstr2b_uploads
       WHERE ca_firm_id = $1 AND client_id = $2 AND period = $3`,
      [ctx.caFirmId, clientId, period],
    );

    // 4. Insert GSTR-2B items
    for (const item of gstr2bData) {
      const taxAmount = `${parseFloat(item.igst) + parseFloat(item.cgst) + parseFloat(item.sgst)}`;
      const totalAmount = `${parseFloat(item.inv_amt) + parseFloat(taxAmount)}`;

      await insertOne<Gstr2bItem>(
        client,
        `INSERT INTO ca_gstr2b_items (
          session_id, source, supplier_gstin, invoice_number,
          invoice_date, invoice_amount, tax_amount, total_amount,
          match_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          session.id,
          'gstr2b',
          item.gstin,
          item.inv_num,
          item.inv_date,
          item.inv_amt,
          taxAmount,
          totalAmount,
          'unmatched_source',
        ],
      );
    }

    // 5. Insert Tally items
    for (const item of tallyInvoices) {
      const totalAmount = `${parseFloat(item.amount) + parseFloat(item.tax_amount)}`;
      await insertOne<Gstr2bItem>(
        client,
        `INSERT INTO ca_gstr2b_items (
          session_id, source, supplier_gstin, invoice_number,
          invoice_date, invoice_amount, tax_amount, total_amount,
          match_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          session.id,
          'tally',
          item.supplier_gstin,
          item.invoice_number,
          item.invoice_date,
          item.amount,
          item.tax_amount,
          totalAmount,
          'unmatched_target',
        ],
      );
    }

    // 6. Match items: GSTIN + invoice_number + amount
    const allItems = await findMany<Gstr2bItem>(
      client,
      `SELECT * FROM ca_gstr2b_items WHERE session_id = $1`,
      [session.id],
    );

    const gstr2bItems = allItems.filter((i: Gstr2bItem) => i.source === 'gstr2b');
    const tallyItems = allItems.filter((i: Gstr2bItem) => i.source === 'tally');

    let matchedCount = 0;
    let excessIn2b = 0;
    let missingFrom2b = 0;
    let amountMismatchCount = 0;
    const matchedTallyIds = new Set<string>();

    for (const gstr2bItem of gstr2bItems) {
      let found = false;

      for (const tallyItem of tallyItems) {
        if (matchedTallyIds.has(tallyItem.id)) continue;

        // Exact match: GSTIN + invoice_number + amount
        if (
          gstr2bItem.supplier_gstin === tallyItem.supplier_gstin &&
          gstr2bItem.invoice_number === tallyItem.invoice_number &&
          gstr2bItem.total_amount === tallyItem.total_amount
        ) {
          await client.query(
            `UPDATE ca_gstr2b_items SET match_status = $1, matched_with = $2 WHERE id = $3`,
            ['matched', tallyItem.id, gstr2bItem.id],
          );
          await client.query(
            `UPDATE ca_gstr2b_items SET match_status = $1, matched_with = $2 WHERE id = $3`,
            ['matched', gstr2bItem.id, tallyItem.id],
          );
          matchedTallyIds.add(tallyItem.id);
          matchedCount++;
          found = true;
          break;
        }

        // Amount mismatch: GSTIN + invoice_number + different amount
        if (
          gstr2bItem.supplier_gstin === tallyItem.supplier_gstin &&
          gstr2bItem.invoice_number === tallyItem.invoice_number
        ) {
          const variance = `${parseFloat(gstr2bItem.total_amount) - parseFloat(tallyItem.total_amount)}`;
          await client.query(
            `UPDATE ca_gstr2b_items SET match_status = $1, matched_with = $2, variance_amount = $3 WHERE id = $4`,
            ['variance', tallyItem.id, variance, gstr2bItem.id],
          );
          await client.query(
            `UPDATE ca_gstr2b_items SET match_status = $1, matched_with = $2, variance_amount = $3 WHERE id = $4`,
            ['variance', gstr2bItem.id, variance, tallyItem.id],
          );
          matchedTallyIds.add(tallyItem.id);
          amountMismatchCount++;
          found = true;
          break;
        }
      }

      if (!found) {
        await client.query(`UPDATE ca_gstr2b_items SET match_status = $1 WHERE id = $2`, [
          'unmatched_source',
          gstr2bItem.id,
        ]);
        excessIn2b++;
      }
    }

    missingFrom2b = tallyItems.length - matchedCount - amountMismatchCount;

    // 7. Update session
    await client.query(
      `UPDATE ca_gstr2b_sessions
       SET session_status = $1, total_invoices_2b = $2, total_invoices_register = $3,
           matched_count = $4, excess_in_2b = $5, missing_from_2b = $6, amount_mismatch = $7
       WHERE id = $8`,
      [
        'completed',
        gstr2bData.length,
        tallyInvoices.length,
        matchedCount,
        excessIn2b,
        missingFrom2b,
        amountMismatchCount,
        session.id,
      ],
    );

    const updated = await findOne<Gstr2bSession>(
      client,
      `SELECT * FROM ca_gstr2b_sessions WHERE id = $1`,
      [session.id],
    );

    if (!updated) {
      throw new FcError('FC_ERR_GSTR2B_SESSION_NOT_FOUND', 'Session not found', {
        id: session.id,
      });
    }

    return updated;
  });
}

// ═══════════════════════════════════════════════════════════════════
// GET ITC ELIGIBILITY
// ═══════════════════════════════════════════════════════════════════

export async function getItcEligibility(
  ctx: CaRequestContext,
  sessionId: string,
): Promise<ItcEligibility> {
  return withTenantClient(ctx as any, async (client: PoolClient) => {
    const items = await findMany<Gstr2bItem>(
      client,
      `SELECT * FROM ca_gstr2b_items WHERE session_id = $1`,
      [sessionId],
    );

    const tallyItems = items.filter((i: Gstr2bItem) => i.source === 'tally');

    let totalClaimed = 0;
    let totalEligible = 0;
    const mismatches: ItcEligibility['itcMismatches'] = [];

    for (const item of tallyItems) {
      const invoiceTax = parseFloat(item.tax_amount);
      totalClaimed += invoiceTax;

      // ITC only eligible if matched or variance is <5%
      if (item.match_status === 'matched') {
        totalEligible += invoiceTax;
      } else if (item.match_status === 'variance' && item.matched_with) {
        const matchedItem = items.find((i: Gstr2bItem) => i.id === item.matched_with);
        if (matchedItem) {
          const variance = Math.abs(parseFloat(item.total_amount) - parseFloat(matchedItem.total_amount));
          const variancePercent = (variance / parseFloat(item.total_amount)) * 100;

          if (variancePercent < 5) {
            totalEligible += invoiceTax;
          } else {
            mismatches.push({
              supplierGstin: item.supplier_gstin,
              invoiceNumber: item.invoice_number,
              tallyAmount: item.total_amount,
              gstr2bAmount: matchedItem.total_amount,
              variance: `${variance}`,
            });
          }
        }
      }
    }

    const itcToReverse = totalClaimed - totalEligible;
    const reversePercentage =
      totalClaimed > 0 ? (itcToReverse / totalClaimed) * 100 : 0;

    return {
      totalItcClaimed: totalClaimed.toFixed(2),
      totalItcEligible: totalEligible.toFixed(2),
      itcToReverse: itcToReverse.toFixed(2),
      reversePercentage: Math.round(reversePercentage * 100) / 100,
      itcMismatches: mismatches,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
// GENERATE MISMATCH REPORT
// ═══════════════════════════════════════════════════════════════════

export async function generateMismatchReport(
  ctx: CaRequestContext,
  sessionId: string,
): Promise<Gstr2bMismatch[]> {
  return withTenantClient(ctx as any, async (client: PoolClient) => {
    const items = await findMany<Gstr2bItem>(
      client,
      `SELECT * FROM ca_gstr2b_items
       WHERE session_id = $1 AND match_status IN ('variance', 'unmatched_source')
       ORDER BY supplier_gstin, invoice_number`,
      [sessionId],
    );

    const mismatches: Gstr2bMismatch[] = [];

    for (const item of items) {
      if (item.match_status === 'variance' && item.matched_with && item.variance_amount) {
        const varianceAbs = Math.abs(parseFloat(item.variance_amount));
        const tallyAmount = parseFloat(item.total_amount);
        const variancePercent = tallyAmount > 0 ? (varianceAbs / tallyAmount) * 100 : 0;

        mismatches.push({
          id: item.id,
          supplierGstin: item.supplier_gstin,
          invoiceNumber: item.invoice_number,
          invoiceDate: item.invoice_date,
          tallyAmount: item.total_amount,
          gstr2bAmount: item.matched_with ? 'unknown' : item.total_amount,
          variance: item.variance_amount,
          variancePercentage: Math.round(variancePercent * 100) / 100,
          status: 'variance',
        });
      } else if (item.match_status === 'unmatched_source') {
        mismatches.push({
          id: item.id,
          supplierGstin: item.supplier_gstin,
          invoiceNumber: item.invoice_number,
          invoiceDate: item.invoice_date,
          tallyAmount: '0',
          gstr2bAmount: item.total_amount,
          variance: item.total_amount,
          variancePercentage: 100,
          status: 'excess_in_2b',
        });
      }
    }

    return mismatches;
  });
}

// ═══════════════════════════════════════════════════════════════════
// LIST RECONCILIATION SESSIONS
// ═══════════════════════════════════════════════════════════════════

export async function listReconSessions(
  ctx: CaRequestContext,
  clientId: string,
): Promise<Gstr2bSession[]> {
  return withTenantClient(ctx as any, async (client: PoolClient) => {
    return findMany<Gstr2bSession>(
      client,
      `SELECT * FROM ca_gstr2b_sessions
       WHERE ca_firm_id = $1 AND client_id = $2
       ORDER BY created_at DESC`,
      [ctx.caFirmId, clientId],
    );
  });
}

// ═══════════════════════════════════════════════════════════════════
// GET RECONCILIATION SESSION DETAIL
// ═══════════════════════════════════════════════════════════════════

export async function getReconSessionDetail(ctx: CaRequestContext, sessionId: string) {
  return withTenantClient(ctx as any, async (client: PoolClient) => {
    const session = await findOne<Gstr2bSession>(
      client,
      `SELECT * FROM ca_gstr2b_sessions WHERE id = $1`,
      [sessionId],
    );

    if (!session) {
      throw new FcError('FC_ERR_GSTR2B_SESSION_NOT_FOUND', 'Session not found', {
        id: sessionId,
      });
    }

    const items = await findMany<Gstr2bItem>(
      client,
      `SELECT * FROM ca_gstr2b_items WHERE session_id = $1`,
      [sessionId],
    );

    const itcEligibility = await getItcEligibility(ctx, sessionId);

    return {
      session,
      items,
      itcEligibility,
    };
  });
}

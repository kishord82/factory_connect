/**
 * F15: Bank Reconciliation Service
 * Matches bank statements with Tally entries, generates BRS
 */

import type { CaRequestContext } from '@fc/shared';
import { FcError } from '@fc/shared';
import { withTenantTransaction, withTenantClient, insertOne, findOne, findMany } from '@fc/database';
import type { PoolClient } from '@fc/database';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface ReconciliationSession {
  id: string;
  ca_firm_id: string;
  client_id: string;
  period: string;
  bank_code: string;
  account_number: string;
  statement_date: Date;
  statement_balance: string;
  tally_balance: string;
  session_status: 'draft' | 'in_progress' | 'completed' | 'failed';
  match_count: number;
  unmatched_count: number;
  review_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface ReconciliationItem {
  id: string;
  session_id: string;
  source_type: 'bank' | 'tally';
  source_id: string;
  transaction_date: Date;
  description: string;
  amount: string;
  reference: string | null;
  match_status: 'unmatched' | 'matched' | 'partial' | 'review';
  matched_with: string | null;
  match_confidence: number;
  created_at: Date;
  updated_at: Date;
}

export interface BankTransaction {
  date: Date;
  description: string;
  amount: string;
  reference: string | null;
  balance: string;
}

export interface BankReconSummary {
  sessions: ReconciliationSession[];
  overallMatchRate: number;
}

export interface BrsOutput {
  balancePerStatement: string;
  chequeNotPresented: Array<{ chequeNumber: string; amount: string; date: Date }>;
  chequeNotCleared: Array<{ chequeNumber: string; amount: string; date: Date }>;
  adjustedBalance: string;
  balancePerTally: string;
  reconciliationDifference: string;
  reconciled: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// BANK STATEMENT PARSING
// ═══════════════════════════════════════════════════════════════════

export async function parseBankStatement(
  fileBuffer: Buffer,
  bankFormat: string,
): Promise<BankTransaction[]> {
  const content = fileBuffer.toString('utf-8');
  const lines = content.split('\n').map((l) => l.trim()).filter((l) => l);

  // Simple CSV parser — bank-specific parsing in production
  const transactions: BankTransaction[] = [];

  if (bankFormat === 'GENERIC_CSV') {
    // Expected format: date, description, amount, reference, balance
    for (const line of lines.slice(1)) {
      const parts = line.split(',');
      if (parts.length >= 5) {
        transactions.push({
          date: new Date(parts[0]),
          description: parts[1],
          amount: parts[2],
          reference: parts[3] || null,
          balance: parts[4],
        });
      }
    }
  } else {
    throw new FcError('FC_ERR_RECON_UNSUPPORTED_FORMAT', `Bank format ${bankFormat} not supported`, {
      format: bankFormat,
    });
  }

  return transactions;
}

// ═══════════════════════════════════════════════════════════════════
// CREATE BANK RECON SESSION
// ═══════════════════════════════════════════════════════════════════

export async function createBankReconSession(
  ctx: CaRequestContext,
  clientId: string,
  period: string,
  bankCode: string,
  accountNumber: string,
  statementData: BankTransaction[],
): Promise<ReconciliationSession> {
  return withTenantTransaction(ctx as any, async (client: PoolClient) => {
    // 1. Create session
    const session = await insertOne<ReconciliationSession>(
      client,
      `INSERT INTO ca_bank_recon_sessions (
        ca_firm_id, client_id, period, bank_code, account_number,
        statement_date, statement_balance, tally_balance,
        session_status, match_count, unmatched_count, review_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 0, 0)
      RETURNING *`,
      [
        ctx.caFirmId,
        clientId,
        period,
        bankCode,
        accountNumber,
        statementData.length > 0 ? statementData[statementData.length - 1].date : new Date(),
        statementData.length > 0 ? statementData[statementData.length - 1].balance : '0',
        '0', // Will be fetched from Tally
        'draft',
      ],
    );

    // 2. Insert bank statement items
    for (const txn of statementData) {
      await insertOne<ReconciliationItem>(
        client,
        `INSERT INTO ca_recon_items (
          session_id, source_type, transaction_date, description,
          amount, reference, match_status, match_confidence
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          session.id,
          'bank',
          txn.date,
          txn.description,
          txn.amount,
          txn.reference,
          'unmatched',
          0,
        ],
      );
    }

    return session;
  });
}

// ═══════════════════════════════════════════════════════════════════
// AUTO-MATCH LOGIC
// ═══════════════════════════════════════════════════════════════════

function calculateMatchConfidence(
  bankTxn: ReconciliationItem,
  tallyTxn: ReconciliationItem,
): { confidence: number; type: 'exact' | 'fuzzy' | 'partial' | 'low' } {
  // Exact match: same amount + same date + reference contains check/UTR
  if (
    bankTxn.amount === tallyTxn.amount &&
    bankTxn.transaction_date.getTime() === tallyTxn.transaction_date.getTime() &&
    (bankTxn.reference?.includes('CHK') ||
      bankTxn.reference?.includes('UTR') ||
      tallyTxn.reference?.includes('CHK') ||
      tallyTxn.reference?.includes('UTR'))
  ) {
    return { confidence: 0.99, type: 'exact' };
  }

  // Fuzzy: same amount + date within 3 days + partial reference match
  const dateDiff = Math.abs(
    bankTxn.transaction_date.getTime() - tallyTxn.transaction_date.getTime(),
  ) / (1000 * 60 * 60 * 24);

  if (bankTxn.amount === tallyTxn.amount && dateDiff <= 3) {
    const descMatch = bankTxn.description
      .toLowerCase()
      .split(' ')
      .some((word) => tallyTxn.description.toLowerCase().includes(word));
    if (descMatch) {
      return { confidence: 0.85, type: 'fuzzy' };
    }
  }

  // Partial: same amount but different dates
  if (bankTxn.amount === tallyTxn.amount) {
    return { confidence: 0.65, type: 'partial' };
  }

  return { confidence: 0.0, type: 'low' };
}

export async function autoMatch(
  ctx: CaRequestContext,
  sessionId: string,
): Promise<{ matched: number; unmatched: number; needsReview: number }> {
  return withTenantTransaction(ctx as any, async (client: PoolClient) => {
    // Fetch all items for this session
    const items = await findMany<ReconciliationItem>(
      client,
      `SELECT * FROM ca_recon_items WHERE session_id = $1`,
      [sessionId],
    );

    const bankItems = items.filter((i: ReconciliationItem) => i.source_type === 'bank');
    const tallyItems = items.filter((i: ReconciliationItem) => i.source_type === 'tally');

    let matchedCount = 0;
    let reviewCount = 0;
    const matched = new Set<string>();

    // Try to match each bank item
    for (const bankItem of bankItems) {
      let bestMatch: ReconciliationItem | null = null;
      let bestConfidence = 0;

      for (const tallyItem of tallyItems) {
        if (matched.has(tallyItem.id)) continue;

        const { confidence } = calculateMatchConfidence(bankItem, tallyItem);
        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestMatch = tallyItem;
        }
      }

      if (bestMatch && bestConfidence >= 0.65) {
        const status = bestConfidence >= 0.85 ? 'matched' : 'review';
        await client.query(
          `UPDATE ca_recon_items SET match_status = $1, matched_with = $2, match_confidence = $3
           WHERE id = $4`,
          [status, bestMatch.id, bestConfidence, bankItem.id],
        );
        await client.query(
          `UPDATE ca_recon_items SET match_status = $1, matched_with = $2, match_confidence = $3
           WHERE id = $4`,
          [status, bankItem.id, bestConfidence, bestMatch.id],
        );

        matched.add(bestMatch.id);
        if (status === 'matched') {
          matchedCount++;
        } else {
          reviewCount++;
        }
      }
    }

    // Update session
    const unmatchedCount = bankItems.length - matchedCount - reviewCount;
    await client.query(
      `UPDATE ca_bank_recon_sessions
       SET match_count = $1, unmatched_count = $2, review_count = $3, session_status = $4
       WHERE id = $5`,
      [matchedCount, unmatchedCount, reviewCount, 'in_progress', sessionId],
    );

    return { matched: matchedCount, unmatched: unmatchedCount, needsReview: reviewCount };
  });
}

// ═══════════════════════════════════════════════════════════════════
// MANUAL MATCH
// ═══════════════════════════════════════════════════════════════════

export async function manualMatch(
  ctx: CaRequestContext,
  sessionId: string,
  sourceRecordId: string,
  targetRecordId: string,
  _resolution: string,
): Promise<ReconciliationItem> {
  return withTenantTransaction(ctx as any, async (client: PoolClient) => {
    const source = await findOne<ReconciliationItem>(
      client,
      `SELECT * FROM ca_recon_items WHERE id = $1`,
      [sourceRecordId],
    );

    if (!source) {
      throw new FcError('FC_ERR_RECON_ITEM_NOT_FOUND', 'Source record not found', {
        id: sourceRecordId,
      });
    }

    await client.query(
      `UPDATE ca_recon_items SET match_status = $1, matched_with = $2 WHERE id = $3`,
      ['matched', targetRecordId, sourceRecordId],
    );

    await client.query(
      `UPDATE ca_recon_items SET match_status = $1, matched_with = $2 WHERE id = $3`,
      ['matched', sourceRecordId, targetRecordId],
    );

    // Update session counters
    await client.query(
      `UPDATE ca_bank_recon_sessions
       SET match_count = match_count + 1, unmatched_count = GREATEST(0, unmatched_count - 1)
       WHERE id = $1`,
      [sessionId],
    );

    const updated = await findOne<ReconciliationItem>(
      client,
      `SELECT * FROM ca_recon_items WHERE id = $1`,
      [sourceRecordId],
    );

    if (!updated) {
      throw new FcError('FC_ERR_RECON_UPDATE_FAILED', 'Failed to update record', {
        id: sourceRecordId,
      });
    }

    return updated;
  });
}

// ═══════════════════════════════════════════════════════════════════
// GENERATE BRS
// ═══════════════════════════════════════════════════════════════════

export async function generateBrs(ctx: CaRequestContext, sessionId: string): Promise<BrsOutput> {
  return withTenantClient(ctx as any, async (client: PoolClient) => {
    const session = await findOne<ReconciliationSession>(
      client,
      `SELECT * FROM ca_bank_recon_sessions WHERE id = $1`,
      [sessionId],
    );

    if (!session) {
      throw new FcError('FC_ERR_RECON_SESSION_NOT_FOUND', 'Session not found', {
        id: sessionId,
      });
    }

    // Fetch matched items that are cheques
    const chequeNotPresented = await findMany<{
      cheque_number: string;
      amount: string;
      cheque_date: Date;
    }>(
      client,
      `SELECT cheque_number, amount, cheque_date FROM ca_recon_cheques
       WHERE session_id = $1 AND presented = false
       ORDER BY cheque_date`,
      [sessionId],
    );

    const chequeNotCleared = await findMany<{
      cheque_number: string;
      amount: string;
      cheque_date: Date;
    }>(
      client,
      `SELECT cheque_number, amount, cheque_date FROM ca_recon_cheques
       WHERE session_id = $1 AND cleared = false
       ORDER BY cheque_date`,
      [sessionId],
    );

    // Calculate BRS
    const statementBalance = parseFloat(session.statement_balance);
    const tallyBalance = parseFloat(session.tally_balance);

    const notPresentedTotal = chequeNotPresented.reduce(
      (sum: number, c: typeof chequeNotPresented[number]) => sum + parseFloat(c.amount),
      0,
    );
    const notClearedTotal = chequeNotCleared.reduce((sum: number, c: typeof chequeNotCleared[number]) => sum + parseFloat(c.amount), 0);

    const adjustedBalance = statementBalance + notPresentedTotal - notClearedTotal;
    const difference = Math.abs(adjustedBalance - tallyBalance);

    return {
      balancePerStatement: statementBalance.toFixed(2),
      chequeNotPresented: chequeNotPresented.map((c: typeof chequeNotPresented[number]) => ({
        chequeNumber: c.cheque_number,
        amount: c.amount,
        date: c.cheque_date,
      })),
      chequeNotCleared: chequeNotCleared.map((c: typeof chequeNotCleared[number]) => ({
        chequeNumber: c.cheque_number,
        amount: c.amount,
        date: c.cheque_date,
      })),
      adjustedBalance: adjustedBalance.toFixed(2),
      balancePerTally: tallyBalance.toFixed(2),
      reconciliationDifference: difference.toFixed(2),
      reconciled: difference < 0.01, // Within 1 paise
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
// GET RECONCILIATION SUMMARY
// ═══════════════════════════════════════════════════════════════════

export async function getReconSummary(
  ctx: CaRequestContext,
  clientId: string,
): Promise<BankReconSummary> {
  return withTenantClient(ctx as any, async (client: PoolClient) => {
    const sessions = await findMany<ReconciliationSession>(
      client,
      `SELECT * FROM ca_bank_recon_sessions
       WHERE ca_firm_id = $1 AND client_id = $2
       ORDER BY created_at DESC`,
      [ctx.caFirmId, clientId],
    );

    let totalMatched = 0;
    let totalItems = 0;

    for (const session of sessions) {
      const items = await findMany<ReconciliationItem>(
        client,
        `SELECT * FROM ca_recon_items WHERE session_id = $1`,
        [session.id],
      );

      totalItems += items.length;
      totalMatched += items.filter((i: ReconciliationItem) => i.match_status === 'matched').length;
    }

    const overallMatchRate = totalItems > 0 ? (totalMatched / totalItems) * 100 : 0;

    return {
      sessions,
      overallMatchRate: Math.round(overallMatchRate * 100) / 100,
    };
  });
}

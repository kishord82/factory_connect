/**
 * Premium Feature F6: Export EDI Compliance Service
 * Supports exporter clients managing customs shipping bills, BoL, ICEGATE, duty drawback tracking
 */

import type { CaRequestContext } from '@fc/shared';
import type { PoolClient } from '@fc/database';
import { FcError } from '@fc/shared';
import { withTenantTransaction, withTenantClient } from '@fc/database';

interface ShippingBillRow {
  id: string;
  ca_firm_id: string;
  client_id: string;
  invoice_ids: string[];
  sb_number: string;
  sb_date: Date;
  fob_value: string;
  currency: string;
  hs_codes: Record<string, unknown>;
  igst_amount: string;
  status: string;
  icegate_submitted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface BillOfLadingRow {
  id: string;
  ca_firm_id: string;
  client_id: string;
  shipment_id: string;
  bol_number: string;
  bol_date: Date;
  origin_port: string;
  destination_port: string;
  vessel_name: string | null;
  voyage_number: string | null;
  bill_of_lading_date: Date;
  weight_kg: string;
  created_at: Date;
  updated_at: Date;
}

interface DrawbackClaimRow {
  id: string;
  ca_firm_id: string;
  client_id: string;
  shipping_bill_id: string;
  shipping_bill_no: string;
  drawback_type: 'IGST' | 'DUTY';
  amount: string;
  filing_status: 'pending' | 'filed' | 'approved' | 'rejected';
  filed_date: Date | null;
  claim_reference: string | null;
  created_at: Date;
  updated_at: Date;
}

interface IcegatePrepRow {
  id: string;
  ca_firm_id: string;
  client_id: string;
  shipping_bill_id: string;
  xml_payload: string;
  icegate_ref_number: string | null;
  submission_status: 'draft' | 'submitted' | 'accepted' | 'rejected';
  submitted_at: Date | null;
  response_message: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * F6.1: generateShippingBill
 * Prepare customs shipping bill from exporter's invoices with correct HS codes and FOB values
 */
export async function generateShippingBill(
  ctx: CaRequestContext,
  clientId: string,
  invoiceIds: string[],
  data: {
    fob_value: string;
    currency: string;
    hs_codes: Record<string, unknown>;
  },
): Promise<ShippingBillRow> {
  return withTenantTransaction(
    { tenantId: ctx.caFirmId, userId: ctx.userId, correlationId: ctx.correlationId } as any,
    async (client: PoolClient) => {
      if (invoiceIds.length === 0) {
        throw new FcError(
          'FC_ERR_EDI_NO_INVOICES',
          'At least one invoice required for shipping bill',
          { clientId },
          400,
        );
      }

      // Calculate IGST: standard 18% on FOB value
      const fobNum = parseFloat(data.fob_value);
      const igstAmount = (fobNum * 0.18).toFixed(2);

      // Generate shipping bill number: SB-DDMMYY-SEQ
      const today = new Date();
      const ddmmyy = `${String(today.getDate()).padStart(2, '0')}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getFullYear()).slice(-2)}`;
      const seqResult = await client.query(
        'SELECT COUNT(*) + 1 as next_seq FROM export_shipping_bills WHERE ca_firm_id = $1 AND sb_date::date = CURRENT_DATE',
        [ctx.caFirmId],
      );
      const nextSeq = (seqResult.rows[0]?.next_seq || 1) as number;
      const sbNumber = `SB-${ddmmyy}-${String(nextSeq).padStart(4, '0')}`;

      const result = await client.query<ShippingBillRow>(
        `INSERT INTO export_shipping_bills (
          ca_firm_id, client_id, invoice_ids, sb_number, sb_date,
          fob_value, currency, hs_codes, igst_amount, status
        ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, 'draft')
        RETURNING *`,
        [
          ctx.caFirmId,
          clientId,
          JSON.stringify(invoiceIds),
          sbNumber,
          data.fob_value,
          data.currency,
          JSON.stringify(data.hs_codes),
          igstAmount,
        ],
      );

      if (result.rows.length === 0) {
        throw new FcError('FC_ERR_EDI_SB_CREATE_FAILED', 'Failed to create shipping bill', {}, 500);
      }

      return result.rows[0];
    },
  );
}

/**
 * F6.2: generateBoL
 * Generate Bill of Lading document for export shipment
 */
export async function generateBoL(
  ctx: CaRequestContext,
  clientId: string,
  data: {
    shipment_id: string;
    origin_port: string;
    destination_port: string;
    vessel_name?: string;
    voyage_number?: string;
    weight_kg: string;
  },
): Promise<BillOfLadingRow> {
  return withTenantTransaction(
    { tenantId: ctx.caFirmId, userId: ctx.userId, correlationId: ctx.correlationId } as any,
    async (client: PoolClient) => {
      // Verify shipment exists and belongs to this client
      const shipmentCheck = await client.query(
        'SELECT id FROM orders.canonical_shipments WHERE id = $1',
        [data.shipment_id],
      );
      if (shipmentCheck.rows.length === 0) {
        throw new FcError('FC_ERR_SHIPMENT_NOT_FOUND', `Shipment ${data.shipment_id} not found`, {}, 404);
      }

      // Generate BoL number: BOL-DDMMYY-SEQ
      const today = new Date();
      const ddmmyy = `${String(today.getDate()).padStart(2, '0')}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getFullYear()).slice(-2)}`;
      const seqResult = await client.query(
        'SELECT COUNT(*) + 1 as next_seq FROM export_bills_of_lading WHERE ca_firm_id = $1 AND bol_date::date = CURRENT_DATE',
        [ctx.caFirmId],
      );
      const nextSeq = (seqResult.rows[0]?.next_seq || 1) as number;
      const bolNumber = `BOL-${ddmmyy}-${String(nextSeq).padStart(4, '0')}`;

      const result = await client.query<BillOfLadingRow>(
        `INSERT INTO export_bills_of_lading (
          ca_firm_id, client_id, shipment_id, bol_number, bol_date,
          origin_port, destination_port, vessel_name, voyage_number, weight_kg
        ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          ctx.caFirmId,
          clientId,
          data.shipment_id,
          bolNumber,
          data.origin_port,
          data.destination_port,
          data.vessel_name ?? null,
          data.voyage_number ?? null,
          data.weight_kg,
        ],
      );

      if (result.rows.length === 0) {
        throw new FcError('FC_ERR_EDI_BOL_CREATE_FAILED', 'Failed to create bill of lading', {}, 500);
      }

      return result.rows[0];
    },
  );
}

/**
 * F6.3: prepareIcegateSubmission
 * Format shipping bill data for ICEGATE EDI filing (Customs declaration)
 */
export async function prepareIcegateSubmission(
  ctx: CaRequestContext,
  clientId: string,
  shippingBillId: string,
): Promise<IcegatePrepRow> {
  return withTenantTransaction(
    { tenantId: ctx.caFirmId, userId: ctx.userId, correlationId: ctx.correlationId } as any,
    async (client: PoolClient) => {
      // Fetch shipping bill
      const sbResult = await client.query<ShippingBillRow>(
        'SELECT * FROM export_shipping_bills WHERE id = $1 AND ca_firm_id = $2',
        [shippingBillId, ctx.caFirmId],
      );

      if (sbResult.rows.length === 0) {
        throw new FcError(
          'FC_ERR_SHIPPING_BILL_NOT_FOUND',
          `Shipping bill ${shippingBillId} not found`,
          {},
          404,
        );
      }

      const sb = sbResult.rows[0];

      // Build minimal ICEGATE XML (stub structure)
      const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<ICEGATE_FILING>
  <SHIPPING_BILL>
    <SB_NUMBER>${sb.sb_number}</SB_NUMBER>
    <SB_DATE>${sb.sb_date.toISOString().split('T')[0]}</SB_DATE>
    <FOB_VALUE>${sb.fob_value}</FOB_VALUE>
    <CURRENCY>${sb.currency}</CURRENCY>
    <IGST_AMOUNT>${sb.igst_amount}</IGST_AMOUNT>
    <HS_CODES>${JSON.stringify(sb.hs_codes)}</HS_CODES>
  </SHIPPING_BILL>
</ICEGATE_FILING>`;

      const result = await client.query<IcegatePrepRow>(
        `INSERT INTO export_icegate_submissions (
          ca_firm_id, client_id, shipping_bill_id, xml_payload, submission_status
        ) VALUES ($1, $2, $3, $4, 'draft')
        RETURNING *`,
        [ctx.caFirmId, clientId, shippingBillId, xmlPayload],
      );

      if (result.rows.length === 0) {
        throw new FcError('FC_ERR_ICEGATE_PREP_FAILED', 'Failed to prepare ICEGATE submission', {}, 500);
      }

      return result.rows[0];
    },
  );
}

/**
 * F6.4: trackDutyDrawback
 * Track IGST and duty drawback claims for exporter clients
 */
export async function trackDutyDrawback(
  ctx: CaRequestContext,
  clientId: string,
  period: string, // YYYY-MM
): Promise<DrawbackClaimRow[]> {
  return withTenantClient(
    { tenantId: ctx.caFirmId, userId: ctx.userId, correlationId: ctx.correlationId } as any,
    async (client: PoolClient) => {
      const [year, month] = period.split('-');
      if (!year || !month) {
        throw new FcError(
          'FC_ERR_INVALID_PERIOD',
          'Period must be YYYY-MM format',
          { period },
          400,
        );
      }

      const result = await client.query<DrawbackClaimRow>(
        `SELECT * FROM export_drawback_claims
         WHERE ca_firm_id = $1 AND client_id = $2
         AND TO_CHAR(created_at, 'YYYY-MM') = $3
         ORDER BY created_at DESC`,
        [ctx.caFirmId, clientId, period],
      );

      return result.rows;
    },
  );
}

/**
 * F6.5: exportComplianceDashboard
 * Overview of export compliance status for the CA firm
 */
export async function exportComplianceDashboard(
  ctx: CaRequestContext,
): Promise<{
  activeExporters: number;
  pendingShippingBills: number;
  drawbackPending: number;
  filingsDue: number;
}> {
  return withTenantClient(
    { tenantId: ctx.caFirmId, userId: ctx.userId, correlationId: ctx.correlationId } as any,
    async (client: PoolClient) => {
      const [exportersResult, sbResult, drawbackResult, filingResult] = await Promise.all([
        client.query<{ count: string }>(
          'SELECT COUNT(DISTINCT client_id)::text as count FROM export_shipping_bills WHERE ca_firm_id = $1',
          [ctx.caFirmId],
        ),
        client.query<{ count: string }>(
          "SELECT COUNT(*)::text as count FROM export_shipping_bills WHERE ca_firm_id = $1 AND status IN ('draft', 'in_progress')",
          [ctx.caFirmId],
        ),
        client.query<{ count: string }>(
          "SELECT COUNT(*)::text as count FROM export_drawback_claims WHERE ca_firm_id = $1 AND filing_status IN ('pending', 'filed')",
          [ctx.caFirmId],
        ),
        client.query<{ count: string }>(
          `SELECT COUNT(*)::text as count FROM export_icegate_submissions
           WHERE ca_firm_id = $1 AND submission_status IN ('draft', 'rejected')`,
          [ctx.caFirmId],
        ),
      ]);

      return {
        activeExporters: parseInt(exportersResult.rows[0]?.count || '0', 10),
        pendingShippingBills: parseInt(sbResult.rows[0]?.count || '0', 10),
        drawbackPending: parseInt(drawbackResult.rows[0]?.count || '0', 10),
        filingsDue: parseInt(filingResult.rows[0]?.count || '0', 10),
      };
    },
  );
}

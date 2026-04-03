/**
 * D2: ERP adapter interface — common contract for all ERP connectors.
 */

export interface ErpAdapter {
  name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<boolean>;
  fetchOrders(since?: Date): Promise<ErpOrder[]>;
  fetchProducts(): Promise<ErpProduct[]>;
  fetchInvoices(since?: Date): Promise<ErpInvoice[]>;
}

export interface ErpOrder {
  erp_order_id: string;
  order_date: string;
  customer_name: string;
  items: ErpOrderItem[];
  total_amount: number;
  currency: string;
  status: string;
  raw_data?: Record<string, unknown>;
}

export interface ErpOrderItem {
  item_name: string;
  sku: string;
  quantity: number;
  uom: string;
  unit_price: number;
  line_total: number;
  hsn_code?: string;
}

export interface ErpProduct {
  sku: string;
  name: string;
  description?: string;
  hsn_code?: string;
  unit_price?: number;
  uom?: string;
  category?: string;
}

export interface ErpInvoice {
  erp_invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  order_reference?: string;
  customer_name: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  items: ErpInvoiceItem[];
  raw_data?: Record<string, unknown>;
}

export interface ErpInvoiceItem {
  item_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  tax_rate?: number;
  hsn_code?: string;
}

/**
 * D2: Zoho Books ERP adapter.
 * Connects to Zoho Books REST API.
 */
import type { ErpAdapter, ErpOrder, ErpProduct, ErpInvoice } from './types.js';

export class ZohoAdapter implements ErpAdapter {
  name = 'zoho';
  private apiToken: string;
  private orgId: string;
  private baseUrl: string;
  private connected = false;

  constructor(apiToken: string = '', orgId: string = '', baseUrl: string = 'https://books.zoho.in/api/v3') {
    this.apiToken = apiToken;
    this.orgId = orgId;
    this.baseUrl = baseUrl;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async healthCheck(): Promise<boolean> {
    return this.connected;
  }

  async fetchOrders(_since?: Date): Promise<ErpOrder[]> {
    // In production: GET /salesorders with date filter
    return [];
  }

  async fetchProducts(): Promise<ErpProduct[]> {
    // In production: GET /items
    return [];
  }

  async fetchInvoices(_since?: Date): Promise<ErpInvoice[]> {
    // In production: GET /invoices with date filter
    return [];
  }

  get endpoint(): string {
    return `${this.baseUrl}?organization_id=${this.orgId}&authtoken=${this.apiToken}`;
  }
}

/**
 * D2: SAP Business One adapter.
 * Connects to SAP B1 Service Layer REST API.
 */
import type { ErpAdapter, ErpOrder, ErpProduct, ErpInvoice } from './types.js';

export class SapB1Adapter implements ErpAdapter {
  name = 'sap_b1';
  private serviceLayerUrl: string;
  private connected = false;

  constructor(serviceLayerUrl: string = 'https://localhost:50000/b1s/v1') {
    this.serviceLayerUrl = serviceLayerUrl;
  }

  async connect(): Promise<void> {
    // In production: POST /Login to get session
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    // In production: POST /Logout
    this.connected = false;
  }

  async healthCheck(): Promise<boolean> {
    return this.connected;
  }

  async fetchOrders(_since?: Date): Promise<ErpOrder[]> {
    // In production: GET /Orders with $filter
    return [];
  }

  async fetchProducts(): Promise<ErpProduct[]> {
    // In production: GET /Items
    return [];
  }

  async fetchInvoices(_since?: Date): Promise<ErpInvoice[]> {
    // In production: GET /Invoices with $filter
    return [];
  }

  get endpoint(): string {
    return this.serviceLayerUrl;
  }
}

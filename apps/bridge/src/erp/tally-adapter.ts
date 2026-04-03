/**
 * D2: Tally Prime ERP adapter.
 * Connects to Tally's XML-over-HTTP API (port 9000 by default).
 */
import type { ErpAdapter, ErpOrder, ErpProduct, ErpInvoice } from './types.js';

export class TallyAdapter implements ErpAdapter {
  name = 'tally';
  private host: string;
  private port: number;
  private connected = false;

  constructor(host: string = 'localhost', port: number = 9000) {
    this.host = host;
    this.port = port;
  }

  async connect(): Promise<void> {
    // In production: verify Tally is reachable
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async healthCheck(): Promise<boolean> {
    try {
      // In production: send a Tally XML request to check connectivity
      return this.connected;
    } catch {
      return false;
    }
  }

  async fetchOrders(_since?: Date): Promise<ErpOrder[]> {
    // In production: sends TDL XML request to Tally
    // For now, returns empty — actual implementation requires Tally SDK
    return [];
  }

  async fetchProducts(): Promise<ErpProduct[]> {
    return [];
  }

  async fetchInvoices(_since?: Date): Promise<ErpInvoice[]> {
    return [];
  }

  /**
   * Build Tally XML request envelope.
   * Tally uses a custom XML protocol over HTTP POST.
   */
  get endpoint(): string {
    return `http://${this.host}:${this.port}`;
  }

  buildTdlRequest(reportName: string, filters?: Record<string, string>): string {
    const filterXml = filters
      ? Object.entries(filters).map(([k, v]) => `<${k}>${v}</${k}>`).join('')
      : '';
    return `<ENVELOPE>
      <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
      <BODY>
        <EXPORTDATA>
          <REQUESTDESC>
            <REPORTNAME>${reportName}</REPORTNAME>
            ${filterXml ? `<STATICVARIABLES>${filterXml}</STATICVARIABLES>` : ''}
          </REQUESTDESC>
        </EXPORTDATA>
      </BODY>
    </ENVELOPE>`;
  }
}

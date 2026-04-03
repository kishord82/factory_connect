export type { ErpAdapter, ErpOrder, ErpOrderItem, ErpProduct, ErpInvoice, ErpInvoiceItem } from './types.js';
export { TallyAdapter } from './tally-adapter.js';
export { ZohoAdapter } from './zoho-adapter.js';
export { SapB1Adapter } from './sap-b1-adapter.js';

import type { ErpAdapter } from './types.js';
import { TallyAdapter } from './tally-adapter.js';
import { ZohoAdapter } from './zoho-adapter.js';
import { SapB1Adapter } from './sap-b1-adapter.js';

export function createErpAdapter(type: string, options: Record<string, unknown> = {}): ErpAdapter {
  switch (type) {
    case 'tally': return new TallyAdapter(options.host as string, options.port as number);
    case 'zoho': return new ZohoAdapter(options.apiToken as string, options.orgId as string);
    case 'sap_b1': return new SapB1Adapter(options.serviceLayerUrl as string);
    default: throw new Error(`Unknown ERP type: ${type}`);
  }
}

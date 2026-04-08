# Tally Extractors for Bridge Agent

Comprehensive Tally Prime data extraction module for the FactoryConnect Bridge Agent. Extracts critical financial, operational, and inventory data from TallyPrime via its XML-over-HTTP API on port 9000.

## Architecture

### Design Principles

- **Abstract Base Class**: All extractors inherit from `BaseExtractor`, which handles HTTP communication, XML parsing, error handling, and retry logic.
- **Type Safety**: Zero `any` types. All functions explicitly typed. All data structures defined in interfaces.
- **Error Codes**: Structured error codes following `FC_ERR_{DOMAIN}_{SPECIFIC}` pattern.
- **Parallel Extraction**: Multiple data types extracted in parallel within single extractor (e.g., GST sales + purchase + HSN in one `extract()` call).
- **Failure Tolerance**: Individual register failures don't crash entire extraction. Errors collected and returned.

## Extractors

### 1. GST Extractor (`gst-extractor.ts`)

Extracts GST compliance data from Tally.

**Data Extracted:**
- **Sales Register**: Invoice-level GST details (CGST, SGST, IGST, Cess)
- **Purchase Register**: Same structure as sales (inbound GST)
- **HSN Summary**: Product-level HSN codes and tax aggregates
- **B2B Summary**: Count of B2B, B2C, CDNR, Export transactions

**Usage:**
```typescript
const gstExtractor = new GstExtractor({
  host: 'localhost',
  port: 9000,
  companyName: 'My Company',
  timeout: 30000,
});

const result = await gstExtractor.extract();
console.log(result.data.salesRegister); // GstSalesLine[]
console.log(result.data.b2bSummary);    // B2bSummary
```

**TDL Report**: `GST Sales Register`, `GST Purchase Register`, `GST HSN Summary`, `GST B2B Summary`

---

### 2. TDS Extractor (`tds-extractor.ts`)

Extracts Tax Deducted at Source data.

**Data Extracted:**
- **Deductions**: Ledger-wise TDS (Section 194A, 194C, 194J, etc.), gross amount, rate, amount deducted, challan details
- **Challans**: TDS challans deposited (challan number, BSR code, date, amount)
- **Party Summary**: Per-party reconciliation (total deducted vs. total deposited, variance)

**Usage:**
```typescript
const tdsExtractor = new TdsExtractor(tallyConfig);
const result = await tdsExtractor.extract();
console.log(result.data.partySummary[0].variance); // TDS difference
```

**TDL Report**: `TDS Deductions Register`, `TDS Challans Register`, `TDS Party Summary`

---

### 3. Ledger Extractor (`ledger-extractor.ts`)

Extracts Chart of Accounts (COA) and ledger master data.

**Data Extracted:**
- **Ledgers**: All GL accounts with balances, debit/credit totals, GST details (GSTIN, PAN), address, state
- **Groups**: Ledger groups (parent hierarchy, nature: Assets/Liabilities/Income/Expense)

**Usage:**
```typescript
const ledgerExtractor = new LedgerExtractor(tallyConfig);
const result = await ledgerExtractor.extract();
result.data.ledgers.forEach(ledger => {
  console.log(ledger.name, ledger.closingBalance, ledger.gstin);
});
```

**TDL Report**: `Chart of Accounts`, `Ledger Groups`

---

### 4. Bank Extractor (`bank-extractor.ts`)

Extracts bank transaction and account data.

**Data Extracted:**
- **Transactions**: Cheques, transfers, journal entries with reconciliation status, instrument details
- **Bank Accounts**: Account master (number, IFSC, opening/closing balance)

**Usage:**
```typescript
const bankExtractor = new BankExtractor(tallyConfig);
const result = await bankExtractor.extract();
result.data.transactions.filter(t => t.reconciled === false); // Unreconciled
```

**TDL Report**: `Bank Transactions`, `Bank Accounts`

---

### 5. Payroll Extractor (`payroll-extractor.ts`)

Extracts employee and salary data.

**Data Extracted:**
- **Employees**: Master data (name, ID, designation, department, PAN, UAN, ESI, bank account, DOJ)
- **Salary Register**: Monthly salary breakdown (basic, HRA, DA, allowances, PF, ESI, TDS, deductions, net)

**Usage:**
```typescript
const payrollExtractor = new PayrollExtractor(tallyConfig);
const result = await payrollExtractor.extract();
result.data.salaryRegister.forEach(salary => {
  console.log(salary.employeeName, salary.grossSalary, salary.netSalary);
});
```

**TDL Report**: `Employees Master`, `Salary Register`

---

### 6. Trial Balance Extractor (`trial-balance-extractor.ts`)

Extracts trial balance for any date range.

**Data Extracted:**
- **Entries**: Per-ledger opening/closing balances, transaction debits/credits
- **Totals**: Aggregated debit/credit verification

**Usage:**
```typescript
const tbExtractor = new TrialBalanceExtractor(tallyConfig, '2024-03-31');
const result = await tbExtractor.extract();
console.log(result.data.asOfDate);        // '2024-03-31'
console.log(result.data.totals.closingDebit === result.data.totals.closingCredit); // Should balance
```

**TDL Report**: `Trial Balance`

---

### 7. Stock Extractor (`stock-extractor.ts`)

Extracts inventory and stock movement data.

**Data Extracted:**
- **Items**: Stock master (name, group, godown, unit, opening/closing quantity/value, HSN, GST rate)
- **Movements**: Transaction-level stock movements (purchase, sales, transfers)

**Usage:**
```typescript
const stockExtractor = new StockExtractor(tallyConfig);
const result = await stockExtractor.extract();
result.data.items.forEach(item => {
  const movement = item.closingQuantity - item.openingQuantity;
  console.log(item.name, movement);
});
```

**TDL Report**: `Stock Items Summary`, `Stock Movement Register`

---

## Base Extractor Capabilities

### HTTP Client with Retry

```typescript
// Automatic retry on transient failures (3 attempts, exponential backoff)
// Connection refused (Tally not running): Immediate throw (FC_ERR_TALLY_NOT_RUNNING)
// Timeout: Immediate throw (FC_ERR_TALLY_TIMEOUT)
// HTTP error (500, etc.): Immediate throw (FC_ERR_TALLY_HTTP_ERROR)
```

### XML Parsing

- Uses `fast-xml-parser` for robust parsing
- Handles attributes, namespaces, CDATA
- Throws `FC_ERR_TALLY_XML_PARSE_ERROR` on malformed XML

### TDL Request Building

- Automatically builds valid Tally Definition Language XML envelopes
- Escapes special characters in strings
- Supports optional filter variables

### Error Handling

All errors inherit from `FcError` with structured error codes:
- `FC_ERR_TALLY_NOT_RUNNING` — Connection refused
- `FC_ERR_TALLY_TIMEOUT` — Request timeout
- `FC_ERR_TALLY_HTTP_ERROR` — HTTP error response
- `FC_ERR_TALLY_XML_PARSE_ERROR` — XML parsing failed
- `FC_ERR_TALLY_EMPTY_RESPONSE` — Tally returned no data
- `FC_ERR_TALLY_INVALID_RESPONSE_TYPE` — Response is not an object
- `FC_ERR_BRIDGE_*_EXTRACTION_FAILED` — Extraction-specific failure

---

## Scheduler

### Overview

`ExtractionScheduler` manages recurring extractions with configurable schedules and health checks.

### Default Schedules

| Type | Schedule | Frequency |
|------|----------|-----------|
| GST | `0 2 * * *` | Daily 2 AM |
| TDS | `0 3 * * 0` | Weekly Sunday 3 AM |
| LEDGER | `0 2 * * *` | Daily 2 AM |
| BANK | `0 3 * * *` | Daily 3 AM |
| PAYROLL | `0 4 1 * *` | Monthly 1st at 4 AM |
| TRIAL_BALANCE | `0 4 * * *` | Daily 4 AM |
| STOCK | `0 2 * * 5` | Weekly Friday 2 AM |

### Usage

```typescript
import { ExtractionScheduler, DEFAULT_SCHEDULES } from '@fc/bridge/extractors';

const scheduler = new ExtractionScheduler({
  tallyConfig: {
    host: 'localhost',
    port: 9000,
    companyName: 'My Company',
    timeout: 30000,
  },
  schedules: DEFAULT_SCHEDULES,
  timezone: 'Asia/Kolkata',
});

// Execute single extraction immediately
const gstResult = await scheduler.executeExtraction('GST');

// Execute all enabled extractions
const allResults = await scheduler.executeAllExtractions();
allResults.forEach((result, type) => {
  console.log(`${type}: ${result.recordCount} records`);
});

// Update schedule
scheduler.updateSchedule('GST', { enabled: false }); // Disable GST

// Get job status
const jobs = scheduler.getAllJobs();
console.log(jobs[0].status); // 'success' | 'failed' | 'running'
```

### Job Tracking

Each extraction creates a job with status:
```typescript
interface ExtractionJob {
  id: string;                 // GST-{timestamp}
  type: ExtractionType;       // 'GST', 'TDS', etc.
  status: 'pending' | 'running' | 'success' | 'failed';
  startedAt: Date | null;
  completedAt: Date | null;
  recordCount: number;
  errorCount: number;
  errors: string[];
}
```

---

## TallyConfig Interface

```typescript
interface TallyConfig {
  host: string;    // Tally machine IP (default: localhost)
  port: number;    // Tally XML port (default: 9000)
  companyName: string;  // Company name in Tally
  timeout: number; // Request timeout in ms (default: 30000)
}
```

---

## ExtractionResult Interface

```typescript
interface ExtractionResult<T> {
  success: boolean;         // All sections succeeded
  data: T;                  // Typed data (GstExtractionData, etc.)
  extractedAt: Date;        // Extraction timestamp
  recordCount: number;      // Total records extracted
  errors: string[];         // Per-section error messages
}
```

---

## Error Handling Patterns

### Transient Errors (Retried)

None — Tally connection errors are treated as fatal immediately.

### Fatal Errors (Not Retried)

- Tally not running (ECONNREFUSED)
- Request timeout
- Malformed XML from Tally
- Validation failure (response type mismatch)

### Partial Failures

Individual register failures don't crash the extractor. For example, if GST sales register extraction fails but purchase register succeeds:

```typescript
const result = await gstExtractor.extract();
console.log(result.success);           // false (has errors)
console.log(result.data.salesRegister); // [] (failed)
console.log(result.data.purchaseRegister); // [...] (succeeded)
console.log(result.errors); // ["Sales Register: ...error details..."]
```

---

## Testing

All extractors have co-located tests (`.test.ts` files) covering:
- Happy path extraction with mock XML responses
- XML parsing edge cases
- Network timeout handling
- Tally not running (connection refused)
- Empty data handling
- Malformed XML response
- Retry logic

Run tests:
```bash
cd apps/bridge
pnpm test
```

---

## Implementation Notes

### No ORM, Raw XML

Extractors work directly with Tally's XML API. No transformation layer or ORM. Data flows: Tally XML → Parse → TypeScript objects → Return.

### Strict TypeScript

- Zero `any` types
- All function parameters and returns explicitly typed
- `strict: true` in tsconfig

### Error Codes

All errors follow pattern:
```
FC_ERR_{DOMAIN}_{SPECIFIC}
FC_ERR_TALLY_NOT_RUNNING
FC_ERR_BRIDGE_GST_EXTRACTION_FAILED
```

### Parallel Extractions

Each extractor's `extract()` method runs sub-extractions in parallel:
```typescript
const [salesRegister, purchaseRegister, hsnSummary] = await Promise.all([
  this.extractSalesRegister(),
  this.extractPurchaseRegister(),
  this.extractHsnSummary(),
]);
```

### No Global State

Each extractor instance is independent. No shared state, caches, or singletons. Safe for concurrent use.

---

## Integration with Bridge Agent

The extractors are integrated into the Bridge Agent's data sync workflow:

1. **FactoryConnect Portal** calls Bridge Agent's `/sync` endpoint
2. Bridge Agent creates `ExtractionScheduler` with factory's Tally config
3. Scheduler executes configured extractions on schedule
4. Results are transformed into canonical models
5. Canonical data is sent to Ariba/API Gateway via outbox pattern

See `apps/bridge/src/sync/cloud-sync.ts` for integration details.

---

## Troubleshooting

### Tally Not Running
```
Error: FC_ERR_TALLY_NOT_RUNNING: Tally is not running on localhost:9000
→ Start TallyPrime
```

### XML Parse Error
```
Error: FC_ERR_TALLY_XML_PARSE_ERROR: Failed to parse Tally XML response
→ Check TallyPrime version compatibility
→ Verify XML response format matches TDL spec
```

### Timeout
```
Error: FC_ERR_TALLY_TIMEOUT: Tally request timeout after 30000ms
→ Increase timeout in TallyConfig
→ Check network latency to Tally machine
→ Check Tally server load
```

### Partial Extraction Failure
```
result.success = false
result.errors = ["Sales Register: ..."]
→ Check individual extractor logs
→ Verify Tally reports exist and are accessible
```

---

## Future Enhancements

- [ ] Caching layer for frequently accessed reports
- [ ] Batch extraction (multiple company support)
- [ ] Webhook integration (push updates on new data)
- [ ] Custom TDL report support
- [ ] Real-time sync (Tally events → Bridge)

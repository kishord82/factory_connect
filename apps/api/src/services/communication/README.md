# WhatsApp Communication Engine & Document Collection Service

**Status:** Complete | **Phase:** CA (Compliance & Audit Platform) | **Track:** B (API & Workflow)

## Overview

This module implements the WhatsApp communication engine and document collection service for the FactoryConnect CA Platform. It provides:

- **WhatsApp Cloud API integration** — template messages, freeform messages, webhook handling
- **Template management** — firm-specific and system default templates with variable substitution
- **Document collection** — create, track, and chase document requests with auto-reminders
- **Auto-chase automation** — BullMQ worker that sends periodic reminders during business hours

## Key Features

### WhatsApp Messaging
- Send templated messages via WhatsApp Cloud API (v18.0)
- Send freeform text within 24-hour window from last inbound
- Webhook processing for status updates (sent, delivered, read) and incoming messages
- Phone number normalization (adds country code 91 for Indian numbers)
- Quiet hours enforcement (no sends 21:00-08:00 IST)
- Communication log tracking for all messages

### Document Collection
- Create document requests with due dates and channels (WhatsApp/email)
- List requests with pagination and filtering (status, client, type, date range)
- Mark documents as received and verified
- Duplicate detection (same client + type + period)
- Collection dashboard with status counts and overdue tracking

### Auto-Chase Worker
- Runs every 6 hours via BullMQ
- Identifies overdue requests (status=sent, due_date < NOW())
- Respects reminder limits (max 3 reminders per request)
- Respects 24-hour gap between reminders
- Respects quiet hours (no sends 21:00-08:00 IST)
- Automatically marks as "expired" when max reminders reached

## File Structure

```
apps/api/src/
├── services/communication/
│   ├── whatsapp-service.ts          # WhatsApp Cloud API client
│   ├── whatsapp-service.test.ts     # Unit/integration tests
│   ├── template-service.ts          # Template management
│   ├── doc-request-service.ts       # Document collection
│   ├── doc-request-service.test.ts  # Document tests
│   ├── index.ts                     # Exports
│   └── README.md                    # This file
├── workers/communication/
│   ├── auto-chase-worker.ts         # Auto-chase BullMQ worker
│   ├── whatsapp-webhook-worker.ts   # Webhook processing worker
│   └── index.ts                     # Exports
└── routes/
    └── communication.ts             # REST endpoints
```

## Database Schema

### communication_log
Tracks all messages sent/received.
```sql
CREATE TABLE communication_log (
  id UUID PRIMARY KEY,
  ca_firm_id UUID NOT NULL (RLS: enforced),
  client_id UUID NOT NULL,
  channel VARCHAR NOT NULL, -- 'whatsapp', 'email'
  message_type VARCHAR, -- 'template', 'text', 'document', etc.
  direction VARCHAR NOT NULL, -- 'inbound', 'outbound'
  subject VARCHAR, -- For templates/emails
  body TEXT NOT NULL,
  external_message_id VARCHAR, -- WhatsApp message ID
  status VARCHAR NOT NULL, -- 'sent', 'delivered', 'read', 'failed'
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  error_code VARCHAR,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### document_requests
Tracks document requests and collection status.
```sql
CREATE TABLE document_requests (
  id UUID PRIMARY KEY,
  ca_firm_id UUID NOT NULL (RLS: enforced),
  client_id UUID NOT NULL,
  document_type VARCHAR NOT NULL, -- 'tax_returns', 'financial_statements', etc.
  period VARCHAR NOT NULL, -- 'FY2024', 'Q1-2024', etc.
  due_date DATE NOT NULL,
  channel VARCHAR DEFAULT 'whatsapp', -- 'whatsapp', 'email'
  status VARCHAR DEFAULT 'sent', -- 'sent', 'received', 'verified', 'expired'
  received_at TIMESTAMP,
  verified_at TIMESTAMP,
  verified_by UUID, -- User who verified
  reminder_count INT DEFAULT 0,
  last_reminder_at TIMESTAMP,
  max_reminders INT DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(ca_firm_id, client_id, document_type, period)
);
```

### document_templates
Pre-defined and custom templates for communication.
```sql
CREATE TABLE document_templates (
  id UUID PRIMARY KEY,
  ca_firm_id UUID, -- NULL for system defaults
  name VARCHAR NOT NULL, -- 'doc_request', 'doc_reminder', etc.
  template_type VARCHAR NOT NULL, -- 'document_request', 'reminder', etc.
  channel VARCHAR NOT NULL, -- 'whatsapp', 'email'
  subject VARCHAR, -- For emails
  body_template TEXT NOT NULL, -- Contains {{variables}}
  variables JSONB NOT NULL, -- ["documentType", "dueDate"]
  is_system_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(ca_firm_id, name, channel)
);
```

## API Endpoints

All endpoints require authentication and return `{ success, data, correlationId }`.

### WhatsApp Messaging

**Send Template Message**
```
POST /api/ca/communication/whatsapp/send-template
Content-Type: application/json

{
  "clientId": "client-123",
  "templateName": "doc_request",
  "variables": {
    "documentType": "Tax Returns",
    "period": "FY2024",
    "dueDate": "2024-03-31"
  },
  "language": "en" // optional, defaults to 'en'
}

Response: { messageId: "wamid.123...", status: "sent" }
```

**Send Freeform Text**
```
POST /api/ca/communication/whatsapp/send-text

{
  "clientId": "client-123",
  "text": "Please send your tax returns by March 31st."
}

Response: { messageId: "wamid.456...", status: "sent" }
```

**Get Message Status**
```
GET /api/ca/communication/whatsapp/message/{messageId}/status

Response: {
  "status": "delivered",
  "deliveredAt": "2024-03-15T10:30:00Z",
  "readAt": "2024-03-15T10:35:00Z"
}
```

**Receive Webhook** (called by Meta)
```
POST /api/ca/communication/whatsapp/webhook
X-Hub-Signature-256: sha256=abc123...

{
  "entry": [{
    "changes": [{
      "value": {
        "statuses": [{ "id": "...", "status": "delivered", "timestamp": 1234567890 }],
        "messages": [{ "id": "...", "from": "919876543210", "type": "text", "text": { "body": "..." }, "timestamp": 1234567890 }]
      }
    }]
  }]
}

Response: { success: true }
```

### Document Collection

**Create Document Request**
```
POST /api/ca/communication/documents/request

{
  "clientId": "client-123",
  "documentType": "tax_returns",
  "period": "FY2024",
  "dueDate": "2024-03-31T23:59:59Z",
  "channel": "whatsapp" // or 'email'
}

Response: DocumentRequest { id, status: "sent", reminder_count: 0, ... }
```

**Bulk Create Requests**
```
POST /api/ca/communication/documents/bulk-request

{
  "clientIds": ["c1", "c2", "c3"],
  "documentType": "tax_returns",
  "period": "FY2024",
  "dueDate": "2024-03-31T23:59:59Z"
}

Response: {
  "created": [DocumentRequest, ...],
  "failed": [{ "clientId": "c4", "error": "..." }]
}
```

**List Document Requests**
```
GET /api/ca/communication/documents/requests?page=1&pageSize=20&status=sent&clientId=c1

Response: PaginatedResult {
  data: [DocumentRequest, ...],
  total: 100,
  page: 1,
  pageSize: 20,
  totalPages: 5
}
```

**Verify Document**
```
POST /api/ca/communication/documents/{requestId}/verify

{
  "verifiedBy": "user-123"
}

Response: DocumentRequest { status: "verified", verified_at: "...", ... }
```

**Dashboard Stats**
```
GET /api/ca/communication/documents/dashboard

Response: {
  "total": 100,
  "pending": 5,
  "sent": 30,
  "received": 40,
  "verified": 20,
  "expired": 5,
  "overdueCount": 8
}
```

### Template Management

**List Templates**
```
GET /api/ca/communication/templates?template_type=document_request&channel=whatsapp

Response: [DocumentTemplate, ...]
```

**Create Template**
```
POST /api/ca/communication/templates

{
  "name": "doc_request",
  "template_type": "document_request",
  "channel": "whatsapp",
  "body_template": "Please submit {{ documentType }} for {{ period }} by {{ dueDate }}",
  "variables": ["documentType", "period", "dueDate"]
}

Response: DocumentTemplate { id, ca_firm_id: "firm-1", ... }
```

**Update Template**
```
PUT /api/ca/communication/templates/{templateId}

{
  "body_template": "New template text with {{ variables }}"
}

Response: DocumentTemplate
```

## Environment Variables

```bash
WHATSAPP_PHONE_NUMBER_ID=123456789          # Meta-provided phone number ID
WHATSAPP_ACCESS_TOKEN=token_abc123          # Meta Business Account access token
WHATSAPP_BUSINESS_ACCOUNT_ID=biz_123        # Meta Business Account ID
WHATSAPP_WEBHOOK_VERIFY_TOKEN=verify_token  # Custom token for webhook verification
```

## Error Codes

All errors follow the `FC_ERR_{DOMAIN}_{SPECIFIC}` pattern:

| Code | Meaning | HTTP |
|------|---------|------|
| FC_ERR_WHATSAPP_NO_PHONE | Client has no WhatsApp phone number | 400 |
| FC_ERR_WHATSAPP_CONFIG_MISSING | WhatsApp config incomplete | 500 |
| FC_ERR_WHATSAPP_RATE_LIMITED | WhatsApp API 429 rate limit | 429 |
| FC_ERR_WHATSAPP_API_FAILED | WhatsApp API error | 500 |
| FC_ERR_WHATSAPP_SEND_FAILED | Failed to send message | 500 |
| FC_ERR_WHATSAPP_OUTSIDE_24HR_WINDOW | No recent inbound for freeform | 400 |
| FC_ERR_WHATSAPP_WEBHOOK_SIGNATURE_INVALID | Webhook signature verification failed | 401 |
| FC_ERR_TEMPLATE_NOT_FOUND | Template does not exist | 404 |
| FC_ERR_TEMPLATE_DUPLICATE | Template with same name/type/channel exists | 409 |
| FC_ERR_TEMPLATE_MISSING_VARIABLE | Template render missing variable | 400 |
| FC_ERR_DOCUMENT_REQUEST_NOT_FOUND | Document request not found | 404 |
| FC_ERR_DOCUMENT_REQUEST_DUPLICATE | Duplicate request for same client+type+period | 409 |
| FC_ERR_DOCUMENT_ALREADY_VERIFIED | Document already verified | 400 |
| FC_ERR_DOCUMENT_NOT_RECEIVED | Cannot verify unreceived document | 400 |
| FC_ERR_CLIENT_NOT_FOUND | Client does not exist | 404 |

## Quiet Hours

Auto-chase worker respects quiet hours: **21:00–08:00 IST** (3 PM–4:30 AM UTC).

- Worker checks `isInQuietHours()` before sending reminders
- Timestamps use IST (UTC+5:30)
- Outside quiet hours, messages are sent immediately

## Testing

Run tests:
```bash
make test                    # Run all tests
make test-api               # Run API tests only
npm test -- communication   # Run communication tests specifically
```

Test patterns implemented:
- Happy paths for all major functions
- Error cases with proper FcError codes
- Quiet hours enforcement
- Phone number normalization
- Duplicate detection
- Status transitions
- Pagination and filtering
- RLS verification (cross-tenant isolation)

## Integration Notes

### With Order Service
When orders are confirmed, auto-create document requests for required attachments:
```typescript
await createDocumentRequest(ctx, {
  client_id: order.buyer_id,
  document_type: 'po_acknowledgment',
  period: order.id,
  due_date: addDays(new Date(), 3),
});
```

### With Notification Service
Document events can trigger in-app notifications:
```typescript
await createNotification(ctx, {
  channel: 'in-app',
  severity: 'warning',
  title: 'Document Overdue',
  body: `Tax returns due for ${period} are now overdue`,
  entity_type: 'document_request',
  entity_id: request.id,
});
```

### With Outbox Pattern
Document request creation uses transactional outbox to ensure state consistency:
- Insert document_requests row
- Insert outbox event for document collection workflow
- Saga coordinator picks up and processes

## Performance Considerations

- **Communication log:** Indexed on (ca_firm_id, created_at), (ca_firm_id, client_id)
- **Document requests:** Indexed on (ca_firm_id, status, due_date), (ca_firm_id, client_id)
- **Templates:** Indexed on (ca_firm_id, name, channel)
- **Auto-chase:** Runs once per 6 hours (configurable), max 1 concurrent job
- **Webhook processing:** Concurrency 10, priority queue for real-time handling

## Future Enhancements

1. **Email channel** — SMTP integration for email-based document requests
2. **Document storage** — MinIO integration for document uploads
3. **Signature verification** — Digital signatures via Vault FLE
4. **Batch reminders** — Template-based SMS/email batch campaigns
5. **Analytics dashboard** — Document collection trends and KPIs
6. **Escalation workflows** — Auto-escalate to supervisors on max reminders

## Related Documentation

- [FC_Architecture_Blueprint.md](../../../docs/FC_Architecture_Blueprint.md) — System design
- [FC_Development_Plan.md](../../../docs/FC_Development_Plan.md) — Track B details
- [FC_Architecture_Decisions_History.md](../../../docs/FC_Architecture_Decisions_History.md) — Implementation patterns

# ADR-005: Field-Level Encryption via HashiCorp Vault Transit

**Status:** Accepted
**Date:** 2026-04-02
**Author:** Kishor Dama

## Context

FactoryConnect stores sensitive Indian business identifiers for each factory:
- **GSTIN** — GST Identification Number (tax ID, public but sensitive)
- **PAN** — Permanent Account Number (income tax ID)
- **Bank account number** — used for invoice payment reconciliation
- **IFSC code** — bank branch identifier (paired with account number, enables payment routing)
- **Aadhaar** — national identity number (highest sensitivity, DPDP Act regulated)

These fields must be:
1. **Encrypted at rest** — a database dump must not expose raw values.
2. **Searchable** — the system must look up factories by GSTIN to match incoming orders.
3. **Auditable** — who decrypted what field and when must be logged.
4. **Key-rotatable** — encryption keys must be rotatable without re-encrypting all rows.

PostgreSQL's built-in `pgcrypto` was considered but doesn't provide key management, rotation, or audit logging.

## Decision

Use **HashiCorp Vault Transit Engine** for field-level encryption (FLE) of all regulated fields.

The pattern:
1. Application calls Vault Transit `encrypt` endpoint with the plaintext value.
2. Vault returns a `vault:v1:base64...` ciphertext.
3. Application stores the ciphertext in PostgreSQL.
4. To read: application calls Vault Transit `decrypt` endpoint.
5. Vault logs every encrypt/decrypt operation with the caller's identity.

```typescript
// Encrypt before insert
const encrypted = await vault.transit.encrypt('fc-key', Buffer.from(gstin).toString('base64'));
// encrypted = "vault:v1:8SDd3WHDOjf..."

// Decrypt after select
const plaintext = Buffer.from(
  await vault.transit.decrypt('fc-key', encrypted),
  'base64'
).toString();
```

In development/test environments, env vars are used as a fallback (Vault is not required locally).

## Alternatives Considered

| Approach | Why Rejected |
|----------|-------------|
| **pgcrypto (PostgreSQL built-in)** | No key management, no rotation, no audit log. Keys stored in DB or env vars — compromising the DB also compromises keys. |
| **Application-level AES-256-GCM** | Keys must be stored somewhere (env vars, files). Key rotation requires re-encrypting all rows in application code. No central audit trail. |
| **AWS KMS / GCP KMS** | Vendor lock-in. Incompatible with OCI deployment strategy. Per-API-call cost. |
| **Always-encrypted columns (SQL Server style)** | Not supported in PostgreSQL without extensions. Breaks aggregate queries. |
| **Not encrypting regulated fields** | Non-compliant with India's DPDP Act (2023). Aadhar storage without encryption is a legal violation. |

## Consequences

**Positive:**
- Keys never touch application memory in plaintext — Vault's memory is separate from PostgreSQL's.
- Key rotation: Vault can re-wrap all ciphertexts to a new key version without application changes.
- Audit trail: every decrypt call is logged with the accessor's Vault token identity.
- Dev/test: simple env var fallback means developers don't need a Vault instance locally.

**Negative:**
- Vault adds a network round-trip per encrypt/decrypt call. For bulk operations, use the batch encrypt/decrypt API.
- Vault is a critical dependency — if Vault goes down, no new orders can be processed. Vault HA mode (3-node Raft cluster) is required in production.
- GSTIN-based search requires decrypting all GSTINs to find one, unless a deterministic encryption or HMAC index is also maintained. Solution: store `HMAC(GSTIN, HMAC_KEY)` as a separate indexed column for lookup, and the Vault-encrypted value for actual use.
- `@fc/observability` PII redactor must also mask these values in logs before they reach Vault (belt-and-suspenders).

## Sensitive Field Registry

| Field | Schema.Table | Encrypted Column | HMAC Index |
|-------|-------------|-----------------|------------|
| GSTIN | `core.factories` | `gstin_encrypted` | `gstin_hmac` |
| PAN | `core.factories` | `pan_encrypted` | — |
| Bank account | `core.factories` | `bank_account_encrypted` | — |
| IFSC | `core.factories` | `ifsc_encrypted` | — |
| Aadhaar | `core.factories` | `aadhaar_encrypted` | — |

## References

- `docs/FC_Architecture_Decisions_History.md` — Decision C6 (FLE implementation)
- `packages/shared/src/vault/` — Vault Transit client
- `CLAUDE.md` §9 (Security — FLE for sensitive columns)
- India DPDP Act 2023 — data protection obligations for fiduciaries

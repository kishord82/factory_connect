## Description

<!-- What does this PR do? Link any relevant issues or tickets. -->

## Track

- [ ] Track A — Foundation (DB, migrations, infra)
- [ ] Track B — API + Workflow
- [ ] Track C — Mapping + AI + EDI
- [ ] Track D — Bridge Agent
- [ ] Track E — Portal UI

## Pre-merge Checklist

### Security & Data Integrity
- [ ] RLS tested with wrong tenant context → query returns empty / forbidden (not cross-tenant data)
- [ ] All new API inputs validated with Zod schema in `packages/shared/`
- [ ] No `SELECT *` — all queries list columns explicitly
- [ ] No parameterized query bypass — only `$1`, `$2`, ... placeholders
- [ ] No PII logged — all new log statements pass through Pino with the redaction interceptor
- [ ] FLE applied to any new sensitive columns (GSTIN, PAN, bank account, IFSC, Aadhaar)

### Code Quality
- [ ] Zero `any` types — `unknown` + type guards used instead
- [ ] No direct `process.env` access in app code — config loaded through typed config module
- [ ] Function size ≤ 50 lines — longer functions split into helpers
- [ ] No duplicate code blocks (>2 occurrences extracted to shared utility)
- [ ] `import/no-cycle` — no circular imports introduced

### Tests
- [ ] Co-located test file added next to source (`foo.ts` → `foo.test.ts`)
- [ ] Happy path + at least one error path covered
- [ ] For API endpoints: validation error, auth error, tenant isolation all tested
- [ ] For DB migrations: `up` works, `down` works, RLS policy verified

### Database
- [ ] Migration has both `-- migrate:up` and `-- migrate:down` sections
- [ ] New table has: RLS policy, `record_history` trigger, indexes on FK + filter columns
- [ ] Schema-qualified table names used (`orders.canonical_orders`, not `canonical_orders`)

### Feature Completeness
- [ ] Feature flagged behind `feature_flags` table if incomplete or cross-track dependency unmet
- [ ] No partial implementations shipped without a feature flag

### CI
- [ ] `pnpm typecheck` — zero errors
- [ ] `pnpm lint` — zero warnings
- [ ] `pnpm test` — all tests pass, coverage ≥ 80%
- [ ] `pnpm fmt:check` — no formatting issues

## Screenshots / Evidence

<!-- For Portal (UI) changes: attach before/after screenshots -->
<!-- For API changes: attach curl/Postman output -->
<!-- For migrations: attach `dbmate status` output -->

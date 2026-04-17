# Contributing to FactoryConnect

## Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code. Protected — requires CI pass + 1 approval. |
| `phase1-dev` | Active Phase 1 development. All PRs target this branch. CI-protected. |
| `track-X/feature-name` | Feature branches. See naming below. |

### Branch Naming

Format: `track-{letter}/{kebab-case-description}`

```
track-a/add-rls-policies
track-b/implement-saga-coordinator
track-c/edi-x12-envelope-engine
track-d/tally-xml-client
track-e/order-list-page
```

Use `hotfix/` prefix for urgent production fixes targeting `main`:
```
hotfix/fix-outbox-duplicate-delivery
```

---

## Commit Format

Format: `track-{letter}: {concise description of why, not what}`

```bash
track-a: add RLS policies for all tenant tables
track-b: implement saga coordinator with 15-state lifecycle
track-c: add X12 850 envelope generator for Walmart spec
track-d: adaptive polling pauses above 95% CPU to protect factory PC
track-e: order list shows real-time saga status via polling
```

Rules:
- Lowercase after the colon
- Present tense ("add", not "added")
- Say *why* it matters, not just *what* changed
- Max 72 characters for the first line
- If more context is needed, leave a blank line then explain

---

## Pull Request Process

1. **Branch from `phase1-dev`:** `git checkout -b track-b/my-feature phase1-dev`
2. **Work in small commits** — each commit should be a coherent unit
3. **Run checks locally before pushing:**
   ```bash
   make typecheck   # zero errors
   make lint        # zero warnings
   make fmt         # formatted
   make test        # all pass
   ```
4. **Open PR against `phase1-dev`** with the PR template filled out completely
5. **CI must be green** — all 3 jobs: quality, test, docker-build
6. **Address review comments** — add commits (never force-push to an open PR)

The PR template (`.github/pull_request_template.md`) covers the full checklist. Do not open a PR with unchecked items unless you add an explanation.

---

## Code Standards Summary

These are enforced by ESLint, TypeScript strict mode, and CI. Full details in `.claude/CLAUDE.md`.

### TypeScript
- `strict: true` — no exceptions
- Zero `any` types — use `unknown` + type guards
- All function parameters and return types explicitly typed

### Database
- Raw SQL with `pg` only — no ORM
- Explicit column names — `SELECT *` is banned
- Schema-qualified table names — `orders.canonical_orders`, not `canonical_orders`
- Parameterized queries — `$1`, `$2`, never string concatenation
- Every query in a request must follow a `SET LOCAL app.current_tenant` call

### ESLint Plugins Active
- `@typescript-eslint/strict` — TypeScript strictness rules
- `eslint-plugin-import` — import ordering + `no-cycle` (circular deps)
- `eslint-plugin-sonarjs` — duplicate code, cognitive complexity
- `eslint-plugin-security` — unsafe regex, eval, buffer misuse

### Tests
- Co-located with source: `order-service.ts` → `order-service.test.ts`
- Every public function: at least 1 happy path + 1 error path
- Coverage threshold: **80% lines, functions, branches, statements**

### Error Handling
Always use `FcError`:
```typescript
throw new FcError('FC_ERR_SAGA_INVALID_TRANSITION', 'Cannot go from SHIPPED to PENDING_ACK', {
  orderId,
  currentStep: saga.currentStep,
  requestedStep: 'PENDING_ACK',
});
```

Error codes: `FC_ERR_{DOMAIN}_{SPECIFIC}`. Domains: `AUTH`, `TENANT`, `ORDER`, `SAGA`, `EDI`, `AS2`, `MAPPING`, `BRIDGE`, `SYNC`, `WEBHOOK`, `NOTIFICATION`, `LLM`, `SANDBOX`, `CATALOG`, `VALIDATION`, `CONFIG`, `FEATURE`.

### Logging
```typescript
// ✅ All logs go through Pino with PII redaction
logger.info({ orderId, factoryId }, 'Order created');

// ❌ Never log raw PII
logger.info({ gstin: factory.gstin }, 'Factory lookup'); // will expose PII in logs
```

---

## Adding Dependencies

Do not install packages without discussing first. For each new dependency, explain:
1. What it does that existing packages don't
2. Why alternatives won't work
3. Whether it goes in a specific app or a shared package

---

## Architecture Decisions

If you're making a decision that will affect multiple tracks or be hard to reverse, write an ADR in `docs/adr/`. Copy the format from `docs/adr/README.md`. Discuss before merging.

---

## Getting Help

- Architecture questions → `docs/FC_Architecture_Blueprint.md`
- Implementation patterns → `docs/FC_Architecture_Decisions_History.md`
- Track assignments → `docs/FC_Development_Plan.md`
- Agent coding contract → `.claude/CLAUDE.md`

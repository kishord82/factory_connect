# ADR-002: pnpm Workspaces Monorepo

**Status:** Accepted
**Date:** 2026-04-02
**Author:** Kishor Dama

## Context

FactoryConnect has three distinct runtime agents:
- **API** — Express.js 5 REST server (Node.js, cloud-hosted)
- **Bridge** — Standalone Node.js agent (runs on factory Windows PC)
- **Portal** — React 19 + Vite 6 SPA (browser)

These three agents share significant code: error types, Zod schemas, constants, type definitions, and test utilities. Without a monorepo, this shared code would either be duplicated, versioned as a separate npm package, or imported via relative paths across separate repos.

## Decision

Use **pnpm 9.x workspaces** as the monorepo tool with this structure:

```
apps/api/          @fc/api
apps/bridge/       @fc/bridge
apps/portal/       @fc/portal
packages/shared/   @fc/shared    (cross-app types, Zod schemas, errors)
packages/database/ @fc/database  (pg helpers, RLS utils, migrations)
packages/config/   @fc/config    (ESLint, TypeScript, Vitest base configs)
packages/observability/ @fc/observability  (Pino logger, PII redactor)
```

## Alternatives Considered

| Tool | Why Rejected |
|------|-------------|
| **npm workspaces** | Slower installs, no `--filter` shorthand, symlink handling less reliable |
| **Yarn Berry** | PnP (Plug'n'Play) causes compatibility issues with native Node.js resolution and some tooling |
| **Turborepo** | Adds build orchestration complexity on top of pnpm; the team size doesn't justify it yet |
| **Nx** | Heavy configuration overhead; designed for larger teams with many packages |
| **Separate repos** | Shared code must be versioned and published; every schema change requires a release cycle |

## Consequences

**Positive:**
- Single `pnpm install` at the root installs all dependencies.
- `pnpm --filter @fc/api run test` targets a single package.
- Shared packages (`@fc/shared`, `@fc/database`) are referenced via `workspace:*` — no publishing needed.
- `pnpm` symlinks shared packages into each app's `node_modules`, preserving correct resolution.
- Lockfile is a single `pnpm-lock.yaml` at the root — one audit surface.

**Negative:**
- Developers must remember to build shared packages before running apps in development (`pnpm --filter @fc/shared run build` first).
- TypeScript project references (`composite: true`) are required in shared packages for incremental builds.
- Adding a dependency to a shared package rebuilds all consumers.

## References

- `pnpm-workspace.yaml`
- `CLAUDE.md` §3 (Tech Stack) — Package manager is non-negotiable
- `Makefile` — `make install`, `make build`, `make dev` targets

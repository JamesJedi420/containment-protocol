# SPE-3458 — Shared browser E2E verification harness (Playwright)

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** (PR #4481 @ `a7c5bc87`) |
| **Issue** | [SPE-3458](https://linear.app/spectranoir/issue/SPE-3458/shared-browser-e2e-verification-harness-playwright) |
| **Parent** | none (standalone shared-system parent; zero children) |
| **Branch** | `jamesdyedbq/spe-3458-shared-browser-e2e-verification-harness-playwright` |
| **Base main SHA** | `5eac65c7` |

## Approved boundary

- Playwright Test + Chromium-only harness (`playwright.config.ts`, `e2e/**`)
- Bounded CP smoke: startup/nav, Advance Week, save/reload continuity
- Isolation + page-error surfacing specs
- Advisory GitHub Actions job (not required)
- Operator docs + optional local Playwright MCP notes
- Minimal preflight unblock for Vite/Chromium duplicate `buildReportCaseSnapshots` binding in `runTransfer.ts` (broader TS census stays SPE-3375/SPE-3376)

## Out of boundary

- Required-validator policy (SPE-3348)
- Vitest discovery semantics (SPE-3427)
- Full TS build census (SPE-3375/SPE-3376)
- New GameState / debug commands / Academy-specific campaign assertions
- Committing `.cursor/mcp.json` or secrets

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Broader TypeScript/build regression repair | SPE-3375 / SPE-3376 | Census and remaining diagnostics |
| Promote E2E to required check | SPE-3348 | Required-validator selection |
| Academy lifecycle E2E assertions | Academy owners | Shared harness only this slice |

## Validation

- `npm run test:e2e`
- Existing Vitest/lint jobs unchanged
- Advisory `playwright-e2e` CI job with downloadable artifacts

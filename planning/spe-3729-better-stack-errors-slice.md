# SPE-3729 — Focused browser error tracking

Owner: [SPE-3729](https://linear.app/spectranoir/issue/SPE-3729/focused-better-stack-browser-error-tracking-for-playtesting).
Lifecycle status is maintained in Linear. This file records the implementation and
pre-ship evidence. User explicitly authorized the integration and dependency fallback.
Branch: `codex/spe-3729-betterstack-errors`. Base: `bd85c1c2b159d9406338523cd8ae1bbf36bc345d`.

## Boundary

Add a pinned, reviewed Sentry React SDK at the browser entry point, directed to the
existing Better Stack application. Use React root/global exception hooks,
allowlisted error payloads, build identity, player/test separation and optional
activation. No gameplay/store/domain/persistence or RUM/tracing/analytics change.

Implementation files: `src/app/errorTracking.ts`, `errorTrackingPolicy.ts`, entry
point and Vite build revision; policy tests and dedicated Playwright fixtures/
configuration. Pages injects the public DSN from repository configuration and the
exact tested release SHA; missing configuration disables diagnostics. Dependency changes stay in package/lockfile; operational and
fallback evidence is in `docs/better-stack-errors.md`.

## Validation and evidence

- Policy tests exercise activation/disable rules, DSN validation, arbitrary-data
  removal, owned stack locations, bounded event volume and test metadata.
- Dedicated Chromium suite checks ordinary automation stays disconnected and
  explicitly opted-in React/global errors traverse the actual SDK to an intercepted
  ingest endpoint. This is a constructed fixture, not live delivery proof.
- Literal production build, lint, required validators, clean lifecycle-disabled
  install and existing gameplay smoke must pass before shipping.
- Live synthetic ingest acceptance and dashboard visibility must be reported
  separately; neither is inferred from an intercepted response.

## Pre-ship review

Review activation and privacy boundaries, malformed/blocked-storage cases,
React/SDK failures, native console behavior, existing gameplay and test traffic,
lockfile/license/advisory evidence, docs and production bundle inclusion. No
simulation RNG or persisted schema is touched. Modern Web Guidance `privacy`
retrieved; installed skill reports outdated instructions. Sonatype credits
unavailable; exact-version documented fallback used.

## Deferrals

No in-boundary deferral recorded. Source maps, RUM/session replay, gameplay
analytics, server telemetry and automated issue creation are excluded. Actual
dashboard visibility is unavailable in the connected browser profile (not signed
in). Live synthetic SDK ingest returned HTTP 200, event
`b18638281cf240af9f700c3eb9a370b8`; this is transport acceptance, not dashboard proof.

Initial local pre-ship evidence: Node 22.23.4/npm 10.9.9; 1,003 Vitest files / 10,922 tests
passed; 18 normal gameplay Chromium checks and four isolated SDK checks passed.
All required validators passed (`verify:requirements -- --base origin/main`, exit
0), advisory typecheck passed, literal TypeScript/Vite build passed. Repository
format check reports baseline drift in 3,261 files; changed files are checked
separately. Direct six-pass review used for this bounded browser seam; no Hermes
approval is claimed after the earlier read-only worker violations in this chat.

Review fixes: DSN moved to optional deployment configuration (still public in the
browser); isolated tests use a dummy ingest address. Sonar's PATH-resolution
finding is fixed by using explicit build metadata/local label instead of spawning
Git. Initialization is idempotent, network waits have explicit bounded timeouts,
and envelope assertions validate framing before parsing. After those fixes, all
12 policy tests and five isolated Chromium checks passed, including actual week
advance and save/reload with diagnostics enabled; targeted lint and the literal
TypeScript/Vite build passed. Hosted validation of these fixes is required before
merge. The normal automated suites keep live telemetry disabled; isolated SDK
tests intercept their dummy endpoint and cannot pollute the account.

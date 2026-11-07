# SPE-3094 — Application navigation history

## Approved boundary

Codex implements existing SPE-3094 under the continuing shipping-loop authorization. Parent SPE-1080 remains separate. Base/main `4eb3a27094bae09de20369b4d82ae3e11fdb2913`, branch `codex/spe-3094-navigation-history`. Fresh Linear issue/comments/relations read; no blockers, clean synchronized main, no open PRs; preflight ready. No new backlog scope.

Plan: add a pure bounded history observer in `src/app/navigationHistory.ts`, consume React Router commits in `NavigationHistoryControls.tsx`, mount controls in the existing AppShell, and validate state transitions, actual routed contexts and browser inputs. Reuse APP_ROUTES/APP_ROUTE_PATTERNS and current entity-existence rules, not navigation-strip ordering. Preserve existing directional links and page-owned query normalization.

## Semantics and safeguards

- Observe PUSH, REPLACE and POP using React Router location keys; the existing router remains navigation authority. Never write platform history directly or add history entries during POP.
- PUSH truncates the abandoned forward branch; REPLACE changes only the current entry. Keep at most 100 entries. An unseen POP resets the tracked window because its distance cannot be known safely. Initial deep links/reload have no prior tracked destination; history controls cannot take the player outside the observed session.
- Controls skip currently unavailable/unknown route destinations by their actual relative distance. Native browser navigation may still reach those URLs; existing local not-found surfaces reject missing records. No destination names or hidden entity data are exposed in history controls.
- Router-owned URLs preserve existing safe filter/subtab context. No arbitrary transaction state, modal state, campaign snapshot or simulation undo is stored by the observer. Existing location.state consumers use registry return-search only; navigation does not execute operational commands.
- Campaign replacement remounts the observer via the existing gameReplacementRevision. History is never persisted. Back/Forward focus the existing main landmark after the router commits; initial mounting does not steal focus. Rapid repeated control activation is guarded while navigation is pending.
- Native buttons provide keyboard, pointer and touch activation, visible disabled explanations and 44px targets. No new gamepad bindings; external mapped input uses native activation. Physical controller and human screen-reader testing remain unclaimed.

## Guidance and exclusions

Modern Web Guidance search `navigate browser history` retrieved/read `stack-drill-down`; reuse the already-read `accessibility` guidance. Apply browser-history synchronization, forward truncation, explicit controls and focus principles through React Router. Do not adopt the guide's swipe/parallax/synthetic-root drill-down implementation: this is an existing routed shell, not a layered mobile view stack. No animations or polyfills, new router, duplicate route registry, main-menu implementation, cross-launch history, settings category or simulation change.

Guidance CLI remains the previously reviewed pinned 0.0.197 outside the project, telemetry disabled; Sonatype-exhaustion documented fallback evidence is reused, no new package fetch/version or runtime/CI dependency. Hermes bounded direct fallback retained after the rejected local evidence attempt; no Freebuff or provider switch.

## Validation and audit

SPE-3348 selected checks passed: 11,055 unit tests / 1,020 files (85.54s), 29 Chromium tests (4.2m), lint, backlog-handoff and Vite bundle. Advisory TypeScript census reported zero diagnostics; literal `npm run build`, touched-file Prettier and diff checks passed. Independent PR review remains pending. The risks below were checked within the stated scope; no gameplay feature completion is inferred from helper tests.

Targeted model/router/shell tests: 15 passed in three files (4.38s). The initial two Chromium tests passed (12.6s), proving actual Agents filter restoration, shell/native browser history synchronization, branch truncation, reload reset, unchanged serialized campaign and touch activation at 320px. Full browser rerun includes the final focus refinement. A real mobile screenshot was inspected; these tests do not establish human screen-reader or physical-controller support.

## Six-pass audit

1. Scope/integration: controls sit in the existing shell and call its React Router navigator. Route matching derives from existing definitions; canonical entity existence is checked at activation/render time. No parallel router, route constants or tab-order authority.
2. Edges: tested PUSH/REPLACE/POP, unknown entry reset, bounded retention, deleted-record skipping by real delta, initial deep-link limits, campaign replacement, URL encoding/case/trailing slashes, and malformed paths. Pending activation is guarded until commit.
3. State/safety: only observed route metadata is copied; arbitrary location.state and campaign data are not. Browser evidence checks unchanged persisted campaign. This is presentation history, not save/load or simulation undo. No hidden destination labels.
4. Regression: existing page-owned URL context/normalizers and directional links remain intact; initial mount does not steal focus, so the skip-link contract remains testable. Back/Forward focus the main landmark into view, not an off-screen target. Native browser POP uses the same observer.
5. Docs/fixtures: this plan records reset/invalidation rules, context bounds and validation limits. No schema or migration needed; history intentionally does not survive reload.
6. Cleanup: no dependency, vendor runtime, animation, custom keyboard handler, DOM-cache stack or persistent snapshot. Guidance's synthetic root/swipe behavior is deliberately not adopted; disabled history at the first observed entry is safe and existing destination links remain available.

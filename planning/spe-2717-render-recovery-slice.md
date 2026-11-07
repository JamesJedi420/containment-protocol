# SPE-2717 — Isolated render-failure recovery

## Approved boundary and plan

Codex implements the existing SPE-2717 boundary under the continuous shipping-loop authorization. Parent SPE-1080 remains separate. Base/main `bbe47c3e6e945ac76abaf2b99fe3857f9dedeefe`; branch `codex/spe-2717-render-recovery`. Fresh issue/relations/comments checked, no recorded blockers; SPE-2607's historical hydration-hardening dependency remains Done. Main synchronized/clean, no open PRs, preflight ready, owner In Progress before implementation.

Current `src/main.tsx` creates the React root with optional diagnostics but no terminal recovery UI. Add a bounded root wrapper and non-React recovery renderer, retain existing diagnostic callbacks, unmount the failed root before mounting isolated DOM, and provide one explicit reload through the same browser startup path. Reuse canonical input registration/runtime for controller and keyboard recovery while native button activation remains available. Add failure-injection/unit/browser validation, conservative save wording and bounded recursion guards. No simulation, save system, router or dependency changes.

## Contracts and evidence plan

- `applicationRoot.ts` owns one terminal root-render failure transition per startup, reports through existing root diagnostics or console, and schedules recovery after React's failed commit. No automatic reload or retry of the failing tree. Cleanup disposes the isolated input registration/runtime. Failure of the recovery renderer produces one static browser-reload instruction rather than recursive React rendering.
- `renderRecovery.ts` creates a main landmark, critical-error announcement and one native Reload application button without shell/router/store/projection components. It does not inspect, mutate or certify save state. Copy explicitly distinguishes restart from preservation of unsaved changes and does not promise intact stored data.
- The shared input owner adds stable `recovery.reload` with Alt+Shift+R / standard controller button 3 defaults. Saved overrides retain their existing precedence over new defaults. The action has no available consumer during normal gameplay. Recovery focuses the native action; unsupported/cleared device bindings retain native keyboard/pointer/touch access. No duplicate input registry.
- Browser is the implemented runtime. No Electron/Tauri/desktop application wrapper or restart adapter exists in this checkout; native desktop-runtime acceptance is not claimed. The browser reload path re-enters normal initialization and hydration without new serialization or guarantees.
- Tests must inject a real root render failure, verify isolated fallback/focus/diagnostics, explicit reload to normal app, unchanged campaign bytes during failure, no automatic loops, bounded fallback failure, keyboard/controller/pointer/touch activation, narrow/scaled text and ordinary startup/save regressions. Constructed Gamepad snapshots are not physical-device certification.

## Guidance and checkpoints

Modern Web Guidance searched `announce critical errors` with reviewed CLI `0.0.197` and skill `2026_10_30-58d055df`; reuse the already-read `accessibility` and `forms` guidance for native semantics, focused action and critical announcement. Form-validation-specific search results do not apply to a terminal rendering error. Existing React 19 root callback declarations and diagnostic integration are the local API contract. No new dependencies. Hermes failed-capability bounded direct fallback remains applicable; no Freebuff or paid switch. Small checks are direct; no savings claimed.

## Validation / audit

Initial targeted validation: 23 tests / five files passed (25.79s); 11 input/reference/recovery Chromium scenarios passed (53.1s); touched lint and literal production build passed. The browser tests inject a failing App module through Playwright routing, exercising the real main/root integration without a production debug trigger. Stored campaign bytes remain identical while recovery is displayed, then explicit reload restores the observed Week-2 campaign through normal startup. The enlarged-text screenshot was inspected. Final required validation results follow below.

Final pre-PR evidence: the corrected targeted run passed 23 tests / five files (3.48s). `npm run verify:requirements -- --base origin/main --exclude format-check` passed every selected required validator: backlog-handoff, lint, 40 Chromium scenarios (5.9m), 11,080 unit tests / 1,026 files (118.93s), and Vite bundle. Paired compiler census: zero diagnostics. Final literal production build also passed (Vite 1.65s). Touched-file Prettier and diff whitespace checks pass separately. No unresolved audit finding or required in-boundary deferral remains; independent review and hosted CI are still required before merge.

## Six-pass audit

1. Scope/integration: terminal root callback composes existing diagnostics; fallback uses DOM and shared input only, with no shell/router/store/projection import. Default native button remains usable independently of optional controller setup. Browser runtime is supported; no desktop wrapper exists to test.
2. Edges: repeated root errors schedule one recovery; diagnostics failure retains console evidence; fallback failure becomes static instructions without recursive rendering; explicit disposal cancels queued recovery. Failed input-runtime initialization removes partially installed handlers. Reload has a one-shot guard; no automatic recovery timer or persisted crash loop exists.
3. Determinism/state: no randomness, simulation mutation, save parsing or new persisted state. Existing binding override compatibility applies to the added recovery action. Recovery text makes no claim that unsaved progress or stored integrity is guaranteed.
4. Regression: normal root rendering and caught/recoverable diagnostic hooks are preserved. Existing input/reference browser paths pass. Audit added a guard against scheduling a further controller frame when the winning recovery action synchronously disposes the runtime, with an assertion in the existing edge-batch test.
5. Docs/fixtures: SCHEMA_REGISTRY and this plan describe absence of new campaign/crash persistence. Tests distinguish injected render failures, constructed standard Gamepad data and observed real browser recovery. No physical controller, screen-reader device or native desktop certification is claimed.
6. Cleanup: no dependency, parallel input registry, feature recovery flow, automatic reload, debug production trigger, raw error text exposed to players, or external service wiring. Required validation and independent PR review remain release gates.

## Independent review follow-through

Codex found no issues on initial and modal-regression revisions. Amazon Q's remaining-dialog premise was disproved by the existing root replacement and a regression that starts with an open dialog and uses the real Alt+Shift+R handler. CodeRabbit identified a genuine reload-without-navigation edge: the action now announces that reload was requested and conditionally directs users to browser Reload if the screen remains. A synchronous reload exception retains diagnostics and explicit browser instructions. No timer claims navigation failed, re-enables automatic retries, or reloads automatically. The persistent-failure browser test now observes a one-second window after manual reload.

Review validation: 11 focused root/recovery/input tests across three files (2.10s); all four recovery Chromium scenarios (16.6s), including a real navigation response with HTTP 204; touched lint and formatting passed. Full final-head CI remains required. No new dependency or browser API; existing accessibility/forms guidance still applies to the updated live announcement.

# SPE-2709 — Persistent settings access

## Boundary and plan

Codex implements the existing SPE-2709 acceptance under the user's continuous shipping authorization. Parent SPE-1080 remains separately complete; this does not reopen or expand it. Branch `codex/spe-2709-settings-access`, base/main `9c5e529f0182dd57fe68bcfa8340247f2a7fde59`. Fresh Linear/Git/GitHub preflight returned ready with no open PRs or blockers.

1. Replace the existing Agency-targeting gear link in `ShellStatusBar` with a visible Settings button on every routed screen. Reuse `AppShell` and `IconSettings` without adding a second entry.
2. Open a named native modal dialog, keeping the route/outlet, local selections and campaign state mounted. Use native close/Escape and focus restoration, without custom traps or history entries.
3. Validate real browser keyboard, pointer, touch, narrow layout, focus/inert behavior and preserved route/local state; check game-over access in shell tests and route-loading placement in `App.tsx`.
4. Run the selected required validators, six audit passes, independent PR review and CI before merge.

No categories, settings persistence, input mappings, controller bindings, shell redesign, audio/graphics/gameplay configuration or new dependencies. The empty settings surface states that no adjustable settings are available yet. Settings access is an interface operation, not a simulation mechanic; save migrations and emergent-story outcomes are not applicable.

## Availability and guidance

All current routed screens, including not-found boundaries, share `AppShell`; route loading leaves the shell interactive. Game over does not disable Settings. A native modal temporarily makes the underlying shell inert; close the active modal before interacting with the header. Fatal startup/campaign-recovery states deliberately retain recovery-only controls because the application shell is unavailable. No gamepad event/binding runtime exists in the current client; native keyboard/pointer activation remains available to externally mapped controllers, but physical controller support is not claimed.

Read Modern Web Guidance IDs `dialog`, `accessibility`, `prevent-page-scroll-under-modal-dialog`, `platform-controls-dismiss-dialog`, retrieved with installed skill version `2026_10_30-58d055df`. Use `showModal()` rather than newly available invoker commands, native buttons, a visible label, 44px minimum targets, existing color/focus tokens, and no new motion. Scroll containment and mobile platform dismissal are progressive enhancements; Safari background scroll containment is not claimed. Visible close and keyboard Escape remain available.

The reviewed guidance CLI is `modern-web-guidance@0.0.197`, executed outside the repository with telemetry disabled. Sonatype credits were exhausted: documented fallback found zero npm audit advisories and no exact-version OSV matches, no dependencies or lifecycle scripts; registry/tarball integrity matched and the invoked entry-point paths were inspected. This is bounded evidence, not a Sonatype pass or a guarantee of safety. No tool package was added to runtime or CI.

Hermes: direct bounded fallback reuses the session's rejected local synthesis evidence; no new capability evidence justifies retrying. No Freebuff or provider switch. No measured savings claim.

## Validation and audit

- Targeted shell Vitest: 23 tests, two files, 4.71s, passed.
- Targeted Chromium: three tests, 13.8s, passed. Enter/Space/Escape and pointer close restore focus; attempted background focus is blocked. The Agents URL, search value, selected agent and serialized campaign remain unchanged. Touch opening/closing at 320px with reduced motion works. Settings fits 320/640/768/1024/1440px before scrolling; the status strip does not overlap the actions above 640px. Mobile and desktop screenshots inspected.
- The first browser test incorrectly expected a role locator to exclude native-modal inert content. Replaced that unsupported inference with an actual attempted background-focus assertion. Role lookup is not a screen-reader test.
- Visual review caught desktop status-strip overlap. Constraining its grid track and wrapping controls below 640px preserves access; no broader shell redesign. Earlier broad validation runs were canceled during lint while these findings were addressed and are not acceptance evidence.
- Complete SPE-3348 selection passed: backlog-handoff, lint, 27 Chromium tests (4.0m), 11,044 Vitest tests / 1,018 files (88.40s), Vite bundle and advisory TypeScript census (zero diagnostics). Literal `npm run build`, touched-file Prettier and `git diff --check` passed. The build initially caught a test-only unsupported Testing Library `exact` option; anchored name expressions fixed it before the full unit run, with touched-file lint rechecked.
- Independent PR review pending. Browser focus assertions do not substitute for a human screen-reader or physical controller test; Safari scroll containment and mobile back gestures remain unverified.

## Six-pass pre-ship audit

1. Scope/integration: the existing global-header action now opens the named dialog; all `App.tsx` routes share this shell. The route-loading fallback is inside the outlet, so it does not remove the header. Fatal recovery intentionally bypasses the shell. Game-over availability is tested.
2. Edge cases: closed dialog is hidden, repeated open/close works, native close/Escape return focus, background focus cannot steal it. Native modal interaction prevents duplicate pointer activation; there is no synthetic toggle state to desynchronize.
3. State/safety: no store write, history navigation, persistence, hidden-world data or asynchronous simulation action. The current route and component state remain mounted.
4. Regressions: preserved action order and existing gear; real browser context restoration and layout assertions cover adjacent controls. Required whole-suite checks remain selected.
5. Docs/fixtures: this plan records empty-content and blocked-state behavior, tool evidence and validation limits. No schema change. Settings categories remain separate approved work.
6. Cleanup: no dependency additions, duplicated entry, custom focus trap, unnecessary Escape handler or root scroll mutation. Reused tokens and native dialog behavior; reduced-motion rules override the existing button active transform.

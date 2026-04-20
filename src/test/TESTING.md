<!-- cspell:words microtasks -->

# Test Robustness Conventions

This project uses Vitest + Testing Library.

## Core rule: keep timers deterministic

- Prefer real timers by default.
- Use fake timers only when asserting timeout-driven UI behavior.
- Timer cleanup is centralized in `src/test/setup.ts` via `cleanupFakeTimers()`.
- Do **not** duplicate fake-timer cleanup in individual test files unless you have a special case.

## Shared helpers

Import from `src/test/timers.ts`:

- `mockClipboardWriteText(writeText)`
  - Stable way to mock `navigator.clipboard.writeText`.
- `flushMicrotasks()`
  - Flushes promise callbacks after click/dispatch paths that await async work.
- `advanceFakeTimers(ms)`
  - Advances timers inside `act(...)` to keep React updates synchronized.
- `cleanupFakeTimers()`
  - Global teardown utility (already wired in `setup.ts`).

## Recommended patterns

### Fake timer flow

1. `vi.useFakeTimers()`
2. Trigger action (e.g., click)
3. `await flushMicrotasks()` if async callbacks are involved
4. Assert intermediate UI state
5. `advanceFakeTimers(...)`
6. Assert final UI state

### Async UI assertions

- With real timers + async UI updates, use `findBy*` or `waitFor`.
- With fake timers, avoid polling waits unless timers are explicitly advanced.
- Prefer deterministic assertions (`getBy*`) after you flush microtasks and/or advance timers.

## When writing new tests

- Keep one user-observable behavior per assertion block.
- Avoid relying on implicit delays.
- Use route-local helpers (`renderApp`) to keep setup consistent.
- Restore external globals you mock (e.g., clipboard) in `afterEach`.

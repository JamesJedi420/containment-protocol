# Containment Protocol — review policy

Client-side React/TypeScript SPA. Pure simulation in `src/domain/`; Zustand store in `src/app/store/`; projections in `src/features/*View.ts`; UI in `src/features/**/*.tsx`.

**MUST** read before reviewing:

- PR body **Linear** section and scope boundary
- `planning/spe-*-slice.md` when the PR implements an approved slice
- `AGENTS.md` **Review guidelines**

## Severity

**Flag P0/P1:** correctness bugs, determinism breaks, persistence/hydration gaps, layer-boundary violations, week-close ordering errors, hidden state leaked through UI, event schema/migration regressions, missing tests when acceptance requires coverage, security issues, or implementation that exceeds an approved boundary.

**Do NOT flag:** style-only nits, drive-by refactors, scope expansion suggestions, pre-existing `npm run build` baseline TypeScript drift unless this PR makes it worse.

## Scope

- Implementation PRs must match an **already-approved** Linear slice/workflow issue and its **Goal** and **Acceptance**.
- A workflow/docs-only PR may intentionally have no Linear slice when it creates or expands no feature/backlog scope. Do not require a bookkeeping issue merely because the PR exists.
- Newly discovered durable feature scope is candidate evidence until Phase 1 → Phase 2 → Phase 3 (including mandatory contradiction review) → Phase 4 authorizes backlog mutation. Do not recommend creating a child/parent/relationship as a review shortcut.
- Prefer the smallest in-boundary fix in suggestions.
- Do not request unrelated refactors or parallel subsystems.
- Do not wire vendor search/scan SaaS into `src/` or CI without an approved Linear slice (`docs/agent-cursor-plugins.md`). Prefer required Sonatype before npm add/upgrade; Snyk is optional.

## Re-review

After material fixes on an existing PR, automatic review may not re-run. Suggest `/q review` in a new top-level PR comment when appropriate.

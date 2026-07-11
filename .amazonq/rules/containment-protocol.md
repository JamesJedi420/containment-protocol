# Containment Protocol — review policy

Client-side React/TypeScript SPA. Pure simulation in `src/domain/`; Zustand store in `src/app/store/`; projections in `src/features/*View.ts`; UI in `src/features/**/*.tsx`.

**MUST** read before reviewing:

- PR body **Linear** section (SPE-#### slice issue, parent/child, scope boundary)
- `planning/spe-*-slice.md` when the PR implements a slice
- `AGENTS.md` **Review guidelines**

## Severity

**Flag P0/P1:** correctness bugs, determinism breaks, persistence/hydration gaps, layer-boundary violations, week-close ordering errors, hidden state leaked through UI, event schema/migration regressions, missing tests when acceptance requires coverage, security issues.

**Do NOT flag:** style-only nits, drive-by refactors, scope expansion, pre-existing `npm run build` baseline TypeScript drift unless this PR makes it worse.

## Scope

- One Linear slice per PR; match slice **Goal** and **Acceptance**.
- Prefer the smallest in-boundary fix in suggestions.
- Do not request unrelated refactors or parallel subsystems.
- Do not wire vendor search/scan SaaS into `src/` or CI without an explicit Linear slice (`docs/agent-cursor-plugins.md`). Prefer required Sonatype before npm add/upgrade; Snyk is optional.

## Re-review

After material fixes on an existing PR, automatic review may not re-run. Suggest `/q review` in a new top-level PR comment when appropriate.

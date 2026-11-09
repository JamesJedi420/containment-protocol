# ADR 0001: Layer dependency boundaries

- **Status:** Accepted
- **Date:** 2026-11-09
- **Decision:** Simulation is layered domain → store → projections → UI, and imports run only
  along the allowed directions. Features do not import sibling features directly, and UI does
  not re-derive canonical simulation summaries that a domain helper or projection already owns.
- **Context:** Containment Protocol is a client-only React/TypeScript SPA whose simulation is
  pure TypeScript over Zustand-persisted state. Many features read the same simulation output,
  so without a stated ownership order the same summary logic is re-implemented per screen and
  drifts. The repository already documented these layers, so this record captures the decision
  behind that document rather than introducing a new rule.
- **Rationale:** A single direction of dependency keeps simulation testable without a DOM, keeps
  derived state in one owner, and makes a boundary violation visible as an import rather than as
  two screens disagreeing about the same number.
- **Rejected alternatives:**
  - _Feature-first modules with direct cross-feature imports._ Rejected: the shared simulation
    summary ends up owned by whichever feature imported it first, and consumers drift apart.
  - _Enforcing the boundary only through `eslint.config.js`._ Rejected as the sole mechanism:
    the current ESLint configuration has no dedicated dependency-import restriction, so the
    contract would go unchecked.
  - _Letting UI recompute summaries from raw state when convenient._ Rejected: it duplicates the
    interpretation of simulation state and produces hidden second sources of truth.
  - _Moving shared logic into a large shared module up front._ Rejected: narrow, stable interfaces
    are preferred over relocating large code blocks.
- **Affected systems:** `src/domain/**`, `src/app/store/**`, `src/features/*View.ts` and
  `src/features/*Selectors.ts`, `src/features/**`, `src/components/**`, `src/features/shared/**`,
  and the boundary tests under `test/` and `src/test/`.
- **Linear owner:** SPE-3437 owns repository-wide deep-import and layer enforcement; SPE-3438
  owns the audited cross-feature UI interfaces and shared projection ownership; SPE-46 owns the
  projection boundary for high-coupling surfaces.
- **Implementation evidence:** Partially enforced, and the gap is deliberate rather than
  assumed. `test/boundary-enforcement.test.ts` checks bare sibling feature imports and recognizes
  stable projection interface names (`*View`, `*IntelProjection`, `*Projection`); its own header
  states it does not comprehensively inspect deep imports. `src/test/crossFeatureImportRecovery.contract.test.ts`
  protects the bounded SPE-3438 consumers and verifies shared projections have no back-imports.
  `eslint.config.js` has no dedicated dependency-import restriction. Repository-wide deep-import
  enforcement remains SPE-3437, so this record must not be read as complete enforcement.
- **Supersedes:** none
- **Superseded by:** none

## Notes

The live technical description, including allowed directions, the bounded audited exceptions for
cross-feature UI interfaces, and the per-slice guardrails, is
[`docs/dependency-boundaries.md`](../dependency-boundaries.md). That document is authoritative for
current detail; this record preserves the decision and its rejected alternatives, and should be
superseded rather than edited when the decision itself changes.

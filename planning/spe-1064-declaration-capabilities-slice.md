# SPE-1064 — Declaration capability isolation

- Owner: [SPE-1064](https://linear.app/spectranoir/issue/SPE-1064), In Progress.
- Actor: Codex; authorized continuous CP shipping loop. No parent.
- Branch: `codex/spe-1064-declaration-capabilities`.
- Base/main: `0468e22ad6934b2f4ea3d36fcbf6f04ef73d49ef`.

## Boundary and implementation

At the base revision, `src/domain/actorTaxonomy.ts` `declareActor` normalizes its
list fields but aliases the caller's `capabilities` object. A later caller edit
therefore changes `isInteractionAllowed` for the declaration. Two declarations
created from the same input also share those mutable capabilities.

Copy the flat `ActorCapabilityFlags` boolean record during declaration. Existing
explicit capability values and physicality gates remain authoritative; no new
rules or immutable-actor API are introduced. A declaration may still be changed
by its owner, but cannot mutate the input or a sibling declaration through this
alias. Existing list normalization already returns independent arrays.

Changed files: `src/domain/actorTaxonomy.ts`,
`src/test/sim.actorTaxonomy.test.ts`, and this document. No persisted fields,
capability content, runtime wiring, player UI, dependency, or schema changes.

## Acceptance and validation

- Input edits do not change previously declared interaction legality.
- Editing a declaration does not change its input or sibling declaration.
- Tests exercise enabled and disabled interview/ward queries and compare the
  full retained capabilities, not only reference inequality.
- Red: both new cases fail on base code; existing 11 tests pass.
- Green targeted: 13 tests / 1 file in 1.59 seconds, Node 22.23.4 / Vitest 5.0.5.
- Required path-selected checks pass: 11,043 tests / 1,018 files (85.20
  seconds), lint, backlog-handoff and Vite bundle. Typecheck has zero diagnostics;
  literal `npm run build` and touched-file Prettier pass.
- Command: `npm run verify:requirements -- --files src/domain/actorTaxonomy.ts,src/test/sim.actorTaxonomy.test.ts,planning/spe-1064-declaration-capabilities-slice.md --exclude format-check --exclude playwright-e2e`.
  Initial invocation mistakenly used one comma-joined exclusion ID; canceled
  during advisory formatting and discarded. Only the corrected completed run
  supplies acceptance evidence. No required validator was excluded.
- Browser suite is advisory and not rerun for this pure-domain helper with no
  production constructor caller. Global formatting is an unchanged advisory
  baseline failure; check touched files separately. No current browser pass is
  claimed for this revision.

## Six-pass audit

1. Scope/integration: this is declaration ownership within SPE-1064, using the
   existing capability and physicality authorities. No new runtime consumer.
2. Edges: true/false capability values survive copying; caller and sibling
   mutations are isolated. Typed declarations remain a typed contract, not an
   untrusted-input parser. No nested objects exist in `ActorCapabilityFlags`.
3. State/determinism: no random, temporal, or hidden-state change. Copies preserve
   capability values and prevent silent cross-declaration mutation.
4. Regression: targeted tests include previous identity/snapshot corrections
   and physicality legality. Required broad checks pass as recorded above.
5. Documentation/schema: this plan records the gap and evidence; no schema or
   backlog status change is warranted.
6. Cleanup: one capability copy and focused regressions; no unrelated edits.

These tests are constructed domain fixtures. Runtime reachability, player
observation, persistence and broader actor lifecycle acceptance remain unproven
by this repair. Keep SPE-1064 In Progress after merge.

Hermes checkpoints use the previously recorded bounded direct fallback after
failed local-Qwen evidence synthesis; repeating that failed dispatch is not
justified for this compact repair. Codex retains verification and publication.
No token savings claim. Freebuff stays disabled by user instruction. Modern Web
Guidance does not apply to this pure-domain change.

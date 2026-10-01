# SPE-3140 — Pressure-seal named-part condition repair

| Field                   | Value                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Status**              | **Recently shipped**                                                                                                          |
| **Linear**              | [SPE-3140](https://linear.app/spectranoir/issue/SPE-3140/pressure-seal-named-part-condition-repair)                           |
| **Parent**              | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — remains Backlog |
| **Priority / assignee** | High / James Dye                                                                                                              |
| **Branch**              | `cursor/spe-3140-pressure-seal-named-part-repair`                                                                             |
| **Base `main` SHA**     | `74cf18860d9a39318682e6c91f239177202f67aa`                                                                                    |

## Goal and boundary

Extend the existing stored equipment condition repair flow to `pressure_seal`, using the canonical named part `pressure_seal_gasket`. Only a successful repair consumes exactly one unit from the optional facility stockpile. SPE-1027 remains stock provisioning owner; this slice creates no new stock source and does not seed a new run.

The existing blast-door repair continues to require only `blast_door_hinge_seal`. Ordinary equipment repairs remain ungated. `interlock` remains fail-closed.

## Contract

- The shared spare-part registry accepts `blast_door_hinge_seal` and `pressure_seal_gasket`, and maps each only to its matching containment class.
- Valid stored, damaged pressure-seal repair with valid integrity/deficiency and at least one `pressure_seal_gasket` transitions condition to operational and consumes exactly one unit atomically.
- Missing, wrong-class, malformed, or unavailable part fails closed with no condition change, stock debit, catalog inventory mutation, or repair event.
- Repair preserves `containmentIntegrity`, including sticky deficiency/service eligibility; it does not mutate barrier coupling or deficiency state.
- Existing repair preview is authoritative for store and Equipment UI eligibility. The existing repair event is emitted only after successful repair.
- Stock hydration accepts the new ID and valid positive safe-integer quantity; malformed/unknown entries remain fail-closed. Hydration does not replay a debit.
- No starting-stock seed, catalog inventory debit, new repair event, save/store version bump, interlock support, or SPE-877 umbrella closure.

## Implementation and ownership

The domain/store work is in `src/domain/sparePartSuitability.ts` and is owned by Codex. The new identifier is included in the existing persisted stockpile allowlist; it does not change `GameState` or `src/domain/models.ts`, so the type-change freeze was not triggered. Equipment projection already supplies the class-specific part to the shared repair preview; UI work adds regression coverage without duplicating domain policy.

## Validation

- Combined focused domain/store/Equipment tests: 6 files, 297 tests passed; covers suitability, equipment repair, stockpile, store, projection, and page flow.
- Full Vitest suite: 9,182 tests passed.
- `npm run lint`, changed-file Prettier check, `npm run verify:backlog-handoff`, and `npm run verify:theme-contracts` passed.
- `npm run build` retains the repository's documented pre-existing test type-contract diagnostics; no errors were reported in `sparePartSuitability.ts` or the new Equipment UI tests. Existing diagnostics in the touched large test files are at unrelated pre-existing locations.
- Six pre-ship audit passes: completed; one documentation mismatch was corrected and the audit rerun.

## Deferred

| Mechanic                                                           | Owner                              | Reason                                                              |
| ------------------------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------- |
| Stock production, provisioning, and starting stock                 | SPE-1027                           | This slice only consumes explicitly present optional stock.         |
| Interlock repair                                                   | Later SPE-877 child                | Interlock remains invalid/fail-closed.                              |
| Deficiency stabilization/clear, barrier coupling, workshop mapping | Existing SPE-877 / adjacent owners | Condition repair must not silently alter these independent systems. |
| Additional parts/classes or catalog inventory paths                | Separate approved child            | Outside the one-class named-part repair boundary.                   |

Parent SPE-877 remains Backlog.

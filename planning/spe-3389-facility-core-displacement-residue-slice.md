# SPE-3389 — Facility core displacement residue

| Field             | Value                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------ |
| **Status**        | **Recently shipped**                                                                       |
| **Issue**         | [SPE-3389](https://linear.app/spectranoir/issue/SPE-3389)                                  |
| **GitHub**        | [#4283](https://github.com/JamesJedi420/containment-protocol/issues/4283)                  |
| **Parent**        | [SPE-792](https://linear.app/spectranoir/issue/SPE-792) — Backlog                          |
| **Umbrella**      | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Backlog                        |
| **Branch**        | `jamesdyedbq/spe-3389-represent-facility-core-displacement-and-diagnostic-residue`         |
| **Base main SHA** | `d801f265d28e7b13c082bd6a92fb7db531c9661f`                                                 |

Status and backlog classification describe the merge handoff and take effect on merge. Keep Linear In Progress until review, CI, and merge are verified. Closing this child does not close SPE-792 or SPE-1052.

## Approved boundary

One authored transition on the representative core `core:facility_hub`: `present` → `corrupted`. The transition emits one residue record and resolves impact through the SPE-3386 adapter. Restore returns the hub to `present` and preserves that same residue. A read-only projection copies the core id and symptom ids only.

No GameState field, schema change, week-close hook, investigation action, clue UI, staffing post, workshop gate, or second lifecycle ledger.

## API

`src/domain/facilityCoreResidue.ts`

| Function                              | Behavior                                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `applyFacilityCoreResidueTransition`  | `corrupt` writes hub `degraded` and emits one residue. `restore` writes hub `ready` and returns that residue. |
| `projectFacilityCoreResidueEvidence`  | Allowlisted evidence: `evidenceKind`, `coreNodeId`, `symptomNodeIds`.                                         |

The representative graph reader confirms the hub id is `core:facility_hub`. Caller packets still supply every non-hub fact. The command overwrites hub availability. `corrupt` uses `degraded`. `restore` uses `ready`. Hub `sourceRef` is the caller `provenanceRef`. Kernel and adapter rejections pass through unchanged and include no residue.

The residue records `fromCondition: present`, `toCondition: corrupted`, `causeCategory: corruption`, `provenanceRef`, and `symptomNodeIds`. Symptom ids are resolved nodes whose reason is `upstream_degraded` or `upstream_unavailable` and whose cause chain includes the hub, sorted by code unit. A second `corrupt` with that same residue returns the same record. An empty symptom list does not emit a residue.

`absent`, `displaced`, and `stale` reject as `unsupported_core_condition` before resolution. A valid graph whose core is not `core:facility_hub` rejects as `unsupported_core`. Blank provenance, unknown commands, extra request keys, and a malformed residue reject with no node results.

Restore accepts only a well-formed residue for this transition and the same `provenanceRef`. It returns that validated residue without rewriting its fields or symptom ids. Current ready results do not replace them.

The projection copies `evidenceKind`, `coreNodeId`, and `symptomNodeIds` only. Symptom ids must be non-core nodes on the representative graph. It does not copy `causeCategory`, `fromCondition`, `provenanceRef`, cause chains, locations, or investigation fields. It does not import the clue registry or intake engine.

## Upstream contracts

SPE-3383 remains the pure kernel. SPE-3386 remains the explicit input adapter. SPE-3388 remains the alert-timing unlock. SPE-3387 remains logistics-post validity. SPE-2159 and SPE-854 stay closed contracts and are not called. Workshop gates and staffing assignment stay with their existing owners.

## Validation

Focused regression passed **25 tests across three files**: the new residue contract, the SPE-3386 input contract, and the SPE-3383 kernel contract. ESLint passed on the new domain module and contract test. `npm run verify:backlog-handoff` passed.

## Deferred

| Item                                      | Owner                                                     | Why deferred                                                                 |
| ----------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Investigation presentation and clue UI    | [SPE-2159](https://linear.app/spectranoir/issue/SPE-2159) / [SPE-854](https://linear.app/spectranoir/issue/SPE-854) | Held. Do not create an investigation issue from this slice.                 |
| Absent, displaced, and stale core conditions | [SPE-792](https://linear.app/spectranoir/issue/SPE-792) | This child rejects those conditions. It does not simulate a stale delay.    |
| Further core transitions                  | [SPE-792](https://linear.app/spectranoir/issue/SPE-792)   | Parent acceptance remains outside this child.                               |
| Persistence, hydration, week-close, UI    | none in this child                                        | No GameState field and no schema change.                                    |

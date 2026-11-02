# Complete provisional diagnostic partition — SPE-3376

## Evidence and limits

[partition.json](partition.json) assigns **all 681 diagnostic occurrences** to **204 provisional causal obligations**, including the previously inspected 209 and the remaining 472. There are no unassigned or multiply assigned occurrences. Each occurrence is a zero-based index into the immutable, hash-bound [baseline](41873280/census.json); look up its exact file, coordinates, code, message and fingerprint there. This preserves repeated fingerprints rather than collapsing locations.

Analysis starts at main `1108c4b969b0f118bf642c3cae32a7ab9a09b7c0`. Its compiler inputs have no changes from `4187328072490639bfab16fbfb530a60fa067678`. A new pair of forced Node 22.23.4 / TypeScript 6.0.3 builds on the clean checkout reproduced every normalized diagnostic and both raw transcript hashes: **681 occurrences, 178 files, 218 production and 463 test/fixture occurrences**, both exits 2. [Verification metadata](verification-1108c4b9.json) records the clean checkout and inputs; the identical raw transcript is retained once in the original archive.

The program is shared-system Tooling / Developer Experience; affected contracts are CP-core. No Academy-specific failure or independent Academy repair boundary was observed. This says nothing about Academy product completeness.

The 204 rows are **causal obligations, not 204 proposed issues**. Repeated symptoms sharing a demonstrable helper or contract are grouped. Independent causes in a large file remain separate, even when a later approved slice could safely cover them together. No repair experiments or gameplay edits were performed. Static cascade hypotheses are not measured reductions; none of the 681 errors is marked fixed or resolved transitively.

## Owner reconciliation

Each group identifies the code contract that governs its behavior, an existing bounded repair owner where verified, and a cascade assessment. Source anchors are pinned to the analysis revision, not promises that future line numbers remain stable. `repairOwner: null` means no bounded remediation issue was verified for that cause. It does not mean the domain lacks an owner: the named canonical code contract governs semantics, and SPE-3376 retains the evidence for normal reconciliation under SPE-3375. Do not infer an active repair owner from an incidental SPE comment or reopen historical completed issues.

| Existing bounded owner           | Occurrences | Boundary evidence                                                                                                                            |
| -------------------------------- | ----------: | -------------------------------------------------------------------------------------------------------------------------------------------- |
| SPE-3442                         |          68 | Producer-validation dispatcher; event schemas and factories remain authoritative.                                                            |
| SPE-3443                         |          40 | Hidden-state scouting test input parity only.                                                                                                |
| SPE-3444                         |          61 | Original 47 plus 14 additional consumers of the same helper. Reconcile added consumer coverage; this document does not expand authorization. |
| SPE-3446                         |          22 | Legacy Team.assignedCaseId test fixtures; canonical status assignment established by completed SPE-2276 remains authoritative.               |
| SPE-3447                         |          15 | Fourteen event-filter diagnostics and one independent malformed-state fixture obligation.                                                    |
| SPE-3448                         |          12 | Six exhausted volatile-action switches; CP-core SPE-62 semantics unchanged.                                                                  |
| SPE-3449                         |           3 | Courier score local literal inference; preserve SPE-823/SPE-1703 calibration.                                                                |
| SPE-3450                         |           7 | Optional agency protocol Pick and dependent inference.                                                                                       |
| SPE-3453                         |          12 | Ten historical-route and two rival omission-helper diagnostics; separate domain acceptance rows.                                             |
| SPE-3454                         |           8 | Readonly affiliation progression evidence; SPE-1046/SPE-2520 semantics unchanged.                                                            |
| SPE-3455                         |           8 | Concealment authoring construction; SPE-70/SPE-2113 semantics unchanged.                                                                     |
| SPE-3456                         |           5 | Authority graph enum guards; SPE-788/SPE-2720 semantics unchanged.                                                                           |
| No bounded repair owner verified |         420 | Exact provisional boundaries and canonical code references in the partition; retain as reconciliation evidence.                              |

The additional illusion scouting fixtures and production layer accumulator are **not silently folded into SPE-3443**. The minimal-event factory, event bus assertions, incident-review event mapping and containment-class filters are **not the SPE-3442 dispatcher**. The workshop source-shape fixtures and prerequisite activation result are **not the SPE-3444 personnel helper**. Shared vocabulary alone is insufficient evidence of shared repair ownership.

## Cascade assessment and proposed repair order

1. Reconcile existing child boundaries against these exact occurrences, preserving their separate implementation-authorization requirement. Small type-local roots with clear constraints include the courier literal, exhaustive-switch access, readonly builders, and missing type imports. Their counts are coverage, not guaranteed compiler deltas.
2. Handle shared helper/producer roots before their consumers. The 68 dispatcher and 61 workshop-helper errors have common roots, but may contain residual errors masked by today's inference failure. The seven readiness-fixture errors share PERFECT_TEAM_PARAMS. Candidate source-disposition return errors share one inferred field. Passive-bonus consumers share a sanitizer; separate equipment-effect filtering does not.
3. Validate explicit downstream hypotheses through an approved isolated repair and a fresh two-run census. Compare fingerprint multiplicities and locations; inspect new errors instead of assuming all disappearances are fixes.
4. Keep semantic-review rows out of mechanical repair batches until canonical behavior is established. Preserve malformed-input tests, readonly guarantees, event discriminants, optional state, and save compatibility. Do not resolve ambiguity by widening types, adding casts, weakening checks, or deleting assertions.

| Provisional root                            | Possible downstream symptoms | Why the link is plausible                                                                         |
| ------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `recovery-outcome-import` occurrences 88–89 | 90–91                        | Missing EquipmentRecoveryOutcome removes callback context from outcome.outputMaterials.every.     |
| `funding-import-cascade` 213                | 214                          | Invalid FundingState import loses fundingHistory element type.                                    |
| `rejected-team-predicate` 209               | 208                          | Invalid filter predicate leaves null in the returned array.                                       |
| `hydrated-event-narrowing` 35               | 36                           | Unavailable inputMaterials prevents callback parameter inference.                                 |
| `prerequisite-result-shape` 408             | 409                          | Unknown workshopSnapshots prevents queued item inference.                                         |
| `containment-event-filters` helper return   | 339, 341, 343                | Helper shape erases event.type independently of its rejected inputs.                              |
| `weekly-resolution-shadow` local interface  | 243–244                      | Construction and later destructuring disagree with the same local shadow of the canonical result. |

Similar errors in separate normalizers (contract unlocks, channel record casts, tuple/array narrowing) remain independent obligations unless an actual shared implementation is proven. No cross-file cascade is inferred solely from diagnostic code.

## Semantic questions

**41 obligations / 99 occurrences** are explicitly flagged `semantic-review`. This conservative label includes unresolved compatibility and test-intent questions; it does not assert that every row is a proven gameplay contradiction. Each row gives the disputed contract and exact source evidence. Priority questions include:

- `routing-duplicate-fields`: duplicate candidate/rejected-team assignments choose different representations. Do not remove an earlier/later assignment blindly.
- `market-order-semantics` and `market-order-blocked-reason`: order/fulfill actions are unhandled in quantity aggregation, while the UI reads an undeclared order denial field. These are separate decisions within market semantics.
- `branch-effective-choice`: activation logic and four fixtures use effectiveFromChoiceId absent from BranchCorrectedRecord. Establish when corrected facts become active.
- `weekly-integrity-state`: append/clear helpers use a GameState field absent from the schema. Decide persistence/normalization ownership before adding state.
- `readiness-aliases` and `probe-report-payload`: reconcile consumer fields against authoritative readiness and event payload contracts without changing hidden-information visibility.
- Hydration contracts (`case-mode-hydration`, `coordination-fallback`, `contact-history-shape`, `entity-id-sentinel`, hub/runtime result shapes): preserve legacy compatibility and invalid-input rejection while deciding canonical output shapes.
- `prerequisite-result-shape`: establish which activation outcomes guarantee inventory and typed workshop maps before assigning them into GameState.
- Enum/obsolete-field fixture rows: confirm the intended scenario using canonical values; do not add gameplay vocabulary simply to compile a fixture.

These questions are evidence routed to their named code authorities through SPE-3376 reconciliation. No remediation issues, ownership relationships, gameplay decisions, or new approvals are created here.

## Completion and remaining work

The census/partition deliverable is complete **when this report and its integrity checks are reviewed and merged**: every occurrence has a provisional cause or explicit semantic question, code authority, owner disposition and cascade assessment. This completes inventory work, not build recovery or approval of repairs.

SPE-3375 remains Backlog and the production build remains red. Existing repair children remain Backlog and still require separate implementation authorization; this PR changes no issue relationships. All 681 diagnostic repairs, semantic decisions, and measured before/after cascade validation remain with the recovery program and subsequently approved boundaries. The historical duplicate buildReportCaseSnapshots browser failure is not present in this census and is not revived as new work.

The required census test checks exact coverage, duplicate membership, hash-bound baseline provenance, source-coordinate reconciliation, and repeated capture metadata. It cannot establish semantic correctness of the written causal hypotheses; independent review remains necessary.

# SPE-1051 — Recoverable failure: sealed-site / confiscated-evidence endings (slice 6)

| Field               | Value                                                                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**          | **Recently shipped**                                                                                                                                                                                                           |
| **Linear**          | [SPE-1051](https://linear.app/spectranoir/issue/SPE-1051/recoverable-failure-campaign-scars-and-after-action-collapse-model) — umbrella remains **Backlog** after this slice (other ACs remain); do **not** mark SPE-1051 Done |
| **Parent**          | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog**                                                                                              |
| **Related**         | Slice 1 scar registry; slice 2 state-change success; slice 3 living-but-lost catalog; slice 4 post-loss adaptation unlock; slice 5 after-action cause-chain. SPE-1694 stays **Canceled**. SPE-1103 adjacency for true-defeat. |
| **Branch**          | `cursor/spe-1051-sealed-site-confiscated-evidence`                                                                                                                                                                             |
| **Base `main` SHA** | `6325807416f3a3de3b4bdde3214748cda0e5036e`                                                                                                                                                                                     |

## Goal

Add a pure deterministic projector that turns a caller-owned sealed-site or confiscated-evidence ending into a survival-with-clarity-loss record — preserving survival while reducing future knowledge recovery and institutional clarity — without GameState, week-close, UI, true-defeat, rewriting slice-1 `knowledgeClarityLoss` / `SCAR_DEFINITIONS`, or expanding into SPE-868 review-metrics.

## Pre-coding summary

| Item              | Finding                                                                                                                                                                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relevant files    | Slice 1 `campaignScarDegradedState.ts` (`knowledgeClarityLoss` numeric effect); slice 2 `incidentStateChangeResolution.ts` fail-closed ending-kind pattern; slices 3–5 catalog/unlock/cause-chain projectors; no prior sealed-site / confiscated-evidence ending module |
| Current behavior  | SPE-1051 slices 1–5 ship scar registry, state-change success, living-but-lost catalog, adaptation unlock, and after-action cause-chain; umbrella AC for sealed-site / confiscated-evidence survival-with-clarity-loss unmet                                              |
| Expected behavior | Caller-owned `endingKind` (`sealed_site` \| `confiscated_evidence`) + optional non-empty `siteId` → immutable `survival_with_clarity_loss` projection with `knowledgeRecoveryReduced` and `institutionalClarityReduced` both true; fail-closed omit/unknown/malformed  |
| Boundary          | Pure ending projector + validate/project + contract tests + slice doc + Deferred retarget on SPE-1051 slices 1–5 + backlog handoff. No GameState, week-close, UI, true-defeat, SPE-2261/2262 edits, no rewrite of slices 1–5                                           |
| Risks             | Mutating slice-1 `knowledgeClarityLoss`; inventing game-over / true-defeat; marking SPE-1051 Done; expanding into crisis-leader or full taxonomy work                                                                                                                   |
| Validation        | `src/test/sealedSiteConfiscatedEvidenceEnding.contract.test.ts`, related SPE-1051 contract tests, lint, `npm run verify:backlog-handoff`                                                                                                                                 |
| Docs              | This slice doc; retarget Deferred row on slices 1–5; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`. No `SCHEMA_REGISTRY` change                                                                                                                       |

## Boundary

### In scope

- Compact authored ending set in `src/domain/sealedSiteConfiscatedEvidenceEnding.ts`: `sealed_site`, `confiscated_evidence`
- Caller-owned input: required `endingKind`; optional non-empty `siteId` when present
- `validateSealedSiteConfiscatedEvidenceEndingInput` + `projectSealedSiteConfiscatedEvidenceEnding`
- Success projection: `outcomeKind: 'survival_with_clarity_loss'`; survival preserved (`preservesSurvival`, not game-over / true-defeat / entity elimination); `knowledgeRecoveryReduced: true`; `institutionalClarityReduced: true`
- Kind-specific immutable flags: sealed site closes access permanently with partial-record understanding; confiscated evidence stabilizes via intervention and confiscates samples/telemetry/notes
- Fail-closed omit / null / undefined / unknown kind / malformed site id
- Targeted Vitest contract coverage
- Retarget Deferred row on existing SPE-1051 slice docs (sealed-site / confiscated-evidence → this slice)

### Out of scope

- GameState persistence / `GAME_STORE_VERSION` / SCHEMA_REGISTRY
- Week-close hooks, planner UI, combat win/loss economy
- True-defeat / agency-dissolution thresholds (SPE-1103 adjacency)
- Isolated crisis leaders as lethal containment threats
- Additional adaptation unlocks (audits, trauma care, emergency authority, backup sites, forbidden countermeasures)
- Full living-but-lost taxonomy, care burden, recovery paths
- Full SPE-868 review-metrics / retrospective surface
- SPE-2261 / SPE-2262 registry semantic changes; SPE-3118 labor boundaries
- Rewrite of slice 1 `SCAR_DEFINITIONS` / `knowledgeClarityLoss`, slice 2–5 modules
- Reopening or closing SPE-1694 (stays **Canceled**; not an owner)
- Parent SPE-1052 closure; full SPE-1051 umbrella Done

## Seam

Callers pass exactly one known ending kind (`sealed_site` or `confiscated_evidence`) and an optional non-empty site id. `projectSealedSiteConfiscatedEvidenceEnding` returns an immutable `survival_with_clarity_loss` projection when configured: survival is preserved, future knowledge recovery and institutional clarity are reduced, and kind-specific seal or confiscation flags are set. The ending record is additive only — callers keep using scar, catalog, unlock, and cause-chain projectors unchanged. Malformed or omitted inputs fail closed to `undefined`. No randomness; no GameState import.

## Acceptance (slice 6)

- [x] At least one sealed-site or confiscated-evidence ending preserves survival while reducing future knowledge recovery or institutional clarity
- [x] Both authored kinds project `survival_with_clarity_loss` with `knowledgeRecoveryReduced` and `institutionalClarityReduced` true
- [x] Tests cover both kinds, survival preserved, clarity/knowledge reduction, omit/malformed/unknown fail-closed, determinism, and unchanged prior SPE-1051 projectors
- [x] No GameState field; parent SPE-1052 remains **Backlog**; SPE-1051 umbrella remains **Backlog** for deferred ACs; SPE-1694 stays **Canceled**

## Deferred

| Item or mechanic                                                                                                  | Owner or prerequisite                    | Why deferred                                                                            |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| Additional adaptation unlocks (audits, trauma care, emergency authority, backup sites, forbidden countermeasures) | SPE-1051 later slice                     | Slice 4 ships one primary unlock (`stricter_access_rules`) only                         |
| Full living-but-lost taxonomy + care / recovery paths                                                             | SPE-1051 later slice; SPE-1682 adjacency | Compact catalog already shipped in slice 3; taxonomy/recovery stay out                  |
| Full SPE-868 review-metrics / retrospective surface                                                               | SPE-868 adjacency                        | Slice 5 ships cause-chain explanation only; no review-metrics registry                  |
| True-defeat / agency-dissolution thresholds                                                                       | SPE-1103 / SPE-1051 later slice          | Slice intentionally omits game-over / true-defeat outcome kinds                         |
| Isolated crisis leaders as lethal containment threats                                                             | SPE-1051 later slice                     | Umbrella scope line; not this ending projector                                          |
| Week-close / GameState wire of scars, catalog, adaptation, after-action, or endings                               | later SPE-1051 / SPE-1052 child          | Caller-owned projection only                                                            |
| Consume of SPE-2261 pathway outputs into scar / after-action / ending triggers                                    | SPE-2261 shipped; wire stays deferred    | Do not rewrite SPE-2261; callers may pass history independently                         |
| Broader collapse-chain AC beyond slice-1 scar cascade + slice-5 cause-chain                                       | SPE-1051 later slice                     | Slice 1 cascade + slice 5 after-action exist; additional multi-system chains stay deferred |
| SPE-1694 Post-loss legacy interventions                                                                           | **Canceled** — do not reopen             | Ownership stays on SPE-1051; SPE-1694 is not an owner                                   |

Parent SPE-1052 remains **Backlog**. SPE-1051 remains **Backlog** after merge (slice 6 sealed-site / confiscated-evidence shipped; umbrella ACs incomplete — true-defeat, GameState wire, additional unlocks, full taxonomy remain). Do not close SPE-1052 from this slice. Do not mark SPE-1051 Done. Do not reopen SPE-1694.

## Validation

- Targeted Vitest: `src/test/sealedSiteConfiscatedEvidenceEnding.contract.test.ts`
- Related SPE-1051 contract tests (slices 1–5)
- `npm run lint` (touched files)
- `npm run verify:backlog-handoff`

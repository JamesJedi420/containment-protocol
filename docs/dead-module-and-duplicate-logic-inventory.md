# Dead-module and duplicate-logic inventory

**Date:** 2026-11-05 · **Base:** `64e37510` (`main`, 2026-11-04) · **Mode:** read-only. No code, test or Linear mutation was performed for this document.

This inventory answers one question per candidate: _is this module dead, a duplicate with drift risk, or an intentional seam that is simply not wired yet?_ A zero-importer result is treated as a hypothesis, not a verdict, and each headline claim below survived an attempt to disprove it. Appendix A is the full census so a reviewer can re-check any row without re-running the analysis.

## Scope and method

The census covers every non-test TypeScript module under `src/domain/**` — **724 modules** on this base.

Three measurements per module:

- **Production importers** — tracked `.ts`/`.tsx` files outside test locations (`src/**/*.test.ts(x)`, `test/`, `e2e/`, `qa/`) that statically import or re-export the module, including `import type` and barrel re-exports. Resolved by path, not by string match.
- **Test references** — importers inside those test locations. This is import evidence, **not** behavioural coverage.
- **Last touched** — `git log -1 --format='%h|%ad|%s' --date=short -- <path>`.

Aggregates on this base:

| Measure                                          | Count |
| ------------------------------------------------ | ----- |
| Non-test domain modules                          | 724   |
| No production importer                           | 125   |
| … of those, with at least one test importer      | 123   |
| … of those, with no importer anywhere            | 2     |
| No test importer                                 | 45    |
| … of those, at `src/domain/*.ts` (top level)     | 25    |
| … of those, below the top level (subdirectories) | 20    |
| Pure re-export shims among the 125               | 5     |

**Reconciliation of the starting estimate:** "25 domain files have no direct test reference" reproduces **exactly** as the 25 top-level `src/domain/*.ts` modules. The same measure over the whole tree, including subdirectories, is 45 (the other 20 are in `agent/`, `events/`, `partyCards/`, `recruitment/`, `sim/`, `templates/`, `settlements/`). The brief cited the top-level figure; this document uses the 45-module tree-wide figure where the distinction matters.

Three original hypotheses were tested and **rejected** — see §3.5. Root `tags.ts`, `conditions.ts` and `distortion.ts` are 9–21-line pure re-export shims over `src/domain/shared/*`, not divergent shadow implementations. Reporting them as duplicates would have been wrong.

## 1. Candidate table

Primary findings. `Prod / Test` are importer counts. Class codes are defined in §2.

| #   | Candidate                                                                                                          | Prod / Test | Last touched                     | Class | Disposition                                                                                         | Owner                                              |
| --- | ------------------------------------------------------------------------------------------------------------------ | ----------- | -------------------------------- | ----- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | `src/domain/templates/contentTemplateValidation.ts`                                                                | 0 / 0       | `68597c5a` 2026-04-18            | D     | No importer anywhere. Deletion candidate only if SPE-48 retires the kernel family; retain meanwhile | SPE-48 (Backlog)                                   |
| 2   | `src/domain/recoveryFatigue.ts`                                                                                    | 0 / 0       | `3e037560` 2026-04-13            | D     | Duplicated with drift risk **and** unreferenced. Consolidate under SPE-44, then delete              | SPE-44 (Backlog)                                   |
| 3   | `src/domain/sim/advanceWeek.ts:992-1075` private fatigue helpers (live path, call at 3742)                         | n/a         | `82dc44d2` 2026-11-04            | U     | Canonical for the weekly tick; keep as the reference implementation                                 | SPE-44                                             |
| 4   | `src/domain/sim/fatiguePipeline.ts:18-30, 48-125`                                                                  | 1 / 3       | `24850f58` 2026-05-13            | U     | Only `getAverageTeamFatigue` is used in production; weekly batch is test-only                       | SPE-1107 (Backlog) / SPE-44                        |
| 5   | `getAverageRosterFatigue` ×3 (`advanceWeek.ts:1068`, `weeklyReport.ts:136`, `rosterFatigue.ts:25`)                 | 0 / 1–2     | `82dc44d2` / `df007a68`          | U     | Three definitions, two of them unfiltered; production uses the unfiltered one                       | SPE-44 (advance-week ownership), otherwise unowned |
| 6   | `hashSeed` ×5 (FNV-1a)                                                                                             | 5 wired / 0 | `8828c874`–`87bdb8ef` 2026-04/05 | U     | Duplicated seed primitive; no canonical owner named in code                                         | SPE-3162 (registry-named nearest owner)            |
| 7   | `getAgencyState` ×4                                                                                                | wired / 0   | `76f9afd7`–`f97e3483` 2026-06/11 | U     | Four identical fallbacks; drift risk in case generation and faction pressure                        | unowned                                            |
| 8   | `getRecentUnresolvedMomentum` ×4                                                                                   | wired / 0   | `2b05de76`–`62a23c98` 2026-04/10 | U     | Four identical reductions over the last three reports                                               | unowned                                            |
| 9   | `src/domain/facilityProductionChain.ts`                                                                            | 0 / 1       | `bb8e2c58` 2026-10-27            | U     | Registry defers wiring; owner issue is **Done** → owner gap, not "pending owner"                    | SPE-3360 (Done) — wiring unowned                   |
| 10  | `src/domain/managedCultivationLifecycle.ts`                                                                        | 0 / 1       | `b7fced63` 2026-10-27            | U     | Registry defers wiring; owner issue is **Done** → owner gap                                         | SPE-3406 (Done) — wiring unowned                   |
| 11  | `src/domain/procedureRoomStatePreconditions.ts`                                                                    | 0 / 1       | `b5c06e64` 2026-10-27            | U     | Registry documents a deliberately pure module (no GameState by design)                              | SPE-1896                                           |
| 12  | `src/domain/historicalContinuityBoard.ts`                                                                          | 0 / 1       | `336fd509` 2026-10-28            | U     | Registry documents a deliberately pure module (no GameState by design)                              | SPE-2099                                           |
| 13  | `contentTemplateKernel.ts`, `doctrinePlaybookRuntime.ts`, `hazardIncidentRuntime.ts`, `protocolMaterialRuntime.ts` | 0 / 1 each  | `68597c5a`–`f40fa0ed`            | U     | SPE-48 family reachable only from its own tests; `templates/index.ts` does not re-export it         | SPE-48 (Backlog)                                   |
| 14  | `conditions.ts`, `distortion.ts`, `tags.ts`, `rules/countermeasures.ts`, `rules/resistances.ts`                    | 0 / 1–2     | `68597c5a`, `50c5e01c`           | S     | Pure re-export shims; no logic, no drift. No action                                                 | n/a (shim)                                         |

## 2. Classification

**Class D — deletion candidate.** No production importer and no test importer. Rows 1–2 are the only class-D modules. "Deletion candidate" is not authorisation: removal needs the named owner to confirm the seam is retired, because deletion is a code change and this session is read-only.

**Class U — duplicated with drift risk / unwired seam.** The module (or its logic) exists, is partially visible to tests or documentation, but is not reached by normal gameplay. Two sub-cases that must not be conflated:

- _Duplicated logic_ (rows 3–8): the same maths exists elsewhere; divergence changes seeded outcomes. These are never "dead code" — they are competing implementations.
- _Unwired seam_ (rows 9–13): one implementation, no caller, a named Linear owner and a documented reason for the absence of wiring.

**Class S — shim.** A pure `export { … } from './shared/…'` file. Zero production importers because production imports the `shared/` target directly; tests still import the old path. No logic, so no drift. No action while tests reference it.

## 3. Duplicated simulation logic

### 3.1 Weekly agent fatigue — three implementations, already divergent

**Canonical implementation:** `src/domain/sim/advanceWeek.ts:992-1075` (private `getMissionFatigue`, `getRecoveryFatigue`, `applyAgentFatigue`, `getAverageRosterFatigue`), invoked at `advanceWeek.ts:3742`. It is the only copy reachable from `src/main.tsx`, and therefore the only one that shapes a real campaign.

**Shadow copies:**

- `src/domain/recoveryFatigue.ts:5-58` — exported `getMissionFatigue`, `getRecoveryFatigue`, `applyAgentFatigue`. Zero importers anywhere. It matches the live branch arithmetic for resting/training agents but **omits** the SPE-99 deployed-recovery scaling (`scaleDeployedMissionFatigueDelta`, comment at `advanceWeek.ts:1009`) and the SPE-130/SPE-1107 channel, overdrive and energy-budget updates.
- `src/domain/sim/fatiguePipeline.ts:18-30` — a second private copy of the two constants; `applyWeeklyAgentFatigue` at `48-125` adds channels, overdrive debt and responder energy. Its only production importer is `src/domain/sim/missionFinalizationPipeline.ts:3`, which takes `getAverageTeamFatigue` **only**. The weekly batch itself is imported by three test files (`src/test/sim.fatiguePipeline.test.ts`, `agentFatigueChannels.test.ts`, `responderEnergyBudget.test.ts`).

The three copies are not hypothetical drift — they disagree today:

| Agent branch         | `recoveryFatigue.ts`            | `advanceWeek.ts` (live)                 | `fatiguePipeline.ts`            |
| -------------------- | ------------------------------- | --------------------------------------- | ------------------------------- |
| Active / deployed    | `missionFatigue × (1 + stress)` | same, then SPE-99 recovery-mode scaling | `missionFatigue × (1 + stress)` |
| Training             | `−(recoveryRateBonus)`          | `−(recoveryRateBonus)`                  | `0`                             |
| Resting / unassigned | `−(recoveryFatigue + bonus)`    | `−(recoveryFatigue + bonus)`            | `−recoveryFatigue`              |
| Non-fatigue state    | fatigue only                    | fatigue only                            | + channels, overdrive, energy   |

**Determinism risk (this is a seeded weekly sim):** fatigue feeds mission resolution, recovery gating, `WeeklyReport.avgFatigue` and the mission-routing `fatigue-over-threshold` blocker (`src/domain/missionIntakeRouting.ts:983-995`). Divergence is not cosmetic: the training branch differs by `recoveryRateBonus` per agent per week between the live path and `fatiguePipeline`, and the resting branch differs by the same bonus. Any consolidation that repoints `advanceWeek` at `recoveryFatigue.ts` would silently remove SPE-99 deployed-recovery scaling; repointing at `fatiguePipeline` would change training recovery from `−bonus` to `0` and add channel/energy writes. In each case the same save and seed produce a different roster by the following weeks, compounding weekly, and weekly-report or save-replay equality checks diverge without any code path appearing to "change gameplay".

**Current owner evidence:** SPE-44 (Backlog), whose 2026-10-27 reconciliation comment already records this exact duplication — local helpers in `advanceWeek.ts`, exported copies in `recoveryFatigue.ts`, and further duplicates in `fatiguePipeline.ts` — and states that the earlier Done closure is unsupported. This inventory confirms that finding and adds the branch-level drift, the roster-average variant and the hash/aggregate duplicates.

### 3.2 Roster fatigue average — three definitions, production uses the wrong one

- `src/domain/sim/advanceWeek.ts:1068-1075` — averages **every** agent, including dead, resigned, training and attrition-unavailable agents; used at `advanceWeek.ts:4504` to populate `WeeklyReport.avgFatigue`.
- `src/domain/sim/weeklyReport.ts:136-143` — the same unfiltered average; the module itself has no production importer (`buildWeeklyReport` is imported only by `src/test/weeklyReport.test.ts`), so this is a test-only parallel report builder.
- `src/domain/sim/rosterFatigue.ts:25-33` — the only **filtered** definition, using `isRosterFatigueAgent` (excludes dead, resigned, training and attrition-unavailable). It has zero production importers; its consumer is `src/test/weeklyReport.test.ts`.

So the tested helper and the production metric disagree by construction. Dead and training agents stay in the production denominator, while the test that asserts roster fatigue imports a helper the report never calls. Determinism risk: `avgFatigue` is persisted through `runTransfer.ts` (hydration clamp at 1741-1768, reconciliation at 10167) — a corrected definition changes stored report history and any downstream pressure that reads it, for an unchanged seed.

### 3.3 `hashSeed` — five copies of the seed root

Identical FNV-1a implementations at `victimCultivation.ts:13`, `siteGeneration/pipeline.ts:27`, `urbanNeighborhoodIncidents.ts:84`, `hostileLoadouts.ts:13`, `civicConsequenceNetwork.ts:98`. All five are wired and each derives a deterministic RNG stream (`siteGeneration/pipeline.ts:39`, `urbanNeighborhoodIncidents.ts:138`, `hostileLoadouts.ts:25`, `civicConsequenceNetwork.ts:110,301`, `victimCultivation.ts:25`).

Determinism risk: this function _is_ the seed. One corrected copy (for example a change to the `>>> 0` normalisation) silently changes site generation, incident timing, loadout rolls, civic consequences or victim cultivation while the others stay fixed — same seed, different world, and no single place to audit. No canonical owner is named in code; `SCHEMA_REGISTRY.md` names SPE-3162 for scoped stochastic identity, which is the nearest standing owner but did not create these copies.

### 3.4 Agency aggregates — four copies each

`getAgencyState` is defined identically in `agency.ts:119`, `caseGeneration.ts:95`, `factions.ts:406` and `protocols.ts:264`; `getRecentUnresolvedMomentum` identically in `agency.ts:142`, `caseGeneration.ts:109`, `factions.ts:431` and `strategicState.ts:161`. The bodies match today (normalised-body scan), so this is latent rather than active drift. Risk: both feed case generation and faction/protocol pressure, i.e. seeded content selection; a one-copy fix (for example the `agency` fallback shape) changes generated pressure for a fixed seed.

### 3.5 Hypotheses tested and rejected

- **Root `conditions.ts` / `tags.ts` / `distortion.ts` as divergent duplicates — rejected.** They are 9–21-line `export { … } from './shared/…'` shims. Production imports `shared/tags` (6 importers), `shared/distortion` (10), and `shared/modifiers`/`shared/outcomes`; tests import the old root paths. No maths is duplicated and deletion would only churn test imports. `rules/countermeasures.ts` and `rules/resistances.ts` are the same pattern (5 lines each).
- **"No test reference means dead" — rejected.** 43 of the 45 untested modules have production importers (for example `assertBoundedInteger.ts`, 12 importers; `agencyProgression.ts`, 5). Test absence is a coverage signal, not a liveness signal.
- **"Old last-touched means dead" — rejected.** `68597c5a` (2026-04-18) is a bulk commit that also touched live modules; `facility.ts` (2026-10-09) and `sim/queue.ts` (2026-04-13) are recent or heavily documented yet test-only. Recency carries no liveness information.

Not itemised: the ~40 private `normalizeWeek` copies, registry `sortValidationIssues`/`freezeValidationResult` boilerplate and `formatEnumLabel` variants. They are broad duplication noise (146 normalised-body matches across `src/domain`) but they do not alter seeded sim outcomes, so they are out of scope for this inventory and belong to a lint-level consolidation decision, not a correctness owner.

## 4. Owner mapping

Linear states read on 2026-11-05 (read-only).

| Owner    | State   | Evidence in repo / Linear                                                                                                                                                                           | Owns in this inventory                                                              |
| -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| SPE-44   | Backlog | Commit `3e037560` created `recoveryFatigue.ts`; Linear comment 2026-10-27 names the `advanceWeek.ts` duplicates, `recoveryFatigue.ts` and `fatiguePipeline.ts` and withdraws the earlier Done claim | rows 2–5: fatigue consolidation, advance-week extraction, roster average            |
| SPE-48   | Backlog | File header `// Validation for ContentTemplateKernel and family extensions (SPE-48)`; Linear comment 2026-10-05 "keep SPE-48 open … verify template shape, validation … before closure"             | rows 1, 13: `contentTemplateValidation.ts` and the kernel/runtime family            |
| SPE-99   | Backlog | Inline comment `advanceWeek.ts:1009` ("week-close fatigue runs after assignment release; use pre-resolution snapshot for fieldBase modes")                                                          | the deployed-recovery scaling that `recoveryFatigue.ts` would silently drop         |
| SPE-1107 | Backlog | Commit `24850f58` ("SPE-1107: responder energy budget slice") last touched `fatiguePipeline.ts`; SPE-130 comments cover channel/overdrive phases                                                    | the channel, overdrive and energy half of the weekly fatigue tick                   |
| SPE-3360 | Done    | `SCHEMA_REGISTRY.md:37`: "Optional GameState wiring and week-close orchestration remain deferred"; Linear Done, PR #4429 merged                                                                     | `facilityProductionChain.ts` seam — **wiring has no owner** after closure           |
| SPE-3406 | Done    | `SCHEMA_REGISTRY.md:41`: same deferral language; Linear Done                                                                                                                                        | `managedCultivationLifecycle.ts` seam — **wiring has no owner** after closure       |
| SPE-1896 | —       | `SCHEMA_REGISTRY.md:45`: "No GameState persistence, facility simulator, or SPE-874 permit engine"                                                                                                   | `procedureRoomStatePreconditions.ts` (deliberately pure, not a wiring backlog item) |
| SPE-2099 | —       | `SCHEMA_REGISTRY.md:109`: "No GameState persistence, site generator, franchise canon imports, or archive UI in slice 1"                                                                             | `historicalContinuityBoard.ts` (deliberately pure)                                  |
| SPE-3162 | —       | `SCHEMA_REGISTRY.md` stochastic-identity section names typed decision identity and scoped seeds                                                                                                     | nearest owner for the `hashSeed` copies; no direct docstring link                   |

Appendix A lists the first SPE id found in each module's own docstring/comments. That column is an ownership _pointer_, not a sole-owner claim: modules commonly cite several related SPEs, and a pointer does not authorise new scope.

## 5. How to tell dead from not-yet-wired

A module is **dead** only when all four hold:

1. No static importer in production code (including `import type`, barrels, dynamic `import()` and `require()`).
2. No importer in any test location.
3. No owner pointer in its own comments, `SCHEMA_REGISTRY.md`, or a `planning/*-slice.md`.
4. No live behaviour depends on its maths — or its maths is fully reproduced by a live implementation (then it is a duplicate, not dead).

A module is a **not-yet-wired seam** when it has an owner pointer and a documented reason for the missing caller. Read the registry wording, because it distinguishes three different states:

- "Optional `GameState` wiring … remain deferred" → wiring is intended and unbuilt. **Action:** find the follow-on owner. If the named issue is Done (SPE-3360, SPE-3406), record an owner gap rather than "pending owner".
- "No `GameState` field, week-close hook, or `OperationEvent` kind" → deliberately consumer-supplied and pure. **Action:** none; it is not a wiring backlog item.
- "Persistence is proved via `sanitize…`" → persistence shipped, orchestrator missing. **Action:** owner decision on the week-close hook only.

A module is **duplicated with drift risk** when a second implementation is reachable from `src/main.tsx`. Never delete the shadow first: choose the canonical copy from live call-site evidence, diff the branches explicitly (as in §3.1), and land the reconciliation with determinism fixtures under the owning Linear issue.

**Disproof checklist before writing "no importer":**

- `git grep -n '<module>' -- .` — text-level, catches docs, planning, registries and `.tmp`-style references.
- Barrel re-exports: `src/domain/templates/index.ts` re-exports eight modules; a barrel importer counts as a production importer for the target.
- Type-only imports (`import type`) are real edges for typecheck and must be counted.
- Dynamic `import('…')` / `require('…')` string literals (searched; none resolve to a candidate here).
- `vi.mock('…')` paths in tests create test-only dependencies that look like usage.
- Generated artefacts are not consumers: `docs/typecheck/**/census.json`, `docs/typecheck/partition.json` and `docs/typecheck/*/delta.json` list every domain file and will make any module look "referenced".
- Path-prefix collisions: `domain/facility'` is not `domain/facilityLifecycle'`; quote-terminated greps avoid this false positive (it was hit and corrected during this pass).

## 6. Limits

- The census is a static import graph. No runtime string-keyed module lookup was found, but one added later would evade it.
- "Test reference" is an import, not coverage or assertion strength. A test-only module can still be thoroughly tested.
- Import counts are direct edges. Transitive reachability from `src/main.tsx` was also computed; no zero-importer module was reachable through a barrel, so the 125 stand as unwired.
- `last touched` is commit provenance, not authorship or relevance; bulk commits inflate recency.
- Linear states were read on 2026-11-05 and are not re-asserted after that date. No issue was created, updated or transitioned.
- This document does not match `docs/*audit*.md` (its filename contains no `audit`), so `scripts/verify-design-audits-index.mjs` does not require a row in `docs/design-audits-index.md`; `npm run verify:audits-index` was run to confirm.

## Appendix A — full census of zero-production-importer domain modules

125 rows, `src/domain/` relative. **Prod** = production importers; **Test** = test-file importers; **Class** = U (test-referenced seam — not deletable), **S** (pure re-export shim), or D (no importer anywhere — deletion candidate requiring owner sign-off); **Owner** = first SPE id named in the module (see §4 caveat); **Last commit** = short hash and date.

| Module                                          | Prod | Test | Class | Owner    | Last commit           |
| ----------------------------------------------- | ---- | ---- | ----- | -------- | --------------------- |
| `actionConsequenceRouter.ts`                    | 0    | 1    | U     | SPE-2157 | `da53a625` 2026-10-28 |
| `actionOutputDerivedRecovery.ts`                | 0    | 1    | U     | SPE-3120 | `45a47185` 2026-10-28 |
| `affiliatedOrderBranchLinkage.ts`               | 0    | 1    | U     | SPE-699  | `5eac65c7` 2026-10-28 |
| `afterActionCauseChain.ts`                      | 0    | 2    | U     | SPE-1051 | `329aa53c` 2026-09-29 |
| `alternateRealityThresholdRouteRegistry.ts`     | 0    | 1    | U     | SPE-2121 | `0c375c93` 2026-06-01 |
| `anomalousByproductLifecycle.ts`                | 0    | 1    | U     | SPE-2103 | `8c49e096` 2026-10-18 |
| `antiNarrativeRecordCollapseRegistry.ts`        | 0    | 1    | U     | SPE-2119 | `55667d11` 2026-05-31 |
| `ascendantResidentContainment.ts`               | 0    | 1    | U     | SPE-791  | `82dc44d2` 2026-11-04 |
| `authoredContentGuardrails.ts`                  | 0    | 1    | U     | SPE-2265 | `1a3aa166` 2026-10-28 |
| `authoredIncidentReferenceIntegrity.ts`         | 0    | 1    | U     | SPE-3139 | `46fedeff` 2026-10-28 |
| `authorityNegotiation.ts`                       | 0    | 2    | U     | SPE-788  | `c91fb2e6` 2026-07-26 |
| `baseDefenseDoctrine.ts`                        | 0    | 1    | U     | SPE-1022 | `efea8bdb` 2026-10-20 |
| `beliefLockIllusion.ts`                         | 0    | 1    | U     | SPE-470  | `48fbcd69` 2026-10-30 |
| `biologicalMnemonicDrain.ts`                    | 0    | 1    | U     | SPE-270  | `40a8fe7f` 2026-10-30 |
| `civicPressureProfile.ts`                       | 0    | 1    | U     | SPE-1271 | `75edde88` 2026-05-01 |
| `civilization.ts`                               | 0    | 1    | U     | SPE-1069 | `0558b78e` 2026-04-30 |
| `closedFacilityPermeability.ts`                 | 0    | 1    | U     | SPE-1263 | `82dc44d2` 2026-11-04 |
| `conceptStateTransformationRegistry.ts`         | 0    | 1    | U     | SPE-2118 | `299d8d54` 2026-07-01 |
| `conditionalRecurringTaskActivation.ts`         | 0    | 1    | U     | SPE-3041 | `5869c22d` 2026-10-27 |
| `conditions.ts`                                 | 0    | 2    | S     | —        | `68597c5a` 2026-04-18 |
| `confinedSpaceExplosion.ts`                     | 0    | 1    | U     | SPE-263  | `a8c2c1db` 2026-10-28 |
| `constructionStageAccessibility.ts`             | 0    | 1    | U     | SPE-3440 | `cb478a59` 2026-10-26 |
| `containmentCoLocationCompatibility.ts`         | 0    | 1    | U     | SPE-3177 | `bc0f44d8` 2026-10-18 |
| `containmentDispositionRegistry.ts`             | 0    | 1    | U     | SPE-2102 | `429cc0dc` 2026-10-11 |
| `containmentWallBreach.ts`                      | 0    | 1    | U     | SPE-471  | `22549cac` 2026-10-30 |
| `counterfactualBranches.ts`                     | 0    | 1    | U     | —        | `443df01b` 2026-04-30 |
| `coverStoryLifecycleTruthLayerAnchor.ts`        | 0    | 1    | U     | SPE-1347 | `fe4f24d9` 2026-06-13 |
| `criticalAssetSupportability.ts`                | 0    | 1    | U     | SPE-3153 | `728d4616` 2026-10-26 |
| `crossZoneContamination.ts`                     | 0    | 1    | U     | SPE-807  | `357dcf7d` 2026-10-28 |
| `defensiveControlStaffAction.ts`                | 0    | 1    | U     | SPE-2186 | `3782c709` 2026-10-28 |
| `degradedCareFacilityRisk.ts`                   | 0    | 1    | U     | SPE-1012 | `82dc44d2` 2026-11-04 |
| `delegatedFacilityManagement.ts`                | 0    | 1    | U     | SPE-1565 | `8fc38166` 2026-10-19 |
| `deployableTeamCapacity.ts`                     | 0    | 1    | U     | SPE-3497 | `b2f7db9a` 2026-10-30 |
| `discussionDecisionReconciliation.ts`           | 0    | 1    | U     | SPE-2905 | `ca4f9e07` 2026-09-21 |
| `distortion.ts`                                 | 0    | 3    | S     | —        | `68597c5a` 2026-04-18 |
| `duplicateFacilityStacking.ts`                  | 0    | 1    | U     | SPE-3361 | `82dc44d2` 2026-11-04 |
| `emergencyBranchBorrowingFacility.ts`           | 0    | 1    | U     | SPE-1173 | `3a0a6a0b` 2026-10-20 |
| `entityEncounterStatblockPacket.ts`             | 0    | 1    | U     | SPE-2197 | `777d4efd` 2026-10-31 |
| `events/externalChemistryEvents.ts`             | 0    | 1    | U     | —        | `3fdd85b2` 2026-04-03 |
| `extranormalEventCaseEscalation.ts`             | 0    | 1    | U     | SPE-3367 | `76bb56c2` 2026-10-28 |
| `extranormalTemporalEventRegistry.ts`           | 0    | 1    | U     | SPE-1757 | `14105c33` 2026-10-27 |
| `facility.ts`                                   | 0    | 5    | U     | —        | `d801f265` 2026-10-09 |
| `facilityAutomationReset.ts`                    | 0    | 1    | U     | SPE-1021 | `2aa8da62` 2026-10-20 |
| `facilityConstructionComplicationEvents.ts`     | 0    | 1    | U     | SPE-1562 | `f60a4913` 2026-10-19 |
| `facilityCoreResidue.ts`                        | 0    | 1    | U     | SPE-3389 | `82dc44d2` 2026-11-04 |
| `facilityEnvDependencyProjection.ts`            | 0    | 1    | U     | SPE-3415 | `8401c89f` 2026-10-27 |
| `facilityGeometryVulnerabilityAnalysis.ts`      | 0    | 1    | U     | SPE-1563 | `510e3ff4` 2026-10-19 |
| `facilityLayoutStagingProjection.ts`            | 0    | 1    | U     | SPE-2987 | `3a69e3f4` 2026-09-23 |
| `facilityOutputThresholds.ts`                   | 0    | 1    | U     | SPE-1481 | `c032f891` 2026-10-18 |
| `facilityProductionChain.ts`                    | 0    | 1    | U     | SPE-3360 | `bb8e2c58` 2026-10-27 |
| `facilityZoningLockdown.ts`                     | 0    | 1    | U     | SPE-292  | `82dc44d2` 2026-11-04 |
| `fieldActionEconomyRegistry.ts`                 | 0    | 1    | U     | SPE-2217 | `6e8e485f` 2026-09-21 |
| `finiteCommandConstruct.ts`                     | 0    | 1    | U     | SPE-330  | `d75ff868` 2026-10-30 |
| `forcedMovementCollisionResolver.ts`            | 0    | 1    | U     | SPE-2189 | `c8bdc9a1` 2026-10-31 |
| `forcedMovementHazard.ts`                       | 0    | 1    | U     | SPE-399  | `02953fa7` 2026-10-30 |
| `hazardousResearchRiskPosture.ts`               | 0    | 2    | U     | SPE-3344 | `73197ec5` 2026-11-04 |
| `hiddenRoomBuildingGraph.ts`                    | 0    | 1    | U     | SPE-992  | `1028e9b0` 2026-11-02 |
| `historicalContinuityBoard.ts`                  | 0    | 1    | U     | SPE-2099 | `336fd509` 2026-10-28 |
| `hostileFacilityActuator.ts`                    | 0    | 1    | U     | SPE-1015 | `6d4e3fc3` 2026-10-19 |
| `incidentStateChangeResolution.ts`              | 0    | 1    | U     | SPE-1051 | `64ef38f9` 2026-09-28 |
| `informationIntakeCrossLinkBundle.ts`           | 0    | 1    | U     | SPE-854  | `b328e3cf` 2026-06-17 |
| `informationSourceAccessProjection.ts`          | 0    | 1    | U     | SPE-3471 | `23d88c6b` 2026-10-27 |
| `institutionalAutomationRegistry.ts`            | 0    | 1    | U     | SPE-2101 | `b8e5f239` 2026-05-17 |
| `institutionalDenialDoctrinePressure.ts`        | 0    | 1    | U     | SPE-2001 | `0bd6502b` 2026-05-16 |
| `institutionCalendar.ts`                        | 0    | 1    | U     | SPE-700  | `df2d023e` 2026-10-28 |
| `interrogationSelfIncrimination.ts`             | 0    | 1    | U     | SPE-475  | `0d64ddde` 2026-10-30 |
| `lifecycleOperatingProcedures.ts`               | 0    | 1    | U     | SPE-874  | `76b5ac07` 2026-10-28 |
| `liveRegistryAlertCenter.ts`                    | 0    | 1    | U     | SPE-1045 | `5b558959` 2026-04-29 |
| `locationScaleStack.ts`                         | 0    | 1    | U     | —        | `9634bac3` 2026-04-30 |
| `managedCultivationLifecycle.ts`                | 0    | 1    | U     | SPE-3406 | `b7fced63` 2026-10-27 |
| `materialDensity.ts`                            | 0    | 1    | U     | SPE-1074 | `79a6872e` 2026-04-29 |
| `mediaContainedEventRegistry.ts`                | 0    | 1    | U     | SPE-2120 | `00b194d8` 2026-05-31 |
| `messageToServiceAvailabilityValidation.ts`     | 0    | 2    | U     | SPE-862  | `73197ec5` 2026-11-04 |
| `multiSiteFacilityNetwork.ts`                   | 0    | 1    | U     | SPE-1020 | `3facf346` 2026-10-19 |
| `operationalStatusExpansionRegistry.ts`         | 0    | 1    | U     | SPE-2166 | `2eee7fc8` 2026-10-31 |
| `patrolDoctrine.ts`                             | 0    | 1    | U     | SPE-2271 | `c82945fc` 2026-10-28 |
| `persistentAreaShapes.ts`                       | 0    | 1    | U     | SPE-408  | `ab42048d` 2026-10-28 |
| `persistentScentTracking.ts`                    | 0    | 1    | U     | SPE-953  | `03a09304` 2026-10-30 |
| `playbookWrongDocumentFailure.ts`               | 0    | 1    | U     | SPE-75   | `e3053dec` 2026-06-17 |
| `postLossAdaptationUnlock.ts`                   | 0    | 3    | U     | SPE-1051 | `61a175d5` 2026-09-28 |
| `preActivationSafetyReadiness.ts`               | 0    | 1    | U     | SPE-876  | `ede7d66c` 2026-10-28 |
| `procedureRoomStatePreconditions.ts`            | 0    | 1    | U     | SPE-1896 | `b5c06e64` 2026-10-27 |
| `procedureToActionAdapter.ts`                   | 0    | 1    | U     | SPE-2995 | `66b3adc0` 2026-11-04 |
| `processSafetyCoverage.ts`                      | 0    | 1    | U     | SPE-870  | `1dbc2230` 2026-10-28 |
| `processSafetyInformationGate.ts`               | 0    | 1    | U     | SPE-872  | `f00cc621` 2026-10-28 |
| `proximityRiskClearance.ts`                     | 0    | 1    | U     | SPE-2079 | `34c3b345` 2026-10-22 |
| `recoveryFatigue.ts`                            | 0    | 0    | D     | —        | `3e037560` 2026-04-13 |
| `regionalCrossRegisterEventAuthority.ts`        | 0    | 1    | U     | SPE-3417 | `82dc44d2` 2026-11-04 |
| `responderDutyEvaluation.ts`                    | 0    | 1    | U     | —        | `749aec74` 2026-04-29 |
| `responseDeploymentCost.ts`                     | 0    | 1    | U     | SPE-2272 | `fcc6824d` 2026-10-30 |
| `rules/countermeasures.ts`                      | 0    | 1    | S     | —        | `50c5e01c` 2026-04-19 |
| `rules/resistances.ts`                          | 0    | 1    | S     | —        | `50c5e01c` 2026-04-19 |
| `sceneDifficultyMitigationResolver.ts`          | 0    | 1    | U     | SPE-3186 | `41873280` 2026-11-01 |
| `sceneGeometryRegistry.ts`                      | 0    | 1    | U     | SPE-2211 | `0e8e7995` 2026-10-28 |
| `sealedSiteConfiscatedEvidenceEnding.ts`        | 0    | 1    | U     | SPE-1051 | `82af4860` 2026-09-29 |
| `segmentedFeedbackWorkflow.ts`                  | 0    | 1    | U     | SPE-75   | `d2c10420` 2026-06-17 |
| `settlements/haven.ts`                          | 0    | 3    | U     | SPE-109  | `cc93631a` 2026-05-03 |
| `sim/queue.ts`                                  | 0    | 1    | U     | —        | `92d7226b` 2026-04-13 |
| `sim/rosterFatigue.ts`                          | 0    | 1    | U     | —        | `df007a68` 2026-05-29 |
| `sim/weeklyReport.ts`                           | 0    | 1    | U     | —        | `df007a68` 2026-05-29 |
| `sim/weeklyReportInvariants.ts`                 | 0    | 1    | U     | —        | `82dc44d2` 2026-11-04 |
| `siteNativeObjectRemoval.ts`                    | 0    | 1    | U     | SPE-1667 | `bef55d63` 2026-10-15 |
| `siteToFacilityConversion.ts`                   | 0    | 1    | U     | SPE-3362 | `52c33441` 2026-10-19 |
| `spe947CountermeasureLedgerLink.ts`             | 0    | 1    | U     | SPE-2605 | `b3540131` 2026-07-13 |
| `spe947PursuitVector.ts`                        | 0    | 1    | U     | SPE-2604 | `2ee33769` 2026-07-13 |
| `spe956ParticipatoryChannelIncidentPath.ts`     | 0    | 2    | U     | SPE-2639 | `2640db8c` 2026-07-20 |
| `sponsoredTrainingCompletion.ts`                | 0    | 1    | U     | SPE-3124 | `ead9e8b5` 2026-10-28 |
| `squadActionGating.ts`                          | 0    | 1    | U     | —        | `020887e0` 2026-05-02 |
| `squadRoster.ts`                                | 0    | 1    | U     | —        | `15867a41` 2026-10-28 |
| `subjectiveVsAuthoritativeTimeContradiction.ts` | 0    | 1    | U     | SPE-3180 | `e252ac29` 2026-11-01 |
| `surveyMisinformation.ts`                       | 0    | 1    | U     | SPE-313  | `81205152` 2026-10-30 |
| `surveySiteConfirmation.ts`                     | 0    | 1    | U     | SPE-311  | `9cbe83a4` 2026-10-30 |
| `tags.ts`                                       | 0    | 2    | S     | —        | `68597c5a` 2026-04-18 |
| `templates/contentTemplateValidation.ts`        | 0    | 0    | D     | SPE-48   | `68597c5a` 2026-04-18 |
| `templates/doctrinePlaybookRuntime.ts`          | 0    | 1    | U     | SPE-48   | `68597c5a` 2026-04-18 |
| `templates/hazardIncidentRuntime.ts`            | 0    | 1    | U     | SPE-48   | `f40fa0ed` 2026-04-27 |
| `templates/protocolMaterialRuntime.ts`          | 0    | 1    | U     | SPE-48   | `68597c5a` 2026-04-18 |
| `terrainSurveyClocks.ts`                        | 0    | 1    | U     | SPE-312  | `3f0689f1` 2026-10-30 |
| `triggeredAnomalyRuleRevealRegistry.ts`         | 0    | 1    | U     | SPE-2172 | `b63da2c8` 2026-10-31 |
| `unauthorizedEnhancement.ts`                    | 0    | 1    | U     | SPE-1013 | `d07d409f` 2026-10-21 |
| `uncertainWorldState.ts`                        | 0    | 1    | U     | SPE-1317 | `e0c4fca5` 2026-05-15 |
| `victimCultivation.ts`                          | 0    | 1    | U     | SPE-687  | `8828c874` 2026-04-25 |
| `vulnerability.ts`                              | 0    | 2    | U     | —        | `68597c5a` 2026-04-18 |
| `woodMaterial.ts`                               | 0    | 1    | U     | SPE-1072 | `74950fdf` 2026-05-02 |
| `zoneSpanningSiteEvent.ts`                      | 0    | 1    | U     | SPE-3001 | `22fac065` 2026-09-25 |

## Appendix B — re-running a row

Every row can be re-checked without the analysis script:

```bash
# 1. text-level references anywhere (docs, planning, registries, tests)
git grep -n '<module-basename>' -- .            # expect 0 for class D

# 2. importers, quoted so path prefixes cannot collide
git grep -n -E "from '[^']*/<module-basename>'" -- 'src/**' 'test/**' 'e2e/**' 'qa/**'

# 3. split production vs test importers
git grep -l -E "from '[^']*/<module-basename>'" -- 'src/**' | grep -v '\.test\.'

# 4. last-touched provenance
git log -1 --format='%h|%ad|%s' --date=short -- src/domain/<path>.ts
```

For the two class-D rows the expected results are zero in every command above. For the fatigue duplicates, `git grep -n 'function getRecoveryFatigue' -- src` returns exactly three definitions (`advanceWeek.ts:998`, `fatiguePipeline.ts:24`, `recoveryFatigue.ts:11`).

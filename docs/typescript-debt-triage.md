# TypeScript debt triage — Containment Protocol

Status: analysis plus the Phase 0 instrumentation in §3. No `src/`, workflow, or `tsconfig` file is changed; the executable additions are the advisory validator entry, the budget, the capture wrapper, and their tests.

Measured: 2 November 2026, revision `1108c4b969b0f118bf642c3cae32a7ab9a09b7c0`, TypeScript 6.0.3, Node 22.23.4 (the `.nvmrc`/CI version) with a Node 26.13.0 cross-check. The repository already ships a reproducible collector from SPE-3376: `scripts/report-typecheck.mjs`, `scripts/typecheck-census.mjs`, and `docs/typecheck/README.md`.

The counts below are **diagnostic occurrences**, not distinct defects. The same fingerprint (project + file + code + complete message) can occur at many lines; the collector preserves every occurrence and reports 466 location-independent fingerprints behind the 681 occurrences.

## 0. Baseline verification

| Claim under test                                                                    | Result                                                                                                                                                                                                                                                                                                                                                                                                                        | Evidence                                                                                                                                    |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx tsc -b` exits 2 with 681 errors                                                | **Confirmed.** Exit 2; 681 `error TS` lines; 178 files; 466 fingerprints; 215 repeated-fingerprint occurrences; 0 exact duplicates.                                                                                                                                                                                                                                                                                           | `npx tsc -b --pretty false`; `node scripts/report-typecheck.mjs`; `docs/typecheck/…`                                                        |
| Top codes are 2345 (175), 2322 (172), 2339 (81), 2352 (53), 18048 (45), then a tail | **Confirmed.** Those five codes account for 526 of 681 occurrences.                                                                                                                                                                                                                                                                                                                                                           | census `summary.byCode`                                                                                                                     |
| Errors concentrate in the five named files                                          | **Confirmed**, with one correction to the ranking. The top five are `src/test/events.producerValidation.test.ts` (68), `src/app/store/runTransfer.test.ts` (53), `src/app/store/runTransfer.ts` (43), `src/test/hiddenStateModality.test.ts` (40), `src/test/departmentWorkshopPersistence.test.ts` (23). `src/domain/volatileActionPhasePipeline.ts` (12) is the second-largest production file, not the fifth file overall. | per-file census                                                                                                                             |
| CI runs the SPE-3348 resolver and never runs `tsc` or a production build            | **Confirmed.** `.github/workflows/test.yml:34-44` is the only type-adjacent step and it invokes `npm run verify:requirements -- --ci --exclude=playwright-e2e`; the other three workflows (`agp-workflow.yml`, `request-coderabbit-review.yml`, `spe-3432-provider-readonly.yml`) contain no build. `package.json:8` defines `build` as `tsc -b && vite build …`, and no workflow calls it.                                   | `grep -n verify:requirements .github/workflows/*.yml`; `grep -n "run build" .github/workflows/*.yml`; `grep -n tsc .github/workflows/*.yml` |

The existing `typecheck-census-tests` validator (`scripts/validation/validators.v1.json:51-64`) tests the reporting tool, not the source tree. It cannot fail on a new type error.

## 1. Re-measured census

### Commands used

```sh
npm ci
npx -y node@22 scripts/report-typecheck.mjs --output .tmp/typecheck-census-node22
npx tsc -b --pretty false; echo "exit=$?"
grep -c 'error TS' .tmp/manual/tsc-b.txt
node --test scripts/typecheck-census.test.mjs
```

The collector runs `node_modules/typescript/bin/tsc -b --pretty false --force` twice and fails if the transcripts differ, the checkout changes mid-capture, output cannot be parsed, or file-to-project attribution is ambiguous. Both runs exited 2 with identical raw transcript hash `a53ad6572251f82df371c120e9f4ff4ec7cf782055badbeefa18a45059ea9226`; `identityDelta` is empty.

Node 22 and Node 26 captures agree exactly on occurrences (681), fingerprints (466), surfaces (218 production / 463 test), and every per-code count. The committed Windows capture in `docs/typecheck/41873280/census.json` agrees on the same totals but has a different raw hash; compare records, not bytes, across platforms.

### By error code

| Code    | Occurrences |
| ------- | ----------: |
| TS2345  |         175 |
| TS2322  |         172 |
| TS2339  |          81 |
| TS2352  |          53 |
| TS18048 |          45 |
| TS2353  |          39 |
| TS2540  |          37 |
| TS7006  |           9 |
| TS18046 |           7 |
| TS6133  |           6 |
| TS2739  |           6 |
| TS2538  |           5 |
| TS2551  |           5 |
| TS2459  |           4 |
| TS2552  |           3 |
| TS2367  |           3 |
| TS2304  |           3 |
| TS2741  |           3 |
| TS1360  |           3 |
| TS2790  |           3 |
| TS2740  |           2 |
| TS1117  |           2 |
| TS2344  |           2 |
| TS2769  |           2 |
| TS2418  |           2 |
| TS2559  |           2 |
| TS2571  |           1 |
| TS2554  |           1 |
| TS2677  |           1 |
| TS2724  |           1 |
| TS2698  |           1 |
| TS2820  |           1 |
| TS4104  |           1 |

`tsconfig.app.json` owns all 681; `tsconfig.node.json` owns none. Every diagnostic is under `src/`.

### By directory and surface

| Location        | Occurrences |   Files |
| --------------- | ----------: | ------: |
| `src/test/`     |         390 |      98 |
| `src/domain/`   |         171 |      68 |
| `src/app/`      |         107 |       6 |
| `src/features/` |          13 |       6 |
| **Total**       |     **681** | **178** |

By surface: **218 production-source**, **463 test-fixture**. The test share is not evidence that production is healthy; it means the compiler reaches test fixtures that Vite never type-checks at runtime and that test authors have absorbed domain changes by widening fixtures instead of updating them.

### Largest files

| File                                                                  | Occurrences |
| --------------------------------------------------------------------- | ----------: |
| `src/test/events.producerValidation.test.ts`                          |          68 |
| `src/app/store/runTransfer.test.ts`                                   |          53 |
| `src/app/store/runTransfer.ts`                                        |          43 |
| `src/test/hiddenStateModality.test.ts`                                |          40 |
| `src/test/departmentWorkshopPersistence.test.ts`                      |          23 |
| `src/test/containmentClassWeekClose.contract.test.ts`                 |          15 |
| `src/test/spe956ParticipatoryChannelPersistence.test.ts`              |          15 |
| `src/domain/volatileActionPhasePipeline.ts`                           |          12 |
| `src/test/departmentWorkshopLiveIntegrityQuality.integration.test.ts` |          12 |
| `src/test/facilityLayoutStagingProjection.contract.test.ts`           |          12 |
| `src/test/sim.advanceWeek.test.ts`                                    |          12 |
| `src/test/dependentPrerequisiteActivation.test.ts`                    |          11 |
| `src/domain/affiliationPersonStatusWeeklyProgression.ts`              |           8 |
| `src/domain/hiddenStateActivationAuthoring.ts`                        |           8 |
| `src/test/departmentLocalStaging.contract.test.ts`                    |           8 |

## 2. Root-cause clusters

Clusters are assigned by applying the rules in order, so every occurrence belongs to exactly one row and the column sums to 681. Rules are stated so they can be re-applied to `.tmp/typecheck-census-node22/census.json`. Nine clusters are mechanism-specific; cluster 10 is the explicitly heterogeneous remainder rather than a fabricated single cause.

| #   | Cause                                                                                                              | Occurrences | Prod / test | Representative                                                | Owner                        |
| --- | ------------------------------------------------------------------------------------------------------------------ | ----------: | ----------- | ------------------------------------------------------------- | ---------------------------- |
| 1   | Shared workshop helper erases `GameState` behind a broad index signature                                           |          61 | 0 / 61      | `src/test/helpers/withoutMappedArchiveAnalystPersonnel.ts:11` | Test helper                  |
| 2   | Generic event-factory dispatcher loses payload/type correlation                                                    |          68 | 0 / 68      | `src/test/events.producerValidation.test.ts:61`               | Test helper                  |
| 3   | Hydration normalizer builds canonical state from `Record<string, unknown>` and locally re-declared contracts       |          43 | 43 / 0      | `src/app/store/runTransfer.ts:3766`                           | Production                   |
| 4   | Hydration tests assert on stale probe shapes and pre-`templates` persisted state                                   |          53 | 0 / 53      | `src/app/store/runTransfer.test.ts:6546`                      | Test fixtures                |
| 5   | Readonly domain outputs written through mutable casts / incremental construction                                   |          38 | 34 / 4      | `src/domain/affiliationPersonStatusWeeklyProgression.ts:119`  | Production                   |
| 6   | Readonly fixture inputs passed to mutable parameters                                                               |          57 | 2 / 55      | `src/test/hiddenStateModality.test.ts:258`                    | Test fixtures + 2 signatures |
| 7   | Types narrowed to `never` (exhaustive-switch defaults and `never[]` inference)                                     |          20 | 13 / 7      | `src/domain/volatileActionPhasePipeline.ts:877`               | Production + test literals   |
| 8   | Persistence-map fixtures typed as `Record<string, unknown>` instead of the registry map types                      |          20 | 0 / 20      | `src/test/spe956ParticipatoryChannelPersistence.test.ts:132`  | Test fixtures                |
| 9   | Stale test fixture literals and assertions against evolved domain fields                                           |         136 | 0 / 136     | `src/test/sim.advanceWeek.test.ts:1585`                       | Test fixtures                |
| 10  | Residual: local duplicate contracts, undeclared state, optional persisted reads, projection omissions, unused code |         185 | 126 / 59    | `src/domain/sim/weeklyReportInvariants.ts:33`                 | Mixed                        |

| | **Total** | **681** | **218 / 463** | | |

The eight cohorts already named in `docs/typecheck/README.md` reproduce exactly in this census: 68 + 40 + 61 + 7 + 12 + 8 + 8 + 5 = **209**. Clusters 1, 2, 5, 6 and 8 extend that partition with the mechanisms that account for the next-largest blocks.

### Cluster 1 — shared test helper erases `GameState`

`src/test/helpers/withoutMappedArchiveAnalystPersonnel.ts:11` declares `T extends { agents?: Record<string, { role: string } & Record<string, unknown>>; staff?: unknown }`, mutates `state.agents` and `state.staff`, and returns `T`. Passing `createStartingState()` infers `T` from that constraint, so the result is no longer assignable to `GameState` and loses `cases`, `equipmentInstances`, `departmentLocalStaging`, and every later field. Consumers then see errors such as `Argument of type 'GameState' is not assignable…` and `Property 'cases' does not exist on type '{ agents?: …; staff?: unknown }'` at `src/test/departmentWorkshopPersistence.test.ts:554`, `facilityLayoutStagingProjection.contract.test.ts:199`, and `departmentWorkshopLiveIntegrityQuality.integration.test.ts:99`.

The helper was added for SPE-3117 roster remapping and was correct when the constraint was generic enough. The domain state grew required fields; the helper's return type did not. **Test-owned.** Fix direction: constrain to `GameState` (or a named `RosterFixtureState`) and return `GameState`, keeping the roster remap and `staff = {}` semantics. Do not widen `GameState` to an index signature to satisfy the helper.

### Cluster 2 — generic event-factory dispatcher

`src/test/events.producerValidation.test.ts:61` calls `createAssignmentTeamAssignedDraft(payload)` and returns it as `OperationEventDraft<TType>`. TypeScript does not narrow `TType` from a `switch (type)` inside a generic function, so each branch produces `TS2322` on the return and `TS2345` on the payload. There are 24 return/payload pairs plus the payload map lookups, for 68 occurrences. The `default` branch at `:168-171` is a proper `never` guard.

The production factories are correctly discriminated; this is a **test-helper** design problem. Fix direction: a mapped builder table keyed by factory type (`{ [K in FactoryType]: (p: PayloadFor<K>) => OperationEventDraft<K> }`) or one typed `it` per concrete creator. No production change and no cast should be needed.

### Cluster 3 — hydration normalizer contract drift

`src/app/store/runTransfer.ts` is the persistence trust boundary and the largest production offender (43). Representative sites:

- `:199-201` import `SquadKitAssignment`, `SquadKitTemplate`, and `SquadMetadata` from `../../domain/models`, which declares them but does not export them (`TS2459`).
- `:3766-3767` and `:3924-3925` cast `Record<string, unknown>` entries to `Agent` and `Team` after merging with fallbacks (`TS2352`); `:3943` then loses `number | undefined` into a required field.
- `:6002` and `:6068` reference `EquipmentRecoveryOutcome`, which no longer exists (only `EquipmentRecoveryOutcomeRegistry` does) (`TS2552`).
- `:4329-4332` produce `readonly … | Record<string, unknown>[]` where only the readonly canonical array is accepted.
- `:9513-9515` write `string` into closed unions such as `'escalated_pending_oversight' | 'resolved_closed'`.
- `:10534` supplies `coordinationFrictionActive` / `coordinationFrictionReason` to a fallback typed `{ active?: boolean; reason?: string }`.

The normalizer still treats persisted records as untyped bags while domain models gained required fields, closed enums, and branded registries. **Production-owned.** Fix direction: export the model types, define explicit `Persisted*` input interfaces, decode enums through the existing allowlist helpers (`CASE_KINDS`, `CASE_MODES`, …), and replace double assertions with predicates. Do not use `as unknown as`; that converts a compile error into a runtime trusting cast.

### Cluster 4 — hydration tests encode stale probe shapes

`src/app/store/runTransfer.test.ts` (53) mirrors the normalizer's old contract. `:6546` reads `.opportunities` from `hubState` inferred as `{}`; `:14091` casts a probe object to `GameState` when it lacks the now-required `templates` field; `:14309` writes `status: 'active'`, which is not a `CaseStatus`; `:7085` and four more read `runtimeState.ui.debug.eventLog` without narrowing the optional.

These are **test-owned** fixtures, but the cast at `:14091` is a real question: the test deliberately models a pre-`templates` persisted save. Confirm with the hydration owner whether that legacy shape must remain accepted. If it must, the production entry type should express it; if not, the fixture should be migrated, not silenced.

### Cluster 5 — readonly domain outputs written through mutable construction

`src/domain/affiliationPersonStatusWeeklyProgression.ts:119` assigns seven readonly list fields through `candidate as AffiliationPersonStatusRecord & Partial<Record<…, readonly string[]>>` (`TS2540` ×8). `src/domain/hiddenStateActivationAuthoring.ts:94-150` incrementally writes `anyTag`, `allTags`, `globalFlag`, `minHiddenModifierCount`, `minInvestigationWeight`, `when`, `detectionConfidence`, and `displacementTarget` into readonly trigger shapes (×8). `src/domain/postIncidentReviewRegistry.ts:639` writes five readonly week fields (×5). `spe947EvaluatorPersistence.ts` (4), `infiltrationCoverAuthoring.ts` (3), `infiltrationProbeAuthoring.ts` (3), and `surveillanceCapacityInterventionTuningRegistry.ts` (3) complete the 34 production occurrences; four more are in tests.

Canonical records were made readonly/frozen; the incremental writers predate that guarantee. **Production-owned.** Fix direction: build a mutable draft (`{ -readonly [K in keyof T]: T[K] }`) or a local builder, then freeze once at the boundary. Removing `readonly` from canonical evidence records is not an acceptable fix: it deletes the only compiler guarantee that a weekly pipeline cannot mutate another record's evidence.

### Cluster 6 — readonly fixtures at mutable call boundaries

`src/test/hiddenStateModality.test.ts:49-58` declares `SCOUTING_INPUT` and `SCOUTING_LOW_CONCEALMENT` with `as const`, producing `readonly ['recon-specialist']` and `readonly ['thermal-vision']`; `:258`, `:267`, `:344`, and `:884` pass those tuples into `ScoutingInput.teamTags: string[]`. `src/test/containmentClassWeekClose.contract.test.ts:128` passes `AnyOperationEventDraft[]` to a parameter typed `readonly { payload?: { instanceId?: string } }[]`. Two production signatures also reject readonly input: `src/domain/hiddenStateModality.ts:421` and `src/domain/townContractGeneration.ts:179`.

**Mixed ownership.** Where the callee only reads, widen the parameter to `readonly string[]` (production fix); where the fixture can simply be a mutable array, stop using `as const` and use `satisfies ScoutingInput`. The event-array case should accept `readonly` at the consumer. This is 55 test occurrences plus 2 production signatures.

### Cluster 7 — `never` narrowing

`src/domain/volatileActionPhasePipeline.ts:877` (and `:897`, `:943`, `:971`, `:1028`, `:1045`) reads `interrupt.kind` after an exhaustive switch has already narrowed `interrupt` to `never`, producing paired `TS2339` (`kind` on `never`) and `TS2322` (`any` not assignable to `never`). `src/domain/market.ts:790` writes `'order' | 'fulfill'` into a `never` accumulator. Seven test occurrences come from `never[]` inferred on empty arrays (for example `src/test/executionInstability.test.ts:131`, `:155`, `:175`).

**Production for the pipeline and market accumulator; test for empty-array annotations.** The runtime guards still throw correctly, but TypeScript 6 now rejects property access on the narrowed value. Fix: assign the narrowed object itself (`const exhaustive: never = interrupt`) rather than a property of it, and annotate empty arrays (`const covered: string[] = []`).

### Cluster 8 — persistence-map fixtures

Five SPE-956 suites build registry fixtures as `Record<string, unknown>` and assign them to `Spe956…RecordsMap` (`src/test/spe956ParticipatoryChannelPersistence.test.ts:132`, `:144`, `:154`, `:323`, `:541`, `:777`, `:1065`; plus `spe956PropagationGraphPersistence.test.ts:100`, `:111`, `:125`, and one orchestration suite). The production registries now expose concrete map aliases; the fixtures bypass them to avoid importing ten types.

**Test-owned.** Fix by importing the map aliases (or building through the production registry factory). This is mechanical and does not require touching persistence logic.

### Cluster 9 — stale fixture literals

The largest single mechanism: 136 test occurrences where a literal describes a domain shape that has since changed. Representative:

- `src/test/sim.advanceWeek.test.ts:1585` adds `assignedCaseId` to a `Team`; the field moved into team status. `:1329` uses confidence `'tentative'`, which is not in `'low' | 'medium' | 'high' | 'confirmed'`.
- `src/app/services/divisionMetrics.test.ts:31` adds `caseId` to a recovery entry; `:37` uses `availabilityState` on `AgentReadinessProfile`.
- `src/app/store/gameStore.test.ts:101` builds a `Candidate` without `evaluation` or `agentData`; `:4252` omits `expiryWeek`.
- `src/test/dependentPrerequisiteActivation.test.ts:67` uses a computed property whose value does not match the registry entry type (`TS2418`).

**Test-owned**, with one caveat: `divisionMetrics.test.ts:37` asserts a field the production code also reads (cluster 10); fixing the fixture without fixing `divisionMetrics.ts` would delete the only remaining signal that the read is dead.

### Cluster 10 — residual local contracts and one-off drift

185 occurrences (126 production, 59 test) across 90 files. It is a remainder, not one defect. The named sub-mechanisms:

- **Local duplicate contracts.** `src/domain/sim/advanceWeek.ts:1847` declares its own `WeeklyCaseResolutionStrategy`; the canonical one at `src/domain/caseResolutionOrchestration.ts:48` includes `terminalDisposition`, so `advanceWeek.ts:2025` and `:2717` fail. `src/domain/sim/weeklyReportInvariants.ts:33` reads and writes `weeklyReportIntegrityIssues`, which is absent from `GameState`. `src/domain/reportNotes.ts:462-466` reads `probeAction`, `probeActionSource`, `coverRole`, `leaveBehindId`, and `leaveBehindLabel` from a payload union that does not expose them.
- **Duplicate object keys with different shapes.** `src/domain/missionIntakeRouting.ts:1331-1332` assigns `lastCandidateTeamIds` and `lastRejectedTeamIds` twice; the later assignment stores rejected-team records where the type expects `string[]` (`TS1117` plus `TS2322` at `:1688`).
- **`Pick` over an optional union.** `src/domain/protocols.ts:213` and `:234` select keys from `GameState['agency']`, which includes `undefined`; the keys collapse to `never`, producing `TS2344`, then `{}` at `:250` and the assignment failure at `:259`.
- **Projection omission.** `src/features/market/marketView.ts:47-64` declares `MarketListingView` without `orderBlockedReason`, although the builder spreads it at `:367` and `src/features/market/MarketPage.tsx:526` reads it. The runtime object has the field; the contract does not.
- **Optional persisted reads and noise.** 45 `TS18048` and 7 `TS18046` occurrences, mostly `possibly undefined` on optional state and `unknown` from `Object.values`/map iteration (for example `src/domain/closedFacilityPermeability.ts`), plus 6 unused declarations (`TS6133`) and 9 implicit `any` parameters (`TS7006`).

**Mixed ownership.** Each file needs a disposition; there is no safe bulk edit. The semantic questions in `docs/typecheck/README.md` (`missionIntakeRouting`, `divisionMetrics`, `weeklyReportInvariants`, `advanceWeek`) are part of this cluster and require the owning subsystem to decide intended behavior before code changes.

## 3. Phased remediation

Principles:

1. Every phase is a standalone PR that only removes its cohort's diagnostics and changes no behavior.
2. A phase is done when (a) the cohort has zero diagnostics, (b) the global count is at or below the target, and (c) the cohort's existing Vitest files pass. A phase that exposes a new diagnostic outside its cohort fails review.
3. Production fixes never remove `readonly`, never add optional fields to domain types to satisfy fixtures, and never use `as unknown as`.
4. Test-fixture phases must not change test names, expected values, or assertion counts. If a fixture change alters a test's meaning, it is split into its own reviewed commit with the owner's sign-off.

The expected curve is an occurrence budget. A fix can expose a second error in the same file; that stays in the phase. Only a cohort reaching zero and the global count meeting target counts as done.

| Phase | Scope                                                   | Occurrences removed | Expected total | Global target after phase |
| ----- | ------------------------------------------------------- | ------------------: | -------------: | ------------------------: |
| 0     | Instrumentation and budget (no source change)           |                   0 |            681 |                       681 |
| 1     | Domain mechanical: readonly writes + `never` exhaustion |                  46 |            635 |                       635 |
| 2     | `runTransfer.ts` hydration normalizer                   |                  43 |            592 |                       592 |
| 3     | `runTransfer.test.ts` hydration fixtures                |                  53 |            539 |                       539 |
| 4     | Shared workshop helper + five consumers                 |                  61 |            478 |                       478 |
| 5     | Event factory + containment-class contract fixtures     |                  83 |            395 |                       395 |
| 6     | Readonly fixture inputs + two readonly signatures       |                  47 |            348 |                       348 |
| 7     | SPE-956 persistence-map fixtures                        |                  20 |            328 |                       328 |
| 8     | Remaining test surface, batched                         |                 201 |            127 |                       127 |
| 9     | Remaining production surface, batched                   |                 127 |              0 |                         0 |
| 10    | Flip the gate from budget to required                   |                   0 |              0 |                         0 |

### Phase 0 — instrumentation (681 → 681)

Files:

- `scripts/validation/validators.v1.json`: add a `typecheck` validator in **advisory** mode (`whenUnavailable: report-unavailable`), owner SPE-3375/SPE-3376.
- `docs/typecheck/budget.json` (new): the committed baseline `{ "occurrences": 681, "fingerprints": 466, "revision": "1108c4b…" }`.
- `scripts/typecheck-advisory.mjs` (new): captures the census through `scripts/report-typecheck.mjs`, reports against the budget, and exits nonzero only when capture fails.
- `docs/typecheck/README.md`: link this triage and state that the gate is advisory until phase 10.

This change implements the advisory validator entry and the budget file. CI picks them up on the next resolver run.

Proof of done: `npm run verify:requirements -- --resolve-only --json` lists `typecheck`; `node scripts/typecheck-advisory.mjs` exits 0 and reports 681/466 against the budget; `node scripts/report-typecheck.mjs` still reports 681/exit 2; `node --test scripts/typecheck-census.test.mjs` passes (9 tests). Rollback: revert the validator block, the wrapper, and the budget file; no source is touched.

### Phase 1 — domain mechanical (681 → 635)

Files and occurrences: `affiliationPersonStatusWeeklyProgression.ts` 8, `hiddenStateActivationAuthoring.ts` 8, `postIncidentReviewRegistry.ts` 5, `spe947EvaluatorPersistence.ts` 4, `infiltrationCoverAuthoring.ts` 3, `infiltrationProbeAuthoring.ts` 3, `surveillanceCapacityInterventionTuningRegistry.ts` 3, `volatileActionPhasePipeline.ts` 12.

Proof of done: census reports 635 or fewer; zero diagnostics in those eight paths; `npm run test:run -- src/test/affiliationPersonStatusWeeklyProgression.test.ts src/test/hiddenStateActivationAuthoring.test.ts src/test/postIncidentReviewRegistry.test.ts src/test/spe947EvaluatorPersistence.test.ts src/test/infiltrationCoverAuthoring.test.ts src/test/infiltrationProbeAuthoring.test.ts src/test/surveillanceCapacityInterventionTuningRegistry.test.ts src/test/volatileActionPhasePipeline.test.ts` passes. Rollback: revert the eight files; changes are construction-only and produce the same frozen values.

### Phase 2 — hydration normalizer (635 → 592)

File: `src/app/store/runTransfer.ts` (43). Split into three commits if review prefers: (a) export/import the missing model types at `:199-201` and replace `EquipmentRecoveryOutcome` at `:6002`/`:6068`; (b) typed persisted-input interfaces for agents, teams, factions, funding and cases replacing casts at `:3766`, `:3924`, `:6860`, `:9389`; (c) closed-union decoding at `:473`, `:2684`, `:5640`, `:8933`, `:9513-9515` and the fallback shape at `:2275`/`:10534`.

Proof of done: census 592 or fewer; zero diagnostics in `runTransfer.ts`; `npm run test:run -- src/app/store/runTransfer.test.ts` passes (Vitest transpiles, so this checks behavior independently of the remaining type errors in the test). Rollback: revert the file or the individual commit. No persisted shape changes are allowed in this phase; a behavior change requires its own slice.

### Phase 3 — hydration fixtures (592 → 539)

File: `src/app/store/runTransfer.test.ts` (53). Unchecked reads such as `:6546` and `:7085` get explicit narrowing; the `GameState` casts at `:14091`–`:15530` must either include `templates` through the production helper or be replaced by a documented legacy-save type; `status: 'active'` at `:14309` becomes a valid `CaseStatus`.

Proof of done: census 539 or fewer; file has zero diagnostics; the suite still passes with the same number of tests and no skipped assertions. Rollback: revert the file; no production dependency.

### Phase 4 — shared workshop helper (539 → 478)

Files: `src/test/helpers/withoutMappedArchiveAnalystPersonnel.ts` (type-level only) and its five consumers: `departmentWorkshopPersistence.test.ts` 23, `facilityLayoutStagingProjection.contract.test.ts` 12, `departmentWorkshopLiveIntegrityQuality.integration.test.ts` 12, `departmentLocalStaging.contract.test.ts` 8, `facilitySectionStagingProjection.contract.test.ts` 6.

Proof of done: census 478 or fewer; the five consumers have zero diagnostics; all five suites pass; the SPE-3117 roster-remap assertion (investigator → hunter, `staff = {}`) is unchanged. Rollback: revert the helper type and the five imports; no runtime behavior is affected.

### Phase 5 — event factory and contract fixtures (478 → 395)

Files: `src/test/events.producerValidation.test.ts` 68, `src/test/containmentClassWeekClose.contract.test.ts` 15. Replace the generic switch with a mapped creator table or per-type tests; accept `readonly` draft arrays in `draftsForInstance`.

Proof of done: census 395 or fewer; both files zero; `npm run test:run -- src/test/events.producerValidation.test.ts src/test/containmentClassWeekClose.contract.test.ts` passes with the same test count. Rollback: revert both test files.

### Phase 6 — readonly call boundaries (395 → 348)

Files: `src/test/hiddenStateModality.test.ts` 40, `src/test/hiddenStateIllusionLifecycle.test.ts` 2, `src/test/advanceWeek.postIncidentReview.integration.test.ts` 2, `src/test/patternSourceSeriesWeeklyIntake.test.ts` 1, plus production signatures `src/domain/hiddenStateModality.ts` 1 and `src/domain/townContractGeneration.ts` 1. Widen read-only parameters to `readonly string[]`; for fixtures prefer `satisfies` over `as const` where mutation is needed.

Proof of done: census 348 or fewer; all six files zero; the four suites pass. Rollback: revert fixture edits first; the two signature widenings are independent and behavior-neutral.

### Phase 7 — SPE-956 persistence fixtures (348 → 328)

Files: `src/test/spe956ParticipatoryChannelPersistence.test.ts` 15, `src/test/spe956PropagationGraphPersistence.test.ts` 3, `src/test/spe956ParticipatoryChannelWeeklyOrchestration.test.ts` 1, `src/test/spe956PropagationGraphWeeklyOrchestration.test.ts` 1. Import the registry map aliases and type the fixtures explicitly.

Proof of done: census 328 or fewer; the four files zero; their suites pass. Rollback: revert the four fixtures.

### Phase 8 — remaining test surface (328 → 127)

201 occurrences across roughly 90 test files. Start with the largest cohorts: `sim.advanceWeek.test.ts` 12, `dependentPrerequisiteActivation.test.ts` 11, `executionInstability.test.ts` 7, `combatStim.contract.test.ts` 6, `downtimeCarryIn.test.ts` 6, `gameStateManager.test.ts` 6, `spe947EvaluatorPersistence.test.ts` 6, then the 5s and long tail. Batch by directory or feature, at most 20 files and 40 diagnostics per PR.

Proof of done per batch: census decreases by the batch count; batch files zero; their suites pass. Phase done at 127, when every remaining `test-fixture` diagnostic is gone. The exact cohort is every census row on the `test-fixture` surface that is not in the P1–P7 file lists; the Appendix query prints that file list, so no file can silently drop out of scope. Rollback: each batch is its own revert. `dependentPrerequisiteActivation.test.ts` also contains an `unknown`/implicit-`any` pair (`:97`) that may reveal a production return type; if so, split it out rather than casting in the test.

### Phase 9 — remaining production surface (127 → 0)

127 occurrences across 62 production files. Sequence by semantic clarity, not by count:

1. `protocols.ts` 7 and the `Pick`-over-optional-union pattern.
2. `marketView.ts` 2 / `MarketPage.tsx` 4: add `orderBlockedReason` to `MarketListingView`, then let the compiler re-check consumers.
3. `divisionMetrics.ts` 2: decide whether `availabilityState`/`deployable` are legacy aliases or dead reads before touching code.
4. `reportNotes.ts` 5: widen the payload contract or stop emitting the metadata.
5. `weeklyReportInvariants.ts` 4 and `advanceWeek.ts` 5: reconcile `weeklyReportIntegrityIssues` ownership and the duplicate `WeeklyCaseResolutionStrategy` with their canonical owners.
6. `missionIntakeRouting.ts` 5: resolve the duplicate-key shape question first; this is a behavior decision, not a typing cleanup.
7. Channel registries (`asyncDiscussionSurface`, `collectiveMemoryStabilization`, `communityAdvisoryDecisionInfluence`, `hotlineChannel`, `survivorInformalRegistry`: 4 each) and the 3s/long tail.

Proof of done: census 0, `npx tsc -b` exit 0, full `npm run test:run` green, and `npm run build` green. The exact cohort is every census row on the `production-source` surface not in the P1–P7 file lists; the Appendix query prints it. Rollback: per-file or per-cluster PRs; the semantic items (3–6) must be separately revertible from mechanical typing.

### Phase 10 — gate flip (0 → 0)

Files: `scripts/validation/validators.v1.json` (enforcement `required`), `.github/workflows/test.yml` (add the typecheck step), `docs/typecheck/budget.json` (retire or set to zero), `package.json` (no change needed if `build` is the gate).

Proof of done: a red type error fails CI; a clean tree runs `npm run build` in CI; the advisory budget path is deleted. Rollback: restore the advisory entry and workflow step; source is unchanged.

## 4. Gate proposal

### What the `typecheck` validator should cover

- Both referenced projects: `tsconfig.app.json` (all of `src`) and `tsconfig.node.json` (`app.vite.config.ts`). This is exactly what `tsc -b` covers and what the collector attributes.
- Full diagnostic identity, not a count: `project + file + code + message`, with line/column excluded from identity so unrelated edits do not create false regressions. `scripts/typecheck-census.mjs` already implements this.
- Changed-file attribution: every diagnostic whose `file` is in the PR diff is a failure, even if the global count falls.
- Budget comparison by fingerprint multiplicity, not set membership, so one fix cannot hide one regression.
- Fail-closed behavior: unparsed compiler output, unavailable `tsc`, ambiguous project ownership, or a checkout change during capture must fail, not report green. The collector already does this.
- A documented gap: `e2e/**` is in no tsconfig (`tsconfig.node.json` includes only `app.vite.config.ts`), so Playwright specs are currently unchecked. Add a third project or extend `tsconfig.node.json` before claiming the validator covers the repository.

Suggest registering it with a script such as `node scripts/report-typecheck.mjs --check-budget docs/typecheck/budget.json --base "$VALIDATION_BASE"`; the collector's current interface is capture-only, so this is a small tooling slice, not a change to validator semantics.

### Which change classes must activate it

| Change class                                     | Activation                           | Why                                                                                                 |
| ------------------------------------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `application`                                    | Required from stage R2 onward        | Every `src/**` edit can add diagnostics or change the meaning of existing ones.                     |
| `shared-config`                                  | Required from stage R1               | `tsconfig*.json`, `package.json`, and the lockfile can change compiler behavior for the whole tree. |
| `academy`                                        | Required                             | It is a path subset of `application`, but its authored-content validator is separate; keep both.    |
| `tooling`                                        | Required only for the census scripts | Changes to `scripts/report-typecheck.mjs`, `typecheck-census*.mjs`, or `docs/typecheck/**`.         |
| `e2e`                                            | Advisory until an e2e project exists | Current Playwright specs are outside both tsconfig projects.                                        |
| `docs`, `planning`, `governance`, `architecture` | Not activated                        | They cannot change compiler output.                                                                 |

### Ratchet path (no 681-error big bang)

- **R0 — report only.** Add the validator as `advisory` with `whenUnavailable: report-unavailable`. It publishes occurrences, fingerprints, and the top files on every PR. Merge immediately; it can never block.
- **R1 — budget and no-new-identity.** Commit `docs/typecheck/budget.json` at 681/466. Fail when occurrences exceed the budget **or** any fingerprint is absent from the committed baseline. This catches a regression even if another fix offsets the count. Activate for `shared-config` here.
- **R2 — touched-file zero.** Fail if any diagnostic's file is in the PR's changed-file set. This is the high-value ratchet: it does not require the whole tree to be green, but no PR may add debt to a file it touches.
- **R3 — phase step-down.** Each phase PR lowers the budget in the same commit (681 → 635 → 592 → … → 0). CI fails if the count exceeds the new budget. The published curve in §3 is the review contract.
- **R4 — required.** At 0, switch enforcement to `required`, run `tsc -b` directly, then add `npm run build` to CI so Vite's production bundling is exercised. Keep the census as a nightly drift report rather than a second blocking run.

Rationale for the order: R2 is what stops the bleeding while the tree is still red; R1 alone permits fixes and regressions to cancel out; R3 makes progress reviewable; R4 is mechanical once the count is zero. Do not turn on `required` at 681: it would either be bypassed or freeze all merges, and both outcomes teach contributors to ignore the gate.

## 5. Risk: what a permanently red build hides

1. **Dead logic that still compiles elsewhere.** `src/app/services/divisionMetrics.ts:41-46` reads `readiness?.availabilityState` and `readiness?.deployable`; neither exists on `AgentReadinessProfile`. Those guards are always false, so training/recovery exclusion can silently stop applying. A green typecheck would have forced a decision the day the profile changed.
2. **Persistence shape corruption.** `src/domain/missionIntakeRouting.ts:1331-1332` assigns `lastCandidateTeamIds` and `lastRejectedTeamIds` twice with different value shapes. The second write wins, storing rejected-team records where downstream code expects `string[]` (`:1688`). Tests can pass because they exercise the first shape indirectly; the type error is the only artifact naming the contradiction.
3. **State that never persists.** `src/domain/sim/weeklyReportInvariants.ts:33-46` adds `weeklyReportIntegrityIssues` to `GameState`, which does not declare it. The spread keeps it in memory, but the save/normalization contract has no field to serialize or migrate. Integrity issues can vanish across save/load while every test stays green.
4. **Silent metadata loss.** `src/domain/reportNotes.ts:462-466` reads `probeAction`, `coverRole`, `leaveBehindId`, and two more from a payload union that does not expose them. The code writes `null` for every event where the narrowed member wins, so infiltration report details disappear without an exception.
5. **Contract omission in the UI.** `src/features/market/marketView.ts:47-64` declares `MarketListingView` without `orderBlockedReason`, while `:367` spreads it and `MarketPage.tsx:526` reads it. Runtime works today by accident of spreading; the next refactor of the builder can delete the field with no compiler complaint, and the player loses the blocked-order explanation.
6. **The production bundle is never built.** No workflow runs `vite build`. Vite 8 strips type-only exports at the ESM boundary, and `AGENTS.md` documents the resulting `SyntaxError: does not provide an export named '…'` when a type is imported as a value. A route-level bundling or lazy-load failure can merge green because tests run through Vitest, not the production bundle.
7. **Baseline red masks new red.** There is no delta gate. Slice documents in `planning/` record manual comparisons (“typecheck matches clean main after line-offset normalization”), which is a process control, not enforcement. A PR can add a diagnostic in a file nobody diffs and still claim no regression.
8. **Readonly erosion.** The cheapest way to clear 38 `TS2540` occurrences is deleting `readonly`. In a weekly evidence pipeline that is exactly backwards: it would allow one record's evidence arrays to be mutated in place, which is the class of determinism bug the frozen-record design exists to prevent. Phase 1 must build mutable drafts and freeze at the boundary.

## 6. Verification and limitations

- This document is not named `*audit*`, so `docs/design-audits-index.md` is deliberately unchanged. `scripts/verify-design-audits-index.mjs` filters `f.toLowerCase().includes('audit')`; adding this file to the index would make the index list a non-audit file and fail. `npm run verify:audits-index` passes with 41 audit files.
- The new file passes `npx prettier --check docs/typescript-debt-triage.md`. Repository-wide `npm run format:check` still fails on **1680 pre-existing files** (as it did before this change); reformatting them would touch `src/`, tests, and workflows, which this task forbids.
- `node --test scripts/typecheck-census.test.mjs` passes (7 tests). The full Vitest suite was **not** run for this analysis; no claim is made about its current pass count.
- Local execution used Node 26.13.0 for the first capture and Node 22.23.4 for the parity capture. CI uses Node 22 (`.github/workflows/test.yml:23-27`, `.nvmrc`). Counts agree across both.
- Corpus scope: only `src/` is in `tsconfig.app.json`. Files outside it (`e2e/**`, `scripts/**`, config files other than `app.vite.config.ts`) are not in this census; that is a coverage gap for any future “typecheck” claim, not evidence that they are clean.

## Appendix — reproducing each table

Run `npx -y node@22 scripts/report-typecheck.mjs --output .tmp/typecheck-census-node22`, then query `.tmp/typecheck-census-node22/census.json` with Node:

```sh
node -e "const c=require('./.tmp/typecheck-census-node22/census.json'); console.log(c.summary)"
node -e "const c=require('./.tmp/typecheck-census-node22/census.json'); const m=new Map(); for (const d of c.diagnostics) m.set(d.file,(m.get(d.file)??0)+1); console.log([...m].sort((a,b)=>b[1]-a[1]).slice(0,25))"
```

Per-code and per-surface tables are `summary.byCode` and `summary.bySurface`. Directory and cluster tables are sums over `diagnostics[].file` using the rules stated in §2. The raw compiler transcript is `.tmp/typecheck-census-node22/run-1.txt`; the second run is `run-2.txt`, and both hashes are in `census.json`.

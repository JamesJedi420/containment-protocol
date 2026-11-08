# SPE-44 — Weekly Agent Fatigue Consolidation

| Field                | Value                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**           | Draft — implementation handoff. No code, test or schema change was made by this document.                                                   |
| **Linear**           | [SPE-44](https://linear.app/spectranoir/issue/SPE-44/advance-week-orchestration-isolation-pass) (Backlog)                                   |
| **Related owners**   | SPE-99 (deployed-recovery scaling), SPE-1107 (responder energy budget), SPE-130 (fatigue channels)                                          |
| **Suggested branch** | `spe-44-fatigue-consolidation`                                                                                                              |
| **Base**             | `main` @ `64e37510` (2026-11-04)                                                                                                            |
| **Evidence basis**   | Static inspection at the base commit (grep + line reads). No build, test run, typecheck or gameplay execution was performed while drafting. |

This slice closes the fatigue half of SPE-44's acceptance criterion — _"Advance Week no longer contains targeted embedded business rules that belong to feature/domain systems"_ — which SPE-44's 2026-10-27 reconciliation comment records as still open. It is deliberately an arithmetic-consolidation slice: one implementation of weekly agent fatigue, one of the roster average, **no change to shipped numbers**.

## Why this is its own slice

The April review of PR #44 (`devin` and the second reviewer, both 2026-04-20) closed the extraction as unsupported and left three asks that are all fatigue-local:

1. re-apply the extraction that was lost in merge `b9f70cc`;
2. delete the duplicate local helpers instead of letting the extracted ones coexist with them;
3. add a guardrail that fails if `advanceWeek.ts` ever re-declares the extracted helpers.

The 2026-10-27 reconciliation comment adds a fourth: the exported `recoveryFatigue.ts` copy and the `fatiguePipeline.ts` copy are still divergent thirds of the same rule. A slice that touches case resolution, team bonuses and fatigue together is what failed review the first time. This one touches fatigue only.

## Current state at `64e37510`

| Implementation                              | Location                                                                                                                                                                                            | Production consumer                                                                                                                             | Arithmetic                                                                                                                                                         |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Private helpers (canonical by reachability) | `src/domain/sim/advanceWeek.ts:992-1075` — `getMissionFatigue` L992, `getRecoveryFatigue` L998, `applyAgentFatigue` L1002, `getAverageRosterFatigue` L1068; invoked from `settleWeekState` at L3742 | live weekly tick (reachable from `src/main.tsx`)                                                                                                | active: stress-scaled mission delta **then** SPE-99 deployed-recovery scaling; training: `-(recoveryRateBonus)`; resting: `-(recoveryFatigue + recoveryRateBonus)` |
| Exported dead copy                          | `src/domain/recoveryFatigue.ts:5-58`                                                                                                                                                                | none (0 importers anywhere)                                                                                                                     | same resting/training arithmetic, **no** SPE-99 scaling, **no** channels/overdrive/energy                                                                          |
| Weekly batch (test-only)                    | `src/domain/sim/fatiguePipeline.ts:18-30` constants, `applyWeeklyAgentFatigue` L48-125                                                                                                              | only `getAverageTeamFatigue` is imported in production, by `missionFinalizationPipeline.ts:3`; the weekly batch is imported by three test files | training: `0`; resting: `-recoveryFatigue` (bonus dropped); adds channels, overdrive debt, energy exertion                                                         |
| Filtered average                            | `src/domain/sim/rosterFatigue.ts:25-33`                                                                                                                                                             | none (imported only by `src/test/weeklyReport.test.ts`)                                                                                         | excludes dead, resigned, training and attrition-unavailable agents                                                                                                 |

`applyRecoveryRotationToAgents` (`src/domain/directives.ts:102`) runs immediately after the fatigue step when the `recovery-rotation` directive is selected. It is not a fifth implementation; the slice must just keep it downstream of the canonical step.

## Decision 1 — canonical implementation

**Ship `src/domain/sim/advanceWeek.ts`'s private block as the canonical arithmetic, relocated verbatim into `src/domain/recoveryFatigue.ts`.**

`recoveryFatigue.ts` is the file SPE-44's own history names, it already exists with the right exports, and it has no importers, so replacing its body cannot break a consumer. The alternative — declaring a new `weeklyFatigue.ts` — would add a fourth name to the same problem.

Rationale, in order of weight:

- It is the only copy that shapes a real campaign, so it is the only one whose numbers are baked into existing saves and existing golden fixtures.
- It contains the SPE-99 `scaleDeployedMissionFatigueDelta` / `buildDeployedRecoveryModeByAgentId` integration that neither shadow copy has. Losing it would silently delete deployed-recovery behaviour.
- Verbatim relocation makes the slice reviewable as a move, not a rewrite: every changed line is either a signature, an import, or a deleted duplicate.

Rejected alternatives:

| Alternative                                         | Why rejected                                                                                                                                                                                  |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Make `recoveryFatigue.ts`'s existing body canonical | Omits SPE-99 scaling and the `recoveryRateBonus` resting branch; adopting it changes live numbers for every resting agent and every field-base deployment.                                    |
| Make `fatiguePipeline.ts` canonical                 | No production consumer for the weekly batch; adopting it turns training recovery from `-bonus` to `0` and adds channel/energy writes to the live tick — a gameplay change, not an extraction. |
| New `src/domain/weeklyFatigue.ts`                   | Fourth name for the same rule; contradicts the "consolidate, not duplicate" review ask.                                                                                                       |

### Required signatures

`src/domain/recoveryFatigue.ts` should export exactly:

- `getMissionFatigue(config: GameState['config']): number`
- `getRecoveryFatigue(config: GameState['config']): number`
- `applyAgentFatigue(agents, teams, config, activeTeamIds, cases, activeTeamStressModifiers = {}, deployedRecoveryLookup?)` — the six-parameter shape plus optional lookup that `advanceWeek.ts` already calls with; the existing two-call-site-free exported signature has no consumers and can change.
- `getAverageRosterFatigue(agents: GameState['agents']): number` — unfiltered, as shipped today (see Decision 3).

New imports in that module: `clamp` from `./math`, `getTeamMemberIds` from `./teamSimulation`, `buildDeployedRecoveryModeByAgentId` and `scaleDeployedMissionFatigueDelta` from `./sim/expeditionRecoveryNode`, and `GameState` from `./models`. Confirm `expeditionRecoveryNode.ts` does not import `recoveryFatigue.ts` before wiring (no cycle was observed in static inspection, but the implementer should re-check after the edit).

## Decision 2 — training and resting branches

One arithmetic, two consumers. Export the per-agent classification alongside the deltas so the channel layer cannot re-derive it:

```ts
type WeeklyFatigueContext = 'deployed' | 'training' | 'resting'
```

`applyAgentFatigue` applies the delta to `fatigue` only. `fatiguePipeline.applyWeeklyAgentFatigue` calls the same delta computation, keeps its channel/overdrive/energy layer, and loses its private constants. `getMissionFatigue` / `getRecoveryFatigue` are then declared once, in `recoveryFatigue.ts`.

Reconciled branch semantics (these are the values that must exist after the slice):

| Branch                                             | Delta                                                                                  | Notes                                                                                                                                                                 |
| -------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deployed / active team member                      | `scaleDeployedMissionFatigueDelta(max(1, round(missionFatigue * (1 + stress))), mode)` | `mode` from the **pre-resolution** snapshot when `deployedRecoveryLookup` is supplied; `ordinary_rest` when the case is not `in_progress` or has no field-base packet |
| Training assignment                                | `-(recoveryRateBonus ?? 0)`                                                            | Replaces `fatiguePipeline`'s `0`; `recoveryRateBonus` is clamped `>= 0` at normalization, so this is a recovery credit                                                |
| Everything else (resting, idle, recovery, injured) | `-(recoveryFatigue + (recoveryRateBonus ?? 0))`                                        | Replaces `fatiguePipeline`'s `-recoveryFatigue`; the bonus is the only intended asymmetry                                                                             |
| Clamp                                              | `clamp(fatigue + delta, 0, 100)`                                                       | Unchanged in both paths                                                                                                                                               |

This changes numbers **only** inside `applyWeeklyAgentFatigue`, which has no production consumer. It changes no live campaign. The three imported test files encode the old divergence, so the slice edits exactly this:

- `src/test/sim.fatiguePipeline.test.ts` — "keeps training agents fatigue unchanged" becomes "training applies the recovery-rate bonus"; the idle assertion gains the same bonus. Add an explicit zero-bonus case so the old expectation is still covered.
- `src/test/agentFatigueChannels.test.ts`, `src/test/responderEnergyBudget.test.ts` — expected to be unaffected (they exercise channel/energy units, not the weekly delta); verify rather than assume.

Worked drift, so the reconciliation is not abstract. With `attritionPerWeek: 6` (`missionFatigue = 6`, `recoveryFatigue = 3`) and `recoveryRateBonus = 2`:

| Branch                                  | Live (`advanceWeek`) | `fatiguePipeline`  | Divergence per week                  |
| --------------------------------------- | -------------------- | ------------------ | ------------------------------------ |
| Resting agent                           | `-5`                 | `-3`               | 2 points, 24 over a 12-week campaign |
| Training agent                          | `-2`                 | `0`                | 2 points                             |
| Deployed on a `sanctuary_recovery` base | `round(raw * scale)` | `raw` (no scaling) | the whole SPE-99 multiplier          |

None of these are cosmetic in a seeded weekly sim: fatigue gates mission resolution, recovery routing and the `fatigue-over-threshold` intake blocker, and it is persisted into the save.

## Decision 3 — roster fatigue average (moved, not changed)

Ship `getAverageRosterFatigue` from `advanceWeek.ts:1068` verbatim (unfiltered) into `recoveryFatigue.ts`; have `advanceWeek.ts` and `src/domain/sim/weeklyReport.ts:136` import it. That collapses three copies to one **without changing a single value**.

`src/domain/sim/rosterFatigue.ts` is **not** adopted in this slice. Its filtered definition is arguably the more correct one, but switching would change `WeeklyReport.avgFatigue` for every campaign, which feeds the weekly score, the report card the player reads, and hydrated historical reports. That is a balance/product decision with no owner today, and bundling it into an extraction is how the April review's "not behaviour-preserving" blocker repeats. Leave `rosterFatigue.ts` in place and record the open decision on SPE-44 (see Deferred).

## Behaviour-preservation contract

The implementer must preserve all of the following, because each one changes seeded outcomes if disturbed:

- **SPE-99 lookup snapshot.** `settleWeekState` passes `{ teams: context.sourceState.teams, cases: context.sourceState.cases }` as `deployedRecoveryLookup` while the agents come from `context.nextState`. The extraction must keep both the parameter and that split; resolving modes against `nextState` would read released assignments and change recovery modes.
- **`activeTeamIds` is a copied snapshot** at the call site (`[...context.activeTeamIds]`).
- **Order of `Object.entries(agents)`** is the iteration order of the returned record; do not sort, filter or rebuild it.
- **Rounding and floors.** `Math.max(1, Math.round(...))` on the deployed delta is applied _before_ SPE-99 scaling; `getRecoveryFatigue` is `Math.max(1, Math.floor(attritionPerWeek / 2))`.
- **No new writes.** The slice adds no `fatigueChannels`, `overdrive` or `energyBudget` mutation to the live tick. Those fields continue to be written only where they are written today (`combatStimWeekClose.ts`, mission resolution and the test-only batch).
- **No schema change.** No `GAME_SAVE_VERSION`, `GAME_STORE_VERSION`, event or `SCHEMA_REGISTRY.md` change; the persisted agent shape is untouched.
- **Directive ordering.** `applyRecoveryRotationToAgents` still runs after the fatigue step, on the fatigued record.

## Implementation steps

1. **Freeze the baseline before editing.** From `main`, run a scripted 10-week campaign on a fixed seed and print per-agent `fatigue` and `reports[i].avgFatigue`. Record the numbers for the fixture in step 5. Do not guess these values; generate them from the pre-change build and commit them as expected literals.
2. **Relocate the helpers** into `src/domain/recoveryFatigue.ts`, verbatim, including the SPE-99 comment and the `deployedRecoveryLookup` parameter.
3. **Wire `advanceWeek.ts`**: import the four helpers from `../recoveryFatigue` and delete the private declarations. The call at `settleWeekState` keeps its current argument list and order.
4. **Dedupe `fatiguePipeline.ts`**: delete its `getMissionFatigue` / `getRecoveryFatigue`; import from `../recoveryFatigue`; compute the delta through the shared classification so the training/resting branches above apply.
5. **Move the roster average** per Decision 3 and repoint `advanceWeek.ts` and `weeklyReport.ts`.
6. **Add the fixtures** in the next section, then run the acceptance commands.

Suggested commit subject: `SPE-44: extract weekly fatigue arithmetic into recoveryFatigue`.

## Determinism fixtures

| Fixture            | File                                                                                                                                | What it pins                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit matrix        | new `src/test/recoveryFatigue.contract.test.ts`                                                                                     | Exact deltas for `durationModel` × `attritionPerWeek` × branch × `recoveryRateBonus` × stress × SPE-99 mode. Table-driven, no RNG.                                                                                                                                                                                                                                                                                 |
| Consumer parity    | new case in `src/test/recoveryFatigue.contract.test.ts`                                                                             | `applyWeeklyAgentFatigue` and `applyAgentFatigue` produce the **same** `fatigue` value for the same inputs, across all branches; the pipeline still writes channels/overdrive/energy.                                                                                                                                                                                                                              |
| Same-seed equality | `src/test/sim.determinism.test.ts`                                                                                                  | Extend the existing 10-week two-run comparison to also assert identical `agents[id].fatigue` maps and identical `reports[i].avgFatigue` sequences. The current test compares RNG state, report notes and case keys — it would not notice a fatigue regression.                                                                                                                                                     |
| Save/replay        | `src/test/goldenPressureCampaign.integration.test.ts`                                                                               | Add `avgFatigue` and one recovering agent's `fatigue` to `summarize()` so `advanceWeek → serialize → load → advanceWeek` must reproduce them exactly.                                                                                                                                                                                                                                                              |
| Static guardrail   | new `test/fatigue-consolidation.test.ts` (`test/` already hosts `test/boundary-enforcement.test.ts`, which reads sources from disk) | Fails if `src/domain/sim/advanceWeek.ts` declares `getMissionFatigue`, `getRecoveryFatigue`, `applyAgentFatigue` or `getAverageRosterFatigue`; fails if `fatiguePipeline.ts` declares the two constants; fails if any file other than `src/domain/recoveryFatigue.ts` contains the `Math.max(1, Math.floor(config.attritionPerWeek / 2))` expression. This is the guardrail the April review explicitly asked for. |

Matrix values worth covering at minimum: `attritionPerWeek` 1, 2, 4, 6, 9; `durationModel` `attrition` and `capacity`; `recoveryRateBonus` 0 and 3; `activeTeamStressModifiers` 0 and 0.25; `deployedRecoveryLookup` omitted versus supplied with a `sanctuary_recovery` field base. Assert exact integers, not ranges.

## Acceptance criteria

```bash
# 1. No duplicate fatigue declarations in the two modules that had them.
git grep -n 'function \(getMissionFatigue\|getRecoveryFatigue\|applyAgentFatigue\)' -- \
  src/domain/sim/advanceWeek.ts src/domain/sim/fatiguePipeline.ts
# expected: no output (git grep exits 1)

# 2. Exactly one unfiltered roster average outside the test-only builder.
git grep -n 'function getAverageRosterFatigue' -- src/domain
# expected: src/domain/recoveryFatigue.ts only after step 5
#           (weeklyReport.ts must have been repointed, not left with a copy)

# 3. advanceWeek imports the canonical module.
git grep -n "from '../recoveryFatigue'" -- src/domain/sim/advanceWeek.ts

# 4. Targeted coverage, then the full gate.
npm run test:run -- src/test/recoveryFatigue.contract.test.ts \
  src/test/sim.fatiguePipeline.test.ts src/test/sim.advanceWeek.test.ts \
  src/test/sim.determinism.test.ts src/test/goldenPressureCampaign.integration.test.ts \
  src/test/agentFatigueChannels.test.ts src/test/responderEnergyBudget.test.ts \
  test/fatigue-consolidation.test.ts
npm run test:run
npm run lint
npm run build
```

The full suite and build are required here, not optional: this is a non-trivial simulation change and the repo's green-build recovery (SPE-3375) makes `npm run build` meaningful again. Report the actual run, not an assumed pass.

## Exclusions / deferred

- **Channel, overdrive and energy writes in the live tick.** `applyWeeklyAgentFatigue` already models them and `missionResolutionAgents.ts`, `deploymentReadiness.ts`, `downtimeCarryIn.ts` and `combatStim.ts` already read the fields, but the live weekly tick never accumulates mission/training channels. Adopting that is a gameplay change owned by SPE-1107 and SPE-130. Record the finding; do not implement it here.
- **Filtered vs unfiltered roster average.** Decision needed by whoever owns weekly-report scoring; propose on SPE-44 and leave `rosterFatigue.ts` untouched.
- **Deleting `fatiguePipeline.applyWeeklyAgentFatigue`.** After this slice it shares the canonical delta but is still test-only. Retiring it is a separate slice (either wire it or delete it with its tests), not a drive-by.
- **`recoveryRateBonus` semantics during training.** The slice preserves the live credit; whether training should credit recovery at all is a balance question for the same follow-up.
- No store, projection, UI, event-schema or save-version change. No new dependency.

## Risks and traps

- **Silent behaviour change via the pipeline.** Unifying the delta alters three test expectations. If a reviewer sees only "tests updated", the slice looks like it weakened coverage. The PR description must state which expectations moved, why they were the divergent branch, and that no production consumer reads that path.
- **Losing the SPE-99 snapshot split.** The most likely regression is passing `nextState` teams/cases into `buildDeployedRecoveryModeByAgentId`. The determinism fixture with a field-base case is the thing that catches it.
- **Import cycle.** `recoveryFatigue.ts` now imports from `./sim/expeditionRecoveryNode`; verify the direction stays one-way.
- **Guardrail false positives.** A regex guardrail must not match comments in this planning doc or the new module's own docstring; scope it to the two source paths.
- **Generated evidence.** The `docs/typecheck/**/census.json` files list every domain module and will make the new module look referenced; they are not consumers.

## Bookkeeping

- Implementation session sets SPE-44 **In Progress** before coding and leaves it open: this slice satisfies the fatigue portion of the acceptance criterion, not the whole advance-week boundary.
- `SCHEMA_REGISTRY.md` is untouched (no persisted shape change).
- Add a status line to this file (`Draft` → `In progress` → `Recently shipped`) when the slice ships; do not mark SPE-44 Done from this slice alone.
- Cross-reference `docs/dead-module-and-duplicate-logic-inventory.md` §3.1–3.2, which holds the inventory evidence this slice is built on.

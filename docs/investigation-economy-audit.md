# Investigation Economy Audit — Budget, Questions, Leverage, and Intel Degradation

> Design note and architectural reference for `src/domain/investigationEconomy.ts` and `src/domain/intel.ts`.

---

## 1. Overview

The investigation economy gives players a structured way to spend investigative budget on domain-specific questions, gaining leverage (either persistent or time-limited) against open cases. It is fully separated from the mission resolution path — questions do not change mission outcomes directly, only via flag-based leverage that other systems read.

A parallel system (`intel.ts`) tracks per-case confidence and uncertainty values that degrade over time.

---

## 2. Budget System

Each open case has two independent budget pools:

| Domain | Questions available | Budget ID suffix |
| --- | --- | --- |
| `forensic` | Evidence analysis questions | `.forensic.granted` / `.forensic.spent` |
| `tactical` | Approach and danger-vector questions | `.tactical.granted` / `.tactical.spent` |

Budgets are stored as progress clocks (via `advanceDefinedProgressClock`). The clock ID format is:

```text
investigation.case.{caseId}.{domain}.granted
investigation.case.{caseId}.{domain}.spent
```

**Hard cap:** `INVESTIGATION_BUDGET_MAX = 6` per domain per case. Granted ticks above 6 are absorbed by the clock's `max` setting.

**Remaining budget:** `Math.max(0, granted - spent)`

### Granting Budget

`grantInvestigationQuestionBudget(state, { caseId, domain, amount })` advances the `granted` clock by `amount`. Zero amounts and empty case IDs are no-ops (no state write).

### Budget From Mission Success

`applySuccessfulInvestigation(state, { caseId, forensicBudget?, tacticalBudget? })` is the standard reward path called after a successful investigation mission. Defaults: `forensicBudget=2`, `tacticalBudget=1`. It also:

- Advances the progress reward clock (`investigation.case.{caseId}.progress.reward`) by 1 (capped at `INVESTIGATION_REWARD_MAX = 1`)
- Sets the persistent flag `investigation.case.{caseId}.reward.progress-applied = true`

---

## 3. Question Catalog

There are two fixed question sets (not authored per-case; they are global constants):

### Forensic Questions (3 questions)

| ID | Prompt summary | Leverage type |
| --- | --- | --- |
| `forensic.present-signature` | What concrete signature is present? | `next_step` — secure-evidence-chain |
| `forensic.missing-proof` | What expected proof is missing? | `next_step` — audit-handoff-gap |
| `forensic.anomalous-variance` | Which anomaly changes the hypothesis? | `temporary_advantage` (1 week) — narrowed-window |

### Tactical Questions (3 questions)

| ID | Prompt summary | Leverage type |
| --- | --- | --- |
| `tactical.immediate-danger-vector` | What is the immediate danger vector? | `temporary_advantage` (1 week) — staged-ingress-advantage |
| `tactical.safe-approach` | Which approach route is least compromised? | `next_step` — route-secondary-service |
| `tactical.counter-read` | Where does counter-detection trigger first? | `temporary_advantage` (1 week) — threshold-awareness |

Leverage type `next_step` has no `durationWeeks` (persistent until consumed). Type `temporary_advantage` includes `durationWeeks` (currently always 1 week).

---

## 4. Asking Questions — `askInvestigationQuestion`

```text
askInvestigationQuestion(state, { caseId, domain, questionId })
  → AskInvestigationQuestionResult { state, applied, reason?, question?, remainingBudget, leverageFlagId? }
```

Failure reasons (in order of check):

| Reason | Condition |
| --- | --- |
| `invalid_case` | `caseId` is empty after trim |
| `invalid_question` | `questionId` not found in domain catalog |
| `budget_exhausted` | `remaining ≤ 0` |
| `already_asked` | Asked flag is set for this case+question pair |

On success:

1. Advances `spent` clock by 1
2. Sets `investigation.case.{caseId}.question.{questionId}.asked = true`
3. Sets `investigation.case.{caseId}.leverage.{leverage.id} = true`
4. If `leverage.durationWeeks` is defined: sets `...leverage.{leverage.id}.duration-weeks = durationWeeks`
5. Returns the updated state and `leverageFlagId`

---

## 5. Flag and Clock ID Helpers

All IDs are derived from sanitized `caseId` (trimmed). The helper functions:

| Function | Output format |
| --- | --- |
| `buildInvestigationBudgetClockId(caseId, domain, bucket)` | `investigation.case.{caseId}.{domain}.{bucket}` |
| `buildInvestigationProgressRewardClockId(caseId)` | `investigation.case.{caseId}.progress.reward` |
| `buildInvestigationAskedFlagId(caseId, questionId)` | `investigation.case.{caseId}.question.{questionId}.asked` |
| `buildInvestigationLeverageFlagId(caseId, leverageId)` | `investigation.case.{caseId}.leverage.{leverageId}` |

Use these helpers everywhere. Never hardcode flag/clock IDs.

---

## 6. Intel System (`intel.ts`)

Each `CaseInstance` carries three intel fields initialized by `createMissionIntelState(week)`:

| Field | Initial value | Meaning |
| --- | --- | --- |
| `intelConfidence` | `1.0` | How reliable the intel is (0–1) |
| `intelUncertainty` | `0.0` | How uncertain/contested the intel is (0–1) |
| `intelLastUpdatedWeek` | current week | Last week intel was refreshed |

### Degradation

`degradeMissionIntel(mission, currentWeek, modifiers?)` applies per-week decay:

```text
confidence -= elapsedWeeks × 0.04 × confidenceDecayMultiplier   (clamped to [0, 1])
uncertainty += elapsedWeeks × 0.04 × uncertaintyGrowthMultiplier (clamped to [0, 1])
```

Constants from `INTEL_CALIBRATION`:

- `confidenceDecayPerWeek: 0.04`
- `uncertaintyGrowthPerWeek: 0.04`

Degradation does not run if `elapsedWeeks === 0` or `mission.status === 'resolved'`.

`modifiers.confidenceDecayMultiplier` and `modifiers.uncertaintyGrowthMultiplier` are clamped to `[0, 1]` — they can slow degradation but not accelerate it beyond the base rate.

### Intel Update

`applyIntelUpdate(state, missionId, { confidenceGain?, uncertaintyReduction? }, week)` adds to confidence and subtracts from uncertainty (both non-negative deltas, clamped to `[0, 1]`). This is the path for refreshing intel after a successful scouting or recon action.

### Risk Score

`getMissionIntelRisk(mission, currentWeek)` returns a single 0–1 risk value:

```text
risk = clamp(((1 - confidence) + uncertainty) / 2, 0, 1)
```

High risk = low confidence + high uncertainty. Used by the routing and deployment penalty systems.

---

## 7. Integration Points

| Caller / Consumer | Role |
| --- | --- |
| `sim/advanceWeek.ts` | Calls `degradeMissionIntelRecord` each tick for all open cases |
| `missionResults.ts` | Calls `applySuccessfulInvestigation` after an investigation mission succeeds |
| `scouting/recon paths` | Call `applyIntelUpdate` to refresh confidence after recon actions |
| `flagSystem.ts` | Persists asked/leverage flags; read by any system checking leverage state |
| `progressClocks.ts` | Persists budget granted/spent clocks |
| `src/features/operations/CasePage` | Reads budget snapshots and available questions for the UI |
| `sim/calibration.ts` | Source of `INTEL_CALIBRATION` decay/routing constants |

---

## 8. Common Pitfalls

| Pitfall | Consequence | Guard |
| --- | --- | --- |
| Granting budget without checking the `INVESTIGATION_BUDGET_MAX` cap | Clock value silently absorbs excess, but callers may expect budget > 6 | The `max: INVESTIGATION_BUDGET_MAX` arg to `advanceDefinedProgressClock` enforces the cap |
| Reading leverage flags without checking duration | Expired temporary advantages still appear active | Duration is stored separately as `{leverageFlagId}.duration-weeks`; consuming systems must compare against current week |
| Asking a question and not reading `applied` | Error reason is silently swallowed | Always check `result.applied` before treating `result.question` as valid |
| Calling `degradeMissionIntel` on a resolved case | No-op — resolved cases are explicitly skipped | The guard `mission.status === 'resolved'` is in `degradeMissionIntel` |
| Using `Math.random()` in any intel calculation | Non-deterministic save/load | All intel math is purely arithmetic on state values; no RNG used |
| Hardcoding flag/clock IDs instead of using helpers | Typos create orphaned state entries | Always use the `build*` helper functions |

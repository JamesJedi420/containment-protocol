# Contract Debrief & Next-Intent Audit (SPE-1496)

> Design note and architectural reference for the bounded post-contract debrief
> flow and the captured next-intent that biases later contract suggestions.
>
> Sources of truth: `src/domain/contracts.ts`, `src/domain/models.ts`,
> `src/features/report/operationsReportView.ts`,
> `src/features/dashboard/OperationsReportPanel.tsx`,
> `src/features/operations/frontDeskView.ts`.

---

## 1. Goal

Completed contract operations should not silently drop the player back into
passive browsing. The debrief slice emits a deterministic, compact record per
completed contract operation surfaced from the latest weekly report, and lets
the player capture a single bounded "next intent" choice that nudges later
contract offer ordering. No prose recap generator, no planner, no system-pushed
next contract.

---

## 2. Data shapes

### `ContractDebriefRecord` (`src/domain/models.ts`)

Compact deterministic record emitted per completed contract operation.

- `caseId`, `caseTitle`
- `contractTemplateId`, `factionId?`, `factionLabel?`
- `outcome: MissionResolutionKind`
- `week: number`
- `summary: string` — single sentence stitched from outcome + faction channel
- `changedEntities: ContractDebriefChangedEntity[]` — bounded list of
  staff / subject / route / evidence / faction state shifts
- `unresolvedClocks: ContractDebriefUnresolvedClock[]` — recovery pressure
  and any spawned follow-up consequences
- `strategicOptions: ContractDebriefStrategicOption[]` — bounded
  `ContractNextIntent` suggestions with a short reason

### `ContractNextIntent` (`src/domain/models.ts`)

Bounded closed union:

- `chase-lead`
- `stabilize-staff`
- `repair-agency`
- `pursue-faction`
- `prepare-equipment`
- `answer-emergency`

Add new values sparingly — they all need a label
(`getContractNextIntentLabel`) and a bias branch in
`getNextIntentSelectionBias`.

### `ContractSystemState` additions

- `nextIntent?: ContractNextIntent | null`
- `nextIntentCapturedWeek?: number`

Both are persisted through `sanitizeContractSystemState` and survive
`refreshContractBoard` regeneration so the bias term keeps applying until the
player clears it.

---

## 3. Pipelines

### Debrief record generation (pure derivation)

`getRecentContractDebriefRecords(game)`:

1. Reads the latest entry of `game.reports`.
2. Filters `caseSnapshots` to those with a terminal `MissionResult`.
3. For each snapshot, calls `buildContractDebriefRecord(snapshot, week, caseInstance?)`.
4. Returns records ordered by `caseId` for stable UI output.

`buildContractDebriefRecord` is a pure function over a single
`WeeklyReportCaseSnapshot` plus an optional live `CaseInstance`. It pulls the
contract template id and faction id from the case-instance contract first,
then falls back to a safe extraction from the snapshot via
`extractContractRuntimeFromSnapshot`. Returns `null` if no
`MissionResult` or no contract template id is available.

Helpers used to populate `changedEntities`:

- `describeSubject` (hidden state / outcome on the subject case)
- `describeFatalities`, `describeInjuries`, `describeFatigueShifts`
- `describeFactionShifts`, `describeEvidenceGains`
- `describeRoute`

Helpers used to populate `unresolvedClocks`:

- `describeUnresolvedClocks` — recovery pressure band + spawned consequences

Helpers used to populate `strategicOptions`:

- `buildStrategicOptions` + `dedupeStrategicOptions` — bounded mapping from
  observed deltas to `ContractNextIntent` suggestions

All helpers are pure, take only mission-result and snapshot data, and emit no
freeform prose.

### Next-intent capture

`setContractNextIntent(state, intent)` writes the chosen intent into
`state.contracts` along with `state.week` as `nextIntentCapturedWeek`.
`clearContractNextIntent(state)` removes both fields. `getContractNextIntent`
reads the sanitized value. The Zustand store exposes `setContractNextIntent`
and `clearContractNextIntent` actions in `src/app/store/gameStore.ts`.

### Contract suggestion bias

`buildSelectionScore` adds `getNextIntentSelectionBias(state, definition)` as
an additive term. Each `ContractNextIntent` has a deterministic mapping to a
bounded bias derived from:

- `definition.strategyTag` (`income`, `materials`, `research`, `progression`)
- `definition.factionId` + the resolved `factionTier`
- whether the chain has a `completed_contract` unlock condition
- the cumulative risk modifier (`difficulty_flat` / `death_risk`)

Bias values are bounded so the term never overrides unlock conditions; it only
nudges ordering. `refreshContractBoard` preserves the captured next intent
across regeneration so the bias keeps applying.

---

## 4. UI surfaces

- **Operations report panel** (`OperationsReportPanel.tsx`) renders a
  "Post-contract debrief" article that lists each record's summary, changed
  entities, and unresolved clocks. Below the list, a bounded pill-set lets the
  player capture or clear the next intent.
- **Front desk attention list** (`frontDeskView.ts`) inserts a single compact
  "Post-contract debrief" attention item built from
  `contractDebrief.attentionSummary` whenever there are debrief records, with
  tone derived from the lead record's outcome / unresolved clocks / captured
  intent. The item links to the operations report.
- The operations report view exposes `getContractDebriefView(game)` and
  `OperationsReportView.contractDebrief` for any future surface that wants the
  same digest without re-deriving it.

---

## 5. Save/load and determinism

- `nextIntent` and `nextIntentCapturedWeek` are persisted via
  `sanitizeContractSystemState`, so they round-trip through saves.
- Debrief records are pure derivations from the weekly report and current
  cases — they are not persisted, and recomputing them after load matches the
  pre-save output.
- All helpers are deterministic; tests in `src/test/contractsDebrief.test.ts`
  exercise debrief generation, next-intent capture, and the bias path.

---

## 6. Out of scope (intentional)

- No prose recap generation or freeform journaling.
- No "system pushes the next contract" path.
- No multi-step planner; bias is a single additive term.
- No new event-queue interception or broad narrative pipeline.
- No expansion of report-note types — the debrief layer sits beside the report
  rather than rewriting it.

Future work that would extend (but not violate) this boundary:

- Persistent debrief history across multiple weeks (currently just the latest
  report).
- Richer strategic options for as-yet-unlisted `ContractNextIntent` values.
- Surfacing the captured intent on the contract board UI as a "current focus"
  pill so the bias is legible at the point of decision.

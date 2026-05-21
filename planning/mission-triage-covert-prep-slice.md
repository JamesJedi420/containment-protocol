# SPE-2255 slice — Mission triage covert-prep row signals (UI)

One-page implementation plan. Linear: [SPE-2255 — Mission triage covert prep row signals (slice 1 UX)](https://linear.app/spectranoir/issue/SPE-2255/mission-triage-covert-prep-row-signals-slice-1-ux). Parent: [SPE-16 — Mission Intake, Triage, & Routing](https://linear.app/spectranoir/issue/SPE-16/mission-intake-triage-and-routing). Spec: `ux/mission-triage.md` (deferred block, May 2026).

## Why this is next

| Shipped | Gap |
| --- | --- |
| Covert prep panels on case detail (`WeeklyCasePrepPanel`, SPE-70 / SPE-521 / SPE-626 / SPE-2247) | Player must open each case to see covert posture before prioritizing the week |
| `triageMission` + `CasesPage` urgency markers (deadline, stage, roles) | No list-row signals for concealment preview, infiltration strain, leave-behind staging, or forensic custody pressure |
| Operations report + navigation map for batch-4 covert notes | Triage list still omits deferral vs covert-prep tradeoffs at scan time |

**Backlog alignment:** `planning/backlog.md` Deferred UX — mission triage covert-prep surfacing. Closes the May 2026 covert-ops prep arc at the **decision surface** (`CasesPage`), not case detail.

## Goal

On the **mission triage list** (`CasesPage`), show compact read-only chips per case so the player can scan:

1. **Concealment** — eligible posture, preview activation, or active `conceal.case.*` request.
2. **Infiltration** — probe / awareness summary when a probe plan applies.
3. **Leave-behind** — staged selection or tradeoff pending before `advanceWeek`.
4. **Forensic strain** — low remaining budget or custody markers from prior leave-behind fallout.
5. **Deferral hint** (optional slice-1b) — one line tying `triageMission` escalation dimension to infiltration strain when both apply.

Reuse existing view builders and `triageMission`; no new persistence shapes or store actions.

## Non-goals

- Full `ux/mission-triage.md` layout (filters/tabs/split detail panel/footer)
- New domain simulation for covert mechanics
- Player actions from the list (toggle conceal flag, probe override, ask questions) — case detail only
- Contracts/leads hub unification beyond existing `CasesPage` scope
- SPE-70 full hidden-modality matrix or SPE-781 extensions

## Domain / view reuse (read-only)

```ts
// Already shipped — compose in a thin list helper
buildWeeklyCasePrepView(caseData, game)
buildConcealmentCasePrepView(caseData, game)
buildInfiltrationCasePrepView(caseData)
buildStealthLeaveBehindSelectionView(caseData, game)
buildInvestigationCasePrepView(caseData, game)

// Deferral / priority context
triageMission(state, caseData) // priority band, dimensions, reasonCodes
```

### New view module

```ts
// src/features/cases/missionTriageCovertPrepView.ts

export interface MissionTriageCovertPrepMarker {
  readonly id: string
  readonly label: string
  readonly className: string
  readonly title?: string
}

export interface MissionTriageCovertPrepSignals {
  readonly visible: boolean
  readonly markers: readonly MissionTriageCovertPrepMarker[]
  readonly deferralNote?: string
}

export function buildMissionTriageCovertPrepSignals(
  caseData: CaseInstance,
  game: GameState
): MissionTriageCovertPrepSignals
```

**Eligibility:** `caseData.status === 'in_progress'` for actionable covert chips. Resolved / open cases: `visible: false`. Already `hiddenState` set: concealment toggle chips hidden; optional read-only “Concealed” chip only if product wants one-liner (prefer hide for slice 1).

### Label mapping (humanized, short)

| Source | Example chip |
| --- | --- |
| `concealment.previewApplied` + `previewReasonLabel` | “Covert next week” |
| `concealment.playerConcealFlagActive` | “Covert requested” |
| `infiltration.probeProgressPercent` / `awarenessPercent` | “Probe 42% · awareness 61%” |
| `infiltration.coverStrainNotes[0]` (if any) | “Cover strain” (tooltip = note) |
| `stealthLeaveBehind` selection pending | “Leave-behind staged” |
| custody markers or (`forensic.granted > 0` and `remaining === 0`) | “Forensic strain” |
| `triage.dimensions.escalationRisk` high + infiltration visible | deferralNote one-liner |

## UI (minimal)

| Surface | Content |
| --- | --- |
| `CasesPage` list row | Extend marker strip beside existing `getUrgencyMarkers` output |
| Chip styling | Reuse urgency marker pattern (`rounded-full border px-2 py-0.5 text-[11px]`) with distinct tones per category |
| Compare panel (if open) | Optional `deferralNote` under recommendation block |

Wire via `getCaseListItemView` → add `covertPrepSignals` field, or compute in page from `buildMissionTriageCovertPrepSignals` (prefer view on `CaseListItemView` for tests).

## Tests (TDD order)

1. `missionTriageCovertPrepView.test.ts` — hidden for open/resolved; concealment chip when preview applied; infiltration chip when probe plan present; leave-behind chip when selection staged; forensic chip when custody burden
2. `CasesPage.test.tsx` — list row renders covert chips on tuned fixtures (extend or mirror `renders urgency markers for triage cases`)
3. Regression — `weeklyCasePrepView.test.ts`, `concealmentCasePrepView.test.ts`, `infiltrationCasePrepView.test.ts` unchanged

## Acceptance criteria

- [x] In-progress concealment-eligible case shows at least one covert chip on `/cases` without opening case detail
- [x] Infiltration-tagged in-progress case shows probe/awareness summary chip
- [x] Staged leave-behind or zero forensic remaining surfaces on list row
- [x] Resolved and non-eligible cases show no covert chips
- [x] `npm run lint` + `npm run test:run` green
- [x] `ux/mission-triage.md` spec status updated; slice linked from `planning/backlog.md` Deferred UX

## File touch list (expected)

| Area | Files |
| --- | --- |
| View | `src/features/cases/missionTriageCovertPrepView.ts` |
| List view | `src/features/cases/caseView.ts` |
| UI | `src/features/cases/CasesPage.tsx` |
| Tests | `src/test/missionTriageCovertPrepView.test.ts`, `src/features/cases/CasesPage.test.tsx` |
| Docs | `ux/mission-triage.md`, `planning/backlog.md` |

## Risks

- **Marker clutter:** cap at 4 chips; prefer highest-signal (concealment preview > infiltration awareness > leave-behind > forensic)
- **Preview drift:** concealment preview must use same `globalFlags` source as `buildConcealmentCasePrepView` (already matches `advanceWeek`)
- **False positives:** gate infiltration chips on `isInfiltrationProbeEligible` / `infiltrationCasePrepView.visible`

## Branch

`spe-16-mission-triage-covert-prep-slice-1`

## See also

- `ux/mission-triage.md` — deferred covert-prep block
- `src/features/cases/weeklyCasePrepView.ts`
- `planning/concealment-case-prep-slice.md`
- `planning/infiltration-case-prep-slice.md`
- `planning/investigation-question-case-prep-slice.md`
- `src/domain/missionIntakeRouting.ts` — `triageMission`

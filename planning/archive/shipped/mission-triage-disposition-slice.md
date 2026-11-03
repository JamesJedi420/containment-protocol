# SPE-16 slice 5 — Mission triage route / defer / ignore (UX + disposition)

**Status:** Shipped on `main` via [PR #2359](https://github.com/JamesJedi420/containment-protocol/pull/2359) — mission triage disposition actions (slice 5).

**Parent:** [SPE-16 — Mission Intake, Triage, & Routing](https://linear.app/spectranoir/issue/SPE-16/mission-intake-triage-and-routing).

**Ownership note:** [SPE-2259](https://linear.app/spectranoir/issue/SPE-2259) is slice 6 list-scan polish, not slice 5 disposition. Do not use SPE-2259 as the slice 5 owner.

**Goal:** Let the player set weekly triage disposition (route now / defer / ignore) on the CasesPage detail panel, persisted in canonical `missionRouting` and distinct from team assignment.

**Architecture (shipped):** Bounded `playerDisposition` on `MissionRoutingRecord`, applied only when `playerDispositionWeek === game.week`. Domain helpers write disposition; `recomputeMissionRouting` merges disposition into `routingState` instead of blindly overwriting with `routeMission`. UI reads a small view model and calls store actions. Defer consequence copy reuses `buildMissionTriageDeferralCompareView`.

**Tech stack:** TypeScript domain (`missionIntakeRouting.ts`), Zustand `gameStore`, React `CasesPage` triage detail panel, Vitest.

**Prerequisite (historical):** Slices 1–3 merged on `main` (`SPE-2255`–`SPE-2257`). Slice 4 status-bar tail ([SPE-2258](https://linear.app/spectranoir/issue/SPE-2258)) merged before slice 5.

**Spec:** `ux/mission-triage.md` §9 (deferral), §11 (route now), wireframe actions §14; `docs/mission-intake-triage-routing-audit.md` §0 (canonical state).

**Branch (historical):** `spe-16-mission-triage-disposition-slice-5`

---

## Why this slice

| Shipped (slices 1–3)                                        | Gap                                                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Covert chips, deferral compare table, tabs/split/footer     | Player can _read_ tradeoffs but cannot _record_ route/defer/ignore                                |
| `routeMission` / `routeMissionToTeam` / `assignMissionTeam` | Assignment conflated with triage intent; `deferred` exists in types but is never player-set       |
| `recomputeMissionRouting` each week                         | Overwrites `routingState` from `routeMission` — player intent must be first-class and week-scoped |

Slice 4 (status-bar tail) surfaces queue metrics; slice 5 closes the **decision** loop on the detail panel.

---

## Semantics (locked for implementation)

| Action               | Player meaning                                              | Persisted shape               | `routingState` when active this week                                                  |
| -------------------- | ----------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------- |
| **Route now**        | Committed to operational planning this week; not deployment | `playerDisposition: 'route'`  | `shortlisted`                                                                         |
| **Defer**            | Explicitly accept delay cost                                | `playerDisposition: 'defer'`  | `deferred` (blocks deploy via existing `deploymentReadiness` `routing-state-blocked`) |
| **Ignore**           | Temporarily deprioritize scanning; not “forget”             | `playerDisposition: 'ignore'` | Keep computed state from `routeMission`; set `triageIgnored: true` for sort/footer    |
| **Clear** (optional) | Undo this week’s disposition                                | Clear disposition fields      | Revert to `routeMission` output                                                       |

**Weekly expiry:** Disposition applies only when `playerDispositionWeek === state.week`. On `advanceWeek`, `recomputeMissionRouting` runs without applying stale disposition (fields cleared or ignored when week mismatches).

**Distinct from assignment:** `assignMissionTeam` → `assigned` + `assignedTeamIds` unchanged. Route now must not assign a team. If already `assigned` / `in_progress` with teams, hide route/defer/ignore (assignment is the stronger commitment).

**Major incidents:** Hide disposition actions when `view.isMajorIncident` (same gate as deferral compare / compare-top-2).

---

## Non-goals

- Status-bar tail (slice 4 / SPE-2258)
- New escalation formulas or deadline ticks solely for defer/ignore
- List-row action buttons (detail panel only for slice 5)
- Auto-routing or changing `assignTeam` / deployment FSM
- Contract board rework

---

## File map

| File                                                     | Responsibility                                                                                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain/models.ts`                                   | `MissionTriageDisposition`, optional `triageIgnored`, `playerDisposition`, `playerDispositionWeek` on `MissionRoutingRecord`    |
| `src/domain/missionIntakeRouting.ts`                     | `applyMissionTriageDisposition`, `clearMissionTriageDisposition`, merge in `recomputeMissionRouting` / `normalizeMissionRecord` |
| `src/app/store/gameStore.ts`                             | `setMissionTriageDisposition`, `clearMissionTriageDisposition`                                                                  |
| `src/features/cases/missionTriageDispositionView.ts`     | View model: labels, enabled flags, consequence blurb                                                                            |
| `src/features/cases/MissionTriageDispositionActions.tsx` | Three buttons + optional clear                                                                                                  |
| `src/features/cases/CasesPage.tsx`                       | Mount actions in triage detail panel                                                                                            |
| `src/features/cases/caseView.ts`                         | Expose `disposition` on `CaseListItemView` (optional)                                                                           |
| `src/features/cases/missionTriageLayoutView.ts`          | Exclude `triageIgnored` from `urgentIfDeferred` / deprioritize in sort via `caseView`                                           |
| `src/data/copy.ts`                                       | `MISSION_TRIAGE_DISPOSITION_LABELS`                                                                                             |
| `src/test/mission.intake.triage.routing.test.ts`         | Domain disposition + recompute preservation                                                                                     |
| `src/test/missionTriageDispositionView.test.ts`          | View builder                                                                                                                    |
| `src/features/cases/CasesPage.test.tsx`                  | Button wiring smoke                                                                                                             |
| `ux/mission-triage.md`                                   | Spec status: slice 5 shipped                                                                                                    |
| `planning/backlog.md`                                    | Narrow deferred UX bullet                                                                                                       |

---

## Acceptance

- [x] Detail panel shows Route now / Defer / Ignore for eligible non–major-incident cases
- [x] Actions update `missionRouting` and survive `refreshMissionRouting` / save-load
- [x] Defer sets `routingState: 'deferred'` and blocks deployment eligibility (existing path)
- [x] Route now sets `shortlisted` without assigning a team
- [x] Ignore deprioritizes list sort and does not count toward `urgentIfDeferred`
- [x] Disposition does not apply after week advances (re-triage next week)
- [x] Assign-team flow unchanged; copy distinguishes triage vs assignment
- [x] Tests + lint + `npm run test:run` green

---

## Historical implementation plan (shipped via PR #2359)

> Archival only. Acceptance criteria above are satisfied on `main`. Step checkboxes below record the original task breakdown used during implementation; they are not open work.

## Task 1: Model + domain disposition API

**Files:**

- Modify: `src/domain/models.ts`
- Modify: `src/domain/missionIntakeRouting.ts`
- Test: `src/test/mission.intake.triage.routing.test.ts`

- [x] **Step 1: Extend types**

```ts
export type MissionTriageDisposition = 'route' | 'defer' | 'ignore'

// MissionRoutingRecord additions:
playerDisposition?: MissionTriageDisposition
playerDispositionWeek?: number
triageIgnored?: boolean
```

- [x] **Step 2: Write failing domain tests**

```ts
it('applyMissionTriageDisposition sets deferred routingState for current week', () => {
  const state = createStartingState()
  const missionId = 'case-001'
  const next = applyMissionTriageDisposition(
    { ...state, missionRouting: normalizeMissionRoutingState(state) },
    missionId,
    'defer'
  )
  expect(next.missionRouting?.missions[missionId]?.routingState).toBe('deferred')
  expect(next.missionRouting?.missions[missionId]?.playerDisposition).toBe('defer')
  expect(next.missionRouting?.missions[missionId]?.playerDispositionWeek).toBe(state.week)
})

it('recomputeMissionRouting preserves defer disposition within the same week', () => {
  const base = /* state with defer disposition this week */
  const recomputed = recomputeMissionRouting(base, base.week)
  expect(recomputed.missions['case-001']?.routingState).toBe('deferred')
})

it('recomputeMissionRouting drops disposition after week advances', () => {
  const base = /* defer on week 1 */
  const recomputed = recomputeMissionRouting(base, 2)
  expect(recomputed.missions['case-001']?.playerDisposition).toBeUndefined()
})
```

Run: `npm run test:run -- src/test/mission.intake.triage.routing.test.ts`
Expected: FAIL — `applyMissionTriageDisposition` not defined

- [x] **Step 3: Implement helpers**

```ts
export function dispositionToRoutingState(
  disposition: MissionTriageDisposition,
  computed: MissionRoutingStateKind
): MissionRoutingStateKind {
  if (disposition === 'route') return 'shortlisted'
  if (disposition === 'defer') return 'deferred'
  return computed // ignore
}

export function applyMissionTriageDisposition(
  state: GameState,
  missionId: Id,
  disposition: MissionTriageDisposition
): GameState {
  const missionRouting = normalizeMissionRoutingState(state)
  const mission = missionRouting.missions[missionId]
  if (!mission) return state

  const routed = routeMission(state, missionId)
  const routingState = dispositionToRoutingState(disposition, routed.routingState)

  return {
    ...state,
    missionRouting: {
      ...missionRouting,
      missions: {
        ...missionRouting.missions,
        [missionId]: {
          ...mission,
          playerDisposition: disposition,
          playerDispositionWeek: state.week,
          triageIgnored: disposition === 'ignore',
          routingState,
          lastRoutedWeek: state.week,
        },
      },
    },
  }
}
```

Update `recomputeMissionRouting` inner merge:

```ts
const existing = routing.missions[missionId]
const dispositionActive = existing?.playerDisposition && existing.playerDispositionWeek === week
const routingState = dispositionActive
  ? dispositionToRoutingState(existing.playerDisposition, routed.routingState)
  : routed.routingState
const triageIgnored = dispositionActive && existing.playerDisposition === 'ignore'
```

- [x] **Step 4: Run domain tests — expect PASS**

---

## Task 2: Store wiring

**Files:**

- Modify: `src/app/store/gameStore.ts`
- Modify: `src/app/store/gameStore.types.ts` (if actions typed separately)

- [x] **Step 1: Add store actions**

```ts
setMissionTriageDisposition: (missionId, disposition) => {
  set((s) => ({
    game: applyMissionTriageDisposition(s.game, missionId, disposition),
  }))
},
clearMissionTriageDisposition: (missionId) => {
  set((s) => ({
    game: clearMissionTriageDisposition(s.game, missionId),
  }))
},
```

`clearMissionTriageDisposition`: strip disposition fields, then `recomputeMissionRouting`.

- [x] **Step 2: Smoke test via existing routing test or minimal store test** (optional if domain coverage is sufficient)

---

## Task 3: Disposition view + UI component

**Files:**

- Create: `src/features/cases/missionTriageDispositionView.ts`
- Create: `src/features/cases/MissionTriageDispositionActions.tsx`
- Modify: `src/data/copy.ts`
- Test: `src/test/missionTriageDispositionView.test.ts`

- [x] **Step 1: Copy constants**

```ts
export const MISSION_TRIAGE_DISPOSITION_LABELS = {
  routeNow: 'Route now',
  defer: 'Defer',
  ignore: 'Ignore',
  clear: 'Clear disposition',
  routeDetail: 'Mark for operational planning this week. Assign a team when ready.',
  deferDetail: 'Accept delay; escalation may continue while deferred.',
  ignoreDetail: 'Deprioritize in the triage list this week. Does not dismiss the case.',
  activeRoute: 'Routed for planning',
  activeDefer: 'Deferred',
  activeIgnore: 'Ignored this week',
} as const
```

- [x] **Step 2: View builder**

```ts
export interface MissionTriageDispositionView {
  visible: boolean
  active: MissionTriageDisposition | null
  routeEnabled: boolean
  deferEnabled: boolean
  ignoreEnabled: boolean
  consequenceDetail: string | null
}

export function buildMissionTriageDispositionView(
  view: CaseListItemView,
  game: GameState
): MissionTriageDispositionView
```

Rules:

- `visible`: open case, not major incident, not resolved
- `active`: from `game.missionRouting.missions[id]` when `playerDispositionWeek === game.week`
- `consequenceDetail`: when `defer` selected or Defer hovered, pull highest-signal line from `buildMissionTriageDeferralCompareView` deferral column `detail`
- Disable route/defer when `!view.isUnassigned` or `status === 'in_progress'` with assignments

- [x] **Step 3: Component**

```tsx
export function MissionTriageDispositionActions({
  view,
  dispositionView,
  onDisposition,
  onClear,
}: { ... }) {
  return (
    <div aria-label="Triage disposition" className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-sm ..." disabled={!dispositionView.routeEnabled} ...>
          {MISSION_TRIAGE_DISPOSITION_LABELS.routeNow}
        </button>
        {/* defer, ignore */}
      </div>
      {dispositionView.consequenceDetail ? (
        <p className="text-xs text-amber-200/90">{dispositionView.consequenceDetail}</p>
      ) : null}
      {dispositionView.active ? (
        <button type="button" className="btn btn-sm btn-ghost" onClick={onClear}>...</button>
      ) : null}
    </div>
  )
}
```

- [x] **Step 4: View tests — PASS**

---

## Task 4: CasesPage integration + list behavior

**Files:**

- Modify: `src/features/cases/CasesPage.tsx`
- Modify: `src/features/cases/caseView.ts` (sort deprioritize `triageIgnored`)
- Modify: `src/features/cases/missionTriageLayoutView.ts` (`urgentIfDeferred` skip ignored)
- Modify: `src/features/cases/MissionTriageListRow.tsx` (optional badge)
- Test: `src/features/cases/CasesPage.test.tsx`

- [x] **Step 1: Mount in detail panel** — after `MissionTriageDeferralCompareTable`, before recommended action / assign block:

```tsx
<MissionTriageDispositionActions
  view={view}
  dispositionView={buildMissionTriageDispositionView(view, game)}
  onDisposition={(d) => setMissionTriageDisposition(view.currentCase.id, d)}
  onClear={() => clearMissionTriageDisposition(view.currentCase.id)}
/>
```

- [x] **Step 2: Sort deprioritization** — in `compareCaseViews` / `getPriorityScore`, subtract large penalty when `triageIgnored` active this week (e.g. `-500`), so ignored cases sink but remain visible.

- [x] **Step 3: Footer metrics** — `isUrgentIfDeferred`: return false when mission has active ignore disposition.

- [x] **Step 4: CasesPage test**

```ts
it('sets defer disposition from triage detail panel', async () => {
  // render CasesPage, select case, click Defer, assert disposition label / routing state via store
})
```

- [x] **Step 5: Full verification**

```bash
npm run lint
npm run test:run -- src/test/mission.intake.triage.routing.test.ts src/test/missionTriageDispositionView.test.ts src/features/cases/CasesPage.test.tsx
npm run test:run
```

---

## Risk notes (historical)

1. **`recomputeMissionRouting` overwrite** — Must merge disposition in one place; grep for other writers of `routingState`.
2. **Hydrate / save** — New fields optional; `normalizeMissionRecord` should sanitize unknown disposition.
3. **Slice 4 branch** — Rebase slice 5 on `main` after #235x merges SPE-2258 to avoid `shellStatusBarView` conflicts.
4. **Ignore vs defer** — Do not set `deferred` for ignore; otherwise front-desk “blocked or deferred” counts inflate incorrectly.

---

## Self-review (spec coverage)

| Requirement                                 | Task                                         |
| ------------------------------------------- | -------------------------------------------- |
| Route/defer/ignore distinct from assignment | Task 1 semantics + Task 4 mount above assign |
| Deferral consequential copy                 | Task 3 consequence from deferral compare     |
| Route now = planning commitment             | `shortlisted`, no `assignTeam`               |
| Ignore temporary                            | week-scoped + sort deprioritize              |
| Canonical persisted state                   | `missionRouting` fields + tests              |
| QA: save/load                               | Task 1 round-trip test (extend routing test) |

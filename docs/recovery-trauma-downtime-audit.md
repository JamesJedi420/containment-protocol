# Recovery, Trauma, & Downtime Audit — Containment Protocol

## 1. Recovery Categories
- **Physical Recovery:** Healing from injuries, wounds, or fatigue.
- **Mental Recovery:** Addressing stress, trauma, or psychological harm.
- **Trauma Recovery:** Long-term effects from critical failures, fatalities, or mission trauma.
- **Downtime Recovery:** General rest, recuperation, and non-mission activities (training, therapy, R&R).

## 1b. Expedition field staging & recovery validity (SPE-99 / SPE-1654)

- Contracts may attach an optional SPE-1654 `fieldBase` **staging packet** on `contract.fieldBase`: a `label` plus `quality` integer ladder (`safety`, `medical`, `supply`, `extractionAccess`, each 0..3) for an **in-progress** expedition case.
- `expeditionRecoveryNode` reads that packet (via `readFieldBaseFromCase`), maps `quality` to recovery modes (`unsafe_pause`, `ordinary_rest`, `active_recovery`, `sanctuary_recovery`), and scales **deployed** scalar mission fatigue accumulation in the main `advanceWeek` weekly pass. `supply` acts as the sustenance proxy for sanctuary thresholds alongside `medical` / `safety`. Exposed staging (`safety` 0) applies a bounded surcharge instead of a universal off-map reset.
- Rotation, supply scaling on mission rewards, and other SPE-1654 staging hooks live in `fieldBaseStaging.ts`; broader human energy budgeting stays on **SPE-1107**; impairment gates that block recovery stay on **SPE-1653**.
- **SPE-99 Slice B:** when `fieldBase` is present on an in-progress case, mission reward `reasons` and weekly report `teamStatus` include the resolved recovery mode (`ExpeditionRecoveryMode` in `models.ts`) and a legibility line describing deployed fatigue scaling (`formatExpeditionRecoveryLegibilityFromMode` in `expeditionRecoveryNode.ts`; player-facing strings in `data/expeditionRecoveryCopy.ts`). Weekly `teamStatus` uses week-open `recoveryLookup` (same snapshot as deployed fatigue) so legibility survives case resolution; open contract previews use staging copy (`would … if committed`). Shared builder: `sim/reportTeamStatus.ts`.

## 2. Recommended Canonical State Fields
- `agent.recoveryStatus`: { state: 'healthy' | 'recovering' | 'traumatized' | 'incapacitated', detail?: string, sinceWeek: number }
- `agent.trauma`: { traumaLevel: number, traumaTags: string[], lastEventWeek: number }
- `agent.downtimeActivity`: { activity: 'rest' | 'training' | 'therapy' | 'other' | 'coping' | 'sideWork' | 'sideWorkTrusted', sinceWeek: number, foregoneThisInterval?: … }
- `agent.downtimeSideWorkLast`: optional bounded summary of the last risky side-work resolution (SPE-1700 / SPE-1702)
- `agent.fatigue`: number (existing, but recovery/downtime should update this deterministically)
- `agent.energyBudget`: { currentReserve: number, reserveBand: 'stable' | 'taxed' | 'depleted' | 'overdrawn', exertionDebt: number, estimateConfidence: 'low' | 'medium' | 'high', lastDutyCost?: number } (SPE-1107 human energy accounting; converts overdrawn exertion into fatigue channels)
- `team.recoveryPressure`: number (aggregate of member states, for overlay/stability)

## 3. Downtime Rules & Deterministic Progression

### Downtime is active state, not empty bookkeeping (SPE-19)

Downtime weeks are **not** passive “skip” intervals. Canonical recovery modeling should include:

- **Decompression prompts** — structured off-mission processing (briefings, counseling slots, mandatory stand-downs) that consume week bandwidth.
- **Indirect / media trauma** — harm routed through broadcasts, leaks, casefile review, or second-hand exposure, not only direct field injury.
- **Positive recovery growth** — trust repair, skill consolidation, or institutional wins that only advance when downtime is spent deliberately.
- **Long-tail trust and accountability follow-through** — investigations, hearings, sponsor check-ins, or liaison obligations that extend beyond the mission tick.
- **Lingering post-crisis burden** — grief, exile, dispossession, or organizational fracture where **success still produces unresolved recovery debt**.

Victory does not automatically close the recovery ledger; model outcomes where **success coexists with exile, dispossession, or lasting fracture** as valid recovery-adjacent states.

- Downtime is a weekly phase where agents not on missions may:
  - Rest (reduce fatigue, heal minor injuries)
  - Train (improve skills, but slower if fatigued/traumatized)
  - Undergo therapy (reduce trauma, but not fatigue)
  - Other (custom activities, e.g., research, support)
- Progression is deterministic: same state + same downtime plan = same outcome.
- **SPE-1699 — one primary slot per operative per week:** player menu picks (`rest`, `therapy`, `coping`, `other`, `sideWork`, `sideWorkTrusted`) are mutually exclusive for a given week. Formal **academy training** (`assignment.state === 'training'`) consumes the same slot; week-close writes `foregoneThisInterval` listing other menu actions not taken (full menu when training overrides). `other` is a compact logistics / prep placeholder. **`sideWork`** is the SPE-1700 risky off-books courier slice; **`sideWorkTrusted`** is the SPE-1702 higher-tier relay (prerequisite-gated). Selection UI: Teams roster; tick wiring unchanged (`advanceRecoveryDowntimeForWeek` after mission finalization).
- Recovery rates and trauma reduction must be explicit, not random.
- Downtime cannot erase major trauma instantly; recovery is gradual and stateful.
- SPE-1107 energy reserve is charged by deterministic duty/upkeep costs before it becomes fatigue; idle rest can restore taxed/depleted reserve after upkeep, while overdrawn reserve becomes explicit exertion debt and physical fatigue burden rather than a hidden recovery reset.

### 3b. SPE-1653 slice — exposure residue (recovery gate)

- **Flag:** `exposure:residue` on `agent.vitals.statusFlags` (compact deterministic impairment).
- **When it applies:** anomaly-tagged case context and mission **fail** without injury, **or** any **injury** on an anomaly-tagged case (`applyMissionResolutionAgentMutations`).
- **Rest channel:** while the flag is present, ordinary **rest** does not reduce fatigue and applies a small bounded weekly fatigue recurrence until the gate clears.
- **Therapy channel:** trauma reduction from **therapy** downtime proceeds at full rate; fatigue recovery from therapy is **partial** while the flag remains (split recovery channels).
- **Clearance:** one week of **therapy** downtime while agency `supportStaff.medical` meets `RECOVERY_CALIBRATION.exposureResidueMedicalClearThreshold` strips the flag (supervised washdown / decontamination).
- **Assignment recovery:** `advanceRecoveryAgentsForWeek` withholds injury discharge to active duty until the flag is cleared, even after injury-duration weeks elapse. Writes merge from `nextAgents[agentId]` (then `updatedAgents`) when present so earlier week-open mutations are not dropped when appending the blocked-discharge history entry.
- **Tick wiring:** `advanceRecoveryDowntimeForWeek` runs at end of `advanceWeek` after mission finalization; per-agent **effective** downtime is resolved per §3c (`resolveDowntimeSlotForAgent`), with the weekly map defaulting from the resolver (menu default **rest** when unset).

### 3c. SPE-1699 slice — one-slot downtime (recovery menu vs academy training)

- **Rule:** at most one **primary** downtime action applies per agent per weekly tick. Player-selectable recovery-phase actions are `rest`, `therapy`, `coping`, `other`, `sideWork`, `sideWorkTrusted` (see Teams UI). **Academy training queue** activity (`assignment.state === 'training'`) **wins** over any stored menu pick and clears competing recovery uses for that tick.
- **Ordering:** `advanceWeek` captures each agent’s resolved effective slot at the **start** of `advanceQueues` (before `advanceTrainingQueues` removes completed programs from the queue and clears `assignment.state`), then `applyRecoveryDowntimeAfterMissions` consumes that snapshot. This keeps the **final week** of a training program on the `training` slot instead of incorrectly falling through to menu/`rest` after completion processing.
- **Evidence:** `resolveDowntimeSlotForAgent` in `downtimeSlot.ts`; `advanceWeek` snapshot on `WeeklyExecutionContext.downtimeSlotEffectiveByAgentId`; `advanceRecoveryDowntimeForWeek` persists `foregoneThisInterval` on `agent.downtimeActivity`. Tests: `src/test/downtimeSlot.test.ts`.

### 3d. SPE-1701 slice — deployment carry-in (readiness, first contract week)

- **Stamp:** when teams are committed to an `in_progress` case (`assignTeam`, `launchMajorIncident`, and `unassignTeam` rebuilds), `rebuildDeploymentCarryInForCase` writes `case.deploymentCarryInByAgentId` from each assigned operative’s post-downtime fields (`downtimeActivity` incl. `foregoneThisInterval`, `recoveryStatus`, `trauma`, `vitals` / `exposure:residue`, `energyBudget`, scalar `fatigue`). **SPE-1654 field-base staging rotation** (`applyFieldBaseStagingRotationAtWeekOpen`) also rebuilds carry-in after a successful swap so mid-contract roster changes cannot leave stale or missing stamps during the first contract week.
- **Consume:** `buildTeamDeploymentReadinessState` adds a **bounded** summed readiness adjustment **only** while `weeksRemaining === durationWeeks` (first in-contract week), so carry-in does not stack with later-week readiness passes.
- **Paths (slice 1):** `off-books-courier-lockout` (negative) when the courier lockout tag is present — **evaluated before** residue/therapy so side-work access loss is not masked by overlapping exposure residue; `residue-therapy-foregone` (negative) when residue is present and therapy was listed as foregone; `well-rested-stable-energy` (positive) for a `rest` week with `energyBudget.reserveBand === 'stable'`, low fatigue, healthy recovery, no trauma, and no residue (lockout tag prevents this bonus). Constants: `DOWNTIME_CARRY_IN_CALIBRATION` in `calibration.ts`. Logic: `computeDowntimeCarryInForAgent` in `downtimeCarryIn.ts`.
- **Evidence:** tests `src/test/downtimeCarryIn.test.ts`, `src/test/fieldBaseStaging.test.ts` (rotation + carry-in sync); developer overlay surfaces `caseDeploymentCarryInByAgentId` on deployment summaries.

### 3e. SPE-1700 slice — risky side-work (off-books courier)

- **Menu:** `sideWork` uses the same weekly primary slot as SPE-1699; it cannot stack with training, therapy, rest, coping, `other`, or `sideWorkTrusted` in the same tick.
- **Resolution:** `resolveOffBooksCourierSideWork` in `downtimeSideWork.ts` (calibration `SIDE_WORK_CALIBRATION`). Success grants bounded `agency.funding`, adds fatigue, and appends **`exposure:residue`** so SPE-1653 / SPE-1701 residue-therapy carry-in can apply on the next assignment. A **high pre-week fatigue** branch skips payout, spikes fatigue, and stamps tag `side-work-lockout:off-books-courier` (Teams select disabled afterward for **both** courier menu picks). Successful **paid** runs also stamp compact prerequisite tag `side-work-prereq:off-books-courier-paid` (SPE-1702 unlock). If `sideWork` is still stored while locked out, week-close recovery **coerces** the effective slot to `rest`, stamps `downtimeSideWorkLast.outcome === 'denied'`, and skips courier events.
- **Wiring:** `advanceRecoveryDowntimeForWeek` applies mutations and emits `staff.side_work.resolved`; `advanceWeek` merges optional `agencyFundingDelta` onto **both** top-level `funding` and `agency.funding` so weekly agency metrics do not drop the payout.
- **Evidence:** `src/test/downtimeSideWork.test.ts`; developer overlay includes `downtimeSideWorkLast`.

### 3f. SPE-1702 slice — prerequisite-gated trusted courier relay

- **Menu:** `sideWorkTrusted` shares the SPE-1699 primary slot; mutually exclusive with `sideWork` and the rest of the recovery menu.
- **Prerequisite:** tag `side-work-prereq:off-books-courier-paid` (stamped automatically on any **paid** off-books courier resolution). Teams disables the option with an explicit **title** string when the tag is missing or when courier **lockout** applies (lockout takes precedence in copy order).
- **Resolution:** `resolveTrustedCourierSideWork` — bounded **higher** `agency.funding` and fatigue deltas than base courier, **stricter** high-fatigue lockout threshold (`trustedCourierHighFatigueThreshold`), same exposure residue on success, and the **same** `side-work-lockout:off-books-courier` tag on lockout so SPE-1701 carry-in and Teams gating stay unified. Persisted `sideWorkTrusted` while ineligible is coerced to `rest` with `downtimeSideWorkLast.outcome === 'denied'` / `optionId: 'trustedCourier'` (mirrors SPE-1700 denied path).
- **Evidence:** `src/test/downtimeSideWork.test.ts` (SPE-1702 section); helper `isInactiveSideWorkResolution` for deterministic inactive previews.

### 3g. SPE-1703a — courier shell front (agency investment loop, first slice)

- **State:** optional `agency.courierShellFront` with `type: 'courierShell'`, `status` (`active` \| `strained` \| `collapsed`), `startedWeek`, `startupCostPaid`, optional `lastResolvedWeek` / `lastNet`, `exposureBand`, optional `collapseReason`.
- **Open:** `openCourierShellFront` in `frontBusiness.ts` — requires **≥1** operative with prerequisite tag `side-work-prereq:off-books-courier-paid` (SPE-1702 path), sufficient top-level `funding`, and **no** existing shell record; debits `FRONT_BUSINESS_CALIBRATION.courierShellStartupCost` from **`funding`** (normalized mirror updates `agency.funding`). Store action `openCourierShellFront` appends `agency.front_business.opened` when spend succeeds.
- **Weekly resolve:** `applyCourierShellFrontWeeklyResolution` in `advanceWeek.ts` runs **after** `applyRecoveryDowntimeAfterMissions` so roster tags / residue / funding pressure reflect the closing week. Pure resolver `resolveCourierShellFrontWeekly` — deterministic **net** from compact risk score (`lockout` count ×2 + `exposure:residue` agent count + canonical `budgetPressure`). **Idempotent** via `lastResolvedWeek === closedWeek`. Emits `agency.front_business.resolved`.
- **Collapse:** when risk ≥ `courierShellCollapseRiskThreshold`, status becomes `collapsed`, `collapseReason: 'overstretched'`, and `FundingState.courierShellBudgetPressureDebt` is set to `courierShellCollapseBudgetPressureDebt` so `recomputeBudgetPressure` adds a **bounded** persistent pressure offset (not a loan simulator). `canonicalizeAgencyState` in `advanceWeek.ts` **preserves** `courierShellFront`, `fundingState`, and `progressionUnlockIds` through the weekly agency normalization seam.
- **Evidence:** `src/test/frontBusiness.test.ts`; developer overlay **Courier shell front (SPE-1703a)** section.

### 3h. SPE-823a — courier network capacity gap (read-only derived report)

- **Report:** `buildCourierNetworkCapacityGapReport` in `capabilityGap.ts` — single family `courierNetworkCapacity`, static scenario id `spe-823a-logistics-baseline` with calibration thresholds `requiredCapacity` vs `desiredFutureCapacity` in `COURIER_NETWORK_CAPACITY_GAP_CALIBRATION`.
- **Current score:** derived from courier shell status (when present), informal baseline + paid courier prerequisite, compact risk breakdown (`getCourierShellRiskBreakdown`), and optional pending procurement order count — **not** written back to `GameState`.
- **Gap kinds:** `below_required` (immediate shortfall), `below_desired_only` (meets immediate threshold but under structural target), `none`. `unresolved` stays true while current is below **desired**; listing mitigation hooks does **not** clear it.
- **Mitigation hooks:** compact data records only (`front_business_investment`, `procurement`, `mutual_aid`); include delayed-payoff metadata on investment/procurement hooks; **no** automatic gap resolution.
- **Evidence:** `src/test/capabilityGap.test.ts`; developer overlay **Capability gap — courier network (SPE-823a)** section; Front Desk hub **Logistics opportunity** card (`frontDeskView.ts` / `FrontDeskPage.tsx`) projects the same read-only report for players when a gap is unresolved.

## 4. Trauma & Readiness-Impact Rules
- Trauma increases from mission failures, fatalities, or critical weakest-link outcomes.
- High trauma reduces deployment readiness, training efficiency, and recovery speed.
- Readiness is a function of fatigue, trauma, and recovery status.
- Agents with high trauma may be blocked from deployment or require downtime/therapy.
- Trauma can have tags (e.g., 'panic', 'guilt', 'injury') for narrative/overlay.

## 5. Integration Points
- **Weakest-Link Outcomes:**
  - Severe penalties (e.g., 'fail', 'critical') increase trauma, may trigger recovery state changes.
  - Recovery pressure from weakest-link is aggregated at team/agency level for overlays.
- **Deployment Readiness:**
  - Readiness checks must consider trauma and recovery state, not just fatigue.
- **Responder Energy Budget:**
  - Idle upkeep, duty activity, and post-mission exertion debt are accounted for before they feed existing fatigue/readiness consumers.
- **Training:**
  - Training is less effective or blocked for agents with high trauma or in recovery.
- **Teams:**
  - Team recovery pressure is the sum of member trauma/recovery needs; impacts stability overlays.
- **Attrition:**
  - High trauma or failed recovery can lead to agent attrition (resignation, incapacitation).
- **Save/Load:**
  - All recovery/trauma/downtime state must be serializable and stable across saves.
- **Overlay:**
  - Developer overlays should surface trauma, recovery, and downtime state for inspection.
- **Stability Checks:**
  - State transitions (e.g., healthy → traumatized) must be explicit and testable.

## 6. Common Pitfalls
- Implicit or random recovery/trauma changes (breaks determinism).
- Failing to serialize/restore trauma/recovery state (save/load bugs).
- Overlapping or conflicting state fields (e.g., fatigue vs. trauma vs. recoveryStatus).
- Ignoring trauma/readiness in deployment or training logic.
- Allowing instant trauma removal or recovery (should be gradual).
- Not surfacing trauma/recovery in overlays or debug tools.

## 7. Open Questions
- What are the canonical trauma tags and their gameplay effects?
- Should trauma be capped, or can it accumulate indefinitely?
- How do therapy and rest interact if both are assigned as downtime? **(SPE-1699: only one primary menu action per week; see §3c.)**
- What are the thresholds for blocking deployment or training due to trauma?
- How should recovery interact with agent relationships and team chemistry?
- Should trauma have narrative consequences (e.g., unique events, dialogue)?
- How to handle edge cases (e.g., agent is both injured and traumatized)?

---

### Summary
- **Files created:** `docs/recovery-trauma-downtime-audit.md`
- **Runtime code changed:** No
- **Overlap risks:** None; documentation-only, no symbol or logic changes, no test edits.

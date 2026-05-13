# Recovery, Trauma, & Downtime Audit — Containment Protocol

## 1. Recovery Categories
- **Physical Recovery:** Healing from injuries, wounds, or fatigue.
- **Mental Recovery:** Addressing stress, trauma, or psychological harm.
- **Trauma Recovery:** Long-term effects from critical failures, fatalities, or mission trauma.
- **Downtime Recovery:** General rest, recuperation, and non-mission activities (training, therapy, R&R).

## 2. Recommended Canonical State Fields
- `agent.recoveryStatus`: { state: 'healthy' | 'recovering' | 'traumatized' | 'incapacitated', detail?: string, sinceWeek: number }
- `agent.trauma`: { traumaLevel: number, traumaTags: string[], lastEventWeek: number }
- `agent.downtimeActivity`: { activity: 'rest' | 'training' | 'therapy' | 'other', sinceWeek: number }
- `agent.fatigue`: number (existing, but recovery/downtime should update this deterministically)
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
- Recovery rates and trauma reduction must be explicit, not random.
- Downtime cannot erase major trauma instantly; recovery is gradual and stateful.

### 3b. SPE-1653 slice — exposure residue (recovery gate)

- **Flag:** `exposure:residue` on `agent.vitals.statusFlags` (compact deterministic impairment).
- **When it applies:** anomaly-tagged case context and mission **fail** without injury, **or** any **injury** on an anomaly-tagged case (`applyMissionResolutionAgentMutations`).
- **Rest channel:** while the flag is present, ordinary **rest** does not reduce fatigue and applies a small bounded weekly fatigue recurrence until the gate clears.
- **Therapy channel:** trauma reduction from **therapy** downtime proceeds at full rate; fatigue recovery from therapy is **partial** while the flag remains (split recovery channels).
- **Clearance:** one week of **therapy** downtime while agency `supportStaff.medical` meets `RECOVERY_CALIBRATION.exposureResidueMedicalClearThreshold` strips the flag (supervised washdown / decontamination).
- **Assignment recovery:** `advanceRecoveryAgentsForWeek` withholds injury discharge to active duty until the flag is cleared, even after injury-duration weeks elapse.
- **Tick wiring:** `advanceRecoveryDowntimeForWeek` runs at end of `advanceWeek` after mission finalization; per-agent downtime selection defaults from `agent.downtimeActivity?.activity` or **rest**.

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
- How do therapy and rest interact if both are assigned as downtime?
- What are the thresholds for blocking deployment or training due to trauma?
- How should recovery interact with agent relationships and team chemistry?
- Should trauma have narrative consequences (e.g., unique events, dialogue)?
- How to handle edge cases (e.g., agent is both injured and traumatized)?

---

### Summary
- **Files created:** `docs/recovery-trauma-downtime-audit.md`
- **Runtime code changed:** No
- **Overlap risks:** None; documentation-only, no symbol or logic changes, no test edits.

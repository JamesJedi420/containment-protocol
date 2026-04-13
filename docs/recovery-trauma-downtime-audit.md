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
- Downtime is a weekly phase where agents not on missions may:
  - Rest (reduce fatigue, heal minor injuries)
  - Train (improve skills, but slower if fatigued/traumatized)
  - Undergo therapy (reduce trauma, but not fatigue)
  - Other (custom activities, e.g., research, support)
- Progression is deterministic: same state + same downtime plan = same outcome.
- Recovery rates and trauma reduction must be explicit, not random.
- Downtime cannot erase major trauma instantly; recovery is gradual and stateful.

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

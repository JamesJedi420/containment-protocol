# Escalation, Threat Drift, & Time Pressure System — Design Note

## 1. Escalation Categories
- **Case/Mission Escalation:** Severity increase for unresolved or mishandled cases (e.g., minor incident → major incident).
- **Threat Drift:** Gradual increase in baseline threat level for ongoing or neglected cases.
- **Time Pressure:** Penalties or risk multipliers as deadlines approach or are exceeded.
- **Global Escalation:** Agency-wide or campaign-level pressure (e.g., rising incident frequency, global threat level).
- **Team/Agent Escalation:** Individual or team stress, fatigue, or trauma from repeated exposure to high-pressure situations.

## 2. Recommended Canonical Escalation State Fields
- `case.escalationLevel: number | enum` — Current escalation tier for a case/mission.
- `case.threatDrift: number` — Accumulated threat increase due to time or events.
- `case.timePressure: number` — Derived from deadline proximity or overruns.
- `case.deadline: number` — Absolute or relative week/cycle deadline.
- `case.unresolvedWeeks: number` — Consecutive weeks unresolved.
- `team.timePressure: number` — Aggregate time pressure from assigned cases.
- `game.globalEscalation: number` — Aggregate campaign/global escalation score.

## 3. Threat Drift and Time-Pressure Progression Rules
- Each unresolved week, increment `case.threatDrift` by a deterministic or random value.
- As `case.deadline` approaches, increase `case.timePressure` (e.g., linear or exponential ramp).
- If `case.unresolvedWeeks` exceeds threshold, escalate `case.escalationLevel` and/or trigger incident.
- Threat drift may increase required team power, risk of negative outcomes, or unlock new threats.

## 4. Deadline and Unresolved-Case Pressure Rules
- If `case.deadline` is exceeded, apply penalty: escalate, spawn new threats, or increase global pressure.
- Unresolved cases contribute to `team.timePressure` and `game.globalEscalation`.
- Cases with high `threatDrift` or `timePressure` may block deployment, reduce rewards, or increase trauma risk.

## 5. Integration Points
- **Mission Intake/Routing:** Use escalation and time-pressure to prioritize, block, or reroute cases.
- **Deployment:** Teams may refuse, fail, or suffer penalties on high-escalation/time-pressure cases.
- **Weakest-Link Outcomes:** High pressure increases risk of weakest-link failures or agent trauma.
- **Recovery:** Escalation and time-pressure may increase recovery time or trauma severity.
- **Teams:** Aggregate team pressure for readiness, morale, and stability overlays.
- **Save/Load:** Persist all escalation, drift, and pressure fields for deterministic replays.
- **Overlay/Debug:** Surface escalation, drift, and pressure in developer and player overlays.
- **Stability Checks:** Clamp, validate, and normalize escalation fields to prevent runaway values.

## 6. Common Pitfalls
- Failing to reset or clamp escalation/drift fields on case resolution or removal.
- Non-deterministic progression (e.g., random drift without seed control).
- Overlapping or redundant pressure fields (e.g., both `threatDrift` and `escalationLevel` driving the same logic).
- Not surfacing escalation/pressure in overlays, leading to invisible failure states.
- Forgetting to persist new fields in save/load logic.

## 7. Open Questions
- Should escalation be capped, or can it trigger game-losing states?
- How should global escalation interact with agency-level events or campaign arcs?
- What is the best progression curve for threat drift and time pressure (linear, exponential, stepwise)?
- Should time pressure affect agent/roster morale or only case outcomes?
- How to best visualize escalation and pressure for players and developers?

---

### Summary
- **Files created:** `docs/escalation-threat-drift-time-pressure-audit.md`
- **Runtime code changed:** No
- **Overlap risks:** None; documentation-only, no symbol or logic changes.

# Operative Attrition, Loss, & Replacement Pressure — Design Audit

## 1. Attrition Categories
- **Voluntary Attrition**: Resignation, retirement, transfer, or morale-driven exit.
- **Involuntary Attrition**: Fatality, permanent injury, medical discharge, forced removal.
- **Temporary Loss**: Extended recovery, trauma, suspension, or leave.
- **Disappearance/Unknown**: MIA, abduction, or narrative-driven loss.

## 2. Recommended Canonical State Fields
- `operativesLost: number`
- `operativesAttrited: number`
- `operativesReplaced: number`
- `operativeLossHistory: Array<{ week: number, agentId: string, kind: 'fatality'|'attrition'|'disappearance'|'medical'|'voluntary', reason: string, teamId?: string }>`
- `replacementPressure: number`
- `staffingGap: number`
- `activeStaffingShortfall: number`
- `pendingReplacementRequests: Array<{ week: number, role: string, requestedBy: string, status: 'open'|'filled'|'cancelled' }>`

## 3. Deterministic Attrition and Loss Progression Rules
- All attrition/loss events must be explicit, logged, and source-attributable.
- Attrition is triggered by deterministic outcomes: mission fatality, weakest-link failure, unresolved trauma, or explicit resignation.
- Temporary loss is tracked with explicit duration and recovery path.
- No silent removal: all removals must update canonical state and history.
- Losses update `operativeLossHistory` and increment relevant counters.
- Attrition and loss must be processed before recruitment or replacement actions.

## 4. Replacement Pressure and Staffing-Gap Rules
- `replacementPressure` increases with cumulative attrition/loss, unresolved staffing gaps, or repeated failed recruitment.
- `staffingGap` is the difference between required and available operatives for all active teams/roles.
- `activeStaffingShortfall` tracks unfilled critical roles (e.g., team leader, medic).
- Pending replacement requests are explicit, with deterministic status transitions.
- Replacement pressure may impact funding, morale, or operational readiness if integrated.

## 5. Integration Points
- **Recruitment**: Attrition/loss triggers new recruitment or replacement requests; recruitment pipeline must reference staffing gap and pressure.
- **Training**: Replacement operatives may require expedited or remedial training; training backlog may increase replacement pressure.
- **Teams**: Team composition and readiness must reflect attrition/loss; weakest-link logic must update loss state.
- **Deployment**: Losses during deployment update attrition state and may trigger immediate replacement logic.
- **Weakest-Link Outcomes**: Fatalities or removals from weakest-link resolution must update loss/attrition state.
- **Recovery**: Extended recovery is tracked as temporary loss; unresolved recovery may escalate to attrition.
- **Escalation**: High attrition or loss rates may trigger escalation events or narrative consequences.
- **Funding**: Replacement pressure may increase costs or trigger penalties/grants.
- **Save/Load**: All attrition/loss/replacement state must be persisted and validated on load.
- **Overlay/Debug**: Attrition, loss, and replacement pressure must be inspectable in developer overlays and debug tools.
- **Stability Checks**: Impossible states (e.g., negative operatives, duplicate removals, unfillable gaps) must be surfaced to stability/debug tooling.

## 6. Common Pitfalls
- Silent or implicit removals not logged in canonical state.
- Failing to update all relevant counters/history on loss/attrition.
- Allowing negative or duplicate staffing gaps.
- Not surfacing impossible or contradictory states on load.
- Overlapping or conflicting replacement requests.
- Ignoring temporary loss in staffing calculations.

## 7. Open Questions
- Should replacement pressure have direct gameplay effects (e.g., morale, funding, event triggers), or remain a debug/overlay metric?
- How should narrative-driven losses (e.g., MIA, abduction) interact with deterministic attrition state?
- What is the policy for partial replacements (e.g., multi-role operatives, cross-training)?
- Should replacement requests be auto-generated or require explicit player/AI action?
- How should attrition interact with long-term agent progression or legacy systems?

---

### Summary
- **Files created:** `docs/operative-attrition-loss-replacement-audit.md`
- **Runtime code changed:** No
- **Overlap risks:** None; documentation-only, no runtime or test files modified.

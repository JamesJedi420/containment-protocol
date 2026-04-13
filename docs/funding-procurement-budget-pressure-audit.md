
# Funding, Procurement, & Budget Pressure — Design Audit

## 1. Funding Categories

- **Base Funding:** Recurring weekly/periodic income (e.g., agency stipend, government grant).
- **Mission Rewards:** Funding from successful case/mission resolution.
- **Procurement/Contracts:** Funding from external contracts, side operations, or procurement deals.
- **Penalties:** Deductions for failures, unresolved cases, or negative events.
- **One-Time Grants:** Special event, escalation, or narrative-driven funding infusions.
- **Market Transactions:** Funding spent/earned via market, trading, or black-market actions.

## 2. Recommended Canonical State Fields

- `funding: number` — Current available funds.
- `fundingBasePerWeek: number` — Recurring base income.
- `fundingPerResolution: number` — Income per resolved case/mission.
- `fundingPenaltyPerFail: number` — Penalty per failed case/mission.
- `fundingPenaltyPerUnresolved: number` — Penalty per unresolved case/mission.
- `fundingHistory: Array<{ week: number, delta: number, reason: string }>` — Audit log for overlays/debug.
- `procurementBacklog: Array<{ itemId: string, quantity: number, status: 'pending'|'fulfilled'|'cancelled', requestedWeek: number, fulfilledWeek?: number }>`
- `budgetPressure: number` — Derived metric for overlays/stability (e.g., negative funding, missed payments).

## 3. Deterministic Income, Expense, and Budget-Pressure Rules

- **Income:**
  - Add `fundingBasePerWeek` at the start of each week.
  - Add `fundingPerResolution` for each successfully resolved case/mission.
  - Add one-time grants as explicit, logged events.
- **Expenses:**
  - Deduct procurement costs when orders are placed or fulfilled (choose one, but be consistent).
  - Deduct penalties for failed/unresolved cases at resolution.
  - Deduct recurring costs (e.g., staff salaries, facility upkeep) at fixed intervals.
- **Budget Pressure:**
  - If `funding < 0`, increment `budgetPressure` and surface warnings.
  - If procurement backlog grows or payments are missed, increment `budgetPressure`.
  - Clamp/validate all funding changes for determinism and save/load safety.

## 4. Procurement Rules and Gating Guidance

- **Order Placement:**
  - Only allow procurement if sufficient funding is available (unless negative balances are allowed by design).
  - Queue orders in `procurementBacklog` with status `pending`.
- **Fulfillment:**
  - Fulfill orders after a deterministic delay or upon explicit event.
  - Update status to `fulfilled`, deduct funding if not already deducted.
- **Gating:**
  - Gate high-tier/prototype items by research, facility, or narrative unlocks.
  - Enforce per-week or per-category procurement caps for scarcity.

## 5. Scarcity, Tradeoff, and Backlog-Pressure Guidance

- **Scarcity:**
  - Use limited funding, procurement caps, and market scarcity to force tradeoffs.
- **Tradeoffs:**
  - Require players to choose between upgrades, gear, training, and recovery investments.
- **Backlog Pressure:**
  - Surface growing procurement backlogs and negative funding as explicit overlays/debug warnings.
  - Penalize excessive backlog or negative funding with operational penalties (e.g., reduced readiness, morale).

## 6. Integration Points

- **Recruitment:** Funding required for new hires, candidate evaluation, and onboarding.
- **Loadouts:** Gear/equipment purchases gated by funding and procurement rules.
- **Training:** Training programs may have funding/material costs.
- **Research:** Research projects may consume funding, materials, or data.
- **Facilities:** Upgrades and maintenance require funding; facility effects may impact funding or procurement.
- **Teams/Deployment:** Deployment costs, mission expenses, and recovery may consume funding.
- **Recovery:** Medical/recovery actions may have explicit costs.
- **Escalation:** Escalation events may increase costs or reduce income.
- **Save/Load:** Funding, procurement, and budget-pressure state must be persisted and validated on hydrate.
- **Overlay/Debug:** Funding and procurement history, backlog, and pressure should be inspectable in overlays/dev tools.
- **Stability Checks:** Detect and surface impossible/invalid funding states (e.g., negative funding with fulfilled orders).

## 7. Common Pitfalls

- Silent auto-correction of negative funding or backlog (should always surface as warnings/errors).
- Non-deterministic funding changes (e.g., random market events without explicit triggers).
- Failing to persist or validate funding/procurement state on save/load.
- Allowing procurement or upgrades without sufficient funding (unless by design).
- Not surfacing budget pressure or backlog to overlays/debug/dev tools.

## 8. Open Questions

- Should negative funding be allowed, and if so, what are the operational consequences?
- Should procurement costs be deducted at order placement or fulfillment?
- How should market scarcity and price fluctuation be modeled deterministically?
- What are the escalation triggers for budget pressure penalties?
- Should there be a hard cap on procurement backlog or negative funding?

---

### Summary

- **Files created:** `docs/funding-procurement-budget-pressure-audit.md`
- **Runtime code changed:** No
- **Overlap risks:** None; documentation-only, no runtime or test changes.

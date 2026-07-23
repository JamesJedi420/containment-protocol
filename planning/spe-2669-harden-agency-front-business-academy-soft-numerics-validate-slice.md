# SPE-2669 — Harden agency.front_business.* + system.academy_upgraded soft numerics at validate

**Linear:** [SPE-2669](https://linear.app/spectranoir/issue/SPE-2669/harden-agencyfront-business-systemacademy-upgraded-soft-numerics-at)  
**Branch:** `jamesdyedbq/spe-2669-harden-agencyfront_business-systemacademy_upgraded-soft`

## Goal

Reject non-finite / invalid soft numerics on `agency.front_business.opened`, `agency.front_business.resolved`, and `system.academy_upgraded` at the validation boundary, matching hydrate sanitize floors without changing hydrate rewrite policy.

Follow-on from SPE-2668 Deferred (agency front-business / academy soft numerics).

## Scope

- Harden inline front-business schemas + `systemAcademyUpgradedSchema` in `src/domain/events/eventValidation.ts`
- **Opened:** `startupCost` finite nonnegative int; `fundingBefore` / `fundingAfter` finite numerics
- **Resolved:** `fundingDelta` finite signed (hydrate min -10_000); `riskScore` / `lockoutCount` / `residueCount` / `budgetPressure` finite nonnegative ints
- **Academy:** `fundingBefore` / `fundingAfter` finite; `cost` / `tierBefore` / `tierAfter` finite nonnegative ints
- Do **not** change hydrate sanitize/reconcile rewrite (`runTransfer.ts` cases ~8387–8448 / `reconcileAcademyUpgradeFields`)
- Targeted validation tests; fixture update only if needed

## Out of scope

- Hydrate sanitize / reconcile rewrite policy
- `staff.side_work` / infiltration soft numerics (not scoped in same pass)
- `agency.containment_updated` (done SPE-2668)
- `market.*` / `production.queue_*` already-hardened events (SPE-2659–2666)
- Opaque production hydrate rewrite (SPE-2664 Deferred keep-current)
- UI / feed rendering
- SCHEMA_REGISTRY expansion
- SPE-2667 delayed market order hydration (separate open PR #3245)

## Acceptance

- Reject non-finite funding/cost/score fields (NaN, Infinity) on front-business opened/resolved and academy_upgraded
- Reject invalid nonnegative-int fields where hydrate floors require (NaN, Infinity, negative, fractional)
- Accept producer-aligned fixtures including negative `fundingDelta` on resolved
- Leave unrelated agency / staff / infiltration events alone
- Hydrate rewrite policy unchanged

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Opaque production hydrate rewrite of queue recipe ids | keep current (SPE-2664 Deferred) | Validate-only; hydrate reconcile stays opaque-id tolerant. |
| `staff.side_work.resolved` / infiltration soft numerics at validate | follow-on (unnamed) | Out of this slice; same validate-harden pattern when prioritized. |

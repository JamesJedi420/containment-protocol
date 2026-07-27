# SPE-2718 — Status upkeep / public-display costs for agency ranking

**Linear:** [SPE-2718](https://linear.app/spectranoir/issue/SPE-2718/spe-39-status-upkeep-public-display-costs-for-agency-ranking)  
**Parent:** [SPE-39](https://linear.app/spectranoir/issue/SPE-39/agency-standing-rankings-and-rival-pressure-layer) (stays **Backlog**/open after merge)  
**Branch:** `jamesdyedbq/spe-2718-spe-39-status-upkeep-public-display-ranking`  
**Base:** `main` @ `702f5aaec2de665fdcc664d834fb2b2fd0c2a400`

## Goal

One deterministic bounded status upkeep / public-display cost path from SPE-28 weekly facility upkeep into comparative ranking (penalty and/or blocked week standing gains when underfunded), with a player-legible week-close note + agency summary — closes parent SPE-39 residual for presentation-dependent rank change.

## Acceptance (this slice)

- [x] Upkeep paid / adequate (pre-cost funding ≥ operating cost) → no ranking penalty; standing gain scale 1
- [x] Underfunded (pre-cost funding < operating cost) → bounded ranking penalty + week standing gains blocked in ranking composition only
- [x] Identical funding-history + award inputs → identical rank delta
- [x] SPE-2696 award records on events unchanged when upkeep is unpaid
- [x] Week-close note when underfunded; agency/report summary exposes band
- [x] SPE-2699 pressure unchanged for same ranking inputs when upkeep is neutral (maintained)
- [x] Docs updated; SCHEMA_REGISTRY documents agency week-close adequacy markers
- [x] SPE-2699–2716 rival/interference/coordination math untouched; legitimacy.sanctionLevel not reinterpreted as operational cover
- [x] Real `advanceWeek` path detects underfunded despite post-cost funding clamp ≥ 0

## Implementation notes

| Area | Anchor |
| --- | --- |
| Domain | `src/domain/statusUpkeepDisplayCost.ts` — affordability from pre-operating-cost funding |
| Ranking | `src/domain/rankings.ts` — note metadata first, then funding-history fallback |
| Agency markers | `lastStatusUpkeepWeek` / `Band` / `FundingBefore` / `OperatingCost` |
| Week-close notes | `statusUpkeepDisplayWeeklyReportNotes` — `agency.status_upkeep_display` for maintained + underfunded |
| Agency / UI | `buildAgencySummary`, `reportView`, `RankingsPage` breakdown row |
| Docs | `systems/hub-simulation.md`, `SCHEMA_REGISTRY.md` |
| Tests | `src/test/statusUpkeepDisplayCost.test.ts` (+ rankings / rivalPressure + advanceWeek) |

**Legitimacy note:** `legitimacy.sanctionLevel` remains institutional sanction / cover posture gating (SPE-53 legitimacy pass). This slice is ranking presentation cost only — not a new operational-cover field.

Public-display cost anchor = facility upkeep base + spike (payroll excluded). Adequacy = pre-cost funding vs full SPE-28 weekly operating cost (week-close clamps post-cost funding to ≥ 0, so markers/notes carry the true shortfall signal).

## Out of scope

- SPE-2699–2716 rival/interference/coordination formula changes
- SPE-854 verification core
- Full competitor org / PR marketing sim
- Open confrontation / cell-raid ops
- Splitting `LegitimacyState` into separate institutional vs operational-cover fields

## Deferred

| Item | Suggested owner | Why deferred |
| --- | --- | --- |
| Institutional legitimacy vs operational cover field split | SPE-39 / legitimacy follow-up | sanctionLevel already gates; separate fields are larger than ranking upkeep |
| Open confrontation / cell raid after imminent narrowing | SPE-39 / ops follow-up | SPE-2714 deferred mission surface |
| Continuous-presentation small ranking gain when surplus-funded | SPE-39 follow-up | Paid path ships as no-penalty (neutral) for SPE-2699 clarity |

## Validation

- `npm run test:run -- src/test/statusUpkeepDisplayCost.test.ts src/test/rankings.test.ts src/test/rivalPressure.test.ts src/test/reportNoteTypeAudit.test.ts`
- `npm run lint`

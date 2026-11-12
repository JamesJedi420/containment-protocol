# SPE-31 — Parent acceptance reconciliation (grooming)

One-page grooming record. Parent [SPE-31](https://linear.app/spectranoir/issue/SPE-31) **Done** — original hub shell, SPE-31a courier card, and children [SPE-2465](https://linear.app/spectranoir/issue/SPE-2465)–[SPE-2469](https://linear.app/spectranoir/issue/SPE-2469) shipped; parent AC rows 1–6 **Yes**.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-31 parent reconciliation (hygiene slice)                                                               |
| **Parent** | [SPE-31](https://linear.app/spectranoir/issue/SPE-31) — Operations hub opportunity surface; **Done**       |
| **Branch** | `spe-31-parent-reconciliation` (docs-only; optional PR)                                                    |
| **Status** | **Shipped** — hygiene session (docs-only)                                                                  |
| **Base `main` SHA** | `dd80cb5d`                                                                                          |

## Goal

Re-evaluate parent [SPE-31](https://linear.app/spectranoir/issue/SPE-31) acceptance criteria after the original hub-shell pass, SPE-31a courier-capacity card, and Front Desk / contract-generation children SPE-2465–SPE-2469. Confirm parent **Done** only when all AC rows are evidenced — not on hub-shell or single-card work alone. Docs + Linear hygiene only.

## Prerequisite (on `main` @ `dd80cb5d`)

| Layer | Anchor |
| --- | --- |
| Hub shell + operational summaries | Original SPE-31 pass — `FrontDeskPage`, `getFrontDeskHubView` |
| Courier capacity opportunity | SPE-31a — PR #1795 — `buildCourierCapacityOpportunityCard` |
| Procurement / staffing opportunity cards | Prior SPE-31 follow-ons — `buildProcurementPressureOpportunityCard`, `buildStaffingReadinessOpportunityCard` |
| Tag-conflict / value-stream lead | [SPE-2465](https://linear.app/spectranoir/issue/SPE-2465) — PR #2848 — `buildTagConflictValueStreamOpportunityCard` |
| Hub rumor / opportunity leads | [SPE-2466](https://linear.app/spectranoir/issue/SPE-2466) — PR #2849 — `buildHubOpportunityLeadCard`, `buildHubRumorLeadCard` |
| Multi-region tag-conflict ranking | [SPE-2467](https://linear.app/spectranoir/issue/SPE-2467) — PR #2852 — scored ranking in `buildTagConflictValueStreamOpportunityCard` |
| Strategic action budget | [SPE-2468](https://linear.app/spectranoir/issue/SPE-2468) — PR #2854 — `buildStrategicActionBudgetOpportunityCard` |
| Town-first contract generation | [SPE-2469](https://linear.app/spectranoir/issue/SPE-2469) — PR #2856 — `townContractGeneration.ts` hooks in `contracts.ts` (domain seam, not Front Desk recompute) |

**Delta since June 2026 hygiene (`planning/backlog-handoff-hygiene-slice-5.md`):** children SPE-2466–SPE-2469 shipped; parent body still said “remaining folded scope stays open”; Linear cycled **Done** / **Backlog** while umbrella review was pending.

## Parent AC vs shipped evidence

| Parent AC | Shipped evidence | Met? |
| --- | --- | --- |
| One bounded operations home screen | Canonical Front Desk route `/` — `getFrontDeskHubView` + `FrontDeskPage` hub shell from original pass | **Yes** |
| Hub reflects current simulation state through existing helpers and summaries | Cycle summaries, procurement snapshot, operations report projection, and opportunity cards derived from domain helpers (`generateHubState`, funding pressure, attrition readiness, etc.) | **Yes** |
| Hub links into already-supported operational flows without duplicating logic | `APP_ROUTES` links to contracts, teams, procurement, agency, factions, report — no duplicate domain models in hub layer | **Yes** |
| At least one simulation-driven opportunity, rumor, or lead surfaced through the hub | SPE-31a courier card; SPE-2466 hub rumor/opportunity; procurement/staffing pressure cards; tag-conflict and action-budget cards | **Yes** |
| At least one town-tag, tag-conflict, or value-stream lead path visible without recomputing contract generation on the hub | SPE-2465/2467 `buildTagConflictValueStreamOpportunityCard` reads existing case tags only — contract generation hooks live in `contracts.ts` (SPE-2469), not Front Desk | **Yes** |
| Hub remains presentation and routing surface, not a separate simulation layer | All opportunity builders are pure `GameState → view` projections; SPE-2469 town-first generation runs in weekly contract seam, not hub UI | **Yes** |

**Folded scope rows (formerly “open” in issue body):** hub rumor/opportunity (SPE-2466), multi-region tag-conflict ranking (SPE-2467), strategic action budget (SPE-2468), town-first contract generation (SPE-2469) — all **shipped** as named children.

**Parent [SPE-31](https://linear.app/spectranoir/issue/SPE-31) disposition:** **Done** — AC rows 1–6 met by hub shell + projection cards + contract-generation seam; broader harvest fold-ins deferred below are not parent AC minimum bar.

**Doc vs Linear reconciliation:** Linear was **Backlog** / **In Progress** while children completed and body still listed open folded scope. Grooming confirms **Done** aligns with evidenced AC; update parent body status note + deferred table to match.

## Scope (this slice)

| In | Out |
| --- | --- |
| Grooming comment on [SPE-31](https://linear.app/spectranoir/issue/SPE-31) | New Front Desk cards |
| Parent body / deferred table hygiene | Mission triage full refresh |
| `planning/backlog.md` handoff + context | SPE-2469 contract hook changes |
| Slice doc (this file) + planning index row | Hub card ranking / generation changes |

## Acceptance

- [x] Parent AC re-evaluated — rows 1–6 **Yes**
- [x] SPE-31 **Done** on Linear aligned with docs
- [x] Recommended next step updated post reconciliation
- [x] Docs-only diff

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Knowledge-state / exploration-driven opportunity projection | future projection slices | Metamorphosis Alpha comment — hub as projection surface when sibling systems ship; not parent AC |
| Multi-district contract board slots | SPE-31 follow-up sibling | Explicit deferral in SPE-2469 slice doc |
| `applySiteGenerationToCase` on launched contract cases | SPE-31 follow-up sibling | Spawn path applies site gen; contracts stay on skeleton path per SPE-2469 |
| Multi-card surfacing (all region conflicts, all hub rumors, all action lanes) | SPE-31 follow-up siblings | Bounded one-card-per-slice pattern across SPE-2465–2468 |
| Rich actor-tag packet scene modifiers beyond case-tag reuse | harvest / content waves | Reconciliation comments in parent body — not parent AC minimum bar |
| Mission triage full refresh | blocked queue | UI breadth without new loop truth — `planning/backlog.md` § Blocked |

## Validation

Docs-only — no `npm run test:run` required for hygiene boundary.

## See also

- `planning/spe-31-frontdesk-tag-conflict-value-stream-opportunity-slice.md`
- `planning/spe-31-frontdesk-hub-rumor-opportunity-slice.md`
- `planning/spe-31-frontdesk-tag-conflict-ranking-slice.md`
- `planning/spe-31-frontdesk-strategic-action-budget-slice.md`
- `planning/spe-31-town-first-contract-generation-slice.md`
- `planning/spe-70-parent-reconciliation-slice.md`
- `planning/spe-521-parent-reconciliation-slice.md`
- `planning/backlog.md`

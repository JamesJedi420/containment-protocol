# SPE-2827 — Parent acceptance reconciliation (grooming)

One-page grooming record. Parent [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827/generic-ordinary-equipment-instance-authority) **Done** (docs disposition) — children SPE-2828–SPE-2859 shipped; SPE-2827-owned AC rows **Yes**; residual **none this program still owns**. Linear MCP `needsAuth` this session — local agent applies parent **Done** + merge comment. Do not invent a child SPE ID.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-2827 parent reconciliation (hygiene on the parent; no guessed child ID)                             |
| **Parent** | [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827/generic-ordinary-equipment-instance-authority) — Generic Ordinary-Equipment Instance Authority; **Done** (docs disposition; Linear apply pending) |
| **Branch** | `cursor/spe-2827-parent-reconciliation-b65a`                                                               |
| **Status** | **Shipped** — hygiene session (docs-only)                                                                  |
| **Base `main` SHA** | `6312acdf`                                                                                          |

## Goal

Re-evaluate parent [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827) acceptance after shipped children SPE-2828–SPE-2859. Confirm parent **Done** only when every SPE-2827-owned AC row is evidenced. Docs + Linear hygiene only. Do not author destroy-on-resignation or destroy-on-non-mission-death (those reverse SPE-2858 / SPE-2859).

## Prerequisite (on `main` @ `6312acdf`)

| Layer | Anchor |
| --- | --- |
| Registry / location / CAS / hydration | [SPE-2828](https://linear.app/spectranoir/issue/SPE-2828) — `equipmentInstances`, `planning/spe-2828-ordinary-equipment-instance-foundation-slice.md` |
| Combat Stim two-dose payload | [SPE-2829](https://linear.app/spectranoir/issue/SPE-2829) — `combat_stim_dose` 2/2 + activation |
| Depleted Combat Stim recovery | [SPE-2830](https://linear.app/spectranoir/issue/SPE-2830) — instance-only 0/2 claim; also SPE-1055 |
| Ordinary materialize / assign | [SPE-2840](https://linear.app/spectranoir/issue/SPE-2840) |
| Ordinary instance recovery | [SPE-2841](https://linear.app/spectranoir/issue/SPE-2841) |
| Stored destroy / re-agg | [SPE-2842](https://linear.app/spectranoir/issue/SPE-2842) / [SPE-2843](https://linear.app/spectranoir/issue/SPE-2843) |
| Combat Stim dispose / re-agg | [SPE-2844](https://linear.app/spectranoir/issue/SPE-2844) / [SPE-2845](https://linear.app/spectranoir/issue/SPE-2845) |
| Fabricated ordinary materialize / lot-return | [SPE-2846](https://linear.app/spectranoir/issue/SPE-2846) / [SPE-2848](https://linear.app/spectranoir/issue/SPE-2848) |
| Fabricated Combat Stim materialize / lot-return | [SPE-2849](https://linear.app/spectranoir/issue/SPE-2849) / [SPE-2850](https://linear.app/spectranoir/issue/SPE-2850) |
| Partial/depleted lot-return policy | [SPE-2852](https://linear.app/spectranoir/issue/SPE-2852) — docs-satisfied fail-closed |
| Equipped ordinary / Combat Stim lifecycle | [SPE-2853](https://linear.app/spectranoir/issue/SPE-2853)–[SPE-2855](https://linear.app/spectranoir/issue/SPE-2855) |
| Mission fatality / injury loss | [SPE-2856](https://linear.app/spectranoir/issue/SPE-2856) / [SPE-2857](https://linear.app/spectranoir/issue/SPE-2857) |
| Resignation / non-mission death recovery remains | [SPE-2858](https://linear.app/spectranoir/issue/SPE-2858) / [SPE-2859](https://linear.app/spectranoir/issue/SPE-2859) |

**Not SPE-2827 children (do not fold in):** [SPE-2851](https://linear.app/spectranoir/issue/SPE-2851) condition repair is [SPE-877](https://linear.app/spectranoir/issue/SPE-877). SPE-2847 is out of remaining sequence (do not pick). SPE-2831–SPE-2839 were unused numbers, not missing children.

**Delta:** Linear remaining already lists SPE-2858 / SPE-2859 **Done** and residual **none this program still owns**. Completion-shape prose still named SPE-1027 stock-provider, mutation, and instance-aware salvage. Those are adjacent owners, not unmet SPE-2827 AC.

## Linear source (MCP `needsAuth`)

Linear MCP could not load Goal / Scope / Constraints / AC live. Binding copy used for scoring:

- Repo parent record: `planning/spe-2827-generic-ordinary-equipment-instance-authority-reconciliation.md`
- Architecture: `planning/equipment-instance-architecture.md`
- Foundation constraints: `planning/spe-2828-ordinary-equipment-instance-foundation-slice.md`
- User handoff: Linear remaining SPE-2858 / SPE-2859 Done; residual none this program still owns

Parent **owns:** stable ordinary-equipment instance identity, authoritative location, validated mutable state, persistence, and the lifecycle integration program that shipped as SPE-2828–SPE-2859.

Parent **does not own:** taxonomy (SPE-462), ready/stow (SPE-1658), maintenance/integrity economy (SPE-877), facility stock/replenishment (SPE-1027), artifact approval (SPE-1766), broader salvage outputs (SPE-1055).

## Parent AC vs shipped evidence

| Parent AC | Shipped evidence | Met? |
| --- | --- | --- |
| Durable ordinary-equipment instance identity (stable IDs; optional registry) | SPE-2828 `GameState.equipmentInstances`; immutable `instanceId` / `definitionId`; `planning/equipment-instance-architecture.md` Authorities | **Yes** |
| Authoritative stored/equipped location; `equipmentSlots` is compatibility projection | SPE-2828 location + CAS relocate; SPE-2840 exact-instance assignment; unequip/transfer preserve identity | **Yes** |
| Validated mutable state (condition, bounded payload) with compare-and-swap; no unguarded delete | SPE-2828 condition/payload + CAS; architecture mutation table — every identity-destroying path has its own command, eligibility, and event | **Yes** |
| Persistence / deterministic hydration without save-version bump | SPE-2828 optional registry; legacy `{}`; first equipped claim wins; `GAME_STORE_VERSION` / `GAME_SAVE_VERSION` unchanged | **Yes** |
| Combat Stim exact two-dose activation and durable consumption events | SPE-2829 `combat_stim_dose` 2/2; activation-only decrement; overdrive/debt; events `equipment.combat_stim_activated` / `equipment.combat_stim_overdrive_expired` | **Yes** |
| Explicit loss and destruction with durable events (mission + player) | SPE-2842 / SPE-2853 ordinary destroy; SPE-2844 / SPE-2855 Combat Stim dispose; SPE-2856 `mission_loss`; SPE-2857 `mission_injury` | **Yes** |
| Guarded inverse materialization (re-agg / fabricated lot-return) without unguarded inventory credit | SPE-2843 / SPE-2848 / SPE-2854 ordinary; SPE-2845 / SPE-2850 / SPE-2855 Combat Stim; SPE-2852 fail-closed partial/depleted | **Yes** |
| Instance-aware recovery selection (ID-only ordinary; depleted Combat Stim) | SPE-2841 ordinary instance recovery; SPE-2830 0/2 Combat Stim + terminal-carrier claim | **Yes** |
| Resignation and non-mission death are not identity-destroying triggers | SPE-2858 / SPE-2859 recovery remains; SPE-2830 stays the removal path | **Yes** |
| Targeted tests for identity, location, hydration, lifecycle events | Foundation, Combat Stim, destroy/re-agg/lot-return, mission-loss, recovery, and Equipment UI contract tests per child slice Validation | **Yes** |

**Completion-shape items that are not SPE-2827 AC rows:**

| Item | Owner | Why not a remaining SPE-2827 child |
| --- | --- | --- |
| SPE-1027 stock-provider port / refill | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027) | Parent Constraints: SPE-1027 owns facility stock and replenishment. Foundation deferred it as adjacent. |
| Generic mutation stations / integrity labor | [SPE-877](https://linear.app/spectranoir/issue/SPE-877) | SPE-2851 already ships stored condition repair under SPE-877. Compact condition fields do not complete integrity. |
| Broader salvage economics / Auto-Scrap instance routing | [SPE-1055](https://linear.app/spectranoir/issue/SPE-1055) / [SPE-2749](https://linear.app/spectranoir/issue/SPE-2749) | SPE-2841 / SPE-2830 shipped instance-aware *selection*. Outputs, thresholds, and Auto-Scrap stay SPE-1055 / SPE-2749. |
| Further governed payloads (authoring, consumption, recovery, destruction) | post-Done siblings — do not reopen SPE-2827 | Combat Stim (SPE-2829 / SPE-2844 / SPE-2830) was the in-program payload consumer. Other resources need their own authority, same pattern as SPE-75 post-Done children. |
| Cross-lot grade migration | rejected for this program | Lot-return targets the exact source lot (SPE-2848 / SPE-2850). A later sibling would need a new issue; do not reopen SPE-2827. |
| Custody / evidence / legal holds | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027) / [SPE-867](https://linear.app/spectranoir/issue/SPE-867) | Established in SPE-2800; not SPE-1055 / SPE-1766. |
| Ready versus stowed | [SPE-1658](https://linear.app/spectranoir/issue/SPE-1658) | Access-state layer; do not fold into this parent. |
| Destroy-on-resignation / destroy-on-non-mission-death | **do not author** | Would reverse SPE-2858 / SPE-2859 and delete SPE-2830 terminal-carrier recovery. |

**Parent [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827) disposition:** **Done** — SPE-2827-owned AC rows met by SPE-2828–SPE-2859. No remaining SPE-2827-owned children. Adjacent programs stay on their own parents.

**Doc vs Linear reconciliation:** Parent body completion-shape still listed stock-provider, mutation, and salvage as later children. Linear remaining already said SPE-2858 / SPE-2859 Done and residual none this program still owns. Grooming confirms **Done** aligns with evidenced AC; update parent remaining/deferred to match.

## Scope (this slice)

| In | Out |
| --- | --- |
| AC matrix vs shipped SPE-2828–SPE-2859 | `src/` |
| Parent remaining / deferred hygiene | SCHEMA_REGISTRY |
| `planning/backlog.md` primary + manifest | SPE-2856 / SPE-2857 destroy paths |
| Slice doc (this file) + planning index row | SPE-2858 / SPE-2859 recovery-remains policy |
| Architecture deferred-consumers alignment | SPE-2847; SPE-877 / SPE-1658 / SPE-1484 implementations |
| Linear hygiene comments (handoff if MCP `needsAuth`) | Authoring destroy-on-resignation or destroy-on-non-mission-death |

## Acceptance

- [x] Parent AC re-evaluated — SPE-2827-owned rows **Yes**
- [x] SPE-1027 / mutation / broader salvage classified as adjacent, not unmet SPE-2827 children
- [x] Further payloads and cross-lot migration resolved as post-Done siblings / rejected — not remaining SPE-2827 children
- [ ] SPE-2827 **Done** on Linear — docs disposition Done; Linear apply via local-agent handoff (MCP `needsAuth`)
- [x] Recommended next step retargeted to this hygiene row on SPE-2827 (no guessed child ID)
- [x] Docs-only diff

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Facility stock-provider / refill | SPE-1027 | Adjacent replenishment authority |
| Integrity labor, inspection, repair economy | SPE-877 | SPE-2851 shipped condition flip only |
| Broader salvage outputs / Auto-Scrap instance routing | SPE-1055 / SPE-2749 | Beyond ID-only / 0/2 instance selection |
| Further governed payloads | new Linear siblings — do not reopen SPE-2827 | Resource-specific; Combat Stim already shipped |
| Cross-lot grade migration | do not reopen SPE-2827 | Exact source-lot return is the shipped policy |
| Custody / evidence / legal holds | SPE-1027 / SPE-867 | Not SPE-1055 / SPE-1766 |
| Ready versus stowed | SPE-1658 | Access-state layer |
| Injury capacity (body-use) | SPE-1484 | Slot occupancy / verbs — not identity |
| Destroy-on-resignation (new reason) | do not author | Reverses SPE-2858 |
| Destroy-on-non-mission-death (new reason) | do not author | Reverses SPE-2859 |
| SPE-2847 | do not pick | Out of SPE-2827 remaining sequence |

## Linear issue body

Paste onto **SPE-2827** (parent). Do not invent a child SPE ID while Linear MCP is `needsAuth`. After merge: parent **Done** + comment with PR URL.

### Goal

Score SPE-2827 parent AC against shipped children SPE-2828–SPE-2859. Mark the parent Done when every SPE-2827-owned row is evidenced; otherwise name remaining SPE-2827-owned children. Docs only.

### Scope

Docs + Linear hygiene: this slice, parent remaining/deferred, backlog primary + manifest, architecture deferred-consumers line. No `src/`.

### Constraints

- Do not author destroy-on-resignation or destroy-on-non-mission-death.
- Do not fold SPE-1658 ready/stow or SPE-877 integrity into this parent.
- SPE-1027 stock-provider, mutation stations, and broader salvage are adjacent unless an AC row names them as SPE-2827-owned.

### Acceptance criteria

- AC matrix vs repo evidence for each parent criterion.
- Parent **Done** only if every SPE-2827-owned AC row is Yes; else Backlog children with mechanic + boundary.
- Backlog primary + manifest retargeted; `npm run verify:backlog-handoff` passes.
- No `src/` diff.

## Pre-coding summary

**Status:** already complete in runtime; this slice is docs/hygiene.

**Relevant files:** parent reconciliation record, architecture, shipped SPE-2828–SPE-2859 slice docs, `planning/backlog.md`, `planning/backlog-handoff-manifest.json`.

**Current behavior:** SPE-2859 is backlog primary; parent SPE-2827 stays Backlog; completion-shape still lists stock-provider / mutation / salvage.

**Expected behavior:** parent **Done**; residual none this program owns; primary leaves the SPE-2827 child chain after this hygiene row.

**Implementation boundary:** docs + Linear hygiene only.

**Known risks:** treating adjacent SPE-1027 / SPE-877 / SPE-1055 work as unmet SPE-2827 AC; reversing SPE-2858 / SPE-2859.

**Validation plan:** `npm run verify:backlog-handoff` only.

**Docs in this PR:** this file, parent remaining, architecture deferred consumers, backlog + manifest, slice-doc table.

## Validation

Docs-only — `npm run verify:backlog-handoff`. No `npm run test:run`.

## See also

- `planning/spe-2827-generic-ordinary-equipment-instance-authority-reconciliation.md`
- `planning/equipment-instance-architecture.md`
- `planning/spe-70-parent-reconciliation-slice.md`
- `planning/spe-2859-non-mission-death-equipped-instance-recovery-slice.md`
- `planning/backlog.md`

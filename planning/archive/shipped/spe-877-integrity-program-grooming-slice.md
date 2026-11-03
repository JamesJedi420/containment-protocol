# SPE-877 — Integrity program grooming (named next child)

One-page grooming record. Parent [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) stays **Backlog**. [SPE-2851](https://linear.app/spectranoir/issue/SPE-2851) shipped the stored `damaged` → `operational` flip only. Remaining parent AC is unmet. This slice names the first implementable child. Do not invent a child SPE ID while Linear MCP is `needsAuth`. Do not reopen [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827) or [SPE-2848](https://linear.app/spectranoir/issue/SPE-2848). Do not pick [SPE-2847](https://linear.app/spectranoir/issue/SPE-2847).

| Field               | Value                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Linear**          | SPE-877 integrity-program grooming (hygiene on the parent; no guessed child ID)                                                                                                |
| **Parent**          | [SPE-877](https://linear.app/spectranoir/issue/SPE-877/critical-equipment-integrity-and-deficiency-control) — Critical equipment integrity and deficiency control; **Backlog** |
| **Branch**          | `cursor/spe-877-integrity-grooming-6ad2`                                                                                                                                       |
| **Status**          | **Shipped** — hygiene session (docs-only)                                                                                                                                      |
| **Base `main` SHA** | `77301d95fc8a5f7e940bb04d339c6f35b7c0d4fe`                                                                                                                                     |

## Goal

Retarget the backlog primary off Done [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827) onto [SPE-877](https://linear.app/spectranoir/issue/SPE-877). Score remaining SPE-877 parent AC after SPE-2851. Name **one** next child: a frozen containment-class inspection-cadence and deficiency stop/continue kernel. Docs + Linear hygiene only. No `src/`.

## Prerequisite (on `main` @ `77301d95`)

| Layer                                   | Anchor                                                                                                                                                                                                                                             |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stored condition flip                   | [SPE-2851](https://linear.app/spectranoir/issue/SPE-2851) — `repairStoredEquipmentInstanceCondition`; `equipment.instance_condition_repaired` / `manual_condition_repair`; `planning/spe-2851-stored-equipment-instance-condition-repair-slice.md` |
| Instance registry / CAS                 | [SPE-2828](https://linear.app/spectranoir/issue/SPE-2828) — `GameState.equipmentInstances`; `applyEquipmentInstanceTransition`                                                                                                                     |
| Fail-closed damaged re-agg / lot-return | [SPE-2843](https://linear.app/spectranoir/issue/SPE-2843) / [SPE-2848](https://linear.app/spectranoir/issue/SPE-2848) / [SPE-2850](https://linear.app/spectranoir/issue/SPE-2850) — operational-only; do not reopen                                |
| Catalog functional class                | SPE-2751 `gradeProfile.functionalClass`; `EQUIPMENT_GRADE_FUNCTIONAL_CLASSES` in `src/domain/equipmentGradeCatalog.ts`                                                                                                                             |
| Workshop caller-owned condition         | [SPE-2782](https://linear.app/spectranoir/issue/SPE-2782) — explicit `poor` quality axis; live SPE-877 integrity deferred                                                                                                                          |
| Adjacent Done parent                    | [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827) — instance identity/lifecycle **Done**; residual none that program owns                                                                                                                  |

**Not this program:** [SPE-1658](https://linear.app/spectranoir/issue/SPE-1658) ready/stow; [SPE-1055](https://linear.app/spectranoir/issue/SPE-1055) / [SPE-2749](https://linear.app/spectranoir/issue/SPE-2749) salvage / Auto-Scrap routing; [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028) remaining live projection via [SPE-2771](https://linear.app/spectranoir/issue/SPE-2771). SPE-2847 is blocked — do not pick.

## Linear source (MCP `needsAuth`)

Linear MCP could not load Goal / Scope / Constraints / AC live. Binding copy used for scoring:

- User handoff: SPE-877 High / Backlog; remaining parent AC is inspection cadence, deficiency stop/continue, spare-part suitability, and barrier-integrity coupling
- SPE-2851 Deferred: repair economics / spare-part suitability and inspection cadence / deficiency control stay on the parent
- `planning/equipment-instance-architecture.md` Deferred consumers: maintenance labor and mutation stations remain SPE-877
- `architecture/equipment-grade-contract.md`: condition / integrity / damage / durability is independent of canonical grade
- SPE-2782 / SPE-2785: no live SPE-877 integrity, deficiency, or inspection contract exists
- SPE-1387 pairing and `architecture/containment-environment-patterns.md` (`barrier_integrity`) are named by handoff; that architecture file is **not** in this checkout (only referenced from `planning/extranormal-event-registry-slice-1.md`)

Parent **owns:** critical-equipment integrity program — inspection cadence, deficiency stop/continue, spare-part suitability, barrier-integrity coupling, mutation/maintenance labor beyond the SPE-2851 condition flip.

Parent **does not own:** instance identity/lifecycle (SPE-2827 **Done**), ready/stow (SPE-1658), salvage/Auto-Scrap (SPE-1055 / SPE-2749), lot quantity / Auto-Scrap instance selection, SPE-2848 lot-return, SPE-2858 / SPE-2859 recovery-remains.

## Parent AC vs shipped evidence

| Parent AC                                       | Shipped evidence                                                                                                                                   | Met?                                                   |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Stored damaged → operational condition flip     | SPE-2851 `repairStoredEquipmentInstanceCondition`; inventory/lots/`damagedEquipmentQueue` unchanged; return/re-agg stay fail-closed until repaired | **Yes** — child only; does **not** complete the parent |
| Inspection cadence for a critical class         | No registry, interval, or last-inspection input. Compact `condition` is not cadence                                                                | **No**                                                 |
| Deficiency stop/continue                        | No inspection-cadence deficiency outcome. Instance `condition` is a separate SPE-2828 / SPE-2851 axis, not this rule                               | **No**                                                 |
| Spare-part suitability / repair economics       | SPE-2851 is a free condition flip; no parts, labor, or suitability check                                                                           | **No**                                                 |
| Barrier-integrity coupling                      | No `barrier_integrity` consumer. `architecture/containment-environment-patterns.md` missing from this checkout. SPE-1387 has no in-repo slice      | **No**                                                 |
| Live integrity projection into workshop quality | SPE-2782 accepts caller-owned `poor` only; live mapping deferred to SPE-877 / adapter child                                                        | **No**                                                 |
| Mutation stations / integrity labor             | `architecture/permanent-gear-mutation-stations.md` (SPE-113) is design-only; SPE-877 runtime is a later child (row 7), not the named next child    | **No**                                                 |

**Parent [SPE-877](https://linear.app/spectranoir/issue/SPE-877) disposition:** **Backlog** — SPE-2851 is not parent completion. Remaining SPE-877-owned AC rows are unmet.

**Do not treat as unmet SPE-877 AC:** SPE-1658 ready/stow; SPE-1055 salvage; SPE-2749 Auto-Scrap instance routing; SPE-2848 lot-return; SPE-2858 / SPE-2859 recovery-remains.

## Named next child (no ID)

**Title:** Containment-class inspection cadence and deficiency stop/continue

**Parent:** [SPE-877](https://linear.app/spectranoir/issue/SPE-877). Create this as a Linear child in the next session (MCP `ready`). Do not invent an ID in docs or PRs until Linear assigns one.

**Why this child first:** Parent remaining AC has four distinct deliverables. For this child, deficiency **is** the authored stop/continue attached to inspection `due` / `overdue` — not a second physical-defect input and not SPE-2851 `damaged`. Spare-part suitability needs that typed deficiency outcome before it should gate SPE-2851. Barrier-integrity coupling needs the same outcome before it can feed `barrier_integrity`. One critical class keeps the first PR inside a SPE-2798 / SPE-2782-shaped boundary.

**Why `containment`:** Catalog already authors `functionalClass: 'containment'` on `ward_seals`, `warding_kits`, `ritual_components`, and `containment_staff`. That class is the later SPE-1387 / `barrier_integrity` pairing target. Do not add `protection`, `combat`, `medical`, or other `EQUIPMENT_GRADE_FUNCTIONAL_CLASSES` in the first child.

### Child boundary (implement next)

| In                                                                                                       | Out                                                                 |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Frozen domain registry: one critical class `containment`                                                 | Other functional classes                                            |
| Authored positive-integer inspection cadence (weeks)                                                     | GameState / instance last-inspection persistence                    |
| Authored deficiency disposition `stop` \| `continue` on `due` / `overdue`                                | Spare-part suitability / repair economics                           |
| Pure evaluator: last-inspection week + current week + class → discriminated `ok` result (contract below) | Live `barrier_integrity` / SPE-1387 coupling                        |
| Fail-closed missing, omitted, non-integer, non-containment, inverted-week, and malformed inputs          | Week-close hook, UI, workshop adapter (SPE-2782 stays caller-owned) |
| Targeted Vitest for cadence math + fail-closed                                                           | SPE-2851 condition mutation; re-agg / lot-return gates              |
| Slice doc + backlog primary retarget to the new Linear child                                             | Ready/stow (SPE-1658); salvage (SPE-1055); Auto-Scrap (SPE-2749)    |

Reuse: `EQUIPMENT_GRADE_FUNCTIONAL_CLASSES` / catalog `containment` profiles as the class key; instance `condition` remains SPE-2828 / SPE-2851. Do not call `repairStoredEquipmentInstanceCondition` from this kernel. Do not change lot quantity, SPE-2848 lot-return, SPE-2858/2859 recovery-remains, or Auto-Scrap instance selection.

Evaluator contract (binding for the child, not this grooming). Discriminated result; no throw, no `null`, no default `continue`:

```ts
type CadenceDeficiency = { kind: 'inspection_cadence'; disposition: 'stop' | 'continue' }
type EvaluateResult =
  | { ok: true; status: 'current'; deficiency: null }
  | { ok: true; status: 'due' | 'overdue'; deficiency: CadenceDeficiency }
  | {
      ok: false
      code: 'invalid_class' | 'missing_cadence' | 'invalid_weeks' | 'inverted_weeks'
    }
```

- `weeksSinceInspection < cadence` → `{ ok: true, status: 'current', deficiency: null }`
- `weeksSinceInspection === cadence` → `{ ok: true, status: 'due', deficiency: { kind: 'inspection_cadence', disposition } }`
- `weeksSinceInspection > cadence` → `{ ok: true, status: 'overdue', deficiency: { kind: 'inspection_cadence', disposition } }`
- `disposition` is authored on the class (`stop` or `continue`), not inferred from instance `condition`
- `condition: 'damaged' | 'operational'` stays SPE-2828 / SPE-2851 and is **not** an evaluator input. This child's deficiency is inspection-cadence only
- First child **returns** the result; it does **not** wire a consumer. Later children attach `stop` to a named gate without folding those gates into slice 1
- Fail-closed codes: non-containment / unknown class → `invalid_class`; missing or non-positive cadence → `missing_cadence`; missing / non-integer / non-finite weeks → `invalid_weeks`; last-inspection week after current week → `inverted_weeks`

### Later SPE-877 children (after the named child)

| Order | Child                                         | Why later                                                                                                                           |
| ----- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 2     | Spare-part suitability on SPE-2851 repair     | Needs inspection-cadence deficiency outcome before gating the existing repair command                                               |
| 3     | Barrier-integrity coupling (SPE-1387 pairing) | Needs typed deficiency outcome; restore or author `architecture/containment-environment-patterns.md` in that slice if still missing |
| 4     | Persistence / week-close last-inspection      | Schema + `advanceWeek`; not the authoring kernel                                                                                    |
| 5     | Live workshop adapter                         | SPE-2782 already deferred live mapping; keep caller-owned until an explicit SPE-1028 or SPE-877 adapter child                       |
| 6     | Additional critical classes                   | Copy the containment kernel; do not author every class in slice 1                                                                   |
| 7     | Mutation stations / integrity labor           | SPE-113 remains design-only; SPE-877 owns runtime labor/stations after the kernel and spare-part children                           |

## Scope (this slice)

| In                                                   | Out                                                       |
| ---------------------------------------------------- | --------------------------------------------------------- |
| Parent AC matrix vs SPE-2851                         | `src/`                                                    |
| Named next child (title + boundary; no guessed ID)   | SCHEMA_REGISTRY                                           |
| `planning/backlog.md` primary + manifest             | SPE-2851 repair command                                   |
| This slice doc + planning index row                  | SPE-2848 lot-return; SPE-2858 / SPE-2859                  |
| SPE-2851 Deferred retarget to named child            | SPE-1658 / SPE-1055 / SPE-2749 / SPE-2771 implementations |
| Architecture deferred-consumers line                 | SPE-2847; inventing `containment-environment-patterns.md` |
| Linear hygiene comments (handoff if MCP `needsAuth`) | Creating a guessed SPE child ID                           |

## Acceptance

- [x] SPE-877 remaining AC scored — inspection / deficiency / spare-parts / barrier-integrity **No**; SPE-2851 condition flip **Yes** and not parent Done
- [x] First child named: containment-class inspection cadence and deficiency stop/continue
- [x] No invented Linear child ID
- [x] Backlog primary + manifest retargeted off SPE-2827 onto SPE-877
- [ ] SPE-877 comment + named-child create — Linear apply via local-agent handoff after merge (MCP `needsAuth`). Docs **Shipped** means this grooming record landed; it does not mean Linear was updated in-session. Same pattern as SPE-2827 parent reconciliation.
- [x] Docs-only diff
- [x] SPE-2827 / SPE-2848 not reopened; SPE-2847 not picked

## Deferred

| Item                                                                   | Owner                                       | Why                                                                    |
| ---------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------- |
| Containment-class inspection cadence + deficiency stop/continue kernel | **Named next child** (create under SPE-877) | This grooming names it; Linear MCP `needsAuth` cannot create the issue |
| Spare-part suitability / repair economics                              | later SPE-877 child                         | After the inspection/deficiency kernel                                 |
| Barrier-integrity coupling / SPE-1387                                  | later SPE-877 child                         | After typed deficiency; architecture file missing this checkout        |
| Last-inspection persistence / week-close                               | later SPE-877 child                         | Schema + `advanceWeek`                                                 |
| Live workshop integrity mapping                                        | SPE-877 adapter or SPE-1028 child           | SPE-2782 stays caller-owned                                            |
| Additional critical classes                                            | later SPE-877 children                      | One class in the first child                                           |
| Mutation stations / integrity labor                                    | later SPE-877 child (row 7)                 | SPE-113 design-only; do not leave this AC unowned                      |
| Ready versus stowed                                                    | SPE-1658                                    | Access-state layer                                                     |
| Salvage / Auto-Scrap instance routing                                  | SPE-1055 / SPE-2749                         | Adjacent; do not fold into integrity                                   |
| SPE-1028 remaining live projection                                     | SPE-2771                                    | Adjacent workshop owner                                                |
| SPE-2847                                                               | do not pick                                 | Blocked                                                                |

## Linear issue body

Paste onto **SPE-877** (parent). Do not invent a child SPE ID while Linear MCP is `needsAuth`. After merge: parent stays **Backlog** + comment with PR URL and the named child. Local agent with MCP `ready` **creates** the named child from the block below.

### Parent remaining / deferred (SPE-877)

SPE-2851 shipped stored `damaged` → `operational` via `applyEquipmentInstanceTransition`. Remaining SPE-877-owned AC: inspection cadence, deficiency stop/continue, spare-part suitability, barrier-integrity coupling, mutation stations / integrity labor (later child 7). Parent stays **Backlog**. Do not mark Done. Do not reopen SPE-2827 / SPE-2848. Do not pick SPE-2847.

### Named child to create (title only until Linear assigns an ID)

**Title:** Containment-class inspection cadence and deficiency stop/continue

**Parent:** SPE-877

**Goal:** Author one critical class (`containment`) plus one inspection-cadence and deficiency stop/continue rule as a frozen fail-closed domain kernel. Deficiency in this child is the authored `stop`/`continue` on `due`/`overdue`, not SPE-2851 `damaged`. No persistence, week-close, UI, spare parts, or `barrier_integrity` coupling.

**Scope:** Registry + pure evaluator in `src/domain/` with targeted Vitest. Class key is existing catalog `functionalClass: 'containment'` (`ward_seals`, `warding_kits`, `ritual_components`, `containment_staff`). Cadence is a positive integer week interval. Disposition is authored `stop` or `continue`. Evaluator inputs: last-inspection week, current week, class. Success: `{ ok: true, status: 'current', deficiency: null }` or `{ ok: true, status: 'due' | 'overdue', deficiency: { kind: 'inspection_cadence', disposition } }`. Failure: `{ ok: false, code: 'invalid_class' | 'missing_cadence' | 'invalid_weeks' | 'inverted_weeks' }`. Do not mutate instance `condition`. Do not call SPE-2851 repair. Do not gate re-agg, lot-return, or workshop.

**Constraints:** Do not fold SPE-1658 ready/stow or SPE-1055 salvage. Do not change lot quantity, SPE-2848, SPE-2858/2859, or Auto-Scrap instance selection. Do not author other functional classes. Do not invent `architecture/containment-environment-patterns.md` in this child unless the barrier-integrity child is the active slice.

**Acceptance criteria:**

- Frozen registry exposes exactly one critical class: `containment`
- Authored cadence and stop/continue disposition validate fail-closed
- Evaluator matches the discriminated `EvaluateResult` contract (current has `deficiency: null`; due/overdue carry `inspection_cadence` deficiency)
- Fail-closed codes are `invalid_class` / `missing_cadence` / `invalid_weeks` / `inverted_weeks` — no throw, no `null`, no default continue
- No GameState field, save-version bump, UI, or SPE-2851 behavior change
- Targeted tests cover cadence edges (0, cadence, cadence+1) and fail-closed paths
- Parent SPE-877 remains Backlog

## Pre-coding summary

**Status:** SPE-877 **partially complete** (SPE-2851 only). This slice is docs/hygiene that names the next child.

**Relevant files:** SPE-2851 slice Deferred; `planning/equipment-instance-architecture.md`; `src/domain/equipmentGradeCatalog.ts`; SPE-2782 slice; `planning/backlog.md`; `planning/backlog-handoff-manifest.json`.

**Current behavior:** Backlog primary still points at Done SPE-2827. SPE-877 has no inspection/deficiency kernel. SPE-2851 Deferred still says “SPE-877 parent” for inspection and spare parts.

**Expected behavior:** Primary is SPE-877 with the named child as the next implementable slice. Parent AC matrix is durable. SPE-2851 Deferred points at the named child / later children.

**Implementation boundary:** docs + Linear hygiene only.

**Known risks:** inventing a child ID; treating SPE-2851 as parent Done; folding ready/stow or salvage into integrity; picking SPE-2847.

**Validation plan:** `npm run verify:backlog-handoff` only.

**Docs in this PR:** this file, SPE-2851 Deferred, architecture deferred consumers, backlog + manifest, slice-doc table.

## Validation

Docs-only — `npm run verify:backlog-handoff`. No `npm run test:run`.

## See also

- `planning/spe-2851-stored-equipment-instance-condition-repair-slice.md`
- `planning/spe-2827-parent-reconciliation-slice.md`
- `planning/equipment-instance-architecture.md`
- `architecture/equipment-grade-contract.md`
- `planning/spe-2782-workshop-equipment-output-quality-slice.md`
- `planning/backlog.md`

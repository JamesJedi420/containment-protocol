# SPE-947 / SPE-1046 — Parent acceptance review (grooming slice 1)

One-page grooming record. Parents [SPE-947](https://linear.app/spectranoir/issue/SPE-947) and [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) stay **Backlog** — registry children [SPE-2111](https://linear.app/spectranoir/issue/SPE-2111) and [SPE-2114](https://linear.app/spectranoir/issue/SPE-2114) shipped slices 1–4; parent AC not met at umbrella scope.

| Field               | Value                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Linear**          | [SPE-2481](https://linear.app/spectranoir/issue/SPE-2481) (SPE-947 grooming child) + [SPE-2482](https://linear.app/spectranoir/issue/SPE-2482) (SPE-1046 grooming child) |
| **Parents**         | [SPE-947](https://linear.app/spectranoir/issue/SPE-947) — Hazardous content propagation and counter-memetic operations; **Backlog**                                      |
|                     | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) — Affiliation, clearance, and membership status system; **Backlog**                                            |
| **Branch**          | `spe-947-spe-1046-parent-acceptance-review-slice-1`                                                                                                                      |
| **Status**          | **Shipped** — grooming closure session (docs-only)                                                                                                                       |
| **Base `main` SHA** | `e0f7c38f` (post PR #2883 slice plan)                                                                                                                                    |

## Goal

Re-evaluate parent acceptance criteria for [SPE-947](https://linear.app/spectranoir/issue/SPE-947) and [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) after registry children [SPE-2111](https://linear.app/spectranoir/issue/SPE-2111) and [SPE-2114](https://linear.app/spectranoir/issue/SPE-2114) shipped slices 1–4 (domain anchor → persistence → weekly hook → planning mirror UI). Produce AC evidence matrices, parent deferred tables, and Linear hygiene aligned with [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) / [SPE-31](https://linear.app/spectranoir/issue/SPE-31) grooming closure pattern. **Docs + Linear hygiene only** — no registry slice 5+ and no application code.

## Prerequisite (on `main` @ `ce3716b0`)

### SPE-947 child thread ([SPE-2111](https://linear.app/spectranoir/issue/SPE-2111) — **Done**)

| Layer                        | Anchor                                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Registry schema + validation | SPE-2111 slice 1 — PR #2432 — `src/domain/visualTriggerHazardRegistry.ts`, `src/test/visualTriggerHazardRegistry.test.ts`        |
| GameState persistence        | [SPE-2336](https://linear.app/spectranoir/issue/SPE-2336) — PR #2539 — `visualTriggerHazardRecords`, sanitize/hydrate            |
| Weekly orchestration hook    | [SPE-2337](https://linear.app/spectranoir/issue/SPE-2337) — PR #2541 — `applyWeeklyVisualTriggerHazardTick` in `advanceWeek`     |
| Planning mirror UI           | [SPE-2338](https://linear.app/spectranoir/issue/SPE-2338) — PR #2543 — `VisualTriggerHazardMirrorPage`, `/visual-trigger-hazard` |

### SPE-1046 child thread ([SPE-2114](https://linear.app/spectranoir/issue/SPE-2114) — **Done**)

| Layer                        | Anchor                                                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registry schema + validation | SPE-2114 slice 1 — PR #2433 — `src/domain/entityWelfareReclassificationRegistry.ts`, `src/test/entityWelfareReclassificationRegistry.test.ts`        |
| GameState persistence        | [SPE-2339](https://linear.app/spectranoir/issue/SPE-2339) — PR #2545 — `entityWelfareReclassificationRecords`, sanitize/hydrate                      |
| Weekly orchestration hook    | [SPE-2340](https://linear.app/spectranoir/issue/SPE-2340) — PR #2547 — `applyWeeklyEntityWelfareReclassificationTick` in `advanceWeek`               |
| Planning mirror UI           | [SPE-2341](https://linear.app/spectranoir/issue/SPE-2341) — PR #2549 — `EntityWelfareReclassificationMirrorPage`, `/entity-welfare-reclassification` |

**Delta since June 2026 scope-discipline grooming (`planning/scope-discipline-grooming-pass.md` @ `74cbd67e`):** SPE-947 / SPE-1046 listed as open umbrellas with shipped registry children but **no parent reconciliation doc**; parent bodies still read as full-scope goals with no AC matrix or deferred table hygiene.

**Closure note (June 2026):** Parents SPE-947 / SPE-1046 were briefly auto-marked **Done** on Linear after PR #2883; grooming closure reopened both to **Backlog**, appended status note + deferred tables to parent bodies, and marked grooming children SPE-2481 / SPE-2482 **Done**.

## SPE-947 parent AC vs shipped evidence

Parent scope: platform propagation, counter-memetic operations, takedown resistance, post-case media persistence. Shipped child scope at grooming time: visual-trigger hazard registry (pursuit state, hazardous media custody, exposure-chain projections) — **not** a full content-propagation simulator.

| Parent AC                                                                                               | Shipped evidence (SPE-2481 grooming — registry substrate only)                                                                                                                                             | Met? (at SPE-2481)                                       |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| In-world platform multiplies anomaly reach by configured factor scaling with view count                 | `projectExposureChainRisk` forecasts broadcast-scale escalation from hazard records; no platform node model, view-count multiplier, or reach-value field on a platform entity                              | **No**                                                   |
| Footage or post artifact increases civilian exposure or attraction traffic                              | `HazardousMediaInstance` sub-records + derivative hazard profiles; pursuit/awareness escalation bands — no civilian exposure or attraction-traffic counters wired to weekly loop                           | **Partial** — hazard metadata only                       |
| Counter-memetic plan requires crafted lore, distributor, propagation time, uptake before countermeasure | No counter-memetic plan type, distributor choice, lore craft step, or uptake gate in registry or weekly tick                                                                                               | **No**                                                   |
| Operation fails/degrades from platform outage, crash, deletion, or insufficient reach                   | Disposal deadline / sweep compliance + filter-latency warnings on records; no platform outage or reach-insufficiency operation model                                                                       | **Partial** — media custody/disposal only                |
| Content owner resists takedown due to audience/status incentives                                        | No content-owner actor model or takedown-resistance mechanics                                                                                                                                              | **No**                                                   |
| Case remains risky after local containment due to persistent hazardous/derivative media                 | Latent activation + derivative profiles + disposal compliance projections; no post-case persistence wave across mirrors/adaptations/commercialization                                                      | **Partial** — record-level latent/derivative hazard only |
| Tests cover spread, reach amplification, counter-memetic delay, platform failure, post-case persistence | `visualTriggerHazardRegistry.test.ts` + persistence/advanceWeek/mirror tests cover validation, pursuit transitions, exposure-chain forecast, disposal compliance — **not** parent AC integration scenarios | **Partial** — registry-wave tests only                   |

**Child [SPE-2111](https://linear.app/spectranoir/issue/SPE-2111) disposition:** **Done** — slices 1–4 satisfy registry child AC (schema, persistence, weekly hook, mirror UI). Child boundary explicitly excluded full SPE-947 parent closure (`planning/visual-trigger-hazard-registry-slice-1.md` § Out of scope).

**Parent [SPE-947](https://linear.app/spectranoir/issue/SPE-947) disposition at SPE-2481:** **Backlog** — zero parent AC rows **Yes** at umbrella scope; partial rows document registry substrate only.

**Superseding reconciliation ([SPE-2575](https://linear.app/spectranoir/issue/SPE-2575) — July 2026):** After [SPE-2568](https://linear.app/spectranoir/issue/SPE-2568)–[SPE-2574](https://linear.app/spectranoir/issue/SPE-2574), parent AC rows 1–7 are **Yes** at domain-evaluator / focused-test level. Canonical matrix + deferred wire-up table: `planning/spe-947-parent-ac-matrix-reconciliation-slice-1.md`. Parent stays **Backlog** — domain-evaluator Yes ≠ umbrella Done (GameState / weekly / UI / propagation-graph wire-up remain deferred). Do **not** treat this SPE-2481 matrix as current.

**Superseding reconciliation ([SPE-2618](https://linear.app/spectranoir/issue/SPE-2618) — July 2026):** After [SPE-2576](https://linear.app/spectranoir/issue/SPE-2576)–[SPE-2617](https://linear.app/spectranoir/issue/SPE-2617), all SPE-947-owned wire-up rows are **Done**. SPE-956 propagation graph does not block SPE-947 AC. Umbrella **Done** awaits explicit owner acceptance. Canonical disposition: `planning/spe-947-parent-umbrella-reconciliation-slice-2.md`.

## SPE-1046 parent AC vs shipped evidence

Parent scope: affiliation classes, clearance, onboarding pipelines, site-specific permissions, dual-loyalty, protected-status constraints, revocation paths. Shipped child scope: entity welfare **reclassification** registry (threat-label drift, disposition review gates) — **not** a membership/clearance system.

| Parent AC                                                                                                       | Shipped evidence                                                                                                                                                                      | Met?                                           |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Two+ human status classes with distinct permission/protection rules                                             | `proposedDisposition` union (`hostile`, `cooperative`, `medical`, `sapient_remains`, `unknown`) + `reviewGate` — disposition review metadata, not room/file/gear permission lookup    | **Partial** — disposition labels only          |
| Person moves through recruitment/onboarding pipeline before full access                                         | `reclassificationState` pending → approved/denied with `reviewArtifactRef` — ethics/veterinary/psych/executive gates; not recruitment, vetting, oath, or clearance elevation pipeline | **Partial** — reclassification review only     |
| Clearance or affiliation is site-specific rather than global                                                    | No site/facility/archive scope on affiliation records                                                                                                                                 | **No**                                         |
| Dual-loyalty case creates operational risk or restriction                                                       | No overlapping affiliation or dual-loyalty fields                                                                                                                                     | **No**                                         |
| Protected-status class blocks or alters agency action                                                           | No protected-status class or action-block lookup                                                                                                                                      | **No**                                         |
| Revocation or downgrade path changes later access/trust outcomes                                                | `reverted` state + `projectReclassificationPressure` forecast — no access/trust outcome mutation on GameState                                                                         | **Partial** — registry state + projection only |
| Tests cover status assignment, permission lookup, onboarding, revocation, protected-status, affiliation overlap | `entityWelfareReclassificationRegistry.test.ts` + persistence/advanceWeek/mirror tests — validation and pressure projection only                                                      | **Partial** — registry-wave tests only         |

**Child [SPE-2114](https://linear.app/spectranoir/issue/SPE-2114) disposition:** **Done** — slices 1–4 satisfy registry child AC. Child boundary excluded SPE-1046 affiliation wire-up (`planning/entity-welfare-reclassification-registry-slice-1.md` § Out of scope).

**Parent [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) disposition:** **Backlog** — zero parent AC rows **Yes** at umbrella scope. Registry child is a **fold-in anchor** for welfare reclassification under custody ethics, not substitution for affiliation/clearance system.

## Scope (this slice)

| In                                                                                                                                                                     | Out                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Grooming comments on [SPE-947](https://linear.app/spectranoir/issue/SPE-947) and [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046)                             | Registry slice 5+ implementation              |
| Parent body + deferred table updates on Linear                                                                                                                         | `src/domain/*` application code               |
| AC matrices in this doc                                                                                                                                                | SPE-947 propagation graph / pursuit simulator |
| `planning/backlog.md` handoff refresh                                                                                                                                  | SPE-1046 full permission engine               |
| Optional `planning/scope-discipline-grooming-pass.md` Phase 2 rows                                                                                                     | Mission triage full refresh (blocked)         |
| Slice doc (this file) + planning index row                                                                                                                             | Reopen Done children SPE-2111 / SPE-2114      |
| Fix [SPE-31](https://linear.app/spectranoir/issue/SPE-31) / [SPE-2468](https://linear.app/spectranoir/issue/SPE-2468) Linear drift → **Done** if still **In Progress** | Mark SPE-947 or SPE-1046 parent **Done**      |

## Acceptance

- [x] SPE-947 parent AC re-evaluated — matrix above posted to Linear parent + grooming child
- [x] SPE-1046 parent AC re-evaluated — matrix above posted to Linear parent + grooming child
- [x] SPE-947 and SPE-1046 remain **Backlog** on Linear; SPE-2111 and SPE-2114 remain **Done**
- [x] Parent deferred tables on Linear list unmet AC → sibling/backlog owners (not one-liners)
- [x] `planning/backlog.md` § Recommended next step updated post reconciliation
- [x] Docs-only diff; SPE-31 / SPE-2468 Linear drift fixed → **Done** (auto-close hygiene)

## Deferred (parent umbrellas — not grooming slice scope)

### SPE-947 umbrella

| Item                                                                  | Suggested owner                                                                                                                | Why deferred                                                                                                                             |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Platform nodes with reach, uptime, audience, propagation reliability  | New SPE-947 child (slice 5+ gate)                                                                                              | Parent AC row 1 at SPE-2481; **superseded** — domain evaluator shipped SPE-2568; GameState/weekly/UI wire-up still open (see SPE-2575)   |
| Counter-memetic lore craft + distributor + uptake pipeline            | New SPE-947 child                                                                                                              | Parent AC row 3 at SPE-2481; **superseded** — domain evaluator shipped SPE-2570; wire-up still open                                      |
| Content-owner takedown resistance (audience/status incentives)        | New SPE-947 child                                                                                                              | Parent AC row 5 at SPE-2481; **superseded** — domain evaluator shipped SPE-2572; wire-up still open                                      |
| Post-case media persistence (mirrors, adaptations, commercialization) | New SPE-947 child or SPE-1085 fold-in                                                                                          | Parent AC row 6 at SPE-2481; **superseded** — domain evaluator shipped SPE-2573; adaptation/commercialization kinds + wire-up still open |
| Propagation graph wire-up                                             | [SPE-956](https://linear.app/spectranoir/issue/SPE-956) / harvest #965 family                                                  | Cross-parent; carved out since SPE-2111 slice 1 — does not block SPE-947 AC ([SPE-2618](https://linear.app/spectranoir/issue/SPE-2618))  |
| Pursuit vector simulator integration                                  | **Done** — [SPE-2604](https://linear.app/spectranoir/issue/SPE-2604)                                                           | Shipped PR #3112                                                                                                                         |
| Countermeasure ledger link                                            | **Done** — [SPE-2605](https://linear.app/spectranoir/issue/SPE-2605)                                                           | Shipped PR #3114                                                                                                                         |
| GameState / weekly / UI wire-up for SPE-947 evaluators                | **Done** — [SPE-2576](https://linear.app/spectranoir/issue/SPE-2576)–[SPE-2617](https://linear.app/spectranoir/issue/SPE-2617) | Wire-up chain shipped; see `planning/spe-947-parent-umbrella-reconciliation-slice-2.md`                                                  |

### SPE-1046 umbrella

| Item                                                                 | Suggested owner                    | Why deferred                                         |
| -------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------- |
| Status class permission sets (rooms, files, gear, housing, missions) | New SPE-1046 child (slice 5+ gate) | Parent AC rows 1, 7                                  |
| Recruitment / onboarding / clearance elevation pipeline              | New SPE-1046 child                 | Parent AC row 2                                      |
| Site-specific clearance and facility exclusion                       | New SPE-1046 child                 | Parent AC row 3                                      |
| Dual-loyalty overlap risk                                            | New SPE-1046 child                 | Parent AC row 4                                      |
| Protected-status action restrictions                                 | New SPE-1046 child                 | Parent AC row 5                                      |
| Revocation/downgrade → access/trust outcome wire-up                  | New SPE-1046 child                 | Parent AC row 6                                      |
| SPE-2114 → SPE-1046 affiliation status wire-up                       | SPE-1046 child (post-grooming)     | Explicit deferral in SPE-2114 slice 1–4 docs         |
| SPE-1203 veterinary cross-check                                      | SPE-1203                           | Sibling scope                                        |
| SPE-1310 case lifecycle integration                                  | SPE-1310 (**Done** parent)         | Lifecycle engine shipped; affiliation layer separate |

## Validation

Docs-only — no `npm run test:run` required for hygiene boundary.

## See also

- `planning/spe-947-parent-ac-matrix-reconciliation-slice-1.md` (canonical SPE-947 matrix after SPE-2568–2574)
- `planning/spe-947-parent-umbrella-reconciliation-slice-2.md` (umbrella disposition after SPE-2576–2617)
- `planning/visual-trigger-hazard-registry-slice-{1..4}.md`
- `planning/entity-welfare-reclassification-registry-slice-{1..4}.md`
- `planning/spe-1888-parent-acceptance-review-slice-7.md`
- `planning/spe-31-parent-reconciliation-slice.md`
- `planning/scope-discipline-grooming-pass.md`
- `planning/backlog.md`

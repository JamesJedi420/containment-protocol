# Near-term backlog

This file is the **canonical ordered queue** for concrete engineering and design follow-ups that were previously split across `README.md` and high-level hints in `planning/roadmap.md`. **Edit order here when priorities change**; avoid duplicating long tactical lists elsewhere.

**How to use:** Pick from the active queue unless a dependency blocks it. Larger sequencing philosophy stays in `planning/roadmap.md` (phases, risks, §11 / §15).

## Context (not always a single task)

From `README.md` **Current design notes**:

- Concealment activation stack and hidden-modality matrix slices 1–5 shipped (SPE-2281–SPE-2285 / PR #2403–#2411); [SPE-70](https://linear.app/spectranoir/issue/SPE-70) umbrella remains for mode-specific tells and optional post-matrix modality families — see Shipped table and active queue below.
- Shared explanatory ownership stays in the domain wherever possible.
- Prefer compact reusable rules vocabularies over bespoke subsystem logic.
- Optional modules integrate through explicit contracts, not shared mutable state.

## Active queue (highest leverage first — reorder as needed)

1. **Hidden / disguised activation — remaining umbrella scope** — [SPE-70](https://linear.app/spectranoir/issue/SPE-70/hidden-state-displacement-and-counter-detection-layer) parent: optional post-matrix modality families (signature masking, false-detection output, glamour). **Next matrix slice:** [SPE-2286](https://linear.app/spectranoir/issue/SPE-2286) mode-specific tells — `planning/hidden-modality-matrix-slice-6.md`. **Shipped:** concealment activation, batch-4, infiltration stack, SPE-781 reveal, matrix slices 1–5 (PR #2403–#2411).
2. **Infiltration optional content depth** — Batch-4 probe/cover/leave-behind and report copy slice complete (`src/domain/infiltrationEncounterReportNotes.ts`). Further authored content only; not new probe mechanics.
3. **Scope discipline** — Resist broadening planning into too many simultaneous future branches until the central machine is more real (`planning/roadmap.md` §15).
4. **Docs hygiene** — [SPE-2280](https://linear.app/spectranoir/issue/SPE-2280) shipped (PR #2412); [SPE-2278](https://linear.app/spectranoir/issue/SPE-2278) case-prep planning docs reconciled (SPE-2251 / SPE-626 / SPE-70 prep / SPE-2247).

## Blocked / waiting

- **Mission triage full refresh** — Mission-triage slices 1–6 shipped (covert row signals, deferral compare, split layout, status-bar tail, disposition actions, list scan chips); further triage expansion deferred until triage UI is the primary implementation target — see `ux/mission-triage.md` spec status block.
- **Core UX specs — mission triage** — Operations Report + navigation map for batch-4 covert notes and report week prev/next are closed (`ux/operations-report.md` §5.3.1, `ux/navigation-map.md` §3.5.1–3.5.2). Mission Triage full refresh remains blocked on triage UI being the implementation target.

## Shipped (May 2026)

| Item                                                                                             | Outcome                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Route and week navigation**                                                                    | Report prev/next (`planning/report-week-navigation-slice.md`, PR #2329); operations drill-down (`planning/operations-route-drill-down-slice.md`, [SPE-2248](https://linear.app/spectranoir/issue/SPE-2248)).                                                                                                                |
| **Hidden / disguised activation — batch-4 stack**                                                | Runtime, authored triggers, weekly prep UI, activation event feed, batch-4 concealment migration ([SPE-2249](https://linear.app/spectranoir/issue/SPE-2249)), full batch-4 infiltration stack slices 1–2 ([SPE-2250](https://linear.app/spectranoir/issue/SPE-2250), `planning/infiltration-encounter-content-slice-2.md`). |
| **Infiltration report copy slice**                                                               | Weekly encounter + leave-behind tradeoff notes in `src/domain/infiltrationEncounterReportNotes.ts`.                                                                                                                                                                                                                         |
| **Tiered detection / reveal payloads ([SPE-781](https://linear.app/spectranoir/issue/SPE-781))** | Slices 1–5 shipped (PR #2342 / #2344 / #2346 / #2347).                                                                                                                                                                                                                                                                      |
| **Archived prototype hygiene**                                                                   | Guard test `src/test/archivedPrototypeHygiene.test.ts`; vitest/eslint already exclude `docs/archived/**`; no active `src` imports.                                                                                                                                                                                          |
| **Core UX specs (#4)**                                                                           | **Closed.** Operations Report + navigation map for batch-4 covert notes and report week prev/next (`ux/operations-report.md` §5.3.1, `ux/navigation-map.md` §3.5.1–3.5.2).                                                                                                                                                  |
| **Tuning and QA references**                                                                     | Infiltration/concealment tuning reference, QA matrix, edge-case §12.6–12.9, integration Scenario F. **SPE-25 calibration pass (May 2026):** MVP harness confirms current probe/action deltas — no constant changes; anchor `src/test/weeklyMvpLoopProof.calibration.test.ts`.                                               |
| **MVP loop proof ([SPE-2251](https://linear.app/spectranoir/issue/SPE-2251))**                   | Slice 1 + slice 2 persistence/4-week fixture (`src/test/weeklyMvpLoopProof.slice2.integration.test.ts`; see `planning/mvp-weekly-loop-proof-slice-1.md`).                                                                                                                                                                  |

## Harvest reconciliation (SCP-9995 — May 2026)

**Status:** design harvest only — not canon, not player-facing copy, not an implementation commitment. This section maps external design extraction themes to existing Linear owners or explicit gaps. It is **non-authoritative** for sequencing; reorder the active queue above when priorities change.

**Content policy:** Do not use SCP wiki URLs or SCP numbers in player-facing copy without licensing/content review. Translate harvest ideas into bounded institutional-sim mechanics (deterministic weekly SPA), not a live 3D engine, hardware/camera stack, or wiki implementation.

| Theme                            | Candidate bundle (Containment Protocol reading)                                                                                                           | Existing Linear owner / likely fold-in                                                                                                                                                                                                                                                          | Status / action                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Layered operational truth / map  | Separate visible operational picture from collision/inferred geometry, internal telemetry, and unresolved layers; capacity or state outside modeled zones | [SPE-1317](https://linear.app/spectranoir/issue/SPE-1317) (uncertain / map certainty), [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) (layered truth, supersession), [SPE-1464](https://linear.app/spectranoir/issue/SPE-1464) (path-fact vs node-assumption validation)             | **Fold** into planning; no new issue                                     |
| Access via edge cases            | Procedures gated by non-ordinary inputs (precision, exploit-shaped prerequisites) without a real cheat engine                                             | [SPE-1464](https://linear.app/spectranoir/issue/SPE-1464) (structured node prerequisites), authored-branch patterns in-repo                                                                                                                                                                     | **Defer** dedicated “exploit access” slice until branch validator exists |
| Observation & proxies            | Live vs mediated viewing; sensor/proxy targets vs body targets; observation as risk and tool                                                              | [SPE-941](https://linear.app/spectranoir/issue/SPE-941), [SPE-428](https://linear.app/spectranoir/issue/SPE-428), [SPE-529](https://linear.app/spectranoir/issue/SPE-529), [SPE-1285](https://linear.app/spectranoir/issue/SPE-1285), [SPE-1519](https://linear.app/spectranoir/issue/SPE-1519) | **Fold** into existing visibility/sensing backlog                        |
| Civilian / OSINT pipeline        | Civilian optimization communities, crawler blind spots, black-box inference, triage false negatives                                                       | [SPE-1043](https://linear.app/spectranoir/issue/SPE-1043), weekly report / operations surfaces in-repo                                                                                                                                                                                          | **Fold** where possible; **gap** for formal OSINT/crawler coverage model |
| Persistence & volatility         | Non-persistent hidden state, cross-site channels with delay, volatile anomalous storage                                                                   | [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085), [SPE-1327](https://linear.app/spectranoir/issue/SPE-1327), [SPE-925](https://linear.app/spectranoir/issue/SPE-925), [SPE-1314](https://linear.app/spectranoir/issue/SPE-1314)                                                        | **Fold** into archive/containment policy issues                          |
| Post-failure normalcy & politics | Exposure-management posture after containment failure; suppression vs strategic value; institutional tradeoffs                                            | [SPE-1011](https://linear.app/spectranoir/issue/SPE-1011), [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085), faction/legitimacy routing in `planning/milestones.md`                                                                                                                    | **Checklist** in planning; **fold** before new tickets                   |
| Digital ↔ physical bridge        | Cumulative exposure and specific cognitive deficits from repeated mediated contact                                                                        | In-repo injury/stress/attrition paths, [SPE-1285](https://linear.app/spectranoir/issue/SPE-1285) (exposure states)                                                                                                                                                                              | **Fold** or **defer** until injury model owns cumulative deficits        |
| Contradiction checks             | Policy tensions (suppression vs exploitation, safe recording vs dangerous procedure spread, observation as hazard and tool)                               | [SPE-1464](https://linear.app/spectranoir/issue/SPE-1464) first (branch/path contradictions), [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) later (canon-layer contradictions)                                                                                                      | **Checklist only** — not implementation tickets                          |

### Do not create yet

- Do not open dozens of new Linear issues from this harvest.
- Do not implement literal camera blink, memory corruption timers, download-count thresholds, or live hardware/sensor assumptions.
- Do not treat the harvest as a mandate for virtual-world simulation, public tool distribution, or source-code decompilation mechanics in this repo slice.
- Do not start implementation until a slice owner and testable boundary exist (fixtures + pure helpers preferred).

### Next actionable owners & references (planning hint)

- **[SPE-1464](https://linear.app/spectranoir/issue/SPE-1464)** — near-term implementation candidate for branch/path continuity validation and contradiction-style warnings on authored graphs.
- **[SPE-1085](https://linear.app/spectranoir/issue/SPE-1085)** — broader canon, layered truth, supersession, and campaign-memory owner (defer broad lore engine).
- **[SPE-1317](https://linear.app/spectranoir/issue/SPE-1317)** — uncertain-state / evidence-collapse owner for inferred or unseen operational facts.
- **Observation/proxy candidates** — fold into [SPE-941](https://linear.app/spectranoir/issue/SPE-941), [SPE-428](https://linear.app/spectranoir/issue/SPE-428), [SPE-529](https://linear.app/spectranoir/issue/SPE-529), [SPE-1285](https://linear.app/spectranoir/issue/SPE-1285), [SPE-1519](https://linear.app/spectranoir/issue/SPE-1519) before any new visibility issue.
- **[SPE-1734](https://linear.app/spectranoir/issue/SPE-1734)** (Done) — campaign rules/ledger is available for profile anchoring; not a substitute for branch continuity validation.

## Planning slice index (`planning/*-slice.md`)

Git-visible implementation plans for agent sessions. **Linear issue state is authoritative** for Done / In Progress; this index is for navigation and stale-doc avoidance. Do not delete shipped plans—they document boundaries and validation notes.

| File                                                      | Classification | Notes                                                         |
| --------------------------------------------------------- | -------------- | ------------------------------------------------------------- |
| `concealment-case-prep-slice.md`                          | **Shipped**    | SPE-70 concealment case prep panel; PR #2326.                 |
| `concealment-activation-event-feed-slice.md`              | **Shipped**    | Event feed + report notes; see Shipped table (batch-4 stack). |
| `concealment-triggers-migration-batch-4-slice.md`         | **Shipped**    | SPE-2249 batch-4 templates.                                   |
| `infiltration-case-prep-slice.md`                         | **Shipped**    | SPE-521 prep panel; keep for patterns.                        |
| `infiltration-encounter-content-slice-1.md`               | **Shipped**    | SPE-2250 stack slice 1.                                       |
| `infiltration-encounter-content-slice-2.md`               | **Shipped**    | SPE-2250 stack slice 2.                                       |
| `investigation-question-case-prep-slice.md`               | **Shipped**    | SPE-626 UI; links forward to concealment prep.                |
| `mission-triage-covert-prep-slice.md`                     | **Shipped**    | SPE-2255 slice 1.                                             |
| `mission-triage-deferral-compare-slice.md`                | **Shipped**    | SPE-2256 slice 2.                                             |
| `mission-triage-layout-slice.md`                          | **Shipped**    | SPE-2257 slice 3.                                             |
| `mission-triage-status-bar-slice.md`                      | **Shipped**    | SPE-2258 slice 4.                                             |
| `mission-triage-disposition-slice.md`                     | **Shipped**    | SPE-16 slice 5 disposition.                                   |
| `mission-triage-list-scan-slice.md`                       | **Shipped**    | SPE-2259 slice 6; parent SPE-16 Done.                         |
| `mvp-weekly-loop-proof-slice-1.md`                        | **Shipped**    | SPE-2251 slice 1; see Shipped MVP loop proof.                 |
| `operations-route-drill-down-slice.md`                    | **Shipped**    | SPE-2248 / PR drill-down.                                     |
| `report-week-navigation-slice.md`                         | **Shipped**    | Route and week navigation (PR #2329, [SPE-2248](https://linear.app/spectranoir/issue/SPE-2248) drill-down sibling); acceptance checkboxes complete. |
| `hidden-modality-matrix-slice-1.md`                       | **Shipped**    | SPE-2281 / PR #2403; domain compose.                          |
| `hidden-modality-matrix-slice-2.md`                       | **Shipped**    | SPE-2282 / PR #2405; weekly orchestration wiring.              |
| `hidden-modality-matrix-slice-3.md`                       | **Shipped**    | SPE-2283 / PR #2407; modality report copy.                    |
| `hidden-modality-matrix-slice-4.md`                       | **Shipped**    | SPE-2284 / PR #2409; persistent recon cache.                 |
| `hidden-modality-matrix-slice-5.md`                       | **Shipped**    | SPE-2285 / PR #2411; false-entity / structural-illusion lifecycle. |
| `hidden-modality-matrix-slice-6.md`                       | **Active**     | SPE-2286; mode-specific tells / observer-threshold (next).       |
| `reveal-payload-slice-1.md` … `reveal-payload-slice-5.md` | **Shipped**    | SPE-781 slices 1–5; sequential stack.                         |
| `stealth-leave-behind-tradeoff-selection-slice-5.md`      | **Shipped**    | SPE-2247 / PR #2323.                                          |

**Superseded / stale:** none identified for deletion (May 2026). If a slice doc contradicts `main` or Linear, add a one-line status banner at the top of that file instead of removing it.

**Reference-only (not a queue):** shipped rows above remain useful for test boundaries, file pointers, and PR archaeology.

## See also

- `planning/roadmap.md` — phases, dependencies, deferrals, review questions
- `planning/milestones.md` — milestone proof points and label policy link
- `planning/harvest-reconciliation-index.md` — harvest bundle index and fold-in ledger
- `architecture/game-state-and-core-loop.md` — systems map and architecture index
- `planning/deferred-design-documents.md` — SPE-186+ and knowledge child issues without in-repo deep docs yet
- `planning/documentation-curation.md` — when to update backlog, maps, mirrors, and audits

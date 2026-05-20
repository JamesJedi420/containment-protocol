# Near-term backlog

This file is the **canonical ordered queue** for concrete engineering and design follow-ups that were previously split across `README.md` and high-level hints in `planning/roadmap.md`. **Edit order here when priorities change**; avoid duplicating long tactical lists elsewhere.

**How to use:** Pick from the top unless a dependency blocks it. Larger sequencing philosophy stays in `planning/roadmap.md` (phases, risks, §11 / §15).

## Context (not always a single task)

From `README.md` **Current design notes**:

- Hidden or disguised activation beyond already-hidden cases remains a follow-up surface.
- Shared explanatory ownership stays in the domain wherever possible.
- Prefer compact reusable rules vocabularies over bespoke subsystem logic.
- Optional modules integrate through explicit contracts, not shared mutable state.

## Queue (highest leverage first — reorder as needed)

1. **Hidden / disguised activation** — Runtime, authored triggers, weekly prep UI, activation event feed, batch-4 concealment migration (SPE-2249), and full batch-4 infiltration stack (SPE-2250 slices 1–2; `planning/infiltration-encounter-content-slice-2.md`) shipped.
2. **Infiltration and access follow-through** — [SPE-2250](https://linear.app/spectranoir/issue/SPE-2250/infiltration-encountercontent-follow-through-post-spe-521-substrate) batch-4 probe/cover/leave-behind complete; further encounter depth beyond authored stacks is optional follow-up (not new probe mechanics).
3. **Route and week navigation** — Report prev/next shipped (`planning/report-week-navigation-slice.md`, PR #2329); operations drill-down shipped (`planning/operations-route-drill-down-slice.md`, SPE-2248).
4. **Core UX specs** — Finish or refresh core UX specs so surfaces match canonical domain outputs (`planning/roadmap.md` §15).
5. **Tuning and QA references** — Complete tuning references and QA references, then use them to harden implementation sequencing (same roadmap section).
6. **MVP loop proof** — Drive implementation toward trustworthy end-to-end weekly loop proof before broadening (`planning/roadmap.md` phases 1–2).
7. **Scope discipline** — Resist broadening planning into too many simultaneous future branches until the central machine is more real (`planning/roadmap.md` §15).
8. **Archived prototype hygiene** — Keep archived prototype code out of active runtime paths unless intentionally revived (`README.md` former “next steps”).

## SCP-9995 harvest — May 2026 reconciliation

**Status:** design harvest only — not canon, not player-facing copy, not an implementation commitment. This section maps external design extraction themes to existing Linear owners or explicit gaps. It is **non-authoritative** for sequencing; reorder the queue above when priorities change.

**Content policy:** Do not use SCP wiki URLs or SCP numbers in player-facing copy without licensing/content review. Translate harvest ideas into bounded institutional-sim mechanics (deterministic weekly SPA), not a live 3D engine, hardware/camera stack, or wiki implementation.

| Theme | Candidate bundle (Containment Protocol reading) | Existing Linear owner / likely fold-in | Status / action |
| --- | --- | --- | --- |
| Layered operational truth / map | Separate visible operational picture from collision/inferred geometry, internal telemetry, and unresolved layers; capacity or state outside modeled zones | [SPE-1317](https://linear.app/spectranoir/issue/SPE-1317) (uncertain / map certainty), [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) (layered truth, supersession), [SPE-1464](https://linear.app/spectranoir/issue/SPE-1464) (path-fact vs node-assumption validation) | **Fold** into planning; no new issue |
| Access via edge cases | Procedures gated by non-ordinary inputs (precision, exploit-shaped prerequisites) without a real cheat engine | [SPE-1464](https://linear.app/spectranoir/issue/SPE-1464) (structured node prerequisites), authored-branch patterns in-repo | **Defer** dedicated “exploit access” slice until branch validator exists |
| Observation & proxies | Live vs mediated viewing; sensor/proxy targets vs body targets; observation as risk and tool | [SPE-941](https://linear.app/spectranoir/issue/SPE-941), [SPE-428](https://linear.app/spectranoir/issue/SPE-428), [SPE-529](https://linear.app/spectranoir/issue/SPE-529), [SPE-1285](https://linear.app/spectranoir/issue/SPE-1285), [SPE-1519](https://linear.app/spectranoir/issue/SPE-1519) | **Fold** into existing visibility/sensing backlog |
| Civilian / OSINT pipeline | Civilian optimization communities, crawler blind spots, black-box inference, triage false negatives | [SPE-1043](https://linear.app/spectranoir/issue/SPE-1043), weekly report / operations surfaces in-repo | **Fold** where possible; **gap** for formal OSINT/crawler coverage model |
| Persistence & volatility | Non-persistent hidden state, cross-site channels with delay, volatile anomalous storage | [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085), [SPE-1327](https://linear.app/spectranoir/issue/SPE-1327), [SPE-925](https://linear.app/spectranoir/issue/SPE-925), [SPE-1314](https://linear.app/spectranoir/issue/SPE-1314) | **Fold** into archive/containment policy issues |
| Post-failure normalcy & politics | Exposure-management posture after containment failure; suppression vs strategic value; institutional tradeoffs | [SPE-1011](https://linear.app/spectranoir/issue/SPE-1011), [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085), faction/legitimacy routing in `planning/milestones.md` | **Checklist** in planning; **fold** before new tickets |
| Digital ↔ physical bridge | Cumulative exposure and specific cognitive deficits from repeated mediated contact | In-repo injury/stress/attrition paths, [SPE-1285](https://linear.app/spectranoir/issue/SPE-1285) (exposure states) | **Fold** or **defer** until injury model owns cumulative deficits |
| Contradiction checks | Policy tensions (suppression vs exploitation, safe recording vs dangerous procedure spread, observation as hazard and tool) | [SPE-1464](https://linear.app/spectranoir/issue/SPE-1464) first (branch/path contradictions), [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) later (canon-layer contradictions) | **Checklist only** — not implementation tickets |

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

## See also

- `planning/roadmap.md` — phases, dependencies, deferrals, review questions
- `planning/milestones.md` — milestone proof points and label policy link
- `architecture/game-state-and-core-loop.md` — systems map and architecture index
- `planning/deferred-design-documents.md` — SPE-186+ and knowledge child issues without in-repo deep docs yet
- `planning/documentation-curation.md` — when to update backlog, maps, mirrors, and audits

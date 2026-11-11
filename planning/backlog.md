# Near-term backlog

Canonical near-term queue; Linear owns scope, lifecycle, priority, and dependencies.
This is a curated shortlist checked on 2026-11-01, not an automated readiness projection.
Continue existing work first; confirm blockers and an approved bounded slice in Linear before starting a Backlog item.
Parent entries coordinate child work, not whole-umbrella implementation.

## Active queue

- [SPE-3735](https://linear.app/spectranoir/issue/SPE-3735) — Breach-origin recovery and verified recontainment handoff (In Progress; live store wiring shipping; Done only when §1 evidenced).
- [SPE-3055](https://linear.app/spectranoir/issue/SPE-3055) — Operational personnel claim arbitration (In Progress; operation claim seam shipped; full arbitration AC deferred).
- [SPE-1095](https://linear.app/spectranoir/issue/SPE-1095) — Movement channels, thoroughfare flow, and route control (In Progress; recovery-movement outcome seam shipped; full thoroughfare AC deferred).
- [SPE-104](https://linear.app/spectranoir/issue/SPE-104) — Capture & restraint weapon interactions (In Progress; capture-secure outcome seam shipped; full weapon AC deferred).
- [SPE-3338](https://linear.app/spectranoir/issue/SPE-3338) — Authoritative approved-work queue projection (In Progress; live-source verification blocked — not the coding slice).
- [SPE-1064](https://linear.app/spectranoir/issue/SPE-1064) — Unified creature actor and capability taxonomy (In Progress; umbrella-scale — not the active coding slice).
- [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Facility institution integration (Backlog; select bounded child work).
- [SPE-1051](https://linear.app/spectranoir/issue/SPE-1051) — Recoverable failure and campaign scars (Backlog; review remaining acceptance).
- [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028) — Department workshop and processing queues (Backlog; coordinate remaining child work).
- [SPE-1564](https://linear.app/spectranoir/issue/SPE-1564) — Facility lifecycle state machine (Backlog).

## Recommended next step (agent handoff)

**Current handoff (primary):** SPE-1052 — coordinate the next approved facility child.
**In progress:** SPE-3735 (coding; live store wiring); SPE-3055 / SPE-1095 / SPE-104 (full AC deferred; not coding); SPE-3338 (live-source verification blocked; not coding).
**Coding slice:** SPE-3735 — live wiring (`planning/spe-3735-breach-origin-recovery-slice.md`).
**After SPE-3735 live wiring:** keep SPE-3735 Done only when acceptance §1 evidenced; otherwise progress comment and continue deferred remainders.

## Maintenance and history

Keep roughly ten active items, one line each; remove completed or canceled items.
Record shipped evidence in Linear and the relevant slice doc, never in this queue.
Update [the handoff manifest](backlog-handoff-manifest.json) in the same commit and run `npm run verify:backlog-handoff`.
The [frozen former backlog](backlog-history-2026-11-01.md) preserves shipped history, old handoffs, harvest notes, and the slice index verbatim; its status and priority claims are historical, not current instructions.
See [roadmap](roadmap.md) for sequencing constraints and [curation](documentation-curation.md) for maintenance rules.

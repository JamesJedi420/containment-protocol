# Near-term backlog

Canonical near-term queue; Linear owns scope, lifecycle, priority, and dependencies.
This is a curated shortlist checked on 2026-11-01, not an automated readiness projection.
Continue existing work first; confirm blockers and an approved bounded slice in Linear before starting a Backlog item.
Parent entries coordinate child work, not whole-umbrella implementation.

## Active queue

- [SPE-992](https://linear.app/spectranoir/issue/SPE-992) — Hidden-room building graph (In Progress).
- [SPE-2910](https://linear.app/spectranoir/issue/SPE-2910) — Workshop clutter/disorder consequences (In Progress).
- [SPE-1064](https://linear.app/spectranoir/issue/SPE-1064) — Unified creature actor and capability taxonomy (In Progress).
- [SPE-3338](https://linear.app/spectranoir/issue/SPE-3338) — Authoritative approved-work queue projection (In Progress; finish live-source verification).
- [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052) — Facility institution integration (Backlog; select bounded child work).
- [SPE-1051](https://linear.app/spectranoir/issue/SPE-1051) — Recoverable failure and campaign scars (Backlog; review remaining acceptance).
- [SPE-1028](https://linear.app/spectranoir/issue/SPE-1028) — Department workshop and processing queues (Backlog; coordinate remaining child work).
- [SPE-110](https://linear.app/spectranoir/issue/SPE-110) — Construction progress and interference (Backlog; prerequisite SPE-395 is Done).
- [SPE-1564](https://linear.app/spectranoir/issue/SPE-1564) — Facility lifecycle state machine (Backlog).
- [SPE-792](https://linear.app/spectranoir/issue/SPE-792) — Facility core dependency graph (Backlog).

## Recommended next step (agent handoff)

**Current handoff (primary):** SPE-1052 — coordinate the next approved facility child.
**In progress:** SPE-992, SPE-2910, SPE-1064, SPE-3338.

## Maintenance and history

Keep roughly ten active items, one line each; remove completed or canceled items.
Record shipped evidence in Linear and the relevant slice doc, never in this queue.
Update [the handoff manifest](backlog-handoff-manifest.json) in the same commit and run `npm run verify:backlog-handoff`.
The [frozen former backlog](backlog-history-2026-11-01.md) preserves shipped history, old handoffs, harvest notes, and the slice index verbatim; its status and priority claims are historical, not current instructions.
See [roadmap](roadmap.md) for sequencing constraints and [curation](documentation-curation.md) for maintenance rules.

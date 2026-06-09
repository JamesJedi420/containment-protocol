# Backlog handoff hygiene pass (slice 2)

One-page grooming record. Follows shipped [SPE-2414](https://linear.app/spectranoir/issue/SPE-2414) lifecycle institutional-label split (PR #2697).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2415 — Backlog handoff hygiene pass slice 2 (post SPE-2414)](https://linear.app/spectranoir/issue/SPE-2415) |
| **Branch** | `spe-2415-backlog-handoff-hygiene-slice-2`                                                                 |
| **Status** | Ready for PR                                                                                               |
| **Base `main` SHA** | `e7943029`                                                                                          |

## Goal

Reconcile stale planning handoffs after SPE-1310 slices 1–6 and correct Linear parent statuses for groomed registry umbrellas. **SPE-1888 grooming (SPE-2400) already shipped** — this slice is handoff hygiene only, not a duplicate acceptance review.

## Prerequisite (on `main` @ `e7943029`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Lifecycle slice 6    | [SPE-2414](https://linear.app/spectranoir/issue/SPE-2414) / PR #2697 — `lifecycleInstitutionalLabel` |
| Parent acceptance reviews | [SPE-2399](https://linear.app/spectranoir/issue/SPE-2399)–[SPE-2402](https://linear.app/spectranoir/issue/SPE-2402) / PR #2667–#2673 |
| SPE-1310 lifecycle engine | [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) **Done** on Linear (slices 1–6) |

## Handoff drift fixed

| Artifact | Problem | Action |
| --- | --- | --- |
| `planning/backlog.md` § Context | Listed SPE-1310 among Backlog parents | SPE-1310 **Done**; SPE-1309 / SPE-1343 / SPE-1888 groomed **Backlog** |
| `planning/backlog.md` § Recommended next step | Base SHA `df6a9ad9`; vague next target | Update to `e7943029`; name [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) coercive debt-creation follow-up as primary open AC |
| Shipped table — SPE-1310 slice 6 | PR pending | **Shipped** @ PR #2697 |
| Shipped table — SPE-2117 / SPE-2123 | Parent SPE-1310 **Backlog** | Parent **Done** |
| Linear SPE-1309 / SPE-1343 / SPE-1888 | **Done** after grooming close | Return to **Backlog** per acceptance-review disposition |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `planning/backlog.md` handoff + shipped-table drift                | Duplicate SPE-1888 grooming doc               |
| Slice doc (this file) + planning index row                         | Mission triage institutional-label chips      |
| Linear hygiene on groomed parents + [SPE-2415](https://linear.app/spectranoir/issue/SPE-2415) | Runtime implementation                        |

## Acceptance

- [x] Recommended next step and base SHA current post SPE-2414 merge
- [x] SPE-1310 **Done** reflected; groomed parents **Backlog** on Linear
- [x] No duplicate SPE-1888 acceptance-review doc
- [x] Docs-only diff

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Coercive procedure → welfare-debt creation | [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) | Primary open AC per SPE-2400 grooming |
| Unified cognitive hazard engine runtime | [SPE-1309](https://linear.app/spectranoir/issue/SPE-1309) | Parent AC not met per SPE-2399 |
| Truth-layer split runtime | [SPE-1343](https://linear.app/spectranoir/issue/SPE-1343) | Parent AC not met per SPE-2401 |
| Mission triage institutional-label chips | Mission triage refresh | Blocked per `ux/mission-triage.md` |

## Validation

Docs-only — no `npm run test:run` required.

## See also

- `planning/spe-1888-parent-acceptance-review-slice-1.md`
- `planning/backlog-handoff-hygiene-slice-1.md`
- `planning/anomaly-case-lifecycle-state-machine-slice-6.md`

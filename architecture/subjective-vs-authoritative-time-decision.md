# SPE-3180 — Subjective/local elapsed time versus authoritative simulation time

| Field | Value |
| --- | --- |
| **Status** | Architecture decision (contradiction check) |
| **Issue** | [SPE-3180](https://linear.app/spectranoir/issue/SPE-3180) |
| **Parent** | [SPE-1071](https://linear.app/spectranoir/issue/SPE-1071) — remains authoritative clock owner |
| **Machine contract** | `src/domain/subjectiveVsAuthoritativeTimeContradiction.ts` |
| **Base main SHA** | `57f4e043d32311ae113a706d2b369534dac6eef7` |

## Overall decision

**SPE-1071** remains the **sole authoritative clock** for world ordering, schedules, deadlines, persistence anchors, and scheduled world events.

**Local/subjective elapsed time** is represented as **caller-owned per-entity (or per-domain) accumulated markers**, updated by **rate projections over authoritative elapsed weeks** ([SPE-3384](https://linear.app/spectranoir/issue/SPE-3384) `applyElapsedTimeUpdate`). This is **not** a second simulation clock.

## Preserved boundaries

| Owner | Role |
| --- | --- |
| SPE-1071 | Authoritative campaign week and global scheduling |
| SPE-3384 | Deterministic rate-based marker updates for equal authoritative elapsed time |
| SPE-815 | Weird-room local rule overrides; may assign local rates or presentation, not a competing authoritative clock |
| SPE-227 | Noncelestial/distorted timekeeping and timing confidence; unreadable clocks ≠ automatic elapsed divergence |
| SPE-1757 | Extranormal temporal-event records consume this decision |
| SPE-3161 | Multiplayer pause/speed must not reinterpret local markers as alternate authoritative time |
| SPE-964 | Asymmetric off-map labor may consume local markers after bounded implementation (not rejected by this check) |

## Consumption split (summary)

- **Authoritative global:** schedules, deadlines, global incident chronology, global procurement cadence, SPE-1757 record keys.
- **Local accumulated markers:** biological aging/exposure/fatigue, recovery/cooldowns, domain-local task progress, domain-local anomaly progression, future SPE-964 off-map labor.

Full table: `SUBSYSTEM_CONSUMPTION_RULES` in the domain module.

## Transfer, persistence, presentation

- **Transfer/rejoin:** authoritative week unchanged on transfer; local markers travel with entity/domain packets; global events stay keyed to SPE-1071.
- **Persistence:** one authoritative week anchor; local markers + SPE-3384 remainders on owning records; save/load/replay must not duplicate ticks or skip authoritative consequences.
- **Presentation:** perceived/local clocks may differ from authoritative schedules; UI must not imply perception is world time (SPE-227 / SPE-815).

## Scenario fixtures

Linear acceptance scenarios are validated in `validateSubjectiveTimeScenario` and covered by `subjectiveVsAuthoritativeTimeContradiction.test.ts`.

## Candidate follow-ups (not Phase-4 created)

1. **SPE-964** — implement asymmetric off-map labor using local markers under SPE-964.
2. **SPE-1757** — consume resolved semantics for temporal-event records.
3. **Domain producers** — persist markers/remainders when wiring biological or off-map progress.

This check does **not** implement generic time-dilation gameplay or create Linear children.

# Support Specialist Multipliers and Bottlenecks (SPE-94)

## Purpose

**Scarce support roles** (medic, engineer, signals, ritualist, logistics chief, etc.) are **agency-side capability multipliers** and **visible bottlenecks** — not flat +5% bonuses on a spreadsheet.

## Multiplier semantics

When present and unblocked, a specialist **unlocks or amplifies** throughput:

- faster recovery queues,
- higher research parallelism,
- maintenance throughput,
- ritual safety margins,
- or procurement validation speed.

Effects should be **path-unlocking** where possible (“cannot start project X without signals lead”) rather than invisible dice.

## Bottleneck semantics

**Loss**, **injury**, **overcommitment** (split across too many missions), or **training absence** collapses multiplier bands and may **hard-block** downstream paths until relieved.

## Player-facing identification

UI and weekly reports must state **which dependency helped or blocked** (“maintenance bottleneck delayed gear return,” “no senior medic — trauma ladder capped at stabilization only”).

## Integration

- **Team management** — support capacity interacts with roster and training (`systems/team-management.md`).
- **SPE-93 external support** — contractors may temporarily fill multiplier slots at trust risk.

## Anti-patterns

- Aggregating all support into one `supportAvailable` number with no explainable bottleneck map.

## See also

- `architecture/external-support-reliability-trust.md` — SPE-93
- `systems/support-operations.md`
- `tuning/support-and-specialist-capacity.md`

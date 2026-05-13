# Morale Break States and Panic Branching (SPE-155)

## Purpose

Morale is a standard behavior variable with **multiple break states**, not a single pass/flee toggle or optional flavor. Civilian panic and hostile morale failure are **mechanically distinct**.

## Break state vocabulary (bounded)

Groups or NPCs can enter:

- **Freeze** — stalled action, delayed response, tunnel vision.
- **Flee** — withdrawal toward safety; may cause stampedes for civilians.
- **Surrender** — compliance posture; may create detention sorting (SPE-87).
- **Hide** — concealment and evasion; may degrade comms and reporting.
- **Berserk** — uncontrolled aggression (ties to SPE-84 lane for specialists).
- **Broken / routed** — persistent collapse, movement denial, command loss.
- **Rallied** — partial recovery under leadership or safe corridor.

## Triggers (examples)

Deterministic triggers include:

- casualties and visible collapse,
- leadership loss,
- coordination failure (SPE-95),
- peril shocks (SPE-115),
- contradiction backlash (SPE-151).

## Branching by actor type

- **Civilians**: panic favors freeze/flee/hide, with crowd density and curfew overlays modifying outcomes.
- **Hostiles**: break may favor rout/surrender/berserk depending on ideology tags and oath systems.

## Output and explanation

Morale transitions must emit:

- state change,
- cause codes,
- and downstream consequences (movement denial, surrender handling, witness effects).

## Integration

- **Aggregate battle** already uses routed/shaken/steady states; this doc covers the broader break taxonomy across scales.
- **Civic governance** handles surrender/detention consequences.

## See also

- `docs/aggregate-battle-audit.md` — SPE-106
- `architecture/command-coordination-under-pressure.md` — SPE-95
- `architecture/civic-jurisdiction-detention-unrest.md` — SPE-87
- `architecture/peril-survival-gates-escalating-failure.md` — SPE-115


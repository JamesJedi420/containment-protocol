# Multi-Axis Fatigue, Stress, and Exhaustion (SPE-130)

## Purpose

**Fatigue and stress** are **multi-channel**, not a single “tiredness” meter. Channels have **different causes**, **thresholds**, **visible bands**, and **recovery paths**, including **transit vulnerability** under load.

## Recommended channels (bounded set)

| Channel | Typical drivers and downstream effects |
| --- | --- |
| **Physical exhaustion** | March, carry, injury recovery, environmental exposure → readiness floor, movement denial risk |
| **Mental exhaustion** | Planning overload, hypervigilance, sleepless ops weeks → briefing quality, mistake rates |
| **Combat stress** | Sustained violence, moral injury adjacent to combat clocks → cohesion, SPE-115 peril adjacency |
| **Overtesting / over-interrogation strain** | Repeated audits, polygraph loops, ritual probes → intel false positives, refusal (SPE-56) |
| **Overdrive debt** | Short boosts that must be paid with recovery weeks or medical load → delayed collapse |
| **Transit vulnerability** | Fatigue opens ambush, seasickness, or exposure windows during movement → see `architecture/pursuit-chase-transit-hazards.md` |

Author only the subset the campaign needs; unused channels stay inert.

## Condition bands

Surface **visible bands** (e.g., fresh / strained / depleted / critical) per channel or as a composite summary — reports should cite **which channel** bound an outcome.

## Responder Energy Budget (SPE-1107)

Responder energy is a sibling accounting layer that sits before fatigue accumulation. It tracks compact operational reserve bands (`stable`, `taxed`, `depleted`, `overdrawn`), deterministic duty-cost classes, and bounded estimate confidence. Baseline upkeep is charged even when a responder is idle; idle upkeep stays a flat floor while heavier duties resolve through relative exertion so conditioning, injury, and current reserve state can make the same task cheaper or more expensive for different responders.

This layer does not replace the SPE-130 channels. When reserve is overdrawn, the budget converts explicit exertion debt into `physicalExhaustion` so downstream readiness and recovery systems consume the burden through the existing fatigue surfaces.

## Recovery

- **Rest**, **medical ladder** (SPE-68), **downtime activities**, **doctrine rotations** — each channel may prefer different recovery vectors.
- **Asymmetric decay** — some channels recover faster than others from the same “rest” action unless authored otherwise.

## Integration

- **Readiness / weakest-link** — channels feed deployment gates.
- **Aggregate battle** — readiness and morale overlays already intersect fatigue-like drains for supernatural pressure.

## See also

- `architecture/medical-stabilization-response.md` — SPE-68
- `docs/recovery-trauma-downtime-audit.md`
- `systems/team-management.md`

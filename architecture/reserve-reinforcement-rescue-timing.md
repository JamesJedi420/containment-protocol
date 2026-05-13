# Reserve Commitment, Reinforcement, and Rescue Timing (SPE-66)

## Purpose

**Reserves** are **off-scene committed capacity**: pledged teams, assets, or contracts that are **not** on-map until their arrival logic fires. They are not abstract “+support” modifiers that appear instantly.

## Canonical behaviors

- **Explicit timing** — each package has `earliestArrival`, `travelWeeks`, or queue position derived from deterministic state.
- **Route dependence** — same package may arrive faster or slower (or not at all) based on corridors, airspace, sea lanes, legitimacy, or hostile control.
- **Interception risk** — enemies, factions, or clocks can delay, attrit, or divert reinforcements; failures surface as explicit blockers or partial arrivals.
- **Tiered packages** — quick QRF vs heavy engineering vs strategic air/sea lift; tiers trade speed for capability, signature, and cost.
- **Variable pacing** — standby posture, fuel cycles, crew rest, and maintenance windows change how fast commitment converts to on-scene presence.

## Last-resort support

**Last-resort** stabilization (extract now, ask questions later) may **freeze failure** without fixing **structural** causes (understaffing, doctrine mismatch, equipment debt). Model it as a **bounded bailout** with follow-on costs: legitimacy hits, funding surcharges, or forced stand-down weeks.

## Moral hazard

Repeated central bailout **teaches reliance**: teams may degrade self-sufficiency, hide readiness gaps, or defer hard choices when rescue is predictable. Track **bailout frequency** or **rescue dependency** as deterministic inputs to cohesion, readiness soft risks, or sponsor pressure.

## Integration

- **Weekly loop** — reserve commitments advance on the same clock as missions; they do not bypass `advanceWeek` ordering without an explicit exception contract.
- **SPE-56 compliance** — auxiliaries promised as reserves still obey hesitation/refusal rules when their arrival context worsens.

## See also

- `architecture/supply-network-strategic-nodes.md` — SPE-72
- `architecture/large-asset-disable-capture.md` — SPE-65
- `systems/mission-resolution.md`

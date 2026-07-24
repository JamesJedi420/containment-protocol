# External Support Reliability and Trust State (SPE-93)

## Purpose

**External support assets** — contractors, informants, auxiliaries, embedded liaisons, borrowed specialists — are **agency-side helpers** with explicit **reliability / trust state**. They are **not** ordinary deployable squad members and must not silently inherit full operative fidelity.

## State model

Track at minimum:

- **Reliability band** — how often deliverables meet spec without hidden defects.
- **Trust state** — bilateral confidence; may diverge from reliability (trusted but incompetent, or skilled but suspected).
- **Volatility** — week-to-week variance in usefulness from mood, coercion, or competing patrons.

## Downstream outcome impact

External outputs feed **resolution**, **intel**, **compound synthesis** (SPE-82), or **outsourcing artifacts** (SPE-85) with **quality bands** that can shift outcome bands, add clocks, or spawn follow-up verification missions.

## Explanation output

Reports and debug surfaces must distinguish **success**, **degraded success**, and **failure** with codes tied to reliability/trust (e.g., `contractor_partial_intel`, `informant_double_game_suspected`).

## Trust-calibration drift

Repeated verification, payments, shared danger, or betrayals move trust along **deterministic curves**; reliability may lag until competence is proven.

**SPE-2700:** negative reliability drift magnitudes are scaled by ranking-derived rival comparative
pressure (`trustFailureDriftScale`). High agency standing forgives weak outputs longer; low standing
accelerates trust collapse for the same failure/partial/idle trigger. Positive drift is unscaled.
No separate persisted forgiveness field.

## Non-roster semantics

These assets **do not** consume normal barracks capacity but may consume **contract slots**, **legitimacy**, or **secrecy budget**. Mishandling them can trigger **SPE-87** civic pressure or **SPE-79** integrity hits.

## Integration

- **SPE-85** — transcription and flawed output overlap when externals touch knowledge cores.
- **SPE-94** — externals may temporarily stand in for missing support multipliers at higher risk.

## Anti-patterns

- Modeling informants as generic “ally NPCs” with full team AI and infinite loyalty.

## See also

- `architecture/specialist-outsourcing-transcription-flawed-output.md` — SPE-85
- `architecture/support-specialist-multipliers-bottlenecks.md` — SPE-94
- `architecture/compliance-breakdown-non-core-actors.md` — SPE-56

# Fixed Site Shells with Movable Aftermath Packages (SPE-134)

## Purpose

Many sites use a **stable shell** (geometry, address, jurisdictional identity) while **actor**, **aftermath**, and **encounter packages** are **relocatable or swappable** between runs — the middle layer between fully static and fully procedural worlds.

## Shell identity

The **shell** record holds persistent keys: map topology version, legal parcel id, ritual foundation anchors, utility graph. It survives repeated visits.

## Movable packages

Packages attach to shell slots:

- **actor populations** — who is on site this week,
- **aftermath** — bodies, damage, evidence chains, political claims,
- **encounter triggers** — SPE-71 kernel instances bound to current package set.

Packages may **move** between shells only when authored (convoy, exile, stolen relic), not silently.

## Post-conflict variability

After kills or disasters, shells host **fallout packages**: surviving minions, lair collapse, new claimants, cleanup contractors, investigation cordons — each a deterministic swap keyed to prior outcomes.

## Repeatable runs

Roguelike or benchmark modes may **reset packages** while preserving shell identity for fair comparison.

## Integration

- **SPE-61 occupancy** — packages feed roaming and repopulation channels.
- **SPE-110 construction** — shells may gain incomplete-build packages.

## See also

- `architecture/site-occupancy-repopulation.md` — SPE-61
- `architecture/construction-progress-interference-incomplete-sites.md` — SPE-110
- `architecture/site-trigger-authoring-kernel.md` — SPE-71

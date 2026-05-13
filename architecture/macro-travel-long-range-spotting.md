# Macro-Travel, Long-Range Spotting, and Slope Hazards (SPE-142)

## Purpose

**Long-range spotting** and **later identification** are **separate stages**. **Route cost** depends on **terrain**, **slope**, **daylight / season windows**, and **mobility class** — not only radius × speed.

## Spotting vs ID

- **Spotting** — something exists (smoke, silhouette, thermal bloom, occult ripple).
- **Identification** — class, threat level, affiliation — may require closer approach, drones, or intel fusion.

## Route cost inputs

- **Terrain** — mud, ice, jungle, rubble multipliers.
- **Slope / climb** — explicit slip and climb risks; failure burns time or triggers injury (`architecture/fatigue-stress-exhaustion-multi-axis.md`).
- **Daylight / season** — night travel vs curfew; winter passes closed.
- **Mobility class** — foot, wheeled, tracked, mount, **local flyer** vs **strategic airlift** use different tables; do not conflate short-range VTOL hops with transoceanic platforms (`architecture/complex-platform-state-resource-budgeting.md`).

## Slippage and climb risks

Author deterministic **failure bands** for bad weather + steep grades + fatigue stacking.

## Integration

- **SPE-72 logistics** — long moves consume network capacity.
- **SPE-90 pursuit** — chase bands reuse mobility assumptions.

## See also

- `architecture/supply-network-strategic-nodes.md` — SPE-72
- `architecture/pursuit-chase-transit-hazards.md` — SPE-90
- `architecture/fatigue-stress-exhaustion-multi-axis.md` — SPE-130

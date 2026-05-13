# Identity Overwrite Traps and Possession Escalation (SPE-126)

## Purpose

**Identity threats** from mirrors, pools, vats, glamours, and similar traps are **bounded** and **typed** — not reducible to “disguise” or “full possession” alone. Design must keep **three separable state tracks**:

1. **Truth-state** — what the simulation knows is physically and legally true.
2. **Apparent form** — what sensors, witnesses, or documents report (may be wrong).
3. **Possession / control-state** — who steers the body or psyche, including partial or contested control.

Collapsing these into one flag **breaks** escalation ladders, reporting, and counterplay.

## Trap outcome families (non-exhaustive)

- **Cosmetic overwrite** — surface appearance shifts without memory or legal identity change.
- **Blended memory** — shared or grafted recall fragments; confidence on autobiographical facts degrades.
- **Body / controller mismatch** — autonomic vs conscious driver split; “puppet with awareness” patterns.
- **Consciousness entrapment** — mind caged while body obeys another driver.
- **Possession escalation** — staged increases in control bandwidth (sensory → motor → speech → signatory).
- **False recovery** — apparent cure that is **hostile conversion** into a stable compromised state.
- **Fear-inversion self-types** — authored mis-self-modeling that flips threat assessment toward self-harm or ally-harm.
- **Dynamic biological presentation** — shapeshift, tumor-gestalt, or adaptive tissue that changes **presentation** faster than **truth-state** updates.
- **Civic-scale hidden transformation ecologies** — neighborhoods or cohorts partially converted while aggregate statistics still look normal.

## Authoring rules

- Each trap declares **which tracks it may mutate**, **max drift per week**, and **reveal clauses** (medical scan, ritual naming, witness chain).
- **Player-facing output** may stay partial or wrong **without** leaking raw truth-state to UI layers that should not see it (`architecture/hidden-state-displacement-counter-detection.md`).

## Integration

- **SPE-58 / SPE-70** — epistemic and hidden-state routing.
- **SPE-115 peril** — identity collapse can advance peril or survival gates.

## See also

- `architecture/hidden-state-displacement-counter-detection.md` — SPE-70
- `architecture/knowledge-state-system.md` — SPE-58
- `architecture/peril-survival-gates-escalating-failure.md` — SPE-115

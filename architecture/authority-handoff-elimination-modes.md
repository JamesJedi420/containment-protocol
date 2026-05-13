# Authority Handoff and Elimination-Triggered Control Swap (SPE-114)

## Purpose

In **certain optional scenario modes**, when a participant is **eliminated**, **bounded control packets** transfer: director permissions, adversary stewardship, scenario clocks, or shared world-state authority. Elimination is **not** only passive spectator mode — **surrogate re-entry** and **continuity-safe shared state** keep the session coherent.

## Handoff packet (conceptual)

- **Source participant id** and **elimination cause**
- **Transferred permissions** — which UI or policy knobs the survivor inherits
- **Clock ownership** — which timers continue vs pause
- **Adversary script pointer** — solo adversary or AI policy table handoff for SPE-77 modes
- **Sanitized world slice** — what the new controller may see vs hidden envelopes

## Surrogate re-entry

Eliminated players may return as:

- **surrogate roles** (liaison, sponsor observer) with reduced agency,
- or **re-entry after authored checkpoint** — deterministic, not ad hoc.

## Continuity-safe shared state

Shared narrative or mechanical state must **serialize** through explicit contracts (`docs/cross-scale-integration.md` pattern) so no participant inherits stale hidden pointers or illegal dual-writes.

## Scope boundary

This applies to **declared modes only**; core weekly campaign does not require elimination swaps unless authored.

## See also

- `architecture/optional-scenario-modes-asymmetric-play.md` — SPE-77
- `docs/cross-scale-integration.md` — SPE-64
- `docs/visibility-layer-audit.md` — SPE-24

# Hidden State, Displacement, and Counter-Detection (SPE-70)

## Purpose

**Concealment is multi-modal.** The simulation must support several **distinct hidden-state mechanics**, each with **mode-specific counters, tells, reveal clauses, and projection mismatches** — not a single `hidden` boolean or invisibility-first model.

## Modalities (design vocabulary)

Treat each as a **first-class mode** (combinable only when explicitly authored):

- **Concealed presence** — true location hidden; sensors may return null or ambiguous.
- **False position / displacement** — detections anchor to a **decoy locus** (`displacementTarget` family semantics).
- **Disguised identity** — entity reads as benign actor or wrong template until probes defeat disguise.
- **Signature masking** — true class obscured; strength or type estimates skewed.
- **False-detection output** — instruments report fabricated contacts or classes (instrumentation attack).
- **Glamour / presentation overlay** — perception-layer fiction; may differ per observer channel.
- **Anti-scan compartments** — dead zones, Faraday, warded volumes; scans degrade by policy not RNG.
- **Out-of-phase / liminal presence** — appears only under ritual, frequency, or route conditions (bounded, not arbitrary).

## Counters and tells

Each modality declares compatible **counterplay**: EM sweep, ritual reveal, witness chain, thermal bloom, behavior-weighted disguise checks, etc. **Tells** are deterministic hints that may fire without full reveal.

## Reveal clauses

Author **explicit reveal transitions**: contact damage, failed maintenance of glamour, doctrine completion, clock expiry, ally betrayal, or containment success. Reveal may be **partial** (class known, position fuzzy).

## Projection mismatch (by design)

**Player-facing and briefing outputs may remain partial, wrong, or unresolved** while raw truth-state stays in canonical simulation fields. Projection mismatch is a **legibility feature**, not a bug — reports must not dump hidden truth verbatim unless policy allows.

## Persistence cross-links

Rotating-roster and case packets carry fields such as `hiddenState`, `detectionConfidence`, `counterDetection`, `route`, `displacementTarget` — see `architecture/persistence-model.md` (SPE-283) and README SPE-70 notes for implementation anchors.

## See also

- `architecture/identity-overwrite-possession-escalation.md` — SPE-126
- `architecture/knowledge-state-system.md` — SPE-58
- `docs/unknown-interaction-runtime.md` — SPE-59
- `docs/visibility-layer-audit.md` — SPE-24

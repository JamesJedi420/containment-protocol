# External design theme contracts (SPE-186–SPE-300)

## Purpose

`docs/linear-external-documentation-follow-ups.md` mirrors **out-of-repository** design prompts (normalized **SPE-** tags). This document gives **in-repository depth**: theme-level **contracts** so engineers and designers know what “done” means when those prompts are partially absorbed into Containment Protocol—without copying the full upstream prose.

**Numbering note:** The mirror skips **SPE-187**, **SPE-281–285**, and **SPE-291** (same gaps as the Linear source). Unlisted numbers are intentional absences in that checklist, not omissions in this file.

## How to use

1. Pick a prompt in the mirror; find its **theme** below.
2. When implementing, add **types, state owners, and tests** in `src/domain/` (and projections in `src/features/`) that satisfy the theme contract.
3. If a theme is fully represented by an existing `architecture/*.md` file, **link it** from new code or extend that file rather than forking vocabulary.

---

## Theme 1 — Site shell, facility runtime, and encounter openings

**SPE coverage:** 186, 218, 249, 254, 259, 261–264, 286–290, 292, 297, 298, 300

**Contract:** Room and facility **identity** may diverge from geometry; shells, interiors, conduct rules, vertical bands, and puzzle-gated openings must be **state machines** with inspectable transitions, not one-off copy. Concealment, return denial, and living-host zones are **persistent site packets** with explicit approach, interior, and hazard phases.

**Nearest repo anchors:** `architecture/fixed-site-shells-movable-aftermath.md`, `architecture/mixed-surface-settlement-hidden-understructure.md`, `architecture/structured-room-key-records.md`, `architecture/site-trigger-authoring-kernel.md`, `architecture/concurrent-multi-team-site-state.md`

---

## Theme 2 — Governance, command knowledge, and covert power

**SPE coverage:** 188, 189, 197, 217, 219, 220, 221, 222

**Contract:** Law and command both need **separate surfaces** for clearance vs grant, compartment, redaction-as-state, and legitimacy collapse under exposure. Coercion, leased force, and dual-rule packets must remain **auditable** (who knew what, who paid whom, which enforcement layer acted).

**Nearest repo anchors:** `architecture/civic-jurisdiction-detention-unrest.md`, `architecture/strategic-governance-turn-loop-authority-economy.md`, `architecture/overlapping-holdings-layered-territory-control.md`, `architecture/knowledge-state-system.md`, `architecture/knowledge-subsystems-expansion.md`

---

## Theme 3 — Company, cohesion, and population pipelines

**SPE coverage:** 191–202

**Contract:** **Company** and **party bond** are first-class group objects with deterministic budgets. Actor and population generation are **staged pipelines** (region → anchor → detail) with inspectable seeds, overlays, and literacy or communication splits—not monolithic NPC blobs.

**Nearest repo anchors:** `systems/team-management.md`, `architecture/polity-driven-settlement-generation.md`, `architecture/procedural-naming-layered-identity.md`, `architecture/actor-dossiers-lineage-snapshots.md`

---

## Theme 4 — Authoring, narrative framing, and review

**SPE coverage:** 203–210, 255

**Contract:** Simulation truth and narrative framing stay **separable**. Review passes (thematic coherence, identity expression, encounter traits) are **checklists** against measurable surfaces—pacing, cost visibility, player verbs—not vibe-only notes. Cross-discipline briefs are **versioned packets** with explicit conflict resolution.

**Nearest repo anchors:** `architecture/distributed-story-evaluation-narrative-signals.md`, `architecture/runtime-episode-assembly-scene-end-triggers.md`, `architecture/diegetic-anti-stall-routing-live-clue-surfacing.md`, `docs/case-template-authoring.md`

---

## Theme 5 — Culture, institutions, and regional anomaly texture

**SPE coverage:** 212, 213, 214, 223, 224, 226

**Contract:** Intraculture splits, worship infrastructure, and overlapping-reality regions are **data-driven profiles** that gate legal actions, encounter tables, and route risk—not single faction tags. Band-based habitability shapes **settlement pressure** and edge conditions.

**Nearest repo anchors:** `architecture/world-law-compatibility-contradiction.md`, `architecture/institution-records-calendars-affiliated-orders.md`, `architecture/polity-driven-settlement-generation.md`, `systems/factions-legitimacy.md`

---

## Theme 6 — Travel, calendar, survival, and environmental operational state

**SPE coverage:** 190, 211, 225, 227, 228, 229, 230, 243, 244

**Contract:** Celestial and local time, climate, route degradation, toxins, heat stress, and encounter cadence are **multi-axis state** feeding the same weekly loop as missions—not a disconnected travel minigame. Survival interventions are **bounded resources** with residual risk.

**Nearest repo anchors:** `architecture/macro-travel-long-range-spotting.md`, `architecture/pursuit-chase-transit-hazards.md`, `architecture/peril-survival-gates-escalating-failure.md`, `architecture/supply-network-strategic-nodes.md`

---

## Theme 7 — Vehicles, platforms, propulsion, and at-scale movement

**SPE coverage:** 231–240, 246, 247, 248, 250, 278, 279

**Contract:** Helm, atmosphere, gravity quirks, propulsion families, cores, and damage are **subsystem graphs** with shared crew, life-support, and legality constraints. Biological or artifact-bound costs have **governance and clue** surfaces.

**Nearest repo anchors:** `architecture/complex-platform-state-resource-budgeting.md`, `architecture/maritime-strategy-staged-naval-action.md`, `architecture/reserve-reinforcement-rescue-timing.md`

---

## Theme 8 — High weird: entities, items, breach, drain, and continuity

**SPE coverage:** 215, 216, 234, 235, 241, 242, 245, 251–253, 256–260, 265–277, 280, 293, 294, 295, 296, 299

**Contract:** Presentation overlays stay separable from **rule packages**. Breach, drain, reflection, mimicry, geometry actors, necromancy ecosystems, semi-autonomous weapons, unstable salvage, and campaign migration are all **typed state machines** with failure branches and audit hooks—not flavor-only combat text.

**Nearest repo anchors:** `architecture/identity-overwrite-possession-escalation.md`, `architecture/transformation-control-upkeep-reversion.md`, `architecture/life-anchor-relics-anchor-state-grammar.md`, `architecture/command-word-artifacts-recharge.md`, `architecture/staged-ability-resolution-misfire-routing.md`, `architecture/undead-domain-anchoring-and-manifestation.md`, `architecture/persistence-model.md`

---

## Coverage checklist

Every bullet in `docs/linear-external-documentation-follow-ups.md` maps to **exactly one** theme above (by SPE id). If you add a new mirrored SPE, extend the appropriate theme row and run **`npm run verify:theme-contracts`** in the same PR.

## See also

- `docs/linear-external-documentation-follow-ups.md` — full prompt text
- `planning/deferred-design-documents.md` — tracker and promotion rules
- `architecture/game-state-and-core-loop.md` — in-repo systems map

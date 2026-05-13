# Knowledge State System — Canonical Epistemic Model (SPE-58)

## Purpose

**SPE-58** owns the **canonical epistemic model** only: how truth, observation, interpretation, and institutional knowledge relate, and how knowledge advances or is invalidated under deterministic rules.

It does **not** subsume every sensing UI, dispatch filter, dream sequence, or decay implementation. Those live in **child issues** so the parent stays a stable semantic contract.

## Separation of worlds

Keep these **distinct** in design and in canonical state where applicable:

| Layer                  | Meaning                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| **Actual world state** | What is true in the simulation regardless of anyone’s belief.                                           |
| **Observed state**     | What instruments or people directly sensed this tick.                                                   |
| **Interpreted state**  | Hypotheses, labels, and threat typing applied by analysts or command.                                   |
| **Agency-known state** | What the institution is willing to act on — may lag, truncate, or politicize observed/interpreted data. |

Routing and resolution should read **agency-known** for player-facing commitments while still allowing **actual** vs **known** divergence to drive twists, liability, and retroactive report corrections.

## What “knowledge” includes here

- **Uncertainty reduction** — evidence shrinks hypothesis sets; confidence is not just a scalar vibe.
- **Hypothesis / test / revision loops** — explicit promote, demote, or merge of competing models.
- **Competing truth systems** — factions, sponsors, or locals may hold incompatible interpreted states; merge only when policy forces it.
- **Folklore, conspiracy, doctrinal denial** — socially maintained **non-evidence** that still steers behavior and must be modeled as interpreted pressure, not deleted as “wrong intel.”
- **Risky knowledge** — knowing something creates obligation, liability, or targeting; suppression is strategic.
- **Actual vs known separation** — leaks, false negatives, and staged cover stories are first-class.

## Child routing (do not bloat this parent)

| Topic                                          | Issue   | Notes                                                    |
| ---------------------------------------------- | ------- | -------------------------------------------------------- |
| Sensing, masking, relay surfaces               | SPE-529 | Sensors, jamming, repeaters, degraded feeds              |
| Operational knowledge views, dispatch filters  | SPE-587 | What command screens may show vs field tablets           |
| Dream, inherited, preserved knowledge channels | SPE-588 | Non-standard acquisition paths that are not normal recon |
| Freshness, decay, fragmentation                | SPE-589 | Stale intel, partial recall, contradictory shards        |

**Repo coverage:** Child scopes are expanded in **`architecture/knowledge-subsystems-expansion.md`** (surface tables and integration hooks). Linear remains authoritative for **acceptance criteria** until corresponding types and clocks exist in `src/domain/`. Tracker: `planning/deferred-design-documents.md`.

## Relationship to SPE-22 audit doc

`docs/knowledge-intel-partial-information-audit.md` covers **intel tables, confidence fields, and routing to clue/briefing/psychometric/memory hazards**. This document (SPE-58) is the **epistemic architecture** those fields implement. When the two disagree, **SPE-58 semantics win** for modeling questions; the audit doc wins for **field naming and integration checklists**.

## See also

- `docs/design-audits-index.md` — catalog of integration audits (includes knowledge audit below)
- `planning/deferred-design-documents.md` — tracker for child issues without split-out repo docs
- `architecture/knowledge-subsystems-expansion.md` — SPE-529 / 587 / 588 / 589 child surfaces (tables, integration hooks)
- `docs/knowledge-intel-partial-information-audit.md`
- `docs/unknown-interaction-runtime.md` — runtime reveal vs epistemic state (SPE-59)
- `planning/dependency-map.md` — §2.1 knowledge integration footprint

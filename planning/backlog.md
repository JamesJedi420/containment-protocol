# Near-term backlog

This file is the **canonical ordered queue** for concrete engineering and design follow-ups that were previously split across `README.md` and high-level hints in `planning/roadmap.md`. **Edit order here when priorities change**; avoid duplicating long tactical lists elsewhere.

**How to use:** Pick from the top unless a dependency blocks it. Larger sequencing philosophy stays in `planning/roadmap.md` (phases, risks, §11 / §15).

## Context (not always a single task)

From `README.md` **Current design notes**:

- Hidden or disguised activation beyond already-hidden cases remains a follow-up surface.
- Shared explanatory ownership stays in the domain wherever possible.
- Prefer compact reusable rules vocabularies over bespoke subsystem logic.
- Optional modules integrate through explicit contracts, not shared mutable state.

## Queue (highest leverage first — reorder as needed)

1. **Hidden / disguised activation** — Add an authored or runtime activation path for hidden or disguised cases beyond manual hidden-state entry (strengthens weakest-link and intel surfaces without parallel truth).
2. **Infiltration and access follow-through** — Expand follow-on infiltration and access work that consumes hidden-state and behavior-validation surfaces (keeps one rules substrate).
3. **Route and week navigation** — Extend route-level drill-down and multi-week navigation coverage (legibility and QA for long runs).
4. **Core UX specs** — Finish or refresh core UX specs so surfaces match canonical domain outputs (`planning/roadmap.md` §15).
5. **Tuning and QA references** — Complete tuning references and QA references, then use them to harden implementation sequencing (same roadmap section).
6. **MVP loop proof** — Drive implementation toward trustworthy end-to-end weekly loop proof before broadening (`planning/roadmap.md` phases 1–2).
7. **Scope discipline** — Resist broadening planning into too many simultaneous future branches until the central machine is more real (`planning/roadmap.md` §15).
8. **Archived prototype hygiene** — Keep archived prototype code out of active runtime paths unless intentionally revived (`README.md` former “next steps”).

## See also

- `planning/roadmap.md` — phases, dependencies, deferrals, review questions
- `planning/milestones.md` — milestone proof points and label policy link
- `architecture/game-state-and-core-loop.md` — systems map and architecture index
- `planning/deferred-design-documents.md` — SPE-186+ and knowledge child issues without in-repo deep docs yet
- `planning/documentation-curation.md` — when to update backlog, maps, mirrors, and audits

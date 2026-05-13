# Deferred in-repo design (content depth)

Some Linear issues and mirrored checklists describe **design depth** that is not yet fully captured in **`src/domain/`** types—even when expansion architecture exists (for example knowledge children or SPE-186+ theme contracts). This file names **remaining** pockets so they are not “lost” between `architecture/` and Linear.

It is **not** a second systems map. For navigation and SPE-tagged architecture files, use `architecture/game-state-and-core-loop.md`.

## Knowledge child issues (SPE-529, SPE-587, SPE-588, SPE-589)

**Parent contract:** `architecture/knowledge-state-system.md` (SPE-58).

| Issue   | Topic (summary)                                  |
| ------- | ------------------------------------------------ |
| SPE-529 | Sensing, masking, relay surfaces; degraded feeds |
| SPE-587 | Operational knowledge views; dispatch filters    |
| SPE-588 | Dream, inherited, preserved knowledge channels   |
| SPE-589 | Freshness, decay, fragmentation                  |

**Status:** In-repo expansion: **`architecture/knowledge-subsystems-expansion.md`** (tables per child scope). Linear remains authoritative for acceptance criteria until types land in `src/domain/`.

**Integration checklist:** `docs/knowledge-intel-partial-information-audit.md`

## SPE-186 through SPE-300 (external documentation prompts)

**Mirror:** `docs/linear-external-documentation-follow-ups.md` (normalized **SPE-** tags; original is the Linear project document linked in that file’s **Source** section).

**In-repo theme contracts:** **`architecture/external-design-theme-contracts.md`** — groups mirrored SPEs into eight implementation themes with contracts and nearest `architecture/` anchors.

These prompts still target **documentation outside** this repository where upstream owns the prose bible. The theme contract file is the **bridge** for Containment Protocol implementation planning.

**When to add more in-repo architecture:** When a theme needs **canonical TypeScript contracts** or tests, split that slice into a focused `architecture/*.md` (or extend an existing one) and cross-link from the theme row in `external-design-theme-contracts.md`.

## See also

- `docs/design-audits-index.md` — integration audits (field names, routing)
- `docs/linear-external-documentation-follow-ups.md` — full SPE-186+ prompt list
- `planning/backlog.md` — near-term engineering queue
- `planning/documentation-curation.md` — ongoing curation playbook (this file vs backlog vs maps)

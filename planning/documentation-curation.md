# Ongoing documentation curation

Short playbook for **keeping planning and design docs honest** as the repo changes. Linear remains authoritative for issue state; these files are the **git-visible** coordination layer.

## When to touch what

| Artifact                                               | Owner intent                            | Update when                                                                                                                                                                                              |
| ------------------------------------------------------ | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`planning/backlog.md`**                              | Ordered near-term engineering queue     | Priorities shift, an item ships, or a new concrete blocker appears. **Do not** duplicate the full queue in `README.md`. Update **`planning/backlog-handoff-manifest.json`** in the same commit; run **`npm run verify:backlog-handoff`**. |
| **`planning/roadmap.md`**                              | Phases, dependencies, philosophy        | Strategy or phase ordering changes—not every small task.                                                                                                                                                 |
| **`planning/milestones.md`**                           | Milestone proof points                  | Milestone definitions or exit bars change.                                                                                                                                                               |
| **`planning/deferred-design-documents.md`**            | Tracks depth not yet in `architecture/` | A child issue (e.g. SPE-529) gets a real repo doc (then **remove or narrow** the row); or SPE-186+ themes gain a canonical stub here pointing to new `architecture/`.                                    |
| **`docs/linear-external-documentation-follow-ups.md`** | Mirror of external prompt list          | Linear document changes—re-run materializer per `docs/linear-external-documentation-follow-ups.md` stub / `scripts/materialize-linear-external.mjs` workflow; then **`npm run verify:theme-contracts`**. |
| **`architecture/external-design-theme-contracts.md`**  | SPE-186+ theme contracts vs mirror      | You regroup or add **SPE coverage:** lines—run **`npm run verify:theme-contracts`** (CI).                                                                                                                |
| **`architecture/knowledge-subsystems-expansion.md`**   | SPE-529 family surface tables           | Child scope semantics change; keep aligned with `architecture/knowledge-state-system.md`.                                                                                                                |
| **`docs/design-audits-index.md`**                      | Catalog of `docs/*audit*.md`            | Any new top-level audit file: add one **alphabetically ordered** bullet; `npm run verify:audits-index` must pass.                                                                                        |
| **`architecture/game-state-and-core-loop.md`**         | Systems map + SPE list + supplements    | New `architecture/*.md` (SPE-tagged or supplement); adjust **Architecture index notes** if SPE bands change.                                                                                             |
| **`README.md`**                                        | Onboarding, scripts, scope              | Stack or scripts change; **not** for long tactical backlogs (link `planning/backlog.md`).                                                                                                                |

## Cadence (lightweight)

- **Each PR that changes docs or planning:** skim **backlog** (still accurate order?), run **`npm run verify:audits-index`** if `docs/` changed; run **`npm run verify:theme-contracts`** if the SPE-186+ mirror or `architecture/external-design-theme-contracts.md` changed; run **`npm run verify:backlog-handoff`** if `planning/backlog.md`, slice docs, or **`planning/backlog-handoff-manifest.json`** changed.
- **After a milestone or release slice:** reconcile **roadmap §15** tone with **backlog** top items; archive done backlog lines or move them to issue bodies.
- **When Linear external doc changes:** refresh **`docs/linear-external-documentation-follow-ups.md`** from source so SPE-186+ mirror stays diffable.

## Anti-patterns

- Same tactical item listed in **README**, **backlog**, and a **Linear** description with conflicting priority—pick **one** ordered source (`planning/backlog.md`) for sequencing.
- Backlog handoff updated without **`planning/backlog-handoff-manifest.json`** or without running **`npm run verify:backlog-handoff`**—CI will fail after merge.
- New audit file without index row—**CI will fail** after merge if `verify:audits-index` is not run locally.
- Mirror / theme **SPE** mismatch—**CI will fail** if `verify:theme-contracts` is not run after editing the mirror or theme clusters.
- Promoting a design into **`architecture/`** without linking it from **`game-state-and-core-loop.md`**—the map stops being complete.

## See also

- `AGENTS.md` — scripts, audit-index rule, documentation hygiene, **session handoff**, **mandatory Linear**
- `.cursor/rules/linear-always-update.mdc` — `alwaysApply` Cursor rule for every agent session
- `.cursor/rules/cloud-agent-linear-handoff.mdc` — Cloud Agents emit a local-agent Linear apply block
- `docs/cloud-agent-linear-handoff.md` — verbatim Linear handoff template for local agents
- `docs/cursor-user-rules-snippet.md` — paste into Cursor User Rules (merge → main → new agent + Linear)
- `docs/agent-session-handoff.md` — full handoff policy
- `docs/contribution-and-release-operations.md` — contribution norms
- `planning/backlog.md` — near-term queue
- `planning/deferred-design-documents.md` — deferred depth tracker

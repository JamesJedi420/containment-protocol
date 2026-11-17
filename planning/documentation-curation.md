# Ongoing documentation curation

Short playbook for **keeping planning and design docs honest** as the repo changes. Linear remains authoritative for issue state; these files are the **git-visible** coordination layer.

## When to touch what

| Artifact                                               | Owner intent                            | Update when                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`planning/backlog.md`**                              | Non-authoritative near-term shortlist   | Keep roughly ten one-line active entries. Remove completed/canceled items; record shipped evidence in Linear and slice docs. The dated backlog archive is historical, not a live queue. Refresh from verified Linear changes; ordering here does not set priority or select work. **Do not** duplicate the full queue in `README.md`. Update **`planning/backlog-handoff-manifest.json`** in the same commit; run **`npm run verify:backlog-handoff`**. |
| **`planning/roadmap.md`**                              | Phases, dependencies, philosophy        | Strategy or phase ordering changes—not every small task.                                                                                                                                                                                                                                                                                                                                                                                                |
| **`planning/milestones.md`**                           | Milestone proof points                  | Milestone definitions or exit bars change.                                                                                                                                                                                                                                                                                                                                                                                                              |
| **`planning/deferred-design-documents.md`**            | Tracks depth not yet in `architecture/` | A child issue (e.g. SPE-529) gets a real repo doc (then **remove or narrow** the row); or SPE-186+ themes gain a canonical stub here pointing to new `architecture/`.                                                                                                                                                                                                                                                                                   |
| **`docs/linear-external-documentation-follow-ups.md`** | Mirror of external prompt list          | Linear document changes—re-run materializer per `docs/linear-external-documentation-follow-ups.md` stub / `scripts/materialize-linear-external.mjs` workflow; then **`npm run verify:theme-contracts`**.                                                                                                                                                                                                                                                |
| **`architecture/external-design-theme-contracts.md`**  | SPE-186+ theme contracts vs mirror      | You regroup or add **SPE coverage:** lines—run **`npm run verify:theme-contracts`** (CI).                                                                                                                                                                                                                                                                                                                                                               |
| **`architecture/knowledge-subsystems-expansion.md`**   | SPE-529 family surface tables           | Child scope semantics change; keep aligned with `architecture/knowledge-state-system.md`.                                                                                                                                                                                                                                                                                                                                                               |
| **`docs/design-audits-index.md`**                      | Catalog of `docs/*audit*.md`            | Any new top-level audit file: add one **alphabetically ordered** dated status-table row; `npm run verify:audits-index` must pass.                                                                                                                                                                                                                                                                                                                       |
| **`architecture/game-state-and-core-loop.md`**         | Systems map + SPE list + supplements    | New `architecture/*.md` (SPE-tagged or supplement); adjust **Architecture index notes** if SPE bands change.                                                                                                                                                                                                                                                                                                                                            |
| **GitHub wiki**                                        | Curated navigation and stable reference | Repository documentation ownership, canonical architecture/design references, validation commands, terminology, or planning entry points change. Keep the wiki as a projection/navigation layer; do not let it become a parallel source of truth.                                                                                                                                                                                                       |
| **`README.md`**                                        | Onboarding, scripts, scope              | Stack or scripts change; **not** for long tactical backlogs (link `planning/backlog.md`).                                                                                                                                                                                                                                                                                                                                                               |

## Cadence (lightweight)

- **Each PR that changes docs or planning:** skim **backlog** (still accurate order?), run **`npm run verify:audits-index`** if `docs/` changed; run **`npm run verify:theme-contracts`** if the SPE-186+ mirror or `architecture/external-design-theme-contracts.md` changed; run **`npm run verify:backlog-handoff`** if `planning/backlog.md`, slice docs, or **`planning/backlog-handoff-manifest.json`** changed.
- **After a milestone or release slice:** reconcile **roadmap §15** tone with **backlog** top items; archive done backlog lines or move them to issue bodies.
- **When Linear external doc changes:** refresh **`docs/linear-external-documentation-follow-ups.md`** from source so SPE-186+ mirror stays diffable.
- **During wiki curation:** compare wiki navigation and summaries against current `main`; point planning, architecture, terminology, authoring, and QA pages at their canonical repository sources; update the page's verification date/commit when checked.

## Canonical documentation ownership and rights

**Status:** maintenance guidance, not a migration plan or a second register. Documentation
maintenance/routing reuses [SPE-1705](https://linear.app/spectranoir/issue/SPE-1705/design-doc-routing-ledger);
independent PR-review guidance reuses [SPE-2608](https://linear.app/spectranoir/issue/SPE-2608/require-independent-pr-review-during-babysit).
Neither this map nor a documentation edit changes issue scope or lifecycle.

Keep canonical engineering READMEs, ADRs, and project-owned agent/skill guides version-controlled
with the code they describe. Where useful, annotate the affected section with its existing
Linear owner, source path or symbol, and status (current contract, draft, projection, dormant,
or historical). Date/revision any verified implementation claim. A source citation is evidence
to inspect, not authority or proof of gameplay use. Do not invent an owner: use **OWNER UNVERIFIED**
until the relevant Linear boundary is checked, preserving separate CP/Academy ownership.

The following bounded map was checked against repository sources at `75b52faa` on 2026-11-16.
It identifies review destinations, not a repository-wide content/rights audit or live external
document inventory. External pointers below were inspected in Git; their hosted contents,
current permissions, and reuse rights were not verified.

| Surface                                   | Source / ownership reference                                                                                                                                                                                   | Review or rights decision                                                                                                                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engineering front door                    | `README.md`, `package.json`; documentation maintenance via SPE-1705, behavior via the changed subsystem's existing Linear owner                                                                                | Keep commands and onboarding in Git; do not copy a tactical backlog here.                                                                                                                          |
| System and feature READMEs                | `systems/README.md`, `src/features/incidents/README.md`, `src/features/procurement/README.md`; follow their architecture/source references; implementation ownership is **OWNER UNVERIFIED** in this inventory | The two feature READMEs describe dormant/superseded UI. Preserve that status; presence of a README does not make a route active. This map does not revalidate each system's behavior.              |
| Historical and fixture READMEs            | `docs/typecheck/README.md`, dated recovery directories under it, `docs/archived/incident-shell/README.md`, and the Academy validator fixture README                                                            | Preserve dated evidence, archive status, and fixture purpose; do not promote these into current acceptance or Academy ownership.                                                                   |
| Architecture decisions                    | `docs/adr/README.md`, `docs/adr/0001-layer-dependency-boundaries.md`; SPE-2914 owns the ADR workflow, each record names its decision owner                                                                     | Keep records in Git and preserve supersession. The guide does not prove the uncompleted ADR automation is implemented.                                                                             |
| Agent and project skill guides            | `AGENTS.md`, `docs/agent-operating-manual.md`, `docs/agent-cursor-plugins.md`, `.cursor/skills/`; source authority remains the current user instructions and existing Linear boundary                          | Maintain project-owned guides in Git. Installed/vendor skills outside Git retain their upstream ownership/license; do not copy them into the repo merely for discoverability.                      |
| External follow-up prompts                | `docs/linear-external-documentation-follow-ups.md` identifies its original Linear document; `architecture/external-design-theme-contracts.md` describes the mirror contract                                    | Preserve the existing source/mirror workflow and SPE ownership. An external-update prompt does not grant migration or write permission.                                                            |
| Drive drafts and Story Knowledge          | `docs/google-drive-integration.md`, `docs/google-drive/file-registry.json`, `docs/google-drive/known-files.json`                                                                                               | Registry pointers only were checked. Drafts retain their established editorial/canon path; pre-migration originals remain excluded from agent writes. No export, sharing, or migration is implied. |
| Wiki and other connected documents/assets | Wiki curation above; `docs/figma-integration.md`, `docs/scenario-integration.md`, and the Multify boundaries in `AGENTS.md`                                                                                    | Wiki is navigation/projection. Preserve direct-source ownership and asset rights; no connected-source content or access was audited here.                                                          |
| Project and third-party rights            | `LICENSE`, `README.md` **License and Copyright**, existing source attribution                                                                                                                                  | Public visibility is not permission to reuse. Project material is all rights reserved; third-party material retains its own terms.                                                                 |

Before proposing an external-document migration, identify the actual source/version, canonical
owner, destination role, access/privacy restrictions, license/reuse permission, and existing
approval route in the current PR or existing owner record. Record unknowns and excluded sources
without private payloads. Keep restricted/private material in place until its owner authorizes
the specific action. Use SPE-1705 only when direct authorized correction is unavailable or a
durable routing record is genuinely needed. A genuinely new durable migration obligation goes
through the applicable actor governance; this checklist creates none and authorizes no migration.

## Documentation-reference search and semantic review

**Review surface:** `.github/pull_request_template.md` and `docs/agent-pre-ship-audit.md`;
existing review owner SPE-2608, documentation maintenance SPE-1705. Apply this within the current
PR boundary while reviewing the full diff against `main`.

1. Identify changed code/configuration paths, including deletions and both sides of renames.
   Search tracked documentation for each affected path, old/new symbol, and configuration key.
   Treat changed paths, symbols, and configuration keys as untrusted data. The examples below
   read literal search terms from standard input; never paste PR-controlled text into shell
   command source, even inside quotes. Do not use `eval`, `Invoke-Expression`, or command-string
   construction for these searches.

   Bash / Git Bash:

   ```sh
   base=$(git merge-base HEAD origin/main)
   git diff --name-status -M "$base"...HEAD -- src scripts test .github
   git grep -nF -f - -- '*.md' '*.mdc'
   ```

   PowerShell:

   ```powershell
   $reviewBase = git merge-base HEAD origin/main
   git diff --name-status -M "${reviewBase}...HEAD" -- src scripts test .github
   git grep -nF -f - -- '*.md' '*.mdc'
   ```

   Run the block first, then enter one literal search term per line into `git grep`'s standard
   input. Finish input with EOF (Ctrl+D in Bash; Ctrl+Z then Enter in a Windows console).
   Quotes, backticks, dollar signs, and semicolons in that input remain data. Repeat the search
   for old/new paths, symbols, and keys; an empty pattern matches every line, so omit blank lines.

   The path list is a starting point; include other affected roots and root configuration files
   from the full PR diff. `git grep` exit 1 means no literal matches, not a semantic pass. These
   `git diff` examples inspect committed changes; also inspect `git diff` and `git diff --cached`
   during pre-commit review.

2. Read affected sections and their canonical sources, including relevant READMEs, ADRs, and
   agent/skill guides when literal searches miss them. Compare behavioral descriptions, commands,
   examples, defaults, and assumptions with the actual implementation and governing boundary.
   A path can exist while describing the wrong owner or behavior; a line can remain within EOF
   while pointing at the wrong symbol. Update invalidated in-boundary sections in the same PR.
   Preserve ADR decisions and history; supersede a changed decision through its existing workflow.
3. Reuse the requirements runner and the reference validators owned by SPE-3756 (backticked path
   existence) and SPE-3757 (links, anchors, line bounds and its declared corpus) when available.
   Check the current registry and each tool's actual rollout/coverage; do not infer availability
   from an In Progress issue. Neither validator proves semantic accuracy. Do not add a competing
   checker, silently expand their corpus, or present missing/advisory coverage as a required pass.
4. In the PR's **Docs updated** / **Validation** sections, record searched terms/paths, reviewed
   sections and source revision, corrected or unaffected claims, actual checks, and excluded or
   unavailable sources with reasons. Route unresolved out-of-boundary findings to their existing
   owner; disclose limitations instead of claiming a complete documentation audit.

## Linear evidence sweeps (response-size limits)

Linear issue **descriptions arrive through a connector that truncates by response size**, not by query shape. Two behaviours were observed: a batch query carrying many descriptions cuts off part-way, so later issues arrive empty or partial; and the largest descriptions fail even when fetched alone. Either way the surviving rows look like a complete result set.

What that produced here: a citation sweep published **"22 of 52 issues read, 30 skipped"**. The 52 was the row count of one truncated batch response, and the 30 were rows that never arrived — an output-size boundary, not a set of issues anyone had identified and deferred. Counting by filter instead gave **59 issues matching `architecture/` and at least 100 matching `docs/`** (overlapping).

Rules for any sweep that extracts paths, anchors, or claims from issue descriptions:

- **One issue per call.** Batch only issue identifiers, titles and states; never batch descriptions when the text will be quoted or scanned.
- **Request minimal fields.** Ask for `identifier`, `title` and `description` and nothing else; comments carry their own truncation risk and belong in a sweep only when they are the evidence.
- **Treat truncation as failure, not as an empty issue.** A `truncated: true` response or an empty `preview` means the issue is **unread**. Do not record it as "no findings".
- **Count the population with the filter, not with the page.** Read `pageInfo.hasNextPage`; a filter that returns 100 rows with more pages is not a 100-issue population. State the filter used and whether it was exhausted.
- **Publish the unread set with the result.** Every sweep reports what it read _and_ the identifiers it could not read, grouped by reason (truncated / not attempted / filter exceeded). A sweep with an unstated gap is a coverage claim, not evidence.
- **Anchor to a revision.** Name the commit or SHA the paths were checked against, and say plainly when a citation is _planned_ rather than missing-by-error.
- **Fetch shape.** `query($id: String!) { issue(id: $id) { identifier title description } }`, one issue per call, passing the shorthand identifier (`SPE-1234`) rather than a UUID so a report stays readable without a second lookup. Independent calls may run concurrently, but keep their responses separate and check each for completeness; concurrency does not remove response-size limits.

## Citations that resolve to nothing in this repository

A documentation path that does not exist in the clone is only acceptable when the citation says why. Triage of the 40 dangling full-path citations found on 2026-11-16 at `b1a41a20` produced these classes; each citation now carries its class inline, and the checker that will consume this list is SPE-3756, which must read these classes as its allowlist rather than re-deriving them.

- **Local, gitignored:** `.cursor/mcp.json`, `.vscode/launch.json`, `.vscode/settings.json` (`.gitignore` keeps only `.vscode/extensions.json`), `.trigger/experiment-request.json`.
- **Outside the repository:** `codex/SKILL.md` and `hermes-agent/SKILL.md` sit under the installed Hermes skills root, not in git.
- **Dependency-internal:** `src/middleware/persist.ts` (the zustand package), `lib/util.js` and `lib/utilsBundle.js` (Playwright), `node_modules/zod/...`.
- **Build matcher literals:** `/src/domain/templates/` and `/src/data/copy.ts` are slash-prefixed substrings matched against normalized Vite module IDs, not absolute repository paths.
- **Generated, untracked:** `.tmp/typecheck-census-node22/census.json`, `planning/approved-work-projection.json`.
- **Never created:** proposed or rejected artifacts cited by planning slices — `e2e/a11y-smoke.spec.ts`, `src/domain/weeklyFatigue.ts` (rejected), `test/importBoundary*.ts` (patch lost), `src/test/recoveryFatigue.contract.test.ts`, `test/fatigue-consolidation.test.ts`, `src/test/helpers/runWeeklyPrepAndAdvance.ts`, `src/app/store/gameStore.types.ts`.
- **Fixture/example path:** `academy/content/courses.json` is an example used by this repository's validator-selection fixture. The `academy/content/**` discovery root is intended here, but the example file is not tracked.

**What this does not cover.** A green `doc-citations` run means that non-exempt backticked full-path citations inside `docs/`, `architecture/` and `planning/` resolve; reviewed exemptions may still name absent paths. It says nothing about Markdown link targets or their `#fragment` anchors (380 relative links, 70 with anchors, 12 damaged targets found on 2026-11-16); `path:line` citations (284, invisible because the census skipped every citation containing `:`); basename-only citations (2,321 in the censused tree, 145 outside it); or the 70 files outside those three directories — `AGENTS.md`, `CLAUDE.md`, `README.md`, `SCHEMA_REGISTRY.md`, `SECURITY.md` and the eight `.cursor/rules/*.mdc` files among them (316 full-path citations, 2 dangling). Those surfaces are unmeasured, not passing, and the census has no opinion on whether a citation is _correct_, only whether its target exists.

## Anti-patterns

- Same tactical item listed in **README**, **backlog**, and a **Linear** description with conflicting priority—use Linear authority and a single short near-term view (`planning/backlog.md`).
- GitHub wiki pages presenting copied roadmap, backlog, architecture inventories, glossary definitions, or validation commands as independent truth instead of linking to the canonical repository sources.
- Backlog handoff updated without **`planning/backlog-handoff-manifest.json`** or without running **`npm run verify:backlog-handoff`**—CI fails **in the PR check, before merge** (`planning` change class → `backlog-handoff`, `required`), and again on a push to `main` measured from `github.event.before`.
- New audit file without index row—**CI fails in the PR check**, before merge, if `verify:audits-index` is not run locally (`docs/*audit*.md` → `audits-index`, `required`).
- Mirror / theme **SPE** mismatch—**CI fails in the PR check** if `verify:theme-contracts` is not run after editing the mirror or theme clusters (`architecture/external-design-theme-contracts.md`, `architecture/**/*theme*`, `docs/linear-external-documentation-follow-ups.md`, `docs/design-audits-index.md`; `required`).
- Promoting a design into **`architecture/`** without linking it from **`game-state-and-core-loop.md`**—the map stops being complete.
- Reporting an evidence-sweep population from a **truncated batch response**—the total and the "skipped" count are artefacts of output size, not facts about the backlog. See **Linear evidence sweeps (response-size limits)** above.
- Citing a path without saying whether it is local, generated, dependency-internal, or never created—the reader cannot tell a broken link from a deliberate one. See **Citations that resolve to nothing in this repository**.

## See also

- GitHub wiki — curated navigation/reference layer; verify against current `main` rather than treating it as canonical issue or implementation state
- `AGENTS.md` — scripts, audit-index rule, documentation hygiene, **session handoff**, **mandatory Linear**
- `.cursor/rules/linear-always-update.mdc` — `alwaysApply` Cursor rule for every agent session
- `.cursor/rules/cloud-agent-linear-handoff.mdc` — Cloud Agents emit a local-agent Linear apply block after an implementation PR merges
- `docs/cloud-agent-linear-handoff.md` — verbatim Linear handoff template for local agents
- `docs/cursor-user-rules-snippet.md` — paste into Cursor User Rules (merge → main → new agent + Linear)
- `docs/agent-session-handoff.md` — full handoff policy
- `docs/contribution-and-release-operations.md` — contribution norms
- `planning/backlog.md` — near-term queue
- `planning/deferred-design-documents.md` — deferred depth tracker

Read [Hermes shipping checkpoints](../docs/hermes-shipping-checkpoints.md) for local-model evidence delegation during the authorized ship loop, including pre-ship and post-merge curation. Record direct checks or bounded fallback where applicable; retain the existing actor-specific authority and closeout triggers.

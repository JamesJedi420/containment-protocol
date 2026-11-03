# Planning corpus audit

**Status:** Read-only corpus audit. Two verifier-safe backlog edits and one manifest entry applied; P7 archive migration applied afterward (see §4.1); other proposals remain proposals.
**Date:** 2026-11-02
**Branch:** `freebuff/b5406a9543dc506d2ee21ebf`
**Policy under test:** `planning/backlog.md` is the single near-term queue (`AGENTS.md`; `README.md` § Planning and Documentation).
**Gate actually run:** `npm run verify:backlog-handoff` → `backlog-handoff: OK primary=SPE-1052 inProgress=SPE-1064,SPE-3338 archivedShipped=149`.

---

## 0. Premise corrections

The brief describes a 1,486-line `planning/backlog.md` and 838 planning files. Both numbers are stale against this checkout:

- `planning/backlog.md` is **38 lines, 8 queue entries, 2,993 bytes**. Commit `f247a8c3` (PR #4574, SPE-3338) cut it to ten active items. The 1,486-line former backlog is frozen at **`planning/backlog-history-2026-11-01.md`**, and `backlog-handoff-manifest.json` points at it through `historyFile`. The 1,118-line `milestones.md` is unchanged.
- `planning/` contained **842 Markdown files at audit time** (this audit is the 843rd and is outside its own scope), not 838: 779 slice-only, 43 harvest-only, 2 files that are both, and 18 other. The four-file delta is recent slice docs (for example `spe-2910-workshop-disorder-consequences-slice.md` and `spe-3444-workshop-fixture-types-slice.md`).
- The 838 figure may have counted `planning/*slice*.md` plus `*harvest*.md` plus four named control files; that arithmetic does not reproduce. This audit uses the actual **842** and accounts for every one in Appendix A.

This changes the diagnosis. The single-queue policy is already structurally enforced at the top of the file: eight entries, one line each, distinct owning issues, a handoff line, a 6 KB cap, and a passing verifier. The policy failure is at the **bottom** of the corpus: 842 files with no retention boundary, 60 stale in-flight claims, and 53 files no document links to.

### 0.1 Bottom line

- **The queue is honest; the corpus is not.** `backlog.md` names eight issues and a primary (`SPE-1052`), and the verifier rejects shipped records in it. But **none of the three live issues (SPE-1052, SPE-1064, SPE-3338) has a slice doc.** A newcomer who follows the old convention — open `planning/*-slice.md` — finds only history.
- **724 of 842 files are merged-and-shipped records.** They are evidence, not a queue. Four are explicitly superseded, 45 are harvest evidence, 13 are reference documents, 1 is a live parked slice, 2 are unresolved handoffs, and **53 are orphaned**.
- **Status drift is the main corruption.** 65 rows claim an in-flight state. 60 have a shipped/done counter-signal in the frozen index, the manifest, or a merged commit. Only five are defensible non-shipped rows, and only one of those is a live backlog item (`SPE-3181`, parked).
- **The verifier sees less than the corpus.** 714 files have a status row, but only 685 use the bold form the verifier requires; **29 rows are invisible** because the value is not bold. The manifest tracks 355 files — about half of the status-bearing corpus.
- **The fix is a retention boundary, not a rewrite.** Keep 13 reference docs plus the live slice, move 772 verified records to `planning/archive/`, leave 53 orphans in place until statused, and apply a naming rule that makes the next 100 slices sortable. Do not delete anything.

---

## 1. Inventory by state

### 1.1 Definitions and precedence

Every file gets exactly one primary state. Precedence is deliberate: a superseded record is counted as superseded even if it also shipped; a zero-inbound file is counted as orphaned even if git shows it shipped. Underlying status evidence is still shown in Appendix A.

| State                         |   Count | Definition                                                                                                                                                |
| ----------------------------- | ------: | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Active slice**              |   **1** | A non-shipped slice doc tied to a live queue or backlog item.                                                                                             |
| **Merged-and-shipped record** | **724** | A record with a shipped/done disposition from its own status row, the frozen index, the manifest, or a merged commit, and at least one inbound reference. |
| **Superseded**                |   **4** | A later record explicitly replaces its disposition (matrix → umbrella, precursor → shipped chain).                                                        |
| **Harvest evidence**          |  **45** | Source digests and the harvest reconciliation index. Includes the two `*harvest*slice*` files.                                                            |
| **Orphaned**                  |  **53** | **Zero inbound references from any Markdown document in the repository.** A manifest-only reference does not rescue a file from this state.               |
| **Reference document**        |  **13** | Queue, roadmap, milestone, dependency, curation, and policy documents that are neither slices nor harvest.                                                |
| **Unresolved**                |   **2** | An in-flight claim with no shipped counter-evidence and no orphan status. Needs a Linear check.                                                           |
| **Total**                     | **842** |                                                                                                                                                           |

The requested five states are the first five rows. `Reference` and `Unresolved` are explicit residuals, not a way to hide files: Appendix A lists each by name, and the counts sum to 842.

### 1.2 Coverage signals

| Signal                           | Files | Notes                                                     |
| -------------------------------- | ----: | --------------------------------------------------------- |
| Markdown files in `planning/`    |   842 | 779 slice-only + 43 harvest-only + 2 both + 18 other.     |
| Filenames containing `slice`     |   781 | Includes the two `*harvest*slice*` files.                 |
| Filenames containing `harvest`   |    45 | 44 source digests + `harvest-reconciliation-index.md`.    |
| Status row, bold value           |   685 | The only form `verify:backlog-handoff` can parse.         |
| Status row, unbolded value       |    29 | Invisible to the verifier. Listed with `†` in Appendix A. |
| No status row at all             |   128 | 71 slice, 43 harvest, 14 other.                           |
| Present in frozen slice index    |   673 | `backlog-history-2026-11-01.md` § Planning slice index.   |
| Present in `sliceDocStatus`      |   355 | After this audit's one added entry; was 354.              |
| Zero inbound Markdown references |    53 | Exhaustive list in §1.4 and Appendix A.4.                 |

The frozen index covers 94% of status-bearing files; the manifest covers about half. That gap is why 60 in-flight claims can rot without CI noticing.

### 1.3 What the states look like

- **Active (1):** `spe-3181-recurring-containment-requirement-slice.md` — parked after bounded #4356; remaining completion deferred to SPE-1071/3041/1135, parent SPE-1052 still Backlog. It is the only slice doc still tied to a live backlog line.
- **Unresolved (2):** `spe-1046-file-work-queue-release-package-handoff-slice-1.md` and `spe-1046-post-spe-2532-handoff-reconciliation-slice-1.md`. Both say In Progress, both are in the frozen index as In Progress, and neither has a shipped claim. Parent SPE-1046 is Done, so both are probably historical, but the repository does not prove it.
- **Superseded (4):** the SPE-947 and SPE-956 parent-disposition chains, plus the infiltration case-prep precursor. See §2.
- **Harvest (45):** 44 external source digests plus the reconciliation index. They are evidence for candidate selection, not work items.
- **Reference (13):** `backlog.md`, `backlog-history-2026-11-01.md`, `milestones.md`, `roadmap.md`, `mvp-scope.md`, `dependency-map.md`, `documentation-curation.md`, `deferred-design-documents.md`, `milestone-label-policy.md`, `equipment-instance-architecture.md`, `hidden-modality-matrix-post-matrix-queue.md`, `scope-discipline-grooming-pass.md`, `infiltration-encounter-content-batch4plus-audit.md`.
- **Shipped (724):** everything from `Shipped`/`Recently shipped`/`Done` rows to index-only and git-only records. This is the archive population.

### 1.4 The orphan set is exhaustive (53)

Orphans are grouped by why they were never indexed. Full rows, with evidence and recommended action, are in Appendix A.4.

| Group                                  |  Count | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------- | -----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Shipped in git, never indexed**   | **38** | 31 hardening/feature slices (SPE-2651–2718) and 7 `spe-28-*` procurement slices. Every one has a merged commit subject naming its SPE and a PR number or a `feat`/`fix` subject. No index row, no manifest entry, no inbound link.                                                                                                                                                                                                                   |
| **B. Shipped record, no index row**    |  **9** | `anti-narrative-record-collapse-registry-slice-1` (SPE-2119, #2438), `concept-state-transformation-registry-slice-1` (SPE-2118, #2437), `cover-story-lifecycle-slice-4`, `disclosure-campaign-player-ui-slice-5`, `spe-2796-operational-explanation-contract-slice`, `spe-2910-workshop-disorder-consequences-slice`, `spe-3155-equipment-defect-recall-slice`, `spe-3444-workshop-fixture-types-slice`, `spe-992-hidden-room-building-graph-slice`. |
| **B2. Statusless, shipped commit**     |  **2** | `site-operational-exploration-turn-slice` (SPE-2260, #2412) and `spe-2567-agent-cursor-plugins-slice` (SPE-2567).                                                                                                                                                                                                                                                                                                                                    |
| **C. Possibly live**                   |  **1** | `spe-1392-historical-route-memory-slice` — says In review; only a docs commit; no inbound link. Check Linear before archiving.                                                                                                                                                                                                                                                                                                                       |
| **D. Record docs never indexed**       |  **2** | `spe-2416-whitlock-carolers-game-world` and `spe-2905-discussion-to-decision-reconciliation`.                                                                                                                                                                                                                                                                                                                                                        |
| **E. Historical governance amendment** |  **1** | `cursor-delegated-backlog-approval-amendment` — superseded in practice by `docs/cursor-autonomous-authority.md`, but never linked.                                                                                                                                                                                                                                                                                                                   |
| **Total**                              | **53** |                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

Two of the 53 (`spe-2910`, `spe-992`) are in `sliceDocStatus` but not in the Markdown index or any document. They are orphaned by the stated definition (no doc reference) while still being tracked by JSON; Appendix A flags them as "manifest-only".

### 1.5 Status drift

- **65 rows claim an in-flight state** (`In Progress`, `In progress`, `In PR`, `In review`, `Ready for PR`, `Local implementation`, `Parked`).
- **60 have a shipped/done counter-signal.** 49 bold `In Progress` rows conflict with `Shipped` in the frozen index alone. Add unbolded rows and commit-only evidence and the number reaches 60. Composition: 57 shipped-state rows, 2 orphaned stale rows (`anti-narrative`, `concept-state`), and 1 superseded interim matrix (`spe-947-parent-ac-matrix-reconciliation-slice-1`).
- **Five are not contradicted:** `spe-3181` (legitimately parked), the two SPE-1046 handoffs above (unresolved), the historical Cursor amendment (orphaned), and `spe-1392` (in-review orphan).
- **29 rows cannot be parsed by the verifier** because they write `| **Status** | In Progress |` instead of `| **Status** | **In Progress** |`. They are marked `†` wherever they appear in Appendix A.

Representative contradictions:

| File                                               | Says                               | Counter-signal                                                                                                                                                  |
| -------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spe-956-propagation-graph-persistence-slice-2.md` | In Progress                        | Frozen index: Shipped; commit `f66b8373` (2026-07-16) "SPE-2621: persist authored propagation graphs on GameState"; slices 3–4 and the parent umbrella shipped. |
| `infiltration-guides-documents-slice.md`           | In Progress (unbolded)             | Frozen index: Shipped; PR #2827 @ `b2df4866`; later `infiltration-role-branches-zone-slice.md` cites it as shipped.                                             |
| 20 `spe-1046-*` docs                               | In Progress                        | Frozen index: Shipped; parent SPE-1046 is Done; commits carry #2950–#3019.                                                                                      |
| 17 `spe-947-*` docs                                | In Progress                        | Frozen index: Shipped; SPE-947 parent Done via SPE-2618; commits carry #3059–#3137.                                                                             |
| 5 `information-intake-*` docs                      | Ready for PR / In PR / In Progress | Frozen index: Shipped; PR #2444–#2471.                                                                                                                          |
| `welfare-debt-accounting-registry-slice-5/6`       | In Progress                        | Frozen index: Shipped; commits SPE-2417/2418.                                                                                                                   |

This is not a design contradiction. No later slice's scope table reverses an earlier design. It is **lifecycle drift**: the status cell was never updated after merge, and because the file was never added to the manifest, CI never checked it.

---

## 2. Supersession and duplicate map

### 2.1 True supersessions (4 records)

| Chain                            | Superseded record                                                         | Replaced by                                                                                                                                         | Evidence                                                                                                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SPE-947 parent disposition       | `spe-947-spe-1046-parent-acceptance-review-slice-1.md` (SPE-2481)         | `spe-947-parent-ac-matrix-reconciliation-slice-1.md` (SPE-2575), then `spe-947-parent-umbrella-reconciliation-slice-2.md` (SPE-2618, Done PR #3137) | The SPE-2481 file says "Do not treat this SPE-2481 matrix as current" and names the SPE-2575 matrix as canonical. The SPE-2575 matrix is interim; the SPE-2618 umbrella record closes the parent. |
| SPE-947 interim matrix           | `spe-947-parent-ac-matrix-reconciliation-slice-1.md`                      | `spe-947-parent-umbrella-reconciliation-slice-2.md`                                                                                                 | Own status In Progress; frozen index Shipped; the umbrella record is Done and cites the matrix as its prerequisite.                                                                               |
| SPE-956 parent disposition       | `spe-956-parent-ac-matrix-reconciliation-slice-1.md` (SPE-2641, PR #3192) | `spe-956-parent-umbrella-acceptance-slice-1.md` (SPE-2642, PR #3194)                                                                                | The matrix says "Do **not** mark SPE-956 Done"; the umbrella record records owner acceptance and parent Done.                                                                                     |
| Infiltration case-prep precursor | `infiltration-case-prep-slice.md`                                         | `infiltration-case-prep-encounter-preview-slice.md` (SPE-2308, PR #2479) + the SPE-521 prep chain PR #2824–#2833                                    | The precursor has no Status row and no Linear field; the frozen index says Shipped, but the later preview and seven prep slices own the same panel surface.                                       |

These are the only records where a later document explicitly replaces an earlier document's disposition. The other 838 are not superseded; they are either additive, stale, or historical.

### 2.2 Series map: `infiltration-*` (14 files, three different programs)

The prefix is not one series. It contains:

| Program                     | Files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Relationship                                                                                                                                                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SPE-521 case-prep chain** | `infiltration-case-prep-slice` (precursor, superseded), `infiltration-case-prep-encounter-preview-slice` (SPE-2308), `infiltration-encounter-state-cover-slice` (#2825), `infiltration-cover-stance-weekly-tick-slice` (#2826), `infiltration-guides-documents-slice` (#2827, stale In Progress), `infiltration-front-desk-pending-encounter-slice` (#2824), `infiltration-role-branches-zone-slice` (#2828), `infiltration-civilian-long-horizon-roles-slice` (#2830), `infiltration-non-uniform-identity-trees-slice` (#2833), `spe-521-parent-reconciliation-slice` | Additive sequence. Only the precursor is superseded; the rest are shipped records. The parent is Done.                                                                                                                        |
| **SPE-2250 content chain**  | `infiltration-encounter-content-slice-1`, `-slice-2`, `-slice-3`, `infiltration-encounter-content-batch4plus-audit`                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Additive: slice 1 covers 3 batch-4 templates, slice 2 completes the remaining 9, slice 3 adds report copy. The batch-4+ audit is a **deferred decision record**, not a successor. No template outside batch-4 was authorized. |
| **SPE-2687 hardening**      | `spe-2687-harden-infiltration-probe-soft-numerics-validate-slice`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Unrelated validation slice; orphaned (group A). Do not fold it into the SPE-521 map.                                                                                                                                          |

**Verdict:** one true supersession (precursor), one stale status (`guides`), no duplicate designs. The `infiltration-encounter-content-*` files are a sequential stack, not three copies.

### 2.3 Series map: `spe-956-*` (23 files)

| Sub-chain                             | Files                                                                                                                                                                                                                                   | Relationship                                                                                                            |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Propagation graph**                 | `wire-up-slice-1` (#3140), `persistence-slice-2` (stale In Progress; commit `f66b8373`), `week-close-slice-3` (#3147), `surfacing-slice-4`                                                                                              | Additive. Slice 2's status cell contradicts the commit and the frozen index. No design replacement.                     |
| **Participatory channel persistence** | `persistence-slice-1` (survivor registry, #3169), `-slice-2` (#3172), `-slice-3` (hotline, #3177), `-slice-4` (async, #3180), `-slice-5` (advisory body)                                                                                | Additive by channel map. Each slice extends the same sanitize/hydrate module; later slices do not replace earlier maps. |
| **Channel evaluators**                | `hotline-channel-slice-1` (#3162), `async-discussion-surface-slice-1` (#3164), `survivor-informal-registry-slice-1` (#3166), `collective-memory-stabilization-slice-1` (#3168), `community-advisory-decision-influence-slice-1` (#3158) | Parallel domain evaluators; no ordering between them.                                                                   |
| **Compose / surfacing / week-close**  | `participatory-channel-compose-slice-1` (#3186), `-mirror-slice-1`, `-week-close-slice-1`, `-weekly-report-note-slice-1`, `gamestate-incident-baseline-persistence-slice-1`                                                             | Additive post-Done follow-ons.                                                                                          |
| **Parent disposition**                | `parent-ac-incident-wire-up-slice-1` (#3188), `-slice-2` (#3190), `parent-ac-matrix-reconciliation-slice-1` (#3192, superseded), `parent-umbrella-acceptance-slice-1` (#3194, final)                                                    | The only replacement chain in SPE-956: matrix → umbrella.                                                               |

**Verdict:** one true supersession (matrix → umbrella), one stale status (propagation persistence slice 2), five additive persistence slices. The `persistence-slice-1…5` names look duplicate but their scope tables name different GameState maps; they are not duplicates.

### 2.4 Same-slug series that are not duplicates

| Series                                       | Files | Why it is not a duplicate                                                                                                     |
| -------------------------------------------- | ----: | ----------------------------------------------------------------------------------------------------------------------------- |
| `post-incident-review-registry-*`            |    30 | Numbered chain; each slice adds one review stage. No byte-identical pair.                                                     |
| `coercive-contained-person-protocol-model-*` |    17 | Numbered model chain.                                                                                                         |
| `parent-acceptance-review-*`                 |    17 | One record per parent (SPE-1309, 1310, 1343, 1888, …), not 17 copies.                                                         |
| `welfare-debt-accounting-registry-*`         |    12 | Numbered registry chain.                                                                                                      |
| `hidden-modality-matrix-*`                   |    11 | Numbered matrix slices; 10 and 11 have unbolded Shipped rows.                                                                 |
| `layout-staging-catalog-*`                   |     6 | Six distinct room → department pairs (SPE-2988/2989/2990/2992/2996/2997). The scope tables explicitly prevent an eighth pair. |
| `spe-1046-file-work-queue-*`                 |  many | Delivery slice 1 is metadata-only; slice 2 adds actual file content. Additive, not a duplicate ledger.                        |

**Content duplicate check:** `md5sum planning/*.md` found **zero byte-identical pairs**. The only duplicate H1 is `# Near-term backlog` in `backlog.md` and the frozen history, which is intentional.

### 2.5 The contradiction map is lifecycle, not design

The 60 contradicted in-flight rows cluster by program:

| Program                                    | Contradicted rows | Counter-evidence                                                                                                   |
| ------------------------------------------ | ----------------: | ------------------------------------------------------------------------------------------------------------------ |
| SPE-1046 (affiliation/clearance/file work) |                20 | Parent Done; frozen index Shipped; PRs #2950–#3019.                                                                |
| SPE-947 (propagation/media economy)        |                17 | Parent Done via SPE-2618; PRs #3059–#3137.                                                                         |
| Information intake (SPE-854)               |                 5 | PRs #2444–#2471.                                                                                                   |
| Backlog handoff hygiene                    |                 4 | PRs #2398–#2442; frozen index Shipped.                                                                             |
| Welfare-debt registry                      |                 3 | Commits SPE-2417/2418.                                                                                             |
| Anomaly case lifecycle                     |                 2 | Frozen index Shipped.                                                                                              |
| Orphaned stale records                     |                 2 | `anti-narrative` / `concept-state`; merged commits #2437–#2438.                                                    |
| Superseded interim matrix                  |                 1 | `spe-947-parent-ac-matrix-reconciliation-slice-1`; replaced by the umbrella record.                                |
| Singles                                    |                 6 | `hidden-modality-3`, `infiltration-guides`, `media-contained`, `public-signal`, `spe-3304`, `spe-956` persistence. |

No later slice in these programs contradicts an earlier **design**; the later record simply shipped while the earlier status cell stayed In Progress.

---

## 3. Retention proposal

### 3.1 Principle

> History is evidence. It leaves the working set; it does not leave the repository.

Do not delete, do not rename archived files, and do not rewrite frozen history. Move only records whose state is verified. Leave every orphan in place until its status is resolved, because an orphan may be the only copy of a live boundary (`spe-1392`).

### 3.2 What stays, what moves

| Bucket              | Count | Destination                    | Rule                                                                                           |
| ------------------- | ----: | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| Reference documents |    13 | `planning/` root               | Stay. These are the navigation layer. `backlog-history` must stay at its manifest path.        |
| Harvest index       |     1 | `planning/` root               | Stay; it is the map for the 44 digests.                                                        |
| Harvest digests     |    44 | `planning/archive/harvest/`    | Move in one batch; update index links in the same commit.                                      |
| Active slice        |     1 | `planning/slices/`             | Keep findable; it is the only live slice.                                                      |
| Unresolved handoffs |     2 | `planning/slices/`             | Keep until Linear check; then archive or close.                                                |
| Orphans             |    53 | Stay in `planning/`            | Do not move until statused. 38 are shipped-in-git and can move after a status row + index row. |
| Superseded records  |     4 | `planning/archive/superseded/` | Move after adding a one-line "Superseded by …" banner.                                         |
| Shipped records     |   724 | `planning/archive/shipped/`    | Move after the manifest path update described below.                                           |

Arithmetic: 13 + 1 + 44 + 1 + 2 + 53 + 4 + 724 = 842.

**The manifest constraint that decides the migration order:** `verify:backlog-handoff` reads every path in `sliceDocStatus` and fails with `slice doc not found` if it is moved. 355 entries are tracked. Any archive batch that moves a tracked file must rewrite that path in `backlog-handoff-manifest.json` in the same commit. Moving `backlog-history-2026-11-01.md` also breaks `historyFile`; do not move it.

### 3.3 Archive layout

```
planning/
  backlog.md                  # queue, 8 entries
  backlog-history-2026-11-01.md  # frozen; manifest historyFile path
  milestones.md
  roadmap.md
  mvp-scope.md
  dependency-map.md
  documentation-curation.md
  deferred-design-documents.md
  milestone-label-policy.md
  equipment-instance-architecture.md
  hidden-modality-matrix-post-matrix-queue.md
  scope-discipline-grooming-pass.md
  infiltration-encounter-content-batch4plus-audit.md
  harvest-reconciliation-index.md
  slices/
    INDEX.md                  # generated; issue -> slice -> status
    spe-3181-recurring-containment-requirement-slice.md
    spe-1046-file-work-queue-release-package-handoff-slice-1.md
    spe-1046-post-spe-2532-handoff-reconciliation-slice-1.md
  archive/
    README.md                 # maps old path -> state -> PR/commit
    shipped/                  # 724
    superseded/               # 4
    harvest/                  # 44
```

Do **not** create `archive/orphaned/` yet. The 53 stay at root until each has a status. That keeps `spe-1392` visible.

### 3.4 Naming rule for the next 100 slices

1. **Shape:** `spe-<issue>-<kebab-scope>-slice-<NN>.md`.
2. **Issue first:** always the Linear issue number, zero-padded only as Linear does (`spe-1052`, not `spe-52`).
3. **Two-digit ordinal:** `slice-01` … `slice-99`. This fixes the current `slice-10` sorts before `slice-2` problem.
4. **No dates, PR numbers, status words, or author names** in the filename. Status lives in the Status row; PR evidence lives in the index.
5. **One issue + one ordinal per file.** No `-slice-1-2`, no `-final`, no `-v2`.
6. **ASCII kebab, ≤ 64 characters,** one scope noun phrase. Example: `spe-1052-facility-institution-slice-01.md`.
7. **Mandatory header block:** Linear, Status, Parent, Base `main` SHA, Supersedes (or `none`), Owner.
8. **Mandatory bold status row:** `| **Status** | **Shipped** — PR #… |`. The verifier literally cannot parse an unbolded value.
9. **Archive keeps its original filename.** No renames on move, so old links survive.
10. **Same-commit registration:** a new slice adds its `planning/slices/INDEX.md` row; a shipped slice adds its manifest entry. One commit, one verify run.

The rule is enforceable without a script: `ls planning/slices | sort` groups by issue, then ordinal. The index is generated from the status rows, so it cannot silently disagree.

### 3.5 How a newcomer finds the true next task in under two minutes

1. **README → Planning and Documentation** (1 click). It points at `planning/backlog.md`, not at the 842 files.
2. **`planning/backlog.md` → Start here** (lines 8–13). Four lines, 8 queue entries, one primary: **SPE-1052**.
3. **Open SPE-1052 in Linear.** Linear owns scope, status, and the next action. The queue only orders it.
4. **If a slice doc exists**, `planning/slices/INDEX.md` resolves issue → file in one lookup. If none exists — the current case for SPE-1052, SPE-1064, and SPE-3338 — **Linear is the task.** Do not pick an orphan.

That is 3 links and 4 lines. The old path (browse `planning/*-slice.md`) cannot finish in two minutes because 724 of the files are history.

**Measured against the current tree:** the primary issue has no matching slice file (`ls planning/*1052*` → empty), so step 4 ends at Linear. The newcomer never opens an archive file.

---

## 4. Mechanical edits

### 4.1 Applied and verified

> **Post-audit application (2026-11-03):** P7 was executed after this audit. 724 shipped, 4 superseded, and 44 harvest records moved to [`planning/archive/`](archive/README.md); 352 manifest paths, 42 harvest-index links, and 9 intra-archive links were updated; `verify:backlog-handoff` passed after each of the five batches. The classification in this document remains the pre-migration record.

| #   | File                                     | Exact edit                                                                                                                                                 | Reason                                                                                                                                                                                          | Verifier effect                                                                                                                 |
| --- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| A1  | `planning/backlog.md`                    | Added `## Start here (under two minutes)` at lines 8–13, four numbered steps, primary SPE-1052, "if no slice doc, Linear is the task", link to this audit. | Makes the true next task findable without browsing the corpus.                                                                                                                                  | Accepted: queue parser still sees 8 distinct entries; 2,993 bytes < 6 KB; no forbidden `Recently shipped` / `**Shipped**` text. |
| A2  | `planning/backlog.md`                    | Added one `Corpus retention:` line under Maintenance (line 37) linking this audit and the archive boundary.                                                | Keeps the audit discoverable from the single queue.                                                                                                                                             | Accepted: prose outside the Active queue and handoff sections.                                                                  |
| A3  | `planning/backlog-handoff-manifest.json` | Added `"planning/spe-2827-generic-ordinary-equipment-instance-authority-reconciliation.md": "Done"` to `sliceDocStatus`.                                   | A Done record was outside the handoff manifest; it now matches its `**Done** on Linear` row. Also removed a duplicate `spe-2625` key created during the edit (the manifest already tracked it). | `verify:backlog-handoff` passes; `archivedShipped=149` unchanged; manifest now 355 entries.                                     |

**Verification actually run:**

```
$ npm run verify:backlog-handoff
backlog-handoff: OK primary=SPE-1052 inProgress=SPE-1064,SPE-3338 archivedShipped=149
exit=0
```

No other file was edited, moved, renamed, or deleted. No Linear call was made. No slice was implemented.

### 4.2 Proposed edits (not applied at audit time)

Each proposal states its verifier effect and whether it requires Linear action under `docs/cursor-autonomous-authority.md`. "Linear action: yes" means the edit asserts issue lifecycle or queue position; even where Cursor may act autonomously, it must verify evidence and write Linear first, not change the repo silently.

| ID  | Edit                                                                                                                                                            | Reason                                                                                                                                        | Verifier effect                                                                                                 | Linear action                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| P1  | Bold the 29 unbolded Status values (`                                                                                                                           | **Status**                                                                                                                                    | **X**                                                                                                           | `).                                                                  | 29 rows are invisible to `parseSliceDocStatus`; they can never enter the manifest as written. | Neutral alone; required before any manifest addition. | No, unless the value changes. |
| P2  | Correct the 60 contradicted in-flight rows to `Shipped`/`Done` (or close them).                                                                                 | They claim work is open when the frozen index, manifest, or a merged commit says otherwise.                                                   | Only accepted if the manifest value matches the new row exactly.                                                | **Yes.** Verify the issue state and merge evidence in Linear first.  |
| P3  | Add the corrected docs to `sliceDocStatus` in batches, starting with the 60 from P2, then the 53 orphans.                                                       | Manifest covers 355 of 714 status rows; drift persists outside it.                                                                            | Each entry must match a bold status row; a missing file fails hard.                                             | **Yes** for any Shipped/Done claim.                                  |
| P4  | Resolve the 53 orphans: add a Status row and an index row; for `spe-1392`, check Linear before assigning a state.                                               | 53 files have no inbound link; 38 are provably shipped.                                                                                       | Index rows are ignored by the verifier; manifest entries must match.                                            | **Yes** for status claims; no for index rows.                        |
| P5  | Add frozen-index rows for the 50 orphan slices and 2 manifest-only docs (`spe-2910`, `spe-992`).                                                                | The index is the only navigation layer for 673 files; these are absent.                                                                       | Ignored by the verifier.                                                                                        | No.                                                                  |
| P6  | Reconcile the frozen history's `**In progress:** SPE-330` line with `backlog.md` (`SPE-1064`, `SPE-3338`). Prefer a dated banner over rewriting frozen history. | Two documents currently name different in-progress issues; CI does not compare them.                                                          | The verifier only reads history's `**Recently shipped:**` lines, so a banner is accepted.                       | **Yes.** Determine the true In Progress set in Linear.               |
| P7  | Archive 724 shipped + 4 superseded + 44 harvest digests, in five batches.                                                                                       | Removes history from the working set without deleting it.                                                                                     | Fails unless every moved `sliceDocStatus` path and the `historyFile` path are updated in the same commit.       | No.                                                                  |
| P8  | Rename **future** slices only; do not rename the existing 781.                                                                                                  | The new rule needs a clean start; a mass rename breaks 724+ inbound links.                                                                    | No effect if new files only.                                                                                    | No.                                                                  |
| P9  | Change the primary or queue order if SPE-1052 is not the true next task.                                                                                        | The queue must reflect Linear, not the other way around.                                                                                      | Queue must keep 1–12 distinct IDs and include the manifest primary/in-progress.                                 | **Yes.** Set the issue In Progress / select the next approved issue. |
| P10 | Add `planning/slices/INDEX.md` and a slice template with the mandatory header.                                                                                  | Makes the naming rule operational and the next 100 slices findable.                                                                           | Ignored by the verifier.                                                                                        | No.                                                                  |
| P11 | Update `README.md` § Planning and Documentation and `AGENTS.md` documentation hygiene to point at `planning/slices/INDEX.md` and `planning/archive/README.md`.  | The entry points still describe a flat `planning/` directory.                                                                                 | Not covered by `verify:backlog-handoff`; `verify:audits-index` is unaffected (it only scans `docs/*audit*.md`). | No.                                                                  |
| P12 | Do not create a Linear issue for this audit itself.                                                                                                             | It is unowned read-only analysis; `AGENTS.md` says no invented issue is needed. If retention becomes durable scope, create one bounded issue. | No effect.                                                                                                      | No (unless scope is adopted).                                        |

### 4.3 Why some tempting edits fail the verifier

- **Moving a manifest-tracked slice** without rewriting its `sliceDocStatus` path → `slice doc not found`.
- **Changing a slice's Status row** without changing the manifest value → `**Status** is "X" but manifest expects "Y"`.
- **Adding a queue entry without a distinct SPE id** → `each entry needs one distinct owning issue`.
- **Adding a long entry** → `350 characters max` or `1–12 one-line active entries`.
- **Putting shipped evidence back in `backlog.md`** → `shipped records belong in history or Linear`.
- **Moving `backlog-history-2026-11-01.md`** → `historyFile` read fails; the verifier's `historyHandoff` read throws.
- **Renaming the manifest key without renaming the file** → same missing-path failure.

### 4.4 Linear action under `docs/cursor-autonomous-authority.md`

The authority document grants Cursor autonomous lifecycle and scope authority, and explicitly says ChatGPT Phase 1–4 gates do not bind Cursor. It also requires Cursor to inspect existing evidence before changing scope and to distinguish verified completion from partial progress.

Therefore:

- **Cursor may** correct a status, add a manifest entry, or change the queue **after** verifying the issue and merge evidence — without a ChatGPT approval round.
- **Cursor must not** make those changes _silently_: Linear is the system of record (`AGENTS.md`), so the evidence comment/lifecycle update comes first, then the doc/manifest edit in the same ship loop.
- **This audit does not exercise that authority.** It is read-only plus three verifier-safe edits that do not assert a new lifecycle state. Every P2–P4, P6, and P9 item is deliberately left as a proposal because it would require a Linear write that this task forbids.

---

## 5. Limitations and method

- **No Linear API access in this session.** "Shipped" is inferred from the frozen index, the manifest, and git commit subjects/PR numbers. It was not re-checked against Linear. P2–P4 explicitly require that check.
- **No full-content read of all 842 files.** Classification is metadata-based: filename, Status row, frozen-index row, manifest row, git last commit, and inbound Markdown references. I read the key series and every ambiguous case; the 128 statusless files are classified by the stated rules, with the two unresolved handoffs called out.
- **Orphan means zero inbound Markdown references.** A JSON-only reference does not count; two such files are flagged. This is stricter than "not in the backlog", which would make nearly the whole corpus orphaned.
- **The frozen history is intentionally stale.** Its `**In progress:** SPE-330` line is historical, not a current instruction. It is not machine-checked against the live queue; P6 addresses that.
- **At audit time, no deletion, move, rename, archive creation, or Linear mutation was performed.** P7 was applied afterward; see §4.1. Applying it requires the manifest path updates in §4.3.
- **`npm run format:check` was not run** because dependencies are not installed in this cloud worktree. The audit is Markdown; the only required gate for this task was `verify:backlog-handoff`, which passed. If CI runs Prettier over `planning/`, format the new file before merge.

### 5.1 Reproducibility

The classification was generated from the checkout with read-only commands:

```
git log --format='C|%ad|%h|%s' --date=short --name-only -n 4000 -- planning
md5sum planning/*.md | sort | uniq -d
grep -l '| \*\*Status\*\* |' planning/*.md
npm run verify:backlog-handoff
```

No analysis script is committed. The final file is Markdown only.

---

## Appendix A — Full classification (842 files)

Every file in the audited 842-file corpus appears exactly once below. This audit file (`planning/planning-corpus-audit.md`) is the 843rd Markdown file and is outside its own scope. `†` means the Status value is unbolded and therefore invisible to `verify:backlog-handoff`.

### A.1 Active slice (1)

| File                                                  | Status                                                                  | Why it is the only live slice                                                                                     |
| ----------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `spe-3181-recurring-containment-requirement-slice.md` | Parked (bounded #4356 shipped; remaining completion deferred — Backlog) | Parked after bounded #4356; remaining completion deferred to SPE-1071/3041/1135; parent SPE-1052 remains Backlog. |

### A.2 Unresolved handoffs (2)

| File                                                           | Status      | Evidence         | Why unresolved                                                                                                     |
| -------------------------------------------------------------- | ----------- | ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| `spe-1046-file-work-queue-release-package-handoff-slice-1.md`† | In Progress | doc: In Progress | In Progress in both the doc and the frozen index; no shipped claim; parent SPE-1046 is Done. Needs a Linear check. |
| `spe-1046-post-spe-2532-handoff-reconciliation-slice-1.md`     | In Progress | doc: In Progress | In Progress in both the doc and the frozen index; no shipped claim; parent SPE-1046 is Done. Needs a Linear check. |

### A.3 Superseded (4)

| File                                                   | Own status  | Superseded by                                                                                                                            |
| ------------------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `infiltration-case-prep-slice.md`                      | —           | `infiltration-case-prep-encounter-preview-slice.md` (SPE-2308, PR #2479) + SPE-521 prep chain PR #2824–#2833                             |
| `spe-947-parent-ac-matrix-reconciliation-slice-1.md`   | In Progress | `spe-947-parent-umbrella-reconciliation-slice-2.md` (SPE-2618, Done PR #3137)                                                            |
| `spe-947-spe-1046-parent-acceptance-review-slice-1.md` | Shipped     | `spe-947-parent-ac-matrix-reconciliation-slice-1.md`, then `spe-947-parent-umbrella-reconciliation-slice-2.md` (SPE-2618, Done PR #3137) |
| `spe-956-parent-ac-matrix-reconciliation-slice-1.md`   | Shipped     | `spe-956-parent-umbrella-acceptance-slice-1.md` (SPE-2642, PR #3194)                                                                     |

### A.4 Orphaned — exhaustive (53)

Zero inbound Markdown references. Manifest-only references do not count.

| File                                                                            | Group                                 | Evidence                                                                                        | Recommended action                                                      |
| ------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `spe-2651-harden-progression-xp-gained-validation-slice.md`                     | A — Shipped in git, never indexed     | git: SPE-2651: reconcile XP logs before agent-history validation                                | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2652-harden-agent-promoted-validation-slice.md`                            | A — Shipped in git, never indexed     | git: SPE-2652: Harden agent.promoted event validation (#3215)                                   | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2654-harden-agent-betrayed-validation-slice.md`                            | A — Shipped in git, never indexed     | git: SPE-2654: Harden agent.betrayed trust-damage validation                                    | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2655-harden-agent-relationship-changed-validation-slice.md`                | A — Shipped in git, never indexed     | git: SPE-2655: Harden agent.relationship_changed numeric validation                             | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2656-harden-agent-instructor-assignment-validation-slice.md`               | A — Shipped in git, never indexed     | git: SPE-2656: Harden instructor assignment event validation                                    | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2657-harden-agent-training-event-validation-slice.md`                      | A — Shipped in git, never indexed     | git: SPE-2657: Preserve team refunds; reject whitespace training ids                            | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2659-harden-production-queue-event-validation-slice.md`                    | A — Shipped in git, never indexed     | git: SPE-2659: Harden production.queue_started / queue_completed numeric validation (#3229)     | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2660-harden-market-shifted-validation-slice.md`                            | A — Shipped in git, never indexed     | git: SPE-2661: Harden market.shifted catalog membership at validate                             | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2661-harden-market-shifted-catalog-validation-slice.md`                    | A — Shipped in git, never indexed     | git: SPE-2664: Harden production.queue_* catalog membership at validate                         | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2662-harden-market-transaction-validation-slice.md`                        | A — Shipped in git, never indexed     | git: SPE-2665: Harden market.transaction_recorded allocation and listing resource bounds at val | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2663-align-hydrate-reconcile-market-total-price-slice.md`                  | A — Shipped in git, never indexed     | git: SPE-2665: Harden market.transaction_recorded allocation and listing resource bounds at val | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2664-harden-production-queue-catalog-validation-slice.md`                  | A — Shipped in git, never indexed     | git: SPE-2665: Harden market.transaction_recorded allocation and listing resource bounds at val | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2665-harden-market-transaction-allocation-listing-bounds-slice.md`         | A — Shipped in git, never indexed     | git: SPE-2665: Harden market.transaction_recorded allocation and listing resource bounds at val | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2666-harden-market-emergency-gray-market-soft-numerics-validate-slice.md`  | A — Shipped in git, never indexed     | git: SPE-2666: Harden emergency gray-market soft numerics at validate                           | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2668-harden-agency-containment-updated-soft-numerics-validate-slice.md`    | A — Shipped in git, never indexed     | git: SPE-2669: Harden front-business and academy soft numerics at validate.                     | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2669-harden-agency-front-business-academy-soft-numerics-validate-slice.md` | A — Shipped in git, never indexed     | git: SPE-2669: Align front-business fundingDelta validate floor with hydrate.                   | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2686-harden-staff-side-work-resolved-soft-numerics-validate-slice.md`      | A — Shipped in git, never indexed     | git: SPE-2686: Harden staff.side_work.resolved soft numerics at validate (#3267)                | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2687-harden-infiltration-probe-soft-numerics-validate-slice.md`            | A — Shipped in git, never indexed     | git: SPE-2687: Harden infiltration probe soft numerics at validate (#3269)                      | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2690-emergency-gray-market-accountability-closure-chronology-slice.md`     | A — Shipped in git, never indexed     | git: SPE-2690: validate accountability closure chronology (#3273)                               | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2691-emergency-gray-market-fallout-tick-consistency-slice.md`              | A — Shipped in git, never indexed     | git: SPE-2691: validate fallout tick consistency (#3275)                                        | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2699-rival-comparative-pressure-slice.md`                                  | A — Shipped in git, never indexed     | git: SPE-2700: Scale external-support failure drift by standing                                 | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2700-standing-shaped-forgiveness-slice.md`                                 | A — Shipped in git, never indexed     | git: SPE-2700: Scale external-support failure drift by standing                                 | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2701-post-exposure-rival-posture-slice.md`                                 | A — Shipped in git, never indexed     | git: SPE-2701: Protective-coercive rival posture after public exposure (#3294)                  | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2704-hidden-cell-funding-theft-slice.md`                                   | A — Shipped in git, never indexed     | git: SPE-2704: clarify summary line and lock advanceWeek theft basis                            | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2705-standing-shaped-fallout-tick-scale-slice.md`                          | A — Shipped in git, never indexed     | git: SPE-2705: Standing-shaped scale on emergency gray-market fallout tick (#3301)              | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2706-hidden-cell-research-rollback-slice.md`                               | A — Shipped in git, never indexed     | git: SPE-2714: Hidden-cell strategic interference (covert cell growth + detection narrowing) (# | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2707-hidden-cell-panic-amplification-slice.md`                             | A — Shipped in git, never indexed     | git: SPE-2714: Hidden-cell strategic interference (covert cell growth + detection narrowing) (# | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2710-hidden-cell-infrastructure-compromise-slice.md`                       | A — Shipped in git, never indexed     | git: SPE-2714: Hidden-cell strategic interference (covert cell growth + detection narrowing) (# | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2714-hidden-cell-covert-growth-detection-slice.md`                         | A — Shipped in git, never indexed     | git: SPE-2716: Require resolved×open pair for coordination packets                              | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2716-resolved-open-jurisdiction-sharpening-slice.md`                       | A — Shipped in git, never indexed     | git: SPE-2716: Require resolved×open pair for coordination packets                              | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2718-status-upkeep-public-display-ranking-slice.md`                        | A — Shipped in git, never indexed     | git: SPE-2718: Persist upkeep band on week-close notes for ranking history                      | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-28-corruption-routing-slice.md`                                            | A — Shipped in git, never indexed     | git: SPE-2323: callable obligations as non-cash procurement leverage (#2513)                    | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-28-delayed-procurement-slice.md`                                           | A — Shipped in git, never indexed     | git: SPE-2319: wire field plate delayed supplier fulfillment via procurement backlog            | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-28-favor-exchange-slice.md`                                                | A — Shipped in git, never indexed     | git: SPE-28: redeem rare containment staff via faction favor exchange                           | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-28-inventory-holding-cost-slice.md`                                        | A — Shipped in git, never indexed     | git: SPE-2321: vendor shortage pressure tightens supplier availability (#2509)                  | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-28-operating-cost-slice.md`                                                | A — Shipped in git, never indexed     | git: SPE-28: charge weekly operating cost on week advance                                       | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-28-service-boon-slice.md`                                                  | A — Shipped in git, never indexed     | git: SPE-2323: callable obligations as non-cash procurement leverage (#2513)                    | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-28-shortage-pressure-slice.md`                                             | A — Shipped in git, never indexed     | git: SPE-2322: compromised authority distorts procurement routing (#2511)                       | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `anti-narrative-record-collapse-registry-slice-1.md`                            | B — Shipped record, no index row      | doc: In Progress                                                                                | Add bold Status (Shipped/Done) + frozen-index row; then archive.        |
| `concept-state-transformation-registry-slice-1.md`                              | B — Shipped record, no index row      | doc: In Progress                                                                                | Add bold Status (Shipped/Done) + frozen-index row; then archive.        |
| `cover-story-lifecycle-slice-4.md`                                              | B — Shipped record, no index row      | doc: Shipped                                                                                    | Add bold Status (Shipped/Done) + frozen-index row; then archive.        |
| `disclosure-campaign-player-ui-slice-5.md`                                      | B — Shipped record, no index row      | doc: Shipped                                                                                    | Add bold Status (Shipped/Done) + frozen-index row; then archive.        |
| `spe-2796-operational-explanation-contract-slice.md`                            | B — Shipped record, no index row      | doc: Shipped                                                                                    | Add bold Status (Shipped/Done) + frozen-index row; then archive.        |
| `spe-2910-workshop-disorder-consequences-slice.md`                              | B — Shipped record, no index row      | doc: Done                                                                                       | Add bold Status (Shipped/Done) + frozen-index row; then archive.        |
| `spe-3155-equipment-defect-recall-slice.md`                                     | B — Shipped record, no index row      | git: SPE-3088: Settle paid equipment repairs atomically (#4541)                                 | Add bold Status (Shipped/Done) + frozen-index row; then archive.        |
| `spe-3444-workshop-fixture-types-slice.md`                                      | B — Shipped record, no index row      | git: fix(test): preserve canonical workshop fixture types (SPE-3444) (#4604)                    | Add bold Status (Shipped/Done) + frozen-index row; then archive.        |
| `spe-992-hidden-room-building-graph-slice.md`                                   | B — Shipped record, no index row      | doc: Done                                                                                       | Add bold Status (Shipped/Done) + frozen-index row; then archive.        |
| `site-operational-exploration-turn-slice.md`                                    | B2 — Statusless; shipped commit       | git: feat(SPE-2260): site operational exploration turn clock (#2364)                            | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-2567-agent-cursor-plugins-slice.md`                                        | B2 — Statusless; shipped commit       | git: docs(SPE-2567): wire Cursor plugin keep-list for agents (#3057)                            | Add bold Status (Shipped) + frozen-index row; then archive.             |
| `spe-1392-historical-route-memory-slice.md`                                     | C — Possibly live; do not archive yet | doc: In review                                                                                  | Check Linear first; do not assign a status or archive until resolved.   |
| `spe-2416-whitlock-carolers-game-world.md`                                      | D — Record doc, never indexed         | git: docs(SPE-2416): add Whitlock Carolers slice plan                                           | Add a Status/Done or archived banner + index row.                       |
| `spe-2905-discussion-to-decision-reconciliation.md`                             | D — Record doc, never indexed         | git: docs(SPE-2905): record implementation boundary                                             | Add a Status/Done or archived banner + index row.                       |
| `cursor-delegated-backlog-approval-amendment.md`                                | E — Historical governance amendment   | doc: In progress                                                                                | Mark Superseded by `docs/cursor-autonomous-authority.md`; then archive. |

### A.5 Harvest evidence (45)

| File                                                       | Kind                   | Inbound |
| ---------------------------------------------------------- | ---------------------- | ------: |
| `alpha-centauri-manual-metadata-88-harvest.md`             | source digest          |       1 |
| `branch-continuity-harvest-reconciliation-slice-1.md`      | slice + harvest record |       2 |
| `campaign-readiness-mission-hub-metadata-96-harvest.md`    | source digest          |       1 |
| `covert-organization-field-catalog-metadata-83-harvest.md` | source digest          |       1 |
| `covert-trust-intrigue-metadata-80-harvest.md`             | source digest          |       1 |
| `episodic-quick-incident-metadata-45-harvest.md`           | source digest          |       1 |
| `expedition-debt-players-edition-metadata-128-harvest.md`  | source digest          |       1 |
| `expedition-debt-route-map-metadata-115-harvest.md`        | source digest          |       1 |
| `exploit-access-harvest-deferral-slice-1.md`               | slice + harvest record |       2 |
| `facility-crisis-triage-metadata-55-harvest.md`            | source digest          |       1 |
| `faith-adjacent-clandestine-agency-metadata-50-harvest.md` | source digest          |       1 |
| `field-staff-operations-handbook-metadata-105-harvest.md`  | source digest          |       1 |
| `governance-bureau-faction-metadata-82-harvest.md`         | source digest          |       1 |
| `harvest-reconciliation-index.md`                          | index                  |      20 |
| `haunted-estate-dual-pressure-metadata-106-harvest.md`     | source digest          |       1 |
| `hidden-role-social-meeting-metadata-65-harvest.md`        | source digest          |       1 |
| `historical-occult-supplement-metadata-51-harvest.md`      | source digest          |       1 |
| `home-bases-transcript-metadata-48-harvest.md`             | source digest          |       1 |
| `horror-tension-questionnaire-metadata-50-harvest.md`      | source digest          |       1 |
| `investigation-debrief-guide-metadata-50-harvest.md`       | source digest          |       1 |
| `layered-case-concept-generator-metadata-70-harvest.md`    | source digest          |       1 |
| `mc-toolkit-contract-authoring-metadata-132-harvest.md`    | source digest          |       1 |
| `mission-hub-guide-patterns-metadata-44-harvest.md`        | source digest          |       1 |
| `multi-stage-squad-operations-metadata-24-harvest.md`      | source digest          |       1 |
| `mythic-campaign-traversal-delta-17-harvest.md`            | source digest          |       1 |
| `mythic-density-incident-metadata-24-harvest.md`           | source digest          |       1 |
| `mythic-omen-pressure-delta-19-harvest.md`                 | source digest          |       1 |
| `osr-emergent-fieldplay-metadata-60-harvest.md`            | source digest          |       1 |
| `osr-site-exploration-metadata-165-harvest.md`             | source digest          |       1 |
| `phenomena-hub-verified-metadata-58-harvest.md`            | source digest          |       1 |
| `post-release-tactical-manual-delta-100-harvest.md`        | source digest          |       1 |
| `post-release-tactical-manual-metadata-104-harvest.md`     | source digest          |       1 |
| `postmortem-procedure-loadout-metadata-30-harvest.md`      | source digest          |       1 |
| `procedural-world-generator-metadata-24-harvest.md`        | source digest          |       1 |
| `proximity-chemical-predator-metadata-26-harvest.md`       | source digest          |       2 |
| `pulp-expedition-adventure-metadata-40-harvest.md`         | source digest          |       1 |
| `sealed-facility-manual-metadata-95-harvest.md`            | source digest          |       1 |
| `social-deduction-loop-delta-60-harvest.md`                | source digest          |       1 |
| `spatial-remodeling-faction-metadata-35-harvest.md`        | source digest          |       1 |
| `staff-role-packages-transcript-metadata-26-harvest.md`    | source digest          |       1 |
| `street-contact-dossier-metadata-51-harvest.md`            | source digest          |       1 |
| `survival-pressure-civic-metadata-71-harvest.md`           | source digest          |       1 |
| `tabletop-mechanics-transcript-metadata-87-harvest.md`     | source digest          |       1 |
| `urban-concealment-investigation-metadata-100-harvest.md`  | source digest          |       2 |
| `urban-concealment-pdf-confirm-95-harvest.md`              | source digest          |       1 |

### A.6 Reference documents (13)

| File                                                 | Role                                                      | Inbound |
| ---------------------------------------------------- | --------------------------------------------------------- | ------: |
| `backlog-history-2026-11-01.md`                      | Frozen former backlog + slice index; manifest historyFile |       1 |
| `backlog.md`                                         | Live near-term queue (single queue)                       |     401 |
| `deferred-design-documents.md`                       | Deferred in-repo depth                                    |       9 |
| `dependency-map.md`                                  | Dependency map                                            |       3 |
| `documentation-curation.md`                          | Curation rhythm                                           |      10 |
| `equipment-instance-architecture.md`                 | Equipment-instance architecture                           |       5 |
| `hidden-modality-matrix-post-matrix-queue.md`        | Post-matrix modality queue                                |       4 |
| `infiltration-encounter-content-batch4plus-audit.md` | Deferred batch-4+ decision record                         |       3 |
| `milestone-label-policy.md`                          | Milestone/label policy                                    |       1 |
| `milestones.md`                                      | Milestone proof points                                    |       4 |
| `mvp-scope.md`                                       | MVP boundary                                              |       5 |
| `roadmap.md`                                         | Phases, dependencies, sequencing                          |       4 |
| `scope-discipline-grooming-pass.md`                  | Scope-discipline grooming record                          |      13 |

### A.7 Merged-and-shipped records (724)

#### Shipped (345)

- `anomaly-case-lifecycle-state-machine-slice-1.md` — doc: Shipped
- `anomaly-case-lifecycle-state-machine-slice-2.md` — doc: Shipped
- `anomaly-case-lifecycle-state-machine-slice-3.md` — doc: Shipped
- `anomaly-case-lifecycle-state-machine-slice-4.md` — doc: Shipped
- `backlog-handoff-hygiene-slice-1.md` — doc: Shipped
- `branch-continuity-runtime-hooks-slice-1.md` — doc: Shipped
- `branch-continuity-stability-audit-category-slice-1.md` — doc: Shipped
- `coercive-contained-person-protocol-model-slice-1.md` — doc: Shipped
- `coercive-contained-person-protocol-model-slice-10.md` — doc: Shipped
- `coercive-contained-person-protocol-model-slice-11.md` — doc: Shipped
- `coercive-contained-person-protocol-model-slice-12.md` — doc: Shipped
- `coercive-contained-person-protocol-model-slice-13.md` — doc: Shipped
- `coercive-contained-person-protocol-model-slice-14.md` — doc: Shipped
- `coercive-contained-person-protocol-model-slice-15.md` — doc: Shipped
- `coercive-contained-person-protocol-model-slice-16.md` — doc: Shipped
- `coercive-contained-person-protocol-model-slice-17.md` — doc: Shipped
- `coercive-contained-person-protocol-model-slice-2.md` — doc: Shipped
- `coercive-contained-person-protocol-model-slice-3.md` — doc: Shipped
- `coercive-contained-person-protocol-model-slice-4.md` — doc: Shipped
- `coercive-contained-person-protocol-model-slice-5.md` — doc: Shipped
- `coercive-contained-person-protocol-model-slice-6.md` — doc: Shipped
- `coercive-contained-person-protocol-model-slice-7.md` — doc: Shipped
- `coercive-contained-person-protocol-model-slice-8.md` — doc: Shipped
- `coercive-contained-person-protocol-model-slice-9.md` — doc: Shipped
- `concealment-case-prep-activation-preview-slice.md` — doc: Shipped
- `concealment-front-desk-pending-activation-slice.md` — doc: Shipped
- `contained-person-integrated-health-bundle-slice-10.md` — doc: Shipped
- `contained-person-integrated-health-bundle-slice-6.md` — doc: Shipped
- `contained-person-integrated-health-bundle-slice-7.md` — doc: Shipped
- `contained-person-integrated-health-bundle-slice-8.md` — doc: Shipped
- `contained-person-integrated-health-bundle-slice-9.md` — doc: Shipped
- `contained-person-therapeutic-care-registry-slice-1.md` — doc: Shipped
- `contained-person-therapeutic-care-registry-slice-2.md` — doc: Shipped
- `contained-person-therapeutic-care-registry-slice-3.md` — doc: Shipped
- `contained-person-therapeutic-care-registry-slice-4.md` — doc: Shipped
- `contained-person-therapeutic-care-registry-slice-5.md` — doc: Shipped
- `contribution-intake-curation-pipeline-slice-1.md` — doc: Shipped
- `cover-story-lifecycle-slice-1.md` — doc: Shipped
- `cover-story-lifecycle-slice-2.md` — doc: Shipped
- `cover-story-lifecycle-slice-3.md` — doc: Shipped
- `disclosure-campaign-player-ui-slice-1.md` — doc: Shipped
- `disclosure-campaign-player-ui-slice-2.md` — doc: Shipped
- `disclosure-campaign-player-ui-slice-3.md` — doc: Shipped
- `disclosure-campaign-player-ui-slice-4.md` — doc: Shipped
- `entity-welfare-reclassification-registry-slice-1.md` — doc: Shipped
- `entity-welfare-reclassification-registry-slice-2.md` — doc: Shipped
- `entity-welfare-reclassification-registry-slice-3.md` — doc: Shipped
- `entity-welfare-reclassification-registry-slice-4.md` — doc: Shipped
- `entity-welfare-reclassification-registry-slice-5.md` — doc: Shipped
- `extranormal-event-registry-slice-1.md` — doc: Shipped
- `extranormal-event-registry-slice-2.md` — doc: Shipped
- `extranormal-event-registry-slice-3.md` — doc: Shipped
- `hidden-modality-matrix-slice-1.md` — doc: Shipped
- `hidden-modality-matrix-slice-10.md`† — doc: Shipped — SPE-2302 / PR #2467
- `hidden-modality-matrix-slice-11.md`† — doc: Shipped — SPE-2303 / PR #2469
- `hidden-modality-matrix-slice-2.md` — doc: Shipped
- `hidden-modality-matrix-slice-4.md` — doc: Shipped
- `hidden-modality-matrix-slice-5.md`† — doc: Shipped — SPE-2285 / PR #2411
- `hidden-modality-matrix-slice-6.md`† — doc: Shipped — SPE-2286 / PR #2415
- `hidden-modality-matrix-slice-7.md`† — doc: Shipped — SPE-2288 / PR #2421
- `hidden-modality-matrix-slice-8.md`† — doc: Shipped — SPE-2289 / PR #2422
- `hidden-modality-matrix-slice-9.md`† — doc: Shipped — SPE-2290 / PR #2423
- `infiltration-case-prep-encounter-preview-slice.md`† — doc: Shipped — SPE-2308 / PR #2479
- `infiltration-civilian-long-horizon-roles-slice.md`† — doc: Shipped (PR #2830 @ `2cf23287`)
- `infiltration-cover-stance-weekly-tick-slice.md` — doc: Shipped
- `infiltration-encounter-content-slice-3.md`† — doc: Shipped — SPE-2305 / PR #2473
- `infiltration-encounter-state-cover-slice.md` — doc: Shipped
- `infiltration-front-desk-pending-encounter-slice.md` — doc: Shipped
- `infiltration-non-uniform-identity-trees-slice.md`† — doc: Shipped (PR #2833 @ `ce8aa09b`)
- `infiltration-role-branches-zone-slice.md`† — doc: Shipped (PR #2828 @ `192986f8`)
- `information-intake-coverage-compose-slice-3.md` — doc: Shipped
- `information-intake-extranormal-cross-link-slice-1.md` — doc: Shipped
- `information-intake-minor-anomaly-cross-link-slice-1.md` — doc: Shipped
- `information-intake-minor-anomaly-cross-link-surfacing-slice-1.md` — doc: Shipped
- `information-intake-naming-hazard-cross-link-slice-1.md` — doc: Shipped
- `information-intake-parent-integration-slice-1.md` — doc: Shipped
- `information-intake-parent-integration-slice-2.md` — doc: Shipped
- `information-intake-report-persistence-slice-2.md` — doc: Shipped
- `information-intake-unexplained-location-cross-link-slice-1.md` — doc: Shipped
- `information-intake-unexplained-location-cross-link-surfacing-slice-1.md` — doc: Shipped
- `information-intake-weekly-hook-slice-5.md` — doc: Shipped
- `information-intake-weekly-hook-slice-7.md` — doc: Shipped
- `information-intake-weekly-hook-slice-8.md` — doc: Shipped
- `information-intake-weekly-hook-slice-9.md` — doc: Shipped
- `mass-anomalous-population-emergence-registry-slice-2.md` — doc: Shipped
- `mass-anomalous-population-emergence-registry-slice-3.md` — doc: Shipped
- `mass-anomalous-population-emergence-registry-slice-4.md` — doc: Shipped
- `mass-anomalous-population-emergence-registry-slice-5.md` — doc: Shipped
- `minor-anomaly-item-registry-slice-1.md` — doc: Shipped
- `minor-anomaly-item-registry-slice-2.md` — doc: Shipped
- `minor-anomaly-item-registry-slice-3.md` — doc: Shipped
- `mission-triage-intake-signal-slice.md` — doc: Shipped
- `mission-triage-modality-signal-slice.md`† — doc: Shipped — SPE-2306 / PR #2475
- `modifiable-data-pack-publish-automation-integration-slice-3.md` — doc: Shipped
- `modifiable-data-pack-publish-queue-enqueue-slice-4.md` — doc: Shipped
- `modifiable-data-pack-runtime-import-slice-1.md` — doc: Shipped
- `modifiable-data-pack-surfacing-slice-1.md` — doc: Shipped
- `modifiable-data-pack-validation-slice-1.md` — doc: Shipped
- `modifiable-data-pack-weekly-orchestration-slice-2.md` — doc: Shipped
- `modular-release-packaging-slice-1.md` — doc: Shipped
- `naming-hazard-cross-link-surfacing-slice-1.md` — doc: Shipped
- `naming-hazard-descriptor-registry-slice-1.md` — doc: Shipped
- `naming-hazard-descriptor-registry-slice-2.md` — doc: Shipped
- `naming-hazard-descriptor-registry-slice-3.md` — doc: Shipped
- `naming-hazard-descriptor-registry-slice-4.md` — doc: Shipped
- `naming-hazard-descriptor-registry-slice-5.md` — doc: Shipped
- `pattern-source-series-registry-slice-1.md` — doc: Shipped
- `pattern-source-series-registry-slice-2.md` — doc: Shipped
- `pattern-source-series-registry-slice-3.md` — doc: Shipped
- `pattern-source-series-registry-slice-4.md` — doc: Shipped
- `pattern-source-series-registry-slice-5.md` — doc: Shipped
- `playbook-wrong-document-failure-slice-1.md` — doc: Shipped
- `post-incident-review-registry-slice-10.md` — doc: Shipped
- `post-incident-review-registry-slice-11.md` — doc: Shipped
- `post-incident-review-registry-slice-12.md` — doc: Shipped
- `post-incident-review-registry-slice-13.md` — doc: Shipped
- `post-incident-review-registry-slice-14.md` — doc: Shipped
- `post-incident-review-registry-slice-15.md` — doc: Shipped
- `post-incident-review-registry-slice-16.md` — doc: Shipped
- `post-incident-review-registry-slice-17.md` — doc: Shipped
- `post-incident-review-registry-slice-18.md` — doc: Shipped
- `post-incident-review-registry-slice-19.md` — doc: Shipped
- `post-incident-review-registry-slice-2.md` — doc: Shipped
- `post-incident-review-registry-slice-20.md` — doc: Shipped
- `post-incident-review-registry-slice-21.md` — doc: Shipped
- `post-incident-review-registry-slice-22.md` — doc: Shipped
- `post-incident-review-registry-slice-23.md` — doc: Shipped
- `post-incident-review-registry-slice-24.md` — doc: Shipped
- `post-incident-review-registry-slice-25.md` — doc: Shipped
- `post-incident-review-registry-slice-26.md` — doc: Shipped
- `post-incident-review-registry-slice-27.md` — doc: Shipped
- `post-incident-review-registry-slice-28.md` — doc: Shipped
- `post-incident-review-registry-slice-29.md` — doc: Shipped
- `post-incident-review-registry-slice-3.md` — doc: Shipped
- `post-incident-review-registry-slice-30.md` — doc: Shipped
- `post-incident-review-registry-slice-31.md` — doc: Shipped
- `post-incident-review-registry-slice-4.md` — doc: Shipped
- `post-incident-review-registry-slice-5.md` — doc: Shipped
- `post-incident-review-registry-slice-6.md` — doc: Shipped
- `post-incident-review-registry-slice-7.md` — doc: Shipped
- `post-incident-review-registry-slice-8.md` — doc: Shipped
- `post-incident-review-registry-slice-9.md` — doc: Shipped
- `public-disclosure-state-registry-slice-1.md` — doc: Shipped
- `public-disclosure-state-registry-slice-2.md` — doc: Shipped
- `public-disclosure-state-registry-slice-3.md` — doc: Shipped
- `public-disclosure-state-registry-slice-4.md` — doc: Shipped
- `publish-automation-crediting-hooks-slice-1.md` — doc: Shipped
- `publish-queue-execution-receipt-persistence-slice-1.md` — doc: Shipped
- `publish-queue-execution-receipt-surfacing-slice-1.md` — doc: Shipped
- `publish-queue-executor-slice-1.md` — doc: Shipped
- `publish-queue-github-api-slice-1.md` — doc: Shipped
- `publish-queue-live-orchestration-slice-1.md` — doc: Shipped
- `publish-queue-manual-approval-channel-slice-1.md` — doc: Shipped
- `publish-queue-persistence-slice-1.md` — doc: Shipped
- `publish-queue-surfacing-slice-1.md` — doc: Shipped
- `publish-queue-webhook-channel-slice-1.md` — doc: Shipped
- `recurrent-catastrophe-amelioration-registry-slice-1.md` — doc: Shipped
- `recurrent-catastrophe-amelioration-registry-slice-2.md` — doc: Shipped
- `recurrent-catastrophe-amelioration-registry-slice-3.md` — doc: Shipped
- `recurrent-catastrophe-amelioration-registry-slice-4.md` — doc: Shipped
- `recurrent-catastrophe-amelioration-registry-slice-5.md` — doc: Shipped
- `rule-document-compliance-containment-registry-slice-2.md` — doc: Shipped
- `rule-document-compliance-containment-registry-slice-3.md` — doc: Shipped
- `rule-document-compliance-containment-registry-slice-4.md` — doc: Shipped
- `scouted-free-agent-departure-events-slice.md` — doc: Shipped
- `segmented-feedback-workflow-slice-1.md` — doc: Shipped
- `self-censoring-information-registry-slice-1.md` — doc: Shipped
- `self-censoring-information-registry-slice-2.md` — doc: Shipped
- `self-censoring-information-registry-slice-3.md` — doc: Shipped
- `self-censoring-information-registry-slice-4.md` — doc: Shipped
- `spe-1028-department-workshop-completion-outcome-bridge-slice.md` — doc: Shipped
- `spe-1028-department-workshop-enqueue-slice.md` — doc: Shipped
- `spe-1028-department-workshop-persistence-slice.md` — doc: Shipped
- `spe-1028-department-workshop-player-surface-slice.md` — doc: Shipped
- `spe-1028-department-workshop-processing-advance-slice.md` — doc: Shipped
- `spe-1028-department-workshop-queue-kernel-slice.md` — doc: Shipped
- `spe-1028-workshop-live-safety-inputs-slice.md` — doc: Shipped
- `spe-1028-workshop-unsafe-processing-safety-slice.md` — doc: Shipped
- `spe-1028-workshop-unsafe-secondary-incident-slice.md` — doc: Shipped
- `spe-1046-dual-loyalty-risk-slice-1.md` — doc: Shipped
- `spe-1046-durable-person-status-mission-routing-slice-1.md` — doc: Shipped
- `spe-1046-file-work-queue-action-recommendations-slice-1.md` — doc: Shipped
- `spe-1046-file-work-queue-candidate-evidence-repair-slice-1.md` — doc: Shipped
- `spe-1046-file-work-queue-evidence-repair-candidates-slice-1.md` — doc: Shipped
- `spe-1046-file-work-queue-evidence-resolution-slice-1.md` — doc: Shipped
- `spe-1046-file-work-queue-operator-action-ledger-slice-1.md` — doc: Shipped
- `spe-1046-onboarding-clearance-readiness-slice-1.md` — doc: Shipped
- `spe-1046-permission-surfacing-slice-1.md` — doc: Shipped
- `spe-1046-post-spe-2527-status-reconciliation-slice-1.md` — doc: Shipped
- `spe-1046-post-spe-2529-handoff-reconciliation-slice-1.md` — doc: Shipped
- `spe-1046-post-spe-2530-handoff-reconciliation-slice-1.md` — doc: Shipped
- `spe-1046-post-spe-2531-handoff-reconciliation-slice-1.md` — doc: Shipped
- `spe-1046-protected-status-action-restrictions-slice-1.md` — doc: Shipped
- `spe-1046-protected-status-surfacing-slice-1.md` — doc: Shipped
- `spe-1046-revocation-downgrade-outcomes-slice-1.md` — doc: Shipped
- `spe-1046-revocation-outcome-surfacing-slice-1.md` — doc: Shipped
- `spe-1046-room-housing-access-enforcement-slice-1.md` — doc: Shipped
- `spe-1046-status-class-permission-sets-slice-1.md` — doc: Shipped
- `spe-1309-parent-acceptance-review-slice-1.md` — doc: Shipped
- `spe-1309-parent-acceptance-review-slice-2.md` — doc: Shipped
- `spe-1309-parent-acceptance-review-slice-3.md` — doc: Shipped
- `spe-1309-parent-acceptance-review-slice-4.md` — doc: Shipped
- `spe-1309-parent-acceptance-review-slice-5.md` — doc: Shipped
- `spe-1309-parent-acceptance-review-slice-6.md` — doc: Shipped
- `spe-1309-unified-engine-slice-1.md` — doc: Shipped
- `spe-1309-unified-engine-slice-2.md` — doc: Shipped
- `spe-1309-unified-engine-slice-3.md` — doc: Shipped
- `spe-1309-unified-engine-slice-4.md` — doc: Shipped
- `spe-1309-unified-engine-slice-5.md` — doc: Shipped
- `spe-1309-unified-engine-slice-6.md` — doc: Shipped
- `spe-1309-unified-engine-slice-7.md` — doc: Shipped
- `spe-1310-parent-acceptance-review-slice-1.md` — doc: Shipped
- `spe-1343-parent-acceptance-review-slice-1.md` — doc: Shipped
- `spe-1343-parent-acceptance-review-slice-2.md` — doc: Shipped
- `spe-1343-parent-acceptance-review-slice-3.md` — doc: Shipped
- `spe-1615-psychological-resilience-registry-slice-1.md` — doc: Shipped
- `spe-1615-psychological-resilience-registry-slice-2.md` — doc: Shipped
- `spe-1615-psychological-resilience-registry-slice-3.md` — doc: Shipped
- `spe-1615-psychological-resilience-registry-slice-4.md` — doc: Shipped
- `spe-1615-psychological-resilience-registry-slice-5.md` — doc: Shipped
- `spe-1888-parent-acceptance-review-slice-1.md` — doc: Shipped
- `spe-1888-parent-acceptance-review-slice-2.md` — doc: Shipped
- `spe-1888-parent-acceptance-review-slice-3.md` — doc: Shipped
- `spe-1888-parent-acceptance-review-slice-4.md` — doc: Shipped
- `spe-1888-parent-acceptance-review-slice-5.md` — doc: Shipped
- `spe-1888-parent-acceptance-review-slice-6.md` — doc: Shipped
- `spe-1888-parent-acceptance-review-slice-7.md` — doc: Shipped
- `spe-1908-cross-system-reconciliation-slice-1.md` — doc: Shipped
- `spe-1908-cross-system-reconciliation-slice-2.md` — doc: Shipped
- `spe-1908-cross-system-reconciliation-slice-3.md` — doc: Shipped
- `spe-1908-cross-system-reconciliation-slice-4.md` — doc: Shipped
- `spe-1908-cross-system-reconciliation-slice-5.md` — doc: Shipped
- `spe-1908-cross-system-reconciliation-slice-6.md` — doc: Shipped
- `spe-1908-owner-reconciliation-slice.md` — doc: Shipped
- `spe-2016-cross-system-reconciliation-slice-1.md` — doc: Shipped
- `spe-2016-staff-exclusion-contradiction-check-slice.md` — doc: Shipped
- `spe-2083-department-capability-registry-slice.md` — doc: Shipped
- `spe-2084-cross-department-coordination-slice.md` — doc: Shipped
- `spe-2088-department-authorization-handoff-slice.md` — doc: Shipped
- `spe-2269-deployable-readiness-composition-slice.md` — doc: Shipped
- `spe-2625-propagation-graph-counter-overflow-fix.md` — doc: Shipped
- `spe-2645-post-spe-2643-handoff-reconciliation-slice-1.md` — doc: Shipped
- `spe-2647-example-incident-path-baseline-resolve-wire-slice-1.md` — doc: Shipped
- `spe-2648-post-spe-2644-handoff-reconciliation-slice-1.md` — doc: Shipped
- `spe-2649-post-spe-2646-handoff-reconciliation-slice-1.md` — doc: Shipped
- `spe-2703-prerequisite-planner-kernel-slice.md` — doc: Shipped
- `spe-2719-institutional-legitimacy-operational-cover-slice.md` — doc: Shipped
- `spe-2720-authority-graph-week-close-persistence-slice.md` — doc: Shipped
- `spe-2721-persisted-authority-graph-negotiation-slice.md` — doc: Shipped
- `spe-2722-external-support-authority-consequence-slice.md` — doc: Shipped
- `spe-2725-mission-access-authority-routing-slice.md` — doc: Shipped
- `spe-2740-rival-expedition-progress-loop-slice.md` — doc: Shipped
- `spe-2741-rival-expedition-week-close-slice.md` — doc: Shipped
- `spe-2748-grade-recovery-slice.md` — doc: Shipped
- `spe-2750-canonical-equipment-grade-fabrication-outcomes-slice.md` — doc: Shipped
- `spe-2751-equipment-catalog-grade-migration-slice.md` — doc: Shipped
- `spe-2755-workshop-receipt-case-consumer-slice.md` — doc: Shipped
- `spe-2757-processing-order-envelope-slice.md` — doc: Shipped
- `spe-2759-dependent-prerequisite-activation-slice.md` — doc: Shipped
- `spe-2760-automatic-successor-activation-slice.md` — doc: Shipped
- `spe-2761-failure-cancellation-reservation-release-slice.md` — doc: Shipped
- `spe-2762-canonical-failure-cancellation-lifecycle-signal-producer-slice.md` — doc: Shipped
- `spe-2763-canonical-case-cancellation-command-slice.md` — doc: Shipped
- `spe-2764-canonical-terminal-workshop-lane-cleanup-slice.md` — doc: Shipped
- `spe-2765-canonical-workshop-finalization-handoff-slice.md` — doc: Shipped
- `spe-2766-workshop-finalization-fabrication-enqueue-slice.md` — doc: Shipped
- `spe-2767-workshop-finalization-case-closure-slice.md` — doc: Shipped
- `spe-2768-workshop-completion-output-quality-slice.md` — doc: Shipped
- `spe-2775-workshop-adjacency-throughput-slice.md` — doc: Shipped
- `spe-2776-workshop-operating-model-slice.md` — doc: Shipped
- `spe-2777-workshop-oversubscription-pressure-slice.md` — doc: Shipped
- `spe-2779-workshop-dependency-availability-gate-slice.md` — doc: Shipped
- `spe-2780-workshop-certification-eligibility-gate-slice.md` — doc: Shipped
- `spe-2781-workshop-dependency-output-quality-slice.md` — doc: Shipped
- `spe-2782-workshop-equipment-output-quality-slice.md` — doc: Shipped
- `spe-2783-workshop-reagent-output-quality-slice.md` — doc: Shipped
- `spe-2784-workshop-dedicated-station-eligibility-gate-slice.md` — doc: Shipped
- `spe-2785-workshop-automated-diagnostics-eligibility-gate-slice.md` — doc: Shipped
- `spe-2786-workshop-anomaly-specialization-eligibility-gate-slice.md` — doc: Shipped
- `spe-2787-department-workshop-routing-slice.md` — doc: Shipped
- `spe-2788-department-workshop-activation-slice.md` — doc: Shipped
- `spe-2792-workshop-live-room-quality-slice.md` — doc: Shipped
- `spe-2799-weekly-auto-scrap-existing-authorities-slice.md` — doc: Shipped
- `spe-2800-fabricated-equipment-lot-recovery-selection-slice.md` — doc: Shipped
- `spe-2827-parent-reconciliation-slice.md` — doc: Shipped
- `spe-31-frontdesk-hub-rumor-opportunity-slice.md`† — doc: Shipped
- `spe-31-frontdesk-strategic-action-budget-slice.md`† — doc: Shipped
- `spe-31-frontdesk-tag-conflict-ranking-slice.md`† — doc: Shipped
- `spe-31-frontdesk-tag-conflict-value-stream-opportunity-slice.md`† — doc: Shipped
- `spe-31-parent-reconciliation-slice.md` — doc: Shipped
- `spe-31-town-first-contract-generation-slice.md`† — doc: Shipped
- `spe-521-parent-reconciliation-slice.md` — doc: Shipped
- `spe-70-parent-reconciliation-slice.md` — doc: Shipped
- `spe-848-surveillance-tuning-registry-slice-2.md` — doc: Shipped
- `spe-848-surveillance-tuning-registry-slice-3.md` — doc: Shipped
- `spe-848-surveillance-tuning-registry-slice-4.md` — doc: Shipped
- `spe-877-integrity-program-grooming-slice.md` — doc: Shipped
- `spe-947-countermeasure-ledger-slice-1.md` — doc: Shipped
- `spe-947-parent-ac-integration-tests-slice-1.md` — doc: Shipped
- `spe-947-pursuit-vector-slice-1.md` — doc: Shipped
- `spe-947-spe-2111-registry-linkage-slice-1.md` — doc: Shipped
- `spe-956-async-discussion-surface-slice-1.md` — doc: Shipped
- `spe-956-collective-memory-stabilization-slice-1.md` — doc: Shipped
- `spe-956-community-advisory-decision-influence-slice-1.md` — doc: Shipped
- `spe-956-gamestate-incident-baseline-persistence-slice-1.md` — doc: Shipped
- `spe-956-hotline-channel-slice-1.md` — doc: Shipped
- `spe-956-parent-ac-incident-wire-up-slice-1.md` — doc: Shipped
- `spe-956-parent-ac-incident-wire-up-slice-2.md` — doc: Shipped
- `spe-956-parent-umbrella-acceptance-slice-1.md` — doc: Shipped
- `spe-956-participatory-channel-compose-slice-1.md` — doc: Shipped
- `spe-956-participatory-channel-mirror-slice-1.md` — doc: Shipped
- `spe-956-participatory-channel-persistence-slice-1.md` — doc: Shipped
- `spe-956-participatory-channel-persistence-slice-2.md` — doc: Shipped
- `spe-956-participatory-channel-persistence-slice-3.md` — doc: Shipped
- `spe-956-participatory-channel-persistence-slice-4.md` — doc: Shipped
- `spe-956-participatory-channel-persistence-slice-5.md` — doc: Shipped
- `spe-956-participatory-channel-week-close-slice-1.md` — doc: Shipped
- `spe-956-participatory-channel-weekly-report-note-slice-1.md` — doc: Shipped
- `spe-956-propagation-graph-surfacing-slice-4.md` — doc: Shipped
- `spe-956-propagation-graph-week-close-slice-3.md` — doc: Shipped
- `spe-956-propagation-graph-wire-up-slice-1.md` — doc: Shipped
- `spe-956-survivor-informal-registry-slice-1.md` — doc: Shipped
- `submission-governance-rights-slice-1.md` — doc: Shipped
- `truth-layer-cover-narrative-pairing-slice-1.md` — doc: Shipped
- `truth-layer-historical-icon-normalcy-slice-1.md` — doc: Shipped
- `truth-layer-record-registry-slice-1.md` — doc: Shipped
- `truth-layer-record-registry-slice-2.md` — doc: Shipped
- `truth-layer-record-registry-slice-3.md` — doc: Shipped
- `truth-layer-record-registry-slice-4.md` — doc: Shipped
- `unexplained-location-registry-slice-2.md` — doc: Shipped
- `unexplained-location-registry-slice-3.md` — doc: Shipped
- `visual-trigger-hazard-registry-slice-1.md` — doc: Shipped
- `visual-trigger-hazard-registry-slice-2.md` — doc: Shipped
- `visual-trigger-hazard-registry-slice-3.md` — doc: Shipped
- `visual-trigger-hazard-registry-slice-4.md` — doc: Shipped
- `visual-trigger-hazard-registry-slice-5.md` — doc: Shipped
- `welfare-debt-accounting-registry-slice-10.md` — doc: Shipped
- `welfare-debt-accounting-registry-slice-11.md` — doc: Shipped
- `welfare-debt-accounting-registry-slice-12.md` — doc: Shipped
- `welfare-debt-accounting-registry-slice-2.md` — doc: Shipped
- `welfare-debt-accounting-registry-slice-3.md` — doc: Shipped
- `welfare-debt-accounting-registry-slice-4.md` — doc: Shipped
- `welfare-debt-accounting-registry-slice-7.md` — doc: Shipped
- `welfare-debt-accounting-registry-slice-8.md` — doc: Shipped
- `welfare-debt-accounting-registry-slice-9.md` — doc: Shipped

#### Recently shipped (280)

- `facility-maintenance-recovery-contract-slice.md` — doc: Recently shipped
- `facility-maintenance-resource-authority-slice.md` — doc: Recently shipped
- `spe-1012-degraded-care-facility-risk-slice.md` — doc: Recently shipped
- `spe-1015-hostile-facility-actuator-slice.md` — doc: Recently shipped
- `spe-102-full-site-alert-stage-slice.md` — doc: Recently shipped
- `spe-1020-multi-site-facility-network-slice.md` — doc: Recently shipped
- `spe-1021-facility-automation-reset-slice.md` — doc: Recently shipped
- `spe-1022-base-defense-doctrine-slice.md` — doc: Recently shipped
- `spe-1026-layout-adjacency-kernel-slice.md` — doc: Recently shipped
- `spe-1027-counterfeit-protection-goods-slice.md` — doc: Recently shipped
- `spe-1027-department-local-staging-persist-slice.md` — doc: Recently shipped
- `spe-1027-emergency-cache-response-timing-slice.md` — doc: Recently shipped
- `spe-1027-hauling-bottleneck-slice.md` — doc: Recently shipped
- `spe-1027-incorrect-storage-spoilage-slice.md` — doc: Recently shipped
- `spe-1027-misfile-inventory-mismatch-slice.md` — doc: Recently shipped
- `spe-1027-named-part-stockpile-consume-helper-slice.md` — doc: Recently shipped
- `spe-1027-overflow-misfiled-penalty-slice.md` — doc: Recently shipped
- `spe-1027-parent-targeted-test-language-slice.md` — doc: Recently shipped / Done
- `spe-1027-quarantine-separation-slice.md` — doc: Recently shipped
- `spe-1027-restricted-object-release-slice.md` — doc: Recently shipped
- `spe-1027-secured-node-threat-slice.md` — doc: Recently shipped
- `spe-1027-stock-clearance-wrong-zone-slice.md` — doc: Recently shipped
- `spe-1027-stockout-pressure-slice.md` — doc: Recently shipped
- `spe-1027-typed-overflow-loss-slice.md` — doc: Recently shipped
- `spe-1027-warehouse-lots-slice.md` — doc: Recently shipped
- `spe-1051-after-action-cause-chain-slice.md` — doc: Recently shipped
- `spe-1051-living-but-lost-morale-memory-catalog-slice.md` — doc: Recently shipped
- `spe-1051-post-loss-adaptation-unlock-slice.md` — doc: Recently shipped
- `spe-1051-scar-degraded-registry-slice.md` — doc: Recently shipped
- `spe-1051-sealed-site-confiscated-evidence-slice.md` — doc: Recently shipped
- `spe-1051-state-change-success-slice.md` — doc: Recently shipped
- `spe-1058-specialist-labor-registry-slice.md` — doc: Recently shipped
- `spe-1060-room-quality-facility-satisfaction-slice.md` — doc: Recently shipped
- `spe-1135-duty-and-obligation-registry-slice.md` — doc: Recently shipped
- `spe-1173-emergency-branch-borrowing-facility-slice.md` — doc: Recently shipped
- `spe-1263-closed-facility-permeability-slice.md` — doc: Recently shipped
- `spe-1290-bounded-squad-composition-slice.md` — doc: Recently shipped
- `spe-1481-facility-output-thresholds-slice.md` — doc: Recently shipped
- `spe-1562-facility-construction-complication-events-slice.md` — doc: Recently shipped
- `spe-1563-facility-geometry-vulnerability-analysis-slice.md` — doc: Recently shipped
- `spe-1565-delegated-facility-management-slice.md` — doc: Recently shipped
- `spe-1667-site-native-object-removal-escalation-slice.md` — doc: Recently shipped
- `spe-1757-extranormal-temporal-event-registry-slice.md` — doc: Recently shipped
- `spe-1896-procedure-room-state-preconditions-slice.md` — doc: Recently shipped
- `spe-2079-proximity-risk-class-slice.md` — doc: Recently shipped
- `spe-2099-historical-continuity-board-slice.md` — doc: Recently shipped
- `spe-2102-containment-disposition-registry-slice.md` — doc: Recently shipped
- `spe-2103-anomalous-byproduct-lifecycle-slice.md` — doc: Recently shipped
- `spe-2157-action-consequence-router-slice.md` — doc: Recently shipped
- `spe-2166-operational-status-expansion-registry-slice.md` — doc: Recently shipped
- `spe-2172-triggered-anomaly-rule-reveal-registry-slice.md` — doc: Recently shipped
- `spe-2186-defensive-control-staff-action-slice.md` — doc: Recently shipped
- `spe-2189-forced-movement-collision-resolver-slice.md` — doc: Recently shipped
- `spe-2197-entity-encounter-statblock-packet-slice.md` — doc: Recently shipped
- `spe-2211-scene-geometry-registry-slice.md` — doc: Recently shipped
- `spe-2217-field-action-economy-registry-slice.md` — doc: Recently shipped
- `spe-2261-institutional-collapse-pathways-slice.md` — doc: Recently shipped
- `spe-2262-facility-expansion-burden-slice.md` — doc: Recently shipped
- `spe-2263-canon-rule-registry-slice.md` — doc: Recently shipped
- `spe-2264-institution-attributed-truth-layer-slice.md` — doc: Recently shipped
- `spe-2265-authored-content-generation-guardrails-slice.md` — doc: Recently shipped
- `spe-2271-patrol-escort-doctrine-slice.md` — doc: Recently shipped
- `spe-2272-response-deployment-cost-slice.md` — doc: Recently shipped
- `spe-2273-cross-system-transformation-registry-slice.md` — doc: Recently shipped
- `spe-263-confined-space-explosion-slice.md` — doc: Recently shipped
- `spe-270-biological-mnemonic-drain-slice.md` — doc: Recently shipped
- `spe-2738-inter-agency-ownership-transfer-slice.md` — doc: Recently shipped
- `spe-2771-workshop-live-operational-safety-slice.md` — doc: Recently shipped
- `spe-2801-technological-equipment-recovery-profile-expansion-slice.md` — doc: Recently shipped
- `spe-2805-expiring-decision-lifecycle-slice.md` — doc: Recently shipped
- `spe-2826-trauma-kit-recovery-profile-slice.md` — doc: Recently shipped
- `spe-2828-ordinary-equipment-instance-foundation-slice.md` — doc: Recently shipped
- `spe-2829-combat-stim-emergency-overdrive-slice.md` — doc: Recently shipped
- `spe-2830-depleted-combat-stim-instance-recovery-slice.md` — doc: Recently shipped
- `spe-2840-generic-equipment-instance-materialization-surface-slice.md` — doc: Recently shipped
- `spe-2841-stored-ordinary-equipment-instance-recovery-selection-slice.md` — doc: Recently shipped
- `spe-2842-stored-ordinary-equipment-instance-destruction-command-slice.md` — doc: Recently shipped
- `spe-2843-stored-ordinary-equipment-instance-re-aggregation-command-slice.md` — doc: Recently shipped
- `spe-2844-combat-stim-stored-instance-disposal-slice.md` — doc: Recently shipped
- `spe-2845-combat-stim-stored-instance-re-aggregation-slice.md` — doc: Recently shipped
- `spe-2846-fabricated-lot-ordinary-equipment-instance-materialization-provenance-slice.md` — doc: Recently shipped
- `spe-2848-fabricated-ordinary-equipment-instance-return-to-lot-slice.md` — doc: Recently shipped
- `spe-2849-fabricated-combat-stim-lot-materialization-slice.md` — doc: Recently shipped
- `spe-2850-fabricated-combat-stim-return-to-lot-slice.md` — doc: Recently shipped
- `spe-2851-stored-equipment-instance-condition-repair-slice.md` — doc: Recently shipped
- `spe-2853-equipped-ordinary-instance-disposal-reaggregation-slice.md` — doc: Recently shipped
- `spe-2854-equipped-fabricated-ordinary-lot-return-slice.md` — doc: Recently shipped
- `spe-2855-equipped-combat-stim-lifecycle-slice.md` — doc: Recently shipped
- `spe-2856-mission-fatality-equipped-instance-loss-slice.md` — doc: Recently shipped
- `spe-2857-mission-injury-equipped-instance-loss-slice.md` — doc: Recently shipped
- `spe-2860-containment-class-inspection-cadence-deficiency-slice.md` — doc: Recently shipped
- `spe-2862-stabilization-deficiency-clear-slice.md` — doc: Recently shipped
- `spe-2870-named-part-repair-consume-slice.md` — doc: Recently shipped
- `spe-2898-rule-change-transition-slice.md` — doc: Recently shipped
- `spe-2907-seven-beat-presentation-slice.md` — doc: Recently shipped
- `spe-2913-department-local-staging-adjacency-slice.md` — doc: Recently shipped
- `spe-2917-tutorial-lifecycle-slice.md` — doc: Recently shipped
- `spe-2918-tutorial-persistence-slice.md` — doc: Recently shipped
- `spe-2919-contextual-guidance-slice.md` — doc: Recently shipped
- `spe-292-facility-zoning-lockdown-slice.md` — doc: Recently shipped
- `spe-2920-tutorial-delivery-slice.md` — doc: Recently shipped
- `spe-2932-facility-section-graph-slice.md` — doc: Recently shipped
- `spe-2986-layout-persist-slice.md` — doc: Recently shipped
- `spe-2987-layout-staging-projection-slice.md` — doc: Recently shipped
- `spe-2988-layout-staging-catalog-slice.md` — doc: Recently shipped
- `spe-2989-layout-staging-catalog-slice.md` — doc: Recently shipped
- `spe-2990-layout-staging-catalog-slice.md` — doc: Recently shipped
- `spe-2992-layout-staging-catalog-slice.md` — doc: Recently shipped
- `spe-2994-site-event-topology-propagation-slice.md` — doc: Recently shipped
- `spe-2996-layout-staging-catalog-slice.md` — doc: Recently shipped
- `spe-2997-layout-staging-catalog-slice.md` — doc: Recently shipped
- `spe-2998-split-input-output-staging-slice.md` — doc: Recently shipped
- `spe-3001-zone-spanning-origin-pulse-slice.md` — doc: Recently shipped
- `spe-3002-zone-spanning-airflow-slice.md` — doc: Recently shipped
- `spe-3003-zone-spanning-visibility-slice.md` — doc: Recently shipped
- `spe-3004-zone-spanning-panic-slice.md` — doc: Recently shipped
- `spe-3005-zone-spanning-alarm-slice.md` — doc: Recently shipped
- `spe-3006-zone-spanning-contamination-slice.md` — doc: Recently shipped
- `spe-3007-zone-spanning-route-link-slice.md` — doc: Recently shipped
- `spe-3009-historical-route-replay-slice.md` — doc: Recently shipped
- `spe-3010-zone-spanning-full-site-alert-consume-slice.md` — doc: Recently shipped
- `spe-3012-zone-spanning-hazard-kind-slice.md` — doc: Recently shipped
- `spe-3013-zone-spanning-hostile-kind-slice.md` — doc: Recently shipped
- `spe-3014-zone-spanning-social-kind-slice.md` — doc: Recently shipped
- `spe-3015-zone-spanning-reserve-event-kind-slice.md` — doc: Recently shipped
- `spe-3016-zone-spanning-full-site-alert-event-kind-slice.md` — doc: Recently shipped
- `spe-3017-historical-route-replay-persistence-slice.md` — doc: Recently shipped
- `spe-3018-historical-route-replay-week-close-slice.md` — doc: Recently shipped
- `spe-3020-historical-route-replay-terminal-resolve-slice.md` — doc: Recently shipped
- `spe-3024-historical-route-replay-activation-slice.md` — doc: Recently shipped
- `spe-3026-historical-route-replay-explanation-slice.md` — doc: Recently shipped
- `spe-3027-historical-route-memory-graph-persistence-slice.md` — doc: Recently shipped
- `spe-3031-historical-route-replay-map-chrome-slice.md` — doc: Recently shipped
- `spe-3032-historical-route-replay-knowledge-visibility-slice.md` — doc: Recently shipped
- `spe-3033-historical-route-replay-interaction-start-slice.md` — doc: Recently shipped
- `spe-3034-site-action-historical-route-replay-start-slice.md` — doc: Recently shipped
- `spe-3035-ask-investigation-historical-route-replay-start-slice.md` — doc: Recently shipped
- `spe-3040-site-search-historical-route-replay-start-slice.md` — doc: Recently shipped
- `spe-3041-conditional-recurring-task-activation-slice.md` — doc: Recently shipped
- `spe-3043-remaining-interaction-kind-ownership-audit-slice.md` — doc: Recently shipped
- `spe-3044-difficulty-profiles-slice.md` — doc: Recently shipped
- `spe-3076-major-incident-terminal-settlement-slice.md` — doc: Recently shipped
- `spe-3088-paid-equipment-repair-settlement-slice.md` — doc: Recently shipped
- `spe-3108-campaign-profile-threat-family-slice.md` — doc: Recently shipped
- `spe-3109-workshop-labor-consume-slice.md` — doc: Recently shipped
- `spe-311-survey-site-confirmation-slice.md` — doc: Recently shipped
- `spe-3110-workshop-labor-week-close-slice.md` — doc: Recently shipped
- `spe-3112-specialist-operator-feed-slice.md` — doc: Recently shipped
- `spe-3113-persist-specialist-operator-slots-slice.md` — doc: Recently shipped
- `spe-3114-specialist-operator-persistence-authority-slice.md` — doc: Recently shipped
- `spe-3115-map-agent-role-archive-analyst-slots-slice.md` — doc: Recently shipped
- `spe-3116-map-staff-role-archive-analyst-slots-slice.md` — doc: Recently shipped
- `spe-3117-containment-response-cell-repair-pair-slice.md` — doc: Recently shipped
- `spe-3118-clear-specialist-slots-when-mapped-personnel-leave-slice.md` — doc: Recently shipped
- `spe-3119-expansion-collapse-week-close-slice.md` — doc: Recently shipped
- `spe-312-terrain-survey-clocks-slice.md` — doc: Recently shipped
- `spe-3120-action-output-derived-recovery-slice.md` — doc: Recently shipped
- `spe-3124-sponsored-training-completion-slice.md` — doc: Recently shipped
- `spe-313-survey-misinformation-slice.md` — doc: Recently shipped
- `spe-3135-operational-staff-capacity-slice.md` — doc: Recently shipped
- `spe-3136-operational-staffing-capacity-slice.md` — doc: Recently shipped
- `spe-3139-authored-incident-reference-integrity-slice.md` — doc: Recently shipped
- `spe-3140-pressure-seal-named-part-repair-slice.md` — doc: Recently shipped
- `spe-3147-operational-staff-posts-slice.md` — doc: Recently shipped
- `spe-3148-specialist-operational-capacity-slice.md` — doc: Recently shipped
- `spe-3153-critical-asset-supportability-slice.md` — doc: Recently shipped
- `spe-3163-legacy-rngstate-cutover-slice.md` — doc: Recently shipped
- `spe-3164-party-card-draw-scoped-identity-slice.md` — doc: Recently shipped
- `spe-3172-campaign-command-identity-slice.md` — doc: Recently shipped
- `spe-3177-containment-co-location-compatibility-slice.md` — doc: Recently shipped
- `spe-3180-subjective-vs-authoritative-time-slice.md` — doc: Recently shipped
- `spe-3186-scene-difficulty-mitigation-slice.md` — doc: Recently shipped
- `spe-3188-restricted-asset-field-checkout-slice.md` — doc: Recently shipped
- `spe-3189-containment-zone-outbound-screening-slice.md` — doc: Recently shipped
- `spe-3190-initial-facility-maintenance-allocation-slice.md` — doc: Recently shipped
- `spe-3191-player-ordered-facility-recovery-slice.md` — doc: Recently shipped
- `spe-3269-canonical-governance-contract-slice.md` — doc: Recently shipped
- `spe-3282-cross-property-canon-handoff-slice.md` — doc: Recently shipped
- `spe-3283-paid-facility-maintenance-slice.md` — doc: Recently shipped
- `spe-3290-maintenance-replenishment-contradiction-slice.md` — doc: Recently shipped
- `spe-3291-staff-time-allocation-slice.md` — doc: Recently shipped
- `spe-3292-maintenance-conversion-slice.md` — doc: Recently shipped
- `spe-3293-shared-universe-canon-release-binding-slice.md` — doc: Recently shipped
- `spe-330-finite-command-construct-slice.md` — doc: Recently shipped
- `spe-3300-shared-universe-canon-release-catalog-slice.md` — doc: Recently shipped
- `spe-3343-research-throughput-execution-slice.md` — doc: Recently shipped
- `spe-3344-hazardous-research-risk-posture-slice.md` — doc: Recently shipped
- `spe-3348-repository-validation-requirements-slice.md` — doc: Recently shipped
- `spe-3359-facility-register-ui-slice.md` — doc: Recently shipped
- `spe-3360-facility-production-chain-slice.md` — doc: Recently shipped
- `spe-3361-duplicate-facility-stacking-slice.md` — doc: Recently shipped
- `spe-3362-site-to-facility-conversion-slice.md` — doc: Recently shipped
- `spe-3363-public-service-degradation-slice.md` — doc: Recently shipped
- `spe-3366-recruitment-hire-identity-slice.md` — doc: Recently shipped
- `spe-3367-extranormal-event-case-escalation-slice.md` — doc: Recently shipped
- `spe-3380-facility-lifecycle-kernel-slice.md` — doc: Recently shipped
- `spe-3381-facility-phased-decommissioning-slice.md` — doc: Recently shipped
- `spe-3382-facility-effect-authority-review-slice.md` — doc: Recently shipped
- `spe-3383-facility-dependency-graph-slice.md` — doc: Recently shipped
- `spe-3384-elapsed-time-invariant-simulation-updates-slice.md` — doc: Recently shipped
- `spe-3386-facility-dependency-inputs-slice.md` — doc: Recently shipped
- `spe-3387-facility-operational-post-validity-slice.md` — doc: Recently shipped
- `spe-3388-persist-facility-supported-capability-unlocks-slice.md` — doc: Recently shipped
- `spe-3389-facility-core-displacement-residue-slice.md` — doc: Recently shipped
- `spe-3390-environmental-operational-context-slice.md` — doc: Recently shipped
- `spe-3394-wearable-compatibility-slice.md` — doc: Recently shipped
- `spe-3396-scenario-configuration-viability-slice.md` — doc: Recently shipped
- `spe-3397-scenario-definitions-slice.md` — doc: Recently shipped
- `spe-3406-managed-cultivation-lifecycle-slice.md` — doc: Recently shipped
- `spe-3415-facility-env-dependency-projection-slice.md` — doc: Recently shipped
- `spe-3417-regional-cross-register-event-authority-slice.md` — doc: Recently shipped
- `spe-3421-emergency-borrowing-access-dedupe-slice.md` — doc: Recently shipped
- `spe-3436-store-projection-dependency-slice.md` — doc: Recently shipped
- `spe-3438-cross-feature-import-slice.md` — doc: Recently shipped
- `spe-3440-construction-stage-accessibility-slice.md` — doc: Recently shipped
- `spe-3441-personnel-ppe-replacement-demand-slice.md` — doc: Recently shipped
- `spe-3458-playwright-e2e-harness-slice.md` — doc: Recently shipped
- `spe-3459-isolated-scenario-runner-slice.md` — doc: Recently shipped
- `spe-3470-research-project-definition-slice.md` — doc: Recently shipped
- `spe-3471-information-source-access-projection-slice.md` — doc: Recently shipped
- `spe-3481-playwright-player-critical-smokes-slice.md` — doc: Recently shipped
- `spe-3482-playwright-smoke-hardening-slice.md` — doc: Recently shipped
- `spe-3483-playwright-depth-breadth-hygiene-slice.md` — doc: Recently shipped
- `spe-3484-figma-ui-system-integration-slice.md` — doc: Recently shipped
- `spe-3486-figma-subscription-blocker-prompt-rule-slice.md` — doc: Recently shipped
- `spe-3487-google-drive-agent-bridge-slice.md` — doc: Recently shipped
- `spe-3488-google-drive-bridge-hygiene-slice.md` — doc: Recently shipped
- `spe-3489-plugin-request-connectors-rule-slice.md` — doc: Recently shipped
- `spe-3491-recraft-prompt-human-generate-rule-slice.md` — doc: Recently shipped
- `spe-3494-scenario-mcp-agent-bridge-slice.md` — doc: Recently shipped
- `spe-3497-deployable-team-capacity-resolver-slice.md` — doc: Recently shipped
- `spe-399-forced-movement-hazards-slice.md` — doc: Recently shipped
- `spe-408-persistent-area-shapes-slice.md` — doc: Recently shipped
- `spe-470-belief-lock-illusion-slice.md` — doc: Recently shipped
- `spe-471-containment-wall-breach-slice.md` — doc: Recently shipped
- `spe-475-interrogation-self-incrimination-slice.md` — doc: Recently shipped
- `spe-54-state-driven-action-priority-slice.md` — doc: Recently shipped
- `spe-62-budget-spatial-wiring-slice.md` — doc: Recently shipped
- `spe-62-held-aborted-delayed-keyed-slice.md` — doc: Recently shipped
- `spe-62-inspectable-pipeline-explanation-slice.md` — doc: Recently shipped
- `spe-62-interruption-mutation-slice.md` — doc: Recently shipped
- `spe-62-multi-stage-procedure-iteration-slice.md` — doc: Recently shipped
- `spe-62-pipeline-variants-modes-slice.md` — doc: Recently shipped
- `spe-62-risk-first-hazard-slice.md` — doc: Recently shipped
- `spe-62-volatile-action-phase-kernel-slice.md` — doc: Recently shipped
- `spe-699-affiliated-orders-branch-linkage-slice.md` — doc: Recently shipped
- `spe-700-institution-calendars-slice.md` — doc: Recently shipped
- `spe-731-layered-facility-control-slice.md` — doc: Recently shipped
- `spe-791-ascendant-resident-containment-slice.md` — doc: Recently shipped
- `spe-807-cross-zone-contamination-slice.md` — doc: Recently shipped
- `spe-862-message-to-service-availability-slice.md` — doc: Recently shipped
- `spe-870-process-safety-coverage-slice.md` — doc: Recently shipped
- `spe-872-process-safety-information-gate-slice.md` — doc: Recently shipped
- `spe-874-lifecycle-operating-procedures-slice.md` — doc: Recently shipped
- `spe-876-pre-activation-safety-readiness-slice.md` — doc: Recently shipped
- `spe-877-barrier-recouple-technician-relief-slice.md` — doc: Recently shipped
- `spe-877-extra-class-barrier-zones-slice.md` — doc: Recently shipped
- `spe-877-extra-class-technician-stabilization-slice.md` — doc: Recently shipped
- `spe-877-extra-class-workshop-quality-slice.md` — doc: Recently shipped
- `spe-877-interlock-containment-class-inspection-slice.md` — doc: Recently shipped
- `spe-877-interlock-integrity-bench-slice.md` — doc: Recently shipped
- `spe-877-live-workshop-integrity-mapping-slice.md` — doc: Recently shipped
- `spe-877-lock-workshop-relocate-slice.md` — doc: Recently shipped
- `spe-877-mid-week-inspect-slice.md` — doc: Recently shipped
- `spe-877-mission-casualty-workshop-identity-slice.md` — doc: Recently shipped
- `spe-877-mutation-stations-integrity-labor-slice.md` — doc: Recently shipped
- `spe-877-pressure-seal-barrier-zone-slice.md` — doc: Recently shipped
- `spe-877-pressure-seal-containment-class-inspection-slice.md` — doc: Recently shipped
- `spe-877-pressure-seal-integrity-bench-slice.md` — doc: Recently shipped
- `spe-877-protect-workshop-identity-slice.md` — doc: Recently shipped
- `spe-877-protect-workshop-lifecycle-slice.md` — doc: Recently shipped
- `spe-877-remaining-deficiency-recompute-slice.md` — doc: Recently shipped
- `spe-877-seed-blast-door-workshop-slice.md` — doc: Recently shipped
- `spe-877-sibling-sourced-restraint-slice.md` — doc: Recently shipped
- `spe-877-store-ui-inspect-deficiency-slice.md` — doc: Recently shipped
- `spe-877-week-close-last-inspection-advance-slice.md` — doc: Recently shipped
- `spe-877-workshop-completion-post-close-integrity-slice.md` — doc: Recently shipped
- `spe-953-persistent-scent-tracking-slice.md` — doc: Recently shipped
- `spe-barrier-integrity-coupling-slice.md` — doc: Recently shipped
- `spe-spare-part-suitability-repair-slice.md` — doc: Recently shipped

#### Done (11)

- `alternate-reality-threshold-route-registry-slice-1.md` — doc: Done
- `mass-anomalous-population-emergence-registry-slice-1.md` — doc: Done
- `rule-document-compliance-containment-registry-slice-1.md` — doc: Done
- `spe-1027-capacity-as-warehouse-slice.md` — doc: Done
- `spe-1046-file-work-queue-release-outcomes-slice-1.md` — doc: Done
- `spe-2650-post-spe-2647-handoff-reconciliation-slice-1.md` — doc: Done (historical handoff; PR #3210 merged)
- `spe-2827-generic-ordinary-equipment-instance-authority-reconciliation.md` — doc: Done
- `spe-947-media-economy-multi-actor-slice-1.md` — doc: Done
- `spe-947-media-economy-simulator-slice-1.md` — doc: Done
- `spe-947-media-economy-weekly-delta-slice-1.md` — doc: Done
- `spe-947-parent-umbrella-reconciliation-slice-2.md` — doc: Done

#### Closed / docs-satisfied (3)

- `spe-2852-partial-depleted-combat-stim-lot-return-policy-slice.md` — doc: Closed / docs-satisfied
- `spe-2858-resignation-equipped-instance-recovery-slice.md` — doc: Closed / docs-satisfied
- `spe-2859-non-mission-death-equipped-instance-recovery-slice.md` — doc: Closed / docs-satisfied

#### Stale in-flight claim (shipped counter-evidence) (57)

- `anomaly-case-lifecycle-state-machine-slice-5.md`† — Ready for PR (stale; §1.5)
- `anomaly-case-lifecycle-state-machine-slice-6.md`† — Ready for PR (stale; §1.5)
- `backlog-handoff-hygiene-slice-2.md`† — Ready for PR (stale; §1.5)
- `backlog-handoff-hygiene-slice-3.md`† — Ready for PR (stale; §1.5)
- `backlog-handoff-hygiene-slice-4.md`† — Ready for PR (stale; §1.5)
- `backlog-handoff-hygiene-slice-5.md`† — Ready for PR (stale; §1.5)
- `hidden-modality-matrix-slice-3.md`† — In Progress — SPE-2283 (stale; §1.5)
- `infiltration-guides-documents-slice.md`† — In Progress (stale; §1.5)
- `information-intake-cross-link-bundle-compose-slice-1.md` — Ready for PR (stale; §1.5)
- `information-intake-extranormal-cross-link-surfacing-slice-1.md` — Ready for PR (stale; §1.5)
- `information-intake-report-slice-1.md` — Ready for PR (stale; §1.5)
- `information-intake-weekly-hook-slice-4.md` — In PR (stale; §1.5)
- `information-intake-weekly-hook-slice-6.md` — In Progress (stale; §1.5)
- `media-contained-event-registry-slice-1.md` — In Progress (stale; §1.5)
- `public-signal-coverage-slice-1.md` — Ready for PR (stale; §1.5)
- `spe-1046-dual-loyalty-enforcement-slice-1.md` — In Progress (stale; §1.5)
- `spe-1046-dual-loyalty-surfacing-slice-1.md` — In Progress (stale; §1.5)
- `spe-1046-durable-person-status-records-slice-1.md` — In Progress (stale; §1.5)
- `spe-1046-durable-person-status-surfacing-slice-1.md` — In Progress (stale; §1.5)
- `spe-1046-durable-person-status-weekly-progression-slice-1.md` — In Progress (stale; §1.5)
- `spe-1046-facility-file-access-workflows-slice-1.md` — In Progress (stale; §1.5)
- `spe-1046-file-access-enforcement-slice-1.md` — In Progress (stale; §1.5)
- `spe-1046-file-work-queue-file-release-fulfillment-slice-1.md`† — Local implementation (stale; §1.5)
- `spe-1046-file-work-queue-onboarding-repair-slice-1.md` — In Progress (stale; §1.5)
- `spe-1046-file-work-queue-release-actions-slice-1.md` — In Progress (stale; §1.5)
- `spe-1046-file-work-queue-repair-action-ledger-slice-1.md` — In Progress (stale; §1.5)
- `spe-1046-file-work-queue-welfare-evidence-repair-slice-1.md` — In Progress (stale; §1.5)
- `spe-1046-file-work-queues-slice-1.md` — In Progress (stale; §1.5)
- `spe-1046-onboarding-readiness-surfacing-slice-1.md` — In Progress (stale; §1.5)
- `spe-1046-procurement-gear-access-slice-1.md` — In Progress (stale; §1.5)
- `spe-1046-protected-status-enforcement-slice-1.md` — In Progress (stale; §1.5)
- `spe-1046-revocation-enforcement-slice-1.md` — In Progress (stale; §1.5)
- `spe-1046-site-clearance-enforcement-slice-1.md` — In Progress (stale; §1.5)
- `spe-1046-site-clearance-surfacing-slice-1.md` — In Progress (stale; §1.5)
- `spe-1046-site-specific-clearance-slice-1.md` — In Progress (stale; §1.5)
- `spe-3304-authored-content-validator-slice.md` — In Progress — Cursor-approved slice 1 (stale; §1.5)
- `spe-947-adaptation-commercialization-slice-1.md` — In Progress (stale; §1.5)
- `spe-947-commercialization-actor-persistence-slice-1.md` — In Progress (stale; §1.5)
- `spe-947-counter-memetic-uptake-gate-slice-1.md` — In Progress (stale; §1.5)
- `spe-947-footage-exposure-traffic-slice-1.md` — In Progress (stale; §1.5)
- `spe-947-gamestate-persistence-slice-1.md` — In Progress (stale; §1.5)
- `spe-947-media-economy-continuity-slice-1.md` — In Progress (stale; §1.5)
- `spe-947-media-economy-cross-path-aggregate-slice-1.md` — In Progress (stale; §1.5)
- `spe-947-media-economy-persistence-slice-1.md` — In Progress (stale; §1.5)
- `spe-947-media-economy-third-commercial-path-slice-1.md` — In Progress (stale; §1.5)
- `spe-947-media-economy-week-close-orchestration-slice-1.md` — In Progress (stale; §1.5)
- `spe-947-planning-mirror-surfacing-slice-1.md` — In Progress (stale; §1.5)
- `spe-947-platform-outage-degrade-slice-1.md` — In Progress (stale; §1.5)
- `spe-947-platform-reach-multiplier-slice-1.md` — In Progress (stale; §1.5)
- `spe-947-post-case-media-persistence-slice-1.md` — In Progress (stale; §1.5)
- `spe-947-takedown-resistance-slice-1.md` — In Progress (stale; §1.5)
- `spe-947-weekly-orchestration-slice-1.md` — In Progress (stale; §1.5)
- `spe-947-weekly-report-notes-slice-1.md` — In Progress (stale; §1.5)
- `spe-956-propagation-graph-persistence-slice-2.md` — In Progress (stale; §1.5)
- `welfare-debt-accounting-registry-slice-13.md`† — In progress (stale; §1.5)
- `welfare-debt-accounting-registry-slice-5.md` — In Progress (stale; §1.5)
- `welfare-debt-accounting-registry-slice-6.md` — In Progress (stale; §1.5)

#### Index / manifest / git evidence only (28)

- `concealment-activation-event-feed-slice.md` — index: Shipped
- `concealment-case-prep-slice.md` — index: Shipped
- `concealment-triggers-migration-batch-4-slice.md` — index: Shipped
- `infiltration-encounter-content-slice-1.md` — index: Shipped
- `infiltration-encounter-content-slice-2.md` — index: Shipped
- `investigation-question-case-prep-slice.md` — index: Shipped
- `mission-triage-covert-prep-slice.md` — index: Shipped
- `mission-triage-deferral-compare-slice.md` — index: Shipped
- `mission-triage-disposition-slice.md` — index: Shipped
- `mission-triage-layout-slice.md` — index: Shipped
- `mission-triage-list-scan-slice.md` — index: Shipped
- `mission-triage-status-bar-slice.md` — index: Shipped
- `mvp-weekly-loop-proof-slice-1.md` — index: Shipped
- `mvp-weekly-loop-proof-slice-3.md` — git: docs: mark MVP weekly loop proof slice 3 shipped (SPE-2309)
- `mvp-weekly-loop-proof-slice-4.md` — index: Shipped
- `mvp-weekly-loop-proof-slice-5.md` — index: Shipped
- `operations-route-drill-down-slice.md` — index: Shipped
- `report-week-navigation-slice.md` — index: Shipped
- `reveal-payload-slice-1.md` — git: docs: planning shipped-status, backlog hygiene, and agent rule snippets (#2390)
- `reveal-payload-slice-2.md` — git: docs: planning shipped-status, backlog hygiene, and agent rule snippets (#2390)
- `reveal-payload-slice-3.md` — git: feat(SPE-2252): wire reveal payloads into disguise validation
- `reveal-payload-slice-4.md` — git: feat(SPE-781): tiered detection readouts in weekly report copy (slice 5) (#2347)
- `reveal-payload-slice-5.md` — git: feat(SPE-781): tiered detection readouts in weekly report copy (slice 5) (#2347)
- `spe-1013-unauthorized-enhancement-lifecycle-slice.md` — index: Domain slice merged; issue Backlog
- `spe-1046-file-work-queue-actual-file-content-release-delivery-slice-2.md` — git: SPE-2645: post-SPE-2643 handoff; primary SPE-2644 (#3199)
- `spe-1046-file-work-queue-file-release-delivery-slice-1.md` — git: SPE-2645: post-SPE-2643 handoff; primary SPE-2644 (#3199)
- `spe-2702-cross-jurisdiction-coordination-packet-slice.md` — git: SPE-2716: Require resolved×open pair for coordination packets
- `stealth-leave-behind-tradeoff-selection-slice-5.md` — index: Shipped

---

_End of appendix. 842 files classified: 1 active, 724 shipped, 4 superseded, 45 harvest, 53 orphaned, 13 reference, 2 unresolved._

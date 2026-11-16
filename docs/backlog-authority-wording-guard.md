# Backlog-authority wording guard (proposal)

**Status: proposal — not implemented, not registered, no script exists.** This document specifies a
linter that would fail CI when a living document calls `planning/backlog.md` the work queue. Shipping
it requires changes to `scripts/**`, `package.json` and `scripts/validation/validators.v1.json`,
which are outside the docs-only surface this proposal was written in. Nothing here changes
enforcement until those land.

Background: [SPE-3338](https://linear.app/spectranoir/issue/SPE-3338) — Linear is the only authority
for issue scope, priority, lifecycle, relationships and blockers. `planning/backlog.md` and
`planning/backlog-handoff-manifest.json` are a retained human-readable shortlist. Their verifier
(`npm run verify:backlog-handoff`) checks internal consistency only; a green run is not evidence of
authority, priority or freshness.

## Why a guard

The same wording keeps coming back, each round found later than the last:

| Round | What had regressed | Where it was caught |
| ----- | ------------------- | ------------------- |
| #4999 | README "backlog shortlist" framing, frozen-history heading, a line-770 clause | Human sweep |
| #5022 | `AGENTS.md:57` "single queue", manual "queue projection" / "compact live queue", backlog banner "re-scoped" | Human sweep after #4999 merged |
| #5025 (open) | `docs/contribution-and-release-operations.md:107` "near-term priority queue" | Six-file sweep |
| Not yet filed | `architecture/game-state-and-core-loop.md:317`, `planning/milestones.md:11`, `planning/documentation-curation.md:64`, `planning/deferred-design-documents.md:38`, `planning/hidden-modality-matrix-post-matrix-queue.md:51`, `planning/scope-discipline-grooming-pass.md:10` | This sweep |

No automated check reads this prose. `scripts/governance/authority-contract.mjs` validates its own
JSON policy data; `CP-GOV-009` cites `docs/cursor-autonomous-authority.md` only as a string in a
`sourceRef`, with no content assertion. There is no `mdc` or `skills` assertion anywhere in
`scripts/` or `test/`. Every regression above therefore survived CI.

This guard is a **lint**, not a proof of authority. It catches a closed vocabulary, nothing more.

## Two checks

Each in-scope file is checked twice, because the two ways of making the claim are shaped differently.

### C1 — line claim (needs co-occurrence)

A line is a hit when **all** hold:

1. It contains a vocabulary term from the table below.
2. It also names `planning/backlog.md` on the same line (co-occurrence rule, see R1).
3. No negation marker appears on the line (R2).
4. It is not a structural exemption (R3).
5. Its `file:line` + normalised-text hash is not already in the ratchet baseline (R5).

### C2 — heading claim (no co-occurrence)

A heading is a hit when the heading text matches `/queue/i` and the file is in the
**selection-scope** subset (R4). Headings carry claim weight without naming the file, which is why
they need their own check: `.cursor/skills/cp-next-implementation-slice/SKILL.md:21`
("## Confirm the queue is empty") is currently the most load-bearing instance in the repository and
C1 would never see it.

## Vocabulary

| Term | Current occurrence | Note |
| ---- | ------------------ | ---- |
| `authoritative queue` | `docs/cursor-delegated-backlog-approval.md:30` | Added after the six-file sweep; the first draft's list missed it |
| `near-term priority queue` | `architecture/game-state-and-core-loop.md:317`, `docs/contribution-and-release-operations.md:107` (fixed in #5025) | Added after the sweep |
| `near-term engineering queue` | `planning/deferred-design-documents.md:38` | Added after the sweep |
| `near-term queue` | `planning/documentation-curation.md:64` | Added after the sweep |
| `single queue` | `AGENTS.md:57` (fixed in #5022) | Kept so it cannot return |
| `canonical queue`, `canonical active queue`, `canonical near-term queue` | `planning/milestones.md:11`, `planning/hidden-modality-matrix-post-matrix-queue.md:51` | Pattern form; `canonical near-term queue` had 0 hits alone |
| `queue authority` | `planning/scope-discipline-grooming-pass.md:10` | Added after the sweep |
| `compact live queue` | none (retired in #5022) | Kept as a tombstone |
| `the queue`, `active queue` (unqualified) | `.cursor/skills/cp-next-implementation-slice/SKILL.md:33,35`, `planning/scope-discipline-grooming-pass.md:116,126,137,156` | Added in this revision. **Only safe because of R1** — without co-occurrence these two terms match hundreds of game-subsystem lines |

**Retired from the vocabulary: `queue projection`.** It has 8 occurrences and none is this defect:
`README.md:166` uses it in a corrected negation, and the rest are the SPE-3338 projection concept or
slice filenames such as `publish-queue-executor-slice-1.md`. It would cost more in noise than it
catches.

## Rules

### R1 — co-occurrence is load-bearing

An unqualified `the queue` or `active queue` hit only counts when the same line also names
`planning/backlog.md`. This is what makes the unqualified terms usable: the repository has hundreds of
`queue` mentions that describe the game's own subsystems (`publishQueue*`, workshop queues, event
queues, mission triage "blocked queue") and none of them names the file. Dropping R1 would make the
guard unusable and would also flag its own status table above.

### R2 — negation skip

Skip a line when it contains, case-insensitively, any of: `non-authoritative`, `not a queue`,
`not the queue`, `no longer`, `not authoritative`, `not evidence that`, `carries no priority`.

The last two were added after the first draft: `planning/backlog.md:5` says "a green run is not
evidence that this list is the queue", which is the corrected claim and must not be flagged.

### R3 — structural exemptions

These are exempt by pattern, not by baseline entry, because they are structural rather than claims:

1. **The `## Active queue` heading in `planning/backlog.md`.** `scripts/verify-backlog-handoff.mjs`
   splits the file on that exact heading. Renaming it is a script change, not a docs fix, so the
   guard must not demand it.
2. **Section references** of the form `§ Active queue` that point at that heading
   (`planning/scope-discipline-grooming-pass.md:116,126,137`). A pointer to a heading is not a claim
   about the file.
3. **Quoted Linear issue titles** — `planning/backlog.md:19` ("Authoritative approved-work queue
   projection") is the title of SPE-3338, which describes the projection mechanism. Rewriting a
   quoted issue title would falsify the record.
4. **Game subsystem mentions** on the same line as a Linear issue title, e.g.
   `planning/backlog.md:23` ("Department workshop and processing queues"). These are feature scope,
   not work ordering.

### R4 — heading scope restriction

C2 applies only to **selection-scope** files: `AGENTS.md`, `README.md`, `docs/agent-*.md`,
`docs/cursor-*.md`, `docs/contribution-*.md`, `docs/repository-*.md`,
`planning/documentation-curation.md`, `planning/milestones.md`,
`planning/deferred-design-documents.md`, `.cursor/rules/**`, `.cursor/skills/**`.

It deliberately does **not** apply to `docs/*audit*.md` or `architecture/**`. Those have legitimate
queue headings about the simulation: `docs/event-queue-audit.md:1`, `docs/stability-audit.md:51`,
`docs/combat-resolver-audit.md:132`, `architecture/persistence-model.md:587`. A heading rule applied
repo-wide would produce 16 hits and 16 would be wrong.

### R5 — ratchet baseline

A baseline file `scripts/governance/backlog-authority-wording.allow.json` holds
`{ file, lineHash, reason, reviewedOn }` entries for reviewed-benign hits. The guard then:

- **Fails** on any hit not in the baseline.
- **Reports** baseline entries that no longer match (line edited or removed) as `stale`, and exits
  non-zero with "shrink the baseline", so the allowlist can only get smaller. An allowlist that
  silently retains dead entries is how this kind of guard rots.

`lineHash` is `sha256` of the line text with runs of whitespace collapsed, so reindenting a bullet
does not invalidate an entry but editing its wording does.

## Scope

### In scope (living entry points)

- `AGENTS.md`, `README.md`
- `docs/**/*.md` (including the guard's own spec — see self-exemption below)
- `architecture/**/*.md`
- `.cursor/rules/**/*.mdc`, `.cursor/skills/**/SKILL.md`
- `planning/backlog.md`, `planning/documentation-curation.md`, `planning/milestones.md`,
  `planning/deferred-design-documents.md`, `planning/scope-discipline-grooming-pass.md`

### Out of scope

- `planning/*-slice.md` and `planning/backlog-history-*.md`: frozen records of what was true when
  they were written. Rewriting them falsifies evidence, and 80 slice docs pin the delegated-approval
  doc by blob SHA precisely so their provenance does not drift.
- `planning/pattern-source-series-registry-*.md`: "queue projection" there is an unrelated concept.
- `docs/*audit*.md` and `architecture/**` for C2 only (see R4).
- `src/**`, `test/**`: no prose authority claims.

### Self-exemption

`docs/backlog-authority-wording-guard.md` must contain every term it bans. It is exempt from both
checks by exact path. Without that exemption the guard fails on its own specification.

## Current hits at `main` + #5025 (2026-11-16)

Classified by hand, to seed the baseline. `main` is at `f4454719`; `#5025` moves the last row.

| File:line | Text | Disposition |
| --------- | ---- | ----------- |
| `docs/cursor-delegated-backlog-approval.md:30` | "the authoritative queue (`planning/backlog.md` …)" | **Violation** — needs the selection-order decision |
| `docs/cursor-delegated-backlog-approval.md:57` | "the active queue of `planning/backlog.md`" | **Violation** — same decision |
| `architecture/game-state-and-core-loop.md:317` | "canonical near-term priority queue" | **Violation** — not yet filed |
| `planning/milestones.md:11` | "(canonical queue; …)" | **Violation** — not yet filed |
| `planning/documentation-curation.md:64` | "— near-term queue" | **Violation** — not yet filed |
| `planning/deferred-design-documents.md:38` | "— near-term engineering queue" | **Violation** — not yet filed |
| `planning/hidden-modality-matrix-post-matrix-queue.md:51` | "— canonical active queue" | **Violation** — not yet filed |
| `planning/scope-discipline-grooming-pass.md:10` | "**Queue authority** \| `planning/backlog.md`" | **Violation** — not yet filed |
| `.cursor/skills/cp-next-implementation-slice/SKILL.md:33,35` | "Recommended next concrete SPE in `planning/backlog.md`", "active queue" | **Violation** — subject of the collapse proposal |
| `.cursor/skills/cp-next-implementation-slice/SKILL.md:21` | heading "## Confirm the queue is empty" | **Violation** (C2) |
| `docs/contribution-and-release-operations.md:107` | "near-term priority queue" | **Fixed in #5025** — remove from baseline on merge |
| `planning/backlog.md:5` | "not evidence that this list is the queue" | Exempt (R2) |
| `planning/backlog.md:13` | heading "## Active queue" | Exempt (R3.1) |
| `planning/backlog.md:19` | quoted SPE-3338 title | Exempt (R3.3) |
| `planning/backlog.md:23` | "Department workshop and processing queues" | Exempt (R3.4) |
| `planning/backlog.md:35` | "never in this queue" | Exempt (R2) |
| `planning/scope-discipline-grooming-pass.md:116,126,137` | "`planning/backlog.md` § Active queue" | Exempt (R3.2) |
| `README.md:166` | "not a queue projection … **not an input**" | Exempt (R2) |
| `docs/agent-operating-manual.md:42` | corrected in #5022 | Exempt (R2), shrinks baseline |
| `AGENTS.md:57` | corrected in #5022 | Passes |

At the time of writing: **11 rows of live violations, 9 exempt rows.** The guard would fail on `main`
today for every violation above; the baseline seeds only the exempt rows, so the failing set is the
work list rather than a rubber stamp.

## Interface (when implemented)

```text
npm run verify:backlog-authority-wording           # check, used by CI
npm run verify:backlog-authority-wording -- --all  # ignore changed-file selection
```

Behaviour:

- Exit `0` when no unbaselined hit and the baseline is fully consumed.
- Exit `1` on any new hit; print `file:line: term "<term>" — <why it is a claim>`.
- Exit `1` when a baseline entry is stale; print the shrink instruction and the entry.
- Never rewrite files. Never auto-update the baseline without `--update`, which must be a manual,
  reviewed invocation.

## Registration (when implemented)

1. `scripts/governance/backlog-authority-wording.mjs` — scanner and rules.
2. `scripts/governance/backlog-authority-wording.check.mjs` — `node --test` wrapper plus fixtures
   under `scripts/governance/__fixtures__/`: one clean file, one hit per vocabulary term, one
   negation, one structural exemption, one stale baseline entry.
3. `package.json` — `verify:backlog-authority-wording` script.
4. `scripts/validation/validators.v1.json` — id `backlog-authority-wording`,
   `activation.changeClasses: ["docs", "planning", "governance"]`, plus path globs for
   `.cursor/**`; **required**.
5. `docs/repository-validation-requirements.md` — a row in the registered-validators table and in
   the per-class mapping.

Steps 1–5 are the reason this is a proposal: all five are outside a docs-only boundary.

## Non-goals

- It does not prove authority, priority or freshness. Only `planning/backlog.md`'s verifier and
  Linear state do that, and neither does the other's job.
- It does not scan frozen records, and it is not a licence to edit them.
- It does not touch `src/**`, tests, schemas or dependencies.
- It does not detect synonyms. See below.

## Known false negatives

These make the same claim and pass the guard:

- "the place we track what to do next" (`README.md` phrasing style).
- A table titled "Next up" or "Up next" with no queue word.
- "ordered by what matters" / "highest value first".
- Any non-English text.
- A claim split across two lines, so no single line has term + file name.

The last one is the most likely in practice: markdown wrapping at 100 columns routinely separates
`planning/backlog.md` from the noun. If the guard proves noisy in the other direction (too many
false negatives), the cheapest fix is a paragraph-level co-occurrence window rather than a line one —
recorded here so the choice is deliberate rather than discovered later.

## Verification plan when implemented

- Fixtures pass individually, then the full check passes on the repository with the seeded baseline.
- Deliberately reintroduce `single queue` into `AGENTS.md` locally and confirm exit `1`.
- Delete one baseline entry's line and confirm the stale-entry failure.
- Confirm `planning/*-slice.md` and `backlog-history` are not scanned.

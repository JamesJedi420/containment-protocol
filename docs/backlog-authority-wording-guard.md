# Backlog-authority wording guard (proposal)

**Status: proposal only.** No scanner, npm script, validator registration, or CI gate is
implemented by this document. A later approved implementation must reconcile the
current prose before enabling a required check.

Linear owns issue scope, priority, lifecycle, relationships, and blockers.
`planning/backlog.md` and its handoff manifest are a retained shortlist.
`npm run verify:backlog-handoff` checks their internal consistency; it does not
establish authority, priority, or freshness. This proposal would catch a narrow
class of wording that presents that shortlist as the work queue. It cannot prove
that every agent selects work from Linear.

## Proposed checks

### C1: line claim

Match vocabulary **case-insensitively** as complete words or phrases. The closed
vocabulary is:

- `authoritative queue`, `near-term priority queue`,
  `near-term engineering queue`, `near-term queue`, `single queue`,
  `compact live queue`, and `queue authority`;
- `canonical queue`, `canonical active queue`, and
  `canonical near-term queue`;
- `the queue` and `active queue`, subject to the same reference rule below.

`queue projection` is excluded: it names the SPE-3338 projection and appears in
unrelated technical contexts.

A vocabulary match is a C1 candidate only when its clause also contains
`planning/backlog.md` or one of `backlog child(ren)`, `backlog item(s)`,
`backlog entry/entries`, or `backlog shortlist`. For a line inside
`planning/backlog.md`, the file identity is an implicit backlog reference.
This catches both a path-based claim and a skill instruction such as “backlog
children named in the active queue.” A bare `backlog` is too broad for this
closed rule.

Split prose into clauses at sentence boundaries and semicolons outside Markdown
code spans and links. An explicit negation exempts only the candidate claim in
its own clause. Examples of negated claims are “not the queue” and
“non-authoritative queue.” A separate clause saying “no longer maintained”
does **not** exempt “`planning/backlog.md` is the authoritative queue.”
If the parser cannot establish that the matched claim is negated, report the
candidate for review. Do not skip a whole line because it contains a negation
word elsewhere.

### C2: selection heading

In the selection-scope files below, flag a Markdown ATX heading containing
`queue` as a **complete word**, case-insensitively. Thus
`## Confirm the queue is empty` is a candidate; `## Enqueue validation`
is not. C2 does not need a backlog reference because the selection document
itself gives the heading work-selection meaning. Reviewed benign headings can
be allowlisted with the same baseline contract as C1.

## Scan scope and exemptions

C1 scans tracked `AGENTS.md`, `README.md`, `CLAUDE.md`,
`docs/**/*.md`, `architecture/**/*.md`, `planning/**/*.md`,
`.cursor/rules/**/*.mdc`, `.cursor/skills/**/SKILL.md`,
`.amazonq/rules/**/*.md`, and `.greptile/rules.md`.
This includes **active slice documents**; a blanket `planning/*-slice.md`
exclusion would hide instructions used by implementation agents. Frozen slices
remain read-only historical records. If they contain a candidate, review and
allowlist that occurrence with its historical reason rather than rewriting it.
`planning/backlog-history-*.md` is excluded as an explicit frozen-history
family. The scanner excludes this specification by exact path because it must
quote its own vocabulary.

C2 is limited to work-selection entry points:
`AGENTS.md`, `README.md`, `CLAUDE.md`, `docs/agent-*.md`,
`docs/cursor-*.md`, `docs/contribution-*.md`,
`docs/repository-*.md`, `planning/documentation-curation.md`,
`planning/milestones.md`, `planning/deferred-design-documents.md`,
`.cursor/rules/**`, `.cursor/skills/**`, `.amazonq/rules/**`,
and `.greptile/rules.md`. A queue heading in a gameplay audit or
`architecture/**` is outside C2.

Two structural forms are exempt before baseline matching:

1. The exact `## Active queue` heading in `planning/backlog.md`. The
   existing handoff verifier uses this heading as a split marker.
2. A `§ Active queue` reference that points to that heading rather than
   asserting selection authority.

Quoted Linear issue titles and game-subsystem queue names are not blanket
exemptions. Apply C1/C2 first; if a real candidate is benign, review and
allowlist its exact occurrence. This prevents a broad exemption from hiding
a nearby positive claim.

## Baseline and execution

The proposed `scripts/governance/backlog-authority-wording.allow.json` contains
only reviewed benign candidates that survive the structural and negation rules.
Each entry has `{ file, line, lineHash, reason, reviewedOn }`. The key is the
file and one-based line together with the hash; identical text copied elsewhere
is a new candidate. `lineHash` is SHA-256 of the line after trimming and
collapsing whitespace runs, so reindentation alone does not stale an entry.
An edited or moved line requires review again.

The registered check always scans the **full scoped tree**. It compares each
baseline entry with one candidate occurrence, fails on new candidates, and
fails on stale or duplicate baseline entries with a shrink/review instruction.
It has no changed-file mode. This avoids a mismatch with
`verify:requirements -- --files ...`, whose runner selects validators but
does not forward the selected file set to their commands. No command
automatically updates the baseline.

The check exits zero only after live authority claims have been corrected and
every remaining candidate has a reviewed benign disposition. The historical
examples that motivated this proposal include “authoritative queue” in
`docs/cursor-delegated-backlog-approval.md`, “canonical active queue” in
`planning/hidden-modality-matrix-post-matrix-queue.md`, and “Confirm the
queue is empty” in `.cursor/skills/cp-next-implementation-slice/SKILL.md`.
These are investigation leads, not a frozen count or line-number inventory;
the implementation must rederive the complete set at its base revision.

## Implementation boundary and acceptance

An authorized follow-up would:

1. Implement the full-tree C1/C2 scanner and reviewed baseline contract under
   `scripts/governance/`.
2. Re-scan the chosen base revision, correct live authority claims in living
   documents, and review any benign or frozen-history candidates. Seed only
   the latter in the baseline. Preserve the backlog split heading.
3. Add `verify:backlog-authority-wording` to `package.json` and register a
   required validator in `scripts/validation/validators.v1.json`.
   Activation must cover `docs`, `planning`, `architecture`,
   `shared-config`, and `tooling` change classes, plus explicit paths for
   `.amazonq/rules/**` and `.greptile/rules.md`. This includes root
   `AGENTS.md`, `README.md`, and `CLAUDE.md` through
   `shared-config`.
4. Update `docs/repository-validation-requirements.md` for the new check.
5. Verify a clean full-tree pass, then verify failures for a new C1 claim,
   a token-only C1 claim, a capitalized claim, a C2 heading, a positive claim
   followed by an unrelated negation, a duplicate occurrence, and a stale
   baseline entry. Verify the structural and true-negation exemptions.

Steps 1–5 require their own approved boundary. This docs-only PR does not
implement or register them.

## Limits

The guard misses synonyms such as “the place we track what to do next,”
cross-line claims, non-English claims, and selection advice that names
`planning/backlog.md` without a queue term. It cannot inspect a snippet
already pasted into a user's editor settings. It also does not establish the
current Linear state; that remains a separate live-source check.

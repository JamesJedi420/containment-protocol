# Architecture decision records

This directory holds the canonical architecture decision records (ADRs) for Containment
Protocol. An ADR states **why** a durable, cross-cutting technical decision was made and what
was rejected. It does not restate how a subsystem works: `architecture/` owns the current
per-system description, and an ADR links to it instead of copying it.

## What belongs here

Record a decision when it is durable, cross-cutting, and expensive to reverse, for example:

- layer, module, or ownership boundaries that constrain many files;
- a determinism, persistence, or schema contract that other subsystems must honour;
- a platform or build constraint that changes how code must be written.

Do not record a routine slice, a single-file change, an in-flight proposal with no decision, or
a product direction question. Product scope belongs in Linear; a draft design belongs in
`planning/` or the owning design document. When a decision is still being negotiated, keep it
out of this directory until it is accepted.

## Location and file names

- Location: `docs/adr/`.
- File name: `NNNN-kebab-case-title.md`, where `NNNN` is a four-digit, zero-padded sequence
  number (`0001`, `0002`, ...).
- The next record uses the highest existing number plus one. Numbers are never reused and never
  renumbered, including when a record is superseded or deprecated.

## Required fields

Every record carries these fields as a bullet list directly under the title. A record that
omits one is incomplete, not merely terse.

- **Status** — one of `Proposed`, `Accepted`, `Superseded`, `Deprecated`.
- **Date** — the decision date, `YYYY-MM-DD`.
- **Decision** — the rule in one or two sentences, stated so a reader can check code against it.
- **Context** — the situation and constraints that forced a choice.
- **Rationale** — why this option wins over the alternatives.
- **Rejected alternatives** — each option considered and why it lost. A record with no
  alternatives is usually a record of an accident rather than a decision.
- **Affected systems** — the paths, subsystems, or contracts the decision constrains.
- **Linear owner** — the existing Linear issue or issues that own the decision and its live
  follow-up work.
- **Implementation evidence** — where the decision is actually enforced or observed: test paths,
  contract tests, commits, or pull requests. When no enforcement exists, say so explicitly, for
  example `none verified at <revision>`; never imply that a documented decision is shipped.
- **Supersedes** / **Superseded by** — record links, or `none`.

## Lifecycle

`Proposed` → `Accepted` → `Superseded` or `Deprecated`.

- `Proposed` records exist only while a decision is being settled and must carry the Linear
  issue that will settle it. Do not cite a proposed record as settled policy.
- `Accepted` means the decision governs current work, not that every consumer already complies.
  Compliance is what **Implementation evidence** reports.
- `Superseded` means a later record replaced it; the superseding record is named.
- `Deprecated` means it no longer governs and nothing replaced it; the reason is stated.

## Supersession and history

Accepted records are immutable. A changed decision is a new record that states
`Supersedes: NNNN`, while the older record gains `Superseded by: NNNN` and keeps its original
text. Correcting a typo, a broken link, or a stale path is a normal edit; rewriting the decision,
rationale, or rejected alternatives is not.

Editing history to match current practice destroys the only record of why the earlier choice was
made, so it is not an acceptable shortcut for keeping the directory tidy.

## Traceability

- **Linear** owns scope, priority, ownership and lifecycle. Every record names its Linear owner;
  an ADR that no issue references is likely stale.
- **GitHub** owns implementation evidence. Evidence fields cite reversible artifacts (paths,
  tests, commits, pull requests) rather than prose assertions.
- **`docs/dependency-boundaries.md`** and `architecture/**` remain the technical descriptions;
  ADRs reference them and do not become a second copy.
- Design-document routing remains with the existing documentation owner (SPE-1705), and
  discussion-to-decision reconciliation remains with SPE-2905. This directory does not replace
  either workflow.

## Authority

An ADR is a record, not a grant. It does not approve scope, authorise implementation, set
priority, or mark work complete, and reading one is never sufficient authority to start a slice.
Conversely, this directory does not gate any issue: a missing ADR does not block a shipped
decision, and an accepted ADR does not close one.

When a record and an owning Linear issue disagree about what is live, the Linear issue and the
current code win, and the record is corrected or superseded through the normal review path.

## Maintenance

- Add the record in the same change that settles the decision, or in a follow-up documentation
  change, never silently after the fact.
- When a documented decision changes, supersede rather than edit.
- When implementation evidence moves (a test is replaced, a guard is removed), update the
  evidence field in the same change.
- Review the status fields when the owning Linear issues close; a record whose owner is done and
  whose evidence is gone is a candidate for supersession or deprecation.

These files are documentation. They are covered by the repository's formatting check and, when a
change also touches an entry point such as `AGENTS.md`, by that entry point's required gates.

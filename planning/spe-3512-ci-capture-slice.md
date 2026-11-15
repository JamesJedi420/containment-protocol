# SPE-3512 — Pure CI check-run capture slice

| Field      | Value                                                                                  |
| ---------- | -------------------------------------------------------------------------------------- |
| **Status** | **See Linear**                                                                         |
| Issue      | [SPE-3512](https://linear.app/spectranoir/issue/SPE-3512); partial implementation only |
| Parent     | SPE-3511; incomplete, unchanged                                                        |
| Executor   | Codex; human assignee remains null; relationships preserved                            |
| Branch     | `codex/engineering-summary-ci-capture`                                                 |
| Base/main  | `e84f1c7dafe7ae871b4c28d45ea84e7ebe464ab3`                                             |

The coordinator in chat `6af7c285-b1b0-8191-a92f-07df4d943034` conditionally assigned assessment followed by ONE eligible pure CI adapter slice. Existing SPE-3512 scope and summary CI record contract support captured GitHub check runs for a literal configured SHA with provider `filter=latest`; no new policy/access/architecture decision is needed for always-partial normalization. Official current documentation and one authorized two-row source-shape read confirmed the provider fields. No live collector was executed.

## Acceptance and implementation boundary

Add `scripts/engineering-summary-checks.mjs` and constructed integration tests. Explicit provider/repository/head/version/window/capture times/page and row bounds/workstream metadata are mandatory. Normalize only the four existing completed failure conclusions to `CHECK-<check-run-id>`; preserve other known states without inventing failure meanings. Validate supplied page chains/totals, identity/revision/time conflicts, failed acquisition/last success, unknown workstreams, safe minimized provenance and resource limits. Preserve actual page observation times in summary CI records and nullable provider start/completion times separately. Current snapshots are not completion-window event streams. Both summary output formats must consume the actual adapter output.

Only check runs are supported. Workflow runs/jobs/attempts and commit statuses remain separate. No names/URLs/attempt fields select supersession or new failure policy. Duplicate mutable IDs fail closed; independently captured PR/CI records cannot silently become a complete/revision-qualified source. All source coverage remains partial/unavailable, including empty/all-success results. Digests/declared metadata do not prove authentication, atomicity or live completeness. The caller selects and qualifies actual commit targets, current workstream mapping and freshness/revision policy.

Reuse the existing summary, validator selector and PR adapter. A small shared pure capture-validation helper (`scripts/engineering-summary-capture.mjs`) keeps field/time/reference validation consistent; the PR adapter delegates its unchanged validation contract to it, covered by its existing tests. No provider policy is moved into this helper. Necessary accompanying paths: existing package command, selector/registry, README/operator doc, this slice and manifest reference. No dependencies or runtime/client code change.

## Fresh preflight, holds and exclusions

At start, main was clean/synced, SPE-3512 In Progress/unassigned and no active overlapping assignment was observed in current app/issue records. Complete open-PR inventory had only #4990 (`cab8ed4b956bd1fa7a1d49a9b54a8ffbb5bc70f0`) and #4991 (`ab94d089219f9b447300ab0b862482752e6a3cd7`), no drafts. Their explicit no-takeover holds and author-correction/fresh-review next actions remain; audit/harvest paths do not overlap. #4995 supplementary Cursor security review was still running without a result/new material finding; pending is not approval or a new gate. Recheck volatile dispositions and material findings before shipping.

Exclude collectors/provider calls, credentials/permissions/provider/payment changes, new evidence stores/classifiers/queues/selectors/producers, labels, Linear adapter/SPE-3338 producer decisions, schedules, external application repository/hosting/audience/auth/cache/deployment/publication, compiler cleanup, held PR takeover and desktop/active-browser control. Missing labels/feed and live source qualification remain separate from this tooling implementation. Preserve original checkout and other worktrees.

SPE-3512 stays In Progress/unassigned and parent incomplete; no owner/parent/relationship changes. No new issue/candidate or in-boundary deferral is created. Remaining acceptance includes live acquisition/source qualification/reconciliation, other provider/target dimensions and downstream integration.

## Validation and checkpoints

Run constructed adapter/summary/PR regressions and selector tests, touched-file format/lint and SPE-3348-selected required validation. Open the PR initially draft; independent final-head full-diff review, required CI/security and material finding resolution precede normal merge. Sync clean main, run post-merge curation and read back factual partial Linear state. Reuse equivalent reviewed/tested trees rather than claim duplicate tests. Source anchors/results belong to exact PR/Linear revisions, not this mutable plan.

Hermes local Qwen3.5 attempt `local-5cbebac0b17603ea46c3cb272d49d4e28c8ae93f8c0a8846b36fbd4da66ca758` read the existing summary/operator contracts only. Its packet confused PR/check-run fields and falsely claimed `merged_at` removal; rejected. Direct official-schema/consumer inspection and regression tests are the accepted evidence. No independent mapping pass or measured savings is claimed. Short curation/review grouping is direct when delegation overhead exceeds evidence volume; reassess substantial feedback/logs if needed. No frontend behavior or dependencies change, so frontend/dependency workflows are inapplicable.

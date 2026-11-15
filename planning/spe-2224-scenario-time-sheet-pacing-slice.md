# SPE-2224 — Scenario time-sheet pacing, slice 1

| Field          | Value                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------- |
| **Status**     | **See Linear**                                                                           |
| Issue          | [SPE-2224](https://linear.app/spectranoir/issue/SPE-2224)                                |
| Parent         | SPE-1071; incomplete, assessed separately                                                |
| Human owner    | James Dye; unchanged                                                                     |
| Executor       | Codex, accepted independent review/test/repair/shipping handoff                          |
| Branch         | `codex/scenario-time-sheet-pacing`                                                       |
| Base/main      | `7f7829ffdd5f733e4a8fb9302b41d790d95e2d98`                                               |
| Original draft | `grok/spe-2224-scenario-time-sheet-pacing` at `37cb3cd006fd258f2293e69a9d6e183486d842fa` |

## Approved boundary and acceptance

Deliver the existing issue's compact, deterministic **pure-domain authoring component**, not a real-time engine or campaign calendar integration. A sheet contains identified windows for beats, clues, actor movement, patrols, events, exposure deadlines, irreversible ticks, anomaly cycles and fatigue intervals. Normalize valid sheets without mutating inputs; order windows by start tick then ID. Resolve inclusive starts and exclusive ends at an explicit tick, preserving authored actor/clue/deadline references. Reject invalid identities, kinds, numeric bounds and duplicate window IDs.

The authored fixture and constructed tests must demonstrate multiple windows, clue/exposure activation and expiry, and deterministic actor/patrol resolution. Exercise unsorted/tied input, immutable normalization, references, invalid authoring and query ticks. No normal gameplay caller exists in this boundary: tests demonstrate the standalone domain contract, not a playable interaction, persisted state, campaign date semantics or parent completion. Reachability/connection/observation/persistence in gameplay are not acceptance claims for this explicitly domain-only slice; full component behavior is checked through its exported APIs.

## Handoff and verified findings

The coordinator assigned fresh assessment, then eligible in-boundary repair/shipping. Linear's draft handoff requested Codex/Cursor independent review/tests/merge; its six original tests had not been run. At fresh inspection the original branch/head was unchanged, no associated PR existed and no overlapping active assignment was observed in current issue/app evidence. The coordinator's later observed no-PR/no-active-confirmation/quota-failed run report supersedes the older pending-confirmation note. Do not contact or relaunch that executor, move its branch or change human ownership.

On the exact original commit, the six runtime tests passed. Targeted project-based TypeScript compilation failed with three TS2540 diagnostics: post-construction assignment to readonly actorRef, clueRef and deadlineRef. Current main had 27 unrelated diagnostics; the original proposal had exactly those 27 plus these three. Initialize the optional fields in the object literal; retain readonly types and frozen outputs. No casts, suppressions, compiler-policy changes or unrelated cleanup are permitted to conceal diagnostics.

Input-validation regressions also reproduced coercion of null, booleans and strings into ticks, plus a Symbol conversion exception. Tick fields are numeric in TimeWindow; validate their types before existing nonnegative-integer/ordered bounds, returning issues rather than coercing invalid authoring input. Existing valid numeric tick behavior is unchanged.

Independent PR review reproduced two additional validation/ordering gaps: supplied malformed references could disappear during normalization, and direct resolution of unnormalized valid sheets retained arbitrary authoring order. Reject non-string or blank supplied references with field-specific issues (omitted/undefined remain optional), and share the start-tick/ID comparator between normalization and direct resolution of the filtered copy. Four regressions failed before these fixes. A separate exact-diagnostic regression confirms that an invalid start with a valid end reports only the invalid start; NaN cannot make that sheet valid, and the suggested ordering guard does not change that outcome.

## Fresh preflight and exclusions

Main was clean and synchronized at the base above. Complete open/draft inventory contained only #4990 (`cab8ed4b956bd1fa7a1d49a9b54a8ffbb5bc70f0`) and #4991 (`ab94d089219f9b447300ab0b862482752e6a3cd7`). Their explicit no-takeover/author-correction then fresh-review holds remain. Their audit/harvest paths and dependencies do not overlap this domain component or bounded slice record. Refresh volatile heads/state before publication and merge.

Exclude new scope/issues, owner/parent/relationship edits, real-time/calendar/weekly-loop integration, store/projection/UI/save changes, dependencies, credentials/access/provider/payment changes, deployment, other PR repairs and unrelated compiler cleanup. Completed dashboard adapters and remaining SPE-3512 boundaries stay separate. Preserve the original checkout and other worktrees; use background terminal/API only.

## Validation and shipping

Run the source/test pair through an ignored temporary tsconfig extending the unchanged application config. Compare full application diagnostics to the current-main 27-diagnostic set. Run focused Vitest and boundary checks, touched lint/format, and SPE-3348-selected required validation including the full suite and production bundle. No assertions/config/gates/inventory may be weakened. Use an initially draft PR, independent final-head full-diff review and required CI/security before normal SHA-guarded merge, main sync, direct post-merge curation and truthful existing-issue readbacks. Done requires every slice-1 acceptance; parent completion remains separate. Exact commands/results/revision anchors belong in PR/Linear evidence.

This is a small two-file domain review and bounded curation; direct checks avoid unnecessary delegation overhead. No frontend behavior or dependency changes require those workflows. TypeScript readonly rules were verified using current official documentation via Context7. No independent worker review or measured delegation savings is claimed.

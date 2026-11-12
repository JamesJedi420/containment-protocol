# SPE-3352 — Milestone 2 connected browser acceptance

## Approved boundary

The user authorized this bounded Playwright acceptance slice and its shipping loop on November 2, 2026. [SPE-3352](https://linear.app/spectranoir/issue/SPE-3352) owns the fixture and acceptance evidence; [SPE-1245](https://linear.app/spectranoir/issue/SPE-1245) retains UX observation and retest authority. This is partial delivery under SPE-3352, which remains In Progress. No new issue or child is required.

Ship one connected browser fixture using the existing harness, assess every outcome in `planning/milestones.md` §4 and question in §12, and preserve reproducible evidence. No gameplay, persistence, dependency, validator, or milestone methodology changes belong here. The completed SPE-2251 integration harness and SPE-3481 smokes remain baseline evidence; this test adds browser continuity without recreating simulation rules.

Branch: `codex/spe-3352-m2-browser-proof`. Base: `39976634dfcbeaea7fc81db9653d481859ddc9b9` (SPE-3522 / PR #4622). Worktree: `C:/Projects/cp-m2-acceptance-30e3f92`; unrelated changes in the primary checkout were preserved. The original untracked fixture was copied outside the worktree before rebasing; its SHA-256 was `7f8788feb797c3c9bf80a88f6e0c0356d1fdcb9e81c0811a6e37d744b29baace` before and after rebase.

## Fixture and acceptance assertions

`e2e/milestone2-weekly-loop.spec.ts` starts a fresh production campaign (default seed 1337), uses accessible controls and the shared `cpApp` helpers, and runs the same sequence in two independent browser contexts:

1. Surface The Whispering Archive as an incident; select it and record Defer, verifying its pressed state and escalation warning.
2. Select Oversight Lockdown Retainer and launch with Night Watch; verify assigned work.
3. Advance Week 1 → 2; open the Week 1 report and verify contract progress, expired incident deadline, and the named Campus Outbreak follow-up.
4. Find Campus Outbreak in the next-week triage queue; advance Week 2 → 3.
5. Open the Week 2 report; verify the selected contract resolved, its operation explanation and funding/containment/reputation result, detection confidence, and inactive counter-detection.
6. Hard reload; require exact rendered outcome-text equality and continued Week 3 state, with no captured page or console errors.
7. Repeat from a second fresh context and require identical visible resolved-outcome text. Attach both strings as `visible-outcome-replay` JSON only after equality passes.

The replay comparison covers this visible contract result, not the entire canonical game state or all RNG streams. Deadline expiry and follow-up are consequences of leaving the incident unresolved; the test does not claim that Defer causes expiry. It does not deploy the deferred incident or resolve its follow-up.

## Milestones §4 evidence assessment

PASS is limited to the explicit browser assertions below. Milestone 2 remains **OPEN**: this automated fixture does not establish the subjective parts of §§4.1/4.5 or broad campaign acceptance.

| Criterion                                                     | Status                               | Evidence and limit                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §4.2 incidents generated or surfaced                          | PASS, bounded                        | Named initial incident is surfaced with Incident label and deadline; named spawned follow-up appears in report and next-week queue. No broad incident-generation distribution claim.                                                                                 |
| §4.2 actionable work triaged                                  | PASS, bounded                        | Incident selected and Defer recorded; a different named contract selected for deployment. Unserved incident expires and spawns follow-up. No causal counterfactual for the Defer control or observed human prioritization.                                           |
| §4.2 team assigned and deployed                               | PASS, bounded                        | Named contract launched with Night Watch; assigned count, next-week progress, and subsequent resolution belong to the same named contract. No separate roster/recovery assertion.                                                                                    |
| §4.2 missions resolve deterministically                       | PASS, bounded                        | Same named mission resolves with identical visible outcome across two fresh default-seed campaigns, including reload in each. Full canonical replay remains authoritative subsystem evidence, not proven by text equality.                                           |
| §4.2 weekly report or summary exists                          | PASS                                 | Week 1 and Week 2 reports opened; progressed, unresolved, and resolved case content asserted.                                                                                                                                                                        |
| §4.2 next-week state changes based on prior week              | PASS, bounded                        | Week 1 deadline-expiry report names Campus Outbreak, which appears in the next-week queue; deployed contract progresses then resolves in Week 2; outcome and Week 3 survive reload. Wider institutional/support/recovery carryover remains outside these assertions. |
| §4.1 main loop and felt triage/deployment/outcome/consequence | PARTIAL / unavailable human evidence | Connected controls and consequences are executed. No observed player account establishes what the player feels or understands.                                                                                                                                       |
| §4.3 typical included work                                    | Supporting evidence                  | Incident, triage, deployment, resolution and Agency/Triage/Report surfaces are exercised here or by existing smokes. This illustrative list is not a separate expanded acceptance boundary; basic team-state breadth is not proven by Assigned count alone.          |
| §4.4 inadequate closure examples                              | Addressed for fixture only           | This is connected multi-week resolution, a named unresolved-work consequence, causal report-to-queue continuity, and persistence. Coverage remains one scenario and cannot establish all consequence pathways.                                                       |
| §4.5 multi-week play and recognizably real loop               | PARTIAL                              | Two advances and replay prove bounded multi-week play. Recognizability/legibility lacks observed-player evidence.                                                                                                                                                    |

## Milestones §12 review

| Question                                                | Assessment                                                                                                                                                                 |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Proof question answered by actual playable behavior? | PARTIAL: executed connected browser behavior answers the mechanical path; subjective “feel” remains unavailable.                                                           |
| 2. Required systems implemented, not implied?           | PASS for exercised chain; wider system completeness UNVERIFIED. The test uses shipped controls and reports without injecting fixture outcomes.                             |
| 3. Connected consequences propagate correctly?          | PASS for named deadline → follow-up queue and launch → progress → resolution → reload; wider consequence coverage UNVERIFIED.                                              |
| 4. Major player-facing surfaces truthful and useful?    | PARTIAL: named report/queue continuity and reload equality support consistency. Human usefulness, comprehension, accessibility breadth and all surfaces remain UNVERIFIED. |
| 5. QA evidence strong enough to trust the claim?        | PASS for the bounded automated fixture; insufficient for whole milestone closure or CP-core release readiness.                                                             |
| 6. Would closure mislead future planning?               | YES if presented as whole milestone/release closure. Keep milestone open and distinguish fixture delivery from broader SPE-3352 and SPE-1245 acceptance.                   |

## Validation and artifacts

Local environment: Windows 10.0.26200, Node 24.18.0, npm 11.16.0, Playwright 1.64.1. Browser runs use Chromium, one worker, `CI=true`, `PLAYWRIGHT_HTML_OPEN=never`, locale en-US, browser timezone UTC, base URL `http://127.0.0.1:5173`. The connected fixture creates contexts with Playwright defaults beyond those explicit options. Node 24 differs from the required Node 22; PR CI must supply Node 22 evidence.

Commands and evidence are recorded in the PR and Linear, with host artifacts under `C:/Projects/cp-m2-evidence-post4622/`. The initial unchanged preserved fixture passed `npm run test:e2e:ci -- e2e/milestone2-weekly-loop.spec.ts` (1 passed, 1.0m, exit 0) on the base above, including the second context. The final fixture adds explicit stage labels, the repaired-field assertions, and a successful outcome attachment.

- First `npm run test:e2e:ci`: exit 1, 11 passed / 1 failed. Reload comparison lost the same two detection lines; its retry failed with connection refused. The cause of this contradictory local run is unresolved; it must not be discarded as a proven environment problem. `full-e2e.log`, `full-report/` and `full-results/` retain its screenshots and traces.
- Unchanged full-suite rerun: `npm run test:e2e:ci`, exit 0, **12 passed (1.5m)**; no retries. `full-e2e-rerun.log`, `full-report-rerun/`, and `full-results-rerun/` retain the passing run and outcome JSON. Fresh-context replay and equality are required before that JSON can be attached. Success runs use failure-only trace/screenshot capture; no visual-inspection claim follows from their absence. Node 22 CI remains a separate required gate.
- `npm run lint`: exit 0. `npm run verify:backlog-handoff`, `npm run verify:audits-index`, and `npm run verify:theme-contracts`: exit 0.
- `npm run verify:requirements -- --base origin/main --exclude=playwright-e2e`: exit 0; required lint and backlog-handoff passed. Advisory `format-check` failed (3,196 repository files); changed-file Prettier check passed. The exclusion avoids repeating the separately executed full browser suite and does not waive its required gate.
- `prettier --check e2e/milestone2-weekly-loop.spec.ts planning/spe-3352-milestone2-browser-acceptance-slice.md`: exit 0. `git diff --cached --check`: exit 0.

### Follow-up: failed-run source provenance and Node 22

The first failure was initially unexplained. A subsequent read of its retained trace establishes that it loaded the **old sanitizer module**, rather than the repaired module. The first `runTransfer.ts` response at `2026-11-03T01:43:49.157Z` has ETag `W/"4c930-9ebvT9YMPeWv/B6bghtmVhpLSrk"`; subsequent requests reuse that tag. A controlled Vite server from this checkout serves the repaired module as `W/"4cb22-EFstFbLVqRRnpFQiHxZaMUaxBvA"`. Recomputing the Vite length/SHA-1 fingerprint of that transformed module after removing only the three SPE-3522 field-preservation clauses (498 bytes) reproduces the failed trace's ETag exactly. No repository source was modified for this comparison. `module-provenance.json`, `controlled-runTransfer.js`, and its response headers preserve the calculation. This supports excluding that failed execution from post-repair acceptance evidence. It does not identify which server/cache supplied the old module; that environmental mechanism remains unknown. The original failure artifacts remain retained.

Additional unchanged full suite on Windows using already-cached Node **22.23.4**: `npm run test:e2e:ci`, **12 passed (1.4m), exit 0**, no retries (`node22-full.log`, `node22-report/`, `node22-results/`). No package was fetched for this run.

[PR #4626](https://github.com/JamesJedi420/containment-protocol/pull/4626) CI on test revision `e686004874cae23ad531148f63ca106c1696549c`: [run 41562074995](https://github.com/JamesJedi420/containment-protocol/actions/runs/41562074995), Ubuntu, Node **22.23.4**, npm 10.9.9. Required test and Playwright jobs passed; browser log **12 passed (50.8s)**. Downloaded [artifact 13197900706](https://github.com/JamesJedi420/containment-protocol/actions/runs/41562074995/artifacts/13197900706) contains 12 expected, 0 unexpected/flaky/skipped; the connected result has retry 0, second-context stage executed, and equal attached outcome strings (`ci-replay-verification.json`). Subsequent documentation-only revisions retain the same test; their current CI results are recorded on the PR.

Modern Web Guidance: not applicable to this test/docs-only slice; no frontend implementation or browser behavior changed. No packages added or upgraded. Linear `get_agent_context` was advertised but returned tool-not-found; issue descriptions/comments were read directly.

Hermes reconciliation was attempted with the configured local provider and a 90-second run budget. It returned no output and was stopped after exceeding that budget; no Hermes pass is claimed. Direct source/assertion review supplies the acceptance map. The same unavailable response is not retried for each checkpoint: documentation validation, PR communication review, and closeout use the documented direct fallback. External research is not applicable; the issue/comments, source, and milestone document supply this slice's facts. The six direct pre-ship passes cover scope/integration, context cleanup and assertion failures, deterministic visible-state limits, full-suite regression, documentation accuracy, and diff cleanup. The failed-run source provenance and subsequent clean Node 22 evidence are recorded above, preserving the original uncertainty and its evidence-based correction.

## Remaining existing-owner work

- SPE-3352 remains In Progress for its broader golden fixtures, high-pressure/recoverable paths, complete authoritative release matrix, and threshold/evidence aggregation. This slice makes no current production-build or general release-readiness claim.
- SPE-1245 retains observed-player comprehension/usefulness and structured UX follow-up work. This automated scenario supplies retest evidence for SPE-3522, not research-backed player observations or a replacement methodology.
- SPE-3522 is completed persistence remediation. Report reload is retested here; non-null displacement remains covered by its hydration tests rather than this browser scenario. SPE-2251 and SPE-3481 remain completed evidence sources.

No in-boundary implementation was deferred and no new remediation boundary was discovered by the passing targeted run. Do not mark the milestone or either broader owner Done from this slice.

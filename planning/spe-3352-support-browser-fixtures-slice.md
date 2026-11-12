# SPE-3352 — supported maintenance and support browser fixtures

## Authorized boundary

The user authorized establishing supported maintenance/support-shortfall setups and verifying their visible explanations and reload continuity on November 2, 2026 (America/Chicago). This is partial delivery under [SPE-3352](https://linear.app/spectranoir/issue/SPE-3352), which remains In Progress. [SPE-1245](https://linear.app/spectranoir/issue/SPE-1245) retains UX methodology and human-evidence interpretation.

Base: `265cf70ba2c6d14c5a583ba512333fff1e409736` (PR #4628). Branch: `codex/spe-3352-support-fixtures`. The unrelated primary checkout is preserved; work uses an isolated managed worktree.

## Supported setup

`src/test/helpers/supportCampaignFixtures.ts` builds two deterministic seed-1337 **imported scenarios**, using the current starting state and ordinary schema-range inputs. Neither fixture prepopulates results or reports, changes balance configuration, uses the calibrated `partialMargin=20_000` helper, or claims fresh-player reachability.

- **Maintenance:** five owned damaged item types and two maintenance specialists, matching completed SPE-94's bounded contract.
- **Support:** one support unit and two one-week, low-difficulty threshold operations. Assignments use the canonical `assignTeam` command. This reuses completed SPE-38's ordinary support test pattern, with explicit mode and no capability gates.

Exports use the production export wrapper with a fixed metadata timestamp. Targeted integration checks pass the inputs through `parseRunExport` and verify relevant inventory/queue, capacity, case difficulty/weights, assignment, duration and configuration before execution.

The old `RunTransferPanel` is not routed by the current app. Browser setup therefore invokes the production store's `importRun` command through the dev server's module, then reloads persisted state. It does **not** use `setState`, inject localStorage results, expose a new debug API, or claim a player completed a visible import interaction. After setup, week advancement, navigation and report opening use the existing player controls. These tests belong to the existing dev-server Playwright harness, not the separate deployed-Pages smoke configuration.

## Executed assertions

| Scenario    | Before reload                                                                                                                                                                                                      | After reload / continuation                                                                                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Maintenance | Week 1 notes visibly explain two items recovered and three delayed. Integration checks confirm the expected remaining queue and capacity.                                                                          | The same note is visible after reload. A second player-controlled advance produces two recovered and one delayed; integration checks verify the remaining item identity.                                                  |
| Support     | Exactly one visible shortfall note; the partial-case group includes the actual factor `Support shortfall: degraded to partial.` Integration checks establish one affected operation and support exhausted to zero. | The shortfall note, partial grouping, actual outcome and complete explanation-note text survive reload. Week 2 remains current. The live week-local `supportShortfall` flag is intentionally not a persistence assertion. |

Both browser paths assert no collected page/console errors. Successful runs attach first-week explanation text and screenshots of the explanation after reload. These are mechanical browser observations, not human comprehension, learning or usability metrics.

## Validation and evidence

Windows; cached Node 22.23.4; Playwright 1.64.1 / Chromium; locale en-US; browser timezone UTC; one worker; `CI=true`; retries disabled for the targeted run. Existing matching-lockfile dependencies are reused through a local node_modules junction; no package or browser was fetched.

- Targeted Vitest using the repository config/jsdom/globals/vmThreads settings: **2 passed**, exit 0.
- `playwright test e2e/support-campaigns.spec.ts --reporter=list,html --retries=0`: **2 passed (31.7s)**, exit 0. Both after-reload screenshots were inspected and show the asserted maintenance text and support causal explanation.
- Broader required validation and PR/CI evidence are recorded in the PR and Linear closeout; no full-release pass follows from the targeted results above.
- Full local Playwright suite: **14 passed (1.7m)**, exit 0; the deliberate error-probe message belongs to the passing harness-detection check.
- Local required lint, backlog handoff and Vite bundle passed; audit-index and theme-contract checks passed. All four changed files pass Prettier. Repository-wide formatting remains advisory/red (3,210 files). The advisory typecheck census remains 409 occurrences, with no diagnostic in the new files; this is not a passing full TypeScript build.
- Initial full local Vitest run: 999 files passed, one failed; 10,849 tests passed and one unchanged simulation-validation test timed out at its existing 30-second limit. The unchanged file passed separately (7 tests, 31.78s total). No timeout, test, or production code was changed to obtain that result; full-suite Node 22 CI remains the authoritative pending merge gate.
- Hermes curation returned a draft under session `local-adb9e6f650bbc1bae55de6fd69938de44f6c5658ffba9d4aa5d6463dbe52e316`. Its claims that Playwright/screenshot evidence was missing were rejected after direct run/artifact inspection; no independent review pass is claimed. Required documentation/reconciliation/communication checks were completed directly. Host artifacts are retained at `C:/Projects/cp-spe3352-support-evidence/`.

## Limits and initial wider comparison

An initial draft compared entire report objects/notes before and after load and failed on existing normalization differences: omitted metadata, rewritten timestamps/performance fields, and snapshot mode/status/rollup normalization. The shipped checks instead define the requested bounded contract explicitly: scenario inputs, maintenance queue/capacity, note content, partial membership, actual outcome and explanation-note sequence. The original broad failure is not a full-report persistence pass or a repair claim. In the support screenshot the case remains in the Partial cases group while snapshot metadata says Resolved after hydration; broad metadata truthfulness remains unverified here.

The maintenance scenario retains the starting campaign's unrelated incidents, so other weekly fallout can appear alongside its maintenance note. Assertions identify the maintenance explanation rather than claiming the entire report describes only maintenance. All item identities are checked in integration; the browser continuation proves the queued recovery behavior, not full-state equality.

The existing fresh-campaign proof and calibrated pressure replay remain separate evidence. This slice establishes no global organization-cap enforcement, readiness-margin comparison, human observation, complete milestone acceptance or release readiness. No gameplay, hydration, UI, dependency or validator policy is changed.

## Deferred

| Item                                                               | Existing owner                 | Disposition                                                                                            |
| ------------------------------------------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Whole-report equivalence and broader schema-valid golden campaigns | SPE-3352                       | Existing release program remains incomplete; this slice proves only named explanation/queue contracts. |
| Interpretation of unavailable human claims                         | SPE-1245                       | Retained; automated results do not waive human-specific acceptance.                                    |
| Global capacity and historical readiness comparisons               | SPE-3045 / SPE-2734 / SPE-2735 | Existing scope, outside these two fixtures.                                                            |

Shipping checkpoints: external research and dependency scans are not applicable to these existing-contract tests. Modern Web Guidance is not applicable to test/docs-only work. Documentation, reconciliation and communication checks use the existing Hermes bounded-attempt/direct-fallback procedure, with actual outcomes recorded in PR/Linear evidence. No Hermes pass is implied by this workflow description.

# SPE-3352 owner evidence at cb37c23a

## Subject and limits

Assessed revision: `cb37c23afdf71a42a695f21e08497118d31d3efe`. Codex collected owner scope/comments and ran the existing tests on 2026-11-06 using Node 22.23.4, Windows, CI=true and STRICT_TEST_CONSOLE=1. The checkout was clean before collection; publication adds only evidence/docs. Source/test anchors below describe that exact revision, not future HEAD.

This is a complementary eight-owner assessment, not a replacement release snapshot. It does not rerun the full release-window validator selection or assess the other twenty criteria. The existing reporter intentionally leaves those rows and repository validation unavailable. The blocked historical snapshots at 438c8df7 and de3f1eb6 remain unchanged. No exception, whole-release readiness or parent completion is approved.

All available comments were retrieved for each owner (58 accessibility, 24 UX, 12 telemetry, 26 continuity, plus complete persistence/calibration/simulation/replay pages). Scope and source evidence govern interpretation; a status label alone proves neither implementation nor failure. Historical PRs below were verified merged and their merge commits verified ancestors of the subject with `git merge-base --is-ancestor` (each exit 0). They establish provenance only; current tests and inspection establish the bounded subject-revision observations.

## Persistence — SPE-2607 — warning

[Owner](https://linear.app/spectranoir/issue/SPE-2607) is Done as a retrospective record. [PR #2393](https://github.com/JamesJedi420/containment-protocol/pull/2393) merged as df007a6836f554dfa52e5ad3ccfd3b8cad5218fb. Current `src/app/store/runTransfer.ts:10177` exports `hydrateGame`. Executed run-transfer, mission-result hydration and event-migration suites cover current sanitization paths. This is evidence for the recorded hardening boundary, not a promise that all May implementation details remain unchanged.

Current save-version compatibility policy remains separately owned by [SPE-3403](https://linear.app/spectranoir/issue/SPE-3403), read as In Progress. This assessment does not settle that policy, reopen SPE-2607 or claim exhaustive persistence/migration release coverage.

## Accessibility — SPE-1080 — warning

[Owner](https://linear.app/spectranoir/issue/SPE-1080) currently reads Done, but its latest closeout comment cdaa7f1f-456f-498d-8d26-20dbd60339e3 explicitly describes partial delivery and remaining audit/speech checks. [PR #4653](https://github.com/JamesJedi420/containment-protocol/pull/4653), merge 934c49672eacc3ed69bed9d297ca556cffb68948, is verified ancestral. No lifecycle correction is made from this report.

Current `src/components/layout/ShellStatusBar.test.tsx:207` checks a persistent live region; nearby tests exercise live close, focus, imports and replacement-state suppression. Current `e2e/a11y-keyboard-landmarks.spec.ts:20,64,126,161` executes skip-link focus, one-main landmarks, same-region announcement updates and the Front Desk advance path. All four browser checks passed. `docs/accessibility-audit.md:182` and S5/S6 at lines 492–493 retain actual NVDA/VoiceOver speech as unverified. These automated checks do not prove speech output or the whole cross-cutting explanation/accessibility scope.

## UX — SPE-1245 — warning

[Owner](https://linear.app/spectranoir/issue/SPE-1245) is In Progress. Its methodology clarification 9d84ddf5-b59d-4a14-9033-a0348dd14f26 says current acceptance uses Playwright only; absence of human testers alone must not block milestone closure. It also preserves the distinction between functional browser evidence and human comprehension, and does not rewrite durable acceptance criteria.

Current `e2e/milestone2-weekly-loop.spec.ts:167` passed its connected multi-week path, visible outcome, reload and fresh-context replay. This supports functional playability and observable consequences. It does not establish observed-user confusion/comprehension metrics, all UX profiles or the full structured finding/retest contract. No new human-test gate is imposed.

## Telemetry — SPE-1119 — unavailable

[Owner](https://linear.app/spectranoir/issue/SPE-1119) is Backlog. Its complete retrieved comment set does not supply a completed release-applicable assessment. `src/domain/developerLog.ts:55,97` provides event append and bounded snapshots, but existence of those helpers is not evidence of the owner's full reusable-hook, operational-metric and audience-separation acceptance. No claim is made that the subsystem is absent, broken or unimplemented merely from its status. Full owner applicability remains unverified; no new telemetry framework is introduced.

## Replay — SPE-3162 — warning

[Owner](https://linear.app/spectranoir/issue/SPE-3162) is Backlog, yet current `src/domain/stochasticIdentity.ts:15,49,94,108` defines typed identity, seed derivation and scoped RNG. `src/test/legacyRngStateCutover.test.ts:16` explicitly tests the SPE-3162 kernel; the suite beginning at line 92 exercises the SPE-3163 cutover seam. The executed file covers identical samples, unrelated-domain isolation, empty weights, legacy history, exactly-once cutover, grandfathering and scoped post-cutover decisions.

These are isolated kernel/cutover tests, not proof that every production selector migrated or that every active decision persists complete provenance. The owner retains broader adoption and transition acceptance. No reward-policy permission, global-stream replacement or resolved-history rewrite follows from this evidence.

## Continuity — SPE-1464 — bounded pass

[Owner](https://linear.app/spectranoir/issue/SPE-1464) is Done for the explicit authored-path validator substrate. Its October 7 description resolves the older cautionary comment; automatic content-wide linting and universal gameplay adoption are outside that completed boundary. [PR #2592](https://github.com/JamesJedi420/containment-protocol/pull/2592), merge 5d5bc297ad09b5ab899842e489ebc69f47a44f26, supplies ancestral optional runtime hooks.

Current `src/domain/branchContinuity.ts:678` validates path facts; `branchContinuityAudit.ts:59` builds projected reports; `branchContinuityRuntimeHooks.ts:57,74` supplies stability issues and explicit-node snapshots. Six existing suites passed: core validator, projection, authoring, audit, harvest reconciliation and runtime hooks. `src/test/branchContinuityHarvestReconciliation.test.ts:75` covers awareness leaks, missing prerequisites and corrected/stale claims; runtime hooks explicitly remain inactive without authored nodes. This pass applies to that owner-evidence boundary, not all generated stories.

## Calibration — SPE-25 — bounded pass

[Owner](https://linear.app/spectranoir/issue/SPE-25) is Done for a narrow historical calibration milestone. [PR #2340](https://github.com/JamesJedi420/containment-protocol/pull/2340), merge 0faad6b602470ae11f814f9a1ca6979fd7f08191, is ancestral. Current `src/test/weeklyMvpLoopProof.calibration.test.ts:14` explicitly names the SPE-25 anchor and reuses the SPE-2251 MVP fixture. Its four-week run passed current awareness/violent-escalation thresholds and cleanup reduction assertions. This does not freeze April constants or assess all balance, enjoyment or mission families.

## Simulation validation — SPE-26 — bounded pass

[Owner](https://linear.app/spectranoir/issue/SPE-26) is Done for the bounded deterministic scenario harness. No original April closure PR is reconstructed. Current `src/domain/sim/validation.ts:258,695,715,748` supplies the six scenarios and run/suite APIs. `src/test/sim.validation.test.ts:39` tests baseline, low-intel, high-escalation, high-budget-pressure, high-attrition and mixed-pressure registration; repeated canonical runs/summaries; dominant pressure; baseline duration and neglect-heavy consequences. The entire existing file passed. This is not an exhaustive simulation-authoring or emergent-story verdict.

## Executed checks and provenance

Existing targeted unit command (exit 0; **13 files, 594 tests**, 41.50s):

```text
npm run test:run -- src/test/weeklyMvpLoopProof.calibration.test.ts src/test/sim.validation.test.ts src/test/branchContinuity.test.ts src/test/branchContinuityAudit.test.ts src/test/branchContinuityAuthoring.test.ts src/test/branchContinuityProjection.test.ts src/test/branchContinuityHarvestReconciliation.test.ts src/test/branchContinuityRuntimeHooks.test.ts src/app/store/runTransfer.test.ts src/app/store/missionResultHydration.test.ts src/domain/events/eventMigration.test.ts src/components/layout/ShellStatusBar.test.tsx src/test/legacyRngStateCutover.test.ts
```

Existing browser command (exit 0; **five tests**, 50.0s; retries disabled; Chromium, one worker):

```text
playwright test e2e/a11y-keyboard-landmarks.spec.ts e2e/milestone2-weekly-loop.spec.ts --retries=0 --reporter=list,html
```

Host-local retained logs are not public downloads:

| Artifact                                            | SHA-256                                                          |
| --------------------------------------------------- | ---------------------------------------------------------------- |
| C:/Users/james/.codex/tmp/spe3352-owner-tests.log   | 019e93b044f19f79609ceed14da27955ddf87c2313998cf68e53f63e65b886cb |
| C:/Users/james/.codex/tmp/spe3352-owner-browser.log | a2fed1778d7d7e2f6566c3dc5c6adc8a072a6402fd5e7b9ab7c7953eab03681e |

Local Hermes session local-95e5cb9ef53e4030e7381b2b2878bbcd6bc22bd699bc5004b6c2fbb89261fe38 returned an inaccurate mapping: it claimed supplied owners were missing, used an incorrect ShellStatusBar path and inferred missing replay tests from Backlog. Codex rejected that packet and directly verified the anchors above. No independent-review pass or token savings is claimed; token usage was unavailable. No Freebuff was used. Publication validation is separate from these subject-revision executions.

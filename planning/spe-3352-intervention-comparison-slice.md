# SPE-3352 — controlled intervention comparison

Owner: [SPE-3352](https://linear.app/spectranoir/issue/SPE-3352), In Progress. Base `8596b04efc82a807d0a334c195e73d8e533ba58e`; branch `codex/spe-3352-intervention-comparison`. User authorized continued implementation of approved Linear work. Clean main/no open PR and ready preflight verified before edits.

## Plan and scope

Use the existing Playwright harness and fresh seed-1337 campaign. Assign Night Watch to the Vampire Nest in both paths; vary only assigning Green Tape to The Whispering Archive. Compare initial canonical inputs, two player-controlled weekly transitions with reload, visible mission outcomes and later assignment requirements. Replay both paths independently. Preserve optional escalation: only this mission's authored unresolved/partial rules determine the expected difference.

Initial files: `e2e/intervention-comparison.spec.ts` and this record. Direct — delegation overhead exceeds the bounded existing-scenario comparison; no Freebuff used.

## Necessary repair: SPE-3733

The first browser run failed unchanged-report equality: the Archive remained in the Partial group, but its snapshot changed from Open to Resolved after reload. `reconcileCaseSnapshotStatusMissionResult` in `src/app/store/runTransfer.ts` forced partial/fail outcomes to resolved despite `advanceWeek` reopening these cases. This is the same symptom previously recorded as a limitation in the support-campaign evidence. The new assertion is retained.

Current Linear searches found no dedicated repair owner; SPE-2607 is a retrospective merged record and SPE-3522 owns concealment fields only. Under the user's explicit necessary-gameplay-follow-through authorization, created [SPE-3733](https://linear.app/spectranoir/issue/SPE-3733) In Progress and related it to SPE-3352/SPE-3522. SPE-3352 retains fixture acceptance ownership. The source's old SPE-460 comment was not valid Linear ownership evidence.

This PR intentionally combines the bounded comparison with its necessary separately owned hydration repair: preserve historical partial/fail status, retain success/invalid/mismatched-result handling, add six targeted status/outcome round-trip cases in `missionResultHydration.test.ts`, and document semantics in `SCHEMA_REGISTRY.md`. No new field, schema version, migration-policy decision, UI implementation, dependency or balance change. Modern Web Guidance is not applicable to this hydration/test work; no frontend approach is changed.

Red-before-fix evidence: four failing and eleven passing targeted hydration tests; original browser report equality failed with exactly Open versus Resolved. After repair, both hydration suites passed **425 tests**. Historical snapshots already rewritten by earlier loads cannot be reliably reconstructed from outcome alone; no guessed repair is introduced.

## Necessary repair: SPE-3734

The inaction path legitimately produced multiple distinct Campus Outbreak cases. `TrendSummaryPanel` keyed rows by title although `getRunTrendSummary` groups cases by ID, causing React duplicate-key errors. [SPE-3734](https://linear.app/spectranoir/issue/SPE-3734) separately owns carrying the existing case ID through the projection and using it as row identity; family rows retain family identity. A component regression checks distinct links, DOM identity and retained keyboard focus after reordering. Three component tests passed. No case-generation, count, ordering, styling or routing semantics changed. The original no-console-errors browser assertion remains.

Modern Web Guidance skill read; offline cached `modern-web-guidance@0.0.196` searched `render repeated list items` with skill version `2026_10_30-58d055df`, then listed the catalog. No guide covers React key identity, so no unrelated guide is credited. Official [React list guidance](https://react.dev/learn/rendering-lists) was searched and extracted through Tavily: stable data IDs unique among siblings govern the fix. Sonatype reported exhausted credits; the already cached tooling was reused offline, with no package fetch/addition/upgrade or security-pass claim. No new browser API or motion/layout change needs a fallback; existing semantic links and focus behavior are preserved and tested.

The draft browser selector also matched the Archive's separately named raid spillover. It now matches the exact title; no gameplay expectation was weakened. All three owners' boundaries are explicitly included in this single combined acceptance/necessary-repair PR; SPE-3352 remains open regardless of the two repair closures.

## Acceptance and validation

Prove this named intervention/nonintervention pair is reachable through normal controls, changes canonical state and later player options for the authored causal reason, retains selected consequences through reload, and reproduces the same selected outputs in repeated paths. Use existing production state and report surfaces; never inject outcomes. Targeted Chromium first, then SPE-3348-selected validators and touched-file formatting. Independent full-diff review and required CI precede merge.

This supplies bounded comparison evidence, not full-state replay, all incident interactions, human comprehension or whole-release acceptance. SPE-3352 remains In Progress; other controlled comparisons and owner dimensions retain their existing evidence gaps.

## Executed evidence

The repaired targeted Chromium test passed with retries disabled (41.8 seconds test / 45.1 seconds run). All four fresh contexts completed. Entire persisted initial games were equal before the varied assignment, including seed/state, agents, rules and established history. Each path reproduced its selected final canonical vector and complete Archive report text. Reload retained case stage/status, spawned Campus Outbreak identities and report weeks; no duplicate identity or browser-console error was observed.

Screenshots inspected from `C:/Users/james/.codex/tmp/spe3352-intervention-evidence/`: intervention leaves Stage 1/Open with an enabled one-team retry; nonintervention reaches Stage 5/Open with a three-team major-incident launch gate. The source is the Archive's existing `onPartial.stageDelta: 0` versus `onUnresolved.stageDelta: 2`, deadline and raid conversion rules in `src/domain/templates/caseTemplates.ts`. No universal escalation requirement follows. The simultaneous Vampire Nest assignment is identical in both paths and supplies the existing support-shortfall scenario.

Five gameplay conditions for this bounded comparison: reachable through normal fresh-campaign controls; connected to actual assignment/week-close state; observable in report text and subsequent choices; selected consequences persist through reload; end-to-end browser run and identical-input replays passed. Broader canonical-output equality, history/information comparisons, quiet intervals, arbitrary failures and whole-release completeness are not established here. The failed-attempt hydration branch additionally has constructed round-trip coverage rather than an observed normal failed-mission browser scenario.

The full Chromium suite passed **22 tests in 3.2 minutes**. Targeted hydration passed 425 tests; trend component passed three tests. Literal `npm.cmd run build` passed TypeScript and Vite, with the existing bundle-size warning. The selected typecheck census reported zero occurrences/fingerprints/files. SPE-3348 execution passed every selected required validator: backlog-handoff, lint, Playwright, unit tests (**1,007 files / 10,969 tests**, 99.77 seconds) and Vite bundle. Known baseline whole-repository formatting remained excluded/advisory. Independent PR review and hosted CI remain publication gates. Retained logs use the `spe3352-intervention` and `spe3733`/`spe3734` prefixes under `C:/Users/james/.codex/tmp/`.

Six direct audit passes cover the named owners and original failed assertions, malformed/result-status cases, deterministic/non-mutating projection and persistence behavior, adjacent hydration/report consumers, schema/evidence documentation, and diff cleanup. Existing formatting drift in the large production files is preserved instead of reformatting unrelated code; new tests and this record pass formatting. No assertion, console collector, CI gate or lint rule was weakened.

# Provenance and contract telemetry assessment at a5a537b8

Subject: `a5a537b8a39e2e38e6e888b2a523eb466df5b1e9`. Release owner SPE-3352; source owner SPE-1119 remains In Progress. This is complementary telemetry evidence, not an integrated release census.

## Source anchors

These anchors describe only the pinned subject; refresh them for later revisions.

| Source                                      | Evidence                                                                                                                                                 |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain/sim/validation.ts:118`          | Internal event v7, opt-in audience and before/after-close phases.                                                                                        |
| `src/domain/sim/validation.ts:136`          | `captureSimulationValidationInformationReports` copies existing report provenance, confidence, verification and source histories without reconciliation. |
| `src/domain/sim/validation.ts:158`          | Recorded mission-result capture; missing snapshots differ from empty arrays.                                                                             |
| `src/domain/sim/validation.ts:191`          | Information reports captured before time advance; line 935 captures after close.                                                                         |
| `src/domain/sim/validation.ts:255`          | Optional typed supplied-state fixture; runtime guards reject terminal/explicit-difficulty misuse.                                                        |
| `src/domain/sim/validation.ts:343`          | Attrition setup preserves terminal agents and deterministically selects eligible stress targets.                                                         |
| `src/domain/sim/validationTelemetry.ts:92`  | Existing deterministic consumer; analysis v7 at line 233 retains canonical resolved configuration.                                                       |
| `src/domain/sim/validationTelemetry.ts:202` | Result attribution uses the same case's same-week committed contract only.                                                                               |
| `src/domain/sim/validationTelemetry.ts:224` | Detached before/after information-report histories.                                                                                                      |
| `src/domain/sim/validationTelemetry.ts:264` | Contract result groups and explicit unmatched count; separate from distinct-case/exposure groups.                                                        |

## Clean-subject execution

Preflight ready `2026-11-07T02:35:34.143Z`. Execution began `2026-11-07T02:35:35.5831349Z`, before evidence edits. Checkout HEAD matched the subject and Git status was clean before and after execution. Node 22.23.4, installed Vitest 5.0.5, existing npm `test:run` vmThreads pool; CI and STRICT_TEST_CONSOLE explicitly unset. This is not strict-console hosted CI.

```text
npm.cmd run test:run -- src/test/sim.validationTelemetry.test.ts src/test/sim.validationTelemetryAnalysis.test.ts src/test/sim.validationProfileTelemetry.test.ts src/test/sim.validationOutcomeTelemetry.test.ts src/test/sim.validationStaffTimeTelemetry.test.ts src/test/sim.validationContractRiskTelemetry.test.ts src/test/sim.validationPressureFixtures.test.ts src/test/sim.validationStartingState.test.ts src/test/sim.validationProfileContractFixtures.test.ts src/test/sim.validationContractResultGroups.test.ts src/test/sim.validationInformationTelemetry.test.ts

Test Files  11 passed (11)
Tests       65 passed (65)
Duration    15.96s
Exit        0
```

Original host-local log: `C:/Users/james/.codex/tmp/spe3352-provenance-targeted.log`; SHA-256 `a4fbb311b97f1c25864883af75dbdbb38661f5b14ba53e0ca55c3561af8696c1`. This is a provenance locator, not a shared download. The excerpt is reviewable and the command can be rerun at the pinned subject.

## Applicability: warning

Actual harness runs verify deterministic optional capture, observer isolation and canonical profile retention. Real `launchContract` and `advanceWeek` commands feed supplied-state fixtures through the existing harness and analysis. Cozy/Normal contract fixtures retain authored risk and compare consequences to report snapshots joined by both week and case ID. Supplied-state continuation preserves caller ownership and campaign week; note identity and terminal-agent attrition regressions are covered. This is domain command/harness evidence, not replay of the player's exact actions or new browser coverage.

The consumer now exposes same-week contract result groups. Constructed low/high/unknown packets verify component separation, unmatched conservation, temporal isolation and stable ordering; repeated recorded occurrences are not labeled distinct completions. Historical concentration examples remain constructed diagnostics, not proof that normal play followed those choices. Risk labels are authored contract metadata, not universal mission danger. Recorded reward/consequence presence does not establish later delivery or every modeled value dimension.

Constructed technical/witness reports preserve separate provenance and conflicting verification states. Existing authored intake fixtures exercise the real week-close corroboration tick, with before/after histories retained by analysis. They do not establish normal sensor/witness incident generation, coverage-gap or memory-reliability semantics, full world-truth/public-belief separation, or the release program's broader information comparison. Synthetic weekly source provenance remains visible and is not promoted to observed player evidence. SPE-854 remains Done for its calibrated bounded foundation.

Earlier capture coverage remains exercised: recorded intake, canonical staff-time capacity/claim usability, outcome components, authored contract risk and pressure histories. Constructed component/pressure packets are not reconstructed valid campaigns; available staff capacity is not a new surplus band, and no recorded displacement is not proof of no opportunity cost.

Profile segmentation does not prove all producer modifiers are integrated. At this subject, `src/domain/funding.ts:542::computeWeeklyOperatingCost` does not consume difficulty adapters; a refreshed domain search finds `applyDifficultyUpkeep`/`applyDifficultyWages` only in their resolver definitions and tests. The original SPE-3044 slice explicitly deferred deeper wiring. No historical exact funding array is relabeled as newly measured here.

Fresh Linear reads show selector SPE-3405, cadence SPE-3391, overlap SPE-3392 and timed queue SPE-1287 in Backlog. Bounded source searches supplied no new implementation evidence for their conditional diagnostics; none is fabricated in this packet. Broader resource, aftermath and information-model acceptance remains with existing owners. SPE-1119 stays open.

Only `owner-telemetry` is assessed as warning. The other 28 fixed rows remain unavailable in this manifest, so the deterministic result is incomplete: 29 rows, one warning and 28 unavailable. No current unrelated validator execution/full-build evidence is supplied. Historical manifests retain their original results and revisions and cannot be spliced into a current all-green report. Publication checks are not an integrated census or SPE-3352/Academy/terminal-success completion.

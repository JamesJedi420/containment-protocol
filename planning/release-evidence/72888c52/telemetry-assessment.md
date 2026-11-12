# Operational telemetry assessment at 72888c52

Subject: `72888c52ca35012141909321fbd2aa7771020074`. Release owner SPE-3352; source owner SPE-1119 remains In Progress. This is complementary owner evidence, not an integrated release census.

## Source anchors

Anchors describe this subject only and must be refreshed for later revisions.

| Source                                      | Evidence                                                                                                                           |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain/sim/validation.ts:118`          | Internal event v6; opt-in internal-validation audience, before/after-close phases.                                                 |
| `src/domain/sim/validation.ts:134`          | `captureSimulationValidationMissionResults` copies recorded weekly-report results; null snapshots differ from empty result arrays. |
| `src/domain/sim/validation.ts:165`          | Recorded mission-intake context, without recomputing routing.                                                                      |
| `src/domain/sim/validation.ts:175`          | Authored active-contract template/risk metadata, with missing values retained as null.                                             |
| `src/domain/sim/validation.ts:188`          | Canonical staff-time query capture, preserving unavailable state, capacity, active claims and usability.                           |
| `src/domain/sim/validationTelemetry.ts:92`  | Deterministic bounded trace consumer; output v5 retains resolved difficulty.                                                       |
| `src/domain/sim/validationTelemetry.ts:194` | Detached staff-time and recorded-result histories.                                                                                 |
| `src/domain/sim/validationTelemetry.ts:220` | Contract-template/risk groups distinguish distinct observed cases from case-week exposure.                                         |
| `src/domain/sim/validationTelemetry.ts:232` | Inspectable result-component counts; no opaque value score or consequence-execution claim.                                         |

## Clean-subject execution

Ready preflight `2026-11-06T23:54:02.060Z`; clean synchronized checkout/no PRs. Execution began `2026-11-06T23:54:18.3114140Z`, before evidence edits. Git status was clean before and after execution. Node 22.23.4, installed Vitest 5.0.5, npm `test:run` vmThreads pool; CI and STRICT_TEST_CONSOLE unset. This run is not represented as strict-console hosted CI.

```text
npm.cmd run test:run -- src/test/sim.validationTelemetry.test.ts src/test/sim.validationTelemetryAnalysis.test.ts src/test/sim.validationProfileTelemetry.test.ts src/test/sim.validationOutcomeTelemetry.test.ts src/test/sim.validationStaffTimeTelemetry.test.ts src/test/sim.validationContractRiskTelemetry.test.ts src/test/sim.validationPressureFixtures.test.ts

Test Files  7 passed (7)
Tests       49 passed (49)
Duration    10.93s
Exit        0
```

Original host-local log: `C:/Users/james/.codex/tmp/spe3352-operational-targeted.log`; SHA-256 `80c32ac0f7e6efdd8aa3dad23a2ee39a003479069ce60396f80859a2724be293`. This is a provenance locator, not a shared download. The excerpt is reviewable; the command reproduces the bounded execution at the pinned subject.

## Applicability: warning

Actual harness runs exercise the optional hook, detached source histories, deterministic analysis, observer noninterference and two canonical difficulty configurations. Actual report-to-capture comparisons cover recorded result components. An actual `launchContract` command verifies authored risk copying. These are domain validation paths, not a claim of new browser/player coverage.

Constructed fixtures separately cover malformed/gapped traces, continued-case counting, nested detachment, staff commit/release and unusable claims, low-risk concentration despite rising funding, and pressure/unused-capacity contrasts. The low-risk example uses an explicit known-contract-risk denominator; ordinary/unknown-risk cases are excluded rather than assigned a risk. Partial synthetic component packets are not reconstructed valid campaigns. No recorded displacement is not proof of no opportunity cost, and available staff capacity is not a new surplus band.

Result presence does not prove later consequence delivery or all modeled value dimensions. Contract risk is its authored label, not universal mission danger; agency-standing danger remains its existing reward metadata. Profiles are segmented without inventing divergent outcomes. Deeper profile-sensitive producer integration remains unverified: `src/domain/funding.ts:542::computeWeeklyOperatingCost` does not consume difficulty adapters, and the original SPE-3044 slice defers that wiring. This assessment does not repeat an exact historical funding array as a newly measured result.

Current Linear reads show SPE-3405 (selector), SPE-3391 (cadence) and SPE-3392 (overlap) Backlog; targeted domain source searches found no implementations for those owners. Their conditional diagnostics must not be fabricated here. SPE-1287 timed-queue and broader resource/aftermath criteria also remain with existing source owners. SPE-1119 stays open.

Only `owner-telemetry` is assessed as warning. The other 28 fixed rows remain unavailable in this manifest; no unrelated execution or full production-build evidence is supplied. The deterministic result remains incomplete, with 29 rows, one warning and 28 unavailable. Historical manifests remain immutable and cannot be spliced into a current all-green report. Publication validation is not a release-wide rerun, and neither SPE-3352 nor Academy/terminal-success acceptance is completed.

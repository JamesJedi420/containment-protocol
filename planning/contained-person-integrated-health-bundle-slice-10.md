# SPE-1889 — Contained-person integrated health bundle welfare-debt wire-up (slice 10)

One-page implementation plan. Linear: SPE-2350 (child under [SPE-1889](https://linear.app/spectranoir/issue/SPE-1889)). Prerequisite registry: [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) slice 1 shipped in same PR. Follows shipped slice 9 (`planning/contained-person-integrated-health-bundle-slice-9.md`).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2350 — Contained-person integrated health bundle welfare-debt wire-up (slice 10)](https://linear.app/spectranoir/issue/SPE-2350) |
| **Status** | **In progress** — branch `spe-1889-integrated-health-bundle-welfare-debt-wire-up-slice-10` @ `99a96d3b` base |
| **Parent** | [SPE-1889](https://linear.app/spectranoir/issue/SPE-1889) — integrated health bundle umbrella stays open |
| **Branch** | `spe-1889-integrated-health-bundle-welfare-debt-wire-up-slice-10`                                                  |
| **Base `main` SHA** | `99a96d3b`                                                                                          |

## Goal

Pure domain derive + compose wire-up: connect persisted `welfareDebtAccountingRecords` into the SPE-1889 integrated health bundle model via `welfareDebtAccountingLinks`.

## Prerequisite (on `main` @ `99a96d3b`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Bundle link schema   | `WelfareDebtAccountingLink` on `containedPersonIntegratedHealthBundleRegistry.ts` (SPE-2347 / slice 7) |
| Mirror field groups  | `getContainedPersonIntegratedHealthBundleMirrorView` (SPE-2347 / slice 7) |
| Custody wire-up template | `deriveCustodyStatusBundleFragmentsFromRecords` + `composeCustodyStatusIntoIntegratedHealthBundles` (SPE-2349) |
| Upstream registry    | `welfareDebtAccountingRegistry.ts` (SPE-1888 slice 1 — shipped in this PR) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| SPE-1888 slice 1 registry + GameState persistence for welfare-debt records | Mirror UI |
| `deriveWelfareDebtBundleFragmentsFromRecords`                    | Weekly welfare-debt tick / orchestration      |
| `composeWelfareDebtIntoIntegratedHealthBundles`                  | SPE-1888 parent Done                          |
| Call compose from `advanceWeek` after custody-status compose    | Assignment pointer model (SPE-2276)           |
| Unit + integration tests                                           |                                               |
| Slice doc (this file) + backlog handoff                            |                                               |

## Derive contract

- **Hydrated truth only** — derive from persisted map entries; skip invalid records without re-surfacing dropped payloads.
- **Warning-only records** — included when `validateWelfareDebtAccountingRecord` returns `valid: true`.
- **Projection** — `projectWelfareDebtAccounting` supplies link fields; not hidden dossier truth.
- **Grouping** — one bundle fragment per `subjectRef`; links sorted by debt ref.
- **Wired ref prefix** — `welfare-debt:` on derived welfare-debt links.

## Compose contract

- **Merge** — preserve authored bundle fields (`label`, `confidence`, manual welfare-debt links, medication/custody/therapeutic-care links).
- **Strip** — remove prior wired links identified by `welfare-debt:` wired ref prefix when welfare-debt records no longer derive a fragment.
- **Validation** — invalid post-compose candidate preserves source bundle.
- **Idempotent** — re-applying the same fragments yields the same map reference.

## Acceptance

- [x] Empty welfare-debt map is a no-op without throw
- [x] Derived fragments group by subjectRef with deterministic ordering
- [x] Wired welfare-debt links appear on integrated health bundles when fixtures coexist through `advanceWeek`
- [x] Warning-only welfare-debt records survive integration
- [x] Authored bundle fields preserved; invalid/dropped welfare-debt records not re-surfaced
- [x] Custody-status compose behavior unchanged when welfare-debt map is empty
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/welfareDebtAccountingRegistry.ts`, `src/domain/welfareDebtAccountingHealthBundleLinks.ts`, `src/domain/containedPersonIntegratedHealthBundleCompose.ts`, `src/domain/models.ts`, `src/domain/sim/advanceWeek.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/welfareDebtAccountingRegistry.test.ts`, `src/test/welfareDebtAccountingHealthBundleLinks.test.ts`, `src/test/containedPersonIntegratedHealthBundleWelfareDebtCompose.test.ts`, `src/test/advanceWeek.containedPersonIntegratedHealthBundleWelfareDebt.integration.test.ts` |
| Plan   | `planning/contained-person-integrated-health-bundle-slice-10.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Welfare-debt weekly orchestration hook | SPE-1888 slice 3+ | Wire-up consumes persisted records; tick deferred |
| Welfare-debt mirror UI | SPE-1888 follow-up | Out of derive/compose boundary |
| SPE-1888 parent Done | SPE-1888 | Slice 10 is wire-up only; registry slice 1 is minimal |
| SPE-1889 parent Done | SPE-1889 | Slice 10 is welfare-debt wire-up only |

## See also

- `planning/contained-person-integrated-health-bundle-slice-9.md`
- `planning/contained-person-integrated-health-bundle-slice-8.md`

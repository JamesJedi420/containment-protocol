# SPE-1889 — Contained-person integrated health bundle custody status wire-up (slice 9)

One-page implementation plan. Linear: SPE-2349 (child under [SPE-1889](https://linear.app/spectranoir/issue/SPE-1889)). Prerequisite registry: [SPE-1892](https://linear.app/spectranoir/issue/SPE-1892) slice 1 shipped in same PR. Follows shipped slice 8 (`planning/contained-person-integrated-health-bundle-slice-8.md`).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2349 — Contained-person integrated health bundle custody status wire-up (slice 9)](https://linear.app/spectranoir/issue/SPE-2349) |
| **Status** | **Shipped** — PR #2566 @ `99a96d3b` |
| **Parent** | [SPE-1889](https://linear.app/spectranoir/issue/SPE-1889) — integrated health bundle umbrella stays open |
| **Branch** | `spe-1889-integrated-health-bundle-custody-wire-up-slice-9`                                                  |
| **Base `main` SHA** | `4ef9056d`                                                                                          |

## Goal

Pure domain derive + compose wire-up: connect persisted `containedPersonCustodyStatusRecords` into the SPE-1889 integrated health bundle model via `custodyStatusLinks`.

## Prerequisite (on `main` @ `4ef9056d`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Bundle link schema   | `CustodyStatusLink` on `containedPersonIntegratedHealthBundleRegistry.ts` (SPE-2347 / slice 7) |
| Mirror field groups  | `getContainedPersonIntegratedHealthBundleMirrorView` (SPE-2347 / slice 7) |
| Medication wire-up template | `deriveMedicationRegimenBundleFragmentsFromRecords` + `composeMedicationRegimenIntoIntegratedHealthBundles` (SPE-2348) |
| Upstream registry    | `containedPersonCustodyStatusRegistry.ts` (SPE-1892 slice 1 — shipped in this PR) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| SPE-1892 slice 1 registry + GameState persistence for custody records | Mirror UI |
| `deriveCustodyStatusBundleFragmentsFromRecords`                    | Welfare-debt wire-up                          |
| `composeCustodyStatusIntoIntegratedHealthBundles`                  | Weekly custody tick / orchestration           |
| Call compose from `advanceWeek` after medication-regimen compose    | SPE-1889 parent Done                          |
| Unit + integration tests                                           | Assignment pointer model (SPE-2276)           |
| Slice doc (this file) + backlog handoff                            |                                               |

## Derive contract

- **Hydrated truth only** — derive from persisted map entries; skip invalid records without re-surfacing dropped payloads.
- **Warning-only records** — included when `validateCustodyStatusRecord` returns `valid: true`.
- **Projection** — `projectCustodyDisposition` supplies link fields; not hidden dossier truth.
- **Grouping** — one bundle fragment per `subjectRef`; links sorted by custody ref.
- **Wired ref prefix** — `custody-status:` on derived custody links.

## Compose contract

- **Merge** — preserve authored bundle fields (`label`, `confidence`, manual custody links, medication/therapeutic-care links).
- **Strip** — remove prior wired links identified by `custody-status:` wired ref prefix when custody records no longer derive a fragment.
- **Validation** — invalid post-compose candidate preserves source bundle.
- **Idempotent** — re-applying the same fragments yields the same map reference.

## Acceptance

- [x] Empty custody status map is a no-op without throw
- [x] Derived fragments group by subjectRef with deterministic ordering
- [x] Wired custody links appear on integrated health bundles when fixtures coexist through `advanceWeek`
- [x] Warning-only custody records survive integration
- [x] Authored bundle fields preserved; invalid/dropped custody records not re-surfaced
- [x] Medication-regimen compose behavior unchanged when custody map is empty
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/containedPersonCustodyStatusRegistry.ts`, `src/domain/containedPersonCustodyStatusHealthBundleLinks.ts`, `src/domain/containedPersonIntegratedHealthBundleCompose.ts`, `src/domain/models.ts`, `src/domain/sim/advanceWeek.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/containedPersonCustodyStatusRegistry.test.ts`, `src/test/containedPersonCustodyStatusHealthBundleLinks.test.ts`, `src/test/containedPersonIntegratedHealthBundleCustodyCompose.test.ts`, `src/test/advanceWeek.containedPersonIntegratedHealthBundleCustody.integration.test.ts` |
| Plan   | `planning/contained-person-integrated-health-bundle-slice-9.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Custody status weekly orchestration hook | SPE-1892 slice 3+ | Wire-up consumes persisted records; tick deferred |
| Custody status mirror UI | SPE-1892 follow-up | Out of derive/compose boundary |
| Welfare-debt derive/compose wire-up | SPE-1888 | Separate sibling slice |
| SPE-1889 parent Done | SPE-1889 | Slice 9 is custody wire-up only |

## See also

- `planning/contained-person-integrated-health-bundle-slice-8.md`
- `planning/contained-person-integrated-health-bundle-slice-7.md`

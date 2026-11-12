# SPE-1889 — Contained-person integrated health bundle medication regimen wire-up (slice 8)

One-page implementation plan. Linear: SPE-2348 (child under [SPE-1889](https://linear.app/spectranoir/issue/SPE-1889)). Prerequisite registry: [SPE-1886](https://linear.app/spectranoir/issue/SPE-1886) slice 1 shipped in same PR. Follows shipped slice 7 (`planning/contained-person-integrated-health-bundle-slice-7.md`).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2348 — Contained-person integrated health bundle medication regimen wire-up (slice 8)](https://linear.app/spectranoir/issue/SPE-2348) |
| **Status** | **Shipped** — PR #2564 @ `4ef9056d` |
| **Parent** | [SPE-1889](https://linear.app/spectranoir/issue/SPE-1889) — integrated health bundle umbrella stays open |
| **Branch** | `spe-1889-integrated-health-bundle-medication-wire-up-slice-8`                                                  |
| **Base `main` SHA** | `22b17783`                                                                                          |

## Goal

Pure domain derive + compose wire-up: connect persisted `containedPersonMedicationRegimenRecords` into the SPE-1889 integrated health bundle model via `medicationRegimenLinks`.

## Prerequisite (on `main` @ `22b17783`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Bundle link schema   | `MedicationRegimenLink` on `containedPersonIntegratedHealthBundleRegistry.ts` (SPE-2347 / slice 7) |
| Mirror field groups  | `getContainedPersonIntegratedHealthBundleMirrorView` (SPE-2347 / slice 7) |
| Therapeutic wire-up template | `deriveTherapeuticCareBundleFragmentsFromRecords` + `composeTherapeuticCareIntoIntegratedHealthBundles` (SPE-2345) |
| Upstream registry    | `containedPersonMedicationRegimenRegistry.ts` (SPE-1886 slice 1 — shipped in this PR) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| SPE-1886 slice 1 registry + GameState persistence for regimen records | Mirror UI |
| `deriveMedicationRegimenBundleFragmentsFromRecords`                | Custody / welfare-debt wire-up                |
| `composeMedicationRegimenIntoIntegratedHealthBundles`              | Weekly medication tick / orchestration        |
| Call compose from `advanceWeek` after therapeutic-care compose     | SPE-1889 parent Done                          |
| Unit + integration tests                                           | Assignment pointer model (SPE-2276)           |
| Slice doc (this file) + backlog handoff                            |                                               |

## Derive contract

- **Hydrated truth only** — derive from persisted map entries; skip invalid records without re-surfacing dropped payloads.
- **Warning-only records** — included when `validateMedicationRegimenRecord` returns `valid: true`.
- **Projection** — `projectMedicationInteractionRisk` supplies link fields; not hidden dossier truth.
- **Grouping** — one bundle fragment per `subjectRef`; links sorted by regimen ref.
- **Wired ref prefix** — `medication-regimen:` on derived regimen links.

## Compose contract

- **Merge** — preserve authored bundle fields (`label`, `confidence`, manual regimen links, therapeutic-care links).
- **Strip** — remove prior wired links identified by `medication-regimen:` wired ref prefix when regimen records no longer derive a fragment.
- **Validation** — invalid post-compose candidate preserves source bundle.
- **Idempotent** — re-applying the same fragments yields the same map reference.

## Acceptance

- [x] Empty medication regimen map is a no-op without throw
- [x] Derived fragments group by subjectRef with deterministic ordering
- [x] Wired medication links appear on integrated health bundles when fixtures coexist through `advanceWeek`
- [x] Warning-only regimen records survive integration
- [x] Authored bundle fields preserved; invalid/dropped regimen records not re-surfaced
- [x] Therapeutic-care compose behavior unchanged when medication map is empty
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/containedPersonMedicationRegimenRegistry.ts`, `src/domain/containedPersonMedicationRegimenHealthBundleLinks.ts`, `src/domain/containedPersonIntegratedHealthBundleCompose.ts`, `src/domain/models.ts`, `src/domain/sim/advanceWeek.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/containedPersonMedicationRegimenRegistry.test.ts`, `src/test/containedPersonMedicationRegimenHealthBundleLinks.test.ts`, `src/test/containedPersonIntegratedHealthBundleMedicationCompose.test.ts`, `src/test/advanceWeek.containedPersonIntegratedHealthBundleMedication.integration.test.ts` |
| Plan   | `planning/contained-person-integrated-health-bundle-slice-8.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Medication regimen weekly orchestration hook | SPE-1886 slice 3+ | Wire-up consumes persisted records; tick deferred |
| Medication regimen mirror UI | SPE-1886 follow-up | Out of derive/compose boundary |
| Custody status derive/compose wire-up | SPE-1892 | Separate sibling slice |
| Welfare-debt derive/compose wire-up | SPE-1888 | Separate sibling slice |
| SPE-1889 parent Done | SPE-1889 | Slice 8 is medication wire-up only |

## See also

- `planning/contained-person-integrated-health-bundle-slice-7.md`
- `planning/contained-person-therapeutic-care-registry-slice-5.md`

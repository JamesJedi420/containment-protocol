# SPE-1889 — Contained-person integrated health bundle therapeutic care wire-up (slice 5)

One-page implementation plan. Linear: [SPE-2345](https://linear.app/spectranoir/issue/SPE-2345) (child under [SPE-1889](https://linear.app/spectranoir/issue/SPE-1889)). Follows shipped slice 4 (`planning/contained-person-therapeutic-care-registry-slice-4.md`, PR #2555).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2345 — Contained-person integrated health bundle therapeutic care wire-up (slice 5)](https://linear.app/spectranoir/issue/SPE-2345) |
| **Status** | **Ready for PR** |
| **Parent** | [SPE-1889](https://linear.app/spectranoir/issue/SPE-1889) — integrated health bundle umbrella; [SPE-2115](https://linear.app/spectranoir/issue/SPE-2115) registry anchor (slice 1–4 shipped) stays Done |
| **Branch** | `spe-1889-contained-person-health-bundle-wire-up-slice-5`                                                  |
| **Base `main` SHA** | `277a02b2`                                                                                          |

## Goal

Pure domain derive + compose wire-up: connect persisted `containedPersonTherapeuticCareRecords` into the SPE-1889 integrated health bundle model via therapeutic-care schedule links and derived mental-state markers.

## Prerequisite (on `main` @ `277a02b2`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/containedPersonTherapeuticCareRegistry.ts` (SPE-2115 / PR #2434) |
| Persistence          | `containedPersonTherapeuticCareRecords` on `GameState` (SPE-2342 / PR #2551) |
| Weekly orchestration hook | `applyWeeklyTherapeuticCareTick` (SPE-2343 / PR #2553) |
| Planning mirror UI | `getContainedPersonTherapeuticCareMirrorView` (SPE-2344 / PR #2555) |
| Sibling wire-up template | `massAnomalousPopulationEmergenceNormalizationInputs` + `publicDisclosureNormalizationCompose` (SPE-2335 / PR #2537) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Minimal `containedPersonIntegratedHealthBundleRegistry.ts` schema + sanitize/hydration | Mirror UI |
| `deriveTherapeuticCareBundleFragmentsFromRecords`                  | Therapeutic care registry schema/tick/sanitize changes |
| `composeTherapeuticCareIntoIntegratedHealthBundles`                | SPE-1046 affiliation wire-up                  |
| `containedPersonIntegratedHealthBundles` on `GameState` + `runTransfer` hydrate | SPE-1889 parent Done |
| Call compose from `advanceWeek` after therapeutic care tick        | Medication, custody, welfare-debt bundle fields |
| Unit + integration tests                                           | Full SPE-1889 acceptance bar                    |
| Slice doc (this file) + backlog handoff                            |                                               |

## Derive contract

- **Hydrated truth only** — derive from persisted map entries; skip invalid records without re-surfacing dropped payloads.
- **Warning-only records** — included when `validateTherapeuticCareScheduleRecord` returns `valid: true`.
- **Projection** — `projectCareComplianceRisk` supplies link fields; not hidden dossier truth.
- **Grouping** — one bundle fragment per `subjectRef`; links sorted by schedule ref.
- **Wired ref prefix** — `therapeutic-care:` on derived schedule links.
- **Mental-state band** — `stable` / `strained` / `distressed` / `critical` from compliance risk and lockdown escalation likelihood.

## Compose contract

- **Merge** — preserve authored bundle fields (`label`, `confidence`, manual schedule links).
- **Strip** — remove prior wired links identified by `therapeutic-care:` wired ref prefix when care records no longer derive a fragment.
- **Validation** — invalid post-compose candidate preserves source bundle.
- **Idempotent** — re-applying the same fragments yields the same map reference.

## Acceptance

- [x] Empty therapeutic care map is a no-op without throw
- [x] Derived fragments group by subjectRef with deterministic ordering
- [x] Wired schedule links appear on integrated health bundles when fixtures coexist through `advanceWeek`
- [x] Warning-only care records survive integration
- [x] Authored bundle fields preserved; invalid/dropped care records not re-surfaced
- [x] Persistence regression unchanged for slice 1–4
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/containedPersonIntegratedHealthBundleRegistry.ts`, `src/domain/containedPersonTherapeuticCareHealthBundleLinks.ts`, `src/domain/containedPersonIntegratedHealthBundleCompose.ts`, `src/domain/models.ts`, `src/domain/sim/advanceWeek.ts` |
| Store  | `src/app/store/runTransfer.ts`                                        |
| Data   | `src/data/startingState.ts`                                           |
| Tests  | `src/test/containedPersonTherapeuticCareHealthBundleLinks.test.ts`, `src/test/containedPersonIntegratedHealthBundleCompose.test.ts`, `src/test/advanceWeek.containedPersonIntegratedHealthBundle.integration.test.ts`, `src/test/containedPersonIntegratedHealthBundlePersistence.test.ts` |
| Plan   | `planning/contained-person-therapeutic-care-registry-slice-5.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Medication regimen links | SPE-1886 | Parent umbrella; out of therapeutic-care wire-up boundary |
| Custody / former-actor status links | SPE-1892 | Parent umbrella; out of therapeutic-care wire-up boundary |
| Welfare-debt accounting links | SPE-1888 | Parent umbrella; out of therapeutic-care wire-up boundary |
| Integrated health bundle mirror UI | SPE-1889 follow-up | Out of domain wire-up boundary |
| SPE-1889 parent Done | SPE-1889 | Slice 5 is therapeutic-care wire-up only |

## See also

- `planning/contained-person-therapeutic-care-registry-slice-4.md`
- `planning/mass-anomalous-population-emergence-registry-slice-5.md` — derive + compose wire-up template (SPE-2335)

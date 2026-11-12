# SPE-1888 — Welfare-debt accounting registry planning mirror UI (slice 2)

One-page implementation plan. Linear: [SPE-2351](https://linear.app/spectranoir/issue/SPE-2351) (child under [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888)). Follows shipped slice 1 via [SPE-2350](https://linear.app/spectranoir/issue/SPE-2350) / PR #2568 (`welfareDebtAccountingRegistry.ts` + wire-up).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2351 — Welfare-debt accounting registry planning mirror UI (slice 2)](https://linear.app/spectranoir/issue/SPE-2351) |
| **Status** | **Shipped** — PR #2570 @ `96ad05ba` |
| **Parent** | [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) — welfare-debt accounting umbrella stays open |
| **Branch** | `spe-1888-welfare-debt-accounting-mirror-ui-slice-2`                                                     |
| **Base `main` SHA** | `67d7214e`                                                                                          |

## Goal

Read-only planning/operations mirror over persisted `welfareDebtAccountingRecords` with read-time `projectWelfareDebtAccounting` display for agent routing visibility, not player-facing canon.

## Prerequisite (on `main` @ `67d7214e`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/welfareDebtAccountingRegistry.ts` (SPE-1888 slice 1 / SPE-2350 / PR #2568) |
| Persistence          | `welfareDebtAccountingRecords` on `GameState` (SPE-1888 slice 1 / PR #2568) |
| Wire-up              | `deriveWelfareDebtBundleFragmentsFromRecords` + `composeWelfareDebtIntoIntegratedHealthBundles` (SPE-2350) |
| Sibling mirror template | `entityWelfareReclassificationMirrorView` (SPE-2341), `containedPersonIntegratedHealthBundleMirrorView` (SPE-2346) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `getWelfareDebtAccountingMirrorView` + `WelfareDebtAccountingMirrorPage` | New persistence fields                     |
| Route `/welfare-debt-accounting` + Front Desk quick link           | Weekly tick / sanitize contract changes       |
| View + component tests                                             | Integrated health bundle compose changes      |
| Slice doc (this file) + backlog handoff                            | Re-validation of hidden/dropped records       |
| Read-time `projectWelfareDebtAccounting` display from hydrated records | SPE-1888 parent Done                            |

## Mirror contract

- **Read-only** — no mutations to GameState from the mirror surface.
- **Hydrated truth only** — display persisted records as hydrated; do not re-run validation to drop entries.
- **Display guards** — `validateWelfareDebtAccountingRecord` surfaces warning-severity issues only; warning-only records remain visible.
- **Read-time projections** — `projectWelfareDebtAccounting` at mirror build; not objective truth.
- **Empty state** — when `welfareDebtAccountingRecords` map is empty after hydrate.
- **Ordering** — byte-stable sort by record id.
- **Copy** — CP-neutral labels; no franchise tokens in UI strings.

## Acceptance

- [x] Empty `welfareDebtAccountingRecords` map renders empty state without throw
- [x] Records table shows severity band, mitigation state, source procedure, review owner, and containment benefit projection
- [x] Summary counts distinguish unresolved, escalated, and mitigated welfare debt
- [x] Warning-only records still shown with validation warning labels
- [x] Redacted containment benefit scores show dash placeholders
- [x] Front Desk quick link routes to mirror page
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| View   | `src/features/operations/welfareDebtAccountingMirrorView.ts` |
| UI     | `src/features/operations/WelfareDebtAccountingMirrorPage.tsx` |
| Route  | `src/app/routes.ts`, `src/app/App.tsx`, `src/app/appShellRoutePaths.ts` |
| Desk   | `src/features/operations/frontDeskView.ts`                            |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/features/operations/welfareDebtAccountingMirrorView.test.ts`, `src/features/operations/WelfareDebtAccountingMirrorPage.test.tsx` |
| Plan   | `planning/welfare-debt-accounting-registry-slice-2.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Welfare-debt weekly orchestration hook | SPE-1888 slice 3+ | Wire-up consumes persisted records; tick deferred |
| Ledger summary audit output | SPE-1888 | Out of mirror UI boundary |
| SPE-1888 parent Done | SPE-1888 | Slice 2 is mirror UI only |

## See also

- `planning/contained-person-integrated-health-bundle-slice-10.md`
- `planning/entity-welfare-reclassification-registry-slice-4.md` — mirror UI template (SPE-2341)

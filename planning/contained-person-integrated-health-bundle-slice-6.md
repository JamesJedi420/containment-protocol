# SPE-1889 — Contained-person integrated health bundle planning mirror UI (slice 6)

One-page implementation plan. Linear: [SPE-2346](https://linear.app/spectranoir/issue/SPE-2346) (child under [SPE-1889](https://linear.app/spectranoir/issue/SPE-1889)). Follows shipped slice 5 (`planning/contained-person-therapeutic-care-registry-slice-5.md`, PR #2557).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2346 — Contained-person integrated health bundle planning mirror UI (slice 6)](https://linear.app/spectranoir/issue/SPE-2346) |
| **Status** | **In Progress**                                                                                            |
| **Parent** | [SPE-1889](https://linear.app/spectranoir/issue/SPE-1889) — integrated health bundle umbrella; [SPE-2115](https://linear.app/spectranoir/issue/SPE-2115) registry anchor (slice 1–4 shipped) stays Done |
| **Branch** | `spe-1889-integrated-health-bundle-mirror-ui-slice-6`                                                      |
| **Base `main` SHA** | `e917c547`                                                                                          |

## Goal

Read-only planning/operations mirror over persisted `containedPersonIntegratedHealthBundles` showing therapeutic-care schedule links and mental-state/humane-care markers for agent routing visibility, not player-facing canon.

## Prerequisite (on `main` @ `e917c547`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/containedPersonIntegratedHealthBundleRegistry.ts` (SPE-1889 / PR #2557) |
| Therapeutic care wire-up | `deriveTherapeuticCareBundleFragmentsFromRecords` + compose (SPE-2345 / PR #2557) |
| Persistence          | `containedPersonIntegratedHealthBundles` on `GameState` (SPE-2345 / PR #2557) |
| Sibling mirror template | `getContainedPersonTherapeuticCareMirrorView` (SPE-2344 / PR #2555) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `getContainedPersonIntegratedHealthBundleMirrorView` + `ContainedPersonIntegratedHealthBundleMirrorPage` | New persistence fields                     |
| Route `/contained-person-integrated-health-bundle` + Front Desk quick link | Weekly tick / sanitize contract changes       |
| View + component tests                                             | Medication/custody/welfare-debt wire-up       |
| Slice doc (this file) + backlog handoff                            | Re-validation of hidden/dropped bundle entries |
| Hydrated bundle display with wired schedule links                  | SPE-1889 parent Done (if other children remain) |

## Mirror contract

- **Read-only** — no mutations to GameState from the mirror surface.
- **Hydrated truth only** — display persisted bundles as hydrated; do not re-run validation to drop entries.
- **Display guards** — `validateContainedPersonIntegratedHealthBundle` surfaces warning-severity issues only; warning-only records remain visible.
- **Upstream care links** — wired therapeutic-care schedule links reflect slice 5 compose output; warning-only upstream care records already included in wired links.
- **Empty state** — when `containedPersonIntegratedHealthBundles` map is empty after hydrate.
- **Ordering** — byte-stable sort by bundle id; schedule links sorted by schedule ref for display.
- **Copy** — CP-neutral labels; no franchise tokens in UI strings.

## Acceptance

- [ ] Empty `containedPersonIntegratedHealthBundles` map renders empty state without throw
- [ ] Records table shows mental-state band, humane-care risk, and wired schedule links
- [ ] Critical mental state and lockdown escalation links display distinctly in summary
- [ ] Front Desk quick link routes to mirror page
- [ ] `npm run lint` + targeted tests + slice 5 wire-up regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| View   | `src/features/operations/containedPersonIntegratedHealthBundleMirrorView.ts` |
| UI     | `src/features/operations/ContainedPersonIntegratedHealthBundleMirrorPage.tsx` |
| Route  | `src/app/routes.ts`, `src/app/App.tsx`, `src/app/appShellRoutePaths.ts` |
| Desk   | `src/features/operations/frontDeskView.ts`                            |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/features/operations/containedPersonIntegratedHealthBundleMirrorView.test.ts`, `src/features/operations/ContainedPersonIntegratedHealthBundleMirrorPage.test.tsx` |
| Plan   | `planning/contained-person-integrated-health-bundle-slice-6.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Medication regimen links | SPE-1886 | Parent umbrella; out of mirror UI boundary |
| Custody / former-actor status links | SPE-1892 | Parent umbrella; out of mirror UI boundary |
| Welfare-debt accounting links | SPE-1888 | Parent umbrella; out of mirror UI boundary |
| SPE-1889 parent Done | SPE-1889 | Slice 6 is mirror UI only; sibling wire-ups may remain |

## See also

- `planning/contained-person-therapeutic-care-registry-slice-5.md`
- `planning/contained-person-therapeutic-care-registry-slice-4.md` — mirror UI template (SPE-2344)

# SPE-1889 — Contained-person integrated health bundle medication/custody/welfare-debt mirror fields (slice 7)

One-page implementation plan. Linear: [SPE-2347](https://linear.app/spectranoir/issue/SPE-2347) (child under [SPE-1889](https://linear.app/spectranoir/issue/SPE-1889)). Follows shipped slice 6 (`planning/contained-person-integrated-health-bundle-slice-6.md`, PR #2559).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2347 — Contained-person integrated health bundle medication/custody/welfare-debt mirror fields (slice 7)](https://linear.app/spectranoir/issue/SPE-2347) |
| **Status** | **Shipped** — PR pending @ `81d6a55e` base                                                                 |
| **Parent** | [SPE-1889](https://linear.app/spectranoir/issue/SPE-1889) — integrated health bundle umbrella stays open |
| **Branch** | `spe-1889-integrated-health-bundle-mirror-fields-slice-7`                                                  |
| **Base `main` SHA** | `81d6a55e`                                                                                          |

## Goal

Extend the integrated health bundle planning mirror with optional medication regimen, custody status, and welfare-debt accounting link fields on persisted `containedPersonIntegratedHealthBundles` for agent routing visibility.

## Prerequisite (on `main` @ `81d6a55e`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Mirror UI slice 6    | `getContainedPersonIntegratedHealthBundleMirrorView` (SPE-2346 / PR #2559) |
| Bundle schema        | `src/domain/containedPersonIntegratedHealthBundleRegistry.ts` (SPE-2345 / PR #2557) |
| Therapeutic care wire-up | compose + derive (SPE-2345 / PR #2557) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Optional `medicationRegimenLinks`, `custodyStatusLinks`, `welfareDebtAccountingLinks` on bundle schema + sanitize/validation | New parallel registry systems (SPE-1886 / SPE-1892 / SPE-1888) |
| Extend mirror view + page with link-group columns and summary counts | Domain derive/compose wire-up from upstream registries |
| View + component + persistence tests                               | Weekly tick / advanceWeek changes           |
| Compose preserves authored link fields through therapeutic-care merge | SPE-1889 parent Done                          |
| Slice doc (this file) + backlog handoff                            |                                               |

## Mirror contract

- **Read-only** — no mutations to GameState from the mirror surface.
- **Hydrated truth only** — display persisted bundles as hydrated; do not re-run validation to drop entries.
- **Partial rows** — missing link groups render empty arrays in view and `—` in page cells.
- **Ordering** — byte-stable sort by bundle id; each link group sorted by ref for display.
- **Summary counts** — coerced medication links, rights-review-pending custody links, unresolved/escalated welfare-debt links.
- **Copy** — CP-neutral labels; no franchise tokens in UI strings.

## Acceptance

- [x] Empty `containedPersonIntegratedHealthBundles` map renders empty state without throw
- [x] Partial bundle rows show dashes for missing medication/custody/welfare-debt link groups
- [x] Hydrated bundles with all three link groups display in mirror view and page
- [x] Save round-trip preserves new optional link fields
- [x] SPE-2346 therapeutic-care mirror behavior unchanged
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/containedPersonIntegratedHealthBundleRegistry.ts`, `src/domain/containedPersonIntegratedHealthBundleCompose.ts` |
| View   | `src/features/operations/containedPersonIntegratedHealthBundleMirrorView.ts` |
| UI     | `src/features/operations/ContainedPersonIntegratedHealthBundleMirrorPage.tsx` |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/features/operations/containedPersonIntegratedHealthBundleMirrorView.test.ts`, `src/features/operations/ContainedPersonIntegratedHealthBundleMirrorPage.test.tsx`, `src/test/containedPersonIntegratedHealthBundlePersistence.test.ts` |
| Plan   | `planning/contained-person-integrated-health-bundle-slice-7.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Medication regimen derive/compose wire-up | SPE-1886 | Upstream registry not shipped |
| Custody status derive/compose wire-up | SPE-1892 | Upstream registry not shipped |
| Welfare-debt derive/compose wire-up | SPE-1888 | Upstream registry not shipped |
| SPE-1889 parent Done | SPE-1889 | Slice 7 is mirror field groups only; upstream wire-ups remain |

## See also

- `planning/contained-person-integrated-health-bundle-slice-6.md`
- `planning/contained-person-therapeutic-care-registry-slice-5.md`

# SPE-2123 — Rule-document compliance containment registry planning mirror UI (slice 4)

One-page implementation plan. Linear: child [SPE-2368](https://linear.app/spectranoir/issue/SPE-2368) under [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) / anchor [SPE-2123](https://linear.app/spectranoir/issue/SPE-2123). Follows shipped slice 3 (`planning/rule-document-compliance-containment-registry-slice-3.md`, PR #2601).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2368 — Rule-document compliance containment registry planning mirror UI (slice 4)](https://linear.app/spectranoir/issue/SPE-2368) |
| **Status** | **Shipped** — PR #2604 @ `8b4bf2e5`                                                                        |
| **Parent** | [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310) — Case / facility lifecycle (stays open)         |
| **Anchor** | [SPE-2123](https://linear.app/spectranoir/issue/SPE-2123) — Rule-document compliance containment registry  |
| **Branch** | `spe-2123-rule-document-compliance-mirror-ui-slice-4`                                                      |
| **Base `main` SHA** | `9fc52d84`                                                                                          |

## Goal

Read-only planning/operations mirror over persisted `ruleDocumentComplianceRecords` and `projectComplianceDecay` projection — for agent routing visibility, not player-facing canon.

## Prerequisite (on `main` @ `9fc52d84`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema      | `src/domain/ruleDocumentComplianceContainmentRegistry.ts` (SPE-2123 / PR #2442) |
| Persistence          | `ruleDocumentComplianceRecords` on `GameState` (SPE-2365 / PR #2599)       |
| Weekly progression hook | `applyWeeklyRuleDocumentComplianceTick` (SPE-2366 / PR #2601)          |
| Sibling mirror template | `publicDisclosureMirrorView` (SPE-2331), `selfCensoringInformationMirrorView` (SPE-2330) |

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `getRuleDocumentComplianceMirrorView` + `RuleDocumentComplianceMirrorPage` | New persistence fields                     |
| Route `/rule-document-compliance` + Front Desk quick link          | Weekly tick / sanitize contract changes       |
| View + component tests                                             | SPE-1310 parent closure                       |
| Slice doc (this file) + backlog handoff on ship                    | Re-validation of hidden/dropped records       |
| Decay band + audit symptom display from `projectComplianceDecay` at `game.week` | SPE-1097 authority wire-up          |

## Mirror contract

- **Read-only** — no mutations to GameState from the mirror surface.
- **Hydrated truth only** — display persisted records as hydrated; do not re-run validation or surface dropped invalid entries.
- **Projection at current week** — `projectComplianceDecay(record, { currentWeek: game.week })`; display-only, no tick mutation.
- **Legibility gaps** — redacted or unknown projection fields render as `—`, not hidden truth.
- **Validation warnings** — warnings-only records (e.g. `compelled_binding_without_auditor`) surface warning detail labels.
- **Breach records** — show `critical` decay band when projection warrants.
- **Empty state** — when `ruleDocumentComplianceRecords` map is empty after hydrate.
- **Copy** — CP-neutral labels; no franchise tokens in UI strings.

## Acceptance

- [x] Empty `ruleDocumentComplianceRecords` map renders empty state without throw
- [x] Records table shows binding, compliance state, decay band, drift probability, and audit symptoms from persisted fields + projection
- [x] Redacted/unknown projection fields render as legibility gaps
- [x] Warnings-only records display validation warnings
- [x] Breach records show critical decay band
- [x] Front Desk quick link routes to mirror page
- [x] `npm run lint` + targeted tests + slice 1–3 regression green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| View   | `src/features/operations/ruleDocumentComplianceMirrorView.ts`         |
| UI     | `src/features/operations/RuleDocumentComplianceMirrorPage.tsx`        |
| Route  | `src/app/routes.ts`, `src/app/App.tsx`                                |
| Desk   | `src/features/operations/frontDeskView.ts`                            |
| Copy   | `src/data/copy.ts`                                                    |
| Tests  | `src/features/operations/ruleDocumentComplianceMirrorView.test.ts`, `src/features/operations/RuleDocumentComplianceMirrorPage.test.tsx` |
| Plan   | `planning/rule-document-compliance-containment-registry-slice-4.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-1097 authority/legitimacy obedience checks | SPE-1097 follow-up | Out of mirror UI boundary |
| SPE-1310 parent closure | SPE-1310 | Registry slices do not satisfy full parent acceptance |
| Case lifecycle transitions on compliance breach | SPE-1310 | Mirror display only in slice 4 |

## See also

- `planning/rule-document-compliance-containment-registry-slice-3.md`
- `planning/public-disclosure-state-registry-slice-4.md` — mirror UI template (SPE-2331)
- `planning/self-censoring-information-registry-slice-4.md` — mirror UI template (SPE-2330)

# SPE-1888 — Parent acceptance review (grooming slice 1)

One-page grooming record. Parent [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) stays **Backlog** — registry child wave shipped; procedural debt-creation AC not met.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | [SPE-2400 — SPE-1888 parent acceptance review (grooming slice 1)](https://linear.app/spectranoir/issue/SPE-2400) |
| **Parent** | [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) — Welfare-debt accounting for coercive procedures; stays **Backlog** |
| **Branch** | `spe-1888-parent-acceptance-review-slice-1`                                                                |
| **Status** | **Shipped** — SPE-2400 (PR TBD) @ `fda6aa25`                                                               |
| **Base `main` SHA** | `fda6aa25`                                                                                          |

## Goal

Evaluate whether shipped welfare-debt registry slices 1–4 satisfy parent [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) acceptance criteria. Docs + Linear hygiene only — no runtime unless owner reopens AC gaps.

## Prerequisite (on `main` @ `fda6aa25`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Registry schema + persistence | [SPE-2350](https://linear.app/spectranoir/issue/SPE-2350) / PR #2568 — `src/domain/welfareDebtAccountingRegistry.ts`, `welfareDebtAccountingRecords` |
| Integrated health bundle wire-up | [SPE-2350](https://linear.app/spectranoir/issue/SPE-2350) / PR #2568 — `deriveWelfareDebtBundleFragmentsFromRecords` + `composeWelfareDebtIntoIntegratedHealthBundles` |
| Planning mirror UI | [SPE-2351](https://linear.app/spectranoir/issue/SPE-2351) / PR #2570 — `WelfareDebtAccountingMirrorPage` |
| Weekly orchestration hook | [SPE-2352](https://linear.app/spectranoir/issue/SPE-2352) / PR #2572 — `applyWeeklyWelfareDebtAccountingTick` |
| Ledger summary audit output | [SPE-2353](https://linear.app/spectranoir/issue/SPE-2353) / PR #2574 — `summarizeWelfareDebtAccountingRecords`, `buildWelfareDebtAccountingLedgerAuditReport` |

## Parent AC vs shipped evidence

| Parent AC | Shipped evidence | Met? |
| --- | --- | --- |
| Coercive procedure creates welfare-debt entry while also improving containment or security state | Schema + authored fixtures (`COERCIVE_RESTRAINT_LEDGER_FIXTURE` with `containmentBenefitScore: 0.71`); no `advanceWeek` or coercive-protocol hook that **creates** debt from procedure execution | **No** |
| Ledger entry records affected person/group, source procedure, severity, review owner, mitigation path | `WelfareDebtAccountingRecord` fields + validation/projection tests on fixtures | **Partial** — schema and fixtures yes; no runtime creation path |
| Privilege-deprivation or coerced-risk sourcing creates legitimacy cost separate from operational success | `containmentBenefitScore` field + weekly tick escalates when benefit &lt; 0.55; no privilege-deprivation or personnel-sourcing procedure wire-up | **No** |
| Summary distinguishes unresolved, mitigated, and escalated welfare debt | `summarizeWelfareDebtAccountingRecords`, mirror summary counts, `buildWelfareDebtAccountingLedgerAuditReport` (slice 4) | **Yes** |
| Ledger output links to contained-person condition, coercive protocol, ethics, or accountability without duplicating | Integrated health bundle derive/compose wire-up ([SPE-2350](https://linear.app/spectranoir/issue/SPE-2350)); no [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882) coercive-protocol or [SPE-1047](https://linear.app/spectranoir/issue/SPE-1047) ethics-matrix links | **Partial** |
| Tests cover deterministic debt creation, severity classification, mitigation state, audit summary | Tests for validation, weekly tick, audit summary, bundle compose — not procedural debt **creation** | **Partial** |

**Child disposition ([SPE-2351](https://linear.app/spectranoir/issue/SPE-2351)–[SPE-2353](https://linear.app/spectranoir/issue/SPE-2353) + slice 1 via [SPE-2350](https://linear.app/spectranoir/issue/SPE-2350)):** **Done** — slices 1–4 satisfy registry child AC (schema → persistence → weekly hook → mirror UI → audit output). Parent closure was explicitly out of scope in every slice doc.

**Parent [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) disposition:** **Backlog** — registry intake wave is a valid attach surface under [SPE-1889](https://linear.app/spectranoir/issue/SPE-1889) wire-up, not coercive-procedure debt creation.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| Grooming comment on [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) | Coercive protocol debt-creation runtime     |
| `planning/backlog.md` recommended next step handoff                | Reopen [SPE-1464](https://linear.app/spectranoir/issue/SPE-1464) |
| Slice doc (this file) + planning index row                         | Mission triage expansion                      |
| Linear hygiene on [SPE-2400](https://linear.app/spectranoir/issue/SPE-2400) | SPE-868 slice 28 (branching reward logic)   |

## Acceptance

- [x] Parent AC evaluated against welfare-debt slices 1–4 evidence with Done vs Backlog reasoning
- [x] SPE-1888 stays **Backlog** on Linear; registry children remain **Done**
- [x] Recommended next step updated to next genuinely open grooming target
- [x] Docs-only diff

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Coercive procedure → welfare-debt creation with containment success | [SPE-1882](https://linear.app/spectranoir/issue/SPE-1882) / [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) | Parent AC; requires owner-scoped procedural wire-up — not registry slice pattern alone |
| Legitimacy-cost links (faction ethics, accountability matrix, recruitment fallout) | [SPE-1047](https://linear.app/spectranoir/issue/SPE-1047), [SPE-1131](https://linear.app/spectranoir/issue/SPE-1131), [SPE-107](https://linear.app/spectranoir/issue/SPE-107) | Parent scope links; out of registry wave |
| Privilege-deprivation / coerced-risk sourcing procedural cases | [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) follow-up child | Parent AC; needs procedure execution hook |

## Validation

Docs-only — no `npm run test:run` required.

## See also

- `planning/welfare-debt-accounting-registry-slice-4.md`
- `planning/contained-person-integrated-health-bundle-slice-10.md`
- `planning/spe-1309-parent-acceptance-review-slice-1.md`
- `planning/backlog-handoff-hygiene-slice-1.md`

# SPE-1888 — Welfare-debt ledger faction ethics + accountability matrix cross-links (slice 9)

One-page implementation plan. Linear: child under [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) (create/link slice issue on merge). Follows shipped slice 8 (`planning/welfare-debt-accounting-registry-slice-8.md`, PR #2763) and grooming [SPE-2452](https://linear.app/spectranoir/issue/SPE-2452).

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | Welfare-debt ledger faction ethics + accountability matrix cross-links (slice 9) — child under [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) |
| **Parent** | [SPE-1888](https://linear.app/spectranoir/issue/SPE-1888) — parent stays **Backlog** until row 5 AC fully met across runtime surfaces |
| **Branch** | `spe-1888-welfare-debt-matrix-links-slice-9`                                                                |
| **Status** | **Shipped** — PR #2786 @ `198094c6`                                                                        |
| **Base `main` SHA** | `c0c138a0`                                                                                          |

## Goal

Wire `composeAllWelfareDebtAccountingCrossLinks` opaque `review-owner:` / `mitigation-path:` refs to real [SPE-1047](https://linear.app/spectranoir/issue/SPE-1047) faction ethics and [SPE-1131](https://linear.app/spectranoir/issue/SPE-1131) moral-legal accountability matrix projections when optional matrix maps are provided — closes SPE-1888 parent AC row 5 compose/audit path without duplicating matrix semantics.

## Prerequisite (on `main` @ `c0c138a0`)

| Shipped              | Anchor                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Cross-link compose   | `welfareDebtAccountingCrossLinks.ts` (slice 7 / PR #2760)              |
| Weekly surfacing     | `welfareDebtAccountingCrossLinkSurfacing.ts` (slice 8 / PR #2763)      |
| Grooming slice 4     | `planning/spe-1888-parent-acceptance-review-slice-4.md` (SPE-2452)   |

## Cross-link contract (slice 9)

- **SPE-1047 faction ethics** — match `reviewOwnerLabel` slug on welfare-debt record to `FactionEthicsMatrixRecord.reviewOwnerLabel`; subject-ref fallback when label miss.
- **SPE-1131 accountability matrix** — match `mitigationPathLabel` slug to `MoralLegalAccountabilityMatrixRecord.mitigationPathLabel`; subject-ref fallback when label miss.
- **Matrix wired refs** — `faction-ethics:{recordId}` and `accountability-matrix:{recordId}` from registry projections; replace opaque refs when matrix maps hydrate matches.
- **Opaque fallback** — when matrix maps absent or no match, retain slice 7 `review-owner:` / `mitigation-path:` wired refs.
- **Hydrated truth only** — skip invalid matrix records without re-surfacing.
- **Byte-stable ordering** — debt refs, link labels sorted on repeat.
- **Audit pass-through** — optional `factionEthicsRecords` / `accountabilityMatrixRecords` on ledger audit input.

## Scope (this slice)

| In                                                                 | Out                                           |
| ------------------------------------------------------------------ | --------------------------------------------- |
| `factionEthicsMatrixRegistry.ts` schema + projection anchor (SPE-1047) | Full SPE-1047 parent AC                     |
| `moralLegalAccountabilityMatrixRegistry.ts` schema + projection anchor (SPE-1131) | Full SPE-1131 parent AC                 |
| `welfareDebtAccountingCrossLinks.ts` matrix link compose           | GameState persistence for matrix records      |
| Ledger audit optional map pass-through                             | Mission triage chips                          |
| Targeted unit + audit tests                                        | SPE-1888 parent Done                          |
| Slice doc (this file) + backlog handoff                            | Full SPE-1882 coercive protocol model         |
| Grooming comment on SPE-1888 parent (row 5 → Yes for compose path) | SPE-1309 unified engine                     |

## Acceptance

- [x] Empty maps return empty matrix link compose without throw
- [x] Review-owner label matches SPE-1047 projection wired refs when map provided
- [x] Mitigation-path label matches SPE-1131 projection wired refs when map provided
- [x] Opaque refs retained when matrix maps absent
- [x] Ledger audit appends matrix cross-link lines when optional maps provided
- [x] `npm run lint` + targeted tests green

## File touch list (expected)

| Area   | Files                                                                 |
| ------ | --------------------------------------------------------------------- |
| Domain | `src/domain/factionEthicsMatrixRegistry.ts`, `src/domain/moralLegalAccountabilityMatrixRegistry.ts`, `src/domain/welfareDebtAccountingCrossLinks.ts`, `src/domain/welfareDebtAccountingRegistry.ts` |
| Tests  | `src/test/factionEthicsMatrixRegistry.test.ts`, `src/test/moralLegalAccountabilityMatrixRegistry.test.ts`, `src/test/welfareDebtAccountingCrossLinks.test.ts`, `src/test/welfareDebtAccountingLedgerAudit.test.ts` |
| Plan   | `planning/welfare-debt-accounting-registry-slice-9.md`, `planning/backlog.md` |

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| GameState persistence for matrix records | SPE-1047 / SPE-1131 | Schema anchor only; mirror/advanceWeek pass-through when maps exist on state |
| Weekly report matrix label surfacing | SPE-1888 follow-up | Optional; slice 8 surfacing unchanged until state persistence |
| Full faction ethics policy engine | SPE-1047 | Parent AC remainder |
| Full accountability matrix engine | SPE-1131 | Parent AC remainder |
| SPE-1888 parent Done | SPE-1888 | Full SPE-1047/1131 parent scope still open; row 5 compose path only |

## See also

- `planning/spe-1888-parent-acceptance-review-slice-4.md`
- `planning/welfare-debt-accounting-registry-slice-7.md`
- `planning/welfare-debt-accounting-registry-slice-8.md`

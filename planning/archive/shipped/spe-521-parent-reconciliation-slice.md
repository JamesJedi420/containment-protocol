# SPE-521 — Parent acceptance reconciliation (grooming)

One-page grooming record. Parent [SPE-521](https://linear.app/spectranoir/issue/SPE-521) **Done** — deterministic substrate (slices 1–4) plus full prep-stack shipped; parent AC rows 1–4 **Yes**; prep-scope rows closed.

| Field      | Value                                                                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| **Linear** | SPE-521 parent reconciliation (hygiene slice)                                                              |
| **Parent** | [SPE-521](https://linear.app/spectranoir/issue/SPE-521) — Uniform-based infiltration with escalation threshold; **Done** |
| **Branch** | `spe-521-parent-reconciliation`                                                                            |
| **Status** | **Shipped** — hygiene session (docs-only)                                                              |
| **Base `main` SHA** | `73ef7349`                                                                                          |

## Goal

Re-evaluate parent [SPE-521](https://linear.app/spectranoir/issue/SPE-521) acceptance criteria after the full prep-stack (encounter-state cover, guides/documents, role branches, civilian long-horizon, non-uniform identity trees). Confirm parent **Done** only when all AC rows are evidenced — not on prep-stack completion alone. Docs + Linear hygiene only.

## Prerequisite (on `main` @ `73ef7349`)

| Layer | Anchor |
| --- | --- |
| Substrate slices 1–4 | PR #2171, #2304, #2307, #2308 — `infiltrationProbe.ts`, `infiltrationCover.ts`, disguise bridge |
| Case prep + content | PR #2325, [SPE-2250](https://linear.app/spectranoir/issue/SPE-2250) slices 1–2, [SPE-2305](https://linear.app/spectranoir/issue/SPE-2305) #2473, [SPE-2308](https://linear.app/spectranoir/issue/SPE-2308) #2479 |
| Prep-stack children | PR #2824–#2833 — encounter-state cover, stance tick, guides/documents, role branches, civilian long-horizon ([SPE-2461](https://linear.app/spectranoir/issue/SPE-2461)), non-uniform trees ([SPE-2463](https://linear.app/spectranoir/issue/SPE-2463)) |

**Delta since June 2026 grooming (`planning/scope-discipline-grooming-pass.md`):** all five “remaining parent scope” prep rows shipped; parent body and grooming ledger were stale.

## Parent AC vs shipped evidence

| Parent AC | Shipped evidence | Met? |
| --- | --- | --- |
| At least one infiltration path uses uniform or credential cover with measurable threshold escalation | `InfiltrationCoverProfile` (`uniform_guard`, `documentTier`, `doctrineBand`); weekly posture + `cover_strain` band (`infiltrationCover.ts`); awareness bands `probing` → `exposed` → `violent` at 0.55 / 0.8 (`infiltrationProbe.ts`); `ops-004` template + integration test PR #2171–#2308 | **Yes** |
| At least one partial-access eavesdropping case combines civilian role, covert lane, and disguise threshold | Harvest fold-in: civilian-role + covert lane + threshold — not literal room eavesdrop. `psi-004` / `psi-003`: `civilian_staff` cover, `probe_access` below progress gate (partial access), `infiltration` + runtime `covert` tags; `getInfiltrationStagePressure` + `evaluateBehaviorWeightedDisguiseValidation` for disguise threshold (`behaviorDisguiseValidation.test.ts`, `advanceWeek.infiltrationProbe.integration.test.ts`) | **Yes** |
| At least one cover degradation event produces deterministic escalation rather than silent failure | `cover_strain`, `escalation_exposed`, `escalation_violent` events via `resolveInfiltrationThresholdEvents` + cover posture; report notes `infiltration.cover_strain` / `infiltration.escalation_*` in `advanceWeek`; tests `infiltrationCover.test.ts`, `infiltrationProbe.test.ts`, `advanceWeek.infiltrationProbe.integration.test.ts` | **Yes** |
| Targeted tests cover threshold states, escalation triggers, and shipped slice substrates | `infiltrationProbe.test.ts`, `infiltrationCover.test.ts`, `behaviorDisguiseValidation.test.ts`, `advanceWeek.infiltrationProbe.integration.test.ts`; prep read-model tests for PR #2825–#2833 | **Yes** |

**Prep-stack scope (formerly “remaining parent scope” in issue body):** all rows **shipped** — encounter-state cover (#2825), stance tick (#2826), guides/documents (#2827), role branches (#2828), civilian long-horizon (#2830 / SPE-2461), non-uniform identity trees (#2833 / SPE-2463).

**Parent [SPE-521](https://linear.app/spectranoir/issue/SPE-521) disposition:** **Done** — AC rows 1–4 met by substrate slices 1–4 (May 2026); prep-stack closed reconciliation scope rows without reopening AC gaps.

**Doc vs Linear reconciliation:** Linear marked **Done** on SPE-2463 merge (2026-06-15) while issue body still said “Keep this issue open.” Grooming confirms **Done** aligns with evidenced AC; update parent body + deferred table to match.

## Scope (this slice)

| In | Out |
| --- | --- |
| Grooming comment on [SPE-521](https://linear.app/spectranoir/issue/SPE-521) | New probe tick mechanics |
| Parent body / deferred table hygiene | Mission triage |
| `planning/backlog.md` handoff + context | SPE-2250 batch-4+ migration |
| `planning/scope-discipline-grooming-pass.md` SPE-521 row | SPE-2242 disguise validation changes |
| Slice doc (this file) + planning index row | Runtime implementation |

## Acceptance

- [x] Parent AC re-evaluated — rows 1–4 **Yes**
- [x] SPE-521 **Done** on Linear aligned with docs
- [x] Recommended next step updated post reconciliation
- [x] Docs-only diff

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| SPE-2250 batch-4+ optional template stacks | [SPE-2250](https://linear.app/spectranoir/issue/SPE-2250) / audit doc | No eligible catalog templates — `planning/infiltration-encounter-content-batch4plus-audit.md`; not parent AC |
| Authored per-template long-horizon / non-uniform overrides | SPE-521 follow-up siblings | Tag-heuristic prep slices sufficient; slice docs § Deferred |
| Infiltration probe player action picker UX | SPE-521 deferred UX | `planning/infiltration-case-prep-slice.md` — out of parent AC minimum bar |
| Institutional espionage success/survival split | [SPE-551](https://linear.app/spectranoir/issue/SPE-551) | Harvest fold-in pointer — broader covert-ops menu |
| SPE-522 / SPE-1007 broad infiltration frameworks | deferred-design | `planning/scope-discipline-grooming-pass.md` — not active queue |

## Validation

Docs-only — no `npm run test:run` required for hygiene boundary.

## See also

- `planning/scope-discipline-grooming-pass.md`
- `planning/infiltration-encounter-content-batch4plus-audit.md`
- `planning/backlog.md`

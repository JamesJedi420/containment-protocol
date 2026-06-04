# MVP weekly loop proof — slice 3 (triage + intake persistence)

## Status

| Field | Value |
| --- | --- |
| **Linear (slice)** | [SPE-2309](https://linear.app/spectranoir/issue/SPE-2309) — MVP weekly loop proof (slice 3 — triage + intake persistence) |
| **Linear (parent)** | [SPE-2251](https://linear.app/spectranoir/issue/SPE-2251) — MVP weekly loop proof (slice 1) |
| **Branch** | `spe-2251-mvp-weekly-loop-proof-slice-3` from `main` @ `967e9e55` |
| **MVP claims** | `planning/mvp-scope.md` §8 Claims 1, 2, 6 |

## Goal

Extend the SPE-2251 `weeklyMvpLoopProof` harness so one deterministic flow proves:

- **Claim 1** — triage matters: linked intake raises covert mission triage score vs the same mission without intake; reason codes include verification conflict.
- **Claim 2 (partial)** — deployment/prep carryover remains covered by slices 1–2; slice 3 adds institutional intake signals in the weekly path.
- **Claim 6** — next week changed: triage routing and intake verification notes persist through `advanceWeek` + save/load across multiple weeks.

## Boundary

- `src/test/helpers/weeklyMvpLoopProof.ts` + `src/test/weeklyMvpLoopProof.slice3.integration.test.ts` only unless a real persistence gap is found.
- No new domain rules, registry waves, triage UI layout refresh, or compare-top-2 triage UI.
- Reuse SPE-854 intake fixtures and `missionIntakeRouting` / `advanceWeek` intake corroboration (no UI click path).

## Implementation

| Area | Files |
| --- | --- |
| Helper hooks | `applyWeeklyMvpLoopIntakeAndTriage`, `readWeeklyMvpLoopTriageScores`, `MVP_LOOP_INTAKE_TOPIC` |
| Tests | `src/test/weeklyMvpLoopProof.slice3.integration.test.ts` |

## Acceptance

- [ ] Slice 3 integration tests pass in `npm run test:run`
- [ ] Full suite green
- [ ] `npm run lint` green on touched files
- [ ] PR links SPE-2309; parent SPE-2251 stays open until milestone 6 proof is complete

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Full triage UI click path / compare-top-2 | Mission triage refresh (backlog blocked) | Out of slice — domain APIs only |
| Milestone 6 “proof complete” parent closure | SPE-2251 umbrella / grooming | Requires additional claims beyond slice 3 |

## See also

- `planning/mvp-weekly-loop-proof-slice-1.md` (slices 1–2 shipped)
- `planning/scope-discipline-grooming-pass.md` § Phase 4
- `planning/backlog.md` active queue

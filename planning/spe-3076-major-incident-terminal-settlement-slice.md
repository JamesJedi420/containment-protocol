# SPE-3076 — Major-incident terminal resolution and settlement handoff

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** |
| **Issue** | [SPE-3076](https://linear.app/spectranoir/issue/SPE-3076/major-incident-terminal-resolution-and-settlement-handoff) |
| **Parent** | [SPE-36](https://linear.app/spectranoir/issue/SPE-36) (stays Backlog) |
| **Branch** | `jamesdyedbq/spe-3076-major-incident-terminal-resolution-and-settlement-handoff` |
| **Base main SHA** | `064ce1a6` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `064ce1a6`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c2ebf067`)  
**Decision:** `delegated_approve` SPE-3076  

### Decision criteria

1. **Queue state** — primary SPE-1052; SPE-3164 Done/merged (#4473); clean `main` @ `064ce1a6`; no open PRs.
2. **Candidates compared** — SPE-3338 tooling IP; SPE-3335 blocked; SPE-3162 umbrella; SPE-3166 blocked by SPE-3162; SPE-3452 blocked by SPE-1084; SPE-3405 blocked; SPE-1290 restore alternate; SPE-3076 High unblocked.
3. **Winner lines** — Priority High; no blockers; bounded terminal settlement seam; one coding slice; MI runtime ready.
4. **Duplication** — not in recentlyShipped.
5. **Contradiction** — no STOP/hold conflict.
6. **Eligibility** — exists; In Progress; not umbrella; acceptance fits; no open blockers; slice doc this branch.
7. **Decision** — `delegated_approve` SPE-3076.
8. **Prohibitions** — no new issue; parent not coding slice; PR review preserved.

## Approved boundary

- Pure `majorIncidentTerminalSettlement.ts` idempotent receipt over final outcome
- Wire week-close MI resolution to stamp receipt before rewards/reports
- Preserve receipt on hydrated `ActiveMajorIncidentRuntime`
- Targeted tests; SCHEMA_REGISTRY note
- No casualty/assignment/aftermath ownership; no new report UI

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Full MI reward merge into `buildMissionRewardBreakdown` inventory path | SPE-36 / follow-up | Receipt + eligibility shipped; live inventory merge can fold next |
| SPE-3166 contract-board stochastic migration | SPE-3166 | Blocked by open SPE-3162 parent relation |

## Validation

- `npm run test:run -- src/test/majorIncidentTerminalSettlement.test.ts src/test/majorIncidents.test.ts`

## Final settlement report maintenance (2026-11-15)

This bounded repair starts from main `b68859c9e2950b55ed5f3e52d1bbff5f88bb7a61`
on branch `codex/final-settlement-report`. SPE-3076 retains its existing owner and
Done status; SPE-36 and SPE-3504 are unchanged. This is maintenance of the shipped
receipt/report consistency contract, not completion of acknowledgement projection.

The coordination downgrade already resettles the runtime and reward outcome as
partial, but its mission draft retained the earlier success explanation. After
successful resettlement, `downgradeResolvedCaseToPartial` now replaces only the
explanation matching the previous receipt with the final receipt's summary and ID.
Unrelated reasons retain their content and ordering. The refreshed mission draft
then flows through the existing finalizer into the immutable weekly report snapshot.

There is no new snapshot schema, historical migration, receipt inferred from prose,
UI read of mutable live receipts, or change to settlement, rewards, coordination,
lifecycle, visibility, or acknowledgement policy. Already-saved historical reports
are not rewritten.

Regression coverage extends the already inventoried
`src/test/majorIncidentTerminalSettlement.test.ts`: a valid production planner and
launch, a constructed final resolution window, real week close and rendered
`MissionResultSummary` / `ReportCaseGroup` consumers. Four operations retain
success; five trigger coordination and partial settlement. Both report identity and
reward explanations are checked, along with deterministic replay, canonical
save/load, and the partial report after a valid relaunch clears the live receipt.
These are constructed production-path/rendered-consumer tests, not a manual
browser playthrough or a hidden-information audit. No discovered test path changes.

Pre-fix verification: the two partial-report assertions failed with stale success
wording while the other 13 settlement/coordination assertions passed. Post-fix
focused settlement/coordination/major-incident suite: 25 tests passed. Full pre-ship
and final-head review evidence is recorded on the repair PR.

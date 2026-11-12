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

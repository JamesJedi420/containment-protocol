# SPE-3343 — Deterministic research capability-to-throughput execution

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** |
| **Issue** | [SPE-3343](https://linear.app/spectranoir/issue/SPE-3343) |
| **Parent** | [SPE-3342](https://linear.app/spectranoir/issue/SPE-3342) — Backlog |
| **Branch** | `jamesdyedbq/spe-3343-deterministic-research-capability-to-throughput-execution` |
| **Shipped** | PR [#4437](https://github.com/JamesJedi420/containment-protocol/pull/4437) @ `8ac45755` |

## Delegated approval

**Decision:** `delegated_approve` SPE-3343  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` @ `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753`  
**Date:** 2026-10-27  
**Continuation:** Explicit implementation request (SPE-3343 branch)

## Approved boundary

Pure deterministic research capability-to-throughput execution in `src/domain/researchThroughputExecution.ts`:

- Trivial vs persistent entry classification (no persistent runtime for trivial information work)
- Caller-owned capability packet (domain scores, difficulty, facility gates, staff competency/commitment, source inputs, reproducible bonus)
- SPE-3343-owned execution runtime (source yield remaining, fired milestones, analytical spend, progress units, commitment, interrupt flag)
- `resolveResearchThroughput` — capability vs difficulty with bounded modifiers; fail-closed gates
- `applyResearchExecutionTick` — yield consumption without source destruction; exact-once milestone firing; owner-routed output intents; closure on mandatory findings
- Interrupt/resume with commitment release and partial progress preservation
- Runtime serialize/parse for save-load compatibility at this layer
- Parallel store hook `advanceResearchProgressWithThroughput` in `research.ts` (legacy `advanceResearchProgress` unchanged)

Consumes authored definitions from SPE-3470 only; does not re-author project definitions.

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| Hazardous research posture / material risk execution | SPE-3344 | Separate approved owner |

## Validation

- Targeted: `npx vitest run src/domain/researchThroughputExecution.test.ts`
- `npm run verify:backlog-handoff`

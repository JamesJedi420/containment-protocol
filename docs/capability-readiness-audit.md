# Capability Readiness Domain Seam — Audit Note (SPE-1339)

## Purpose

This seam models the separation between having learned a capability and being operationally ready to use it in a pure, deterministic domain layer. It supports explicit outcomes for operational readiness, learned but not ready, or blocked states, without side effects or simulation coupling.

## Domain Contract

- **Input:**
  - `capabilityId`: Id of the capability to evaluate
  - `kind`: 'skill' | 'protocol' | 'knowledge' | 'other'
  - `ownerId`: Id of the owner (agent, org, etc.)
  - `learned`: If true, capability has been acquired/learned
  - `readinessConditionsMet` (optional): If true, operational readiness conditions are met
  - `inherentlyReady` (optional): If true, no additional prep needed

- **Output:**
  - `kind`: 'operationally_ready' | 'learned_but_not_ready' | 'blocked'
  - `reason`: Explanation string
  - `readinessWeeks` (optional): If readiness required, estimated duration

## Rules

- If not `learned`, readiness is blocked.
- If `learned` and (`readinessConditionsMet` or `inherentlyReady`), operationally ready.
- If `learned` but not ready, learned but not ready (default 2 weeks).
- No side effects, no state mutation, no research graph or staffing logic.

## Integration Points

- Can be invoked by higher-level sim/store logic to determine operational readiness outcomes.
- Does not mutate state or trigger events.

## Test Coverage

- See `src/test/sim.capabilityReadiness.test.ts` for focused tests covering all result branches.

## Overlap & Boundaries

- Does NOT implement research graph, cognitive overload, anomaly hazard, or staffing simulation.
- Pure domain logic only; no UI, store, or effect coupling.

---

**Files:**

- `src/domain/capabilityReadiness.ts` — Domain seam implementation
- `src/test/sim.capabilityReadiness.test.ts` — Focused tests
- `docs/capability-readiness-audit.md` — This audit note

## SPE-1339 child seam: Learned-vs-operationally-ready separation

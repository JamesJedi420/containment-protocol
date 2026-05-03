# Capability Dissemination & Teaching Domain Seam — Audit Note (SPE-27)

## Purpose
This seam models the transfer of a capability (skill, protocol, knowledge, etc.) from a source owner to a recipient (agent or organization) in a pure, deterministic domain layer. It supports explicit outcomes for direct transfer, blocked transfer, or teaching/study requirements, without side effects or simulation coupling.

## Domain Contract
- **Input:**
  - `capabilityId`: Id of the capability to transfer
  - `kind`: 'skill' | 'protocol' | 'knowledge' | 'other'
  - `sourceOwnerId`: Id of the source (agent, org, etc.)
  - `recipientId`: Id of the recipient (agent, org, etc.)
  - `recipientOrgPath` (optional): Path for org-level dissemination
  - `teachingOffered` (optional): If true, source is willing/able to teach
  - `recipientEligible` (optional): If true, recipient can receive direct transfer
  - `transferable` (optional): If false, transfer is blocked (locked/secret)
- **Output:**
  - `kind`: 'transferable' | 'blocked' | 'requires_teaching'
  - `reason`: Explanation string
  - `teachingWeeks` (optional): If teaching required, estimated duration

## Rules
- If `transferable` is false, transfer is blocked.
- If `recipientEligible` is true and not blocked, transfer is direct.
- If not eligible but `teachingOffered` is true, teaching is required (default 4 weeks).
- Otherwise, transfer is blocked.
- No side effects, no state mutation, no research graph or staffing logic.

## Integration Points
- Can be invoked by higher-level sim/store logic to determine transfer/teaching outcomes.
- Does not mutate state or trigger events.

## Test Coverage
- See `src/test/sim.capabilityDissemination.test.ts` for focused tests covering all result branches.

## Overlap & Boundaries
- Does NOT implement research graph, cognitive overload, anomaly hazard, or staffing simulation.
- Pure domain logic only; no UI, store, or effect coupling.

---

**Files:**
- `src/domain/capabilityDissemination.ts` — Domain seam implementation
- `src/test/sim.capabilityDissemination.test.ts` — Focused tests
- `docs/capability-dissemination-audit.md` — This audit note

**SPE-27 child seam: Capability dissemination/teaching**

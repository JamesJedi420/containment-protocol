# SPE-2081 Personnel-class emergency routing graph (slice 1)

## Boundary
Pure deterministic domain helper. No GameState, UI, or full alert-network integration.
Does not replace SPE-1023 tactical deployment.

## What shipped
- `src/domain/personnelClassEmergencyRouting.ts`: resolver for personnel class, exposure, policy flags → route decision + audit trail.
- Focused tests covering differential class routes, exposure prohibition, determinism, quarantine path.

## Acceptance
- At least two personnel classes receive different emergency routes under same incident. ✅
- Routing respects exposure-prohibition for strategic-essential staff. ✅
- Tests assert deterministic route outcomes for fixture incidents. ✅

## Out of scope
Full alert-network choreography (SPE-102), off-site transport simulation.

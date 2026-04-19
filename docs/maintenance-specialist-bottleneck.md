# Maintenance Specialist Bottleneck (SPE-94)

## Overview

SPE-94 introduces a bounded, deterministic support specialist system for equipment recovery. The agency's maintenance specialist pool acts as a capability multiplier and bottleneck, directly affecting equipment recovery throughput each week.

## Key Behaviors

- **Single Canonical Field:** `maintenanceSpecialistsAvailable` in agency state determines weekly maintenance capacity.
- **Deterministic Bottleneck:** Each damaged equipment item queued for recovery consumes 1 maintenance specialist capacity. If there are more items than available specialists, only as many as capacity are recovered; the rest are delayed.
- **No Roster or Specialization Matrix:** No per-person logic, staffing roster, or specialization matrix is introduced. The system remains bounded and deterministic.
- **Player-Facing Output:** Weekly report notes surface whether maintenance capacity cleared the queue or left a bottleneck (e.g., "All equipment recovered" or "2 items delayed due to maintenance bottleneck").
- **Test Coverage:** Deterministic tests assert on both the surfaced output and the actual downstream recovery result.

## Implementation Details

- All logic is in the domain simulation flow (`src/domain/sim/advanceWeek.ts`).
- The specialist field is canonical and not duplicated.
- No non-canonical or parallel state is introduced for tests.
- The pass is strictly limited to equipment recovery; no procurement or readiness logic is affected.

## Example Output

- "All damaged equipment recovered (3 items)."
- "2 equipment items recovered; 1 delayed due to maintenance bottleneck."

## See Also

- `src/domain/models.ts` (agency state)
- `src/domain/sim/advanceWeek.ts` (recovery logic)
- `src/domain/reportNotes.ts` (surfaced output)
- `src/test/sim.equipmentRecoveryBottleneck.test.ts` (test coverage)

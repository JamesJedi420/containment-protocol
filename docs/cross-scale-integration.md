# Cross-Scale Integration & Domain Interface Layer (SPE-64)

## Overview

SPE-64 introduces explicit, deterministic handoff contracts for campaign ↔ incident state transfer, enabling modular integration and robust, testable flows between campaign and incident/operation logic.

## Key Concepts

- **CampaignToIncidentPacket**: Bounded, explicit contract for passing state from campaign to incident/operation resolution.
- **IncidentToCampaignPacket**: Bounded, explicit contract for returning results/effects from incident/operation back to campaign state.
- **Modular Integration Point**: A global hook (`campaignToIncidentHook`) allows optional modules to inspect or modify the handoff packet before incident resolution, supporting extension without core code changes.

## Usage

### Contracts

- Located in `src/domain/models.ts`:
  - `CampaignToIncidentPacket`: Contains only the minimal, deterministic state needed for incident resolution.
  - `IncidentToCampaignPacket`: Contains only the minimal, deterministic effects to apply to campaign state.

### Modular Integration (Hook)

- The campaign loop in `src/domain/sim/advanceWeek.ts` checks for a global `campaignToIncidentHook` function.
- If present, the hook is called with the handoff packet, current case, and campaign state, allowing optional modules to extend or modify the packet.
- Example:

  ```ts
  (globalThis as any).campaignToIncidentHook = (packet, currentCase, state) => {
    // Inspect or mutate the packet as needed
    packet.campaignId = 'customized';
  }
  ```

## Testing

- Deterministic unit and integration tests for contract construction and hook behavior are in:
  - `src/test/crossScaleContracts.test.ts`
  - `src/test/campaignToIncidentHook.integration.test.ts`

## Migration Note

- Legacy fields (`containmentRating`, `clearanceLevel`, `funding`) remain in `models.ts` for compatibility. Remove after all consumers migrate to the new `agency` field.

## See Also

- `README.md` for project structure and simulation boundaries
- `docs/dependency-boundaries.md` for architectural rules

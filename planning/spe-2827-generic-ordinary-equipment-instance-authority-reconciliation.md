# SPE-2827 — Generic Ordinary-Equipment Instance Authority

| Field      | Value                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| **Status** | **Backlog parent**                                                                                      |
| **Linear** | [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827/generic-ordinary-equipment-instance-authority) |
| **Scope**  | Durable identity and lifecycle authority for ordinary equipment copies                                  |

## Ownership reconciliation

SPE-98 remains the completed runtime-item precedent and is not reopened. SPE-462 owns taxonomy,
SPE-1658 owns readiness/access, SPE-877 owns maintenance and integrity, SPE-1027 owns facility
stock and replenishment, and SPE-1766 owns artifact-specific approval and depletion. SPE-1055,
SPE-2800, and later recovery work consume instance authority but do not own generic identity.

The parent therefore owns stable ordinary-equipment instance identity, authoritative location,
validated mutable state, persistence, and the future lifecycle integration program. It remains
Backlog while independently reviewable children ship.

## Child sequence

1. SPE-2828 establishes the optional registry, persistence, and loadout-assignment foundation.
2. A later child may author Combat Stim's exact two-dose activation and durable consumption events.
3. A separate integration child may consume SPE-1027's stock-provider port for replenishment.
4. Later bounded children may add loss, destruction, repair, mutation, and instance-aware salvage.
   SPE-2856 ships fatality-only equipped-instance loss (`mission_loss`). SPE-2857 ships
   injury-only equipped-instance loss (`mission_injury`). SPE-2858 confirms resignation
   does not destroy equipped copies; SPE-2830 terminal-carrier recovery remains.

Readiness/access remains under SPE-1658 and maintenance behavior remains under SPE-877. The
foundation's compact condition and payload fields do not complete either adjacent program.

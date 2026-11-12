# Versioned scenario definitions (SPE-3397)

Canonical typed scenario-definition contract under SPE-1734. Implementation: `src/domain/scenarioDefinitionResolver.ts`.

## Contract

- Schema `spe-3397.v1`; presets and custom share one resolver path.
- Components are validated directives handed to existing owners (SPE-97, SPE-1104, SPE-27, SPE-3044, SPE-1510, SPE-3103, …).
- Softlock / starting-grant legality follows SPE-3396.
- Stochastic init uses identity-keyed derivation (SPE-3162-compatible); SPE-3162 remains substrate owner.
- Bound `definitionVersion` does not silently follow a newer live preset — SPE-2898 transition assessment required.
- Optional `CampaignLedgerState.scenarioDefinition`; legacy absence stays unbound.

## Out of scope

- Custom editor UI (SPE-3398)
- Isolated scenario runner (SPE-3459)
- Duplicate domain engines for roster/map/research/world-law

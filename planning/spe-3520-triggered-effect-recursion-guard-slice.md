# SPE-3520: triggered-effect recursion guard (slice 1)

Pure domain module `src/domain/triggeredEffectRecursionGuard.ts` provides a deterministic chain-lineage and step-budget check for triggered-effect sequences. Callers own effect application and persistence. Self, mutual and multi-node cycles terminate with stable reasons; already-committed steps are never rolled back. Static authoring cycle rejection is available for obvious graphs. No GameState, event bus or second effect engine is introduced.

This slice covers the runtime guard contract and required unit tests. Integration with concrete anomaly-effect producers remains with SPE-1033 owners.

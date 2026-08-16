# Equipment Instance Architecture

## Authorities

Equipment definitions describe catalog semantics. Aggregate `inventory` counts uninstantiated
stock. Optional `equipmentInstances` owns the identity and location of instantiated ordinary
equipment objects. `Agent.equipmentSlots` is a definition-ID compatibility projection, not a
second ownership ledger.

An instance has immutable `instanceId` and `definitionId`. Its mutable state is deliberately
small: stored/equipped location, operational/damaged condition, and an optional resource payload
whose safe ID and integer bounds are validated. Grade, rarity, value, provenance, legacy effect
scale, and fabrication-lot receipts remain independent authorities.

## Mutation rules

Instantiation moves exactly one unit from aggregate inventory into the registry. Relocation never
changes aggregate inventory. Compare-and-swap transitions require an exact expected instance and
reject stale state or identity changes. Existing loadout commands recognize instance-backed slots:
unequip and replacement store the instance, while direct transfer moves the same instance.

The foundation exposes no generic delete or inventory-credit operation. This prevents callers from
silently converting a durable object back into aggregate stock.

## Combat Stim governed payload (SPE-2829)

`combat_stims` is the first governed instance payload consumer. Materialization always creates
`combat_stim_dose` at exactly 2/2. Generic compare-and-swap transitions cannot initialize an
alternate payload, consume a dose, or refill it; the explicit activation command is the only
decrement authority. Partially used and empty instances keep their immutable identity and may move
between storage and compatible loadout slots without returning to aggregate stock.

An equipped operational instance can self-activate only for its active responder during an
unresolved raid or Stage IV+ assignment, at depleted/overdrawn underlying energy, outside active
overdrive/recovery lockout, and without `stimulant-prohibited`. The instance ID remains the durable
provenance anchor for activation, overdrive, events, UI, and save/load.

## Compatibility and hydration

Definition-only loadouts remain supported. When a valid instance claims an agent slot, its location
wins and writes the definition projection. Hydration processes safe instance IDs deterministically;
the first valid slot claim wins and later valid claimants become stored. Invalid records are dropped
independently. Missing registry state becomes `{}` without a save-version change.

## Deferred consumers

Facility replenishment, readiness/access, maintenance, loss, destruction, repair, mutation, and
instance-aware recovery require separate children and their owning domain authorities. Combat Stim
overdrive adds depletion only; it does not imply refill, healing, overdose, re-aggregation, or
salvage mechanics.

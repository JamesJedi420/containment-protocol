# SPE-2829 — Combat Stim Emergency Overdrive Activation

| Field      | Value                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| **Status** | **Recently shipped**                                                                                    |
| **Linear** | [SPE-2829](https://linear.app/spectranoir/issue/SPE-2829/combat-stim-emergency-overdrive-activation)    |
| **Parent** | [SPE-2827](https://linear.app/spectranoir/issue/SPE-2827/generic-ordinary-equipment-instance-authority) |
| **Branch** | `jamesdyedbq/spe-2829-combat-stim-emergency-overdrive`                                                  |

## Authority and activation

One aggregate `combat_stims` unit materializes atomically as one durable instance whose governed
`combat_stim_dose` payload has capacity 2 and starts at 2 remaining. Generic instance transitions
may move the object or change its condition, but cannot initialize an alternate Combat Stim payload,
decrement doses, or refill it. Only the activation command may consume one dose. Empty instances
remain durable and can be stored, transferred, and equipped.

Activation is self-use by the active responder carrying the operational instance. The responder
must be assigned to an unresolved raid or Stage IV+ case, have depleted or overdrawn underlying
energy, have no active overdrive or recovery debt, and lack `stimulant-prohibited`. The command
decrements exactly one dose and records stable activation, equipment-instance, responder, and case
identity. It does not mutate underlying energy, health, wounds, stress, fatigue channels, or stats.

The existing SPE-130 overdrive state owns the one-phase tactical effect and casualty-protection
consumer. Effective energy advances exactly one band (`overdrawn` to `depleted`, or `depleted` to
`taxed`) without restoring reserve. Active Combat Stim overdrive expires after mission resolution
at week close. Its existing two-tick SPE-130 recovery debt begins affecting fatigue channels on the
following week close; no energy `exertionDebt` is added.

## Persistence and events

Optional Combat Stim provenance on `AgentOverdriveState` hydrates strictly while legacy and
stress-triggered overdrive remains valid without it. Generic payload bounds continue to hydrate;
semantically noncanonical Combat Stim payloads remain durable but cannot activate and are never
refilled or deleted by migration. Legacy definition-only loadouts receive no invented instance or
doses.

The strict V2 event registry adds `equipment.instance_materialized`,
`equipment.combat_stim_activated`, and `equipment.combat_stim_overdrive_expired`. No event-schema,
game-save, or store version changes are required.

## UI

Equipment loadouts expose stored Combat Stim instances as dose-aware choices. Equipped instances
show identity, remaining doses, effective-band preview, blocker text, active overdrive, and recovery
debt. Dose consumption requires explicit confirmation and remains available while the responder is
deployed even though ordinary loadout editing is locked.

## Deferred

- SPE-1027 facility refill stock and any refill command;
- SPE-1485 exact crisis phases and SPE-714 generalized prerequisite packets;
- overdose, contraindication medicine beyond the existing prohibition flag, healing, and injection
  into another responder;
- re-aggregation, loss, general destruction, live-dose recovery/disposal, and Auto-Scrap instance
  selection. SPE-2830 subsequently authorizes manual recovery of stored depleted 0/2 instances.

## Validation

- atomic 2/2 materialization, deterministic identity, governed payload mutation, and event emission;
- all activation gates, stable lifetime ordinals, one-dose decrement, nonstacking, and unchanged
  underlying energy/health/fatigue state;
- effective energy and the existing casualty-protection consumer;
- phase expiry, canonical event retention, exactly two later SPE-130 debt ticks, and provenance clear;
- partial/empty/stored/legacy persistence and accessible loadout/confirmation/status presentation.

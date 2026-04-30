# Protocols Audit — Agency Doctrine, Protocol Unlocks, Scope, and Runtime Effects

> Design note and architectural reference for `src/domain/protocols.ts`.

---

## 1. Overview

Agency protocols are doctrine-level modifiers that activate during mission resolution when their unlock and activation conditions are met. They are selected from an unlocked pool (limited by clearance level) and applied per-agent based on scope matching and context-tag evaluation.

Protocol state is derived at read time from `GameState` via `buildAgencyProtocolState`. The system is read-only — no protocol logic mutates game state.

---

## 2. Protocol Types

Four protocol types are defined in `PROTOCOL_TYPE_DEFINITIONS`:

| Type ID | Label | Focus |
| --- | --- | --- |
| `survival-focused` | Survival-Focused | Stress resistance, wound mitigation, high-pressure endurance |
| `anomaly-interaction` | Anomaly Interaction | Containment control, anomaly handling, ritual execution |
| `investigation-efficiency` | Investigation Efficiency | Evidence flow, signal exploitation, witness handling |
| `operational-endurance` | Operational Endurance | Extended ops, readiness retention, major incident pressure |

---

## 3. Protocol Catalog

Four protocols are defined in `PROTOCOL_DEFINITIONS`:

| ID | Label | Type | Tier |
| --- | --- | --- | --- |
| `field-clearance-protocol` | Field Clearance Protocol | investigation-efficiency | operations |
| `containment-doctrine-alpha` | Containment Doctrine Alpha | anomaly-interaction | containment |
| `crisis-command-uplink` | Crisis Command Uplink | operational-endurance | directorate |
| `anomaly-resistance-training` | Anomaly Resistance Training | survival-focused | operations |

### Unlock Conditions

| Protocol | Unlock condition |
| --- | --- |
| `field-clearance-protocol` | clearanceLevel ≥ 2 |
| `containment-doctrine-alpha` | containmentRating ≥ 80 |
| `crisis-command-uplink` | clearanceLevel ≥ 3 AND funding ≥ 150 |
| `anomaly-resistance-training` | containmentRating ≥ 76 AND clearanceLevel ≥ 2 |

### Activation Conditions (context tags)

| Protocol | Active when (any tag match) | Extra condition |
| --- | --- | --- |
| `field-clearance-protocol` | evidence, analysis, signal, witness, relay, cyber | — |
| `containment-doctrine-alpha` | occult, containment, ritual, anomaly, spirit, seal | — |
| `crisis-command-uplink` | raid, breach, outbreak, threat, containment | case kind=raid OR stage ≥ 4 |
| `anomaly-resistance-training` | occult, anomaly, containment, spirit, ritual, seal, hazmat | OR long operation (durationWeeks≥3 or stage≥3) |

### Global Modifiers

| Protocol | effectivenessMultiplier | stressImpactMultiplier |
| --- | --- | --- |
| `field-clearance-protocol` | 1.03 | 1.0 |
| `containment-doctrine-alpha` | 1.03 | 0.95 |
| `crisis-command-uplink` | 1.04 | 1.0 |
| `anomaly-resistance-training` | 1.02 | 0.90 |

All `moraleRecoveryDelta` values are 0 for current protocols.

---

## 4. Scope

Each protocol has a `ProtocolScope` controlling which agents it applies to:

| Scope kind | Definition | Examples |
| --- | --- | --- |
| `all_agents` | Every agent on the team | containment-doctrine-alpha, anomaly-resistance-training |
| `role` | Agent role matches any in `roles[]` | crisis-command-uplink: hunter, tech, medic |
| `tag` | Agent tags include any in `tags[]` | field-clearance-protocol: analyst, analysis, tech |

---

## 5. Selection Limit

The number of protocols an agency may activate simultaneously is bounded by:

```text
selectionLimit = max(1, min(3, trunc(clearanceLevel)))
```

unless `agency.protocolSelectionLimit` is explicitly set (integer, ≥ 1). At clearance 1: limit=1, clearance 2: limit=2, clearance 3+: limit=3 (max).

If `agency.activeProtocolIds` is not explicitly stored, the first `selectionLimit` unlocked protocols are auto-selected.

---

## 6. `buildAgencyProtocolState`

Derives the full `AgencyProtocolState` from game state:

1. Computes `selectionLimit` from clearance
2. Evaluates `unlockedWhen` for every definition
3. Resolves `activeProtocolIds` from explicit selection or auto-default
4. Returns `unlockedProtocols[]` with `selected: true/false`

---

## 7. `resolveAgentProtocolEffects`

Called per-agent during mission evaluation. Returns `AgentActiveProtocol[]` — only protocols that pass all four gates:

1. Protocol is in the definition catalog
2. Protocol is `selected === true`
3. Agent matches the protocol's `scope`
4. `activeWhen(context, protocolState)` returns true

---

## 8. `aggregateProtocolEffects`

Reduces an array of `AgentActiveProtocol` using `aggregateRuntimeModifierResults`:

- `effectivenessMultiplier`: multiplicative product
- `stressImpactMultiplier`: multiplicative product
- `moraleRecoveryDelta`: additive sum
- `statModifiers`: merged additively

---

## 9. Integration Points

| Consumer | Usage |
| --- | --- |
| `effectiveStats` / agent evaluation | Receives `protocolState` in context; applies `resolveAgentProtocolEffects` |
| `missionResults.ts` | Aggregates protocol effects into final effectiveness modifier |
| `recon.ts` | Passes `protocolState` in `TeamReconContext` for context-aware recon evaluation |
| `src/features/operations/` | Reads `buildAgencyProtocolState` to render protocol selection UI |

---

## 10. Common Pitfalls

| Pitfall | Consequence | Guard |
| --- | --- | --- |
| Calling `resolveAgentProtocolEffects` without `buildAgencyProtocolState` first | Agent receives no protocol effects regardless of unlock state | Always build `AgencyProtocolState` before per-agent evaluation |
| Hardcoding selection limit as 3 | Ignores early-game clearance restrictions and explicit override | Read `selectionLimit` from `AgencyProtocolState`, never assume 3 |
| Treating `globalModifiers.stressImpactMultiplier` as additive | Compound multipliers underestimate or overestimate stress reduction | All multipliers are applied via `aggregateRuntimeModifierResults` (multiplicative) |
| Adding a new protocol definition without adding an `unlockedWhen` condition | Protocol is always locked (never surfaces in the UI) | Every definition must have both `unlockedWhen` and `activeWhen` |
| Checking scope by role only for `tag`-scoped protocols | Tag-scoped protocols are missed for agents who match role but not tag | Use `matchesProtocolScope` — it differentiates scope kind |

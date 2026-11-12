# SPE-2722 — External support authority consequence slice

Parent: SPE-788 — Authority relationship graph and politics layer

| Field      | Value                                            |
| ---------- | ------------------------------------------------ |
| **Status** | **Shipped**                                      |
| **Branch** | `agent/spe-2722-external-support-authority-edge` |

## Goal

Consume one sanitized persisted authority edge when an existing contractor support asset rallies
support, producing one bounded faction-pressure consequence without expanding the wider politics
layer.

## Boundary

- Resolve the rally's support amount and trust drift from pre-consequence asset state.
- Match the selected contractor ID through authority node IDs or aliases.
- Follow one linked live faction and resolve the existing `aid` consequence between those nodes.
- Apply at most one point of faction reputation movement per asset and campaign week.
- Surface the edge and bounded movement through the existing support note.
- Keep market, institutional legitimacy, operational cover, negotiation, command propagation,
  department/council politics, secrecy/media, commerce, UI, and SPE-39 math unchanged.

## Acceptance

- One graph-backed contractor/faction edge changes faction reputation by a bounded point.
- Missing assets, missing node/faction references, and empty or legacy graph state are no-ops.
- Delayed hidden and contradicted claims do not apply durable faction reputation movement.
- Authority node aliases resolve through the persisted graph.
- Consequence selection and replay are deterministic.
- Repeated support actions in one week do not duplicate the faction consequence.
- The consequence does not change the support amount that triggered it.
- Market and operational-cover behavior remain unchanged.

## Reuse

- `resolveAssetSupportOutcome` and `applyAssetReliabilityDrift`
- `sanitizeAuthorityGraphState`
- `normalizeAuthorityNodeId` and `resolveAuthorityGraphConsequences`
- structured support/report note conventions

## Schema

`ExternalSupportAsset.lastAuthorityConsequenceWeek` is an optional positive integer marker. The
external-support asset sanitizer retains valid markers no later than the hydrated campaign week
and drops malformed or future values. Missing legacy markers remain compatible.

## Deferred

| Item                                                            | Suggested owner               | Why deferred                                                                             |
| --------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------- |
| Broader faction, authority, and legitimacy propagation          | SPE-788 children              | This slice maps one contractor aid edge to one bounded faction reputation movement only. |
| Negotiation and command/council behavior                        | Existing SPE-788 child owners | Their read/write contracts are separate from support reliability.                        |
| Secrecy, media, commerce, market, and operational-cover effects | Their owning systems          | The selected support consequence is deliberately isolated from these surfaces.           |

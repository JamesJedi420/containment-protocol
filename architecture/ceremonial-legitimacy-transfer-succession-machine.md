# Ceremonial Legitimacy Transfer and Succession State Machine (SPE-175)

## Purpose

Legitimacy transfer is a **bounded state machine** with explicit ceremonies, participant validation, deferred contracts, captive/coerced claimants, partial-legitimacy outcomes, lighter asset-specific transfers, and system-side failover selection. It is not a simple owner swap.

## Legitimacy surfaces

Track at least:

- **Inherited power** — lineage and office (SPE-166).
- **Recognition** — by institutions, factions, and populace.
- **Blood relation** — kinship distance.
- **Practical control** — who can command forces or assets in fact.

These surfaces combine into overall legitimacy but remain separable in docs and data.

## State machine outline

States may include:

- pre-succession,
- in-ceremony,
- contested,
- partially recognized,
- fully recognized,
- failed, voided, or seized.

Transitions are triggered by:

- ceremony completion,
- contract signing,
- witness validation,
- force majeure (coup, divine sign, legal override).

## Ceremony and contracts

Ceremonies:

- may require specific locations, times, and participants,
- can include **captive or coerced claimants** (logged as such),
- may generate **deferred contracts** (conditions pending future validation).

## Partial and batched transfers

Legitimacy can transfer:

- partially (asset-specific or region-specific),
- in batches (multiple heirs or offices),
- or conditionally (subject to oaths, milestones, or oversight).

## System-side failover

When no recognized heir exists, systems apply **failover rules**:

- regency,
- external appointment,
- or controlled collapse.

## Integration

- **SPE-148** — inheritance and estate transfer handle civil/legal asset side.
- **SPE-166** — inherited authority progression anchors power surface.

## See also

- `architecture/inherited-power-succession-violent-transfer.md` — SPE-166
- `architecture/inheritance-estate-transfer-registration.md` — SPE-148
- `architecture/civic-jurisdiction-detention-unrest.md` — SPE-87 (witnesses, registries, and enforcement-facing recognition)
- `architecture/polity-driven-settlement-generation.md` — SPE-144 (settlement-scale charters and civic premise backing recognition)
- `systems/factions-legitimacy.md`


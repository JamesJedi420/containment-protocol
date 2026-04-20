# Containment Protocol — Entity Relationship Model

## Purpose

This document defines the major entities in Containment Protocol and how
they relate to one another.

It is intended to:

- clarify entity boundaries and ownership
- distinguish canonical simulation state from surfaced output
- provide a shared conceptual model for future systems/docs

This is a conceptual ER model, not a database schema.

---

## Core design rule

Containment Protocol is an institution-first game.

The entity model should reflect that:

- the **agency** is the primary root actor
- operatives and teams are subordinate operational entities
- incidents and missions are distinct
- factions, hub state, facilities, economy, and knowledge all connect
  through campaign state
- reports and surfaced output are downstream of canonical domain state

---

## 1. High-level entity map

```text
Agency
├─ Operatives
├─ Teams
├─ Facilities
├─ Support / Specialists
├─ Economy / Funding
├─ Knowledge
├─ Hub
├─ Missions
└─ Reports

World
├─ Regions
├─ Zones
├─ Sites
├─ Incidents
└─ Factions

Incidents
└─ can produce Missions

Missions
├─ use Teams
├─ affect Operatives
├─ consume Support
├─ generate Fallout
└─ update Reports / World / Hub / Factions
```

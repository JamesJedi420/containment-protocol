# Containment Protocol — Game State Schema (Expanded)

This file contains the expanded schema, canonical ownership rules, and supporting subtypes for Containment Protocol. It is intended for use by designers, engineers, and testers as a reference for state boundaries and system responsibilities.

---

## Meta state

```ts
interface MetaState {
  currentWeek: number;
  seed?: string;
  version: number;
}
```

Purpose: tracks simulation step, supports persistence/versioning, may support deterministic replay or migration.

Canonical owner: root game state

---

## Agency state

```ts
interface AgencyState {
  funding: number;
  legitimacy: number;
  standing: number;
  supportAvailable: number;
  maintenanceSpecialistsAvailable?: number;
  coordinationFrictionActive?: boolean;
  coordinationStatus?: "normal" | "overloaded";
  coordinationReason?: string;
  recruitmentCapacity?: number;
  trainingCapacity?: number;
  activePressure?: AgencyPressureState;
  summaryFlags?: AgencySummaryFlags;
}
```

Purpose: represents the institution as the primary playable actor, owns global non-field capacity and institutional constraints.

Canonical owner: agency

... (content truncated for brevity, full details in source)

## See also

- `architecture/game-state-and-core-loop.md`
- `docs/glossary.md`

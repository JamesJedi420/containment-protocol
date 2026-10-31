# SPE-992 — Hidden-room building graph

| Field      | Value                                                   |
| ---------- | ------------------------------------------------------- |
| **Status** | **In Progress**                                         |
| **Linear** | [SPE-992](https://linear.app/spectranoir/issue/SPE-992) |
| **Parent** | none                                                    |
| **Branch** | `feat/spe-992-hidden-room-building-graph`               |
| **Base**   | `370131ef`                                              |

## Boundary and plan

Pure `src/domain/hiddenRoomBuildingGraph.ts`: concealed access triggers, hidden habitation rooms, alternate-route graph, discovery ladder to resident/body. No building simulator or GameState.

## Deferred

| Item                     | Owner    | Boundary                                 |
| ------------------------ | -------- | ---------------------------------------- |
| Site-knowledge hierarchy | SPE-1052 | Facility knowledge owners stay separate. |
| Artifact UI presentation | SPE-33   | Presentation not in this slice.          |

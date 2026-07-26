# SPE-2725 — Mission-access authority routing slice

Parent: SPE-788 — Authority relationship graph and politics layer

| Field      | Value                                   |
| ---------- | --------------------------------------- |
| **Status** | **Shipped**                             |
| **Branch** | `agent/spe-2725-mission-access-routing` |

## Goal

Consume one persisted authority edge in a bounded mission command-routing path so a
faction-linked mission can become blocked or deferred without changing team candidate ranking.

## Boundary

- Normalize the persisted authority graph at the read seam.
- Resolve a mission faction through a canonical authority node, authority alias, or explicit
  linked faction ID backed by a live faction record.
- Consider one explicit `mission_access` edge at a time in deterministic code-unit ID order.
- Map an existing `deny` consequence to `blocked` and an existing `delay` consequence to
  `deferred`.
- Ignore missing/legacy graph state, missing faction or node references, positive access,
  unrevealed hidden evidence, contradicted evidence, resolved missions, and already-assigned
  missions.
- Recompute persisted routing after the graph's week-close mutation so the next-week route and
  graph snapshot agree.
- Preserve team candidate scoring, validity, and ordering.

## Acceptance

- A sanitized persisted dependency edge blocks or defers one faction-linked mission.
- The mission-wide authority consequence still applies when every ranked team is independently
  ineligible, without changing the ranked candidate records.
- Empty and legacy graphs retain the existing route.
- Authority aliases and linked live-faction IDs resolve deterministically.
- Identical state replays produce identical consequences and candidate order.
- Mid-week reads do not mutate persisted routing, and week-close recomputes against the
  post-mutation graph.
- Hidden/contradicted claims and assigned missions do not alter routing.
- Market access, institutional legitimacy, operational cover, triage scoring, and team
  readiness math remain unchanged.

## Reuse

- `sanitizeAuthorityGraphState`
- `normalizeAuthorityNodeId`
- `resolveAuthorityGraphConsequences`
- existing faction runtime records and authority aliases
- mission routing states/blockers and deterministic candidate ordering
- `advanceWeek` authority-graph week-close ordering

## Schema

No persisted shape changes. `MissionRoutingBlockerCode` gains the recognized
`authority-mission-access-restricted` value inside the existing `routingBlockers` array.

## Deferred

| Item                                                                   | Suggested owner                     | Why deferred                                                               |
| ---------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| Broader command propagation and department/council politics            | SPE-788 children                    | This slice consumes one faction mission-access edge only.                  |
| UI explanation or authority graph presentation                         | SPE-788 UI children                 | No UI work is in boundary.                                                 |
| Negotiation, support assets, secrecy/media, and commerce               | Existing system owners              | Their graph integrations and state contracts remain independent.           |
| Candidate ranking, readiness, standing, rival pressure, and cover math | Mission readiness and SPE-39 owners | Authority access is a mission-wide route state, not a team score modifier. |

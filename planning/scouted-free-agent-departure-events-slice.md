# Scouted free-agent departure events (SPE-2726 / GitHub #3333)

| Field | Value |
| --- | --- |
| **Status** | **Shipped** |

## Goal

Preserve a durable, player-facing event when a scouted, recruitable candidate expires from the active recruitment pool.

## Scope

- Emit one `recruitment.candidate_departed` event during week-close expiry for each previously scouted, recruitable candidate.
- Store the candidate identity, visible name, departure week, and canonical expiry reason in the persisted event log.
- Surface that event in the existing report-note and event-feed routes while retaining the aggregate expiry statistic.
- Normalize malformed persisted departure payloads without synthesizing events for candidates absent from legacy saves.

## Out of scope

- A general notification unread/read or acknowledgement system.
- New simulated departure causes, destinations, or any inferred hidden state.
- Post-hire staff departures and non-expiry candidate-loss flows.

## Acceptance

- [x] Scouted, recruitable expired candidates receive exactly one durable departure event.
- [x] Unscouted or already-terminal candidates do not receive a departure event.
- [x] Existing aggregate recruitment expiry event remains intact.
- [x] Departure events survive save/load and appear in the event feed.
- [x] Legacy saves do not gain historical departure events during hydration.

## Deferred

| Item | Suggested owner issue | Why deferred |
| --- | --- | --- |
| Persisted acknowledgement/read state | SPE-2726 follow-up child | The event feed has no general acknowledgement model; adding one would be a notification subsystem, beyond this bounded event slice. |

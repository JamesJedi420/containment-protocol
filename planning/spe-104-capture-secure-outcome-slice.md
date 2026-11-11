# SPE-104 — Capture-secure outcome seam (slice 1)

| Field             | Value                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Status**        | **In Progress** (producer seam; full weapon AC deferred)                                                         |
| **Issue**         | [SPE-104](https://linear.app/spectranoir/issue/SPE-104/capture-and-restraint-weapon-interactions)                |
| **Consumer**      | [SPE-3735](https://linear.app/spectranoir/issue/SPE-3735) — keeps In Progress; movement still blockedBy SPE-1095 |
| **Branch**        | `jamesdyedbq/spe-104-capture-secure-outcome-seam`                                                                |
| **Base main SHA** | `b69e71b4b78901a891b306c4e49145a1af0b3f4a`                                                                       |

## Goal

Ship the smallest deterministic SPE-104 capture/secure outcome producer that emits real `CaptureSecureEvidence` packets for SPE-3735 `confirmCaptureSecure`, without equating capture to verified recontainment and without implementing the full capture-weapon umbrella.

## Boundary

### In scope

- Pure domain producer `src/domain/captureSecureOutcome.ts`
- Resolve compact caller-owned attempt facts → `outcomeId` / `subjectRef` / `secured` / reason codes
- `toCaptureSecureEvidence` maps outcomes to `{ producerOwner: 'SPE-104', outcomeId, subjectRef, secured }`
- Optional SPE-1064 physicality / `canRestrain` compatibility gate
- Contract tests including producer → `confirmCaptureSecure` integration
- SCHEMA_REGISTRY producer-owner note (no new persisted GameState map)
- Backlog / handoff sync

### Out of scope

- Marking SPE-104 or SPE-3735 **Done**
- Full Linear weapon AC (tether snag/pull, partial limb restraint, weapon catch, subdual packages, appendage-disable-first breach)
- Grappling simulator, per-weapon minigames, confrontation odds (SPE-73)
- SPE-1095 movement producer
- GameState persistence / week-close / UI for capture outcomes

## Acceptance (this seam)

- [x] Deterministic secured success with stable `outcomeId`
- [x] Fail-closed `secured: false` for category mismatch, restraint incompatibility, uncommitted control, broken restraint
- [x] Malformed attempts reject without evidence
- [x] Real producer evidence advances SPE-3735 to `capture_secured` / `capture_failed` without completing recovery
- [ ] Full SPE-104 Linear weapon acceptance — **deferred**

## Deferred

| Item                                               | Owner    | Why                                  |
| -------------------------------------------------- | -------- | ------------------------------------ |
| Tether snag / pull / reel outcomes                 | SPE-104  | Full weapon AC remainder             |
| Partial limb restraint + defense penalties         | SPE-104  | Full weapon AC remainder             |
| Defensive weapon-catch / pin conditions            | SPE-104  | Full weapon AC remainder             |
| Subdual-first actor packages                       | SPE-104  | Full weapon AC remainder             |
| Appendage-disable-first breach procedures          | SPE-104  | Full weapon AC remainder             |
| Live confrontation odds wiring                     | SPE-73   | Odds-band confrontation owner        |
| Persisted capture-outcome ledger / week-close / UI | SPE-104  | Schema seam only this slice          |
| Real subject movement channel mutation             | SPE-1095 | SPE-3735 acceptance §1 still blocked |

## Validation

- `npm run test:run -- src/test/captureSecureOutcome.contract.test.ts`
- `npm run verify:backlog-handoff` after backlog/manifest edits

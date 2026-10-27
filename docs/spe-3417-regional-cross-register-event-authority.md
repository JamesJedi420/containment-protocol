# SPE-3417 — Regional cross-register event application and state authority

| Field | Value |
| --- | --- |
| **Status** | Evidence package (contradiction check) |
| **Issue** | [SPE-3417](https://linear.app/spectranoir/issue/SPE-3417) |
| **Parent** | [SPE-1090](https://linear.app/spectranoir/issue/SPE-1090) — remains Backlog |
| **Machine catalog** | `src/domain/regionalCrossRegisterEventAuthority.ts` |
| **Base main SHA** | `f8c040835bfdbaaedd71999be23e411ef301d33a` |
| **Traceability** | 2D6 Realm Pass 2 C113 / C119 / C125 |

## Overall decision

**`no_justified_feature`** for a universal cross-register event engine under SPE-1090 / SPE-2273 / SPE-45.

A single regional event **cannot currently** change plot, facility/workforce, and civic condition through canonical authorities because the durable plot ([SPE-3354](https://linear.app/spectranoir/issue/SPE-3354)), civic ([SPE-3357](https://linear.app/spectranoir/issue/SPE-3357)), and compound-event ([SPE-1503](https://linear.app/spectranoir/issue/SPE-1503)) owners are still **Backlog** with no GameState registers on `main`.

Shipped narrow patterns remain authoritative **within their family** and must not be generalized:

- [SPE-2273](https://linear.app/spectranoir/issue/SPE-2273) — pure transformation registry (**no GameState persistence**)
- [SPE-1606](https://linear.app/spectranoir/issue/SPE-1606) — zone-spanning site events over facility topology only
- [SPE-3184](https://linear.app/spectranoir/issue/SPE-3184) — atomic facility maintenance debt+budget apply
- [SPE-3359](https://linear.app/spectranoir/issue/SPE-3359) — facility register projection (read-only)

## Evidence matrix

| Step | Event step | Owner | Contract | Expected source | Consumer | Observed | Disposition | Verification owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | Source regional producer | SPE-1071 | absent | Event id + targets | N/A | No multi-family producer | confirmed missing | SPE-1503 |
| R2 | Compound composition | SPE-1503 | absent | Multi-pressure packet | deferred | No compose module | confirmed missing | SPE-1503 |
| R3 | Translation / morphism | SPE-2273 | partial | Object refs only | SPE-3471/3415/3390 | Must not persist event apply | already covered | SPE-1090 |
| R4 | Plot / claim mutation | SPE-3354 | absent | Plot identity | SPE-1104 deferred | No plot register | confirmed missing | SPE-3354 |
| R5 | Civic wellness mutation | SPE-3357 | absent | Civic ledger | turn/map deferred | No civic ledger | confirmed missing | SPE-3357 |
| R6 | Facility lifecycle | SPE-1564 | partial | FacilityInstance | SPE-3359 | Owner-local only | already covered | SPE-1564 |
| R7 | Staffing / workforce | SPE-1058 | partial | Labor/staffing | Agency | No regional applicator | already covered | SPE-1058 |
| R8 | Store multi-family apply | SPE-45 | partial | Owner adapters only | N/A | No plot+civic+facility path | no justified feature | SPE-45 |
| R9 | Zone-spanning site | SPE-1606 | present | Site-event record | topology consumers | Single-topology only | already covered | SPE-1606 |
| R10 | Facility maintenance atomic | SPE-3184 | present | Debt + budget | Agency maintenance | Single-family exact-once | already covered | SPE-3184 |
| R11 | Facility register projection | SPE-3359 | present | Facility owner state | FacilityRegisterPanel | No parallel mutable truth | already covered | SPE-3359 |
| R12 | Universal SPE-1090 engine | SPE-1090 | absent | N/A | N/A | Out of translation scope | no justified feature | SPE-1090 |

## Ordering / exact-once

Record exact-once / rollback only where verified consumers require it. Proven today: SPE-3184 single-family atomic apply. Do **not** invent a universal ACID bus from that example.

## Candidate follow-ups (not Phase-4 created)

1. After SPE-3354 ships — producer→plot adapter under SPE-3354.
2. After SPE-3357 ships — producer→civic adapter under SPE-3357.
3. After SPE-1503 ships — ordered multi-family dispatch as a SPE-1503 consumer that still calls per-family owners.

Preserve these as Phase 1 candidate evidence. This check does **not** create Linear issues or expand SPE-1090.

## Prohibitions honored

No generic event bus, event-sourcing architecture, parallel register, Academy copy, or SPE-1606 / SPE-3184 / SPE-3385 reopen.

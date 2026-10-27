# SPE-3417 — Regional cross-register event application and state authority

| Field | Value |
| --- | --- |
| **Status** | Evidence package (contradiction check) |
| **Issue** | [SPE-3417](https://linear.app/spectranoir/issue/SPE-3417) |
| **Parent** | [SPE-1090](https://linear.app/spectranoir/issue/SPE-1090) — remains Backlog |
| **Machine catalog** | `src/domain/regionalCrossRegisterEventAuthority.ts` + `.steps.json` |
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

The full R1–R12 evidence matrix lives only in `src/domain/regionalCrossRegisterEventAuthority.steps.json` (loaded by the domain catalog). Do not restate it here.

## Ordering / exact-once

Record exact-once / rollback only where verified consumers require it. Proven today: SPE-3184 single-family atomic apply. Do **not** invent a universal ACID bus from that example.

## Candidate follow-ups (not Phase-4 created)

1. After SPE-3354 ships — producer→plot adapter under SPE-3354.
2. After SPE-3357 ships — producer→civic adapter under SPE-3357.
3. After SPE-1503 ships — ordered multi-family dispatch as a SPE-1503 consumer that still calls per-family owners.

Preserve these as Phase 1 candidate evidence. This check does **not** create Linear issues or expand SPE-1090.

## Prohibitions honored

No generic event bus, event-sourcing architecture, parallel register, Academy copy, or SPE-1606 / SPE-3184 / SPE-3385 reopen.

# SPE-2702 — Cross-jurisdiction coordination packet on distant reappearance

**Linear:** [SPE-2702](https://linear.app/spectranoir/issue/SPE-2702/spe-39-cross-jurisdiction-coordination-packet-on-distant-reappearance)  
**Parent:** [SPE-39](https://linear.app/spectranoir/issue/SPE-39/agency-standing-rankings-and-rival-pressure-layer) (stays **Backlog**/open after merge)  
**Related:** [SPE-854](https://linear.app/spectranoir/issue/SPE-854/information-intake-and-verification-engine) (`archive_signature` intake), [SPE-558](https://linear.app/spectranoir/issue/SPE-558/compact-region-packets-for-factions-threats-and-objectives) (region refs only)  
**Branch:** `jamesdyedbq/spe-2702-spe-39-cross-jurisdiction-coordination-packet-on-distant`  
**Base:** `main` @ `509edc074558e1fd6ba941b7b2846c19db9f2ab6`

## Goal

One deterministic bounded cross-jurisdiction liaison/coordination packet (shared signature alert) when an incident/entity reappears far from a prior site, using SPE-854 archive-signature intake match — closes parent SPE-39 AC: “at least one distant reappearance triggers a bounded cross-jurisdiction coordination packet.”

## Acceptance (this slice)

- [x] Identical distant-reappearance + signature-match inputs → identical coordination packet
- [x] No packet when jurisdictions are not distant, or signature match is absent/weak
- [x] Weekly report note + agency/report summary expose a legible packet signal
- [x] Does not reopen SPE-2699/2700/2701 rival-pressure math
- [x] No new persisted GameState fields; SCHEMA_REGISTRY unchanged
- [x] SPE-854 verification core untouched (compose only)

## Implementation notes

| Area | Anchor |
| --- | --- |
| Domain | `src/domain/crossJurisdictionCoordinationPacket.ts` — match band, distant check, packet build, case+intake compose |
| Week-close notes | `crossJurisdictionCoordinationWeeklyReportNotes` + `advanceWeek` |
| Agency / UI | `buildAgencySummary`, `reportView` summary line |
| Note type | `agency.cross_jurisdiction_coordination` |
| Docs | `systems/hub-simulation.md` |
| Tests | `src/test/crossJurisdictionCoordinationPacket.test.ts` |

Compose rule: `archive_signature` intake with tentative/strong match band + linked cases (topic keys) with a **resolved × open** distant `regionTag` pair → packet. Weak/none match, same jurisdiction, or open×open / resolved×resolved multi-region without a resolved→open pair → no packet. (SPE-2716 dropped the former lex-min unique-regions fallback.)

## Out of scope

- SPE-2696/2697 standing awards
- SPE-2699/2700/2701 pressure/forgiveness/exposure math changes
- Full SPE-558 region-packet expansion / multi-region org sim
- Hidden-cell strategic interference
- SPE-854 verification progression changes

## Deferred

| Item | Suggested owner | Why deferred |
| --- | --- | --- |
| Hidden-cell strategic interference | SPE-39 children (SPE-2704+) | Larger adversary layer — owned elsewhere |
| Legitimacy fallout tick standing scale | SPE-2705 | Alternate fallout surface — shipped |
| Resolved×open jurisdiction sharpening (drop lex-min fallback) | SPE-2716 | Post-merge Bugbot residual — owned by child |
| Richer jurisdiction distance graph (route hops) | SPE-49 / SPE-558 follow-up | RegionTag inequality is enough for parent AC |

## Validation

- `npm run test:run -- src/test/crossJurisdictionCoordinationPacket.test.ts src/test/agency.test.ts src/test/reportNoteTypeAudit.test.ts`
- `npm run lint`

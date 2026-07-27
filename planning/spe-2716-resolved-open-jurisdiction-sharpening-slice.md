# SPE-2716 — SPE-2702 residual: require resolved×open distant pair

**Linear:** [SPE-2716](https://linear.app/spectranoir/issue/SPE-2716/spe-2702-residual-require-resolvedopen-distant-pair-drop-lex-min-multi)  
**Parent:** [SPE-39](https://linear.app/spectranoir/issue/SPE-39/agency-standing-rankings-and-rival-pressure-layer) (stays **Backlog**/open after merge)  
**Related:** [SPE-2702](https://linear.app/spectranoir/issue/SPE-2702/spe-39-cross-jurisdiction-coordination-packet-on-distant-reappearance) (Done; this child owns Bugbot residual), [SPE-854](https://linear.app/spectranoir/issue/SPE-854/information-intake-and-verification-engine)  
**Branch:** `jamesdyedbq/spe-2716-spe-2702-resolved-open-jurisdiction-sharpening`  
**Base:** `main` @ `f4b403f042ddff75afaa3b6131c9d8658ec834d6`

## Goal

Drop the lex-min multi-region `regionTag` fallback in `pickJurisdictionPair` so coordination packets emit only for a true prior-resolved → current-open distant reappearance.

## Acceptance (this slice)

- [x] Resolved × open distant `regionTag` + tentative/strong `archive_signature` → packet
- [x] Open × open distant multi-region → no packet
- [x] Resolved × resolved distant multi-region → no packet
- [x] Same-jurisdiction / weak / non-signature intake still → no packet
- [x] Prior SPE-2702 resolved×open emit + weekly note / agency summary cases unchanged
- [x] Docs updated; SCHEMA_REGISTRY untouched; SPE-854 / SPE-2699–2714 math untouched

## Implementation notes

| Area | Anchor |
| --- | --- |
| Domain | `src/domain/crossJurisdictionCoordinationPacket.ts` — `pickJurisdictionPair` returns null without resolved×open distant pair |
| Docs | `systems/hub-simulation.md` coordination-packet paragraph |
| Tests | `src/test/crossJurisdictionCoordinationPacket.test.ts` |
| Parent slice | `planning/spe-2702-cross-jurisdiction-coordination-packet-slice.md` deferred row → this child |

Compose rule (post-SPE-2716): `archive_signature` with tentative/strong band + linked cases with at least one **resolved** case and one **open** case on distinct `regionTag`s → packet. No lex-min fallback for status-homogeneous multi-region sets.

## Out of scope

- SPE-854 verification core
- SPE-2699–2714 standing/rival/interference math
- SPE-558 region-packet expansion / richer distance graph
- Concurrent multi-region alert rename without resolved×open

## Deferred

| Item | Suggested owner | Why deferred |
| --- | --- | --- |
| Richer jurisdiction distance graph (route hops) | SPE-49 / SPE-558 | RegionTag inequality remains enough for parent AC |

## Validation

- `npm run test:run -- src/test/crossJurisdictionCoordinationPacket.test.ts`
- `npm run lint`

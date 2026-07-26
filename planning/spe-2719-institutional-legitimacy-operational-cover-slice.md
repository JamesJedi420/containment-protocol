# SPE-2719 slice — Institutional legitimacy vs operational cover gate

Linear: [SPE-2719](https://linear.app/spectranoir/issue/SPE-2719/spe-39-institutional-legitimacy-vs-operational-cover-gate). Parent: [SPE-39](https://linear.app/spectranoir/issue/SPE-39/agency-standing-rankings-and-rival-pressure-layer).

| **Status** | **Shipped** |
| ---------- | ----------- |

## Audit

`LegitimacyState.sanctionLevel` currently controls both aggregate-battle authority and market legality. The `covert` value implies cover in prose, but there is no independent cover state: two sanctioned campaigns cannot diverge by cover, and sanctioned gray-market access requires the SPE-1524 emergency waiver plus fallout. SPE-39's remaining acceptance row is therefore not satisfied by the existing single enum.

## Boundary

Add one optional bounded `operationalCoverLevel` (`open`, `deniable`, `compromised`) while retaining every existing sanction value as institutional legitimacy. Gate the existing gray-market broker packet:

- sanctioned + open/compromised → blocked by audit posture
- sanctioned + deniable → available without an emergency-waiver record
- active emergency waiver → unchanged fallback override

Legacy inference is `covert` sanction → deniable cover; every other sanction → open cover. No sanction migration or ranking/rival/fallout formula changes.

## Implementation

- `src/domain/models.ts`, `src/domain/operationalCover.ts`: split contract, legacy inference, summary
- `src/domain/market.ts`: compose institutional sanction and cover at the existing blocked-sanction gate
- `src/domain/funding.ts`, `SCHEMA_REGISTRY.md`: sanitize optional persisted cover values
- `src/domain/agency.ts`, agency page, report view: expose both axes
- system docs: clarify semantics and waiver boundary

## Acceptance

- [x] Same `sanctioned` legitimacy diverges at a real procurement decision path by operational cover.
- [x] Existing sanction values remain unchanged; missing cover remains legacy-compatible.
- [x] Deniable access does not create waiver precedent or fallout and does not touch SPE-2705 scale.
- [x] Same inputs produce the same gate and summary.
- [x] Hydration strips invalid cover and preserves valid cover.
- [x] Agency/report summaries name institutional legitimacy and operational cover separately.

## Tests

- `src/test/operationalCover.test.ts`
- `src/app/store/runTransfer.test.ts` hydration problem 470
- existing procurement-emergency, market, ranking/rival/upkeep tests as regression coverage

## Deferred

- Full politics/authority graph (SPE-788)
- Open confrontation and cell-raid operations
- Cover movement procedures beyond this single bounded access distinction

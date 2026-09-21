# SPE-2911 — Restricted-object component-set custody and mode-specific release (parent AC8)

| Field               | Value                                                                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                |
| **Linear**          | [SPE-2911](https://linear.app/spectranoir/issue/SPE-2911/restricted-object-component-set-custody-and-mode-specific-release)                         |
| **Parent**          | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027/facility-storage-evidence-and-logistics-stockpile-model) — stays **Backlog**               |
| **Grandparent**     | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog**                   |
| **Related**         | [SPE-2897](https://linear.app/spectranoir/issue/SPE-2897) / [SPE-2890](https://linear.app/spectranoir/issue/SPE-2890) — inspect only; do not recode |
| **Branch**          | `cursor/spe-2911-restricted-object-release-3400`                                                                                                    |
| **Base `main` SHA** | `673816d7c52c51c2345dc03d88b2a3fb1c6d95c7`                                                                                                          |

## Pre-coding summary

**Status on `main`:** not implemented. `facilityRestrictedObjectRelease` is absent from `src/` and
`SCHEMA_REGISTRY.md`. An SPE-1027 comment named this path as an unshipped draft; there is no
committed implementation.

**Relevant files:** `src/domain/facilityProtectionGoods.ts` +
`src/test/facilityProtectionGoods.contract.test.ts` (optional-map pattern);
`src/app/store/runTransfer.ts` (hydrate + `stripUndefinedFields`); `src/domain/models.ts`;
`src/domain/facilityStockAccess.ts` / SPE-2890 tests (regression only);
`SCHEMA_REGISTRY.md`; `planning/spe-1027-counterfeit-protection-goods-slice.md`;
`planning/backlog.md` + `planning/backlog-handoff-manifest.json`.

**Current behavior:** removing a restricted object from storage has no distinct custody/release
mode. There is no authored numbered component set and no fail-closed incomplete-membership check.

**Expected behavior:** one authored `reliquary_key_set` with numbered components
`reliquary_key_set_1` / `reliquary_key_set_2` persists compact `stored` | `inspection` | `testing`
custody. `stored` → `inspection` is physical removal and does not authorize testing.
`stored` → `testing` fail-closes. `inspection` → `testing` is the explicit restricted operational
release (complete set only). Invalid/incomplete/malformed input fail-closes with the original
state reference. Save/load preserves valid snapshots; malformed siblings drop independently.

**Boundary:** SPE-1027 AC8 only. New optional `GameState` sibling map. No warehouse, UI, events,
week-close, seed, version bump, SPE-2890 recode, or AC9 secured-node.

**Risks:** hydration fallback inheritance; parser accepting inherited/hidden keys; treating
`inspection` as `testing`; mixing this map into stockpile or protection goods.

**Validation:** `src/test/facilityRestrictedObjectRelease.contract.test.ts`, then
`src/test/sim.validation.test.ts`, SPE-2890 tests, full suite, lint, backlog-handoff, format,
`git diff --check`.

**Docs:** this slice doc, `SCHEMA_REGISTRY.md`, `planning/backlog.md`,
`planning/backlog-handoff-manifest.json`.

## Boundary

Ship one authored restricted component set so SPE-1027’s eighth AC is true: numbered components
have explicit operational custody and mode-specific release, so removing the set from storage is
not equivalent to authorizing testing or active use.

Reuse the optional-map parse/hydrate pattern from `facilityProtectionGoods`. Do not recode
SPE-2887 `consumeFacilityStock`, SPE-2870 blast-door repair, SPE-2890
`handleAccessControlledStock`, SPE-2891 spoilage, SPE-2892 caches, SPE-2895 overflow, SPE-2896
preparedness, or SPE-2897 protection goods. Do not mix this map into spare-part quantity,
placement, condition/spoilage, caches, overflow, preparedness, or protection goods. Do not debit
or gate `facilityStockpile` or catalog `GameState.inventory`. Do not add player UI, production
starting-state seed, week-close automation, events, trust damage, SPE-565 appraisal, SPE-1046
clearance, SPE-867 evidence chain-of-custody, SPE-1456 logistics-flow, SPE-1042 vault security,
SPE-1621 seal-opening hazard, SPE-1314 policy umbrella, SPE-1027 AC9 secured-node threat, or
version bumps. Do not close SPE-1027, SPE-1052, or SPE-877.

## Seam

`GameState.facilityRestrictedObjectRelease` is an optional map of authored set ids
(`reliquary_key_set`) to `{ mode, components }` snapshots. Modes are `stored` | `inspection` |
`testing`. Components are the exact numbered membership `reliquary_key_set_1`,
`reliquary_key_set_2`. `parseFacilityRestrictedObjectRelease` hydrates through `runTransfer`:
omit / non-record / empty after sanitize → undefined. Only own enumerable authored string-key
entries participate; inherited, non-enumerable, symbol, unknown, integer-index, prototype-unsafe,
malformed-mode, and malformed-component siblings drop independently. Valid entries are rebuilt in
authored set-id order with components rebuilt in authored order, and domain parser/writer
snapshots are frozen.

`recordRestrictedObjectStored(state, { setId, components })` is caller-owned and accepts only an
own enumerable authored set id plus exact membership. Unknown, malformed, missing, inherited, or
non-enumerable set ids → `invalid_set` with the original state reference. Missing, extra,
duplicate, unknown, inherited, or non-enumerable components → `incomplete_set`. Success immutably
stamps `reliquary_key_set` → `{ mode: 'stored', components }` in authored order; repeated writes
are idempotent in meaning.

`transitionRestrictedObjectRelease(state, { setId, mode, components })` requires exact membership
and a legal current mode. `stored` → `inspection` is physical removal and does not authorize
testing. `stored` → `testing` → `illegal_transition`. `inspection` → `testing` is the restricted
operational release. Omitted current state, same-mode, and reverse transitions fail-close
`illegal_transition`. Failures return the original state reference.

`resolveRestrictedObjectRelease(state, { setId })` is read-only and applies the same fail-closed
set-id validation. Unknown or malformed set id → `invalid_set`. Omitted or absent release state
resolves `mode: 'unknown'`. A persisted snapshot returns that mode and authored components.
Resolve returns the same state reference and does not stamp. Hydration does not replay record or
transition, and omitted persisted input does not inherit release state from the hydration
fallback.

## Deferred

| Item or mechanic                        | Owner or prerequisite                                     | Why deferred                                              |
| --------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------- |
| SPE-1027 AC9 secured-node threat        | [SPE-2933](https://linear.app/spectranoir/issue/SPE-2933) | Stored-content threat/theft/access is a separate contract |
| Transport / active_use extra modes      | later SPE-1027 / SPE-1456 child                           | Three modes satisfy AC8; no logistics simulator           |
| Appraisal / authenticity verification   | [SPE-565](https://linear.app/spectranoir/issue/SPE-565)   | No detection or reveal loop in this slice                 |
| Personnel clearance                     | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) | Do not create a parallel clearance system                 |
| Evidence chain-of-custody               | [SPE-867](https://linear.app/spectranoir/issue/SPE-867)   | Operational custody only                                  |
| Logistics-flow layer                    | [SPE-1456](https://linear.app/spectranoir/issue/SPE-1456) | Mode tag is not a carrier/route simulator                 |
| Vault security                          | [SPE-1042](https://linear.app/spectranoir/issue/SPE-1042) | Not a vault-architecture implementation                   |
| Seal-opening hazard release             | [SPE-1621](https://linear.app/spectranoir/issue/SPE-1621) | Authorized object modes, not seal breach                  |
| Low-grade anomaly storage policy        | [SPE-1314](https://linear.app/spectranoir/issue/SPE-1314) | One concrete set, not the policy umbrella                 |
| Quarantine, hauling, capacity, and lots | later SPE-1027 children                                   | Broader warehouse operations remain outside AC8           |
| Player command / UI                     | later SPE-1027 / topology UI child                        | Domain helper only this slice                             |
| Production starting-state seed          | later SPE-1027 child                                      | Match the unseeded optional facility-map pattern          |
| Week-close automation and events        | later integration child                                   | Caller-owned helper and persisted map only                |

## Acceptance

- Record a complete `reliquary_key_set` in `stored` and resolve → `ok`; `mode: 'stored'`
- `stored` → `inspection` succeeds and resolve is `inspection`, not `testing`
- `stored` → `testing` → `illegal_transition`; original state reference returned
- `inspection` → `testing` succeeds for the complete set
- Incomplete, extra, duplicate, unknown, inherited, or hidden components → `incomplete_set`
- Unknown, raw, missing, inherited, or non-enumerable set id → `invalid_set`
- Record is immutable and idempotent in meaning; parser/writer snapshots are frozen; resolve is read-only
- Hydration accepts only own enumerable valid authored siblings, drops malformed siblings independently, and does not inherit omitted fallback release state
- Save/load preserves a valid snapshot without replaying a command
- Unrelated facility state including `facilityProtectionGoods` is preserved and `consumeFacilityStock` remains unchanged and ungated
- SPE-2890 stock-class clearance/wrong-zone remains regression-clean and is not recoded
- Parent SPE-1027 remains Backlog; SPE-1052 remains Backlog; SPE-877 remains Backlog

## Validation

- `npm run test:run -- src/test/facilityRestrictedObjectRelease.contract.test.ts`
- `npm run test:run -- src/test/sim.validation.test.ts`
- `npm run test:run -- src/test/facilityStockAccess.contract.test.ts`
- `npm run test:run`
- `npm run lint`
- `npm run verify:backlog-handoff`
- `npm run format:check`
- `git diff --check`

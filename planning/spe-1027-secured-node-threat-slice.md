# SPE-2933 — Secured-node stored-content threat attraction and theft exposure (parent AC9)

| Field               | Value                                                                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **Recently shipped**                                                                                                                                |
| **Linear**          | [SPE-2933](https://linear.app/spectranoir/issue/SPE-2933/secured-node-stored-content-threat-attraction-and-theft-exposure)                          |
| **Parent**          | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027/facility-storage-evidence-and-logistics-stockpile-model) — stays **Backlog**               |
| **Grandparent**     | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog**                   |
| **Related**         | [SPE-2890](https://linear.app/spectranoir/issue/SPE-2890) / [SPE-2911](https://linear.app/spectranoir/issue/SPE-2911) — inspect only; do not recode |
| **Branch**          | `cursor/spe-1027-secured-node-threat-3400`                                                                                                          |
| **Base `main` SHA** | `a3a8a3c18d60baa8bcbc9ff1ea6db8c81fb43af9`                                                                                                          |

## Pre-coding summary

**Status on `main`:** not implemented. `facilitySecuredNodes` is absent from `src/` and
`SCHEMA_REGISTRY.md`. SPE-2911 shipped AC8; remaining parent AC is AC9.

**Relevant files:** `src/domain/facilityRestrictedObjectRelease.ts` +
`src/test/facilityRestrictedObjectRelease.contract.test.ts` (optional-map pattern);
`src/domain/facilityProtectionGoods.ts` + `src/test/facilityProtectionGoods.contract.test.ts`;
`src/app/store/runTransfer.ts` (hydrate + `stripUndefinedFields`); `src/domain/models.ts`;
`src/domain/facilityStockAccess.ts` / SPE-2890 tests (regression only);
`SCHEMA_REGISTRY.md`; `planning/spe-1027-restricted-object-release-slice.md`;
`planning/backlog.md` + `planning/backlog-handoff-manifest.json`.

**Current behavior:** a secured storage node has no compact stored-content identity and no
content-dependent threat attraction, theft exposure, or access-risk scoring. Omit, mundane
records, and a high-threat stored asset are not distinguishable.

**Expected behavior:** one authored `relic_vault` persists compact stored-content
`mundane_records` | `anomalous_relic`. Omit/absent resolve is `unknown` on all three bands, not
elevated. Mundane stored content resolves `low`. The high-threat asset resolves `elevated`.
Invalid/inherited/hidden node or content fail-closes with the original state reference. Save/load
preserves valid snapshots; malformed siblings drop independently.

**Boundary:** SPE-1027 AC9 only. New optional `GameState` sibling map. No warehouse, UI, events,
week-close, seed, version bump, SPE-2890 recode, or SPE-2911 recode.

**Risks:** hydration fallback inheritance; parser accepting inherited/hidden keys; treating omit
as mundane or mundane as elevated; mixing this map into stockpile, placement, or restricted-object
release.

**Validation:** `src/test/facilitySecuredNodes.contract.test.ts`, then
`src/test/sim.validation.test.ts`, SPE-2890 tests, full suite, lint, backlog-handoff, format,
`git diff --check`.

**Docs:** this slice doc, `SCHEMA_REGISTRY.md`, `planning/backlog.md`,
`planning/backlog-handoff-manifest.json`. SPE-2911 deferred AC9 row points at SPE-2933.

## Boundary

Ship one authored secured node so SPE-1027’s ninth AC is true: what is stored there changes threat
attraction, theft exposure, or access risk.

Reuse the optional-map parse/hydrate pattern from `facilityRestrictedObjectRelease` and
`facilityProtectionGoods`. Do not recode SPE-2887 `consumeFacilityStock`, SPE-2870 blast-door
repair, SPE-2890 `handleAccessControlledStock`, SPE-2891 spoilage, SPE-2892 caches, SPE-2895
overflow, SPE-2896 preparedness, SPE-2897 protection goods, or SPE-2911 restricted-object
release. Do not mix this map into spare-part quantity, placement, condition/spoilage, caches,
overflow, preparedness, protection goods, or restricted-object release. Do not debit or gate
`facilityStockpile` or catalog `GameState.inventory`. Do not add player UI, production
starting-state seed, week-close automation, events, SPE-1042 vault architecture, SPE-1046
clearance, SPE-867 evidence chain-of-custody, SPE-1456 logistics-flow, SPE-1621 seal-opening
hazard, SPE-1314 policy umbrella, warehouse capacity, or version bumps. Do not close SPE-1027,
SPE-1052, or SPE-877.

## Seam

`GameState.facilitySecuredNodes` is an optional map of authored node ids (`relic_vault`) to
compact stored-content ids (`mundane_records` | `anomalous_relic`).
`parseFacilitySecuredNodes` hydrates through `runTransfer`: omit / non-record / empty after
sanitize → undefined. Only own enumerable authored string-key entries participate; inherited,
non-enumerable, symbol, unknown, integer-index, prototype-unsafe, and invalid-content siblings
drop independently. Valid entries are rebuilt in authored node-id order, and domain parser/writer
snapshots are frozen.

`stampSecuredNodeContents(state, { nodeId, contentId })` is caller-owned and accepts only an own
enumerable authored node id plus authored content id. Unknown, malformed, missing, inherited, or
non-enumerable node ids → `invalid_node` with the original state reference. Unknown, malformed,
missing, inherited, or non-enumerable content ids → `invalid_content`. Success immutably stamps
`relic_vault` → the authored content id; repeated identical writes are idempotent in meaning.

`resolveSecuredNodeThreat(state, { nodeId })` is read-only and applies the same fail-closed
node-id validation. Unknown or malformed node id → `invalid_node`. Omitted or absent node contents
resolve `threatAttraction` / `theftExposure` / `accessRisk` as `unknown` (not elevated). Mundane
stored content resolves `low` on all three bands. `anomalous_relic` resolves `elevated` on all
three bands. Empty/omit is not mundane, and mundane is not the high-threat asset. Resolve returns
the same state reference and does not stamp. Hydration does not replay stamp or resolve, and
omitted persisted input does not inherit contents from the hydration fallback.

## Deferred

| Item or mechanic                                                               | Owner or prerequisite                                     | Why deferred                                       |
| ------------------------------------------------------------------------------ | --------------------------------------------------------- | -------------------------------------------------- |
| Quarantine, hauling, lots, typed overflow/loss, misfile, capacity-as-warehouse | later SPE-1027 children                                   | Broader warehouse operations remain outside AC9    |
| Parent targeted tests for hauling/quarantine/mismatch                          | later SPE-1027 children                                   | Parent AC language remains open even after AC1–AC9 |
| Personnel clearance                                                            | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) | Do not create a parallel clearance system          |
| Evidence chain-of-custody                                                      | [SPE-867](https://linear.app/spectranoir/issue/SPE-867)   | Stored-content scoring only                        |
| Vault security                                                                 | [SPE-1042](https://linear.app/spectranoir/issue/SPE-1042) | Not a vault-architecture implementation            |
| Seal-opening hazard release                                                    | [SPE-1621](https://linear.app/spectranoir/issue/SPE-1621) | Stored-content scoring, not seal breach            |
| Logistics-flow layer                                                           | [SPE-1456](https://linear.app/spectranoir/issue/SPE-1456) | No hauling or carrier/route simulator              |
| Low-grade anomaly storage policy                                               | [SPE-1314](https://linear.app/spectranoir/issue/SPE-1314) | One concrete node, not the policy umbrella         |
| Player command / UI                                                            | later SPE-1027 / topology UI child                        | Domain helper only this slice                      |
| Production starting-state seed                                                 | later SPE-1027 child                                      | Match the unseeded optional facility-map pattern   |
| Week-close automation and events                                               | later integration child                                   | Caller-owned helper and persisted map only         |

## Acceptance

- Stamp complete `relic_vault` + `anomalous_relic` and resolve → `ok`; all three bands `elevated`
- Stamp `relic_vault` + `mundane_records` and resolve → `ok`; all three bands `low`, distinct from elevated
- Omitted or absent node contents resolve → `ok`; all three bands `unknown`, not elevated and not mundane
- Unknown, raw, missing, inherited, or non-enumerable node id → `invalid_node`; original state reference returned
- Unknown, raw, missing, inherited, or non-enumerable content id → `invalid_content`; original state reference returned
- Stamp is immutable and idempotent in meaning; parser/writer snapshots are frozen; resolve is read-only
- Hydration accepts only own enumerable valid authored siblings, drops malformed siblings independently, and does not inherit omitted fallback contents
- Save/load preserves a valid snapshot without replaying stamp
- Unrelated facility state including `facilityRestrictedObjectRelease` and `facilityProtectionGoods` is preserved and `consumeFacilityStock` remains unchanged and ungated
- SPE-2890 stock-class clearance/wrong-zone remains regression-clean and is not recoded
- Parent SPE-1027 remains Backlog; SPE-1052 remains Backlog; SPE-877 remains Backlog

## Validation

- `npm run test:run -- src/test/facilitySecuredNodes.contract.test.ts`
- `npm run test:run -- src/test/sim.validation.test.ts`
- `npm run test:run -- src/test/facilityStockAccess.contract.test.ts`
- `npm run test:run`
- `npm run lint`
- `npm run verify:backlog-handoff`
- `npm run format:check`
- `git diff --check`

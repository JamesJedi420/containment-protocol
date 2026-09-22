# SPE-2984 — Parent targeted-test language leftovers

| Field               | Value                                                                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**          | **In Progress**                                                                                                                                                                                                             |
| **Linear**          | [SPE-2984](https://linear.app/spectranoir/issue/SPE-2984/parent-targeted-test-language-leftovers-storage-zoning-staging-hauling)                                                                                            |
| **Parent**          | [SPE-1027](https://linear.app/spectranoir/issue/SPE-1027/facility-storage-evidence-and-logistics-stockpile-model) — evaluate **Done** only after this child ships and every parent AC bullet is true; else stay **Backlog** |
| **Grandparent**     | [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052/core-facility-institution-and-base-simulation-model) — stays **Backlog**                                                                                           |
| **Related**         | SPE-2890 zoning; SPE-2889 staging; SPE-2935 hauling; SPE-2891 spoilage; SPE-2934 quarantine; SPE-2981 mismatch (compose-only). Inspect-only: SPE-2895 / 2896 / 2980 / 2982                                                  |
| **Branch**          | `cursor/spe-1027-parent-targeted-test-language-2e4e`                                                                                                                                                                        |
| **Base `main` SHA** | `f64d257c76259ddc7c0dbfd0057fa4150da413c6` (`f64d257c` — SPE-2982 Phase 4 near-capacity merge #3780)                                                                                                                        |

## Pre-coding summary

**Status on `main` at base:** SPE-2982 capacity-as-warehouse (incl. Phase 4) is Done.
Remaining SPE-1027 parent leftover is the AC phrase: targeted tests cover
deterministic storage zoning, local staging, hauling bottlenecks, spoilage,
quarantine separation, and inventory mismatch outcomes. Child contracts exist;
no parent-targeted compose suite asserts those six phrases together.

**Relevant files:** `src/domain/facilityStockAccess.ts` +
`src/test/facilityStockAccess.contract.test.ts` (SPE-2890);
`src/domain/departmentLocalStaging.ts` +
`src/domain/departmentWorkshopQueue.ts` (`resolveDepartmentWorkshopThroughput`) +
`src/test/departmentLocalStaging.contract.test.ts` (SPE-2889);
`src/domain/facilityHaulingLabor.ts` +
`src/test/facilityHaulingLabor.contract.test.ts` (SPE-2935);
`src/domain/facilityStockSpoilage.ts` +
`src/test/facilityStockSpoilage.contract.test.ts` (SPE-2891);
`src/domain/facilityStockQuarantine.ts` +
`src/test/facilityStockQuarantine.contract.test.ts` (SPE-2934);
`src/domain/facilityInventoryMismatch.ts` +
`src/test/facilityInventoryMismatch.contract.test.ts` (SPE-2981);
`src/domain/facilityStockpile.ts` (consume ungated); `planning/backlog.md` +
`planning/backlog-handoff-manifest.json`.

**Current behavior:** Each seam has its own child contract suite. Parent AC
targeted-test language is not asserted as one compose surface.

**Expected behavior:** One focused Vitest file composes parent-targeted
assertions over the six shipped seams. Omit/absent baselines do not falsely
satisfy parent outcomes. No new GameState maps, SCHEMA fields, UI, seed, or
week-close. `consumeFacilityStock` stays ungated. SPE-2895 / 2896 / 2980 / 2982
are inspect-only.

**Boundary:** Parent targeted-test language leftovers only. Contracts only.
Do not invent maps; do not gate consume; do not recode shipped children.

**Risks:** Over-claiming parent Done; duplicating full child contract suites;
inventing maps; gating consume; changing UI/seed/week-close.

**Validation:** `src/test/spe1027ParentTargetedTestLanguage.contract.test.ts`,
then adjacent child contract smoke, lint, backlog-handoff, format,
`git diff --check`.

**Docs:** this slice doc, `planning/backlog.md`,
`planning/backlog-handoff-manifest.json`. No SCHEMA (no persistence change).

## Boundary

Ship parent-targeted contract coverage so SPE-1027’s leftover AC phrase is true:

> targeted tests cover deterministic storage zoning, local staging, hauling
> bottlenecks, spoilage, quarantine separation, and inventory mismatch outcomes

Compose over shipped seams. Do not invent parallel warehouse authorities. Do not
recode SPE-2890 / 2889 / 2935 / 2891 / 2934 / 2981 beyond importing helpers. Do
not change SPE-2895 / 2896 / 2980 / 2982 beyond inspect. Do not add player UI,
production seed, week-close automation, events, or version bumps. Do not debit
or gate `consumeFacilityStock`. Do not close SPE-1052 or SPE-877.

## Seam

| Parent leftover phrase | Shipped seam                                                                   |
| ---------------------- | ------------------------------------------------------------------------------ |
| storage zoning         | SPE-2890 `handleAccessControlledStock` (clearance + wrong-zone)                |
| local staging          | SPE-2889 staging conditions → SPE-2775 `resolveDepartmentWorkshopThroughput`   |
| hauling bottlenecks    | SPE-2935 `stampFacilityHaulingLabor` / `resolveFacilityHaulBottleneck`         |
| spoilage               | SPE-2891 `applyIncorrectStorageSpoilage`                                       |
| quarantine separation  | SPE-2934 `stampFacilityQuarantine` / `resolveFacilityQuarantineSeparation`     |
| inventory mismatch     | SPE-2981 `stampFacilityInventoryMismatch` / `resolveFacilityInventoryMismatch` |

Parent suite asserts satisfying outcomes and omit/absent non-satisfying baselines.
It does not re-prove full child fail-closed hydration matrices.

## Deferred

| Item or mechanic               | Owner or prerequisite                                     | Why deferred                                   |
| ------------------------------ | --------------------------------------------------------- | ---------------------------------------------- |
| Player command / UI            | later SPE-1027 / topology UI child                        | Contracts only this slice                      |
| Production starting-state seed | later SPE-1027 / SPE-1052 child                           | Match unseeded optional facility-map pattern   |
| Week-close automation/events   | later integration child                                   | Compose over helpers; no new week-close wiring |
| Multi-node warehouse network   | later SPE-1027 / SPE-1052 child                           | Outside parent targeted-test AC phrase         |
| Personnel clearance umbrella   | [SPE-1046](https://linear.app/spectranoir/issue/SPE-1046) | Do not create parallel clearance               |
| Evidence chain-of-custody      | [SPE-867](https://linear.app/spectranoir/issue/SPE-867)   | Compose mismatch only                          |
| Vault security architecture    | [SPE-1042](https://linear.app/spectranoir/issue/SPE-1042) | Not vault architecture                         |
| Logistics-flow layer           | [SPE-1456](https://linear.app/spectranoir/issue/SPE-1456) | No carrier/route simulator                     |

## Acceptance

- Focused Vitest asserts all six leftover parent phrases via shipped seams
- Omit/absent/incomplete paths do not falsely satisfy those outcomes
- No new GameState maps, SCHEMA persistence fields, UI, seed, or week-close
- `consumeFacilityStock` remains ungated
- SPE-2895 / 2896 / 2980 / 2982 remain inspect-only (not recoded)
- Slice doc + backlog handoff updated
- Child Done only after merge; parent Done only if full SPE-1027 AC list is then true, else parent Backlog; SPE-1052 / SPE-877 stay Backlog; GitHub #1036 follows parent closure decision

## Validation

- `npm run test:run -- src/test/spe1027ParentTargetedTestLanguage.contract.test.ts`
- `npm run test:run -- src/test/facilityStockAccess.contract.test.ts src/test/departmentLocalStaging.contract.test.ts src/test/facilityHaulingLabor.contract.test.ts src/test/facilityStockSpoilage.contract.test.ts src/test/facilityStockQuarantine.contract.test.ts src/test/facilityInventoryMismatch.contract.test.ts src/test/facilityStockpile.contract.test.ts`
- `npm run lint`
- `npm run verify:backlog-handoff`
- `npm run format:check`
- `git diff --check`

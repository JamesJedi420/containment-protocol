# SPE-31 — Town-first contract generation slice

One-page implementation plan. Linear: [SPE-2469](https://linear.app/spectranoir/issue/SPE-2469).

| Field | Value |
| --- | --- |
| **Linear** | [SPE-2469](https://linear.app/spectranoir/issue/SPE-2469) — Town-first contract generation from civic tag packets |
| **Parent** | [SPE-31](https://linear.app/spectranoir/issue/SPE-31) |
| **Branch** | `spe-31-town-first-contract-generation-slice` |
| **Status** | In progress |
| **Base `main` SHA** | `3be8987b` |

## Goal

Derive bounded contract-offer inputs from existing civic/town tag packets without recomputing hub simulation on Front Desk and without a parallel contract subsystem.

## Scope

| In | Out |
| --- | --- |
| `deriveTownContractPacketContext` + selection bias in `generateContractOffers` | Front Desk raw packet surfacing |
| Town/pressure/value-stream tags on `buildContractCaseSkeleton` when packets present | `generateHubState` changes |
| Ingest via `getWeeklyCaseGenerationSeamInput` (neighborhood, rumor, credit, access, authority) | Mission triage, SPE-2466/2467/2468 hub cards |

## Acceptance

- [x] Civic packet fixture → contract preview carries district/pressure/value-stream tags
- [x] No packets → unchanged baseline contract preview tags
- [x] Weekly strategy mix (4 offers, 4 strategy tags) preserved with packets present
- [x] `npm run test:run -- src/test/townContractGeneration.test.ts src/test/contracts.test.ts` passes
- [x] `npm run lint` passes

## Key files

- `src/domain/townContractGeneration.ts` — packet context, value-stream slug, tag merge, selection bias
- `src/domain/contracts.ts` — hooks in `buildSelectionScore` and `buildContractCaseSkeleton`
- `src/test/townContractGeneration.test.ts` — unit + integration coverage

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| `applySiteGenerationToCase` on launched contract cases | SPE-31 follow-up | Spawn path already applies site gen; contracts stay on existing skeleton path this slice |
| Multi-district contract board slots | SPE-31 follow-up | Bounded to one town lead per refresh |
| SPE-31 parent closure | SPE-31 | Town-first generation was last named deferred child; confirm umbrella acceptance before parent **Done** |

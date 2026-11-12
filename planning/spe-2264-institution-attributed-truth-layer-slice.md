# SPE-2264 — Institution-attributed truth-layer extension (slice 1)

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** |
| **Issue** | [SPE-2264](https://linear.app/spectranoir/issue/SPE-2264/institution-attributed-truth-layer-extension-public-agency-faction) |
| **Parent** | [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) (stays Backlog) |
| **Branch** | `jamesdyedbq/spe-2264-institution-attributed-truth-layer-extension-public-agency` |
| **Base main SHA** | `8d23b796` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `8d23b796`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c88ed291`)  
**Decision:** `delegated_approve` SPE-2264  

## Approved boundary

- Additive `institutionalAttribution` + optional `simulationAuthorityRef` on existing `TruthLayerRecord`
- Helpers: `listInstitutionAttributedModelsForSubject`, `resolveSimulationAuthorityForSubject`
- Sanitize drops unknown attribution tokens (legacy-safe)
- Extend SCHEMA_REGISTRY + targeted tests
- No second registry / GameState map / parallel knowledge system

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Historical continuity board | SPE-2099 | Distinct chronology owner |
| Shared-universe entity registry | SPE-3335 | Larger adjacent slice |
| New UI subsystem | out of slice | Explicit non-goal |

## Validation

- `npx vitest run src/test/truthLayerRecordRegistry.test.ts`

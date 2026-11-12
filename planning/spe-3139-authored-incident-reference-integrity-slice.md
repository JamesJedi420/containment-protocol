# SPE-3139 — Authored incident reference integrity validator

| Field | Value |
| --- | --- |
| **Status** | **Recently shipped** |
| **Issue** | [SPE-3139](https://linear.app/spectranoir/issue/SPE-3139/authored-incident-reference-integrity-validator) |
| **Parent** | [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) (stays Backlog) |
| **Branch** | `jamesdyedbq/spe-3139-authored-incident-reference-integrity-validator` |
| **Base main SHA** | `9e25f8da` |

## Delegated approval

**Date:** 2026-10-28  
**main SHA:** `9e25f8da`  
**Authority:** delegated (`origin/main` `docs/cursor-delegated-backlog-approval.md` @ blob `c88ed291`)  
**Decision:** `delegated_approve` SPE-3139  

### Decision criteria (summary)

- Queue: SPE-2265 Done; clean main; no open PRs
- Compared: SPE-3139 vs SPE-2264 / SPE-3335 / SPE-2099 / SPE-3338 tooling IP
- Winner: SPE-3139 — SPE-3282 `reference_integrity` seam; pure authoring-time validator; coherent after SPE-2265
- Not parent; no blockers; no scope expansion

## Approved boundary

- Pure `authoredIncidentReferenceIntegrity` over caller-supplied record batches
- Dangling / wrong-kind / unreachable / exemption / multi-root / cycle / release-context diagnostics
- Optional SPE-3300 bound-release membership for shared-universe promoted refs
- SCHEMA_REGISTRY + targeted tests
- No GameState; no content registry; no auto-repair; no CI lint wiring

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Runtime validation hook | out of slice | Explicit non-goal |
| Template grammar / chronology | SPE-48 / SPE-696 / SPE-822 / SPE-2099 | Distinct owners |
| Shared-universe entity registry | SPE-3335 | Larger adjacent slice |

## Validation

- `npx vitest run src/domain/authoredIncidentReferenceIntegrity.test.ts`

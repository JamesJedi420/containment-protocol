# SPE-2771 — Project live operational state into workshop safety conditions

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-2771](https://linear.app/spectranoir/issue/SPE-2771) |
| **Parent** | [SPE-1896](https://linear.app/spectranoir/issue/SPE-1896) — Backlog |
| **Branch** | `jamesdyedbq/spe-2771-project-live-operational-state-into-workshop-safety` |
| **Base main SHA** | `1425956ebc074157ecb621ad26af510c242a7a81` |

## Delegated approval

**Decision:** `delegated_approve` SPE-2771  
**Authority:** `docs/cursor-delegated-backlog-approval.md` on `origin/main` @ `c88ed2915b1a02d632ce0e9f9a45e0b0b87d1753`  
**Date:** 2026-10-27  
**Continuation:** Explicit user ship-loop request (Hermes unavailable)

### Queue state

- Manifest `primary`: SPE-1052; SPE-3441 merged (PR #4434 @ `1425956e`)
- Clean `main` at pick; no open PRs
- Branch created before audit evidence

### Candidates compared

| Candidate | Verdict |
| --- | --- |
| **SPE-2771** | Winner — staff PPE + dualAuth live projection after SPE-3441 |
| SPE-3439 / SPE-3452 | Hard blocked |
| SPE-3451 | Defer — larger UI/construction AC bar |
| SPE-2794 | Parent umbrella |
| SPE-1052 / SPE-1896 umbrellas | Rejected |

### Eligibility checklist

All true.

### Prohibitions honored

No new Linear issue/relationship; parent umbrellas not coding slice; PR review/CI mandatory.

## Boundary

- Keep SPE-2772 facility projection for **isolation** and **ventilation**
- Project **PPE** from assigned staff loadout via SPE-3441 demand packets (not facility active status)
- Project **dualAuth** from assigned staff presence + agency clearance vs authored minimum
- Pass composed conditions through existing live completion registration → `resolveDepartmentWorkshopCompletionSafety`
- Unresolved / unmapped axes default safely (`good`) with inspectable fallback reason codes
- No second safety grader, queue, schema, or week-close hook

## Deferred

| Item | Owner | Why |
| --- | --- | --- |
| Additional department operational mappings | Future authored ownership | Only biohazard production mapping in this slice |
| Affiliation site-clearance grants as dualAuth source | SPE-1046 / clearance owners | Agency clearance is the shipped authoritative numeric gate |
| Richer workshop staff assignment than `workshop_ops` tag | Staffing / SPE-1058 adjacent | Tag is the explicit production assignment signal this slice; roster auto-count rejected |
| Broader equipment axes beyond PPE demand | SPE-877 / SPE-1028 | Integrity quality already separate |

## Implementation

- Domain: `src/domain/departmentWorkshopOperationalSafety.ts`
- Assigned staff = active + authored role + `workshop_ops` tag (avoids auto-counting roster medics)
- PPE check mirrors SPE-3441 medic/`hazmat_suit` fixture without importing equipment catalog (avoids week-close circular init)
- Compose in: `src/domain/departmentWorkshopLiveFacilitySafety.ts`
- Facility mapping: drop provisional PPE axis binding for biohazard (isolation + ventilation only)
- Docs: `docs/department-workshop-queue-audit.md`
- Tests: operational safety unit + live integration updates

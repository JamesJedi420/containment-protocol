# SPE-1135 — Duty and obligation registry

| Field | Value |
| --- | --- |
| **Status** | **In progress** |
| **Issue** | [SPE-1135](https://linear.app/spectranoir/issue/SPE-1135) |
| **Parent** | CP-core taxonomy / schema milestone |
| **Branch** | `jamesdyedbq/spe-1135-duty-and-obligation-registry` |
| **Base main SHA** | `852c49a181b686705e60bff13bcfb1055a55104e` |

## Approved boundary

- Pure domain `src/domain/dutyObligationRegistry.ts` — compact role obligations, omission vs terminal-window distinction (SPE-2805-shaped provenance input refs only), period-bound qualification (SPE-1071 integer weeks), downstream `evaluateDutyAgainstRequirementOutcome` consuming SPE-3181 `DutyConsumptionProjection`
- Re-export consumer seam from `src/domain/containmentRequirementFulfillment.ts`
- Vitest `src/domain/dutyObligationRegistry.test.ts` plus contract test extension for downstream wiring
- SCHEMA_REGISTRY evidence-only note
- No GameState field; no SPE-3041 task activation engine; no full contractual conflict engine (C29 seams/refs deferred)

## Linear acceptance mapping

| AC | Evidence |
| --- | --- |
| Role carries explicit obligations | `DEMO_DUTY_OBLIGATION_REGISTRY` + `lookupObligationsForRole` for `field_lead` / `archivist` |
| Omission evaluated against duty | `evaluateOmissionAgainstDuty` actionable vs terminal vs explicit refusal |
| Downstream consumes duty state | `evaluateDutyAgainstRequirementOutcome` + contract test via `projectDutyConsumptionFromRequirement` |
| Targeted tests | Vitest duty lookup, omission, period compliance, downstream effects |

## Reconciliation coverage (bounded)

| Theme | In slice | Notes |
| --- | --- | --- |
| Actionable omission vs expired terminal window | Yes | `Spe2805TerminalDecisionProvenance` input; no SPE-2805 implementation |
| Period-bound qualifying obligation | Yes | `evaluatePeriodBoundObligation` with authoritative week ints |
| Repair-safe provenance | Partial | Terminal kinds suppress false breach; no persistence repair loop |
| Contractual duty collision (C29) | Deferred | Refs only; no parallel employer/conflict engine |

## Deferred

| Item | Owner | Why deferred |
| --- | --- | --- |
| GameState persistence / week-close wiring | Future SPE-1135+ | Pure registry first per slice constraint |
| Full SPE-2805 lifecycle | SPE-2805 | Provenance shape consumed as caller input only |
| SPE-3041 recurring work activation from obligations | SPE-3041 | Seam reference only |
| Contractual conflict resolution engine | SPE-1635 / SPE-119 / policy consumers | C29 planning-only reconciliation |

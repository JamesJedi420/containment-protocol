# SPE-1023: Unauthorized Enhancement Lifecycle

**Status:** Recently shipped

**Issue:** SPE-1023 - Unauthorized enhancement lifecycle

**Branch:** `jamesdyedbq/spe-1023-unauthorized-enhancement-lifecycle`

**PR:** #4343 (merged)

**Linear Issue:** https://linear.app/spectranoir/issue/SPE-1023

## Goal

Implement a bounded unauthorized-enhancement layer so hidden treatments can improve capability, create dependency, produce overdose, and collapse under exposure without cleanly fitting either medicine or poisoning alone.

## Scope

- Support illicit or unauthorized treatment programs running alongside official medicine inside institutions
- Support apparent restoration of cognition, mobility, art skill, perception, or other capabilities that exceed normal expectations
- Support hidden supply chains, patient hoarding, missing inventory, self-dosing, and secrecy around dosage control
- Support overdose clocks, acute collapse, and treatment thresholds where the same substance can help, amplify danger, or kill
- Support conflict between official treatment explanations and hidden enhancement mechanisms
- Support moral ambiguity where the unlawful helper is motivated by genuine care while still creating uncontrolled harm
- Distinguish unauthorized enhancement from standard prescriptions, simple doping, or one-off antidote use
- Connect the layer to care-facility degradation, perception gating, and administrative partial closure systems

## Constraints

- Deterministic only
- No full pharmacology simulator
- No assumption that improvement means safety or that official records are complete
- Prefer compact supply, effect, dependency, and overdose states over sprawling medical prose
- Keep current treatment source, dose state, and enhancement cost legible enough for planning and debugging

## Acceptance Criteria

- At least one hidden treatment changes a configured subject capability, condition, or vulnerability value in a way that alters the case branch or required investigation step
- At least one beneficiary conceals, hoards, or self-doses the unauthorized supply
- At least one overdose or instability event emerges from the same treatment that previously helped
- At least one official medical explanation remains incomplete because a parallel hidden treatment track exists
- Targeted tests cover deterministic enhancement, dependency, overdose, and exposure-collapse outcomes

## Implementation Status

### Completed

- ✅ Domain implementation: `src/domain/unauthorizedEnhancement.ts`
  - Types: `UnauthorizedTreatment`, `EnhancementState`, `SupplyState`, `DependencyState`, `OfficialRecordState`, `OverdoseState`, `PatientState`
  - Functions: `calculateEnhancementLevel`, `calculateDependencyRisk`, `calculateOverdoseRisk`, `isOverdoseCrossed`, `simulateTimePassage`, `checkForCollapse`, `applyCollapseResult`, `initializePatient`, `administerEnhancement`, `simulateOfficialReview`
  
- ✅ Tests: `src/domain/unauthorizedEnhancement.test.ts`
  - Tests for all acceptance criteria
  - Coverage: enhancement decay, supply concealment, hoarding detection, overdose progression, collapse events, incomplete official diagnosis

### Remaining

- ⏳ Update Linear issue to In Progress with delegated approval
- ⏳ Open PR on GitHub
- ⏳ Run validation evidence (lint, type check)
- ⏳ Babysit CI + review threads
- ⏳ Merge when green
- ⏳ Linear Done + merge evidence
- ⏳ Sync main

## Files Modified

- `src/domain/unauthorizedEnhancement.ts` (17,742 bytes)
- `src/domain/unauthorizedEnhancement.test.ts` (28,131 bytes)

## Next Steps

1. Update Linear issue to In Progress
2. Open PR #4343
3. Run validation (lint, type check)
4. Babysit CI + review threads
5. Merge when green
6. Mark Linear Done
7. Sync main

## Notes

This is a leaf SPE with no children. No umbrella issues to worry about.

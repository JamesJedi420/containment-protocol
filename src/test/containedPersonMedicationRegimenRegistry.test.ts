import { describe, expect, it } from 'vitest'
import {
  COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE,
  VOLUNTARY_STABILIZER_REGIMEN_FIXTURE,
  validateMedicationRegimenRecord,
  projectMedicationInteractionRisk,
} from '../domain/containedPersonMedicationRegimenRegistry'

describe('containedPersonMedicationRegimenRegistry (SPE-1886 slice 1)', () => {
  it('validates voluntary stabilizer fixture without errors', () => {
    const result = validateMedicationRegimenRecord(VOLUNTARY_STABILIZER_REGIMEN_FIXTURE)
    expect(result.valid).toBe(true)
    expect(result.issues.filter((issue) => issue.severity === 'error')).toHaveLength(0)
  })

  it('projects elevated interaction risk for compelled regimen with adverse reaction', () => {
    const projection = projectMedicationInteractionRisk(COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE)

    expect(projection.adverseReactionFlag).toBe(true)
    expect(projection.consentStatus).toBe('compelled')
    expect(projection.interactionRiskScore).not.toBeNull()
    expect(projection.interactionRiskScore).toBeGreaterThan(0.5)
  })

  it('returns warning-only validation for compelled regimen without containment purpose', () => {
    const warningOnly = {
      ...COMPELLED_ADVERSE_REACTION_REGIMEN_FIXTURE,
      id: 'medication-regimen:warning-only-compelled',
      containmentPurposeLabel: undefined,
    }

    const result = validateMedicationRegimenRecord(warningOnly)
    expect(result.valid).toBe(true)
    expect(result.issues.some((issue) => issue.code === 'compelled_without_containment_purpose')).toBe(
      true
    )
  })

  it('rejects franchise tokens in record label', () => {
    const invalid = {
      ...VOLUNTARY_STABILIZER_REGIMEN_FIXTURE,
      id: 'medication-regimen:franchise-label',
      label: 'SCP division stabilizer regimen',
    }

    const result = validateMedicationRegimenRecord(invalid)
    expect(result.valid).toBe(false)
    expect(result.issues.some((issue) => issue.code === 'franchise_token_in_label')).toBe(true)
  })

  it('returns byte-stable validation on repeated calls', () => {
    const first = validateMedicationRegimenRecord(VOLUNTARY_STABILIZER_REGIMEN_FIXTURE)
    const second = validateMedicationRegimenRecord(VOLUNTARY_STABILIZER_REGIMEN_FIXTURE)

    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})

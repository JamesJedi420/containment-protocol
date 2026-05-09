import { describe, it, expect } from 'vitest'
import {
  validateCrossRoleActionProcedure,
  resolveCrossRoleAction,
  JOINT_EVIDENCE_PROCESSING,
} from '../domain/crossRoleActionProcedure'
import type {
  CrossRoleActionParticipant,
  CrossRoleActionProcedure,
  UnmetPrerequisiteDetail,
} from '../domain/crossRoleActionProcedure'

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makeParticipant(
  overrides: Partial<CrossRoleActionParticipant> & { agentId: string }
): CrossRoleActionParticipant {
  return {
    role: 'investigator',
    statDomains: {},
    itemTags: [],
    ...overrides,
  }
}

// ─── Procedure validation ─────────────────────────────────────────────────────

describe('validateCrossRoleActionProcedure', () => {
  it('accepts a fully valid procedure definition', () => {
    const result = validateCrossRoleActionProcedure({
      procedureId: 'joint_evidence_processing',
      label: 'Joint Evidence Processing',
      eligibleRoles: ['investigator', 'field_recon'],
      prerequisites: [{ type: 'min_stat', domain: 'insight', minValue: 3 }],
      requiredParticipantCount: 2,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected ok')
    }
    expect(result.procedure.procedureId).toBe('joint_evidence_processing')
    expect(result.procedure.eligibleRoles).toEqual(['investigator', 'field_recon'])
  })

  it('trims whitespace from procedureId and label', () => {
    const result = validateCrossRoleActionProcedure({
      procedureId: '  trimmed_id  ',
      label: '  Trimmed Label  ',
      eligibleRoles: ['investigator'],
      prerequisites: [],
      requiredParticipantCount: 1,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected ok')
    }
    expect(result.procedure.procedureId).toBe('trimmed_id')
    expect(result.procedure.label).toBe('Trimmed Label')
  })

  it('returns invalid_procedure_id for blank procedureId', () => {
    const result = validateCrossRoleActionProcedure({
      procedureId: '   ',
      label: 'Valid',
      eligibleRoles: ['investigator'],
      prerequisites: [],
      requiredParticipantCount: 1,
    })
    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected failure')
    }
    expect(result.error).toBe('invalid_procedure_id')
  })

  it('returns empty_label for blank label', () => {
    const result = validateCrossRoleActionProcedure({
      procedureId: 'valid_id',
      label: '',
      eligibleRoles: ['investigator'],
      prerequisites: [],
      requiredParticipantCount: 1,
    })
    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected failure')
    }
    expect(result.error).toBe('empty_label')
  })

  it('returns empty_eligible_roles for empty roles array', () => {
    const result = validateCrossRoleActionProcedure({
      procedureId: 'valid_id',
      label: 'Valid',
      eligibleRoles: [],
      prerequisites: [],
      requiredParticipantCount: 1,
    })
    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected failure')
    }
    expect(result.error).toBe('empty_eligible_roles')
  })

  it('returns invalid_participant_count for zero count', () => {
    const result = validateCrossRoleActionProcedure({
      procedureId: 'valid_id',
      label: 'Valid',
      eligibleRoles: ['investigator'],
      prerequisites: [],
      requiredParticipantCount: 0,
    })
    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected failure')
    }
    expect(result.error).toBe('invalid_participant_count')
  })

  it('returns invalid_prerequisite for negative min_stat value', () => {
    const result = validateCrossRoleActionProcedure({
      procedureId: 'valid_id',
      label: 'Valid',
      eligibleRoles: ['investigator'],
      prerequisites: [{ type: 'min_stat', domain: 'insight', minValue: -1 }],
      requiredParticipantCount: 1,
    })
    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected failure')
    }
    expect(result.error).toBe('invalid_prerequisite')
  })

  it('returns invalid_prerequisite for blank item_tag', () => {
    const result = validateCrossRoleActionProcedure({
      procedureId: 'valid_id',
      label: 'Valid',
      eligibleRoles: ['investigator'],
      prerequisites: [{ type: 'item_tag', tag: '   ' }],
      requiredParticipantCount: 1,
    })
    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected failure')
    }
    expect(result.error).toBe('invalid_prerequisite')
  })
})

// ─── Resolution ───────────────────────────────────────────────────────────────

describe('resolveCrossRoleAction — joint_evidence_processing exemplar', () => {
  it('succeeds when two eligible participants with prerequisites are present', () => {
    const result = resolveCrossRoleAction({
      procedure: JOINT_EVIDENCE_PROCESSING,
      participants: [
        makeParticipant({ agentId: 'a_alice', role: 'investigator', statDomains: { insight: 4 }, itemTags: ['evidence_kit'] }),
        makeParticipant({ agentId: 'a_bob', role: 'field_recon', statDomains: { insight: 3 }, itemTags: [] }),
      ],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected success')
    }
    expect(result.outcome).toBe('success')
    expect(result.contributingRoles).toContain('investigator')
    expect(result.contributingRoles).toContain('field_recon')
  })

  it('allows investigator role lane to satisfy prerequisites solo-stat + item', () => {
    const result = resolveCrossRoleAction({
      procedure: JOINT_EVIDENCE_PROCESSING,
      participants: [
        makeParticipant({ agentId: 'a_alice', role: 'investigator', statDomains: { insight: 5 }, itemTags: ['evidence_kit'] }),
        makeParticipant({ agentId: 'a_carol', role: 'field_recon', statDomains: {}, itemTags: [] }),
      ],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected success')
    }
    expect(result.outcome).toBe('success')
  })

  it('allows field_recon role lane to satisfy item prerequisite while partner covers stat', () => {
    const result = resolveCrossRoleAction({
      procedure: JOINT_EVIDENCE_PROCESSING,
      participants: [
        makeParticipant({ agentId: 'a_alice', role: 'investigator', statDomains: { insight: 4 }, itemTags: [] }),
        makeParticipant({ agentId: 'a_bob', role: 'field_recon', statDomains: {}, itemTags: ['evidence_kit'] }),
      ],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected success')
    }
    expect(result.outcome).toBe('success')
  })

  it('returns insufficient_participants when fewer than required participants are present', () => {
    const result = resolveCrossRoleAction({
      procedure: JOINT_EVIDENCE_PROCESSING,
      participants: [
        makeParticipant({ agentId: 'a_alice', role: 'investigator', statDomains: { insight: 4 }, itemTags: ['evidence_kit'] }),
      ],
    })
    expect(result.ok).toBe(false)
    if (result.ok || result.outcome !== 'insufficient_participants') {
      throw new Error('Expected insufficient_participants')
    }
    expect(result.required).toBe(2)
    expect(result.present).toBe(1)
  })

  it('returns ineligible_roles when a participant has an ineligible role', () => {
    const result = resolveCrossRoleAction({
      procedure: JOINT_EVIDENCE_PROCESSING,
      participants: [
        makeParticipant({ agentId: 'a_alice', role: 'investigator', statDomains: { insight: 4 }, itemTags: ['evidence_kit'] }),
        makeParticipant({ agentId: 'a_wrong', role: 'medic', statDomains: {}, itemTags: [] }),
      ],
    })
    expect(result.ok).toBe(false)
    if (result.ok || result.outcome !== 'ineligible_roles') {
      throw new Error('Expected ineligible_roles')
    }
    expect(result.ineligibleRoles).toContain('medic')
  })

  it('returns unmet_prerequisites when no participant meets stat threshold', () => {
    const result = resolveCrossRoleAction({
      procedure: JOINT_EVIDENCE_PROCESSING,
      participants: [
        makeParticipant({ agentId: 'a_alice', role: 'investigator', statDomains: { insight: 1 }, itemTags: ['evidence_kit'] }),
        makeParticipant({ agentId: 'a_bob', role: 'field_recon', statDomains: { insight: 2 }, itemTags: [] }),
      ],
    })
    expect(result.ok).toBe(false)
    if (result.ok || result.outcome !== 'unmet_prerequisites') {
      throw new Error('Expected unmet_prerequisites')
    }
    expect(result.unmetPrerequisites.length).toBeGreaterThan(0)
    expect(result.unmetPrerequisites[0].reason).toBe('stat_below_threshold')
  })

  it('returns unmet_prerequisites with missing_item_tag reason when no participant carries required item', () => {
    const result = resolveCrossRoleAction({
      procedure: JOINT_EVIDENCE_PROCESSING,
      participants: [
        makeParticipant({ agentId: 'a_alice', role: 'investigator', statDomains: { insight: 5 }, itemTags: [] }),
        makeParticipant({ agentId: 'a_bob', role: 'field_recon', statDomains: { insight: 4 }, itemTags: [] }),
      ],
    })
    expect(result.ok).toBe(false)
    if (result.ok || result.outcome !== 'unmet_prerequisites') {
      throw new Error('Expected unmet_prerequisites')
    }
    const itemFailure = result.unmetPrerequisites.find((u: UnmetPrerequisiteDetail) => u.prerequisite.type === 'item_tag')
    expect(itemFailure?.reason).toBe('missing_item_tag')
  })

  it('is deterministic: same inputs produce same outputs', () => {
    const input = {
      procedure: JOINT_EVIDENCE_PROCESSING,
      participants: [
        makeParticipant({ agentId: 'a_alice', role: 'investigator', statDomains: { insight: 4 }, itemTags: ['evidence_kit'] }),
        makeParticipant({ agentId: 'a_bob', role: 'field_recon', statDomains: { insight: 3 }, itemTags: [] }),
      ],
    }
    const first = resolveCrossRoleAction(input)
    const second = resolveCrossRoleAction(input)
    expect(first).toEqual(second)
  })
})

// ─── Custom procedure edge cases ──────────────────────────────────────────────

describe('resolveCrossRoleAction — generic contract edges', () => {
  const singleRoleSingleParticipant: CrossRoleActionProcedure = {
    procedureId: 'solo_assessment',
    label: 'Solo Field Assessment',
    eligibleRoles: ['field_recon'],
    prerequisites: [],
    requiredParticipantCount: 1,
  }

  it('succeeds for a single eligible participant with no prerequisites', () => {
    const result = resolveCrossRoleAction({
      procedure: singleRoleSingleParticipant,
      participants: [makeParticipant({ agentId: 'a_recon', role: 'field_recon' })],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected success')
    }
    expect(result.outcome).toBe('success')
    expect(result.contributingRoles).toEqual(['field_recon'])
  })

  it('returns insufficient_participants for zero participants against count-1 procedure', () => {
    const result = resolveCrossRoleAction({
      procedure: singleRoleSingleParticipant,
      participants: [],
    })
    expect(result.ok).toBe(false)
    if (result.ok || result.outcome !== 'insufficient_participants') {
      throw new Error('Expected insufficient_participants')
    }
    expect(result.present).toBe(0)
  })
})

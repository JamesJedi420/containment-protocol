import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE,
  VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE,
  sanitizeRuleDocumentComplianceRecords,
} from '../domain/ruleDocumentComplianceContainmentRegistry'

describe('ruleDocumentComplianceContainmentRegistry persistence (SPE-2123 slice 2)', () => {
  it('defaults starting state to an empty rule document compliance map', () => {
    expect(createStartingState().ruleDocumentComplianceRecords).toEqual({})
  })

  it('drops invalid and duplicate-id entries during sanitize without throwing', () => {
    const fallback = {}
    const sanitized = sanitizeRuleDocumentComplianceRecords(
      {
        valid: VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE,
        breach: DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE,
        'wrong-key': {
          ...DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE,
          id: 'rule-document-compliance:voluntary-cooperative-subject-a',
        },
        duplicate: {
          ...VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE,
          label: 'duplicate label should lose',
        },
        invalid: {
          id: '',
          label: 'bad',
          documentRef: 'document:bad',
          bindingStrength: 'voluntary',
          complianceState: 'compliant',
          physicalCopyRequired: true,
        },
        breachWithoutConsequence: {
          id: 'rule-document-compliance:breach-without-consequence',
          label: 'Breach without consequence',
          documentRef: 'document:breach-missing-consequence',
          bindingStrength: 'contractual',
          complianceState: 'breach',
          physicalCopyRequired: true,
        },
        franchiseToken: {
          id: 'rule-document-compliance:foundation-binding',
          label: 'Franchise token binding',
          documentRef: 'document:conduct-agreement',
          bindingStrength: 'voluntary',
          complianceState: 'compliant',
          physicalCopyRequired: false,
        },
        warningsOnly: {
          id: 'rule-document-compliance:compelled-without-auditor',
          label: 'Compelled binding without auditor warning',
          documentRef: 'document:compelled-conduct-code',
          bindingStrength: 'compelled',
          complianceState: 'drifting',
          physicalCopyRequired: false,
        },
      },
      fallback
    )

    expect(sanitized['rule-document-compliance:voluntary-cooperative-subject-a']).toEqual(
      VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE
    )
    expect(sanitized['rule-document-compliance:drift-to-breach-review']).toEqual(
      DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE
    )
    expect(sanitized['rule-document-compliance:compelled-without-auditor']).toEqual({
      id: 'rule-document-compliance:compelled-without-auditor',
      label: 'Compelled binding without auditor warning',
      documentRef: 'document:compelled-conduct-code',
      bindingStrength: 'compelled',
      complianceState: 'drifting',
      physicalCopyRequired: false,
    })
    expect(sanitized.invalid).toBeUndefined()
    expect(sanitized.breachWithoutConsequence).toBeUndefined()
    expect(sanitized.franchiseToken).toBeUndefined()
    expect(sanitized.duplicate).toBeUndefined()
    expect(Object.keys(sanitized)).toHaveLength(3)
  })

  it('round-trips fixture records byte-stable through save/load', () => {
    const state = createStartingState()
    state.ruleDocumentComplianceRecords = {
      [VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE.id]: VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE,
      [DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE.id]: DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE,
    }

    const loaded = loadGameSave(serializeGameSave(state))

    expect(loaded.ruleDocumentComplianceRecords).toEqual(state.ruleDocumentComplianceRecords)
    expect(
      loaded.ruleDocumentComplianceRecords?.[DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE.id]
        ?.revisionHistoryRefs
    ).toEqual(DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE.revisionHistoryRefs)
    expect(
      loaded.ruleDocumentComplianceRecords?.[DRIFTING_TO_BREACH_ESCALATE_REVIEW_FIXTURE.id]
        ?.breachConsequence
    ).toBe('escalate_review')
  })

  it('hydrates persisted rule document compliance records through import parsing', () => {
    const fallback = createStartingState()
    const hydrated = hydrateGame(
      {
        ...fallback,
        ruleDocumentComplianceRecords: {
          [VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE.id]: VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE,
          invalid: {
            id: 'rule-document-compliance:breach-without-consequence',
            label: 'Invalid breach on hydrate',
            documentRef: 'document:breach-missing-consequence',
            bindingStrength: 'contractual',
            complianceState: 'breach',
            physicalCopyRequired: true,
          },
        },
      },
      fallback
    )

    expect(hydrated.ruleDocumentComplianceRecords).toEqual({
      [VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE.id]: VOLUNTARY_COMPLIANT_PHYSICAL_COPY_FIXTURE,
    })
  })
})

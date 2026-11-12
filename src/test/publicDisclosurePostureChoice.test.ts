import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  DISCLOSURE_PROGRESSION_FIXTURE,
  NORMALIZATION_INPUT_FIXTURE,
} from '../domain/publicDisclosureStateRegistry'
import {
  applyPublicDisclosurePostureChoice,
  applyPublicDisclosurePostureTrustAdjustment,
  listPendingPublicDisclosurePostureDecisions,
  readPublicDisclosurePostureChoice,
  sanitizePublicDisclosurePostureChoices,
} from '../domain/publicDisclosurePostureChoice'
import { projectPublicDisclosureTrustOutcome } from '../domain/publicDisclosureTrustOutcomeProjection'

describe('publicDisclosurePostureChoice (SPE-861 slice 4)', () => {
  it('rejects posture choice on missing or inactive disclosure records', () => {
    const state = createStartingState()
    state.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
    }

    const missing = applyPublicDisclosurePostureChoice(state, {
      recordId: 'disclosure:missing',
      posture: 'transparent',
    })

    expect(missing.applied).toBe(false)
    expect(missing.reason).toBe('invalid_record')

    const inactiveRecord = {
      ...DISCLOSURE_PROGRESSION_FIXTURE,
      id: 'disclosure:secrecy-intact',
      awarenessLevel: 'secrecy_intact' as const,
    }
    const inactiveState = {
      ...state,
      publicDisclosureRecords: {
        [inactiveRecord.id]: inactiveRecord,
      },
    }

    const inactive = applyPublicDisclosurePostureChoice(inactiveState, {
      recordId: inactiveRecord.id,
      posture: 'transparent',
    })

    expect(inactive.applied).toBe(false)
    expect(inactive.reason).toBe('inactive_campaign')
  })

  it('persists posture choices deterministically without mutating registry records', () => {
    const state = createStartingState()
    state.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
    }

    const applied = applyPublicDisclosurePostureChoice(state, {
      recordId: DISCLOSURE_PROGRESSION_FIXTURE.id,
      posture: 'transparent',
    })

    expect(applied.applied).toBe(true)
    expect(readPublicDisclosurePostureChoice(applied.state, DISCLOSURE_PROGRESSION_FIXTURE.id)).toBe(
      'transparent'
    )
    expect(applied.state.publicDisclosureRecords?.[DISCLOSURE_PROGRESSION_FIXTURE.id]).toEqual(
      DISCLOSURE_PROGRESSION_FIXTURE
    )

    const repeated = applyPublicDisclosurePostureChoice(applied.state, {
      recordId: DISCLOSURE_PROGRESSION_FIXTURE.id,
      posture: 'transparent',
    })

    expect(repeated.applied).toBe(false)
  })

  it('adjusts projected trust bands from posture deltas without changing persisted scores', () => {
    const records = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
    }

    const baseline = projectPublicDisclosureTrustOutcome(records)
    const transparent = projectPublicDisclosureTrustOutcome(records, {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: 'transparent',
    })
    const restrictive = projectPublicDisclosureTrustOutcome(records, {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: 'restrictive',
    })

    expect(baseline.cooperationBand).toBe('opposed')
    expect(transparent.cooperationBand).toBe('watchful')
    expect(restrictive.cooperationBand).toBe('opposed')

    const adjustedRecords = applyPublicDisclosurePostureTrustAdjustment(records, {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: 'transparent',
    })

    expect(adjustedRecords[DISCLOSURE_PROGRESSION_FIXTURE.id]?.trustByRegion?.[0]?.trustScore).toBe(
      0.41
    )
    expect(records[DISCLOSURE_PROGRESSION_FIXTURE.id]?.trustByRegion?.[0]?.trustScore).toBe(0.31)
  })

  it('sanitizes posture choices to valid disclosure record ids and known postures', () => {
    const sanitized = sanitizePublicDisclosurePostureChoices(
      {
        [DISCLOSURE_PROGRESSION_FIXTURE.id]: 'transparent',
        'disclosure:orphan': 'restrictive',
        [NORMALIZATION_INPUT_FIXTURE.id]: 'invalid-posture',
      },
      new Set([DISCLOSURE_PROGRESSION_FIXTURE.id, NORMALIZATION_INPUT_FIXTURE.id])
    )

    expect(sanitized).toEqual({
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: 'transparent',
    })
  })

  it('lists pending posture decisions for active campaigns without a stored choice', () => {
    const state = createStartingState()
    state.publicDisclosureRecords = {
      [DISCLOSURE_PROGRESSION_FIXTURE.id]: DISCLOSURE_PROGRESSION_FIXTURE,
    }

    expect(listPendingPublicDisclosurePostureDecisions(state)).toEqual([
      {
        recordId: DISCLOSURE_PROGRESSION_FIXTURE.id,
        label: DISCLOSURE_PROGRESSION_FIXTURE.label,
      },
    ])

    const withPosture = applyPublicDisclosurePostureChoice(state, {
      recordId: DISCLOSURE_PROGRESSION_FIXTURE.id,
      posture: 'restrictive',
    }).state

    expect(listPendingPublicDisclosurePostureDecisions(withPosture)).toEqual([])
  })
})

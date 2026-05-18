import { describe, expect, it } from 'vitest'
import {
  buildConcealmentActivationTriggersFromAuthored,
  type AuthoredConcealmentActivationTrigger,
} from '../domain/hiddenStateActivationAuthoring'

describe('hiddenStateActivationAuthoring', () => {
  it('returns an empty array for non-array input', () => {
    expect(buildConcealmentActivationTriggersFromAuthored(null)).toEqual([])
    expect(buildConcealmentActivationTriggersFromAuthored({})).toEqual([])
  })

  it('maps a minimal authored trigger with default hidden mode', () => {
    const authored: AuthoredConcealmentActivationTrigger[] = [{ id: 'trigger:cover' }]
    expect(buildConcealmentActivationTriggersFromAuthored(authored)).toEqual([
      { id: 'trigger:cover', mode: 'hidden' },
    ])
  })

  it('preserves displaced mode, conditions, and optional fields', () => {
    const authored: AuthoredConcealmentActivationTrigger[] = [
      {
        id: 'trigger:relocate',
        mode: 'displaced',
        displacementTarget: ' safehouse-3 ',
        detectionConfidence: 0.62,
        when: {
          anyTag: [' covert ', 'covert'],
          globalFlag: ' mission.phase.two ',
          minHiddenModifierCount: 2,
          minInvestigationWeight: 0.25,
        },
      },
    ]

    expect(buildConcealmentActivationTriggersFromAuthored(authored)).toEqual([
      {
        id: 'trigger:relocate',
        mode: 'displaced',
        displacementTarget: 'safehouse-3',
        detectionConfidence: 0.62,
        when: {
          anyTag: ['covert'],
          globalFlag: 'mission.phase.two',
          minHiddenModifierCount: 2,
          minInvestigationWeight: 0.25,
        },
      },
    ])
  })

  it('skips malformed rows without throwing', () => {
    const authored = [
      null,
      { id: '' },
      { id: 'valid', mode: 'not-a-mode' },
      { id: 'also-valid', when: { allTags: ['', '  ', null] } },
    ] as unknown as AuthoredConcealmentActivationTrigger[]

    expect(() => buildConcealmentActivationTriggersFromAuthored(authored)).not.toThrow()
    expect(buildConcealmentActivationTriggersFromAuthored(authored)).toEqual([
      { id: 'valid', mode: 'hidden' },
      { id: 'also-valid', mode: 'hidden' },
    ])
  })
})

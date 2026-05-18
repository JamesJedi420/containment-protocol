import { describe, expect, it } from 'vitest'
import { createStarterCase } from '../domain/templates/startingCases'
import {
  applyConcealmentActivationToCase,
  CONCEALMENT_ACTIVATION_TAGS,
  resolveConcealmentActivation,
} from '../domain/hiddenStateActivation'
import type { CaseInstance } from '../domain/models'

function createActivationCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    ...createStarterCase({
      id: 'case-conceal',
      templateId: 'ops-004',
    }),
    mode: 'threshold',
    assignedTeamIds: [],
    requiredTags: [],
    preferredTags: [],
    ...overrides,
  }
}

describe('hiddenStateActivation', () => {
  it('activates hidden presence from concealment tags', () => {
    const caseData = createActivationCase({
      tags: ['infiltration', 'field'],
    })

    const result = resolveConcealmentActivation(caseData, { globalFlags: {} })

    expect(result.applied).toBe(true)
    expect(result.mode).toBe('hidden')
    expect(result.reason).toBe('case-tag')
    expect(result.detectionConfidence).toBe(0.25)
  })

  it.each(CONCEALMENT_ACTIVATION_TAGS)('treats %s as a concealment activation tag', (tag) => {
    const caseData = createActivationCase({ tags: [tag] })
    const result = resolveConcealmentActivation(caseData, { globalFlags: {} })
    expect(result.applied).toBe(true)
    expect(result.mode).toBe('hidden')
  })

  it('activates hidden presence from per-case and prefix global flags', () => {
    const caseData = createActivationCase({ id: 'case-alpha' })

    const perCase = resolveConcealmentActivation(caseData, {
      globalFlags: { 'conceal.case.case-alpha': true },
    })
    expect(perCase.applied).toBe(true)
    expect(perCase.mode).toBe('hidden')

    const prefix = resolveConcealmentActivation(createActivationCase({ id: 'case-beta' }), {
      globalFlags: { 'conceal.mission-ready': 1 },
    })
    expect(prefix.applied).toBe(true)
    expect(prefix.reason).toBe('global-flag-prefix:conceal.')
  })

  it('activates displaced presence from per-case displace flag string value', () => {
    const caseData = createActivationCase({ id: 'case-route' })
    const result = resolveConcealmentActivation(caseData, {
      globalFlags: { 'conceal.displace.case-route': 'safehouse-9' },
    })

    expect(result.applied).toBe(true)
    expect(result.mode).toBe('displaced')
    expect(result.displacementTarget).toBe('safehouse-9')
    expect(result.detectionConfidence).toBe(0.55)
  })

  it('prefers displaced activation over hidden tag triggers', () => {
    const caseData = createActivationCase({
      id: 'case-route',
      tags: ['stealth'],
    })

    const result = resolveConcealmentActivation(caseData, {
      globalFlags: { 'conceal.displace.case-route': 'fallback-route' },
    })

    expect(result.mode).toBe('displaced')
  })

  it('activates from recon hidden-modifier bridge when investigation weight is high enough', () => {
    const caseData = createActivationCase({
      tags: ['evidence', 'archive', 'occult', 'ritual'],
      weights: {
        combat: 0,
        investigation: 0.35,
        utility: 0,
        social: 0,
      },
    })

    const belowThreshold = resolveConcealmentActivation(caseData, {
      globalFlags: {},
      hiddenModifierCount: 1,
    })
    expect(belowThreshold.applied).toBe(false)

    const activated = resolveConcealmentActivation(caseData, {
      globalFlags: {},
      hiddenModifierCount: 2,
    })
    expect(activated.applied).toBe(true)
    expect(activated.reason).toBe('recon-hidden-modifiers')
  })

  it('does not override revealed or displaced cases', () => {
    const revealed = createActivationCase({
      hiddenState: 'revealed',
      tags: ['infiltration'],
    })
    const displaced = createActivationCase({
      hiddenState: 'displaced',
      tags: ['infiltration'],
    })

    expect(resolveConcealmentActivation(revealed, { globalFlags: {} }).applied).toBe(false)
    expect(resolveConcealmentActivation(displaced, { globalFlags: {} }).applied).toBe(false)
  })

  it('does not treat per-case conceal flags as global activation for other cases', () => {
    const caseAlpha = createActivationCase({ id: 'case-alpha' })
    const caseBeta = createActivationCase({ id: 'case-beta' })
    const globalFlags = { 'conceal.case.case-alpha': true }

    expect(resolveConcealmentActivation(caseAlpha, { globalFlags }).applied).toBe(true)
    expect(resolveConcealmentActivation(caseBeta, { globalFlags }).applied).toBe(false)
  })

  it('ignores falsy global flag values', () => {
    const caseData = createActivationCase({ id: 'case-flag' })
    const result = resolveConcealmentActivation(caseData, {
      globalFlags: {
        'conceal.case.case-flag': false,
        'conceal.mission-ready': 0,
        'conceal.displace.case-flag': '   ',
      },
    })

    expect(result.applied).toBe(false)
  })

  it('merges activation fields through applyConcealmentActivationToCase', () => {
    const caseData = createActivationCase({ tags: ['covert'] })
    const activated = applyConcealmentActivationToCase(caseData, { globalFlags: {} })

    expect(activated.hiddenState).toBe('hidden')
    expect(activated.detectionConfidence).toBe(0.25)
    expect(activated.counterDetection).toBe(false)
  })
})

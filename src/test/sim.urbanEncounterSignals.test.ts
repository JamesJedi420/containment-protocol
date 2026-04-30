import { describe, expect, it } from 'vitest'
import {
  buildUrbanEncounterSignal,
  type UrbanEncounterSignalInput,
} from '../domain/urbanEncounterSignals'

function makeBaselineInput(): UrbanEncounterSignalInput {
  return {
    schedule: {
      districtId: 'hub',
      timeBandId: 'afternoon',
      encounterFamilyTags: ['public', 'signal'],
      authorityResponseProfile: 'rapid_response',
      witnessModifier: 0.82,
      covertAdvantage: false,
      appliedEvents: ['inspection_sweep'],
    },
    ecology: {
      districtEcologyTokens: ['district:old-docks'],
      operationalModifierHints: ['ops:poor-visibility'],
      threatHabitatHints: ['habitat:concealed-entry'],
    },
    map: {
      dominantWorldState: 'curfew_zone',
      safeHubContinuity: 'stable',
      actionableSignals: ['Civic movement is collapsing into curfew-managed corridors.'],
    },
    truth: {
      anomalyEncounterPressure: 0.42,
      witnessReliability: 0.61,
      institutionalResponsePosture: 'mobilized',
      publicLegibility: 'contested',
    },
    era: {
      mixedEra: true,
      suppressedInteractionSurfaces: ['wizard_colleges'],
      powerAvailability: {
        enabled: ['folk_rite'],
        suppressed: ['arcane'],
      },
    },
  }
}

describe('urbanEncounterSignals', () => {
  it('produces materially different encounter signals across at least two district contexts', () => {
    const civicSignal = buildUrbanEncounterSignal(makeBaselineInput())

    const industrialHostileInput: UrbanEncounterSignalInput = {
      ...makeBaselineInput(),
      schedule: {
        districtId: 'industrial-perimeter',
        timeBandId: 'night',
        encounterFamilyTags: ['criminal_network', 'cult_activity'],
        authorityResponseProfile: 'slow_reaction',
        witnessModifier: 0.24,
        covertAdvantage: true,
        appliedEvents: ['dock_blackout'],
      },
      map: {
        dominantWorldState: 'hostile_territory',
        safeHubContinuity: 'broken',
        actionableSignals: ['Hostile dominance has remapped outer movement into hostile territory.'],
      },
      truth: {
        anomalyEncounterPressure: 0.84,
        witnessReliability: 0.31,
        institutionalResponsePosture: 'dismissive',
        publicLegibility: 'denied',
      },
    }

    const hostileSignal = buildUrbanEncounterSignal(industrialHostileInput)

    expect(hostileSignal.tags).toContain('district:industrial-perimeter')
    expect(civicSignal.tags).toContain('district:hub')
    expect(hostileSignal.weightModifiers.hostileResponse).toBeGreaterThan(
      civicSignal.weightModifiers.hostileResponse
    )
    expect(hostileSignal.escalationHints.hostileResponseHint).not.toBe(
      civicSignal.escalationHints.hostileResponseHint
    )
  })

  it('exposes role-axis and social-tier weighting differences by local context', () => {
    const authorityWeighted = buildUrbanEncounterSignal(makeBaselineInput())

    const streetWeightedInput: UrbanEncounterSignalInput = {
      ...makeBaselineInput(),
      schedule: {
        districtId: 'shadow-network',
        timeBandId: 'night',
        encounterFamilyTags: ['criminal_network', 'cult_activity'],
        authorityResponseProfile: 'corruption',
        witnessModifier: 0.2,
        covertAdvantage: true,
      },
      map: {
        dominantWorldState: 'abandoned_hub',
        safeHubContinuity: 'broken',
      },
      truth: {
        anomalyEncounterPressure: 0.78,
        witnessReliability: 0.29,
        institutionalResponsePosture: 'dismissive',
        publicLegibility: 'denied',
      },
    }

    const streetWeighted = buildUrbanEncounterSignal(streetWeightedInput)

    expect(authorityWeighted.roleWeights.authority).toBeGreaterThan(
      authorityWeighted.roleWeights.criminal
    )
    expect(streetWeighted.roleWeights.criminal).toBeGreaterThan(
      streetWeighted.roleWeights.authority
    )
    expect(streetWeighted.socialTierWeights.street).toBeGreaterThan(
      authorityWeighted.socialTierWeights.street
    )
  })

  it('changes authority/hostile escalation hints with local context', () => {
    const controlledSignal = buildUrbanEncounterSignal(makeBaselineInput())

    const degradedContext: UrbanEncounterSignalInput = {
      ...makeBaselineInput(),
      schedule: {
        districtId: 'industrial-perimeter',
        timeBandId: 'night',
        encounterFamilyTags: ['criminal_network', 'cult_activity'],
        authorityResponseProfile: 'slow_reaction',
        witnessModifier: 0.18,
        covertAdvantage: true,
      },
      map: {
        dominantWorldState: 'hostile_territory',
        safeHubContinuity: 'broken',
      },
      truth: {
        anomalyEncounterPressure: 0.9,
        witnessReliability: 0.28,
        institutionalResponsePosture: 'dismissive',
        publicLegibility: 'denied',
      },
    }

    const degradedSignal = buildUrbanEncounterSignal(degradedContext)

    expect(controlledSignal.escalationHints.authorityResponseHint).toBe('rapid_lockdown')
    expect(degradedSignal.escalationHints.authorityResponseHint).toBe('thin_coverage')
    expect(degradedSignal.escalationHints.hostileResponseHint).toBe('active_hunt')
    expect(degradedSignal.escalationHints.socialEscalationRisk).toBe('high')
  })

  it('is deterministic and repeatable for identical semantic inputs', () => {
    const input = makeBaselineInput()

    const first = buildUrbanEncounterSignal(input)
    const second = buildUrbanEncounterSignal(structuredClone(input))

    expect(second).toEqual(first)
  })
})

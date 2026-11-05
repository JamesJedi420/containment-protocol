import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  resolveSimulationAuthorityForSubject,
  type TruthLayerRecord,
} from '../domain/truthLayerRecordRegistry'
import {
  ARCHIVIST_RECORD_UPKEEP_PERIOD_OBLIGATION,
  DUTY_OBLIGATION_REGISTRY_SCHEMA_VERSION,
  parseDutyObligationRegistry,
} from '../domain/dutyObligationRegistry'
import {
  createEmptyResearchExecutionRuntime,
  parseResearchExecutionRuntime,
  serializeResearchExecutionRuntime,
} from '../domain/researchThroughputExecution'
import {
  listScenarioPresetIds,
  SCENARIO_PRESET_REGISTRY,
} from '../domain/scenarioDefinitionResolver'
import {
  applyHazardousResearchConsequences,
  resolveHazardousResearchRiskPosture,
} from '../domain/hazardousResearchRiskPosture'
import {
  createDistrictServiceRegistry,
  PUBLIC_SERVICE_CATEGORIES,
} from '../domain/publicServiceInfrastructureDegradation'
import {
  MESSAGE_TO_SERVICE_AVAILABILITY_VALIDATION_SCHEMA_VERSION,
  parsePublicGuidanceMessagePacket,
  validatePublicGuidanceAgainstServices,
} from '../domain/messageToServiceAvailabilityValidation'
import {
  resolveEnvironmentalOperationalContext,
  type EnvironmentalDimensionPacket,
} from '../domain/environmentalOperationalContext'
import {
  advanceContainmentRequirementsAtWeekClose,
  containmentRequirementRegistryKey,
  evaluateRequirementAgainstCampaignWeek,
  openContainmentRequirementWindow,
} from '../domain/containmentRequirementFulfillment'

// Default Array.sort is the parity oracle, including UTF-16 surrogate ordering.
const ids = ['a', '10', '2', 'A', 'é', 'Ω', '😀', '\uE000', 'a']
const permutations = [ids, [...ids].reverse(), [...ids.slice(3), ...ids.slice(0, 3)]]

function truthRecord(overrides: Partial<TruthLayerRecord>): TruthLayerRecord {
  return {
    id: 'claim:base',
    label: 'Ordering claim',
    subjectRef: 'event:ordering',
    subjectKind: 'event',
    claim: { narrative: 'Claim' },
    doctrine: { narrative: 'Doctrine' },
    verification: { narrative: 'Verification' },
    ...overrides,
  }
}

describe('default string ordering parity (SPE-3724)', () => {
  it('preserves simulation authority record ordering and duplicate IDs', () => {
    for (const input of permutations) {
      const records = Object.fromEntries(
        input.map((id, index) => [
          String(index),
          truthRecord({ id, institutionalAttribution: 'simulation' }),
        ])
      )
      const before = JSON.stringify(records)
      expect(resolveSimulationAuthorityForSubject(records, 'event:ordering')).toEqual({
        ok: false,
        code: 'duplicate_simulation_authority',
        recordIds: [...input].sort(),
      })
      expect(JSON.stringify(records)).toBe(before)
    }
  })

  it('deduplicates authority references before ordering them', () => {
    for (const input of permutations) {
      const records = Object.fromEntries(
        input.map((simulationAuthorityRef, index) => [
          String(index),
          truthRecord({
            id: `claim:${index}`,
            institutionalAttribution: 'public',
            simulationAuthorityRef,
          }),
        ])
      )
      expect(resolveSimulationAuthorityForSubject(records, 'event:ordering')).toEqual({
        ok: false,
        code: 'duplicate_simulation_authority',
        recordIds: [...new Set(input)].sort(),
      })
    }
  })

  it('preserves runtime string-set normalization and serialized bytes', () => {
    let serialized: string | undefined
    for (const input of permutations) {
      const raw = {
        ...createEmptyResearchExecutionRuntime('project:ordering'),
        firedMilestoneIds: input,
        lastReasonCodes: input,
      }
      const before = JSON.stringify(raw)
      const parsed = parseResearchExecutionRuntime(raw)
      if (!parsed) throw new Error('Expected valid runtime')
      expect(parsed.firedMilestoneIds).toEqual([...new Set(ids)].sort())
      expect(parsed.lastReasonCodes).toEqual([...new Set(ids)].sort())
      expect(Object.isFrozen(parsed.firedMilestoneIds)).toBe(true)
      expect(JSON.stringify(raw)).toBe(before)
      const next = serializeResearchExecutionRuntime(parsed)
      serialized ??= next
      expect(next).toBe(serialized)
      expect(parseResearchExecutionRuntime(next)).toEqual(parsed)
    }
  })

  it('indexes obligation IDs without changing input or serialized obligation order', () => {
    for (const input of permutations) {
      const raw = {
        schemaVersion: DUTY_OBLIGATION_REGISTRY_SCHEMA_VERSION,
        obligations: Object.fromEntries(
          input.map((id) => [id, { ...ARCHIVIST_RECORD_UPKEEP_PERIOD_OBLIGATION, id }])
        ),
      }
      const before = JSON.stringify(raw)
      const parsed = parseDutyObligationRegistry(raw)
      expect(parsed?.roleIndex.archivist).toEqual([...new Set(ids)].sort())
      expect(Object.isFrozen(parsed?.roleIndex.archivist)).toBe(true)
      expect(Object.keys(parsed?.obligations ?? {})).toEqual(Object.keys(raw.obligations))
      expect(JSON.stringify(raw)).toBe(before)
    }
  })

  it('lists the fixed canonical preset vocabulary in default order', () => {
    const before = JSON.stringify(SCENARIO_PRESET_REGISTRY)
    const listed = listScenarioPresetIds()
    expect(listed).toEqual(Object.keys(SCENARIO_PRESET_REGISTRY).sort())
    expect(Object.isFrozen(listed)).toBe(true)
    expect(listScenarioPresetIds()).toEqual(listed)
    expect(JSON.stringify(SCENARIO_PRESET_REGISTRY)).toBe(before)
  })

  it('deduplicates consequence reasons without changing the input posture', () => {
    for (const input of permutations) {
      const postureResolution = {
        ...resolveHazardousResearchRiskPosture({
          capability: {
            domainScores: { analysis: 0.8 },
            difficulty: 1,
            facilityGates: [],
            staffCompetencyRefs: [],
            sourceInputRefs: [],
          },
          posture: 'standard',
        }),
        allowed: false,
        reasonCodes: input,
      }
      const before = JSON.stringify(postureResolution)
      const intents = applyHazardousResearchConsequences({
        projectId: 'project:ordering',
        postureResolution,
        tick: {
          outcome: 'blocked',
          progressDelta: 0,
          reasonCodes: [],
          explanationSummary: 'blocked',
        },
      })
      expect(intents).toHaveLength(1)
      expect(intents[0]?.reasonCodes).toEqual(
        [...new Set(['hazardous_posture_blocked', ...ids])].sort()
      )
      expect(Object.isFrozen(intents[0]?.reasonCodes)).toBe(true)
      expect(JSON.stringify(postureResolution)).toBe(before)
    }
  })

  it('preserves category normalization, merged check ordering and duplicate rejection', () => {
    const districtId = 'district:ordering'
    const registry = createDistrictServiceRegistry(
      districtId,
      PUBLIC_SERVICE_CATEGORIES.map((serviceCategory) => ({
        districtId,
        serviceCategory,
        reliabilityState: 'functional',
        downstreamUseFlags: [],
        provenance: { kind: 'field_update', sourceRef: 'field:ordering' },
        reasonCodes: [],
      }))
    )
    let baseline: unknown
    const packet = {
      schemaVersion: MESSAGE_TO_SERVICE_AVAILABILITY_VALIDATION_SCHEMA_VERSION,
      messageId: 'message:ordering',
      districtId,
      recommendedAction: 'evacuation',
      requiredServiceCategories: [...PUBLIC_SERVICE_CATEGORIES],
      audienceProfiles: [
        {
          audienceId: 'audience:general',
          mobilityOk: true,
          languageOk: true,
          moneyOk: true,
          suppliesOk: true,
          infrastructureOk: true,
        },
      ],
    }
    for (const categories of [
      [...PUBLIC_SERVICE_CATEGORIES].reverse(),
      [...PUBLIC_SERVICE_CATEGORIES],
    ]) {
      const raw = { ...packet, requiredServiceCategories: categories }
      const before = JSON.stringify(raw)
      expect(parsePublicGuidanceMessagePacket(raw)?.requiredServiceCategories).toEqual(
        [...PUBLIC_SERVICE_CATEGORIES].sort()
      )
      const result = validatePublicGuidanceAgainstServices({ packet: raw, registry })
      expect(result.serviceChecks.map((check) => check.category)).toEqual(
        [...PUBLIC_SERVICE_CATEGORIES].sort()
      )
      baseline ??= result
      expect(result).toEqual(baseline)
      expect(JSON.stringify(raw)).toBe(before)
    }
    expect(
      parsePublicGuidanceMessagePacket({ ...packet, requiredServiceCategories: ['roads', 'roads'] })
    ).toBeNull()
  })

  it('compares nested packet objects independently of key insertion order', () => {
    const nested = (input: readonly string[]) =>
      Object.fromEntries(input.map((key) => [key, { value: key }]))
    const first: EnvironmentalDimensionPacket = {
      ownerId: 'SPE-3354',
      dimensionId: 'terrain_buildability',
      scope: 'baseline',
      sourceRef: { family: 'terrain', id: 'plot:alpha' },
      value: nested(ids),
      valid: true,
    }
    const second = {
      ...first,
      sourceRef: { ...first.sourceRef, id: 'plot:beta' },
      value: nested([...ids].reverse()),
    }
    const before = JSON.stringify([first, second])
    const companions: EnvironmentalDimensionPacket[] = [
      { ...first, ownerId: 'SPE-1221', dimensionId: 'climate_atmosphere' },
      { ...first, ownerId: 'SPE-1117', dimensionId: 'ecology_pressure' },
    ]
    expect(resolveEnvironmentalOperationalContext([first, second, ...companions]).ok).toBe(true)
    expect(resolveEnvironmentalOperationalContext([second, first, ...companions]).ok).toBe(true)
    expect(
      resolveEnvironmentalOperationalContext([
        first,
        { ...second, value: { ...second.value, a: { value: 'different' } } },
        ...companions,
      ]).ok
    ).toBe(false)
    expect(JSON.stringify([first, second])).toBe(before)
  })

  it('preserves registry serialization and independent deadline results across ID orderings', () => {
    for (const input of permutations) {
      const entries = input.map((requirementId) => {
        const definition = {
          requirementId,
          subjectRef: 'subject:ordering',
          requirementClass: 'information_input' as const,
          acceptableInputClasses: ['information' as const],
          constraints: { qualityMin: 0.5 },
          deficiencySeverity: 'major' as const,
          deficiencyConsequenceRef: 'consequence:gap',
          createsWork: false,
          allowsRecoveryAfterDeficiency: true,
        }
        const opened = openContainmentRequirementWindow({
          definition,
          currentWindow: { windowId: 'window:ordering', startWeek: 10, endWeek: 12 },
        })
        if (!opened) throw new Error('Expected valid requirement')
        return [
          containmentRequirementRegistryKey(definition.subjectRef, requirementId),
          opened,
        ] as const
      })
      const state = {
        ...createStartingState(),
        week: 13,
        containmentRequirementStates: Object.fromEntries(entries),
      }
      const before = JSON.stringify(state)
      const expected = Object.fromEntries(
        entries.map(([key, value]) => [key, evaluateRequirementAgainstCampaignWeek(value, 13)])
      )
      const next = advanceContainmentRequirementsAtWeekClose(state)
      expect(JSON.stringify(next.containmentRequirementStates)).toBe(JSON.stringify(expected))
      expect(Object.isFrozen(next.containmentRequirementStates)).toBe(true)
      expect(JSON.stringify(state)).toBe(before)
      expect(advanceContainmentRequirementsAtWeekClose(next)).toBe(next)
    }
  })
})

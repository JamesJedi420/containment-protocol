import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type {
  IncidentMissionFitPacket,
  SpecialistUnitRegistry,
  UnitProfile,
} from '../domain/specialistUnits'
import {
  collectSpecialistUnitResultTokens,
  resolveDesignationCollisions,
  resolveUnitForMission,
  resultTokensContainFranchiseReferences,
  transitionProvisionalUnitLifecycle,
  validateSpecialistUnitRegistry,
} from '../domain/specialistUnits'

function baseProfile(overrides: Partial<UnitProfile> = {}): UnitProfile {
  return {
    id: 'unit-base',
    designationCode: 'R-100',
    displayLabel: 'Regional Analysis Cell',
    unitTypes: ['research', 'mobile'],
    authorityTier: 'regional',
    branchId: 'branch-alpha',
    eraBand: 'era-7',
    lifecycleState: 'active',
    recordConfidence: 'verified',
    doctrine: ['investigation_first'],
    mobility: 'regional',
    jurisdiction: ['district-north'],
    permanence: 'standing',
    equipment: ['sensor_kit'],
    suitabilityTags: ['research_forward', 'analysis'],
    hazardProfileTags: ['digital'],
    environmentClasses: ['closed_environment'],
    deploymentDelayWeeks: 0,
    fatigueReadiness: 80,
    fatigueCeiling: 95,
    ...overrides,
  }
}

function basePacket(overrides: Partial<IncidentMissionFitPacket> = {}): IncidentMissionFitPacket {
  return {
    incidentId: 'incident-1',
    week: 12,
    missionPosture: 'research_forward',
    requiredSuitabilityTags: ['research_forward'],
    requiredHazardProfiles: ['digital'],
    requiredEnvironmentClasses: ['closed_environment'],
    jurisdictionId: 'district-north',
    commandMode: 'routine',
    clearanceCeiling: 3,
    ...overrides,
  }
}

function clonePacket(packet: IncidentMissionFitPacket): IncidentMissionFitPacket {
  return structuredClone(packet)
}

describe('specialistUnits slice 1 (SPE-2086)', () => {
  it('1. research-forward incident cannot be satisfied by armed-mobile-only pool', () => {
    const registry: SpecialistUnitRegistry = {
      units: [
        baseProfile({
          id: 'armed-mobile',
          designationCode: 'A-10',
          displayLabel: 'Rapid Containment Detachment',
          unitTypes: ['armed', 'mobile'],
          suitabilityTags: ['containment_response'],
          hazardProfileTags: ['kinetic'],
        }),
        baseProfile({
          id: 'research-cell',
          designationCode: 'R-200',
          displayLabel: 'Field Study Detachment',
          unitTypes: ['research', 'mobile'],
          suitabilityTags: ['research_forward', 'analysis'],
        }),
      ],
    }

    const output = resolveUnitForMission({
      packet: basePacket({ missionPosture: 'research_forward' }),
      registry,
      options: { includeBlocked: true },
    })

    expect(output.ranked[0]?.unitId).toBe('research-cell')
    expect(output.ranked.find((result) => result.unitId === 'armed-mobile')?.hardBlocked).toBe(true)
  })

  it('1b. armed research unit without tag overlap gets soft posture penalty, not hard block', () => {
    const registry: SpecialistUnitRegistry = {
      units: [
        baseProfile({
          id: 'armed-research-mixed',
          unitTypes: ['armed', 'research', 'mobile'],
          suitabilityTags: ['containment_response'],
        }),
      ],
    }

    const result = resolveUnitForMission({
      packet: basePacket({ missionPosture: 'research_forward' }),
      registry,
      options: { includeBlocked: true },
    }).ranked[0]

    expect(result?.hardBlocked).toBe(false)
    expect(result?.blockers.some((blocker) => blocker.code === 'wrong_mission_posture')).toBe(true)
    expect(
      result?.blockers.find((blocker) => blocker.code === 'wrong_mission_posture')?.severity
    ).toBe('soft')
  })

  it('1c. partial suitability match is penalized versus full match', () => {
    const registry: SpecialistUnitRegistry = {
      units: [
        baseProfile({
          id: 'partial-suitability',
          designationCode: 'R-110',
          suitabilityTags: ['research_forward'],
        }),
        baseProfile({
          id: 'full-suitability',
          designationCode: 'R-111',
          suitabilityTags: ['research_forward', 'analysis'],
        }),
      ],
    }

    const output = resolveUnitForMission({
      packet: basePacket({
        requiredSuitabilityTags: ['research_forward', 'analysis'],
      }),
      registry,
    })

    expect(output.ranked[0]?.unitId).toBe('full-suitability')
    const partial = output.ranked.find((result) => result.unitId === 'partial-suitability')
    expect(partial?.rankingNotes).toContain('penalty:partial_suitability')
    expect(partial?.fitScore ?? 0).toBeLessThan(output.ranked[0]?.fitScore ?? 0)
  })

  it('2. hazard mismatch blocks or strongly penalizes a unit', () => {
    const registry: SpecialistUnitRegistry = {
      units: [
        baseProfile({
          id: 'wrong-hazard',
          hazardProfileTags: ['radiological'],
        }),
      ],
    }

    const result = resolveUnitForMission({
      packet: basePacket({ requiredHazardProfiles: ['digital'] }),
      registry,
      options: { includeBlocked: true },
    }).ranked[0]

    expect(result?.hardBlocked).toBe(true)
    expect(result?.blockers.some((blocker) => blocker.code === 'wrong_hazard_profile')).toBe(true)
    expect(result?.fitScore).toBe(0)
  })

  it('3. environment mismatch blocks or strongly penalizes a unit', () => {
    const registry: SpecialistUnitRegistry = {
      units: [
        baseProfile({
          id: 'wrong-environment',
          environmentClasses: ['subterranean'],
        }),
      ],
    }

    const result = resolveUnitForMission({
      packet: basePacket({ requiredEnvironmentClasses: ['closed_environment'] }),
      registry,
      options: { includeBlocked: true },
    }).ranked[0]

    expect(result?.hardBlocked).toBe(true)
    expect(result?.blockers.some((blocker) => blocker.code === 'wrong_environment_class')).toBe(true)
  })

  it('4. jurisdiction mismatch blocks or penalizes a unit', () => {
    const registry: SpecialistUnitRegistry = {
      units: [
        baseProfile({
          id: 'wrong-jurisdiction',
          jurisdiction: ['district-south'],
        }),
      ],
    }

    const result = resolveUnitForMission({
      packet: basePacket({ jurisdictionId: 'district-north' }),
      registry,
      options: { includeBlocked: true },
    }).ranked[0]

    expect(result?.hardBlocked).toBe(true)
    expect(result?.blockers.some((blocker) => blocker.code === 'wrong_jurisdiction')).toBe(true)
  })

  it('5. unverified registry entry is blocked or flagged', () => {
    const registry: SpecialistUnitRegistry = {
      units: [
        baseProfile({
          id: 'unverified-unit',
          recordConfidence: 'unverified',
        }),
      ],
    }

    const result = resolveUnitForMission({
      packet: basePacket(),
      registry,
      options: { includeBlocked: true },
    }).ranked[0]

    expect(result?.hardBlocked).toBe(true)
    expect(result?.blockers.some((blocker) => blocker.code === 'unverified_registry_entry')).toBe(
      true
    )
  })

  it('6. disbanded / archived / forming unit cannot deploy', () => {
    const registry: SpecialistUnitRegistry = {
      units: [
        baseProfile({ id: 'disbanded-unit', lifecycleState: 'disbanded' }),
        baseProfile({ id: 'archived-unit', lifecycleState: 'archived' }),
        baseProfile({ id: 'forming-unit', lifecycleState: 'forming' }),
      ],
    }

    const output = resolveUnitForMission({
      packet: basePacket(),
      registry,
      options: { includeBlocked: true },
    })

    for (const result of output.ranked) {
      expect(result.hardBlocked).toBe(true)
      expect(result.fitScore).toBe(0)
    }
  })

  it('7. provisional unit expires, converts, or archives after incident closure', () => {
    const provisional = baseProfile({
      id: 'provisional-unit',
      lifecycleState: 'provisional',
      permanence: 'provisional',
      provisionalExpiresAfterIncident: true,
    })

    const converted = transitionProvisionalUnitLifecycle({
      profile: provisional,
      incidentClosed: true,
      retainDecision: 'convert',
    })
    expect(converted.lifecycleState).toBe('active')
    expect(converted.permanence).toBe('standing')

    const disbanded = transitionProvisionalUnitLifecycle({
      profile: provisional,
      incidentClosed: true,
      retainDecision: 'disband',
    })
    expect(disbanded.lifecycleState).toBe('disbanded')
    expect(disbanded.recordConfidence).toBe('disbanded')

    const archived = transitionProvisionalUnitLifecycle({
      profile: provisional,
      incidentClosed: true,
    })
    expect(archived.lifecycleState).toBe('archived')
    expect(archived.permanence).toBe('archived_record')

    const persistent = baseProfile({
      id: 'persistent-provisional',
      lifecycleState: 'provisional',
      permanence: 'provisional',
      provisionalExpiresAfterIncident: false,
    })
    const stillProvisional = transitionProvisionalUnitLifecycle({
      profile: persistent,
      incidentClosed: true,
    })
    expect(stillProvisional.lifecycleState).toBe('provisional')
    expect(stillProvisional.permanence).toBe('provisional')

    const explicitArchive = transitionProvisionalUnitLifecycle({
      profile: persistent,
      incidentClosed: true,
      retainDecision: 'archive',
    })
    expect(explicitArchive.lifecycleState).toBe('archived')
  })

  it('8. duplicate designation resolver separates same code across branches/eras', () => {
    const registry: SpecialistUnitRegistry = {
      units: [
        baseProfile({
          id: 'unit-branch-a',
          designationCode: 'DX-9',
          branchId: 'branch-a',
          eraBand: 'era-1',
        }),
        baseProfile({
          id: 'unit-branch-b',
          designationCode: 'DX-9',
          branchId: 'branch-b',
          eraBand: 'era-2',
        }),
      ],
    }

    const resolution = resolveDesignationCollisions(registry)
    expect(resolution.collisions).toHaveLength(1)
    expect(resolution.resolvedByUnitId['unit-branch-a']).toBe('DX-9@branch-a:era-1')
    expect(resolution.resolvedByUnitId['unit-branch-b']).toBe('DX-9@branch-b:era-2')
    expect(resolution.resolvedByUnitId['unit-branch-a']).not.toBe(
      resolution.resolvedByUnitId['unit-branch-b']
    )
  })

  it('9. council/executive units are not default best fit for routine incidents', () => {
    const registry: SpecialistUnitRegistry = {
      units: [
        baseProfile({
          id: 'council-unit',
          designationCode: 'C-1',
          displayLabel: 'Executive Response Cell',
          authorityTier: 'council_sanctioned',
          unitTypes: ['armed', 'mobile', 'intelligence'],
          suitabilityTags: ['research_forward', 'containment_response'],
          executiveClearanceEligible: true,
        }),
        baseProfile({
          id: 'regional-research',
          designationCode: 'R-300',
          displayLabel: 'Regional Research Detachment',
          authorityTier: 'regional',
          unitTypes: ['research', 'mobile'],
          suitabilityTags: ['research_forward', 'analysis'],
        }),
      ],
    }

    const output = resolveUnitForMission({
      packet: basePacket({ commandMode: 'routine', missionPosture: 'research_forward' }),
      registry,
    })

    expect(output.ranked[0]?.unitId).toBe('regional-research')
    const council = output.ranked.find((result) => result.unitId === 'council-unit')
    expect(council?.rankingNotes).toContain('penalty:council_routine')
    expect(council?.fitScore ?? 0).toBeLessThan(output.ranked[0]?.fitScore ?? 0)
  })

  it('10. deployment delay / fatigue changes ranking', () => {
    const registry: SpecialistUnitRegistry = {
      units: [
        baseProfile({
          id: 'fast-ready',
          deploymentDelayWeeks: 0,
          fatigueReadiness: 90,
        }),
        baseProfile({
          id: 'slow-tired',
          designationCode: 'R-101',
          deploymentDelayWeeks: 4,
          fatigueReadiness: 35,
        }),
      ],
    }

    const output = resolveUnitForMission({
      packet: basePacket(),
      registry,
    })

    expect(output.ranked[0]?.unitId).toBe('fast-ready')
    const slow = output.ranked.find((result) => result.unitId === 'slow-tired')
    expect(slow?.blockers.some((blocker) => blocker.code === 'deployment_delay')).toBe(true)
    expect(slow?.rankingNotes).toContain('penalty:deployment_delay')
  })

  it('11. tied scores sort deterministically by unit id', () => {
    const registry: SpecialistUnitRegistry = {
      units: [
        baseProfile({ id: 'unit-zulu', designationCode: 'T-1' }),
        baseProfile({ id: 'unit-alpha', designationCode: 'T-2' }),
      ],
    }

    const first = resolveUnitForMission({ packet: basePacket(), registry })
    const second = resolveUnitForMission({ packet: basePacket(), registry })

    expect(first.ranked.map((result) => result.unitId)).toEqual(
      second.ranked.map((result) => result.unitId)
    )
    expect(first.ranked[0]?.unitId).toBe('unit-alpha')
  })

  it('12. inputs are not mutated', () => {
    const registry: SpecialistUnitRegistry = structuredClone({
      units: [baseProfile({ id: 'immutable-unit' })],
    })
    const packet = clonePacket(basePacket())
    const registryBefore = structuredClone(registry)
    const packetBefore = structuredClone(packet)

    resolveUnitForMission({ packet, registry })

    expect(registry).toEqual(registryBefore)
    expect(packet).toEqual(packetBefore)
  })

  it('13. result strings contain no source-specific/franchise tokens', () => {
    const registry: SpecialistUnitRegistry = {
      units: [baseProfile({ id: 'cp-native-unit', displayLabel: 'Containment Analysis Cell' })],
    }

    const output = resolveUnitForMission({
      packet: basePacket(),
      registry,
    })

    const tokens = collectSpecialistUnitResultTokens(output)
    expect(resultTokensContainFranchiseReferences(tokens)).toBe(false)
  })

  it('14. module does not import GameState, advanceWeek, React/UI, or harvest docs', () => {
    const source = readFileSync(resolve('src/domain/specialistUnits.ts'), 'utf8')

    expect(source).not.toMatch(/GameState/)
    expect(source).not.toMatch(/advanceWeek/)
    expect(source).not.toMatch(/from ['"]react/)
    expect(source).not.toMatch(/specialist-unit-registry-harvest/)
  })

  it('validates registry invariants', () => {
    const invalid: SpecialistUnitRegistry = {
      units: [
        baseProfile({ id: 'dup', deploymentDelayWeeks: -1, fatigueReadiness: 120 }),
        baseProfile({ id: 'dup', designationCode: '' }),
      ],
    }

    const validation = validateSpecialistUnitRegistry(invalid)
    expect(validation.valid).toBe(false)
    expect(validation.issues.length).toBeGreaterThan(0)
  })
})

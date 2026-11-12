import { describe, expect, it } from 'vitest'
import { copyInfiltrationCoverProfile } from '../domain/infiltrationCover'
import {
  canProjectInfiltrationEncounterRoleBranches,
  projectInfiltrationEncounterRoleBranches,
} from '../domain/infiltrationEncounterRoleBranches'
import {
  INFILTRATION_COVER_ROLE_OBSERVER_FRICTION,
  INFILTRATION_PROBE_ENCOUNTER_DETAILS,
} from '../domain/infiltrationEncounterReportNotes'
import { createStarterCase } from '../domain/templates/startingCases'
import type { CaseInstance } from '../domain/models'
import { caseTemplateMap } from '../domain/templates/caseTemplates'

function createEligibleCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    ...createStarterCase({ id: 'case-role-branches', templateId: 'ops-004' }),
    status: 'in_progress',
    hiddenState: 'hidden',
    tags: ['infiltration', 'covert', 'media', 'public'],
    infiltrationProbeProgress: 0.35,
    infiltrationAwareness: 0.42,
    infiltrationStage: 'probing',
    infiltrationCoverProfile: copyInfiltrationCoverProfile(
      caseTemplateMap['ops-004'].infiltrationCoverProfile
    ),
    assignedTeamIds: [],
    ...overrides,
  }
}

describe('infiltrationEncounterRoleBranches', () => {
  it('projects only for in-progress eligible cases with cover profile', () => {
    const eligible = createEligibleCase()
    expect(canProjectInfiltrationEncounterRoleBranches(eligible)).toBe(true)
    expect(canProjectInfiltrationEncounterRoleBranches({ ...eligible, status: 'open' })).toBe(false)
    expect(
      canProjectInfiltrationEncounterRoleBranches({
        ...eligible,
        infiltrationCoverProfile: undefined,
      })
    ).toBe(false)
    expect(
      projectInfiltrationEncounterRoleBranches({ ...eligible, hiddenState: undefined }).visible
    ).toBe(false)
    expect(
      projectInfiltrationEncounterRoleBranches({ ...eligible, status: 'resolved' }).visible
    ).toBe(false)
  })

  it('surfaces zone branch labels when claimed role clashes with site tags', () => {
    const projection = projectInfiltrationEncounterRoleBranches(createEligibleCase())

    expect(projection.claimedRole).toBe('uniform_guard')
    expect(projection.zoneBranchLabels).toContain(
      'Media presence zone — branches away from uniform guard cover'
    )
    expect(projection.zoneBranchLabels).toContain(
      'Public access zone — branches away from uniform guard cover'
    )
    expect(projection.alternativeRoleLabels.length).toBeGreaterThan(0)
    expect(projection.alignmentLabel).toBeUndefined()
  })

  it('lists compatible alternative roles for clashing site tags', () => {
    const projection = projectInfiltrationEncounterRoleBranches(createEligibleCase())

    expect(projection.alternativeRoleLabels[0]).toContain('Official inspector')
    expect(projection.alternativeRoleLabels[0]).toContain('compatible branch')
  })

  it('shows alignment when site tags fit the claimed role', () => {
    const projection = projectInfiltrationEncounterRoleBranches(
      createEligibleCase({
        tags: ['infiltration', 'covert', 'court', 'media'],
        infiltrationCoverProfile: {
          claimedRole: 'official_inspector',
          documentTier: 2,
          doctrineBand: 1,
        },
      })
    )

    expect(projection.zoneBranchLabels).toEqual([])
    expect(projection.alternativeRoleLabels).toEqual([])
    expect(projection.alignmentLabel).toBe('Current site tags align with claimed cover role')
  })

  it('surfaces route branch labels for extra authored route violations', () => {
    const projection = projectInfiltrationEncounterRoleBranches(
      createEligibleCase({
        tags: ['infiltration', 'covert', 'warehouse'],
        infiltrationCoverProfile: {
          claimedRole: 'official_inspector',
          routeViolationTags: ['warehouse'],
        },
      })
    )

    expect(projection.routeBranchLabels).toContain(
      'warehouse site context — route branch contradicts cover story'
    )
  })

  it('does not duplicate report encounter copy constants', () => {
    const projection = projectInfiltrationEncounterRoleBranches(createEligibleCase())
    const reportCopy = [
      ...Object.values(INFILTRATION_PROBE_ENCOUNTER_DETAILS),
      ...Object.values(INFILTRATION_COVER_ROLE_OBSERVER_FRICTION),
    ]
    const labels = [
      projection.claimedRoleLabel,
      projection.alignmentLabel,
      ...projection.zoneBranchLabels,
      ...projection.alternativeRoleLabels,
      ...projection.routeBranchLabels,
    ].filter((label): label is string => label !== undefined)

    for (const sentence of reportCopy) {
      for (const label of labels) {
        expect(label).not.toBe(sentence)
      }
    }
  })
})

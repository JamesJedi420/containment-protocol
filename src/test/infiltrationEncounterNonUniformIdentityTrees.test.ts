import { describe, expect, it } from 'vitest'
import { copyInfiltrationCoverProfile } from '../domain/infiltrationCover'
import {
  canProjectInfiltrationEncounterNonUniformIdentityTrees,
  INFILTRATION_NON_UNIFORM_COURIER_CONTEXT_TAGS,
  INFILTRATION_NON_UNIFORM_MAINTENANCE_CONTEXT_TAGS,
  isNonUniformIdentityInfiltrationCase,
  listActiveNonUniformIdentityContextTags,
  projectInfiltrationEncounterNonUniformIdentityTrees,
} from '../domain/infiltrationEncounterNonUniformIdentityTrees'
import {
  INFILTRATION_COVER_ROLE_OBSERVER_FRICTION,
  INFILTRATION_PROBE_ENCOUNTER_DETAILS,
} from '../domain/infiltrationEncounterReportNotes'
import { createStarterCase } from '../domain/templates/startingCases'
import type { CaseInstance } from '../domain/models'
import { caseTemplateMap } from '../domain/templates/caseTemplates'

function createCourierCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    ...createStarterCase({ id: 'case-non-uniform-courier', templateId: 'ops-001' }),
    status: 'in_progress',
    hiddenState: 'hidden',
    tags: ['infiltration', 'covert', 'relay', 'cyber'],
    infiltrationProbeProgress: 0.35,
    infiltrationAwareness: 0.42,
    infiltrationStage: 'probing',
    infiltrationCoverProfile: copyInfiltrationCoverProfile(
      caseTemplateMap['ops-001'].infiltrationCoverProfile
    ),
    assignedTeamIds: [],
    ...overrides,
  }
}

function createMaintenanceCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    ...createStarterCase({ id: 'case-non-uniform-maintenance', templateId: 'ops-003' }),
    status: 'in_progress',
    hiddenState: 'hidden',
    tags: ['infiltration', 'covert', 'archive', 'records'],
    infiltrationProbeProgress: 0.35,
    infiltrationAwareness: 0.42,
    infiltrationStage: 'probing',
    infiltrationCoverProfile: copyInfiltrationCoverProfile(
      caseTemplateMap['ops-003'].infiltrationCoverProfile
    ),
    assignedTeamIds: [],
    ...overrides,
  }
}

describe('infiltrationEncounterNonUniformIdentityTrees', () => {
  it('detects non-uniform cases by cover role plus role-specific context tags', () => {
    const courier = createCourierCase()
    expect(isNonUniformIdentityInfiltrationCase(courier)).toBe(true)
    expect(listActiveNonUniformIdentityContextTags(courier)).toEqual(['cyber', 'relay'])

    expect(
      isNonUniformIdentityInfiltrationCase({
        ...courier,
        tags: ['infiltration', 'covert', 'relay'],
        infiltrationCoverProfile: { claimedRole: 'courier' },
      })
    ).toBe(true)

    expect(
      isNonUniformIdentityInfiltrationCase({
        ...courier,
        tags: ['infiltration', 'covert'],
      })
    ).toBe(false)

    const maintenance = createMaintenanceCase()
    expect(isNonUniformIdentityInfiltrationCase(maintenance)).toBe(true)
    expect(listActiveNonUniformIdentityContextTags(maintenance)).toEqual([
      'archive',
      'forensics',
      'records',
    ])
  })

  it('projects only for in-progress eligible courier or maintenance cases with context tags', () => {
    const courier = createCourierCase()
    expect(canProjectInfiltrationEncounterNonUniformIdentityTrees(courier)).toBe(true)
    expect(canProjectInfiltrationEncounterNonUniformIdentityTrees({ ...courier, status: 'open' })).toBe(
      false
    )
    expect(
      canProjectInfiltrationEncounterNonUniformIdentityTrees({
        ...courier,
        infiltrationCoverProfile: { claimedRole: 'uniform_guard' },
      })
    ).toBe(false)
    expect(
      canProjectInfiltrationEncounterNonUniformIdentityTrees({
        ...courier,
        infiltrationCoverProfile: { claimedRole: 'civilian_staff' },
        tags: ['infiltration', 'covert', 'civilian', 'interview'],
      })
    ).toBe(false)
    expect(
      projectInfiltrationEncounterNonUniformIdentityTrees({ ...courier, hiddenState: undefined }).visible
    ).toBe(false)
    expect(
      projectInfiltrationEncounterNonUniformIdentityTrees({ ...courier, status: 'resolved' }).visible
    ).toBe(false)
  })

  it('surfaces relay-chain courier archetype and early-embed posture labels', () => {
    const projection = projectInfiltrationEncounterNonUniformIdentityTrees(createCourierCase())

    expect(projection.archetypeLabel).toBe('Relay-chain courier identity')
    expect(projection.postureLabel).toBe(
      'Early courier embed — room to establish non-institutional identity before scrutiny tightens'
    )
    expect(projection.branchLabels).toContain(
      'Relay nodes expect vendor courier handoffs without institutional badges'
    )
    expect(projection.branchLabels).toContain(
      'Cyber-adjacent sites tolerate packet-courier cover over office roles'
    )
  })

  it('maps logistics-route archetype for supply-chain context tags', () => {
    const projection = projectInfiltrationEncounterNonUniformIdentityTrees(
      createCourierCase({
        tags: ['infiltration', 'covert', 'logistics', 'supply-chain'],
      })
    )

    expect(projection.archetypeLabel).toBe('Logistics-route courier identity')
    expect(projection.branchLabels).toContain(
      'Supply-chain beats reward manifest-backed courier trees'
    )
  })

  it('surfaces records-vault maintenance archetype and branch labels', () => {
    const projection = projectInfiltrationEncounterNonUniformIdentityTrees(createMaintenanceCase())

    expect(projection.archetypeLabel).toBe('Records-vault service identity')
    expect(projection.branchLabels).toContain(
      'Archive wings expect after-hours maintenance vendor trees'
    )
    expect(projection.branchLabels).toContain(
      'Records rooms branch on service-ticket identity rather than staff rosters'
    )
  })

  it('shifts posture label at mid-embed, weak documents, and complication awareness bands', () => {
    const midEmbed = projectInfiltrationEncounterNonUniformIdentityTrees(
      createCourierCase({
        infiltrationProbeProgress: 0.55,
        infiltrationAwareness: 0.4,
      })
    )
    expect(midEmbed.postureLabel).toBe(
      'Mid-embed courier posture — observers may cross-check recurring vendor patterns'
    )

    const weakDocs = projectInfiltrationEncounterNonUniformIdentityTrees(
      createCourierCase({
        infiltrationCoverProfile: {
          claimedRole: 'courier',
          documentTier: 0,
        },
      })
    )
    expect(weakDocs.postureLabel).toBe(
      'Paper-thin vendor credentials — manifests may not survive spot checks'
    )

    const thinning = projectInfiltrationEncounterNonUniformIdentityTrees(
      createCourierCase({
        infiltrationProbeProgress: 0.35,
        infiltrationAwareness: 0.6,
      })
    )
    expect(thinning.postureLabel).toBe(
      'Non-uniform courier identity thinning — vendor-tree comparisons accelerating'
    )
  })

  it('covers every declared courier and maintenance context tag in eligibility list', () => {
    for (const tag of INFILTRATION_NON_UNIFORM_COURIER_CONTEXT_TAGS) {
      expect(
        isNonUniformIdentityInfiltrationCase(
          createCourierCase({
            tags: ['infiltration', 'covert', tag],
          })
        )
      ).toBe(true)
    }

    for (const tag of INFILTRATION_NON_UNIFORM_MAINTENANCE_CONTEXT_TAGS) {
      expect(
        isNonUniformIdentityInfiltrationCase(
          createMaintenanceCase({
            tags: ['infiltration', 'covert', tag],
          })
        )
      ).toBe(true)
    }
  })

  it('does not duplicate report encounter copy constants', () => {
    const projection = projectInfiltrationEncounterNonUniformIdentityTrees(createCourierCase())
    const reportCopy = [
      ...Object.values(INFILTRATION_PROBE_ENCOUNTER_DETAILS),
      ...Object.values(INFILTRATION_COVER_ROLE_OBSERVER_FRICTION),
    ]
    const labels = [
      projection.archetypeLabel,
      projection.postureLabel,
      projection.identitySummaryLabel,
      ...projection.branchLabels,
    ]

    for (const sentence of reportCopy) {
      for (const label of labels) {
        expect(label).not.toBe(sentence)
      }
    }
  })
})

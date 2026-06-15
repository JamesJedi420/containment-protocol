import { describe, expect, it } from 'vitest'
import { copyInfiltrationCoverProfile } from '../domain/infiltrationCover'
import {
  canProjectInfiltrationEncounterGuidesDocuments,
  projectInfiltrationEncounterGuidesDocuments,
} from '../domain/infiltrationEncounterGuidesDocuments'
import {
  INFILTRATION_COVER_ROLE_OBSERVER_FRICTION,
  INFILTRATION_PROBE_ENCOUNTER_DETAILS,
} from '../domain/infiltrationEncounterReportNotes'
import { createStarterCase } from '../domain/templates/startingCases'
import type { CaseInstance } from '../domain/models'
import { caseTemplateMap } from '../domain/templates/caseTemplates'

function createEligibleCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    ...createStarterCase({ id: 'case-guides-documents', templateId: 'ops-004' }),
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

describe('infiltrationEncounterGuidesDocuments', () => {
  it('projects only for in-progress eligible cases with cover profile', () => {
    const eligible = createEligibleCase()
    expect(canProjectInfiltrationEncounterGuidesDocuments(eligible)).toBe(true)
    expect(canProjectInfiltrationEncounterGuidesDocuments({ ...eligible, status: 'open' })).toBe(
      false
    )
    expect(
      canProjectInfiltrationEncounterGuidesDocuments({
        ...eligible,
        infiltrationCoverProfile: undefined,
      })
    ).toBe(false)
    expect(
      projectInfiltrationEncounterGuidesDocuments({ ...eligible, hiddenState: undefined }).visible
    ).toBe(false)
  })

  it('maps document tier labels from profile tier', () => {
    const strong = projectInfiltrationEncounterGuidesDocuments(
      createEligibleCase({
        tags: ['infiltration', 'covert'],
        infiltrationCoverProfile: {
          claimedRole: 'uniform_guard',
          documentTier: 2,
          doctrineBand: 1,
        },
      })
    )
    expect(strong.documentTierLabel).toBe('Strong institutional backing')

    const plausible = projectInfiltrationEncounterGuidesDocuments(
      createEligibleCase({
        tags: ['infiltration', 'covert'],
        infiltrationCoverProfile: {
          claimedRole: 'uniform_guard',
          documentTier: 1,
          doctrineBand: 1,
        },
      })
    )
    expect(plausible.documentTierLabel).toBe('Plausible cover credentials')

    const forged = projectInfiltrationEncounterGuidesDocuments(
      createEligibleCase({
        tags: ['infiltration', 'covert'],
        infiltrationCoverProfile: {
          claimedRole: 'uniform_guard',
          documentTier: 0,
          doctrineBand: 1,
        },
      })
    )
    expect(forged.documentTierLabel).toBe('Forged or missing paperwork')
  })

  it('maps doctrine guide labels from doctrine band', () => {
    const fluent = projectInfiltrationEncounterGuidesDocuments(
      createEligibleCase({
        tags: ['infiltration', 'covert'],
        infiltrationCoverProfile: {
          claimedRole: 'uniform_guard',
          documentTier: 2,
          doctrineBand: 0.5,
        },
      })
    )
    expect(fluent.doctrineGuideLabel).toBe('Cover guide fluent for scripted checks')

    const partial = projectInfiltrationEncounterGuidesDocuments(
      createEligibleCase({
        tags: ['infiltration', 'covert'],
        infiltrationCoverProfile: {
          claimedRole: 'uniform_guard',
          documentTier: 2,
          doctrineBand: 0.2,
        },
      })
    )
    expect(partial.doctrineGuideLabel).toBe('Cover guide partial — review before questioning')

    const thin = projectInfiltrationEncounterGuidesDocuments(
      createEligibleCase({
        tags: ['infiltration', 'covert'],
        infiltrationCoverProfile: {
          claimedRole: 'uniform_guard',
          documentTier: 2,
          doctrineBand: 0.1,
        },
      })
    )
    expect(thin.doctrineGuideLabel).toBe('Cover guide thin under procedural scrutiny')
  })

  it('surfaces scrutiny and readiness labels from profile tier and case tags', () => {
    const projection = projectInfiltrationEncounterGuidesDocuments(
      createEligibleCase({
        tags: ['infiltration', 'covert', 'media', 'public', 'witness', 'interview'],
        infiltrationCoverProfile: {
          claimedRole: 'uniform_guard',
          documentTier: 0,
          doctrineBand: 0.2,
        },
      })
    )

    expect(projection.scrutinyLabels).toContain('Authority scrutiny active on site')
    expect(projection.scrutinyLabels).toContain('Procedural scrutiny active on site')
    expect(projection.readinessLabels).toContain('Paperwork may fail badge or clearance checks')
    expect(projection.readinessLabels).toContain('Scripted answers may fail under interview pressure')
  })

  it('does not duplicate report encounter copy constants', () => {
    const projection = projectInfiltrationEncounterGuidesDocuments(createEligibleCase())
    const reportCopy = [
      ...Object.values(INFILTRATION_PROBE_ENCOUNTER_DETAILS),
      ...Object.values(INFILTRATION_COVER_ROLE_OBSERVER_FRICTION),
    ]

    for (const sentence of reportCopy) {
      expect(projection.documentTierLabel).not.toBe(sentence)
      expect(projection.doctrineGuideLabel).not.toBe(sentence)
      for (const label of projection.scrutinyLabels) {
        expect(label).not.toBe(sentence)
      }
      for (const label of projection.readinessLabels) {
        expect(label).not.toBe(sentence)
      }
    }
  })
})

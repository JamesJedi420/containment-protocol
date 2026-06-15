import { describe, expect, it } from 'vitest'
import { copyInfiltrationCoverProfile } from '../domain/infiltrationCover'
import {
  canProjectInfiltrationEncounterCivilianLongHorizonRoles,
  INFILTRATION_CIVILIAN_LONG_HORIZON_CONTEXT_TAGS,
  isCivilianLongHorizonInfiltrationCase,
  listActiveCivilianLongHorizonContextTags,
  projectInfiltrationEncounterCivilianLongHorizonRoles,
} from '../domain/infiltrationEncounterCivilianLongHorizonRoles'
import {
  INFILTRATION_COVER_ROLE_OBSERVER_FRICTION,
  INFILTRATION_PROBE_ENCOUNTER_DETAILS,
} from '../domain/infiltrationEncounterReportNotes'
import { createStarterCase } from '../domain/templates/startingCases'
import type { CaseInstance } from '../domain/models'
import { caseTemplateMap } from '../domain/templates/caseTemplates'

function createEligibleCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    ...createStarterCase({ id: 'case-civilian-long-horizon', templateId: 'ops-002' }),
    status: 'in_progress',
    hiddenState: 'hidden',
    tags: ['infiltration', 'covert', 'civilian', 'interview', 'memory'],
    infiltrationProbeProgress: 0.35,
    infiltrationAwareness: 0.42,
    infiltrationStage: 'probing',
    infiltrationCoverProfile: copyInfiltrationCoverProfile(
      caseTemplateMap['ops-002'].infiltrationCoverProfile
    ),
    assignedTeamIds: [],
    ...overrides,
  }
}

describe('infiltrationEncounterCivilianLongHorizonRoles', () => {
  it('detects civilian long-horizon cases by civilian tag plus context tags', () => {
    const eligible = createEligibleCase()
    expect(isCivilianLongHorizonInfiltrationCase(eligible)).toBe(true)
    expect(listActiveCivilianLongHorizonContextTags(eligible)).toEqual(['interview', 'memory'])

    expect(
      isCivilianLongHorizonInfiltrationCase({
        ...eligible,
        tags: ['infiltration', 'covert', 'civilian'],
      })
    ).toBe(false)

    expect(
      isCivilianLongHorizonInfiltrationCase({
        ...eligible,
        tags: ['infiltration', 'covert', 'interview', 'memory'],
      })
    ).toBe(false)
  })

  it('projects only for in-progress eligible civilian_staff cases with long-horizon tags', () => {
    const eligible = createEligibleCase()
    expect(canProjectInfiltrationEncounterCivilianLongHorizonRoles(eligible)).toBe(true)
    expect(canProjectInfiltrationEncounterCivilianLongHorizonRoles({ ...eligible, status: 'open' })).toBe(
      false
    )
    expect(
      canProjectInfiltrationEncounterCivilianLongHorizonRoles({
        ...eligible,
        infiltrationCoverProfile: {
          claimedRole: 'uniform_guard',
        },
      })
    ).toBe(false)
    expect(
      projectInfiltrationEncounterCivilianLongHorizonRoles({ ...eligible, hiddenState: undefined }).visible
    ).toBe(false)
    expect(
      projectInfiltrationEncounterCivilianLongHorizonRoles({ ...eligible, status: 'resolved' }).visible
    ).toBe(false)
  })

  it('surfaces interview-cycle archetype and early-embed sustain labels', () => {
    const projection = projectInfiltrationEncounterCivilianLongHorizonRoles(createEligibleCase())

    expect(projection.archetypeLabel).toBe('Interview-cycle embed')
    expect(projection.sustainLabel).toBe(
      'Early embed — room to establish civilian_staff routine before scrutiny tightens'
    )
    expect(projection.contextLabels).toContain('Interview rooms expect repeated civilian_staff visits')
    expect(projection.contextLabels).toContain('Memory-contamination beats reward patient embed posture')
  })

  it('maps public-footprint archetype for public context tags', () => {
    const projection = projectInfiltrationEncounterCivilianLongHorizonRoles(
      createEligibleCase({
        tags: ['infiltration', 'covert', 'civilian', 'public', 'market'],
      })
    )

    expect(projection.archetypeLabel).toBe('Public-footprint embed')
    expect(projection.contextLabels).toContain('Public zones tolerate civilian drift over multiple weeks')
  })

  it('shifts sustain label at mid-embed and complication awareness bands', () => {
    const midEmbedCase = createEligibleCase({
      infiltrationProbeProgress: 0.55,
      infiltrationAwareness: 0.4,
    })
    const midEmbed = projectInfiltrationEncounterCivilianLongHorizonRoles(midEmbedCase)
    expect(midEmbed.sustainLabel).toBe(
      'Mid-embed sustain — observers may compare recurring civilian patterns'
    )

    const thinningCase = createEligibleCase({
      infiltrationProbeProgress: 0.35,
      infiltrationAwareness: 0.6,
    })
    expect(thinningCase.infiltrationAwareness).toBe(0.6)
    const thinning = projectInfiltrationEncounterCivilianLongHorizonRoles(thinningCase)
    expect(thinning.sustainLabel).toBe(
      'Long-horizon cover thinning — week-over-week routine comparisons accelerating'
    )
  })

  it('covers every declared long-horizon context tag in eligibility list', () => {
    for (const tag of INFILTRATION_CIVILIAN_LONG_HORIZON_CONTEXT_TAGS) {
      expect(
        isCivilianLongHorizonInfiltrationCase(
          createEligibleCase({
            tags: ['infiltration', 'covert', 'civilian', tag],
          })
        )
      ).toBe(true)
    }
  })

  it('does not duplicate report encounter copy constants', () => {
    const projection = projectInfiltrationEncounterCivilianLongHorizonRoles(createEligibleCase())
    const reportCopy = [
      ...Object.values(INFILTRATION_PROBE_ENCOUNTER_DETAILS),
      ...Object.values(INFILTRATION_COVER_ROLE_OBSERVER_FRICTION),
    ]
    const labels = [
      projection.archetypeLabel,
      projection.sustainLabel,
      projection.embedSummaryLabel,
      ...projection.contextLabels,
    ]

    for (const sentence of reportCopy) {
      for (const label of labels) {
        expect(label).not.toBe(sentence)
      }
    }
  })
})

import { describe, expect, it } from 'vitest'
import { copyInfiltrationCoverProfile } from '../domain/infiltrationCover'
import {
  applyInfiltrationEncounterCoverStance,
  readInfiltrationEncounterCoverStance,
} from '../domain/infiltrationEncounterCoverStance'
import {
  canProjectInfiltrationEncounterStateCover,
  projectInfiltrationEncounterStateCover,
} from '../domain/infiltrationEncounterStateCover'
import {
  AWARENESS_COMPLICATION_THRESHOLD,
  VIOLENT_ESCALATION_THRESHOLD,
} from '../domain/infiltrationProbe'
import { createStarterCase } from '../domain/templates/startingCases'
import type { CaseInstance, GameState } from '../domain/models'
import { caseTemplateMap } from '../domain/templates/caseTemplates'

function createEligibleCase(overrides: Partial<CaseInstance> = {}): CaseInstance {
  return {
    ...createStarterCase({ id: 'case-encounter-cover', templateId: 'ops-004' }),
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

function createGame(caseData: CaseInstance): GameState {
  return {
    week: 3,
    rngSeed: 1,
    rngState: 1,
    gameOver: false,
    directiveState: { week: 3, directives: [] },
    agents: {},
    staff: {},
    candidates: [],
    teams: {},
    cases: { [caseData.id]: caseData },
    templates: {},
    reports: [],
    events: [],
  }
}

describe('infiltrationEncounterStateCover', () => {
  it('projects only for in-progress eligible cases with cover profile', () => {
    const eligible = createEligibleCase()
    expect(canProjectInfiltrationEncounterStateCover(eligible)).toBe(true)
    expect(canProjectInfiltrationEncounterStateCover({ ...eligible, status: 'open' })).toBe(false)
    expect(
      canProjectInfiltrationEncounterStateCover({
        ...eligible,
        infiltrationCoverProfile: undefined,
      })
    ).toBe(false)
    expect(
      projectInfiltrationEncounterStateCover({ ...eligible, hiddenState: undefined }).visible
    ).toBe(false)
  })

  it('maps stable and strained bands from awareness and cover strain', () => {
    const stable = projectInfiltrationEncounterStateCover(
      createEligibleCase({ infiltrationAwareness: 0.1, tags: ['infiltration', 'covert'] })
    )
    expect(stable.band).toBe('stable')
    expect(stable.hasElevatedPosture).toBe(false)

    const strained = projectInfiltrationEncounterStateCover(createEligibleCase())
    expect(strained.band).toBe('strained')
    expect(strained.hasElevatedPosture).toBe(true)
    expect(strained.factorLabels.length).toBeGreaterThan(0)
  })

  it('maps compromised and critical bands from stage and awareness thresholds', () => {
    const compromised = projectInfiltrationEncounterStateCover(
      createEligibleCase({
        infiltrationAwareness: AWARENESS_COMPLICATION_THRESHOLD,
      })
    )
    expect(compromised.band).toBe('compromised')
    expect(compromised.awarenessBand).toBe('complication')

    const critical = projectInfiltrationEncounterStateCover(
      createEligibleCase({
        infiltrationStage: 'violent',
        infiltrationAwareness: VIOLENT_ESCALATION_THRESHOLD,
      })
    )
    expect(critical.band).toBe('critical')
    expect(critical.awarenessBand).toBe('critical')
  })

  it('persists and clears player cover stance on eligible cases', () => {
    const caseData = createEligibleCase()
    const game = createGame(caseData)

    const applied = applyInfiltrationEncounterCoverStance(game, {
      caseId: caseData.id,
      stance: 'reinforce',
    })
    expect(applied.applied).toBe(true)
    expect(readInfiltrationEncounterCoverStance(applied.state.cases[caseData.id])).toBe('reinforce')

    const cleared = applyInfiltrationEncounterCoverStance(applied.state, {
      caseId: caseData.id,
      stance: null,
    })
    expect(cleared.applied).toBe(true)
    expect(cleared.state.cases[caseData.id]?.infiltrationEncounterCoverStance).toBeUndefined()
    expect(readInfiltrationEncounterCoverStance(cleared.state.cases[caseData.id])).toBe('maintain')
  })

  it('rejects stance writes on ineligible cases', () => {
    const caseData = createEligibleCase({ status: 'resolved' })
    const result = applyInfiltrationEncounterCoverStance(createGame(caseData), {
      caseId: caseData.id,
      stance: 'low_profile',
    })

    expect(result.applied).toBe(false)
    expect(result.reason).toBe('ineligible')
  })
})

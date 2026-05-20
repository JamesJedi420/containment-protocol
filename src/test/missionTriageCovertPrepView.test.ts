import { describe, expect, it } from 'vitest'
import { copyInfiltrationProbePlan } from '../domain/infiltrationProbe'
import {
  applyStealthLeaveBehindInvestigationCustodyLoss,
  buildInvestigationCustodyLossFlagId,
} from '../domain/investigationCustodyLoss'
import {
  applySuccessfulInvestigation,
  askInvestigationQuestion,
  grantInvestigationQuestionBudget,
} from '../domain/investigationEconomy'
import { setPersistentFlag } from '../domain/flagSystem'
import { buildConcealCaseFlagId } from '../domain/concealmentCasePrep'
import type { CaseInstance } from '../domain/models'
import { createStarterCase } from '../domain/templates/startingCases'
import { caseTemplateMap } from '../domain/templates/caseTemplates'
import { createStartingState } from '../data/startingState'
import { buildInvestigationCasePrepView } from '../features/cases/investigationCasePrepView'
import { MISSION_TRIAGE_COVERT_PREP_LABELS } from '../data/copy'
import { buildMissionTriageCovertPrepSignals } from '../features/cases/missionTriageCovertPrepView'

function createConcealmentEligibleCase(overrides: Partial<CaseInstance> = {}) {
  return {
    ...createStarterCase({ id: 'case-triage-conceal', templateId: 'ops-003' }),
    status: 'in_progress' as const,
    tags: ['infiltration'],
    requiredTags: [],
    preferredTags: [],
    assignedTeamIds: [],
    ...overrides,
  }
}

function createInfiltrationCase() {
  return {
    ...createStarterCase({ id: 'case-triage-infiltration', templateId: 'ops-004' }),
    status: 'in_progress' as const,
    hiddenState: 'hidden' as const,
    infiltrationProbeProgress: 0.42,
    infiltrationAwareness: 0.61,
    infiltrationStage: 'probing' as const,
    tags: ['infiltration', 'media', 'public'],
    infiltrationProbePlan: copyInfiltrationProbePlan(caseTemplateMap['ops-004'].infiltrationProbePlan),
    infiltrationCoverProfile: caseTemplateMap['ops-004'].infiltrationCoverProfile,
    requiredTags: [],
    preferredTags: [],
    assignedTeamIds: [],
  }
}

describe('missionTriageCovertPrepView', () => {
  it('is hidden for open and resolved cases', () => {
    const inProgress = createConcealmentEligibleCase()
    const open = { ...inProgress, status: 'open' as const }
    const resolved = { ...inProgress, status: 'resolved' as const }
    const game = createStartingState()

    expect(buildMissionTriageCovertPrepSignals(open, game).visible).toBe(false)
    expect(buildMissionTriageCovertPrepSignals(resolved, game).markers).toHaveLength(0)
  })

  it('uses canonical game status when case argument is stale', () => {
    const game = createStartingState()
    const caseData = createConcealmentEligibleCase()
    game.cases[caseData.id] = { ...caseData, status: 'resolved' }

    const signals = buildMissionTriageCovertPrepSignals(
      { ...caseData, status: 'in_progress' },
      game
    )

    expect(signals.visible).toBe(false)
    expect(signals.markers).toHaveLength(0)
  })

  it('shows concealment preview chip for tag-eligible in-progress cases', () => {
    const game = createStartingState()
    const caseData = createConcealmentEligibleCase()
    const signals = buildMissionTriageCovertPrepSignals(caseData, game)

    expect(
      signals.markers.some(
        (marker) => marker.label === MISSION_TRIAGE_COVERT_PREP_LABELS.concealmentPreview
      )
    ).toBe(true)
  })

  it('shows covert requested chip when conceal flag is active', () => {
    let state = createStartingState()
    const caseData = createConcealmentEligibleCase({ tags: [] })
    state.cases[caseData.id] = caseData
    state = setPersistentFlag(state, buildConcealCaseFlagId(caseData.id), true)

    const signals = buildMissionTriageCovertPrepSignals(state.cases[caseData.id]!, state)

    expect(
      signals.markers.some(
        (marker) => marker.label === MISSION_TRIAGE_COVERT_PREP_LABELS.concealmentRequested
      )
    ).toBe(true)
  })

  it('shows cover strain chip when infiltration cover posture is strained', () => {
    const game = createStartingState()
    const caseData = createInfiltrationCase()
    game.cases[caseData.id] = caseData
    const signals = buildMissionTriageCovertPrepSignals(caseData, game)

    expect(
      signals.markers.some(
        (marker) => marker.label === MISSION_TRIAGE_COVERT_PREP_LABELS.coverStrain
      )
    ).toBe(true)
  })

  it('shows infiltration probe and awareness chip when probe plan applies', () => {
    const game = createStartingState()
    const caseData = createInfiltrationCase()
    game.cases[caseData.id] = caseData
    const signals = buildMissionTriageCovertPrepSignals(caseData, game)

    expect(signals.markers.some((marker) => marker.label.includes('Probe 42%'))).toBe(true)
    expect(signals.markers.some((marker) => marker.label.includes('awareness 61%'))).toBe(true)
  })

  it('omits infiltration chips when case is not infiltration-eligible', () => {
    const game = createStartingState()
    const caseData = {
      ...createConcealmentEligibleCase(),
      hiddenState: undefined,
    }
    game.cases[caseData.id] = caseData

    const signals = buildMissionTriageCovertPrepSignals(caseData, game)

    expect(signals.markers.some((marker) => marker.id.startsWith('infiltration'))).toBe(false)
  })

  it('shows leave-behind staged chip when selection is set', () => {
    const game = createStartingState()
    const caseData = {
      ...createInfiltrationCase(),
      stealthLeaveBehindId: 'leave-behind:risk-discovery',
    }
    game.cases[caseData.id] = caseData
    const signals = buildMissionTriageCovertPrepSignals(caseData, game)

    expect(
      signals.markers.some(
        (marker) => marker.label === MISSION_TRIAGE_COVERT_PREP_LABELS.leaveBehindStaged
      )
    ).toBe(true)
  })

  it('shows forensic strain when custody markers burden the case', () => {
    let state = createStartingState()
    const caseData = createInfiltrationCase()
    state.cases[caseData.id] = caseData
    state = grantInvestigationQuestionBudget(state, {
      caseId: caseData.id,
      domain: 'forensic',
      amount: 2,
    })
    const custodyResult = applyStealthLeaveBehindInvestigationCustodyLoss({
      state,
      caseId: caseData.id,
      leaveBehindId: 'leave-behind:abandon-evidence',
      leaveBehindKind: 'abandon_evidence',
      leaveBehindLabel: 'Abandon compromised evidence',
      custodyLossRefs: ['custody:field-packet'],
      week: 1,
    })
    state = custodyResult.state

    const signals = buildMissionTriageCovertPrepSignals(state.cases[caseData.id]!, state)

    expect(
      signals.markers.some(
        (marker) => marker.label === MISSION_TRIAGE_COVERT_PREP_LABELS.forensicStrain
      )
    ).toBe(true)
    expect(
      state.runtimeState?.globalFlags?.[
        buildInvestigationCustodyLossFlagId(caseData.id, 'custody:field-packet')
      ]
    ).toBeTruthy()
  })

  it('prefers covert requested chip over preview when both apply', () => {
    let state = createStartingState()
    const caseData = createConcealmentEligibleCase()
    state.cases[caseData.id] = caseData
    state = setPersistentFlag(state, buildConcealCaseFlagId(caseData.id), true)

    const signals = buildMissionTriageCovertPrepSignals(state.cases[caseData.id]!, state)

    expect(
      signals.markers.some(
        (marker) => marker.label === MISSION_TRIAGE_COVERT_PREP_LABELS.concealmentRequested
      )
    ).toBe(true)
    expect(
      signals.markers.some(
        (marker) => marker.label === MISSION_TRIAGE_COVERT_PREP_LABELS.concealmentPreview
      )
    ).toBe(false)
  })

  it('shows forensic strain when granted budget is exhausted without custody markers', () => {
    let state = createStartingState()
    const caseData = {
      ...createStarterCase({ id: 'case-triage-forensic', templateId: 'ops-003' }),
      status: 'in_progress' as const,
      hiddenState: 'hidden' as const,
      detectionConfidence: 0.25,
      counterDetection: false,
      tags: ['infiltration', 'archive'],
      requiredTags: [],
      preferredTags: [],
      assignedTeamIds: [],
    }
    state.cases[caseData.id] = caseData
    state = applySuccessfulInvestigation(state, {
      caseId: caseData.id,
      forensicBudget: 1,
      tacticalBudget: 0,
    })
    const asked = askInvestigationQuestion(state, {
      caseId: caseData.id,
      domain: 'forensic',
      questionId: 'forensic.present-signature',
    })

    expect(asked.applied).toBe(true)
    expect(asked.remainingBudget).toBe(0)

    const prep = buildInvestigationCasePrepView(state.cases[caseData.id]!, asked.state)
    expect(prep.forensic.budget.granted).toBeGreaterThan(0)
    expect(prep.forensic.budget.remaining).toBe(0)

    const signals = buildMissionTriageCovertPrepSignals(state.cases[caseData.id]!, asked.state)

    expect(signals.markers.map((marker) => marker.id)).toContain('forensic-strain')
  })

  it('does not show forensic strain without granted budget or custody markers', () => {
    const game = createStartingState()
    const caseData = createInfiltrationCase()
    game.cases[caseData.id] = caseData

    const signals = buildMissionTriageCovertPrepSignals(caseData, game)

    expect(
      signals.markers.some(
        (marker) => marker.label === MISSION_TRIAGE_COVERT_PREP_LABELS.forensicStrain
      )
    ).toBe(false)
  })

  it('reads leave-behind selection from canonical game case state', () => {
    const game = createStartingState()
    const caseData = createInfiltrationCase()
    game.cases[caseData.id] = {
      ...caseData,
      stealthLeaveBehindId: 'leave-behind:risk-discovery',
    }

    const signals = buildMissionTriageCovertPrepSignals(
      { ...caseData, stealthLeaveBehindId: undefined },
      game
    )

    expect(
      signals.markers.some(
        (marker) => marker.label === MISSION_TRIAGE_COVERT_PREP_LABELS.leaveBehindStaged
      )
    ).toBe(true)
  })

  it('surfaces deferral note when infiltration strain coincides with high escalation risk', () => {
    const game = createStartingState()
    const caseData = {
      ...createInfiltrationCase(),
      stage: 4,
      kind: 'raid' as const,
      raid: { minTeams: 2, maxTeams: 2 },
    }
    game.cases[caseData.id] = caseData

    const signals = buildMissionTriageCovertPrepSignals(caseData, game)

    expect(signals.deferralNote).toBe(MISSION_TRIAGE_COVERT_PREP_LABELS.deferralNote)
  })

  it('omits concealment chips when case is already concealed', () => {
    const game = createStartingState()
    const caseData = { ...createConcealmentEligibleCase(), hiddenState: 'hidden' as const }
    const signals = buildMissionTriageCovertPrepSignals(caseData, game)

    expect(signals.markers.some((marker) => marker.id.startsWith('concealment'))).toBe(false)
  })

  it('caps marker count at four', () => {
    let state = createStartingState()
    const caseData = {
      ...createInfiltrationCase(),
      stage: 4,
      kind: 'raid' as const,
      raid: { minTeams: 2, maxTeams: 2 },
      stealthLeaveBehindId: 'leave-behind:risk-discovery',
    }
    state.cases[caseData.id] = caseData
    state = grantInvestigationQuestionBudget(state, {
      caseId: caseData.id,
      domain: 'forensic',
      amount: 1,
    })
    const custodyResult = applyStealthLeaveBehindInvestigationCustodyLoss({
      state,
      caseId: caseData.id,
      leaveBehindId: 'leave-behind:abandon-evidence',
      leaveBehindKind: 'abandon_evidence',
      leaveBehindLabel: 'Abandon compromised evidence',
      custodyLossRefs: ['custody:field-packet', 'custody:chain-seal'],
      week: 1,
    })
    state = custodyResult.state

    const signals = buildMissionTriageCovertPrepSignals(state.cases[caseData.id]!, state)

    expect(signals.markers.length).toBeLessThanOrEqual(4)
  })
})

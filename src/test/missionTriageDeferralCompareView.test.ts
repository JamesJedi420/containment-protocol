import { describe, expect, it } from 'vitest'
import { copyInfiltrationProbePlan } from '../domain/infiltrationProbe'
import {
  applyStealthLeaveBehindInvestigationCustodyLoss,
} from '../domain/investigationCustodyLoss'
import { grantInvestigationQuestionBudget } from '../domain/investigationEconomy'
import { setPersistentFlag } from '../domain/flagSystem'
import { buildConcealCaseFlagId } from '../domain/concealmentCasePrep'
import type { CaseInstance } from '../domain/models'
import { createStarterCase } from '../domain/templates/startingCases'
import { caseTemplateMap } from '../domain/templates/caseTemplates'
import { createStartingState } from '../data/startingState'
import {
  MISSION_TRIAGE_DEFERRAL_COMPARE_LABELS,
  formatMissionTriageDeferralRiskValue,
} from '../data/copy'
import { getCaseListItemView } from '../features/cases/caseView'
import { buildMissionTriageDeferralCompareView } from '../features/cases/missionTriageDeferralCompareView'

function createConcealmentEligibleCase(overrides: Partial<CaseInstance> = {}) {
  return {
    ...createStarterCase({ id: 'case-deferral-conceal', templateId: 'ops-003' }),
    status: 'in_progress' as const,
    tags: ['infiltration'],
    requiredTags: [],
    preferredTags: [],
    assignedTeamIds: [],
    ...overrides,
  }
}

function createInfiltrationCase(overrides: Partial<CaseInstance> = {}) {
  return {
    ...createStarterCase({ id: 'case-deferral-infiltration', templateId: 'ops-004' }),
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
    ...overrides,
  }
}

describe('missionTriageDeferralCompareView', () => {
  it('is hidden for open and resolved cases', () => {
    const inProgress = createConcealmentEligibleCase()
    const game = createStartingState()

    expect(buildMissionTriageDeferralCompareView({ ...inProgress, status: 'open' }, game).visible).toBe(
      false
    )
    expect(
      buildMissionTriageDeferralCompareView({ ...inProgress, status: 'resolved' }, game).visible
    ).toBe(false)
  })

  it('shows three columns when covert prep signals are visible', () => {
    const game = createStartingState()
    const caseData = createConcealmentEligibleCase()
    const view = buildMissionTriageDeferralCompareView(caseData, game)

    expect(view.visible).toBe(true)
    expect(view.columns.map((column) => column.id)).toEqual([
      'covertPrepCost',
      'deferralRisk',
      'escalationCarryover',
    ])
    expect(view.columns[0]?.label).toBe(MISSION_TRIAGE_DEFERRAL_COMPARE_LABELS.covertPrepCost)
  })

  it('rates covert prep cost high when awareness exceeds complication band', () => {
    const game = createStartingState()
    const caseData = createInfiltrationCase()
    game.cases[caseData.id] = caseData

    const view = buildMissionTriageDeferralCompareView(caseData, game)
    const covertColumn = view.columns.find((column) => column.id === 'covertPrepCost')

    expect(covertColumn?.tone).toBe('high')
    expect(covertColumn?.value).toBe('High')
    expect(covertColumn?.detail).toContain('awareness 61%')
  })

  it('surfaces high deferral risk for critical-stage infiltration cases', () => {
    const game = createStartingState()
    const caseData = createInfiltrationCase({ stage: 4 })
    game.cases[caseData.id] = caseData

    const view = buildMissionTriageDeferralCompareView(caseData, game)
    const deferralColumn = view.columns.find((column) => column.id === 'deferralRisk')

    expect(deferralColumn?.tone).toBe('high')
    expect(deferralColumn?.value).toBe(formatMissionTriageDeferralRiskValue('high', 20))
    expect(deferralColumn?.detail).toContain('Deadline')
  })

  it('includes carryover cross-link when escalation is high', () => {
    const game = createStartingState()
    const caseData = createInfiltrationCase({ stage: 4 })
    game.cases[caseData.id] = caseData

    const view = buildMissionTriageDeferralCompareView(caseData, game)

    expect(view.carryoverLink?.label).toBe(MISSION_TRIAGE_DEFERRAL_COMPARE_LABELS.carryoverLinkLabel)
    expect(view.carryoverLink?.detail).toContain('escalation thresholds')
  })

  it('shows compare view for deadline-risk cases without covert chips', () => {
    const game = createStartingState()
    const caseData = {
      ...createStarterCase({ id: 'case-deadline', templateId: 'ops-001' }),
      status: 'in_progress' as const,
      deadlineRemaining: 1,
      stage: 1,
      tags: [],
      requiredTags: [],
      preferredTags: [],
      assignedTeamIds: [],
    }
    game.cases[caseData.id] = caseData

    const view = buildMissionTriageDeferralCompareView(caseData, game)

    expect(view.visible).toBe(true)
    expect(view.columns.find((column) => column.id === 'deferralRisk')?.detail).toContain(
      '1 week left'
    )
  })

  it('is hidden when case is not in progress in canonical game state', () => {
    const game = createStartingState()
    const caseData = createConcealmentEligibleCase()
    game.cases[caseData.id] = { ...caseData, status: 'resolved' }

    const view = buildMissionTriageDeferralCompareView(
      { ...caseData, status: 'in_progress' },
      game
    )

    expect(view.visible).toBe(false)
  })

  it('shows low covert prep when only conceal flag is set', () => {
    let state = createStartingState()
    const caseData = createConcealmentEligibleCase({ tags: [] })
    state.cases[caseData.id] = caseData
    state = setPersistentFlag(state, buildConcealCaseFlagId(caseData.id), true)

    const view = buildMissionTriageDeferralCompareView(state.cases[caseData.id]!, state)
    const covertColumn = view.columns.find((column) => column.id === 'covertPrepCost')

    expect(view.visible).toBe(true)
    expect(covertColumn?.tone).toBe('low')
    expect(covertColumn?.detail).toBe(MISSION_TRIAGE_DEFERRAL_COMPARE_LABELS.covertPrepConcealmentDetail)
  })

  it('uses forensic detail when strain applies without infiltration prep', () => {
    let state = createStartingState()
    const caseData = {
      ...createStarterCase({ id: 'case-forensic-only', templateId: 'ops-003' }),
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
      custodyLossRefs: ['custody:field-packet'],
      week: 1,
    })
    state = custodyResult.state

    const view = buildMissionTriageDeferralCompareView(state.cases[caseData.id]!, state)
    const covertColumn = view.columns.find((column) => column.id === 'covertPrepCost')

    expect(view.visible).toBe(true)
    expect(covertColumn?.tone).toBe('medium')
    expect(covertColumn?.detail).toBe(MISSION_TRIAGE_DEFERRAL_COMPARE_LABELS.covertPrepForensicDetail)
  })

  it('is hidden for operational major-incident raid profiles', () => {
    const game = createStartingState()
    const caseData = createInfiltrationCase({
      stage: 3,
      kind: 'raid',
      raid: { minTeams: 2, maxTeams: 2 },
    })
    game.cases[caseData.id] = caseData

    expect(buildMissionTriageDeferralCompareView(caseData, game).visible).toBe(false)
  })

  it('formats zero-week deadline as due this week', () => {
    const game = createStartingState()
    const caseData = {
      ...createStarterCase({ id: 'case-deadline-zero', templateId: 'ops-001' }),
      status: 'in_progress' as const,
      deadlineRemaining: 0,
      stage: 2,
      tags: [],
      requiredTags: [],
      preferredTags: [],
      assignedTeamIds: [],
    }
    game.cases[caseData.id] = caseData

    const view = buildMissionTriageDeferralCompareView(caseData, game)

    expect(view.visible).toBe(true)
    expect(view.columns.find((column) => column.id === 'deferralRisk')?.detail).toBe(
      'Deadline due this week · stage 2'
    )
  })

  it('wires deferral compare through case list view when covert signals enabled', () => {
    const game = createStartingState()
    const caseData = createConcealmentEligibleCase()
    game.cases[caseData.id] = caseData

    const listView = getCaseListItemView(caseData, game, { includeCovertPrepSignals: true })

    expect(listView.deferralCompare.visible).toBe(true)
    expect(listView.deferralCompare.columns).toHaveLength(3)
  })

  it('prefers forensic detail over leave-behind when both strains apply', () => {
    let state = createStartingState()
    const caseData = {
      ...createStarterCase({ id: 'case-forensic-leave', templateId: 'ops-003' }),
      status: 'in_progress' as const,
      hiddenState: 'hidden' as const,
      detectionConfidence: 0.25,
      counterDetection: false,
      tags: ['archive'],
      stealthLeaveBehindId: 'leave-behind:risk-discovery',
      requiredTags: [],
      preferredTags: [],
      assignedTeamIds: [],
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
      custodyLossRefs: ['custody:field-packet'],
      week: 1,
    })
    state = custodyResult.state

    const view = buildMissionTriageDeferralCompareView(state.cases[caseData.id]!, state)
    const covertColumn = view.columns.find((column) => column.id === 'covertPrepCost')

    expect(covertColumn?.tone).toBe('medium')
    expect(covertColumn?.detail).toBe(MISSION_TRIAGE_DEFERRAL_COMPARE_LABELS.covertPrepForensicDetail)
  })

  it('formats negative deadline as due this week', () => {
    const game = createStartingState()
    const caseData = {
      ...createStarterCase({ id: 'case-deadline-negative', templateId: 'ops-001' }),
      status: 'in_progress' as const,
      deadlineRemaining: -1,
      stage: 2,
      tags: [],
      requiredTags: [],
      preferredTags: [],
      assignedTeamIds: [],
    }
    game.cases[caseData.id] = caseData

    const view = buildMissionTriageDeferralCompareView(caseData, game)

    expect(view.visible).toBe(true)
    expect(view.columns.find((column) => column.id === 'deferralRisk')?.detail).toBe(
      'Deadline due this week · stage 2'
    )
  })

  it('omits deferral compare from case list view when covert signals disabled', () => {
    const game = createStartingState()
    const caseData = createConcealmentEligibleCase()
    game.cases[caseData.id] = caseData

    const listView = getCaseListItemView(caseData, game)

    expect(listView.deferralCompare.visible).toBe(false)
    expect(listView.deferralCompare.columns).toHaveLength(0)
  })
})

/**
 * Selector Parity Tests
 *
 * Verifies that UI eligibility selectors exactly match domain validation logic
 * and that preview outputs always match actual resolution behavior.
 *
 * Contract: UI shows what domain rules enforce, and preview matches resolution.
 */

import { describe, expect, it } from 'vitest'
import { getCaseAssignmentInsights } from '../features/cases/caseInsights'
import { getCaseListItemView } from '../features/cases/caseView'
import { getTeamAssignableCaseViews } from '../features/teams/teamInsights'
import {
  getTeamBuilderSummary,
  getTeamCreationSeedViews,
  getTeamManagementState,
  getTeamMemberRemovalBlockReason,
  getTeamTransferCandidateViews,
} from '../features/teams/teamBuilderView'
import {
  getTrainingQueueViews,
  getTrainingRosterViews,
  getTrainingSummary,
  getTeamTrainingViews,
} from '../features/training/trainingView'
import {
  buildResolutionPreviewState,
  previewCaseOutcome as previewCaseOutcomeFromPreview,
  previewResolutionForTeamIds as previewResolutionForTeamIdsFromPreview,
  resolveCase,
} from '../domain/sim/resolve'
import { assignTeam } from '../domain/sim/assign'
import { getTeamEditability, getTeamMoveEligibility } from '../domain/sim/teamManagement'
import { validateTeamIds } from '../domain/validateTeam'
import type { CaseInstance, GameState, Id, Team } from '../domain/models'
import {
  makeBaselineFixture,
  makeTrainingBlockedFixture,
  makeAlreadyAssignedFixture,
  makeRaidAtCapacityFixture,
  makeDeadAgentFixture,
  makeGuaranteedSuccessFixture,
  makeGuaranteedFailFixture,
  makePartialThresholdFixture,
  makeRoleBlockedFixture,
  makeDeployedTeamFixture,
  makeRaidUnderCapacityFixture,
  makeTrainingSelectorParityFixture,
  makeTeamBuilderParityFixture,
} from './selectorParityFixtures'

function previewCaseOutcome(team: Team, currentCase: CaseInstance, game: GameState) {
  return previewCaseOutcomeFromPreview(team, currentCase, buildResolutionPreviewState(game))
}

function previewResolutionForTeamIds(
  currentCase: CaseInstance,
  game: GameState,
  teamIds: Id[]
) {
  return previewResolutionForTeamIdsFromPreview(
    currentCase,
    buildResolutionPreviewState(game),
    teamIds
  )
}

describe('Selector Parity: Case Assignment Insights', () => {
  it('availableTeams match valid preview outcomes', () => {
    const game = makeBaselineFixture()
    const insights = getCaseAssignmentInsights(game.cases['case-good'], game)

    // All teams in availableTeams must have preview with no blockedReason
    for (const teamView of insights.availableTeams) {
      const preview = previewCaseOutcome(teamView.team, game.cases['case-good'], game)
      expect(preview.blockedReason).toBeUndefined()
      expect(preview.preview).not.toBeNull()
      expect(preview.odds).toEqual(teamView.odds)
      expect(preview.preview?.performanceSummary).toEqual(teamView.performanceSummary)
    }
  })

  it('blockedTeams have reasons matching preview.blockedReason', () => {
    const game = makeBaselineFixture()
    const insights = getCaseAssignmentInsights(game.cases['case-good'], game)

    // All teams in blockedTeams must have preview with blockedReason defined
    for (const blockedView of insights.blockedTeams) {
      const preview = previewCaseOutcome(blockedView.team, game.cases['case-good'], game)
      expect(preview.blockedReason).toBeDefined()
      expect(blockedView.reason).toBe(preview.blockedReason)
    }
  })

  it('training-blocked teams are categorized in blockedTeams', () => {
    const game = makeTrainingBlockedFixture()
    const insights = getCaseAssignmentInsights(game.cases['case-good'], game)

    // All teams should be blocked with training reason
    expect(insights.availableTeams).toHaveLength(0)
    expect(insights.blockedTeams.length).toBeGreaterThan(0)
    expect(insights.blockedTeams.every((v) => v.reason === 'training')).toBe(true)
  })

  it('already-assigned teams are blocked with correct reason', () => {
    const game = makeAlreadyAssignedFixture()
    // team-good is already assigned to case-good
    // Try to get insights for a different case (case-bad)
    const insights = getCaseAssignmentInsights(game.cases['case-bad'], game)

    // team-good should be blocked with already-committed reason
    const goodTeamBlocked = insights.blockedTeams.find((v) => v.team.id === 'team-good')
    expect(goodTeamBlocked).toBeDefined()
    expect(goodTeamBlocked?.reason).toBe('already-committed')
  })

  it('role-blocked cases show all teams blocked by missing roles', () => {
    const game = makeRoleBlockedFixture()
    const insights = getCaseAssignmentInsights(game.cases['case-support-only'], game)

    // case-support-only requires support role; no team has medic/negotiator
    expect(insights.availableTeams).toHaveLength(0)
    expect(insights.blockedTeams.length).toBeGreaterThan(0)
    expect(insights.blockedTeams.every((v) => v.reason === 'missing-required-roles')).toBe(true)
  })
})

describe('Selector Parity: Team Assignable Cases', () => {
  it('assignable cases match cases without blockedReason', () => {
    const game = makeBaselineFixture()
    const team = game.teams['team-good']
    const assignableViews = getTeamAssignableCaseViews(team, game, 20)

    // Build set of case IDs that should be assignable
    const expectedAssignableCaseIds = new Set<string>()
    for (const caseEntry of Object.values(game.cases)) {
      const preview = previewCaseOutcome(team, caseEntry, game)
      if (!preview.blockedReason && preview.odds) {
        expectedAssignableCaseIds.add(caseEntry.id)
      }
    }

    const actualAssignableCaseIds = new Set(assignableViews.map((v) => v.currentCase.id))
    expect(actualAssignableCaseIds).toEqual(expectedAssignableCaseIds)
  })

  it('odds in views match preview odds', () => {
    const game = makeBaselineFixture()
    const team = game.teams['team-good']
    const assignableViews = getTeamAssignableCaseViews(team, game, 20)

    for (const view of assignableViews) {
      const preview = previewCaseOutcome(team, view.currentCase, game)
      expect(view.success).toBe(preview.odds?.success)
      expect(view.partial).toBe(preview.odds?.partial)
      expect(view.fail).toBe(preview.odds?.fail)
      expect(view.performanceSummary).toEqual(preview.preview?.performanceSummary)
    }
  })

  it('training-blocked team has no assignable cases', () => {
    const game = makeTrainingBlockedFixture()
    const team = game.teams['team-good']
    const assignableViews = getTeamAssignableCaseViews(team, game, 20)

    expect(assignableViews).toHaveLength(0)
  })

  it('balances urgency and viability when ordering assignable cases', () => {
    const game = makeBaselineFixture()
    const team = game.teams['team-good']

    game.cases = {
      'case-urgent-hard': {
        ...game.cases['case-good'],
        id: 'case-urgent-hard',
        title: 'case-urgent-hard',
        stage: 5,
        deadlineRemaining: 1,
        difficulty: { combat: 999, investigation: 999, utility: 999, social: 999 },
      },
      'case-soon-viable': {
        ...game.cases['case-good'],
        id: 'case-soon-viable',
        title: 'case-soon-viable',
        stage: 3,
        deadlineRemaining: 3,
        difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
      },
    }

    const assignableViews = getTeamAssignableCaseViews(team, game, 20)
    const orderedCaseIds = assignableViews.map((view) => view.currentCase.id)

    expect(orderedCaseIds).toEqual(['case-soon-viable', 'case-urgent-hard'])
    expect(assignableViews[0].success).toBeGreaterThan(assignableViews[1].success)
  })
})

describe('Selector Parity: Case List Item View', () => {
  it('availableTeams match validation of unblocked teams', () => {
    const game = makeBaselineFixture()
    const view = getCaseListItemView(game.cases['case-good'], game)

    // availableTeams should only include teams where preview has no blockedReason
    for (const teamView of view.availableTeams) {
      const preview = previewResolutionForTeamIds(
        game.cases['case-good'],
        game,
        [teamView.team.id]
      )
      expect(preview.odds.blockedByRequiredTags).toBe(false)
      expect(preview.odds.blockedByRequiredRoles).toBe(false)
    }
  })

  it('isBlockedByRequiredRoles true iff all eligible teams blocked by roles', () => {
    const game = makeRoleBlockedFixture()
    const view = getCaseListItemView(game.cases['case-support-only'], game)

    // case-support-only requires support; no team provides it
    expect(view.isBlockedByRequiredRoles).toBe(true)
    expect(view.availableTeams).toHaveLength(0)
  })

  it('isBlockedByRequiredRoles false if any eligible team satisfies roles', () => {
    const game = makeBaselineFixture()
    const view = getCaseListItemView(game.cases['case-good'], game)

    // case-good requires containment + technical; team-good has both
    expect(view.isBlockedByRequiredRoles).toBe(false)
    expect(view.availableTeams.length).toBeGreaterThan(0)
  })

  it('bestSuccess is max of available or assigned odds', () => {
    const game = makeAlreadyAssignedFixture()
    const view = getCaseListItemView(game.cases['case-good'], game)

    // team-good is assigned to case-good
    const assignedOdds = previewResolutionForTeamIds(game.cases['case-good'], game, [
      'team-good',
    ]).odds
    expect(view.bestSuccess).toBe(assignedOdds.success)
  })

  it('raid capacity blocking prevents new team assignment in view', () => {
    const game = makeRaidAtCapacityFixture()
    const view = getCaseListItemView(game.cases['raid-capacity'], game)

    // raid-capacity maxTeams=2, already has 2 teams assigned
    expect(view.isRaidAtCapacity).toBe(true)
    expect(view.availableTeams).toHaveLength(0)
  })
})

describe('Selector Parity: Mutation vs Preview Blocking', () => {
  it('blocked preview → assignTeam rejects (training)', () => {
    const game = makeTrainingBlockedFixture()
    const team = game.teams['team-good']
    const caseEntry = game.cases['case-good']

    const preview = previewCaseOutcome(team, caseEntry, game)
    expect(preview.blockedReason).toBe('training')

    const next = assignTeam(game, caseEntry.id, team.id)
    expect(next.cases[caseEntry.id].assignedTeamIds).not.toContain(team.id)
    expect(next.teams[team.id].assignedCaseId).not.toBe(caseEntry.id)
  })

  it('blocked preview → assignTeam rejects (already-committed)', () => {
    const game = makeAlreadyAssignedFixture()
    const team = game.teams['team-good']
    const otherCase = game.cases['case-bad']

    // team-good is already assigned to case-good
    const preview = previewCaseOutcome(team, otherCase, game)
    expect(preview.blockedReason).toBe('already-committed')

    const next = assignTeam(game, otherCase.id, team.id)
    expect(next.cases[otherCase.id].assignedTeamIds).not.toContain(team.id)
  })

  it('blocked preview → assignTeam rejects (raid-capacity)', () => {
    const game = makeRaidAtCapacityFixture()
    // raid-capacity has 2/2 teams; team-good is already in it
    // Try to add a third team (should fail capacity check)

    const state = game
    state.teams['team-extra'] = {
      id: 'team-extra',
      name: 'Extra Team',
      memberIds: ['agent-tech'],
      agentIds: ['agent-tech'],
      leaderId: 'agent-tech',
      tags: [],
    }

    const preview = previewCaseOutcome(state.teams['team-extra'], state.cases['raid-capacity'], state)
    expect(preview.blockedReason).toBe('raid-capacity')

    const next = assignTeam(state, state.cases['raid-capacity'].id, 'team-extra')
    expect(next.cases['raid-capacity'].assignedTeamIds).not.toContain('team-extra')
  })

  it('unblocked preview → assignTeam applies (valid team)', () => {
    const game = makeBaselineFixture()
    const team = game.teams['team-good']
    const caseEntry = game.cases['case-good']

    const preview = previewCaseOutcome(team, caseEntry, game)
    expect(preview.blockedReason).toBeUndefined()
    expect(preview.preview).not.toBeNull()

    const next = assignTeam(game, caseEntry.id, team.id)
    expect(next.cases[caseEntry.id].assignedTeamIds).toContain(team.id)
    expect(next.teams[team.id].assignedCaseId).toBe(caseEntry.id)
  })

  it('blocked by role requirement → assignTeam rejects', () => {
    const game = makeRoleBlockedFixture()
    const team = game.teams['team-bad']
    const caseEntry = game.cases['case-support-only']

    const preview = previewCaseOutcome(team, caseEntry, game)
    expect(preview.blockedReason).toBe('missing-required-roles')

    const next = assignTeam(game, caseEntry.id, team.id)
    expect(next.cases[caseEntry.id].assignedTeamIds).not.toContain(team.id)
  })
})

describe('Selector Parity: Preview Determinism → Resolution Outcome', () => {
  it('odds.success === 1 → resolveCase returns success (threshold mode)', () => {
    const game = makeGuaranteedSuccessFixture()
    const team = game.teams['team-powerhouse']
    const caseEntry = game.cases['case-easy']

    const preview = previewResolutionForTeamIds(caseEntry, game, [team.id])
    expect(preview.odds.success).toBe(1)
    expect(preview.odds.partial).toBe(0)
    expect(preview.odds.fail).toBe(0)

    const outcome = resolveCase(
      caseEntry,
      [game.agents['agent-powerhouse']],
      game.config,
      () => 0.5
    )
    expect(outcome.result).toBe('success')
    expect(outcome.performanceSummary).toEqual(preview.performanceSummary)
  })

  it('odds.fail === 1 → resolveCase returns fail (threshold mode)', () => {
    const game = makeGuaranteedFailFixture()
    const team = game.teams['team-weak']
    const caseEntry = game.cases['case-hard']

    const preview = previewResolutionForTeamIds(caseEntry, game, [team.id])
    expect(preview.odds.success).toBe(0)
    expect(preview.odds.partial).toBe(0)
    expect(preview.odds.fail).toBe(1)

    const outcome = resolveCase(
      caseEntry,
      [game.agents['agent-weak']],
      game.config,
      () => 0.5
    )
    expect(outcome.result).toBe('fail')
    expect(outcome.performanceSummary).toEqual(preview.performanceSummary)
  })

  it('odds.partial === 1 → resolveCase returns partial (threshold mode)', () => {
    const game = makePartialThresholdFixture()
    const caseEntry = {
      ...game.cases['case-threshold'],
      difficulty: { combat: 999, investigation: 0, utility: 0, social: 0 },
      weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
      requiredRoles: [],
      requiredTags: [],
      preferredTags: [],
    }
    const tunedGame = {
      ...game,
      config: {
        ...game.config,
        partialMargin: 10_000,
      },
      cases: {
        ...game.cases,
        [caseEntry.id]: caseEntry,
      },
    }

    const preview = previewResolutionForTeamIds(caseEntry, tunedGame, ['team-mid'])
    expect(preview.odds.success).toBe(0)
    expect(preview.odds.partial).toBe(1)
    expect(preview.odds.fail).toBe(0)

    const outcome = resolveCase(caseEntry, [tunedGame.agents['agent-mid']], tunedGame.config, () => 0.5)
    expect(outcome.result).toBe('partial')
    expect(outcome.performanceSummary).toEqual(preview.performanceSummary)
  })

  it('blocked preview odds → resolveCase fails with validation issues', () => {
    const game = makeRoleBlockedFixture()
    const team = game.teams['team-bad']
    const caseEntry = game.cases['case-support-only']

    const preview = previewResolutionForTeamIds(caseEntry, game, [team.id])
    expect(preview.odds.fail).toBe(1)
    expect(preview.validation?.issues.length).toBeGreaterThan(0)

    const outcome = resolveCase(
      caseEntry,
      [game.agents['agent-hunter']],
      game.config,
      () => 0.5
    )
    expect(outcome.result).toBe('fail')
    expect(outcome.reasons.some((r) => r.includes('Missing required roles'))).toBe(true)
  })

  it('no-active-members validation blocks resolution', () => {
    const game = makeDeadAgentFixture()
    const team = game.teams['team-bad']
    const caseEntry = game.cases['case-needs-support']

    const preview = previewResolutionForTeamIds(caseEntry, game, [team.id])
    expect(preview.validation?.issues.some((i) => i.code === 'no-active-members')).toBe(true)

    const outcome = resolveCase(
      caseEntry,
      [game.agents['agent-hunter']],
      game.config,
      () => 0.5
    )
    expect(outcome.result).toBe('fail')
    expect(outcome.reasons[0]).toContain('No active members')
  })
})

describe('Selector Parity: Editability Blocking', () => {
  it('deployed team selector correctly marks editable=false', () => {
    const game = makeDeployedTeamFixture()
    const team = game.teams['team-good']
    const assignableViews = getTeamAssignableCaseViews(team, game, 20)
    const assignableCaseIds = assignableViews.map((view) => view.currentCase.id)

    // A deployed team can only surface its currently assigned case in assignable views.
    expect(assignableCaseIds).toEqual(['case-good'])

    // team-good is assigned to case-good
    // When assigned to case-good, team cannot take other cases
    // Team should not appear in assignable views for other cases
    const otherCaseIds = Object.keys(game.cases).filter((id) => id !== 'case-good')
    
    for (const caseId of otherCaseIds) {
      const otherCase = game.cases[caseId]
      const preview = previewCaseOutcome(team, otherCase, game)
      expect(preview.blockedReason).toBe('already-committed')
    }
  })
})

describe('Selector Parity: Validation Consistency', () => {
  it('preview validation matches domain validateTeamIds', () => {
    const game = makeRoleBlockedFixture()
    const team = game.teams['team-bad']
    const caseEntry = game.cases['case-support-only']

    const preview = previewResolutionForTeamIds(caseEntry, game, [team.id])
    const validation = validateTeamIds([team.id], caseEntry, game.teams, game.agents)

    expect(preview.validation?.valid).toBe(validation.valid)
    expect(preview.validation?.missingRoles).toEqual(validation.missingRoles)
    expect(preview.validation?.missingTags).toEqual(validation.missingTags)
  })

  it('case list blocked flags use same validation as direct selector', () => {
    const game = makeRoleBlockedFixture()
    const caseEntry = game.cases['case-support-only']
    const view = getCaseListItemView(caseEntry, game)

    // isBlockedByRequiredRoles should be true because all teams lack support coverage
    expect(view.isBlockedByRequiredRoles).toBe(true)

    // Verify by checking each team
    for (const team of Object.values(game.teams)) {
      const preview = previewResolutionForTeamIds(caseEntry, game, [team.id])
      expect(preview.odds.blockedByRequiredRoles).toBe(true)
    }
  })
})

describe('Selector Parity: TeamBuilderView', () => {
  it('team management editable flag mirrors getTeamEditability', () => {
    const game = makeTeamBuilderParityFixture()

    const deployedTeam = game.teams['team-deployed']
    const idleTeam = game.teams['team-idle']

    const deployedState = getTeamManagementState(deployedTeam, game)
    const deployedEditability = getTeamEditability(deployedTeam, game.cases)
    expect(deployedState.editable).toBe(deployedEditability.editable)

    const idleState = getTeamManagementState(idleTeam, game)
    const idleEditability = getTeamEditability(idleTeam, game.cases)
    expect(idleState.editable).toBe(idleEditability.editable)
  })

  it('member removal block reason mirrors getTeamMoveEligibility', () => {
    const game = makeTeamBuilderParityFixture()

    for (const agentId of Object.keys(game.agents)) {
      const eligibility = getTeamMoveEligibility(game, agentId, null)
      const blockReason = getTeamMemberRemovalBlockReason(game, agentId)

      if (eligibility.allowed) {
        expect(blockReason).toBeUndefined()
      } else {
        expect(blockReason).toBe(eligibility.reasons[0])
      }
    }
  })

  it('team creation seed views include exactly movable non-dead agents', () => {
    const game = makeTeamBuilderParityFixture()
    const seedViews = getTeamCreationSeedViews(game)

    const expectedAgentIds = new Set(
      Object.values(game.agents)
        .filter((agent) => agent.status !== 'dead')
        .filter((agent) => getTeamMoveEligibility(game, agent.id, null).allowed)
        .map((agent) => agent.id)
    )
    const actualAgentIds = new Set(seedViews.map((view) => view.agent.id))

    expect(actualAgentIds).toEqual(expectedAgentIds)
  })

  it('team transfer candidate views include exactly eligibility-allowed agents for target team', () => {
    const game = makeTeamBuilderParityFixture()
    const transferViews = getTeamTransferCandidateViews(game, 'team-idle')

    const expectedAgentIds = new Set(
      Object.values(game.agents)
        .filter((agent) => getTeamMoveEligibility(game, agent.id, 'team-idle').allowed)
        .map((agent) => agent.id)
    )
    const actualAgentIds = new Set(transferViews.map((view) => view.agent.id))

    expect(actualAgentIds).toEqual(expectedAgentIds)
  })

  it('team builder summary counts mirror domain editability and move eligibility', () => {
    const game = makeTeamBuilderParityFixture()
    const summary = getTeamBuilderSummary(game)

    const teams = Object.values(game.teams)
    const agents = Object.values(game.agents)
    const expectedEditableTeams = teams.filter(
      (team) => getTeamEditability(team, game.cases).editable
    ).length
    const expectedDeployedTeams = teams.filter(
      (team) => !getTeamEditability(team, game.cases).editable
    ).length
    const expectedMovableAgents = agents.filter(
      (agent) => getTeamMoveEligibility(game, agent.id, null).allowed
    ).length
    const teamAgentIds = new Set(
      teams.flatMap((team) => [
        ...(team.memberIds ?? []),
        ...(team.agentIds ?? []),
      ])
    )
    const expectedReserveAgents = agents.filter((agent) => !teamAgentIds.has(agent.id)).length

    expect(summary.editableTeams).toBe(expectedEditableTeams)
    expect(summary.deployedTeams).toBe(expectedDeployedTeams)
    expect(summary.movableAgents).toBe(expectedMovableAgents)
    expect(summary.reserveAgents).toBe(expectedReserveAgents)
  })
})

describe('Selector Parity: Raid Under-Capacity', () => {
  it('preview validation flags insufficient raid teams when below minTeams', () => {
    const game = makeRaidUnderCapacityFixture()
    const raidCase = game.cases['raid-under-capacity']

    const preview = previewResolutionForTeamIds(raidCase, game, ['team-anchor'])

    expect(preview.validation?.issues.some((issue) => issue.code === 'insufficient-raid-teams')).toBe(
      true
    )
    expect(preview.odds.success).toBe(0)
    expect(preview.odds.partial).toBe(0)
    expect(preview.odds.fail).toBe(1)
  })

  it('case assignment insights odds mirror combined-team preview while under-capacity', () => {
    const game = makeRaidUnderCapacityFixture()
    const raidCase = game.cases['raid-under-capacity']
    const insights = getCaseAssignmentInsights(raidCase, game)

    expect(insights.availableTeams.length).toBeGreaterThan(0)

    for (const view of insights.availableTeams) {
      const combinedPreview = previewResolutionForTeamIds(raidCase, game, [
        ...raidCase.assignedTeamIds,
        view.team.id,
      ])

      expect(view.odds).toEqual(combinedPreview.odds)
      expect(
        combinedPreview.validation?.issues.some((issue) => issue.code === 'insufficient-raid-teams')
      ).toBe(true)
    }
  })

  it('case list and team assignable views stay consistent with preview odds', () => {
    const game = makeRaidUnderCapacityFixture()
    const raidCase = game.cases['raid-under-capacity']

    const caseView = getCaseListItemView(raidCase, game)
    for (const teamView of caseView.availableTeams) {
      const preview = previewResolutionForTeamIds(raidCase, game, [
        ...raidCase.assignedTeamIds,
        teamView.team.id,
      ])
      expect(teamView.odds).toEqual(preview.odds)
    }

    const betaTeamAssignable = getTeamAssignableCaseViews(game.teams['team-beta'], game, 20)
    const raidEntry = betaTeamAssignable.find((view) => view.currentCase.id === raidCase.id)
    expect(raidEntry).toBeDefined()

    const betaPreview = previewCaseOutcome(game.teams['team-beta'], raidCase, game)
    expect(raidEntry?.success).toBe(betaPreview.odds?.success)
    expect(raidEntry?.partial).toBe(betaPreview.odds?.partial)
    expect(raidEntry?.fail).toBe(betaPreview.odds?.fail)
  })

  it('adding enough teams clears insufficient-raid-teams validation issue', () => {
    const game = makeRaidUnderCapacityFixture()
    const raidCase = game.cases['raid-under-capacity']

    const compliantPreview = previewResolutionForTeamIds(raidCase, game, [
      'team-anchor',
      'team-beta',
      'team-gamma',
    ])

    expect(
      compliantPreview.validation?.issues.some((issue) => issue.code === 'insufficient-raid-teams')
    ).toBe(false)
  })
})

describe('Selector Parity: Training View', () => {
  it('training roster readiness and canTrain align with domain-relevant states', () => {
    const game = makeTrainingSelectorParityFixture()
    const roster = getTrainingRosterViews(game)

    const readinessByAgent = new Map(roster.map((view) => [view.agent.id, view.readiness]))
    const canTrainByAgent = new Map(roster.map((view) => [view.agent.id, view.canTrain]))

    expect(readinessByAgent.get('agent-ready-a')).toBe('ready')
    expect(readinessByAgent.get('agent-ready-b')).toBe('ready')
    expect(readinessByAgent.get('agent-team-train-a')).toBe('training')
    expect(readinessByAgent.get('agent-team-train-b')).toBe('training')
    expect(readinessByAgent.get('agent-solo-training')).toBe('training')
    expect(readinessByAgent.get('agent-deployed-a')).toBe('deployed')
    expect(readinessByAgent.get('agent-deployed-b')).toBe('deployed')
    expect(readinessByAgent.get('agent-inactive-dead')).toBe('inactive')

    for (const view of roster) {
      expect(view.canTrain).toBe(view.readiness === 'ready')
    }

    expect(canTrainByAgent.get('agent-ready-a')).toBe(true)
    expect(canTrainByAgent.get('agent-team-train-a')).toBe(false)
    expect(canTrainByAgent.get('agent-deployed-a')).toBe(false)
  })

  it('team training readiness and canTrain align with team conditions', () => {
    const game = makeTrainingSelectorParityFixture()
    const teamViews = getTeamTrainingViews(game)

    const readinessByTeam = new Map(teamViews.map((view) => [view.team.id, view.readiness]))

    expect(readinessByTeam.get('team-ready')).toBe('ready')
    expect(readinessByTeam.get('team-training')).toBe('training')
    expect(readinessByTeam.get('team-deployed')).toBe('deployed')
    expect(readinessByTeam.get('team-inactive')).toBe('inactive')
    expect(readinessByTeam.get('team-undersized')).toBe('undersized')

    for (const view of teamViews) {
      expect(view.canTrain).toBe(view.readiness === 'ready')
    }
  })

  it('training summary counts mirror roster, team views, and grouped queue views', () => {
    const game = makeTrainingSelectorParityFixture()
    const roster = getTrainingRosterViews(game)
    const teamViews = getTeamTrainingViews(game)
    const queueViews = getTrainingQueueViews(game)
    const summary = getTrainingSummary(game)

    expect(summary.totalAgents).toBe(roster.length)
    expect(summary.readyAgents).toBe(roster.filter((view) => view.readiness === 'ready').length)
    expect(summary.trainingAgents).toBe(
      roster.filter((view) => view.readiness === 'training').length
    )
    expect(summary.deployedAgents).toBe(
      roster.filter((view) => view.readiness === 'deployed').length
    )
    expect(summary.inactiveAgents).toBe(
      roster.filter((view) => view.readiness === 'inactive').length
    )

    expect(summary.readyTeams).toBe(teamViews.filter((view) => view.readiness === 'ready').length)
    expect(summary.activeQueue).toBe(queueViews.length)
    expect(summary.teamDrills).toBe(queueViews.filter((view) => view.scope === 'team').length)
  })

  it('training queue groups entries by drillGroupId and computes team drill labels', () => {
    const game = makeTrainingSelectorParityFixture()
    const queueViews = getTrainingQueueViews(game)

    expect(queueViews).toHaveLength(2)

    const teamDrillView = queueViews.find((view) => view.scope === 'team')
    const agentView = queueViews.find((view) => view.scope === 'agent')

    expect(teamDrillView).toBeDefined()
    expect(teamDrillView?.entries).toHaveLength(2)
    expect(teamDrillView?.detailLabel).toContain('2 agents / Formation Drill')
    expect(teamDrillView?.remainingLabel).toBe('2 weeks remaining')

    expect(agentView).toBeDefined()
    expect(agentView?.entries).toHaveLength(1)
    expect(agentView?.detailLabel).toBe('Solo Focus')
    expect(agentView?.remainingLabel).toBe('1 week remaining')
  })

  it('training queue is sorted by remaining weeks then training and agent names', () => {
    const game = makeTrainingSelectorParityFixture()
    const queueViews = getTrainingQueueViews(game)

    expect(queueViews.map((view) => view.remainingLabel)).toEqual([
      '1 week remaining',
      '2 weeks remaining',
    ])
    expect(queueViews[0]?.subjectLabel).toBe('Agent agent-solo-training')
    expect(queueViews[0]?.progressPercent).toBe(50)
    expect(queueViews[1]?.progressPercent).toBe(33)
  })

  it('training selectors do not mutate game state', () => {
    const game = makeTrainingSelectorParityFixture()
    const before = JSON.stringify({
      trainingQueue: game.trainingQueue,
      teams: game.teams,
      agents: game.agents,
      cases: game.cases,
    })

    getTrainingQueueViews(game)
    getTrainingRosterViews(game)
    getTeamTrainingViews(game)
    getTrainingSummary(game)

    const after = JSON.stringify({
      trainingQueue: game.trainingQueue,
      teams: game.teams,
      agents: game.agents,
      cases: game.cases,
    })

    expect(after).toBe(before)
  })
})

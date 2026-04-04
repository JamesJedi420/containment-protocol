/**
 * Selector Parity Test Fixtures
 *
 * Provides stable, deterministic case/team/agent builders for testing
 * that UI selectors (eligibility logic) and domain validators produce consistent results.
 */

import { createStartingState } from '../data/startingState'
import type { Agent, CaseInstance, GameState, Team } from '../domain/models'
import { normalizeGameState } from '../domain/teamSimulation'

/**
 * Creates an agent with deterministic stats and tags.
 */
export function makeAgent(
  id: string,
  role: Agent['role'],
  tags: string[],
  overrides: Partial<Agent> = {}
): Agent {
  const template = createStartingState().agents.a_ava

  return {
    ...template,
    id,
    name: `Agent ${id}`,
    role,
    baseStats: {
      combat: 60,
      investigation: 60,
      utility: 60,
      social: 60,
    },
    tags,
    relationships: {},
    fatigue: 0,
    status: 'active',
    assignment: { state: 'idle' },
    traits: [],
    ...overrides,
  }
}

/**
 * Creates a team with given members, leader, and tags.
 */
export function makeTeam(
  id: string,
  name: string,
  memberIds: string[],
  leaderId: string,
  tags: string[] = [],
  overrides: Partial<Team> = {}
): Team {
  return {
    id,
    name,
    memberIds,
    agentIds: memberIds,
    leaderId,
    tags,
    ...overrides,
  }
}

/**
 * Creates a case with deterministic difficulty and requirements.
 */
export function makeCase(id: string, overrides: Partial<CaseInstance> = {}): CaseInstance {
  const template = createStartingState().cases['case-001']

  return {
    ...template,
    id,
    templateId: id,
    title: `Case ${id}`,
    description: `Case ${id} description`,
    status: 'open',
    mode: 'threshold',
    kind: 'case',
    assignedTeamIds: [],
    requiredTags: [],
    preferredTags: [],
    requiredRoles: [],
    difficulty: { combat: 20, investigation: 0, utility: 0, social: 0 },
    weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
    durationWeeks: 1,
    deadlineWeeks: 4,
    deadlineRemaining: 4,
    weeksRemaining: undefined,
    stage: 1,
    onFail: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
    onUnresolved: {
      stageDelta: 1,
      deadlineResetWeeks: 4,
      spawnCount: { min: 0, max: 0 },
      spawnTemplateIds: [],
    },
    ...overrides,
  }
}

/**
 * Creates a raid case with minTeams/maxTeams config.
 */
export function makeRaidCase(
  id: string,
  minTeams: number = 2,
  maxTeams: number = 2,
  overrides: Partial<CaseInstance> = {}
): CaseInstance {
  return makeCase(id, {
    kind: 'raid',
    raid: { minTeams, maxTeams },
    ...overrides,
  })
}

/**
 * Baseline fixture: 3 agents with distinct roles/tags, 2 teams, 2 cases.
 * Used across most parity tests.
 */
export function makeBaselineFixture(): GameState {
  const state = createStartingState()

  // Create agents with distinct roles and tags
  state.agents = {
    'agent-containment': makeAgent('agent-containment', 'occultist', ['occult', 'seal']),
    'agent-tech': makeAgent('agent-tech', 'tech', ['tech', 'field-kit']),
    'agent-hunter': makeAgent('agent-hunter', 'hunter', ['combat']),
  }

  // Create teams
  state.teams = {
    'team-good': makeTeam(
      'team-good',
      'Good Team',
      ['agent-containment', 'agent-tech'],
      'agent-containment',
      ['occult', 'tech']
    ),
    'team-bad': makeTeam('team-bad', 'Bad Team', ['agent-hunter'], 'agent-hunter', ['combat']),
  }

  // Create cases with varying requirements
  state.cases = {
    'case-good': makeCase('case-good', {
      requiredRoles: ['containment', 'technical'],
      requiredTags: ['occult', 'tech'],
      mode: 'threshold',
    }),
    'case-bad': makeCase('case-bad', {
      requiredRoles: ['support'],
      requiredTags: ['medical'],
      mode: 'threshold',
    }),
  }

  state.reports = []
  state.events = []

  return normalizeGameState(state)
}

/**
 * Fixture with all agents in training; tests training-blocked eligibility.
 */
export function makeTrainingBlockedFixture(): GameState {
  const state = makeBaselineFixture()

  for (const agentId of Object.keys(state.agents)) {
    state.agents[agentId] = {
      ...state.agents[agentId],
      assignment: { state: 'training', startedWeek: state.week },
    }
  }

  return normalizeGameState(state)
}

/**
 * Fixture where team-good is already assigned to case-good.
 * Tests already-committed eligibility blocking.
 */
export function makeAlreadyAssignedFixture(): GameState {
  const state = makeBaselineFixture()

  state.cases['case-good'] = {
    ...state.cases['case-good'],
    status: 'in_progress',
    assignedTeamIds: ['team-good'],
    weeksRemaining: 1,
  }

  state.teams['team-good'] = {
    ...state.teams['team-good'],
    assignedCaseId: 'case-good',
  }

  return normalizeGameState(state)
}

/**
 * Fixture with a raid case at capacity; tests raid-capacity blocking.
 */
export function makeRaidAtCapacityFixture(): GameState {
  const state = makeBaselineFixture()

  state.cases['raid-capacity'] = makeRaidCase('raid-capacity', 2, 2, {
    assignedTeamIds: ['team-good', 'team-bad'],
    status: 'in_progress',
  })

  state.teams['team-good'] = {
    ...state.teams['team-good'],
    assignedCaseId: 'raid-capacity',
  }
  state.teams['team-bad'] = {
    ...state.teams['team-bad'],
    assignedCaseId: 'raid-capacity',
  }

  return normalizeGameState(state)
}

/**
 * Fixture with a dead agent; team has too few active members for assignment.
 * Tests no-active-members blocking.
 */
export function makeDeadAgentFixture(): GameState {
  const state = makeBaselineFixture()

  state.agents['agent-hunter'] = {
    ...state.agents['agent-hunter'],
    status: 'dead',
  }

  state.teams['team-bad'] = {
    ...state.teams['team-bad'],
    memberIds: ['agent-hunter'],
    agentIds: ['agent-hunter'],
  }

  // Create a case that requires coverage team-bad can't provide
  state.cases['case-needs-support'] = makeCase('case-needs-support', {
    requiredRoles: ['support'],
    mode: 'threshold',
  })

  return normalizeGameState(state)
}

/**
 * Fixture with high-stat agent; guaranteed success in threshold mode.
 * Tests preview `odds.success === 1` → resolution `result === 'success'`.
 */
export function makeGuaranteedSuccessFixture(): GameState {
  const state = createStartingState()

  state.agents = {
    'agent-powerhouse': makeAgent('agent-powerhouse', 'hunter', ['combat'], {
      baseStats: { combat: 120, investigation: 0, utility: 0, social: 0 },
    }),
  }

  state.teams = {
    'team-powerhouse': makeTeam(
      'team-powerhouse',
      'Powerhouse',
      ['agent-powerhouse'],
      'agent-powerhouse',
      ['combat']
    ),
  }

  state.cases = {
    'case-easy': makeCase('case-easy', {
      difficulty: { combat: 20, investigation: 0, utility: 0, social: 0 },
      weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
      mode: 'threshold',
    }),
  }

  state.reports = []
  state.events = []

  return normalizeGameState(state)
}

/**
 * Fixture with low-stat agent and high difficulty; guaranteed fail.
 * Tests preview `odds.fail === 1` → resolution `result === 'fail'`.
 */
export function makeGuaranteedFailFixture(): GameState {
  const state = createStartingState()

  state.agents = {
    'agent-weak': makeAgent('agent-weak', 'hunter', ['combat'], {
      baseStats: { combat: 1, investigation: 0, utility: 0, social: 0 },
    }),
  }

  state.teams = {
    'team-weak': makeTeam('team-weak', 'Weak', ['agent-weak'], 'agent-weak', ['combat']),
  }

  state.cases = {
    'case-hard': makeCase('case-hard', {
      difficulty: { combat: 120, investigation: 0, utility: 0, social: 0 },
      weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
      mode: 'threshold',
    }),
  }

  state.reports = []
  state.events = []

  return normalizeGameState(state)
}

/**
 * Fixture with mid-stat agent close to requirement boundary; hits partial on miss.
 * Tests preview `odds.partial === 1` → resolution `result === 'partial'`.
 * Requires large partialMargin in config to deterministically trigger partial.
 */
export function makePartialThresholdFixture(): GameState {
  const state = createStartingState()

  state.agents = {
    'agent-mid': makeAgent('agent-mid', 'hunter', ['combat'], {
      baseStats: { combat: 90, investigation: 0, utility: 0, social: 0 },
    }),
  }

  state.teams = {
    'team-mid': makeTeam('team-mid', 'Mid', ['agent-mid'], 'agent-mid', ['combat']),
  }

  state.cases = {
    'case-threshold': makeCase('case-threshold', {
      difficulty: { combat: 100, investigation: 0, utility: 0, social: 0 },
      weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
      mode: 'threshold',
    }),
  }

  state.reports = []
  state.events = []

  return normalizeGameState(state)
}

/**
 * Fixture for testing role/tag blocking: case requires unsatisfiable coverage.
 * All teams in fixture lack required roles or tags.
 */
export function makeRoleBlockedFixture(): GameState {
  const state = makeBaselineFixture()

  // All existing agents: occultist, tech, hunter
  // None are medics/negotiators → no 'support' coverage
  state.cases['case-support-only'] = makeCase('case-support-only', {
    requiredRoles: ['support'],
    mode: 'threshold',
  })

  return normalizeGameState(state)
}

/**
 * Fixture with a team in a deployed state (assigned to case).
 * Tests selector blocking for editability.
 */
export function makeDeployedTeamFixture(): GameState {
  const state = makeBaselineFixture()

  state.cases['case-good'] = {
    ...state.cases['case-good'],
    status: 'in_progress',
    assignedTeamIds: ['team-good'],
    weeksRemaining: 1,
  }

  state.teams['team-good'] = {
    ...state.teams['team-good'],
    assignedCaseId: 'case-good',
  }

  return normalizeGameState(state)
}

/**
 * Fixture for TeamBuilderView parity contracts.
 * Includes deployed, idle, training, dead, and reserve agents.
 */
export function makeTeamBuilderParityFixture(): GameState {
  const state = createStartingState()

  state.agents = {
    'agent-deployed': makeAgent('agent-deployed', 'hunter', ['combat']),
    'agent-idle': makeAgent('agent-idle', 'tech', ['tech']),
    'agent-training': makeAgent('agent-training', 'occultist', ['occult'], {
      assignment: { state: 'training', startedWeek: 1 },
    }),
    'agent-dead': makeAgent('agent-dead', 'hunter', ['combat'], {
      status: 'dead',
    }),
    'agent-reserve': makeAgent('agent-reserve', 'negotiator', ['social']),
  }

  state.teams = {
    'team-deployed': makeTeam(
      'team-deployed',
      'Deployed Team',
      ['agent-deployed'],
      'agent-deployed',
      ['combat'],
      { assignedCaseId: 'case-active' }
    ),
    'team-idle': makeTeam(
      'team-idle',
      'Idle Team',
      ['agent-idle', 'agent-training', 'agent-dead'],
      'agent-idle',
      ['tech', 'occult']
    ),
  }

  state.cases = {
    'case-active': makeCase('case-active', {
      status: 'in_progress',
      assignedTeamIds: ['team-deployed'],
      weeksRemaining: 1,
    }),
  }

  state.reports = []
  state.events = []

  return normalizeGameState(state)
}

/**
 * Fixture for raid under-capacity parity contracts.
 * Raid requires 3 teams; only 1 is currently assigned.
 */
export function makeRaidUnderCapacityFixture(): GameState {
  const state = createStartingState()

  state.agents = {
    'agent-anchor': makeAgent('agent-anchor', 'hunter', ['combat']),
    'agent-beta': makeAgent('agent-beta', 'tech', ['tech']),
    'agent-gamma': makeAgent('agent-gamma', 'occultist', ['occult']),
  }

  state.teams = {
    'team-anchor': makeTeam(
      'team-anchor',
      'Anchor Team',
      ['agent-anchor'],
      'agent-anchor',
      ['combat'],
      { assignedCaseId: 'raid-under-capacity' }
    ),
    'team-beta': makeTeam('team-beta', 'Beta Team', ['agent-beta'], 'agent-beta', ['tech']),
    'team-gamma': makeTeam('team-gamma', 'Gamma Team', ['agent-gamma'], 'agent-gamma', ['occult']),
  }

  state.cases = {
    'raid-under-capacity': makeRaidCase('raid-under-capacity', 3, 3, {
      title: 'Raid Under Capacity',
      status: 'in_progress',
      assignedTeamIds: ['team-anchor'],
      weeksRemaining: 1,
      requiredRoles: [],
      requiredTags: [],
      preferredTags: [],
      difficulty: { combat: 40, investigation: 20, utility: 20, social: 20 },
      weights: { combat: 0.4, investigation: 0.2, utility: 0.2, social: 0.2 },
    }),
  }

  state.reports = []
  state.events = []

  return normalizeGameState(state)
}

/**
 * Fixture for training selector parity contracts.
 * Covers agent/team readiness states and grouped queue behavior.
 */
export function makeTrainingSelectorParityFixture(): GameState {
  const state = createStartingState()

  state.agents = {
    'agent-ready-a': makeAgent('agent-ready-a', 'tech', ['tech']),
    'agent-ready-b': makeAgent('agent-ready-b', 'occultist', ['occult']),
    'agent-team-train-a': makeAgent('agent-team-train-a', 'hunter', ['combat']),
    'agent-team-train-b': makeAgent('agent-team-train-b', 'hunter', ['combat']),
    'agent-deployed-a': makeAgent('agent-deployed-a', 'investigator', ['investigation']),
    'agent-deployed-b': makeAgent('agent-deployed-b', 'tech', ['utility']),
    'agent-inactive-dead': makeAgent('agent-inactive-dead', 'hunter', ['combat'], {
      status: 'dead',
    }),
    'agent-inactive-active': makeAgent('agent-inactive-active', 'medic', ['support']),
    'agent-undersized': makeAgent('agent-undersized', 'negotiator', ['social']),
    'agent-solo-training': makeAgent('agent-solo-training', 'investigator', ['analysis']),
  }

  state.teams = {
    'team-ready': makeTeam(
      'team-ready',
      'Ready Team',
      ['agent-ready-a', 'agent-ready-b'],
      'agent-ready-a',
      ['tech', 'occult']
    ),
    'team-training': makeTeam(
      'team-training',
      'Training Team',
      ['agent-team-train-a', 'agent-team-train-b'],
      'agent-team-train-a',
      ['combat']
    ),
    'team-deployed': makeTeam(
      'team-deployed',
      'Deployed Team',
      ['agent-deployed-a', 'agent-deployed-b'],
      'agent-deployed-a',
      ['investigation'],
      { assignedCaseId: 'case-deployed' }
    ),
    'team-inactive': makeTeam(
      'team-inactive',
      'Inactive Team',
      ['agent-inactive-dead', 'agent-inactive-active'],
      'agent-inactive-active',
      ['support']
    ),
    'team-undersized': makeTeam(
      'team-undersized',
      'Undersized Team',
      ['agent-undersized'],
      'agent-undersized',
      ['social']
    ),
  }

  state.cases = {
    'case-deployed': makeCase('case-deployed', {
      status: 'in_progress',
      assignedTeamIds: ['team-deployed'],
      weeksRemaining: 1,
    }),
  }

  state.trainingQueue = [
    {
      id: 'queue-team-a',
      trainingId: 'drill-formation',
      trainingName: 'Formation Drill',
      scope: 'team',
      agentId: 'agent-team-train-a',
      agentName: state.agents['agent-team-train-a'].name,
      teamId: 'team-training',
      teamName: state.teams['team-training'].name,
      drillGroupId: 'drill-group-1',
      memberIds: ['agent-team-train-a', 'agent-team-train-b'],
      targetStat: 'combat',
      statDelta: 2,
      startedWeek: state.week,
      durationWeeks: 3,
      remainingWeeks: 2,
      fundingCost: 10,
      fatigueDelta: 4,
    },
    {
      id: 'queue-team-b',
      trainingId: 'drill-formation',
      trainingName: 'Formation Drill',
      scope: 'team',
      agentId: 'agent-team-train-b',
      agentName: state.agents['agent-team-train-b'].name,
      teamId: 'team-training',
      teamName: state.teams['team-training'].name,
      drillGroupId: 'drill-group-1',
      memberIds: ['agent-team-train-a', 'agent-team-train-b'],
      targetStat: 'combat',
      statDelta: 2,
      startedWeek: state.week,
      durationWeeks: 3,
      remainingWeeks: 2,
      fundingCost: 10,
      fatigueDelta: 4,
    },
    {
      id: 'queue-solo',
      trainingId: 'agent-focus',
      trainingName: 'Solo Focus',
      scope: 'agent',
      agentId: 'agent-solo-training',
      agentName: state.agents['agent-solo-training'].name,
      targetStat: 'investigation',
      statDelta: 1,
      startedWeek: state.week,
      durationWeeks: 2,
      remainingWeeks: 1,
      fundingCost: 6,
      fatigueDelta: 2,
    },
  ]

  state.reports = []
  state.events = []

  return normalizeGameState(state)
}

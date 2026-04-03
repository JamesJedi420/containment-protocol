import { revealCandidate } from './recruitment/reveal'
import { clamp } from './math'
// cspell:words lockdown
import type {
  Candidate,
  GameState,
  MarketState,
  WeeklyDirectiveId,
  WeeklyDirectiveState,
} from './models'

export interface WeeklyDirectiveDefinition {
  id: WeeklyDirectiveId
  label: string
  summary: string
  detail: string
  effects: string[]
}

export interface WeeklyDirectiveHistoryEntry {
  week: number
  directiveId: WeeklyDirectiveId
}

export const WEEKLY_DIRECTIVE_DEFINITIONS: readonly WeeklyDirectiveDefinition[] = [
  {
    id: 'intel-surge',
    label: 'Intel Surge',
    summary: 'Sharper recruitment visibility this week.',
    detail:
      'Diverts analysts into the intake pipeline so newly generated candidates arrive with clearer readouts and longer shelf life.',
    effects: ['New candidates gain +1 reveal level.', 'New candidates stay in the pool for +1 week.'],
  },
  {
    id: 'recovery-rotation',
    label: 'Recovery Rotation',
    summary: 'All non-deployed agents recover faster after the weekly tick.',
    detail:
      'Command prioritizes rest cycles and decompression, improving recovery for all units that are not actively deployed on a case.',
    effects: ['All non-deployed agents recover an extra 2 fatigue after weekly resolution.'],
  },
  {
    id: 'procurement-push',
    label: 'Procurement Push',
    summary: 'Softens next market shift pricing.',
    detail:
      'Logistics leans on supplier relationships to reduce procurement drag after the weekly market roll.',
    effects: ['Weekly market cost multiplier gains a 0.08 discount floor-adjusted at 0.75x.'],
  },
  {
    id: 'lockdown-protocol',
    label: 'Lockdown Protocol',
    summary: 'Halt all escalation spawns this week. Agency pays a containment cost.',
    detail:
      'Command issues a system-wide containment lockdown. No new cases emerge from unresolved triggers this week, but sustaining the lockdown taxes the agency\u2019s containment posture.',
    effects: [
      'Suppresses all unresolved-trigger spawns this week.',
      'Agency containment rating \u22128 after weekly resolution.',
    ],
  },
] as const

export function createDefaultWeeklyDirectiveState(): WeeklyDirectiveState {
  return {
    selectedId: null,
    history: [],
  }
}

export function getWeeklyDirectiveDefinitions() {
  return [...WEEKLY_DIRECTIVE_DEFINITIONS]
}

export function getWeeklyDirectiveDefinition(
  directiveId: WeeklyDirectiveId | null | undefined
): WeeklyDirectiveDefinition | null {
  if (!directiveId) {
    return null
  }

  return WEEKLY_DIRECTIVE_DEFINITIONS.find((directive) => directive.id === directiveId) ?? null
}

export function isWeeklyDirectiveId(value: unknown): value is WeeklyDirectiveId {
  return WEEKLY_DIRECTIVE_DEFINITIONS.some((directive) => directive.id === value)
}

export function applyIntelSurgeToCandidates(candidates: Candidate[]) {
  return candidates.map((candidate) => {
    const nextCandidate = revealCandidate(candidate, 1)

    return {
      ...nextCandidate,
      expiryWeek: nextCandidate.expiryWeek + 1,
    }
  })
}

export function applyRecoveryRotationToAgents(
  agents: GameState['agents'],
  activeTeamIds: readonly string[],
  teams: GameState['teams']
) {
  if (activeTeamIds.length === 0) {
    return Object.fromEntries(
      Object.entries(agents).map(([agentId, agent]) => [
        agentId,
        {
          ...agent,
          fatigue: clamp(agent.fatigue - 2, 0, 100),
        },
      ])
    )
  }

  const activeAgentIds = new Set(
    activeTeamIds.flatMap((teamId) => teams[teamId]?.memberIds ?? teams[teamId]?.agentIds ?? [])
  )

  return Object.fromEntries(
    Object.entries(agents).map(([agentId, agent]) => [
      agentId,
      {
        ...agent,
        fatigue: activeAgentIds.has(agentId) ? agent.fatigue : clamp(agent.fatigue - 2, 0, 100),
      },
    ])
  )
}

export function applyProcurementPushToMarket(market: MarketState): MarketState {
  return {
    ...market,
    costMultiplier: Number(clamp(market.costMultiplier - 0.08, 0.75, 2).toFixed(2)),
  }
}

export function recordAppliedDirective(
  directiveState: WeeklyDirectiveState,
  week: number,
  directiveId: WeeklyDirectiveId | null
): WeeklyDirectiveState {
  if (!directiveId) {
    return {
      ...directiveState,
      selectedId: null,
    }
  }

  return {
    selectedId: null,
    history: [...directiveState.history, { week, directiveId }],
  }
}

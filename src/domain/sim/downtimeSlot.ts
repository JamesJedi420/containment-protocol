import type { Agent } from '../agent/models'
import type { GameState, Id } from '../models'
import type { DowntimeActivity } from './recoveryDowntime'

/** Menu actions the player can assign as a single weekly primary (SPE-1699). */
export const PLAYER_PRIMARY_DOWNTIME_MENU = ['rest', 'therapy', 'coping', 'other'] as const

export type PlayerPrimaryDowntimeMenu = (typeof PLAYER_PRIMARY_DOWNTIME_MENU)[number]

const DOWNTIME_ACTIVITY_VALUES: readonly DowntimeActivity[] = [
  'rest',
  'training',
  'therapy',
  'other',
  'coping',
]

function isDowntimeActivity(value: string | undefined): value is DowntimeActivity {
  return value !== undefined && (DOWNTIME_ACTIVITY_VALUES as readonly string[]).includes(value)
}

function normalizeRequestedDowntime(raw: string | undefined): DowntimeActivity {
  if (!raw || !isDowntimeActivity(raw) || raw === 'training') {
    return 'rest'
  }
  return raw
}

export interface ResolveDowntimeSlotOptions {
  /** When set (e.g. from `advanceRecoveryDowntimeForWeek` maps in tests), wins over `agent.downtimeActivity`. */
  explicitEffective?: DowntimeActivity
}

export interface ResolvedDowntimeSlot {
  effective: DowntimeActivity
  foregone: DowntimeActivity[]
}

/**
 * SPE-1699: one primary downtime slot per agent per weekly tick.
 * Formal academy training consumes the slot; recovery-menu picks are listed as foregone that week.
 */
export function resolveDowntimeSlotForAgent(
  agent: Agent,
  opts?: ResolveDowntimeSlotOptions
): ResolvedDowntimeSlot {
  if (agent.assignment?.state === 'training') {
    return {
      effective: 'training',
      foregone: [...PLAYER_PRIMARY_DOWNTIME_MENU],
    }
  }

  if (opts?.explicitEffective === 'training') {
    return {
      effective: 'training',
      foregone: [...PLAYER_PRIMARY_DOWNTIME_MENU],
    }
  }

  const raw = opts?.explicitEffective ?? agent.downtimeActivity?.activity
  const effective = normalizeRequestedDowntime(raw)
  const foregone = PLAYER_PRIMARY_DOWNTIME_MENU.filter((a) => a !== effective)
  return { effective, foregone }
}

export function canSelectPrimaryDowntimePlan(agent: Agent): boolean {
  if (agent.status === 'dead' || agent.status === 'resigned') {
    return false
  }
  const st = agent.assignment?.state
  return st !== 'assigned' && st !== 'training'
}

const PRIMARY_DOWNTIME_LABEL: Record<DowntimeActivity, string> = {
  rest: 'Rest & recovery',
  therapy: 'Therapy / supervised washdown',
  coping: 'Off-duty coping',
  other: 'Logistics / side prep',
  training: 'Academy training (slot)',
}

export function getPrimaryDowntimeLabel(activity: DowntimeActivity): string {
  return PRIMARY_DOWNTIME_LABEL[activity]
}

export function formatForegoneDowntimeSummary(foregone: readonly DowntimeActivity[]): string {
  if (foregone.length === 0) return ''
  return foregone.map((a) => getPrimaryDowntimeLabel(a)).join('; ')
}

export function setAgentPrimaryDowntimePlan(
  state: GameState,
  agentId: Id,
  activity: PlayerPrimaryDowntimeMenu
): GameState {
  const agent = state.agents[agentId]
  if (!agent || !canSelectPrimaryDowntimePlan(agent)) {
    return state
  }

  return {
    ...state,
    agents: {
      ...state.agents,
      [agentId]: {
        ...agent,
        downtimeActivity: {
          activity,
          sinceWeek: state.week,
        },
      },
    },
  }
}

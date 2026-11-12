import type { GameState } from './models'
import {
  applyOverdriveRecoveryDebtTick,
  createDefaultFatigueChannels,
  expireAgentOverdrive,
  OVERDRIVE_RECOVERY_DEBT_DURATION,
} from './agentFatigueChannels'
import type { AnyOperationEventDraft } from './events/eventBus'

export interface CombatStimWeekCloseExpiryResult {
  state: GameState
  eventDrafts: AnyOperationEventDraft[]
}

/** Apply prior Combat Stim debt before current-week missions; active overdrive is skipped. */
export function applyCombatStimRecoveryDebtAtWeekClose(state: GameState): GameState {
  let changed = false
  const agents = { ...state.agents }
  for (const agentId of Object.keys(agents).sort()) {
    const agent = agents[agentId]
    if (
      !agent ||
      agent.overdrive?.source?.kind !== 'combat_stim' ||
      agent.overdrive.active ||
      agent.overdrive.recoveryDebt <= 0
    ) {
      continue
    }
    const tick = applyOverdriveRecoveryDebtTick({
      channels: agent.fatigueChannels ?? createDefaultFatigueChannels(),
      overdrive: agent.overdrive,
    })
    agents[agentId] = { ...agent, fatigueChannels: tick.channels, overdrive: tick.overdrive }
    changed = true
  }
  return changed ? { ...state, agents } : state
}

/** Expire all current Combat Stim overdrives after mission resolution, regardless of outcome. */
export function expireCombatStimOverdrivesAtWeekClose(
  state: GameState,
  closedWeek: number = state.week
): CombatStimWeekCloseExpiryResult {
  let changed = false
  const agents = { ...state.agents }
  const eventDrafts: AnyOperationEventDraft[] = []
  for (const agentId of Object.keys(agents).sort()) {
    const agent = agents[agentId]
    const source = agent?.overdrive?.source
    if (!agent || !agent.overdrive?.active || source?.kind !== 'combat_stim') continue
    const expiredOverdrive = expireAgentOverdrive({
      ...agent.overdrive,
      recoveryDebt: Math.max(agent.overdrive.recoveryDebt, OVERDRIVE_RECOVERY_DEBT_DURATION),
    })
    agents[agentId] = { ...agent, overdrive: expiredOverdrive }
    eventDrafts.push({
      type: 'equipment.combat_stim_overdrive_expired',
      sourceSystem: 'agent',
      payload: {
        week: closedWeek,
        activationId: source.activationId,
        instanceId: source.equipmentInstanceId,
        agentId,
        agentName: agent.name,
        caseId: source.caseId,
        recoveryDebt: expiredOverdrive.recoveryDebt,
      },
    })
    changed = true
  }
  return { state: changed ? { ...state, agents } : state, eventDrafts }
}

// cspell:words cooldown cooldowns
import type { Agent, AgentAbility, AgentAbilityState, GameState } from '../models'

function getActiveAbility(agent: Agent, abilityId: string): AgentAbility | undefined {
  return agent.abilities?.find((ability) => ability.id === abilityId && ability.type === 'active')
}

export function canExecuteActiveAbility(agent: Agent, abilityId: string) {
  const ability = getActiveAbility(agent, abilityId)

  if (!ability) {
    return false
  }

  const cooldownRemaining = agent.abilityState?.[abilityId]?.cooldownRemaining ?? 0
  return cooldownRemaining <= 0
}

export function markActiveAbilityUsed(
  agent: Agent,
  abilityId: string,
  week: number,
  cooldownOverride?: number
): Agent {
  const ability = getActiveAbility(agent, abilityId)

  if (!ability) {
    return agent
  }

  const cooldownRemaining = Math.max(0, Math.trunc(cooldownOverride ?? ability.cooldown ?? 0))
  const currentRuntime = agent.abilityState?.[abilityId]
  const nextAbilityState: AgentAbilityState = {
    ...(agent.abilityState ?? {}),
    [abilityId]: {
      cooldownRemaining,
      ...(Number.isFinite(week) ? { lastUsedWeek: Math.max(1, Math.trunc(week)) } : {}),
      usesConsumedThisWeek: Math.max(0, (currentRuntime?.usesConsumedThisWeek ?? 0) + 1),
    },
  }

  return {
    ...agent,
    abilityState: nextAbilityState,
  }
}

export function decrementActiveAbilityCooldownState(
  abilityState: AgentAbilityState | undefined
): AgentAbilityState | undefined {
  if (!abilityState || Object.keys(abilityState).length === 0) {
    return abilityState
  }

  return Object.fromEntries(
    Object.entries(abilityState).map(([abilityId, runtime]) => [
      abilityId,
      {
        ...runtime,
        cooldownRemaining: Math.max(0, Math.trunc(runtime.cooldownRemaining ?? 0) - 1),
        usesConsumedThisWeek: 0,
      },
    ])
  )
}

export function decrementActiveAbilityCooldowns(agents: GameState['agents']): GameState['agents'] {
  let changed = false
  const nextAgents = Object.fromEntries(
    Object.entries(agents).map(([agentId, agent]) => {
      const nextAbilityState = decrementActiveAbilityCooldownState(agent.abilityState)

      if (!nextAbilityState || nextAbilityState === agent.abilityState) {
        return [agentId, agent]
      }

      changed = true
      return [
        agentId,
        {
          ...agent,
          abilityState: nextAbilityState,
        },
      ]
    })
  )

  return changed ? nextAgents : agents
}

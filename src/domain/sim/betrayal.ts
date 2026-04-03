import { createAgentHistoryEntry, setAgentAssignment } from '../agent/lifecycle'
import {
  createAgentBetrayedDraft,
  createAgentRelationshipChangedDraft,
  createAgentResignedDraft,
  type AnyOperationEventDraft,
} from '../events'
import { clamp } from '../math'
import type { GameState } from '../models'

export const BETRAYAL_RELATIONSHIP_THRESHOLD = -1.5
export const BETRAYAL_RELATIONSHIP_DELTA = -0.2
export const TRUST_DAMAGE_BASE = 0.25
export const TRUST_DAMAGE_CRITICAL = 2.0
export const BENCHING_DURATION_WEEKS = 2
export const PERFORMANCE_PENALTY_WEEKS = 2
export const PERFORMANCE_PENALTY_MULTIPLIER = 0.7
export const DISCIPLINARY_COST = 8
export const TRUST_RECOVERY_PER_RECONCILIATION = 0.4
export const TRUST_RECOVERY_PASSIVE_PER_WEEK = 0.05
export const BETRAYAL_SOLIDARITY_THRESHOLD = 0.75
export const BETRAYAL_SOLIDARITY_DELTA = -0.08
export const BETRAYAL_GOSSIP_THRESHOLD = 0.6
export const BETRAYAL_GOSSIP_DELTA = -0.03

const BENCHING_TRIGGER = 0.6
const PENALTY_TRIGGER = 1.0
const DISCIPLINARY_TRIGGER = 1.4

interface RelationshipUpdate {
  leftId: string
  rightId: string
  leftPrevious: number
  rightPrevious: number
  leftNext: number
  rightNext: number
}

interface AgentResolutionPerformance {
  agentId: string
  contribution: number
}

interface ApplyBetrayalConsequencesInput {
  agents: GameState['agents']
  updates: RelationshipUpdate[]
  outcome: 'success' | 'partial' | 'fail'
  performanceByAgentId: Map<string, AgentResolutionPerformance>
  week: number
}

interface ApplyBetrayalConsequencesOutput {
  nextAgents: GameState['agents']
  eventDrafts: AnyOperationEventDraft[]
  fundingDelta: number
}

interface BetrayalSignal {
  betrayerId: string
  betrayedId: string
  previousValue: number
  nextValue: number
  trustDamageDelta: number
}

type ActiveAgent = NonNullable<GameState['agents'][string]>

interface TrustConsequenceReconciliation {
  trustConsequenceStack: ActiveAgent['trustConsequenceStack']
  performancePenaltyMultiplier: ActiveAgent['performancePenaltyMultiplier']
  status: ActiveAgent['status']
}

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100
}

function toDirectedPairKey(fromId: string, toId: string) {
  return `${fromId}->${toId}`
}

function stripTrustDamageEntry(
  trustDamageByAgent: Record<string, number> | undefined,
  counterpartId: string,
  nextValue: number
) {
  const next = { ...(trustDamageByAgent ?? {}) }

  if (nextValue <= 0) {
    delete next[counterpartId]
  } else {
    next[counterpartId] = nextValue
  }

  return Object.keys(next).length > 0 ? next : undefined
}

function reconcileTrustConsequences(
  agent: ActiveAgent,
  counterpartId: string,
  nextTrustDamage: number
): TrustConsequenceReconciliation {
  const existingStack = agent.trustConsequenceStack ?? []
  const nextStack = existingStack.filter((entry) => {
    if (entry.pairAgentId !== counterpartId) {
      return true
    }

    if (entry.consequenceType === 'resignation' || entry.consequenceType === 'disciplinary') {
      return true
    }

    if (entry.consequenceType === 'benching' && nextTrustDamage < BENCHING_TRIGGER) {
      return false
    }

    if (entry.consequenceType === 'performance_penalty' && nextTrustDamage < PENALTY_TRIGGER) {
      return false
    }

    return true
  })

  const hasAnyPenalty = nextStack.some((entry) => entry.consequenceType === 'performance_penalty')
  const hasAnyBenching = nextStack.some((entry) => entry.consequenceType === 'benching')

  return {
    trustConsequenceStack: nextStack,
    performancePenaltyMultiplier: hasAnyPenalty ? agent.performancePenaltyMultiplier : undefined,
    status:
      !hasAnyBenching && agent.status === 'recovering' ? 'active' : agent.status,
  }
}

function recoverTrustDamageForDirection(
  agent: ActiveAgent,
  counterpartId: string,
  amount: number
) {
  const previousTrustDamage = getTrustDamage(agent, counterpartId)
  if (previousTrustDamage <= 0) {
    return agent
  }

  const nextTrustDamage = roundToTwo(Math.max(0, previousTrustDamage - Math.max(0, amount)))
  const consequenceState = reconcileTrustConsequences(agent, counterpartId, nextTrustDamage)

  return {
    ...agent,
    trustDamageByAgent: stripTrustDamageEntry(agent.trustDamageByAgent, counterpartId, nextTrustDamage),
    trustConsequenceStack: consequenceState.trustConsequenceStack,
    performancePenaltyMultiplier: consequenceState.performancePenaltyMultiplier,
    status: consequenceState.status,
  }
}

export function recoverTrustDamageForPair(
  agents: GameState['agents'],
  leftId: string,
  rightId: string,
  amount: number = TRUST_RECOVERY_PER_RECONCILIATION
) {
  const left = agents[leftId]
  const right = agents[rightId]

  if (!left || !right) {
    return agents
  }

  const nextLeft = recoverTrustDamageForDirection(left, rightId, amount)
  const nextRight = recoverTrustDamageForDirection(right, leftId, amount)

  if (nextLeft === left && nextRight === right) {
    return agents
  }

  return {
    ...agents,
    [leftId]: nextLeft,
    [rightId]: nextRight,
  }
}

export function recoverTrustDamagePassively(
  agents: GameState['agents'],
  amount: number = TRUST_RECOVERY_PASSIVE_PER_WEEK
) {
  const nextAgents = { ...agents }
  let changed = false

  for (const [agentId, agent] of Object.entries(agents)) {
    if (!agent.trustDamageByAgent || Object.keys(agent.trustDamageByAgent).length === 0) {
      continue
    }

    let nextAgent = agent

    for (const counterpartId of Object.keys(agent.trustDamageByAgent)) {
      nextAgent = recoverTrustDamageForDirection(nextAgent, counterpartId, amount)
    }

    if (nextAgent !== agent) {
      nextAgents[agentId] = nextAgent
      changed = true
    }
  }

  return changed ? nextAgents : agents
}

function getTrustDamage(agent: GameState['agents'][string], counterpartId: string) {
  return agent?.trustDamageByAgent?.[counterpartId] ?? 0
}

function getPerformanceContribution(
  performanceByAgentId: Map<string, AgentResolutionPerformance>,
  agentId: string
) {
  return performanceByAgentId.get(agentId)?.contribution ?? 0
}

function hasActiveConsequence(
  agent: GameState['agents'][string],
  type: 'benching' | 'performance_penalty' | 'disciplinary' | 'resignation',
  week: number
) {
  return (agent?.trustConsequenceStack ?? []).some(
    (entry) => entry.consequenceType === type && (entry.expiresWeek === undefined || entry.expiresWeek > week)
  )
}

function detectBetrayalSignals(
  updates: RelationshipUpdate[],
  performanceByAgentId: Map<string, AgentResolutionPerformance>,
  outcome: 'success' | 'partial' | 'fail'
): BetrayalSignal[] {
  if (outcome !== 'fail') {
    return []
  }

  const signals: BetrayalSignal[] = []

  for (const update of updates) {
    const leftContribution = getPerformanceContribution(performanceByAgentId, update.leftId)
    const rightContribution = getPerformanceContribution(performanceByAgentId, update.rightId)
    const contributionGap = Math.abs(leftContribution - rightContribution)

    const leftCritical = update.leftNext <= BETRAYAL_RELATIONSHIP_THRESHOLD
    const rightCritical = update.rightNext <= BETRAYAL_RELATIONSHIP_THRESHOLD

    if (!leftCritical && !rightCritical && contributionGap < 25) {
      continue
    }

    const lowerPerformerIsLeft = leftContribution < rightContribution
    const lowerPerformerId = lowerPerformerIsLeft ? update.leftId : update.rightId
    const higherPerformerId = lowerPerformerIsLeft ? update.rightId : update.leftId
    const directionalValue = lowerPerformerIsLeft ? update.leftNext : update.rightNext

    if (directionalValue > BETRAYAL_RELATIONSHIP_THRESHOLD && contributionGap < 35) {
      continue
    }

    const trustDamageDelta = roundToTwo(
      TRUST_DAMAGE_BASE +
        clamp(contributionGap / 200, 0, 0.25) +
        (directionalValue <= BETRAYAL_RELATIONSHIP_THRESHOLD ? 0.1 : 0)
    )

    signals.push({
      betrayerId: lowerPerformerId,
      betrayedId: higherPerformerId,
      previousValue: lowerPerformerIsLeft ? update.leftPrevious : update.rightPrevious,
      nextValue: directionalValue,
      trustDamageDelta,
    })
  }

  return signals
}

export function applyBetrayalConsequences({
  agents,
  updates,
  outcome,
  performanceByAgentId,
  week,
}: ApplyBetrayalConsequencesInput): ApplyBetrayalConsequencesOutput {
  const signals = detectBetrayalSignals(updates, performanceByAgentId, outcome)
  const participantIds = new Set<string>()

  for (const update of updates) {
    participantIds.add(update.leftId)
    participantIds.add(update.rightId)
  }

  const nonParticipantIds = Object.keys(agents).filter((agentId) => !participantIds.has(agentId))

  if (signals.length === 0) {
    return { nextAgents: agents, eventDrafts: [], fundingDelta: 0 }
  }

  let fundingDelta = 0
  const eventDrafts: AnyOperationEventDraft[] = []
  const nextAgents = { ...agents }
  const dampedRipplePairs = new Set<string>()

  for (const signal of signals) {
    const betrayer = nextAgents[signal.betrayerId]
    const betrayed = nextAgents[signal.betrayedId]

    if (!betrayer || !betrayed || betrayer.status === 'dead' || betrayer.status === 'resigned') {
      continue
    }

    const previousDirectional = betrayer.relationships[signal.betrayedId] ?? signal.previousValue
    const betrayedDirectional = betrayed.relationships[signal.betrayerId] ?? 0
    const nextDirectional = roundToTwo(
      clamp(previousDirectional + BETRAYAL_RELATIONSHIP_DELTA, -2, 2)
    )

    const nextTrustDamage = roundToTwo(
      getTrustDamage(betrayer, signal.betrayedId) + signal.trustDamageDelta
    )

    let nextBetrayer: NonNullable<GameState['agents'][string]> = {
      ...betrayer,
      relationships: {
        ...betrayer.relationships,
        [signal.betrayedId]: nextDirectional,
      },
      trustDamageByAgent: {
        ...(betrayer.trustDamageByAgent ?? {}),
        [signal.betrayedId]: nextTrustDamage,
      },
      trustConsequenceStack: [...(betrayer.trustConsequenceStack ?? [])],
    }

    const triggeredConsequences: Array<'benching' | 'performance_penalty' | 'disciplinary' | 'resignation'> = []

    if (
      nextTrustDamage >= BENCHING_TRIGGER &&
      !hasActiveConsequence(nextBetrayer, 'benching', week)
    ) {
      triggeredConsequences.push('benching')
      nextBetrayer = {
        ...setAgentAssignment({
          ...nextBetrayer,
          status: nextBetrayer.status === 'active' ? 'recovering' : nextBetrayer.status,
        }, { state: 'idle' }),
        trustConsequenceStack: [
          ...(nextBetrayer.trustConsequenceStack ?? []),
          {
            reason: 'betrayal',
            pairAgentId: signal.betrayedId,
            triggeredWeek: week,
            consequenceType: 'benching',
            expiresWeek: week + BENCHING_DURATION_WEEKS,
          },
        ],
      }
    }

    if (
      nextTrustDamage >= PENALTY_TRIGGER &&
      !hasActiveConsequence(nextBetrayer, 'performance_penalty', week)
    ) {
      triggeredConsequences.push('performance_penalty')
      nextBetrayer = {
        ...nextBetrayer,
        performancePenaltyMultiplier: PERFORMANCE_PENALTY_MULTIPLIER,
        trustConsequenceStack: [
          ...(nextBetrayer.trustConsequenceStack ?? []),
          {
            reason: 'betrayal',
            pairAgentId: signal.betrayedId,
            triggeredWeek: week,
            consequenceType: 'performance_penalty',
            expiresWeek: week + PERFORMANCE_PENALTY_WEEKS,
          },
        ],
      }
    }

    if (
      nextTrustDamage >= DISCIPLINARY_TRIGGER &&
      !hasActiveConsequence(nextBetrayer, 'disciplinary', week)
    ) {
      triggeredConsequences.push('disciplinary')
      fundingDelta -= DISCIPLINARY_COST
      nextBetrayer = {
        ...nextBetrayer,
        vitals: nextBetrayer.vitals
          ? {
              ...nextBetrayer.vitals,
              morale: clamp(nextBetrayer.vitals.morale - 8, 0, 100),
            }
          : nextBetrayer.vitals,
        trustConsequenceStack: [
          ...(nextBetrayer.trustConsequenceStack ?? []),
          {
            reason: 'betrayal',
            pairAgentId: signal.betrayedId,
            triggeredWeek: week,
            consequenceType: 'disciplinary',
          },
        ],
      }
    }

    if (
      nextTrustDamage >= TRUST_DAMAGE_CRITICAL &&
      !hasActiveConsequence(nextBetrayer, 'resignation', week)
    ) {
      triggeredConsequences.push('resignation')
      nextBetrayer = {
        ...nextBetrayer,
        status: 'resigned',
        trustConsequenceStack: [
          ...(nextBetrayer.trustConsequenceStack ?? []),
          {
            reason: 'betrayal',
            pairAgentId: signal.betrayedId,
            triggeredWeek: week,
            consequenceType: 'resignation',
          },
        ],
      }
    }

    const betrayedMorale = betrayed.vitals
      ? {
          ...betrayed.vitals,
          morale: clamp(betrayed.vitals.morale - 4, 0, 100),
        }
      : betrayed.vitals

    nextAgents[signal.betrayerId] = {
      ...nextBetrayer,
      history: nextBetrayer.history
        ? {
            ...nextBetrayer.history,
            timeline: [
              ...nextBetrayer.history.timeline,
              createAgentHistoryEntry(week, 'simulation.weekly_tick', `Trust breach with ${betrayed.name}.`),
            ],
          }
        : nextBetrayer.history,
    }
    nextAgents[signal.betrayedId] = {
      ...betrayed,
      vitals: betrayedMorale,
      history: betrayed.history
        ? {
            ...betrayed.history,
            timeline: [
              ...betrayed.history.timeline,
              createAgentHistoryEntry(week, 'simulation.weekly_tick', `Betrayed by ${betrayer.name}.`),
            ],
          }
        : betrayed.history,
    }

    eventDrafts.push(
      createAgentBetrayedDraft({
        week,
        betrayerId: signal.betrayerId,
        betrayerName: betrayer.name,
        betrayedId: signal.betrayedId,
        betrayedName: betrayed.name,
        trustDamageDelta: signal.trustDamageDelta,
        trustDamageTotal: nextTrustDamage,
        triggeredConsequences,
      }),
      createAgentRelationshipChangedDraft({
        week,
        agentId: signal.betrayerId,
        agentName: betrayer.name,
        counterpartId: signal.betrayedId,
        counterpartName: betrayed.name,
        previousValue: previousDirectional,
        nextValue: nextDirectional,
        delta: roundToTwo(nextDirectional - previousDirectional),
        reason: 'betrayal',
      }),
      createAgentRelationshipChangedDraft({
        week,
        agentId: signal.betrayedId,
        agentName: betrayed.name,
        counterpartId: signal.betrayerId,
        counterpartName: betrayer.name,
        previousValue: betrayedDirectional,
        nextValue: betrayedDirectional,
        delta: 0,
        reason: 'betrayal',
      }),
      ...(triggeredConsequences.includes('resignation')
        ? [
            createAgentResignedDraft({
              week,
              agentId: signal.betrayerId,
              agentName: betrayer.name,
              reason: 'trust_failure_cumulative',
              counterpartId: signal.betrayedId,
              counterpartName: betrayed.name,
            }),
          ]
        : [])
    )

    for (const allyId of participantIds) {
      if (allyId === signal.betrayerId || allyId === signal.betrayedId) {
        continue
      }

      const ally = nextAgents[allyId]
      if (!ally || ally.status === 'dead' || ally.status === 'resigned') {
        continue
      }

      const affinityToBetrayed = ally.relationships[signal.betrayedId] ?? 0
      if (affinityToBetrayed < BETRAYAL_SOLIDARITY_THRESHOLD) {
        continue
      }

      const rippleKey = toDirectedPairKey(allyId, signal.betrayerId)
      if (dampedRipplePairs.has(rippleKey)) {
        continue
      }

      const allyPreviousTowardBetrayer = ally.relationships[signal.betrayerId] ?? 0
      const allyNextTowardBetrayer = roundToTwo(
        clamp(allyPreviousTowardBetrayer + BETRAYAL_SOLIDARITY_DELTA, -2, 2)
      )

      if (allyNextTowardBetrayer === allyPreviousTowardBetrayer) {
        continue
      }

      nextAgents[allyId] = {
        ...ally,
        relationships: {
          ...ally.relationships,
          [signal.betrayerId]: allyNextTowardBetrayer,
        },
      }

      eventDrafts.push(
        createAgentRelationshipChangedDraft({
          week,
          agentId: allyId,
          agentName: ally.name,
          counterpartId: signal.betrayerId,
          counterpartName: betrayer.name,
          previousValue: allyPreviousTowardBetrayer,
          nextValue: allyNextTowardBetrayer,
          delta: roundToTwo(allyNextTowardBetrayer - allyPreviousTowardBetrayer),
          reason: 'betrayal',
        })
      )
      dampedRipplePairs.add(rippleKey)
    }

    for (const observerId of nonParticipantIds) {
      const observer = nextAgents[observerId]
      if (!observer || observer.status === 'dead' || observer.status === 'resigned') {
        continue
      }

      const trustInBetrayed = observer.relationships[signal.betrayedId] ?? 0
      if (trustInBetrayed < BETRAYAL_GOSSIP_THRESHOLD) {
        continue
      }

      const rippleKey = toDirectedPairKey(observerId, signal.betrayerId)
      if (dampedRipplePairs.has(rippleKey)) {
        continue
      }

      const previousTowardBetrayer = observer.relationships[signal.betrayerId] ?? 0
      const nextTowardBetrayer = roundToTwo(
        clamp(previousTowardBetrayer + BETRAYAL_GOSSIP_DELTA, -2, 2)
      )

      if (nextTowardBetrayer === previousTowardBetrayer) {
        continue
      }

      nextAgents[observerId] = {
        ...observer,
        relationships: {
          ...observer.relationships,
          [signal.betrayerId]: nextTowardBetrayer,
        },
      }

      eventDrafts.push(
        createAgentRelationshipChangedDraft({
          week,
          agentId: observerId,
          agentName: observer.name,
          counterpartId: signal.betrayerId,
          counterpartName: betrayer.name,
          previousValue: previousTowardBetrayer,
          nextValue: nextTowardBetrayer,
          delta: roundToTwo(nextTowardBetrayer - previousTowardBetrayer),
          reason: 'betrayal',
        })
      )
      dampedRipplePairs.add(rippleKey)
    }
  }

  return { nextAgents, eventDrafts, fundingDelta }
}

export function expireBetrayalConsequences(
  agents: GameState['agents'],
  week: number
): GameState['agents'] {
  const nextAgents = { ...agents }

  for (const [agentId, agent] of Object.entries(agents)) {
    const stack = agent.trustConsequenceStack ?? []
    if (stack.length === 0) {
      continue
    }

    const remaining = stack.filter(
      (entry) => entry.expiresWeek === undefined || entry.expiresWeek > week
    )

    if (remaining.length === stack.length) {
      continue
    }

    const hadBenching = stack.some((entry) => entry.consequenceType === 'benching')
    const hasBenching = remaining.some((entry) => entry.consequenceType === 'benching')
    const hasPenalty = remaining.some((entry) => entry.consequenceType === 'performance_penalty')

    nextAgents[agentId] = {
      ...agent,
      trustConsequenceStack: remaining,
      performancePenaltyMultiplier: hasPenalty ? agent.performancePenaltyMultiplier : undefined,
      status:
        hadBenching && !hasBenching && agent.status === 'recovering' ? 'active' : agent.status,
    }
  }

  return nextAgents
}

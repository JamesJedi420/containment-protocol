// cspell:words fieldcraft pathfinding pathing psionic
import { effectiveStats } from './agent/evaluation'
import { clamp } from './math'
import type { Agent, CaseInstance, Id } from './models'
import { resolveEquippedItems } from './equipment'
import type { AgencyProtocolState } from './protocols'

const RECON_AGENT_TAGS = new Set([
  'recon',
  'field_recon',
  'surveillance',
  'pathfinding',
  'field-kit',
  'signal-hunter',
  'fieldcraft',
])

const RECON_ITEM_TAGS = new Set([
  'recon',
  'surveillance',
  'signal',
  'analysis',
  'anomaly',
  'field-kit',
  'pathfinding',
  'environmental',
])

interface HiddenCaseModifierDefinition {
  id: string
  label: string
  keywords: string[]
  revealThreshold: number
  uncertainty: number
  scoreBonus: number
  probabilityBonus: number
}

export interface RecruitmentScoutSupport {
  operativeCount: number
  supportScore: number
  reliabilityBonus: number
  costDiscount: number
  revealBoost: number
  fieldReconCount: number
  investigatorCount: number
  techCount: number
  leadRole?: Agent['role']
}

export interface CaseReconSummary {
  reconScore: number
  operativeCount: number
  hiddenModifierCount: number
  revealedModifierCount: number
  revealedModifierLabels: string[]
  intelConfidence: number
  uncertaintyBefore: number
  uncertaintyAfter: number
  unknownVariablePressure: number
  unknownVariableCoverage: number
  scoreAdjustment: number
  probabilityBonus: number
  reasons: string[]
}

export interface TeamReconContext {
  supportTags?: string[]
  teamTags?: string[]
  leaderId?: Id | null
  protocolState?: AgencyProtocolState
}

const HIDDEN_CASE_MODIFIERS: readonly HiddenCaseModifierDefinition[] = [
  {
    id: 'trace-signature',
    label: 'Trace signature',
    keywords: ['evidence', 'analysis', 'archive', 'forensics'],
    revealThreshold: 22,
    uncertainty: 0.8,
    scoreBonus: 0.8,
    probabilityBonus: 0.006,
  },
  {
    id: 'occult-resonance',
    label: 'Occult resonance',
    keywords: ['occult', 'ritual', 'spirit', 'anomaly', 'psionic', 'containment'],
    revealThreshold: 28,
    uncertainty: 1.3,
    scoreBonus: 1.2,
    probabilityBonus: 0.012,
  },
  {
    id: 'signal-distortion',
    label: 'Signal distortion',
    keywords: ['signal', 'relay', 'cyber', 'information', 'intel', 'memory'],
    revealThreshold: 26,
    uncertainty: 1.2,
    scoreBonus: 1.1,
    probabilityBonus: 0.012,
  },
  {
    id: 'environmental-drift',
    label: 'Environmental drift',
    keywords: ['hazmat', 'biological', 'chemical', 'toxin', 'plague', 'environmental'],
    revealThreshold: 25,
    uncertainty: 1,
    scoreBonus: 0.9,
    probabilityBonus: 0.008,
  },
  {
    id: 'witness-noise',
    label: 'Witness noise',
    keywords: ['witness', 'interview', 'civilian', 'social', 'negotiation'],
    revealThreshold: 22,
    uncertainty: 0.7,
    scoreBonus: 0.7,
    probabilityBonus: 0.006,
  },
  {
    id: 'pathing-disruption',
    label: 'Pathing disruption',
    keywords: ['field', 'breach', 'combat', 'raid', 'perimeter', 'outbreak'],
    revealThreshold: 24,
    uncertainty: 0.9,
    scoreBonus: 0.85,
    probabilityBonus: 0.007,
  },
]

function buildCaseTagSet(caseData: CaseInstance) {
  return new Set([...caseData.tags, ...caseData.requiredTags, ...caseData.preferredTags])
}

function countMatchingTags(values: Iterable<string>, tags: Set<string>) {
  let matches = 0

  for (const value of values) {
    if (tags.has(value)) {
      matches += 1
    }
  }

  return matches
}

function buildCaseHiddenModifiers(caseData: CaseInstance) {
  const caseTags = buildCaseTagSet(caseData)
  const activeModifiers = HIDDEN_CASE_MODIFIERS.flatMap((modifier) => {
    const matchedKeywords = modifier.keywords.filter((keyword) => caseTags.has(keyword))

    if (matchedKeywords.length === 0) {
      return []
    }

    return [
      {
        ...modifier,
        matchedKeywords,
      },
    ]
  })

  if (caseData.mode === 'probability') {
    activeModifiers.push({
      id: 'unknown-variable-window',
      label: 'Unknown variable window',
      keywords: ['probability'],
      matchedKeywords: ['probability'],
      revealThreshold: 30 + Math.max(0, caseData.stage - 1) * 2,
      uncertainty: 1.15,
      scoreBonus: 0.95,
      probabilityBonus: 0.015,
    })
  }

  if (caseData.stage >= 4) {
    activeModifiers.push({
      id: 'escalation-volatility',
      label: 'Escalation volatility',
      keywords: ['stage'],
      matchedKeywords: ['stage'],
      revealThreshold: 34, // was 36; extends recon payoff window
      uncertainty: 1.25,
      scoreBonus: 1,
      probabilityBonus: 0.01,
    })
  }

  if (activeModifiers.length === 0 && caseData.weights.investigation >= 0.3) {
    activeModifiers.push({
      id: 'terrain-ambiguity',
      label: 'Terrain ambiguity',
      keywords: ['investigation'],
      matchedKeywords: ['investigation'],
      revealThreshold: 22,
      uncertainty: 0.75,
      scoreBonus: 0.7,
      probabilityBonus: 0.006,
    })
  }

  return activeModifiers
}

function getAgentReconContribution(
  agent: Agent,
  context?: TeamReconContext & { caseData?: CaseInstance }
) {
  if (agent.status === 'dead' || agent.status === 'resigned') {
    return 0
  }

  const stats = effectiveStats(agent, {
    includeFatigue: context?.caseData ? undefined : false,
    caseData: context?.caseData,
    supportTags: context?.supportTags,
    teamTags: context?.teamTags,
    leaderId: context?.leaderId,
    protocolState: context?.protocolState,
  })
  const equippedItems = resolveEquippedItems(agent, {
    caseData: context?.caseData,
    supportTags: context?.supportTags,
    teamTags: context?.teamTags,
  })
  const equippedTags = equippedItems.flatMap((item) => item.tags)
  const caseTags = context?.caseData ? buildCaseTagSet(context.caseData) : undefined
  const matchingReconItems = equippedItems.filter((item) =>
    item.tags.some((tag) => RECON_ITEM_TAGS.has(tag))
  )
  const specializedItemCount = caseTags
    ? equippedItems.filter((item) => item.tags.some((tag) => caseTags.has(tag))).length
    : 0

  const baselineScore =
    stats.cognitive.investigation * 0.34 +
    stats.technical.equipment * 0.24 +
    stats.tactical.awareness * 0.24 +
    stats.cognitive.analysis * 0.18
  const roleMultiplier =
    agent.role === 'field_recon'
      ? 1.28
      : agent.role === 'investigator' || agent.role === 'tech'
        ? 0.92
        : 0.55
  const tagBonus =
    countMatchingTags(agent.tags, RECON_AGENT_TAGS) * 2 + (agent.role === 'field_recon' ? 8 : 0)
  const equipmentBonus =
    matchingReconItems.length * 3 +
    Math.min(6, specializedItemCount * 2) +
    countMatchingTags(equippedTags, RECON_ITEM_TAGS)

  return clamp(
    Math.round((baselineScore / 5.75) * roleMultiplier + tagBonus + equipmentBonus),
    0,
    46
  )
}

function getRecruitmentScoutAvailabilityMultiplier(agent: Agent) {
  if (agent.status === 'dead' || agent.status === 'resigned') {
    return 0
  }

  if (agent.status === 'recovering' || agent.assignment?.state === 'recovery') {
    return 0.1
  }

  if (agent.status === 'injured') {
    return 0.35
  }

  let multiplier = 1

  if (agent.assignment?.state === 'assigned') {
    multiplier *= 0.2
  } else if (agent.assignment?.state === 'training') {
    multiplier *= 0.5
  }

  if (agent.fatigue >= 60) {
    multiplier *= 0.45
  } else if (agent.fatigue >= 40) {
    multiplier *= 0.7
  }

  return roundTo(clamp(multiplier, 0, 1), 3)
}

function getRecruitmentScoutRoleWeight(agent: Agent) {
  if (agent.role === 'field_recon') {
    return {
      core: 1.35,
      tags: 1,
      equipment: 1,
      flatBonus: 8,
    }
  }

  if (agent.role === 'investigator') {
    return {
      core: 0.58,
      tags: 0.45,
      equipment: 0.55,
      flatBonus: 2,
    }
  }

  if (agent.role === 'tech') {
    return {
      core: 0.48,
      tags: 0.35,
      equipment: 0.5,
      flatBonus: 1,
    }
  }

  return {
    core: 0.14,
    tags: 0.12,
    equipment: 0.22,
    flatBonus: 0,
  }
}

function getRecruitmentScoutContribution(agent: Agent) {
  const availabilityMultiplier = getRecruitmentScoutAvailabilityMultiplier(agent)

  if (availabilityMultiplier <= 0) {
    return 0
  }

  const stats = effectiveStats(agent, {
    includeFatigue: true,
  })
  const equippedItems = resolveEquippedItems(agent)
  const equippedTags = equippedItems.flatMap((item) => item.tags)
  const matchingReconItems = equippedItems.filter((item) =>
    item.tags.some((tag) => RECON_ITEM_TAGS.has(tag))
  )
  const roleWeight = getRecruitmentScoutRoleWeight(agent)
  const baselineScore =
    stats.cognitive.investigation * 0.36 +
    stats.technical.equipment * 0.26 +
    stats.tactical.awareness * 0.26 +
    stats.cognitive.analysis * 0.12
  const tagBonus =
    countMatchingTags(agent.tags, RECON_AGENT_TAGS) * 2.4 * roleWeight.tags + roleWeight.flatBonus
  const equipmentBonus =
    (matchingReconItems.length * 2.6 +
      Math.min(4, countMatchingTags(equippedTags, RECON_ITEM_TAGS) * 0.8)) *
    roleWeight.equipment

  return clamp(
    Math.round(
      ((baselineScore / 6.6) * roleWeight.core + tagBonus + equipmentBonus) * availabilityMultiplier
    ),
    0,
    40
  )
}

function roundTo(value: number, digits = 2) {
  return Number(value.toFixed(digits))
}

export function evaluateRecruitmentScoutSupport(agents: Record<string, Agent>) {
  const contributors = Object.values(agents)
    .map((agent) => ({
      role: agent.role,
      score: getRecruitmentScoutContribution(agent),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score
      }

      const rolePriority = getRecruitmentScoutRolePriority(left.role) - getRecruitmentScoutRolePriority(right.role)
      if (rolePriority !== 0) {
        return rolePriority
      }

      return left.role.localeCompare(right.role)
    })
  const operativeScores = contributors.map((entry) => entry.score)
  const operativeCount = operativeScores.length
  const supportScore = clamp(
    operativeScores.slice(0, 3).reduce((sum, score) => sum + score, 0),
    0,
    100
  )
  const fieldReconCount = contributors.filter((entry) => entry.role === 'field_recon').length
  const investigatorCount = contributors.filter((entry) => entry.role === 'investigator').length
  const techCount = contributors.filter((entry) => entry.role === 'tech').length

  return {
    operativeCount,
    supportScore,
    reliabilityBonus: roundTo(clamp(supportScore / 420, 0, 0.18), 4),
    costDiscount: Math.min(6, Math.round(supportScore / 20)),
    revealBoost: supportScore >= 48 ? 1 : 0,
    fieldReconCount,
    investigatorCount,
    techCount,
    leadRole: contributors[0]?.role,
  } satisfies RecruitmentScoutSupport
}

function getRecruitmentScoutRolePriority(role: Agent['role']) {
  if (role === 'field_recon') {
    return 0
  }

  if (role === 'investigator') {
    return 1
  }

  if (role === 'tech') {
    return 2
  }

  return 3
}

export function evaluateTeamCaseRecon(
  agents: Agent[],
  caseData: CaseInstance,
  context: TeamReconContext = {}
): CaseReconSummary {
  if (agents.length === 0) {
    return {
      reconScore: 0,
      operativeCount: 0,
      hiddenModifierCount: 0,
      revealedModifierCount: 0,
      revealedModifierLabels: [],
      intelConfidence: 0,
      uncertaintyBefore: 0,
      uncertaintyAfter: 0,
      unknownVariablePressure: 0,
      unknownVariableCoverage: 0,
      scoreAdjustment: 0,
      probabilityBonus: 0,
      reasons: [],
    }
  }

  const hiddenModifiers = buildCaseHiddenModifiers(caseData)
  const agentScores = agents
    .map((agent) => getAgentReconContribution(agent, { ...context, caseData }))
    .filter((score) => score > 0)
    .sort((left, right) => right - left)
  const operativeCount = agentScores.length
  const reconScore = clamp(
    agentScores.reduce((sum, score) => sum + score, 0),
    0,
    100
  )
  const revealedModifiers = hiddenModifiers.filter(
    (modifier) => reconScore >= modifier.revealThreshold
  )
  const uncertaintyBefore = roundTo(
    hiddenModifiers.reduce((sum, modifier) => sum + modifier.uncertainty, 0)
  )
  const revealedUncertainty = revealedModifiers.reduce(
    (sum, modifier) => sum + modifier.uncertainty,
    0
  )
  const uncertaintyAfter = roundTo(
    clamp(uncertaintyBefore - revealedUncertainty - reconScore / 120, 0, 10)
  )
  const hiddenModifierCount = hiddenModifiers.length
  const revealedModifierCount = revealedModifiers.length
  const hiddenModifierCoverage =
    hiddenModifierCount > 0 ? revealedModifierCount / hiddenModifierCount : 1
  const unknownVariablePressure = roundTo(
    clamp(
      (hiddenModifierCount * 16 +
        (caseData.mode === 'probability' ? 18 : 0) +
        Math.max(0, caseData.stage - 1) * 7) /
        100,
      0,
      1
    ),
    3
  )
  const unknownVariableCoverage = roundTo(
    clamp(
      hiddenModifierCoverage * 0.45 +
        Math.min(1, reconScore / 100) * 0.55 +
        Math.min(0.12, operativeCount * 0.03),
      0,
      1
    ),
    3
  )
  const intelConfidence = roundTo(
    clamp(
      0.22 + reconScore / 115 + hiddenModifierCoverage * 0.18 - uncertaintyAfter * 0.03,
      0.18,
      0.98
    ),
    3
  )

  let scoreAdjustment =
    revealedModifiers.reduce((sum, modifier) => sum + modifier.scoreBonus, 0) +
    Math.max(0, reconScore - 28) * 0.02 + // was 0.018; slightly flattens decay
    unknownVariableCoverage * (caseData.mode === 'probability' ? 0.85 : 0.35)
  scoreAdjustment = roundTo(Math.min(scoreAdjustment, 5.5))

  let probabilityBonus =
    revealedModifiers.reduce((sum, modifier) => sum + modifier.probabilityBonus, 0) +
    (caseData.mode === 'probability' ? unknownVariableCoverage * 0.028 : 0)
  probabilityBonus = roundTo(clamp(probabilityBonus, 0, 0.08), 4)

  const reasons: string[] = []

  if (hiddenModifierCount > 0 && operativeCount > 0) {
    reasons.push(
      `Recon sweep: +${scoreAdjustment.toFixed(1)} (${revealedModifierCount}/${hiddenModifierCount} hidden factors revealed)`
    )
  }

  if (probabilityBonus > 0) {
    reasons.push(`Unknown-variable coverage: +${(probabilityBonus * 100).toFixed(1)}%`)
  }

  return {
    reconScore,
    operativeCount,
    hiddenModifierCount,
    revealedModifierCount,
    revealedModifierLabels: revealedModifiers.map((modifier) => modifier.label),
    intelConfidence,
    uncertaintyBefore,
    uncertaintyAfter,
    unknownVariablePressure,
    unknownVariableCoverage,
    scoreAdjustment,
    probabilityBonus,
    reasons,
  }
}

// cspell:words cand diaz fieldcraft improv ishikawa okafor voss
import { clamp, createSeededRng, randInt } from '../math'
import { scoreToExactPotentialTier } from '../agentPotential'
import { getFactionRecruitQualityModifier, getFactionRecruitUnlocks } from '../factions'
import {
  type AgentData,
  type Candidate,
  type CandidateRevealLevel,
  type CandidatePotentialTier,
  type DomainStats,
  type GameState,
  type RecruitCategory,
} from '../models'
import { type StaffCandidateData, type InstructorCandidateData } from '../recruitment'
import {
  buildCandidateEvaluation,
  deriveCandidateCostEstimate,
  normalizeCandidateCategory,
  normalizeStaffCandidateSpecialty,
  revealCandidate,
  scoreToCandidatePotentialTier,
} from '../recruitment'

const WEEKLY_CANDIDATE_MIN = 3
const WEEKLY_CANDIDATE_MAX = 6
const CANDIDATE_EXPIRY_MIN_WEEKS = 2
const CANDIDATE_EXPIRY_MAX_WEEKS = 4
const INSTRUCTOR_RECRUITMENT_UNLOCK_TIER = 2

const FIRST_NAMES = [
  'Alex',
  'Jordan',
  'Riley',
  'Morgan',
  'Taylor',
  'Sam',
  'Avery',
  'Kai',
  'Milo',
  'Eden',
  'Noah',
  'Sage',
  'Jules',
  'Parker',
  'Rowan',
]

const LAST_NAMES = [
  'Voss',
  'Nguyen',
  'Morrow',
  'Ishikawa',
  'Lopez',
  'Hale',
  'Bennett',
  'Singh',
  'Ward',
  'Meyer',
  'Khan',
  'Diaz',
  'Price',
  'Okafor',
  'Mercer',
]

const RUMOR_TAGS = [
  'calm-under-fire',
  'paperwork-nightmare',
  'never-late',
  'too-curious',
  'team-anchor',
  'equipment-whisperer',
  'field-legend',
  'rookie-luck',
  'quiet-genius',
  'over-prepared',
]

const AGENT_TRAITS = [
  'steady-aim',
  'forensic-eye',
  'rapid-triage',
  'crowd-reader',
  'signal-hunter',
  'cold-blooded',
  'improv-kit',
  'deep-focus',
  'fieldcraft',
  'calculated-risk',
]

const AGENT_SKILLS_BY_ROLE: Record<AgentData['role'], string[]> = {
  field: ['breach-entry', 'pathing', 'recon-sweep', 'cover-coordination'],
  analyst: ['forensic-triage', 'signal-parsing', 'case-briefing', 'intel-prioritization'],
  containment: ['seal-discipline', 'ward-maintenance', 'stability-checks', 'containment-drills'],
  support: ['medical-stabilization', 'field-repair', 'supply-routing', 'team-support'],
  combat: ['breach-entry', 'fire-discipline', 'pursuit-control', 'escort-operations'],
  investigation: ['scene-analysis', 'evidence-mapping', 'signal-parsing', 'trail-reconstruction'],
}

const STAFF_SKILLS_BY_SPECIALTY: Record<'intel' | 'logistics' | 'fabrication' | 'analysis', string[]> = {
  intel: ['dossier-assembly', 'pattern-triage', 'signal-sorting'],
  logistics: ['asset-routing', 'schedule-control', 'resupply-handoffs'],
  fabrication: ['prototype-setup', 'tool-maintenance', 'material-planning'],
  analysis: ['trend-modeling', 'incident-review', 'risk-summarization'],
}

const CANDIDATE_LIABILITIES = [
  'deadline-pressure',
  'low-field-experience',
  'paperwork-drift',
  'equipment-dependency',
  'narrow-specialization',
  'overcommitment-risk',
  'limited-team-history',
]

const STAFF_ASSIGNMENTS: Record<'intel' | 'logistics' | 'fabrication' | 'analysis', string[]> = {
  intel: ['briefing-desk', 'signal-triage', 'threat-indexing'],
  logistics: ['asset-routing', 'supply-trains', 'deployment-windowing'],
  fabrication: ['prototype-bench', 'supply-fabrication', 'equipment-prep'],
  analysis: ['pattern-review', 'forensic-bench', 'predictive-cell'],
}

const STAFF_BONUS_KEYS = [
  'intelYield',
  'logisticsEfficiency',
  'analysisQuality',
  'casePrep',
  'responseTempo',
]

interface RecruitmentGenerationSignals {
  containmentRating: number
  clearanceLevel: number
  funding: number
  academyTier: number
  activeAgentCount: number
  weekNumber: number
  reputationScore: number
}

export interface RecruitmentGenerationState {
  week: number
  rngState: number
  containmentRating: number
  clearanceLevel: number
  funding: number
  academyTier?: number
  agents: GameState['agents']
  staff: GameState['staff']
  factions: GameState['factions']
  candidatePool: Candidate[]
}

export function buildRecruitmentGenerationState(
  state: Pick<
    GameState,
    | 'week'
    | 'rngState'
    | 'containmentRating'
    | 'clearanceLevel'
    | 'funding'
    | 'academyTier'
    | 'agency'
    | 'agents'
    | 'staff'
    | 'factions'
    | 'candidates'
  >
): RecruitmentGenerationState {
  return {
    week: state.week,
    rngState: state.rngState,
    containmentRating: state.agency?.containmentRating ?? state.containmentRating,
    clearanceLevel: state.agency?.clearanceLevel ?? state.clearanceLevel,
    funding: state.agency?.funding ?? state.funding,
    academyTier: state.academyTier,
    agents: state.agents,
    staff: state.staff,
    factions: state.factions ?? {},
    candidatePool: [...state.candidates],
  }
}

function pickWeighted<T extends string | number>(
  rng: () => number,
  options: Array<{ value: T; weight: number }>
): T {
  const totalWeight = options.reduce((sum, option) => sum + Math.max(0, option.weight), 0)

  if (totalWeight <= 0) {
    return options[0].value
  }

  let roll = rng() * totalWeight

  for (const option of options) {
    const effectiveWeight = Math.max(0, option.weight)
    if (roll < effectiveWeight) {
      return option.value
    }
    roll -= effectiveWeight
  }

  return options[options.length - 1].value
}

function pickOne<T>(rng: () => number, values: readonly T[]): T {
  return values[randInt(rng, 0, values.length - 1)]
}

function pickSomeUnique<T>(rng: () => number, values: readonly T[], count: number): T[] {
  const available = [...values]
  const result: T[] = []

  while (available.length > 0 && result.length < count) {
    const index = randInt(rng, 0, available.length - 1)
    const [value] = available.splice(index, 1)
    result.push(value)
  }

  return result
}

function createCandidateId(usedIds: Set<string>, rng: () => number) {
  let id = `cand-${randInt(rng, 10000, 999999999)}`

  while (usedIds.has(id)) {
    id = `cand-${randInt(rng, 10000, 999999999)}`
  }

  usedIds.add(id)
  return id
}

function createName(rng: () => number) {
  return `${pickOne(rng, FIRST_NAMES)} ${pickOne(rng, LAST_NAMES)}`
}

function getRecruitmentGenerationSignals(
  state: RecruitmentGenerationState
): RecruitmentGenerationSignals {
  const containmentRating = state.containmentRating
  const clearanceLevel = state.clearanceLevel
  const funding = state.funding
  const academyTier = state.academyTier ?? 0
  const activeAgentCount = Object.values(state.agents).filter(
    (agent) => agent.status !== 'dead'
  ).length
  const weekNumber = state.week

  const reputationScore = clamp(
    Math.round(
      containmentRating * 0.42 +
        clearanceLevel * 9 +
        Math.min(funding, 240) * 0.08 +
        Math.min(activeAgentCount, 16) * 1.15 +
        Math.min(weekNumber, 20) * 0.7
    ),
    0,
    100
  )

  return {
    containmentRating,
    clearanceLevel,
    funding,
    academyTier,
    activeAgentCount,
    weekNumber,
    reputationScore,
  }
}

function getWeeklyCandidateCount(signals: RecruitmentGenerationSignals, rng: () => number) {
  const base = 3
  const reputationModifier =
    signals.reputationScore >= 75 ? 2 : signals.reputationScore >= 48 ? 1 : 0
  const staffingModifier = signals.activeAgentCount < 6 ? 1 : 0
  const randomness = randInt(rng, 0, 1)

  return clamp(
    base + reputationModifier + staffingModifier + randomness,
    WEEKLY_CANDIDATE_MIN,
    WEEKLY_CANDIDATE_MAX
  )
}

function getRevealLevelWeights(signals: RecruitmentGenerationSignals) {
  let weights =
    signals.reputationScore >= 75
      ? [
          { revealLevel: 0 as const, weight: 15 },
          { revealLevel: 1 as const, weight: 45 },
          { revealLevel: 2 as const, weight: 40 },
        ]
      : signals.reputationScore >= 48
        ? [
            { revealLevel: 0 as const, weight: 30 },
            { revealLevel: 1 as const, weight: 50 },
            { revealLevel: 2 as const, weight: 20 },
          ]
        : [
            { revealLevel: 0 as const, weight: 55 },
            { revealLevel: 1 as const, weight: 35 },
            { revealLevel: 2 as const, weight: 10 },
          ]

  if (signals.clearanceLevel >= 3) {
    weights = weights.map((entry) =>
      entry.revealLevel === 2
        ? { ...entry, weight: entry.weight + 5 }
        : entry.revealLevel === 0
          ? { ...entry, weight: Math.max(5, entry.weight - 5) }
          : entry
    )
  }

  if (signals.funding < 90) {
    weights = weights.map((entry) =>
      entry.revealLevel === 0
        ? { ...entry, weight: entry.weight + 5 }
        : entry.revealLevel === 2
          ? { ...entry, weight: Math.max(5, entry.weight - 5) }
          : entry
    )
  }

  return weights
}

function getCategoryWeights(
  signals: RecruitmentGenerationSignals
): Array<{ category: RecruitCategory; weight: number }> {
  const specialistWeight = 0
  const instructorWeight = signals.academyTier >= INSTRUCTOR_RECRUITMENT_UNLOCK_TIER ? 8 : 0
  const agentWeight = signals.activeAgentCount < 8 ? 74 : signals.funding >= 180 ? 62 : 68

  return [
    { category: 'agent', weight: agentWeight },
    { category: 'staff', weight: 100 - agentWeight - specialistWeight - instructorWeight },
    { category: 'specialist', weight: specialistWeight },
    { category: 'fieldTech', weight: 0 },
    { category: 'analyst', weight: 0 },
    { category: 'instructor', weight: instructorWeight },
  ]
}

function buildEvaluation(
  rng: () => number,
  revealLevel: number,
  score: number,
  potentialTier: CandidatePotentialTier,
  traits: string[]
) {
  const impression =
    score >= 75
      ? 'Confident and mission-ready.'
      : score >= 55
        ? 'Promising with visible growth areas.'
        : 'Rough edges, but may respond to training.'

  const teamwork =
    traits.includes('team-anchor') || traits.includes('crowd-reader')
      ? 'Works well in multi-team operations.'
      : 'Unclear fit in mixed squads.'

  const outlook =
    potentialTier === 'high'
      ? 'High upside over the next 6-12 weeks.'
      : potentialTier === 'mid'
        ? 'Steady contributor trajectory.'
        : 'Needs close supervision and structure.'

  const rumorCount = randInt(rng, 1, 2)
  const rumorTags = pickSomeUnique(rng, RUMOR_TAGS, rumorCount)

  return buildCandidateEvaluation(revealLevel as 0 | 1 | 2, {
    overall: score,
    potentialTier,
    rumorTags,
    impression,
    teamwork,
    outlook,
  })
}

function generateAgentData(rng: () => number): AgentData {
  const role = pickWeighted(rng, [
    { value: 'field' as const, weight: 34 },
    { value: 'analyst' as const, weight: 28 },
    { value: 'containment' as const, weight: 20 },
    { value: 'support' as const, weight: 18 },
  ])

  const specializationByRole: Record<AgentData['role'], string[]> = {
    field: ['breach-entry', 'recon', 'pathfinder', 'spectral-survey'],
    analyst: ['forensics', 'incident-reconstruction', 'signal-analysis'],
    containment: ['warding', 'seal-operations', 'anomaly-control'],
    support: ['medical-support', 'field-engineering', 'liaison'],
    combat: ['breach-entry', 'recon', 'signal-intercept', 'close-quarters'],
    investigation: ['forensics', 'incident-reconstruction', 'signal-analysis', 'anomaly-survey'],
  }

  const stats = {
    combat: randInt(rng, 30, 85),
    investigation: randInt(rng, 30, 85),
    utility: randInt(rng, 30, 85),
    social: randInt(rng, 25, 85),
  }

  const traitCount = randInt(rng, 2, 3)
  const traits = pickSomeUnique(rng, AGENT_TRAITS, traitCount)

  const domainStats = buildAgentCandidateDomainStats(role, rng)
  const growthProfile = pickOne(rng, ['steady', 'volatile', 'specialist', 'adaptive'])

  return {
    role,
    specialization: pickOne(rng, specializationByRole[role]),
    domainStats,
    stats,
    traits,
    growthProfile,
  }
}

function generateStaffData(rng: () => number): StaffCandidateData {
  const specialty = pickWeighted(rng, [
    { value: 'intel' as const, weight: 34 },
    { value: 'logistics' as const, weight: 34 },
    { value: 'fabrication' as const, weight: 12 },
    { value: 'analysis' as const, weight: 20 },
  ])

  const bonusCount = randInt(rng, 1, 2)
  const bonusKeys = pickSomeUnique(rng, STAFF_BONUS_KEYS, bonusCount)
  const passiveBonuses = Object.fromEntries(
    bonusKeys.map((key) => [key, Number((randInt(rng, 2, 10) / 100).toFixed(2))])
  )

  return {
    specialty,
    efficiency: clamp(randInt(rng, 55, 95), 0, 100),
    assignmentType: pickOne(rng, STAFF_ASSIGNMENTS[specialty]),
    passiveBonuses,
  }
}

function generateInstructorData(rng: () => number): InstructorCandidateData {
  const specialty = pickOne(rng, ['combat', 'investigation', 'utility', 'social'] as const)

  return {
    instructorSpecialty: specialty,
    efficiency: clamp(randInt(rng, 55, 92), 0, 100),
  }
}

function buildAgentCandidateDomainStats(
  role: AgentData['role'],
  rng: () => number
): Partial<DomainStats> {
  if (role === 'field' || role === 'combat') {
    return {
      physical: {
        strength: randInt(rng, 45, 80),
        endurance: randInt(rng, 45, 80),
      },
      tactical: {
        awareness: randInt(rng, 45, 80),
        reaction: randInt(rng, 45, 80),
      },
    }
  }

  if (role === 'containment') {
    return {
      stability: {
        resistance: randInt(rng, 45, 80),
        tolerance: randInt(rng, 45, 80),
      },
      technical: {
        equipment: randInt(rng, 40, 75),
        anomaly: randInt(rng, 45, 80),
      },
    }
  }

  if (role === 'analyst' || role === 'investigation') {
    return {
      cognitive: {
        analysis: randInt(rng, 45, 80),
        investigation: randInt(rng, 45, 80),
      },
      technical: {
        equipment: randInt(rng, 35, 70),
        anomaly: randInt(rng, 35, 70),
      },
    }
  }

  return {
    social: {
      negotiation: randInt(rng, 40, 75),
      influence: randInt(rng, 40, 75),
    },
    technical: {
      equipment: randInt(rng, 35, 70),
      anomaly: randInt(rng, 35, 70),
    },
  }
}

function createFactionSponsoredAgentData(
  rewardId: string,
  rng: () => number
): { agentData: AgentData; roleSummary: string } {
  if (rewardId.includes('marshal') || rewardId.includes('waiver')) {
    return {
      agentData: {
        ...generateAgentData(rng),
        role: 'containment',
        specialization: 'warding',
        traits: ['fieldcraft', 'calculated-risk'],
      },
      roleSummary: 'oversight containment channel',
    }
  }

  if (rewardId.includes('fellowship')) {
    return {
      agentData: {
        ...generateAgentData(rng),
        role: 'analyst',
        specialization: 'forensics',
        traits: ['forensic-eye', 'deep-focus'],
      },
      roleSummary: 'institutional research channel',
    }
  }

  if (rewardId.includes('medium') || rewardId.includes('circle')) {
    return {
      agentData: {
        ...generateAgentData(rng),
        role: 'containment',
        specialization: 'ritual-channel',
        traits: ['fieldcraft', 'deep-focus'],
      },
      roleSummary: 'occult intermediary channel',
    }
  }

  if (rewardId.includes('engineer')) {
    return {
      agentData: {
        ...generateAgentData(rng),
        role: 'support',
        specialization: 'field-engineering',
        traits: ['improv-kit', 'fieldcraft'],
      },
      roleSummary: 'supply contract channel',
    }
  }

  return {
    agentData: {
      ...generateAgentData(rng),
      role: 'analyst',
      specialization: 'signal-intercept',
      traits: ['signal-hunter', 'deep-focus'],
    },
    roleSummary: 'covert intercept channel',
  }
}

function buildFactionSponsoredCandidate(
  state: Pick<RecruitmentGenerationState, 'week' | 'factions'>,
  rng: () => number,
  usedIds: Set<string>
): Candidate | null {
  const unlocks = getFactionRecruitUnlocks({ factions: state.factions })

  if (unlocks.length === 0) {
    return null
  }

  const unlock = pickOne(rng, unlocks)
  const { agentData, roleSummary } = createFactionSponsoredAgentData(unlock.rewardId, rng)
  const id = createCandidateId(usedIds, rng)
  const revealLevel = 2 as const
  const weeklyCost = randInt(rng, 26, 42)
  const expiryWeek = state.week + randInt(rng, CANDIDATE_EXPIRY_MIN_WEEKS, CANDIDATE_EXPIRY_MAX_WEEKS)
  const legacyStats = agentData.stats ?? {
    combat: randInt(rng, 45, 75),
    investigation: randInt(rng, 45, 75),
    utility: randInt(rng, 45, 75),
    social: randInt(rng, 35, 70),
  }
  const overallScore = clamp(
    Math.round(
      (legacyStats.combat + legacyStats.investigation + legacyStats.utility + legacyStats.social) / 4 +
        randInt(rng, 4, 12)
    ),
    0,
    100
  )
  const recruitQualityBonus = getFactionRecruitQualityModifier(
    { factions: state.factions },
    {
      factionId: unlock.factionId,
      contactId: unlock.contactId,
    }
  )
  const boostedOverallScore = clamp(overallScore + recruitQualityBonus, 0, 100)
  const actualPotentialScore = clamp(boostedOverallScore + randInt(rng, 2, 10), 0, 100)
  const potentialTier = scoreToCandidatePotentialTier(actualPotentialScore)

  return revealCandidate(
    {
      id,
      name: createName(rng),
      portraitId: `portrait-agent-${randInt(rng, 1, 24)}`,
      age: randInt(rng, 24, 44),
      category: 'agent',
      hireStatus: 'available',
      weeklyCost,
      weeklyWage: weeklyCost,
      costEstimate: deriveCandidateCostEstimate(weeklyCost),
      revealLevel,
      expiryWeek,
      sourceFactionId: unlock.factionId,
      sourceFactionName: unlock.factionName,
      sourceContactId: unlock.contactId,
      sourceContactName: unlock.contactName,
      origin: unlock.label,
      sourceSummary:
        unlock.disposition === 'adversarial'
          ? `${unlock.label} surfaced via ${roleSummary}. Vetting risk remains elevated.`
          : `${unlock.label} via ${roleSummary}`,
      sourceDisposition: unlock.disposition,
      sourceRequiredTier: unlock.minTier,
      sourceMaxTier: unlock.maxTier,
      roleInclination: agentData.role,
      skills: pickSomeUnique(
        rng,
        AGENT_SKILLS_BY_ROLE[agentData.role] ?? AGENT_SKILLS_BY_ROLE.field,
        3
      ),
      liabilities: pickSomeUnique(rng, CANDIDATE_LIABILITIES, 1),
      availabilityWindow: {
        opensWeek: state.week,
        closesWeek: expiryWeek,
      },
      funnelStage: 'prospect',
      createdWeek: state.week,
      lastUpdatedWeek: state.week,
      actualPotentialTier: scoreToExactPotentialTier(actualPotentialScore),
      evaluation: buildEvaluation(
        rng,
        revealLevel,
        boostedOverallScore,
        potentialTier,
        agentData.traits
      ),
      agentData: {
        ...agentData,
        stats: legacyStats,
      },
    },
    0
  )
}

function buildCandidate(
  state: Pick<RecruitmentGenerationState, 'week'>,
  rng: () => number,
  usedIds: Set<string>,
  category: RecruitCategory,
  signals: RecruitmentGenerationSignals
): Candidate {
  const id = createCandidateId(usedIds, rng)
  const revealLevel = pickWeighted(
    rng,
    getRevealLevelWeights(signals).map((entry) => ({
      value: entry.revealLevel,
      weight: entry.weight,
    }))
  ) as CandidateRevealLevel

  const age = randInt(rng, 21, 53)
  const costFloor = clamp(
    12 + signals.clearanceLevel * 2 + Math.floor(signals.reputationScore / 25),
    12,
    32
  )
  const costCeiling = clamp(
    costFloor + 14 + Math.floor(Math.min(signals.funding, 240) / 80),
    costFloor + 4,
    48
  )
  const weeklyCost = randInt(rng, costFloor, costCeiling)
  const expiryWeek =
    state.week + randInt(rng, CANDIDATE_EXPIRY_MIN_WEEKS, CANDIDATE_EXPIRY_MAX_WEEKS)
  const normalizedCategory = normalizeCandidateCategory(category)
  const qualityBias =
    Math.round((signals.reputationScore - 50) / 10) + Math.min(signals.weekNumber, 12) / 6

  if (normalizedCategory === 'agent') {
    const agentData = generateAgentData(rng)
    const legacyStats = agentData.stats ?? {
      combat: Math.round(
        ((agentData.domainStats?.physical?.strength ?? 35) +
          (agentData.domainStats?.physical?.endurance ?? 35) +
          (agentData.domainStats?.tactical?.awareness ?? 35) +
          (agentData.domainStats?.tactical?.reaction ?? 35)) /
          4
      ),
      investigation: Math.round(
        ((agentData.domainStats?.cognitive?.analysis ?? 35) +
          (agentData.domainStats?.cognitive?.investigation ?? 35) +
          (agentData.domainStats?.technical?.anomaly ?? 35)) /
          3
      ),
      utility: Math.round(
        ((agentData.domainStats?.technical?.equipment ?? 35) +
          (agentData.domainStats?.stability?.resistance ?? 35) +
          (agentData.domainStats?.stability?.tolerance ?? 35)) /
          3
      ),
      social: Math.round(
        ((agentData.domainStats?.social?.negotiation ?? 35) +
          (agentData.domainStats?.social?.influence ?? 35)) /
          2
      ),
    }
    const statAverage =
      (legacyStats.combat + legacyStats.investigation + legacyStats.utility + legacyStats.social) /
      4
    const overallScore = clamp(Math.round(statAverage + qualityBias + randInt(rng, -6, 8)), 0, 100)
    const actualPotentialScore = clamp(overallScore + randInt(rng, -10, 12), 0, 100)
    const potentialTier = scoreToCandidatePotentialTier(
      clamp(actualPotentialScore + randInt(rng, -6, 6), 0, 100)
    )

    return revealCandidate(
      {
        id,
        name: createName(rng),
        portraitId: `portrait-agent-${randInt(rng, 1, 24)}`,
        age,
        category: 'agent',
        hireStatus: 'available',
        origin: 'open-call',
        weeklyCost,
        weeklyWage: weeklyCost,
        costEstimate: deriveCandidateCostEstimate(weeklyCost),
        revealLevel,
        expiryWeek,
        roleInclination: agentData.role,
        skills: pickSomeUnique(
          rng,
          AGENT_SKILLS_BY_ROLE[agentData.role] ?? AGENT_SKILLS_BY_ROLE.field,
          3
        ),
        liabilities: pickSomeUnique(rng, CANDIDATE_LIABILITIES, randInt(rng, 1, 2)),
        availabilityWindow: {
          opensWeek: state.week,
          closesWeek: expiryWeek,
        },
        funnelStage: 'prospect',
        createdWeek: state.week,
        lastUpdatedWeek: state.week,
        actualPotentialTier: scoreToExactPotentialTier(actualPotentialScore),
        evaluation: buildEvaluation(
          rng,
          revealLevel,
          overallScore,
          potentialTier,
          agentData.traits
        ),
        agentData,
      },
      0
    )
  }

  const staffData = generateStaffData(rng)
  const scoreBase =
    48 + Object.values(staffData.passiveBonuses ?? {}).reduce((sum, value) => sum + value * 100, 0)
  const overallScore = clamp(Math.round(scoreBase + qualityBias + randInt(rng, -8, 10)), 0, 100)
  const potentialTier = scoreToCandidatePotentialTier(
    clamp(overallScore + randInt(rng, -10, 10), 0, 100)
  )

  if (normalizedCategory === 'instructor') {
    const instructorData = generateInstructorData(rng)
    const instructorScore = clamp(
      Math.round(instructorData.efficiency + qualityBias + randInt(rng, -6, 6)),
      0,
      100
    )
    const instructorPotentialTier = scoreToCandidatePotentialTier(
      clamp(instructorScore + randInt(rng, -10, 10), 0, 100)
    )

    return revealCandidate(
      {
        id,
        name: createName(rng),
        portraitId: `portrait-staff-${randInt(rng, 1, 24)}`,
        age,
        category: 'instructor',
        hireStatus: 'available',
        origin: 'academy-referral',
        weeklyCost,
        weeklyWage: weeklyCost,
        costEstimate: deriveCandidateCostEstimate(weeklyCost),
        revealLevel,
        expiryWeek,
        roleInclination: instructorData.instructorSpecialty,
        skills: [
          `instructor-${instructorData.instructorSpecialty}`,
          'curriculum-structure',
          'performance-review',
        ],
        liabilities: pickSomeUnique(rng, CANDIDATE_LIABILITIES, 1),
        availabilityWindow: {
          opensWeek: state.week,
          closesWeek: expiryWeek,
        },
        funnelStage: 'prospect',
        createdWeek: state.week,
        lastUpdatedWeek: state.week,
        evaluation: buildEvaluation(rng, revealLevel, instructorScore, instructorPotentialTier, [
          instructorData.instructorSpecialty,
        ]),
        instructorData,
      },
      0
    )
  }

  return revealCandidate(
    {
      id,
      name: createName(rng),
      portraitId: `portrait-staff-${randInt(rng, 1, 24)}`,
      age,
      category: 'staff',
      hireStatus: 'available',
      origin: 'operations-network',
      weeklyCost,
      weeklyWage: weeklyCost,
      costEstimate: deriveCandidateCostEstimate(weeklyCost),
      revealLevel,
      expiryWeek,
      roleInclination: normalizeStaffCandidateSpecialty(staffData.specialty),
      skills: pickSomeUnique(
        rng,
        STAFF_SKILLS_BY_SPECIALTY[normalizeStaffCandidateSpecialty(staffData.specialty)] ??
          STAFF_SKILLS_BY_SPECIALTY.analysis,
        2
      ),
      liabilities: pickSomeUnique(rng, CANDIDATE_LIABILITIES, 1),
      availabilityWindow: {
        opensWeek: state.week,
        closesWeek: expiryWeek,
      },
      funnelStage: 'prospect',
      createdWeek: state.week,
      lastUpdatedWeek: state.week,
      evaluation: buildEvaluation(rng, revealLevel, overallScore, potentialTier, [
        normalizeStaffCandidateSpecialty(staffData.specialty),
      ]),
      staffData,
    },
    0
  )
}

export function generateCandidates(
  state: RecruitmentGenerationState,
  rng: () => number
): Candidate[]
export function generateCandidates(state: RecruitmentGenerationState): Candidate[]
export function generateCandidates(
  state: RecruitmentGenerationState,
  rng?: () => number
): Candidate[] {
  const effectiveRng = rng ?? createSeededRng(state.rngState).next
  const signals = getRecruitmentGenerationSignals(state)
  const existingPool = state.candidatePool
  const usedIds = new Set([
    ...Object.keys(state.agents),
    ...Object.keys(state.staff),
    ...existingPool.map((candidate) => candidate.id),
  ])

  const categories = getCategoryWeights(signals).filter((entry) => entry.weight > 0)
  const candidateCount = getWeeklyCandidateCount(signals, effectiveRng)
  const sponsoredCandidate = buildFactionSponsoredCandidate(state, effectiveRng, usedIds)
  const generatedCandidates = Array.from({ length: candidateCount }, () => {
    const category = pickWeighted(
      effectiveRng,
      categories.map((entry) => ({ value: entry.category, weight: entry.weight }))
    )

    return buildCandidate(state, effectiveRng, usedIds, category, signals)
  })

  if (!sponsoredCandidate) {
    return generatedCandidates
  }

  return [sponsoredCandidate, ...generatedCandidates.slice(0, Math.max(0, candidateCount - 1))]
}

export const generateCandidatesWithRng = generateCandidates

export function removeExpiredCandidates(candidates: Candidate[], currentWeek: number): Candidate[] {
  return candidates.filter((candidate) => currentWeek <= candidate.expiryWeek)
}

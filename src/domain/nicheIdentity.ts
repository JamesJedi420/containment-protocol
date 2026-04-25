import type { Agent, OperativeNicheKey, StatKey, TeamCoverageRole, TeamNicheSummary } from './models'
import { appendUniqueTags, hasTag } from './shared/tags'

export interface AgentNicheIdentity {
  primaryNiche?: OperativeNicheKey
  secondaryNiches: OperativeNicheKey[]
  qualifiedNiches: OperativeNicheKey[]
  profile: 'specialist' | 'hybrid' | 'generalist'
  nicheTags: OperativeNicheKey[]
  certifiedNiches: OperativeNicheKey[]
  scoreByNiche: Record<OperativeNicheKey, number>
  summary: string
}

export interface TeamNicheFit {
  niche: OperativeNicheKey
  status: 'specialist' | 'hybrid' | 'substitute' | 'missing'
  dominantSourceNiche?: OperativeNicheKey
  specialistIds: string[]
  hybridIds: string[]
  substituteIds: string[]
  explanation: string
}

export interface TrainingNicheAptitude {
  bonus: number
  reason?: string
}

const CONTAINMENT_SPECIALIST_UNLOCK_THRESHOLD = 8

export const OPERATIVE_NICHES = [
  'recon',
  'containment',
  'support',
] as const satisfies readonly OperativeNicheKey[]

const NICHE_LABELS: Record<OperativeNicheKey, string> = {
  recon: 'Recon',
  containment: 'Containment',
  support: 'Support',
}

const ROLE_NICHE_SCORES: Record<Agent['role'], Partial<Record<OperativeNicheKey, number>>> = {
  hunter: {},
  occultist: { containment: 4 },
  investigator: { recon: 2, containment: 1 },
  field_recon: { recon: 4 },
  medium: { containment: 4, support: 1 },
  tech: { recon: 2, support: 1 },
  medic: { support: 4 },
  negotiator: { support: 4 },
}

const TAG_NICHE_SCORES: Record<string, Partial<Record<OperativeNicheKey, number>>> = {
  'recon-specialist': { recon: 4 },
  'containment-specialist': { containment: 4 },
  'recovery-support': { support: 4 },
}

const CERTIFICATION_NICHE_SCORES: Record<string, Partial<Record<OperativeNicheKey, number>>> = {
  'field-systems-cert': { recon: 2 },
  'investigation-analyst-cert': { recon: 1, containment: 1 },
  'containment-specialist-cert': { containment: 3 },
  'readiness-compliance-cert': { containment: 1, support: 2 },
  'field-liaison-cert': { support: 2 },
}

const NICHE_AFFINITIES: Record<
  OperativeNicheKey,
  { preferred: StatKey[]; weak: StatKey[] }
> = {
  recon: {
    preferred: ['investigation', 'utility'],
    weak: ['social'],
  },
  containment: {
    preferred: ['investigation', 'social'],
    weak: ['combat'],
  },
  support: {
    preferred: ['utility', 'social'],
    weak: ['combat'],
  },
}

function createEmptyNicheScores() {
  return {
    recon: 0,
    containment: 0,
    support: 0,
  } satisfies Record<OperativeNicheKey, number>
}

function getCertifiedNicheScores(agent: Pick<Agent, 'progression'>) {
  const scores = createEmptyNicheScores()
  const certifications = agent.progression?.certifications ?? {}

  for (const [certificationId, record] of Object.entries(certifications)) {
    if (record?.state !== 'certified') {
      continue
    }

    const mappedScores = CERTIFICATION_NICHE_SCORES[certificationId]
    if (!mappedScores) {
      continue
    }

    for (const niche of OPERATIVE_NICHES) {
      scores[niche] += mappedScores[niche] ?? 0
    }
  }

  return scores
}

function getTagNicheScores(tags: readonly string[]) {
  const scores = createEmptyNicheScores()

  for (const tag of tags) {
    const mappedScores = TAG_NICHE_SCORES[tag]
    if (!mappedScores) {
      continue
    }

    for (const niche of OPERATIVE_NICHES) {
      scores[niche] += mappedScores[niche] ?? 0
    }
  }

  return scores
}

function getNicheTags(tags: readonly string[]) {
  return OPERATIVE_NICHES.filter((niche) => hasTag(tags, getCanonicalNicheTag(niche)))
}

function getCertifiedNiches(agent: Pick<Agent, 'progression'>) {
  const scores = getCertifiedNicheScores(agent)
  return OPERATIVE_NICHES.filter((niche) => scores[niche] > 0)
}

function compareNicheScores(
  left: OperativeNicheKey,
  right: OperativeNicheKey,
  totalScores: Record<OperativeNicheKey, number>,
  tagScores: Record<OperativeNicheKey, number>,
  roleScores: Record<OperativeNicheKey, number>,
  certifiedScores: Record<OperativeNicheKey, number>
) {
  if (totalScores[right] !== totalScores[left]) {
    return totalScores[right] - totalScores[left]
  }

  if (tagScores[right] !== tagScores[left]) {
    return tagScores[right] - tagScores[left]
  }

  if (roleScores[right] !== roleScores[left]) {
    return roleScores[right] - roleScores[left]
  }

  if (certifiedScores[right] !== certifiedScores[left]) {
    return certifiedScores[right] - certifiedScores[left]
  }

  return left.localeCompare(right)
}

export function getCanonicalNicheTag(niche: OperativeNicheKey) {
  if (niche === 'recon') {
    return 'recon-specialist'
  }

  if (niche === 'containment') {
    return 'containment-specialist'
  }

  return 'recovery-support'
}

export function getNicheLabel(niche: OperativeNicheKey) {
  return NICHE_LABELS[niche]
}

export function deriveAgentNicheIdentity(
  agent: Pick<Agent, 'role' | 'tags' | 'progression'>
): AgentNicheIdentity {
  const roleScores = {
    ...createEmptyNicheScores(),
    ...(ROLE_NICHE_SCORES[agent.role] ?? {}),
  }
  const tagScores = getTagNicheScores(agent.tags)
  const certifiedScores = getCertifiedNicheScores(agent)
  const totalScores = createEmptyNicheScores()

  for (const niche of OPERATIVE_NICHES) {
    totalScores[niche] = roleScores[niche] + tagScores[niche] + certifiedScores[niche]
  }

  const rankedNiches = [...OPERATIVE_NICHES].sort((left, right) =>
    compareNicheScores(left, right, totalScores, tagScores, roleScores, certifiedScores)
  )
  const primaryNiche = totalScores[rankedNiches[0]!] >= 3 ? rankedNiches[0] : undefined
  const secondaryNiches =
    primaryNiche === undefined
      ? []
      : rankedNiches.filter(
          (niche) => niche !== primaryNiche && totalScores[niche] >= 3
        )
  const qualifiedNiches = rankedNiches.filter((niche) => totalScores[niche] >= 2)
  const profile =
    primaryNiche === undefined
      ? 'generalist'
      : secondaryNiches.length > 0
        ? 'hybrid'
        : totalScores[primaryNiche] >= 4
          ? 'specialist'
          : 'generalist'

  const summary =
    primaryNiche === undefined
      ? 'Generalist coverage'
      : profile === 'hybrid'
        ? `${getNicheLabel(primaryNiche)} hybrid (${secondaryNiches
            .map((niche) => getNicheLabel(niche))
            .join(', ')})`
        : `${getNicheLabel(primaryNiche)} specialist`

  return {
    primaryNiche,
    secondaryNiches,
    qualifiedNiches,
    profile,
    nicheTags: getNicheTags(agent.tags),
    certifiedNiches: getCertifiedNiches(agent),
    scoreByNiche: totalScores,
    summary,
  }
}

function createSignalCarrier(tags: readonly string[]): AgentNicheIdentity {
  return deriveAgentNicheIdentity({
    role: 'hunter',
    tags: [...tags],
    progression: undefined,
  })
}

function getPrimarySpecialistIds(
  identities: Array<{ agentId: string; identity: AgentNicheIdentity }>,
  niche: OperativeNicheKey
) {
  return identities
    .filter(
      (entry) =>
        entry.identity.primaryNiche === niche &&
        entry.identity.profile === 'specialist'
    )
    .map((entry) => entry.agentId)
}

function getHybridIds(
  identities: Array<{ agentId: string; identity: AgentNicheIdentity }>,
  niche: OperativeNicheKey
) {
  return identities
    .filter(
      (entry) =>
        (entry.identity.primaryNiche === niche && entry.identity.profile === 'hybrid') ||
        entry.identity.secondaryNiches.includes(niche)
    )
    .map((entry) => entry.agentId)
}

function getSubstituteIds(
  identities: Array<{ agentId: string; identity: AgentNicheIdentity }>,
  niche: OperativeNicheKey,
  excludedIds: Set<string>
) {
  return identities
    .filter((entry) => !excludedIds.has(entry.agentId))
    .filter(
      (entry) =>
        entry.identity.qualifiedNiches.includes(niche) || entry.identity.primaryNiche !== undefined
    )
    .map((entry) => entry.agentId)
}

function getDominantSourceNiche(
  identities: Array<{ agentId: string; identity: AgentNicheIdentity }>,
  niche: OperativeNicheKey,
  candidateIds: string[]
) {
  return identities
    .filter((entry) => candidateIds.includes(entry.agentId))
    .sort((left, right) => {
      const leftPrimaryScore = left.identity.primaryNiche
        ? left.identity.scoreByNiche[left.identity.primaryNiche]
        : 0
      const rightPrimaryScore = right.identity.primaryNiche
        ? right.identity.scoreByNiche[right.identity.primaryNiche]
        : 0

      if (right.identity.scoreByNiche[niche] !== left.identity.scoreByNiche[niche]) {
        return right.identity.scoreByNiche[niche] - left.identity.scoreByNiche[niche]
      }

      if (rightPrimaryScore !== leftPrimaryScore) {
        return rightPrimaryScore - leftPrimaryScore
      }

      return left.agentId.localeCompare(right.agentId)
    })[0]?.identity.primaryNiche
}

function buildFitExplanation(fit: TeamNicheFit) {
  if (fit.status === 'specialist') {
    return `${getNicheLabel(fit.niche)} protected by specialist coverage.`
  }

  if (fit.status === 'hybrid') {
    return `${getNicheLabel(fit.niche)} carried by hybrid coverage.`
  }

  if (fit.status === 'substitute') {
    return `${getNicheLabel(fit.niche)} covered only by substitutes.`
  }

  return `${getNicheLabel(fit.niche)} niche is uncovered.`
}

export function evaluateTeamNicheFit(
  agents: Array<Pick<Agent, 'id' | 'role' | 'tags' | 'progression'>>,
  niche: OperativeNicheKey
): TeamNicheFit {
  const identities = agents.map((agent) => ({
    agentId: agent.id,
    identity: deriveAgentNicheIdentity(agent),
  }))
  const specialistIds = getPrimarySpecialistIds(identities, niche)
  const hybridIds = getHybridIds(identities, niche).filter(
    (agentId) => !specialistIds.includes(agentId)
  )
  const substituteIds = getSubstituteIds(
    identities,
    niche,
    new Set([...specialistIds, ...hybridIds])
  )

  const status =
    specialistIds.length > 0
      ? 'specialist'
      : hybridIds.length > 0
        ? 'hybrid'
        : substituteIds.length > 0
          ? 'substitute'
          : 'missing'
  const dominantSourceNiche =
    status === 'missing'
      ? undefined
      : getDominantSourceNiche(
          identities,
          niche,
          status === 'specialist'
            ? specialistIds
            : status === 'hybrid'
              ? hybridIds
              : substituteIds
        )

  const fit: TeamNicheFit = {
    niche,
    status,
    dominantSourceNiche,
    specialistIds,
    hybridIds,
    substituteIds,
    explanation: '',
  }

  return {
    ...fit,
    explanation: buildFitExplanation(fit),
  }
}

export function evaluateTagNicheFit(tags: readonly string[], niche: OperativeNicheKey): TeamNicheFit {
  const identity = createSignalCarrier(tags)
  const specialistIds =
    identity.primaryNiche === niche && identity.profile === 'specialist' ? ['tag-carrier'] : []
  const hybridIds =
    (identity.primaryNiche === niche && identity.profile === 'hybrid') ||
    identity.secondaryNiches.includes(niche)
      ? ['tag-carrier']
      : []
  const substituteIds =
    specialistIds.length === 0 &&
    hybridIds.length === 0 &&
    (identity.qualifiedNiches.includes(niche) || identity.primaryNiche !== undefined)
      ? ['tag-carrier']
      : []
  const status =
    specialistIds.length > 0
      ? 'specialist'
      : hybridIds.length > 0
        ? 'hybrid'
        : substituteIds.length > 0
          ? 'substitute'
          : 'missing'
  const fit: TeamNicheFit = {
    niche,
    status,
    dominantSourceNiche: identity.primaryNiche,
    specialistIds,
    hybridIds,
    substituteIds,
    explanation: '',
  }

  return {
    ...fit,
    explanation: buildFitExplanation(fit),
  }
}

export function getTeamNicheModifier(
  fit: TeamNicheFit,
  options?: {
    contextLabel?: string
  }
) {
  const contextLabel = options?.contextLabel ?? getNicheLabel(fit.niche).toLowerCase()

  if (fit.status === 'specialist') {
    return {
      delta: 2,
      reason: `${getNicheLabel(fit.niche)} specialist present: +2 ${contextLabel} bonus.`,
    }
  }

  if (fit.status === 'hybrid') {
    return {
      delta: 1,
      reason: `${getNicheLabel(fit.niche)} hybrid covering ${contextLabel}: +1 ${contextLabel} bonus.`,
    }
  }

  if (fit.status === 'substitute') {
    if (fit.dominantSourceNiche === 'support') {
      return {
        delta: -2,
        reason: `Support specialist substituted into ${contextLabel}: -2 ${contextLabel} penalty.`,
      }
    }

    if (fit.dominantSourceNiche === 'recon') {
      return {
        delta: -1,
        reason: `Recon specialist substituted into ${contextLabel}: -1 ${contextLabel} penalty.`,
      }
    }

    if (fit.dominantSourceNiche === 'containment') {
      return {
        delta: -1,
        reason: `Containment specialist substituted into ${contextLabel}: -1 ${contextLabel} penalty.`,
      }
    }

    return {
      delta: -1,
      reason: `Generalist substitute covering ${contextLabel}: -1 ${contextLabel} penalty.`,
    }
  }

  return {
    delta: 0,
    reason: `No ${contextLabel} specialist anchored the team.`,
  }
}

export function mapCoverageRolesToNiches(requiredRoles: readonly TeamCoverageRole[] | undefined) {
  const mapped = new Set<OperativeNicheKey>()

  for (const role of requiredRoles ?? []) {
    if (role === 'containment') {
      mapped.add('containment')
    } else if (role === 'investigator' || role === 'technical') {
      mapped.add('recon')
    } else if (role === 'support') {
      mapped.add('support')
    }
  }

  return [...mapped].sort((left, right) => left.localeCompare(right))
}

export function buildTeamNicheSummary(
  agents: Array<Pick<Agent, 'id' | 'role' | 'tags' | 'progression'>>,
  requiredNiches: readonly OperativeNicheKey[] = OPERATIVE_NICHES
): TeamNicheSummary {
  const nicheList = [...new Set(requiredNiches.filter((niche) => OPERATIVE_NICHES.includes(niche)))]
  const fits = nicheList.map((niche) => evaluateTeamNicheFit(agents, niche))
  const identities = agents.map((agent) => deriveAgentNicheIdentity(agent))
  const primaryCounts = nicheList.reduce<Record<OperativeNicheKey, number>>(
    (counts, niche) => ({
      ...counts,
      [niche]: identities.filter((identity) => identity.primaryNiche === niche).length,
    }),
    createEmptyNicheScores()
  )
  const protectedNiches = fits
    .filter((fit) => fit.status === 'specialist')
    .map((fit) => fit.niche)
  const hybridNiches = fits.filter((fit) => fit.status === 'hybrid').map((fit) => fit.niche)
  const substituteNiches = fits
    .filter((fit) => fit.status === 'substitute')
    .map((fit) => fit.niche)
  const missingNiches = fits.filter((fit) => fit.status === 'missing').map((fit) => fit.niche)
  const overlappingNiches = nicheList.filter(
    (niche) => primaryCounts[niche] > 1 && (missingNiches.length > 0 || substituteNiches.length > 0)
  )
  const summaryLines = [
    ...fits.map((fit) => fit.explanation),
    ...overlappingNiches.map(
      (niche) =>
        `${getNicheLabel(niche)} overlap is crowding the roster while other niches are thin.`
    ),
  ]

  return {
    protectedNiches,
    hybridNiches,
    substituteNiches,
    missingNiches,
    overlappingNiches,
    summaryLines,
  }
}

export function getAgentTrainingNicheAptitude(
  agent: Pick<Agent, 'role' | 'tags' | 'progression'>,
  targetStat: StatKey
): TrainingNicheAptitude {
  const identity = deriveAgentNicheIdentity(agent)

  if (!identity.primaryNiche) {
    return { bonus: 0 }
  }

  const primaryAffinity = NICHE_AFFINITIES[identity.primaryNiche]
  if (primaryAffinity.preferred.includes(targetStat)) {
    return {
      bonus: 1,
      reason: `${getNicheLabel(identity.primaryNiche)} identity aligns with ${targetStat}.`,
    }
  }

  if (
    primaryAffinity.weak.includes(targetStat) &&
    !identity.secondaryNiches.some((niche) => NICHE_AFFINITIES[niche].preferred.includes(targetStat))
  ) {
    return {
      bonus: -1,
      reason: `${getNicheLabel(identity.primaryNiche)} identity is inefficient at ${targetStat}.`,
    }
  }

  return { bonus: 0 }
}

export function applyAgentNicheUnlocks(agent: Agent) {
  let nextAgent = agent
  const notes: string[] = []

  if (
    !hasTag(nextAgent.tags, 'containment-specialist') &&
    (nextAgent.stats?.stability.resistance ?? 0) >= CONTAINMENT_SPECIALIST_UNLOCK_THRESHOLD
  ) {
    nextAgent = {
      ...nextAgent,
      tags: appendUniqueTags(nextAgent.tags, ['containment-specialist']),
    }
    notes.push('Containment specialist unlocked: resistance threshold met.')
  }

  return {
    agent: nextAgent,
    notes,
  }
}

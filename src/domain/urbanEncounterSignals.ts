export type UrbanAuthorityHint =
  | 'rapid_lockdown'
  | 'coordinated_presence'
  | 'contested_authority'
  | 'thin_coverage'

export type UrbanHostileHint =
  | 'suppressed_activity'
  | 'probing_activity'
  | 'escalating_activity'
  | 'active_hunt'

export interface UrbanRoleWeights {
  authority: number
  criminal: number
  occult: number
  civilian: number
  specialist: number
}

export interface UrbanSocialTierWeights {
  elite: number
  middle: number
  street: number
}

export interface UrbanEncounterSignal {
  tags: string[]
  roleWeights: UrbanRoleWeights
  socialTierWeights: UrbanSocialTierWeights
  weightModifiers: {
    districtIdentity: number
    roleAxis: number
    socialTierAxis: number
    authorityResponse: number
    hostileResponse: number
    noncombatBias: number
  }
  escalationHints: {
    authorityResponseHint: UrbanAuthorityHint
    hostileResponseHint: UrbanHostileHint
    socialEscalationRisk: 'low' | 'medium' | 'high'
    likelyBranches: string[]
  }
}

export interface UrbanScheduleSurfaceInput {
  districtId: string
  timeBandId: string
  encounterFamilyTags: readonly string[]
  authorityResponseProfile: string
  witnessModifier: number
  covertAdvantage: boolean
  appliedEvents?: readonly string[]
}

export interface UrbanEcologySurfaceInput {
  districtEcologyTokens?: readonly string[]
  operationalModifierHints?: readonly string[]
  threatHabitatHints?: readonly string[]
}

export interface UrbanMapSurfaceInput {
  dominantWorldState?:
    | 'safe_hub'
    | 'curfew_zone'
    | 'hostile_territory'
    | 'resistance_pocket'
    | 'industrial_kill_site'
    | 'abandoned_hub'
  safeHubContinuity?: 'stable' | 'fragile' | 'broken'
  actionableSignals?: readonly string[]
}

export interface UrbanTruthSurfaceInput {
  anomalyEncounterPressure?: number
  witnessReliability?: number
  institutionalResponsePosture?: 'dismissive' | 'guarded' | 'mobilized'
  publicLegibility?: 'denied' | 'contested' | 'accepted'
}

export interface UrbanEraSurfaceInput {
  mixedEra?: boolean
  suppressedInteractionSurfaces?: readonly string[]
  powerAvailability?: {
    enabled?: readonly string[]
    suppressed?: readonly string[]
  }
}

export interface UrbanEncounterSignalInput {
  schedule: UrbanScheduleSurfaceInput
  ecology?: UrbanEcologySurfaceInput
  map?: UrbanMapSurfaceInput
  truth?: UrbanTruthSurfaceInput
  era?: UrbanEraSurfaceInput
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number(value.toFixed(3))))
}

function uniqueSorted(values: readonly string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right))
}

function normalizeRoleWeights(weights: UrbanRoleWeights): UrbanRoleWeights {
  return {
    authority: clamp(weights.authority, 0.5, 1.8),
    criminal: clamp(weights.criminal, 0.5, 1.8),
    occult: clamp(weights.occult, 0.5, 1.8),
    civilian: clamp(weights.civilian, 0.5, 1.8),
    specialist: clamp(weights.specialist, 0.5, 1.8),
  }
}

function normalizeSocialWeights(weights: UrbanSocialTierWeights): UrbanSocialTierWeights {
  return {
    elite: clamp(weights.elite, 0.5, 1.8),
    middle: clamp(weights.middle, 0.5, 1.8),
    street: clamp(weights.street, 0.5, 1.8),
  }
}

function getAxisModifier(values: readonly number[]) {
  return clamp(1 + (Math.max(...values) - Math.min(...values)) * 0.5, 0.8, 1.5)
}

function getAuthorityHint(value: number, profile: string): UrbanAuthorityHint {
  if (profile === 'rapid_response' || value >= 1.26) {
    return 'rapid_lockdown'
  }

  if (profile === 'corruption') {
    return value >= 1 ? 'contested_authority' : 'thin_coverage'
  }

  if (value >= 1.08) {
    return 'coordinated_presence'
  }

  if (value <= 0.92) {
    return 'thin_coverage'
  }

  return 'contested_authority'
}

function getHostileHint(value: number): UrbanHostileHint {
  if (value >= 1.28) {
    return 'active_hunt'
  }

  if (value >= 1.1) {
    return 'escalating_activity'
  }

  if (value <= 0.9) {
    return 'suppressed_activity'
  }

  return 'probing_activity'
}

export function buildUrbanEncounterSignal(input: UrbanEncounterSignalInput): UrbanEncounterSignal {
  const familyTags = uniqueSorted(input.schedule.encounterFamilyTags)
  const appliedEvents = uniqueSorted(input.schedule.appliedEvents ?? [])
  const ecologyTokens = uniqueSorted(input.ecology?.districtEcologyTokens ?? [])
  const ecologyOperationalHints = uniqueSorted(input.ecology?.operationalModifierHints ?? [])
  const ecologyThreatHints = uniqueSorted(input.ecology?.threatHabitatHints ?? [])
  const mapSignals = uniqueSorted(input.map?.actionableSignals ?? [])
  const suppressedSurfaces = uniqueSorted(input.era?.suppressedInteractionSurfaces ?? [])
  const suppressedPower = uniqueSorted(input.era?.powerAvailability?.suppressed ?? [])

  const roleWeights: UrbanRoleWeights = {
    authority: 1,
    criminal: 1,
    occult: 1,
    civilian: 1,
    specialist: 1,
  }
  const socialTierWeights: UrbanSocialTierWeights = {
    elite: 1,
    middle: 1,
    street: 1,
  }

  let authorityResponseModifier = 0
  let hostileResponseModifier = 0
  let noncombatBiasModifier = 0

  if (input.schedule.authorityResponseProfile === 'rapid_response') {
    roleWeights.authority += 0.35
    socialTierWeights.street -= 0.08
    authorityResponseModifier += 0.32
  } else if (input.schedule.authorityResponseProfile === 'slow_reaction') {
    roleWeights.authority -= 0.14
    roleWeights.criminal += 0.24
    socialTierWeights.street += 0.18
    hostileResponseModifier += 0.14
  } else if (input.schedule.authorityResponseProfile === 'corruption') {
    roleWeights.authority -= 0.2
    roleWeights.criminal += 0.24
    socialTierWeights.elite += 0.12
    authorityResponseModifier -= 0.2
    hostileResponseModifier += 0.18
  }

  for (const tag of familyTags) {
    if (tag.includes('cult') || tag.includes('occult') || tag.includes('ritual')) {
      roleWeights.occult += 0.28
      roleWeights.specialist += 0.14
      socialTierWeights.street += 0.08
      hostileResponseModifier += 0.08
    }

    if (tag.includes('criminal') || tag.includes('smuggling')) {
      roleWeights.criminal += 0.3
      socialTierWeights.street += 0.14
      hostileResponseModifier += 0.12
    }

    if (tag.includes('public') || tag.includes('signal') || tag.includes('infrastructure')) {
      roleWeights.civilian += 0.12
      roleWeights.specialist += 0.18
      socialTierWeights.middle += 0.1
      noncombatBiasModifier += 0.08
    }

    if (tag.includes('noble') || tag.includes('court') || tag.includes('scholar')) {
      socialTierWeights.elite += 0.2
      roleWeights.specialist += 0.12
    }
  }

  if (input.schedule.witnessModifier >= 0.7) {
    roleWeights.civilian += 0.22
    socialTierWeights.middle += 0.12
    socialTierWeights.street -= 0.08
    noncombatBiasModifier += 0.16
  } else if (input.schedule.witnessModifier <= 0.35) {
    roleWeights.criminal += 0.1
    socialTierWeights.street += 0.08
    hostileResponseModifier += 0.08
  }

  if (input.schedule.covertAdvantage) {
    roleWeights.criminal += 0.2
    roleWeights.occult += 0.14
    roleWeights.authority -= 0.14
    socialTierWeights.street += 0.12
    socialTierWeights.elite -= 0.08
    hostileResponseModifier += 0.08
  }

  if (appliedEvents.length > 0) {
    noncombatBiasModifier += Math.min(0.18, appliedEvents.length * 0.05)
  }

  if (ecologyTokens.length > 0) {
    const ecologyBoost = Math.min(0.18, ecologyTokens.length * 0.04)
    roleWeights.specialist += ecologyBoost
    socialTierWeights.street += ecologyBoost * 0.6
  }

  if (ecologyOperationalHints.some((hint) => hint.includes('poor-visibility') || hint.includes('blind'))) {
    roleWeights.authority -= 0.08
    roleWeights.criminal += 0.1
    hostileResponseModifier += 0.08
  }

  if (ecologyOperationalHints.some((hint) => hint.includes('unstable') || hint.includes('waterlogged'))) {
    noncombatBiasModifier += 0.08
  }

  if (ecologyThreatHints.some((hint) => hint.includes('smuggling') || hint.includes('concealed'))) {
    roleWeights.criminal += 0.12
    hostileResponseModifier += 0.1
  }

  if (ecologyThreatHints.some((hint) => hint.includes('cult') || hint.includes('anomaly') || hint.includes('echo'))) {
    roleWeights.occult += 0.14
    hostileResponseModifier += 0.08
  }

  switch (input.map?.dominantWorldState) {
    case 'curfew_zone':
      roleWeights.authority += 0.3
      roleWeights.civilian += 0.08
      socialTierWeights.street -= 0.1
      authorityResponseModifier += 0.24
      noncombatBiasModifier += 0.12
      break
    case 'hostile_territory':
      roleWeights.authority -= 0.2
      roleWeights.criminal += 0.12
      socialTierWeights.street += 0.12
      hostileResponseModifier += 0.3
      authorityResponseModifier -= 0.16
      break
    case 'industrial_kill_site':
      roleWeights.specialist += 0.1
      hostileResponseModifier += 0.24
      noncombatBiasModifier += 0.06
      break
    case 'abandoned_hub':
      roleWeights.authority -= 0.22
      roleWeights.criminal += 0.1
      socialTierWeights.street += 0.1
      hostileResponseModifier += 0.22
      authorityResponseModifier -= 0.2
      break
    case 'resistance_pocket':
      roleWeights.civilian += 0.12
      socialTierWeights.middle += 0.08
      noncombatBiasModifier += 0.1
      break
    case 'safe_hub':
      roleWeights.authority += 0.08
      authorityResponseModifier += 0.06
      break
  }

  if (input.map?.safeHubContinuity === 'broken') {
    hostileResponseModifier += 0.2
    authorityResponseModifier -= 0.14
  } else if (input.map?.safeHubContinuity === 'fragile') {
    hostileResponseModifier += 0.08
  }

  if (mapSignals.some((signal) => signal.includes('curfew'))) {
    authorityResponseModifier += 0.08
  }

  if (mapSignals.some((signal) => signal.includes('Hostile dominance'))) {
    hostileResponseModifier += 0.12
  }

  if (typeof input.truth?.anomalyEncounterPressure === 'number') {
    const normalizedAnomalyPressure = clamp(input.truth.anomalyEncounterPressure, 0, 1)
    roleWeights.occult += normalizedAnomalyPressure * 0.24
    hostileResponseModifier += normalizedAnomalyPressure * 0.2
  }

  if (typeof input.truth?.witnessReliability === 'number' && input.truth.witnessReliability <= 0.4) {
    roleWeights.specialist += 0.08
    noncombatBiasModifier += 0.05
  }

  switch (input.truth?.institutionalResponsePosture) {
    case 'mobilized':
      roleWeights.authority += 0.18
      authorityResponseModifier += 0.16
      break
    case 'guarded':
      roleWeights.authority += 0.08
      authorityResponseModifier += 0.08
      break
    case 'dismissive':
      roleWeights.authority -= 0.12
      authorityResponseModifier -= 0.12
      noncombatBiasModifier += 0.08
      break
  }

  if (input.truth?.publicLegibility === 'accepted') {
    roleWeights.civilian += 0.12
    noncombatBiasModifier += 0.08
  }

  if (input.era?.mixedEra) {
    socialTierWeights.elite += 0.1
    socialTierWeights.street += 0.08
    roleWeights.specialist += 0.08
  }

  if (suppressedSurfaces.length > 0 || suppressedPower.length > 0) {
    roleWeights.occult -= 0.08
    noncombatBiasModifier += 0.04
  }

  const normalizedRoleWeights = normalizeRoleWeights(roleWeights)
  const normalizedSocialWeights = normalizeSocialWeights(socialTierWeights)

  const authorityResponse = clamp(1 + authorityResponseModifier, 0.7, 1.5)
  const hostileResponse = clamp(1 + hostileResponseModifier, 0.7, 1.5)
  const noncombatBias = clamp(1 + noncombatBiasModifier, 0.8, 1.45)
  const districtIdentity = clamp(
    1 +
      familyTags.length * 0.06 +
      ecologyTokens.length * 0.03 +
      Math.min(0.12, appliedEvents.length * 0.03),
    0.9,
    1.45
  )

  const roleAxis = getAxisModifier([
    normalizedRoleWeights.authority,
    normalizedRoleWeights.criminal,
    normalizedRoleWeights.occult,
    normalizedRoleWeights.civilian,
    normalizedRoleWeights.specialist,
  ])
  const socialTierAxis = getAxisModifier([
    normalizedSocialWeights.elite,
    normalizedSocialWeights.middle,
    normalizedSocialWeights.street,
  ])

  const authorityResponseHint = getAuthorityHint(authorityResponse, input.schedule.authorityResponseProfile)
  const hostileResponseHint = getHostileHint(hostileResponse)

  const socialEscalationRisk: 'low' | 'medium' | 'high' =
    hostileResponse >= 1.24 || (authorityResponse <= 0.9 && normalizedSocialWeights.street >= 1.15)
      ? 'high'
      : hostileResponse >= 1.05 || normalizedSocialWeights.street >= 1.08
        ? 'medium'
        : 'low'

  const likelyBranches = uniqueSorted(
    [
      authorityResponseHint === 'rapid_lockdown' ? 'authority_inspection' : '',
      authorityResponseHint === 'thin_coverage' ? 'opportunistic_intrusion' : '',
      hostileResponseHint === 'active_hunt' ? 'hostile_search_ladder' : '',
      hostileResponseHint === 'suppressed_activity' ? 'rumor_exchange' : '',
      noncombatBias >= 1.1 ? 'noncombat_negotiation' : '',
      normalizedRoleWeights.occult >= 1.2 ? 'ritual_interference' : '',
    ].filter(Boolean)
  )

  const tags = uniqueSorted([
    `district:${input.schedule.districtId}`,
    `timeband:${input.schedule.timeBandId}`,
    `authority-profile:${input.schedule.authorityResponseProfile}`,
    `authority-hint:${authorityResponseHint}`,
    `hostile-hint:${hostileResponseHint}`,
    `social-risk:${socialEscalationRisk}`,
    ...familyTags.map((tag) => `family:${tag}`),
    ...ecologyTokens.map((token) => `ecology:${token}`),
    ...(input.schedule.covertAdvantage ? ['covert:advantage'] : []),
    ...appliedEvents.map((eventId) => `schedule-event:${eventId}`),
  ])

  return {
    tags,
    roleWeights: normalizedRoleWeights,
    socialTierWeights: normalizedSocialWeights,
    weightModifiers: {
      districtIdentity,
      roleAxis,
      socialTierAxis,
      authorityResponse,
      hostileResponse,
      noncombatBias,
    },
    escalationHints: {
      authorityResponseHint,
      hostileResponseHint,
      socialEscalationRisk,
      likelyBranches,
    },
  }
}

export type UnitType =
  | 'mobile'
  | 'stationary'
  | 'distributed'
  | 'orbital'
  | 'research'
  | 'reactionary'
  | 'applied'
  | 'containment'
  | 'intelligence'
  | 'cryptography'
  | 'medical'
  | 'materials'
  | 'logistics'
  | 'training'
  | 'internal_audit'
  | 'joint'
  | 'provisional'
  | 'regional'
  | 'diplomatic'
  | 'armed'

export type UnitLifecycleState =
  | 'proposed'
  | 'forming'
  | 'provisional'
  | 'active'
  | 'degraded'
  | 'stationary'
  | 'deployed'
  | 'dedicated'
  | 'retained'
  | 'disbanded'
  | 'replaced'
  | 'absorbed'
  | 'archived'

export type UnitRecordConfidence =
  | 'verified'
  | 'unverified'
  | 'outdated'
  | 'incomplete'
  | 'disbanded'

export type UnitAuthorityTier = 'local' | 'department' | 'regional' | 'council_sanctioned'

export type UnitMissionPosture =
  | 'research_forward'
  | 'containment_response'
  | 'diplomatic_liaison'
  | 'routine_security'
  | 'internal_audit'
  | 'orbital_response'

export type UnitMissionFitBlockerCode =
  | 'wrong_hazard_profile'
  | 'wrong_environment_class'
  | 'wrong_jurisdiction'
  | 'unavailable_lifecycle_state'
  | 'unverified_registry_entry'
  | 'outdated_registry_entry'
  | 'deployment_delay'
  | 'fatigue_exceeded'
  | 'missing_equipment'
  | 'cover_host_forbidden'
  | 'authority_tier_insufficient'
  | 'designation_collision'
  | 'provisional_expired'
  | 'branch_handoff_required'
  | 'secrecy_cost_too_high'
  | 'council_tier_routine_penalty'
  | 'wrong_mission_posture'

export type UnitMobility = 'local' | 'regional' | 'global' | 'orbital'

export type UnitPermanence = 'provisional' | 'standing' | 'dedicated' | 'archived_record'

export type UnitSizeBand =
  | 'large_formation'
  | 'specialist_cell'
  | 'investigative_pair'
  | 'technical_detachment'
  | 'mixed_ad_hoc'

export type IncidentCommandMode = 'routine' | 'departmental' | 'council_direct'

export interface UnitProfile {
  id: string
  designationCode: string
  displayLabel: string
  unitTypes: readonly UnitType[]
  authorityTier: UnitAuthorityTier
  branchId: string
  eraBand?: string
  lifecycleState: UnitLifecycleState
  recordConfidence: UnitRecordConfidence
  doctrine: readonly string[]
  mobility: UnitMobility
  jurisdiction: readonly string[]
  permanence: UnitPermanence
  equipment: readonly string[]
  suitabilityTags: readonly string[]
  hazardProfileTags: readonly string[]
  environmentClasses: readonly string[]
  deploymentDelayWeeks: number
  fatigueReadiness: number
  fatigueCeiling: number
  executiveClearanceEligible?: boolean
  deploymentCooldownWeeksRemaining?: number
  politicalCapitalCost?: number
  coverHostConstraints?: readonly string[]
  sizeBand?: UnitSizeBand
  provisionalExpiresAfterIncident?: boolean
}

export interface SpecialistUnitRegistry {
  units: readonly UnitProfile[]
}

export interface IncidentMissionFitPacket {
  incidentId: string
  week: number
  missionPosture: UnitMissionPosture
  requiredSuitabilityTags: readonly string[]
  requiredHazardProfiles: readonly string[]
  requiredEnvironmentClasses: readonly string[]
  jurisdictionId: string
  commandMode: IncidentCommandMode
  minimumAuthorityTier?: UnitAuthorityTier
  clearanceCeiling: number
  coverHostForbiddenTags?: readonly string[]
  requiredEquipmentTags?: readonly string[]
  estimatedSecrecyCost?: number
  secrecyCostLimit?: number
  allowProvisionalUnits?: boolean
  handoffRequired?: boolean
}

export interface UnitMissionFitBlocker {
  code: UnitMissionFitBlockerCode
  severity: 'hard' | 'soft'
}

export interface UnitMissionFitResult {
  unitId: string
  designationResolved: string
  fitScore: number
  hardBlocked: boolean
  blockers: readonly UnitMissionFitBlocker[]
  rankingNotes: readonly string[]
}

export interface ResolveUnitForMissionInput {
  packet: IncidentMissionFitPacket
  registry: SpecialistUnitRegistry
  options?: {
    maxResults?: number
    includeBlocked?: boolean
  }
}

export interface DesignationCollisionRecord {
  designationCode: string
  unitIds: readonly string[]
  branchIds: readonly string[]
  eraBands: readonly string[]
}

export interface DesignationCollisionResolution {
  resolvedByUnitId: Readonly<Record<string, string>>
  collisions: readonly DesignationCollisionRecord[]
}

export interface ResolveUnitForMissionOutput {
  ranked: readonly UnitMissionFitResult[]
  designationCollisions: readonly DesignationCollisionRecord[]
}

export interface ProvisionalLifecycleTransitionInput {
  profile: UnitProfile
  incidentClosed: boolean
  retainDecision?: 'convert' | 'disband' | 'archive'
}

export interface SpecialistUnitValidationIssue {
  code:
    | 'duplicate_unit_id'
    | 'duplicate_designation'
    | 'invalid_deployment_delay'
    | 'invalid_fatigue_readiness'
    | 'invalid_fatigue_ceiling'
    | 'missing_unit_id'
    | 'missing_designation_code'
  detail: string
}

export interface SpecialistUnitValidationResult {
  valid: boolean
  issues: readonly SpecialistUnitValidationIssue[]
}

const AUTHORITY_TIER_ORDER: readonly UnitAuthorityTier[] = [
  'local',
  'department',
  'regional',
  'council_sanctioned',
]

const NON_DEPLOYABLE_LIFECYCLE: ReadonlySet<UnitLifecycleState> = new Set([
  'proposed',
  'disbanded',
  'replaced',
  'absorbed',
  'archived',
])

const OCCUPIED_LIFECYCLE: ReadonlySet<UnitLifecycleState> = new Set(['deployed', 'dedicated'])

const RESEARCH_SUITABILITY_TAGS = new Set([
  'research_forward',
  'investigation_first',
  'analysis',
  'field_study',
  'records_review',
])

const FRANCHISE_TOKEN_PATTERN =
  /\b(scp|mtf|mobile task force|foundation|goc|gru|uiu|chaos insurgency)\b/i

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values.filter((value) => value.length > 0))].sort((left, right) =>
    left.localeCompare(right)
  )
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.max(min, Math.min(max, Math.trunc(value)))
}

function getAuthorityTierRank(tier: UnitAuthorityTier) {
  return AUTHORITY_TIER_ORDER.indexOf(tier)
}

function hasTagOverlap(required: readonly string[], available: readonly string[]) {
  if (required.length === 0) {
    return true
  }

  const availableSet = new Set(available.map((tag) => tag.toLowerCase()))
  return required.some((tag) => availableSet.has(tag.toLowerCase()))
}

function profileHasResearchFit(profile: UnitProfile, requiredSuitabilityTags: readonly string[]) {
  if (hasTagOverlap(requiredSuitabilityTags, profile.suitabilityTags)) {
    return true
  }

  return profile.suitabilityTags.some((tag) => RESEARCH_SUITABILITY_TAGS.has(tag.toLowerCase()))
}

function profileIsArmedMobileOnly(profile: UnitProfile) {
  const types = new Set(profile.unitTypes)
  const hasArmedOrMobile = types.has('armed') || types.has('mobile')
  const hasResearchType = types.has('research') || types.has('intelligence')
  return hasArmedOrMobile && !hasResearchType && !profileHasResearchFit(profile, ['research_forward'])
}

function addBlocker(
  blockers: UnitMissionFitBlocker[],
  code: UnitMissionFitBlockerCode,
  severity: 'hard' | 'soft'
) {
  if (!blockers.some((blocker) => blocker.code === code && blocker.severity === severity)) {
    blockers.push({ code, severity })
  }
}

function freezeProfile(profile: UnitProfile): UnitProfile {
  return {
    ...profile,
    unitTypes: [...profile.unitTypes],
    doctrine: [...profile.doctrine],
    jurisdiction: [...profile.jurisdiction],
    equipment: [...profile.equipment],
    suitabilityTags: [...profile.suitabilityTags],
    hazardProfileTags: [...profile.hazardProfileTags],
    environmentClasses: [...profile.environmentClasses],
    coverHostConstraints: profile.coverHostConstraints
      ? [...profile.coverHostConstraints]
      : undefined,
  }
}

export function validateSpecialistUnitRegistry(
  registry: SpecialistUnitRegistry
): SpecialistUnitValidationResult {
  const issues: SpecialistUnitValidationIssue[] = []
  const seenIds = new Set<string>()

  for (const unit of registry.units) {
    if (!unit.id.trim()) {
      issues.push({ code: 'missing_unit_id', detail: 'Unit profile is missing id.' })
    } else if (seenIds.has(unit.id)) {
      issues.push({
        code: 'duplicate_unit_id',
        detail: `Duplicate unit id ${unit.id}.`,
      })
    } else {
      seenIds.add(unit.id)
    }

    if (!unit.designationCode.trim()) {
      issues.push({
        code: 'missing_designation_code',
        detail: `Unit ${unit.id || '(unknown)'} is missing designationCode.`,
      })
    }

    if (unit.deploymentDelayWeeks < 0) {
      issues.push({
        code: 'invalid_deployment_delay',
        detail: `Unit ${unit.id} has negative deploymentDelayWeeks.`,
      })
    }

    if (unit.fatigueReadiness < 0 || unit.fatigueReadiness > 100) {
      issues.push({
        code: 'invalid_fatigue_readiness',
        detail: `Unit ${unit.id} fatigueReadiness must be between 0 and 100.`,
      })
    }

    if (unit.fatigueCeiling < 0 || unit.fatigueCeiling > 100) {
      issues.push({
        code: 'invalid_fatigue_ceiling',
        detail: `Unit ${unit.id} fatigueCeiling must be between 0 and 100.`,
      })
    }
  }

  const designationGroups = new Map<string, UnitProfile[]>()
  for (const unit of registry.units) {
    const key = unit.designationCode
    const group = designationGroups.get(key) ?? []
    group.push(unit)
    designationGroups.set(key, group)
  }

  for (const [designationCode, group] of designationGroups) {
    if (group.length > 1) {
      const branchEraKeys = new Set(
        group.map((unit) => `${unit.branchId}::${unit.eraBand ?? 'era_unknown'}`)
      )
      if (branchEraKeys.size < group.length) {
        issues.push({
          code: 'duplicate_designation',
          detail: `Designation ${designationCode} remains ambiguous after branch/era disambiguation.`,
        })
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

export function resolveDesignationCollisions(
  registry: SpecialistUnitRegistry
): DesignationCollisionResolution {
  const groups = new Map<string, UnitProfile[]>()

  for (const unit of registry.units) {
    const group = groups.get(unit.designationCode) ?? []
    group.push(unit)
    groups.set(unit.designationCode, group)
  }

  const resolvedByUnitId: Record<string, string> = {}
  const collisions: DesignationCollisionRecord[] = []

  for (const [designationCode, group] of groups) {
    if (group.length === 1) {
      resolvedByUnitId[group[0].id] = designationCode
      continue
    }

    collisions.push({
      designationCode,
      unitIds: uniqueSorted(group.map((unit) => unit.id)),
      branchIds: uniqueSorted(group.map((unit) => unit.branchId)),
      eraBands: uniqueSorted(group.map((unit) => unit.eraBand ?? 'era_unknown')),
    })

    const resolvedCounts = new Map<string, number>()
    for (const unit of group) {
      const base = `${designationCode}@${unit.branchId}`
      const withEra = `${base}:${unit.eraBand ?? 'era_unknown'}`
      const count = resolvedCounts.get(withEra) ?? 0
      resolvedCounts.set(withEra, count + 1)
      resolvedByUnitId[unit.id] = count === 0 ? withEra : `${withEra}#${count + 1}`
    }
  }

  return {
    resolvedByUnitId,
    collisions,
  }
}

function evaluateUnitMissionFit(
  profile: UnitProfile,
  packet: IncidentMissionFitPacket,
  designationResolved: string,
  designationStillAmbiguous: boolean
): UnitMissionFitResult {
  const blockers: UnitMissionFitBlocker[] = []
  const rankingNotes: string[] = []
  let fitScore = 50

  if (designationStillAmbiguous) {
    addBlocker(blockers, 'designation_collision', 'hard')
  }

  if (NON_DEPLOYABLE_LIFECYCLE.has(profile.lifecycleState)) {
    addBlocker(blockers, 'unavailable_lifecycle_state', 'hard')
  } else if (OCCUPIED_LIFECYCLE.has(profile.lifecycleState)) {
    addBlocker(blockers, 'unavailable_lifecycle_state', 'hard')
  }

  if (
    profile.lifecycleState === 'provisional' &&
    packet.allowProvisionalUnits === false
  ) {
    addBlocker(blockers, 'provisional_expired', 'hard')
  }

  if (profile.recordConfidence === 'unverified') {
    addBlocker(blockers, 'unverified_registry_entry', 'hard')
  } else if (profile.recordConfidence === 'outdated') {
    addBlocker(blockers, 'outdated_registry_entry', 'soft')
    fitScore -= 25
    rankingNotes.push('penalty:outdated_registry')
  } else if (profile.recordConfidence === 'incomplete') {
    addBlocker(blockers, 'incomplete_registry_entry', 'soft')
    fitScore -= 20
    rankingNotes.push('flag:incomplete_registry')
  } else if (profile.recordConfidence === 'disbanded') {
    addBlocker(blockers, 'unavailable_lifecycle_state', 'hard')
  }

  if (packet.handoffRequired) {
    addBlocker(blockers, 'branch_handoff_required', 'hard')
  }

  if (
    packet.minimumAuthorityTier &&
    getAuthorityTierRank(profile.authorityTier) < getAuthorityTierRank(packet.minimumAuthorityTier)
  ) {
    addBlocker(blockers, 'authority_tier_insufficient', 'hard')
  }

  if (packet.commandMode === 'council_direct') {
    if (profile.authorityTier !== 'council_sanctioned') {
      addBlocker(blockers, 'authority_tier_insufficient', 'hard')
    }
  }

  if (
    packet.commandMode === 'routine' &&
    profile.authorityTier === 'council_sanctioned'
  ) {
    addBlocker(blockers, 'council_tier_routine_penalty', 'soft')
    fitScore -= 35
    rankingNotes.push('penalty:council_routine')
  }

  if (packet.missionPosture === 'research_forward') {
    if (!profileHasResearchFit(profile, packet.requiredSuitabilityTags)) {
      if (profileIsArmedMobileOnly(profile) || profile.unitTypes.includes('armed')) {
        addBlocker(blockers, 'wrong_mission_posture', 'hard')
      } else {
        addBlocker(blockers, 'wrong_mission_posture', 'soft')
        fitScore -= 30
      }
    }
  }

  if (packet.requiredHazardProfiles.length > 0) {
    if (!hasTagOverlap(packet.requiredHazardProfiles, profile.hazardProfileTags)) {
      addBlocker(blockers, 'wrong_hazard_profile', 'hard')
    } else {
      const overlapCount = packet.requiredHazardProfiles.filter((tag) =>
        profile.hazardProfileTags.map((value) => value.toLowerCase()).includes(tag.toLowerCase())
      ).length
      fitScore += overlapCount * 15
      rankingNotes.push('bonus:hazard_overlap')
    }
  }

  if (packet.requiredEnvironmentClasses.length > 0) {
    if (!hasTagOverlap(packet.requiredEnvironmentClasses, profile.environmentClasses)) {
      addBlocker(blockers, 'wrong_environment_class', 'hard')
    } else {
      const overlapCount = packet.requiredEnvironmentClasses.filter((tag) =>
        profile.environmentClasses.map((value) => value.toLowerCase()).includes(tag.toLowerCase())
      ).length
      fitScore += overlapCount * 10
      rankingNotes.push('bonus:environment_overlap')
    }
  }

  if (packet.jurisdictionId.length > 0 && profile.jurisdiction.length > 0) {
    const jurisdictionSet = new Set(profile.jurisdiction.map((value) => value.toLowerCase()))
    if (!jurisdictionSet.has(packet.jurisdictionId.toLowerCase())) {
      addBlocker(blockers, 'wrong_jurisdiction', 'hard')
    }
  } else if (packet.jurisdictionId.length > 0 && profile.jurisdiction.length === 0) {
    addBlocker(blockers, 'wrong_jurisdiction', 'soft')
    fitScore -= 15
    rankingNotes.push('penalty:unknown_jurisdiction')
  }

  if (packet.requiredSuitabilityTags.length > 0) {
    if (hasTagOverlap(packet.requiredSuitabilityTags, profile.suitabilityTags)) {
      const overlapCount = packet.requiredSuitabilityTags.filter((tag) =>
        profile.suitabilityTags.map((value) => value.toLowerCase()).includes(tag.toLowerCase())
      ).length
      fitScore += overlapCount * 10
      rankingNotes.push('bonus:suitability_overlap')
    } else {
      addBlocker(blockers, 'wrong_mission_posture', 'soft')
      fitScore -= 20
    }
  }

  if (packet.requiredEquipmentTags && packet.requiredEquipmentTags.length > 0) {
    if (!hasTagOverlap(packet.requiredEquipmentTags, profile.equipment)) {
      addBlocker(blockers, 'missing_equipment', 'hard')
    }
  }

  const forbiddenTags = packet.coverHostForbiddenTags ?? []
  const profileConstraintTags = [
    ...profile.coverHostConstraints ?? [],
    ...profile.equipment,
    ...profile.suitabilityTags,
  ]
  if (
    forbiddenTags.length > 0 &&
    hasTagOverlap(forbiddenTags, profileConstraintTags)
  ) {
    addBlocker(blockers, 'cover_host_forbidden', 'hard')
  }

  if (profile.deploymentDelayWeeks > 0) {
    addBlocker(blockers, 'deployment_delay', 'soft')
    fitScore -= Math.min(30, profile.deploymentDelayWeeks * 5)
    rankingNotes.push('penalty:deployment_delay')
  }

  if (profile.fatigueReadiness < 20) {
    addBlocker(blockers, 'fatigue_exceeded', 'hard')
  } else if (profile.fatigueReadiness > profile.fatigueCeiling) {
    addBlocker(blockers, 'fatigue_exceeded', 'hard')
  } else if (profile.fatigueReadiness < 40) {
    addBlocker(blockers, 'fatigue_exceeded', 'soft')
    fitScore -= 10
    rankingNotes.push('penalty:low_fatigue')
  }

  if (
    packet.estimatedSecrecyCost !== undefined &&
    packet.secrecyCostLimit !== undefined &&
    packet.estimatedSecrecyCost > packet.secrecyCostLimit
  ) {
    addBlocker(blockers, 'secrecy_cost_too_high', 'hard')
  }

  if (profile.deploymentCooldownWeeksRemaining && profile.deploymentCooldownWeeksRemaining > 0) {
    addBlocker(blockers, 'deployment_delay', 'soft')
    fitScore -= Math.min(20, profile.deploymentCooldownWeeksRemaining * 4)
    rankingNotes.push('penalty:cooldown')
  }

  const hardBlocked = blockers.some((blocker) => blocker.severity === 'hard')
  if (hardBlocked) {
    fitScore = 0
  } else {
    fitScore = clampInteger(fitScore, 0, 100)
  }

  return {
    unitId: profile.id,
    designationResolved,
    fitScore,
    hardBlocked,
    blockers,
    rankingNotes: uniqueSorted(rankingNotes),
  }
}

export function resolveUnitForMission(
  input: ResolveUnitForMissionInput
): ResolveUnitForMissionOutput {
  const packet = input.packet
  const registry = input.registry
  const options = input.options ?? {}
  const designationResolution = resolveDesignationCollisions(registry)

  const ambiguousUnitIds = new Set<string>()
  for (const collision of designationResolution.collisions) {
    const keys = collision.unitIds.map((unitId) => {
      const profile = registry.units.find((unit) => unit.id === unitId)
      return profile ? `${profile.branchId}::${profile.eraBand ?? 'era_unknown'}` : unitId
    })
    const uniqueKeys = new Set(keys)
    if (uniqueKeys.size < collision.unitIds.length) {
      for (const unitId of collision.unitIds) {
        ambiguousUnitIds.add(unitId)
      }
    }
  }

  const results = registry.units.map((unit) =>
    evaluateUnitMissionFit(
      unit,
      packet,
      designationResolution.resolvedByUnitId[unit.id] ?? unit.designationCode,
      ambiguousUnitIds.has(unit.id)
    )
  )

  const filtered = options.includeBlocked
    ? results
    : results.filter((result) => !result.hardBlocked)

  const ranked = [...filtered].sort((left, right) => {
    if (left.hardBlocked !== right.hardBlocked) {
      return Number(left.hardBlocked) - Number(right.hardBlocked)
    }

    if (right.fitScore !== left.fitScore) {
      return right.fitScore - left.fitScore
    }

    const leftProfile = registry.units.find((unit) => unit.id === left.unitId)
    const rightProfile = registry.units.find((unit) => unit.id === right.unitId)
    const leftDelay = leftProfile?.deploymentDelayWeeks ?? 0
    const rightDelay = rightProfile?.deploymentDelayWeeks ?? 0
    if (leftDelay !== rightDelay) {
      return leftDelay - rightDelay
    }

    const leftFatigue = leftProfile?.fatigueReadiness ?? 0
    const rightFatigue = rightProfile?.fatigueReadiness ?? 0
    if (rightFatigue !== leftFatigue) {
      return rightFatigue - leftFatigue
    }

    return left.unitId.localeCompare(right.unitId)
  })

  const maxResults = options.maxResults ?? ranked.length

  return {
    ranked: ranked.slice(0, maxResults),
    designationCollisions: designationResolution.collisions,
  }
}

export function transitionProvisionalUnitLifecycle(
  input: ProvisionalLifecycleTransitionInput
): UnitProfile {
  const profile = freezeProfile(input.profile)

  if (profile.lifecycleState !== 'provisional' && profile.permanence !== 'provisional') {
    return profile
  }

  if (!input.incidentClosed) {
    return profile
  }

  if (input.retainDecision === 'convert') {
    return {
      ...profile,
      lifecycleState: 'active',
      permanence: 'standing',
      provisionalExpiresAfterIncident: false,
    }
  }

  if (input.retainDecision === 'disband') {
    return {
      ...profile,
      lifecycleState: 'disbanded',
      permanence: 'archived_record',
      recordConfidence: 'disbanded',
      provisionalExpiresAfterIncident: false,
    }
  }

  return {
    ...profile,
    lifecycleState: 'archived',
    permanence: 'archived_record',
    provisionalExpiresAfterIncident: false,
  }
}

export function collectSpecialistUnitResultTokens(
  output: ResolveUnitForMissionOutput
): string[] {
  const tokens: string[] = []

  for (const result of output.ranked) {
    tokens.push(result.unitId, result.designationResolved, ...result.rankingNotes)
    for (const blocker of result.blockers) {
      tokens.push(blocker.code)
    }
  }

  for (const collision of output.designationCollisions) {
    tokens.push(collision.designationCode, ...collision.unitIds)
  }

  return tokens
}

export function resultTokensContainFranchiseReferences(tokens: readonly string[]) {
  return tokens.some((token) => FRANCHISE_TOKEN_PATTERN.test(token))
}

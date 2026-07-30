import type { BeliefTier, BeliefTrackState } from '../beliefTracks'
import {
  CASE_LIFECYCLE_INSTITUTIONAL_LABELS,
  CASE_LIFECYCLE_STAGES,
  CONTAINMENT_POLICY_TIERS,
  isCaseLifecycleInstitutionalLabel,
  isContainmentPolicyTier,
} from '../caseLifecycleStateMachine'
import {
  sanitizePersistedFieldBasePacket,
  sanitizeFieldBaseQualityBands,
} from '../fieldBaseStaging'
import { buildConcealmentActivationTriggersFromAuthored } from '../hiddenStateActivationAuthoring'
import { buildInfiltrationCoverProfileFromAuthoredRecord } from '../infiltrationCoverAuthoring'
import { buildInfiltrationProbePlanFromAuthoredRecord } from '../infiltrationProbeAuthoring'
import { isInfiltrationProbeAction } from '../infiltrationProbe'
import { isInfiltrationEncounterCoverStance } from '../infiltrationEncounterCoverStance'
import { clamp } from '../math'
import type { ThreatFamily } from '../shared/modifiers'
import type {
  ActiveContractRuntime,
  ActiveMajorIncidentRuntime,
  AgentDeploymentCarryInStamp,
  CaseInstance,
  CaseKind,
  CaseMode,
  CaseStatus,
  CaseTemplate,
  ContractRiskLevel,
  ContractStrategyTag,
  DeploymentCarryInCode,
  GameState,
  Id,
  LocalRuleOverride,
  LocalRuleOverrideDomain,
  MajorIncidentProvisionType,
  MajorIncidentStrategy,
  RoomEscalationActivator,
  RoomEscalationTrigger,
  SpawnRule,
  StatBlock,
  StatKey,
  TeamCoverageRole,
  WeirdRoomPacket,
  WeirdRoomStateKind,
  WeightBlock,
} from '../models'
import { BASE_STAT_MAX, TEAM_COVERAGE_ROLES } from '../models'
import {
  CONSEQUENCE_LADDERS,
  SEVERE_HIT_TABLES,
  type ConsequenceKey,
  type OutcomeBand,
} from '../shared/outcomes'
import {
  DEFAULT_STEALTH_LEAVE_BEHIND_REGISTRY,
  getStealthLeaveBehindById,
} from '../stealthLeaveBehindRegistry'
import { isDistortionState, normalizeDistortionStates } from '../shared/distortion'
import type {
  MapLayerResult,
  MapSymbol,
  MapSymbolRouteEffect,
  RouteAnnotation,
  ScaleAnchor,
  ZoneAnnotation,
  ZoneDepthBand,
} from '../siteGeneration/mapMetadata'
import { normalizeSpawnRule } from '../spawnRules'
import { getTeamMemberIds } from '../teamSimulation'
import { PRESSURE_CALIBRATION } from '../sim/calibration'

const CASE_MODES = [
  'threshold',
  'probability',
  'deterministic',
  'standard',
] as const satisfies readonly CaseMode[]
const CASE_KINDS = ['case', 'raid', 'standard', 'anomaly'] as const satisfies readonly CaseKind[]
const CASE_STATUSES = ['open', 'in_progress', 'resolved'] as const satisfies readonly CaseStatus[]
const CASE_HIDDEN_STATES = ['hidden', 'revealed', 'displaced'] as const
const INFILTRATION_STAGES = ['probing', 'exposed', 'violent'] as const
const SITE_LAYERS = ['exterior', 'transition', 'interior'] as const
const VISIBILITY_STATES = ['clear', 'obstructed', 'exposed'] as const
const TRANSITION_TYPES = ['open-approach', 'threshold', 'chokepoint'] as const
const CONTRACT_RISK_LEVELS = [
  'low',
  'medium',
  'moderate',
  'high',
  'severe',
  'extreme',
] as const satisfies readonly ContractRiskLevel[]
const MAJOR_INCIDENT_STRATEGIES = [
  'aggressive',
  'balanced',
  'cautious',
  'rapid_response',
  'containment_first',
  'risk_accepting',
] as const satisfies readonly MajorIncidentStrategy[]

const DEPLOYMENT_CARRY_IN_CODES = [
  'residue-therapy-foregone',
  'well-rested-stable-energy',
  'off-books-courier-lockout',
] as const satisfies readonly DeploymentCarryInCode[]

const MAJOR_INCIDENT_PROVISION_TYPES = [
  'medical_supplies',
  'tactical_enhancers',
  'extraction_tools',
  'optimization_kits',
] as const satisfies readonly MajorIncidentProvisionType[]

const BELIEF_TIERS = [
  'clear',
  'uncertain',
  'suspected',
  'condemned',
] as const satisfies readonly BeliefTier[]

const CONTRACT_STRATEGY_TAGS = [
  'income',
  'materials',
  'research',
  'progression',
] as const satisfies readonly ContractStrategyTag[]

const MAP_AUTHORING_MODES = ['map-metadata-first', 'prose-key-first'] as const
const ROUTE_CLASSES = ['open', 'choke', 'exposed', 'concealed', 'rigged'] as const
const ZONE_DEPTH_BANDS = [
  'region',
  'district',
  'building',
  'room',
] as const satisfies readonly ZoneDepthBand[]
const SCALE_ACCESS_TIERS = ['open', 'restricted', 'locked'] as const
const LOCAL_RULE_DOMAINS = [
  'traversal',
  'perception',
  'interaction',
  'timing',
] as const satisfies readonly LocalRuleOverrideDomain[]
const ROOM_ESCALATION_ACTIVATORS = [
  'dwell',
  'disturbance',
  'staged_interaction',
] as const satisfies readonly RoomEscalationActivator[]
const WEIRD_ROOM_KINDS = [
  'false_environment_shell',
  'shifted_affordances',
  'passive_influence',
  'stateful_hazard_room',
] as const satisfies readonly WeirdRoomStateKind[]

const CASE_STAT_KEYS = [
  'combat',
  'investigation',
  'utility',
  'social',
] as const satisfies readonly StatKey[]

const OUTCOME_BANDS = [
  'catastrophic',
  'fail',
  'partial',
  'success',
  'strong',
] as const satisfies readonly OutcomeBand[]

const CONSEQUENCE_KEY_SET = new Set<string>([
  ...CONSEQUENCE_LADDERS.flatMap((ladder) =>
    Object.values(ladder.bands).flatMap((band) => band ?? [])
  ),
  ...SEVERE_HIT_TABLES.flatMap((table) => table.outcomes),
])

const DEFAULT_RAID_BOUNDS = { minTeams: 2, maxTeams: 2 } as const
const UNIT_INTERVAL_MAX = 1
const MAX_CASE_PRESSURE_VALUE = 128
const MAX_REGION_TAG_LENGTH = 64

/** Hydration 405: escalation stage ceiling (matches consequence band cap). */
export const MAX_CASE_STAGE = 5

/** Hydration 404: bounded case display / provenance strings. */
const MAX_CASE_TITLE_LENGTH = 120
const MAX_CASE_DESCRIPTION_LENGTH = 2000
const MAX_CASE_ROUTE_LENGTH = 128
const MAX_CASE_COUNTER_EXPLANATION_LENGTH = 512
const MAX_CASE_WORKSHOP_FINALIZATION_ID_LENGTH = 256

function sanitizeDepartmentWorkshopCompletionWorkOrderIds(value: unknown): Id[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const ids = [
    ...new Set(
      value
        .filter((id): id is string => typeof id === 'string')
        .map((id) => id.trim())
        .filter(Boolean)
    ),
  ].sort()
  return ids.length > 0 ? ids : undefined
}

function sanitizeWorkshopFinalizationId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const id = value.trim()
  if (
    id.length === 0 ||
    id.length > MAX_CASE_WORKSHOP_FINALIZATION_ID_LENGTH ||
    id === '__proto__' ||
    id === 'constructor' ||
    id === 'prototype' ||
    /^(0|[1-9]\d*)$/.test(id)
  ) {
    return undefined
  }
  return id
}

function sanitizeWorkshopFinalizationWorkOrderIds(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const ids = value
    .map(sanitizeWorkshopFinalizationId)
    .filter((id): id is string => id !== undefined)
  if (ids.length !== value.length) return undefined
  const normalized = [...new Set(ids)].sort()
  return normalized.length > 0 ? Object.freeze(normalized) : undefined
}

function sanitizeDepartmentWorkshopFinalizationRequest(
  value: unknown
): CaseInstance['departmentWorkshopFinalizationRequest'] {
  if (!isRecord(value)) return undefined
  const finalRecipeId = sanitizeWorkshopFinalizationId(value.finalRecipeId)
  const requiredWorkOrderIds = sanitizeWorkshopFinalizationWorkOrderIds(value.requiredWorkOrderIds)
  if (!finalRecipeId || !requiredWorkOrderIds) return undefined
  return Object.freeze({ finalRecipeId, requiredWorkOrderIds })
}

function sanitizeDepartmentWorkshopFinalizationHandoff(
  value: unknown
): CaseInstance['departmentWorkshopFinalizationHandoff'] {
  if (!isRecord(value)) return undefined
  const finalRecipeId = sanitizeWorkshopFinalizationId(value.finalRecipeId)
  const outputItemId = sanitizeWorkshopFinalizationId(value.outputItemId)
  const sourceWorkOrderIds = sanitizeWorkshopFinalizationWorkOrderIds(value.sourceWorkOrderIds)
  if (
    !finalRecipeId ||
    !outputItemId ||
    !sourceWorkOrderIds ||
    typeof value.outputQuantity !== 'number' ||
    !Number.isSafeInteger(value.outputQuantity) ||
    value.outputQuantity <= 0 ||
    typeof value.handoffWeek !== 'number' ||
    !Number.isSafeInteger(value.handoffWeek) ||
    value.handoffWeek <= 0
  ) {
    return undefined
  }
  return Object.freeze({
    finalRecipeId,
    outputItemId,
    outputQuantity: value.outputQuantity,
    sourceWorkOrderIds,
    handoffWeek: value.handoffWeek,
  })
}

const THREAT_FAMILIES = [
  'deception',
  'disruption',
  'containment',
  'biological',
  'psychological',
  'technological',
] as const satisfies readonly ThreatFamily[]

/** Hydration 406: legacy persisted threat family tokens → current ThreatFamily union. */
export const LEGACY_THREAT_FAMILY_ALIASES: Readonly<Record<string, ThreatFamily>> = {
  bio: 'biological',
  biological_threat: 'biological',
  psych: 'psychological',
  psychological_threat: 'psychological',
  tech: 'technological',
  techno: 'technological',
  technological_threat: 'technological',
  disrupt: 'disruption',
  disruption_threat: 'disruption',
  deceit: 'deception',
  deception_threat: 'deception',
  contain: 'containment',
  containment_threat: 'containment',
}

/** Hydration 396: legacy persisted template ids → current catalog keys. */
export const LEGACY_CASE_TEMPLATE_ID_ALIASES: Readonly<Record<string, string>> = {
  'occ-001': 'extraction-raid-001',
}

const KNOWN_INGRESS_SPATIAL_FLAGS = new Set([
  'ingress:maintenance_shaft',
  'ingress:storm_drain',
  'ingress:floodgate',
  'ingress:service_door',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === 'string' && options.includes(value as T)
}

function sanitizeInteger(value: unknown, fallback: number, min: number, max?: number) {
  const finiteValue = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  const truncated = Math.trunc(finiteValue)
  const boundedMin = Math.max(min, truncated)
  return max === undefined ? boundedMin : Math.min(max, boundedMin)
}

function sanitizeUnitInterval(value: unknown, fallback: number) {
  const finiteValue = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return clamp(Number(finiteValue.toFixed(4)), 0, UNIT_INTERVAL_MAX)
}

function sanitizeBoundedRequiredText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== 'string') {
    return fallback.slice(0, maxLength)
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return fallback.slice(0, maxLength)
  }

  return trimmed.slice(0, maxLength)
}

function sanitizeOptionalBoundedText(
  value: unknown,
  fallback: string | undefined,
  maxLength: number
): string | undefined {
  if (value === undefined) {
    return fallback
  }

  if (value === null || typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  return trimmed.slice(0, maxLength)
}

function sanitizeOptionalRouteField(
  value: unknown,
  fallback: CaseInstance['route']
): CaseInstance['route'] {
  if (value === undefined) {
    return fallback
  }

  if (value === null) {
    return null
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  return trimmed.slice(0, MAX_CASE_ROUTE_LENGTH)
}

function sanitizeCounterDetectionField(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function resolveHydratedThreatFamily(
  value: unknown,
  templateRecord: CaseTemplate | undefined
): ThreatFamily | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (isOneOf(trimmed, THREAT_FAMILIES)) {
      return trimmed
    }

    const migrated =
      LEGACY_THREAT_FAMILY_ALIASES[trimmed] ?? LEGACY_THREAT_FAMILY_ALIASES[trimmed.toLowerCase()]
    if (migrated) {
      return migrated
    }
  }

  if (templateRecord !== undefined && isRecord(templateRecord)) {
    const templateFamily = (templateRecord as { threatFamily?: unknown }).threatFamily
    if (typeof templateFamily === 'string') {
      const trimmed = templateFamily.trim()
      if (isOneOf(trimmed, THREAT_FAMILIES)) {
        return trimmed
      }

      const migrated =
        LEGACY_THREAT_FAMILY_ALIASES[trimmed] ?? LEGACY_THREAT_FAMILY_ALIASES[trimmed.toLowerCase()]
      if (migrated) {
        return migrated
      }
    }
  }

  return undefined
}

function sanitizeTagList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return [
    ...new Set(
      value
        .filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
        .map((tag) => tag.trim())
    ),
  ]
}

/** Hydration 397/402: trim, dedupe, and drop malformed spatial flag tokens. */
function sanitizeSpatialFlagsList(value: unknown): string[] | undefined {
  const trimmed = sanitizeTagList(value)
  if (trimmed.length === 0) {
    return undefined
  }

  const flags = trimmed.filter((flag) => {
    if (flag.startsWith('ingress:')) {
      return KNOWN_INGRESS_SPATIAL_FLAGS.has(flag)
    }

    if (flag.startsWith('site:')) {
      return /^site:[a-z0-9_:-]+$/i.test(flag)
    }

    return /^[a-z][a-z0-9_:-]*$/i.test(flag)
  })

  return flags.length > 0 ? flags : undefined
}

function sanitizePressureValueField(
  value: unknown,
  fallback: CaseInstance['pressureValue']
): CaseInstance['pressureValue'] {
  if (value === undefined) {
    return fallback
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }

  const truncated = Math.trunc(value)
  if (truncated < 1) {
    return undefined
  }

  return Math.min(truncated, MAX_CASE_PRESSURE_VALUE)
}

function sanitizeRegionTagField(
  value: unknown,
  fallback: CaseInstance['regionTag']
): CaseInstance['regionTag'] {
  if (value === undefined) {
    return fallback
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim().slice(0, MAX_REGION_TAG_LENGTH)
  if (!trimmed || !/^[a-z][a-z0-9_]*$/.test(trimmed)) {
    return undefined
  }

  return trimmed
}

function sanitizeIntelLastUpdatedWeekField(
  value: unknown,
  week: number,
  fallback: CaseInstance['intelLastUpdatedWeek']
): CaseInstance['intelLastUpdatedWeek'] {
  if (value === undefined) {
    return fallback
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }

  const truncated = Math.trunc(value)
  if (truncated < 1 || truncated > week) {
    return undefined
  }

  return truncated
}

function resolveHydratedCaseTemplateId(
  templateId: string,
  knownTemplateIds?: ReadonlySet<string>
): { templateId: string; catalogKnown: boolean } {
  const migrated = LEGACY_CASE_TEMPLATE_ID_ALIASES[templateId] ?? templateId
  const catalogKnown = knownTemplateIds === undefined ? true : knownTemplateIds.has(migrated)

  return { templateId: migrated, catalogKnown }
}

function filterSpawnTemplateIdsToCatalog(
  rule: SpawnRule,
  knownTemplateIds?: ReadonlySet<string>
): SpawnRule {
  if (knownTemplateIds === undefined) {
    return rule
  }

  const spawnTemplateIds = rule.spawnTemplateIds.filter((id) => knownTemplateIds.has(id))
  return { ...rule, spawnTemplateIds }
}

function sanitizeSpawnRuleField(value: unknown, fallback: SpawnRule): SpawnRule {
  if (!isRecord(value)) {
    return normalizeSpawnRule(fallback)
  }

  const spawnMin = isRecord(value.spawnCount)
    ? sanitizeInteger((value.spawnCount as { min?: unknown }).min, fallback.spawnCount?.min ?? 0, 0)
    : (fallback.spawnCount?.min ?? 0)
  const spawnMax = isRecord(value.spawnCount)
    ? sanitizeInteger(
        (value.spawnCount as { max?: unknown }).max,
        fallback.spawnCount?.max ?? spawnMin,
        0
      )
    : (fallback.spawnCount?.max ?? spawnMin)

  return normalizeSpawnRule({
    ...fallback,
    ...value,
    spawnCount: {
      min: spawnMin,
      max: Math.max(spawnMin, spawnMax),
    },
    spawnTemplateIds: Array.isArray(value.spawnTemplateIds)
      ? value.spawnTemplateIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
      : fallback.spawnTemplateIds,
    stageDelta: sanitizeInteger(value.stageDelta, fallback.stageDelta ?? 0, 0),
    deadlineResetWeeks:
      value.deadlineResetWeeks === undefined
        ? fallback.deadlineResetWeeks
        : sanitizeInteger(value.deadlineResetWeeks, fallback.deadlineResetWeeks ?? 0, 0),
  })
}

function sanitizeRaidBounds(
  value: unknown,
  fallback: CaseInstance['raid']
): NonNullable<CaseInstance['raid']> {
  const base = fallback ?? DEFAULT_RAID_BOUNDS
  const raw = isRecord(value) ? value : {}

  const minTeams = sanitizeInteger(raw.minTeams, base.minTeams, 1, 8)
  const maxTeams = sanitizeInteger(raw.maxTeams, base.maxTeams, minTeams, 8)

  return { minTeams, maxTeams: Math.max(minTeams, maxTeams) }
}

function sanitizeHiddenDisplacementFields(
  entry: Record<string, unknown>,
  fallback: CaseInstance
): Pick<
  CaseInstance,
  | 'hiddenState'
  | 'detectionConfidence'
  | 'counterDetection'
  | 'displacementTarget'
  | 'route'
  | 'compartment'
> {
  const resolvedHiddenState = isOneOf(entry.hiddenState, CASE_HIDDEN_STATES)
    ? entry.hiddenState
    : fallback.hiddenState

  let displacementTarget: Id | null | undefined =
    typeof entry.displacementTarget === 'string' && entry.displacementTarget.length > 0
      ? entry.displacementTarget
      : entry.displacementTarget === null
        ? null
        : (fallback.displacementTarget ?? null)

  let route = sanitizeOptionalRouteField(entry.route, fallback.route ?? null)
  let compartment = sanitizeOptionalRouteField(entry.compartment, fallback.compartment ?? null)

  let hiddenState = resolvedHiddenState
  let detectionConfidence =
    typeof entry.detectionConfidence === 'number' && Number.isFinite(entry.detectionConfidence)
      ? sanitizeUnitInterval(entry.detectionConfidence, fallback.detectionConfidence ?? 0)
      : fallback.detectionConfidence

  const counterDetection =
    entry.counterDetection === undefined
      ? fallback.counterDetection
      : sanitizeCounterDetectionField(entry.counterDetection)

  if (hiddenState === 'hidden' && counterDetection) {
    hiddenState = 'revealed'
  }

  if (hiddenState !== 'displaced') {
    displacementTarget = undefined
    if (hiddenState !== 'displaced' && route !== null && route !== undefined) {
      route = hiddenState === 'hidden' || hiddenState === 'revealed' ? route : null
    }
    if (compartment !== null && compartment !== undefined) {
      compartment = hiddenState === 'hidden' || hiddenState === 'revealed' ? compartment : null
    }
  } else if (!displacementTarget) {
    hiddenState = 'revealed'
    displacementTarget = undefined
    route = null
    compartment = null
  }

  if (hiddenState === 'revealed' && detectionConfidence === undefined) {
    detectionConfidence = 1
  } else if (hiddenState === 'displaced' && detectionConfidence === undefined) {
    detectionConfidence = 0.55
  } else if (hiddenState === 'hidden' && detectionConfidence === undefined) {
    detectionConfidence = 0.25
  }

  if (detectionConfidence !== undefined) {
    detectionConfidence = sanitizeUnitInterval(detectionConfidence, detectionConfidence)
  }

  return {
    ...(hiddenState !== undefined ? { hiddenState } : {}),
    ...(detectionConfidence !== undefined ? { detectionConfidence } : {}),
    ...(counterDetection !== undefined ? { counterDetection } : {}),
    ...(displacementTarget !== undefined ? { displacementTarget } : {}),
    ...(route !== undefined ? { route } : {}),
    ...(compartment !== undefined ? { compartment } : {}),
  }
}

function sanitizeMajorIncidentRuntime(
  value: unknown,
  fallback: ActiveMajorIncidentRuntime | undefined
): ActiveMajorIncidentRuntime | undefined {
  if (!isRecord(value)) {
    return fallback
  }

  const strategy = isOneOf(value.strategy, MAJOR_INCIDENT_STRATEGIES)
    ? value.strategy
    : (fallback?.strategy ?? 'balanced')

  const provisions = Array.isArray(value.provisions)
    ? ([
        ...new Set(
          value.provisions.filter((provision): provision is MajorIncidentProvisionType =>
            isOneOf(provision, MAJOR_INCIDENT_PROVISION_TYPES)
          )
        ),
      ] as MajorIncidentProvisionType[])
    : (fallback?.provisions ?? [])

  const durationWeeks = sanitizeInteger(value.durationWeeks, fallback?.durationWeeks ?? 1, 1, 52)
  const requiredTeams = sanitizeInteger(value.requiredTeams, fallback?.requiredTeams ?? 1, 1, 8)
  const difficulty = sanitizeInteger(value.difficulty, fallback?.difficulty ?? 1, 0, 9999)
  const stage =
    value.stage === undefined
      ? fallback?.stage
      : sanitizeInteger(value.stage, fallback?.stage ?? 1, 1, 8)

  const riskLevel = isOneOf(value.riskLevel, CONTRACT_RISK_LEVELS)
    ? value.riskLevel
    : fallback?.riskLevel

  const runtime: ActiveMajorIncidentRuntime = {
    strategy,
    provisions,
    durationWeeks,
    requiredTeams,
    difficulty,
    ...(typeof value.incidentId === 'string' && value.incidentId.length > 0
      ? { incidentId: value.incidentId }
      : fallback?.incidentId
        ? { incidentId: fallback.incidentId }
        : {}),
    ...(typeof value.archetypeId === 'string' && value.archetypeId.length > 0
      ? { archetypeId: value.archetypeId }
      : fallback?.archetypeId
        ? { archetypeId: fallback.archetypeId }
        : {}),
    ...(typeof value.name === 'string' && value.name.length > 0
      ? { name: value.name }
      : fallback?.name
        ? { name: fallback.name }
        : {}),
    ...(typeof value.description === 'string'
      ? { description: value.description }
      : fallback?.description
        ? { description: fallback.description }
        : {}),
    ...(riskLevel ? { riskLevel } : {}),
    ...(stage !== undefined ? { stage } : {}),
    ...(isRecord(value.rewards)
      ? { rewards: value.rewards as ActiveMajorIncidentRuntime['rewards'] }
      : fallback?.rewards
        ? { rewards: fallback.rewards }
        : {}),
    ...(Array.isArray(value.modifiers)
      ? { modifiers: value.modifiers as ActiveMajorIncidentRuntime['modifiers'] }
      : fallback?.modifiers
        ? { modifiers: fallback.modifiers }
        : {}),
    ...(isRecord(value.rumor)
      ? { rumor: value.rumor as ActiveMajorIncidentRuntime['rumor'] }
      : fallback?.rumor
        ? { rumor: fallback.rumor }
        : {}),
  }

  return runtime
}

function collectAssignedAgentIds(
  assignedTeamIds: readonly string[],
  teams: GameState['teams']
): Set<string> {
  const agentIds = new Set<string>()

  for (const teamId of assignedTeamIds) {
    const team = teams[teamId]
    if (!team) continue
    for (const agentId of getTeamMemberIds(team)) {
      agentIds.add(agentId)
    }
  }

  return agentIds
}

function shouldRetainDeploymentCarryIn(
  caseData: Pick<CaseInstance, 'status' | 'weeksRemaining' | 'durationWeeks'>
) {
  return (
    caseData.status === 'in_progress' &&
    caseData.weeksRemaining !== undefined &&
    caseData.weeksRemaining === caseData.durationWeeks
  )
}

function sanitizeBeliefTier(value: unknown, fallback: BeliefTier): BeliefTier {
  return isOneOf(value, BELIEF_TIERS) ? value : fallback
}

/** Hydration 382: coerce belief tracks so pressure math always sees valid tiers. */
function sanitizeBeliefTracks(
  value: unknown,
  fallback?: BeliefTrackState
): BeliefTrackState | undefined {
  if (value === undefined) {
    return fallback
  }

  if (!isRecord(value)) {
    return undefined
  }

  const defaultTier: BeliefTier = 'clear'

  return {
    factTruth: sanitizeBeliefTier(value.factTruth, fallback?.factTruth ?? defaultTier),
    witnessInterpretation: sanitizeBeliefTier(
      value.witnessInterpretation,
      fallback?.witnessInterpretation ?? defaultTier
    ),
    institutionalJudgment: sanitizeBeliefTier(
      value.institutionalJudgment,
      fallback?.institutionalJudgment ?? defaultTier
    ),
    crowdConsensus: sanitizeBeliefTier(
      value.crowdConsensus,
      fallback?.crowdConsensus ?? defaultTier
    ),
  }
}

function sanitizeDistortionField(
  value: unknown,
  fallback: CaseInstance['distortion']
): CaseInstance['distortion'] {
  if (value === undefined) {
    return fallback
  }

  const raw = Array.isArray(value) ? value : []
  const normalized = normalizeDistortionStates(raw.filter((state) => isDistortionState(state)))

  return normalized.length > 0 ? normalized : undefined
}

function sanitizeInfiltrationWeeklyProbeActionOverride(
  value: unknown,
  fallback: CaseInstance['infiltrationWeeklyProbeActionOverride']
): CaseInstance['infiltrationWeeklyProbeActionOverride'] {
  if (value === undefined) {
    return fallback
  }

  return typeof value === 'string' && isInfiltrationProbeAction(value) ? value : undefined
}

function sanitizeInfiltrationEncounterCoverStance(
  value: unknown,
  fallback: CaseInstance['infiltrationEncounterCoverStance']
): CaseInstance['infiltrationEncounterCoverStance'] {
  if (value === undefined) {
    return fallback
  }

  return typeof value === 'string' && isInfiltrationEncounterCoverStance(value) ? value : undefined
}

function sanitizeInfiltrationProbePlanField(
  value: unknown,
  fallback: CaseInstance['infiltrationProbePlan']
): CaseInstance['infiltrationProbePlan'] {
  if (value === undefined) {
    return fallback
  }

  return buildInfiltrationProbePlanFromAuthoredRecord(value) ?? undefined
}

function sanitizeMapSymbolRouteEffect(value: unknown): MapSymbolRouteEffect | null {
  if (value === null) {
    return null
  }

  if (!isRecord(value)) {
    return null
  }

  const passRestriction =
    value.passRestriction === 'single-file' || value.passRestriction === 'one-way'
      ? value.passRestriction
      : null
  const visibilityMod =
    typeof value.visibilityMod === 'number' && Number.isFinite(value.visibilityMod)
      ? Math.trunc(value.visibilityMod)
      : 0

  return { passRestriction, visibilityMod }
}

function sanitizeMapSymbol(value: unknown): MapSymbol | null {
  if (!isRecord(value) || typeof value.id !== 'string' || value.id.length === 0) {
    return null
  }

  return {
    id: value.id,
    glyph: typeof value.glyph === 'string' && value.glyph.length > 0 ? value.glyph : '?',
    name: typeof value.name === 'string' && value.name.length > 0 ? value.name : value.id,
    interactionHint: typeof value.interactionHint === 'string' ? value.interactionHint : '',
    hiddenUntilReveal:
      typeof value.hiddenUntilReveal === 'boolean' ? value.hiddenUntilReveal : false,
    routeEffect: sanitizeMapSymbolRouteEffect(value.routeEffect),
  }
}

function filterKnownIds(ids: unknown, knownIds: Set<string>): string[] {
  if (!Array.isArray(ids)) {
    return []
  }

  return ids.filter((id): id is string => typeof id === 'string' && knownIds.has(id))
}

/** Hydration 386: validate map-layer cross-refs; strip dangling symbol/route/anchor refs. */
function sanitizeMapLayer(
  value: unknown,
  fallback: CaseInstance['mapLayer']
): CaseInstance['mapLayer'] {
  if (value === undefined) {
    return fallback
  }

  if (!isRecord(value) || !isOneOf(value.authoringMode, MAP_AUTHORING_MODES)) {
    return undefined
  }

  const legend = (Array.isArray(value.legend) ? value.legend : [])
    .map((symbol) => sanitizeMapSymbol(symbol))
    .filter((symbol): symbol is MapSymbol => symbol !== null)

  if (legend.length === 0) {
    return undefined
  }

  const legendIds = new Set(legend.map((symbol) => symbol.id))

  const zones: ZoneAnnotation[] = (Array.isArray(value.zones) ? value.zones : [])
    .map((zone): ZoneAnnotation | null => {
      if (!isRecord(zone) || typeof zone.id !== 'string' || zone.id.length === 0) {
        return null
      }

      return {
        id: zone.id,
        name: typeof zone.name === 'string' && zone.name.length > 0 ? zone.name : zone.id,
        symbolIds: filterKnownIds(zone.symbolIds, legendIds),
        hiddenSymbolIds: filterKnownIds(zone.hiddenSymbolIds, legendIds),
        ...(isOneOf(zone.depthBand, ZONE_DEPTH_BANDS) ? { depthBand: zone.depthBand } : {}),
      }
    })
    .filter((zone): zone is ZoneAnnotation => zone !== null)

  const routes: RouteAnnotation[] = (Array.isArray(value.routes) ? value.routes : [])
    .map((route): RouteAnnotation | null => {
      if (!isRecord(route) || typeof route.id !== 'string' || route.id.length === 0) {
        return null
      }

      if (!isOneOf(route.routeClass, ROUTE_CLASSES)) {
        return null
      }

      return {
        id: route.id,
        label: typeof route.label === 'string' && route.label.length > 0 ? route.label : route.id,
        routeClass: route.routeClass,
        activeSymbolIds: filterKnownIds(route.activeSymbolIds, legendIds),
      }
    })
    .filter((route): route is RouteAnnotation => route !== null)

  if (zones.length === 0 || routes.length === 0) {
    return undefined
  }

  const zoneIds = new Set(zones.map((zone) => zone.id))
  const routeIds = new Set(routes.map((route) => route.id))

  const scaleAnchors: ScaleAnchor[] = (Array.isArray(value.scaleAnchors) ? value.scaleAnchors : [])
    .map((anchor): ScaleAnchor | null => {
      if (!isRecord(anchor) || typeof anchor.id !== 'string' || anchor.id.length === 0) {
        return null
      }

      if (
        !isOneOf(anchor.fromDepthBand, ZONE_DEPTH_BANDS) ||
        !isOneOf(anchor.toDepthBand, ZONE_DEPTH_BANDS) ||
        !isOneOf(anchor.accessTier, SCALE_ACCESS_TIERS) ||
        typeof anchor.fromZoneId !== 'string' ||
        typeof anchor.toZoneId !== 'string' ||
        typeof anchor.routeId !== 'string' ||
        !zoneIds.has(anchor.fromZoneId) ||
        !zoneIds.has(anchor.toZoneId) ||
        !routeIds.has(anchor.routeId)
      ) {
        return null
      }

      return {
        id: anchor.id,
        fromDepthBand: anchor.fromDepthBand,
        toDepthBand: anchor.toDepthBand,
        fromZoneId: anchor.fromZoneId,
        toZoneId: anchor.toZoneId,
        routeId: anchor.routeId,
        accessTier: anchor.accessTier,
      }
    })
    .filter((anchor): anchor is ScaleAnchor => anchor !== null)

  const occupierKnownRouteIds = filterKnownIds(value.occupierKnownRouteIds, routeIds)

  const sanitized: MapLayerResult = {
    authoringMode: value.authoringMode,
    legend,
    zones,
    routes,
    occupierKnownRouteIds,
    scaleAnchors,
  }

  return sanitized
}

function sanitizeLocalRuleOverride(value: unknown): LocalRuleOverride | null {
  if (!isRecord(value) || !isOneOf(value.domain, LOCAL_RULE_DOMAINS)) {
    return null
  }

  const override: LocalRuleOverride = { domain: value.domain }

  if (typeof value.suppressedFlag === 'string' && value.suppressedFlag.length > 0) {
    override.suppressedFlag = value.suppressedFlag
  }
  if (typeof value.addedFlag === 'string' && value.addedFlag.length > 0) {
    override.addedFlag = value.addedFlag
  }
  if (typeof value.deltaConcealment === 'number' && Number.isFinite(value.deltaConcealment)) {
    override.deltaConcealment = Math.trunc(value.deltaConcealment)
  }
  if (typeof value.blocksExit === 'boolean') {
    override.blocksExit = value.blocksExit
  }

  return override
}

function sanitizeRoomEscalationTrigger(value: unknown): RoomEscalationTrigger | null {
  if (!isRecord(value) || !isOneOf(value.activator, ROOM_ESCALATION_ACTIVATORS)) {
    return null
  }

  const threshold = sanitizeInteger(value.threshold, 0, 1, 999)
  const resultKind = isOneOf(value.resultKind, WEIRD_ROOM_KINDS) ? value.resultKind : null

  if (!resultKind) {
    return null
  }

  const addedOverrides = (Array.isArray(value.addedOverrides) ? value.addedOverrides : [])
    .map((entry) => sanitizeLocalRuleOverride(entry))
    .filter((entry): entry is LocalRuleOverride => entry !== null)

  return {
    activator: value.activator,
    threshold,
    resultKind,
    addedOverrides,
  }
}

/** Hydration 387: drop malformed weird-room packets; clamp counters and kinds. */
function sanitizeWeirdRoomPackets(
  value: unknown,
  fallback: CaseInstance['weirdRoomPackets']
): CaseInstance['weirdRoomPackets'] {
  if (value === undefined) {
    return fallback
  }

  if (!Array.isArray(value)) {
    return undefined
  }

  const packets: WeirdRoomPacket[] = []

  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.id !== 'string' || entry.id.length === 0) {
      continue
    }

    if (!isOneOf(entry.kind, WEIRD_ROOM_KINDS)) {
      continue
    }

    const overrides = (Array.isArray(entry.overrides) ? entry.overrides : [])
      .map((override) => sanitizeLocalRuleOverride(override))
      .filter((override): override is LocalRuleOverride => override !== null)

    const escalationTriggers = (
      Array.isArray(entry.escalationTriggers) ? entry.escalationTriggers : []
    )
      .map((trigger) => sanitizeRoomEscalationTrigger(trigger))
      .filter((trigger): trigger is RoomEscalationTrigger => trigger !== null)

    const packet: WeirdRoomPacket = {
      id: entry.id,
      kind: entry.kind,
      overrides,
      escalationTriggers,
      hiddenFromSurface: entry.hiddenFromSurface === true,
      dwellCount: sanitizeInteger(entry.dwellCount, 0, 0, 9999),
      disturbanceCount: sanitizeInteger(entry.disturbanceCount, 0, 0, 9999),
      stagedInteractionCount: sanitizeInteger(entry.stagedInteractionCount, 0, 0, 9999),
    }

    if (typeof entry.revealedAt === 'number' && Number.isFinite(entry.revealedAt)) {
      packet.revealedAt = sanitizeInteger(entry.revealedAt, 0, 0, 9999)
    }

    packets.push(packet)
  }

  return packets.length > 0 ? packets : undefined
}

/** Hydration 388: narrow case.contract to ActiveContractRuntime keys; strip unknown fields. */
function sanitizeCaseContractPayload(
  value: unknown,
  fallback: CaseInstance['contract']
): CaseInstance['contract'] {
  if (value === undefined) {
    return fallback
  }

  if (!isRecord(value)) {
    return undefined
  }

  const next: ActiveContractRuntime = {}

  if (typeof value.contractId === 'string' && value.contractId.length > 0) {
    next.contractId = value.contractId
  }
  if (typeof value.offerId === 'string' && value.offerId.length > 0) {
    next.offerId = value.offerId
  }
  if (typeof value.caseId === 'string' && value.caseId.length > 0) {
    next.caseId = value.caseId
  }
  if (typeof value.templateId === 'string' && value.templateId.length > 0) {
    next.templateId = value.templateId
  }
  if (typeof value.startedWeek === 'number' && Number.isFinite(value.startedWeek)) {
    next.startedWeek = sanitizeInteger(value.startedWeek, 1, 1, 9999)
  }
  if (typeof value.name === 'string' && value.name.length > 0) {
    next.name = value.name
  }
  if (typeof value.description === 'string') {
    next.description = value.description
  }
  if (typeof value.factionId === 'string' && value.factionId.length > 0) {
    next.factionId = value.factionId
  }
  if (typeof value.contactId === 'string' && value.contactId.length > 0) {
    next.contactId = value.contactId
  }
  if (isOneOf(value.strategyTag, CONTRACT_STRATEGY_TAGS)) {
    next.strategyTag = value.strategyTag
  }
  if (isOneOf(value.riskLevel, CONTRACT_RISK_LEVELS)) {
    next.riskLevel = value.riskLevel
  }
  if (isRecord(value.caseDifficulty)) {
    next.caseDifficulty = {
      combat: sanitizeInteger(value.caseDifficulty.combat, 1, 1, 99),
      investigation: sanitizeInteger(value.caseDifficulty.investigation, 1, 1, 99),
      utility: sanitizeInteger(value.caseDifficulty.utility, 1, 1, 99),
      social: sanitizeInteger(value.caseDifficulty.social, 1, 1, 99),
    }
  }
  if (isRecord(value.rewards)) {
    const rewards: ActiveContractRuntime['rewards'] = {
      funding: sanitizeInteger(value.rewards.funding, 0, 0, 999999),
    }
    if (Array.isArray(value.rewards.materials)) {
      rewards.materials = value.rewards.materials
        .filter(
          (drop): drop is NonNullable<typeof drop> =>
            isRecord(drop) && typeof drop.itemId === 'string'
        )
        .map((drop) => ({
          itemId: drop.itemId,
          label: typeof drop.label === 'string' ? drop.label : drop.itemId,
          quantity: sanitizeInteger(drop.quantity, 1, 1, 999),
        }))
    }
    if (Array.isArray(value.rewards.research)) {
      rewards.research = value.rewards.research
        .filter(
          (unlock): unlock is NonNullable<typeof unlock> =>
            isRecord(unlock) && typeof unlock.id === 'string'
        )
        .map((unlock) => ({
          id: unlock.id,
          label: typeof unlock.label === 'string' ? unlock.label : unlock.id,
          ...(typeof unlock.description === 'string' ? { description: unlock.description } : {}),
        }))
    }
    next.rewards = rewards
  }
  if (typeof value.lootTableId === 'string' && value.lootTableId.length > 0) {
    next.lootTableId = value.lootTableId
  }
  if (isRecord(value.requirements)) {
    next.requirements = {
      recommendedClasses: Array.isArray(value.requirements.recommendedClasses)
        ? value.requirements.recommendedClasses.filter(
            (entry): entry is string => typeof entry === 'string'
          )
        : [],
      discouragedClasses: Array.isArray(value.requirements.discouragedClasses)
        ? value.requirements.discouragedClasses.filter(
            (entry): entry is string => typeof entry === 'string'
          )
        : [],
    }
  }
  if (Array.isArray(value.modifiers)) {
    next.modifiers = value.modifiers
      .filter(
        (modifier): modifier is NonNullable<typeof modifier> =>
          isRecord(modifier) && typeof modifier.id === 'string'
      )
      .map((modifier) => ({
        id: modifier.id,
        label: typeof modifier.label === 'string' ? modifier.label : modifier.id,
        ...(typeof modifier.description === 'string' ? { description: modifier.description } : {}),
      }))
  }
  if (isRecord(value.chain)) {
    const chain: NonNullable<ActiveContractRuntime['chain']> = {}
    if (Array.isArray(value.chain.nextContracts)) {
      chain.nextContracts = value.chain.nextContracts.filter(
        (contractId): contractId is string =>
          typeof contractId === 'string' && contractId.length > 0
      )
    }
    if (Array.isArray(value.chain.unlockConditions)) {
      chain.unlockConditions = value.chain.unlockConditions
        .filter((condition): condition is Record<string, unknown> => isRecord(condition))
        .map((condition) => ({ ...condition }))
    }
    if (Object.keys(chain).length > 0) {
      next.chain = chain
    }
  }

  const fieldBase = sanitizePersistedFieldBasePacket(value.fieldBase)
  if (fieldBase) {
    next.fieldBase = fieldBase
  } else if (
    isRecord(value.fieldBase) &&
    isRecord((value.fieldBase as { quality?: unknown }).quality)
  ) {
    const quality = sanitizeFieldBaseQualityBands(
      (value.fieldBase as { quality?: unknown }).quality
    )
    const label =
      typeof (value.fieldBase as { label?: unknown }).label === 'string'
        ? (value.fieldBase as { label: string }).label.trim()
        : ''
    if (label) {
      next.fieldBase = { label, quality }
    }
  }

  return Object.keys(next).length > 0 ? next : undefined
}

function sanitizeFiniteStatValue(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return clamp(Math.trunc(value), min, max)
  }

  return clamp(Math.trunc(fallback), min, max)
}

/** Hydration 392: coerce difficulty StatBlock with required keys and finite values. */
function sanitizeCaseDifficultyBlock(value: unknown, fallback: StatBlock): StatBlock {
  const raw = isRecord(value) ? value : {}

  return {
    combat: sanitizeFiniteStatValue(raw.combat, fallback.combat, 0, BASE_STAT_MAX),
    investigation: sanitizeFiniteStatValue(
      raw.investigation,
      fallback.investigation,
      0,
      BASE_STAT_MAX
    ),
    utility: sanitizeFiniteStatValue(raw.utility, fallback.utility, 0, BASE_STAT_MAX),
    social: sanitizeFiniteStatValue(raw.social, fallback.social, 0, BASE_STAT_MAX),
  }
}

/** Hydration 392: coerce weights WeightBlock with required keys and unit-interval values. */
function sanitizeCaseWeightBlock(value: unknown, fallback: WeightBlock): WeightBlock {
  const raw = isRecord(value) ? value : {}

  return CASE_STAT_KEYS.reduce((weights, key) => {
    weights[key] = sanitizeUnitInterval(raw[key], fallback[key])
    return weights
  }, {} as WeightBlock)
}

/** Hydration 393: whitelist TeamCoverageRole entries and dedupe. */
function sanitizeRequiredRolesField(
  value: unknown,
  fallback: CaseInstance['requiredRoles']
): CaseInstance['requiredRoles'] {
  if (value === undefined) {
    return fallback
  }

  if (!Array.isArray(value)) {
    return undefined
  }

  const roles = [
    ...new Set(
      value.filter(
        (role): role is TeamCoverageRole =>
          typeof role === 'string' && (TEAM_COVERAGE_ROLES as readonly string[]).includes(role)
      )
    ),
  ]

  // Important for save/load invariance: if the persisted shape includes
  // `requiredRoles: []`, keep it as an explicit empty array rather than
  // dropping to `undefined` (which triggers default fallback required roles).
  if (value.length === 0) {
    return []
  }

  return roles.length > 0 ? roles : undefined
}

function sanitizeConsequenceKeyList(value: unknown): ConsequenceKey[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const keys = [
    ...new Set(
      value.filter(
        (key): key is ConsequenceKey => typeof key === 'string' && CONSEQUENCE_KEY_SET.has(key)
      )
    ),
  ]

  return keys.length > 0 ? keys : undefined
}

/** Hydration 394: bounded escalation consequence fields. */
function sanitizeEscalationConsequenceFields(
  entry: Record<string, unknown>,
  fallback: CaseInstance
): Pick<CaseInstance, 'consequences' | 'severeHit' | 'escalationBand'> {
  const consequences =
    entry.consequences === undefined
      ? fallback.consequences
      : sanitizeConsequenceKeyList(entry.consequences)
  const severeHit =
    entry.severeHit === undefined ? fallback.severeHit : sanitizeConsequenceKeyList(entry.severeHit)
  const escalationBand = isOneOf(entry.escalationBand, OUTCOME_BANDS)
    ? entry.escalationBand
    : entry.escalationBand === undefined
      ? fallback.escalationBand
      : undefined

  return {
    ...(consequences !== undefined ? { consequences } : {}),
    ...(severeHit !== undefined ? { severeHit } : {}),
    ...(escalationBand !== undefined ? { escalationBand } : {}),
  }
}

/** Hydration 389: normalize infiltration cover profile bounds and deduped route tags. */
function sanitizeInfiltrationCoverProfileField(
  value: unknown,
  fallback: CaseInstance['infiltrationCoverProfile']
): CaseInstance['infiltrationCoverProfile'] {
  if (value === undefined) {
    return fallback
  }

  return buildInfiltrationCoverProfileFromAuthoredRecord(value) ?? undefined
}

/** Hydration 390: normalize concealment trigger rows (mode, when, confidence, displacement). */
function sanitizeConcealmentTriggersField(
  value: unknown,
  fallback: CaseInstance['concealmentTriggers']
): CaseInstance['concealmentTriggers'] {
  if (value === undefined) {
    return fallback
  }

  const normalized = buildConcealmentActivationTriggersFromAuthored(value)
  return normalized.length > 0 ? normalized : undefined
}

/** Hydration 391: keep stealth leave-behind ids only when present in the registry. */
function sanitizeStealthLeaveBehindIdField(
  value: unknown,
  fallback: CaseInstance['stealthLeaveBehindId']
): CaseInstance['stealthLeaveBehindId'] {
  if (value === undefined) {
    return fallback
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  return getStealthLeaveBehindById(DEFAULT_STEALTH_LEAVE_BEHIND_REGISTRY, trimmed)
    ? trimmed
    : undefined
}

function sanitizeOptionalCaseId(value: unknown, fallback: string | undefined): string | undefined {
  if (value === undefined) {
    return fallback
  }

  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/** SPE-1310 slice 2: accept known lifecycle stages; drop unknown strings without throw. */
export function sanitizeCaseLifecycleStage(
  value: unknown,
  fallback: CaseInstance['lifecycleStage']
): CaseInstance['lifecycleStage'] | undefined {
  if (value === undefined) {
    return fallback
  }

  return isOneOf(value, CASE_LIFECYCLE_STAGES) ? value : undefined
}

/** SPE-1310 slice 5: accept known containment policy tiers; drop unknown strings without throw. */
export function sanitizeContainmentPolicyTier(
  value: unknown,
  fallback: CaseInstance['containmentPolicyTier']
): CaseInstance['containmentPolicyTier'] | undefined {
  if (value === undefined) {
    return fallback
  }

  return isContainmentPolicyTier(value) && isOneOf(value, CONTAINMENT_POLICY_TIERS)
    ? value
    : undefined
}

/** SPE-1310 slice 6: accept known institutional labels; drop unknown strings without throw. */
export function sanitizeCaseLifecycleInstitutionalLabel(
  value: unknown,
  fallback: CaseInstance['lifecycleInstitutionalLabel']
): CaseInstance['lifecycleInstitutionalLabel'] | undefined {
  if (value === undefined) {
    return fallback
  }

  return isCaseLifecycleInstitutionalLabel(value) &&
    isOneOf(value, CASE_LIFECYCLE_INSTITUTIONAL_LABELS)
    ? value
    : undefined
}

function sanitizeLifecycleDueWeekField(
  value: unknown,
  fallback: CaseInstance['lifecycleSurveillanceDueWeek']
): CaseInstance['lifecycleSurveillanceDueWeek'] | undefined {
  if (value === undefined) {
    return fallback
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }

  const truncated = Math.trunc(value)
  if (truncated < 1) {
    return undefined
  }

  return truncated
}

function sanitizeDeploymentCarryInByAgentId(
  value: unknown,
  context: {
    assignedTeamIds: string[]
    teams: GameState['teams']
    agents: GameState['agents']
    week: number
    caseData: Pick<CaseInstance, 'status' | 'weeksRemaining' | 'durationWeeks'>
    fallback?: Record<Id, AgentDeploymentCarryInStamp>
  }
): Record<Id, AgentDeploymentCarryInStamp> | undefined {
  if (!shouldRetainDeploymentCarryIn(context.caseData)) {
    return undefined
  }

  if (!isRecord(value)) {
    return undefined
  }

  const rosterAgentIds = collectAssignedAgentIds(context.assignedTeamIds, context.teams)
  const next: Record<Id, AgentDeploymentCarryInStamp> = {}

  for (const [agentId, stampValue] of Object.entries(value)) {
    if (!rosterAgentIds.has(agentId) || !context.agents[agentId] || !isRecord(stampValue)) {
      continue
    }

    const code = isOneOf(stampValue.code, DEPLOYMENT_CARRY_IN_CODES) ? stampValue.code : undefined
    const readinessDelta =
      typeof stampValue.readinessDelta === 'number' && Number.isFinite(stampValue.readinessDelta)
        ? clamp(Math.trunc(stampValue.readinessDelta), -20, 20)
        : undefined
    const stampedWeek = sanitizeInteger(stampValue.stampedWeek, context.week, 1, context.week)

    if (!code || readinessDelta === undefined) {
      continue
    }

    next[agentId] = {
      code,
      readinessDelta,
      stampedWeek,
    }
  }

  return Object.keys(next).length > 0 ? next : undefined
}

export interface NormalizeCaseContext {
  week: number
  teams: GameState['teams']
  agents?: GameState['agents']
  /** Hydration 396: catalog keys used to validate templateId and spawn regen targets. */
  knownTemplateIds?: ReadonlySet<string>
  /** Hydration 404/406: template catalog for blank copy and threatFamily fallback. */
  templates?: Readonly<Record<string, CaseTemplate>>
}

export function normalizeCaseInstance(
  caseId: string,
  entry: Record<string, unknown>,
  fallbackCase: CaseInstance | undefined,
  context: NormalizeCaseContext
): CaseInstance {
  const fallback =
    fallbackCase ??
    ({
      id: caseId,
      templateId: caseId,
      title: caseId,
      description: '',
      mode: 'threshold',
      kind: 'case',
      status: 'open',
      difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
      weights: { combat: 1, investigation: 1, utility: 1, social: 1 },
      tags: [],
      requiredTags: [],
      preferredTags: [],
      stage: 1,
      durationWeeks: 1,
      deadlineWeeks: 1,
      deadlineRemaining: 1,
      assignedTeamIds: [],
      onFail: { stageDelta: 0, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
      onUnresolved: { stageDelta: 0, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
    } satisfies CaseInstance)

  const rawTemplateId =
    typeof entry.templateId === 'string' && entry.templateId.length > 0
      ? entry.templateId
      : fallback.templateId
  let { templateId: resolvedTemplateId, catalogKnown } = resolveHydratedCaseTemplateId(
    rawTemplateId,
    context.knownTemplateIds
  )
  if (!catalogKnown) {
    const fallbackTemplate = resolveHydratedCaseTemplateId(
      fallback.templateId,
      context.knownTemplateIds
    )

    if (fallbackTemplate.catalogKnown) {
      resolvedTemplateId = fallbackTemplate.templateId
      catalogKnown = true
    }
  }
  const templateRecord = context.templates?.[resolvedTemplateId]

  const titleFallback = sanitizeBoundedRequiredText(
    templateRecord?.title,
    fallback.title || caseId,
    MAX_CASE_TITLE_LENGTH
  )
  const descriptionFallback = sanitizeBoundedRequiredText(
    templateRecord?.description,
    fallback.description,
    MAX_CASE_DESCRIPTION_LENGTH
  )

  const mode = isOneOf(entry.mode, CASE_MODES) ? entry.mode : fallback.mode
  const kind = isOneOf(entry.kind, CASE_KINDS) ? entry.kind : fallback.kind
  const status = isOneOf(entry.status, CASE_STATUSES) ? entry.status : fallback.status

  const durationWeeks = sanitizeInteger(entry.durationWeeks, fallback.durationWeeks, 1, 52)
  const deadlineWeeks = sanitizeInteger(entry.deadlineWeeks, fallback.deadlineWeeks, 0, 52)

  let deadlineRemaining = sanitizeInteger(
    entry.deadlineRemaining,
    fallback.deadlineRemaining,
    0,
    deadlineWeeks
  )

  let weeksRemaining: number | undefined
  if (status === 'in_progress') {
    weeksRemaining = sanitizeInteger(
      entry.weeksRemaining,
      fallback.weeksRemaining ?? durationWeeks,
      0,
      durationWeeks
    )
  }

  if (status === 'resolved') {
    deadlineRemaining = 0
    weeksRemaining = undefined
  } else if (status === 'open') {
    weeksRemaining = undefined
    deadlineRemaining = sanitizeInteger(
      entry.deadlineRemaining,
      fallback.deadlineRemaining ?? deadlineWeeks,
      0,
      deadlineWeeks
    )
  }

  const teamIds = new Set(Object.keys(context.teams))
  let assignedTeamIds = [
    ...new Set(
      (Array.isArray(entry.assignedTeamIds)
        ? entry.assignedTeamIds
        : fallback.assignedTeamIds
      ).filter((teamId): teamId is string => typeof teamId === 'string' && teamIds.has(teamId))
    ),
  ]

  const raid =
    kind === 'raid'
      ? sanitizeRaidBounds(entry.raid, fallback.raid)
      : entry.raid !== undefined && isRecord(entry.raid)
        ? sanitizeRaidBounds(entry.raid, fallback.raid)
        : fallback.raid

  const maxTeams = kind === 'raid' ? (raid?.maxTeams ?? DEFAULT_RAID_BOUNDS.maxTeams) : 1
  assignedTeamIds = assignedTeamIds.slice(0, maxTeams)
  if (kind !== 'raid' && assignedTeamIds.length > 1) {
    assignedTeamIds = assignedTeamIds.slice(0, 1)
  }

  const hiddenFields = sanitizeHiddenDisplacementFields(entry, fallback)
  const beliefTracks = sanitizeBeliefTracks(entry.beliefTracks, fallback.beliefTracks)
  const distortion = sanitizeDistortionField(entry.distortion, fallback.distortion)
  const infiltrationProbePlan = sanitizeInfiltrationProbePlanField(
    entry.infiltrationProbePlan,
    fallback.infiltrationProbePlan
  )
  const infiltrationWeeklyProbeActionOverride = sanitizeInfiltrationWeeklyProbeActionOverride(
    entry.infiltrationWeeklyProbeActionOverride,
    fallback.infiltrationWeeklyProbeActionOverride
  )
  const infiltrationEncounterCoverStance = sanitizeInfiltrationEncounterCoverStance(
    entry.infiltrationEncounterCoverStance,
    fallback.infiltrationEncounterCoverStance
  )
  const mapLayer = catalogKnown ? sanitizeMapLayer(entry.mapLayer, fallback.mapLayer) : undefined
  const weirdRoomPackets = catalogKnown
    ? sanitizeWeirdRoomPackets(entry.weirdRoomPackets, fallback.weirdRoomPackets)
    : undefined
  const contract = sanitizeCaseContractPayload(entry.contract, fallback.contract)
  const difficulty = sanitizeCaseDifficultyBlock(entry.difficulty, fallback.difficulty)
  const weights = sanitizeCaseWeightBlock(entry.weights, fallback.weights)
  const requiredRoles = sanitizeRequiredRolesField(entry.requiredRoles, fallback.requiredRoles)
  const escalationConsequences = sanitizeEscalationConsequenceFields(entry, fallback)
  const infiltrationCoverProfile = sanitizeInfiltrationCoverProfileField(
    entry.infiltrationCoverProfile,
    fallback.infiltrationCoverProfile
  )
  const concealmentTriggers = sanitizeConcealmentTriggersField(
    entry.concealmentTriggers,
    fallback.concealmentTriggers
  )
  const stealthLeaveBehindId = sanitizeStealthLeaveBehindIdField(
    entry.stealthLeaveBehindId,
    fallback.stealthLeaveBehindId
  )
  const factionId = sanitizeOptionalCaseId(entry.factionId, fallback.factionId)
  const contactId = sanitizeOptionalCaseId(entry.contactId, fallback.contactId)
  const tags = entry.tags !== undefined ? sanitizeTagList(entry.tags) : fallback.tags
  const requiredTags =
    entry.requiredTags !== undefined ? sanitizeTagList(entry.requiredTags) : fallback.requiredTags
  const preferredTags =
    entry.preferredTags !== undefined
      ? sanitizeTagList(entry.preferredTags)
      : fallback.preferredTags
  const spatialFlags =
    entry.spatialFlags !== undefined
      ? sanitizeSpatialFlagsList(entry.spatialFlags)
      : fallback.spatialFlags
  const pressureValue = sanitizePressureValueField(entry.pressureValue, fallback.pressureValue)
  const regionTag = sanitizeRegionTagField(entry.regionTag, fallback.regionTag)
  const intelLastUpdatedWeek = sanitizeIntelLastUpdatedWeekField(
    entry.intelLastUpdatedWeek,
    context.week,
    fallback.intelLastUpdatedWeek
  )
  const departmentWorkshopCompletionWorkOrderIds = sanitizeDepartmentWorkshopCompletionWorkOrderIds(
    entry.departmentWorkshopCompletionWorkOrderIds
  )
  const departmentWorkshopFinalizationRequest = sanitizeDepartmentWorkshopFinalizationRequest(
    entry.departmentWorkshopFinalizationRequest
  )
  const departmentWorkshopFinalizationHandoff = sanitizeDepartmentWorkshopFinalizationHandoff(
    entry.departmentWorkshopFinalizationHandoff
  )
  const onFail = filterSpawnTemplateIdsToCatalog(
    sanitizeSpawnRuleField(entry.onFail, fallback.onFail),
    context.knownTemplateIds
  )
  const onUnresolved = filterSpawnTemplateIdsToCatalog(
    sanitizeSpawnRuleField(entry.onUnresolved, fallback.onUnresolved),
    context.knownTemplateIds
  )

  const threatFamily = resolveHydratedThreatFamily(entry.threatFamily, templateRecord)
  const counterExplanation = sanitizeOptionalBoundedText(
    entry.counterExplanation,
    fallback.counterExplanation,
    MAX_CASE_COUNTER_EXPLANATION_LENGTH
  )
  const lifecycleStage =
    entry.lifecycleStage !== undefined
      ? sanitizeCaseLifecycleStage(entry.lifecycleStage, undefined)
      : undefined
  const containmentPolicyTier =
    entry.containmentPolicyTier !== undefined
      ? sanitizeContainmentPolicyTier(entry.containmentPolicyTier, undefined)
      : undefined
  const lifecycleSurveillanceDueWeek =
    entry.lifecycleSurveillanceDueWeek !== undefined
      ? sanitizeLifecycleDueWeekField(entry.lifecycleSurveillanceDueWeek, undefined)
      : undefined
  const lifecycleBreachReadinessDueWeek =
    entry.lifecycleBreachReadinessDueWeek !== undefined
      ? sanitizeLifecycleDueWeekField(entry.lifecycleBreachReadinessDueWeek, undefined)
      : undefined
  const lifecycleInstitutionalLabel =
    entry.lifecycleInstitutionalLabel !== undefined
      ? sanitizeCaseLifecycleInstitutionalLabel(entry.lifecycleInstitutionalLabel, undefined)
      : undefined

  const baseCase: CaseInstance = {
    ...fallback,
    ...hiddenFields,
    id: caseId,
    templateId: resolvedTemplateId,
    title: sanitizeBoundedRequiredText(entry.title, titleFallback, MAX_CASE_TITLE_LENGTH),
    description: sanitizeBoundedRequiredText(
      entry.description,
      descriptionFallback,
      MAX_CASE_DESCRIPTION_LENGTH
    ),
    mode,
    kind,
    status,
    difficulty,
    weights,
    stage: clamp(sanitizeInteger(entry.stage, fallback.stage, 1), 1, MAX_CASE_STAGE),
    durationWeeks,
    weeksRemaining,
    deadlineWeeks,
    deadlineRemaining,
    tags,
    requiredTags,
    preferredTags,
    ...(spatialFlags !== undefined ? { spatialFlags } : {}),
    ...(pressureValue !== undefined ? { pressureValue } : {}),
    ...(regionTag !== undefined ? { regionTag } : {}),
    ...(intelLastUpdatedWeek !== undefined ? { intelLastUpdatedWeek } : {}),
    assignedTeamIds,
    ...(departmentWorkshopCompletionWorkOrderIds !== undefined
      ? { departmentWorkshopCompletionWorkOrderIds }
      : {}),
    ...(departmentWorkshopFinalizationRequest !== undefined
      ? { departmentWorkshopFinalizationRequest }
      : {}),
    ...(departmentWorkshopFinalizationHandoff !== undefined
      ? { departmentWorkshopFinalizationHandoff }
      : {}),
    ...(kind === 'raid' && raid ? { raid } : {}),
    ...(isOneOf(entry.infiltrationStage, INFILTRATION_STAGES)
      ? { infiltrationStage: entry.infiltrationStage }
      : entry.infiltrationStage === undefined && fallback.infiltrationStage
        ? { infiltrationStage: fallback.infiltrationStage }
        : {}),
    ...(isOneOf(entry.siteLayer, SITE_LAYERS)
      ? { siteLayer: entry.siteLayer }
      : entry.siteLayer === undefined && fallback.siteLayer
        ? { siteLayer: fallback.siteLayer }
        : {}),
    ...(isOneOf(entry.visibilityState, VISIBILITY_STATES)
      ? { visibilityState: entry.visibilityState }
      : entry.visibilityState === undefined && fallback.visibilityState
        ? { visibilityState: fallback.visibilityState }
        : {}),
    ...(isOneOf(entry.transitionType, TRANSITION_TYPES)
      ? { transitionType: entry.transitionType }
      : entry.transitionType === undefined && fallback.transitionType
        ? { transitionType: fallback.transitionType }
        : {}),
    intelConfidence: sanitizeUnitInterval(entry.intelConfidence, fallback.intelConfidence ?? 1),
    intelUncertainty: sanitizeUnitInterval(entry.intelUncertainty, fallback.intelUncertainty ?? 0),
    detectionConfidence:
      hiddenFields.detectionConfidence ??
      (typeof entry.detectionConfidence === 'number'
        ? sanitizeUnitInterval(entry.detectionConfidence, 0)
        : undefined),
    infiltrationProbeProgress:
      entry.infiltrationProbeProgress === undefined
        ? fallback.infiltrationProbeProgress
        : sanitizeUnitInterval(
            entry.infiltrationProbeProgress,
            fallback.infiltrationProbeProgress ?? 0
          ),
    infiltrationAwareness:
      entry.infiltrationAwareness === undefined
        ? fallback.infiltrationAwareness
        : sanitizeUnitInterval(entry.infiltrationAwareness, fallback.infiltrationAwareness ?? 0),
    escalationLevel:
      entry.escalationLevel === undefined
        ? fallback.escalationLevel
        : sanitizeInteger(
            entry.escalationLevel,
            fallback.escalationLevel ?? 0,
            0,
            PRESSURE_CALIBRATION.maxCaseEscalationLevel
          ),
    threatDrift:
      entry.threatDrift === undefined
        ? fallback.threatDrift
        : sanitizeInteger(
            entry.threatDrift,
            fallback.threatDrift ?? 0,
            0,
            PRESSURE_CALIBRATION.maxCaseThreatDrift
          ),
    timePressure:
      entry.timePressure === undefined
        ? fallback.timePressure
        : sanitizeInteger(
            entry.timePressure,
            fallback.timePressure ?? 0,
            0,
            PRESSURE_CALIBRATION.maxCaseTimePressure
          ),
    onFail,
    onUnresolved,
    ...(threatFamily !== undefined ? { threatFamily } : {}),
    ...(counterExplanation !== undefined ? { counterExplanation } : {}),
    majorIncident: sanitizeMajorIncidentRuntime(entry.majorIncident, fallback.majorIncident),
    ...(beliefTracks !== undefined ? { beliefTracks } : {}),
    ...(distortion !== undefined ? { distortion } : {}),
    ...(infiltrationProbePlan !== undefined ? { infiltrationProbePlan } : {}),
    ...(infiltrationWeeklyProbeActionOverride !== undefined
      ? { infiltrationWeeklyProbeActionOverride }
      : {}),
    ...(infiltrationEncounterCoverStance !== undefined ? { infiltrationEncounterCoverStance } : {}),
    ...(mapLayer !== undefined ? { mapLayer } : {}),
    ...(weirdRoomPackets !== undefined ? { weirdRoomPackets } : {}),
    ...(contract !== undefined ? { contract } : {}),
    ...(requiredRoles !== undefined ? { requiredRoles } : {}),
    ...escalationConsequences,
    ...(infiltrationCoverProfile !== undefined ? { infiltrationCoverProfile } : {}),
    ...(concealmentTriggers !== undefined ? { concealmentTriggers } : {}),
    ...(stealthLeaveBehindId !== undefined ? { stealthLeaveBehindId } : {}),
    ...(factionId !== undefined ? { factionId } : {}),
    ...(contactId !== undefined ? { contactId } : {}),
    ...(lifecycleStage !== undefined ? { lifecycleStage } : {}),
    ...(containmentPolicyTier !== undefined ? { containmentPolicyTier } : {}),
    ...(lifecycleSurveillanceDueWeek !== undefined ? { lifecycleSurveillanceDueWeek } : {}),
    ...(lifecycleBreachReadinessDueWeek !== undefined ? { lifecycleBreachReadinessDueWeek } : {}),
    ...(lifecycleInstitutionalLabel !== undefined ? { lifecycleInstitutionalLabel } : {}),
    deploymentCarryInByAgentId:
      context.agents === undefined
        ? undefined
        : sanitizeDeploymentCarryInByAgentId(entry.deploymentCarryInByAgentId, {
            assignedTeamIds,
            teams: context.teams,
            agents: context.agents,
            week: context.week,
            caseData: { status, weeksRemaining, durationWeeks },
            fallback: fallback.deploymentCarryInByAgentId,
          }),
  }

  if (baseCase.majorIncident === undefined) {
    delete (baseCase as { majorIncident?: ActiveMajorIncidentRuntime }).majorIncident
  }

  if (baseCase.deploymentCarryInByAgentId === undefined) {
    delete (baseCase as { deploymentCarryInByAgentId?: Record<Id, AgentDeploymentCarryInStamp> })
      .deploymentCarryInByAgentId
  }

  if (kind !== 'raid') {
    delete (baseCase as { raid?: CaseInstance['raid'] }).raid
  }

  if (entry.hiddenState !== undefined && !isOneOf(entry.hiddenState, CASE_HIDDEN_STATES)) {
    delete (baseCase as { hiddenState?: CaseInstance['hiddenState'] }).hiddenState
  }

  if (
    entry.infiltrationStage !== undefined &&
    !isOneOf(entry.infiltrationStage, INFILTRATION_STAGES)
  ) {
    delete (baseCase as { infiltrationStage?: CaseInstance['infiltrationStage'] }).infiltrationStage
  }

  if (entry.siteLayer !== undefined && !isOneOf(entry.siteLayer, SITE_LAYERS)) {
    delete (baseCase as { siteLayer?: CaseInstance['siteLayer'] }).siteLayer
  }

  if (entry.visibilityState !== undefined && !isOneOf(entry.visibilityState, VISIBILITY_STATES)) {
    delete (baseCase as { visibilityState?: CaseInstance['visibilityState'] }).visibilityState
  }

  if (entry.transitionType !== undefined && !isOneOf(entry.transitionType, TRANSITION_TYPES)) {
    delete (baseCase as { transitionType?: CaseInstance['transitionType'] }).transitionType
  }

  if (baseCase.displacementTarget === null) {
    delete (baseCase as { displacementTarget?: Id | null }).displacementTarget
  }

  if (entry.beliefTracks !== undefined && !isRecord(entry.beliefTracks)) {
    delete (baseCase as { beliefTracks?: BeliefTrackState }).beliefTracks
  }

  if (entry.distortion !== undefined && distortion === undefined) {
    delete (baseCase as { distortion?: CaseInstance['distortion'] }).distortion
  }

  if (entry.infiltrationProbePlan !== undefined && infiltrationProbePlan === undefined) {
    delete (baseCase as { infiltrationProbePlan?: CaseInstance['infiltrationProbePlan'] })
      .infiltrationProbePlan
  }

  if (
    entry.infiltrationWeeklyProbeActionOverride !== undefined &&
    infiltrationWeeklyProbeActionOverride === undefined
  ) {
    delete (
      baseCase as {
        infiltrationWeeklyProbeActionOverride?: CaseInstance['infiltrationWeeklyProbeActionOverride']
      }
    ).infiltrationWeeklyProbeActionOverride
  }

  if (
    entry.infiltrationEncounterCoverStance !== undefined &&
    infiltrationEncounterCoverStance === undefined
  ) {
    delete (
      baseCase as {
        infiltrationEncounterCoverStance?: CaseInstance['infiltrationEncounterCoverStance']
      }
    ).infiltrationEncounterCoverStance
  }

  if (baseCase.status === 'resolved' && baseCase.infiltrationEncounterCoverStance !== undefined) {
    delete (
      baseCase as {
        infiltrationEncounterCoverStance?: CaseInstance['infiltrationEncounterCoverStance']
      }
    ).infiltrationEncounterCoverStance
  }

  if (entry.mapLayer !== undefined && mapLayer === undefined) {
    delete (baseCase as { mapLayer?: CaseInstance['mapLayer'] }).mapLayer
  }

  if (entry.weirdRoomPackets !== undefined && weirdRoomPackets === undefined) {
    delete (baseCase as { weirdRoomPackets?: CaseInstance['weirdRoomPackets'] }).weirdRoomPackets
  }

  if (entry.contract !== undefined && contract === undefined) {
    delete (baseCase as { contract?: CaseInstance['contract'] }).contract
  }

  if (entry.requiredRoles !== undefined && requiredRoles === undefined) {
    delete (baseCase as { requiredRoles?: CaseInstance['requiredRoles'] }).requiredRoles
  }

  if (entry.consequences !== undefined && escalationConsequences.consequences === undefined) {
    delete (baseCase as { consequences?: CaseInstance['consequences'] }).consequences
  }

  if (entry.severeHit !== undefined && escalationConsequences.severeHit === undefined) {
    delete (baseCase as { severeHit?: CaseInstance['severeHit'] }).severeHit
  }

  if (entry.escalationBand !== undefined && escalationConsequences.escalationBand === undefined) {
    delete (baseCase as { escalationBand?: CaseInstance['escalationBand'] }).escalationBand
  }

  if (entry.infiltrationCoverProfile !== undefined && infiltrationCoverProfile === undefined) {
    delete (baseCase as { infiltrationCoverProfile?: CaseInstance['infiltrationCoverProfile'] })
      .infiltrationCoverProfile
  }

  if (entry.concealmentTriggers !== undefined && concealmentTriggers === undefined) {
    delete (baseCase as { concealmentTriggers?: CaseInstance['concealmentTriggers'] })
      .concealmentTriggers
  }

  if (entry.stealthLeaveBehindId !== undefined && stealthLeaveBehindId === undefined) {
    delete (baseCase as { stealthLeaveBehindId?: CaseInstance['stealthLeaveBehindId'] })
      .stealthLeaveBehindId
  }

  if (entry.factionId !== undefined && factionId === undefined) {
    delete (baseCase as { factionId?: CaseInstance['factionId'] }).factionId
  }

  if (entry.contactId !== undefined && contactId === undefined) {
    delete (baseCase as { contactId?: CaseInstance['contactId'] }).contactId
  }

  if (entry.pressureValue !== undefined && pressureValue === undefined) {
    delete (baseCase as { pressureValue?: CaseInstance['pressureValue'] }).pressureValue
  }

  if (entry.regionTag !== undefined && regionTag === undefined) {
    delete (baseCase as { regionTag?: CaseInstance['regionTag'] }).regionTag
  }

  if (entry.intelLastUpdatedWeek !== undefined && intelLastUpdatedWeek === undefined) {
    delete (baseCase as { intelLastUpdatedWeek?: CaseInstance['intelLastUpdatedWeek'] })
      .intelLastUpdatedWeek
  }

  if (entry.spatialFlags !== undefined && spatialFlags === undefined) {
    delete (baseCase as { spatialFlags?: CaseInstance['spatialFlags'] }).spatialFlags
  }

  if (entry.threatFamily !== undefined && threatFamily === undefined) {
    delete (baseCase as { threatFamily?: CaseInstance['threatFamily'] }).threatFamily
  }

  if (entry.counterExplanation !== undefined && counterExplanation === undefined) {
    delete (baseCase as { counterExplanation?: CaseInstance['counterExplanation'] })
      .counterExplanation
  }

  if (
    entry.counterDetection !== undefined &&
    sanitizeCounterDetectionField(entry.counterDetection) === undefined
  ) {
    delete (baseCase as { counterDetection?: CaseInstance['counterDetection'] }).counterDetection
  }

  if (lifecycleStage === undefined) {
    delete (baseCase as { lifecycleStage?: CaseInstance['lifecycleStage'] }).lifecycleStage
  }

  if (containmentPolicyTier === undefined) {
    delete (baseCase as { containmentPolicyTier?: CaseInstance['containmentPolicyTier'] })
      .containmentPolicyTier
  }

  if (lifecycleSurveillanceDueWeek === undefined) {
    delete (
      baseCase as {
        lifecycleSurveillanceDueWeek?: CaseInstance['lifecycleSurveillanceDueWeek']
      }
    ).lifecycleSurveillanceDueWeek
  }

  if (lifecycleBreachReadinessDueWeek === undefined) {
    delete (
      baseCase as {
        lifecycleBreachReadinessDueWeek?: CaseInstance['lifecycleBreachReadinessDueWeek']
      }
    ).lifecycleBreachReadinessDueWeek
  }

  if (lifecycleInstitutionalLabel === undefined) {
    delete (
      baseCase as {
        lifecycleInstitutionalLabel?: CaseInstance['lifecycleInstitutionalLabel']
      }
    ).lifecycleInstitutionalLabel
  }

  if (!catalogKnown) {
    delete (baseCase as { mapLayer?: CaseInstance['mapLayer'] }).mapLayer
    delete (baseCase as { weirdRoomPackets?: CaseInstance['weirdRoomPackets'] }).weirdRoomPackets
  }

  delete (baseCase as { supportShortfall?: CaseInstance['supportShortfall'] }).supportShortfall

  return baseCase
}

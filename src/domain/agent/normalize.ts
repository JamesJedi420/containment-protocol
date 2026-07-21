// cspell:words callsign cooldown
import {
  buildAgentStatCaps,
  normalizePotentialIntel,
  normalizePotentialTier,
} from '../agentPotential'
import {
  createDefaultAgentAssignmentState,
  createDefaultAgentHistory,
  createDefaultAgentIdentity,
  createDefaultAgentProgression,
  createDefaultAgentSkillTree,
  createDefaultAgentServiceRecord,
  createDefaultAgentVitals,
  deriveAssignmentStatus,
  deriveDomainStatsFromBase,
} from '../agentDefaults'
import { clamp } from '../math'
import {
  PROGRESSION_MAX_LEVEL,
  PROGRESSION_MIN_LEVEL,
  reconcileAgentPromotedFields,
  reconcileProgressionXpGainedFields,
  synchronizeProgressionState,
} from '../progression'
import { cloneDomainStats } from '../statDomains'
import { createDefaultFatigueChannels } from '../agentFatigueChannels'
import { normalizeEnergyBudget } from '../responderEnergyBudget'
import { isAgentAttritionUnavailable } from './attrition'
import { getEquipmentCatalogEntries } from '../equipment'
import {
  PERFORMANCE_PENALTY_MULTIPLIER,
  reconcileAgentBetrayedFields,
} from '../sim/betrayal'
import { reconcileAgentRelationshipChangedFields } from '../sim/relationshipProjection'
import { ATTRITION_CALIBRATION } from '../sim/calibration'
import { getTrainingProgram, trainingCatalog } from '../../data/training'
import { getCertificationDefinitions } from '../sim/training-compat'
import type {
  AgentAttritionCategory,
  AgentAttritionState,
  AgentAttritionStatus,
  CaseInstance,
  Team,
} from '../models'
import { migrateEventV1toV2 } from '../events/eventMigration'
import {
  operationEventPayloadSchemas,
  validateOperationEventPayload,
} from '../events/eventValidation'
import { EVENT_TYPE_TO_SOURCE_SYSTEM } from '../events/types'
import { STAT_DOMAINS } from '../statDomains'
import type {
  Agent,
  AgentAbility,
  AgentAbilityEffect,
  AgentAbilityState,
  AgentAbilityTrigger,
  AgentAssignmentState,
  AgentDowntimeActivity,
  AgentDowntimeSideWorkLast,
  AgentFatigueChannels,
  AgentHistory,
  AgentHistoryEntry,
  AgentIdentity,
  AgentOverdriveState,
  AgentProgression,
  AgentReadinessProfile,
  AgentRecoveryStatus,
  AgentRole,
  AgentServiceRecord,
  AgentTraumaState,
  AgentTrait,
  AgentVitals,
  SkillTree,
  DomainStats,
  EquipmentSlots,
  TrustConsequenceEntry,
} from './models'
import type { OperationEvent, OperationEventType } from '../events/types'

const LEGACY_STAT_DOMAINS = ['combat', 'investigation', 'utility', 'social'] as const
const TRAIT_MODIFIER_KEYS = new Set<string>([
  ...LEGACY_STAT_DOMAINS,
  ...STAT_DOMAINS,
  'overall',
])
const VALID_OPERATION_EVENT_TYPES = new Set(
  Object.keys(operationEventPayloadSchemas) as OperationEventType[]
)
const AGENT_ABILITY_TRIGGERS = new Set<AgentAbilityTrigger>([
  'OnCaseStart',
  'OnThreatEncounter',
  'OnExposure',
  'OnStressGain',
  'OnTurnStart',
  'OnResolutionCheck',
  'OnLongCaseDurationCheck',
])
const RELATIONSHIP_MIN = -2
const RELATIONSHIP_MAX = 2
const AGENT_ROLES = new Set<AgentRole>([
  'hunter',
  'occultist',
  'investigator',
  'field_recon',
  'medium',
  'tech',
  'medic',
  'negotiator',
])
const RECOVERY_STATES = new Set<AgentRecoveryStatus['state']>([
  'healthy',
  'recovering',
  'traumatized',
  'incapacitated',
])
const DOWNTIME_ACTIVITIES = new Set<AgentDowntimeActivity['activity']>([
  'rest',
  'training',
  'therapy',
  'other',
  'coping',
  'sideWork',
  'sideWorkTrusted',
])
const TRUST_CONSEQUENCE_TYPES = new Set<TrustConsequenceEntry['consequenceType']>([
  'benching',
  'performance_penalty',
  'disciplinary',
  'resignation',
])
const SIDE_WORK_OPTION_IDS = new Set<AgentDowntimeSideWorkLast['optionId']>([
  'offBooksCourier',
  'trustedCourier',
])
const SIDE_WORK_OUTCOMES = new Set<AgentDowntimeSideWorkLast['outcome']>(['paid', 'lockout', 'denied'])
const SKILL_SPECIALIZATIONS = new Set<NonNullable<SkillTree['specialization']>>([
  'combat',
  'investigation',
  'utility',
  'social',
])
const AGENT_IDENTITY_MIN_AGE = 18
const AGENT_IDENTITY_MAX_AGE = 72
const PORTRAIT_ID_PATTERN = /^portrait-[a-z0-9-]+$/
const KNOWN_CERTIFICATION_IDS = new Set(
  getCertificationDefinitions().map((definition) => definition.certificationId)
)
const KNOWN_TRAINING_PROGRAM_IDS = new Set(
  trainingCatalog.map((program) => program.trainingId)
)
const TRAINING_HISTORY_MAX_ENTRIES = 24
const ATTRITION_STATUSES = new Set<AgentAttritionStatus>([
  'active',
  'at_risk',
  'temporarily_unavailable',
  'lost',
])
const ATTRITION_CATEGORIES = new Set<AgentAttritionCategory>([
  'injury_exit',
  'burnout',
  'temporary_leave',
  'disciplinary',
  'unknown',
])

let knownEquipmentIdsCache: Set<string> | undefined

function getKnownEquipmentIds() {
  if (!knownEquipmentIdsCache) {
    knownEquipmentIdsCache = new Set(
      getEquipmentCatalogEntries().map((definition) => definition.id)
    )
  }

  return knownEquipmentIdsCache
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function finiteNonNegativeNumber(value: unknown, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return Math.max(0, value)
}

function finiteNonNegativeInt(value: unknown, fallback: number) {
  return Math.max(0, Math.trunc(finiteNonNegativeNumber(value, fallback)))
}

function finiteLevel(value: unknown, fallback: number) {
  const level = finiteNonNegativeInt(value, fallback)
  return Math.min(PROGRESSION_MAX_LEVEL, Math.max(PROGRESSION_MIN_LEVEL, level || PROGRESSION_MIN_LEVEL))
}

function finiteWeekValue(value: unknown, fallback?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return Math.max(1, Math.trunc(value))
}

function normalizeIdentityString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizePortraitId(value: unknown) {
  const portraitId = normalizeIdentityString(value)
  return portraitId.length > 0 && PORTRAIT_ID_PATTERN.test(portraitId) ? portraitId : undefined
}

function normalizeAgentAge(value: unknown, fallback?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  const age = Math.trunc(value)
  if (age < AGENT_IDENTITY_MIN_AGE || age > AGENT_IDENTITY_MAX_AGE) {
    return fallback
  }

  return age
}

function isKnownCertificationProgressKey(key: string) {
  return KNOWN_CERTIFICATION_IDS.has(key)
}

function isKnownFailedAttemptKey(key: string) {
  if (KNOWN_TRAINING_PROGRAM_IDS.has(key)) {
    return true
  }

  if (key.startsWith('cert:')) {
    return KNOWN_CERTIFICATION_IDS.has(key.slice('cert:'.length))
  }

  return false
}

function isAllowedTimelineEventType(value: unknown): value is AgentHistoryEntry['eventType'] {
  return (
    value === 'simulation.weekly_tick' ||
    (typeof value === 'string' &&
      VALID_OPERATION_EVENT_TYPES.has(value as OperationEventType))
  )
}

function clampPercent(value: number, fallback = 0) {
  if (!Number.isFinite(value)) {
    return fallback
  }

  return clamp(Math.round(value), 0, 100)
}

export function normalizeAgentRole(role: Agent['role'] | undefined): AgentRole {
  if (typeof role === 'string' && AGENT_ROLES.has(role as AgentRole)) {
    return role as AgentRole
  }

  return 'investigator'
}

function normalizeLegacyStatValue(value: unknown, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return clamp(Math.round(value), 0, 100)
}

function normalizeBaseStats(
  baseStats: Agent['baseStats'] | undefined,
  fallback: Agent['baseStats']
): Agent['baseStats'] {
  return {
    combat: normalizeLegacyStatValue(baseStats?.combat, fallback.combat),
    investigation: normalizeLegacyStatValue(baseStats?.investigation, fallback.investigation),
    utility: normalizeLegacyStatValue(baseStats?.utility, fallback.utility),
    social: normalizeLegacyStatValue(baseStats?.social, fallback.social),
  }
}

function normalizeDomainStatGroup<T extends Record<string, number>>(
  group: T | undefined,
  fallback: T
): T {
  return Object.fromEntries(
    Object.keys(fallback).map((key) => [
      key,
      normalizeLegacyStatValue(group?.[key as keyof T], fallback[key as keyof T]),
    ])
  ) as T
}

function normalizeDomainStats(stats: DomainStats | undefined, fallback: DomainStats): DomainStats {
  if (!stats || typeof stats !== 'object') {
    return cloneDomainStats(fallback)
  }

  return {
    physical: normalizeDomainStatGroup(stats.physical, fallback.physical),
    tactical: normalizeDomainStatGroup(stats.tactical, fallback.tactical),
    cognitive: normalizeDomainStatGroup(stats.cognitive, fallback.cognitive),
    social: normalizeDomainStatGroup(stats.social, fallback.social),
    stability: normalizeDomainStatGroup(stats.stability, fallback.stability),
    technical: normalizeDomainStatGroup(stats.technical, fallback.technical),
  }
}

function normalizeRecoveryStatus(
  recoveryStatus: Agent['recoveryStatus'] | undefined
): AgentRecoveryStatus | undefined {
  if (!recoveryStatus || typeof recoveryStatus !== 'object') {
    return undefined
  }

  const state = recoveryStatus.state
  if (!RECOVERY_STATES.has(state)) {
    return undefined
  }

  const sinceWeek =
    typeof recoveryStatus.sinceWeek === 'number' && Number.isFinite(recoveryStatus.sinceWeek)
      ? Math.max(1, Math.trunc(recoveryStatus.sinceWeek))
      : 1

  return {
    state,
    sinceWeek,
    ...(typeof recoveryStatus.detail === 'string' && recoveryStatus.detail.length > 0
      ? { detail: recoveryStatus.detail }
      : {}),
  }
}

function normalizeTrauma(trauma: Agent['trauma'] | undefined): AgentTraumaState | undefined {
  if (!trauma || typeof trauma !== 'object') {
    return undefined
  }

  const traumaLevel = finiteNonNegativeNumber(trauma.traumaLevel, 0)
  const lastEventWeek =
    typeof trauma.lastEventWeek === 'number' && Number.isFinite(trauma.lastEventWeek)
      ? Math.max(1, Math.trunc(trauma.lastEventWeek))
      : 1
  const traumaTags = [
    ...new Set(
      (trauma.traumaTags ?? []).filter((tag): tag is string => typeof tag === 'string' && tag.length > 0)
    ),
  ]

  if (traumaLevel <= 0 && traumaTags.length === 0) {
    return undefined
  }

  return {
    traumaLevel,
    traumaTags,
    lastEventWeek,
  }
}

function normalizeDowntimeActivity(
  downtimeActivity: Agent['downtimeActivity'] | undefined
): AgentDowntimeActivity | undefined {
  if (!downtimeActivity || typeof downtimeActivity !== 'object') {
    return undefined
  }

  const activity = downtimeActivity.activity
  if (!DOWNTIME_ACTIVITIES.has(activity)) {
    return undefined
  }

  const sinceWeek =
    typeof downtimeActivity.sinceWeek === 'number' && Number.isFinite(downtimeActivity.sinceWeek)
      ? Math.max(1, Math.trunc(downtimeActivity.sinceWeek))
      : 1
  const foregoneThisInterval = [
    ...new Set(
      (downtimeActivity.foregoneThisInterval ?? []).filter((entry): entry is AgentDowntimeActivity['activity'] =>
        DOWNTIME_ACTIVITIES.has(entry as AgentDowntimeActivity['activity'])
      )
    ),
  ]

  return {
    activity,
    sinceWeek,
    ...(foregoneThisInterval.length > 0 ? { foregoneThisInterval } : {}),
  }
}

function normalizeDowntimeSideWorkLast(
  sideWorkLast: Agent['downtimeSideWorkLast'] | undefined
): AgentDowntimeSideWorkLast | undefined {
  if (!isRecord(sideWorkLast)) {
    return undefined
  }

  if (
    !SIDE_WORK_OPTION_IDS.has(sideWorkLast.optionId) ||
    !SIDE_WORK_OUTCOMES.has(sideWorkLast.outcome)
  ) {
    return undefined
  }

  const week =
    typeof sideWorkLast.week === 'number' && Number.isFinite(sideWorkLast.week)
      ? Math.max(1, Math.trunc(sideWorkLast.week))
      : 1

  return {
    week,
    optionId: sideWorkLast.optionId,
    outcome: sideWorkLast.outcome,
    fundingDelta: finiteNonNegativeNumber(sideWorkLast.fundingDelta, 0),
    fatigueDelta: finiteNonNegativeNumber(sideWorkLast.fatigueDelta, 0),
  }
}

function normalizeCopingStreak(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined
  }

  const streak = Math.max(0, Math.trunc(value))
  return streak > 0 ? streak : undefined
}

function normalizeFatigueChannels(
  channels: Agent['fatigueChannels'] | undefined
): AgentFatigueChannels | undefined {
  if (!channels || typeof channels !== 'object') {
    return undefined
  }

  const fallback = createDefaultFatigueChannels()
  const normalized = {
    physicalExhaustion: clampPercent(channels.physicalExhaustion, fallback.physicalExhaustion),
    mentalExhaustion: clampPercent(channels.mentalExhaustion, fallback.mentalExhaustion),
    combatStress: clampPercent(channels.combatStress, fallback.combatStress),
    capabilityUsesThisPhase: Math.max(
      0,
      Math.trunc(
        finiteNonNegativeNumber(
          channels.capabilityUsesThisPhase,
          fallback.capabilityUsesThisPhase
        )
      )
    ),
  }

  if (
    normalized.physicalExhaustion <= 0 &&
    normalized.mentalExhaustion <= 0 &&
    normalized.combatStress <= 0 &&
    normalized.capabilityUsesThisPhase <= 0
  ) {
    return undefined
  }

  return normalized
}

function normalizeOverdrive(overdrive: Agent['overdrive'] | undefined): AgentOverdriveState | undefined {
  if (!overdrive || typeof overdrive !== 'object') {
    return undefined
  }

  const normalized = {
    active: overdrive.active === true,
    remainingPhases: Math.max(0, Math.trunc(finiteNonNegativeNumber(overdrive.remainingPhases, 0))),
    recoveryDebt: Math.max(0, Math.trunc(finiteNonNegativeNumber(overdrive.recoveryDebt, 0))),
  }

  if (!normalized.active && normalized.remainingPhases <= 0 && normalized.recoveryDebt <= 0) {
    return undefined
  }

  return normalized
}

function normalizeTrustDamageByAgent(
  trustDamageByAgent: Agent['trustDamageByAgent'] | undefined,
  knownAgentIds?: ReadonlySet<string>
) {
  if (!trustDamageByAgent || typeof trustDamageByAgent !== 'object') {
    return undefined
  }

  const next = Object.fromEntries(
    Object.entries(trustDamageByAgent)
      .filter(([counterpartId, value]) => {
        if (knownAgentIds && !knownAgentIds.has(counterpartId)) {
          return false
        }

        return typeof value === 'number' && Number.isFinite(value) && value > 0
      })
      .map(([counterpartId, value]) => [counterpartId, Math.round(value * 100) / 100])
  )

  return Object.keys(next).length > 0 ? next : undefined
}

function normalizeTrustConsequenceStack(
  stack: Agent['trustConsequenceStack'] | undefined,
  knownAgentIds?: ReadonlySet<string>
): TrustConsequenceEntry[] | undefined {
  if (!Array.isArray(stack)) {
    return undefined
  }

  const next = stack
    .filter((entry) => {
      if (!entry || typeof entry !== 'object') {
        return false
      }

      if (entry.reason !== 'betrayal') {
        return false
      }

      if (typeof entry.pairAgentId !== 'string' || entry.pairAgentId.length === 0) {
        return false
      }

      if (knownAgentIds && !knownAgentIds.has(entry.pairAgentId)) {
        return false
      }

      if (!TRUST_CONSEQUENCE_TYPES.has(entry.consequenceType)) {
        return false
      }

      return (
        typeof entry.triggeredWeek === 'number' &&
        Number.isFinite(entry.triggeredWeek) &&
        entry.triggeredWeek >= 1
      )
    })
    .map((entry) => ({
      reason: 'betrayal' as const,
      pairAgentId: entry.pairAgentId,
      triggeredWeek: Math.max(1, Math.trunc(entry.triggeredWeek)),
      consequenceType: entry.consequenceType,
      ...(typeof entry.expiresWeek === 'number' && Number.isFinite(entry.expiresWeek)
        ? { expiresWeek: Math.max(1, Math.trunc(entry.expiresWeek)) }
        : {}),
    }))

  return next.length > 0 ? next : undefined
}

function normalizePerformancePenaltyMultiplier(
  multiplier: Agent['performancePenaltyMultiplier'] | undefined,
  trustConsequenceStack: TrustConsequenceEntry[] | undefined
): number | undefined {
  const hasPenalty = (trustConsequenceStack ?? []).some(
    (entry) => entry.consequenceType === 'performance_penalty'
  )

  if (!hasPenalty) {
    return undefined
  }

  if (typeof multiplier !== 'number' || !Number.isFinite(multiplier) || multiplier <= 0) {
    return PERFORMANCE_PENALTY_MULTIPLIER
  }

  return clamp(multiplier, 0.1, 1)
}

function normalizeAgentStatus(status: Agent['status'] | undefined): Agent['status'] {
  if (
    status === 'active' ||
    status === 'injured' ||
    status === 'recovering' ||
    status === 'resigned' ||
    status === 'dead'
  ) {
    return status
  }

  return 'active'
}

export function normalizeAgentAttritionState(
  attritionState: Agent['attritionState'] | undefined,
  status: Agent['status']
): AgentAttritionState | undefined {
  if (!attritionState || typeof attritionState !== 'object') {
    return undefined
  }

  const attritionStatus = attritionState.attritionStatus
  if (!ATTRITION_STATUSES.has(attritionStatus)) {
    return undefined
  }

  const attritionCategory =
    typeof attritionState.attritionCategory === 'string' &&
    ATTRITION_CATEGORIES.has(attritionState.attritionCategory)
      ? attritionState.attritionCategory
      : undefined
  const attritionSinceWeek = finiteWeekValue(attritionState.attritionSinceWeek)
  let returnEligibleWeek = finiteWeekValue(attritionState.returnEligibleWeek)

  if (
    attritionSinceWeek !== undefined &&
    returnEligibleWeek !== undefined &&
    returnEligibleWeek < attritionSinceWeek
  ) {
    returnEligibleWeek = attritionSinceWeek
  }

  const lossReasonCodes = uniqueSortedStrings(
    (attritionState.lossReasonCodes ?? []).filter(
      (code): code is string => typeof code === 'string' && code.length > 0
    )
  )
  const replacementPriority = Math.min(
    ATTRITION_CALIBRATION.maxReplacementPressure,
    finiteNonNegativeInt(attritionState.replacementPriority, 0)
  )
  const retentionPressure = finiteNonNegativeInt(attritionState.retentionPressure, 0)

  let normalized: AgentAttritionState = {
    attritionStatus,
    lossReasonCodes,
    replacementPriority,
    retentionPressure,
    ...(attritionCategory ? { attritionCategory } : {}),
    ...(attritionSinceWeek !== undefined ? { attritionSinceWeek } : {}),
    ...(returnEligibleWeek !== undefined ? { returnEligibleWeek } : {}),
  }

  if (status === 'dead' && normalized.attritionStatus !== 'lost') {
    normalized = {
      ...normalized,
      attritionStatus: 'lost',
      ...(normalized.attritionCategory ? {} : { attritionCategory: 'injury_exit' }),
    }
  }

  if (status === 'resigned' && normalized.attritionStatus === 'active') {
    normalized = {
      ...normalized,
      attritionStatus: 'lost',
      attritionCategory: normalized.attritionCategory ?? 'disciplinary',
    }
  }

  if (
    normalized.attritionStatus === 'active' &&
    lossReasonCodes.length === 0 &&
    replacementPriority === 0 &&
    retentionPressure === 0 &&
    attritionCategory === undefined &&
    attritionSinceWeek === undefined &&
    returnEligibleWeek === undefined
  ) {
    return undefined
  }

  return normalized
}

function uniqueSortedStrings(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}

function deriveOperationalRole(role: Agent['role']): Agent['operationalRole'] {
  if (role === 'hunter') {
    return 'field'
  }

  if (role === 'occultist' || role === 'medium') {
    return 'containment'
  }

  if (role === 'investigator' || role === 'field_recon' || role === 'tech') {
    return 'investigation'
  }

  return 'support'
}

export function normalizeAgentIdentity(agent: Agent): AgentIdentity {
  const fallback = createDefaultAgentIdentity(agent.name)
  const identity = agent.identity ?? fallback
  const name =
    normalizeIdentityString(identity.name) ||
    normalizeIdentityString(agent.name) ||
    normalizeIdentityString(agent.id) ||
    fallback.name
  const codename =
    normalizeIdentityString(identity.codename) || normalizeIdentityString(identity.callsign)
  const age = normalizeAgentAge(agent.age, normalizeAgentAge(identity.age, undefined))
  const background =
    typeof identity.background === 'string' && identity.background.trim().length > 0
      ? identity.background.trim()
      : undefined
  const portraitId = normalizePortraitId(identity.portraitId)

  return {
    name,
    ...(age !== undefined ? { age } : {}),
    ...(background ? { background } : {}),
    ...(codename.length > 0 ? { codename, callsign: codename } : {}),
    ...(portraitId ? { portraitId } : {}),
  }
}

function normalizeGrowthStats(
  growthStats: AgentProgression['growthStats']
): NonNullable<AgentProgression['growthStats']> {
  return Object.fromEntries(
    Object.entries(growthStats ?? {}).filter(
      ([, value]) => typeof value === 'number' && Number.isFinite(value)
    )
  )
}

function normalizeTrainingStatus(value: unknown) {
  return value === 'idle' ||
    value === 'queued' ||
    value === 'in_progress' ||
    value === 'blocked' ||
    value === 'completed_recently'
    ? value
    : 'idle'
}

function normalizeCertificationState(value: unknown) {
  return value === 'not_started' ||
    value === 'in_progress' ||
    value === 'eligible_review' ||
    value === 'certified' ||
    value === 'expired' ||
    value === 'revoked'
    ? value
    : 'not_started'
}

function normalizeTrainingHistory(
  history: AgentProgression['trainingHistory'],
  campaignWeek?: number
) {
  const seen = new Set<string>()

  return (history ?? [])
    .filter((entry) =>
      Boolean(
        entry &&
          typeof entry.trainingId === 'string' &&
          entry.trainingId.length > 0 &&
          KNOWN_TRAINING_PROGRAM_IDS.has(entry.trainingId) &&
          typeof entry.week === 'number' &&
          Number.isFinite(entry.week)
      )
    )
    .map((entry) => ({
      trainingId: entry.trainingId,
      week: Math.max(1, Math.trunc(entry.week)),
    }))
    .filter((entry) => {
      if (campaignWeek !== undefined && entry.week > campaignWeek) {
        return false
      }

      const key = `${entry.trainingId}:${entry.week}`
      if (seen.has(key)) {
        return false
      }

      seen.add(key)
      return true
    })
    .sort(
      (left, right) =>
        left.week - right.week || left.trainingId.localeCompare(right.trainingId)
    )
    .slice(-TRAINING_HISTORY_MAX_ENTRIES)
}

function normalizeCertProgress(progress: AgentProgression['certProgress']) {
  return Object.fromEntries(
    Object.entries(progress ?? {})
      .filter(
        ([key, value]) =>
          typeof key === 'string' &&
          key.length > 0 &&
          isKnownCertificationProgressKey(key) &&
          typeof value === 'number' &&
          Number.isFinite(value)
      )
      .map(([key, value]) => [key, finiteNonNegativeInt(value, 0)])
  ) as NonNullable<AgentProgression['certProgress']>
}

function normalizeFailedAttempts(
  failedAttempts: AgentProgression['failedAttemptsByTrainingId']
) {
  return Object.fromEntries(
    Object.entries(failedAttempts ?? {})
      .filter(
        ([key, value]) =>
          typeof key === 'string' &&
          key.length > 0 &&
          isKnownFailedAttemptKey(key) &&
          typeof value === 'number' &&
          Number.isFinite(value)
      )
      .map(([key, value]) => [key, finiteNonNegativeInt(value, 0)])
  ) as NonNullable<AgentProgression['failedAttemptsByTrainingId']>
}

export function normalizeCertifications(certifications: AgentProgression['certifications']) {
  return Object.fromEntries(
    Object.entries(certifications ?? {})
      .filter(
        ([certificationId, certification]) =>
          typeof certificationId === 'string' &&
          certificationId.length > 0 &&
          KNOWN_CERTIFICATION_IDS.has(certificationId) &&
          Boolean(certification)
      )
      .map(([certificationId, certification]) => {
        const awardedWeek = finiteWeekValue(certification?.awardedWeek)
        let expiresWeek = finiteWeekValue(certification?.expiresWeek)
        if (
          awardedWeek !== undefined &&
          expiresWeek !== undefined &&
          expiresWeek < awardedWeek
        ) {
          expiresWeek = awardedWeek
        }

        const sourceTrainingIds = [
          ...new Set(
            (certification?.sourceTrainingIds ?? []).filter(
              (entry): entry is string =>
                typeof entry === 'string' &&
                entry.length > 0 &&
                Boolean(getTrainingProgram(entry))
            )
          ),
        ]

        return [
          certificationId,
          {
            certificationId,
            state: normalizeCertificationState(certification?.state),
            ...(awardedWeek !== undefined ? { awardedWeek } : {}),
            ...(expiresWeek !== undefined ? { expiresWeek } : {}),
            ...(sourceTrainingIds.length > 0 ? { sourceTrainingIds } : {}),
            ...(typeof certification?.notes === 'string' && certification.notes.length > 0
              ? { notes: certification.notes }
              : {}),
          },
        ]
      })
  ) as NonNullable<AgentProgression['certifications']>
}

function normalizeSkillTree(
  skillTree: AgentProgression['skillTree'] | undefined,
  fallback: AgentProgression['skillTree'],
  knownAgentIds?: ReadonlySet<string>
): NonNullable<AgentProgression['skillTree']> {
  const source = skillTree ?? fallback ?? createDefaultAgentSkillTree()
  const specialization =
    typeof source.specialization === 'string' && SKILL_SPECIALIZATIONS.has(source.specialization)
      ? source.specialization
      : undefined

  const trainedRelationships = Object.fromEntries(
    Object.entries(source.trainedRelationships ?? {})
      .filter(([partnerId, value]) => {
        if (knownAgentIds && !knownAgentIds.has(partnerId)) {
          return false
        }

        return typeof value === 'number' && Number.isFinite(value)
      })
      .map(([partnerId, value]) => [partnerId, finiteNonNegativeInt(value, 0)])
  )

  return {
    skillPoints: finiteNonNegativeInt(
      source.skillPoints,
      fallback?.skillPoints ?? createDefaultAgentSkillTree().skillPoints
    ),
    ...(specialization ? { specialization } : {}),
    trainedRelationships,
  }
}

function normalizeTrainingProfile(
  agent: Agent,
  role: AgentRole,
  trainingProfile: AgentProgression['trainingProfile'] | undefined,
  fallback: AgentProgression['trainingProfile']
): NonNullable<AgentProgression['trainingProfile']> {
  const source = trainingProfile ?? fallback
  const trainingStatus = normalizeTrainingStatus(source?.trainingStatus)
  const assignedTrainingId =
    typeof source?.assignedTrainingId === 'string' &&
    source.assignedTrainingId.length > 0 &&
    Boolean(getTrainingProgram(source.assignedTrainingId))
      ? source.assignedTrainingId
      : undefined
  const trainingStartedWeek = finiteWeekValue(source?.trainingStartedWeek)
  let trainingEtaWeek = finiteWeekValue(source?.trainingEtaWeek)
  const trainingQueuePosition =
    typeof source?.trainingQueuePosition === 'number' && Number.isFinite(source.trainingQueuePosition)
      ? Math.max(1, Math.trunc(source.trainingQueuePosition))
      : undefined

  if (
    trainingStartedWeek !== undefined &&
    trainingEtaWeek !== undefined &&
    trainingEtaWeek < trainingStartedWeek
  ) {
    trainingEtaWeek = trainingStartedWeek
  }

  const requiresAssignment =
    trainingStatus === 'queued' ||
    trainingStatus === 'in_progress' ||
    trainingStatus === 'blocked'

  const normalizedAssignedTrainingId =
    trainingStatus === 'idle' || (requiresAssignment && !assignedTrainingId)
      ? undefined
      : assignedTrainingId

  const normalizedStartedWeek =
    normalizedAssignedTrainingId === undefined ? undefined : trainingStartedWeek
  const normalizedEtaWeek =
    normalizedAssignedTrainingId === undefined ? undefined : trainingEtaWeek
  const normalizedQueuePosition =
    normalizedAssignedTrainingId === undefined ? undefined : trainingQueuePosition

  return {
    agentId: agent.id,
    currentRole: role,
    trainingStatus:
      requiresAssignment && !normalizedAssignedTrainingId ? 'idle' : trainingStatus,
    readinessImpact:
      typeof source?.readinessImpact === 'number' && Number.isFinite(source.readinessImpact)
        ? clamp(source.readinessImpact, -100, 100)
        : 0,
    ...(normalizedAssignedTrainingId ? { assignedTrainingId: normalizedAssignedTrainingId } : {}),
    ...(normalizedStartedWeek !== undefined ? { trainingStartedWeek: normalizedStartedWeek } : {}),
    ...(normalizedEtaWeek !== undefined ? { trainingEtaWeek: normalizedEtaWeek } : {}),
    ...(normalizedQueuePosition !== undefined
      ? { trainingQueuePosition: normalizedQueuePosition }
      : {}),
  }
}

function normalizeAgentProgression(
  agent: Agent,
  role: AgentRole,
  baseStats: Agent['baseStats'],
  knownAgentIds?: ReadonlySet<string>,
  campaignWeek?: number
): AgentProgression {
  const levelSource =
    typeof agent.progression?.level === 'number'
      ? agent.progression.level
      : typeof agent.level === 'number'
        ? agent.level
        : 1
  const normalizedLevel = finiteLevel(levelSource, 1)
  const fallback = createDefaultAgentProgression(normalizedLevel, undefined, undefined, role)

  return synchronizeProgressionState(
    {
      ...fallback,
      ...agent.progression,
      xp: finiteNonNegativeInt(agent.progression?.xp, fallback.xp),
      level: normalizedLevel,
      potentialTier: normalizePotentialTier(
        agent.progression?.potentialTier ?? fallback.potentialTier,
        baseStats
      ),
      potentialIntel: normalizePotentialIntel(
        agent.progression?.potentialIntel,
        agent.progression?.potentialTier ?? fallback.potentialTier
      ),
      growthProfile:
        typeof agent.progression?.growthProfile === 'string' &&
        agent.progression.growthProfile.length > 0
          ? agent.progression.growthProfile
          : fallback.growthProfile,
      statCaps: buildAgentStatCaps(
        baseStats,
        agent.progression?.potentialTier ?? fallback.potentialTier,
        agent.progression?.growthProfile ?? fallback.growthProfile,
        agent.progression?.statCaps
      ),
      growthStats: normalizeGrowthStats(agent.progression?.growthStats ?? fallback.growthStats),
      trainingPoints: finiteNonNegativeInt(
        agent.progression?.trainingPoints,
        fallback.trainingPoints ?? 0
      ),
      trainingHistory: normalizeTrainingHistory(
        agent.progression?.trainingHistory ?? fallback.trainingHistory,
        campaignWeek
      ),
      certProgress: normalizeCertProgress(agent.progression?.certProgress ?? fallback.certProgress),
      certifications: normalizeCertifications(
        agent.progression?.certifications ?? fallback.certifications
      ),
      specializationTrack:
        typeof agent.progression?.specializationTrack === 'string' &&
        SKILL_SPECIALIZATIONS.has(agent.progression.specializationTrack)
          ? agent.progression.specializationTrack
          : undefined,
      lastTrainingWeek: finiteWeekValue(agent.progression?.lastTrainingWeek),
      failedAttemptsByTrainingId: normalizeFailedAttempts(
        agent.progression?.failedAttemptsByTrainingId ?? fallback.failedAttemptsByTrainingId
      ),
      trainingProfile: normalizeTrainingProfile(
        agent,
        role,
        agent.progression?.trainingProfile,
        fallback.trainingProfile
      ),
      skillTree: normalizeSkillTree(
        agent.progression?.skillTree,
        fallback.skillTree,
        knownAgentIds
      ),
    },
    normalizedLevel
  )
}

function normalizeWeek(value: number | undefined, fallback?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return Math.max(1, Math.trunc(value))
}

function getLatestTimelineWeek(
  history: Agent['history'],
  eventTypes: readonly AgentHistory['timeline'][number]['eventType'][]
) {
  const weeks = (history?.timeline ?? [])
    .filter((entry) => eventTypes.includes(entry.eventType))
    .map((entry) => normalizeWeek(entry.week))
    .filter((entry): entry is number => entry !== undefined)

  return weeks.length > 0 ? Math.max(...weeks) : undefined
}

function normalizePerformanceStats(history: Agent['history']) {
  const fallback = createDefaultAgentHistory().performanceStats
  const stats = history?.performanceStats

  return {
    deployments: Math.max(
      0,
      Math.trunc(finiteNonNegativeNumber(stats?.deployments, fallback.deployments))
    ),
    totalContribution: finiteNonNegativeNumber(
      stats?.totalContribution,
      fallback.totalContribution
    ),
    totalThreatHandled: finiteNonNegativeNumber(
      stats?.totalThreatHandled,
      fallback.totalThreatHandled
    ),
    totalDamageTaken: finiteNonNegativeNumber(stats?.totalDamageTaken, fallback.totalDamageTaken),
    totalHealingPerformed: finiteNonNegativeNumber(
      stats?.totalHealingPerformed,
      fallback.totalHealingPerformed
    ),
    totalEvidenceGathered: finiteNonNegativeNumber(
      stats?.totalEvidenceGathered,
      fallback.totalEvidenceGathered
    ),
    totalContainmentActionsCompleted: finiteNonNegativeNumber(
      stats?.totalContainmentActionsCompleted,
      fallback.totalContainmentActionsCompleted
    ),
    totalFieldPower: finiteNonNegativeNumber(stats?.totalFieldPower, fallback.totalFieldPower),
    totalContainment: finiteNonNegativeNumber(stats?.totalContainment, fallback.totalContainment),
    totalInvestigation: finiteNonNegativeNumber(
      stats?.totalInvestigation,
      fallback.totalInvestigation
    ),
    totalSupport: finiteNonNegativeNumber(stats?.totalSupport, fallback.totalSupport),
    totalStressImpact: finiteNonNegativeNumber(
      stats?.totalStressImpact,
      fallback.totalStressImpact
    ),
    totalEquipmentContributionDelta: finiteNonNegativeNumber(
      stats?.totalEquipmentContributionDelta,
      fallback.totalEquipmentContributionDelta
    ),
    totalKitContributionDelta: finiteNonNegativeNumber(
      stats?.totalKitContributionDelta,
      fallback.totalKitContributionDelta
    ),
    totalProtocolContributionDelta: finiteNonNegativeNumber(
      stats?.totalProtocolContributionDelta,
      fallback.totalProtocolContributionDelta
    ),
    totalEquipmentScoreDelta: finiteNonNegativeNumber(
      stats?.totalEquipmentScoreDelta,
      fallback.totalEquipmentScoreDelta
    ),
    totalKitScoreDelta: finiteNonNegativeNumber(
      stats?.totalKitScoreDelta,
      fallback.totalKitScoreDelta
    ),
    totalProtocolScoreDelta: finiteNonNegativeNumber(
      stats?.totalProtocolScoreDelta,
      fallback.totalProtocolScoreDelta
    ),
    totalKitEffectivenessDelta: finiteNonNegativeNumber(
      stats?.totalKitEffectivenessDelta,
      fallback.totalKitEffectivenessDelta
    ),
    totalProtocolEffectivenessDelta: finiteNonNegativeNumber(
      stats?.totalProtocolEffectivenessDelta,
      fallback.totalProtocolEffectivenessDelta
    ),
  }
}

function sanitizeAgentHistoryLog(entry: unknown): OperationEvent | null {
  if (!isRecord(entry) || !isRecord(entry.payload)) {
    return null
  }

  if (typeof entry.id !== 'string' || entry.id.length === 0) {
    return null
  }

  if (typeof entry.type !== 'string' || !VALID_OPERATION_EVENT_TYPES.has(entry.type as OperationEventType)) {
    return null
  }

  const eventType = entry.type as OperationEventType
  const payload =
    eventType === 'progression.xp_gained'
      ? {
          ...entry.payload,
          ...reconcileProgressionXpGainedFields(entry.payload),
          reason:
            typeof entry.payload.reason === 'string' && entry.payload.reason.trim().length > 0
              ? entry.payload.reason.trim()
              : entry.payload.reason,
        }
      : eventType === 'agent.promoted'
        ? {
            ...entry.payload,
            ...reconcileAgentPromotedFields(entry.payload),
            newRole:
              typeof entry.payload.newRole === 'string' && entry.payload.newRole.trim().length > 0
                ? entry.payload.newRole.trim()
                : entry.payload.newRole,
          }
        : eventType === 'agent.betrayed'
          ? {
              ...entry.payload,
              ...reconcileAgentBetrayedFields(entry.payload),
              triggeredConsequences: Array.isArray(entry.payload.triggeredConsequences)
                ? entry.payload.triggeredConsequences.filter(
                    (
                      consequence
                    ): consequence is
                      | 'benching'
                      | 'performance_penalty'
                      | 'disciplinary'
                      | 'resignation' =>
                      consequence === 'benching' ||
                      consequence === 'performance_penalty' ||
                      consequence === 'disciplinary' ||
                      consequence === 'resignation'
                  )
                : entry.payload.triggeredConsequences,
            }
          : eventType === 'agent.relationship_changed'
            ? {
                ...entry.payload,
                ...reconcileAgentRelationshipChangedFields(entry.payload),
              }
            : entry.payload
  const validation = validateOperationEventPayload(eventType, payload)

  if (!validation.success) {
    return null
  }

  if (typeof entry.timestamp !== 'string' || entry.timestamp.length === 0) {
    return null
  }

  const migrated = migrateEventV1toV2({
    id: entry.id,
    type: eventType,
    timestamp: entry.timestamp,
    schemaVersion: entry.schemaVersion,
    sourceSystem: entry.sourceSystem,
    payload,
  })

  if (!migrated) {
    return null
  }

  return {
    ...migrated,
    id: entry.id,
    type: eventType,
    timestamp: entry.timestamp,
    sourceSystem: EVENT_TYPE_TO_SOURCE_SYSTEM[eventType],
  }
}

function normalizeAgentHistory(
  history: Agent['history'],
  agentId: string,
  knownAgentIds?: ReadonlySet<string>
): AgentHistory {
  const fallback = createDefaultAgentHistory()

  if (!history || typeof history !== 'object') {
    return fallback
  }

  const isKnownRosterAlly = (allyId: string) => {
    if (allyId.length === 0 || allyId === agentId) {
      return false
    }

    return knownAgentIds ? knownAgentIds.has(allyId) : true
  }

  const rawCounters = history.counters
  const counters = {
    assignmentsCompleted: Math.max(
      0,
      Math.trunc(
        finiteNonNegativeNumber(
          rawCounters?.assignmentsCompleted,
          fallback.counters.assignmentsCompleted
        )
      )
    ),
    casesResolved: Math.max(
      0,
      Math.trunc(
        finiteNonNegativeNumber(rawCounters?.casesResolved, fallback.counters.casesResolved)
      )
    ),
    casesPartiallyResolved: Math.max(
      0,
      Math.trunc(
        finiteNonNegativeNumber(
          rawCounters?.casesPartiallyResolved,
          fallback.counters.casesPartiallyResolved
        )
      )
    ),
    casesFailed: Math.max(
      0,
      Math.trunc(finiteNonNegativeNumber(rawCounters?.casesFailed, fallback.counters.casesFailed))
    ),
    anomaliesContained: Math.max(
      0,
      Math.trunc(
        finiteNonNegativeNumber(
          rawCounters?.anomaliesContained,
          fallback.counters.anomaliesContained
        )
      )
    ),
    recoveryWeeks: Math.max(
      0,
      Math.trunc(
        finiteNonNegativeNumber(rawCounters?.recoveryWeeks, fallback.counters.recoveryWeeks)
      )
    ),
    trainingWeeks: Math.max(
      0,
      Math.trunc(
        finiteNonNegativeNumber(rawCounters?.trainingWeeks, fallback.counters.trainingWeeks)
      )
    ),
    trainingsCompleted: Math.max(
      0,
      Math.trunc(
        finiteNonNegativeNumber(
          rawCounters?.trainingsCompleted,
          fallback.counters.trainingsCompleted
        )
      )
    ),
    stressSustained: finiteNonNegativeNumber(
      rawCounters?.stressSustained,
      fallback.counters.stressSustained
    ),
    damageSustained: finiteNonNegativeNumber(
      rawCounters?.damageSustained,
      fallback.counters.damageSustained
    ),
    anomalyExposures: Math.max(
      0,
      Math.trunc(
        finiteNonNegativeNumber(
          rawCounters?.anomalyExposures,
          fallback.counters.anomalyExposures
        )
      )
    ),
    evidenceRecovered: Math.max(
      0,
      Math.trunc(
        finiteNonNegativeNumber(
          rawCounters?.evidenceRecovered,
          fallback.counters.evidenceRecovered
        )
      )
    ),
  }
  const casesCompleted =
    counters.casesResolved + counters.casesPartiallyResolved + counters.casesFailed
  const trainingsDone = counters.trainingsCompleted

  return {
    counters,
    casesCompleted,
    trainingsDone,
    bonds: Object.fromEntries(
      Object.entries(history?.bonds ?? {})
        .filter(([counterpartId, value]) => isKnownRosterAlly(counterpartId) && typeof value === 'number' && Number.isFinite(value))
        .map(([counterpartId, value]) => [counterpartId, clamp(value, -100, 100)])
    ),
    performanceStats: normalizePerformanceStats(history),
    alliesWorkedWith: [
      ...new Set(
        (history?.alliesWorkedWith ?? []).filter(
          (allyId): allyId is string => typeof allyId === 'string' && isKnownRosterAlly(allyId)
        )
      ),
    ],
    timeline: Array.isArray(history.timeline)
      ? history.timeline
          .filter(
            (entry) =>
              entry &&
              typeof entry.note === 'string' &&
              entry.note.length > 0 &&
              typeof entry.week === 'number' &&
              Number.isFinite(entry.week) &&
              isAllowedTimelineEventType(entry.eventType)
          )
          .map((entry) => ({
            week: Math.max(1, Math.trunc(entry.week)),
            eventType: entry.eventType,
            note: entry.note,
            ...(typeof entry.eventId === 'string' && entry.eventId.length > 0
              ? { eventId: entry.eventId }
              : {}),
          }))
      : fallback.timeline,
    logs: Array.isArray(history.logs)
      ? history.logs
          .map((entry) => sanitizeAgentHistoryLog(entry))
          .filter((entry): entry is OperationEvent => entry !== null)
      : fallback.logs,
  }
}

function clampServiceRecordWeek(
  value: number | undefined,
  minWeek: number,
  campaignWeek?: number
) {
  const week = normalizeWeek(value)
  if (week === undefined) {
    return undefined
  }

  let clamped = Math.max(minWeek, week)
  if (campaignWeek !== undefined) {
    clamped = Math.min(clamped, campaignWeek)
  }

  return clamped
}

function normalizeAgentServiceRecord(
  agent: Agent,
  assignment: AgentAssignmentState,
  campaignWeek?: number
): AgentServiceRecord {
  const timeline = agent.history?.timeline ?? []
  const earliestTimelineWeek =
    timeline.length > 0
      ? Math.min(...timeline.map((entry) => normalizeWeek(entry.week, 1) ?? 1))
      : undefined
  const assignmentWeekFromHistory = getLatestTimelineWeek(agent.history, [
    'assignment.team_assigned',
  ])
  const caseWeekFromHistory = getLatestTimelineWeek(agent.history, [
    'case.resolved',
    'case.partially_resolved',
    'case.failed',
  ])
  const trainingWeekFromHistory = getLatestTimelineWeek(agent.history, [
    'agent.training_started',
    'agent.training_completed',
  ])
  const serviceRecord =
    agent.serviceRecord ?? createDefaultAgentServiceRecord(earliestTimelineWeek ?? 1)

  const joinedWeek =
    clampServiceRecordWeek(
      serviceRecord.joinedWeek ?? earliestTimelineWeek,
      1,
      campaignWeek
    ) ?? createDefaultAgentServiceRecord().joinedWeek
  const lastAssignmentWeek = clampServiceRecordWeek(
    serviceRecord.lastAssignmentWeek ??
      (assignment.state === 'assigned' ? assignment.startedWeek : undefined) ??
      assignmentWeekFromHistory,
    joinedWeek,
    campaignWeek
  )
  const lastCaseWeek = clampServiceRecordWeek(
    serviceRecord.lastCaseWeek ?? caseWeekFromHistory,
    joinedWeek,
    campaignWeek
  )
  const lastTrainingWeek = clampServiceRecordWeek(
    serviceRecord.lastTrainingWeek ??
      (assignment.state === 'training' ? assignment.startedWeek : undefined) ??
      trainingWeekFromHistory,
    joinedWeek,
    campaignWeek
  )
  const lastRecoveryWeek = clampServiceRecordWeek(
    serviceRecord.lastRecoveryWeek ??
      (assignment.state === 'recovery' ? assignment.startedWeek : undefined),
    joinedWeek,
    campaignWeek
  )

  return {
    joinedWeek,
    ...(lastAssignmentWeek !== undefined ? { lastAssignmentWeek } : {}),
    ...(lastCaseWeek !== undefined ? { lastCaseWeek } : {}),
    ...(lastTrainingWeek !== undefined ? { lastTrainingWeek } : {}),
    ...(lastRecoveryWeek !== undefined ? { lastRecoveryWeek } : {}),
  }
}

function normalizeTraitModifiers(modifiers: unknown): AgentTrait['modifiers'] {
  if (!isRecord(modifiers)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(modifiers).filter(
      ([key, value]) =>
        TRAIT_MODIFIER_KEYS.has(key) && typeof value === 'number' && Number.isFinite(value)
    )
  )
}

function normalizeTraits(traits: Agent['traits']): AgentTrait[] {
  return (traits ?? [])
    .filter(
      (trait) =>
        Boolean(trait) &&
        typeof trait.id === 'string' &&
        trait.id.length > 0 &&
        typeof trait.label === 'string' &&
        trait.label.length > 0
    )
    .map((trait) => ({
      id: trait.id,
      label: trait.label,
      ...(typeof trait.description === 'string' && trait.description.length > 0
        ? { description: trait.description }
        : {}),
      modifiers: normalizeTraitModifiers(trait.modifiers),
    }))
}

function normalizeAbilities(abilities: Agent['abilities']): AgentAbility[] {
  return (abilities ?? [])
    .filter(
      (ability) =>
        Boolean(ability) &&
        typeof ability.id === 'string' &&
        ability.id.length > 0 &&
        typeof ability.label === 'string' &&
        ability.label.length > 0
    )
    .map((ability) => {
      const type = ability.type === 'active' ? 'active' : 'passive'
      const effect = normalizeTraitModifiers(ability.effect) as AgentAbilityEffect
      const trigger =
        type === 'active' &&
        typeof ability.trigger === 'string' &&
        AGENT_ABILITY_TRIGGERS.has(ability.trigger)
          ? ability.trigger
          : undefined
      const cooldown =
        type === 'active' &&
        typeof ability.cooldown === 'number' &&
        Number.isFinite(ability.cooldown)
          ? Math.max(0, Math.trunc(ability.cooldown))
          : undefined

      return {
        id: ability.id,
        label: ability.label,
        ...(typeof ability.description === 'string' && ability.description.length > 0
          ? { description: ability.description }
          : {}),
        type,
        effect,
        ...(trigger ? { trigger } : {}),
        ...(cooldown !== undefined ? { cooldown } : {}),
      }
    })
}

export function reconcileAgentAssignmentAgainstGame(
  assignment: AgentAssignmentState,
  cases: Record<string, CaseInstance>,
  teams: Record<string, Team>
): AgentAssignmentState {
  if (assignment.state === 'assigned') {
    if (!(assignment.caseId in cases) || !(assignment.teamId in teams)) {
      return createDefaultAgentAssignmentState()
    }

    return assignment
  }

  if (assignment.state === 'training') {
    const trainingProgramId = assignment.trainingProgramId
    const teamId =
      assignment.teamId && assignment.teamId in teams ? assignment.teamId : undefined

    if (trainingProgramId && !getTrainingProgram(trainingProgramId)) {
      return {
        state: 'training',
        startedWeek: assignment.startedWeek,
        ...(teamId ? { teamId } : {}),
      }
    }

    if (!teamId && assignment.teamId) {
      return {
        state: 'training',
        startedWeek: assignment.startedWeek,
        ...(trainingProgramId ? { trainingProgramId } : {}),
      }
    }

    return {
      state: 'training',
      startedWeek: assignment.startedWeek,
      ...(teamId ? { teamId } : {}),
      ...(trainingProgramId ? { trainingProgramId } : {}),
    }
  }

  if (assignment.state === 'recovery') {
    if (assignment.teamId && !(assignment.teamId in teams)) {
      return {
        state: 'recovery',
        startedWeek: assignment.startedWeek,
      }
    }
  }

  return assignment
}

function normalizeAgentAssignment(assignment: Agent['assignment']): AgentAssignmentState {
  if (!assignment || typeof assignment !== 'object') {
    return createDefaultAgentAssignmentState()
  }

  const rawState = (assignment as { state?: string }).state

  if (rawState === 'assigned' || rawState === 'resolving') {
    if (typeof (assignment as { caseId?: unknown }).caseId !== 'string') {
      return createDefaultAgentAssignmentState()
    }

    if (typeof (assignment as { teamId?: unknown }).teamId !== 'string') {
      return createDefaultAgentAssignmentState()
    }

    return {
      state: 'assigned',
      caseId: (assignment as { caseId: string }).caseId,
      teamId: (assignment as { teamId: string }).teamId,
      startedWeek:
        typeof (assignment as { startedWeek?: unknown }).startedWeek === 'number'
          ? Math.max(1, Math.trunc((assignment as { startedWeek: number }).startedWeek))
          : 1,
    }
  }

  if (rawState === 'training') {
    return {
      state: 'training',
      startedWeek:
        typeof (assignment as { startedWeek?: unknown }).startedWeek === 'number'
          ? Math.max(1, Math.trunc((assignment as { startedWeek: number }).startedWeek))
          : 1,
      ...(typeof (assignment as { teamId?: unknown }).teamId === 'string'
        ? { teamId: (assignment as { teamId: string }).teamId }
        : {}),
      ...(typeof (assignment as { trainingProgramId?: unknown }).trainingProgramId === 'string'
        ? { trainingProgramId: (assignment as { trainingProgramId: string }).trainingProgramId }
        : {}),
    }
  }

  if (rawState === 'recovery' || rawState === 'recovering') {
    return {
      state: 'recovery',
      startedWeek:
        typeof (assignment as { startedWeek?: unknown }).startedWeek === 'number'
          ? Math.max(1, Math.trunc((assignment as { startedWeek: number }).startedWeek))
          : 1,
      ...(typeof (assignment as { teamId?: unknown }).teamId === 'string'
        ? { teamId: (assignment as { teamId: string }).teamId }
        : {}),
    }
  }

  return createDefaultAgentAssignmentState()
}

function normalizeRelationships(agent: Agent) {
  return Object.fromEntries(
    Object.entries(agent.relationships ?? {})
      .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
      .map(([agentId, value]) => [agentId, clamp(value, RELATIONSHIP_MIN, RELATIONSHIP_MAX)])
  )
}

function normalizeEquipmentCounts(equipment: Agent['equipment']) {
  const knownEquipmentIds = getKnownEquipmentIds()

  return Object.fromEntries(
    Object.entries(equipment ?? {})
      .filter(
        ([itemId, value]) =>
          knownEquipmentIds.has(itemId) &&
          typeof value === 'number' &&
          Number.isFinite(value) &&
          value >= 0
      )
      .map(([itemId, value]) => [itemId, Math.trunc(value)])
  )
}

function normalizeEquipmentSlots(equipmentSlots: Agent['equipmentSlots']): EquipmentSlots {
  const knownEquipmentIds = getKnownEquipmentIds()

  return Object.fromEntries(
    Object.entries(equipmentSlots ?? {}).filter(
      ([, value]) =>
        typeof value === 'string' && value.length > 0 && knownEquipmentIds.has(value)
    )
  )
}

function normalizeAgentAbilityState(
  abilityState: Agent['abilityState'],
  abilities: readonly AgentAbility[]
): AgentAbilityState {
  const normalized: AgentAbilityState = {}
  const abilityIds = new Set(abilities.map((ability) => ability.id))

  for (const [abilityId, runtime] of Object.entries(abilityState ?? {})) {
    if (!abilityIds.has(abilityId) || !runtime || typeof runtime !== 'object') {
      continue
    }

    const cooldownRemaining =
      typeof runtime.cooldownRemaining === 'number' && Number.isFinite(runtime.cooldownRemaining)
        ? Math.max(0, Math.trunc(runtime.cooldownRemaining))
        : 0
    const lastUsedWeek =
      typeof runtime.lastUsedWeek === 'number' && Number.isFinite(runtime.lastUsedWeek)
        ? Math.max(1, Math.trunc(runtime.lastUsedWeek))
        : undefined
    const usesConsumedThisWeek =
      typeof runtime.usesConsumedThisWeek === 'number' &&
      Number.isFinite(runtime.usesConsumedThisWeek)
        ? Math.max(0, Math.trunc(runtime.usesConsumedThisWeek))
        : undefined

    normalized[abilityId] = {
      cooldownRemaining,
      ...(lastUsedWeek !== undefined ? { lastUsedWeek } : {}),
      ...(usesConsumedThisWeek !== undefined ? { usesConsumedThisWeek } : {}),
    }
  }

  for (const ability of abilities) {
    if (ability.type !== 'active' || !ability.id) {
      continue
    }

    if (!normalized[ability.id]) {
      normalized[ability.id] = {
        cooldownRemaining: 0,
      }
    }
  }

  return normalized
}

function normalizeStatusFlags(status: Agent['status'], flags: string[] | undefined) {
  const nextFlags = new Set(
    (flags ?? []).filter((flag) => typeof flag === 'string' && flag.length > 0)
  )

  if (status === 'injured') {
    nextFlags.add('injured')
  }
  if (status === 'recovering') {
    nextFlags.add('recovering')
  }
  if (status === 'dead') {
    nextFlags.add('dead')
  }
  if (status === 'resigned') {
    nextFlags.add('resigned')
  }

  return [...nextFlags]
}

function normalizeAgentVitals(agent: Agent, fatigue: number, status: Agent['status']): AgentVitals {
  const fallback = createDefaultAgentVitals(fatigue, status)
  const wounds =
    status === 'dead' ? 100 : clampPercent(agent.vitals?.wounds ?? fallback.wounds, fallback.wounds)

  return {
    health:
      status === 'dead'
        ? 0
        : clampPercent(agent.vitals?.health ?? fallback.health, fallback.health),
    stress: clampPercent(fatigue, fallback.stress),
    morale:
      status === 'dead'
        ? 0
        : clampPercent(
            agent.vitals?.morale ?? Math.max(0, 100 - fatigue - wounds),
            fallback.morale
          ),
    wounds,
    statusFlags: normalizeStatusFlags(status, agent.vitals?.statusFlags),
  }
}

function deriveReadinessState(
  status: Agent['status'],
  assignment: AgentAssignmentState,
  attritionState: Agent['attritionState'] | undefined
): AgentReadinessProfile['state'] {
  if (status === 'dead' || status === 'resigned') {
    return 'unavailable'
  }

  if (isAgentAttritionUnavailable({ attritionState })) {
    return 'unavailable'
  }

  if (assignment.state === 'assigned') {
    return 'assigned'
  }

  if (assignment.state === 'training') {
    return 'training'
  }

  if (assignment.state === 'recovery' || status === 'injured' || status === 'recovering') {
    return 'recovering'
  }

  return status === 'active' ? 'ready' : 'unavailable'
}

function deriveReadinessBand(
  state: AgentReadinessProfile['state'],
  fatigue: number,
  vitals: AgentVitals
): AgentReadinessProfile['band'] {
  if (state === 'unavailable') {
    return 'unavailable'
  }

  if (fatigue >= 45 || vitals.wounds >= 25 || vitals.morale <= 35) {
    return 'critical'
  }

  if (fatigue >= 20 || vitals.wounds > 0 || vitals.morale <= 60) {
    return 'strained'
  }

  return 'steady'
}

function normalizeAgentReadinessProfile(
  assignment: AgentAssignmentState,
  fatigue: number,
  status: Agent['status'],
  vitals: AgentVitals,
  attritionState: Agent['attritionState'] | undefined
): AgentReadinessProfile {
  const state = deriveReadinessState(status, assignment, attritionState)
  const band = deriveReadinessBand(state, fatigue, vitals)
  const riskFlags: string[] = []

  if (state === 'assigned') {
    riskFlags.push('assigned')
  }
  if (state === 'training') {
    riskFlags.push('training')
  }
  if (state === 'recovering') {
    riskFlags.push('recovering')
  }
  if (isAgentAttritionUnavailable({ attritionState })) {
    riskFlags.push('attrition-unavailable')
  }
  if (status === 'injured') {
    riskFlags.push('injured')
  }
  if (status === 'dead') {
    riskFlags.push('dead')
  }
  if (status === 'resigned') {
    riskFlags.push('resigned')
  }
  if (fatigue >= 45) {
    riskFlags.push('fatigued')
  }
  if (vitals.wounds > 0) {
    riskFlags.push('wounded')
  }
  if (vitals.morale <= 35) {
    riskFlags.push('low-morale')
  }

  return {
    state,
    band,
    deploymentEligible: state === 'ready' && band !== 'critical',
    recoveryRequired:
      state === 'recovering' || vitals.wounds > 0 || fatigue >= 60 || vitals.morale <= 35,
    riskFlags,
  }
}

export interface NormalizeAgentOptions {
  knownAgentIds?: ReadonlySet<string>
  fallbackBaseStats?: Agent['baseStats']
  /** Campaign week for training history and service-record chronology caps. */
  campaignWeek?: number
}

export function normalizeAgent(agent: Agent, options: NormalizeAgentOptions = {}): Agent {
  const role = normalizeAgentRole(agent.role)
  const status = normalizeAgentStatus(agent.status)
  const fatigue = clampPercent(agent.fatigue, 0)
  const identity = normalizeAgentIdentity(agent)
  const fallbackBaseStats =
    options.fallbackBaseStats ??
    ({
      combat: 1,
      investigation: 1,
      utility: 1,
      social: 1,
    } satisfies Agent['baseStats'])
  const baseStats = normalizeBaseStats(agent.baseStats, fallbackBaseStats)
  const attritionState = normalizeAgentAttritionState(agent.attritionState, status)
  const derivedStats = deriveDomainStatsFromBase(baseStats)
  const stats = normalizeDomainStats(agent.stats, derivedStats)
  const progression = normalizeAgentProgression(
    agent,
    role,
    baseStats,
    options.knownAgentIds,
    options.campaignWeek
  )
  const assignment = normalizeAgentAssignment(agent.assignment)
  const traits = normalizeTraits(agent.traits)
  const abilities = normalizeAbilities(agent.abilities)
  const abilityState = normalizeAgentAbilityState(agent.abilityState, abilities)
  const vitals = normalizeAgentVitals(agent, fatigue, status)
  const serviceRecord = normalizeAgentServiceRecord(agent, assignment, options.campaignWeek)
  const readinessProfile = normalizeAgentReadinessProfile(
    assignment,
    fatigue,
    status,
    vitals,
    attritionState
  )
  const trustConsequenceStack = normalizeTrustConsequenceStack(
    agent.trustConsequenceStack,
    options.knownAgentIds
  )
  const recoveryStatus = normalizeRecoveryStatus(agent.recoveryStatus)
  const trauma = normalizeTrauma(agent.trauma)
  const downtimeActivity = normalizeDowntimeActivity(agent.downtimeActivity)
  const downtimeSideWorkLast = normalizeDowntimeSideWorkLast(agent.downtimeSideWorkLast)
  const copingStreak = normalizeCopingStreak(agent.copingStreak)
  const fatigueChannels = normalizeFatigueChannels(agent.fatigueChannels)
  const overdrive = normalizeOverdrive(agent.overdrive)
  const energyBudget = agent.energyBudget
    ? normalizeEnergyBudget(agent.energyBudget)
    : undefined
  const recoveryRateBonus =
    typeof agent.recoveryRateBonus === 'number' && Number.isFinite(agent.recoveryRateBonus)
      ? Math.max(0, agent.recoveryRateBonus)
      : undefined

  return {
    ...agent,
    role,
    name: identity.name,
    specialization:
      typeof agent.specialization === 'string' && agent.specialization.trim().length > 0
        ? agent.specialization.trim()
        : role,
    operationalRole: deriveOperationalRole(role),
    age: identity.age,
    level: progression.level,
    identity,
    baseStats,
    stats,
    vitals,
    serviceRecord,
    readinessProfile,
    progression,
    equipment: normalizeEquipmentCounts(agent.equipment),
    equipmentSlots: normalizeEquipmentSlots(agent.equipmentSlots),
    traits,
    abilities,
    ...(Object.keys(abilityState).length > 0 ? { abilityState } : { abilityState: undefined }),
    history: normalizeAgentHistory(agent.history, agent.id, options.knownAgentIds),
    ...(attritionState !== undefined ? { attritionState } : { attritionState: undefined }),
    assignment,
    assignmentStatus: deriveAssignmentStatus(assignment),
    tags: [
      ...new Set((agent.tags ?? []).filter((tag) => typeof tag === 'string' && tag.length > 0)),
    ],
    relationships: normalizeRelationships(agent),
    trustDamageByAgent: normalizeTrustDamageByAgent(agent.trustDamageByAgent, options.knownAgentIds),
    trustConsequenceStack,
    performancePenaltyMultiplier: normalizePerformancePenaltyMultiplier(
      agent.performancePenaltyMultiplier,
      trustConsequenceStack
    ),
    recoveryStatus,
    trauma,
    downtimeActivity,
    downtimeSideWorkLast,
    copingStreak,
    fatigueChannels,
    overdrive,
    energyBudget,
    recoveryRateBonus,
    fatigue,
    status,
  }
}

export function normalizeAgentRecord<TAgents extends Record<string, Agent>>(
  agents: TAgents
): TAgents {
  return Object.fromEntries(
    Object.entries(agents).map(([agentId, agent]) => [agentId, normalizeAgent(agent)])
  ) as TAgents
}

export function isAgentNormalized(agent: Agent) {
  return (
    agent.identity !== undefined &&
    agent.identity.name === agent.name &&
    (agent.identity.age ?? agent.age) === (agent.age ?? agent.identity.age) &&
    (agent.identity.codename ?? agent.identity.callsign) ===
      (agent.identity.callsign ?? agent.identity.codename) &&
    agent.stats !== undefined &&
    agent.vitals !== undefined &&
    agent.vitals.stress === clampPercent(agent.fatigue, 0) &&
    typeof agent.vitals.morale === 'number' &&
    typeof agent.vitals.wounds === 'number' &&
    agent.progression !== undefined &&
    agent.level === agent.progression.level &&
    agent.specialization !== undefined &&
    agent.serviceRecord !== undefined &&
    agent.readinessProfile !== undefined &&
    agent.equipment !== undefined &&
    agent.equipmentSlots !== undefined &&
    agent.traits !== undefined &&
    agent.abilities !== undefined &&
    agent.history !== undefined &&
    agent.assignment !== undefined &&
    agent.assignmentStatus !== undefined
  )
}

export function isAgentRecordNormalized(agents: Record<string, Agent>) {
  return Object.values(agents).every(isAgentNormalized)
}

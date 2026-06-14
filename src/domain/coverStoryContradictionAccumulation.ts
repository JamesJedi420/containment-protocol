/**
 * SPE-1347 slice 4: weekly contradiction channel accumulation from trigger sources.
 *
 * Maps deterministic weekly trigger contracts (intake contradiction events, truth-layer
 * divergence, compliance breach, extranormal witness monitoring) onto cover-story
 * contradiction channels and bounded lifecycle transitions — without revealing hidden
 * operational truth in projections.
 */

import {
  deriveCoverStoryContradictionPressure,
  isValidCoverStoryLifecycleTransition,
  transitionCoverStoryLifecyclePhase,
  validateCoverStoryRecord,
  type CoverStoryContradictionChannel,
  type CoverStoryContradictionChannelKind,
  type CoverStoryLifecycleEvent,
  type CoverStoryLifecyclePhase,
  type CoverStoryRecord,
  type CoverStoryTransitionHistoryEntry,
} from './coverStoryLifecycleRegistry'
import type { ExtranormalEventRecord, ExtranormalEventRecordsMap } from './extranormalEventRegistry'
import type {
  InformationIntakeReportRecord,
  InformationIntakeReportsMap,
} from './informationIntakeReport'
import type { CaseInstance } from './models'
import {
  projectTruthLayerOpsView,
  type TruthLayerRecordsMap,
} from './truthLayerRecordRegistry'
import type { RuleDocumentComplianceRecordsMap } from './ruleDocumentComplianceContainmentRegistry'

export type CoverStoryContradictionTriggerKind =
  | 'intake_witness_contradiction'
  | 'intake_digital_trace'
  | 'intake_community_suspicion'
  | 'truth_layer_divergence'
  | 'compliance_breach'
  | 'extranormal_witness_monitoring'

export interface CoverStoryContradictionTrigger {
  readonly kind: CoverStoryContradictionTriggerKind
  readonly channel: CoverStoryContradictionChannelKind
  readonly delta: number
  readonly sourceRef: string
}

export interface CoverStoryContradictionTickInput {
  readonly week: number
  readonly priorIntakeReports?: InformationIntakeReportsMap | null
  readonly nextIntakeReports?: InformationIntakeReportsMap | null
  readonly truthLayerRecords?: TruthLayerRecordsMap | null
  readonly ruleDocumentComplianceRecords?: RuleDocumentComplianceRecordsMap | null
  readonly extranormalEventRecords?: ExtranormalEventRecordsMap | null
  readonly cases?: Record<string, CaseInstance> | null
}

export const COVER_STORY_CONTRADICTION_STRESS_THRESHOLD = 0.45
export const COVER_STORY_CONTRADICTION_COLLAPSE_THRESHOLD = 0.85

const MINOR_INTAKE_CONTRADICTION_DELTA = 0.12
const MAJOR_INTAKE_CONTRADICTION_DELTA = 0.22
const TRUTH_LAYER_DIVERGENCE_DELTA = 0.15
const COMPLIANCE_BREACH_DELTA = 0.18
const EXTRANORMAL_MONITORING_DELTA = 0.1
const COMMUNITY_SUSPICION_DELTA = 0.11

const ACCUMULATING_PHASES: ReadonlySet<CoverStoryLifecyclePhase> = new Set([
  'maintained',
  'stressed',
])

function normalizeWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase()
}

function splitTopicTokens(value: string): string[] {
  return value
    .split(/[^a-z0-9]+/i)
    .map((token) => token.toLowerCase().trim())
    .filter((token) => token.length >= 4)
}

function clampUnitScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(1, Math.max(0, value))
}

function freezeRecord(record: CoverStoryRecord): CoverStoryRecord {
  return Object.freeze({ ...record })
}

function collectCaseTopicTokens(currentCase: CaseInstance): Set<string> {
  const tokens = new Set<string>()
  const addTokens = (value: string) => {
    for (const token of splitTopicTokens(value)) {
      tokens.add(token)
    }
  }

  addTokens(currentCase.id)
  addTokens(currentCase.templateId)
  addTokens(currentCase.title)
  for (const tag of currentCase.tags) addTokens(tag)
  for (const tag of currentCase.requiredTags) addTokens(tag)
  for (const tag of currentCase.preferredTags) addTokens(tag)

  return tokens
}

function collectCoverStoryLinkTokens(record: CoverStoryRecord): Set<string> {
  const tokens = new Set<string>()
  const addTokens = (value: string | undefined) => {
    if (!value) {
      return
    }

    for (const token of splitTopicTokens(value)) {
      tokens.add(token)
    }

    tokens.add(normalizeToken(value))
  }

  addTokens(record.subjectRef)
  addTokens(record.parentCaseRef)
  addTokens(record.linkedTruthLayerRef)
  addTokens(record.linkedDisclosureRef)

  return tokens
}

function topicRefsOverlap(leftRef: string, rightRef: string): boolean {
  const left = normalizeToken(leftRef)
  const right = normalizeToken(rightRef)
  if (!left || !right) {
    return false
  }

  if (left === right) {
    return true
  }

  const leftTokens = new Set(splitTopicTokens(leftRef))
  for (const token of splitTopicTokens(rightRef)) {
    if (leftTokens.has(token)) {
      return true
    }
  }

  return false
}

function coverStoryLinksToCase(record: CoverStoryRecord, currentCase: CaseInstance): boolean {
  const parentCaseRef = normalizeToken(record.parentCaseRef ?? '')
  if (parentCaseRef && parentCaseRef === normalizeToken(currentCase.id)) {
    return true
  }

  const coverTokens = collectCoverStoryLinkTokens(record)
  const caseTokens = collectCaseTopicTokens(currentCase)
  for (const token of coverTokens) {
    if (caseTokens.has(token)) {
      return true
    }
  }

  return false
}

function coverStoryLinksToIntakeReport(
  record: CoverStoryRecord,
  report: InformationIntakeReportRecord,
  cases: readonly CaseInstance[]
): boolean {
  if (topicRefsOverlap(record.subjectRef, report.topicRef)) {
    return true
  }

  const normalizedTopic = normalizeToken(report.topicRef)
  for (const currentCase of cases) {
    if (currentCase.status === 'resolved') {
      continue
    }

    if (
      normalizeToken(currentCase.id) === normalizedTopic ||
      normalizeToken(currentCase.templateId) === normalizedTopic
    ) {
      if (coverStoryLinksToCase(record, currentCase)) {
        return true
      }
    }
  }

  const reportTokens = new Set(splitTopicTokens(report.topicRef))
  const coverTokens = collectCoverStoryLinkTokens(record)
  for (const token of coverTokens) {
    if (reportTokens.has(token)) {
      return true
    }
  }

  return false
}

function resolveIntakeContradictionChannel(
  report: InformationIntakeReportRecord
): CoverStoryContradictionChannelKind {
  if (
    report.initialSourceClass === 'rumor_chain' ||
    report.initialSourceClass === 'public_signal' ||
    report.initialSourceClass === 'off_channel'
  ) {
    return 'family_suspicion'
  }

  if (
    report.initialSourceClass === 'technical_trace' ||
    report.initialSourceClass === 'media_trace' ||
    report.initialSourceClass === 'archive_signature'
  ) {
    return 'digital_traces'
  }

  return 'witness_testimony'
}

function resolveIntakeContradictionTriggerKind(
  channel: CoverStoryContradictionChannelKind
): CoverStoryContradictionTriggerKind {
  if (channel === 'digital_traces') {
    return 'intake_digital_trace'
  }

  if (channel === 'family_suspicion') {
    return 'intake_community_suspicion'
  }

  return 'intake_witness_contradiction'
}

function resolveWeeklyIntakeContradictionTriggers(
  record: CoverStoryRecord,
  input: CoverStoryContradictionTickInput
): readonly CoverStoryContradictionTrigger[] {
  const priorReports = input.priorIntakeReports ?? {}
  const nextReports = input.nextIntakeReports ?? {}
  const cases = Object.values(input.cases ?? {})
  const normalizedWeek = normalizeWeek(input.week)
  const triggers: CoverStoryContradictionTrigger[] = []

  for (const reportId of Object.keys(nextReports).sort((left, right) => left.localeCompare(right))) {
    const nextReport = nextReports[reportId]
    if (!nextReport || !coverStoryLinksToIntakeReport(record, nextReport, cases)) {
      continue
    }

    const priorHistory = priorReports[reportId]?.contradictionHistory ?? []
    const priorEventIds = new Set(priorHistory.map((event) => event.eventId))

    for (const event of nextReport.contradictionHistory) {
      if (priorEventIds.has(event.eventId)) {
        continue
      }

      if (event.week !== normalizedWeek) {
        continue
      }

      const channel = resolveIntakeContradictionChannel(nextReport)
      const kind = resolveIntakeContradictionTriggerKind(channel)
      const delta =
        kind === 'intake_community_suspicion'
          ? COMMUNITY_SUSPICION_DELTA
          : event.severity === 'major'
            ? MAJOR_INTAKE_CONTRADICTION_DELTA
            : MINOR_INTAKE_CONTRADICTION_DELTA
      triggers.push({
        kind,
        channel,
        delta,
        sourceRef: event.sourceRef,
      })
    }
  }

  return triggers
}

function resolveWeeklyTruthLayerContradictionTriggers(
  record: CoverStoryRecord,
  input: CoverStoryContradictionTickInput
): readonly CoverStoryContradictionTrigger[] {
  const linkedRef = normalizeToken(record.linkedTruthLayerRef ?? '')
  if (!linkedRef) {
    return []
  }

  const truthLayerRecord = input.truthLayerRecords?.[linkedRef]
  if (!truthLayerRecord) {
    return []
  }

  const ops = projectTruthLayerOpsView(truthLayerRecord)
  if (!ops.layerDivergence && (ops.correctionPressure ?? 0) < 0.5) {
    return []
  }

  const normalizedWeek = normalizeWeek(input.week)
  return [
    {
      kind: 'truth_layer_divergence',
      channel: 'institutional_records',
      delta: TRUTH_LAYER_DIVERGENCE_DELTA,
      sourceRef: `truth-layer:divergence:${linkedRef}:w${normalizedWeek}`,
    },
  ]
}

function resolveWeeklyComplianceContradictionTriggers(
  record: CoverStoryRecord,
  input: CoverStoryContradictionTickInput
): readonly CoverStoryContradictionTrigger[] {
  const complianceRecords = Object.values(input.ruleDocumentComplianceRecords ?? {})
  if (complianceRecords.length === 0) {
    return []
  }

  const normalizedWeek = normalizeWeek(input.week)
  const coverTokens = collectCoverStoryLinkTokens(record)
  const triggers: CoverStoryContradictionTrigger[] = []

  for (const complianceRecord of complianceRecords.sort((left, right) =>
    left.id.localeCompare(right.id)
  )) {
    if (complianceRecord.complianceState !== 'breach') {
      continue
    }

    const complianceTokens = new Set<string>()
    for (const token of splitTopicTokens(complianceRecord.id)) {
      complianceTokens.add(token)
    }
    for (const token of splitTopicTokens(complianceRecord.label)) {
      complianceTokens.add(token)
    }
    for (const token of splitTopicTokens(complianceRecord.documentRef)) {
      complianceTokens.add(token)
    }

    const linked = [...coverTokens].some((token) => complianceTokens.has(token))
    if (!linked) {
      continue
    }

    triggers.push({
      kind: 'compliance_breach',
      channel: 'institutional_records',
      delta: COMPLIANCE_BREACH_DELTA,
      sourceRef: `compliance:breach:${complianceRecord.id}:w${normalizedWeek}`,
    })
  }

  return triggers
}

function extranormalEventLinksToCoverStory(
  record: CoverStoryRecord,
  event: ExtranormalEventRecord
): boolean {
  const coverTokens = collectCoverStoryLinkTokens(record)

  const candidateRefs = [
    event.intakeTopicRef,
    event.escalatedCaseRef,
    event.coverStoryCode,
    event.locationTag,
    event.themeRef,
    event.id,
    event.label,
  ]

  for (const ref of candidateRefs) {
    if (!ref) {
      continue
    }

    if (topicRefsOverlap(record.subjectRef, ref)) {
      return true
    }

    if (record.parentCaseRef && topicRefsOverlap(record.parentCaseRef, ref)) {
      return true
    }

    const refTokens = splitTopicTokens(ref)
    if (refTokens.some((token) => coverTokens.has(token))) {
      return true
    }
  }

  for (const selector of event.populationSelectors) {
    if (selector.kind !== 'location') {
      continue
    }

    if (topicRefsOverlap(record.subjectRef, selector.value)) {
      return true
    }
  }

  return false
}

function resolveWeeklyExtranormalContradictionTriggers(
  record: CoverStoryRecord,
  input: CoverStoryContradictionTickInput
): readonly CoverStoryContradictionTrigger[] {
  const events = Object.values(input.extranormalEventRecords ?? {})
  if (events.length === 0) {
    return []
  }

  const normalizedWeek = normalizeWeek(input.week)
  const triggers: CoverStoryContradictionTrigger[] = []

  for (const event of events.sort((left, right) => left.id.localeCompare(right.id))) {
    const witnessPlan = normalizeToken(event.witnessPlan ?? '')
    if (!witnessPlan) {
      continue
    }

    const monitoringUntilWeek = event.monitoringUntilWeek
    if (
      monitoringUntilWeek === undefined ||
      !Number.isFinite(monitoringUntilWeek) ||
      monitoringUntilWeek < normalizedWeek
    ) {
      continue
    }

    if (!extranormalEventLinksToCoverStory(record, event)) {
      continue
    }

    triggers.push({
      kind: 'extranormal_witness_monitoring',
      channel: 'active_surveillance',
      delta: EXTRANORMAL_MONITORING_DELTA,
      sourceRef: `extranormal:witness-monitoring:${event.id}:w${normalizedWeek}`,
    })
  }

  return triggers
}

/**
 * Resolves deterministic weekly contradiction triggers for one cover-story record.
 */
export function resolveWeeklyCoverStoryContradictionTriggers(
  record: CoverStoryRecord,
  input: CoverStoryContradictionTickInput
): readonly CoverStoryContradictionTrigger[] {
  if (!ACCUMULATING_PHASES.has(record.lifecyclePhase)) {
    return []
  }

  return Object.freeze([
    ...resolveWeeklyIntakeContradictionTriggers(record, input),
    ...resolveWeeklyTruthLayerContradictionTriggers(record, input),
    ...resolveWeeklyComplianceContradictionTriggers(record, input),
    ...resolveWeeklyExtranormalContradictionTriggers(record, input),
  ])
}

function channelAlreadyHasSourceRef(
  channels: readonly CoverStoryContradictionChannel[],
  sourceRef: string
): boolean {
  const normalizedRef = normalizeToken(sourceRef)
  return channels.some((channel) => normalizeToken(channel.sourceRef ?? '') === normalizedRef)
}

function upsertContradictionChannel(
  channels: readonly CoverStoryContradictionChannel[],
  trigger: CoverStoryContradictionTrigger,
  week: number
): readonly CoverStoryContradictionChannel[] {
  if (channelAlreadyHasSourceRef(channels, trigger.sourceRef)) {
    return channels
  }

  const existingIndex = channels.findIndex((channel) => channel.channel === trigger.channel)
  if (existingIndex >= 0) {
    const existing = channels[existingIndex]!
    const nextScore = clampUnitScore(existing.accumulationScore + trigger.delta)
    const updated: CoverStoryContradictionChannel = {
      channel: trigger.channel,
      accumulationScore: nextScore,
      lastUpdatedWeek: week,
      sourceRef: trigger.sourceRef,
    }

    const next = [...channels]
    next[existingIndex] = updated
    return next
  }

  return [
    ...channels,
    {
      channel: trigger.channel,
      accumulationScore: clampUnitScore(trigger.delta),
      lastUpdatedWeek: week,
      sourceRef: trigger.sourceRef,
    },
  ]
}

function seedChannelsFromExistingPressure(
  record: CoverStoryRecord
): readonly CoverStoryContradictionChannel[] {
  const channels = record.contradictionChannels ?? []
  if (channels.length > 0) {
    return channels
  }

  if (record.contradictionPressure === undefined) {
    return channels
  }

  return [
    {
      channel: 'institutional_records',
      accumulationScore: clampUnitScore(record.contradictionPressure),
      sourceRef: `seed:baseline-pressure:${record.id}`,
    },
  ]
}

/**
 * Applies weekly contradiction triggers onto channel scores. Idempotent when the same
 * sourceRef was already recorded on a channel.
 */
export function applyCoverStoryContradictionTriggers(
  record: CoverStoryRecord,
  triggers: readonly CoverStoryContradictionTrigger[],
  week: number
): CoverStoryRecord {
  if (triggers.length === 0) {
    return record
  }

  const normalizedWeek = normalizeWeek(week)
  let channels = seedChannelsFromExistingPressure(record)
  let changed = channels !== (record.contradictionChannels ?? [])

  for (const trigger of triggers) {
    const nextChannels = upsertContradictionChannel(channels, trigger, normalizedWeek)
    if (nextChannels !== channels) {
      channels = nextChannels
      changed = true
    }
  }

  if (!changed) {
    return record
  }

  const contradictionPressure = deriveCoverStoryContradictionPressure({
    ...record,
    contradictionChannels: channels,
    contradictionPressure: undefined,
  })

  return {
    ...record,
    contradictionChannels: channels,
    ...(contradictionPressure !== null ? { contradictionPressure } : {}),
  }
}

function appendLifecycleTransition(
  record: CoverStoryRecord,
  event: CoverStoryLifecycleEvent,
  week: number,
  note: string
): CoverStoryRecord | null {
  const fromPhase = record.lifecyclePhase
  const toPhase = transitionCoverStoryLifecyclePhase(fromPhase, event)
  if (toPhase === fromPhase || !isValidCoverStoryLifecycleTransition(fromPhase, event)) {
    return null
  }

  const entry: CoverStoryTransitionHistoryEntry = {
    fromPhase,
    toPhase,
    week,
    event,
    note,
  }

  return {
    ...record,
    lifecyclePhase: toPhase,
    transitionHistory: [...(record.transitionHistory ?? []), entry],
  }
}

function resolveLifecycleTransitionFromPressure(
  record: CoverStoryRecord,
  week: number
): CoverStoryRecord {
  const pressure =
    record.contradictionPressure ?? deriveCoverStoryContradictionPressure(record) ?? 0

  if (
    record.lifecyclePhase === 'maintained' &&
    pressure >= COVER_STORY_CONTRADICTION_STRESS_THRESHOLD
  ) {
    const transitioned = appendLifecycleTransition(
      record,
      'contradiction_accumulated',
      week,
      'Weekly contradiction channel accumulation crossed stress threshold.'
    )
    if (transitioned) {
      record = transitioned
    }
  }

  const postStressPressure =
    record.contradictionPressure ?? deriveCoverStoryContradictionPressure(record) ?? 0

  if (
    record.lifecyclePhase === 'stressed' &&
    postStressPressure >= COVER_STORY_CONTRADICTION_COLLAPSE_THRESHOLD
  ) {
    const transitioned = appendLifecycleTransition(
      record,
      'cover_collapsed',
      week,
      'Weekly contradiction pressure crossed collapse threshold.'
    )
    if (transitioned) {
      record = transitioned
    }
  }

  return record
}

/**
 * Advances one cover-story record for the simulation week using weekly trigger contracts.
 * Returns the same reference when no bounded field changes.
 */
export function advanceCoverStoryRecordContradictionForWeek(
  record: CoverStoryRecord,
  input: CoverStoryContradictionTickInput
): CoverStoryRecord {
  const normalizedWeek = normalizeWeek(input.week)
  const triggers = resolveWeeklyCoverStoryContradictionTriggers(record, input)
  let next = applyCoverStoryContradictionTriggers(record, triggers, normalizedWeek)
  next = resolveLifecycleTransitionFromPressure(next, normalizedWeek)

  if (next === record) {
    return record
  }

  if (!validateCoverStoryRecord(next).valid) {
    return record
  }

  return freezeRecord(next)
}

/**
 * Applies weekly contradiction accumulation across persisted cover-story records.
 * Empty map is a no-op. Re-applying for the same week is idempotent.
 */
export function applyWeeklyCoverStoryContradictionAccumulationTick(
  records: Record<string, CoverStoryRecord> | null | undefined,
  input: CoverStoryContradictionTickInput
): Record<string, CoverStoryRecord> {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return safeRecords
  }

  const next: Record<string, CoverStoryRecord> = { ...safeRecords }
  let changed = false

  for (const recordId of recordIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    const advanced = advanceCoverStoryRecordContradictionForWeek(record, input)
    if (advanced !== record) {
      next[recordId] = advanced
      changed = true
    }
  }

  return changed ? next : safeRecords
}

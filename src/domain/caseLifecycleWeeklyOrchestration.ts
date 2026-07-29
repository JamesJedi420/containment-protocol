/**
 * SPE-1310 slice 3–6: weekly lifecycle transition tick for persisted case lifecycleStage.
 *
 * Maps deterministic weekly event sources (intake credibility review pass, extranormal
 * anomaly confirmation, rule-document compliance breach/drift, procedure revision recovery,
 * presumed-neutralized disposition, adaptation-driven policy-tier upgrade) onto the slice-1
 * transition graph. Projects institutional classification labels (slice 6) from lifecycle
 * disposition only — not from operational containmentPolicyTier. Cases without
 * lifecycleStage are not auto-initialized; invalid transitions preserve the current stage.
 */

import type { CaseLifecycleEvent } from './caseLifecycleStateMachine'
import {
  PRESUMED_NEUTRALIZED_BREACH_READINESS_INTERVAL_WEEKS,
  PRESUMED_NEUTRALIZED_SURVEILLANCE_INTERVAL_WEEKS,
  containmentPolicyTierRank,
  isValidCaseLifecycleTransition,
  projectLifecycleInstitutionalLabel,
  transitionCaseLifecycleStage,
  upgradeContainmentPolicyTier,
} from './caseLifecycleStateMachine'
import type { RecurrentCatastropheRecord, RecurrentCatastropheRecordsMap } from './recurrentCatastropheAmeliorationRegistry'
import { resolveIntakeExtranormalTopicKeys } from './informationIntakeExtranormalCrossLink'
import type {
  InformationIntakeReportRecord,
  InformationIntakeReportsMap,
  InformationVerificationStatus,
} from './informationIntakeReport'
import type { ExtranormalEventRecordsMap } from './extranormalEventRegistry'
import type { CaseInstance } from './models'
import type {
  ComplianceState,
  RuleDocumentComplianceRecord,
  RuleDocumentComplianceRecordsMap,
} from './ruleDocumentComplianceContainmentRegistry'
import {
  readCaseScopedPrerequisiteProcessingOrders,
  registerCaseScopedPrerequisiteProcessingTerminalSignal,
  sanitizeCaseScopedPrerequisiteProcessingReservations,
  sanitizeCaseScopedPrerequisiteProcessingTerminalSignals,
  type CaseScopedPrerequisiteProcessingTerminalReason,
  type CaseScopedPrerequisiteProcessingTerminalSignalRegistry,
  type CaseScopedPrerequisiteTerminalSignalRegistrationResult,
} from './prerequisiteProcessingOrders'

const CREDIBILITY_REVIEW_PASSED_STATUSES: ReadonlySet<InformationVerificationStatus> = new Set([
  'verified',
  'escalated_confidence',
])

type WeeklyCaseLifecycleCaseContext = Pick<
  CaseInstance,
  'id' | 'templateId' | 'title' | 'status' | 'tags' | 'requiredTags' | 'preferredTags'
>

export interface WeeklyCaseLifecycleTickInput {
  readonly week: number
  readonly priorIntakeReports?: InformationIntakeReportsMap | null
  readonly nextIntakeReports?: InformationIntakeReportsMap | null
  readonly extranormalEventRecords?: ExtranormalEventRecordsMap | null
  readonly priorRuleDocumentComplianceRecords?: RuleDocumentComplianceRecordsMap | null
  readonly nextRuleDocumentComplianceRecords?: RuleDocumentComplianceRecordsMap | null
  readonly priorRecurrentCatastropheRecords?: RecurrentCatastropheRecordsMap | null
  readonly nextRecurrentCatastropheRecords?: RecurrentCatastropheRecordsMap | null
}

export interface WeeklyCaseLifecycleTickResult {
  readonly cases: Record<string, CaseInstance>
  readonly changed: boolean
  readonly appliedEvents: readonly AppliedCaseLifecycleEvent[]
  readonly appliedDispositions: readonly AppliedCaseLifecycleDisposition[]
}

export interface AppliedCaseLifecycleEvent {
  readonly caseId: string
  readonly event: CaseLifecycleEvent
  readonly fromStage: NonNullable<CaseInstance['lifecycleStage']>
  readonly toStage: NonNullable<CaseInstance['lifecycleStage']>
}

export interface AppliedCaseLifecycleDisposition {
  readonly caseId: string
  readonly kind: 'policy_tier_upgrade'
  readonly fromTier: NonNullable<CaseInstance['containmentPolicyTier']> | 'standard'
  readonly toTier: NonNullable<CaseInstance['containmentPolicyTier']>
}

export interface CaseLifecycleTerminalDisposition {
  readonly caseId: string
  readonly reason: CaseScopedPrerequisiteProcessingTerminalReason
  readonly terminalWeek: number
}

type CaseLifecycleTerminalSignalSource = {
  readonly week?: unknown
  readonly cases?: unknown
  readonly caseScopedPrerequisiteProcessingOrders?: unknown
  readonly caseScopedPrerequisiteProcessingReservations?: unknown
  readonly caseScopedPrerequisiteProcessingTerminalSignals?: unknown
  readonly departmentWorkshopCompletionOutcomes?: unknown
  readonly departmentWorkshopWorkOrders?: unknown
}

/**
 * Expands one explicit lifecycle disposition over that case's reserved
 * prerequisite work orders. Ordinary case state is deliberately not inspected
 * as terminal proof; every durable write still passes through the canonical
 * work-order registration seam.
 */
export function produceCaseLifecyclePrerequisiteProcessingTerminalSignals(
  source: CaseLifecycleTerminalSignalSource,
  disposition: CaseLifecycleTerminalDisposition
): CaseScopedPrerequisiteTerminalSignalRegistrationResult {
  const orders = readCaseScopedPrerequisiteProcessingOrders(source)
  const reservations = sanitizeCaseScopedPrerequisiteProcessingReservations(
    source.caseScopedPrerequisiteProcessingReservations,
    source
  )
  let signals: CaseScopedPrerequisiteProcessingTerminalSignalRegistry =
    sanitizeCaseScopedPrerequisiteProcessingTerminalSignals(
      source.caseScopedPrerequisiteProcessingTerminalSignals,
      source
    )
  const registeredWorkOrderIds: string[] = []
  const reasons: string[] = []
  const workOrderIds = Object.keys(orders)
    .filter(
      (workOrderId) =>
        orders[workOrderId]?.caseId === disposition.caseId &&
        reservations[workOrderId]?.caseId === disposition.caseId
    )
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))

  for (const workOrderId of workOrderIds) {
    const registration = registerCaseScopedPrerequisiteProcessingTerminalSignal(
      {
        ...source,
        caseScopedPrerequisiteProcessingTerminalSignals: signals,
      },
      workOrderId,
      disposition.reason,
      disposition.terminalWeek
    )
    signals = registration.signals
    registeredWorkOrderIds.push(...registration.registeredWorkOrderIds)
    reasons.push(...registration.reasons)
  }

  return Object.freeze({
    signals,
    registeredWorkOrderIds: Object.freeze(registeredWorkOrderIds),
    reasons: Object.freeze(reasons),
  })
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase()
}

function splitTopicTokens(topicRef: string): string[] {
  return topicRef
    .split(/[^a-z0-9]+/i)
    .map((token) => token.toLowerCase().trim())
    .filter((token) => token.length >= 4)
}

function collectCaseTopicTokens(currentCase: WeeklyCaseLifecycleCaseContext): Set<string> {
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

function topicKeysOverlap(leftRef: string, rightRef: string): boolean {
  const leftKeys = new Set(resolveIntakeExtranormalTopicKeys(leftRef))
  if (leftKeys.size === 0) {
    return false
  }

  for (const key of resolveIntakeExtranormalTopicKeys(rightRef)) {
    if (leftKeys.has(key)) {
      return true
    }
  }

  return false
}

function resolveIntakeReportLinkedCaseIds(
  report: InformationIntakeReportRecord,
  cases: readonly WeeklyCaseLifecycleCaseContext[]
): readonly string[] {
  const normalizedTopicRef = report.topicRef.trim().toLowerCase()
  const exactMatches = cases
    .filter((currentCase) => {
      if (currentCase.status === 'resolved') {
        return false
      }

      return (
        currentCase.id.trim().toLowerCase() === normalizedTopicRef ||
        currentCase.templateId.trim().toLowerCase() === normalizedTopicRef
      )
    })
    .map((currentCase) => currentCase.id)
    .sort((left, right) => left.localeCompare(right))

  if (exactMatches.length > 0) {
    return exactMatches
  }

  const topicTokens = splitTopicTokens(report.topicRef)
  if (topicTokens.length === 0) {
    return []
  }

  const matches: string[] = []
  for (const currentCase of cases) {
    if (currentCase.status === 'resolved') {
      continue
    }

    const caseTokens = collectCaseTopicTokens(currentCase)
    const hasMatch = topicTokens.some((token) => caseTokens.has(token))
    if (hasMatch) {
      matches.push(currentCase.id)
    }
  }

  return matches.sort((left, right) => left.localeCompare(right))
}

export function didIntakeCredibilityReviewPass(
  priorStatus: InformationVerificationStatus | undefined,
  nextStatus: InformationVerificationStatus
): boolean {
  const priorPassed = priorStatus !== undefined && CREDIBILITY_REVIEW_PASSED_STATUSES.has(priorStatus)
  const nextPassed = CREDIBILITY_REVIEW_PASSED_STATUSES.has(nextStatus)
  return !priorPassed && nextPassed
}

export function resolveCredibilityReviewPassedCaseIds(
  priorReports: InformationIntakeReportsMap | null | undefined,
  nextReports: InformationIntakeReportsMap | null | undefined,
  cases: Record<string, CaseInstance>
): readonly string[] {
  const safePrior = priorReports ?? {}
  const safeNext = nextReports ?? {}
  const caseContexts = Object.values(cases)
  const matched = new Set<string>()

  for (const reportId of Object.keys(safeNext).sort((left, right) => left.localeCompare(right))) {
    const priorReport = safePrior[reportId]
    const nextReport = safeNext[reportId]
    if (!nextReport) {
      continue
    }

    if (
      !didIntakeCredibilityReviewPass(priorReport?.verificationStatus, nextReport.verificationStatus)
    ) {
      continue
    }

    for (const caseId of resolveIntakeReportLinkedCaseIds(nextReport, caseContexts)) {
      matched.add(caseId)
    }
  }

  return [...matched].sort((left, right) => left.localeCompare(right))
}

function caseMatchesRegistryRef(
  currentCase: WeeklyCaseLifecycleCaseContext,
  registryRef: string
): boolean {
  const normalizedRef = normalizeToken(registryRef)
  if (!normalizedRef) {
    return false
  }

  if (
    normalizeToken(currentCase.id) === normalizedRef ||
    normalizeToken(currentCase.templateId) === normalizedRef
  ) {
    return true
  }

  return topicKeysOverlap(currentCase.id, registryRef) || topicKeysOverlap(currentCase.templateId, registryRef)
}

export function resolveAnomalyConfirmedCaseIds(
  events: ExtranormalEventRecordsMap | null | undefined,
  cases: Record<string, CaseInstance>
): readonly string[] {
  const safeEvents = events ?? {}
  const matched = new Set<string>()

  for (const eventId of Object.keys(safeEvents).sort((left, right) => left.localeCompare(right))) {
    const event = safeEvents[eventId]
    if (!event || event.closureState !== 'escalated_to_case') {
      continue
    }

    const registryRef = normalizeToken(event.escalatedCaseRef ?? '')
    if (!registryRef) {
      continue
    }

    for (const currentCase of Object.values(cases)) {
      if (currentCase.status === 'resolved') {
        continue
      }

      if (caseMatchesRegistryRef(currentCase, registryRef)) {
        matched.add(currentCase.id)
      }
    }
  }

  return [...matched].sort((left, right) => left.localeCompare(right))
}

const REVISION_HISTORY_REF_PREFIX = 'revision:'
const PRESUMED_NEUTRALIZED_REVISION_REF = 'revision:presumed-neutralized'

const COMPLIANCE_STATE_RECOVERY_RANK: Readonly<Record<ComplianceState, number>> = {
  compliant: 3,
  unknown: 2,
  drifting: 1,
  breach: 0,
}

function complianceRecordExplicitlyLinksToCase(
  record: RuleDocumentComplianceRecord,
  currentCase: WeeklyCaseLifecycleCaseContext
): boolean {
  const documentRef = normalizeToken(record.documentRef)
  if (!documentRef) {
    return false
  }

  return (
    normalizeToken(currentCase.id) === documentRef ||
    normalizeToken(currentCase.templateId) === documentRef
  )
}

/** First weekly crossing into drifting/breach, or drifting → breach escalation. */
export function didComplianceResearchInvalidationSignal(
  priorState: ComplianceState | undefined,
  nextState: ComplianceState
): boolean {
  const priorSignal = priorState === 'drifting' || priorState === 'breach'
  const nextSignal = nextState === 'drifting' || nextState === 'breach'

  if (!nextSignal) {
    return false
  }

  if (!priorSignal) {
    return true
  }

  return priorState === 'drifting' && nextState === 'breach'
}

export function resolveResearchInvalidationCaseIds(
  priorRecords: RuleDocumentComplianceRecordsMap | null | undefined,
  nextRecords: RuleDocumentComplianceRecordsMap | null | undefined,
  cases: Record<string, CaseInstance>
): readonly string[] {
  const safePrior = priorRecords ?? {}
  const safeNext = nextRecords ?? {}
  const matched = new Set<string>()

  for (const recordId of Object.keys(safeNext).sort((left, right) => left.localeCompare(right))) {
    const priorRecord = safePrior[recordId]
    const nextRecord = safeNext[recordId]
    if (!nextRecord) {
      continue
    }

    if (
      !didComplianceResearchInvalidationSignal(
        priorRecord?.complianceState,
        nextRecord.complianceState
      )
    ) {
      continue
    }

    for (const currentCase of Object.values(cases)) {
      if (currentCase.status === 'resolved') {
        continue
      }

      if (complianceRecordExplicitlyLinksToCase(nextRecord, currentCase)) {
        matched.add(currentCase.id)
      }
    }
  }

  return [...matched].sort((left, right) => left.localeCompare(right))
}

function complianceStateImproved(priorState: ComplianceState, nextState: ComplianceState): boolean {
  return COMPLIANCE_STATE_RECOVERY_RANK[nextState] > COMPLIANCE_STATE_RECOVERY_RANK[priorState]
}

function hasNewRevisionHistoryRef(
  priorRecord: RuleDocumentComplianceRecord,
  nextRecord: RuleDocumentComplianceRecord
): boolean {
  const priorRefs = new Set(priorRecord.revisionHistoryRefs ?? [])

  return (nextRecord.revisionHistoryRefs ?? []).some(
    (ref) => ref.startsWith(REVISION_HISTORY_REF_PREFIX) && !priorRefs.has(ref)
  )
}

/** Registry recovery: new revision ref logged while compliance state improves. */
export function didProcedureRevisionRecover(
  priorRecord: RuleDocumentComplianceRecord,
  nextRecord: RuleDocumentComplianceRecord
): boolean {
  if (!hasNewRevisionHistoryRef(priorRecord, nextRecord)) {
    return false
  }

  return complianceStateImproved(priorRecord.complianceState, nextRecord.complianceState)
}

function catastropheRecordExplicitlyLinksToCase(
  record: RecurrentCatastropheRecord,
  currentCase: WeeklyCaseLifecycleCaseContext
): boolean {
  const recordRef = normalizeToken(record.id)
  if (!recordRef) {
    return false
  }

  return (
    normalizeToken(currentCase.id) === recordRef ||
    normalizeToken(currentCase.templateId) === recordRef
  )
}

/** New presumed-neutralized revision ref while compliance remains compliant (false-clear label). */
export function didPresumedNeutralizationSignal(
  priorRecord: RuleDocumentComplianceRecord,
  nextRecord: RuleDocumentComplianceRecord
): boolean {
  if (nextRecord.complianceState !== 'compliant') {
    return false
  }

  const priorRefs = new Set(priorRecord.revisionHistoryRefs ?? [])

  return (nextRecord.revisionHistoryRefs ?? []).some(
    (ref) => ref === PRESUMED_NEUTRALIZED_REVISION_REF && !priorRefs.has(ref)
  )
}

export function resolvePresumedNeutralizedCaseIds(
  priorRecords: RuleDocumentComplianceRecordsMap | null | undefined,
  nextRecords: RuleDocumentComplianceRecordsMap | null | undefined,
  cases: Record<string, CaseInstance>
): readonly string[] {
  const safePrior = priorRecords ?? {}
  const safeNext = nextRecords ?? {}
  const matched = new Set<string>()

  for (const recordId of Object.keys(safeNext).sort((left, right) => left.localeCompare(right))) {
    const priorRecord = safePrior[recordId]
    const nextRecord = safeNext[recordId]
    if (!priorRecord || !nextRecord) {
      continue
    }

    if (!didPresumedNeutralizationSignal(priorRecord, nextRecord)) {
      continue
    }

    for (const currentCase of Object.values(cases)) {
      if (currentCase.status === 'resolved') {
        continue
      }

      if (complianceRecordExplicitlyLinksToCase(nextRecord, currentCase)) {
        matched.add(currentCase.id)
      }
    }
  }

  return [...matched].sort((left, right) => left.localeCompare(right))
}

/** Recurrence count advance on a linked catastrophe record signals demonstrated adaptation. */
export function didAdaptationDemonstratedSignal(
  priorRecord: RecurrentCatastropheRecord,
  nextRecord: RecurrentCatastropheRecord
): boolean {
  return nextRecord.recurrenceCount > priorRecord.recurrenceCount
}

export function resolveAdaptationDemonstratedCaseIds(
  priorRecords: RecurrentCatastropheRecordsMap | null | undefined,
  nextRecords: RecurrentCatastropheRecordsMap | null | undefined,
  cases: Record<string, CaseInstance>
): readonly string[] {
  const safePrior = priorRecords ?? {}
  const safeNext = nextRecords ?? {}
  const matched = new Set<string>()

  for (const recordId of Object.keys(safeNext).sort((left, right) => left.localeCompare(right))) {
    const priorRecord = safePrior[recordId]
    const nextRecord = safeNext[recordId]
    if (!priorRecord || !nextRecord) {
      continue
    }

    if (!didAdaptationDemonstratedSignal(priorRecord, nextRecord)) {
      continue
    }

    for (const currentCase of Object.values(cases)) {
      if (currentCase.status === 'resolved') {
        continue
      }

      if (catastropheRecordExplicitlyLinksToCase(nextRecord, currentCase)) {
        matched.add(currentCase.id)
      }
    }
  }

  return [...matched].sort((left, right) => left.localeCompare(right))
}

function normalizeLifecycleWeek(week: number): number {
  if (!Number.isFinite(week)) {
    return 1
  }

  return Math.max(1, Math.trunc(week))
}

export function applyPresumedNeutralizedSurveillanceClocks(
  caseData: CaseInstance,
  week: number
): CaseInstance {
  const normalizedWeek = normalizeLifecycleWeek(week)

  return {
    ...caseData,
    lifecycleSurveillanceDueWeek:
      normalizedWeek + PRESUMED_NEUTRALIZED_SURVEILLANCE_INTERVAL_WEEKS,
    lifecycleBreachReadinessDueWeek:
      normalizedWeek + PRESUMED_NEUTRALIZED_BREACH_READINESS_INTERVAL_WEEKS,
  }
}

export function applyLifecycleInstitutionalLabelProjection(
  caseData: CaseInstance
): CaseInstance {
  const projectedLabel = projectLifecycleInstitutionalLabel(caseData)
  if (projectedLabel === undefined) {
    if (caseData.lifecycleInstitutionalLabel === undefined) {
      return caseData
    }

    const nextCase = { ...caseData }
    delete nextCase.lifecycleInstitutionalLabel
    return nextCase
  }

  if (caseData.lifecycleInstitutionalLabel === projectedLabel) {
    return caseData
  }

  return {
    ...caseData,
    lifecycleInstitutionalLabel: projectedLabel,
  }
}

export function applyAdaptationPolicyTierUpgrade(caseData: CaseInstance): CaseInstance {
  const currentTier = caseData.containmentPolicyTier ?? 'standard'
  const nextTier = upgradeContainmentPolicyTier(currentTier)

  if (containmentPolicyTierRank(nextTier) === containmentPolicyTierRank(currentTier)) {
    return caseData
  }

  return {
    ...caseData,
    containmentPolicyTier: nextTier,
  }
}

export function resolveProcedureRevisedCaseIds(
  priorRecords: RuleDocumentComplianceRecordsMap | null | undefined,
  nextRecords: RuleDocumentComplianceRecordsMap | null | undefined,
  cases: Record<string, CaseInstance>
): readonly string[] {
  const safePrior = priorRecords ?? {}
  const safeNext = nextRecords ?? {}
  const matched = new Set<string>()

  for (const recordId of Object.keys(safeNext).sort((left, right) => left.localeCompare(right))) {
    const priorRecord = safePrior[recordId]
    const nextRecord = safeNext[recordId]
    if (!priorRecord || !nextRecord) {
      continue
    }

    if (!didProcedureRevisionRecover(priorRecord, nextRecord)) {
      continue
    }

    for (const currentCase of Object.values(cases)) {
      if (currentCase.status === 'resolved') {
        continue
      }

      if (complianceRecordExplicitlyLinksToCase(nextRecord, currentCase)) {
        matched.add(currentCase.id)
      }
    }
  }

  return [...matched].sort((left, right) => left.localeCompare(right))
}

export function applyCaseLifecycleEventToCase(
  caseData: CaseInstance,
  event: CaseLifecycleEvent
): CaseInstance {
  const currentStage = caseData.lifecycleStage
  if (currentStage === undefined) {
    return caseData
  }

  if (!isValidCaseLifecycleTransition(currentStage, event)) {
    return caseData
  }

  const nextStage = transitionCaseLifecycleStage(currentStage, event)
  if (nextStage === currentStage) {
    return caseData
  }

  return {
    ...caseData,
    lifecycleStage: nextStage,
  }
}

function resolveWeeklyCaseLifecycleEvents(
  cases: Record<string, CaseInstance>,
  input: WeeklyCaseLifecycleTickInput
): ReadonlyMap<string, readonly CaseLifecycleEvent[]> {
  const eventsByCase = new Map<string, CaseLifecycleEvent[]>()

  const appendEvent = (caseId: string, event: CaseLifecycleEvent) => {
    const existing = eventsByCase.get(caseId) ?? []
    if (!existing.includes(event)) {
      eventsByCase.set(caseId, [...existing, event])
    }
  }

  for (const caseId of resolveCredibilityReviewPassedCaseIds(
    input.priorIntakeReports,
    input.nextIntakeReports,
    cases
  )) {
    appendEvent(caseId, 'credibility_review_passed')
  }

  for (const caseId of resolveAnomalyConfirmedCaseIds(input.extranormalEventRecords, cases)) {
    appendEvent(caseId, 'anomaly_confirmed')
  }

  for (const caseId of resolveResearchInvalidationCaseIds(
    input.priorRuleDocumentComplianceRecords,
    input.nextRuleDocumentComplianceRecords,
    cases
  )) {
    appendEvent(caseId, 'research_invalidation')
  }

  for (const caseId of resolveProcedureRevisedCaseIds(
    input.priorRuleDocumentComplianceRecords,
    input.nextRuleDocumentComplianceRecords,
    cases
  )) {
    appendEvent(caseId, 'procedure_revised')
  }

  for (const caseId of resolvePresumedNeutralizedCaseIds(
    input.priorRuleDocumentComplianceRecords,
    input.nextRuleDocumentComplianceRecords,
    cases
  )) {
    appendEvent(caseId, 'presumed_neutralized_entered')
  }

  return eventsByCase
}

function resolveAdaptationPolicyTierUpgradeCaseIds(
  cases: Record<string, CaseInstance>,
  input: WeeklyCaseLifecycleTickInput
): readonly string[] {
  return resolveAdaptationDemonstratedCaseIds(
    input.priorRecurrentCatastropheRecords,
    input.nextRecurrentCatastropheRecords,
    cases
  ).filter((caseId) => {
    const currentCase = cases[caseId]
    return currentCase?.lifecycleStage === 'containment'
  })
}

/**
 * Applies one weekly lifecycle transition pass over cases with initialized lifecycleStage.
 * Empty case map is a no-op. Re-applying without new event sources is idempotent.
 */
export function applyWeeklyCaseLifecycleTick(
  cases: Record<string, CaseInstance> | null | undefined,
  input: WeeklyCaseLifecycleTickInput
): WeeklyCaseLifecycleTickResult {
  const safeCases = cases ?? {}
  const caseIds = Object.keys(safeCases)
  if (caseIds.length === 0) {
    return {
      cases: safeCases,
      changed: false,
      appliedEvents: [],
      appliedDispositions: [],
    }
  }

  const normalizedWeek = normalizeLifecycleWeek(input.week)
  const eventsByCase = resolveWeeklyCaseLifecycleEvents(safeCases, input)
  const adaptationCaseIds = resolveAdaptationPolicyTierUpgradeCaseIds(safeCases, input)

  const nextCases: Record<string, CaseInstance> = { ...safeCases }
  const appliedEvents: AppliedCaseLifecycleEvent[] = []
  const appliedDispositions: AppliedCaseLifecycleDisposition[] = []
  let changed = false

  for (const caseId of [...eventsByCase.keys()].sort((left, right) => left.localeCompare(right))) {
    const currentCase = safeCases[caseId]
    const events = eventsByCase.get(caseId)
    if (!currentCase || !events || events.length === 0) {
      continue
    }

    let workingCase = currentCase
    for (const event of events) {
      const fromStage = workingCase.lifecycleStage
      const updatedCase = applyCaseLifecycleEventToCase(workingCase, event)
      if (updatedCase === workingCase) {
        continue
      }

      if (fromStage !== undefined && updatedCase.lifecycleStage !== undefined) {
        appliedEvents.push({
          caseId,
          event,
          fromStage,
          toStage: updatedCase.lifecycleStage,
        })
      }

      workingCase =
        updatedCase.lifecycleStage === 'presumed_neutralized'
          ? applyPresumedNeutralizedSurveillanceClocks(updatedCase, normalizedWeek)
          : updatedCase
      changed = true
    }

    if (workingCase !== currentCase) {
      nextCases[caseId] = workingCase
    }
  }

  for (const caseId of adaptationCaseIds) {
    const currentCase = nextCases[caseId] ?? safeCases[caseId]
    if (!currentCase || currentCase.lifecycleStage !== 'containment') {
      continue
    }

    const fromTier = currentCase.containmentPolicyTier ?? 'standard'
    const updatedCase = applyAdaptationPolicyTierUpgrade(currentCase)
    if (updatedCase === currentCase) {
      continue
    }

    const toTier = updatedCase.containmentPolicyTier
    if (toTier === undefined) {
      continue
    }

    appliedDispositions.push({
      caseId,
      kind: 'policy_tier_upgrade',
      fromTier,
      toTier,
    })
    nextCases[caseId] = updatedCase
    changed = true
  }

  for (const caseId of Object.keys(nextCases).sort((left, right) => left.localeCompare(right))) {
    const currentCase = nextCases[caseId]
    if (!currentCase || currentCase.lifecycleStage === undefined) {
      continue
    }

    const projectedCase = applyLifecycleInstitutionalLabelProjection(currentCase)
    if (projectedCase !== currentCase) {
      nextCases[caseId] = projectedCase
      changed = true
    }
  }

  return {
    cases: changed ? nextCases : safeCases,
    changed,
    appliedEvents,
    appliedDispositions,
  }
}

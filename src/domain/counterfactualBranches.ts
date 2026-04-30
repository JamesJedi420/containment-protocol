import type { WorldRemapZone, WorldZoneStatus } from './simulationMapInterface'
import {
  projectOperationalRealityAssessment,
  projectRealityRuleFamilyAssessment,
  projectRealityScopeAssessment,
  type RealityRuleFamilyType,
  type RealityScopeLevel,
  type RealityStatePacket,
} from './realityModel'

export type CounterfactualBranchCondition =
  | 'removed_before_response'
  | 'removed_during_response'
  | 'never_arrived'

export type CounterfactualCivicConsequenceKind =
  | 'hostile_dominance'
  | 'route_loss'
  | 'curfew_pressure'
  | 'institutional_degradation'
  | 'resistance_pocket_emergence'

export type CounterfactualConsequenceSeverity = 'low' | 'medium' | 'high'
export type SupportContinuityStatus = 'stable' | 'fragile' | 'failed'
export type UnsyncedResponderMode = 'arrives_capable_unsynced' | 'operational_non_buy_in'
export type UnsyncedResponderBuyIn = 'absent' | 'conditional'
export type CounterfactualOptionAvailability =
  | 'available'
  | 'blocked'
  | 'unknown'
  | 'falsely_perceived'
export type CounterfactualReviewSurface = 'responsibility' | 'retraining' | 'doctrine'
export type FamiliarHostileRole =
  | 'hostile_enforcer'
  | 'curfew_broker'
  | 'institutional_turncoat'
  | 'resistance_hunter'

export interface CounterfactualRemovedActorInput {
  actorId: string
  actorName: string
  stabilizingRole: string
  locationId: string
  locationLabel: string
}

export interface CounterfactualBranchTriggerInput {
  timelineId: string
  condition: CounterfactualBranchCondition
  conditionLabel: string
}

export interface CounterfactualCivicConsequenceInput {
  kind: CounterfactualCivicConsequenceKind
  zoneId: string
  zoneLabel: string
  summary: string
  severity?: CounterfactualConsequenceSeverity
}

export interface CounterfactualSupportContinuityInput {
  failedSupportIds: readonly string[]
  failureSignals: readonly string[]
  summary: string
}

export interface CounterfactualUnsyncedResponderInput {
  responderId: string
  responderName: string
  responderRole: string
  arrivalMode: UnsyncedResponderMode
  buyIn: UnsyncedResponderBuyIn
  summary: string
}

export interface CounterfactualInvertedActorInput {
  actorId: string
  actorName: string
  familiarRole: string
  hostileRole: FamiliarHostileRole
  summary: string
}

export interface CounterfactualOptionAuditEntryInput {
  optionId: string
  label: string
  availability: CounterfactualOptionAvailability
  summary: string
  reviewSurfaces: readonly CounterfactualReviewSurface[]
  blockerReason?: string
  uncertaintyReason?: string
  falsePerceptionSource?: string
}

export interface CounterfactualOptionAuditInput {
  decisionMomentId: string
  decisionMomentLabel: string
  certaintyNote?: string
  options: readonly CounterfactualOptionAuditEntryInput[]
}

export interface CounterfactualBranchAuthoringInput {
  removedActor: CounterfactualRemovedActorInput
  trigger: CounterfactualBranchTriggerInput
  civicConsequences: readonly CounterfactualCivicConsequenceInput[]
  supportContinuity: CounterfactualSupportContinuityInput
  unsyncedResponder: CounterfactualUnsyncedResponderInput
  invertedFamiliarActors: readonly CounterfactualInvertedActorInput[]
  optionAudit?: CounterfactualOptionAuditInput
}

export interface CounterfactualBranchIdentity {
  branchId: string
  branchKey: string
  timelineId: string
  removedActorId: string
  branchCondition: CounterfactualBranchCondition
}

export interface CounterfactualRemovedActor {
  actorId: string
  actorName: string
  stabilizingRole: string
  locationId: string
  locationLabel: string
}

export interface CounterfactualCivicConsequence {
  consequenceId: string
  kind: CounterfactualCivicConsequenceKind
  zoneId: string
  zoneLabel: string
  severity: CounterfactualConsequenceSeverity
  summary: string
}

export interface CounterfactualSupportContinuityState {
  status: SupportContinuityStatus
  failedSupportIds: string[]
  failureSignals: string[]
  summary: string
}

export interface CounterfactualUnsyncedResponderState {
  responderId: string
  responderName: string
  responderRole: string
  arrivalMode: UnsyncedResponderMode
  buyIn: UnsyncedResponderBuyIn
  summary: string
}

export interface CounterfactualInvertedActor {
  actorId: string
  actorName: string
  familiarRole: string
  hostileRole: FamiliarHostileRole
  summary: string
}

export interface CounterfactualOptionAuditEntry {
  optionId: string
  label: string
  availability: CounterfactualOptionAvailability
  summary: string
  reviewSurfaces: CounterfactualReviewSurface[]
  blockerReason?: string
  uncertaintyReason?: string
  falsePerceptionSource?: string
}

export interface CounterfactualOptionAudit {
  reviewFrame: 'bounded_counterfactual_branch_review'
  decisionMomentId: string
  decisionMomentLabel: string
  certaintyNote: string
  options: CounterfactualOptionAuditEntry[]
  counts: Record<CounterfactualOptionAvailability, number>
  surfaceSignals: Record<CounterfactualReviewSurface, string[]>
}

export interface CounterfactualBranchPacket {
  identity: CounterfactualBranchIdentity
  removedActor: CounterfactualRemovedActor
  trigger: {
    condition: CounterfactualBranchCondition
    conditionLabel: string
  }
  civicConsequences: CounterfactualCivicConsequence[]
  supportContinuity: CounterfactualSupportContinuityState
  unsyncedResponder: CounterfactualUnsyncedResponderState
  invertedFamiliarActors: CounterfactualInvertedActor[]
  optionAudit?: CounterfactualOptionAudit
}

export interface CounterfactualBranchWorldRemap {
  branchId: string
  worldZones: WorldRemapZone[]
  actionableSignals: string[]
  supportContinuityStatus: SupportContinuityStatus
}

export interface CounterfactualBranchReviewSummary {
  branchId: string
  reviewFrame: 'bounded_counterfactual_branch_review'
  decisionMomentLabel: string
  certaintyNote: string
  optionCounts: Record<CounterfactualOptionAvailability, number>
  availableAlternatives: string[]
  blockedAlternatives: string[]
  unknownAlternatives: string[]
  falselyPerceivedAlternatives: string[]
  responsibilitySignals: string[]
  retrainingSignals: string[]
  doctrineSignals: string[]
}

export interface CounterfactualOntologyAwareBranchReviewInput {
  branch: CounterfactualBranchPacket
  consequenceReality: RealityStatePacket
  evaluationFamilyType?: RealityRuleFamilyType
  evaluationScope?: RealityScopeLevel
}

export interface CounterfactualOntologyAwareOptionReview {
  optionId: string
  label: string
  perceivedAvailability: CounterfactualOptionAvailability
  actualAvailability: CounterfactualOptionAvailability
  reviewReason: string
}

export interface CounterfactualOntologyAwareBranchReviewSummary {
  branchId: string
  reviewFrame: 'ontology_aware_counterfactual_branch_review'
  decisionMomentLabel: string
  actualConsequenceState: string
  perceivedConsequenceState: string
  believedConsequenceState: string
  observationStatus: RealityStatePacket['observationStatus']
  ontologyConfidence: 'high' | 'qualified' | 'low'
  actualOptionCounts: Record<CounterfactualOptionAvailability, number>
  perceivedOptionCounts: Record<CounterfactualOptionAvailability, number>
  optionReviews: CounterfactualOntologyAwareOptionReview[]
  responsibilitySignals: string[]
  retrainingSignals: string[]
  doctrineSignals: string[]
  certaintyNote: string
}

function normalizeString(value: string | undefined | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function slugify(value: string) {
  return normalizeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function uniqueSorted(values: readonly string[]) {
  return Array.from(
    new Set(values.map((value) => normalizeString(value)).filter((value) => value.length > 0))
  ).sort((left, right) => left.localeCompare(right))
}

function sortById<T>(values: readonly T[], key: keyof T) {
  return [...values].sort((left, right) =>
    String(left[key]).localeCompare(String(right[key]))
  )
}

function getSeverityWeight(severity: CounterfactualConsequenceSeverity) {
  switch (severity) {
    case 'high':
      return 0.9
    case 'medium':
      return 0.82
    case 'low':
    default:
      return 0.74
  }
}

function createEmptyOptionCounts(): Record<CounterfactualOptionAvailability, number> {
  return {
    available: 0,
    blocked: 0,
    unknown: 0,
    falsely_perceived: 0,
  }
}

function createEmptySurfaceSignals(): Record<CounterfactualReviewSurface, string[]> {
  return {
    responsibility: [],
    retraining: [],
    doctrine: [],
  }
}

function pushUniqueSignal(target: string[], value: string) {
  const normalized = normalizeString(value)
  if (normalized.length > 0) {
    target.push(normalized)
  }
}

function toWorldZoneStatus(kind: CounterfactualCivicConsequenceKind): WorldZoneStatus {
  switch (kind) {
    case 'hostile_dominance':
      return 'hostile_territory'
    case 'route_loss':
      return 'industrial_kill_site'
    case 'curfew_pressure':
      return 'curfew_zone'
    case 'institutional_degradation':
      return 'abandoned_hub'
    case 'resistance_pocket_emergence':
      return 'resistance_pocket'
  }
}

function toRouteAccess(kind: CounterfactualCivicConsequenceKind): WorldRemapZone['routeAccess'] {
  switch (kind) {
    case 'hostile_dominance':
    case 'route_loss':
      return 'severed'
    case 'curfew_pressure':
    case 'institutional_degradation':
    case 'resistance_pocket_emergence':
    default:
      return 'reduced'
  }
}

function toContinuity(kind: CounterfactualCivicConsequenceKind): WorldRemapZone['continuity'] {
  switch (kind) {
    case 'hostile_dominance':
    case 'route_loss':
    case 'institutional_degradation':
      return 'broken'
    case 'curfew_pressure':
    case 'resistance_pocket_emergence':
    default:
      return 'fragile'
  }
}

function toPressureSource(kind: CounterfactualCivicConsequenceKind) {
  switch (kind) {
    case 'hostile_dominance':
      return 'hostile_dominance'
    case 'route_loss':
      return 'route_loss'
    case 'curfew_pressure':
      return 'curfew_pressure'
    case 'institutional_degradation':
      return 'institutional_degradation'
    case 'resistance_pocket_emergence':
      return 'resistance_pocket_emergence'
  }
}

function buildSupportContinuityState(
  input: CounterfactualSupportContinuityInput
): CounterfactualSupportContinuityState {
  const failedSupportIds = uniqueSorted(input.failedSupportIds)
  const failureSignals = uniqueSorted(input.failureSignals)
  const status: SupportContinuityStatus =
    failedSupportIds.length > 0 || failureSignals.length > 0 ? 'failed' : 'stable'

  return {
    status,
    failedSupportIds,
    failureSignals,
    summary: normalizeString(input.summary),
  }
}

function buildOptionAudit(
  input: CounterfactualOptionAuditInput,
  branchId: string
): CounterfactualOptionAudit {
  const options = sortById(
    input.options.map((option) => ({
      optionId: normalizeString(option.optionId),
      label: normalizeString(option.label),
      availability: option.availability,
      summary: normalizeString(option.summary),
      reviewSurfaces: uniqueSorted(option.reviewSurfaces).filter(
        (surface): surface is CounterfactualReviewSurface =>
          surface === 'responsibility' || surface === 'retraining' || surface === 'doctrine'
      ),
      ...(normalizeString(option.blockerReason)
        ? { blockerReason: normalizeString(option.blockerReason) }
        : {}),
      ...(normalizeString(option.uncertaintyReason)
        ? { uncertaintyReason: normalizeString(option.uncertaintyReason) }
        : {}),
      ...(normalizeString(option.falsePerceptionSource)
        ? { falsePerceptionSource: normalizeString(option.falsePerceptionSource) }
        : {}),
    })),
    'optionId'
  )

  const counts = createEmptyOptionCounts()
  const surfaceSignals = createEmptySurfaceSignals()

  for (const option of options) {
    counts[option.availability] += 1

    for (const surface of option.reviewSurfaces) {
      switch (option.availability) {
        case 'available':
          surfaceSignals[surface].push(
            `${option.label} remained available at ${input.decisionMomentLabel}.`
          )
          break
        case 'blocked':
          surfaceSignals[surface].push(
            `${option.label} was blocked${option.blockerReason ? `: ${option.blockerReason}` : '.'}`
          )
          break
        case 'unknown':
          surfaceSignals[surface].push(
            `${option.label} remained unknown at review time${option.uncertaintyReason ? `: ${option.uncertaintyReason}` : '.'}`
          )
          break
        case 'falsely_perceived':
          surfaceSignals[surface].push(
            `${option.label} was falsely perceived as viable${option.falsePerceptionSource ? `: ${option.falsePerceptionSource}` : '.'}`
          )
          break
      }
    }
  }

  return {
    reviewFrame: 'bounded_counterfactual_branch_review',
    decisionMomentId: `${branchId}:review:${slugify(input.decisionMomentId)}`,
    decisionMomentLabel: normalizeString(input.decisionMomentLabel),
    certaintyNote:
      normalizeString(input.certaintyNote) ||
      'Bounded counterfactual review from authored branch inputs; does not assert omniscient rewind truth.',
    options,
    counts,
    surfaceSignals: {
      responsibility: uniqueSorted(surfaceSignals.responsibility),
      retraining: uniqueSorted(surfaceSignals.retraining),
      doctrine: uniqueSorted(surfaceSignals.doctrine),
    },
  }
}

export function deriveCounterfactualBranchFromRemoval(
  input: CounterfactualBranchAuthoringInput
): CounterfactualBranchPacket {
  const removedActor: CounterfactualRemovedActor = {
    actorId: normalizeString(input.removedActor.actorId),
    actorName: normalizeString(input.removedActor.actorName),
    stabilizingRole: normalizeString(input.removedActor.stabilizingRole),
    locationId: normalizeString(input.removedActor.locationId),
    locationLabel: normalizeString(input.removedActor.locationLabel),
  }
  const timelineId = normalizeString(input.trigger.timelineId)
  const condition = input.trigger.condition
  const branchKey = `${removedActor.actorId}:${condition}:${removedActor.locationId}`
  const branchId = `counterfactual:${slugify(timelineId)}:${slugify(removedActor.locationId)}:${slugify(removedActor.actorId)}:${slugify(condition)}`

  const civicConsequences = sortById(
    input.civicConsequences.map((consequence) => {
      const kind = consequence.kind
      const zoneId = normalizeString(consequence.zoneId)
      return {
        consequenceId: `${branchId}:civic:${slugify(kind)}:${slugify(zoneId)}`,
        kind,
        zoneId,
        zoneLabel: normalizeString(consequence.zoneLabel),
        severity: consequence.severity ?? 'medium',
        summary: normalizeString(consequence.summary),
      }
    }),
    'consequenceId'
  )

  const invertedFamiliarActors = sortById(
    input.invertedFamiliarActors.map((actor) => ({
      actorId: normalizeString(actor.actorId),
      actorName: normalizeString(actor.actorName),
      familiarRole: normalizeString(actor.familiarRole),
      hostileRole: actor.hostileRole,
      summary: normalizeString(actor.summary),
    })),
    'actorId'
  )

  return {
    identity: {
      branchId,
      branchKey,
      timelineId,
      removedActorId: removedActor.actorId,
      branchCondition: condition,
    },
    removedActor,
    trigger: {
      condition,
      conditionLabel: normalizeString(input.trigger.conditionLabel),
    },
    civicConsequences,
    supportContinuity: buildSupportContinuityState(input.supportContinuity),
    unsyncedResponder: {
      responderId: normalizeString(input.unsyncedResponder.responderId),
      responderName: normalizeString(input.unsyncedResponder.responderName),
      responderRole: normalizeString(input.unsyncedResponder.responderRole),
      arrivalMode: input.unsyncedResponder.arrivalMode,
      buyIn: input.unsyncedResponder.buyIn,
      summary: normalizeString(input.unsyncedResponder.summary),
    },
    invertedFamiliarActors,
    ...(input.optionAudit
      ? {
          optionAudit: buildOptionAudit(input.optionAudit, branchId),
        }
      : {}),
  }
}

export function projectCounterfactualBranchWorldRemap(
  branch: CounterfactualBranchPacket
): CounterfactualBranchWorldRemap {
  const worldZones = sortById(
    branch.civicConsequences.map((consequence) => ({
      id: consequence.zoneId,
      label: consequence.zoneLabel,
      status: toWorldZoneStatus(consequence.kind),
      routeAccess: toRouteAccess(consequence.kind),
      continuity: toContinuity(consequence.kind),
      confidence: getSeverityWeight(consequence.severity),
      pressureSources: uniqueSorted([
        toPressureSource(consequence.kind),
        `removed_actor:${branch.removedActor.actorId}`,
        `branch_condition:${branch.trigger.condition}`,
      ]),
    })),
    'id'
  )

  const actionableSignals = uniqueSorted([
    ...branch.civicConsequences.map((consequence) => consequence.summary),
    branch.supportContinuity.status === 'failed'
      ? `Support continuity has failed after ${branch.removedActor.actorName} was removed.`
      : '',
    branch.unsyncedResponder.buyIn === 'absent'
      ? `${branch.unsyncedResponder.responderName} arrives capable but without local buy-in.`
      : `${branch.unsyncedResponder.responderName} arrives capable but only conditionally aligned.`,
    ...branch.invertedFamiliarActors.map(
      (actor) => `${actor.actorName} has inverted into a hostile ${actor.hostileRole.replace(/_/g, ' ')} role.`
    ),
  ]).slice(0, 8)

  return {
    branchId: branch.identity.branchId,
    worldZones,
    actionableSignals,
    supportContinuityStatus: branch.supportContinuity.status,
  }
}

export function projectCounterfactualBranchReviewSummary(
  branch: CounterfactualBranchPacket
): CounterfactualBranchReviewSummary | null {
  if (!branch.optionAudit) {
    return null
  }

  return {
    branchId: branch.identity.branchId,
    reviewFrame: branch.optionAudit.reviewFrame,
    decisionMomentLabel: branch.optionAudit.decisionMomentLabel,
    certaintyNote: branch.optionAudit.certaintyNote,
    optionCounts: { ...branch.optionAudit.counts },
    availableAlternatives: branch.optionAudit.options
      .filter((option) => option.availability === 'available')
      .map((option) => option.label),
    blockedAlternatives: branch.optionAudit.options
      .filter((option) => option.availability === 'blocked')
      .map((option) => option.label),
    unknownAlternatives: branch.optionAudit.options
      .filter((option) => option.availability === 'unknown')
      .map((option) => option.label),
    falselyPerceivedAlternatives: branch.optionAudit.options
      .filter((option) => option.availability === 'falsely_perceived')
      .map((option) => option.label),
    responsibilitySignals: [...branch.optionAudit.surfaceSignals.responsibility],
    retrainingSignals: [...branch.optionAudit.surfaceSignals.retraining],
    doctrineSignals: [...branch.optionAudit.surfaceSignals.doctrine],
  }
}

export function projectOntologyAwareCounterfactualBranchReview(
  input: CounterfactualOntologyAwareBranchReviewInput
): CounterfactualOntologyAwareBranchReviewSummary | null {
  const { branch, consequenceReality } = input
  if (!branch.optionAudit) {
    return null
  }

  const operationalAssessment = projectOperationalRealityAssessment(consequenceReality)
  const ruleFamilyAssessment = consequenceReality.ruleFamilyProfile
    ? projectRealityRuleFamilyAssessment(
        consequenceReality,
        input.evaluationFamilyType ?? 'baseline_physical'
      )
    : null
  const scopeAssessment =
    consequenceReality.scopeProfile && input.evaluationScope
      ? projectRealityScopeAssessment(consequenceReality, input.evaluationScope)
      : null

  const actualOptionCounts = createEmptyOptionCounts()
  const perceivedOptionCounts = { ...branch.optionAudit.counts }
  const surfaceSignals = createEmptySurfaceSignals()

  const optionReviews = branch.optionAudit.options.map((option) => {
    let actualAvailability = option.availability
    const reviewReasons: string[] = []
    let ruleOutcomeApplied = false

    if (
      ruleFamilyAssessment &&
      scopeAssessment?.overrideApplies !== false &&
      ruleFamilyAssessment.validityPosture === 'allow_under_declared_override'
    ) {
      const allowedOutcomes = consequenceReality.ruleFamilyProfile?.allowedOutcomes ?? []
      const invalidatedOutcomes = consequenceReality.ruleFamilyProfile?.invalidatedOutcomes ?? []

      if (invalidatedOutcomes.includes(option.optionId)) {
        actualAvailability = 'blocked'
        reviewReasons.push('invalidated by active declared rule family')
        ruleOutcomeApplied = true
      } else if (allowedOutcomes.includes(option.optionId)) {
        actualAvailability = 'available'
        reviewReasons.push('enabled by active declared rule family')
        ruleOutcomeApplied = true
      }
    }

    if (
      !ruleOutcomeApplied &&
      ruleFamilyAssessment?.validityPosture === 'deny_until_triggered' &&
      (consequenceReality.ruleFamilyProfile?.allowedOutcomes ?? []).includes(option.optionId)
    ) {
      actualAvailability = 'blocked'
      reviewReasons.push('blocked because declared trigger conditions were inactive')
    }

    if (
      !ruleOutcomeApplied &&
      ruleFamilyAssessment?.validityPosture === 'wrong_family_contradiction' &&
      option.availability === 'available'
    ) {
      actualAvailability = 'falsely_perceived'
      reviewReasons.push('evaluated under the wrong active rule family')
    }

    if (
      consequenceReality.observationStatus === 'false_reading' &&
      option.availability === 'available' &&
      actualAvailability === 'available'
    ) {
      actualAvailability = 'falsely_perceived'
      reviewReasons.push('perceived branch condition diverged from actual branch consequence')
    }

    if (
      consequenceReality.observationStatus === 'uncertain' &&
      option.availability === 'available' &&
      actualAvailability === 'available'
    ) {
      actualAvailability = 'unknown'
      reviewReasons.push('actual branch consequence remained ontology-uncertain')
    }

    if (
      scopeAssessment &&
      scopeAssessment.overrideApplies &&
      scopeAssessment.handlingMode === 'broad_override_handling'
    ) {
      reviewReasons.push(`override propagated to ${scopeAssessment.evaluationScope} scope`)
    } else if (
      scopeAssessment &&
      !scopeAssessment.overrideApplies &&
      consequenceReality.scopeProfile &&
      consequenceReality.ruleFamilyProfile &&
      consequenceReality.ruleFamilyProfile.familyType !== 'baseline_physical'
    ) {
      reviewReasons.push(`baseline truth remained preserved at ${scopeAssessment.evaluationScope} scope`)
    }

    const reviewReason =
      reviewReasons.length > 0
        ? uniqueSorted(reviewReasons).join('; ')
        : 'authored branch review remained unchanged under current ontology evidence'

    actualOptionCounts[actualAvailability] += 1

    const signal =
      actualAvailability === option.availability
        ? `${option.label} remains ${actualAvailability.replace(/_/g, ' ')} under ontology-aware review.`
        : `${option.label} shifts from ${option.availability.replace(/_/g, ' ')} to ${actualAvailability.replace(/_/g, ' ')}: ${reviewReason}.`

    for (const surface of option.reviewSurfaces) {
      pushUniqueSignal(surfaceSignals[surface], signal)
    }

    return {
      optionId: option.optionId,
      label: option.label,
      perceivedAvailability: option.availability,
      actualAvailability,
      reviewReason,
    }
  })

  const ontologyConfidence: CounterfactualOntologyAwareBranchReviewSummary['ontologyConfidence'] =
    operationalAssessment.visibilityTrust === 'trusted' &&
    (!scopeAssessment || scopeAssessment.truthStatus === 'baseline_preserved' || scopeAssessment.overrideApplies) &&
    (!ruleFamilyAssessment || ruleFamilyAssessment.validityPosture === 'allow_under_baseline' || ruleFamilyAssessment.validityPosture === 'allow_under_declared_override')
      ? 'high'
      : consequenceReality.observationStatus === 'false_reading' ||
          consequenceReality.observationStatus === 'uncertain' ||
          ruleFamilyAssessment?.validityPosture === 'hold_for_rule_verification' ||
          scopeAssessment?.truthStatus === 'uncertain'
        ? 'low'
        : 'qualified'

  const certaintyParts = [
    branch.optionAudit.certaintyNote,
    `Actual branch consequence resolves as "${consequenceReality.actualState}" while perceived consequence resolves as "${consequenceReality.perceivedState}".`,
    ...(ruleFamilyAssessment
      ? [`Rule-family posture: ${ruleFamilyAssessment.validityPosture}.`]
      : []),
    ...(scopeAssessment
      ? [`Scope posture at ${scopeAssessment.evaluationScope}: ${scopeAssessment.truthStatus}.`]
      : []),
    operationalAssessment.visibilityTrust === 'rejected'
      ? 'Review remains non-omniscient because the perceived branch consequence was a false reading.'
      : 'Review remains bounded and does not assert omniscient rewind truth.',
  ]

  return {
    branchId: branch.identity.branchId,
    reviewFrame: 'ontology_aware_counterfactual_branch_review',
    decisionMomentLabel: branch.optionAudit.decisionMomentLabel,
    actualConsequenceState: consequenceReality.actualState,
    perceivedConsequenceState: consequenceReality.perceivedState,
    believedConsequenceState: consequenceReality.believedState,
    observationStatus: consequenceReality.observationStatus,
    ontologyConfidence,
    actualOptionCounts,
    perceivedOptionCounts,
    optionReviews,
    responsibilitySignals: uniqueSorted(surfaceSignals.responsibility),
    retrainingSignals: uniqueSorted(surfaceSignals.retraining),
    doctrineSignals: uniqueSorted(surfaceSignals.doctrine),
    certaintyNote: certaintyParts.join(' '),
  }
}

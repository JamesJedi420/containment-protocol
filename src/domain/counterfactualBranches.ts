import type { WorldRemapZone, WorldZoneStatus } from './simulationMapInterface'

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

export interface CounterfactualBranchAuthoringInput {
  removedActor: CounterfactualRemovedActorInput
  trigger: CounterfactualBranchTriggerInput
  civicConsequences: readonly CounterfactualCivicConsequenceInput[]
  supportContinuity: CounterfactualSupportContinuityInput
  unsyncedResponder: CounterfactualUnsyncedResponderInput
  invertedFamiliarActors: readonly CounterfactualInvertedActorInput[]
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
}

export interface CounterfactualBranchWorldRemap {
  branchId: string
  worldZones: WorldRemapZone[]
  actionableSignals: string[]
  supportContinuityStatus: SupportContinuityStatus
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

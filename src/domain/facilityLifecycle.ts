import type { FacilityInstance, FacilityStatus, GameState } from './models'

/** These edges describe lifecycle only; construction and safety owners supply facts. */
export const FACILITY_LIFECYCLE_TRANSITIONS = {
  begin_construction: { from: 'available', to: 'constructing', cause: 'construction_authorized' },
  submit_construction: { from: 'constructing', to: 'inspecting', cause: 'construction_verified' },
  activate: { from: 'inspecting', to: 'active', cause: 'startup_readiness_verified' },
  restrict: { from: 'active', to: 'locked', cause: 'operation_restricted' },
  submit_restart: { from: 'locked', to: 'inspecting', cause: 'restart_inspection_requested' },
  reactivate: { from: 'inspecting', to: 'active', cause: 'restart_readiness_verified' },
} as const satisfies Record<string, { from: FacilityStatus; to: FacilityStatus; cause: string }>

Object.values(FACILITY_LIFECYCLE_TRANSITIONS).forEach(Object.freeze)
Object.freeze(FACILITY_LIFECYCLE_TRANSITIONS)

export type FacilityLifecycleAction = keyof typeof FACILITY_LIFECYCLE_TRANSITIONS
export type FacilityLifecycleCause =
  (typeof FACILITY_LIFECYCLE_TRANSITIONS)[FacilityLifecycleAction]['cause']

export interface FacilityLifecyclePrerequisite {
  readonly kind: 'construction_complete' | 'startup_readiness' | 'restart_readiness'
  readonly authority: 'SPE-110' | 'SPE-876'
  readonly sourceRef: string
  readonly facilityId: string
  /** Evidence is verified by the caller's owner, for this exact transition and week. */
  readonly transition: number
  readonly week: number
  readonly verified: true
}

export interface FacilityLifecycleRequest {
  readonly facilityId: string
  readonly expectedStatus: FacilityStatus
  readonly transition: number
  readonly action: FacilityLifecycleAction
  readonly prerequisites?: readonly FacilityLifecyclePrerequisite[]
}

export interface FacilityLifecycleReceipt {
  readonly transition: number
  readonly week: number
  readonly action: FacilityLifecycleAction
  readonly from: FacilityStatus
  readonly to: FacilityStatus
  readonly cause: FacilityLifecycleCause
  readonly prerequisites: readonly FacilityLifecyclePrerequisite[]
}

export type FacilityLifecycleHistory =
  | { readonly version: 1; readonly transitions: readonly FacilityLifecycleReceipt[] }
  | { readonly version: 1; readonly unavailable: true }

export type FacilityLifecycleRejection =
  | 'invalid_request'
  | 'missing_facility'
  | 'invalid_campaign_week'
  | 'upgrade_in_progress'
  | 'lifecycle_unavailable'
  | 'stale_transition'
  | 'stale_status'
  | 'illegal_transition'
  | 'missing_prerequisite'
  | 'invalid_prerequisite'
  | 'inspection_provenance_required'

export interface FacilityLifecycleResult {
  readonly outcome: 'applied' | 'unchanged' | 'rejected'
  readonly facility: FacilityInstance | undefined
  readonly reason?: FacilityLifecycleRejection
  readonly receipt?: FacilityLifecycleReceipt
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function positiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function reference(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.trim() === value &&
    !['__proto__', 'constructor', 'prototype'].includes(value)
  )
}

function action(value: unknown): value is FacilityLifecycleAction {
  return typeof value === 'string' && Object.hasOwn(FACILITY_LIFECYCLE_TRANSITIONS, value)
}

function requiredKind(
  value: FacilityLifecycleAction
): FacilityLifecyclePrerequisite['kind'] | undefined {
  if (value === 'submit_construction') return 'construction_complete'
  if (value === 'activate') return 'startup_readiness'
  if (value === 'reactivate') return 'restart_readiness'
  return undefined
}

function inspectionMatches(
  value: FacilityLifecycleAction,
  previous: FacilityLifecycleReceipt | undefined
): boolean {
  if (value === 'activate') return previous?.action === 'submit_construction'
  if (value === 'reactivate') return previous?.action === 'submit_restart'
  return true
}

function parsePrerequisites(
  value: unknown,
  kind: FacilityLifecyclePrerequisite['kind'] | undefined,
  facilityId: string,
  transition: number,
  week: number
): readonly FacilityLifecyclePrerequisite[] | undefined {
  if (!Array.isArray(value) || value.length !== (kind ? 1 : 0)) return undefined
  if (!kind) return []
  if (!Object.hasOwn(value, 0)) return undefined
  const fact: unknown = value[0]
  const authority = kind === 'construction_complete' ? 'SPE-110' : 'SPE-876'
  const fields = ['kind', 'authority', 'sourceRef', 'facilityId', 'transition', 'week', 'verified']
  if (
    !record(fact) ||
    !fields.every((field) => Object.hasOwn(fact, field)) ||
    fact.kind !== kind ||
    fact.authority !== authority ||
    !reference(fact.sourceRef) ||
    fact.facilityId !== facilityId ||
    fact.transition !== transition ||
    fact.week !== week ||
    fact.verified !== true
  )
    return undefined
  return [
    {
      kind,
      authority,
      sourceRef: fact.sourceRef,
      facilityId,
      transition,
      week,
      verified: true,
    },
  ]
}

/** Invalid present history must not become an empty, newly usable authority. */
export function normalizeFacilityLifecycleHistory(
  value: unknown,
  facilityId: string,
  status: FacilityStatus,
  campaignWeek: number
): FacilityLifecycleHistory | undefined {
  if (value === undefined) return undefined
  const unavailable = { version: 1, unavailable: true } as const
  if (
    !record(value) ||
    value.unavailable !== undefined ||
    !Object.hasOwn(value, 'version') ||
    value.version !== 1 ||
    !Object.hasOwn(value, 'transitions') ||
    !Array.isArray(value.transitions) ||
    value.transitions.length === 0 ||
    !positiveInteger(campaignWeek)
  )
    return unavailable
  const transitions: FacilityLifecycleReceipt[] = []
  for (let index = 0; index < value.transitions.length; index += 1) {
    if (!Object.hasOwn(value.transitions, index)) return unavailable
    const entry: unknown = value.transitions[index]
    const fields = ['transition', 'week', 'action', 'from', 'to', 'cause', 'prerequisites']
    if (
      !record(entry) ||
      !fields.every((field) => Object.hasOwn(entry, field)) ||
      !action(entry.action)
    )
      return unavailable
    const edge = FACILITY_LIFECYCLE_TRANSITIONS[entry.action]
    const previous = transitions.at(-1)
    if (
      (!previous && !['begin_construction', 'restrict', 'submit_restart'].includes(entry.action)) ||
      entry.transition !== index + 1 ||
      !positiveInteger(entry.week) ||
      entry.week > campaignWeek ||
      entry.week < (previous?.week ?? 1) ||
      entry.from !== edge.from ||
      entry.to !== edge.to ||
      entry.cause !== edge.cause ||
      (previous && previous.to !== entry.from) ||
      !inspectionMatches(entry.action, previous)
    )
      return unavailable
    const prerequisites = parsePrerequisites(
      entry.prerequisites,
      requiredKind(entry.action),
      facilityId,
      index + 1,
      entry.week
    )
    if (!prerequisites) return unavailable
    transitions.push({
      transition: index + 1,
      week: entry.week,
      action: entry.action,
      from: edge.from,
      to: edge.to,
      cause: edge.cause,
      prerequisites,
    })
  }
  const lastStatus = transitions.at(-1)?.to
  // An existing upgrade temporarily owns status; completion restores the same active status.
  if (lastStatus !== status && !(status === 'upgrading' && lastStatus === 'active'))
    return unavailable
  return { version: 1, transitions }
}

/** Pure single-facility resolver. Verified facts are trusted owner attestations, not computed here. */
export function resolveFacilityLifecycleTransition(
  facility: FacilityInstance | undefined,
  request: FacilityLifecycleRequest,
  campaignWeek: number
): FacilityLifecycleResult {
  const reject = (reason: FacilityLifecycleRejection): FacilityLifecycleResult => ({
    outcome: 'rejected',
    facility,
    reason,
  })
  if (
    !record(request) ||
    !['facilityId', 'expectedStatus', 'transition', 'action'].every((field) =>
      Object.hasOwn(request, field)
    ) ||
    !reference(request.facilityId) ||
    !positiveInteger(request.transition) ||
    !action(request.action)
  )
    return reject('invalid_request')
  if (!facility || facility.facilityId !== request.facilityId) return reject('missing_facility')
  if (!positiveInteger(campaignWeek)) return reject('invalid_campaign_week')
  if (facility.upgradeInProgress || facility.status === 'upgrading')
    return reject('upgrade_in_progress')
  const history = normalizeFacilityLifecycleHistory(
    facility.lifecycleHistory,
    facility.facilityId,
    facility.status,
    campaignWeek
  )
  if (history && 'unavailable' in history) return reject('lifecycle_unavailable')
  if (['constructing', 'inspecting'].includes(facility.status) && !history)
    return reject('lifecycle_unavailable')
  const transitions = history?.transitions ?? []
  const previous = transitions.at(-1)
  const edge = FACILITY_LIFECYCLE_TRANSITIONS[request.action]
  if (request.expectedStatus !== edge.from) return reject('illegal_transition')
  // Classify old/non-next requests before interpreting their historical evidence as current.
  const replay = previous?.transition === request.transition ? previous : undefined
  if (!replay && request.transition !== transitions.length + 1) return reject('stale_transition')
  const kind = requiredKind(request.action)
  if (
    kind &&
    (request.prerequisites === undefined ||
      (Array.isArray(request.prerequisites) && request.prerequisites.length === 0))
  )
    return reject('missing_prerequisite')
  // The original receipt week owns a replay, including after a later campaign week.
  const prerequisites = parsePrerequisites(
    request.prerequisites === undefined ? [] : request.prerequisites,
    kind,
    facility.facilityId,
    request.transition,
    replay?.week ?? campaignWeek
  )
  if (!prerequisites) return reject('invalid_prerequisite')
  if (
    replay &&
    replay.action === request.action &&
    replay.from === request.expectedStatus &&
    facility.status === replay.to &&
    JSON.stringify(prerequisites) === JSON.stringify(replay.prerequisites)
  )
    return { outcome: 'unchanged', facility, receipt: replay }
  if (request.transition !== transitions.length + 1) return reject('stale_transition')
  if (facility.status !== request.expectedStatus) return reject('stale_status')
  if (!inspectionMatches(request.action, previous)) return reject('inspection_provenance_required')
  if (campaignWeek < (previous?.week ?? 1)) return reject('invalid_campaign_week')
  const receipt: FacilityLifecycleReceipt = {
    transition: request.transition,
    week: campaignWeek,
    action: request.action,
    from: edge.from,
    to: edge.to,
    cause: edge.cause,
    prerequisites,
  }
  return {
    outcome: 'applied',
    receipt,
    facility: {
      ...facility,
      status: edge.to,
      lifecycleHistory: { version: 1, transitions: [...transitions, receipt] },
    },
  }
}

/** Applies only a successful proposal; rejection and replay retain the exact GameState. */
export function applyFacilityLifecycleTransition(
  source: GameState,
  request: FacilityLifecycleRequest
): FacilityLifecycleResult & { readonly game: GameState } {
  const facilityId = record(request) && reference(request.facilityId) ? request.facilityId : ''
  const facilities = source.facilityState?.facilities
  const facility =
    facilities && Object.hasOwn(facilities, facilityId) ? facilities[facilityId] : undefined
  const result = resolveFacilityLifecycleTransition(facility, request, source.week)
  if (result.outcome !== 'applied' || !result.facility) return { ...result, game: source }
  return {
    ...result,
    game: {
      ...source,
      facilityState: {
        ...source.facilityState,
        facilities: { ...facilities, [facilityId]: result.facility },
      },
    },
  }
}

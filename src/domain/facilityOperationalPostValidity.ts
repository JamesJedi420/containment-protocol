/**
 * SPE-3387 — facility dependency validity for one canonical operational post.
 *
 * Consumes an SPE-3386 resolution. Logistics freshness supports
 * `staff-post:logistics:1`. Ready support permits effective capacity. Degraded
 * support, unavailable support, a missing node, or a rejected resolution
 * withholds it. This module does not read GameState, lifecycle status, or
 * installed effects, and it does not assign or unassign staff.
 */

import {
  FACILITY_DEPENDENCY_AVAILABILITIES,
  FACILITY_DEPENDENCY_REJECTIONS,
  type FacilityDependencyAvailability,
  type FacilityDependencyAvailabilityResult,
  type FacilityDependencyRejection,
} from './facilityDependencyGraph'
import {
  FACILITY_DEPENDENCY_INPUT_REJECTIONS,
  type FacilityDependencyInputRejection,
  type FacilityDependencyInputResolution,
} from './facilityDependencyInputs'
import type { OperationalStaffPostId } from './operationalStaffPosts'

export const FACILITY_OPERATIONAL_POST_VALIDITY_REASONS = [
  'supported',
  'degraded',
  'unavailable',
  'missing_support',
  'rejected_support',
] as const
export type FacilityOperationalPostValidityReason =
  (typeof FACILITY_OPERATIONAL_POST_VALIDITY_REASONS)[number]

export type FacilityOperationalPostSupportRejection =
  FacilityDependencyInputRejection | FacilityDependencyRejection

export interface FacilityOperationalPostSupport {
  readonly postId: OperationalStaffPostId
  readonly supportNodeId: string
}

export const FACILITY_OPERATIONAL_POST_SUPPORT: readonly FacilityOperationalPostSupport[] =
  Object.freeze([
    Object.freeze({
      postId: 'staff-post:logistics:1',
      supportNodeId: 'capability:logistics_freshness',
    }),
  ])

export interface FacilityOperationalPostValidity {
  readonly postId: OperationalStaffPostId
  readonly eligible: boolean
  readonly reason: FacilityOperationalPostValidityReason
  readonly supportNodeId: string
  readonly availability?: FacilityDependencyAvailability
  readonly rejection?: FacilityOperationalPostSupportRejection
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function compareCodeUnit(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function isAvailability(value: unknown): value is FacilityDependencyAvailability {
  return FACILITY_DEPENDENCY_AVAILABILITIES.some((availability) => availability === value)
}

function isKnownRejection(value: unknown): value is FacilityOperationalPostSupportRejection {
  return (
    FACILITY_DEPENDENCY_INPUT_REJECTIONS.some((rejection) => rejection === value) ||
    FACILITY_DEPENDENCY_REJECTIONS.some((rejection) => rejection === value)
  )
}

function isResolution(value: unknown): value is FacilityDependencyInputResolution {
  if (!isRecord(value) || typeof value.ok !== 'boolean') return false
  if (!value.ok) return isKnownRejection(value.rejection)
  return Array.isArray(value.results)
}

function freezeValidity(record: FacilityOperationalPostValidity): FacilityOperationalPostValidity {
  return Object.freeze(record)
}

function missingSupport(support: FacilityOperationalPostSupport): FacilityOperationalPostValidity {
  return freezeValidity({
    postId: support.postId,
    eligible: false,
    reason: 'missing_support',
    supportNodeId: support.supportNodeId,
  })
}

function rejectedSupport(
  support: FacilityOperationalPostSupport,
  rejection: FacilityOperationalPostSupportRejection | undefined
): FacilityOperationalPostValidity {
  return freezeValidity({
    postId: support.postId,
    eligible: false,
    reason: 'rejected_support',
    supportNodeId: support.supportNodeId,
    ...(rejection ? { rejection } : {}),
  })
}

function availabilityReason(availability: FacilityDependencyAvailability): {
  readonly eligible: boolean
  readonly reason: FacilityOperationalPostValidityReason
} {
  switch (availability) {
    case 'ready':
      return { eligible: true, reason: 'supported' }
    case 'degraded':
      return { eligible: false, reason: 'degraded' }
    case 'unavailable':
      return { eligible: false, reason: 'unavailable' }
    default: {
      const unexpected: never = availability
      return unexpected
    }
  }
}

function projectSupport(
  support: FacilityOperationalPostSupport,
  resolution: unknown
): FacilityOperationalPostValidity {
  if (!isResolution(resolution)) return rejectedSupport(support, undefined)
  if (!resolution.ok) return rejectedSupport(support, resolution.rejection)

  const matches = resolution.results.filter(
    (result): result is FacilityDependencyAvailabilityResult =>
      isRecord(result) && result.nodeId === support.supportNodeId
  )
  const result = matches.length === 1 ? matches[0] : undefined
  if (!result || !isAvailability(result.availability)) return missingSupport(support)
  const mapped = availabilityReason(result.availability)
  return freezeValidity({
    postId: support.postId,
    eligible: mapped.eligible,
    reason: mapped.reason,
    supportNodeId: support.supportNodeId,
    availability: result.availability,
  })
}

function isUsableValidity(
  entry: unknown,
  support: FacilityOperationalPostSupport
): entry is FacilityOperationalPostValidity {
  if (!isRecord(entry)) return false
  if (entry.postId !== support.postId || entry.supportNodeId !== support.supportNodeId) return false
  if (entry.reason === 'supported') {
    return (
      entry.eligible === true && entry.availability === 'ready' && entry.rejection === undefined
    )
  }
  if (entry.reason === 'degraded') {
    return (
      entry.eligible === false && entry.availability === 'degraded' && entry.rejection === undefined
    )
  }
  if (entry.reason === 'unavailable') {
    return (
      entry.eligible === false &&
      entry.availability === 'unavailable' &&
      entry.rejection === undefined
    )
  }
  if (entry.reason === 'missing_support') {
    return (
      entry.eligible === false && entry.availability === undefined && entry.rejection === undefined
    )
  }
  if (entry.reason === 'rejected_support') {
    return (
      entry.eligible === false &&
      entry.availability === undefined &&
      (entry.rejection === undefined || isKnownRejection(entry.rejection))
    )
  }
  return false
}

/**
 * Derive eligibility for each authored post from one SPE-3386 resolution.
 * Order follows post id. A rejected or incomplete resolution fails closed.
 */
export function projectFacilityOperationalPostValidity(
  resolution: FacilityDependencyInputResolution
): readonly FacilityOperationalPostValidity[] {
  const records = FACILITY_OPERATIONAL_POST_SUPPORT.map((support) =>
    projectSupport(support, resolution)
  )
  records.sort((left, right) => compareCodeUnit(left.postId, right.postId))
  return Object.freeze(records)
}

/** One usable record per authored post. A missing or contradictory record fails closed. */
export function indexFacilityOperationalPostValidity(
  facilityValidity: readonly FacilityOperationalPostValidity[]
): ReadonlyMap<OperationalStaffPostId, FacilityOperationalPostValidity> {
  const entries = Array.isArray(facilityValidity) ? facilityValidity : []
  const indexed = new Map<OperationalStaffPostId, FacilityOperationalPostValidity>()
  for (const support of FACILITY_OPERATIONAL_POST_SUPPORT) {
    const claimed = entries.filter((entry) => isRecord(entry) && entry.postId === support.postId)
    const entry = claimed.length === 1 ? claimed[0] : undefined
    indexed.set(
      support.postId,
      entry && isUsableValidity(entry, support) ? entry : missingSupport(support)
    )
  }
  return indexed
}

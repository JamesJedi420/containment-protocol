import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { readRepresentativeFacilityDependencyGraph } from '../domain/facilityDependencyGraph'
import type { FacilityDependencyAvailability } from '../domain/facilityDependencyGraph'
import { resolveExplicitFacilityDependencyAvailability } from '../domain/facilityDependencyInputs'
import { projectFacilityOperationalPostValidity } from '../domain/facilityOperationalPostValidity'
import type { GameState } from '../domain/models'
import { deriveOperationalStaffCapacity } from '../domain/operationalStaffCapacity'
import {
  OPERATIONAL_STAFF_POSTS,
  assignOperationalStaffPost,
  queryOperationalStaffPosts,
  reassignOperationalStaffPost,
} from '../domain/operationalStaffPosts'

const HUB = 'core:facility_hub'
const ROUTING = 'service:routing'
const ALERT = 'capability:alert_timing'
const LOGISTICS = 'capability:logistics_freshness'
const ARCHIVE = 'service:archive_integrity'
const POST = 'staff-post:logistics:1' as const
const NODE_IDS = [HUB, ROUTING, ALERT, LOGISTICS, ARCHIVE] as const

function packet(
  overrides: Partial<Record<string, FacilityDependencyAvailability>> = {}
): Record<string, { availability: FacilityDependencyAvailability; sourceRef: string }> {
  const inputs: Record<
    string,
    { availability: FacilityDependencyAvailability; sourceRef: string }
  > = {}
  for (const id of NODE_IDS) {
    inputs[id] = {
      availability: overrides[id] ?? 'ready',
      sourceRef: `source:${id}`,
    }
  }
  return inputs
}

function game(staff: unknown): GameState {
  return { ...createStartingState(), staff: staff as GameState['staff'] }
}

function validityFor(
  overrides: Partial<Record<string, FacilityDependencyAvailability>> = {},
  source: Record<string, unknown> = packet(overrides)
) {
  const graph = readRepresentativeFacilityDependencyGraph()
  return projectFacilityOperationalPostValidity(
    resolveExplicitFacilityDependencyAvailability(graph, source)
  )
}

function occupiedRoster() {
  return game(
    Object.fromEntries(
      OPERATIONAL_STAFF_POSTS.map((post, index) => [
        `person-${index}`,
        { specialty: post.specialty, operationalPostId: post.id },
      ])
    )
  )
}

describe('SPE-3387 facility operational post validity', () => {
  it('permits the logistics post when logistics freshness is ready', () => {
    const roster = game({ clerk: { specialty: 'logistics' } })
    const request = {
      staffId: 'clerk',
      postId: POST,
      expectedPreviousPostId: null,
    }
    const assigned = assignOperationalStaffPost(roster, request)
    const ready = validityFor()
    expect(assigned).toMatchObject({ status: 'applied', reason: 'assigned' })
    expect(ready).toEqual([
      {
        postId: POST,
        eligible: true,
        reason: 'supported',
        supportNodeId: LOGISTICS,
        availability: 'ready',
      },
    ])
    expect(deriveOperationalStaffCapacity(assigned.game, ready).byStaffId.clerk).toEqual({
      specialty: 'logistics',
      postId: POST,
      reason: 'assigned',
      headcount: 1,
      available: 1,
      assigned: 1,
      effectiveCapacity: 1,
      facilityEligible: true,
      facilityReason: 'supported',
    })
    expect(assigned.game.staff.clerk).toMatchObject({ operationalPostId: POST })
  })

  it('keeps staffing block and no-op reasons independent of facility support', () => {
    const occupied = game({
      clerk: { specialty: 'logistics', operationalPostId: POST },
      other: { specialty: 'logistics' },
      analyst: { specialty: 'analysis' },
    })
    const degraded = validityFor({ [HUB]: 'degraded' })
    expect(
      reassignOperationalStaffPost(occupied, {
        staffId: 'clerk',
        postId: POST,
        expectedPreviousPostId: POST,
      })
    ).toMatchObject({ status: 'no_op', reason: 'already_at_destination' })
    expect(
      assignOperationalStaffPost(occupied, {
        staffId: 'other',
        postId: POST,
        expectedPreviousPostId: null,
      })
    ).toMatchObject({ status: 'blocked', reason: 'occupied_post' })
    expect(
      assignOperationalStaffPost(occupied, {
        staffId: 'analyst',
        postId: POST,
        expectedPreviousPostId: null,
      })
    ).toMatchObject({ status: 'blocked', reason: 'specialty_mismatch' })
    expect(occupied.staff.clerk).toMatchObject({ operationalPostId: POST })
    expect(degraded[0]).toMatchObject({ eligible: false, reason: 'degraded' })
  })

  it('withholds effective capacity on downgrade and outage, then restores it', () => {
    const roster = game({ clerk: { specialty: 'logistics', operationalPostId: POST } })
    const before = JSON.stringify(roster)
    const degraded = validityFor({ [HUB]: 'degraded' })
    const unavailable = validityFor({ [HUB]: 'unavailable' })
    const ready = validityFor()
    expect(deriveOperationalStaffCapacity(roster, degraded).byStaffId.clerk).toMatchObject({
      reason: 'assigned',
      assigned: 1,
      available: 1,
      effectiveCapacity: 0,
      facilityEligible: false,
      facilityReason: 'degraded',
    })
    expect(deriveOperationalStaffCapacity(roster, unavailable).byStaffId.clerk).toMatchObject({
      assigned: 1,
      effectiveCapacity: 0,
      facilityReason: 'unavailable',
      facilityEligible: false,
    })
    expect(queryOperationalStaffPosts(roster, unavailable).byStaffId.clerk).toMatchObject({
      postId: POST,
      reason: 'assigned',
      facilityEligible: false,
      facilityReason: 'unavailable',
    })
    expect(deriveOperationalStaffCapacity(roster, ready).byStaffId.clerk).toMatchObject({
      assigned: 1,
      effectiveCapacity: 1,
      facilityReason: 'supported',
    })
    expect(roster.staff.clerk).toMatchObject({ operationalPostId: POST })
    expect(JSON.stringify(roster)).toBe(before)
    expect(deriveOperationalStaffCapacity(roster, ready)).toEqual(
      deriveOperationalStaffCapacity(roster, validityFor())
    )
  })

  it('fails closed when support is missing, rejected, or the projection omits the post', () => {
    const roster = game({ clerk: { specialty: 'logistics', operationalPostId: POST } })
    const incomplete = packet()
    delete incomplete[LOGISTICS]
    const missing = validityFor({}, incomplete)
    const lifecycle = validityFor({}, { status: 'active' })
    expect(missing[0]).toMatchObject({
      eligible: false,
      reason: 'rejected_support',
      rejection: 'missing_source',
      supportNodeId: LOGISTICS,
    })
    expect(lifecycle[0]).toMatchObject({
      eligible: false,
      reason: 'rejected_support',
      rejection: 'unsupported_status_filter',
    })
    for (const validity of [missing, lifecycle, []]) {
      expect(deriveOperationalStaffCapacity(roster, validity).byStaffId.clerk).toMatchObject({
        assigned: 1,
        effectiveCapacity: 0,
        facilityEligible: false,
      })
    }
    expect(deriveOperationalStaffCapacity(roster, []).byStaffId.clerk.facilityReason).toBe(
      'missing_support'
    )
    const duplicate = [...validityFor(), ...validityFor()]
    expect(deriveOperationalStaffCapacity(roster, duplicate).byStaffId.clerk).toMatchObject({
      effectiveCapacity: 0,
      facilityReason: 'missing_support',
    })
  })

  it('leaves independent services and unmapped posts on the occupancy rule', () => {
    const roster = occupiedRoster()
    const alertOutage = validityFor({ [ALERT]: 'unavailable' })
    const archiveOutage = validityFor({ [ARCHIVE]: 'unavailable' })
    const hubOutage = validityFor({ [HUB]: 'unavailable' })
    expect(deriveOperationalStaffCapacity(roster, alertOutage).effectiveCapacity).toBe(8)
    expect(deriveOperationalStaffCapacity(roster, archiveOutage).effectiveCapacity).toBe(8)
    const withheld = deriveOperationalStaffCapacity(roster, hubOutage)
    expect(withheld.effectiveCapacity).toBe(7)
    expect(withheld.assigned).toBe(8)
    expect(withheld.bySpecialty.logistics).toEqual({
      headcount: 2,
      available: 2,
      assigned: 2,
      effectiveCapacity: 1,
    })
    const logisticsSlot = OPERATIONAL_STAFF_POSTS.findIndex((post) => post.id === POST)
    expect(withheld.byStaffId[`person-${logisticsSlot}`]).toMatchObject({
      postId: POST,
      assigned: 1,
      effectiveCapacity: 0,
    })
    expect(withheld.byStaffId[`person-${logisticsSlot + 1}`]).toEqual({
      specialty: 'logistics',
      postId: 'staff-post:logistics:2',
      reason: 'assigned',
      headcount: 1,
      available: 1,
      assigned: 1,
      effectiveCapacity: 1,
    })
  })

  it('matches equivalent packet order and does not change the default capacity result', () => {
    const graph = readRepresentativeFacilityDependencyGraph()
    const forward = packet({ [HUB]: 'degraded' })
    const reversed = Object.fromEntries(Object.entries(forward).reverse())
    expect(
      projectFacilityOperationalPostValidity(
        resolveExplicitFacilityDependencyAvailability(graph, forward)
      )
    ).toEqual(
      projectFacilityOperationalPostValidity(
        resolveExplicitFacilityDependencyAvailability(graph, reversed)
      )
    )
    const roster = occupiedRoster()
    const before = JSON.stringify(roster)
    const baseline = deriveOperationalStaffCapacity(roster)
    expect(baseline.effectiveCapacity).toBe(8)
    expect(baseline.byStaffId['person-0']).not.toHaveProperty('facilityEligible')
    expect(queryOperationalStaffPosts(roster).byStaffId['person-0']).not.toHaveProperty(
      'facilityReason'
    )
    expect(deriveOperationalStaffCapacity(roster)).toEqual(baseline)
    expect(JSON.stringify(roster)).toBe(before)
  })
})

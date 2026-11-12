import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { GameState } from '../domain/models'
import {
  OPERATIONAL_STAFF_POSTS,
  assignOperationalStaffPost,
  reassignOperationalStaffPost,
  unassignOperationalStaffPost,
  queryOperationalStaffPost,
  normalizeOperationalStaffPosts,
} from '../domain/operationalStaffPosts'
import type { OperationalStaffPostAssignmentRequest } from '../domain/operationalStaffPosts'
import { hireCandidate } from '../domain/sim/hire'

function game(): GameState {
  return {
    ...createStartingState(),
    staff: {
      a: { specialty: 'analysis', assignmentType: 'archive' },
      b: { specialty: 'analysis' },
      instructor: {
        role: 'instructor',
        name: 'Teacher',
        efficiency: 70,
        instructorSpecialty: 'combat',
      },
    },
  }
}
const request: OperationalStaffPostAssignmentRequest = {
  staffId: 'a',
  postId: 'staff-post:analysis:1',
  expectedPreviousPostId: null,
}

describe('canonical operational staff posts', () => {
  it('authors eight immutable unique posts without deriving capacity', () => {
    expect(OPERATIONAL_STAFF_POSTS).toHaveLength(8)
    expect(new Set(OPERATIONAL_STAFF_POSTS.map((post) => post.id)).size).toBe(8)
    expect(Object.isFrozen(OPERATIONAL_STAFF_POSTS)).toBe(true)
    expect(OPERATIONAL_STAFF_POSTS.every(Object.isFrozen)).toBe(true)
  })
  it('assigns, reassigns and unassigns atomically, preserving input and unrelated state', () => {
    const initial = game()
    const snapshot = structuredClone(initial.staff)
    expect(queryOperationalStaffPost(initial, 'a')).toEqual({ postId: null, reason: 'unassigned' })
    const assigned = assignOperationalStaffPost(initial, request)
    expect(assigned.status).toBe('applied')
    expect(assigned.game.agents).toBe(initial.agents)
    expect(initial.staff).toEqual(snapshot)
    expect(queryOperationalStaffPost(assigned.game, 'a')).toEqual({
      postId: request.postId,
      reason: 'assigned',
    })
    expect(assignOperationalStaffPost(assigned.game, request)).toEqual({
      game: assigned.game,
      status: 'no_op',
      reason: 'already_at_destination',
    })
    const move = {
      ...request,
      postId: 'staff-post:analysis:2' as const,
      expectedPreviousPostId: request.postId,
    }
    const moved = reassignOperationalStaffPost(assigned.game, move)
    expect(moved.reason).toBe('reassigned')
    expect(reassignOperationalStaffPost(moved.game, move).game).toBe(moved.game)
    expect(assignOperationalStaffPost(moved.game, { ...request, staffId: 'b' }).status).toBe(
      'applied'
    )
    const release = { staffId: 'a', expectedPreviousPostId: move.postId }
    const released = unassignOperationalStaffPost(moved.game, release)
    expect(released.reason).toBe('unassigned')
    expect(released.game.staff.a).not.toHaveProperty('operationalPostId')
    expect(unassignOperationalStaffPost(released.game, release).game).toBe(released.game)
  })
  it.each([
    [{ ...request, staffId: 'missing' }, 'unknown_staff'],
    [{ ...request, staffId: 'instructor' }, 'instructor_not_supported'],
    [{ ...request, postId: 'missing' }, 'unknown_post'],
    [{ ...request, postId: 'staff-post:logistics:1' }, 'specialty_mismatch'],
    [{ ...request, expectedPreviousPostId: 'staff-post:analysis:2' }, 'stale_request'],
    [{ staffId: 'a', postId: request.postId }, 'invalid_request'],
    [null, 'invalid_request'],
  ])('blocks invalid requests without mutation: %j', (input, reason) => {
    const initial = game()
    const result = assignOperationalStaffPost(
      initial,
      input as OperationalStaffPostAssignmentRequest
    )
    expect(result).toEqual({ game: initial, status: 'blocked', reason })
    expect(result.game).toBe(initial)
  })
  it('preserves the previous post on destination conflict and stale moves', () => {
    const initial = assignOperationalStaffPost(game(), request).game
    const occupied = assignOperationalStaffPost(initial, {
      ...request,
      staffId: 'b',
      postId: 'staff-post:analysis:2',
    }).game
    const result = reassignOperationalStaffPost(occupied, {
      ...request,
      postId: 'staff-post:analysis:2',
      expectedPreviousPostId: request.postId,
    })
    expect(result.reason).toBe('occupied_post')
    expect(result.game).toBe(occupied)
    expect(
      reassignOperationalStaffPost(initial, { ...request, postId: 'staff-post:analysis:2' }).reason
    ).toBe('stale_request')
  })
  it('rejects malformed roster, staff and assignment state', () => {
    for (const [staff, reason] of [
      [null, 'invalid_roster'],
      [{ a: null }, 'invalid_staff'],
      [{ a: { specialty: 'unknown' } }, 'invalid_staff'],
      [{ a: { specialty: 'analysis', operationalPostId: 4 } }, 'invalid_assignment'],
      [
        {
          a: { specialty: 'analysis', operationalPostId: request.postId },
          b: { specialty: 'analysis', operationalPostId: request.postId },
        },
        'invalid_assignment',
      ],
    ] as const) {
      const initial = { ...game(), staff } as unknown as GameState
      expect(assignOperationalStaffPost(initial, request)).toEqual({
        game: initial,
        status: 'blocked',
        reason,
      })
    }
  })
  it('uses normalized intel specialty and canonical roster keys', () => {
    const initial = { ...game(), staff: { intel: { specialty: 'intelligence' as const } } }
    expect(
      assignOperationalStaffPost(initial, {
        staffId: 'intel',
        postId: 'staff-post:intel:1',
        expectedPreviousPostId: null,
      }).status
    ).toBe('applied')
    expect(queryOperationalStaffPost(initial, 'toString').reason).toBe('unknown_staff')
  })
  it('accepts each authored specialty post and blocks stale unassignment', () => {
    for (const post of OPERATIONAL_STAFF_POSTS) {
      const initial = { ...game(), staff: { a: { specialty: post.specialty } } }
      const assigned = assignOperationalStaffPost(initial, { ...request, postId: post.id }).game
      expect(queryOperationalStaffPost(assigned, 'a').postId).toBe(post.id)
      const stale = unassignOperationalStaffPost(assigned, {
        staffId: 'a',
        expectedPreviousPostId: null,
      })
      expect(stale.reason).toBe('stale_request')
      expect(stale.game).toBe(assigned)
    }
  })
  it('queries representative rosters deterministically without mutating or persisting occupancy', () => {
    const initial = game()
    initial.staff = Object.fromEntries(
      Array.from({ length: 2000 }, (_, index) => [
        `person-${index}`,
        { specialty: 'analysis' as const },
      ])
    )
    const assigned = assignOperationalStaffPost(initial, {
      ...request,
      staffId: 'person-1999',
    }).game
    expect(queryOperationalStaffPost(assigned, 'person-1999')).toEqual(
      queryOperationalStaffPost(assigned, 'person-1999')
    )
    expect(assignOperationalStaffPost(assigned, { ...request, staffId: 'person-0' }).reason).toBe(
      'occupied_post'
    )
    expect(normalizeOperationalStaffPosts(assigned.staff)).toBe(assigned.staff)
  })
  it('hiring never promotes candidate metadata or injected post references into occupancy', () => {
    const initial = game()
    initial.funding = 10000
    const candidate = {
      id: 'new-staff',
      name: 'New',
      age: 30,
      category: 'staff' as const,
      hireStatus: 'available' as const,
      revealLevel: 0 as const,
      expiryWeek: 999,
      weeklyCost: 1,
      evaluation: { overallVisible: false, potentialVisible: false, rumorTags: [] },
      staffData: {
        specialty: 'analysis' as const,
        assignmentType: 'archive',
        operationalPostId: request.postId,
      },
    }
    initial.candidates = [candidate]
    const hired = hireCandidate(initial, candidate.id)
    expect(hired.staff[candidate.id]).toBeDefined()
    expect(hired.staff[candidate.id]).not.toHaveProperty('operationalPostId')
    expect(queryOperationalStaffPost(hired, candidate.id).reason).toBe('unassigned')
  })
})

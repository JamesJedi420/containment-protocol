import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { GameState } from '../domain/models'
import { deriveOperationalStaffCapacity } from '../domain/operationalStaffCapacity'
import {
  OPERATIONAL_STAFF_POSTS,
  assignOperationalStaffPost,
  reassignOperationalStaffPost,
  unassignOperationalStaffPost,
  queryOperationalStaffPost,
  queryOperationalStaffPosts,
} from '../domain/operationalStaffPosts'

function game(staff: unknown): GameState {
  return { ...createStartingState(), staff: staff as GameState['staff'] }
}

describe('canonical operational staff capacity', () => {
  it('distinguishes headcount and availability from usable occupancy', () => {
    const initial = game({
      hired: { specialty: 'analysis', assignmentType: 'archive' },
      assigned: { specialty: 'intelligence', operationalPostId: 'staff-post:intel:1' },
      invalidPost: { specialty: 'logistics', operationalPostId: 'missing' },
      instructor: { role: 'instructor', specialty: 'analysis' },
      malformed: null,
      unsupported: { specialty: 'nonsense' },
    })
    const before = JSON.stringify(initial)
    const result = deriveOperationalStaffCapacity(initial)
    expect(result).toMatchObject({
      headcount: 3,
      available: 3,
      assigned: 1,
      effectiveCapacity: 1,
      reasonCounts: {
        assigned: 1,
        unassigned: 1,
        invalid_assignment: 1,
        instructor_not_supported: 1,
        invalid_staff: 2,
      },
    })
    expect(result.byStaffId.assigned).toMatchObject({ specialty: 'intel', effectiveCapacity: 1 })
    expect(result.byStaffId.hired).toMatchObject({ headcount: 1, effectiveCapacity: 0 })
    expect(result.bySpecialty.intel.effectiveCapacity).toBe(1)
    expect(JSON.stringify(initial)).toBe(before)
    expect(deriveOperationalStaffCapacity(initial)).toEqual(result)
  })

  it('handles empty and invalid rosters without inventing staff', () => {
    for (const staff of [{}, null, [], 42]) {
      const result = deriveOperationalStaffCapacity(game(staff))
      expect(result).toMatchObject({
        headcount: 0,
        available: 0,
        assigned: 0,
        effectiveCapacity: 0,
        byStaffId: {},
      })
      expect(result.reason).toBe(
        staff !== null && typeof staff === 'object' && !Array.isArray(staff)
          ? 'valid_roster'
          : 'invalid_roster'
      )
    }
  })

  it('counts every authored post once and rejects all duplicate claimants', () => {
    const entries = OPERATIONAL_STAFF_POSTS.map(
      (post, i) =>
        [
          String(i),
          {
            specialty: post.specialty,
            operationalPostId: post.id,
          },
        ] as const
    )
    const initial = game(Object.fromEntries(entries))
    expect(deriveOperationalStaffCapacity(initial).effectiveCapacity).toBe(8)
    for (const counts of Object.values(deriveOperationalStaffCapacity(initial).bySpecialty)) {
      expect(counts).toEqual({ headcount: 2, available: 2, assigned: 2, effectiveCapacity: 2 })
    }
    for (const claimant of [
      { specialty: 'analysis' },
      { specialty: 'logistics' },
      { specialty: 'nonsense' },
      { role: 'instructor' },
      { role: 'invalid' },
    ]) {
      const conflict = [
        ...entries,
        ['conflict', { ...claimant, operationalPostId: entries[0]![1].operationalPostId }],
      ]
      const forward = deriveOperationalStaffCapacity(game(Object.fromEntries(conflict)))
      expect(forward.effectiveCapacity).toBe(7)
      expect(forward.byStaffId['0']?.reason).toBe('invalid_assignment')
      expect(
        deriveOperationalStaffCapacity(game(Object.fromEntries([...conflict].reverse())))
      ).toEqual(forward)
    }
  })

  it('tracks commands, repeats, authoritative eligibility and prototype-like identities', () => {
    const initial = game(Object.fromEntries([['__proto__', { specialty: 'analysis' }]]))
    const request = {
      staffId: '__proto__',
      postId: 'staff-post:analysis:1' as const,
      expectedPreviousPostId: null,
    }
    const assigned = assignOperationalStaffPost(initial, request).game
    expect(deriveOperationalStaffCapacity(initial).effectiveCapacity).toBe(0)
    expect(deriveOperationalStaffCapacity(assigned).effectiveCapacity).toBe(1)
    expect(
      deriveOperationalStaffCapacity(assignOperationalStaffPost(assigned, request).game)
    ).toEqual(deriveOperationalStaffCapacity(assigned))
    const moved = reassignOperationalStaffPost(assigned, {
      ...request,
      expectedPreviousPostId: request.postId,
      postId: 'staff-post:analysis:2',
    }).game
    expect(deriveOperationalStaffCapacity(moved).byStaffId['__proto__']?.postId).toBe(
      'staff-post:analysis:2'
    )
    const released = unassignOperationalStaffPost(moved, {
      staffId: request.staffId,
      expectedPreviousPostId: 'staff-post:analysis:2',
    }).game
    expect(deriveOperationalStaffCapacity(released).effectiveCapacity).toBe(0)
    const changed = game({ a: { specialty: 'logistics', operationalPostId: request.postId } })
    expect(deriveOperationalStaffCapacity(changed).effectiveCapacity).toBe(0)
    expect(queryOperationalStaffPost(assigned, 'toString').reason).toBe('unknown_staff')
  })

  it('shares single-person truth and traverses a 2,000-person roster only a bounded number of times', () => {
    const staff = Object.fromEntries(
      Array.from({ length: 2000 }, (_, i) => [
        String(i),
        {
          specialty: 'analysis',
          ...(i < 2 ? { operationalPostId: `staff-post:analysis:${i + 1}` } : {}),
        },
      ])
    )
    const initial = game(staff)
    const batch = queryOperationalStaffPosts(initial)
    for (const id of ['0', '1', '2', '1999'])
      expect(batch.byStaffId[id]).toEqual(queryOperationalStaffPost(initial, id))
    let enumerations = 0
    let reads = 0
    const monitored = new Proxy(staff, {
      ownKeys(target) {
        enumerations++
        return Reflect.ownKeys(target)
      },
      get(target, key, receiver) {
        reads++
        return Reflect.get(target, key, receiver)
      },
    })
    expect(deriveOperationalStaffCapacity(game(monitored))).toMatchObject({
      headcount: 2000,
      available: 2000,
      assigned: 2,
      effectiveCapacity: 2,
    })
    expect(enumerations).toBeLessThanOrEqual(2)
    expect(reads).toBeLessThanOrEqual(2000 * 3)
  })
})

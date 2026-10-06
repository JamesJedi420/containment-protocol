import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  assignOperationalStaffPost,
  queryOperationalStaffPost,
} from '../../domain/operationalStaffPosts'
import type { GameState } from '../../domain/models'
import { useGameStore } from './gameStore'
import {
  hydrateGame,
  parseRunExport,
  sanitizeStaffMap,
  serializeRunExport,
  stripGameTemplates,
} from './runTransfer'
import { loadGameSave, serializeGameSave } from './saveSystem'

const request = {
  staffId: 'a',
  postId: 'staff-post:analysis:1' as const,
  expectedPreviousPostId: null,
}
function initial(): GameState {
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
beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: initial() })
})
describe('operational staff post store and persistence', () => {
  it('matches pure commands and revalidates stale state while preserving blocked identity', () => {
    const before = useGameStore.getState().game
    const direct = assignOperationalStaffPost(before, request)
    expect(useGameStore.getState().assignOperationalStaffPost(request)).toEqual(direct)
    const assigned = useGameStore.getState().game
    const stale = { ...request, postId: 'staff-post:analysis:2' as const }
    expect(useGameStore.getState().reassignOperationalStaffPost(stale).reason).toBe('stale_request')
    expect(useGameStore.getState().game).toBe(assigned)
    expect(useGameStore.getState().assignOperationalStaffPost(request).status).toBe('no_op')
    expect(
      useGameStore
        .getState()
        .unassignOperationalStaffPost({ staffId: 'a', expectedPreviousPostId: request.postId })
        .status
    ).toBe('applied')
  })
  it('round-trips assignments through hydration, exports, manual saves and local persistence', async () => {
    const assigned = useGameStore.getState().assignOperationalStaffPost(request).game
    for (const restored of [
      hydrateGame(stripGameTemplates(assigned)),
      parseRunExport(serializeRunExport(assigned)),
      loadGameSave(serializeGameSave(assigned)),
    ]) {
      expect(queryOperationalStaffPost(restored, 'a')).toEqual({
        postId: request.postId,
        reason: 'assigned',
      })
      expect(restored.staff.instructor).toEqual(assigned.staff.instructor)
      expect(restored.specialistOperatorSlots).toEqual(assigned.specialistOperatorSlots)
    }
    // Reset memory without rewriting storage, then load the persisted Zustand envelope.
    const { storage, name } = useGameStore.persist.getOptions()
    const saved = await storage!.getItem(name!)
    expect(saved?.state).toMatchObject({
      game: { staff: { a: { operationalPostId: request.postId } } },
    })
    useGameStore.setState({ game: initial() })
    expect(queryOperationalStaffPost(useGameStore.getState().game, 'a').postId).toBeNull()
    await storage!.setItem(name!, saved!)
    await useGameStore.persist.rehydrate()
    expect(queryOperationalStaffPost(useGameStore.getState().game, 'a').postId).toBe(request.postId)
  })
  it('leaves legacy staff unassigned despite assignmentType and grants no posts', () => {
    const legacy = hydrateGame(stripGameTemplates(initial()))
    expect(queryOperationalStaffPost(legacy, 'a').reason).toBe('unassigned')
    expect(legacy.staff.a).not.toHaveProperty('operationalPostId')
  })
  it('drops malformed, unknown, incompatible and instructor references before staff normalization', () => {
    const raw = {
      unknown: { specialty: 'analysis', operationalPostId: 'unknown' },
      malformed: { specialty: 'analysis', operationalPostId: 10 },
      incompatible: { specialty: 'logistics', operationalPostId: request.postId },
      invalidSpecialty: { specialty: 'nonsense', operationalPostId: request.postId },
      instructor: {
        role: 'instructor',
        name: 'T',
        efficiency: 70,
        instructorSpecialty: 'combat',
        operationalPostId: 'staff-post:intel:2',
      },
      valid: { specialty: 'intelligence', operationalPostId: 'staff-post:intel:1' },
    }
    const restored = sanitizeStaffMap(raw, {}, {})
    for (const id of ['unknown', 'malformed', 'incompatible', 'invalidSpecialty', 'instructor'])
      expect(restored[id]).not.toHaveProperty('operationalPostId')
    expect(restored.valid).toMatchObject({
      specialty: 'intel',
      operationalPostId: 'staff-post:intel:1',
    })
    expect(raw.valid.operationalPostId).toBe('staff-post:intel:1')
  })
  it('clears all duplicate claimants including invalid claimants regardless of roster order', () => {
    const entries = [
      ['a', { specialty: 'analysis', operationalPostId: request.postId }],
      ['b', { specialty: 'analysis', operationalPostId: request.postId }],
      ['c', { specialty: 'logistics', operationalPostId: request.postId }],
      ['d', { specialty: 'analysis', operationalPostId: 'staff-post:analysis:2' }],
    ] as const
    for (const order of [entries, [...entries].reverse()]) {
      const restored = sanitizeStaffMap(Object.fromEntries(order), {}, {})
      for (const id of ['a', 'b', 'c']) expect(restored[id]).not.toHaveProperty('operationalPostId')
      expect(restored.d).toHaveProperty('operationalPostId', 'staff-post:analysis:2')
    }
  })
})

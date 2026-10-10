import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { GameState } from '../domain/models'
import {
  commitStaffTime,
  queryStaffTimeAllocation,
  releaseStaffTime,
  isStaffTimeCommitmentUsable,
} from '../domain/staffTimeAllocation'
import {
  reserveWorkshopStaffTime,
  projectWorkshopAllocatedLabor,
  finishWorkshopStaffTimeWindow,
} from '../domain/workshopStaffTime'
import { parseRunExport, serializeRunExport } from '../app/store/runTransfer'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { normalizeGameState } from '../domain/teamSimulation'

export function allocationCampaign(): GameState {
  const game = createStartingState()
  game.agents = {}
  game.staff = {
    a: {
      id: 'a',
      name: 'Analyst',
      specialty: 'analysis',
      operationalPostId: 'staff-post:analysis:1',
    },
    b: {
      id: 'b',
      name: 'Second analyst',
      specialty: 'analysis',
      operationalPostId: 'staff-post:analysis:2',
    },
    idle: { id: 'idle', specialty: 'analysis' },
  } as unknown as GameState['staff']
  game.departmentWorkshopWorkOrders = Object.fromEntries(
    ['first', 'second'].map((id) => [
      id,
      {
        id,
        departmentId: 'department:records-analysis',
        caseId: `case:${id}`,
        taskType: 'records_review',
        requiredWork: 2,
      },
    ])
  )
  game.departmentWorkshopSnapshots = {
    'department:records-analysis': {
      departmentId: 'department:records-analysis',
      slotCapacity: 2,
      active: [
        { workOrderId: 'first', completedWork: 0 },
        { workOrderId: 'second', completedWork: 0 },
      ],
      queued: [],
      paused: [],
    },
  }
  return game
}
function request(game: GameState, destination = 'workshop:first', staffIds = ['a']) {
  return {
    id: `workshop:${game.week}:${destination.slice(9)}`,
    week: game.week,
    staffIds,
    destination,
    displacedAlternative: destination === 'workshop:first' ? 'workshop:second' : null,
    revision: queryStaffTimeAllocation(game).revision,
  }
}

describe('staff-time allocation', () => {
  it('records displacement, excludes occupied staff, and leaves the input unchanged', () => {
    const game = allocationCampaign(),
      before = JSON.stringify(game)
    const result = reserveWorkshopStaffTime(game, request(game))
    expect(result.reason).toBe('committed')
    expect(queryStaffTimeAllocation(result.game).availableIds).toEqual(['b'])
    expect(queryStaffTimeAllocation(result.game).active[0].displacedAlternative).toBe(
      'workshop:second'
    )
    expect(JSON.stringify(game)).toBe(before)
  })
  it('rejects overlapping claims and accepts disjoint capacity', () => {
    const game = allocationCampaign(),
      reserved = commitStaffTime(game, request(game)).game
    expect(commitStaffTime(reserved, request(reserved, 'workshop:second')).reason).toBe('conflict')
    expect(commitStaffTime(reserved, request(reserved, 'workshop:second', ['b'])).reason).toBe(
      'committed'
    )
  })
  it.each([{ staffIds: ['idle'] }, { staffIds: ['missing'] }, { staffIds: ['a', 'a'] }])(
    'rejects unusable/duplicate contributors %j',
    ({ staffIds }) => {
      const game = allocationCampaign(),
        result = commitStaffTime(game, request(game, 'workshop:first', staffIds))
      expect(result.status).toBe('blocked')
      expect(result.game).toBe(game)
    }
  )
  it('rejects stale requests after assignment or week changes', () => {
    const game = allocationCampaign(),
      preview = request(game)
    expect(commitStaffTime({ ...game, week: game.week + 1 }, preview).reason).toBe('stale_request')
    const changed = {
      ...game,
      staff: { ...game.staff, b: { ...game.staff.b, operationalPostId: undefined } },
    }
    expect(commitStaffTime(changed, preview).reason).toBe('stale_request')
  })
  it('is idempotent across release and cannot revive a receipt', () => {
    const game = allocationCampaign(),
      command = request(game),
      reserved = commitStaffTime(game, command).game
    expect(commitStaffTime(reserved, command).status).toBe('no_op')
    const released = releaseStaffTime(
      reserved,
      command.id,
      queryStaffTimeAllocation(reserved).revision
    ).game
    expect(queryStaffTimeAllocation(released).availableIds).toEqual(['a', 'b'])
    expect(releaseStaffTime(released, command.id, '').status).toBe('no_op')
    expect(commitStaffTime(released, command).status).toBe('no_op')
    expect(queryStaffTimeAllocation(released).active).toEqual([])
    expect(commitStaffTime(reserved, { ...command, displacedAlternative: null }).reason).toBe(
      'conflict'
    )
  })
  it('does not let released workshop receipts suppress available staff labor', () => {
    const game = allocationCampaign(),
      command = request(game),
      reserved = reserveWorkshopStaffTime(game, command).game
    const released = releaseStaffTime(
      reserved,
      command.id,
      queryStaffTimeAllocation(reserved).revision
    ).game

    expect(queryStaffTimeAllocation(released).availableIds).toEqual(['a', 'b'])
    expect(projectWorkshopAllocatedLabor(released)?.first?.operators).toContainEqual(
      expect.objectContaining({ roleFamily: 'archive_analyst' })
    )
  })
  it('rejects stale releases without mutation', () => {
    const game = allocationCampaign(),
      command = request(game),
      reserved = commitStaffTime(game, command).game
    expect(releaseStaffTime(reserved, command.id, command.revision)).toMatchObject({
      game: reserved,
      status: 'blocked',
      reason: 'stale_request',
    })
  })
  it('revalidates removed/reassigned contributors without replacement', () => {
    const game = allocationCampaign(),
      reserved = commitStaffTime(game, request(game)).game
    const changed = {
      ...reserved,
      staff: { ...reserved.staff, a: { ...reserved.staff.a, operationalPostId: undefined } },
    }
    expect(isStaffTimeCommitmentUsable(changed, queryStaffTimeAllocation(changed).active[0])).toBe(
      false
    )
    expect(projectWorkshopAllocatedLabor(changed)?.first?.operators).not.toContainEqual(
      expect.objectContaining({ roleFamily: 'archive_analyst' })
    )
  })
  it('preserves active and released receipts through save/load', () => {
    const game = allocationCampaign(),
      reserved = reserveWorkshopStaffTime(game, request(game)).game
    const loaded = parseRunExport(serializeRunExport(reserved))
    expect(loaded.staffTimeAllocations).toEqual(reserved.staffTimeAllocations)
    expect(loadGameSave(serializeGameSave(reserved)).staffTimeAllocations).toEqual(
      reserved.staffTimeAllocations
    )
    expect(normalizeGameState(reserved).staffTimeAllocations).toEqual(reserved.staffTimeAllocations)
    expect(commitStaffTime(loaded, request(loaded, 'workshop:second')).status).toBe('blocked')
    const released = {
      ...reserved,
      staffTimeAllocations: finishWorkshopStaffTimeWindow(reserved, reserved.week),
    }
    expect(parseRunExport(serializeRunExport(released)).staffTimeAllocations).toEqual(
      released.staffTimeAllocations
    )
  })
  it('keeps malformed present saves unavailable and legacy saves uncommitted', () => {
    const game = allocationCampaign()
    expect(queryStaffTimeAllocation(parseRunExport(serializeRunExport(game))).active).toEqual([])
    game.staffTimeAllocations = { version: 9 } as unknown as GameState['staffTimeAllocations']
    const loaded = parseRunExport(serializeRunExport(game))
    expect(queryStaffTimeAllocation(loaded).unavailable).toBe(true)
    expect(commitStaffTime(loaded, request(loaded)).reason).toBe('malformed_source')
  })
  it('withholds the only contributor from the displaced order and releases after week close', () => {
    const game = allocationCampaign()
    delete game.staff.b
    const reserved = reserveWorkshopStaffTime(game, request(game)).game
    const gates = projectWorkshopAllocatedLabor(reserved)
    expect(gates?.first?.operators).toContainEqual(
      expect.objectContaining({ roleFamily: 'archive_analyst' })
    )
    expect(gates?.second?.operators).not.toContainEqual(
      expect.objectContaining({ roleFamily: 'archive_analyst' })
    )
    const next = advanceWeek(reserved)
    expect(next.departmentWorkshopSnapshots?.['department:records-analysis'].active).toEqual([
      { workOrderId: 'first', completedWork: 1 },
      { workOrderId: 'second', completedWork: 0 },
    ])
    expect(queryStaffTimeAllocation(next).active).toEqual([])
    expect(queryStaffTimeAllocation(next).commitments[0].status).toBe('released')
    expect(advanceWeek(reserved).staffTimeAllocations).toEqual(next.staffTimeAllocations)
  })
  it('preserves independent investigator-backed processing', () => {
    const game = allocationCampaign()
    delete game.staff.b
    const agentGame = createStartingState()
    game.agents = agentGame.agents
    const reserved = reserveWorkshopStaffTime(game, request(game)).game
    expect(projectWorkshopAllocatedLabor(reserved)?.second?.operators).toContainEqual(
      expect.objectContaining({ roleFamily: 'archive_analyst' })
    )
  })
  it('preserves unreserved legacy fallback after earlier allocation history', () => {
    const game = allocationCampaign()
    const reserved = reserveWorkshopStaffTime(game, request(game)).game
    const later = {
      ...reserved,
      week: reserved.week + 1,
      staff: {},
      staffTimeAllocations: finishWorkshopStaffTimeWindow(reserved, reserved.week),
    }
    expect(projectWorkshopAllocatedLabor(later)?.first?.operators).toContainEqual(
      expect.objectContaining({ roleFamily: 'archive_analyst' })
    )
    expect(reserveWorkshopStaffTime(later, request(game)).status).toBe('no_op')
  })
  it('releases after blocked processing and permits a fresh next-week commitment', () => {
    const game = allocationCampaign()
    const reserved = reserveWorkshopStaffTime(game, request(game)).game
    const blocked = { ...reserved, specialistOperatorSlots: [] }
    const next = advanceWeek(blocked)
    expect(
      next.departmentWorkshopSnapshots?.['department:records-analysis'].active[0].completedWork
    ).toBe(0)
    expect(queryStaffTimeAllocation(next).commitments[0].status).toBe('released')
    expect(reserveWorkshopStaffTime(next, request(next)).reason).toBe('committed')
    const malformedRoster = { ...reserved, staff: null as unknown as GameState['staff'] }
    expect(finishWorkshopStaffTimeWindow(malformedRoster, malformedRoster.week)).toMatchObject({
      commitments: [expect.objectContaining({ status: 'released' })],
    })
  })
  it('fails closed on corrupted overlap and sparse contributor lists', () => {
    const game = allocationCampaign(),
      reserved = commitStaffTime(game, request(game)).game
    const receipt = queryStaffTimeAllocation(reserved).active[0]
    for (const commitments of [
      [receipt, { ...receipt, id: 'duplicate', destination: 'other' }],
      [{ ...receipt, staffIds: new Array(1) }],
    ]) {
      const corrupt = { ...game, staffTimeAllocations: { version: 1 as const, commitments } }
      expect(queryStaffTimeAllocation(corrupt).unavailable).toBe(true)
      expect(commitStaffTime(corrupt, request(game)).game).toBe(corrupt)
    }
  })
  it('replays multi-contributor claims deterministically and rejects forged usable claims', () => {
    const game = allocationCampaign()
    const first = commitStaffTime(game, request(game, 'declared-use', ['b', 'a']))
    const second = commitStaffTime(game, request(game, 'declared-use', ['a', 'b']))
    expect(first.game.staffTimeAllocations).toEqual(second.game.staffTimeAllocations)
    const actual = queryStaffTimeAllocation(first.game).active[0]
    expect(isStaffTimeCommitmentUsable(first.game, { ...actual, id: 'forged' })).toBe(false)
  })
})

import { describe, expect, it, vi } from 'vitest'
import { createStartingState } from '../data/startingState'
import type { GameState } from '../domain/models'
import {
  convertFacilityMaintenanceResources as convert,
  previewFacilityMaintenanceConversion as preview,
  normalizeMaintenanceConversionLedger,
} from '../domain/facilityMaintenanceConversion'
import { commitStaffTime, queryStaffTimeAllocation } from '../domain/staffTimeAllocation'
import { applyFacilityMaintenanceRecovery } from '../domain/facilityMaintenanceRecovery'
import { normalizeGameState } from '../domain/teamSimulation'
import {
  hydrateGame,
  parseRunExport,
  serializeRunExport,
  migratePersistedStore,
} from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import * as stockAuthority from '../domain/facilityStockpile'
import * as allocationAuthority from '../domain/staffTimeAllocation'

function campaign(): GameState {
  return {
    ...createStartingState(),
    staff: {
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
      idle: { id: 'idle', name: 'Unassigned', specialty: 'analysis' },
    } as unknown as GameState['staff'],
    facilityStockpile: { pressure_seal_gasket: 3, blast_door_hinge_seal: 2 },
    facilityMaintenanceRecoveryResources: { maintenanceHours: 0, partsReserve: 0 },
    facilityMaintenanceState: { maintenanceDebt: 8, lastProcessedWeek: 0 },
  }
}

describe('weekly maintenance conversion', () => {
  it('publishes only conversion authorities even when unrelated state has normalization drift', () => {
    const game = campaign()
    game.funding = 123
    game.agency = { ...game.agency!, funding: 987 }
    game.market = { ...game.market, week: game.week + 10 }
    const result = convert(game, preview(game, 'a').request)
    expect(result.status).toBe('applied')
    const participating = new Set([
      'staffTimeAllocations',
      'facilityStockpile',
      'facilityMaintenanceRecoveryResources',
      'facilityMaintenanceConversionReceipts',
    ])
    for (const key of Object.keys(game) as (keyof GameState)[]) {
      if (!participating.has(key)) expect(result.game[key]).toBe(game[key])
    }
    expect(result.game.agency?.funding).toBe(987)
    expect(result.game.staff).toBe(game.staff)
    expect(result.game.agents).toBe(game.agents)
  })

  it('stores bounded replay tokens even after a long allocation and conversion history', () => {
    const game = campaign()
    const initialRevision = preview(game, 'a').request.revision
    game.week = 500
    game.staffTimeAllocations = {
      version: 1,
      commitments: Array.from({ length: 500 }, (_, week) => ({
        id: `maintenance-conversion:${JSON.stringify([week, 'a'])}`,
        destination: `maintenance-conversion:${JSON.stringify([week, 'a'])}`,
        week,
        staffIds: ['a'],
        postIds: ['staff-post:analysis:1'],
        displacedAlternative: null,
        status: 'released' as const,
      })),
    }
    game.facilityMaintenanceConversionReceipts = {
      version: 1,
      receipts: Array.from({ length: 500 }, (_, week) => ({
        staffId: 'a',
        week,
        revision: initialRevision,
      })),
    }
    const request = preview(game, 'a').request
    expect(request.revision).toMatch(/^maintenance-v1:[0-9a-f]{16}$/)
    const result = convert(game, request)
    expect(result.status).toBe('applied')
    const ledger = result.game.facilityMaintenanceConversionReceipts!
    if ('receipts' in ledger) {
      expect(ledger.receipts).toHaveLength(501)
      expect(ledger.receipts.every((receipt) => receipt.revision.length === 31)).toBe(true)
      expect(JSON.stringify(ledger).length).toBeLessThan(50000)
    } else throw new Error('Expected valid completed receipts')
    expect(convert(result.game, request).status).toBe('no_op')
  })

  it('debits exactly one named part, credits the recipe, records eligibility, and releases capacity atomically', () => {
    const game = campaign(),
      before = structuredClone(game)
    const result = convert(game, preview(game, 'a').request)
    expect(result.status).toBe('applied')
    expect(result.game.facilityStockpile).toEqual({
      pressure_seal_gasket: 2,
      blast_door_hinge_seal: 2,
    })
    expect(result.game.facilityMaintenanceRecoveryResources).toEqual({
      maintenanceHours: 2,
      partsReserve: 1,
    })
    expect(queryStaffTimeAllocation(result.game).active).toEqual([])
    expect(queryStaffTimeAllocation(result.game).availableIds).toEqual(['a', 'b'])
    expect(result.game.staffTimeAllocations).toMatchObject({
      commitments: [{ staffIds: ['a'], status: 'released' }],
    })
    expect(preview(result.game, 'a').reason).toBe('weekly_exhausted')
    expect(result.game.funding).toBe(game.funding)
    expect(result.game.facilityMaintenanceState).toEqual(game.facilityMaintenanceState)
    expect(game).toEqual(before)
    const other = commitStaffTime(result.game, {
      id: 'other',
      week: game.week,
      staffIds: ['a'],
      destination: 'other',
      displacedAlternative: null,
      revision: queryStaffTimeAllocation(result.game).revision,
    })
    expect(other.status).toBe('applied')
  })

  it('distinguishes equivalent replay from a fresh same-week attempt and allows other staff and later weeks', () => {
    const game = campaign(),
      request = preview(game, 'a').request
    const first = convert(game, request).game
    expect(convert(first, request)).toMatchObject({ status: 'no_op', game: first })
    expect(convert(first, preview(first, 'a').request)).toMatchObject({
      reason: 'weekly_exhausted',
      game: first,
    })
    const second = convert(first, preview(first, 'b').request).game
    expect(second.facilityMaintenanceRecoveryResources).toEqual({
      maintenanceHours: 4,
      partsReserve: 2,
    })
    expect(applyFacilityMaintenanceRecovery(second)).toMatchObject({
      status: 'recovered',
      game: { facilityMaintenanceState: { maintenanceDebt: 0 } },
    })
    const later = { ...second, week: second.week + 1 }
    expect(later.facilityMaintenanceRecoveryResources).toBe(
      second.facilityMaintenanceRecoveryResources
    )
    expect(convert(later, preview(later, 'a').request).status).toBe('applied')
    expect(convert(later, request).status).toBe('no_op')
  })

  it.each(['idle', 'missing'])(
    'does not replace insufficient canonical capacity for %s',
    (staffId) => {
      const game = campaign()
      expect(convert(game, preview(game, staffId).request)).toMatchObject({
        status: 'blocked',
        reason: 'insufficient_capacity',
        game,
      })
      expect(game.facilityMaintenanceConversionReceipts).toBeUndefined()
    }
  )

  it('blocks reserved capacity and exposes its competing destination without releasing it', () => {
    const initial = campaign()
    const game = commitStaffTime(initial, {
      id: 'reserved',
      week: initial.week,
      staffIds: ['a'],
      destination: 'workshop:first',
      displacedAlternative: 'workshop:second',
      revision: queryStaffTimeAllocation(initial).revision,
    }).game
    expect(preview(game, 'a')).toMatchObject({
      canConvert: false,
      reason: 'conflict',
      displacedUse: 'workshop:first',
    })
    expect(convert(game, preview(game, 'a').request).game).toBe(game)
    expect(queryStaffTimeAllocation(game).active).toHaveLength(1)
  })

  it.each([
    { facilityStockpile: undefined },
    { facilityStockpile: { blast_door_hinge_seal: 9 } },
    { facilityStockpile: { pressure_seal_gasket: -1 } },
    { facilityStockpile: { pressure_seal_gasket: 1.5 } },
    { facilityMaintenanceRecoveryResources: { maintenanceHours: -1, partsReserve: 1 } },
    {
      facilityMaintenanceRecoveryResources: {
        maintenanceHours: Number.MAX_SAFE_INTEGER,
        partsReserve: 1,
      },
    },
    { facilityMaintenanceConversionReceipts: { version: 1, unavailable: true } },
    { staffTimeAllocations: { version: 1, unavailable: true } },
    { staffTimeAllocations: { version: 1, unavailable: true, commitments: [] } },
  ])('fails closed without consuming weekly eligibility: %j', (override) => {
    const game = { ...campaign(), ...override } as GameState
    const before = structuredClone(game)
    const result = convert(game, preview(game, 'a').request)
    expect(result.status).toBe('blocked')
    expect(result.game).toBe(game)
    expect(game).toEqual(before)
  })

  it('establishes absent legacy resources only after success', () => {
    const game = campaign()
    delete game.facilityMaintenanceRecoveryResources
    expect(game.facilityMaintenanceConversionReceipts).toBeUndefined()
    expect(
      convert(game, preview(game, 'a').request).game.facilityMaintenanceRecoveryResources
    ).toEqual({ maintenanceHours: 2, partsReserve: 1 })
  })

  it.each(['stock', 'resources', 'allocation', 'week', 'post'] as const)(
    'rejects a stale %s preview and allows a corrected retry',
    (change) => {
      const game = campaign(),
        request = preview(game, 'a').request
      const changed = structuredClone(game)
      if (change === 'stock') changed.facilityStockpile!.pressure_seal_gasket = 2
      if (change === 'resources')
        changed.facilityMaintenanceRecoveryResources = { maintenanceHours: 1, partsReserve: 1 }
      if (change === 'week') changed.week++
      if (change === 'post' && 'operationalPostId' in changed.staff.a)
        delete changed.staff.a.operationalPostId
      if (change === 'allocation')
        changed.staffTimeAllocations = commitStaffTime(game, {
          id: 'other',
          week: game.week,
          staffIds: ['b'],
          destination: 'other',
          displacedAlternative: null,
          revision: queryStaffTimeAllocation(game).revision,
        }).game.staffTimeAllocations
      const blocked = convert(changed, request)
      expect(blocked.reason).toBe('stale_request')
      expect(blocked.game).toBe(changed)
      expect(changed.facilityMaintenanceConversionReceipts).toBeUndefined()
      expect(convert(game, request).status).toBe('applied')
    }
  )

  it('rolls back the provisional staff claim if canonical stock consumption fails', () => {
    const game = campaign(),
      request = preview(game, 'a').request
    const spy = vi
      .spyOn(stockAuthority, 'consumeFacilityStock')
      .mockImplementation((state) => ({ ok: false, state, code: 'stock_unavailable' }))
    try {
      expect(convert(game, request)).toMatchObject({ status: 'blocked', game })
      expect(game.staffTimeAllocations).toBeUndefined()
      expect(game.facilityMaintenanceConversionReceipts).toBeUndefined()
    } finally {
      spy.mockRestore()
    }
    expect(convert(game, request).status).toBe('applied')
  })

  it('rolls back stock, resources, receipts and labor if the final canonical release fails', () => {
    const game = campaign(),
      before = structuredClone(game)
    const request = preview(game, 'a').request
    const spy = vi
      .spyOn(allocationAuthority, 'releaseStaffTime')
      .mockImplementation((staged) => ({ game: staged, status: 'blocked', reason: 'conflict' }))
    try {
      expect(convert(game, request)).toMatchObject({ status: 'blocked', reason: 'conflict', game })
      expect(game).toEqual(before)
      expect(game.facilityMaintenanceConversionReceipts).toBeUndefined()
    } finally {
      spy.mockRestore()
    }
    expect(convert(game, request).status).toBe('applied')
  })

  it('ignores inherited stock and preserves receipt order across multiple staff and save/load', () => {
    const inherited = {
      ...campaign(),
      facilityStockpile: Object.create({ pressure_seal_gasket: 1 }),
    }
    expect(preview(inherited, 'a').reason).toBe('stock_unavailable')
    const initial = campaign()
    const secondFirst = convert(initial, preview(initial, 'b').request).game
    const both = convert(secondFirst, preview(secondFirst, 'a').request).game
    expect(parseRunExport(serializeRunExport(both)).facilityMaintenanceConversionReceipts).toEqual(
      both.facilityMaintenanceConversionReceipts
    )
    const reordered = {
      ...initial,
      staff: Object.fromEntries(Object.entries(initial.staff).reverse()),
    }
    expect(preview(reordered, 'a').request).toEqual(preview(initial, 'a').request)
    expect(
      convert(reordered, preview(reordered, 'a').request).game.facilityMaintenanceConversionReceipts
    ).toEqual(
      convert(initial, preview(initial, 'a').request).game.facilityMaintenanceConversionReceipts
    )
  })

  it('rejects invalid and conflicting deterministic conversion requests without inferring success from a released allocation', () => {
    const game = campaign()
    expect(convert(game, null as never).reason).toBe('invalid_request')
    const request = preview(game, 'a').request
    const identity = `maintenance-conversion:${JSON.stringify([game.week, 'a'])}`
    const conflicting = commitStaffTime(game, {
      id: identity,
      destination: identity,
      week: game.week,
      staffIds: ['b'],
      displacedAlternative: null,
      revision: queryStaffTimeAllocation(game).revision,
    }).game
    expect(convert(conflicting, preview(conflicting, 'a').request).reason).toBe('conflict')
    expect(conflicting.facilityMaintenanceConversionReceipts).toBeUndefined()
    expect(convert(game, { ...request, week: -1 }).reason).toBe('invalid_request')
  })

  it('preserves success and replay identity through normalize, hydration, exports, manual saves and migration', () => {
    const initial = campaign(),
      request = preview(initial, 'a').request
    const completed = convert(initial, request).game
    const exported = parseRunExport(serializeRunExport(completed), createStartingState())
    const saved = loadGameSave(serializeGameSave(completed), createStartingState())
    const states = [
      normalizeGameState(completed),
      hydrateGame(completed, createStartingState()),
      hydrateGame(
        migratePersistedStore({ game: completed }, 1, createStartingState()).game,
        createStartingState()
      ),
    ]
    states.push(exported, saved)
    for (const game of states) {
      expect(game.facilityMaintenanceConversionReceipts).toEqual(
        completed.facilityMaintenanceConversionReceipts
      )
      expect(game.facilityMaintenanceRecoveryResources).toEqual(
        completed.facilityMaintenanceRecoveryResources
      )
      expect(preview(game, 'a').reason).toBe('weekly_exhausted')
      expect(convert(game, request).status).toBe('no_op')
    }
  })

  it('keeps malformed, sparse, duplicate and future receipt data unavailable across hydration', () => {
    const receipt = { staffId: 'a', week: 0, revision: preview(campaign(), 'a').request.revision }
    for (const raw of [
      null,
      {},
      { version: 1, receipts: [receipt, receipt] },
      { version: 1, unavailable: true, receipts: [] },
      Object.assign(Object.create({ unavailable: true }), { version: 1, receipts: [] }),
      { version: 1, receipts: [Object.create(receipt)] },
      { version: 1, receipts: new Array(1) },
      { version: 1, receipts: [{ ...receipt, week: -1 }] },
    ]) {
      expect(normalizeMaintenanceConversionLedger(raw)).toEqual({ version: 1, unavailable: true })
      const game = hydrateGame(
        { ...campaign(), facilityMaintenanceConversionReceipts: raw } as never,
        createStartingState()
      )
      expect(preview(game, 'a').reason).toBe('malformed_source')
    }
    expect(normalizeMaintenanceConversionLedger(undefined)).toBeUndefined()
    const game = campaign()
    game.facilityMaintenanceConversionReceipts = {
      version: 1,
      receipts: [{ ...receipt, week: game.week + 1 }],
    }
    expect(preview(game, 'a').reason).toBe('malformed_source')
  })

  it('preserves hybrid allocation unavailability through hydration and every save path', () => {
    const game = {
      ...campaign(),
      staffTimeAllocations: { version: 1, unavailable: true, commitments: [] },
    } as GameState
    const states = [
      normalizeGameState(game),
      hydrateGame(game, createStartingState()),
      parseRunExport(serializeRunExport(game)),
      loadGameSave(serializeGameSave(game)),
    ]
    for (const hydrated of states) {
      expect(hydrated.staffTimeAllocations).toEqual({ version: 1, unavailable: true })
      expect(preview(hydrated, 'a').reason).toBe('malformed_source')
      expect(convert(hydrated, preview(hydrated, 'a').request).game).toBe(hydrated)
      expect(hydrated.facilityMaintenanceConversionReceipts).toBeUndefined()
    }
  })

  it('rejects inherited allocation authority and required commitment fields before conversion and hydration', () => {
    const receipt = {
      id: 'reserved',
      week: campaign().week,
      staffIds: ['a'],
      postIds: ['staff-post:analysis:1'],
      destination: 'other',
      displacedAlternative: null,
      status: 'active',
    }
    const inheritedReceipts = Object.keys(receipt).map((key) => {
      const value = { ...receipt } as Record<string, unknown>
      const inherited = value[key]
      delete value[key]
      return Object.assign(Object.create({ [key]: inherited }), value)
    })
    const malformed = [
      Object.create({ version: 1, commitments: [] }),
      Object.assign(Object.create({ unavailable: true }), { version: 1, commitments: [] }),
      Object.assign(Object.create({ version: 1 }), { commitments: [] }),
      Object.assign(Object.create({ commitments: [] }), { version: 1 }),
      ...inheritedReceipts.map((value) => ({ version: 1, commitments: [value] })),
    ]
    for (const raw of malformed) {
      const game = { ...campaign(), staffTimeAllocations: raw }
      expect(convert(game, preview(game, 'a').request)).toMatchObject({
        status: 'blocked',
        reason: 'malformed_source',
        game,
      })
      const hydrated = hydrateGame(game, createStartingState())
      expect(hydrated.staffTimeAllocations).toEqual({ version: 1, unavailable: true })
      expect(preview(hydrated, 'a').canConvert).toBe(false)
    }
  })
})

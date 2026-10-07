import type { GameState } from './models'
import { consumeFacilityStock } from './facilityStockpile'
import { PRESSURE_SEAL_SPARE_PART_ID, SPARE_PART_IDS } from './sparePartSuitability'
import { parseFacilityMaintenanceRecoveryResources } from './facilityMaintenanceRecovery'
import { commitStaffTime, queryStaffTimeAllocation, releaseStaffTime } from './staffTimeAllocation'

/** An existing service gasket is converted into a prepared maintenance reserve. */
export const FACILITY_MAINTENANCE_CONVERSION = Object.freeze({
  stockId: PRESSURE_SEAL_SPARE_PART_ID,
  stockQuantity: 1,
  staffCapacity: 1,
  maintenanceHours: 2,
  partsReserve: 1,
})

export interface MaintenanceConversionReceipt {
  readonly staffId: string
  readonly week: number
  readonly revision: string
}
export type MaintenanceConversionLedger =
  | { readonly version: 1; readonly receipts: readonly MaintenanceConversionReceipt[] }
  | { readonly version: 1; readonly unavailable: true }
export interface MaintenanceConversionRequest {
  readonly staffId: string
  readonly week: number
  readonly revision: string
}
export type MaintenanceConversionReason =
  | 'converted'
  | 'no_op'
  | 'invalid_request'
  | 'malformed_source'
  | 'stale_request'
  | 'insufficient_capacity'
  | 'conflict'
  | 'weekly_exhausted'
  | 'stock_unavailable'
  | 'invalid_stock'
  | 'invalid_resources'
export interface MaintenanceConversionResult {
  readonly game: GameState
  readonly status: 'applied' | 'no_op' | 'blocked'
  readonly reason: MaintenanceConversionReason
}
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const identifier = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.trim() === value

/** Preserve corrupt present data as unavailable, never as renewed weekly eligibility. */
export function normalizeMaintenanceConversionLedger(
  raw: unknown
): MaintenanceConversionLedger | undefined {
  if (raw === undefined) return undefined
  const invalid = { version: 1, unavailable: true } as const
  if (!record(raw) || raw.version !== 1 || !Array.isArray(raw.receipts)) return invalid
  const receipts: MaintenanceConversionReceipt[] = []
  const seen = new Set<string>()
  for (const value of raw.receipts) {
    if (
      !record(value) ||
      !identifier(value.staffId) ||
      !Number.isSafeInteger(value.week) ||
      (value.week as number) < 0 ||
      !identifier(value.revision)
    )
      return invalid
    const key = JSON.stringify([value.week, value.staffId])
    if (seen.has(key)) return invalid
    seen.add(key)
    receipts.push({ staffId: value.staffId, week: value.week as number, revision: value.revision })
  }
  return {
    version: 1,
    receipts: receipts.sort(
      (a, b) => a.week - b.week || (a.staffId < b.staffId ? -1 : a.staffId > b.staffId ? 1 : 0)
    ),
  }
}

function conversionSources(game: GameState) {
  const allocation = queryStaffTimeAllocation(game)
  const ledger = normalizeMaintenanceConversionLedger(game.facilityMaintenanceConversionReceipts)
  const receipts = ledger && 'receipts' in ledger ? ledger.receipts : []
  const unavailable =
    allocation.unavailable ||
    (ledger !== undefined && 'unavailable' in ledger) ||
    receipts.some((receipt) => receipt.week > game.week)
  const stock = game.facilityStockpile
  const stockValid =
    stock === undefined ||
    (record(stock) &&
      Object.entries(stock).every(
        ([key, quantity]) =>
          (SPARE_PART_IDS as readonly string[]).includes(key) &&
          Number.isSafeInteger(quantity) &&
          (quantity as number) > 0
      ))
  const stockQuantity =
    stockValid && stock && Object.hasOwn(stock, PRESSURE_SEAL_SPARE_PART_ID)
      ? (stock[PRESSURE_SEAL_SPARE_PART_ID] ?? 0)
      : 0
  const resources =
    game.facilityMaintenanceRecoveryResources === undefined
      ? { maintenanceHours: 0, partsReserve: 0 }
      : parseFacilityMaintenanceRecoveryResources(game.facilityMaintenanceRecoveryResources)
  const credited =
    resources &&
    parseFacilityMaintenanceRecoveryResources({
      maintenanceHours:
        resources.maintenanceHours + FACILITY_MAINTENANCE_CONVERSION.maintenanceHours,
      partsReserve: resources.partsReserve + FACILITY_MAINTENANCE_CONVERSION.partsReserve,
    })
  // Include receipt keys, but exclude their revisions to avoid recursive token growth.
  const revision = JSON.stringify([
    allocation.revision,
    stockValid,
    stockQuantity,
    resources,
    credited,
    receipts.map((r) => [r.week, r.staffId]),
  ])
  return { allocation, receipts, unavailable, stockValid, stockQuantity, credited, revision }
}

export function previewFacilityMaintenanceConversion(game: GameState, staffId: string) {
  const source = conversionSources(game)
  const reservation = source.allocation.active.find((entry) => entry.staffIds.includes(staffId))
  let reason: MaintenanceConversionReason = 'converted'
  if (source.unavailable) reason = 'malformed_source'
  else if (
    !identifier(staffId) ||
    !(source.allocation.capacity.byStaffId[staffId]?.effectiveCapacity > 0)
  )
    reason = 'insufficient_capacity'
  else if (source.receipts.some((r) => r.staffId === staffId && r.week === game.week))
    reason = 'weekly_exhausted'
  else if (reservation) reason = 'conflict'
  else if (!source.stockValid) reason = 'invalid_stock'
  else if (source.stockQuantity < 1) reason = 'stock_unavailable'
  else if (!source.credited) reason = 'invalid_resources'
  return {
    canConvert: reason === 'converted',
    reason,
    stockQuantity: source.stockQuantity,
    displacedUse: reservation?.destination ?? null,
    request: { staffId, week: game.week, revision: source.revision },
  }
}

/** Publish only a fully completed conversion, including its successful receipt and canonical release. */
export function convertFacilityMaintenanceResources(
  game: GameState,
  request: MaintenanceConversionRequest
): MaintenanceConversionResult {
  const blocked = (reason: MaintenanceConversionReason): MaintenanceConversionResult => ({
    game,
    status: 'blocked',
    reason,
  })
  if (
    !record(request) ||
    !identifier(request.staffId) ||
    !Number.isSafeInteger(request.week) ||
    request.week < 0 ||
    !identifier(request.revision)
  )
    return blocked('invalid_request')
  const source = conversionSources(game)
  if (source.unavailable) return blocked('malformed_source')
  const prior = source.receipts.find(
    (r) => r.staffId === request.staffId && r.week === request.week
  )
  if (prior && prior.revision === request.revision)
    return { game, status: 'no_op', reason: 'no_op' }
  if (request.week !== game.week) return blocked('stale_request')
  if (prior) return blocked('weekly_exhausted')
  if (request.revision !== source.revision) return blocked('stale_request')
  const preview = previewFacilityMaintenanceConversion(game, request.staffId)
  if (!preview.canConvert) return blocked(preview.reason)
  const identity = `maintenance-conversion:${JSON.stringify([game.week, request.staffId])}`
  const committed = commitStaffTime(game, {
    id: identity,
    destination: identity,
    displacedAlternative: null,
    staffIds: [request.staffId],
    week: game.week,
    revision: source.allocation.revision,
  })
  if (committed.status !== 'applied')
    return blocked(
      committed.reason === 'no_op' ||
        committed.reason === 'committed' ||
        committed.reason === 'released'
        ? 'conflict'
        : committed.reason
    )
  const consumed = consumeFacilityStock(committed.game, PRESSURE_SEAL_SPARE_PART_ID)
  if (!consumed.ok) return blocked('stock_unavailable')
  const credited: GameState = {
    ...consumed.state,
    facilityMaintenanceRecoveryResources: source.credited!,
    facilityMaintenanceConversionReceipts: normalizeMaintenanceConversionLedger({
      version: 1,
      receipts: [
        ...source.receipts,
        { staffId: request.staffId, week: game.week, revision: request.revision },
      ],
    }),
  }
  const released = releaseStaffTime(credited, identity, queryStaffTimeAllocation(credited).revision)
  if (released.status !== 'applied') return blocked('conflict')
  return { game: released.game, status: 'applied', reason: 'converted' }
}

import { clamp } from './math'
import { getCaseRegionTag } from './pressure'
import type { CaseInstance, HarvestedMindLoadout, LeaderBonus, LegitimacyState } from './models'
import { aggregateLoadoutModifiers } from './hostileLoadouts'
import type { MapLayerResult } from './siteGeneration/mapMetadata'
import { getRestrictedScaleAnchors } from './siteGeneration/mapMetadata'

export const AGGREGATE_BATTLE_PHASES = ['movement', 'missile', 'melee', 'morale', 'rally'] as const

export type AggregateBattlePhase = (typeof AGGREGATE_BATTLE_PHASES)[number]

export type AggregateBattleAreaKind = 'approach' | 'line' | 'reserve' | 'support'
export type AggregateBattleOrder = 'hold' | 'advance' | 'press' | 'screen' | 'rally'
export type AggregateBattleMoraleState = 'steady' | 'shaken' | 'retreating' | 'routed'
export type AggregateBattleSupplyState = 'secure' | 'strained' | 'cut'

export const AGGREGATE_BATTLE_FAMILY_PROFILES = {
  line_company: {
    label: 'Line Company',
    aggregationScale: 40,
    defaultOccupancy: 2,
    defaultFrontage: 2,
    defaultMovement: 1,
    defaultControlReach: 1,
    missileCadence: 1,
    meleeLocksMissiles: true,
    specialHitsToBreak: 0,
  },
  mounted_wing: {
    label: 'Mounted Wing',
    aggregationScale: 15,
    defaultOccupancy: 1,
    defaultFrontage: 1,
    defaultMovement: 2,
    defaultControlReach: 1,
    missileCadence: 1,
    meleeLocksMissiles: true,
    specialHitsToBreak: 0,
  },
  horde_mass: {
    label: 'Horde Mass',
    aggregationScale: 60,
    defaultOccupancy: 3,
    defaultFrontage: 3,
    defaultMovement: 1,
    defaultControlReach: 1,
    missileCadence: 1,
    meleeLocksMissiles: true,
    specialHitsToBreak: 0,
  },
  artillery_section: {
    label: 'Artillery Section',
    aggregationScale: 4,
    defaultOccupancy: 1,
    defaultFrontage: 1,
    defaultMovement: 1,
    defaultControlReach: 0,
    missileCadence: 2,
    meleeLocksMissiles: true,
    specialHitsToBreak: 0,
  },
  special_creature: {
    label: 'Special Creature',
    aggregationScale: 1,
    defaultOccupancy: 2,
    defaultFrontage: 2,
    defaultMovement: 1,
    defaultControlReach: 1,
    missileCadence: 1,
    meleeLocksMissiles: true,
    specialHitsToBreak: 3,
  },
} as const

export type AggregateBattleUnitFamily = keyof typeof AGGREGATE_BATTLE_FAMILY_PROFILES

export interface AggregateBattleArea {
  id: string
  label: string
  kind: AggregateBattleAreaKind
  occupancyCapacity: number
  frontageCapacity: number
  adjacent: string[]
}

export interface AggregateBattleDurabilityTrack {
  hitsToBreak: number
  hitsTaken?: number
}

export interface AggregateBattleReinforcement {
  round: number
  areaId: string
}

export interface AggregateBattleUnit {
  id: string
  label: string
  sideId: string
  family: AggregateBattleUnitFamily
  strengthSteps: number
  areaId?: string
  order?: AggregateBattleOrder
  plannedPath?: string[]
  meleeFactor: number
  missileFactor?: number
  defenseFactor: number
  morale: number
  readiness: number
  occupancyWeight?: number
  frontage?: number
  movement?: number
  controlReach?: number
  controlAreaIds?: string[]
  moraleState?: AggregateBattleMoraleState
  routedRounds?: number
  commanderOverlayId?: string
  reinforcement?: AggregateBattleReinforcement
  specialDurability?: AggregateBattleDurabilityTrack
  /** Optional harvested-mind loadout. When present, grants capability-derived combat modifiers. */
  harvestedLoadout?: HarvestedMindLoadout
}

export interface AggregateBattleSideState {
  id: string
  label: string
  reserveAreaId: string
  supportAreaId?: string
  supportAvailable: number
  supplyState: AggregateBattleSupplyState
  coordinationFriction: boolean
  authority: LegitimacyState['sanctionLevel']
}

export interface AggregateBattleContext {
  regionTag: string
  siteLayer?: CaseInstance['siteLayer']
  visibilityState?: CaseInstance['visibilityState']
  transitionType?: CaseInstance['transitionType']
  spatialFlags: string[]
  /** SPE-451: cross-scale map layer, used to derive restricted-anchor defense bonus. */
  mapLayer?: MapLayerResult
  /**
   * SPE-110/SPE-451: The side ID of the institutional defender (the side that occupies and
   * controls the site). When set, construction.incomplete defense penalties and restricted
   * scale-anchor bonuses apply only to units on this side.
   */
  defenderSideId?: string
}

export interface AggregateBattleCommandOverlay {
  id: string
  sideId: string
  label: string
  areaId: string
  anchorUnitId?: string
  attackBonus: number
  defenseBonus: number
  moraleBonus: number
  rallyBonus: number
  authority: LegitimacyState['sanctionLevel']
}

export interface AggregateBattleInput {
  battleId: string
  roundLimit: number
  areas: AggregateBattleArea[]
  sides: AggregateBattleSideState[]
  units: AggregateBattleUnit[]
  context: AggregateBattleContext
  commandOverlays?: AggregateBattleCommandOverlay[]
}

export type AggregateBattleLogSegment =
  | 'phase-window'
  | 'ordered-resolution'
  | 'mutual-resolution'
  | 'movement'
  | 'reinforcement'
  | 'combat'
  | 'morale'
  | 'rally'

export interface AggregateBattleLogEntry {
  round: number
  phase: AggregateBattlePhase
  segment: AggregateBattleLogSegment
  detail: string
  unitId?: string
  targetUnitId?: string
  areaId?: string
}

export type AggregateBattleMovementDenialReason =
  | 'hostile_control_chain'
  | 'occupancy_full'
  | 'not_adjacent'
  | 'missing_area'

export interface AggregateBattleMovementDenial {
  round: number
  unitId: string
  attemptedPath: string[]
  blockedAt: string
  reason: AggregateBattleMovementDenialReason
}

export interface AggregateBattleUnitResult {
  unitId: string
  label: string
  sideId: string
  family: AggregateBattleUnitFamily
  familyLabel: string
  aggregationScale: number
  areaId: string | null
  areaLabel: string
  startingStrengthSteps: number
  remainingStrengthSteps: number
  stepLosses: number
  representedStrength: number
  moraleState: AggregateBattleMoraleState
  routedRounds: number
  specialHitsTaken: number
  specialHitsToBreak: number
  destroyed: boolean
}

export interface AggregateBattleResult {
  battleId: string
  roundsResolved: number
  winnerSideId: string | null
  controlByArea: Record<string, string | null>
  phaseLog: AggregateBattleLogEntry[]
  movementDenials: AggregateBattleMovementDenial[]
  summaryTable: AggregateBattleUnitResult[]
}

export interface AggregateBattleSpecialDamageSummary {
  unitId: string
  label: string
  sideId: string
  hitsTaken: number
  hitsToBreak: number
  destroyed: boolean
}

export interface AggregateBattleCampaignSummary {
  battleId: string
  regionTag: string
  roundsResolved: number
  winnerSideId: string | null
  winnerLabel: string | null
  friendlySideId: string
  friendlyLabel: string
  hostileSideId: string
  hostileLabel: string
  movementDeniedCount: number
  movementDeniedUnits: string[]
  friendlyRoutedUnits: string[]
  hostileRoutedUnits: string[]
  specialDamage: AggregateBattleSpecialDamageSummary[]
  summaryTable: AggregateBattleUnitResult[]
}

export interface AggregateBattleCampaignRollup {
  battleCount: number
  friendlyRoutedCount: number
  hostileRoutedCount: number
  specialDamageCount: number
  specialHitsTaken: number
  movementDeniedCount: number
}

interface RuntimeAggregateBattleUnit {
  id: string
  label: string
  sideId: string
  family: AggregateBattleUnitFamily
  familyLabel: string
  aggregationScale: number
  strengthSteps: number
  startingStrengthSteps: number
  areaId?: string
  order: AggregateBattleOrder
  plannedPath: string[]
  meleeFactor: number
  missileFactor: number
  defenseFactor: number
  morale: number
  readiness: number
  occupancyWeight: number
  frontage: number
  movement: number
  controlReach: number
  controlAreaIds?: string[]
  moraleState: AggregateBattleMoraleState
  routedRounds: number
  commanderOverlayId?: string
  reinforcement?: AggregateBattleReinforcement
  missileCadence: number
  meleeLocksMissiles: boolean
  specialDurability?: Required<AggregateBattleDurabilityTrack>
  stepLosses: number
  roundStepLosses: number
  roundShock: number
  roundSpecialHits: number
  missileLockoutRounds: number
  harvestedLoadout?: HarvestedMindLoadout
}

interface CombatTableCell {
  stepHits: number
  moraleShock: number
  specialHits: number
}

interface AggregateBattleHitRecord extends CombatTableCell {
  sourceId: string
  targetId: string
  mode: 'missile' | 'melee'
}

const ZERO_TABLE_CELL: CombatTableCell = {
  stepHits: 0,
  moraleShock: 0,
  specialHits: 0,
}

const MISSILE_RESULT_TABLE: readonly (readonly CombatTableCell[])[] = [
  [ZERO_TABLE_CELL, ZERO_TABLE_CELL, ZERO_TABLE_CELL, ZERO_TABLE_CELL, ZERO_TABLE_CELL],
  [
    { stepHits: 1, moraleShock: 1, specialHits: 1 },
    { stepHits: 1, moraleShock: 1, specialHits: 1 },
    { stepHits: 0, moraleShock: 1, specialHits: 0 },
    ZERO_TABLE_CELL,
    ZERO_TABLE_CELL,
  ],
  [
    { stepHits: 2, moraleShock: 2, specialHits: 1 },
    { stepHits: 1, moraleShock: 1, specialHits: 1 },
    { stepHits: 1, moraleShock: 1, specialHits: 1 },
    { stepHits: 0, moraleShock: 1, specialHits: 0 },
    ZERO_TABLE_CELL,
  ],
  [
    { stepHits: 2, moraleShock: 2, specialHits: 2 },
    { stepHits: 2, moraleShock: 2, specialHits: 1 },
    { stepHits: 1, moraleShock: 2, specialHits: 1 },
    { stepHits: 1, moraleShock: 1, specialHits: 1 },
    { stepHits: 0, moraleShock: 1, specialHits: 0 },
  ],
  [
    { stepHits: 3, moraleShock: 2, specialHits: 2 },
    { stepHits: 2, moraleShock: 2, specialHits: 2 },
    { stepHits: 2, moraleShock: 2, specialHits: 1 },
    { stepHits: 1, moraleShock: 2, specialHits: 1 },
    { stepHits: 1, moraleShock: 1, specialHits: 1 },
  ],
] as const

const MELEE_RESULT_TABLE: readonly (readonly CombatTableCell[])[] = [
  [ZERO_TABLE_CELL, ZERO_TABLE_CELL, ZERO_TABLE_CELL, ZERO_TABLE_CELL, ZERO_TABLE_CELL],
  [
    { stepHits: 1, moraleShock: 1, specialHits: 1 },
    { stepHits: 1, moraleShock: 1, specialHits: 1 },
    { stepHits: 0, moraleShock: 1, specialHits: 0 },
    ZERO_TABLE_CELL,
    ZERO_TABLE_CELL,
  ],
  [
    { stepHits: 2, moraleShock: 2, specialHits: 1 },
    { stepHits: 1, moraleShock: 2, specialHits: 1 },
    { stepHits: 1, moraleShock: 1, specialHits: 1 },
    { stepHits: 1, moraleShock: 1, specialHits: 0 },
    ZERO_TABLE_CELL,
  ],
  [
    { stepHits: 2, moraleShock: 3, specialHits: 2 },
    { stepHits: 2, moraleShock: 2, specialHits: 1 },
    { stepHits: 1, moraleShock: 2, specialHits: 1 },
    { stepHits: 1, moraleShock: 1, specialHits: 1 },
    { stepHits: 1, moraleShock: 1, specialHits: 0 },
  ],
  [
    { stepHits: 3, moraleShock: 3, specialHits: 2 },
    { stepHits: 2, moraleShock: 3, specialHits: 2 },
    { stepHits: 2, moraleShock: 2, specialHits: 1 },
    { stepHits: 2, moraleShock: 2, specialHits: 1 },
    { stepHits: 1, moraleShock: 2, specialHits: 1 },
  ],
] as const

export function buildAggregateBattleContextFromCase(
  caseData: Pick<
    CaseInstance,
    | 'tags'
    | 'requiredTags'
    | 'preferredTags'
    | 'regionTag'
    | 'siteLayer'
    | 'visibilityState'
    | 'transitionType'
    | 'spatialFlags'
    | 'mapLayer'
  >
): AggregateBattleContext {
  return {
    regionTag: getCaseRegionTag(caseData),
    siteLayer: caseData.siteLayer,
    visibilityState: caseData.visibilityState,
    transitionType: caseData.transitionType,
    spatialFlags: [...(caseData.spatialFlags ?? [])],
    mapLayer: caseData.mapLayer,
  }
}

export function buildAggregateBattleSideState(input: {
  id: string
  label: string
  reserveAreaId: string
  supportAreaId?: string
  supportAvailable?: number
  coordinationFrictionActive?: boolean
  legitimacy?: LegitimacyState
}): AggregateBattleSideState {
  const supportAvailable = Math.max(0, Math.trunc(input.supportAvailable ?? 0))

  return {
    id: input.id,
    label: input.label,
    reserveAreaId: input.reserveAreaId,
    supportAreaId: input.supportAreaId,
    supportAvailable,
    supplyState: supportAvailable >= 3 ? 'secure' : supportAvailable >= 1 ? 'strained' : 'cut',
    coordinationFriction: Boolean(input.coordinationFrictionActive),
    authority: input.legitimacy?.sanctionLevel ?? 'sanctioned',
  }
}

export function createAggregateBattleCommandOverlayFromLeaderBonus(input: {
  id: string
  sideId: string
  label: string
  areaId: string
  anchorUnitId?: string
  leaderBonus: LeaderBonus
  authority?: LegitimacyState['sanctionLevel']
}): AggregateBattleCommandOverlay {
  const authority = input.authority ?? 'sanctioned'
  const authorityBonus =
    authority === 'sanctioned'
      ? 1
      : authority === 'covert'
        ? 0
        : authority === 'tolerated'
          ? -1
          : -2

  return {
    id: input.id,
    sideId: input.sideId,
    label: input.label,
    areaId: input.areaId,
    anchorUnitId: input.anchorUnitId,
    attackBonus: clamp(
      Math.round((input.leaderBonus.effectivenessMultiplier - 1) * 12) + authorityBonus,
      -2,
      3
    ),
    defenseBonus: clamp(authorityBonus, -2, 1),
    moraleBonus: clamp(Math.round(input.leaderBonus.eventModifier * 8) + authorityBonus, -2, 3),
    rallyBonus: clamp(
      Math.round(input.leaderBonus.xpBonus * 6 - input.leaderBonus.stressModifier * 4) +
        authorityBonus,
      -2,
      4
    ),
    authority,
  }
}

export function resolveAggregateBattle(input: AggregateBattleInput): AggregateBattleResult {
  const areaMap = new Map(input.areas.map((area) => [area.id, area]))
  const sideMap = new Map(input.sides.map((side) => [side.id, side]))
  const overlayMap = new Map((input.commandOverlays ?? []).map((overlay) => [overlay.id, overlay]))
  const units = input.units
    .map((unit) => normalizeAggregateBattleUnit(unit))
    .sort((left, right) => left.id.localeCompare(right.id))
  const unitsById = new Map(units.map((unit) => [unit.id, unit]))
  const phaseLog: AggregateBattleLogEntry[] = []
  const movementDenials: AggregateBattleMovementDenial[] = []
  let roundsResolved = 0

  for (let round = 1; round <= Math.max(1, Math.trunc(input.roundLimit)); round += 1) {
    roundsResolved = round
    resetRoundState(units)

    const roundHasActivity = ensureReinforcementsArrive(
      round,
      units,
      phaseLog,
      input.sides,
      areaMap
    )
    openPhaseWindow(phaseLog, round, 'movement')
    resolveMovementPhase(round, units, input.sides, areaMap, movementDenials, phaseLog)

    openPhaseWindow(phaseLog, round, 'missile')
    resolveMissilePhase(round, units, unitsById, input, areaMap, sideMap, overlayMap, phaseLog)

    openPhaseWindow(phaseLog, round, 'melee')
    phaseLog.push({
      round,
      phase: 'melee',
      segment: 'mutual-resolution',
      detail: 'Mutual melee resolution window.',
    })
    resolveMeleePhase(round, units, unitsById, input, areaMap, sideMap, overlayMap, phaseLog)

    openPhaseWindow(phaseLog, round, 'morale')
    resolveMoralePhase(round, units, unitsById, input.sides, areaMap, overlayMap, phaseLog)

    openPhaseWindow(phaseLog, round, 'rally')
    resolveRallyPhase(round, units, unitsById, input.sides, areaMap, overlayMap, phaseLog)

    for (const unit of units) {
      if (unit.missileLockoutRounds > 0) {
        unit.missileLockoutRounds -= 1
      }
    }

    if (!roundHasActivity && battleHasDecisiveState(units, input.sides)) {
      break
    }

    if (battleHasDecisiveState(units, input.sides)) {
      break
    }
  }

  const controlByArea = Object.fromEntries(
    input.areas.map((area) => [area.id, computeAreaController(area.id, units, input.sides)])
  )
  const summaryTable = units
    .map((unit) => buildUnitResultRow(unit, areaMap))
    .sort((left, right) => {
      return (
        Number(left.destroyed) - Number(right.destroyed) ||
        right.representedStrength - left.representedStrength ||
        left.label.localeCompare(right.label)
      )
    })

  return {
    battleId: input.battleId,
    roundsResolved,
    winnerSideId: resolveWinningSide(units, input.sides, controlByArea),
    controlByArea,
    phaseLog,
    movementDenials,
    summaryTable,
  }
}

export function summarizeAggregateBattle(result: AggregateBattleResult) {
  return result.summaryTable.map((row) => {
    const durabilityPart =
      row.specialHitsToBreak > 0
        ? ` / durability ${row.specialHitsTaken}/${row.specialHitsToBreak}`
        : ''

    return `${row.label}: ${row.representedStrength} represented / ${row.areaLabel} / ${row.moraleState}${durabilityPart}`
  })
}

export function buildAggregateBattleCampaignSummary(input: {
  context: AggregateBattleContext
  result: AggregateBattleResult
  friendlySideId: string
  friendlyLabel: string
  hostileSideId: string
  hostileLabel: string
}): AggregateBattleCampaignSummary {
  const unitLabelById = new Map(
    input.result.summaryTable.map((row) => [row.unitId, row.label] as const)
  )
  const isPersistentlyRouted = (row: AggregateBattleUnitResult) =>
    row.moraleState === 'routed' || row.routedRounds > 0

  const friendlyRoutedUnits = input.result.summaryTable
    .filter((row) => row.sideId === input.friendlySideId && isPersistentlyRouted(row))
    .map((row) => row.label)
  const hostileRoutedUnits = input.result.summaryTable
    .filter((row) => row.sideId === input.hostileSideId && isPersistentlyRouted(row))
    .map((row) => row.label)
  const specialDamage = input.result.summaryTable
    .filter((row) => row.specialHitsToBreak > 0 && row.specialHitsTaken > 0)
    .map((row) => ({
      unitId: row.unitId,
      label: row.label,
      sideId: row.sideId,
      hitsTaken: row.specialHitsTaken,
      hitsToBreak: row.specialHitsToBreak,
      destroyed: row.destroyed,
    }))

  return {
    battleId: input.result.battleId,
    regionTag: input.context.regionTag,
    roundsResolved: input.result.roundsResolved,
    winnerSideId: input.result.winnerSideId,
    winnerLabel:
      input.result.winnerSideId === input.friendlySideId
        ? input.friendlyLabel
        : input.result.winnerSideId === input.hostileSideId
          ? input.hostileLabel
          : null,
    friendlySideId: input.friendlySideId,
    friendlyLabel: input.friendlyLabel,
    hostileSideId: input.hostileSideId,
    hostileLabel: input.hostileLabel,
    movementDeniedCount: input.result.movementDenials.length,
    movementDeniedUnits: [
      ...new Set(
        input.result.movementDenials.map(
          (denial) => unitLabelById.get(denial.unitId) ?? denial.unitId
        )
      ),
    ].sort((left, right) => left.localeCompare(right)),
    friendlyRoutedUnits,
    hostileRoutedUnits,
    specialDamage,
    summaryTable: input.result.summaryTable.map((row) => ({ ...row })),
  }
}

export function formatAggregateBattleCampaignSummary(summary: AggregateBattleCampaignSummary) {
  const resultLine = summary.winnerLabel
    ? `${summary.winnerLabel} held the field`
    : 'No side held the field decisively'
  const detailParts = [
    `${summary.roundsResolved} round(s)`,
    `${summary.friendlyRoutedUnits.length} friendly routed`,
    `${summary.hostileRoutedUnits.length} hostile routed`,
    `${summary.specialDamage.length} durable contact(s) marked`,
  ]

  if (summary.movementDeniedCount > 0) {
    detailParts.push(`${summary.movementDeniedCount} movement lane(s) denied`)
  }

  if (summary.specialDamage.length > 0) {
    detailParts.push(
      `durability ${summary.specialDamage
        .map((entry) => `${entry.label} ${entry.hitsTaken}/${entry.hitsToBreak}`)
        .join(', ')}`
    )
  }

  return `Aggregate battle: ${resultLine} after ${detailParts.join(' / ')}.`
}

export function isAggregateBattleCampaignSummary(
  value: unknown
): value is AggregateBattleCampaignSummary {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<AggregateBattleCampaignSummary>

  return (
    typeof candidate.battleId === 'string' &&
    typeof candidate.regionTag === 'string' &&
    Array.isArray(candidate.summaryTable) &&
    Array.isArray(candidate.friendlyRoutedUnits) &&
    Array.isArray(candidate.hostileRoutedUnits) &&
    Array.isArray(candidate.specialDamage)
  )
}

export function rollupAggregateBattleCampaignSummaries(
  summaries: readonly AggregateBattleCampaignSummary[]
): AggregateBattleCampaignRollup {
  return summaries.reduce<AggregateBattleCampaignRollup>(
    (rollup, summary) => ({
      battleCount: rollup.battleCount + 1,
      friendlyRoutedCount: rollup.friendlyRoutedCount + summary.friendlyRoutedUnits.length,
      hostileRoutedCount: rollup.hostileRoutedCount + summary.hostileRoutedUnits.length,
      specialDamageCount: rollup.specialDamageCount + summary.specialDamage.length,
      specialHitsTaken:
        rollup.specialHitsTaken +
        summary.specialDamage.reduce((sum, entry) => sum + entry.hitsTaken, 0),
      movementDeniedCount: rollup.movementDeniedCount + summary.movementDeniedCount,
    }),
    {
      battleCount: 0,
      friendlyRoutedCount: 0,
      hostileRoutedCount: 0,
      specialDamageCount: 0,
      specialHitsTaken: 0,
      movementDeniedCount: 0,
    }
  )
}

function normalizeAggregateBattleUnit(unit: AggregateBattleUnit): RuntimeAggregateBattleUnit {
  const profile = AGGREGATE_BATTLE_FAMILY_PROFILES[unit.family]
  const specialHitsToBreak =
    unit.specialDurability?.hitsToBreak ??
    (profile.specialHitsToBreak > 0 ? profile.specialHitsToBreak : 0)

  return {
    id: unit.id,
    label: unit.label,
    sideId: unit.sideId,
    family: unit.family,
    familyLabel: profile.label,
    aggregationScale: profile.aggregationScale,
    strengthSteps: Math.max(0, Math.trunc(unit.strengthSteps)),
    startingStrengthSteps: Math.max(0, Math.trunc(unit.strengthSteps)),
    areaId: unit.areaId,
    order: unit.order ?? 'hold',
    plannedPath: [...(unit.plannedPath ?? [])],
    meleeFactor: unit.meleeFactor,
    missileFactor: unit.missileFactor ?? 0,
    defenseFactor: unit.defenseFactor,
    morale: unit.morale,
    readiness: unit.readiness,
    occupancyWeight: Math.max(1, Math.trunc(unit.occupancyWeight ?? profile.defaultOccupancy)),
    frontage: Math.max(1, Math.trunc(unit.frontage ?? profile.defaultFrontage)),
    movement: Math.max(1, Math.trunc(unit.movement ?? profile.defaultMovement)),
    controlReach: Math.max(0, Math.trunc(unit.controlReach ?? profile.defaultControlReach)),
    controlAreaIds: unit.controlAreaIds ? [...unit.controlAreaIds] : undefined,
    moraleState: unit.moraleState ?? 'steady',
    routedRounds: Math.max(0, Math.trunc(unit.routedRounds ?? 0)),
    commanderOverlayId: unit.commanderOverlayId,
    reinforcement: unit.reinforcement
      ? {
          round: Math.max(1, Math.trunc(unit.reinforcement.round)),
          areaId: unit.reinforcement.areaId,
        }
      : undefined,
    missileCadence: profile.missileCadence,
    meleeLocksMissiles: profile.meleeLocksMissiles,
    specialDurability:
      specialHitsToBreak > 0
        ? {
            hitsToBreak: specialHitsToBreak,
            hitsTaken: Math.max(0, Math.trunc(unit.specialDurability?.hitsTaken ?? 0)),
          }
        : undefined,
    stepLosses: 0,
    roundStepLosses: 0,
    roundShock: 0,
    roundSpecialHits: 0,
    harvestedLoadout: unit.harvestedLoadout,
    missileLockoutRounds: 0,
  }
}

function buildUnitResultRow(
  unit: RuntimeAggregateBattleUnit,
  areaMap: Map<string, AggregateBattleArea>
): AggregateBattleUnitResult {
  const areaLabel = unit.areaId ? (areaMap.get(unit.areaId)?.label ?? unit.areaId) : 'Off-map'

  return {
    unitId: unit.id,
    label: unit.label,
    sideId: unit.sideId,
    family: unit.family,
    familyLabel: unit.familyLabel,
    aggregationScale: unit.aggregationScale,
    areaId: unit.areaId ?? null,
    areaLabel,
    startingStrengthSteps: unit.startingStrengthSteps,
    remainingStrengthSteps: unit.strengthSteps,
    stepLosses: unit.stepLosses,
    representedStrength: unit.strengthSteps * unit.aggregationScale,
    moraleState: unit.moraleState,
    routedRounds: unit.routedRounds,
    specialHitsTaken: unit.specialDurability?.hitsTaken ?? 0,
    specialHitsToBreak: unit.specialDurability?.hitsToBreak ?? 0,
    destroyed: isUnitDestroyed(unit),
  }
}

function resetRoundState(units: RuntimeAggregateBattleUnit[]) {
  for (const unit of units) {
    unit.roundStepLosses = 0
    unit.roundShock = 0
    unit.roundSpecialHits = 0
  }
}

function getActiveCommandOverlay(
  unit: Pick<RuntimeAggregateBattleUnit, 'areaId' | 'commanderOverlayId'>,
  overlayMap: Map<string, AggregateBattleCommandOverlay>,
  unitsById: Map<string, RuntimeAggregateBattleUnit>
) {
  if (!unit.commanderOverlayId || !unit.areaId) {
    return undefined
  }

  const overlay = overlayMap.get(unit.commanderOverlayId)
  const anchorAreaId = overlay?.anchorUnitId
    ? unitsById.get(overlay.anchorUnitId)?.areaId
    : undefined
  const activeAreaId = overlay?.anchorUnitId ? anchorAreaId : overlay?.areaId

  if (!overlay || activeAreaId !== unit.areaId) {
    return undefined
  }

  return overlay
}

function ensureReinforcementsArrive(
  round: number,
  units: RuntimeAggregateBattleUnit[],
  phaseLog: AggregateBattleLogEntry[],
  sides: AggregateBattleSideState[],
  areaMap: Map<string, AggregateBattleArea>
) {
  let anyArrival = false

  for (const unit of units) {
    if (unit.areaId || !unit.reinforcement || unit.reinforcement.round > round) {
      continue
    }

    const entryArea = areaMap.get(unit.reinforcement.areaId)
    if (!entryArea) {
      continue
    }

    const side = sides.find((currentSide) => currentSide.id === unit.sideId)
    if (!side) {
      continue
    }

    unit.areaId = unit.reinforcement.areaId
    anyArrival = true
    phaseLog.push({
      round,
      phase: 'movement',
      segment: 'reinforcement',
      unitId: unit.id,
      areaId: unit.areaId,
      detail: `${unit.label} entered from ${side.label} reserves into ${entryArea.label}.`,
    })
  }

  return anyArrival
}

function resolveMovementPhase(
  round: number,
  units: RuntimeAggregateBattleUnit[],
  sides: AggregateBattleSideState[],
  areaMap: Map<string, AggregateBattleArea>,
  movementDenials: AggregateBattleMovementDenial[],
  phaseLog: AggregateBattleLogEntry[]
) {
  const unitsById = new Map(units.map((unit) => [unit.id, unit]))

  for (const unit of units) {
    if (!unit.areaId || isUnitDestroyed(unit)) {
      continue
    }

    if (unit.moraleState === 'routed') {
      handleRoutedWithdrawal(round, unit, units, sides, areaMap, phaseLog)
      continue
    }

    if (unit.order === 'hold' || unit.order === 'rally' || unit.plannedPath.length === 0) {
      continue
    }

    let currentAreaId = unit.areaId
    const attemptedPath = normalizeMovementPath(unit, currentAreaId)
    const hostileControl = getHostileControlAreas(unit.sideId, units, areaMap)

    for (const nextAreaId of attemptedPath.slice(1, unit.movement + 1)) {
      const currentArea = areaMap.get(currentAreaId)
      const nextArea = areaMap.get(nextAreaId)
      if (!currentArea || !nextArea) {
        movementDenials.push({
          round,
          unitId: unit.id,
          attemptedPath,
          blockedAt: nextAreaId,
          reason: 'missing_area',
        })
        phaseLog.push({
          round,
          phase: 'movement',
          segment: 'movement',
          unitId: unit.id,
          areaId: currentAreaId,
          detail: `${unit.label} could not move because ${nextAreaId} is not a valid area.`,
        })
        break
      }

      if (!currentArea.adjacent.includes(nextAreaId)) {
        movementDenials.push({
          round,
          unitId: unit.id,
          attemptedPath,
          blockedAt: nextAreaId,
          reason: 'not_adjacent',
        })
        phaseLog.push({
          round,
          phase: 'movement',
          segment: 'movement',
          unitId: unit.id,
          areaId: currentAreaId,
          detail: `${unit.label} could not move from ${currentArea.label} to non-adjacent ${nextArea.label}.`,
        })
        break
      }

      const occupancyAfterMove =
        getAreaOccupancy(nextAreaId, units, unitsById, unit.id) + unit.occupancyWeight
      if (occupancyAfterMove > nextArea.occupancyCapacity) {
        movementDenials.push({
          round,
          unitId: unit.id,
          attemptedPath,
          blockedAt: nextAreaId,
          reason: 'occupancy_full',
        })
        phaseLog.push({
          round,
          phase: 'movement',
          segment: 'movement',
          unitId: unit.id,
          areaId: currentAreaId,
          detail: `${unit.label} could not enter ${nextArea.label}; occupancy ${occupancyAfterMove}/${nextArea.occupancyCapacity} would overflow.`,
        })
        break
      }

      unit.areaId = nextAreaId
      currentAreaId = nextAreaId
      phaseLog.push({
        round,
        phase: 'movement',
        segment: 'movement',
        unitId: unit.id,
        areaId: nextAreaId,
        detail: `${unit.label} moved into ${nextArea.label}.`,
      })

      if (hostileControl.has(nextAreaId)) {
        const hasFurtherSteps = attemptedPath[attemptedPath.length - 1] !== nextAreaId
        if (hasFurtherSteps) {
          movementDenials.push({
            round,
            unitId: unit.id,
            attemptedPath,
            blockedAt: nextAreaId,
            reason: 'hostile_control_chain',
          })
          phaseLog.push({
            round,
            phase: 'movement',
            segment: 'movement',
            unitId: unit.id,
            areaId: nextAreaId,
            detail: `${unit.label} was pinned in ${nextArea.label}; hostile control prevented chaining deeper through the line.`,
          })
        }

        break
      }
    }
  }
}

function resolveMissilePhase(
  round: number,
  units: RuntimeAggregateBattleUnit[],
  unitsById: Map<string, RuntimeAggregateBattleUnit>,
  input: AggregateBattleInput,
  areaMap: Map<string, AggregateBattleArea>,
  sideMap: Map<string, AggregateBattleSideState>,
  overlayMap: Map<string, AggregateBattleCommandOverlay>,
  phaseLog: AggregateBattleLogEntry[]
) {
  phaseLog.push({
    round,
    phase: 'missile',
    segment: 'ordered-resolution',
    detail: 'Missile resolution window.',
  })

  const hits: AggregateBattleHitRecord[] = []

  for (const unit of units) {
    if (
      !unit.areaId ||
      isUnitDestroyed(unit) ||
      unit.moraleState === 'routed' ||
      unit.moraleState === 'retreating' ||
      unit.missileFactor <= 0 ||
      unit.missileLockoutRounds > 0 ||
      !isMissileCadenceReady(round, unit)
    ) {
      continue
    }

    const target = selectMissileTarget(unit, units, areaMap)
    if (!target) {
      continue
    }

    const cell = lookupCombatCell(
      MISSILE_RESULT_TABLE,
      getAttackBand(
        buildMissileValue(
          unit,
          input.context,
          sideMap.get(unit.sideId),
          getActiveCommandOverlay(unit, overlayMap, unitsById)
        )
      ),
      getAttackBand(
        buildDefenseValue(
          target,
          input.context,
          sideMap.get(target.sideId),
          getActiveCommandOverlay(target, overlayMap, unitsById),
          'missile'
        )
      )
    )

    if (cell.stepHits <= 0 && cell.specialHits <= 0 && cell.moraleShock <= 0) {
      continue
    }

    hits.push({
      sourceId: unit.id,
      targetId: target.id,
      mode: 'missile',
      ...cell,
    })
  }

  applyHitRecords(round, 'missile', hits, units, phaseLog)
}

function resolveMeleePhase(
  round: number,
  units: RuntimeAggregateBattleUnit[],
  unitsById: Map<string, RuntimeAggregateBattleUnit>,
  input: AggregateBattleInput,
  areaMap: Map<string, AggregateBattleArea>,
  sideMap: Map<string, AggregateBattleSideState>,
  overlayMap: Map<string, AggregateBattleCommandOverlay>,
  phaseLog: AggregateBattleLogEntry[]
) {
  const engagementPairs = buildMeleePairs(units, areaMap)
  const hits: AggregateBattleHitRecord[] = []

  for (const pair of engagementPairs) {
    const attacker = pair.left
    const defender = pair.right

    const leftCell = lookupCombatCell(
      MELEE_RESULT_TABLE,
      getAttackBand(
        buildMeleeValue(
          attacker,
          input.context,
          sideMap.get(attacker.sideId),
          getActiveCommandOverlay(attacker, overlayMap, unitsById)
        )
      ),
      getAttackBand(
        buildDefenseValue(
          defender,
          input.context,
          sideMap.get(defender.sideId),
          getActiveCommandOverlay(defender, overlayMap, unitsById),
          'melee'
        )
      )
    )
    const rightCell = lookupCombatCell(
      MELEE_RESULT_TABLE,
      getAttackBand(
        buildMeleeValue(
          defender,
          input.context,
          sideMap.get(defender.sideId),
          getActiveCommandOverlay(defender, overlayMap, unitsById)
        )
      ),
      getAttackBand(
        buildDefenseValue(
          attacker,
          input.context,
          sideMap.get(attacker.sideId),
          getActiveCommandOverlay(attacker, overlayMap, unitsById),
          'melee'
        )
      )
    )

    hits.push({
      sourceId: attacker.id,
      targetId: defender.id,
      mode: 'melee',
      ...leftCell,
    })
    hits.push({
      sourceId: defender.id,
      targetId: attacker.id,
      mode: 'melee',
      ...rightCell,
    })

    if (attacker.meleeLocksMissiles) {
      attacker.missileLockoutRounds = Math.max(attacker.missileLockoutRounds, 1)
    }
    if (defender.meleeLocksMissiles) {
      defender.missileLockoutRounds = Math.max(defender.missileLockoutRounds, 1)
    }

    phaseLog.push({
      round,
      phase: 'melee',
      segment: 'mutual-resolution',
      unitId: attacker.id,
      targetUnitId: defender.id,
      areaId: attacker.areaId,
      detail: `${attacker.label} and ${defender.label} resolved melee simultaneously.`,
    })
  }

  applyHitRecords(round, 'melee', hits, units, phaseLog)
}

function resolveMoralePhase(
  round: number,
  units: RuntimeAggregateBattleUnit[],
  unitsById: Map<string, RuntimeAggregateBattleUnit>,
  sides: AggregateBattleSideState[],
  areaMap: Map<string, AggregateBattleArea>,
  overlayMap: Map<string, AggregateBattleCommandOverlay>,
  phaseLog: AggregateBattleLogEntry[]
) {
  for (const unit of units) {
    if (!unit.areaId || isUnitDestroyed(unit)) {
      continue
    }

    const previousState = unit.moraleState
    const hostileControl = getHostileControlAreas(unit.sideId, units, areaMap)
    const side = sides.find((currentSide) => currentSide.id === unit.sideId)
    const overlay = getActiveCommandOverlay(unit, overlayMap, unitsById)
    if (!side) {
      continue
    }

    const supportBonus =
      side.supplyState === 'secure' ? 6 : side.supplyState === 'strained' ? 0 : -6
    const authorityBonus = getAuthorityMoraleBonus(side.authority)
    const currentStatePenalty =
      unit.moraleState === 'shaken'
        ? 4
        : unit.moraleState === 'retreating'
          ? 10
          : unit.moraleState === 'routed'
            ? 18
            : 0
    const lossPenalty = unit.roundStepLosses * 14 + unit.roundSpecialHits * 16
    const shockPenalty = unit.roundShock * 6
    const controlPenalty = hostileControl.has(unit.areaId) ? 4 : 0
    const coordinationPenalty = side.coordinationFriction ? 5 : 0
    const moraleScore =
      unit.morale +
      unit.readiness / 2 +
      (overlay?.moraleBonus ?? 0) +
      supportBonus +
      authorityBonus -
      currentStatePenalty -
      lossPenalty -
      shockPenalty -
      controlPenalty -
      coordinationPenalty

    const thresholdState = getMoraleStateFromScore(moraleScore)
    if (unit.moraleState === 'routed') {
      unit.moraleState = 'routed'
    } else if (unit.moraleState === 'retreating' && thresholdState === 'steady') {
      unit.moraleState = 'shaken'
    } else {
      unit.moraleState = thresholdState
    }

    if (unit.moraleState === 'routed' && previousState !== 'routed') {
      unit.routedRounds = 0
    }

    phaseLog.push({
      round,
      phase: 'morale',
      segment: 'morale',
      unitId: unit.id,
      areaId: unit.areaId,
      detail: `${unit.label} morale scored ${Math.round(moraleScore)} and shifted ${previousState} -> ${unit.moraleState}.`,
    })
  }
}

function resolveRallyPhase(
  round: number,
  units: RuntimeAggregateBattleUnit[],
  unitsById: Map<string, RuntimeAggregateBattleUnit>,
  sides: AggregateBattleSideState[],
  areaMap: Map<string, AggregateBattleArea>,
  overlayMap: Map<string, AggregateBattleCommandOverlay>,
  phaseLog: AggregateBattleLogEntry[]
) {
  for (const unit of units) {
    if (!unit.areaId || isUnitDestroyed(unit) || unit.moraleState === 'steady') {
      continue
    }

    const side = sides.find((currentSide) => currentSide.id === unit.sideId)
    if (!side) {
      continue
    }

    const overlay = getActiveCommandOverlay(unit, overlayMap, unitsById)
    const authorityBonus = getAuthorityMoraleBonus(side.authority)
    const supportBonus =
      side.supplyState === 'secure' ? 8 : side.supplyState === 'strained' ? 2 : -4
    const controlPenalty = getHostileControlAreas(unit.sideId, units, areaMap).has(unit.areaId)
      ? 4
      : 0
    const routedPenalty = unit.routedRounds * 8
    const coordinationPenalty = side.coordinationFriction ? 4 : 0
    const rallyScore =
      unit.readiness +
      unit.morale / 2 +
      (overlay?.rallyBonus ?? 0) +
      supportBonus +
      authorityBonus -
      controlPenalty -
      routedPenalty -
      coordinationPenalty

    const previousState = unit.moraleState
    if (unit.moraleState === 'routed') {
      if (rallyScore >= 92 && unit.order === 'rally') {
        unit.moraleState = 'retreating'
      }
    } else if (unit.moraleState === 'retreating') {
      if (rallyScore >= 80) {
        unit.moraleState = 'shaken'
      }
    } else if (unit.moraleState === 'shaken') {
      if (rallyScore >= 86) {
        unit.moraleState = 'steady'
      }
    }

    phaseLog.push({
      round,
      phase: 'rally',
      segment: 'rally',
      unitId: unit.id,
      areaId: unit.areaId,
      detail: `${unit.label} rally scored ${Math.round(rallyScore)} and ${previousState === unit.moraleState ? 'held' : `improved ${previousState} -> ${unit.moraleState}`}.`,
    })
  }
}

function openPhaseWindow(
  phaseLog: AggregateBattleLogEntry[],
  round: number,
  phase: AggregateBattlePhase,
  segment: AggregateBattleLogSegment = 'phase-window'
) {
  phaseLog.push({
    round,
    phase,
    segment,
    detail: `${phase[0].toUpperCase()}${phase.slice(1)} window opened.`,
  })
}

function handleRoutedWithdrawal(
  round: number,
  unit: RuntimeAggregateBattleUnit,
  units: RuntimeAggregateBattleUnit[],
  sides: AggregateBattleSideState[],
  areaMap: Map<string, AggregateBattleArea>,
  phaseLog: AggregateBattleLogEntry[]
) {
  const side = sides.find((currentSide) => currentSide.id === unit.sideId)
  if (!side || !unit.areaId) {
    return
  }

  const fallbackAreaId = side.supportAreaId ?? side.reserveAreaId
  unit.routedRounds += 1

  if (unit.areaId === fallbackAreaId) {
    phaseLog.push({
      round,
      phase: 'movement',
      segment: 'movement',
      unitId: unit.id,
      areaId: unit.areaId,
      detail: `${unit.label} stayed routed in fallback position.`,
    })
    return
  }

  const path = findShortestPath(unit.areaId, fallbackAreaId, areaMap)
  if (path.length >= 2) {
    const nextAreaId = path[1]
    const nextArea = areaMap.get(nextAreaId)
    const occupancyAfterMove = getAreaOccupancy(nextAreaId, units) + unit.occupancyWeight
    if (nextArea && occupancyAfterMove <= nextArea.occupancyCapacity) {
      unit.areaId = nextAreaId
      phaseLog.push({
        round,
        phase: 'movement',
        segment: 'movement',
        unitId: unit.id,
        areaId: nextAreaId,
        detail: `${unit.label} fell back while routed into ${nextArea.label}.`,
      })
      return
    }
  }

  phaseLog.push({
    round,
    phase: 'movement',
    segment: 'movement',
    unitId: unit.id,
    areaId: unit.areaId,
    detail: `${unit.label} remained routed with no clean withdrawal lane.`,
  })
}

function normalizeMovementPath(unit: RuntimeAggregateBattleUnit, areaId: string) {
  if (unit.plannedPath.length === 0) {
    return [areaId]
  }

  return unit.plannedPath[0] === areaId ? [...unit.plannedPath] : [areaId, ...unit.plannedPath]
}

function getAreaOccupancy(
  areaId: string,
  units: RuntimeAggregateBattleUnit[],
  unitsById?: Map<string, RuntimeAggregateBattleUnit>,
  movingUnitId?: string
) {
  const entries = unitsById ? Array.from(unitsById.values()) : units

  return entries.reduce((sum, currentUnit) => {
    if (movingUnitId && currentUnit.id === movingUnitId) {
      return sum
    }

    if (currentUnit.areaId !== areaId || isUnitDestroyed(currentUnit)) {
      return sum
    }

    return sum + currentUnit.occupancyWeight
  }, 0)
}

function getHostileControlAreas(
  sideId: string,
  units: RuntimeAggregateBattleUnit[],
  areaMap: Map<string, AggregateBattleArea>
) {
  const controlled = new Set<string>()

  for (const unit of units) {
    if (
      unit.sideId === sideId ||
      !unit.areaId ||
      isUnitDestroyed(unit) ||
      unit.moraleState === 'routed'
    ) {
      continue
    }

    controlled.add(unit.areaId)

    if (unit.controlAreaIds && unit.controlAreaIds.length > 0) {
      for (const controlledAreaId of unit.controlAreaIds) {
        controlled.add(controlledAreaId)
      }
      continue
    }

    const area = areaMap.get(unit.areaId)
    if (!area || unit.controlReach <= 0) {
      continue
    }

    for (const adjacentAreaId of area.adjacent) {
      controlled.add(adjacentAreaId)
    }
  }

  return controlled
}

function selectMissileTarget(
  unit: RuntimeAggregateBattleUnit,
  units: RuntimeAggregateBattleUnit[],
  areaMap: Map<string, AggregateBattleArea>
) {
  if (!unit.areaId) {
    return undefined
  }

  const area = areaMap.get(unit.areaId)
  const adjacent = new Set(area?.adjacent ?? [])

  return units
    .filter((target) => {
      if (target.sideId === unit.sideId || !target.areaId || isUnitDestroyed(target)) {
        return false
      }

      return target.areaId === unit.areaId || adjacent.has(target.areaId)
    })
    .sort((left, right) => {
      return (
        Number(right.areaId === unit.areaId) - Number(left.areaId === unit.areaId) ||
        right.strengthSteps - left.strengthSteps ||
        left.id.localeCompare(right.id)
      )
    })
    .at(0)
}

function buildMeleePairs(
  units: RuntimeAggregateBattleUnit[],
  areaMap: Map<string, AggregateBattleArea>
) {
  const engagedIds = new Set<string>()
  const frontageByArea = new Map<string, number>()
  const pairs: Array<{ left: RuntimeAggregateBattleUnit; right: RuntimeAggregateBattleUnit }> = []

  for (const unit of units) {
    if (
      engagedIds.has(unit.id) ||
      !unit.areaId ||
      isUnitDestroyed(unit) ||
      unit.moraleState === 'routed' ||
      unit.moraleState === 'retreating'
    ) {
      continue
    }

    const target = units
      .filter((candidate) => {
        if (
          engagedIds.has(candidate.id) ||
          candidate.sideId === unit.sideId ||
          !candidate.areaId ||
          isUnitDestroyed(candidate) ||
          candidate.moraleState === 'routed' ||
          candidate.moraleState === 'retreating'
        ) {
          return false
        }

        return (
          candidate.areaId === unit.areaId ||
          areaMap.get(unit.areaId ?? '')?.adjacent.includes(candidate.areaId ?? '')
        )
      })
      .sort((left, right) => {
        return (
          Number(right.areaId === unit.areaId) - Number(left.areaId === unit.areaId) ||
          right.strengthSteps - left.strengthSteps ||
          left.id.localeCompare(right.id)
        )
      })
      .at(0)

    if (!target) {
      continue
    }

    if (!hasAvailableFrontage(unit.areaId, unit.frontage, frontageByArea, areaMap)) {
      continue
    }

    if (!hasAvailableFrontage(target.areaId, target.frontage, frontageByArea, areaMap)) {
      continue
    }

    reserveFrontage(unit.areaId, unit.frontage, frontageByArea)
    reserveFrontage(target.areaId, target.frontage, frontageByArea)
    engagedIds.add(unit.id)
    engagedIds.add(target.id)
    pairs.push({ left: unit, right: target })
  }

  return pairs
}

function hasAvailableFrontage(
  areaId: string | undefined,
  frontage: number,
  frontageByArea: Map<string, number>,
  areaMap: Map<string, AggregateBattleArea>
) {
  if (!areaId) {
    return false
  }

  const area = areaMap.get(areaId)
  if (!area || area.frontageCapacity <= 0) {
    return false
  }

  return (frontageByArea.get(areaId) ?? 0) + frontage <= area.frontageCapacity
}

function reserveFrontage(
  areaId: string | undefined,
  frontage: number,
  frontageByArea: Map<string, number>
) {
  if (!areaId) {
    return
  }

  frontageByArea.set(areaId, (frontageByArea.get(areaId) ?? 0) + frontage)
}

function applyHitRecords(
  round: number,
  phase: 'missile' | 'melee',
  hits: AggregateBattleHitRecord[],
  units: RuntimeAggregateBattleUnit[],
  phaseLog: AggregateBattleLogEntry[]
) {
  const byId = new Map(units.map((unit) => [unit.id, unit]))
  const mergedHits = new Map<string, CombatTableCell & { sources: string[] }>()

  for (const hit of hits) {
    const entry = mergedHits.get(hit.targetId) ?? {
      stepHits: 0,
      moraleShock: 0,
      specialHits: 0,
      sources: [],
    }
    entry.stepHits += hit.stepHits
    entry.moraleShock += hit.moraleShock
    entry.specialHits += hit.specialHits
    entry.sources.push(hit.sourceId)
    mergedHits.set(hit.targetId, entry)
  }

  for (const [targetId, aggregate] of mergedHits.entries()) {
    const target = byId.get(targetId)
    if (!target || isUnitDestroyed(target)) {
      continue
    }

    let detail = `${target.label} absorbed ${aggregate.stepHits} step hit(s) and ${aggregate.specialHits} special hit(s).`
    if (target.specialDurability) {
      const appliedHits =
        aggregate.specialHits > 0 ? aggregate.specialHits : aggregate.stepHits > 0 ? 1 : 0
      target.specialDurability.hitsTaken = Math.min(
        target.specialDurability.hitsToBreak,
        target.specialDurability.hitsTaken + appliedHits
      )
      target.roundSpecialHits += appliedHits
      target.roundShock += aggregate.moraleShock + Math.max(0, appliedHits)

      if (target.specialDurability.hitsTaken >= target.specialDurability.hitsToBreak) {
        target.stepLosses += target.strengthSteps
        target.roundStepLosses += target.strengthSteps
        target.strengthSteps = 0
        detail = `${target.label} broke after ${target.specialDurability.hitsTaken}/${target.specialDurability.hitsToBreak} durability hits.`
      } else {
        detail = `${target.label} held after ${target.specialDurability.hitsTaken}/${target.specialDurability.hitsToBreak} durability hits.`
      }
    } else {
      const appliedStepLosses = Math.min(target.strengthSteps, aggregate.stepHits)
      target.strengthSteps -= appliedStepLosses
      target.stepLosses += appliedStepLosses
      target.roundStepLosses += appliedStepLosses
      target.roundShock += aggregate.moraleShock + appliedStepLosses
      detail = `${target.label} lost ${appliedStepLosses} step(s) under ${phase} fire.`
    }

    phaseLog.push({
      round,
      phase,
      segment: 'combat',
      unitId: target.id,
      areaId: target.areaId,
      detail,
    })
  }
}

function buildMissileValue(
  unit: RuntimeAggregateBattleUnit,
  context: AggregateBattleContext,
  side: AggregateBattleSideState | undefined,
  overlay: AggregateBattleCommandOverlay | undefined
) {
  let value = unit.missileFactor + (overlay?.attackBonus ?? 0)
  if (side?.coordinationFriction) {
    value -= 1
  }
  if (side?.supplyState === 'cut') {
    value -= 1
  }
  if (context.visibilityState === 'obstructed') {
    value -= 1
  } else if (context.visibilityState === 'exposed') {
    value += 1
  }
  if (unit.moraleState === 'shaken') {
    value -= 1
  }

  return clamp(Math.round(value), 0, 12)
}

// Traversal modifiers keyed by the ingress spatial flag (ingress:<type>) emitted by the
// site-generation pipeline. These represent how entry method shapes combat conditions.
// attackMeleeMod    — applied to the attacker's melee attack value
// defenseVsMeleeMod — applied to the defender's defense value for melee
// defenseVsMissileMod — applied to the defender's defense value for missile
interface IngressCombatModifier {
  attackMeleeMod: number
  defenseVsMeleeMod: number
  defenseVsMissileMod: number
}

const INGRESS_COMBAT_MODIFIERS: Readonly<Record<string, IngressCombatModifier>> = {
  // Reinforced flood-gate channel; defender holds position more effectively
  'ingress:floodgate': { attackMeleeMod: 0, defenseVsMeleeMod: 1, defenseVsMissileMod: 0 },
  // Tight maintenance shaft; attacker cannot bring full force, missile angles blocked
  'ingress:maintenance_shaft': { attackMeleeMod: -1, defenseVsMeleeMod: 0, defenseVsMissileMod: 1 },
  // Standard service door; no special modifier
  'ingress:service_door': { attackMeleeMod: 0, defenseVsMeleeMod: 0, defenseVsMissileMod: 0 },
  // Covert storm drain tunnel; attacker restricted, overhead missile angles poor
  'ingress:storm_drain': { attackMeleeMod: -1, defenseVsMeleeMod: 0, defenseVsMissileMod: 1 },
}

function buildMeleeValue(
  unit: RuntimeAggregateBattleUnit,
  context: AggregateBattleContext,
  side: AggregateBattleSideState | undefined,
  overlay: AggregateBattleCommandOverlay | undefined
) {
  const ingressFlag = context.spatialFlags.find((f) => f.startsWith('ingress:'))
  let value = unit.meleeFactor + (overlay?.attackBonus ?? 0)
  if (side?.coordinationFriction) {
    value -= 1
  }
  if (context.transitionType === 'chokepoint') {
    value += 1
  }
  if (ingressFlag) {
    // Ingress traversal penalty applies only to the invading side — institutional defenders
    // are already inside the site and do not traverse the ingress point when counter-attacking.
    // When defenderSideId is unset, fall back to applying the modifier to all units (existing
    // behavior is preserved and the existing tests without defenderSideId still pass).
    const isExplicitInstitutionalDefender =
      context.defenderSideId !== undefined && unit.sideId === context.defenderSideId
    if (!isExplicitInstitutionalDefender) {
      value += INGRESS_COMBAT_MODIFIERS[ingressFlag]?.attackMeleeMod ?? 0
    }
  }
  // SPE-110: Incomplete construction site creates chaotic close-quarters fighting (+1 melee)
  if (context.spatialFlags.includes('construction.incomplete')) {
    value += 1
  }
  if (unit.harvestedLoadout) {
    value += aggregateLoadoutModifiers(unit.harvestedLoadout).meleeMod
  }
  if (unit.moraleState === 'shaken') {
    value -= 1
  }

  return clamp(Math.round(value), 0, 12)
}

function buildDefenseValue(
  unit: RuntimeAggregateBattleUnit,
  context: AggregateBattleContext,
  side: AggregateBattleSideState | undefined,
  overlay: AggregateBattleCommandOverlay | undefined,
  mode: 'missile' | 'melee'
) {
  const ingressFlag = context.spatialFlags.find((f) => f.startsWith('ingress:'))
  let value = unit.defenseFactor + (overlay?.defenseBonus ?? 0)
  if (side?.supplyState === 'secure') {
    value += 1
  }
  if (mode === 'missile' && context.siteLayer === 'interior') {
    value += 1
  }
  if (mode === 'melee' && context.transitionType === 'chokepoint') {
    value += 1
  }
  if (ingressFlag) {
    const ingressMod = INGRESS_COMBAT_MODIFIERS[ingressFlag]
    if (ingressMod) {
      value += mode === 'melee' ? ingressMod.defenseVsMeleeMod : ingressMod.defenseVsMissileMod
    }
  }
  // SPE-110: Incomplete construction site weakens defender positions (-1 defense, all modes).
  // Only applies to the institutional defender side (the side that controls the site).
  // Uses a loose check: when defenderSideId is unset (legacy callers) the penalty applies
  // to all units, preserving the original SPE-110 symmetric behavior.
  const isInstitutionalDefender =
    !context.defenderSideId || unit.sideId === context.defenderSideId
  if (context.spatialFlags.includes('construction.incomplete') && isInstitutionalDefender) {
    value -= 1
  }
  // SPE-451: Restricted/locked cross-scale anchors give institutional defenders inherent
  // advantage — they control these chokepoints between scale boundaries.
  // Uses a strict check: defenderSideId must be explicitly set. When absent we cannot
  // identify who holds the site, so no bonus is granted rather than granting it to everyone.
  const isExplicitInstitutionalDefender =
    context.defenderSideId !== undefined && unit.sideId === context.defenderSideId
  const restrictedAnchorCount = context.mapLayer
    ? getRestrictedScaleAnchors(context.mapLayer).length
    : 0
  if (restrictedAnchorCount > 0 && isExplicitInstitutionalDefender) {
    value += restrictedAnchorCount
  }
  if (unit.harvestedLoadout) {
    value += aggregateLoadoutModifiers(unit.harvestedLoadout).defenseMod
  }
  if (unit.moraleState === 'retreating') {
    value -= 1
  } else if (unit.moraleState === 'routed') {
    value -= 2
  }

  return clamp(Math.round(value), 0, 12)
}

function getAttackBand(value: number) {
  if (value <= 2) return 0
  if (value <= 4) return 1
  if (value <= 6) return 2
  if (value <= 8) return 3
  return 4
}

function lookupCombatCell(
  table: readonly (readonly CombatTableCell[])[],
  attackBand: number,
  defenseBand: number
) {
  return (
    table[clamp(attackBand, 0, table.length - 1)]?.[clamp(defenseBand, 0, table[0].length - 1)] ??
    ZERO_TABLE_CELL
  )
}

function getMoraleStateFromScore(score: number): AggregateBattleMoraleState {
  if (score >= 80) return 'steady'
  if (score >= 60) return 'shaken'
  if (score >= 42) return 'retreating'
  return 'routed'
}

function getAuthorityMoraleBonus(authority: LegitimacyState['sanctionLevel']) {
  if (authority === 'sanctioned') return 2
  if (authority === 'covert') return 0
  if (authority === 'tolerated') return -1
  return -2
}

function isMissileCadenceReady(round: number, unit: RuntimeAggregateBattleUnit) {
  return unit.missileCadence <= 1 || (round - 1) % unit.missileCadence === 0
}

function battleHasDecisiveState(
  units: RuntimeAggregateBattleUnit[],
  sides: AggregateBattleSideState[]
) {
  const activeBySide = new Map<string, number>()

  for (const side of sides) {
    activeBySide.set(side.id, 0)
  }

  for (const unit of units) {
    if (!unit.areaId || isUnitDestroyed(unit) || unit.moraleState === 'routed') {
      continue
    }

    activeBySide.set(unit.sideId, (activeBySide.get(unit.sideId) ?? 0) + unit.strengthSteps)
  }

  return [...activeBySide.values()].filter((value) => value > 0).length <= 1
}

function computeAreaController(
  areaId: string,
  units: RuntimeAggregateBattleUnit[],
  sides: AggregateBattleSideState[]
) {
  const activeSides = new Set(
    units
      .filter(
        (unit) =>
          unit.areaId === areaId &&
          !isUnitDestroyed(unit) &&
          unit.moraleState !== 'routed' &&
          unit.moraleState !== 'retreating'
      )
      .map((unit) => unit.sideId)
  )

  if (activeSides.size !== 1) {
    return null
  }

  const [controller] = [...activeSides]
  return sides.some((side) => side.id === controller) ? controller : null
}

function resolveWinningSide(
  units: RuntimeAggregateBattleUnit[],
  sides: AggregateBattleSideState[],
  controlByArea: Record<string, string | null>
) {
  const scoreBySide = new Map<string, number>(sides.map((side) => [side.id, 0]))

  for (const unit of units) {
    const score =
      unit.strengthSteps * unit.aggregationScale -
      (unit.moraleState === 'routed' ? 20 : unit.moraleState === 'retreating' ? 10 : 0)
    scoreBySide.set(unit.sideId, (scoreBySide.get(unit.sideId) ?? 0) + score)
  }

  for (const controller of Object.values(controlByArea)) {
    if (!controller) {
      continue
    }

    scoreBySide.set(controller, (scoreBySide.get(controller) ?? 0) + 20)
  }

  const ranked = [...scoreBySide.entries()].sort((left, right) => right[1] - left[1])
  if (ranked.length < 2 || ranked[0][1] === ranked[1][1]) {
    return ranked[0]?.[0] ?? null
  }

  return ranked[0][0]
}

function isUnitDestroyed(unit: RuntimeAggregateBattleUnit) {
  return unit.strengthSteps <= 0
}

function findShortestPath(
  startAreaId: string,
  targetAreaId: string,
  areaMap: Map<string, AggregateBattleArea>
) {
  if (startAreaId === targetAreaId) {
    return [startAreaId]
  }

  const queue: Array<{ areaId: string; path: string[] }> = [
    { areaId: startAreaId, path: [startAreaId] },
  ]
  const visited = new Set<string>([startAreaId])

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) {
      continue
    }

    const area = areaMap.get(current.areaId)
    if (!area) {
      continue
    }

    for (const adjacentAreaId of area.adjacent) {
      if (visited.has(adjacentAreaId)) {
        continue
      }

      const nextPath = [...current.path, adjacentAreaId]
      if (adjacentAreaId === targetAreaId) {
        return nextPath
      }

      visited.add(adjacentAreaId)
      queue.push({ areaId: adjacentAreaId, path: nextPath })
    }
  }

  return [startAreaId]
}

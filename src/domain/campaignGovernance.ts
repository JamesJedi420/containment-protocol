import type { AnyOperationEventDraft } from './events'
import { clamp } from './math'
import type { CaseInstance, GameState } from './models'
import { getSupplyTraceForRegion } from './supplyNetwork'

export const GOVERNANCE_TURN_PHASE_ORDER = [
  'event_intake',
  'resource_intake',
  'maintenance',
  'actions',
  'war_occupation',
  'fortification',
] as const

export type GovernanceTurnPhase = (typeof GOVERNANCE_TURN_PHASE_ORDER)[number]
export type GovernanceTurnStatus = GovernanceTurnPhase | 'complete'
export type CampaignPrimacy = 'city_state' | 'directorate'
export type CampaignCourtMode = 'fixed_court' | 'mobile_court'
export type GovernanceActionType = 'deploy' | 'fortify' | 'negotiate' | 'stabilize' | 'hold'
export type GovernanceSupplyState = 'supported' | 'unsupported'

export interface GovernanceRegionWarState {
  active: boolean
  fronts: number
  pressure: number
}

export interface GovernanceRegionOccupationState {
  active: boolean
  occupier: string | null
  crackdown: number
  unrest: number
}

export interface GovernanceRegionFortificationState {
  strongpointId: string
  level: number
  integrity: number
  siegePressure: number
  erosion: number
}

export interface GovernanceRegionState {
  regionId: string
  label: string
  controller: string
  authority: number
  fundingContribution: number
  upkeepCost: number
  supplyState: GovernanceSupplyState
  war: GovernanceRegionWarState
  occupation: GovernanceRegionOccupationState
  fortification: GovernanceRegionFortificationState
  lastAction: GovernanceActionType
}

export interface GovernanceResourceChannels {
  authorityIncome: number
  capitalAuthorityModifier: number
  authorityWarDrain: number
  authorityOccupationDrain: number
  authorityCrackdownDrain: number
  authorityActionCost: number
  authorityNet: number
  regionalFundingIncome: number
  capitalFundingModifier: number
  upkeepCost: number
  actionCost: number
  siegeCost: number
  courtRelocationCost: number
  fundingNet: number
}

export interface GovernanceActionRecord {
  regionId: string
  regionLabel: string
  action: GovernanceActionType
  authorityDelta: number
  fundingDelta: number
  fortificationDelta: number
  unrestDelta: number
  summary: string
}

export interface CampaignGovernanceReportSnapshot {
  week: number
  phaseOrder: GovernanceTurnPhase[]
  completedPhases: GovernanceTurnPhase[]
  primacy: CampaignPrimacy
  courtMode: CampaignCourtMode
  courtRegionId?: string
  authorityBefore: number
  authorityAfter: number
  totalUpkeep: number
  atWarRegions: number
  occupiedRegions: number
  underSiegeRegions: number
  contestedRegions: number
  channels: GovernanceResourceChannels
  actions: GovernanceActionRecord[]
  regionStates: GovernanceRegionState[]
  summary: string
}

export interface CampaignGovernanceState {
  phase: GovernanceTurnStatus
  phaseOrder: GovernanceTurnPhase[]
  completedPhases: GovernanceTurnPhase[]
  primacy: CampaignPrimacy
  courtMode: CampaignCourtMode
  courtRegionId?: string
  authority: number
  regions: Record<string, GovernanceRegionState>
  lastTurn?: CampaignGovernanceReportSnapshot
}

export interface CampaignGovernanceSummary {
  authority: number
  phase: GovernanceTurnStatus
  primacy: CampaignPrimacy
  courtMode: CampaignCourtMode
  courtRegionId?: string
  totalUpkeep: number
  fundingNet: number
  atWarRegions: number
  occupiedRegions: number
  underSiegeRegions: number
  contestedRegions: number
  averageFortificationIntegrity: number
  actionCount: number
  summary: string
}

export interface CampaignGovernanceTurnOutcome {
  governance: CampaignGovernanceState
  report: CampaignGovernanceReportSnapshot
  eventDrafts: AnyOperationEventDraft[]
}

type GovernanceRegionMetrics = {
  currentCaseCount: number
  currentMaxStage: number
  unresolvedCount: number
  supplyState: GovernanceSupplyState
  hostileControl: boolean
  contestedControl: boolean
}

type GovernanceCourtProfile = {
  courtMode: CampaignCourtMode
  courtRegionId?: string
  capitalAuthorityModifier: number
  capitalFundingModifier: number
  courtRelocationCost: number
}

const EMPTY_CAMPAIGN_GOVERNANCE_SUMMARY: CampaignGovernanceSummary = {
  authority: 0,
  phase: 'complete',
  primacy: 'city_state',
  courtMode: 'fixed_court',
  totalUpkeep: 0,
  fundingNet: 0,
  atWarRegions: 0,
  occupiedRegions: 0,
  underSiegeRegions: 0,
  contestedRegions: 0,
  averageFortificationIntegrity: 0,
  actionCount: 0,
  summary: 'No governance turn has been logged.',
}

function toTitleCase(value: string) {
  return value
    .split('_')
    .filter((entry) => entry.length > 0)
    .map((entry) => entry.charAt(0).toUpperCase() + entry.slice(1))
    .join(' ')
}

function sortStrings(values: Iterable<string>) {
  return [...values].sort((left, right) => left.localeCompare(right))
}

function collectRegionIds(game: Pick<GameState, 'cases' | 'regionalState' | 'supplyNetwork'>) {
  const fromRegionalState = game.regionalState?.regions ?? []
  const fromCases = Object.values(game.cases)
    .map((currentCase) => currentCase.regionTag)
    .filter((regionId): regionId is string => typeof regionId === 'string' && regionId.length > 0)
  const fromSupplyNodes = (game.supplyNetwork?.nodes ?? [])
    .flatMap((node) => node.regionTags)
    .filter((regionId) => regionId !== 'global')

  const regionIds = sortStrings(new Set([...fromRegionalState, ...fromCases, ...fromSupplyNodes]))

  return regionIds.length > 0 ? regionIds : ['bio_containment', 'occult_district', 'perimeter_sector']
}

function buildInitialRegionState(
  game: Pick<GameState, 'regionalState'>,
  regionId: string
): GovernanceRegionState {
  const controller = game.regionalState?.control[regionId] ?? 'agency'

  return {
    regionId,
    label: toTitleCase(regionId),
    controller,
    authority: controller === 'agency' ? 8 : controller === 'hostile' ? 3 : 5,
    fundingContribution: controller === 'agency' ? 5 : controller === 'hostile' ? 1 : 3,
    upkeepCost: 3,
    supplyState: 'supported',
    war: {
      active: false,
      fronts: 0,
      pressure: 0,
    },
    occupation: {
      active: controller !== 'agency',
      occupier: controller !== 'agency' ? controller : null,
      crackdown: controller === 'hostile' ? 1 : 0,
      unrest: controller === 'hostile' ? 1 : 0,
    },
    fortification: {
      strongpointId: `strongpoint-${regionId}`,
      level: controller === 'agency' ? 2 : 1,
      integrity: controller === 'agency' ? 80 : 62,
      siegePressure: 0,
      erosion: 0,
    },
    lastAction: 'hold',
  }
}

function cloneRegionState(region: GovernanceRegionState): GovernanceRegionState {
  return {
    ...region,
    war: { ...region.war },
    occupation: { ...region.occupation },
    fortification: { ...region.fortification },
  }
}

function normalizeCampaignGovernanceState(
  governance: CampaignGovernanceState | undefined,
  game: Pick<GameState, 'agency' | 'cases' | 'regionalState' | 'supplyNetwork'>
): CampaignGovernanceState {
  const regionIds = collectRegionIds(game)
  const regions = Object.fromEntries(
    regionIds.map((regionId) => {
      const existing = governance?.regions[regionId]

      return [regionId, existing ? cloneRegionState(existing) : buildInitialRegionState(game, regionId)]
    })
  )

  return {
    phase: governance?.phase ?? 'complete',
    phaseOrder: [...(governance?.phaseOrder ?? GOVERNANCE_TURN_PHASE_ORDER)],
    completedPhases: [...(governance?.completedPhases ?? [])],
    primacy: governance?.primacy ?? 'city_state',
    courtMode: governance?.courtMode ?? 'fixed_court',
    courtRegionId:
      governance?.courtRegionId ??
      regionIds.find((regionId) => regions[regionId]?.controller === 'agency') ??
      regionIds[0],
    authority:
      typeof governance?.authority === 'number'
        ? governance.authority
        : Math.max(0, Math.trunc(game.agency?.authority ?? 44)),
    regions,
    ...(governance?.lastTurn ? { lastTurn: governance.lastTurn } : {}),
  }
}

function summarizeCasePressure(cases: CaseInstance[]) {
  const unresolvedCases = cases.filter((currentCase) => currentCase.status !== 'resolved')

  return {
    currentCaseCount: unresolvedCases.length,
    currentMaxStage: unresolvedCases.reduce(
      (maxStage, currentCase) => Math.max(maxStage, currentCase.stage),
      0
    ),
    unresolvedCount: unresolvedCases.length,
  }
}

function buildRegionMetrics(
  game: Pick<GameState, 'cases' | 'regionalState' | 'supplyNetwork'>,
  region: GovernanceRegionState
): GovernanceRegionMetrics {
  const regionCases = Object.values(game.cases).filter((currentCase) => currentCase.regionTag === region.regionId)
  const casePressure = summarizeCasePressure(regionCases)
  const supplyTrace = getSupplyTraceForRegion(game.supplyNetwork, region.regionId)
  const controller = game.regionalState?.control[region.regionId] ?? region.controller

  return {
    ...casePressure,
    supplyState: supplyTrace?.state === 'supported' ? 'supported' : 'unsupported',
    hostileControl: controller === 'hostile',
    contestedControl: controller === 'contested',
  }
}

function chooseAction(
  region: GovernanceRegionState,
  metrics: GovernanceRegionMetrics,
  availableAuthority: number,
  availableFunding: number
) {
  if (region.occupation.active && region.occupation.unrest >= 2 && availableAuthority >= 2) {
    return {
      action: 'negotiate' as const,
      authorityDelta: -2,
      fundingDelta: -1,
      fortificationDelta: 0,
      unrestDelta: -1,
      summary: `${region.label}: negotiation lowered occupation pressure.`,
    }
  }

  if (
    (metrics.currentMaxStage >= 3 || region.fortification.integrity <= 70 || region.war.active) &&
    availableAuthority >= 1 &&
    availableFunding >= 3
  ) {
    return {
      action: 'fortify' as const,
      authorityDelta: -1,
      fundingDelta: -3,
      fortificationDelta: 12,
      unrestDelta: 0,
      summary: `${region.label}: fortification crews restored the strongpoint line.`,
    }
  }

  if ((metrics.hostileControl || metrics.currentCaseCount >= 2) && availableAuthority >= 3 && availableFunding >= 2) {
    return {
      action: 'deploy' as const,
      authorityDelta: -3,
      fundingDelta: -2,
      fortificationDelta: 4,
      unrestDelta: 0,
      summary: `${region.label}: command deployed a stabilisation column.`,
    }
  }

  if (region.occupation.unrest > 0 && availableAuthority >= 1) {
    return {
      action: 'stabilize' as const,
      authorityDelta: -1,
      fundingDelta: 0,
      fortificationDelta: 0,
      unrestDelta: -1,
      summary: `${region.label}: civic stabilisation reduced unrest.`,
    }
  }

  return {
    action: 'hold' as const,
    authorityDelta: 0,
    fundingDelta: 0,
    fortificationDelta: 0,
    unrestDelta: 0,
    summary: `${region.label}: command held its current posture.`,
  }
}

function summarizeCampaignGovernanceTurn(report: CampaignGovernanceReportSnapshot) {
  return (
    `Authority ${report.authorityBefore} -> ${report.authorityAfter}. ` +
    `Funding net ${report.channels.fundingNet >= 0 ? '+' : ''}${report.channels.fundingNet}. ` +
    `Upkeep ${report.totalUpkeep}. ` +
    `War ${report.atWarRegions}, occupation ${report.occupiedRegions}, siege ${report.underSiegeRegions}. ` +
    `Primacy ${toTitleCase(report.primacy)} / Court ${toTitleCase(report.courtMode)}` +
    `${report.courtRegionId ? ` at ${toTitleCase(report.courtRegionId)}` : ''}.`
  )
}

function buildCourtRegionId(regions: GovernanceRegionState[], previousCourtRegionId: string | undefined) {
  const preferredAgencyRegion = [...regions]
    .filter((region) => region.controller === 'agency')
    .sort((left, right) => {
      return (
        right.authority - left.authority ||
        right.fortification.integrity - left.fortification.integrity ||
        left.regionId.localeCompare(right.regionId)
      )
    })[0]

  return preferredAgencyRegion?.regionId ?? previousCourtRegionId ?? regions[0]?.regionId
}

function findRegionById(regions: GovernanceRegionState[], regionId: string | undefined) {
  return regionId ? regions.find((region) => region.regionId === regionId) : undefined
}

function isStableCourtSeat(
  region: GovernanceRegionState | undefined,
  metrics: GovernanceRegionMetrics | undefined
) {
  return Boolean(
    region &&
      metrics &&
      metrics.supplyState === 'supported' &&
      !metrics.hostileControl &&
      !metrics.contestedControl &&
      !region.war.active &&
      !region.occupation.active &&
      region.fortification.integrity >= 40 &&
      region.fortification.siegePressure < 20
  )
}

function buildCourtProfile(
  governance: CampaignGovernanceState,
  regions: GovernanceRegionState[],
  metricsByRegion: Map<string, GovernanceRegionMetrics>
): GovernanceCourtProfile {
  const anchoredCourtRegionId =
    findRegionById(regions, governance.courtRegionId)?.regionId ??
    buildCourtRegionId(regions, governance.courtRegionId)
  const anchoredCourtRegion = findRegionById(regions, anchoredCourtRegionId)
  const anchoredCourtMetrics = anchoredCourtRegion
    ? metricsByRegion.get(anchoredCourtRegion.regionId)
    : undefined
  const anchoredCourtStable = isStableCourtSeat(anchoredCourtRegion, anchoredCourtMetrics)
  const unstableRegionCount = regions.filter((region) => {
    const metrics = metricsByRegion.get(region.regionId)

    return (
      metrics?.hostileControl === true ||
      metrics?.contestedControl === true ||
      metrics?.supplyState === 'unsupported' ||
      region.war.active ||
      region.occupation.active ||
      region.fortification.siegePressure >= 20
    )
  }).length
  const shouldMobilize =
    !anchoredCourtStable ||
    unstableRegionCount >= Math.max(1, Math.ceil(Math.max(regions.length, 1) / 2))
  const stableCourtRegions = regions.filter((region) =>
    isStableCourtSeat(region, metricsByRegion.get(region.regionId))
  )
  const fallbackCourtRegions = regions.filter((region) => {
    const metrics = metricsByRegion.get(region.regionId)

    return metrics?.hostileControl !== true && metrics?.contestedControl !== true
  })
  const mobileCourtRegionId = buildCourtRegionId(
    stableCourtRegions.length > 0
      ? stableCourtRegions
      : fallbackCourtRegions.length > 0
        ? fallbackCourtRegions
        : regions,
    anchoredCourtRegionId
  )
  const courtMode: CampaignCourtMode = shouldMobilize ? 'mobile_court' : 'fixed_court'
  const courtRegionId = courtMode === 'mobile_court' ? mobileCourtRegionId : anchoredCourtRegionId
  const effectiveCourtRegion = findRegionById(regions, courtRegionId)
  const effectiveCourtMetrics = effectiveCourtRegion
    ? metricsByRegion.get(effectiveCourtRegion.regionId)
    : undefined
  const effectiveCourtStable = isStableCourtSeat(effectiveCourtRegion, effectiveCourtMetrics)

  let capitalAuthorityModifier = 0
  let capitalFundingModifier = 0

  if (governance.primacy === 'city_state') {
    if (effectiveCourtStable) {
      capitalAuthorityModifier = courtMode === 'fixed_court' ? 2 : 1
      capitalFundingModifier = courtMode === 'fixed_court' ? 3 : 1
    } else if (courtMode === 'mobile_court') {
      capitalAuthorityModifier = -1
      capitalFundingModifier = -1
    } else {
      capitalAuthorityModifier = -3
      capitalFundingModifier = -4
    }
  }

  const courtRelocationCost =
    courtMode === 'mobile_court' &&
    anchoredCourtRegionId !== undefined &&
    courtRegionId !== undefined &&
    courtRegionId !== anchoredCourtRegionId
      ? 2
      : 0

  return {
    courtMode,
    ...(courtRegionId ? { courtRegionId } : {}),
    capitalAuthorityModifier,
    capitalFundingModifier,
    courtRelocationCost,
  }
}

export function buildCampaignGovernanceSummary(
  governance: CampaignGovernanceState | undefined
): CampaignGovernanceSummary {
  if (!governance) {
    return EMPTY_CAMPAIGN_GOVERNANCE_SUMMARY
  }

  const lastTurn = governance.lastTurn
  const regionStates = sortCampaignGovernanceRegionStates(governance.regions)
  const averageFortificationIntegrity =
    regionStates.length > 0
      ? Math.round(
          regionStates.reduce((sum, region) => sum + region.fortification.integrity, 0) /
            regionStates.length
        )
      : 0

  return {
    authority: governance.authority,
    phase: governance.phase,
    primacy: governance.primacy,
    courtMode: governance.courtMode,
    ...(governance.courtRegionId ? { courtRegionId: governance.courtRegionId } : {}),
    totalUpkeep: lastTurn?.totalUpkeep ?? 0,
    fundingNet: lastTurn?.channels.fundingNet ?? 0,
    atWarRegions: lastTurn?.atWarRegions ?? regionStates.filter((region) => region.war.active).length,
    occupiedRegions:
      lastTurn?.occupiedRegions ?? regionStates.filter((region) => region.occupation.active).length,
    underSiegeRegions:
      lastTurn?.underSiegeRegions ??
      regionStates.filter((region) => region.fortification.siegePressure >= 20).length,
    contestedRegions:
      lastTurn?.contestedRegions ??
      regionStates.filter((region) => region.controller !== 'agency').length,
    averageFortificationIntegrity,
    actionCount: lastTurn?.actions.length ?? 0,
    summary: lastTurn?.summary ?? 'Governance state is initialized but has not resolved a turn yet.',
  }
}

export function formatCampaignGovernanceSummaryLines(
  summary: CampaignGovernanceSummary | undefined
) {
  const current = summary ?? EMPTY_CAMPAIGN_GOVERNANCE_SUMMARY

  return [
    `Authority reserve: ${current.authority}`,
    `Phase status: ${current.phase}`,
    `Primacy: ${toTitleCase(current.primacy)} / Court: ${toTitleCase(current.courtMode)}`,
    `Court seat: ${current.courtRegionId ? toTitleCase(current.courtRegionId) : 'Unseated'}`,
    `Upkeep: ${current.totalUpkeep} / Funding net ${current.fundingNet >= 0 ? '+' : ''}${current.fundingNet}`,
    `War ${current.atWarRegions} / Occupied ${current.occupiedRegions} / Under siege ${current.underSiegeRegions}`,
    `Fortification integrity: ${current.averageFortificationIntegrity}% average`,
  ]
}

export function sortCampaignGovernanceRegionStates(
  regions: Record<string, GovernanceRegionState> | GovernanceRegionState[]
) {
  const values = Array.isArray(regions) ? regions : Object.values(regions)

  return [...values]
    .map((region) => cloneRegionState(region))
    .sort((left, right) => left.regionId.localeCompare(right.regionId))
}

export function createStartingCampaignGovernanceState(
  game: Pick<GameState, 'agency' | 'cases' | 'regionalState' | 'supplyNetwork'>
) {
  return normalizeCampaignGovernanceState(undefined, game)
}

export function advanceCampaignGovernanceTurn(
  game: Pick<GameState, 'agency' | 'campaignGovernance' | 'cases' | 'funding' | 'regionalState' | 'supplyNetwork' | 'week'>
): CampaignGovernanceTurnOutcome {
  const governance = normalizeCampaignGovernanceState(game.campaignGovernance, game)
  const regions = sortCampaignGovernanceRegionStates(governance.regions)
  const authorityBefore = governance.authority
  const completedPhases: GovernanceTurnPhase[] = []
  const metricsByRegion = new Map<string, GovernanceRegionMetrics>()

  for (const phase of GOVERNANCE_TURN_PHASE_ORDER) {
    completedPhases.push(phase)
    governance.phase = phase
  }

  for (const region of regions) {
    metricsByRegion.set(region.regionId, buildRegionMetrics(game, region))
  }

  const courtProfile = buildCourtProfile(governance, regions, metricsByRegion)

  const authorityIncome = regions.reduce((sum, region) => {
    const metrics = metricsByRegion.get(region.regionId)
    if (!metrics) {
      return sum
    }

    return sum + (region.controller === 'agency' ? 2 : 1) + (metrics.supplyState === 'supported' ? 1 : 0)
  }, 0)
  const authorityWarDrain = regions.reduce((sum, region) => {
    const metrics = metricsByRegion.get(region.regionId)
    const pressure = metrics
      ? metrics.currentMaxStage + metrics.currentCaseCount + (metrics.hostileControl ? 2 : 0)
      : 0

    return sum + Math.max(0, Math.floor(pressure / 3))
  }, 0)
  const authorityOccupationDrain = regions.reduce(
    (sum, region) => sum + (region.occupation.active ? 2 : 0),
    0
  )
  const authorityCrackdownDrain = regions.reduce(
    (sum, region) => sum + Math.max(0, region.occupation.crackdown - 1),
    0
  )
  const regionalFundingIncome = regions.reduce((sum, region) => {
    return sum + (region.controller === 'agency' ? region.fundingContribution : 0)
  }, 0)
  const upkeepCost = regions.reduce((sum, region) => {
    return sum + region.upkeepCost + region.fortification.level + (region.war.active ? 1 : 0)
  }, 0)

  let availableAuthority = clamp(
    authorityBefore +
      authorityIncome +
      courtProfile.capitalAuthorityModifier -
      authorityWarDrain -
      authorityOccupationDrain -
      authorityCrackdownDrain,
    0,
    100
  )
  let availableFunding =
    game.funding +
    regionalFundingIncome +
    courtProfile.capitalFundingModifier -
    upkeepCost -
    courtProfile.courtRelocationCost
  let authorityActionCost = 0
  let actionCost = 0
  let siegeCost = 0
  const actions: GovernanceActionRecord[] = []
  const nextRegions: GovernanceRegionState[] = []
  const eventDrafts: AnyOperationEventDraft[] = []

  for (const region of regions) {
    const metrics = metricsByRegion.get(region.regionId)
    const nextRegion = cloneRegionState(region)
    const action = chooseAction(nextRegion, metrics ?? buildRegionMetrics(game, nextRegion), availableAuthority, availableFunding)

    availableAuthority += action.authorityDelta
    availableFunding += action.fundingDelta
    authorityActionCost += Math.abs(action.authorityDelta)
    actionCost += Math.abs(action.fundingDelta)
    nextRegion.lastAction = action.action
    nextRegion.fortification.integrity = clamp(
      nextRegion.fortification.integrity + action.fortificationDelta,
      0,
      100
    )
    nextRegion.occupation.unrest = clamp(
      nextRegion.occupation.unrest + action.unrestDelta,
      0,
      6
    )

    actions.push({
      regionId: nextRegion.regionId,
      regionLabel: nextRegion.label,
      action: action.action,
      authorityDelta: action.authorityDelta,
      fundingDelta: action.fundingDelta,
      fortificationDelta: action.fortificationDelta,
      unrestDelta: action.unrestDelta,
      summary: action.summary,
    })

    const pressureSeed =
      (metrics?.currentMaxStage ?? 0) * 12 +
      (metrics?.currentCaseCount ?? 0) * 8 +
      (metrics?.hostileControl ? 20 : 0) +
      (metrics?.contestedControl ? 10 : 0) +
      (metrics?.supplyState === 'unsupported' ? 12 : 0)
    const warPressure = clamp(
      Math.round(pressureSeed / 10) +
        (nextRegion.war.active ? 1 : 0) -
        (action.action === 'deploy' ? 2 : 0) -
        (action.action === 'negotiate' ? 1 : 0),
      0,
      9
    )
    const warActive = warPressure >= 2
    const fronts = warActive ? clamp(Math.max(1, Math.ceil(warPressure / 3)), 1, 3) : 0

    nextRegion.war = {
      active: warActive,
      fronts,
      pressure: warPressure,
    }

    const occupationActive = metrics?.hostileControl === true || (nextRegion.occupation.active && warPressure >= 1)
    nextRegion.occupation = {
      active: occupationActive,
      occupier: occupationActive ? (metrics?.hostileControl ? 'hostile' : nextRegion.occupation.occupier ?? 'hostile') : null,
      crackdown: clamp(
        nextRegion.occupation.crackdown + (occupationActive ? 1 : -1) - (action.action === 'negotiate' ? 1 : 0),
        0,
        3
      ),
      unrest: clamp(
        nextRegion.occupation.unrest +
          (occupationActive ? 1 : -1) +
          (warActive ? 1 : 0) -
          (action.action === 'stabilize' ? 1 : 0),
        0,
        6
      ),
    }

    const integrityBefore = region.fortification.integrity
    const siegePressureBefore = region.fortification.siegePressure
    const siegePressure = clamp(
      warPressure * 9 +
        (nextRegion.occupation.active ? 12 : 0) +
        (metrics?.supplyState === 'unsupported' ? 10 : -4),
      0,
      100
    )
    const erosion = clamp(
      Math.round(siegePressure / 9) +
        (nextRegion.occupation.crackdown > 0 ? nextRegion.occupation.crackdown : 0) -
        (metrics?.supplyState === 'supported' ? 2 : 0) -
        (action.action === 'fortify' ? 2 : 0),
      0,
      18
    )
    const passiveRepair = metrics?.supplyState === 'supported' && !warActive ? 4 : 0
    let integrity = clamp(nextRegion.fortification.integrity + passiveRepair - erosion, 0, 100)
    let level = nextRegion.fortification.level

    if (integrity < 25 && siegePressure >= 30) {
      level = clamp(level - 1, 0, 3)
      integrity = Math.max(integrity, 18)
    } else if (action.action === 'fortify' && integrity >= 90) {
      level = clamp(level + 1, 0, 3)
    }

    nextRegion.fortification = {
      ...nextRegion.fortification,
      level,
      integrity,
      siegePressure,
      erosion,
    }
    nextRegion.supplyState = metrics?.supplyState ?? 'unsupported'
    nextRegion.controller =
      nextRegion.occupation.active && integrity <= 20
        ? 'hostile'
        : warActive && integrity <= 35
          ? 'contested'
          : metrics?.hostileControl
            ? 'hostile'
            : metrics?.contestedControl
              ? 'contested'
              : 'agency'
    nextRegion.authority = clamp(
      region.authority +
        (nextRegion.controller === 'agency' ? 1 : -1) -
        (nextRegion.occupation.active ? 1 : 0),
      0,
      12
    )
    nextRegion.fundingContribution = clamp(
      region.fundingContribution +
        (metrics?.supplyState === 'supported' ? 1 : -1) +
        (nextRegion.controller === 'agency' ? 0 : -1),
      1,
      8
    )
    nextRegion.upkeepCost = clamp(
      2 + nextRegion.fortification.level + (nextRegion.war.active ? 1 : 0),
      1,
      8
    )

    if (siegePressure >= 20) {
      siegeCost += 1
    }

    nextRegions.push(nextRegion)

    if (integrity !== integrityBefore || siegePressure !== siegePressureBefore) {
      eventDrafts.push({
        type: 'system.fortification_updated',
        sourceSystem: 'system',
        payload: {
          week: game.week,
          regionId: nextRegion.regionId,
          regionLabel: nextRegion.label,
          controllerBefore: region.controller,
          controllerAfter: nextRegion.controller,
          action: nextRegion.lastAction,
          fortificationLevelBefore: region.fortification.level,
          fortificationLevelAfter: nextRegion.fortification.level,
          integrityBefore,
          integrityAfter: integrity,
          siegePressureBefore,
          siegePressureAfter: siegePressure,
          erosion,
          warActive: nextRegion.war.active,
          occupationActive: nextRegion.occupation.active,
          summary:
            `${nextRegion.label}: integrity ${integrityBefore} -> ${integrity}, ` +
            `siege ${siegePressureBefore} -> ${siegePressure}.`,
        },
      })
    }
  }

  const authorityAfter = clamp(
    authorityBefore +
      authorityIncome +
      courtProfile.capitalAuthorityModifier -
      authorityWarDrain -
      authorityOccupationDrain -
      authorityCrackdownDrain -
      authorityActionCost,
    0,
    100
  )
  const channels: GovernanceResourceChannels = {
    authorityIncome,
    capitalAuthorityModifier: courtProfile.capitalAuthorityModifier,
    authorityWarDrain,
    authorityOccupationDrain,
    authorityCrackdownDrain,
    authorityActionCost,
    authorityNet:
      authorityIncome +
      courtProfile.capitalAuthorityModifier -
      authorityWarDrain -
      authorityOccupationDrain -
      authorityCrackdownDrain -
      authorityActionCost,
    regionalFundingIncome,
    capitalFundingModifier: courtProfile.capitalFundingModifier,
    upkeepCost,
    actionCost,
    siegeCost,
    courtRelocationCost: courtProfile.courtRelocationCost,
    fundingNet:
      regionalFundingIncome +
      courtProfile.capitalFundingModifier -
      upkeepCost -
      actionCost -
      siegeCost -
      courtProfile.courtRelocationCost,
  }
  const atWarRegions = nextRegions.filter((region) => region.war.active).length
  const occupiedRegions = nextRegions.filter((region) => region.occupation.active).length
  const underSiegeRegions = nextRegions.filter((region) => region.fortification.siegePressure >= 20).length
  const contestedRegions = nextRegions.filter((region) => region.controller !== 'agency').length

  const report: CampaignGovernanceReportSnapshot = {
    week: game.week,
    phaseOrder: [...GOVERNANCE_TURN_PHASE_ORDER],
    completedPhases,
    primacy: governance.primacy,
    courtMode: courtProfile.courtMode,
    ...(courtProfile.courtRegionId ? { courtRegionId: courtProfile.courtRegionId } : {}),
    authorityBefore,
    authorityAfter,
    totalUpkeep: upkeepCost,
    atWarRegions,
    occupiedRegions,
    underSiegeRegions,
    contestedRegions,
    channels,
    actions,
    regionStates: nextRegions,
    summary: '',
  }

  report.summary = summarizeCampaignGovernanceTurn(report)

  const nextGovernance: CampaignGovernanceState = {
    ...governance,
    phase: 'complete',
    phaseOrder: [...GOVERNANCE_TURN_PHASE_ORDER],
    completedPhases,
    courtMode: courtProfile.courtMode,
    ...(courtProfile.courtRegionId ? { courtRegionId: courtProfile.courtRegionId } : {}),
    authority: authorityAfter,
    regions: Object.fromEntries(nextRegions.map((region) => [region.regionId, region])),
    lastTurn: report,
  }

  eventDrafts.push({
    type: 'governance.turn_resolved',
    sourceSystem: 'system',
    payload: {
      week: game.week,
      phaseOrder: [...GOVERNANCE_TURN_PHASE_ORDER],
      authorityBefore,
      authorityAfter,
      fundingNet: channels.fundingNet,
      upkeepCost,
      atWarRegions,
      occupiedRegions,
      underSiegeRegions,
      contestedRegions,
      primacy: nextGovernance.primacy,
      courtMode: courtProfile.courtMode,
      courtRegionId: courtProfile.courtRegionId,
      actionCount: actions.length,
      summary: report.summary,
    },
  })

  return {
    governance: nextGovernance,
    report,
    eventDrafts,
  }
}

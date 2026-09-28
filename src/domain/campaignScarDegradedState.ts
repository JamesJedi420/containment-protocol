/**
 * SPE-1051 — pure campaign scar / degraded-state registry (slice 1).
 *
 * Callers own failure-pressure inputs (breach, site damage, staff loss,
 * exposure, confidence) plus optional prior scar ids and personnel-turnover
 * counts. This module maps those onto named scar/modifier records with
 * degraded operating effects and one authored cascade. It does not persist
 * GameState, run week-close, implement true-defeat economy, UI, after-action
 * narrative outputs, or rewrite SPE-2261 / SPE-2262 registries.
 */

export const CAMPAIGN_SCAR_IDS = [
  'site_abandonment_scar',
  'strained_logistics_scar',
  'compromised_doctrine_scar',
  'survivor_trauma_scar',
] as const
export type CampaignScarId = (typeof CAMPAIGN_SCAR_IDS)[number]

export const CAMPAIGN_SCAR_MODIFIER_IDS = [
  'degraded_site_access',
  'logistics_backlog_drag',
  'doctrine_constraint_tightening',
  'morale_memory_drag',
] as const
export type CampaignScarModifierId = (typeof CAMPAIGN_SCAR_MODIFIER_IDS)[number]

export const CAMPAIGN_SCAR_BANDS = ['stable', 'degraded', 'critical'] as const
export type CampaignScarBand = (typeof CAMPAIGN_SCAR_BANDS)[number]

export type CampaignScarActiveBand = Exclude<CampaignScarBand, 'stable'>

export const CAMPAIGN_SCAR_TRIGGER_KEYS = [
  'breachSeverity',
  'siteDamage',
  'staffLoss',
  'exposureSpill',
  'confidenceLoss',
  'personnelTurnoverCount',
] as const
export type CampaignScarTriggerKey = (typeof CAMPAIGN_SCAR_TRIGGER_KEYS)[number]

/**
 * Outcome kinds for slice 1. True defeat / game-over is intentionally omitted;
 * thresholds above an immediate-loss floor still yield degraded_survivable.
 */
export const CAMPAIGN_SCAR_OUTCOME_KINDS = ['idle', 'degraded_survivable'] as const
export type CampaignScarOutcomeKind = (typeof CAMPAIGN_SCAR_OUTCOME_KINDS)[number]

/** Immediate-loss floor: values at or above this would naively end a run. */
export const CAMPAIGN_SCAR_IMMEDIATE_LOSS_BOUND = 100

export interface CampaignScarDegradedInput {
  readonly breachSeverity?: number
  readonly siteDamage?: number
  readonly staffLoss?: number
  readonly exposureSpill?: number
  readonly confidenceLoss?: number
  /** Acknowledged for persistence; never clears scars by itself. */
  readonly personnelTurnoverCount?: number
  /** Caller-owned prior scar ids that must survive turnover. */
  readonly priorScarIds?: readonly CampaignScarId[]
}

export interface CampaignScarEffects {
  readonly siteAccessPenalty: number
  readonly logisticsDrag: number
  readonly doctrineConstraint: number
  readonly moraleMemoryDrag: number
  readonly knowledgeClarityLoss: number
}

export interface CampaignScarRecord {
  readonly scarId: CampaignScarId
  readonly band: CampaignScarActiveBand
  readonly modifierId: CampaignScarModifierId
  readonly triggerKey: CampaignScarTriggerKey
  readonly triggerValue: number
  readonly effects: CampaignScarEffects
  /** When set, this scar was activated by a cascade from another scar. */
  readonly chainedFrom: CampaignScarId | null
  /** Slice-1 scars always survive personnel turnover. */
  readonly survivesPersonnelTurnover: true
}

export interface CampaignScarProjection {
  readonly outcomeKind: CampaignScarOutcomeKind
  readonly activeScars: readonly CampaignScarRecord[]
  readonly firedScarIds: readonly CampaignScarId[]
  /** Scar ids that participate in a cascade (source and/or chained). */
  readonly cascadeContributorScarIds: readonly CampaignScarId[]
}

interface ThresholdBands {
  readonly degraded: number
  readonly critical: number
}

interface ScarDefinition {
  readonly scarId: CampaignScarId
  readonly modifierId: CampaignScarModifierId
  readonly triggerKey: CampaignScarTriggerKey
  readonly thresholds: ThresholdBands
  readonly byBand: Record<CampaignScarActiveBand, CampaignScarEffects>
  /** When this scar reaches critical, activate the target at least at degraded. */
  readonly chainsTo: CampaignScarId | null
}

const ZERO_EFFECTS: CampaignScarEffects = Object.freeze({
  siteAccessPenalty: 0,
  logisticsDrag: 0,
  doctrineConstraint: 0,
  moraleMemoryDrag: 0,
  knowledgeClarityLoss: 0,
})

function scaleEffects(patch: Partial<CampaignScarEffects>): CampaignScarEffects {
  return Object.freeze({ ...ZERO_EFFECTS, ...patch })
}

/**
 * Authored scar table. Order is projection order (byte-stable).
 * Site abandonment at critical chains into strained_logistics_scar.
 */
const SCAR_DEFINITIONS: readonly ScarDefinition[] = Object.freeze([
  Object.freeze({
    scarId: 'site_abandonment_scar' as const,
    modifierId: 'degraded_site_access' as const,
    triggerKey: 'siteDamage' as const,
    thresholds: Object.freeze({ degraded: 15, critical: 35 }),
    byBand: Object.freeze({
      degraded: scaleEffects({
        siteAccessPenalty: 20,
        knowledgeClarityLoss: 8,
      }),
      critical: scaleEffects({
        siteAccessPenalty: 45,
        knowledgeClarityLoss: 22,
      }),
    }),
    chainsTo: 'strained_logistics_scar' as const,
  }),
  Object.freeze({
    scarId: 'strained_logistics_scar' as const,
    modifierId: 'logistics_backlog_drag' as const,
    triggerKey: 'exposureSpill' as const,
    thresholds: Object.freeze({ degraded: 12, critical: 30 }),
    byBand: Object.freeze({
      degraded: scaleEffects({
        logisticsDrag: 18,
      }),
      critical: scaleEffects({
        logisticsDrag: 40,
      }),
    }),
    chainsTo: null,
  }),
  Object.freeze({
    scarId: 'compromised_doctrine_scar' as const,
    modifierId: 'doctrine_constraint_tightening' as const,
    triggerKey: 'confidenceLoss' as const,
    thresholds: Object.freeze({ degraded: 20, critical: 45 }),
    byBand: Object.freeze({
      degraded: scaleEffects({
        doctrineConstraint: 15,
      }),
      critical: scaleEffects({
        doctrineConstraint: 35,
      }),
    }),
    chainsTo: null,
  }),
  Object.freeze({
    scarId: 'survivor_trauma_scar' as const,
    modifierId: 'morale_memory_drag' as const,
    triggerKey: 'staffLoss' as const,
    thresholds: Object.freeze({ degraded: 10, critical: 25 }),
    byBand: Object.freeze({
      degraded: scaleEffects({
        moraleMemoryDrag: 12,
      }),
      critical: scaleEffects({
        moraleMemoryDrag: 30,
      }),
    }),
    chainsTo: null,
  }),
])

const BAND_RANK: Record<CampaignScarBand, number> = {
  stable: 0,
  degraded: 1,
  critical: 2,
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

export function isCampaignScarId(value: unknown): value is CampaignScarId {
  return CAMPAIGN_SCAR_IDS.some((id) => id === value)
}

export function isCampaignScarModifierId(value: unknown): value is CampaignScarModifierId {
  return CAMPAIGN_SCAR_MODIFIER_IDS.some((id) => id === value)
}

export function isCampaignScarBand(value: unknown): value is CampaignScarBand {
  return CAMPAIGN_SCAR_BANDS.some((band) => band === value)
}

export function isCampaignScarOutcomeKind(value: unknown): value is CampaignScarOutcomeKind {
  return CAMPAIGN_SCAR_OUTCOME_KINDS.some((kind) => kind === value)
}

function resolveBand(value: number, thresholds: ThresholdBands): CampaignScarBand {
  if (value >= thresholds.critical) return 'critical'
  if (value >= thresholds.degraded) return 'degraded'
  return 'stable'
}

function maxBand(left: CampaignScarBand, right: CampaignScarBand): CampaignScarBand {
  return BAND_RANK[left] >= BAND_RANK[right] ? left : right
}

function readTriggerValue(
  input: CampaignScarDegradedInput,
  key: CampaignScarTriggerKey
): number | undefined {
  if (key === 'personnelTurnoverCount') {
    return input.personnelTurnoverCount
  }
  const value = input[key]
  return value === undefined ? undefined : value
}

/**
 * Validate caller-owned inputs. Present triggers must be non-negative finite
 * numbers. priorScarIds, when present, must be an array of known scar ids.
 * Empty object is valid (idle projection).
 */
export function validateCampaignScarDegradedInput(
  input: unknown
): input is CampaignScarDegradedInput {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) {
    return false
  }
  const record = input as Record<string, unknown>
  for (const key of CAMPAIGN_SCAR_TRIGGER_KEYS) {
    if (!(key in record)) continue
    if (!isNonNegativeFiniteNumber(record[key])) return false
  }
  if ('priorScarIds' in record) {
    const prior = record.priorScarIds
    if (!Array.isArray(prior)) return false
    for (const id of prior) {
      if (!isCampaignScarId(id)) return false
    }
  }
  return true
}

function buildScarRecord(
  definition: ScarDefinition,
  band: CampaignScarActiveBand,
  triggerValue: number,
  chainedFrom: CampaignScarId | null
): CampaignScarRecord {
  return Object.freeze({
    scarId: definition.scarId,
    band,
    modifierId: definition.modifierId,
    triggerKey: definition.triggerKey,
    triggerValue,
    effects: definition.byBand[band],
    chainedFrom,
    survivesPersonnelTurnover: true as const,
  })
}

/**
 * Project caller-owned failure pressures into an immutable campaign-scar
 * projection. Malformed inputs fail closed to undefined.
 *
 * Thresholds below CAMPAIGN_SCAR_IMMEDIATE_LOSS_BOUND never produce game-over;
 * they yield degraded_survivable when any scar fires.
 *
 * Cascade: site_abandonment_scar at critical activates strained_logistics_scar
 * at least at degraded.
 *
 * priorScarIds re-emit through personnel turnover (personnelTurnoverCount does
 * not clear scars).
 */
export function projectCampaignScarDegradedState(
  input: CampaignScarDegradedInput | null | undefined
): CampaignScarProjection | undefined {
  if (!validateCampaignScarDegradedInput(input)) return undefined

  const directBands = new Map<
    CampaignScarId,
    { band: CampaignScarActiveBand; triggerValue: number }
  >()

  for (const definition of SCAR_DEFINITIONS) {
    let raw = readTriggerValue(input, definition.triggerKey)

    // Breach severity folds into site abandonment when present (max with siteDamage).
    if (definition.scarId === 'site_abandonment_scar') {
      const breach = input.breachSeverity
      if (raw === undefined && breach !== undefined) raw = breach
      else if (raw !== undefined && breach !== undefined) raw = Math.max(raw, breach)
    }

    if (raw === undefined) continue
    // Cap evaluation below immediate-loss floor for slice-1 survivable outcomes.
    const capped = Math.min(raw, CAMPAIGN_SCAR_IMMEDIATE_LOSS_BOUND - 1)
    const band = resolveBand(capped, definition.thresholds)
    if (band === 'stable') continue
    directBands.set(definition.scarId, { band, triggerValue: raw })
  }

  const chainFloor = new Map<
    CampaignScarId,
    {
      band: CampaignScarActiveBand
      chainedFrom: CampaignScarId
      triggerValue: number
    }
  >()

  for (const definition of SCAR_DEFINITIONS) {
    if (!definition.chainsTo) continue
    const source = directBands.get(definition.scarId)
    if (!source || source.band !== 'critical') continue
    const floorBand: CampaignScarActiveBand = 'degraded'
    const existing = chainFloor.get(definition.chainsTo)
    if (!existing || BAND_RANK[floorBand] > BAND_RANK[existing.band]) {
      chainFloor.set(definition.chainsTo, {
        band: floorBand,
        chainedFrom: definition.scarId,
        triggerValue: source.triggerValue,
      })
    }
  }

  const priorSet = new Set<CampaignScarId>()
  if (input.priorScarIds) {
    for (const id of input.priorScarIds) {
      priorSet.add(id)
    }
  }

  const activeScars: CampaignScarRecord[] = []
  const cascadeContributorIds: CampaignScarId[] = []

  for (const definition of SCAR_DEFINITIONS) {
    const direct = directBands.get(definition.scarId)
    const chained = chainFloor.get(definition.scarId)
    const fromPrior = priorSet.has(definition.scarId)

    if (!direct && !chained && !fromPrior) continue

    let band: CampaignScarActiveBand
    let triggerValue: number
    let chainedFrom: CampaignScarId | null

    if (direct || chained) {
      if (direct && chained) {
        const merged = maxBand(direct.band, chained.band) as CampaignScarActiveBand
        band = merged
        triggerValue = Math.max(direct.triggerValue, chained.triggerValue)
        chainedFrom = BAND_RANK[chained.band] > BAND_RANK[direct.band] ? chained.chainedFrom : null
      } else if (direct) {
        band = direct.band
        triggerValue = direct.triggerValue
        chainedFrom = null
      } else {
        band = chained!.band
        triggerValue = chained!.triggerValue
        chainedFrom = chained!.chainedFrom
      }
    } else {
      // Prior-only carry: persist at degraded with zero trigger (caller-owned history).
      band = 'degraded'
      triggerValue = 0
      chainedFrom = null
    }

    activeScars.push(buildScarRecord(definition, band, triggerValue, chainedFrom))

    if (chainedFrom !== null || definition.chainsTo !== null) {
      if (direct?.band === 'critical' && definition.chainsTo) {
        if (!cascadeContributorIds.includes(definition.scarId)) {
          cascadeContributorIds.push(definition.scarId)
        }
        if (!cascadeContributorIds.includes(definition.chainsTo)) {
          cascadeContributorIds.push(definition.chainsTo)
        }
      }
      if (chainedFrom !== null) {
        if (!cascadeContributorIds.includes(chainedFrom)) {
          cascadeContributorIds.push(chainedFrom)
        }
        if (!cascadeContributorIds.includes(definition.scarId)) {
          cascadeContributorIds.push(definition.scarId)
        }
      }
    }
  }

  // Stable cascade contributor order matching scar table order.
  const orderedCascade = SCAR_DEFINITIONS.map((definition) => definition.scarId).filter((id) =>
    cascadeContributorIds.includes(id)
  )

  return Object.freeze({
    outcomeKind: activeScars.length === 0 ? ('idle' as const) : ('degraded_survivable' as const),
    activeScars: Object.freeze(activeScars),
    firedScarIds: Object.freeze(activeScars.map((scar) => scar.scarId)),
    cascadeContributorScarIds: Object.freeze(orderedCascade),
  })
}

export function listCampaignScarIds(): readonly CampaignScarId[] {
  return CAMPAIGN_SCAR_IDS
}

export function listCampaignScarModifierIds(): readonly CampaignScarModifierId[] {
  return CAMPAIGN_SCAR_MODIFIER_IDS
}

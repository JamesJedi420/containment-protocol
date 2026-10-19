/**
 * SPE-3362 — site-to-facility conversion rules.
 *
 * Pure caller-owned packets convert cleared/stabilized/reclaimed sites into
 * facility/support outcomes while preserving site/plot identity, evaluating
 * claim vs hazard confidence separately, and emitting register/map projection
 * packets for existing owners. Does not delete sites from simulation.
 *
 * This module does not persist GameState, run week-close, or draw facility UI.
 */

/** Representative site/plot ids used by acceptance fixtures. */
export const CONVERSION_SITE_ID = 'site:reclaimed-tower-7' as const
export const CONVERSION_PLOT_ID = 'plot:district-north-12' as const
export const CONVERSION_REGION_ID = 'region:outer-ring' as const

export const SITE_CONVERSION_RECIPES = [
  'cleared_structure',
  'stabilized_safehouse',
  'reclaimed_tower',
  'secured_lab',
  'repaired_dwelling',
  'converted_outpost',
  'controlled_infrastructure_node',
] as const
export type SiteConversionRecipe = (typeof SITE_CONVERSION_RECIPES)[number]

export const SITE_HAZARD_CONFIDENCE = [
  'unknown',
  'suspected',
  'verified_clear',
  'verified_hazard',
] as const
export type SiteHazardConfidence = (typeof SITE_HAZARD_CONFIDENCE)[number]

export const SITE_CONVERSION_OUTCOMES = [
  'approved',
  'blocked',
  'conditional',
] as const
export type SiteConversionOutcome = (typeof SITE_CONVERSION_OUTCOMES)[number]

export const SITE_CONVERSION_BLOCK_REASONS = [
  'missing_claim_or_permission',
  'unresolved_hazard',
  'verified_hazard',
  'terrain_not_buildable',
  'insufficient_staffing_or_materials',
  'unstable_site_state',
  'none',
] as const
export type SiteConversionBlockReason = (typeof SITE_CONVERSION_BLOCK_REASONS)[number]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isMember<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && allowed.some((item) => item === value)
}

export interface SiteToFacilityConversionInput {
  readonly siteId: string
  readonly plotId: string
  readonly regionId: string
  readonly recipe: SiteConversionRecipe
  readonly ownershipPermissionGranted: boolean
  readonly hazardConfidence: SiteHazardConfidence
  readonly terrainBuildable: boolean
  readonly staffingAndMaterialsReady: boolean
  readonly siteStable: boolean
}

export interface SiteToFacilityConversionResult {
  readonly siteId: string
  readonly plotId: string
  readonly regionId: string
  readonly recipe: SiteConversionRecipe
  readonly outcome: SiteConversionOutcome
  readonly blockReason: SiteConversionBlockReason
  readonly preservesSiteIdentity: boolean
  readonly preservesPlotIdentity: boolean
  readonly facilityAssetId: string | null
}

/**
 * Evaluate conversion. Administrative permission is distinct from hazard
 * confidence: unknown is neither confirmed clear nor confirmed danger.
 */
export function evaluateSiteToFacilityConversion(
  input: unknown
): SiteToFacilityConversionResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.siteId)) return undefined
  if (!isNonEmptyString(input.plotId)) return undefined
  if (!isNonEmptyString(input.regionId)) return undefined
  if (!isMember(input.recipe, SITE_CONVERSION_RECIPES)) return undefined
  if (typeof input.ownershipPermissionGranted !== 'boolean') return undefined
  if (!isMember(input.hazardConfidence, SITE_HAZARD_CONFIDENCE)) return undefined
  if (typeof input.terrainBuildable !== 'boolean') return undefined
  if (typeof input.staffingAndMaterialsReady !== 'boolean') return undefined
  if (typeof input.siteStable !== 'boolean') return undefined

  const identity = {
    siteId: input.siteId,
    plotId: input.plotId,
    regionId: input.regionId,
    recipe: input.recipe,
    preservesSiteIdentity: true as const,
    preservesPlotIdentity: true as const,
  }

  // Hard blockers win over unresolved hazard (unknown/suspected).
  let hardBlock: SiteConversionBlockReason = 'none'
  if (!input.ownershipPermissionGranted) {
    hardBlock = 'missing_claim_or_permission'
  } else if (input.hazardConfidence === 'verified_hazard') {
    hardBlock = 'verified_hazard'
  } else if (!input.terrainBuildable) {
    hardBlock = 'terrain_not_buildable'
  } else if (!input.staffingAndMaterialsReady) {
    hardBlock = 'insufficient_staffing_or_materials'
  } else if (!input.siteStable) {
    hardBlock = 'unstable_site_state'
  }

  if (hardBlock !== 'none') {
    return Object.freeze({
      ...identity,
      outcome: 'blocked' as const,
      blockReason: hardBlock,
      facilityAssetId: null,
    })
  }

  if (
    input.hazardConfidence === 'unknown' ||
    input.hazardConfidence === 'suspected'
  ) {
    return Object.freeze({
      ...identity,
      outcome: 'conditional' as const,
      blockReason: 'unresolved_hazard' as const,
      facilityAssetId: null,
    })
  }

  return Object.freeze({
    ...identity,
    outcome: 'approved' as const,
    blockReason: 'none' as const,
    facilityAssetId: `facility-from:${input.siteId}`,
  })
}

export interface ConversionRegisterProjectionInput {
  readonly conversion: SiteToFacilityConversionResult
}

export interface ConversionRegisterProjectionResult {
  readonly registerEntryPresent: boolean
  readonly facilityAssetId: string | null
  readonly siteId: string
  readonly plotId: string
  readonly recipe: SiteConversionRecipe
  readonly duplicatesFacilityOwner: false
}

/** Emit a register-facing packet without owning the facility register. */
export function projectConversionRegisterOutput(
  input: unknown
): ConversionRegisterProjectionResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isRecord(input.conversion)) return undefined
  const conversion = input.conversion
  if (!isNonEmptyString(conversion.siteId)) return undefined
  if (!isNonEmptyString(conversion.plotId)) return undefined
  if (!isMember(conversion.outcome, SITE_CONVERSION_OUTCOMES)) return undefined
  if (!isMember(conversion.recipe, SITE_CONVERSION_RECIPES)) return undefined

  if (conversion.outcome === 'approved') {
    if (!isNonEmptyString(conversion.facilityAssetId)) return undefined
    return Object.freeze({
      registerEntryPresent: true,
      facilityAssetId: conversion.facilityAssetId,
      siteId: conversion.siteId,
      plotId: conversion.plotId,
      recipe: conversion.recipe,
      duplicatesFacilityOwner: false as const,
    })
  }

  if (conversion.facilityAssetId !== null && conversion.facilityAssetId !== undefined) {
    return undefined
  }

  return Object.freeze({
    registerEntryPresent: false,
    facilityAssetId: null,
    siteId: conversion.siteId,
    plotId: conversion.plotId,
    recipe: conversion.recipe,
    duplicatesFacilityOwner: false as const,
  })
}

export interface ConversionMapProjectionInput {
  readonly conversion: SiteToFacilityConversionResult
}

export interface ConversionMapProjectionResult {
  readonly mapMarkerPresent: boolean
  readonly regionId: string
  readonly siteId: string
  readonly plotId: string
  readonly duplicatesMapOwner: false
}

/** Emit a regional-map packet without owning the map subsystem. */
export function projectConversionMapOutput(
  input: unknown
): ConversionMapProjectionResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isRecord(input.conversion)) return undefined
  const conversion = input.conversion
  if (!isNonEmptyString(conversion.siteId)) return undefined
  if (!isNonEmptyString(conversion.plotId)) return undefined
  if (!isNonEmptyString(conversion.regionId)) return undefined
  if (!isMember(conversion.outcome, SITE_CONVERSION_OUTCOMES)) return undefined
  if (!isMember(conversion.recipe, SITE_CONVERSION_RECIPES)) return undefined

  if (conversion.outcome === 'approved') {
    if (!isNonEmptyString(conversion.facilityAssetId)) return undefined
    return Object.freeze({
      mapMarkerPresent: true,
      regionId: conversion.regionId,
      siteId: conversion.siteId,
      plotId: conversion.plotId,
      duplicatesMapOwner: false as const,
    })
  }

  return Object.freeze({
    mapMarkerPresent: false,
    regionId: conversion.regionId,
    siteId: conversion.siteId,
    plotId: conversion.plotId,
    duplicatesMapOwner: false as const,
  })
}

export interface ConversionSiteHistoryInput {
  readonly siteId: string
  readonly priorSiteState: string
  readonly conversionOutcome: SiteConversionOutcome
  readonly recipe: SiteConversionRecipe
}

export interface ConversionSiteHistoryResult {
  readonly siteId: string
  readonly historyInspectable: boolean
  readonly priorSiteState: string
  readonly conversionOutcome: SiteConversionOutcome
  readonly recipe: SiteConversionRecipe
  readonly siteErased: false
}

/** Site-state change after conversion remains inspectable; site is not erased. */
export function projectConversionSiteHistory(
  input: unknown
): ConversionSiteHistoryResult | undefined {
  if (!isRecord(input)) return undefined
  if (!isNonEmptyString(input.siteId)) return undefined
  if (!isNonEmptyString(input.priorSiteState)) return undefined
  if (!isMember(input.conversionOutcome, SITE_CONVERSION_OUTCOMES)) return undefined
  if (!isMember(input.recipe, SITE_CONVERSION_RECIPES)) return undefined

  return Object.freeze({
    siteId: input.siteId,
    historyInspectable: true,
    priorSiteState: input.priorSiteState,
    conversionOutcome: input.conversionOutcome,
    recipe: input.recipe,
    siteErased: false as const,
  })
}

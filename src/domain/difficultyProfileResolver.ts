/**
 * SPE-3044 — versioned difficulty profiles and resolved run configuration.
 *
 * Canonical registry + deterministic resolver under SPE-1734. Supplies
 * multiplier/option inputs to existing owners; does not reimplement XP,
 * wages, standing, injury, procurement, or recruitment systems.
 * Profile changes that affect saves route through SPE-2898.
 */

export const DIFFICULTY_PROFILE_OWNER = 'SPE-3044' as const
export const DIFFICULTY_PROFILE_SCHEMA_VERSION = 'spe-3044.v1' as const

export const DIFFICULTY_PROFILE_IDS = [
  'cozy',
  'normal',
  'workhorse',
  'custom',
] as const
export type DifficultyProfileId = (typeof DIFFICULTY_PROFILE_IDS)[number]

/** Recommended / default profile for new campaigns (not applied to legacy baseline silently). */
export const RECOMMENDED_DIFFICULTY_PROFILE_ID: DifficultyProfileId = 'normal'

export interface DifficultyAxisMultipliers {
  readonly xp: number
  readonly renown: number
  readonly economicPayout: number
  readonly injuryPressure: number
  readonly fatalityPressure: number
  readonly upkeep: number
  readonly wages: number
}

export interface DifficultyRunOptions {
  readonly maxDeployableTeams: number
  readonly startingGold: number
  readonly noMarketPurchases: boolean
  readonly bonusInstructorSlots: number
  readonly prospectQualityMultiplier: number
  readonly prospectVolumeMultiplier: number
  /** Renown per semester; campaign lifetime cap authored below. */
  readonly lowTierGraduateBounty: number
}

export interface DifficultyProfileDefinition {
  readonly profileId: DifficultyProfileId
  readonly version: string
  readonly label: string
  readonly recommendedDefault: boolean
  readonly multipliers: DifficultyAxisMultipliers
  readonly runOptions: DifficultyRunOptions
}

/**
 * Explicit CP-authored Custom defaults (source left these unspecified).
 * Lifetime graduate-bounty cap interpretation: cumulative renown from this
 * option across a campaign cannot exceed 500; per-semester award stays 0–60.
 */
export const CUSTOM_DIFFICULTY_AUTHORED_DEFAULTS: DifficultyRunOptions = Object.freeze({
  maxDeployableTeams: 16,
  startingGold: 10_000,
  noMarketPurchases: false,
  bonusInstructorSlots: 0,
  prospectQualityMultiplier: 1,
  prospectVolumeMultiplier: 1,
  lowTierGraduateBounty: 0,
})

export const LOW_TIER_GRADUATE_BOUNTY_CAMPAIGN_CAP = 500 as const

const BASELINE_1X: DifficultyAxisMultipliers = Object.freeze({
  xp: 1,
  renown: 1,
  economicPayout: 1,
  injuryPressure: 1,
  fatalityPressure: 1,
  upkeep: 1,
  wages: 1,
})

const NORMAL_MULTIPLIERS: DifficultyAxisMultipliers = Object.freeze({
  xp: 0.8,
  renown: 0.8,
  economicPayout: 0.8,
  injuryPressure: 1.5,
  fatalityPressure: 2,
  upkeep: 1.5,
  wages: 1.25,
})

/** Developer-curated Workhorse's Tier — explicit authored values, not inferred. */
const WORKHORSE_MULTIPLIERS: DifficultyAxisMultipliers = Object.freeze({
  xp: 0.9,
  renown: 0.9,
  economicPayout: 0.9,
  injuryPressure: 1.25,
  fatalityPressure: 1.5,
  upkeep: 1.25,
  wages: 1.1,
})

const DEFAULT_RUN = CUSTOM_DIFFICULTY_AUTHORED_DEFAULTS

export const DIFFICULTY_PROFILE_REGISTRY: Readonly<
  Record<DifficultyProfileId, DifficultyProfileDefinition>
> = Object.freeze({
  cozy: Object.freeze({
    profileId: 'cozy',
    version: '1',
    label: 'Cozy',
    recommendedDefault: false,
    multipliers: BASELINE_1X,
    runOptions: DEFAULT_RUN,
  }),
  normal: Object.freeze({
    profileId: 'normal',
    version: '1',
    label: 'Normal',
    recommendedDefault: true,
    multipliers: NORMAL_MULTIPLIERS,
    runOptions: DEFAULT_RUN,
  }),
  workhorse: Object.freeze({
    profileId: 'workhorse',
    version: '1',
    label: "Workhorse's Tier",
    recommendedDefault: false,
    multipliers: WORKHORSE_MULTIPLIERS,
    runOptions: DEFAULT_RUN,
  }),
  custom: Object.freeze({
    profileId: 'custom',
    version: '1',
    label: 'Custom',
    recommendedDefault: false,
    multipliers: BASELINE_1X,
    runOptions: DEFAULT_RUN,
  }),
})

export interface CustomDifficultyOverrides {
  readonly multipliers?: Partial<DifficultyAxisMultipliers>
  readonly runOptions?: Partial<DifficultyRunOptions>
  /**
   * Required when `noMarketPurchases` is true: caller affirms an alternate
   * progression-resource route exists. Otherwise resolve fails closed.
   */
  readonly hasAlternateProgressionResourceRoute?: boolean
}

export interface DifficultyResolveInput {
  readonly profileId: string
  readonly profileVersion?: string
  readonly custom?: CustomDifficultyOverrides | null
}

export interface ResolvedDifficultyRunConfiguration {
  readonly schemaVersion: typeof DIFFICULTY_PROFILE_SCHEMA_VERSION
  readonly owner: typeof DIFFICULTY_PROFILE_OWNER
  readonly profileId: DifficultyProfileId
  readonly profileVersion: string
  readonly label: string
  readonly recommendedDefault: boolean
  readonly multipliers: DifficultyAxisMultipliers
  readonly runOptions: DifficultyRunOptions
  readonly lowTierGraduateBountyCampaignCap: typeof LOW_TIER_GRADUATE_BOUNTY_CAMPAIGN_CAP
}

export type ResolveDifficultyResult =
  | { readonly ok: true; readonly configuration: ResolvedDifficultyRunConfiguration }
  | { readonly ok: false; readonly reason: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isProfileId(value: unknown): value is DifficultyProfileId {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(DIFFICULTY_PROFILE_REGISTRY, value)
  )
}

function inRange(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max
}

function validateMultipliers(
  raw: Partial<DifficultyAxisMultipliers> | undefined
): { ok: true; value: Partial<DifficultyAxisMultipliers> } | { ok: false; reason: string } {
  if (raw == null) return { ok: true, value: {} }
  if (!isRecord(raw)) return { ok: false, reason: 'multipliers must be an object' }
  const out: Partial<DifficultyAxisMultipliers> = {}
  for (const key of [
    'xp',
    'renown',
    'economicPayout',
    'injuryPressure',
    'fatalityPressure',
    'upkeep',
    'wages',
  ] as const) {
    if (!Object.prototype.hasOwnProperty.call(raw, key) || raw[key] == null) continue
    const n = raw[key]
    if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) {
      return { ok: false, reason: `invalid multiplier ${key}` }
    }
    out[key] = n
  }
  return { ok: true, value: out }
}

function validateRunOptions(
  raw: Partial<DifficultyRunOptions> | undefined,
  hasAlternateRoute: boolean
):
  | { ok: true; value: Partial<DifficultyRunOptions> }
  | { ok: false; reason: string } {
  if (raw == null) return { ok: true, value: {} }
  if (!isRecord(raw)) return { ok: false, reason: 'runOptions must be an object' }
  const out: Partial<DifficultyRunOptions> = {}

  if (Object.prototype.hasOwnProperty.call(raw, 'maxDeployableTeams') && raw.maxDeployableTeams != null) {
    if (typeof raw.maxDeployableTeams !== 'number' || !Number.isInteger(raw.maxDeployableTeams) || !inRange(raw.maxDeployableTeams, 6, 30)) {
      return { ok: false, reason: 'maxDeployableTeams must be integer 6–30' }
    }
    out.maxDeployableTeams = raw.maxDeployableTeams
  }
  if (Object.prototype.hasOwnProperty.call(raw, 'startingGold') && raw.startingGold != null) {
    if (typeof raw.startingGold !== 'number' || !Number.isInteger(raw.startingGold) || !inRange(raw.startingGold, 0, 50_000)) {
      return { ok: false, reason: 'startingGold must be integer 0–50000' }
    }
    out.startingGold = raw.startingGold
  }
  if (Object.prototype.hasOwnProperty.call(raw, 'noMarketPurchases') && raw.noMarketPurchases != null) {
    if (typeof raw.noMarketPurchases !== 'boolean') {
      return { ok: false, reason: 'noMarketPurchases must be boolean' }
    }
    if (raw.noMarketPurchases === true && !hasAlternateRoute) {
      return {
        ok: false,
        reason: 'noMarketPurchases requires alternate progression resource route',
      }
    }
    out.noMarketPurchases = raw.noMarketPurchases
  }
  if (Object.prototype.hasOwnProperty.call(raw, 'bonusInstructorSlots') && raw.bonusInstructorSlots != null) {
    if (typeof raw.bonusInstructorSlots !== 'number' || !Number.isInteger(raw.bonusInstructorSlots) || !inRange(raw.bonusInstructorSlots, 0, 6)) {
      return { ok: false, reason: 'bonusInstructorSlots must be integer 0–6' }
    }
    out.bonusInstructorSlots = raw.bonusInstructorSlots
  }
  if (Object.prototype.hasOwnProperty.call(raw, 'prospectQualityMultiplier') && raw.prospectQualityMultiplier != null) {
    if (typeof raw.prospectQualityMultiplier !== 'number' || !inRange(raw.prospectQualityMultiplier, 0.25, 2)) {
      return { ok: false, reason: 'prospectQualityMultiplier must be 0.25–2' }
    }
    out.prospectQualityMultiplier = raw.prospectQualityMultiplier
  }
  if (Object.prototype.hasOwnProperty.call(raw, 'prospectVolumeMultiplier') && raw.prospectVolumeMultiplier != null) {
    if (typeof raw.prospectVolumeMultiplier !== 'number' || !inRange(raw.prospectVolumeMultiplier, 0.5, 3)) {
      return { ok: false, reason: 'prospectVolumeMultiplier must be 0.5–3' }
    }
    out.prospectVolumeMultiplier = raw.prospectVolumeMultiplier
  }
  if (Object.prototype.hasOwnProperty.call(raw, 'lowTierGraduateBounty') && raw.lowTierGraduateBounty != null) {
    if (typeof raw.lowTierGraduateBounty !== 'number' || !Number.isInteger(raw.lowTierGraduateBounty) || !inRange(raw.lowTierGraduateBounty, 0, 60)) {
      return { ok: false, reason: 'lowTierGraduateBounty must be integer 0–60 per semester' }
    }
    out.lowTierGraduateBounty = raw.lowTierGraduateBounty
  }
  return { ok: true, value: out }
}

export function resolveDifficultyRunConfiguration(
  input: DifficultyResolveInput | null | undefined
): ResolveDifficultyResult {
  if (input == null || !isProfileId(input.profileId)) {
    return { ok: false, reason: 'unknown difficulty profile id' }
  }
  const def = DIFFICULTY_PROFILE_REGISTRY[input.profileId]
  if (!Object.prototype.hasOwnProperty.call(DIFFICULTY_PROFILE_REGISTRY, input.profileId)) {
    return { ok: false, reason: 'unknown difficulty profile id' }
  }
  if (input.profileVersion != null && input.profileVersion !== def.version) {
    return { ok: false, reason: 'unknown difficulty profile version' }
  }

  let multipliers = { ...def.multipliers }
  let runOptions = { ...def.runOptions }

  if (input.profileId === 'custom') {
    const hasAlternate = input.custom?.hasAlternateProgressionResourceRoute === true
    const mult = validateMultipliers(input.custom?.multipliers)
    if (!mult.ok) return mult
    const opts = validateRunOptions(input.custom?.runOptions, hasAlternate)
    if (!opts.ok) return opts
    multipliers = { ...multipliers, ...mult.value }
    runOptions = { ...runOptions, ...opts.value }
  } else if (input.custom != null) {
    return { ok: false, reason: 'custom overrides only valid for custom profile' }
  }

  return {
    ok: true,
    configuration: Object.freeze({
      schemaVersion: DIFFICULTY_PROFILE_SCHEMA_VERSION,
      owner: DIFFICULTY_PROFILE_OWNER,
      profileId: def.profileId,
      profileVersion: def.version,
      label: def.label,
      recommendedDefault: def.recommendedDefault,
      multipliers: Object.freeze(multipliers),
      runOptions: Object.freeze(runOptions),
      lowTierGraduateBountyCampaignCap: LOW_TIER_GRADUATE_BOUNTY_CAMPAIGN_CAP,
    }),
  }
}

/** Consumer adapters — scale a base amount using the resolved snapshot. */
export function applyDifficultyXp(base: number, config: ResolvedDifficultyRunConfiguration): number {
  return base * config.multipliers.xp
}
export function applyDifficultyRenown(base: number, config: ResolvedDifficultyRunConfiguration): number {
  return base * config.multipliers.renown
}
export function applyDifficultyEconomicPayout(base: number, config: ResolvedDifficultyRunConfiguration): number {
  return base * config.multipliers.economicPayout
}
export function applyDifficultyInjuryPressure(base: number, config: ResolvedDifficultyRunConfiguration): number {
  return base * config.multipliers.injuryPressure
}
export function applyDifficultyFatalityPressure(base: number, config: ResolvedDifficultyRunConfiguration): number {
  return base * config.multipliers.fatalityPressure
}
export function applyDifficultyUpkeep(base: number, config: ResolvedDifficultyRunConfiguration): number {
  return base * config.multipliers.upkeep
}
export function applyDifficultyWages(base: number, config: ResolvedDifficultyRunConfiguration): number {
  return base * config.multipliers.wages
}

export function projectMaxDeployableTeams(config: ResolvedDifficultyRunConfiguration): number {
  return config.runOptions.maxDeployableTeams
}
export function projectStartingGold(config: ResolvedDifficultyRunConfiguration): number {
  return config.runOptions.startingGold
}
export function projectBonusInstructorSlots(config: ResolvedDifficultyRunConfiguration): number {
  return config.runOptions.bonusInstructorSlots
}
export function projectProspectQualityMultiplier(config: ResolvedDifficultyRunConfiguration): number {
  return config.runOptions.prospectQualityMultiplier
}
export function projectProspectVolumeMultiplier(config: ResolvedDifficultyRunConfiguration): number {
  return config.runOptions.prospectVolumeMultiplier
}
export function projectLowTierGraduateBountyPerSemester(
  config: ResolvedDifficultyRunConfiguration
): number {
  return config.runOptions.lowTierGraduateBounty
}

/**
 * Award low-tier graduate bounty for one semester event, respecting per-semester
 * bound and campaign lifetime cap. Does not mutate GameState — caller applies.
 */
export function resolveLowTierGraduateBountyAward(input: {
  readonly configuration: ResolvedDifficultyRunConfiguration
  readonly campaignBountyAwardedSoFar: number
}): { readonly award: number; readonly remainingCap: number } {
  const perSemester = input.configuration.runOptions.lowTierGraduateBounty
  const remaining = Math.max(
    0,
    LOW_TIER_GRADUATE_BOUNTY_CAMPAIGN_CAP - input.campaignBountyAwardedSoFar
  )
  const award = Math.min(perSemester, remaining)
  return Object.freeze({ award, remainingCap: remaining - award })
}

/** Legacy campaigns without a difficulty profile stay on cozy 1.0× (SPE-2898 stable). */
export function resolveLegacyBaselineDifficulty(): ResolvedDifficultyRunConfiguration {
  const resolved = resolveDifficultyRunConfiguration({ profileId: 'cozy', profileVersion: '1' })
  if (!resolved.ok) {
    throw new Error('cozy profile must resolve')
  }
  return resolved.configuration
}

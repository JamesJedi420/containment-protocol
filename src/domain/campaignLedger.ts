import { clamp } from './math'
import type {
  CampaignLedgerCompatibilitySnapshot,
  CampaignLedgerState,
  CampaignModuleToggle,
  CampaignOperationalProfile,
  CampaignRunStateModifier,
  CampaignSettingHistoryEntry,
  CampaignSettingHistorySource,
  GameState,
} from './models'

const MAX_STRING = 480
const MAX_LABEL = 160
const MAX_ID = 96

/** Hydration 558: known campaign rules profiles (id → canonical label). */
export const CAMPAIGN_RULES_PROFILE_REGISTRY: Readonly<
  Record<string, { readonly label: string }>
> = {
  'baseline-standard': { label: 'Baseline standard containment' },
} as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function clampString(value: string, max: number) {
  if (value.length <= max) {
    return value
  }
  return `${value.slice(0, max - 1)}…`
}

function sanitizeId(value: unknown, fallback: string) {
  const raw = typeof value === 'string' ? value.trim() : ''
  return clampString(raw.length > 0 ? raw : fallback, MAX_ID)
}

function sanitizeLabel(value: unknown, fallback: string) {
  const raw = typeof value === 'string' ? value.trim() : ''
  return clampString(raw.length > 0 ? raw : fallback, MAX_LABEL)
}

function sanitizeBody(value: unknown, fallback: string) {
  const raw = typeof value === 'string' ? value.trim() : ''
  return clampString(raw.length > 0 ? raw : fallback, MAX_STRING)
}

function sanitizeSource(value: unknown): CampaignSettingHistorySource {
  if (value === 'seed' || value === 'migration' || value === 'player' || value === 'system') {
    return value
  }
  return 'migration'
}

function sanitizeProfile(raw: unknown, fallback: CampaignOperationalProfile): CampaignOperationalProfile {
  if (!isRecord(raw)) {
    return { ...fallback }
  }

  return {
    organizationName: sanitizeLabel(raw.organizationName, fallback.organizationName),
    homeBaseId: sanitizeId(raw.homeBaseId, fallback.homeBaseId),
    homeBaseLabel: sanitizeLabel(raw.homeBaseLabel, fallback.homeBaseLabel),
    operationalRegionId: sanitizeId(raw.operationalRegionId, fallback.operationalRegionId),
    operationalRegionLabel: sanitizeLabel(raw.operationalRegionLabel, fallback.operationalRegionLabel),
    majorHookSummary: sanitizeBody(raw.majorHookSummary, fallback.majorHookSummary),
    doctrineLabel: sanitizeLabel(raw.doctrineLabel, fallback.doctrineLabel),
    toneScopeLabel: sanitizeBody(raw.toneScopeLabel, fallback.toneScopeLabel),
  }
}

/** Hydration 535-536: last array occurrence wins for the same key. */
function dedupeByKeyLatestWins<T>(entries: readonly T[], resolveKey: (entry: T) => string): T[] {
  const byKey = new Map<string, T>()

  for (const entry of entries) {
    const key = resolveKey(entry)
    if (key.length === 0) {
      continue
    }

    byKey.set(key, entry)
  }

  return [...byKey.values()]
}

function sanitizeRunStateModifiers(
  raw: unknown,
  fallback: CampaignRunStateModifier[]
): CampaignRunStateModifier[] {
  if (!Array.isArray(raw)) {
    return [...fallback]
  }

  if (raw.length === 0) {
    return []
  }

  const parsed: CampaignRunStateModifier[] = []

  for (const entry of raw) {
    if (!isRecord(entry)) {
      continue
    }

    const id = sanitizeId(entry.id, '')
    if (id.length === 0) {
      continue
    }

    parsed.push({
      id,
      label: sanitizeLabel(entry.label, id),
      value: sanitizeBody(entry.value, '—'),
    })
  }

  return dedupeByKeyLatestWins(parsed, (modifier) => modifier.id).slice(0, 12)
}

function sanitizeModuleToggles(raw: unknown, fallback: CampaignModuleToggle[]): CampaignModuleToggle[] {
  if (!Array.isArray(raw)) {
    return [...fallback]
  }

  if (raw.length === 0) {
    return []
  }

  const parsed: CampaignModuleToggle[] = []

  for (const entry of raw) {
    if (!isRecord(entry)) {
      continue
    }

    const moduleId = sanitizeId(entry.moduleId, '')
    if (moduleId.length === 0) {
      continue
    }

    parsed.push({
      moduleId,
      label: sanitizeLabel(entry.label, moduleId),
      enabled: typeof entry.enabled === 'boolean' ? entry.enabled : false,
    })
  }

  return dedupeByKeyLatestWins(parsed, (toggle) => toggle.moduleId).slice(0, 24)
}

const SETTING_HISTORY_CAP = 200

function resolveSettingHistoryConflict(
  current: CampaignSettingHistoryEntry,
  incoming: CampaignSettingHistoryEntry
): CampaignSettingHistoryEntry {
  if (incoming.changedAtWeek !== current.changedAtWeek) {
    return incoming.changedAtWeek > current.changedAtWeek ? incoming : current
  }

  return incoming.id.localeCompare(current.id) >= 0 ? incoming : current
}

/** Hydration 538: dedupe by id (latest wins), then by settingId+effectiveFromWeek (latest changedAtWeek). */
function dedupeSettingHistoryEntries(
  entries: readonly CampaignSettingHistoryEntry[]
): CampaignSettingHistoryEntry[] {
  const byId = dedupeByKeyLatestWins(entries, (entry) => entry.id)
  const bySettingWeek = new Map<string, CampaignSettingHistoryEntry>()

  for (const entry of byId) {
    const key = `${entry.settingId}\0${entry.effectiveFromWeek}`
    const existing = bySettingWeek.get(key)
    bySettingWeek.set(key, existing ? resolveSettingHistoryConflict(existing, entry) : entry)
  }

  return [...bySettingWeek.values()]
}

function sanitizeSettingHistory(
  raw: unknown,
  fallback: CampaignSettingHistoryEntry[],
  campaignWeek?: number
): CampaignSettingHistoryEntry[] {
  if (!Array.isArray(raw)) {
    return [...fallback]
  }

  if (raw.length === 0) {
    return []
  }

  const cappedCampaignWeek =
    campaignWeek !== undefined ? Math.max(1, Math.trunc(campaignWeek)) : undefined
  const next: CampaignSettingHistoryEntry[] = []

  for (const entry of raw) {
    if (!isRecord(entry)) {
      continue
    }

    const id = sanitizeId(entry.id, '')
    const settingId = sanitizeId(entry.settingId, '')
    if (id.length === 0 || settingId.length === 0) {
      continue
    }

    const rawEffectiveFromWeek = Math.max(
      1,
      typeof entry.effectiveFromWeek === 'number' && Number.isFinite(entry.effectiveFromWeek)
        ? Math.trunc(entry.effectiveFromWeek)
        : 1
    )
    const rawChangedAtWeek = Math.max(
      0,
      typeof entry.changedAtWeek === 'number' && Number.isFinite(entry.changedAtWeek)
        ? Math.trunc(entry.changedAtWeek)
        : 0
    )

    next.push({
      id,
      settingId,
      value: sanitizeBody(entry.value, ''),
      effectiveFromWeek: rawEffectiveFromWeek,
      changedAtWeek: rawChangedAtWeek,
      source: sanitizeSource(entry.source),
      ...(typeof entry.note === 'string' && entry.note.trim().length > 0
        ? { note: clampString(entry.note.trim(), 240) }
        : {}),
    })
  }

  if (next.length === 0) {
    return []
  }

  const deduped = dedupeSettingHistoryEntries(next).map((entry) => ({
    ...entry,
    effectiveFromWeek:
      cappedCampaignWeek !== undefined && entry.effectiveFromWeek > cappedCampaignWeek
        ? cappedCampaignWeek
        : entry.effectiveFromWeek,
    changedAtWeek:
      cappedCampaignWeek !== undefined
        ? clamp(entry.changedAtWeek, 0, cappedCampaignWeek)
        : entry.changedAtWeek,
  }))

  const sorted = [...deduped].sort((left, right) => {
    if (left.effectiveFromWeek !== right.effectiveFromWeek) {
      return left.effectiveFromWeek - right.effectiveFromWeek
    }

    if (left.changedAtWeek !== right.changedAtWeek) {
      return left.changedAtWeek - right.changedAtWeek
    }

    return left.id.localeCompare(right.id)
  })

  return sorted.length > SETTING_HISTORY_CAP ? sorted.slice(-SETTING_HISTORY_CAP) : sorted
}

/** Hydration 558: reconcile rules profile id/label with registry and surface compatibility warnings. */
function sanitizeActiveRulesProfile(
  raw: Record<string, unknown>,
  fallback: CampaignLedgerState
): Pick<CampaignLedgerState, 'activeRulesProfileId' | 'activeRulesProfileLabel' | 'compatibility'> {
  const requestedId = sanitizeId(raw.activeRulesProfileId, fallback.activeRulesProfileId)
  const registryEntry = CAMPAIGN_RULES_PROFILE_REGISTRY[requestedId]
  const compatibility = sanitizeCompatibility(raw.compatibility, fallback.compatibility)
  const warnings = [...compatibility.warnings]

  if (!registryEntry) {
    const resetId = fallback.activeRulesProfileId
    const resetLabel =
      CAMPAIGN_RULES_PROFILE_REGISTRY[resetId]?.label ?? fallback.activeRulesProfileLabel

    warnings.push(`Unknown active rules profile "${requestedId}" — reset to "${resetId}".`)

    return {
      activeRulesProfileId: resetId,
      activeRulesProfileLabel: resetLabel,
      compatibility: {
        ...compatibility,
        compatible: false,
        warnings: dedupeTrimmedCompatibilityStrings(warnings),
      },
    }
  }

  const requestedLabel = sanitizeLabel(raw.activeRulesProfileLabel, registryEntry.label)

  if (requestedLabel !== registryEntry.label) {
    warnings.push(
      `Active rules profile label for "${requestedId}" did not match registry — using "${registryEntry.label}".`
    )
  }

  return {
    activeRulesProfileId: requestedId,
    activeRulesProfileLabel: registryEntry.label,
    compatibility:
      warnings.length > compatibility.warnings.length
        ? {
            ...compatibility,
            compatible: false,
            warnings: dedupeTrimmedCompatibilityStrings(warnings),
          }
        : compatibility,
  }
}

/** Hydration 550: trim compatibility strings and dedupe trimmed collisions (latest wins). */
function dedupeTrimmedCompatibilityStrings(values: readonly string[]): string[] {
  const byTrimmedKey = new Map<string, string>()

  for (const value of values) {
    if (typeof value !== 'string') {
      continue
    }

    const trimmed = value.trim()

    if (trimmed.length === 0) {
      continue
    }

    byTrimmedKey.set(trimmed, clampString(trimmed, MAX_STRING))
  }

  return [...byTrimmedKey.values()].slice(0, 12)
}

function sanitizeCompatibility(
  raw: unknown,
  fallback: CampaignLedgerCompatibilitySnapshot
): CampaignLedgerCompatibilitySnapshot {
  if (!isRecord(raw)) {
    return { ...fallback, notes: [...fallback.notes], warnings: [...fallback.warnings] }
  }

  const compatible = typeof raw.compatible === 'boolean' ? raw.compatible : fallback.compatible

  const rawNotesPresent = Object.prototype.hasOwnProperty.call(raw, 'notes')
  const notes = rawNotesPresent && Array.isArray(raw.notes)
    ? dedupeTrimmedCompatibilityStrings(raw.notes)
    : [...fallback.notes]

  const rawWarningsPresent = Object.prototype.hasOwnProperty.call(raw, 'warnings')
  const warnings = rawWarningsPresent && Array.isArray(raw.warnings)
    ? dedupeTrimmedCompatibilityStrings(raw.warnings)
    : [...fallback.warnings]

  return {
    compatible,
    notes: rawNotesPresent && Array.isArray(raw.notes) ? notes : [...fallback.notes],
    warnings: rawWarningsPresent && Array.isArray(raw.warnings) ? warnings : [...fallback.warnings],
  }
}

/** Deterministic starter ledger aligned with default `GameConfig` (challenge off, capacity model). */
export function createSeedCampaignLedger(): CampaignLedgerState {
  return {
    profile: {
      organizationName: 'Containment Protocol',
      homeBaseId: 'haven_subsurface_command',
      homeBaseLabel: 'Haven subsurface command campus',
      operationalRegionId: 'mid_atlantic_corridor',
      operationalRegionLabel: 'Mid-Atlantic metro corridor',
      majorHookSummary:
        'A black-budget containment authority holds a thinning line between public denial and escalating phenomena.',
      doctrineLabel: 'Measured containment with recoverable field teams.',
      toneScopeLabel: 'Grounded investigation leaning tactical containment.',
    },
    activeRulesProfileId: 'baseline-standard',
    activeRulesProfileLabel: 'Baseline standard containment',
    runStateModifiers: [
      {
        id: 'challenge_posture',
        label: 'Challenge posture',
        value: 'Standard (challenge mode off)',
      },
      {
        id: 'duration_model',
        label: 'Duration / attrition integrity',
        value: 'Capacity model (no cross-session operative attrition)',
      },
    ],
    moduleToggles: [
      { moduleId: 'courier_network', label: 'Courier network slice', enabled: true },
      { moduleId: 'weekly_directives', label: 'Weekly directive discipline', enabled: true },
    ],
    settingHistory: [
      {
        id: 'hist_tone_scope_w1',
        settingId: 'toneScopeLabel',
        value: 'Grounded investigation leaning tactical containment.',
        effectiveFromWeek: 1,
        changedAtWeek: 0,
        source: 'seed',
        note: 'Opening posture anchor for contract tone.',
      },
      {
        id: 'hist_tone_scope_w2',
        settingId: 'toneScopeLabel',
        value: 'Grounded investigation with bounded surreal anomaly contact.',
        effectiveFromWeek: 2,
        changedAtWeek: 1,
        source: 'seed',
        note: 'Doctrine board records a deliberate expansion of surreal contact bounds.',
      },
    ],
    compatibility: {
      compatible: true,
      notes: [
        'Courier logistics visibility assumes weekly directive timestamps stay stable for procurement coupling.',
      ],
      warnings: [],
    },
  }
}

export function sanitizeCampaignLedger(
  raw: unknown,
  fallback: CampaignLedgerState,
  campaignWeek?: number
): CampaignLedgerState {
  if (!isRecord(raw)) {
    return structuredClone(fallback)
  }

  const rulesProfile = sanitizeActiveRulesProfile(raw, fallback)

  return {
    profile: sanitizeProfile(raw.profile, fallback.profile),
    activeRulesProfileId: rulesProfile.activeRulesProfileId,
    activeRulesProfileLabel: rulesProfile.activeRulesProfileLabel,
    runStateModifiers: sanitizeRunStateModifiers(raw.runStateModifiers, fallback.runStateModifiers),
    moduleToggles: sanitizeModuleToggles(raw.moduleToggles, fallback.moduleToggles),
    settingHistory: sanitizeSettingHistory(raw.settingHistory, fallback.settingHistory, campaignWeek),
    compatibility: rulesProfile.compatibility,
  }
}

/** Defensive sanitize: tests and partial fixtures may bypass `hydrateGame`; re-entry is cheap vs sim work. */
export function getCurrentCampaignRulesLedger(game: GameState): CampaignLedgerState {
  const fallback = createSeedCampaignLedger()
  return sanitizeCampaignLedger(game.campaignLedger, fallback)
}

export function getCampaignSettingEffectiveAt(
  game: GameState,
  settingId: string,
  week: number
): string | null {
  const ledger = getCurrentCampaignRulesLedger(game)
  const normalizedId = settingId.trim()
  if (normalizedId.length === 0) {
    return null
  }

  const candidates = ledger.settingHistory.filter(
    (entry) => entry.settingId === normalizedId && entry.effectiveFromWeek <= week
  )

  if (candidates.length === 0) {
    return null
  }

  const best = candidates.reduce((current, entry) => {
    if (entry.effectiveFromWeek > current.effectiveFromWeek) {
      return entry
    }

    if (entry.effectiveFromWeek < current.effectiveFromWeek) {
      return current
    }

    if (entry.changedAtWeek > current.changedAtWeek) {
      return entry
    }

    if (entry.changedAtWeek < current.changedAtWeek) {
      return current
    }

    return entry.id.localeCompare(current.id) >= 0 ? entry : current
  })

  return best.value.length > 0 ? best.value : null
}

export interface CampaignModuleCompatibilityReport {
  activeModuleIds: string[]
  compatible: boolean
  notes: string[]
  warnings: string[]
}

export function buildCampaignModuleCompatibilityReport(game: GameState): CampaignModuleCompatibilityReport {
  const ledger = getCurrentCampaignRulesLedger(game)
  const activeModuleIds = ledger.moduleToggles
    .filter((toggle) => toggle.enabled)
    .map((toggle) => toggle.moduleId)

  return {
    activeModuleIds,
    compatible: ledger.compatibility.compatible,
    notes: [...ledger.compatibility.notes],
    warnings: [...ledger.compatibility.warnings],
  }
}

export interface CampaignRulesSummary {
  headline: string
  lines: readonly string[]
  compatibilitySummary: string
  activeModuleLabels: readonly string[]
}

/** Presentation-only: aligns Front Desk summary with live `game.config` for mirrored modifiers. */
function formatChallengePostureSummaryLine(game: GameState): string {
  const elevated = game.config.challengeModeEnabled
  return `Challenge posture · ${
    elevated ? 'Elevated (challenge mode on)' : 'Standard (challenge mode off)'
  }`
}

/** Presentation-only: mirrors hydrate coercion — attrition only when challenge mode is on. */
function formatDurationModelSummaryLine(game: GameState): string {
  const model = game.config.challengeModeEnabled ? game.config.durationModel : 'capacity'
  const detail =
    model === 'attrition'
      ? 'Attrition model (cross-session operative attrition continuity)'
      : 'Capacity model (no cross-session operative attrition)'
  return `Duration / attrition integrity · ${detail}`
}

function formatRunStateModifierSummaryLine(game: GameState, modifier: CampaignRunStateModifier): string {
  if (modifier.id === 'challenge_posture') {
    return formatChallengePostureSummaryLine(game)
  }

  if (modifier.id === 'duration_model') {
    return formatDurationModelSummaryLine(game)
  }

  return `${modifier.label} · ${modifier.value}`
}

export function buildCampaignRulesSummary(game: GameState): CampaignRulesSummary {
  const ledger = getCurrentCampaignRulesLedger(game)
  const week = game.week
  const effectiveTone = getCampaignSettingEffectiveAt(game, 'toneScopeLabel', week)

  const enabledModules = ledger.moduleToggles.filter((toggle) => toggle.enabled)

  const lines: string[] = [
    `Organization · ${ledger.profile.organizationName}`,
    `Home base · ${ledger.profile.homeBaseLabel} (${ledger.profile.homeBaseId})`,
    `Operational region · ${ledger.profile.operationalRegionLabel} (${ledger.profile.operationalRegionId})`,
    `Major hook · ${ledger.profile.majorHookSummary}`,
    `Doctrine · ${ledger.profile.doctrineLabel}`,
    effectiveTone
      ? `Effective tone / scope (week ${week}) · ${effectiveTone}`
      : `Tone / scope anchor · ${ledger.profile.toneScopeLabel}`,
    `Active rules profile · ${ledger.activeRulesProfileLabel} (${ledger.activeRulesProfileId})`,
    ...ledger.runStateModifiers.map((modifier) => formatRunStateModifierSummaryLine(game, modifier)),
    `Modules on · ${enabledModules.map((toggle) => toggle.label).join(' · ') || '—'}`,
  ]

  const compatibility = buildCampaignModuleCompatibilityReport(game)
  const compatibilitySummary = compatibility.compatible
    ? `Compatibility · OK (${compatibility.notes[0] ?? 'No additional notes.'})`
    : `Compatibility · Review required (${[...compatibility.warnings, ...compatibility.notes].join(' ')})`

  return {
    headline: `${ledger.profile.organizationName} · ${ledger.activeRulesProfileLabel}`,
    lines,
    compatibilitySummary,
    activeModuleLabels: enabledModules.map((toggle) => toggle.label),
  }
}

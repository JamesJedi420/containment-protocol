/**
 * SPE-2740 / SPE-542 slice 1: pure offscreen rival-expedition progress.
 *
 * This module owns an immutable definition + runtime packet and a deterministic
 * single-week transition loop. Callers own persistence, weekly orchestration,
 * casualty derivation, pace penalties, and whether clue signals are surfaced.
 */

import type { ClueClarity } from './investigationExposureClueRegistry'

export type RivalExpeditionPhase = 'searching' | 'extracting' | 'retreating' | 'completed' | 'lost'

export const RIVAL_EXPEDITION_PHASES: readonly RivalExpeditionPhase[] = Object.freeze([
  'searching',
  'extracting',
  'retreating',
  'completed',
  'lost',
])

export interface RivalExpeditionDefinition {
  readonly id: string
  readonly routeId: string
  readonly objectiveId: string
  readonly headStartWeeks: number
  readonly routePace: number
  readonly searchWorkRequired: number
  readonly extractionWeeksRequired: number
  readonly retreatWorkRequired: number
  readonly startingPersonnel: number
}

export interface RivalExpeditionProgressPacket {
  readonly definition: RivalExpeditionDefinition
  readonly phase: RivalExpeditionPhase
  readonly searchProgress: number
  readonly extractionWeeksElapsed: number
  readonly retreatProgress: number
  readonly activePersonnel: number
  readonly cumulativeCasualties: number
  readonly departedWeek: number
  readonly lastAdvancedWeek: number
  readonly completedWeek?: number
  readonly lostWeek?: number
}

export interface RivalExpeditionNormalizationBounds {
  readonly campaignWeek: number
  readonly minimumActiveAdvancedWeek?: number
  readonly maximumAdvancedWeek: number
}

export interface RivalExpeditionWeeklyConditions {
  readonly week: number
  readonly casualties?: number
  readonly pacePenalty?: number
}

export type RivalExpeditionProgressBand = 'early' | 'mid' | 'late' | 'complete' | 'terminal'

export type RivalExpeditionClueKind =
  'casualty_trace' | 'search_trace' | 'extraction_trace' | 'retreat_trace' | 'loss_site'

export interface RivalExpeditionClueSignal {
  readonly id: string
  readonly expeditionId: string
  readonly routeId: string
  readonly objectiveId: string
  readonly week: number
  readonly kind: RivalExpeditionClueKind
  readonly phase: RivalExpeditionPhase
  readonly clarity: ClueClarity
  readonly progressBand: RivalExpeditionProgressBand
}

export type RivalExpeditionValidationCode =
  | 'missing_expedition_id'
  | 'invalid_expedition_id'
  | 'missing_route_id'
  | 'missing_objective_id'
  | 'invalid_head_start_weeks'
  | 'invalid_route_pace'
  | 'invalid_search_work'
  | 'invalid_extraction_duration'
  | 'invalid_retreat_work'
  | 'invalid_starting_personnel'
  | 'invalid_current_week'
  | 'head_start_before_campaign'
  | 'invalid_week'
  | 'invalid_casualties'
  | 'invalid_pace_penalty'
  | 'week_gap'

export interface RivalExpeditionValidationIssue {
  readonly code: RivalExpeditionValidationCode
  readonly detail: string
}

export interface RivalExpeditionValidationResult {
  readonly valid: boolean
  readonly issues: readonly RivalExpeditionValidationIssue[]
}

export interface RivalExpeditionInitializationResult {
  readonly status: 'ready' | 'blocked'
  readonly packet: RivalExpeditionProgressPacket | null
  readonly clueSignals: readonly RivalExpeditionClueSignal[]
  readonly issues: readonly RivalExpeditionValidationIssue[]
}

export interface RivalExpeditionAdvanceResult {
  readonly status: 'advanced' | 'unchanged' | 'blocked'
  readonly packet: RivalExpeditionProgressPacket
  readonly clueSignals: readonly RivalExpeditionClueSignal[]
  readonly issues: readonly RivalExpeditionValidationIssue[]
}

export type RivalExpeditionProgressRegistry = Readonly<
  Record<string, RivalExpeditionProgressPacket>
>

export type RivalExpeditionClueRegistry = Readonly<Record<string, RivalExpeditionClueSignal>>

export interface RivalExpeditionWeekClosePressure {
  readonly casualties: number
  readonly pacePenalty: number
}

export type RivalExpeditionWeekClosePressureRegistry = Readonly<
  Record<string, RivalExpeditionWeekClosePressure>
>

export interface RivalExpeditionRegistryWeekCloseIssue {
  readonly expeditionId: string
  readonly code: 'missing_weekly_conditions' | 'blocked_transition'
  readonly details: readonly RivalExpeditionValidationIssue[]
}

export interface RivalExpeditionRegistryWeekCloseResult {
  readonly packets: RivalExpeditionProgressRegistry
  readonly clues: RivalExpeditionClueRegistry
  readonly issues: readonly RivalExpeditionRegistryWeekCloseIssue[]
}

const TERMINAL_PHASES = new Set<RivalExpeditionPhase>(['completed', 'lost'])
const RIVAL_EXPEDITION_PHASE_SET = new Set<RivalExpeditionPhase>(RIVAL_EXPEDITION_PHASES)
const CLUE_KINDS = new Set<RivalExpeditionClueKind>([
  'casualty_trace',
  'search_trace',
  'extraction_trace',
  'retreat_trace',
  'loss_site',
])
const PROGRESS_BANDS = new Set<RivalExpeditionProgressBand>([
  'early',
  'mid',
  'late',
  'complete',
  'terminal',
])

const CLUE_KIND_ORDER: Readonly<Record<RivalExpeditionClueKind, number>> = Object.freeze({
  casualty_trace: 0,
  search_trace: 1,
  extraction_trace: 2,
  retreat_trace: 3,
  loss_site: 4,
})
const NONTERMINAL_PHASE_ORDER = Object.freeze({
  searching: 0,
  extracting: 1,
  retreating: 2,
} as const)

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isPositiveInteger(value: unknown): value is number {
  return isNonNegativeInteger(value) && value > 0
}

function normalizeId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function isIntegerIndexId(value: string): boolean {
  const numeric = Number(value)
  return (
    Number.isInteger(numeric) &&
    numeric >= 0 &&
    numeric < 4_294_967_295 &&
    String(numeric) === value
  )
}

function freezeIssues(
  issues: readonly RivalExpeditionValidationIssue[]
): readonly RivalExpeditionValidationIssue[] {
  return Object.freeze(issues.map((issue) => Object.freeze({ ...issue })))
}

function validationResult(
  issues: readonly RivalExpeditionValidationIssue[]
): RivalExpeditionValidationResult {
  const frozenIssues = freezeIssues(issues)
  return Object.freeze({
    valid: frozenIssues.length === 0,
    issues: frozenIssues,
  })
}

function freezeDefinition(definition: RivalExpeditionDefinition): RivalExpeditionDefinition {
  return Object.freeze({ ...definition })
}

function freezePacket(packet: RivalExpeditionProgressPacket): RivalExpeditionProgressPacket {
  return Object.freeze({
    ...packet,
    definition: freezeDefinition(packet.definition),
  })
}

function freezeSignals(
  signals: readonly RivalExpeditionClueSignal[]
): readonly RivalExpeditionClueSignal[] {
  return Object.freeze(signals.map((signal) => Object.freeze({ ...signal })))
}

function normalizedDefinition(definition: RivalExpeditionDefinition): RivalExpeditionDefinition {
  return freezeDefinition({
    ...definition,
    id: normalizeId(definition.id),
    routeId: normalizeId(definition.routeId),
    objectiveId: normalizeId(definition.objectiveId),
  })
}

function normalizePersistedDefinition(value: unknown): RivalExpeditionDefinition | null {
  if (!isRecord(value)) {
    return null
  }

  const candidate = {
    id: value.id,
    routeId: value.routeId,
    objectiveId: value.objectiveId,
    headStartWeeks: value.headStartWeeks,
    routePace: value.routePace,
    searchWorkRequired: value.searchWorkRequired,
    extractionWeeksRequired: value.extractionWeeksRequired,
    retreatWorkRequired: value.retreatWorkRequired,
    startingPersonnel: value.startingPersonnel,
  } as RivalExpeditionDefinition

  return validateRivalExpeditionDefinition(candidate).valid ? normalizedDefinition(candidate) : null
}

function hasValidPhaseProgress(
  packet: RivalExpeditionProgressPacket,
  completedWeek: number | undefined,
  lostWeek: number | undefined
): boolean {
  const definition = packet.definition
  const commonBounds =
    packet.searchProgress <= definition.searchWorkRequired &&
    packet.extractionWeeksElapsed <= definition.extractionWeeksRequired &&
    packet.retreatProgress <= definition.retreatWorkRequired &&
    packet.activePersonnel <= definition.startingPersonnel &&
    packet.cumulativeCasualties <= definition.startingPersonnel &&
    packet.activePersonnel + packet.cumulativeCasualties === definition.startingPersonnel &&
    packet.lastAdvancedWeek >= packet.departedWeek - 1

  if (!commonBounds) {
    return false
  }

  switch (packet.phase) {
    case 'searching':
      return (
        packet.activePersonnel > 0 &&
        packet.searchProgress < definition.searchWorkRequired &&
        packet.extractionWeeksElapsed === 0 &&
        packet.retreatProgress === 0 &&
        completedWeek === undefined &&
        lostWeek === undefined
      )
    case 'extracting':
      return (
        packet.activePersonnel > 0 &&
        packet.searchProgress === definition.searchWorkRequired &&
        packet.extractionWeeksElapsed < definition.extractionWeeksRequired &&
        packet.retreatProgress === 0 &&
        completedWeek === undefined &&
        lostWeek === undefined
      )
    case 'retreating':
      return (
        packet.activePersonnel > 0 &&
        packet.searchProgress === definition.searchWorkRequired &&
        packet.extractionWeeksElapsed === definition.extractionWeeksRequired &&
        packet.retreatProgress < definition.retreatWorkRequired &&
        completedWeek === undefined &&
        lostWeek === undefined
      )
    case 'completed':
      return (
        packet.activePersonnel > 0 &&
        packet.searchProgress === definition.searchWorkRequired &&
        packet.extractionWeeksElapsed === definition.extractionWeeksRequired &&
        packet.retreatProgress === definition.retreatWorkRequired &&
        completedWeek === packet.lastAdvancedWeek &&
        completedWeek >= packet.departedWeek &&
        lostWeek === undefined
      )
    case 'lost':
      return (
        packet.activePersonnel === 0 &&
        ((packet.searchProgress < definition.searchWorkRequired &&
          packet.extractionWeeksElapsed === 0 &&
          packet.retreatProgress === 0) ||
          (packet.searchProgress === definition.searchWorkRequired &&
            packet.extractionWeeksElapsed < definition.extractionWeeksRequired &&
            packet.retreatProgress === 0) ||
          (packet.searchProgress === definition.searchWorkRequired &&
            packet.extractionWeeksElapsed === definition.extractionWeeksRequired &&
            packet.retreatProgress < definition.retreatWorkRequired)) &&
        lostWeek === packet.lastAdvancedWeek &&
        lostWeek >= packet.departedWeek &&
        completedWeek === undefined
      )
  }
}

function minimumWeeksForPersistedProgress(packet: RivalExpeditionProgressPacket): number | null {
  const definition = packet.definition
  const searchWeeks = Math.ceil(definition.searchWorkRequired / definition.routePace)
  const retreatWeeks = Math.ceil(definition.retreatWorkRequired / definition.routePace)
  const searchingWeeks = Math.ceil(packet.searchProgress / definition.routePace)
  const retreatingWeeks = Math.ceil(packet.retreatProgress / definition.routePace)

  switch (packet.phase) {
    case 'searching':
      return searchingWeeks
    case 'extracting':
      return searchWeeks + packet.extractionWeeksElapsed
    case 'retreating':
      return searchWeeks + definition.extractionWeeksRequired + retreatingWeeks
    case 'completed':
      return searchWeeks + definition.extractionWeeksRequired + retreatWeeks
    case 'lost':
      if (
        packet.searchProgress < definition.searchWorkRequired &&
        packet.extractionWeeksElapsed === 0 &&
        packet.retreatProgress === 0
      ) {
        return searchingWeeks
      }
      if (
        packet.searchProgress === definition.searchWorkRequired &&
        packet.extractionWeeksElapsed < definition.extractionWeeksRequired &&
        packet.retreatProgress === 0
      ) {
        return searchWeeks + packet.extractionWeeksElapsed
      }
      if (
        packet.searchProgress === definition.searchWorkRequired &&
        packet.extractionWeeksElapsed === definition.extractionWeeksRequired &&
        packet.retreatProgress < definition.retreatWorkRequired
      ) {
        return searchWeeks + definition.extractionWeeksRequired + retreatingWeeks
      }
      return null
  }
}

function hasReachableProgressTimeline(packet: RivalExpeditionProgressPacket): boolean {
  const minimumWeeks = minimumWeeksForPersistedProgress(packet)
  const elapsedProgressWeeks =
    packet.lastAdvancedWeek - packet.departedWeek + (packet.phase === 'lost' ? 0 : 1)
  return minimumWeeks !== null && elapsedProgressWeeks >= minimumWeeks
}

/**
 * Fail-closed hydration/runtime normalization for one persisted packet.
 * Cross-field phase, personnel, counter, and terminal-week invariants must all hold.
 */
export function normalizeRivalExpeditionProgressPacket(
  value: unknown,
  bounds?: RivalExpeditionNormalizationBounds
): RivalExpeditionProgressPacket | null {
  if (!isRecord(value)) {
    return null
  }

  const definition = normalizePersistedDefinition(value.definition)
  if (
    !definition ||
    !RIVAL_EXPEDITION_PHASE_SET.has(value.phase as RivalExpeditionPhase) ||
    !isNonNegativeInteger(value.searchProgress) ||
    !isNonNegativeInteger(value.extractionWeeksElapsed) ||
    !isNonNegativeInteger(value.retreatProgress) ||
    !isNonNegativeInteger(value.activePersonnel) ||
    !isNonNegativeInteger(value.cumulativeCasualties) ||
    !isNonNegativeInteger(value.departedWeek) ||
    !Number.isSafeInteger(value.lastAdvancedWeek) ||
    (value.completedWeek !== undefined && !isNonNegativeInteger(value.completedWeek)) ||
    (value.lostWeek !== undefined && !isNonNegativeInteger(value.lostWeek))
  ) {
    return null
  }

  const completedWeek =
    value.completedWeek === undefined ? undefined : (value.completedWeek as number)
  const lostWeek = value.lostWeek === undefined ? undefined : (value.lostWeek as number)
  const packet: RivalExpeditionProgressPacket = {
    definition,
    phase: value.phase as RivalExpeditionPhase,
    searchProgress: value.searchProgress,
    extractionWeeksElapsed: value.extractionWeeksElapsed,
    retreatProgress: value.retreatProgress,
    activePersonnel: value.activePersonnel,
    cumulativeCasualties: value.cumulativeCasualties,
    departedWeek: value.departedWeek,
    lastAdvancedWeek: value.lastAdvancedWeek as number,
    ...(completedWeek !== undefined ? { completedWeek } : {}),
    ...(lostWeek !== undefined ? { lostWeek } : {}),
  }

  const isWithinCampaignTimeline =
    bounds === undefined ||
    (isNonNegativeInteger(bounds.campaignWeek) &&
      Number.isSafeInteger(bounds.maximumAdvancedWeek) &&
      (bounds.minimumActiveAdvancedWeek === undefined ||
        (Number.isSafeInteger(bounds.minimumActiveAdvancedWeek) &&
          bounds.minimumActiveAdvancedWeek <= bounds.maximumAdvancedWeek)) &&
      bounds.maximumAdvancedWeek <= bounds.campaignWeek &&
      packet.departedWeek <= bounds.campaignWeek &&
      packet.lastAdvancedWeek <= bounds.maximumAdvancedWeek &&
      (TERMINAL_PHASES.has(packet.phase) ||
        bounds.minimumActiveAdvancedWeek === undefined ||
        packet.lastAdvancedWeek >= bounds.minimumActiveAdvancedWeek))

  return hasValidPhaseProgress(packet, completedWeek, lostWeek) &&
    hasReachableProgressTimeline(packet) &&
    isWithinCampaignTimeline
    ? freezePacket(packet)
    : null
}

/** Normalize a packet map by embedded expedition id in deterministic code-unit order. */
export function normalizeRivalExpeditionProgressRegistry(
  value: unknown,
  bounds?: RivalExpeditionNormalizationBounds
): RivalExpeditionProgressRegistry {
  if (!isRecord(value)) {
    return Object.freeze({})
  }

  const entries: [string, RivalExpeditionProgressPacket][] = []
  for (const [registryId, rawPacket] of Object.entries(value)) {
    const packet = normalizeRivalExpeditionProgressPacket(rawPacket, bounds)
    if (packet && registryId === packet.definition.id) {
      entries.push([packet.definition.id, packet])
    }
  }
  entries.sort(([left], [right]) => compareCodeUnits(left, right))

  return Object.freeze(Object.fromEntries(entries))
}

function normalizeRivalExpeditionClueSignal(value: unknown): RivalExpeditionClueSignal | null {
  if (
    !isRecord(value) ||
    !normalizeId(value.id) ||
    !normalizeId(value.expeditionId) ||
    !normalizeId(value.routeId) ||
    !normalizeId(value.objectiveId) ||
    !isNonNegativeInteger(value.week) ||
    !CLUE_KINDS.has(value.kind as RivalExpeditionClueKind) ||
    !RIVAL_EXPEDITION_PHASE_SET.has(value.phase as RivalExpeditionPhase) ||
    !PROGRESS_BANDS.has(value.progressBand as RivalExpeditionProgressBand)
  ) {
    return null
  }

  const signal: RivalExpeditionClueSignal = {
    id: normalizeId(value.id),
    expeditionId: normalizeId(value.expeditionId),
    routeId: normalizeId(value.routeId),
    objectiveId: normalizeId(value.objectiveId),
    week: value.week,
    kind: value.kind as RivalExpeditionClueKind,
    phase: value.phase as RivalExpeditionPhase,
    clarity: value.clarity as ClueClarity,
    progressBand: value.progressBand as RivalExpeditionProgressBand,
  }
  const expectedId = `${signal.expeditionId}:clue:${signal.week}:${signal.kind}`
  const hasValidTransitionShape =
    signal.clarity === clueClarity(signal.kind) &&
    (signal.kind === 'casualty_trace' ||
      (signal.kind === 'search_trace' &&
        signal.phase === 'extracting' &&
        signal.progressBand === 'complete') ||
      (signal.kind === 'extraction_trace' &&
        signal.phase === 'retreating' &&
        signal.progressBand === 'complete') ||
      (signal.kind === 'retreat_trace' &&
        signal.phase === 'completed' &&
        signal.progressBand === 'complete') ||
      (signal.kind === 'loss_site' &&
        signal.phase === 'lost' &&
        signal.progressBand === 'terminal'))

  return signal.id === expectedId && hasValidTransitionShape ? Object.freeze(signal) : null
}

function compareClueSignals(
  left: RivalExpeditionClueSignal,
  right: RivalExpeditionClueSignal
): number {
  return (
    compareCodeUnits(left.expeditionId, right.expeditionId) ||
    left.week - right.week ||
    CLUE_KIND_ORDER[left.kind] - CLUE_KIND_ORDER[right.kind] ||
    compareCodeUnits(left.id, right.id)
  )
}

function clueMatchesOwningPacket(
  signal: RivalExpeditionClueSignal,
  packet: RivalExpeditionProgressPacket
): boolean {
  if (signal.week < packet.departedWeek || signal.week > packet.lastAdvancedWeek) {
    return false
  }

  switch (signal.kind) {
    case 'casualty_trace': {
      if (packet.cumulativeCasualties === 0) {
        return false
      }
      if (signal.phase === 'lost') {
        return packet.phase === 'lost' && signal.week === packet.lostWeek
      }
      if (signal.phase === 'completed') {
        return packet.phase === 'completed' && signal.week === packet.completedWeek
      }
      if (packet.phase === 'completed') {
        return true
      }
      const latestNonterminalPhase =
        packet.phase !== 'lost'
          ? packet.phase
          : packet.searchProgress < packet.definition.searchWorkRequired
            ? 'searching'
            : packet.extractionWeeksElapsed < packet.definition.extractionWeeksRequired
              ? 'extracting'
              : 'retreating'
      return (
        NONTERMINAL_PHASE_ORDER[signal.phase] <= NONTERMINAL_PHASE_ORDER[latestNonterminalPhase]
      )
    }
    case 'search_trace':
      return packet.searchProgress === packet.definition.searchWorkRequired
    case 'extraction_trace':
      return packet.extractionWeeksElapsed === packet.definition.extractionWeeksRequired
    case 'retreat_trace':
      return packet.phase === 'completed' && signal.week === packet.completedWeek
    case 'loss_site':
      return packet.phase === 'lost' && signal.week === packet.lostWeek
  }
}

function filterCollectivelyValidClues(
  signals: readonly RivalExpeditionClueSignal[],
  packet: RivalExpeditionProgressPacket
): readonly RivalExpeditionClueSignal[] {
  const casualties = signals.filter((signal) => signal.kind === 'casualty_trace')
  const search = signals.filter((signal) => signal.kind === 'search_trace')
  const extraction = signals.filter((signal) => signal.kind === 'extraction_trace')
  const retreat = signals.filter((signal) => signal.kind === 'retreat_trace')
  const loss = signals.filter((signal) => signal.kind === 'loss_site')
  const retained: RivalExpeditionClueSignal[] = []

  if (casualties.length <= packet.cumulativeCasualties) {
    retained.push(...casualties)
  }

  const searchWeeks = Math.ceil(packet.definition.searchWorkRequired / packet.definition.routePace)
  const retreatWeeks = Math.ceil(
    packet.definition.retreatWorkRequired / packet.definition.routePace
  )
  const earliestSearchWeek = packet.departedWeek + searchWeeks - 1
  const searchSignal =
    search.length === 1 && search[0]!.week >= earliestSearchWeek ? search[0] : undefined
  if (searchSignal) {
    retained.push(searchSignal)
  }

  const earliestExtractionWeek =
    (searchSignal?.week ?? earliestSearchWeek) + packet.definition.extractionWeeksRequired
  const extractionSignal =
    extraction.length === 1 && extraction[0]!.week >= earliestExtractionWeek
      ? extraction[0]
      : undefined
  if (extractionSignal) {
    retained.push(extractionSignal)
  }

  const earliestRetreatWeek = (extractionSignal?.week ?? earliestExtractionWeek) + retreatWeeks
  const retreatSignal =
    retreat.length === 1 && retreat[0]!.week >= earliestRetreatWeek ? retreat[0] : undefined
  if (retreatSignal) {
    retained.push(retreatSignal)
  }

  if (loss.length === 1) {
    retained.push(loss[0]!)
  }

  if (packet.phase === 'lost') {
    return retained.filter(
      (signal) =>
        signal.kind === 'loss_site' ||
        signal.kind === 'casualty_trace' ||
        signal.week < packet.lostWeek!
    )
  }

  return retained
}

/**
 * Normalize and deduplicate persisted clues in expedition/week/kind order.
 * When packets are supplied, orphaned or definition-mismatched clues fail closed.
 */
export function normalizeRivalExpeditionClueRegistry(
  value: unknown,
  packets?: RivalExpeditionProgressRegistry
): RivalExpeditionClueRegistry {
  if (!isRecord(value)) {
    return Object.freeze({})
  }

  const clueById = new Map<string, RivalExpeditionClueSignal>()
  for (const [registryId, rawSignal] of Object.entries(value)) {
    const signal = normalizeRivalExpeditionClueSignal(rawSignal)
    const packet =
      signal && packets && Object.prototype.hasOwnProperty.call(packets, signal.expeditionId)
        ? packets[signal.expeditionId]
        : undefined
    const matchesPacket =
      !packets ||
      (signal !== null &&
        packet !== undefined &&
        packet.definition.routeId === signal.routeId &&
        packet.definition.objectiveId === signal.objectiveId &&
        clueMatchesOwningPacket(signal, packet))
    if (signal && matchesPacket && registryId === signal.id && !clueById.has(signal.id)) {
      clueById.set(signal.id, signal)
    }
  }

  const sortedSignals = [...clueById.values()].sort(compareClueSignals)
  const retainedIds = new Set<string>()
  if (packets) {
    const signalsByExpedition = new Map<string, RivalExpeditionClueSignal[]>()
    for (const signal of sortedSignals) {
      const signals = signalsByExpedition.get(signal.expeditionId) ?? []
      signals.push(signal)
      signalsByExpedition.set(signal.expeditionId, signals)
    }
    for (const [expeditionId, signals] of signalsByExpedition) {
      const packet = packets[expeditionId]
      if (!packet) {
        continue
      }
      for (const signal of filterCollectivelyValidClues(signals, packet)) {
        retainedIds.add(signal.id)
      }
    }
  }

  return Object.freeze(
    Object.fromEntries(
      sortedSignals
        .filter((signal) => !packets || retainedIds.has(signal.id))
        .map((signal) => [signal.id, signal])
    )
  )
}

export function validateRivalExpeditionDefinition(
  definition: RivalExpeditionDefinition
): RivalExpeditionValidationResult {
  const issues: RivalExpeditionValidationIssue[] = []

  const expeditionId = normalizeId(definition.id)
  if (!expeditionId) {
    issues.push({
      code: 'missing_expedition_id',
      detail: 'Rival expedition definition requires a non-empty id.',
    })
  } else if (isIntegerIndexId(expeditionId)) {
    issues.push({
      code: 'invalid_expedition_id',
      detail: 'Rival expedition id cannot be a JavaScript integer-index property key.',
    })
  }
  if (!normalizeId(definition.routeId)) {
    issues.push({
      code: 'missing_route_id',
      detail: 'Rival expedition definition requires a non-empty routeId.',
    })
  }
  if (!normalizeId(definition.objectiveId)) {
    issues.push({
      code: 'missing_objective_id',
      detail: 'Rival expedition definition requires a non-empty objectiveId.',
    })
  }
  if (!isNonNegativeInteger(definition.headStartWeeks)) {
    issues.push({
      code: 'invalid_head_start_weeks',
      detail: 'headStartWeeks must be a non-negative integer.',
    })
  }
  if (!isPositiveInteger(definition.routePace)) {
    issues.push({
      code: 'invalid_route_pace',
      detail: 'routePace must be a positive integer.',
    })
  }
  if (!isPositiveInteger(definition.searchWorkRequired)) {
    issues.push({
      code: 'invalid_search_work',
      detail: 'searchWorkRequired must be a positive integer.',
    })
  }
  if (!isPositiveInteger(definition.extractionWeeksRequired)) {
    issues.push({
      code: 'invalid_extraction_duration',
      detail: 'extractionWeeksRequired must be a positive integer.',
    })
  }
  if (!isPositiveInteger(definition.retreatWorkRequired)) {
    issues.push({
      code: 'invalid_retreat_work',
      detail: 'retreatWorkRequired must be a positive integer.',
    })
  }
  if (!isPositiveInteger(definition.startingPersonnel)) {
    issues.push({
      code: 'invalid_starting_personnel',
      detail: 'startingPersonnel must be a positive integer.',
    })
  }

  return validationResult(issues)
}

export function validateRivalExpeditionWeeklyConditions(
  conditions: RivalExpeditionWeeklyConditions
): RivalExpeditionValidationResult {
  const issues: RivalExpeditionValidationIssue[] = []

  if (!isNonNegativeInteger(conditions.week)) {
    issues.push({
      code: 'invalid_week',
      detail: 'Rival expedition weekly conditions require a non-negative integer week.',
    })
  }
  if (conditions.casualties !== undefined && !isNonNegativeInteger(conditions.casualties)) {
    issues.push({
      code: 'invalid_casualties',
      detail: 'casualties must be a non-negative integer when provided.',
    })
  }
  if (conditions.pacePenalty !== undefined && !isNonNegativeInteger(conditions.pacePenalty)) {
    issues.push({
      code: 'invalid_pace_penalty',
      detail: 'pacePenalty must be a non-negative integer when provided.',
    })
  }

  return validationResult(issues)
}

function progressRatio(packet: RivalExpeditionProgressPacket): number {
  switch (packet.phase) {
    case 'searching':
      return packet.searchProgress / packet.definition.searchWorkRequired
    case 'extracting':
      return packet.extractionWeeksElapsed / packet.definition.extractionWeeksRequired
    case 'retreating':
      return packet.retreatProgress / packet.definition.retreatWorkRequired
    case 'completed':
      return 1
    case 'lost':
      return 0
  }
}

export function projectRivalExpeditionProgressBand(
  packet: RivalExpeditionProgressPacket
): RivalExpeditionProgressBand {
  if (packet.phase === 'lost') {
    return 'terminal'
  }
  if (packet.phase === 'completed') {
    return 'complete'
  }

  const ratio = Math.max(0, Math.min(1, progressRatio(packet)))
  if (ratio >= 1) {
    return 'complete'
  }
  if (ratio >= 2 / 3) {
    return 'late'
  }
  if (ratio >= 1 / 3) {
    return 'mid'
  }
  return 'early'
}

function clueClarity(kind: RivalExpeditionClueKind): ClueClarity {
  switch (kind) {
    case 'casualty_trace':
    case 'loss_site':
      return 'incomplete'
    case 'search_trace':
    case 'extraction_trace':
    case 'retreat_trace':
      return 'fuzzy'
  }
}

function buildClueSignal(
  packet: RivalExpeditionProgressPacket,
  kind: RivalExpeditionClueKind,
  week: number,
  progressBand = projectRivalExpeditionProgressBand(packet)
): RivalExpeditionClueSignal {
  return {
    id: `${packet.definition.id}:clue:${week}:${kind}`,
    expeditionId: packet.definition.id,
    routeId: packet.definition.routeId,
    objectiveId: packet.definition.objectiveId,
    week,
    kind,
    phase: packet.phase,
    clarity: clueClarity(kind),
    progressBand,
  }
}

/**
 * Builds partial-information hooks from a completed weekly transition.
 * Signals intentionally omit exact work counters, personnel, and casualties.
 */
export function buildRivalExpeditionClueSignals(
  previous: RivalExpeditionProgressPacket,
  next: RivalExpeditionProgressPacket,
  week: number,
  casualtiesApplied: number
): readonly RivalExpeditionClueSignal[] {
  const signals: RivalExpeditionClueSignal[] = []

  if (casualtiesApplied > 0) {
    signals.push(buildClueSignal(next, 'casualty_trace', week))
  }

  if (previous.phase === 'searching' && next.phase === 'extracting') {
    signals.push(buildClueSignal(next, 'search_trace', week, 'complete'))
  } else if (previous.phase === 'extracting' && next.phase === 'retreating') {
    signals.push(buildClueSignal(next, 'extraction_trace', week, 'complete'))
  } else if (previous.phase === 'retreating' && next.phase === 'completed') {
    signals.push(buildClueSignal(next, 'retreat_trace', week, 'complete'))
  }

  if (next.phase === 'lost' && previous.phase !== 'lost') {
    signals.push(buildClueSignal(next, 'loss_site', week, 'terminal'))
  }

  signals.sort((left, right) => CLUE_KIND_ORDER[left.kind] - CLUE_KIND_ORDER[right.kind])
  return freezeSignals(signals)
}

function advanceValidPacket(
  packet: RivalExpeditionProgressPacket,
  conditions: Required<RivalExpeditionWeeklyConditions>
): RivalExpeditionAdvanceResult {
  const casualtiesApplied = Math.min(packet.activePersonnel, conditions.casualties)
  const activePersonnel = packet.activePersonnel - casualtiesApplied
  const cumulativeCasualties = packet.cumulativeCasualties + casualtiesApplied

  let next: RivalExpeditionProgressPacket

  if (activePersonnel === 0) {
    next = freezePacket({
      ...packet,
      phase: 'lost',
      activePersonnel,
      cumulativeCasualties,
      lastAdvancedWeek: conditions.week,
      lostWeek: conditions.week,
    })
  } else {
    const effectivePace = Math.max(0, packet.definition.routePace - conditions.pacePenalty)

    switch (packet.phase) {
      case 'searching': {
        const searchProgress = Math.min(
          packet.definition.searchWorkRequired,
          packet.searchProgress + effectivePace
        )
        next = freezePacket({
          ...packet,
          phase:
            searchProgress >= packet.definition.searchWorkRequired ? 'extracting' : 'searching',
          searchProgress,
          activePersonnel,
          cumulativeCasualties,
          lastAdvancedWeek: conditions.week,
        })
        break
      }
      case 'extracting': {
        const extractionWeeksElapsed = Math.min(
          packet.definition.extractionWeeksRequired,
          packet.extractionWeeksElapsed + 1
        )
        next = freezePacket({
          ...packet,
          phase:
            extractionWeeksElapsed >= packet.definition.extractionWeeksRequired
              ? 'retreating'
              : 'extracting',
          extractionWeeksElapsed,
          activePersonnel,
          cumulativeCasualties,
          lastAdvancedWeek: conditions.week,
        })
        break
      }
      case 'retreating': {
        const retreatProgress = Math.min(
          packet.definition.retreatWorkRequired,
          packet.retreatProgress + effectivePace
        )
        const completed = retreatProgress >= packet.definition.retreatWorkRequired
        next = freezePacket({
          ...packet,
          phase: completed ? 'completed' : 'retreating',
          retreatProgress,
          activePersonnel,
          cumulativeCasualties,
          lastAdvancedWeek: conditions.week,
          ...(completed ? { completedWeek: conditions.week } : {}),
        })
        break
      }
      case 'completed':
      case 'lost':
        next = packet
        break
    }
  }

  return Object.freeze({
    status: 'advanced',
    packet: next,
    clueSignals: buildRivalExpeditionClueSignals(packet, next, conditions.week, casualtiesApplied),
    issues: freezeIssues([]),
  })
}

function weeksUntilWorkComplete(remainingWork: number, pace: number): number {
  return Math.floor((remainingWork - 1) / pace) + 1
}

/**
 * Replays a zero-attrition head start by jumping over ordinary no-clue weeks.
 * The loop is bounded by the three authored phase transitions, even when the
 * definition uses very large safe-integer work or head-start values.
 */
function replayNoAttritionHeadStart(
  initialPacket: RivalExpeditionProgressPacket,
  currentWeek: number
): {
  readonly packet: RivalExpeditionProgressPacket
  readonly clueSignals: readonly RivalExpeditionClueSignal[]
} {
  let packet = initialPacket
  let nextWeek = packet.lastAdvancedWeek + 1
  const clueSignals: RivalExpeditionClueSignal[] = []

  while (nextWeek < currentWeek && !TERMINAL_PHASES.has(packet.phase)) {
    const availableWeeks = currentWeek - nextWeek
    let weeksToTransition: number
    let progressBeforeTransition: number

    switch (packet.phase) {
      case 'searching': {
        const remainingWork = packet.definition.searchWorkRequired - packet.searchProgress
        weeksToTransition = weeksUntilWorkComplete(remainingWork, packet.definition.routePace)

        if (availableWeeks < weeksToTransition) {
          packet = freezePacket({
            ...packet,
            searchProgress: packet.searchProgress + availableWeeks * packet.definition.routePace,
            lastAdvancedWeek: currentWeek - 1,
          })
          nextWeek = currentWeek
          continue
        }

        progressBeforeTransition =
          packet.searchProgress + (weeksToTransition - 1) * packet.definition.routePace
        packet = freezePacket({
          ...packet,
          searchProgress: progressBeforeTransition,
          lastAdvancedWeek: nextWeek + weeksToTransition - 2,
        })
        break
      }
      case 'extracting': {
        weeksToTransition =
          packet.definition.extractionWeeksRequired - packet.extractionWeeksElapsed

        if (availableWeeks < weeksToTransition) {
          packet = freezePacket({
            ...packet,
            extractionWeeksElapsed: packet.extractionWeeksElapsed + availableWeeks,
            lastAdvancedWeek: currentWeek - 1,
          })
          nextWeek = currentWeek
          continue
        }

        packet = freezePacket({
          ...packet,
          extractionWeeksElapsed: packet.extractionWeeksElapsed + weeksToTransition - 1,
          lastAdvancedWeek: nextWeek + weeksToTransition - 2,
        })
        break
      }
      case 'retreating': {
        const remainingWork = packet.definition.retreatWorkRequired - packet.retreatProgress
        weeksToTransition = weeksUntilWorkComplete(remainingWork, packet.definition.routePace)

        if (availableWeeks < weeksToTransition) {
          packet = freezePacket({
            ...packet,
            retreatProgress: packet.retreatProgress + availableWeeks * packet.definition.routePace,
            lastAdvancedWeek: currentWeek - 1,
          })
          nextWeek = currentWeek
          continue
        }

        progressBeforeTransition =
          packet.retreatProgress + (weeksToTransition - 1) * packet.definition.routePace
        packet = freezePacket({
          ...packet,
          retreatProgress: progressBeforeTransition,
          lastAdvancedWeek: nextWeek + weeksToTransition - 2,
        })
        break
      }
      case 'completed':
      case 'lost':
        continue
    }

    const transitionWeek = nextWeek + weeksToTransition - 1
    const advanced = advanceValidPacket(packet, {
      week: transitionWeek,
      casualties: 0,
      pacePenalty: 0,
    })
    packet = advanced.packet
    clueSignals.push(...advanced.clueSignals)
    nextWeek = transitionWeek + 1
  }

  return { packet, clueSignals }
}

export function advanceRivalExpeditionProgress(
  packet: RivalExpeditionProgressPacket,
  conditions: RivalExpeditionWeeklyConditions
): RivalExpeditionAdvanceResult {
  if (!isNonNegativeInteger(conditions.week)) {
    return Object.freeze({
      status: 'blocked',
      packet,
      clueSignals: freezeSignals([]),
      issues: freezeIssues([
        {
          code: 'invalid_week',
          detail: 'Rival expedition weekly conditions require a non-negative integer week.',
        },
      ]),
    })
  }

  if (TERMINAL_PHASES.has(packet.phase) || conditions.week <= packet.lastAdvancedWeek) {
    return Object.freeze({
      status: 'unchanged',
      packet,
      clueSignals: freezeSignals([]),
      issues: freezeIssues([]),
    })
  }

  const validation = validateRivalExpeditionWeeklyConditions(conditions)
  if (!validation.valid) {
    return Object.freeze({
      status: 'blocked',
      packet,
      clueSignals: freezeSignals([]),
      issues: validation.issues,
    })
  }

  const expectedWeek = packet.lastAdvancedWeek + 1
  if (conditions.week !== expectedWeek) {
    return Object.freeze({
      status: 'blocked',
      packet,
      clueSignals: freezeSignals([]),
      issues: freezeIssues([
        {
          code: 'week_gap',
          detail: `Rival expedition ${packet.definition.id} expected week ${expectedWeek}, received ${conditions.week}.`,
        },
      ]),
    })
  }

  return advanceValidPacket(packet, {
    week: conditions.week,
    casualties: conditions.casualties ?? 0,
    pacePenalty: conditions.pacePenalty ?? 0,
  })
}

function invalidExplicitPressureIssues(
  value: Record<string, unknown>
): readonly RivalExpeditionValidationIssue[] {
  const issues: RivalExpeditionValidationIssue[] = []
  if (!isNonNegativeInteger(value.casualties)) {
    issues.push({
      code: 'invalid_casualties',
      detail: 'Week-close casualties must be supplied as a non-negative integer.',
    })
  }
  if (!isNonNegativeInteger(value.pacePenalty)) {
    issues.push({
      code: 'invalid_pace_penalty',
      detail: 'Week-close pacePenalty must be supplied as a non-negative integer.',
    })
  }
  return freezeIssues(issues)
}

/**
 * Advances every valid nonterminal packet once for the supplied closing week.
 * Pressure is caller-owned and must be present for every eligible expedition.
 */
export function advanceRivalExpeditionRegistryAtWeekClose(
  packets: unknown,
  clues: unknown,
  week: number,
  conditionsByExpeditionId: unknown
): RivalExpeditionRegistryWeekCloseResult {
  const normalizedPackets = normalizeRivalExpeditionProgressRegistry(packets, {
    campaignWeek: week,
    minimumActiveAdvancedWeek: week - 1,
    maximumAdvancedWeek: week,
  })
  const normalizedClues = normalizeRivalExpeditionClueRegistry(clues, normalizedPackets)
  const pressureRegistry = isRecord(conditionsByExpeditionId) ? conditionsByExpeditionId : {}
  const nextPackets = new Map<string, RivalExpeditionProgressPacket>()
  const clueById = new Map(Object.entries(normalizedClues))
  const issues: RivalExpeditionRegistryWeekCloseIssue[] = []

  for (const expeditionId of Object.keys(normalizedPackets)) {
    const packet = normalizedPackets[expeditionId]
    if (!packet) {
      continue
    }

    if (TERMINAL_PHASES.has(packet.phase) || week <= packet.lastAdvancedWeek) {
      nextPackets.set(expeditionId, packet)
      continue
    }

    const rawPressure = Object.prototype.hasOwnProperty.call(pressureRegistry, expeditionId)
      ? pressureRegistry[expeditionId]
      : undefined
    if (!isRecord(rawPressure)) {
      nextPackets.set(expeditionId, packet)
      issues.push(
        Object.freeze({
          expeditionId,
          code: 'missing_weekly_conditions',
          details: freezeIssues([]),
        })
      )
      continue
    }

    const pressureIssues = invalidExplicitPressureIssues(rawPressure)
    if (pressureIssues.length > 0) {
      nextPackets.set(expeditionId, packet)
      issues.push(
        Object.freeze({
          expeditionId,
          code: 'blocked_transition',
          details: pressureIssues,
        })
      )
      continue
    }

    const advanced = advanceRivalExpeditionProgress(packet, {
      week,
      casualties: rawPressure.casualties as number,
      pacePenalty: rawPressure.pacePenalty as number,
    })
    nextPackets.set(expeditionId, advanced.packet)

    if (advanced.status === 'blocked') {
      issues.push(
        Object.freeze({
          expeditionId,
          code: 'blocked_transition',
          details: advanced.issues,
        })
      )
      continue
    }

    for (const signal of advanced.clueSignals) {
      if (!clueById.has(signal.id)) {
        clueById.set(signal.id, signal)
      }
    }
  }

  const normalizedNextPackets = normalizeRivalExpeditionProgressRegistry(
    Object.fromEntries(nextPackets)
  )

  return Object.freeze({
    packets: normalizedNextPackets,
    clues: normalizeRivalExpeditionClueRegistry(
      Object.fromEntries(clueById),
      normalizedNextPackets
    ),
    issues: Object.freeze(issues),
  })
}

export function initializeRivalExpeditionProgress(
  definition: RivalExpeditionDefinition,
  currentWeek: number
): RivalExpeditionInitializationResult {
  const definitionValidation = validateRivalExpeditionDefinition(definition)
  const issues = [...definitionValidation.issues]

  if (!isNonNegativeInteger(currentWeek)) {
    issues.push({
      code: 'invalid_current_week',
      detail: 'Rival expedition initialization requires a non-negative integer currentWeek.',
    })
  } else if (
    isNonNegativeInteger(definition.headStartWeeks) &&
    definition.headStartWeeks > currentWeek
  ) {
    issues.push({
      code: 'head_start_before_campaign',
      detail: 'headStartWeeks cannot place expedition departure before campaign week 0.',
    })
  }

  if (issues.length > 0) {
    return Object.freeze({
      status: 'blocked',
      packet: null,
      clueSignals: freezeSignals([]),
      issues: freezeIssues(issues),
    })
  }

  const normalized = normalizedDefinition(definition)
  const departedWeek = currentWeek - normalized.headStartWeeks
  let packet = freezePacket({
    definition: normalized,
    phase: 'searching',
    searchProgress: 0,
    extractionWeeksElapsed: 0,
    retreatProgress: 0,
    activePersonnel: normalized.startingPersonnel,
    cumulativeCasualties: 0,
    departedWeek,
    lastAdvancedWeek: departedWeek - 1,
  })
  const replayed = replayNoAttritionHeadStart(packet, currentWeek)
  packet = replayed.packet

  return Object.freeze({
    status: 'ready',
    packet,
    clueSignals: freezeSignals(replayed.clueSignals),
    issues: freezeIssues([]),
  })
}

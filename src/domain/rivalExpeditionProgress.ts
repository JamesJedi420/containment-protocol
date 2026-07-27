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

const TERMINAL_PHASES = new Set<RivalExpeditionPhase>(['completed', 'lost'])

const CLUE_KIND_ORDER: Readonly<Record<RivalExpeditionClueKind, number>> = Object.freeze({
  casualty_trace: 0,
  search_trace: 1,
  extraction_trace: 2,
  retreat_trace: 3,
  loss_site: 4,
})

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isPositiveInteger(value: unknown): value is number {
  return isNonNegativeInteger(value) && value > 0
}

function normalizeId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
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

export function validateRivalExpeditionDefinition(
  definition: RivalExpeditionDefinition
): RivalExpeditionValidationResult {
  const issues: RivalExpeditionValidationIssue[] = []

  if (!normalizeId(definition.id)) {
    issues.push({
      code: 'missing_expedition_id',
      detail: 'Rival expedition definition requires a non-empty id.',
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

/**
 * SPE-3026 — project SPE-3017 historical-route replays into SPE-2688 explanations.
 *
 * Read/projection only. Does not mutate registry records, does not call SPE-3009
 * create/advance/resolve helpers, and does not import SPE-3024 activation.
 */

import {
  HISTORICAL_ROUTE_CAUSAL_CLASSIFICATION,
  normalizeHistoricalRouteReplayRegistry,
  type HistoricalRouteReplayPhase,
  type HistoricalRouteReplayRecord,
  type HistoricalRouteReplayRegistry,
} from '../../domain/historicalRouteReplay'
import {
  createOperationalExplanationRecord,
  sortOperationalExplanationRecords,
  type OperationalExplanationLifecycle,
  type OperationalExplanationRecord,
  type OperationalExplanationSeverity,
} from '../../domain/operationalExplanation'

export interface HistoricalRouteReplayVisibility {
  readonly knownAnchorIds: readonly string[]
  readonly includeObserverExposures: boolean
  readonly includeFullRoute: boolean
}

const PHASE_PRESENTATION: Record<
  HistoricalRouteReplayPhase,
  {
    readonly severity: OperationalExplanationSeverity
    readonly lifecycle: OperationalExplanationLifecycle
    readonly summary: string
  }
> = {
  approaching: {
    severity: 'pending',
    lifecycle: 'active',
    summary: 'A historical-route replay is approaching along a known path segment.',
  },
  traversing: {
    severity: 'pending',
    lifecycle: 'active',
    summary: 'A historical-route replay is traversing known path segments.',
  },
  terminal: {
    severity: 'uncertain',
    lifecycle: 'active',
    summary: 'A historical-route replay has reached its terminal anchor.',
  },
  ended: {
    severity: 'uncertain',
    lifecycle: 'resolved',
    summary: 'A historical-route replay has ended with an ordinary-world consequence recorded.',
  },
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function knownSet(visibility: HistoricalRouteReplayVisibility): ReadonlySet<string> {
  return new Set(
    visibility.knownAnchorIds.filter((id) => typeof id === 'string' && id.trim().length > 0)
  )
}

function filterKnownAnchors(
  anchorIds: readonly string[],
  known: ReadonlySet<string>
): readonly string[] {
  return Object.freeze(anchorIds.filter((id) => known.has(id)))
}

/**
 * Conservative default: known anchors are exposed ∪ current/origin/terminal;
 * observer exposures and full route dumps stay off.
 */
export function defaultConservativeHistoricalRouteReplayVisibility(
  record: HistoricalRouteReplayRecord
): HistoricalRouteReplayVisibility {
  const known = new Set<string>([
    ...record.exposedAnchorIds,
    record.currentAnchorId,
    record.originAnchorId,
    record.terminalAnchorId,
  ])
  return Object.freeze({
    knownAnchorIds: Object.freeze([...known].sort(compareCodeUnits)),
    includeObserverExposures: false,
    includeFullRoute: false,
  })
}

function phaseReasonCode(phase: HistoricalRouteReplayPhase): string {
  return `historical_route_replay.phase_${phase}`
}

function describeProgression(
  record: HistoricalRouteReplayRecord,
  visibility: HistoricalRouteReplayVisibility,
  known: ReadonlySet<string>
): string {
  const knownCurrent = known.has(record.currentAnchorId) ? record.currentAnchorId : null
  const knownTraversed = filterKnownAnchors(record.traversedAnchorIds, known)

  const parts: string[] = []
  if (knownCurrent) {
    parts.push(`Current known position: ${knownCurrent}.`)
  } else {
    parts.push('Current position is not within authorized knowledge.')
  }
  if (knownTraversed.length > 0) {
    parts.push(`Known traversed anchors: ${knownTraversed.join(', ')}.`)
  }
  if (visibility.includeFullRoute) {
    parts.push(`Full route anchors: ${record.routeAnchorIds.join(', ')}.`)
  }
  return parts.join(' ')
}

function describeObserverExposures(
  record: HistoricalRouteReplayRecord,
  visibility: HistoricalRouteReplayVisibility,
  known: ReadonlySet<string>
): string | undefined {
  if (!visibility.includeObserverExposures || record.observerExposures.length === 0) {
    return undefined
  }

  const visible = record.observerExposures
    .filter((exposure) => known.has(exposure.contactAnchorId))
    .slice()
    .sort((left, right) => compareCodeUnits(left.observerId, right.observerId))

  if (visible.length === 0) return undefined

  return visible
    .map(
      (exposure) =>
        `${exposure.observerId} at ${exposure.contactAnchorId} (${exposure.exposureState}/${exposure.observationState})`
    )
    .join('; ')
}

function describeOrdinaryConsequence(record: HistoricalRouteReplayRecord): string | undefined {
  if (record.phase !== 'ended' || !record.ordinaryConsequence) return undefined
  const consequence = record.ordinaryConsequence
  const subject = consequence.subjectId !== undefined ? ` subject ${consequence.subjectId}` : ''
  return `Ordinary-world consequence ${consequence.consequenceId} (${consequence.kind})${subject} with persistence ${consequence.persistence}.`
}

function unresolvedCausalityClause(): string {
  return `Causal classification remains ${HISTORICAL_ROUTE_CAUSAL_CLASSIFICATION}; mechanical route state is not an identified cause.`
}

export function projectHistoricalRouteReplayExplanation(
  record: HistoricalRouteReplayRecord,
  visibility: HistoricalRouteReplayVisibility
): OperationalExplanationRecord {
  const known = knownSet(visibility)
  const presentation = PHASE_PRESENTATION[record.phase]
  const reasonCode = phaseReasonCode(record.phase)
  const progression = describeProgression(record, visibility, known)
  const observerText = describeObserverExposures(record, visibility, known)
  const consequenceText = describeOrdinaryConsequence(record)

  const causeParts = [`Replay ${record.eventId} is in phase ${record.phase}.`, progression]
  if (observerText) {
    causeParts.push(`Authorized observer contact evidence: ${observerText}.`)
  }
  causeParts.push(unresolvedCausalityClause())

  const currentEffectParts = [progression]
  if (observerText) {
    currentEffectParts.push(
      `Observed contact/post-contact evidence remains limited to authorized exposures.`
    )
  }
  if (consequenceText) {
    currentEffectParts.push(consequenceText)
  }
  currentEffectParts.push(unresolvedCausalityClause())

  const provenance = [
    `historical_route_replay:${record.eventId}`,
    `phase:${record.phase}`,
    `causal:${record.causalClassification}`,
  ]
  if (known.has(record.currentAnchorId)) {
    provenance.push(`current_anchor:${record.currentAnchorId}`)
  }
  if (consequenceText && record.ordinaryConsequence) {
    provenance.push(`ordinary_consequence:${record.ordinaryConsequence.consequenceId}`)
  }

  return createOperationalExplanationRecord({
    source: {
      system: 'historical_route_replay',
      recordType: 'replay_record',
      recordId: record.eventId,
    },
    subjectId: record.eventId,
    reasonCode,
    severity: presentation.severity,
    lifecycle: presentation.lifecycle,
    summary: presentation.summary,
    cause: causeParts.join(' '),
    currentEffect: currentEffectParts.join(' '),
    projectedConsequence: consequenceText,
    confidence: record.phase === 'ended' ? 'supported' : 'limited',
    provenance,
    blockerCodes: [reasonCode],
  })
}

export function getHistoricalRouteReplayOperationalExplanations(
  registry: HistoricalRouteReplayRegistry | unknown,
  visibilityFor: (
    record: HistoricalRouteReplayRecord
  ) => HistoricalRouteReplayVisibility = defaultConservativeHistoricalRouteReplayVisibility
): readonly OperationalExplanationRecord[] {
  const normalized = normalizeHistoricalRouteReplayRegistry(registry)
  const records: OperationalExplanationRecord[] = []

  for (const eventId of Object.keys(normalized).sort(compareCodeUnits)) {
    const replay = normalized[eventId]
    if (!replay) continue
    records.push(projectHistoricalRouteReplayExplanation(replay, visibilityFor(replay)))
  }

  return sortOperationalExplanationRecords(records)
}

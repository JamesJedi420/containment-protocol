/**
 * SPE-2605 / SPE-947: smallest deterministic countermeasure ledger-link surface.
 *
 * Records/resolves SPE-947 counter-memetic (or linked-registry) countermeasure
 * attempts against authored SPE-645-style reliability classes. Authored maps
 * only — no full ward catalog, no SPE-645 rewrite, no propagation graph,
 * no mid-week mutations, no evaluator contract changes.
 */

import {
  EXAMPLE_COUNTER_MEMETIC_PLAN,
  evaluateCounterMemeticUptakeGate,
  type CounterMemeticReadiness,
} from './counterMemeticUptakeGate'
import type { Spe947CounterMemeticPlanRecordsMap } from './spe947EvaluatorPersistence'
import type { VisualTriggerHazardRecordsMap } from './visualTriggerHazardRegistry'

/** SPE-645-style reliability classes — vocabulary only; not the SPE-645 umbrella. */
export const SPE_645_STYLE_RELIABILITY_CLASSES = [
  'false',
  'partial',
  'operative',
  'narrow_context',
  'high_confidence',
] as const

export type Spe645StyleReliabilityClass = (typeof SPE_645_STYLE_RELIABILITY_CLASSES)[number]

export const SPE_947_COUNTERMEASURE_ATTEMPT_KINDS = [
  'counter_memetic_plan',
  'linked_registry',
] as const

export type Spe947CountermeasureAttemptKind = (typeof SPE_947_COUNTERMEASURE_ATTEMPT_KINDS)[number]

/**
 * Authored SPE-645-style reliability ledger entry.
 * Reliability truth lives here — bindings hold ids only (no dual truth).
 */
export interface Spe947CountermeasureReliabilityLedgerEntry {
  readonly id: string
  readonly label: string
  readonly reliabilityClass: Spe645StyleReliabilityClass
}

export type Spe947CountermeasureReliabilityLedgerMap = Record<
  string,
  Spe947CountermeasureReliabilityLedgerEntry
>

/**
 * Authored id-only link from a SPE-947 attempt source to a reliability ledger entry.
 */
export interface Spe947CountermeasureLedgerBinding {
  readonly id: string
  readonly attemptKind: Spe947CountermeasureAttemptKind
  readonly attemptId: string
  readonly reliabilityClassId: string
}

export type Spe947CountermeasureLedgerBindingRecordsMap = Record<
  string,
  Spe947CountermeasureLedgerBinding
>

export type Spe947CountermeasureLedgerLinkStatus =
  | 'resolved'
  | 'missing_attempt'
  | 'missing_reliability_class'

export type Spe947CountermeasureLedgerReasonCode =
  | 'unresolved_link'
  | 'missing_attempt'
  | 'missing_reliability_class'
  | 'reliability_false'
  | 'reliability_partial'
  | 'reliability_operative'
  | 'reliability_narrow_context'
  | 'reliability_high_confidence'
  | 'uptake_blocked'
  | 'uptake_propagating'
  | 'uptake_ready'

export interface Spe947CountermeasureLedgerLinkReading {
  readonly bindingId: string
  readonly attemptKind: Spe947CountermeasureAttemptKind
  readonly attemptId: string
  readonly attemptLabel: string | null
  readonly reliabilityClassId: string
  readonly reliabilityClassLabel: string | null
  readonly reliabilityClass: Spe645StyleReliabilityClass | null
  readonly linkStatus: Spe947CountermeasureLedgerLinkStatus
  readonly uptakeReadiness: CounterMemeticReadiness | null
  readonly reasonCodes: readonly Spe947CountermeasureLedgerReasonCode[]
}

export interface Spe947CountermeasureLedgerLinkMaps {
  readonly spe947CounterMemeticPlans?: Spe947CounterMemeticPlanRecordsMap
  readonly spe947CountermeasureLedgerBindings?: Spe947CountermeasureLedgerBindingRecordsMap
  readonly spe947CountermeasureReliabilityLedger?: Spe947CountermeasureReliabilityLedgerMap
}

function isReliabilityClass(value: unknown): value is Spe645StyleReliabilityClass {
  return (
    typeof value === 'string' &&
    (SPE_645_STYLE_RELIABILITY_CLASSES as readonly string[]).includes(value)
  )
}

function reasonCodeForReliabilityClass(
  reliabilityClass: Spe645StyleReliabilityClass
): Spe947CountermeasureLedgerReasonCode {
  switch (reliabilityClass) {
    case 'false':
      return 'reliability_false'
    case 'partial':
      return 'reliability_partial'
    case 'operative':
      return 'reliability_operative'
    case 'narrow_context':
      return 'reliability_narrow_context'
    case 'high_confidence':
      return 'reliability_high_confidence'
    default: {
      const _exhaustive: never = reliabilityClass
      return _exhaustive
    }
  }
}

function reasonCodeForUptakeReadiness(
  readiness: CounterMemeticReadiness
): Spe947CountermeasureLedgerReasonCode {
  switch (readiness) {
    case 'blocked':
      return 'uptake_blocked'
    case 'propagating':
      return 'uptake_propagating'
    case 'ready':
      return 'uptake_ready'
    default: {
      const _exhaustive: never = readiness
      return _exhaustive
    }
  }
}

function resolveAttemptLabel(input: {
  attemptKind: Spe947CountermeasureAttemptKind
  attemptId: string
  maps: Spe947CountermeasureLedgerLinkMaps
  visualTriggerHazardRecords?: VisualTriggerHazardRecordsMap | null
}): string | null {
  switch (input.attemptKind) {
    case 'counter_memetic_plan': {
      const plan = input.maps.spe947CounterMemeticPlans?.[input.attemptId]
      return plan?.label ?? null
    }
    case 'linked_registry': {
      const record = input.visualTriggerHazardRecords?.[input.attemptId]
      return record?.label ?? null
    }
    default: {
      const _exhaustive: never = input.attemptKind
      return _exhaustive
    }
  }
}

function resolveUptakeReadiness(input: {
  attemptKind: Spe947CountermeasureAttemptKind
  attemptId: string
  maps: Spe947CountermeasureLedgerLinkMaps
}): CounterMemeticReadiness | null {
  if (input.attemptKind !== 'counter_memetic_plan') {
    return null
  }

  const plan = input.maps.spe947CounterMemeticPlans?.[input.attemptId]
  if (!plan) {
    return null
  }

  return evaluateCounterMemeticUptakeGate({ plan }).readiness
}

/**
 * Resolve one authored attempt → SPE-645-style reliability ledger link.
 * Missing attempt or reliability-class ids never throw.
 */
export function resolveSpe947CountermeasureLedgerLink(input: {
  binding: Spe947CountermeasureLedgerBinding
  maps: Spe947CountermeasureLedgerLinkMaps
  visualTriggerHazardRecords?: VisualTriggerHazardRecordsMap | null
}): Spe947CountermeasureLedgerLinkReading {
  const binding = input.binding
  const maps = input.maps ?? {}
  const reasonCodes: Spe947CountermeasureLedgerReasonCode[] = []

  const ledger = maps.spe947CountermeasureReliabilityLedger ?? {}
  const reliabilityEntry = ledger[binding.reliabilityClassId]
  const attemptLabel = resolveAttemptLabel({
    attemptKind: binding.attemptKind,
    attemptId: binding.attemptId,
    maps,
    visualTriggerHazardRecords: input.visualTriggerHazardRecords,
  })

  const hasReliability =
    reliabilityEntry !== undefined && isReliabilityClass(reliabilityEntry.reliabilityClass)
  const hasAttempt = attemptLabel !== null

  if (!hasReliability) {
    reasonCodes.push('missing_reliability_class')
    reasonCodes.push('unresolved_link')
    return Object.freeze({
      bindingId: binding.id,
      attemptKind: binding.attemptKind,
      attemptId: binding.attemptId,
      attemptLabel,
      reliabilityClassId: binding.reliabilityClassId,
      reliabilityClassLabel: null,
      reliabilityClass: null,
      linkStatus: 'missing_reliability_class',
      uptakeReadiness: null,
      reasonCodes: Object.freeze(reasonCodes),
    })
  }

  if (!hasAttempt) {
    reasonCodes.push('missing_attempt')
    reasonCodes.push('unresolved_link')
    return Object.freeze({
      bindingId: binding.id,
      attemptKind: binding.attemptKind,
      attemptId: binding.attemptId,
      attemptLabel: null,
      reliabilityClassId: binding.reliabilityClassId,
      reliabilityClassLabel: reliabilityEntry.label,
      reliabilityClass: reliabilityEntry.reliabilityClass,
      linkStatus: 'missing_attempt',
      uptakeReadiness: null,
      reasonCodes: Object.freeze(reasonCodes),
    })
  }

  const uptakeReadiness = resolveUptakeReadiness({
    attemptKind: binding.attemptKind,
    attemptId: binding.attemptId,
    maps,
  })
  reasonCodes.push(reasonCodeForReliabilityClass(reliabilityEntry.reliabilityClass))
  if (uptakeReadiness !== null) {
    reasonCodes.push(reasonCodeForUptakeReadiness(uptakeReadiness))
  }

  return Object.freeze({
    bindingId: binding.id,
    attemptKind: binding.attemptKind,
    attemptId: binding.attemptId,
    attemptLabel,
    reliabilityClassId: binding.reliabilityClassId,
    reliabilityClassLabel: reliabilityEntry.label,
    reliabilityClass: reliabilityEntry.reliabilityClass,
    linkStatus: 'resolved',
    uptakeReadiness,
    reasonCodes: Object.freeze(reasonCodes),
  })
}

/**
 * Compose ledger-link readings for all authored bindings.
 * Empty bindings → empty list (no-op). Deterministic order by binding id.
 */
export function composeSpe947CountermeasureLedgerLinks(input: {
  maps: Spe947CountermeasureLedgerLinkMaps
  visualTriggerHazardRecords?: VisualTriggerHazardRecordsMap | null
}): readonly Spe947CountermeasureLedgerLinkReading[] {
  const bindings = input.maps.spe947CountermeasureLedgerBindings ?? {}
  const bindingIds = Object.keys(bindings).sort((left, right) => left.localeCompare(right))

  return Object.freeze(
    bindingIds.flatMap((bindingId) => {
      const binding = bindings[bindingId]
      if (!binding) {
        return []
      }

      return [
        resolveSpe947CountermeasureLedgerLink({
          binding,
          maps: input.maps,
          visualTriggerHazardRecords: input.visualTriggerHazardRecords,
        }),
      ]
    })
  )
}

/** Compact EXAMPLE SPE-645-style reliability ledger entry (operative class). */
export const SPE_947_EXAMPLE_RELIABILITY_LEDGER_ENTRY: Spe947CountermeasureReliabilityLedgerEntry =
  Object.freeze({
    id: 'reliability:corrective-lore-operative',
    label: 'Corrective lore operative band',
    reliabilityClass: 'operative',
  })

/**
 * Authored EXAMPLE binding: EXAMPLE counter-memetic plan → operative reliability class.
 */
export const SPE_947_EXAMPLE_COUNTERMEASURE_LEDGER_BINDING: Spe947CountermeasureLedgerBinding =
  Object.freeze({
    id: `spe947-cm-ledger:plan:${EXAMPLE_COUNTER_MEMETIC_PLAN.id}`,
    attemptKind: 'counter_memetic_plan',
    attemptId: EXAMPLE_COUNTER_MEMETIC_PLAN.id,
    reliabilityClassId: SPE_947_EXAMPLE_RELIABILITY_LEDGER_ENTRY.id,
  })

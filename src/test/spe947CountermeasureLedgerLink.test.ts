import { describe, expect, it } from 'vitest'

import { createStartingState } from '../data/startingState'
import {
  evaluateCounterMemeticUptakeGate,
  EXAMPLE_COUNTER_MEMETIC_PLAN,
} from '../domain/counterMemeticUptakeGate'
import {
  composeSpe947CountermeasureLedgerLinks,
  resolveSpe947CountermeasureLedgerLink,
  SPE_947_EXAMPLE_COUNTERMEASURE_LEDGER_BINDING,
  SPE_947_EXAMPLE_RELIABILITY_LEDGER_ENTRY,
} from '../domain/spe947CountermeasureLedgerLink'
import { SPE_947_EXAMPLE_PERSISTENCE_FIXTURE } from '../domain/spe947EvaluatorPersistence'
import { BACKGROUND_FRAGMENT_LATENT_FIXTURE } from '../domain/visualTriggerHazardRegistry'

describe('spe947CountermeasureLedgerLink (SPE-2605 / SPE-947)', () => {
  it('empty bindings compose to an empty list without throwing', () => {
    expect(
      composeSpe947CountermeasureLedgerLinks({
        maps: {
          spe947CountermeasureLedgerBindings: {},
          spe947CountermeasureReliabilityLedger: {},
          spe947CounterMemeticPlans: {},
        },
      })
    ).toEqual([])

    expect(
      composeSpe947CountermeasureLedgerLinks({
        maps: {},
        visualTriggerHazardRecords: {
          [BACKGROUND_FRAGMENT_LATENT_FIXTURE.id]: BACKGROUND_FRAGMENT_LATENT_FIXTURE,
        },
      })
    ).toEqual([])
  })

  it('missing reliability class resolves as missing_reliability_class without throw', () => {
    const reading = resolveSpe947CountermeasureLedgerLink({
      binding: {
        ...SPE_947_EXAMPLE_COUNTERMEASURE_LEDGER_BINDING,
        reliabilityClassId: 'reliability:does-not-exist',
      },
      maps: {
        spe947CounterMemeticPlans: SPE_947_EXAMPLE_PERSISTENCE_FIXTURE.spe947CounterMemeticPlans,
        spe947CountermeasureReliabilityLedger: {
          [SPE_947_EXAMPLE_RELIABILITY_LEDGER_ENTRY.id]: SPE_947_EXAMPLE_RELIABILITY_LEDGER_ENTRY,
        },
      },
    })

    expect(reading.linkStatus).toBe('missing_reliability_class')
    expect(reading.reliabilityClass).toBeNull()
    expect(reading.reliabilityClassLabel).toBeNull()
    expect(reading.uptakeReadiness).toBeNull()
    expect(reading.reasonCodes).toContain('missing_reliability_class')
    expect(reading.reasonCodes).toContain('unresolved_link')
  })

  it('missing attempt resolves as missing_attempt without inventing reliability success', () => {
    const reading = resolveSpe947CountermeasureLedgerLink({
      binding: {
        ...SPE_947_EXAMPLE_COUNTERMEASURE_LEDGER_BINDING,
        attemptId: 'plan:does-not-exist',
      },
      maps: {
        spe947CounterMemeticPlans: SPE_947_EXAMPLE_PERSISTENCE_FIXTURE.spe947CounterMemeticPlans,
        spe947CountermeasureReliabilityLedger: {
          [SPE_947_EXAMPLE_RELIABILITY_LEDGER_ENTRY.id]: SPE_947_EXAMPLE_RELIABILITY_LEDGER_ENTRY,
        },
      },
    })

    expect(reading.linkStatus).toBe('missing_attempt')
    expect(reading.attemptLabel).toBeNull()
    expect(reading.reliabilityClass).toBe('operative')
    expect(reading.uptakeReadiness).toBeNull()
    expect(reading.reasonCodes).toContain('missing_attempt')
    expect(reading.reasonCodes).toContain('unresolved_link')
  })

  it('authored counter-memetic path yields deterministic operative ledger link with uptake ready', () => {
    const readings = composeSpe947CountermeasureLedgerLinks({
      maps: {
        spe947CounterMemeticPlans: SPE_947_EXAMPLE_PERSISTENCE_FIXTURE.spe947CounterMemeticPlans,
        spe947CountermeasureReliabilityLedger: {
          [SPE_947_EXAMPLE_RELIABILITY_LEDGER_ENTRY.id]: SPE_947_EXAMPLE_RELIABILITY_LEDGER_ENTRY,
        },
        spe947CountermeasureLedgerBindings: {
          [SPE_947_EXAMPLE_COUNTERMEASURE_LEDGER_BINDING.id]:
            SPE_947_EXAMPLE_COUNTERMEASURE_LEDGER_BINDING,
        },
      },
    })

    expect(readings).toHaveLength(1)
    expect(readings[0]).toMatchObject({
      bindingId: SPE_947_EXAMPLE_COUNTERMEASURE_LEDGER_BINDING.id,
      attemptKind: 'counter_memetic_plan',
      attemptId: EXAMPLE_COUNTER_MEMETIC_PLAN.id,
      attemptLabel: EXAMPLE_COUNTER_MEMETIC_PLAN.label,
      reliabilityClassId: SPE_947_EXAMPLE_RELIABILITY_LEDGER_ENTRY.id,
      reliabilityClassLabel: SPE_947_EXAMPLE_RELIABILITY_LEDGER_ENTRY.label,
      reliabilityClass: 'operative',
      linkStatus: 'resolved',
      uptakeReadiness: 'ready',
    })
    expect(readings[0]?.reasonCodes).toContain('reliability_operative')
    expect(readings[0]?.reasonCodes).toContain('uptake_ready')
    expect(readings[0]?.reasonCodes).not.toContain('unresolved_link')
  })

  it('linked_registry attempt resolves when visualTriggerHazardRecords contain the id', () => {
    const binding = {
      id: 'spe947-cm-ledger:registry:background-fragment',
      attemptKind: 'linked_registry' as const,
      attemptId: BACKGROUND_FRAGMENT_LATENT_FIXTURE.id,
      reliabilityClassId: SPE_947_EXAMPLE_RELIABILITY_LEDGER_ENTRY.id,
    }

    const reading = resolveSpe947CountermeasureLedgerLink({
      binding,
      maps: {
        spe947CountermeasureReliabilityLedger: {
          [SPE_947_EXAMPLE_RELIABILITY_LEDGER_ENTRY.id]: SPE_947_EXAMPLE_RELIABILITY_LEDGER_ENTRY,
        },
      },
      visualTriggerHazardRecords: {
        [BACKGROUND_FRAGMENT_LATENT_FIXTURE.id]: BACKGROUND_FRAGMENT_LATENT_FIXTURE,
      },
    })

    expect(reading.linkStatus).toBe('resolved')
    expect(reading.attemptLabel).toBe(BACKGROUND_FRAGMENT_LATENT_FIXTURE.label)
    expect(reading.reliabilityClass).toBe('operative')
    expect(reading.uptakeReadiness).toBeNull()
    expect(reading.reasonCodes).toContain('reliability_operative')
    expect(reading.reasonCodes).not.toContain('uptake_ready')
  })

  it('empty defaults do not falsely satisfy uptake AC or invent resolved ledger links', () => {
    const state = createStartingState()
    expect(state.spe947CounterMemeticPlans).toEqual({})

    const decision = evaluateCounterMemeticUptakeGate({ plan: null })
    expect(decision.readiness).toBe('blocked')
    expect(decision.reasonCodes).toContain('missing_plan')

    expect(
      composeSpe947CountermeasureLedgerLinks({
        maps: {
          spe947CounterMemeticPlans: state.spe947CounterMemeticPlans,
          spe947CountermeasureLedgerBindings: {},
          spe947CountermeasureReliabilityLedger: {},
        },
        visualTriggerHazardRecords: state.visualTriggerHazardRecords,
      })
    ).toEqual([])
  })
})

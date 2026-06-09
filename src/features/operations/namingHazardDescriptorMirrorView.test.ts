import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  FORMAL_ALERT_PARTIAL_FIXTURE,
  PUBLIC_RUMOR_CONFLICT_FIXTURE,
} from '../../domain/informationIntakeReport'
import {
  CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
  COMPULSIVE_PHRASE_BRIEFING_FIXTURE,
  DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE,
  projectSafeLabel,
  validateNamingHazardDescriptorRecord,
} from '../../domain/namingHazardDescriptorRegistry'
import {
  formatNamingHazardDescriptorEnumLabel,
  getNamingHazardDescriptorMirrorView,
} from './namingHazardDescriptorMirrorView'

function warningOnlyRecord() {
  return {
    ...CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
    id: 'naming-hazard:canal-warning-only',
    label: 'Canal warning-only naming hazard',
    referenceConstraints: ['compulsive_phrase_risk'] as const,
    compulsivePhraseWatchlist: undefined,
  }
}

describe('namingHazardDescriptorMirrorView (SPE-2116 slice 5)', () => {
  it('returns empty mirror when namingHazardDescriptorRecords map is empty', () => {
    const game = createStartingState()

    expect(game.namingHazardDescriptorRecords).toEqual({})

    const view = getNamingHazardDescriptorMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.totalRecords).toBe(0)
    expect(view.records).toEqual([])
  })

  it('mirrors substitution state and safe-label projections from hydrated records', () => {
    const game = createStartingState()
    game.namingHazardDescriptorRecords = {
      [CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.id]: CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
    }

    const view = getNamingHazardDescriptorMirrorView(game)
    const record = view.records[0]
    const briefingProjection = projectSafeLabel(CANAL_BRIDGE_NAMING_HAZARD_FIXTURE, {
      surface: 'briefing',
    })

    expect(view.isEmpty).toBe(false)
    expect(record?.displayLabel).toBe(briefingProjection.safeLabel)
    expect(record?.displayLabel).not.toBe(CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.label)
    expect(record?.uiSubstitutionPolicyLabel).toBe('Pool Descriptor')
    expect(record?.mapLabelModeLabel).toBe('Descriptor Only')
    expect(record?.safeBriefingLabel).toBe(briefingProjection.safeLabel)
    expect(record?.confidenceLabel).toBe('0.47')
  })

  it('shows intake cross-link labels when reports share topic refs', () => {
    const game = createStartingState()
    game.namingHazardDescriptorRecords = {
      [CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.id]: CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
    }
    game.informationIntakeReports = {
      [PUBLIC_RUMOR_CONFLICT_FIXTURE.id]: PUBLIC_RUMOR_CONFLICT_FIXTURE,
      [FORMAL_ALERT_PARTIAL_FIXTURE.id]: FORMAL_ALERT_PARTIAL_FIXTURE,
    }

    const view = getNamingHazardDescriptorMirrorView(game)
    const record = view.records[0]

    expect(view.summary.crossLinkedCount).toBe(1)
    expect(record?.crossLinkLabels).toEqual([
      `${FORMAL_ALERT_PARTIAL_FIXTURE.id} (${FORMAL_ALERT_PARTIAL_FIXTURE.topicRef})`,
      `${PUBLIC_RUMOR_CONFLICT_FIXTURE.id} (${PUBLIC_RUMOR_CONFLICT_FIXTURE.topicRef})`,
    ])
    expect(record?.intakeTopicRefLabel).toBe('topic:canal-bridge-incident')
  })

  it('shows orchestration week markers and redacted confidence after weekly tick fields', () => {
    const game = createStartingState()
    game.namingHazardDescriptorRecords = {
      [DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE.id]: {
        ...DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE,
        uiSubstitutionPolicy: 'redacted',
        mapLabelMode: 'redacted',
        confidence: 0.25,
        redactedFields: ['confidence'],
        unknownFields: ['orchestration_week:5'],
      },
    }

    const view = getNamingHazardDescriptorMirrorView(game)
    const record = view.records[0]

    expect(view.summary.redactedSubstitutionCount).toBe(1)
    expect(view.summary.confidenceRedactedCount).toBe(1)
    expect(view.summary.orchestratedCount).toBe(1)
    expect(record?.orchestrationWeekLabels).toEqual(['orchestration_week:5'])
    expect(record?.confidenceLabel).toBe('—')
    expect(record?.confidenceRedacted).toBe(true)
    expect(record?.redacted).toBe(true)
    expect(record?.safeBriefingLabel).toBe('[REDACTED]')
  })

  it('still mirrors warning-only records with validation warning labels', () => {
    const warningRecord = warningOnlyRecord()
    expect(validateNamingHazardDescriptorRecord(warningRecord).valid).toBe(true)

    const game = createStartingState()
    game.namingHazardDescriptorRecords = {
      [warningRecord.id]: warningRecord,
    }

    const view = getNamingHazardDescriptorMirrorView(game)
    const record = view.records[0]

    expect(view.summary.totalRecords).toBe(1)
    expect(record?.validationWarningLabels.length).toBe(1)
  })

  it('orders records by id and is byte-stable for repeated mirror builds', () => {
    const game = createStartingState()
    game.namingHazardDescriptorRecords = {
      [CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.id]: CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
      [COMPULSIVE_PHRASE_BRIEFING_FIXTURE.id]: COMPULSIVE_PHRASE_BRIEFING_FIXTURE,
    }

    const view = getNamingHazardDescriptorMirrorView(game)

    expect(view.records.map((record) => record.id)).toEqual([
      COMPULSIVE_PHRASE_BRIEFING_FIXTURE.id,
      CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.id,
    ])

    const first = JSON.stringify(getNamingHazardDescriptorMirrorView(game))
    const second = JSON.stringify(getNamingHazardDescriptorMirrorView(game))

    expect(first).toBe(second)
  })

  it('formats enum labels for CP-neutral UI copy', () => {
    expect(formatNamingHazardDescriptorEnumLabel('pool_with_grid_fallback')).toBe(
      'Pool With Grid Fallback'
    )
    expect(formatNamingHazardDescriptorEnumLabel('compulsive_phrase_risk')).toBe(
      'Compulsive Phrase Risk'
    )
  })
})

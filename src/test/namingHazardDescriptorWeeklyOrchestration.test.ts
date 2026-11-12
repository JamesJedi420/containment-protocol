import { describe, expect, it } from 'vitest'
import {
  CANAL_BRIDGE_NAMING_HAZARD_FIXTURE,
  COMPULSIVE_PHRASE_BRIEFING_FIXTURE,
  DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE,
  type NamingHazardDescriptorRecord,
} from '../domain/namingHazardDescriptorRegistry'
import {
  advanceNamingHazardDescriptorRecordForWeek,
  applyWeeklyNamingHazardDescriptorTick,
} from '../domain/namingHazardDescriptorWeeklyOrchestration'

function baseRecord(
  overrides: Partial<NamingHazardDescriptorRecord> = {}
): NamingHazardDescriptorRecord {
  return {
    id: 'naming-hazard:weekly-orchestration-test',
    label: 'Weekly orchestration test naming hazard',
    trueNameForbidden: true,
    safeDescriptorPool: ['Approved descriptor alpha', 'Approved descriptor beta'],
    uiSubstitutionPolicy: 'pool_descriptor',
    mapLabelMode: 'descriptor_only',
    confidence: 0.84,
    ...overrides,
  }
}

describe('namingHazardDescriptorWeeklyOrchestration (SPE-2116 slice 4)', () => {
  it('is a no-op for an empty map without throwing', () => {
    const empty = {}
    expect(applyWeeklyNamingHazardDescriptorTick(empty, 12)).toBe(empty)
    expect(applyWeeklyNamingHazardDescriptorTick(undefined, 12)).toEqual({})
  })

  it('escalates pool_descriptor to pool_with_grid_fallback on trueNameForbidden records', () => {
    const record = baseRecord()
    const advanced = advanceNamingHazardDescriptorRecordForWeek(record, 1)

    expect(advanced).not.toBe(record)
    expect(advanced.uiSubstitutionPolicy).toBe('pool_with_grid_fallback')
    expect(advanced.mapLabelMode).toBe('descriptor_only')
    expect(advanced.safeDescriptorPool).toEqual(record.safeDescriptorPool)
    expect(advanced.unknownFields).toEqual(['orchestration_week:1'])
  })

  it('escalates pool_with_grid_fallback to redacted and syncs mapLabelMode', () => {
    const record = baseRecord({ uiSubstitutionPolicy: 'pool_with_grid_fallback' })
    const advanced = advanceNamingHazardDescriptorRecordForWeek(record, 2)

    expect(advanced).not.toBe(record)
    expect(advanced.uiSubstitutionPolicy).toBe('redacted')
    expect(advanced.mapLabelMode).toBe('redacted')
    expect(advanced.unknownFields).toEqual(['orchestration_week:2'])
  })

  it('escalates grid_ref to redacted and syncs mapLabelMode', () => {
    const record = baseRecord({ uiSubstitutionPolicy: 'grid_ref', mapLabelMode: 'grid_ref' })
    const advanced = advanceNamingHazardDescriptorRecordForWeek(record, 3)

    expect(advanced.uiSubstitutionPolicy).toBe('redacted')
    expect(advanced.mapLabelMode).toBe('redacted')
  })

  it('skips substitution hardening when policy is already redacted and confidence is absent', () => {
    const record = baseRecord({
      uiSubstitutionPolicy: 'redacted',
      mapLabelMode: 'redacted',
      confidence: undefined,
    })

    const advanced = advanceNamingHazardDescriptorRecordForWeek(record, 1)

    expect(advanced).toBe(record)
  })

  it('erodes confidence when substitution hardening does not apply', () => {
    const record = baseRecord({
      trueNameForbidden: false,
      uiSubstitutionPolicy: 'pool_descriptor',
      confidence: 0.84,
    })

    const advanced = advanceNamingHazardDescriptorRecordForWeek(record, 4)

    expect(advanced).not.toBe(record)
    expect(advanced.confidence).toBe(0.82)
    expect(advanced.redactedFields).toBeUndefined()
    expect(advanced.unknownFields).toEqual(['orchestration_week:4'])
  })

  it('appends confidence to redactedFields at the erosion floor', () => {
    const record = baseRecord({
      trueNameForbidden: false,
      uiSubstitutionPolicy: 'pool_descriptor',
      confidence: 0.26,
    })

    const advanced = advanceNamingHazardDescriptorRecordForWeek(record, 5)

    expect(advanced.confidence).toBe(0.25)
    expect(advanced.redactedFields).toEqual(['confidence'])
    expect(advanced.unknownFields).toEqual(['orchestration_week:5'])
  })

  it('is idempotent when re-applied after advance for the same week', () => {
    const record = baseRecord()
    const once = advanceNamingHazardDescriptorRecordForWeek(record, 1)
    const twice = advanceNamingHazardDescriptorRecordForWeek(once, 1)

    expect(twice).toBe(once)
    expect(twice.uiSubstitutionPolicy).toBe('pool_with_grid_fallback')
  })

  it('does not mutate invalid post-tick records', () => {
    const record = baseRecord({
      safeDescriptorPool: [''],
    })

    const advanced = advanceNamingHazardDescriptorRecordForWeek(record, 1)

    expect(advanced).toBe(record)
  })

  it('preserves warning-only compulsive phrase fixtures except allowed policy escalation', () => {
    const advanced = advanceNamingHazardDescriptorRecordForWeek(COMPULSIVE_PHRASE_BRIEFING_FIXTURE, 1)

    expect(advanced).not.toBe(COMPULSIVE_PHRASE_BRIEFING_FIXTURE)
    expect(advanced.uiSubstitutionPolicy).toBe('pool_with_grid_fallback')
    expect(advanced.compulsivePhraseWatchlist).toEqual(
      COMPULSIVE_PHRASE_BRIEFING_FIXTURE.compulsivePhraseWatchlist
    )
    expect(advanced.briefingTemplateSnippet).toBe(
      COMPULSIVE_PHRASE_BRIEFING_FIXTURE.briefingTemplateSnippet
    )
  })

  it('preserves safeDescriptorPool order for shipped fixtures', () => {
    const coastal = advanceNamingHazardDescriptorRecordForWeek(
      DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE,
      1
    )

    expect(coastal.safeDescriptorPool).toEqual(DESCRIPTOR_ONLY_GRID_FALLBACK_FIXTURE.safeDescriptorPool)
    expect(coastal.uiSubstitutionPolicy).toBe('redacted')

    const canal = advanceNamingHazardDescriptorRecordForWeek(CANAL_BRIDGE_NAMING_HAZARD_FIXTURE, 1)

    expect(canal.safeDescriptorPool).toEqual(CANAL_BRIDGE_NAMING_HAZARD_FIXTURE.safeDescriptorPool)
    expect(canal.uiSubstitutionPolicy).toBe('pool_with_grid_fallback')
  })

  it('applies tick in stable id order without mutating unchanged records', () => {
    const mutable = baseRecord({ id: 'naming-hazard:mutable' })
    const terminal = baseRecord({
      id: 'naming-hazard:terminal',
      uiSubstitutionPolicy: 'redacted',
      mapLabelMode: 'redacted',
      confidence: 0.25,
      redactedFields: ['confidence'],
    })
    const map = {
      [terminal.id]: terminal,
      [mutable.id]: mutable,
    }

    const next = applyWeeklyNamingHazardDescriptorTick(map, 6)

    expect(next[mutable.id]?.uiSubstitutionPolicy).toBe('pool_with_grid_fallback')
    expect(next[terminal.id]).toBe(terminal)
  })
})

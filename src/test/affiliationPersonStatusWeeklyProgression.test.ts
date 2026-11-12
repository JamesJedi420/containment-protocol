import { describe, expect, it } from 'vitest'

import type {
  AffiliationPersonStatusRecord,
  AffiliationPersonStatusRecordsMap,
} from '../domain/affiliationPersonStatusRecords'
import { buildWeeklyAffiliationPersonStatusProgressionReportNotes } from '../domain/affiliationPersonStatusWeeklyReportNotes'
import {
  advanceAffiliationPersonStatusRecordForWeek,
  applyWeeklyAffiliationPersonStatusProgressionTick,
} from '../domain/affiliationPersonStatusWeeklyProgression'

function record(
  overrides: Partial<AffiliationPersonStatusRecord> = {}
): AffiliationPersonStatusRecord {
  return {
    id: 'person-status:contractor-weekly',
    subjectId: 'subject:contractor-weekly',
    subjectLabel: 'Weekly Contractor',
    candidateRef: 'candidate:contractor-weekly',
    backgroundCleared: false,
    trainingCompleted: false,
    oathContractSigned: false,
    grantedSiteIds: ['site:old'],
    restrictedFacilityIds: ['facility:old'],
    ...overrides,
  }
}

describe('affiliation person-status weekly progression', () => {
  it('treats an empty map as a no-op', () => {
    const records: AffiliationPersonStatusRecordsMap = {}

    expect(applyWeeklyAffiliationPersonStatusProgressionTick(records, 6)).toBe(records)
  })

  it('merges due onboarding and access evidence at the target week', () => {
    const source = record({
      weeklyProgression: [
        {
          id: 'progression:week-6',
          week: 6,
          backgroundCleared: true,
          trainingCompleted: true,
          grantedSiteIds: ['site:new', 'site:old'],
          blockedFacilityIds: ['facility:blocked'],
          protectedReviewEvidenceRefs: ['review:protected'],
        },
      ],
    })

    const advanced = advanceAffiliationPersonStatusRecordForWeek(source, 6)

    expect(advanced).not.toBe(source)
    expect(advanced.backgroundCleared).toBe(true)
    expect(advanced.trainingCompleted).toBe(true)
    expect(advanced.grantedSiteIds).toEqual(['site:new', 'site:old'])
    expect(advanced.restrictedFacilityIds).toEqual(['facility:old'])
    expect(advanced.blockedFacilityIds).toEqual(['facility:blocked'])
    expect(advanced.protectedReviewEvidenceRefs).toEqual(['review:protected'])
    expect(advanced.weeklyProgression).toEqual(source.weeklyProgression)
  })

  it('does not apply future entries early', () => {
    const source = record({
      weeklyProgression: [
        {
          id: 'progression:week-8',
          week: 8,
          oathContractSigned: true,
          grantedFacilityIds: ['facility:new'],
        },
      ],
    })

    expect(advanceAffiliationPersonStatusRecordForWeek(source, 7)).toBe(source)
  })

  it('is idempotent across repeated ticks for the same due evidence', () => {
    const source = record({
      weeklyProgression: [
        {
          id: 'progression:week-6',
          week: 6,
          backgroundCleared: true,
          grantedSiteIds: ['site:new'],
        },
      ],
    })
    const records = { [source.id]: source }

    const once = applyWeeklyAffiliationPersonStatusProgressionTick(records, 6)
    const twice = applyWeeklyAffiliationPersonStatusProgressionTick(once, 6)

    expect(twice).toBe(once)
    expect(twice[source.id]).toBe(once[source.id])
  })

  it('preserves unchanged record references', () => {
    const source = record({
      backgroundCleared: true,
      weeklyProgression: [
        {
          id: 'progression:already-applied',
          week: 5,
          backgroundCleared: true,
          grantedSiteIds: ['site:old'],
        },
      ],
    })
    const unchanged = record({
      id: 'person-status:unchanged',
      weeklyProgression: [],
    })
    const records = {
      [source.id]: source,
      [unchanged.id]: unchanged,
    }

    const advanced = applyWeeklyAffiliationPersonStatusProgressionTick(records, 6)

    expect(advanced).toBe(records)
    expect(advanced[source.id]).toBe(source)
    expect(advanced[unchanged.id]).toBe(unchanged)
  })
})

describe('affiliation person-status weekly progression report notes', () => {
  it('does not emit a note when bounded fields did not change', () => {
    const source = record()

    expect(
      buildWeeklyAffiliationPersonStatusProgressionReportNotes({
        priorRecords: { [source.id]: source },
        nextRecords: { [source.id]: source },
        week: 6,
        sequenceStart: 1,
      })
    ).toEqual([])
  })

  it('emits a note for onboarding evidence changes', () => {
    const prior = record()
    const next = { ...prior, trainingCompleted: true }

    const notes = buildWeeklyAffiliationPersonStatusProgressionReportNotes({
      priorRecords: { [prior.id]: prior },
      nextRecords: { [next.id]: next },
      week: 6,
      sequenceStart: 1,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.type).toBe('affiliation_person_status.weekly_progression')
    expect(notes[0]?.content).toContain('Onboarding evidence changed')
    expect(notes[0]?.metadata).toEqual({
      recordId: prior.id,
      transitionKinds: ['onboarding_evidence_changed'],
      structuredReasons: ['onboarding:trainingCompleted'],
      week: 6,
    })
  })

  it('emits a note for site and facility access evidence changes', () => {
    const prior = record()
    const next = {
      ...prior,
      grantedSiteIds: ['site:new', 'site:old'],
      blockedFacilityIds: ['facility:blocked'],
    }

    const notes = buildWeeklyAffiliationPersonStatusProgressionReportNotes({
      priorRecords: { [prior.id]: prior },
      nextRecords: { [next.id]: next },
      week: 6,
      sequenceStart: 1,
    })

    expect(notes).toHaveLength(1)
    expect(notes[0]?.content).toContain('Site access evidence changed')
    expect(notes[0]?.content).toContain('Facility access evidence changed')
    expect(notes[0]?.metadata?.transitionKinds).toEqual([
      'facility_access_evidence_changed',
      'site_access_evidence_changed',
    ])
    expect(Object.keys(notes[0]?.metadata ?? {}).sort()).toEqual([
      'recordId',
      'structuredReasons',
      'transitionKinds',
      'week',
    ])
  })
})

import { describe, expect, it } from 'vitest'
import {
  createInstitutionCalendarEntry,
  listActiveInstitutionCalendarEntries,
  projectInstitutionAvailabilityShift,
} from '../domain/institutionCalendar'
import { resolveCalendarConfig } from '../domain/campaignCalendar'

describe('SPE-700 institution calendars and availability shifts', () => {
  const calendar = resolveCalendarConfig({ weeksPerYear: 52 })

  const feast = createInstitutionCalendarEntry({
    entryId: 'rite-autumn-collection',
    institutionProfileId: 'inst-sanctum',
    label: 'Autumn Collection',
    recurrence: { kind: 'annual_week_of_year', weekOfYear: 40 },
    effects: [
      { kind: 'public_access', delta: 1, reason: 'collection open to public' },
      { kind: 'crowding', delta: 2, reason: 'pilgrim crowding' },
      { kind: 'staffing', delta: -1, reason: 'clerics redirected to collection' },
    ],
  })

  const vigil = createInstitutionCalendarEntry({
    entryId: 'rite-biweekly-vigil',
    institutionProfileId: 'inst-sanctum',
    label: 'Biweekly Vigil',
    recurrence: { kind: 'interval', everyWeeks: 2, anchorAbsoluteWeek: 10 },
    effects: [{ kind: 'ritual_behavior', delta: 1, reason: 'vigil observance' }],
  })

  const oneOff = createInstitutionCalendarEntry({
    entryId: 'rite-founding',
    institutionProfileId: 'inst-sanctum',
    label: 'Founding Observance',
    recurrence: { kind: 'once', absoluteWeek: 12 },
    effects: [{ kind: 'public_access', delta: -2, reason: 'grounds closed for founding rite' }],
  })

  it('changes availability deterministically for a one-off calendar event', () => {
    const activeWeek = projectInstitutionAvailabilityShift({
      institutionProfileId: 'inst-sanctum',
      absoluteWeek: 12,
      entries: [oneOff, feast, vigil],
      calendarConfig: calendar,
    })
    expect(activeWeek.activeEntryIds).toEqual(['rite-founding'])
    expect(activeWeek.publicAccessDelta).toBe(-2)
    expect(activeWeek.reasons).toContain('grounds closed for founding rite')

    const quietWeek = projectInstitutionAvailabilityShift({
      institutionProfileId: 'inst-sanctum',
      absoluteWeek: 13,
      entries: [oneOff, feast, vigil],
      calendarConfig: calendar,
    })
    expect(quietWeek.activeEntryIds).toEqual([])
    expect(quietWeek.publicAccessDelta).toBe(0)
  })

  it('applies recurring annual and interval events to staffing/crowding/access', () => {
    // absoluteWeek 39 → weekOfYear 40 under default epoch (week 0 = Y1W1).
    const annual = projectInstitutionAvailabilityShift({
      institutionProfileId: 'inst-sanctum',
      absoluteWeek: 39,
      entries: [feast, vigil],
      calendarConfig: calendar,
    })
    expect(annual.weekOfYear).toBe(40)
    expect(annual.activeEntryIds).toContain('rite-autumn-collection')
    expect(annual.crowdingDelta).toBe(2)
    expect(annual.staffingDelta).toBe(-1)
    expect(annual.publicAccessDelta).toBe(1)

    const vigilWeek = projectInstitutionAvailabilityShift({
      institutionProfileId: 'inst-sanctum',
      absoluteWeek: 12,
      entries: [vigil],
      calendarConfig: calendar,
    })
    expect(vigilWeek.activeEntryIds).toEqual(['rite-biweekly-vigil'])
    expect(vigilWeek.ritualBehaviorDelta).toBe(1)

    const offVigil = projectInstitutionAvailabilityShift({
      institutionProfileId: 'inst-sanctum',
      absoluteWeek: 13,
      entries: [vigil],
      calendarConfig: calendar,
    })
    expect(offVigil.activeEntryIds).toEqual([])
    expect(offVigil.ritualBehaviorDelta).toBe(0)
  })

  it('lists active entries deterministically and ignores other institutions', () => {
    const listed = listActiveInstitutionCalendarEntries(
      [feast, vigil, oneOff],
      12,
      calendar,
    )
    expect(listed.map((entry) => entry.entryId).sort()).toEqual([
      'rite-biweekly-vigil',
      'rite-founding',
    ])

    const other = projectInstitutionAvailabilityShift({
      institutionProfileId: 'inst-other',
      absoluteWeek: 12,
      entries: [oneOff, vigil],
      calendarConfig: calendar,
    })
    expect(other.activeEntryIds).toEqual([])
  })

  it('rejects empty-effect calendar entries', () => {
    expect(() =>
      createInstitutionCalendarEntry({
        entryId: 'bad',
        institutionProfileId: 'inst-sanctum',
        label: 'Empty',
        recurrence: { kind: 'once', absoluteWeek: 1 },
        effects: [],
      }),
    ).toThrow(/at least one effect/)
  })
})

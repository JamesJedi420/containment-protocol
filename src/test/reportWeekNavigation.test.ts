import { describe, expect, it } from 'vitest'
import { buildReportWeekNavigation } from '../features/report/reportWeekNavigation'

describe('buildReportWeekNavigation', () => {
  const reports = [{ week: 1 }, { week: 2 }, { week: 4 }, { week: 4 }]

  it('returns adjacent weeks that have reports', () => {
    expect(buildReportWeekNavigation(reports, 2)).toEqual({
      previousWeek: 1,
      nextWeek: 4,
    })
  })

  it('omits previous on the first report and next on the last', () => {
    expect(buildReportWeekNavigation(reports, 1)).toEqual({ nextWeek: 2 })
    expect(buildReportWeekNavigation(reports, 4)).toEqual({ previousWeek: 2 })
  })

  it('returns empty navigation when the current week is unknown', () => {
    expect(buildReportWeekNavigation(reports, 99)).toEqual({})
  })

  it('returns empty navigation for a single report', () => {
    expect(buildReportWeekNavigation([{ week: 3 }], 3)).toEqual({})
  })

  it('dedupes and sorts weeks regardless of report array order', () => {
    const unsorted = [{ week: 4 }, { week: 1 }, { week: 2 }, { week: 2 }]

    expect(buildReportWeekNavigation(unsorted, 2)).toEqual({
      previousWeek: 1,
      nextWeek: 4,
    })
  })
})

import { describe, expect, it } from 'vitest'
import { FULL_SITE_ALERT_STAGE, readFullSiteAlertStage } from '../domain/siteAlertStage'

describe('SPE-3008 canonical full-site-alert stage', () => {
  it('returns full_site_alert only for that exact id', () => {
    expect(readFullSiteAlertStage(FULL_SITE_ALERT_STAGE)).toBe('full_site_alert')
    expect(readFullSiteAlertStage('full_site_alert')).toBe(FULL_SITE_ALERT_STAGE)
  })

  it('returns null for a missing or non-qualifying value', () => {
    const rejected = [
      undefined,
      null,
      '',
      ' ',
      'full_mobilization',
      'local_awareness',
      'partial_site_alert',
      'siteWide',
      'site_wide',
      true,
      false,
      1,
      'route_link',
      'contamination',
      'alarm',
      'panic',
      'visibility',
      'airflow',
      'spatial_adjacency',
      { stage: FULL_SITE_ALERT_STAGE },
      [FULL_SITE_ALERT_STAGE],
    ]

    for (const value of rejected) {
      expect(readFullSiteAlertStage(value)).toBeNull()
    }
  })

  it('does not mutate a non-qualifying record', () => {
    const record = { siteWide: true, stage: 'local_awareness' }
    expect(readFullSiteAlertStage(record)).toBeNull()
    expect(record).toEqual({ siteWide: true, stage: 'local_awareness' })
  })
})

import { describe, expect, it } from 'vitest'
import { resolveStakeholderNotifications } from '../domain/stakeholderNotificationMatrix'

describe('stakeholder notification matrix (SPE-911)', () => {
  it('routes different stakeholder sets by impact and sensitivity', () => {
    const low = resolveStakeholderNotifications({
      incidentId: 'inc-low',
      impactCategory: 'low',
      sensitivity: 'public',
      hasFormalPartner: false,
    })
    const highClassified = resolveStakeholderNotifications({
      incidentId: 'inc-high',
      impactCategory: 'critical',
      sensitivity: 'classified',
      hasFormalPartner: false,
    })

    const lowStakeholders = low.duties.map((d) => d.stakeholder)
    const highStakeholders = highClassified.duties.map((d) => d.stakeholder)

    expect(lowStakeholders).toEqual(['leadership'])
    expect(highStakeholders).toContain('local_authorities')
    expect(highStakeholders).toContain('centralized_oversight')
    expect(highStakeholders).not.toEqual(lowStakeholders)
  })

  it('escalates on acknowledgement timeout', () => {
    const outcome = resolveStakeholderNotifications({
      incidentId: 'inc-esc',
      impactCategory: 'medium',
      sensitivity: 'public',
      hasFormalPartner: false,
      acknowledgementMinutes: 45,
    })
    const escalations = outcome.duties.filter((d) => d.escalates)
    expect(escalations.length).toBeGreaterThan(0)
    expect(escalations[0].reason).toContain('acknowledgement timeout')
  })

  it('routes formal partners differently from general audience', () => {
    const general = resolveStakeholderNotifications({
      incidentId: 'inc-gen',
      impactCategory: 'medium',
      sensitivity: 'public',
      hasFormalPartner: false,
    })
    const partner = resolveStakeholderNotifications({
      incidentId: 'inc-part',
      impactCategory: 'medium',
      sensitivity: 'public',
      hasFormalPartner: true,
    })

    expect(general.duties.some((d) => d.stakeholder === 'external_partners')).toBe(false)
    expect(partner.duties.some((d) => d.stakeholder === 'external_partners')).toBe(true)
  })

  it('changes channel for restricted sensitivity', () => {
    const restricted = resolveStakeholderNotifications({
      incidentId: 'inc-rest',
      impactCategory: 'low',
      sensitivity: 'restricted',
      hasFormalPartner: false,
    })
    const legal = restricted.duties.find((d) => d.stakeholder === 'legal')
    expect(legal).toBeDefined()
    expect(legal?.channel).toBe('direct_call')
  })
})

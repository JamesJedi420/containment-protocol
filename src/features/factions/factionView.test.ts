import '../../test/setup'
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { getFactionPageView } from './factionView'
import type { OperationEvent } from '../../domain/models'

describe('factionView', () => {
  it('keeps contact relationship separate from faction-wide standing and preserves hidden-effect uncertainty', () => {
    const state = createStartingState()
    state.factions!.institutions.reputation = 45
    const institutionContacts = state.factions!.institutions.contacts ?? []
    state.factions!.institutions.contacts = institutionContacts.map((contact) =>
      contact.id === 'institutions-halden'
        ? {
            ...contact,
            relationship: -60,
            status: 'hostile',
          }
        : contact
    )

    const view = getFactionPageView(state)
    const institutions = view.factions.find((faction) => faction.id === 'institutions')
    const halden = institutions?.contacts.find((contact) => contact.id === 'institutions-halden')

    expect(institutions?.postureLabel).toMatch(/Friendly/i)
    expect(institutions?.hiddenSummary).toMatch(/unknown influence detected/i)
    expect(halden?.relationshipLabel).toBe('-60 / hostile')
  })

  it('prioritizes active and recently active contacts before lower-visibility channels', () => {
    const state = createStartingState()
    const institutionContacts = state.factions!.institutions.contacts ?? []
    state.factions!.institutions.contacts = institutionContacts.map((contact) =>
      contact.id === 'institutions-halden'
        ? {
            ...contact,
            relationship: -12,
            status: 'inactive',
          }
        : contact
    )
    state.events = [
      {
        id: 'evt-contact-vell',
        schemaVersion: 2,
        type: 'faction.standing_changed',
        sourceSystem: 'faction',
        timestamp: '2042-01-08T00:00:00.003Z',
        payload: {
          week: 2,
          factionId: 'institutions',
          factionName: 'Academic Institutions',
          delta: 1,
          standingBefore: 2,
          standingAfter: 3,
          reason: 'recruitment.hired',
          interactionLabel: 'Archive follow-up',
          contactId: 'institutions-vell',
          contactName: 'Jonah Vell',
          contactDelta: 1,
        },
      },
    ] as OperationEvent[]

    const view = getFactionPageView(state)
    const institutions = view.factions.find((faction) => faction.id === 'institutions')

    expect(institutions?.contacts[0]?.id).toBe('institutions-vell')
    expect(institutions?.contacts[0]?.summary).toMatch(/recent channel event/i)
  })

  it('builds bounded recent activity from canonical faction events', () => {
    const state = createStartingState()
    state.events = [
      {
        id: 'evt-faction-unlock',
        schemaVersion: 2,
        type: 'faction.unlock_available',
        sourceSystem: 'faction',
        timestamp: '2042-01-08T00:00:00.002Z',
        payload: {
          week: 2,
          factionId: 'institutions',
          factionName: 'Academic Institutions',
          contactId: 'institutions-halden',
          contactName: 'Miren Halden',
          label: 'Research fellowship',
          summary: 'A new fellowship referral channel is available.',
          disposition: 'supportive',
        },
      },
      {
        id: 'evt-standing-hired',
        schemaVersion: 2,
        type: 'faction.standing_changed',
        sourceSystem: 'faction',
        timestamp: '2042-01-08T00:00:00.003Z',
        payload: {
          week: 2,
          factionId: 'institutions',
          factionName: 'Academic Institutions',
          delta: 3,
          standingBefore: 4,
          standingAfter: 5,
          reason: 'recruitment.hired',
          interactionLabel: 'Sponsored hire',
          contactId: 'institutions-halden',
          contactName: 'Miren Halden',
          contactDelta: 2,
        },
      },
    ] as OperationEvent[]

    const view = getFactionPageView(state)
    const institutions = view.factions.find((faction) => faction.id === 'institutions')

    expect(view.recentActivity[0]).toMatchObject({
      title: expect.stringMatching(/academic institutions/i),
    })
    expect(institutions?.historyItems[0]).toMatchObject({
      title: expect.stringMatching(/academic institutions/i),
    })
  })
})

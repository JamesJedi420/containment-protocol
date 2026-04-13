// cspell:words cand
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { previewCandidate, type Candidate } from '../domain/models'

describe('previewCandidate', () => {
  it('matches the hire path for an affordable, supported recruit', () => {
    const game = createStartingState()
    game.funding = 120

    const candidate: Candidate = {
      id: 'cand-preview-01',
      name: 'Preview Agent',
      age: 29,
      category: 'agent',
      hireStatus: 'available',
      weeklyCost: 18,
      revealLevel: 2,
      expiryWeek: 6,
      evaluation: {
        overallVisible: true,
        overallValue: 74,
        potentialVisible: true,
        potentialTier: 'mid',
        rumorTags: [],
      },
      agentData: {
        role: 'field',
        specialization: 'recon',
        stats: {
          combat: 76,
          investigation: 45,
          utility: 51,
          social: 38,
        },
        traits: ['steady-aim'],
      },
    }

    expect(previewCandidate(candidate, game)).toEqual({
      canHire: true,
      reasons: [],
      estimatedValue: 74,
    })
  })

  it('reports blocking reasons for insufficient funding and unsupported specialist recruits', () => {
    const game = createStartingState()
    game.funding = 5

    const candidate: Candidate = {
      id: 'cand-preview-02',
      name: 'Blocked Specialist',
      age: 33,
      category: 'specialist',
      hireStatus: 'available',
      weeklyCost: 20,
      revealLevel: 1,
      expiryWeek: 7,
      evaluation: {
        overallVisible: false,
        overallValue: 61,
        potentialVisible: true,
        potentialTier: 'mid',
        rumorTags: [],
      },
      specialistData: {
        specialty: 'fabrication',
      },
    }

    expect(previewCandidate(candidate, game)).toEqual({
      canHire: false,
      reasons: ['insufficient-funding', 'unsupported-category'],
      estimatedValue: 61,
    })
  })

  it('gates faction-sponsored recruits behind faction tier and hostile contact state', () => {
    const game = createStartingState()
    game.funding = 120

    const candidate: Candidate = {
      id: 'cand-preview-03',
      name: 'Faction Recruit',
      age: 30,
      category: 'agent',
      hireStatus: 'available',
      weeklyCost: 22,
      revealLevel: 2,
      expiryWeek: 7,
      sourceFactionId: 'black_budget',
      sourceFactionName: 'Black Budget Programs',
      sourceContactId: 'blackbudget-ossian',
      sourceContactName: 'Lena Ossian',
      sourceSummary: 'Intercept operative referral via covert intercept channel',
      sourceRequiredTier: 'allied',
      evaluation: {
        overallVisible: true,
        overallValue: 83,
        potentialVisible: true,
        potentialTier: 'high',
        rumorTags: [],
      },
      agentData: {
        role: 'analyst',
        specialization: 'signal-intercept',
        stats: {
          combat: 52,
          investigation: 76,
          utility: 71,
          social: 46,
        },
        traits: ['signal-hunter'],
      },
    }

    expect(previewCandidate(candidate, game)).toEqual({
      canHire: false,
      reasons: ['faction-locked'],
      estimatedValue: 83,
    })

    const factions = game.factions
    if (!factions) {
      throw new Error('Expected faction state to be present for recruitment preview test.')
    }

    factions.black_budget.reputation = 80
    factions.black_budget.contacts = factions.black_budget.contacts.map((contact) =>
      contact.id === 'blackbudget-ossian'
        ? {
            ...contact,
            relationship: -60,
            status: 'hostile',
          }
        : contact
    )

    expect(previewCandidate(candidate, game)).toEqual({
      canHire: false,
      reasons: ['contact-hostile'],
      estimatedValue: 83,
    })
  })
})

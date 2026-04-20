// cspell:words cand
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { hireCandidate } from '../domain/sim/hire'
import { type AgentData, type Candidate, type StaffData } from '../domain/models'

// ── test fixtures ─────────────────────────────────────────────────────────────

function makeAgentCandidate(
  overrides?: Partial<Extract<Candidate, { category: 'agent' }>>
): Extract<Candidate, { category: 'agent' }> {
  const agentData: AgentData = {
    role: 'combat',
    specialization: 'recon',
    stats: { combat: 60, investigation: 30, utility: 20, social: 20 },
    traits: ['marksman'],
  }

  const baseCandidate: Candidate = {
    id: 'cand-agent-01',
    name: 'Test Recruit',
    portraitId: 'portrait-test-recruit',
    age: 31,
    category: 'agent',
    hireStatus: 'candidate',
    weeklyCost: 12,
    weeklyWage: 12,
    revealLevel: 2,
    expiryWeek: 3,
    agentData,
    evaluation: {
      overallVisible: true,
      potentialVisible: true,
      rumorTags: [],
      impression: 'capable',
      teamwork: 'solid',
      outlook: 'focused',
    },
  }

  return { ...baseCandidate, ...overrides }
}

function makeStaffCandidate(
  overrides?: Partial<Extract<Candidate, { category: 'staff' }>>
): Extract<Candidate, { category: 'staff' }> {
  const staffData: StaffData = {
    specialty: 'intelligence',
    assignmentType: 'analyst',
    passiveBonuses: { intel: 5 },
  }

  const baseCandidate: Candidate = {
    id: 'cand-staff-01',
    name: 'Test Analyst',
    portraitId: 'portrait-test-analyst',
    age: 38,
    category: 'staff',
    hireStatus: 'candidate',
    weeklyCost: 10,
    weeklyWage: 10,
    revealLevel: 2,
    expiryWeek: 3,
    staffData,
    evaluation: {
      overallVisible: true,
      potentialVisible: true,
      rumorTags: [],
      impression: 'methodical',
      teamwork: 'cooperative',
      outlook: 'pragmatic',
    },
  }

  return { ...baseCandidate, ...overrides }
}

// ── hireCandidate ─────────────────────────────────────────────────────────────

describe('hireCandidate', () => {
  it('returns unchanged state when the candidate id does not exist', () => {
    const state = createStartingState()
    const next = hireCandidate(state, 'nonexistent-candidate')

    expect(next).toBe(state)
  })

  it('adds the agent to state.agents on a successful agent hire', () => {
    const candidate = makeAgentCandidate()
    const state = { ...createStartingState(), candidates: [candidate] }
    const next = hireCandidate(state, candidate.id)

    expect(next.agents[candidate.id]).toBeDefined()
    expect(next.agents[candidate.id].name).toBe('Test Recruit')
  })

  it('removes the candidate from the candidates list after hiring', () => {
    const candidate = makeAgentCandidate()
    const state = { ...createStartingState(), candidates: [candidate] }
    const next = hireCandidate(state, candidate.id)

    expect(next.candidates.find((c) => c.id === candidate.id)).toBeUndefined()
  })

  it('emits an agent.hired event with correct payload for an agent hire', () => {
    const candidate = makeAgentCandidate()
    const state = { ...createStartingState(), candidates: [candidate] }
    const next = hireCandidate(state, candidate.id)

    const hireEvent = next.events.find((e) => e.type === 'agent.hired')
    expect(hireEvent).toBeDefined()
    expect(hireEvent?.payload).toMatchObject({
      candidateId: candidate.id,
      agentId: candidate.id,
      agentName: candidate.name,
      recruitCategory: 'agent',
    })
  })

  it('maps recon-specialized combat recruits to the field recon role', () => {
    const candidate = makeAgentCandidate()
    const state = { ...createStartingState(), candidates: [candidate] }
    const next = hireCandidate(state, candidate.id)

    expect(next.agents[candidate.id].role).toBe('field_recon')
  })

  it('maps investigation recruit role with signal specialization to tech role', () => {
    const candidate = makeAgentCandidate({
      id: 'cand-agent-02',
      agentData: {
        role: 'investigation',
        specialization: 'signal-analyst',
        stats: { combat: 20, investigation: 60, utility: 40, social: 20 },
        traits: [],
      },
    })
    const state = { ...createStartingState(), candidates: [candidate] }
    const next = hireCandidate(state, candidate.id)

    expect(next.agents[candidate.id].role).toBe('tech')
  })

  it('deducts funding by the candidate weekly cost on hire', () => {
    const candidate = makeAgentCandidate({ weeklyCost: 14, weeklyWage: 14 })
    const state = { ...createStartingState(), funding: 120, candidates: [candidate] }
    const next = hireCandidate(state, candidate.id)

    expect(next.funding).toBe(106)
  })

  it('hydrates partial domain stats and growth profile from the shared agent candidate model', () => {
    const candidate = makeAgentCandidate({
      id: 'cand-agent-03',
      hireStatus: 'available',
      agentData: {
        role: 'containment',
        specialization: 'warding',
        domainStats: {
          stability: {
            resistance: 81,
            tolerance: 79,
          },
          technical: {
            equipment: 74,
            anomaly: 83,
          },
        },
        traits: ['ward-specialist'],
        growthProfile: 'adaptive',
      },
    })
    const state = { ...createStartingState(), candidates: [candidate] }
    const next = hireCandidate(state, candidate.id)

    expect(next.agents[candidate.id].role).toBe('occultist')
    expect(next.agents[candidate.id].progression?.growthProfile).toBe('adaptive')
    expect(next.agents[candidate.id].stats?.stability.resistance).toBe(81)
    expect(next.agents[candidate.id].stats?.technical.anomaly).toBe(83)
    expect(next.agents[candidate.id].baseStats.utility).toBeGreaterThan(0)
  })

  it('converts revealed candidate potential into live tier ceilings on the hired agent', () => {
    const candidate = makeAgentCandidate({
      id: 'cand-agent-06',
      evaluation: {
        overallVisible: true,
        overallValue: 85,
        potentialVisible: true,
        potentialTier: 'high',
        rumorTags: [],
        impression: 'elite',
        teamwork: 'solid',
        outlook: 'focused',
      },
      agentData: {
        role: 'combat',
        specialization: 'recon',
        stats: { combat: 60, investigation: 30, utility: 20, social: 20 },
        traits: ['marksman'],
        growthProfile: 'balanced',
      },
    })
    const state = { ...createStartingState(), candidates: [candidate] }
    const next = hireCandidate(state, candidate.id)

    expect(next.agents[candidate.id].progression?.potentialTier).toBe('S')
    expect(next.agents[candidate.id].progression?.statCaps).toEqual({
      combat: 100,
      investigation: 96,
      utility: 92,
      social: 90,
    })
  })

  it('preserves scout intel as a projected tier while the hidden live tier remains canonical', () => {
    const candidate = makeAgentCandidate({
      id: 'cand-agent-scouted',
      actualPotentialTier: 'A',
      scoutReport: {
        stage: 1,
        projectedTier: 'B',
        exactKnown: false,
        confidence: 'medium',
        scoutedWeek: 1,
      },
      evaluation: {
        overallVisible: true,
        overallValue: 78,
        potentialVisible: true,
        potentialTier: 'mid',
        rumorTags: [],
        impression: 'promising',
        teamwork: 'stable',
        outlook: 'upward',
      },
    })
    const state = { ...createStartingState(), candidates: [candidate] }
    const next = hireCandidate(state, candidate.id)
    const agent = next.agents[candidate.id]

    expect(agent.progression?.potentialTier).toBe('A')
    expect(agent.progression?.potentialIntel).toMatchObject({
      visibleTier: 'B',
      exactKnown: false,
      confidence: 'medium',
      discoveryProgress: 45,
      source: 'recruitment_scout',
    })
  })

  it('applies faction and contact reputation shifts when a sponsored recruit is hired', () => {
    const state = createStartingState()
    const factions = state.factions
    if (!factions) {
      throw new Error('Expected faction state to be present for hire interaction test.')
    }

    factions.institutions.reputation = 80
    factions.institutions.contacts = factions.institutions.contacts.map((contact) =>
      contact.id === 'institutions-halden'
        ? {
            ...contact,
            relationship: 20,
            status: 'active',
          }
        : contact
    )

    const candidate = makeAgentCandidate({
      id: 'cand-sponsored-01',
      hireStatus: 'available',
      sourceFactionId: 'institutions',
      sourceFactionName: 'Academic Institutions',
      sourceContactId: 'institutions-halden',
      sourceContactName: 'Miren Halden',
      sourceSummary: 'Research fellowship via institutional research channel',
      sourceRequiredTier: 'friendly',
    })
    state.candidates = [candidate]

    const next = hireCandidate(state, candidate.id)
    const nextFactions = next.factions
    if (!nextFactions) {
      throw new Error('Expected factions to persist after sponsored hire.')
    }

    expect(nextFactions.institutions.reputation).toBe(84)
    expect(
      nextFactions.institutions.contacts.find((contact) => contact.id === 'institutions-halden')
        ?.relationship
    ).toBe(26)
    expect(
      next.events.find(
        (event) =>
          event.type === 'faction.standing_changed' &&
          event.payload.reason === 'recruitment.hired' &&
          event.payload.factionId === 'institutions'
      )
    ).toMatchObject({
      payload: expect.objectContaining({
        interactionLabel: 'Research fellowship via institutional research channel',
        contactId: 'institutions-halden',
        delta: 4,
        contactDelta: 6,
      }),
    })
  })

  it('carries confirmed scout intel into the live agent as confirmed potential knowledge', () => {
    const candidate = makeAgentCandidate({
      id: 'cand-agent-confirmed-scout',
      actualPotentialTier: 'S',
      scoutReport: {
        stage: 3,
        projectedTier: 'S',
        confirmedTier: 'S',
        exactKnown: true,
        confidence: 'confirmed',
        scoutedWeek: 2,
      },
      evaluation: {
        overallVisible: true,
        overallValue: 88,
        potentialVisible: true,
        potentialTier: 'high',
        rumorTags: [],
        impression: 'elite',
        teamwork: 'stable',
        outlook: 'exceptional',
      },
    })
    const state = { ...createStartingState(), candidates: [candidate] }
    const next = hireCandidate(state, candidate.id)
    const agent = next.agents[candidate.id]

    expect(agent.progression?.potentialTier).toBe('S')
    expect(agent.progression?.potentialIntel).toMatchObject({
      visibleTier: 'S',
      exactKnown: true,
      confidence: 'confirmed',
      discoveryProgress: 100,
      source: 'recruitment_scout',
    })
  })

  it('adds staff record to state.staff on a successful staff hire', () => {
    const candidate = makeStaffCandidate()
    const state = { ...createStartingState(), candidates: [candidate] }
    const next = hireCandidate(state, candidate.id)

    expect(next.staff[candidate.id]).toBeDefined()
    const hiredRecord = next.staff[candidate.id]
    if (hiredRecord.role === 'instructor') throw new Error('Expected staff record, not instructor')
    expect(hiredRecord.specialty).toBe('intel')
  })

  it('emits an agent.hired event with correct category for a staff hire', () => {
    const candidate = makeStaffCandidate()
    const state = { ...createStartingState(), candidates: [candidate] }
    const next = hireCandidate(state, candidate.id)

    const hireEvent = next.events.find((e) => e.type === 'agent.hired')
    expect(hireEvent?.payload).toMatchObject({
      recruitCategory: 'staff',
      agentName: 'Test Analyst',
    })
  })

  it('does not hire candidates that are no longer available', () => {
    const candidate = makeAgentCandidate({
      id: 'cand-agent-04',
      hireStatus: 'expired',
    })
    const state = { ...createStartingState(), candidates: [candidate] }
    const next = hireCandidate(state, candidate.id)

    expect(next).toBe(state)
    expect(next.agents[candidate.id]).toBeUndefined()
    expect(next.candidates).toHaveLength(1)
    expect(next.events.find((event) => event.type === 'agent.hired')).toBeUndefined()
  })

  it('does not hire candidates when funding is insufficient', () => {
    const candidate = makeAgentCandidate({
      id: 'cand-agent-05',
      weeklyCost: 40,
      weeklyWage: 40,
    })
    const state = { ...createStartingState(), funding: 10, candidates: [candidate] }
    const next = hireCandidate(state, candidate.id)

    expect(next).toBe(state)
    expect(next.agents[candidate.id]).toBeUndefined()
    expect(next.candidates).toHaveLength(1)
    expect(next.events.find((event) => event.type === 'agent.hired')).toBeUndefined()
  })

  it('leaves remaining candidates untouched when hiring one of several', () => {
    const candidate1 = makeAgentCandidate({ id: 'cand-01' })
    const candidate2 = makeAgentCandidate({ id: 'cand-02', name: 'Second Recruit' })
    const state = { ...createStartingState(), candidates: [candidate1, candidate2] }
    const next = hireCandidate(state, candidate1.id)

    expect(next.candidates).toHaveLength(1)
    expect(next.candidates[0].id).toBe('cand-02')
  })

  it('initializes the hired agent with status active and zero relationships', () => {
    const candidate = makeAgentCandidate()
    const state = { ...createStartingState(), candidates: [candidate] }
    const next = hireCandidate(state, candidate.id)

    const agent = next.agents[candidate.id]
    expect(agent.status).toBe('active')
    expect(agent.relationships).toEqual({})
  })
})

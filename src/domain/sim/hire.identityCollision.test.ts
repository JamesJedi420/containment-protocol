// cspell:words cand
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { createAgent } from '../agent/factory'
import { appendAgentHistoryEntry, createAgentHistoryEntry } from '../agent/lifecycle'
import { type AgentData, type Candidate, type GameState, type StaffData } from '../models'
import { hireCandidate } from './hire'

function makeAgentCandidate(
  overrides?: Partial<Extract<Candidate, { category: 'agent' }>>
): Extract<Candidate, { category: 'agent' }> {
  const agentData: AgentData = {
    role: 'combat',
    specialization: 'recon',
    stats: { combat: 60, investigation: 30, utility: 20, social: 20 },
    traits: ['marksman'],
  }

  return {
    id: 'cand-agent-collision',
    name: 'Collision Recruit',
    portraitId: 'portrait-collision-recruit',
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
    ...overrides,
  }
}

function makeStaffCandidate(
  overrides?: Partial<Extract<Candidate, { category: 'staff' }>>
): Extract<Candidate, { category: 'staff' }> {
  const staffData: StaffData = {
    specialty: 'intelligence',
    assignmentType: 'analyst',
    passiveBonuses: { intel: 5 },
  }

  return {
    id: 'cand-staff-collision',
    name: 'Collision Analyst',
    portraitId: 'portrait-collision-analyst',
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
    ...overrides,
  }
}

function makeInstructorCandidate(
  overrides?: Partial<Extract<Candidate, { category: 'instructor' }>>
): Extract<Candidate, { category: 'instructor' }> {
  return {
    id: 'cand-instructor-collision',
    name: 'Collision Instructor',
    age: 42,
    category: 'instructor',
    hireStatus: 'candidate',
    weeklyCost: 15,
    weeklyWage: 15,
    revealLevel: 2,
    expiryWeek: 5,
    evaluation: {
      overallVisible: true,
      potentialVisible: true,
      rumorTags: [],
    },
    instructorData: {
      instructorSpecialty: 'combat',
      efficiency: 82,
    },
    ...overrides,
  }
}

function makeUnrelatedAgent(id: string, name: string) {
  return createAgent({
    id,
    name,
    role: 'field_recon',
    createdWeek: 1,
    baseStats: { combat: 40, investigation: 40, utility: 40, social: 40 },
    status: 'active',
  })
}

function makeCompletedHireAgent(id: string, name: string, week = 1) {
  return appendAgentHistoryEntry(
    makeUnrelatedAgent(id, name),
    createAgentHistoryEntry(week, 'agent.hired', 'Hired into the agency.')
  )
}

function countHireEvents(state: GameState, candidateId: string) {
  return state.events.filter(
    (event) =>
      event.type === 'agent.hired' &&
      (event.payload.candidateId === candidateId || event.payload.agentId === candidateId)
  ).length
}

describe('hireCandidate identity collision (SPE-3366)', () => {
  it('rejects agent hire that would overwrite an unrelated agent at the same id', () => {
    const candidate = makeAgentCandidate()
    const unrelated = makeUnrelatedAgent(candidate.id, 'Unrelated Occupant')
    const state: GameState = {
      ...createStartingState(),
      funding: 200,
      candidates: [candidate],
      agents: { ...createStartingState().agents, [candidate.id]: unrelated },
    }

    const next = hireCandidate(state, candidate.id)

    expect(next).toBe(state)
    expect(next.agents[candidate.id]?.name).toBe('Unrelated Occupant')
    expect(next.candidates.find((entry) => entry.id === candidate.id)).toBeDefined()
    expect(next.funding).toBe(200)
    expect(countHireEvents(next, candidate.id)).toBe(0)
  })

  it('rejects agent hire that would overwrite an occupied staff slot (cross-map)', () => {
    const candidate = makeAgentCandidate()
    const state: GameState = {
      ...createStartingState(),
      funding: 200,
      candidates: [candidate],
      staff: {
        ...createStartingState().staff,
        [candidate.id]: {
          specialty: 'intel',
          assignmentType: 'analyst',
          passiveBonuses: {},
        },
      },
    }

    const next = hireCandidate(state, candidate.id)

    expect(next).toBe(state)
    expect(next.agents[candidate.id]).toBeUndefined()
    expect(next.staff[candidate.id]).toBeDefined()
    expect(next.funding).toBe(200)
    expect(countHireEvents(next, candidate.id)).toBe(0)
  })

  it('rejects staff hire that would overwrite an unrelated staff record at the same id', () => {
    const candidate = makeStaffCandidate()
    const state: GameState = {
      ...createStartingState(),
      funding: 200,
      candidates: [candidate],
      staff: {
        ...createStartingState().staff,
        [candidate.id]: {
          specialty: 'logistics',
          assignmentType: 'logistics',
          passiveBonuses: {},
        },
      },
    }

    const next = hireCandidate(state, candidate.id)

    expect(next).toBe(state)
    const staff = next.staff[candidate.id]
    expect(staff).toBeDefined()
    if (staff.role === 'instructor') throw new Error('Expected staff record')
    expect(staff.specialty).toBe('logistics')
    expect(next.funding).toBe(200)
    expect(countHireEvents(next, candidate.id)).toBe(0)
  })

  it('rejects staff hire that would overwrite an occupied agent slot (cross-map)', () => {
    const candidate = makeStaffCandidate()
    const state: GameState = {
      ...createStartingState(),
      funding: 200,
      candidates: [candidate],
      agents: {
        ...createStartingState().agents,
        [candidate.id]: makeUnrelatedAgent(candidate.id, 'Agent Occupant'),
      },
    }

    const next = hireCandidate(state, candidate.id)

    expect(next).toBe(state)
    expect(next.staff[candidate.id]).toBeUndefined()
    expect(next.agents[candidate.id]?.name).toBe('Agent Occupant')
    expect(next.funding).toBe(200)
    expect(countHireEvents(next, candidate.id)).toBe(0)
  })

  it('rejects instructor hire that would overwrite an occupied agent slot (cross-map)', () => {
    const candidate = makeInstructorCandidate()
    const state: GameState = {
      ...createStartingState(),
      funding: 200,
      candidates: [candidate],
      agents: {
        ...createStartingState().agents,
        [candidate.id]: makeUnrelatedAgent(candidate.id, 'Agent Occupant'),
      },
    }

    const next = hireCandidate(state, candidate.id)

    expect(next).toBe(state)
    expect(next.staff[candidate.id]).toBeUndefined()
    expect(next.funding).toBe(200)
    expect(countHireEvents(next, candidate.id)).toBe(0)
  })

  it('idempotently no-ops when the same-id agent is already the completed hire target', () => {
    const candidate = makeAgentCandidate()
    const completed = makeCompletedHireAgent(candidate.id, candidate.name)
    const state: GameState = {
      ...createStartingState(),
      funding: 200,
      candidates: [candidate],
      agents: { ...createStartingState().agents, [candidate.id]: completed },
      events: [
        {
          id: 'evt-prior-hire',
          type: 'agent.hired',
          week: 1,
          payload: {
            week: 1,
            candidateId: candidate.id,
            agentId: candidate.id,
            agentName: candidate.name,
            recruitCategory: 'agent',
          },
        },
      ],
    }

    const next = hireCandidate(state, candidate.id)

    expect(next).toBe(state)
    expect(next.funding).toBe(200)
    expect(next.agents[candidate.id]).toBe(completed)
    expect(countHireEvents(next, candidate.id)).toBe(1)
    expect(next.candidates.find((entry) => entry.id === candidate.id)).toBeDefined()
  })

  it('idempotently no-ops when the same-id instructor is already the completed hire target', () => {
    const candidate = makeInstructorCandidate()
    const state: GameState = {
      ...createStartingState(),
      funding: 200,
      candidates: [candidate],
      staff: {
        ...createStartingState().staff,
        [candidate.id]: {
          role: 'instructor',
          name: candidate.name,
          efficiency: 82,
          instructorSpecialty: 'combat',
        },
      },
      events: [
        {
          id: 'evt-instructor-hire',
          type: 'agent.hired',
          week: 1,
          payload: {
            week: 1,
            candidateId: candidate.id,
            agentId: candidate.id,
            agentName: candidate.name,
            recruitCategory: 'instructor',
          },
        },
      ],
    }

    const next = hireCandidate(state, candidate.id)

    expect(next).toBe(state)
    expect(next.funding).toBe(200)
    expect(countHireEvents(next, candidate.id)).toBe(1)
  })

  it('rejects same-id instructor occupancy without a completed hire event', () => {
    const candidate = makeInstructorCandidate()
    const state: GameState = {
      ...createStartingState(),
      funding: 200,
      candidates: [candidate],
      staff: {
        ...createStartingState().staff,
        [candidate.id]: {
          role: 'instructor',
          name: candidate.name,
          efficiency: 82,
          instructorSpecialty: 'combat',
        },
      },
    }

    const next = hireCandidate(state, candidate.id)

    expect(next).toBe(state)
    expect(next.funding).toBe(200)
    expect(countHireEvents(next, candidate.id)).toBe(0)
    expect(next.candidates.find((entry) => entry.id === candidate.id)).toBeDefined()
  })

  it('idempotently no-ops when staff destination matches a prior hire event', () => {
    const candidate = makeStaffCandidate()
    const state: GameState = {
      ...createStartingState(),
      funding: 200,
      candidates: [candidate],
      staff: {
        ...createStartingState().staff,
        [candidate.id]: {
          specialty: 'intel',
          assignmentType: 'analyst',
          passiveBonuses: { intel: 5 },
        },
      },
      events: [
        {
          id: 'evt-staff-hire',
          type: 'agent.hired',
          week: 1,
          payload: {
            week: 1,
            candidateId: candidate.id,
            agentId: candidate.id,
            agentName: candidate.name,
            recruitCategory: 'staff',
          },
        },
      ],
    }

    const next = hireCandidate(state, candidate.id)

    expect(next).toBe(state)
    expect(next.funding).toBe(200)
    expect(countHireEvents(next, candidate.id)).toBe(1)
  })

  it('creates exactly one agent under candidate id and removes the candidate atomically', () => {
    const candidate = makeAgentCandidate()
    const state: GameState = {
      ...createStartingState(),
      funding: 200,
      candidates: [candidate],
    }

    const next = hireCandidate(state, candidate.id)

    expect(next.agents[candidate.id]?.name).toBe(candidate.name)
    expect(next.candidates.find((entry) => entry.id === candidate.id)).toBeUndefined()
    expect(next.funding).toBe(188)
    expect(countHireEvents(next, candidate.id)).toBe(1)
  })

  it('does not apply funding, faction, or hire-event effects a second time after success', () => {
    const base = createStartingState()
    if (!base.factions?.institutions) {
      throw new Error('Expected faction state')
    }
    const factions = {
      ...base.factions,
      institutions: {
        ...base.factions.institutions,
        reputation: 80,
        contacts: (base.factions.institutions.contacts ?? []).map((contact) =>
          contact.id === 'institutions-halden'
            ? { ...contact, relationship: 20, status: 'active' as const }
            : contact
        ),
      },
    }

    const candidate = makeAgentCandidate({
      hireStatus: 'available',
      sourceFactionId: 'institutions',
      sourceFactionName: 'Academic Institutions',
      sourceContactId: 'institutions-halden',
      sourceContactName: 'Miren Halden',
      sourceSummary: 'Sponsored collision path',
    })
    const initial: GameState = {
      ...base,
      funding: 200,
      candidates: [candidate],
      factions,
    }

    const hired = hireCandidate(initial, candidate.id)
    expect(hired.funding).toBe(188)
    expect(hired.factions?.institutions.reputation).toBe(84)
    expect(countHireEvents(hired, candidate.id)).toBe(1)

    // Restore a stuck candidate beside the completed hire target (malformed retry).
    const retryState: GameState = {
      ...hired,
      candidates: [candidate],
    }
    const retried = hireCandidate(retryState, candidate.id)

    expect(retried).toBe(retryState)
    expect(retried.funding).toBe(188)
    expect(retried.factions?.institutions.reputation).toBe(84)
    expect(countHireEvents(retried, candidate.id)).toBe(1)
  })

  it('no-ops when the candidate is missing and the destination is vacant', () => {
    const state = createStartingState()
    const next = hireCandidate(state, 'missing-never-hired')

    expect(next).toBe(state)
  })

  it('no-ops without second effects when the candidate is missing after a prior hire', () => {
    const candidate = makeAgentCandidate()
    const hired = hireCandidate(
      { ...createStartingState(), funding: 200, candidates: [candidate] },
      candidate.id
    )

    const retried = hireCandidate(hired, candidate.id)

    expect(retried).toBe(hired)
    expect(retried.funding).toBe(188)
    expect(countHireEvents(retried, candidate.id)).toBe(1)
  })
})

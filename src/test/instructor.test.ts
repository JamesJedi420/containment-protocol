import { describe, expect, it } from 'vitest'
// cspell:words cand sato
import { createStartingState } from '../data/startingState'
import { trainingCatalog } from '../data/training'
import { hireCandidate } from '../domain/sim/hire'
import {
  advanceTrainingQueues,
  cancelTraining,
  getTrainingAptitudeBonus,
  queueTraining,
} from '../domain/sim/training'
import {
  assignInstructor,
  getInstructorBonus,
  unassignInstructor,
} from '../domain/sim/instructorAssignment'
import { buildAcademyOverview } from '../domain/academy'
import { getTrainingQueueViews, getTrainingRosterViews } from '../features/training/trainingView'
import type { Candidate, GameState, InstructorData } from '../domain/models'

const combatDrills = trainingCatalog.find((p) => p.trainingId === 'combat-drills')

if (!combatDrills) {
  throw new Error('Missing combat-drills in training catalog')
}

// ── helpers ───────────────────────────────────────────────────────────────────

function makeInstructorCandidate(
  overrides: Partial<Extract<Candidate, { category: 'instructor' }>> = {}
): Extract<Candidate, { category: 'instructor' }> {
  return {
    id: 'cand-instructor-01',
    name: 'Prof. Chen',
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

function withInstructor(
  state: GameState,
  data: { id: string } & Partial<Omit<InstructorData, 'role'>>
): GameState {
  const { id, ...fields } = data
  const record: InstructorData = {
    role: 'instructor',
    name: 'Test Instructor',
    efficiency: 80,
    instructorSpecialty: 'combat',
    ...fields,
  }
  return { ...state, staff: { ...state.staff, [id]: record } }
}

// ── getInstructorBonus ────────────────────────────────────────────────────────

describe('getInstructorBonus', () => {
  it('returns 0 for efficiency below 70', () => {
    expect(getInstructorBonus(0)).toBe(0)
    expect(getInstructorBonus(65)).toBe(0)
    expect(getInstructorBonus(69)).toBe(0)
  })

  it('returns 1 for efficiency 70 to 89', () => {
    expect(getInstructorBonus(70)).toBe(1)
    expect(getInstructorBonus(80)).toBe(1)
    expect(getInstructorBonus(89)).toBe(1)
  })

  it('returns 2 for efficiency 90 and above', () => {
    expect(getInstructorBonus(90)).toBe(2)
    expect(getInstructorBonus(92)).toBe(2)
    expect(getInstructorBonus(100)).toBe(2)
  })
})

// ── instructor hire ───────────────────────────────────────────────────────────

describe('instructor hire', () => {
  it('stores instructor in state.staff with role=instructor and correct fields', () => {
    const candidate = makeInstructorCandidate()
    const state = { ...createStartingState(), candidates: [candidate] }
    const next = hireCandidate(state, candidate.id)

    const record = next.staff[candidate.id]
    expect(record).toBeDefined()
    expect(record.role).toBe('instructor')
    if (record.role !== 'instructor') throw new Error('Expected instructor record')
    expect(record.name).toBe('Prof. Chen')
    expect(record.instructorSpecialty).toBe('combat')
    expect(record.efficiency).toBe(82)
  })

  it('emits an agent.hired event with recruitCategory=instructor', () => {
    const candidate = makeInstructorCandidate()
    const state = { ...createStartingState(), candidates: [candidate] }
    const next = hireCandidate(state, candidate.id)

    const hireEvent = next.events.find((e) => e.type === 'agent.hired')
    expect(hireEvent?.payload).toMatchObject({ recruitCategory: 'instructor' })
  })
})

// ── assignInstructor ──────────────────────────────────────────────────────────

describe('assignInstructor', () => {
  it('sets assignedAgentId when agent is in training', () => {
    const queued = queueTraining(createStartingState(), 'a_ava', combatDrills.trainingId)
    const withIns = withInstructor(queued, { id: 'ins-01' })

    const result = assignInstructor(withIns, 'ins-01', 'a_ava')

    const record = result.staff['ins-01']
    if (record.role !== 'instructor') throw new Error()
    expect(record.assignedAgentId).toBe('a_ava')
  })

  it('is a no-op when agent is not in training', () => {
    const withIns = withInstructor(createStartingState(), { id: 'ins-01' })

    const result = assignInstructor(withIns, 'ins-01', 'a_ava')

    const record = result.staff['ins-01']
    if (record.role !== 'instructor') throw new Error()
    expect(record.assignedAgentId).toBeUndefined()
  })

  it('is a no-op when agent already has an instructor', () => {
    const queued = queueTraining(createStartingState(), 'a_ava', combatDrills.trainingId)
    const withIns = withInstructor(queued, { id: 'ins-01' })
    const withIns2 = withInstructor(withIns, { id: 'ins-02' })

    const firstAssign = assignInstructor(withIns2, 'ins-01', 'a_ava')
    const secondAssign = assignInstructor(firstAssign, 'ins-02', 'a_ava')

    const record = secondAssign.staff['ins-02']
    if (record.role !== 'instructor') throw new Error()
    expect(record.assignedAgentId).toBeUndefined()
  })

  it('is a no-op when the instructor is already assigned to another agent', () => {
    const q1 = queueTraining(createStartingState(), 'a_ava', combatDrills.trainingId)
    const q2 = queueTraining(q1, 'a_sato', combatDrills.trainingId)
    const withIns = withInstructor(q2, { id: 'ins-01' })

    const firstAssign = assignInstructor(withIns, 'ins-01', 'a_ava')
    const result = assignInstructor(firstAssign, 'ins-01', 'a_sato')

    const record = result.staff['ins-01']
    if (record.role !== 'instructor') throw new Error()
    expect(record.assignedAgentId).toBe('a_ava')
  })
})

// ── cancelTraining clears instructor ─────────────────────────────────────────

describe('cancelTraining instructor cleanup', () => {
  it('clears instructor assignedAgentId when training is cancelled', () => {
    const queued = queueTraining(createStartingState(), 'a_ava', combatDrills.trainingId)
    const withIns = withInstructor(queued, { id: 'ins-01', efficiency: 80, instructorSpecialty: 'combat' })
    const assigned = assignInstructor(withIns, 'ins-01', 'a_ava')

    const result = cancelTraining(assigned, 'a_ava')

    const record = result.staff['ins-01']
    if (record.role !== 'instructor') throw new Error()
    expect(record.assignedAgentId).toBeUndefined()
  })

  it('leaves unrelated instructor assignments intact when cancelling a different agent', () => {
    const q1 = queueTraining(createStartingState(), 'a_ava', combatDrills.trainingId)
    const q2 = queueTraining(q1, 'a_sato', combatDrills.trainingId)
    const withIns1 = withInstructor(q2, { id: 'ins-01', instructorSpecialty: 'combat' })
    const withIns2 = withInstructor(withIns1, { id: 'ins-02', instructorSpecialty: 'combat' })
    const a1 = assignInstructor(withIns2, 'ins-01', 'a_ava')
    const a2 = assignInstructor(a1, 'ins-02', 'a_sato')

    const result = cancelTraining(a2, 'a_ava')

    const ins1 = result.staff['ins-01']
    const ins2 = result.staff['ins-02']
    if (ins1.role !== 'instructor' || ins2.role !== 'instructor') throw new Error()
    expect(ins1.assignedAgentId).toBeUndefined()   // cancelled agent's instructor cleared
    expect(ins2.assignedAgentId).toBe('a_sato')    // unrelated assignment preserved
  })
})

// ── unassignInstructor ────────────────────────────────────────────────────────

describe('unassignInstructor', () => {
  it('clears assignedAgentId', () => {
    const queued = queueTraining(createStartingState(), 'a_ava', combatDrills.trainingId)
    const withIns = withInstructor(queued, { id: 'ins-01' })
    const assigned = assignInstructor(withIns, 'ins-01', 'a_ava')

    const result = unassignInstructor(assigned, 'ins-01')

    const record = result.staff['ins-01']
    if (record.role !== 'instructor') throw new Error()
    expect(record.assignedAgentId).toBeUndefined()
  })
})

// ── training bonus ────────────────────────────────────────────────────────────

describe('instructor training bonus', () => {
  it('applies +1 bonus to stat gain when matching instructor (efficiency 80) is assigned', () => {
    const queued = queueTraining(createStartingState(), 'a_ava', combatDrills.trainingId)
    const withIns = withInstructor(queued, { id: 'ins-01', efficiency: 80, instructorSpecialty: 'combat' })
    const assigned = assignInstructor(withIns, 'ins-01', 'a_ava')

    const forced = {
      ...assigned,
      trainingQueue: assigned.trainingQueue.map((e) =>
        e.agentId === 'a_ava' ? { ...e, remainingWeeks: 1 } : e
      ),
    }

    const agentBefore = forced.agents['a_ava']
    const entry = forced.trainingQueue.find((e) => e.agentId === 'a_ava')!
    const aptitudeBonus = getTrainingAptitudeBonus(agentBefore.role, entry.targetStat)
    const expectedGain = entry.statDelta + (entry.academyStatBonus ?? 0) + aptitudeBonus + 1

    const { state: result } = advanceTrainingQueues(forced)
    const statAfter = result.agents['a_ava'].baseStats[entry.targetStat]

    expect(statAfter).toBe(Math.min(agentBefore.baseStats[entry.targetStat] + expectedGain, 100))
  })

  it('applies no instructor bonus when specialty does not match program targetStat', () => {
    const queued = queueTraining(createStartingState(), 'a_ava', combatDrills.trainingId)
    // Instructor specializes in social, program targets combat — no bonus
    const withIns = withInstructor(queued, { id: 'ins-01', efficiency: 80, instructorSpecialty: 'social' })
    const assigned = assignInstructor(withIns, 'ins-01', 'a_ava')

    const forced = {
      ...assigned,
      trainingQueue: assigned.trainingQueue.map((e) =>
        e.agentId === 'a_ava' ? { ...e, remainingWeeks: 1 } : e
      ),
    }

    const agentBefore = forced.agents['a_ava']
    const entry = forced.trainingQueue.find((e) => e.agentId === 'a_ava')!
    const aptitudeBonus = getTrainingAptitudeBonus(agentBefore.role, entry.targetStat)
    const expectedGain = entry.statDelta + (entry.academyStatBonus ?? 0) + aptitudeBonus

    const { state: result } = advanceTrainingQueues(forced)
    const statAfter = result.agents['a_ava'].baseStats[entry.targetStat]

    expect(statAfter).toBe(Math.min(agentBefore.baseStats[entry.targetStat] + expectedGain, 100))
  })

  it('auto-clears instructor assignedAgentId after training completes', () => {
    const queued = queueTraining(createStartingState(), 'a_ava', combatDrills.trainingId)
    const withIns = withInstructor(queued, { id: 'ins-01', efficiency: 80, instructorSpecialty: 'combat' })
    const assigned = assignInstructor(withIns, 'ins-01', 'a_ava')

    const forced = {
      ...assigned,
      trainingQueue: assigned.trainingQueue.map((e) =>
        e.agentId === 'a_ava' ? { ...e, remainingWeeks: 1 } : e
      ),
    }

    const { state: result } = advanceTrainingQueues(forced)

    const record = result.staff['ins-01']
    if (record.role !== 'instructor') throw new Error()
    expect(record.assignedAgentId).toBeUndefined()
  })
})

// ── buildAcademyOverview instructors ─────────────────────────────────────────

describe('buildAcademyOverview instructors', () => {
  it('exposes instructor list with correct fields', () => {
    const queued = queueTraining(createStartingState(), 'a_ava', combatDrills.trainingId)
    const withIns = withInstructor(queued, { id: 'ins-01', efficiency: 82, instructorSpecialty: 'combat' })
    const assigned = assignInstructor(withIns, 'ins-01', 'a_ava')

    const overview = buildAcademyOverview(assigned)

    expect(overview.instructors).toHaveLength(1)
    const [ins] = overview.instructors
    expect(ins.staffId).toBe('ins-01')
    expect(ins.instructorSpecialty).toBe('combat')
    expect(ins.efficiency).toBe(82)
    expect(ins.bonus).toBe(1) // 82 is in [70, 89]
    expect(ins.assignedAgentId).toBe('a_ava')
    expect(ins.assignedAgentName).toBeTruthy()
  })

  it('returns empty instructors list when no instructors are hired', () => {
    const overview = buildAcademyOverview(createStartingState())
    expect(overview.instructors).toEqual([])
  })
})

// ── training view instructor specialty ────────────────────────────────────────

describe('getTrainingQueueViews instructor specialty', () => {
  it('returns instructorBonus 0 when instructor specialty does not match program targetStat', () => {
    // combatDrills targets combat; instructor specialty is social — mismatch
    const queued = queueTraining(createStartingState(), 'a_ava', combatDrills.trainingId)
    const withIns = withInstructor(queued, { id: 'ins-01', efficiency: 80, instructorSpecialty: 'social' })
    const assigned = assignInstructor(withIns, 'ins-01', 'a_ava')

    const views = getTrainingQueueViews(assigned)
    const avaView = views.find((v) => v.entry.agentId === 'a_ava')

    expect(avaView).toBeDefined()
    expect(avaView!.assignedInstructorId).toBe('ins-01')
    expect(avaView!.instructorBonus).toBe(0)
  })

  it('returns instructorBonus based on efficiency when specialty matches', () => {
    const queued = queueTraining(createStartingState(), 'a_ava', combatDrills.trainingId)
    const withIns = withInstructor(queued, { id: 'ins-01', efficiency: 80, instructorSpecialty: 'combat' })
    const assigned = assignInstructor(withIns, 'ins-01', 'a_ava')

    const views = getTrainingQueueViews(assigned)
    const avaView = views.find((v) => v.entry.agentId === 'a_ava')

    expect(avaView!.instructorBonus).toBe(1) // efficiency 80 in [70, 89] → bonus 1
  })

  it('returns instructorBonus undefined when no instructor is assigned', () => {
    const queued = queueTraining(createStartingState(), 'a_ava', combatDrills.trainingId)

    const views = getTrainingQueueViews(queued)
    const avaView = views.find((v) => v.entry.agentId === 'a_ava')

    expect(avaView!.instructorBonus).toBeUndefined()
  })
})

describe('getTrainingRosterViews instructor specialty', () => {
  it('returns instructorBonus 0 when instructor specialty does not match the active training stat', () => {
    const queued = queueTraining(createStartingState(), 'a_ava', combatDrills.trainingId)
    const withIns = withInstructor(queued, { id: 'ins-01', efficiency: 90, instructorSpecialty: 'utility' })
    const assigned = assignInstructor(withIns, 'ins-01', 'a_ava')

    const views = getTrainingRosterViews(assigned)
    const avaView = views.find((v) => v.agent.id === 'a_ava')

    expect(avaView!.assignedInstructorId).toBe('ins-01')
    expect(avaView!.instructorBonus).toBe(0)
  })

  it('returns instructorBonus based on efficiency when specialty matches active training stat', () => {
    const queued = queueTraining(createStartingState(), 'a_ava', combatDrills.trainingId)
    const withIns = withInstructor(queued, { id: 'ins-01', efficiency: 92, instructorSpecialty: 'combat' })
    const assigned = assignInstructor(withIns, 'ins-01', 'a_ava')

    const views = getTrainingRosterViews(assigned)
    const avaView = views.find((v) => v.agent.id === 'a_ava')

    expect(avaView!.instructorBonus).toBe(2) // efficiency 92 ≥ 90 → bonus 2
  })
})

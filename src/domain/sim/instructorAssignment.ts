import { type GameState, type InstructorData, type StatKey } from '../models'
import { isAgentTraining } from './training'

export function getInstructorBonus(efficiency: number): 0 | 1 | 2 {
  if (efficiency >= 90) return 2
  if (efficiency >= 70) return 1
  return 0
}

export function getAgentInstructorBonus(
  staff: GameState['staff'],
  agentId: string,
  targetStat: StatKey
): number {
  for (const record of Object.values(staff)) {
    if (
      record.role === 'instructor' &&
      record.assignedAgentId === agentId &&
      record.instructorSpecialty === targetStat
    ) {
      return getInstructorBonus(record.efficiency)
    }
  }
  return 0
}

export function assignInstructor(
  state: GameState,
  staffId: string,
  agentId: string
): GameState {
  const instructor = state.staff[staffId]

  if (!instructor || instructor.role !== 'instructor') {
    return state
  }

  const agent = state.agents[agentId]
  if (!agent || !isAgentTraining(agent)) {
    return state
  }

  // Prevent double-booking: an instructor can only be assigned to one agent at a time.
  if ((instructor as InstructorData).assignedAgentId) {
    return state
  }

  // Check if this agent already has an instructor assigned
  for (const record of Object.values(state.staff)) {
    if (
      record.role === 'instructor' &&
      record.assignedAgentId === agentId
    ) {
      return state
    }
  }

  return {
    ...state,
    staff: {
      ...state.staff,
      [staffId]: {
        ...(instructor as InstructorData),
        assignedAgentId: agentId,
      },
    },
  }
}

export function unassignInstructor(
  state: GameState,
  staffId: string
): GameState {
  const instructor = state.staff[staffId]

  if (!instructor || instructor.role !== 'instructor') {
    return state
  }

  const typed = instructor as InstructorData
  const updated: InstructorData = {
    role: 'instructor',
    name: typed.name,
    efficiency: typed.efficiency,
    instructorSpecialty: typed.instructorSpecialty,
  }

  return {
    ...state,
    staff: {
      ...state.staff,
      [staffId]: updated,
    },
  }
}

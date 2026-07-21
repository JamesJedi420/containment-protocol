import { type GameState, type InstructorData, type StatKey } from '../models'
import { isAgentTraining } from './training'

export const INSTRUCTOR_SPECIALTY_KEYS = [
  'combat',
  'investigation',
  'utility',
  'social',
] as const satisfies readonly StatKey[]

const DEFAULT_INSTRUCTOR_SPECIALTY: StatKey = 'combat'

function coerceFiniteNumber(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()

    if (trimmed.length > 0) {
      const parsed = Number(trimmed)

      if (Number.isFinite(parsed)) {
        return parsed
      }
    }
  }

  return fallback
}

function isInstructorSpecialty(value: unknown): value is StatKey {
  return (
    typeof value === 'string' &&
    (INSTRUCTOR_SPECIALTY_KEYS as readonly string[]).includes(value)
  )
}

/** Hydration / history: nonnegative int bonus + StatKey specialty allowlist. */
export function reconcileAgentInstructorAssignmentFields(payload: {
  bonus?: unknown
  instructorSpecialty?: unknown
}) {
  const bonus = Math.max(0, Math.trunc(coerceFiniteNumber(payload.bonus, 0)))
  const instructorSpecialty = isInstructorSpecialty(payload.instructorSpecialty)
    ? payload.instructorSpecialty
    : DEFAULT_INSTRUCTOR_SPECIALTY

  return { bonus, instructorSpecialty }
}

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

export function assignInstructor(state: GameState, staffId: string, agentId: string): GameState {
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
    if (record.role === 'instructor' && record.assignedAgentId === agentId) {
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

export function unassignInstructor(state: GameState, staffId: string): GameState {
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

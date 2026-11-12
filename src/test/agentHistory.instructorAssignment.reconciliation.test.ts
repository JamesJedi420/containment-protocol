import { describe, expect, it } from 'vitest'
import { createAgent } from '../domain/agent/factory'
import { normalizeAgent } from '../domain/agent/normalize'

describe('agent history instructor assignment reconciliation', () => {
  it.each(['agent.instructor_assigned', 'agent.instructor_unassigned'] as const)(
    'preserves legacy %s logs by reconciling bonus and specialty before validation',
    (eventType) => {
      const agent = createAgent({
        id: 'a_instructor_legacy',
        name: 'Legacy Instructor',
        role: 'investigator',
        baseStats: { combat: 20, investigation: 50, utility: 30, social: 25 },
        abilities: [],
        tags: [],
        relationships: {},
        fatigue: 0,
        status: 'active',
      })

      const normalized = normalizeAgent({
        ...agent,
        history: {
          ...agent.history!,
          logs: [
            {
              id: 'evt-instructor-legacy',
              schemaVersion: 1,
              type: eventType,
              sourceSystem: 'agent',
              timestamp: '2042-01-08T00:00:00.000Z',
              payload: {
                week: 2,
                staffId: 'staff-instructor-01',
                instructorName: 'Iris Vale',
                agentId: agent.id,
                agentName: agent.name,
                instructorSpecialty: 'not-a-stat',
                bonus: -3.7,
              },
            },
          ],
        },
      })

      expect(normalized.history?.logs).toHaveLength(1)
      expect(normalized.history?.logs[0]).toMatchObject({
        type: eventType,
        payload: {
          instructorSpecialty: 'combat',
          bonus: 0,
        },
      })
    }
  )

  it.each(['agent.instructor_assigned', 'agent.instructor_unassigned'] as const)(
    'preserves numeric-string bonus for %s when reconciling before validation',
    (eventType) => {
      const agent = createAgent({
        id: 'a_instructor_string',
        name: 'String Bonus',
        role: 'investigator',
        baseStats: { combat: 20, investigation: 50, utility: 30, social: 25 },
        abilities: [],
        tags: [],
        relationships: {},
        fatigue: 0,
        status: 'active',
      })

      const normalized = normalizeAgent({
        ...agent,
        history: {
          ...agent.history!,
          logs: [
            {
              id: 'evt-instructor-string',
              schemaVersion: 1,
              type: eventType,
              sourceSystem: 'agent',
              timestamp: '2042-01-08T00:00:00.000Z',
              payload: {
                week: 2,
                staffId: 'staff-instructor-01',
                instructorName: 'Iris Vale',
                agentId: agent.id,
                agentName: agent.name,
                instructorSpecialty: 'investigation',
                bonus: '2.9',
              },
            },
          ],
        },
      })

      expect(normalized.history?.logs).toHaveLength(1)
      expect(normalized.history?.logs[0]).toMatchObject({
        type: eventType,
        payload: {
          instructorSpecialty: 'investigation',
          bonus: 2,
        },
      })
    }
  )
})

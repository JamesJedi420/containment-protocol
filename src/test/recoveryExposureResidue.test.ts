import { describe, expect, it } from 'vitest'
import { appendAgentHistoryEntry } from '../domain/agent/lifecycle'
import { advanceRecoveryAgentsForWeek } from '../domain/sim/recoveryPipeline'
import { advanceRecoveryDowntimeForWeek } from '../domain/sim/recoveryDowntime'
import { EXPOSURE_RESIDUE_STATUS_FLAG } from '../domain/sim/recoveryImpairments'
import { RECOVERY_CALIBRATION } from '../domain/sim/calibration'
import type { Agent, GameState, SupportStaffSummary } from '../domain/models'

const medicalStaff = (medical: number): SupportStaffSummary => ({
  admin: 0,
  logistics: 0,
  medical,
  intel: 0,
  total: medical,
  pressure: 0,
})

function baseAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'a1',
    name: 'Test Op',
    role: 'operative',
    status: 'recovering',
    fatigue: 40,
    tags: [],
    relationships: {},
    vitals: {
      health: 90,
      stress: 10,
      morale: 60,
      wounds: 10,
      statusFlags: ['injury:minor'],
    },
    assignment: { state: 'recovery', startedWeek: 0 },
    ...overrides,
  } as Agent
}

describe('SPE-1653 exposure residue', () => {
  it('blocks rest fatigue recovery and applies recurrence while residue persists', () => {
    const agent = baseAgent({
      recoveryStatus: { state: 'recovering', sinceWeek: 1 },
      fatigue: 40,
      vitals: {
        health: 90,
        stress: 10,
        morale: 60,
        wounds: 10,
        statusFlags: ['injury:minor', EXPOSURE_RESIDUE_STATUS_FLAG],
      },
    })
    const r = advanceRecoveryDowntimeForWeek({
      week: 2,
      sourceAgents: { a1: agent },
      sourceTeams: {},
      downtimeAssignments: { a1: 'rest' },
    })
    expect(r.updatedAgents.a1.fatigue).toBe(
      40 + RECOVERY_CALIBRATION.exposureResidueRestRecurrenceFatigue
    )
  })

  it('clears residue after therapy downtime with sufficient medical staff', () => {
    const agent = baseAgent({
      recoveryStatus: { state: 'recovering', sinceWeek: 1 },
      vitals: {
        health: 90,
        stress: 10,
        morale: 60,
        wounds: 10,
        statusFlags: [EXPOSURE_RESIDUE_STATUS_FLAG],
      },
    })
    const r = advanceRecoveryDowntimeForWeek({
      week: 2,
      sourceAgents: { a1: agent },
      sourceTeams: {},
      downtimeAssignments: { a1: 'therapy' },
      supportStaff: medicalStaff(RECOVERY_CALIBRATION.exposureResidueMedicalClearThreshold),
    })
    expect(r.updatedAgents.a1.vitals?.statusFlags ?? []).not.toContain(EXPOSURE_RESIDUE_STATUS_FLAG)
  })

  it('therapy without medical capacity keeps residue but still reduces trauma', () => {
    const agent = baseAgent({
      recoveryStatus: { state: 'recovering', sinceWeek: 1 },
      trauma: { traumaLevel: 2, traumaTags: [], lastEventWeek: 1 },
      fatigue: 50,
      vitals: {
        health: 90,
        stress: 10,
        morale: 60,
        wounds: 10,
        statusFlags: [EXPOSURE_RESIDUE_STATUS_FLAG],
      },
    })
    const r = advanceRecoveryDowntimeForWeek({
      week: 2,
      sourceAgents: { a1: agent },
      sourceTeams: {},
      downtimeAssignments: { a1: 'therapy' },
      supportStaff: medicalStaff(1),
    })
    expect(r.updatedAgents.a1.vitals?.statusFlags ?? []).toContain(EXPOSURE_RESIDUE_STATUS_FLAG)
    expect(r.updatedAgents.a1.trauma?.traumaLevel).toBe(1)
  })

  it('applies partial therapy fatigue recovery while residue gates full rest channel', () => {
    const withResidue = baseAgent({
      recoveryStatus: { state: 'recovering', sinceWeek: 1 },
      fatigue: 50,
      vitals: {
        health: 90,
        stress: 10,
        morale: 60,
        wounds: 10,
        statusFlags: [EXPOSURE_RESIDUE_STATUS_FLAG],
      },
    })
    const cleared = {
      ...withResidue,
      vitals: {
        ...withResidue.vitals!,
        statusFlags: [],
      },
    }
    const therapyResidue = advanceRecoveryDowntimeForWeek({
      week: 2,
      sourceAgents: { a1: withResidue },
      sourceTeams: {},
      downtimeAssignments: { a1: 'therapy' },
    })
    const therapyClear = advanceRecoveryDowntimeForWeek({
      week: 2,
      sourceAgents: { a1: cleared },
      sourceTeams: {},
      downtimeAssignments: { a1: 'therapy' },
    })
    expect(therapyResidue.updatedAgents.a1.fatigue).toBeGreaterThan(therapyClear.updatedAgents.a1.fatigue)
  })

  it('blocks injury discharge from recovery assignment until residue clears', () => {
    const startedWeek = 0
    const week = 3
    const agent = baseAgent({
      status: 'recovering',
      assignment: { state: 'recovery', startedWeek, teamId: 't1' },
      vitals: {
        health: 95,
        stress: 5,
        morale: 70,
        wounds: 5,
        statusFlags: ['injury:minor', EXPOSURE_RESIDUE_STATUS_FLAG],
      },
    })
    const next: GameState['agents'] = { a1: agent }
    const out = advanceRecoveryAgentsForWeek({
      week,
      sourceAgents: { a1: agent },
      nextAgents: next,
    })
    expect(out.a1.assignment?.state).toBe('recovery')
    expect(out.a1.vitals?.statusFlags ?? []).toContain(EXPOSURE_RESIDUE_STATUS_FLAG)

    const clearedAgent = {
      ...agent,
      vitals: {
        ...agent.vitals!,
        statusFlags: ['injury:minor'],
      },
    }
    const out2 = advanceRecoveryAgentsForWeek({
      week,
      sourceAgents: { a1: clearedAgent },
      nextAgents: { a1: clearedAgent },
    })
    expect(out2.a1.assignment?.state).toBe('idle')
  })

  it('preserves week-open nextAgents mutations when residue blocks discharge', () => {
    const startedWeek = 0
    const week = 3
    const sourceAgent = baseAgent({
      status: 'recovering',
      assignment: { state: 'recovery', startedWeek, teamId: 't1' },
      vitals: {
        health: 95,
        stress: 5,
        morale: 70,
        wounds: 5,
        statusFlags: ['injury:minor', EXPOSURE_RESIDUE_STATUS_FLAG],
      },
    })
    const nextAgent = appendAgentHistoryEntry(
      sourceAgent,
      {
        week: week - 1,
        eventType: 'simulation.weekly_tick',
        note: 'Week-open bookkeeping retained.',
      },
      {}
    )

    const out = advanceRecoveryAgentsForWeek({
      week,
      sourceAgents: { a1: sourceAgent },
      nextAgents: { a1: nextAgent },
    })

    expect(out.a1.history?.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ note: 'Week-open bookkeeping retained.' }),
        expect.objectContaining({
          note: expect.stringContaining('remains in recovery until exposure residue'),
        }),
      ])
    )
  })
})

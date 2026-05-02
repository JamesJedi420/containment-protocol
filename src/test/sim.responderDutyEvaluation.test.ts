import { describe, expect, it } from 'vitest'
import type { Agent } from '../domain/models'
import {
  computeEffectiveReadiness,
  evaluateResponderDutyState,
  evaluateResponderForDeployment,
  evaluatePerceivedDangerRisk,
} from '../domain/responderDutyEvaluation'

function makeAgent(input: {
  id: string
  role: Agent['role']
  status?: Agent['status']
  assignmentState?: 'idle' | 'assigned' | 'training' | 'recovery'
  fatigue?: number
  certifications?: Record<string, { state: 'not_started' | 'in_progress' | 'eligible_review' | 'certified' | 'expired' | 'revoked' }>
  baseStats?: { combat: number; investigation: number; utility: number; social: number }
}): Agent {
  return {
    id: input.id,
    name: input.id,
    role: input.role,
    baseStats: input.baseStats ?? {
      combat: 55,
      investigation: 55,
      utility: 55,
      social: 55,
    },
    tags: [],
    relationships: {},
    fatigue: input.fatigue ?? 25,
    status: input.status ?? 'active',
    assignment:
      input.assignmentState === 'assigned'
        ? { state: 'assigned', caseId: 'case-1', teamId: 'team-1', startedWeek: 1 }
        : input.assignmentState === 'training'
          ? { state: 'training', startedWeek: 1, trainingProgramId: 'drill-1' }
          : input.assignmentState === 'recovery'
            ? { state: 'recovery', startedWeek: 1 }
            : { state: 'idle' },
    equipmentSlots: {},
    progression: {
      xp: 0,
      level: 1,
      potentialTier: 'C',
      growthProfile: 'balanced',
      certifications: input.certifications ?? {},
      trainingProfile: {
        agentId: input.id,
        currentRole: input.role,
        trainingStatus: 'idle',
        readinessImpact: 0,
      },
    },
  } as unknown as Agent
}

describe('responderDutyEvaluation slice 1', () => {
  it('duty-state routes can hard-block deployment', () => {
    const trainingAgent = makeAgent({
      id: 'agent-training',
      role: 'hunter',
      assignmentState: 'training',
    })

    const idleAgent = makeAgent({
      id: 'agent-idle',
      role: 'hunter',
      assignmentState: 'idle',
    })

    const trainingDuty = evaluateResponderDutyState(trainingAgent)
    const idleDuty = evaluateResponderDutyState(idleAgent)

    expect(trainingDuty.route).toBe('blocked')
    expect(trainingDuty.hardBlocked).toBe(true)

    expect(idleDuty.route).toBe('deploy')
    expect(idleDuty.hardBlocked).toBe(false)
  })

  it('effective readiness composes certification + gear + condition', () => {
    const certifiedLowFatigue = makeAgent({
      id: 'agent-certified',
      role: 'occultist',
      fatigue: 10,
      certifications: {
        ritual_ops: { state: 'certified' },
      },
    })

    const uncertifiedHighFatigue = makeAgent({
      id: 'agent-uncertified',
      role: 'occultist',
      fatigue: 70,
      certifications: {
        ritual_ops: { state: 'in_progress' },
      },
    })

    const ready = computeEffectiveReadiness({
      agent: certifiedLowFatigue,
      missionRequiredTags: ['cert:ritual_ops'],
      contextTags: ['ritual'],
      visibleThreat: false,
      threatReachable: false,
    })

    const blocked = computeEffectiveReadiness({
      agent: uncertifiedHighFatigue,
      missionRequiredTags: ['cert:ritual_ops'],
      contextTags: ['ritual'],
      visibleThreat: false,
      threatReachable: false,
    })

    expect(ready.certificationAllowed).toBe(true)
    expect(blocked.certificationAllowed).toBe(false)
    expect(ready.conditionScore).toBeGreaterThan(blocked.conditionScore)
    expect(ready.score).toBeGreaterThan(blocked.score)
  })

  it('specialization fit vs mismatch changes effective output', () => {
    const occultist = makeAgent({
      id: 'agent-occultist',
      role: 'occultist',
      fatigue: 15,
      certifications: {
        ritual_ops: { state: 'certified' },
      },
    })

    const fitEval = evaluateResponderForDeployment({
      agent: occultist,
      missionRequiredTags: ['cert:ritual_ops'],
      contextTags: ['ritual'],
      visibleThreat: false,
      threatReachable: true,
    })

    const mismatchEval = evaluateResponderForDeployment({
      agent: occultist,
      missionRequiredTags: ['cert:ritual_ops'],
      contextTags: ['close_combat'],
      visibleThreat: false,
      threatReachable: true,
    })

    expect(fitEval.specialization.fit).toBe('fit')
    expect(mismatchEval.specialization.fit).toBe('mismatch')
    expect(fitEval.effectiveOutputScore).toBeGreaterThan(mismatchEval.effectiveOutputScore)
  })

  it('visible but unreachable threat raises panic/procedure-break branch', () => {
    const agent = makeAgent({
      id: 'agent-panic',
      role: 'field_recon',
      fatigue: 40,
    })

    const visibleUnreachable = evaluatePerceivedDangerRisk({
      agent,
      missionRequiredTags: [],
      contextTags: ['indirect_visual_threat'],
      visibleThreat: true,
      threatReachable: false,
    })

    const noVisibleThreat = evaluatePerceivedDangerRisk({
      agent,
      missionRequiredTags: [],
      contextTags: ['indirect_visual_threat'],
      visibleThreat: false,
      threatReachable: false,
    })

    expect(visibleUnreachable.panicRisk).toBeGreaterThan(noVisibleThreat.panicRisk)
    expect(visibleUnreachable.procedureBreakRisk).toBeGreaterThan(noVisibleThreat.procedureBreakRisk)
  })

  it('deterministic repeated calls return identical outputs', () => {
    const agent = makeAgent({
      id: 'agent-deterministic',
      role: 'investigator',
      fatigue: 30,
      certifications: {
        screening_ops: { state: 'certified' },
      },
    })

    const input = {
      agent,
      missionRequiredTags: ['cert:screening_ops'],
      contextTags: ['indirect_visual_threat'] as const,
      visibleThreat: true,
      threatReachable: false,
    }

    const a = evaluateResponderForDeployment(input)
    const b = evaluateResponderForDeployment(input)

    expect(a).toEqual(b)
  })
})

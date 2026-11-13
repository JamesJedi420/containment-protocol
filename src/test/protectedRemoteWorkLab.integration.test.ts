import { assert, describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import {
  applyProtectedRemoteWorkStep,
  type ProtectedRemoteWorkStepCommand,
} from '../domain/protectedRemoteWorkCellLivePath'
import { PROTECTED_LAB, buildProtectedLabFacts } from '../domain/protectedRemoteWorkLab'
import { projectProtectedRemoteWorkGameplayView } from '../features/agency/protectedRemoteWorkGameplayView'

describe('authored protected lab gameplay', () => {
  function startedLab() {
    const initial = createStartingState()
    const operator = projectProtectedRemoteWorkGameplayView(initial).operators.find(
      (entry) => entry.available && entry.qualified
    )!
    const requested = applyProtectedRemoteWorkStep(initial, {
      kind: 'request_lab',
      operatorRef: operator.id,
      operationKey: 'review-request',
    })
    assert(requested.ok)
    const workId = requested.work.workId
    const authorized = applyProtectedRemoteWorkStep(requested.state!, {
      kind: 'lab_step',
      workId,
      action: 'authorize',
      operationKey: 'review-authorize',
    })
    assert(authorized.ok)
    const begun = applyProtectedRemoteWorkStep(authorized.state!, {
      kind: 'lab_step',
      workId,
      action: 'begin',
      operationKey: 'review-begin',
    })
    assert(begun.ok)
    return { state: begun.state!, operator, workId }
  }

  it('leaves briefing unchanged when a new authorization is rejected after execution', () => {
    const { state, workId } = startedLab()
    const unbriefed = {
      ...state,
      facilityProtectedRemoteWorkStation: {
        ...state.facilityProtectedRemoteWorkStation!,
        briefedOperatorRefs: [],
      },
    }
    const result = applyProtectedRemoteWorkStep(unbriefed, {
      kind: 'lab_step',
      workId,
      action: 'authorize',
      operationKey: 'rejected-authorize',
    })
    expect(result).toMatchObject({ ok: false, code: 'illegal_transition' })
    expect(result.state).toBe(unbriefed)
  })

  it('replays accepted steps before changed live gates without rebriefing or interrupting', () => {
    const { state, workId, operator } = startedLab()
    const changed = {
      ...state,
      agents: {
        ...state.agents,
        [operator.id]: { ...state.agents[operator.id]!, status: 'dead' as const },
      },
      facilityProtectedRemoteWorkStation: {
        ...state.facilityProtectedRemoteWorkStation!,
        connected: false,
        briefedOperatorRefs: [],
      },
    }
    for (const [action, operationKey] of [
      ['authorize', 'review-authorize'],
      ['begin', 'review-begin'],
    ] as const) {
      const replay = applyProtectedRemoteWorkStep(changed, {
        kind: 'lab_step',
        workId,
        action,
        operationKey,
      })
      expect(replay.ok).toBe(true)
      expect(replay.state).toBe(changed)
    }
    const completed = applyProtectedRemoteWorkStep(state, {
      kind: 'lab_step',
      workId,
      action: 'complete',
      operationKey: 'review-complete',
    })
    assert(completed.ok)
    const saved = loadGameSave(serializeGameSave({ ...completed.state!, agents: changed.agents }))
    const replay = applyProtectedRemoteWorkStep(saved, {
      kind: 'lab_step',
      workId,
      action: 'complete',
      operationKey: 'review-complete',
    })
    expect(replay.ok).toBe(true)
    expect(replay.state).toBe(saved)
  })

  it('holds on loss of live operator readiness and permits abandonment without clearing effects', () => {
    const { state, workId, operator } = startedLab()
    const changed = {
      ...state,
      agents: {
        ...state.agents,
        [operator.id]: { ...state.agents[operator.id]!, status: 'dead' as const },
      },
    }
    const held = applyProtectedRemoteWorkStep(changed, {
      kind: 'lab_step',
      workId,
      action: 'complete',
      operationKey: 'unsafe-complete',
    })
    expect(held.work?.stage).toBe('held')
    expect(held.work?.reasonCodes).toContain('procedure_not_ready')
    const saved = loadGameSave(serializeGameSave(held.state!))
    expect(projectProtectedRemoteWorkGameplayView(saved).rows[0]?.canAbort).toBe(true)
    const aborted = applyProtectedRemoteWorkStep(saved, {
      kind: 'abort',
      workId,
      operationKey: 'abandon-unsafe',
    })
    assert(aborted.ok)
    expect(aborted.work).toMatchObject({
      stage: 'failed',
      procedureEffectsOccurred: true,
      exposureCleared: false,
    })
    expect(aborted.work.reasonCodes).not.toContain('aborted_before_start')
    expect(projectProtectedRemoteWorkGameplayView(aborted.state!).canRequest).toBe(true)
  })

  it('fails on a canonical barrier breach without claiming exposure clearance or applying another dose', () => {
    let state = createStartingState()
    const operator = projectProtectedRemoteWorkGameplayView(state).operators.find(
      (entry) => entry.available && entry.qualified
    )!
    const requested = applyProtectedRemoteWorkStep(state, {
      kind: 'request_lab',
      operatorRef: operator.id,
      operationKey: 'request-breach',
    })
    assert(requested.ok)
    const workId = requested.work.workId
    const authorized = applyProtectedRemoteWorkStep(requested.state!, {
      kind: 'lab_step',
      workId,
      action: 'authorize',
      operationKey: 'authorize-breach',
    })
    assert(authorized.ok)
    const begun = applyProtectedRemoteWorkStep(authorized.state!, {
      kind: 'lab_step',
      workId,
      action: 'begin',
      operationKey: 'begin-breach',
    })
    assert(begun.ok)
    state = {
      ...begun.state!,
      containmentBarrierIntegrity: {
        blast_door_membrane: {
          zoneId: 'blast_door_membrane',
          status: 'zone_breach',
          sourceInstanceId: 'field-containment-blast-door',
          sourceDeficiencyKind: 'hard_stop',
        },
      },
    }
    const barrier = state.containmentBarrierIntegrity
    const result = applyProtectedRemoteWorkStep(state, {
      kind: 'lab_step',
      workId,
      action: 'complete',
      operationKey: 'complete-breach',
    })
    assert(!result.ok)
    expect(result.work).toMatchObject({ stage: 'failed', exposureCleared: false })
    expect(result.reasonCodes).toContain('barrier_degraded')
    expect(result.reasonCodes).not.toContain('exposure_routed')
    expect(result.state?.containmentBarrierIntegrity).toBe(barrier)
    expect(result.work?.pendingCorrectiveAction).toBe('route_exposure_and_restore_barrier')
  })
  it('starts from the real new-campaign roster, holds on disconnection, resumes and persists one observation', () => {
    let state = createStartingState()
    const operator = projectProtectedRemoteWorkGameplayView(state).operators.find(
      (entry) => entry.available && entry.qualified
    )
    expect(operator, 'starter campaign must expose an eligible real operator').toBeDefined()
    const step = (command: ProtectedRemoteWorkStepCommand) => {
      const result = applyProtectedRemoteWorkStep(state, command)
      expect(result.ok, JSON.stringify(result)).toBe(true)
      state = result.state!
      return result
    }
    const requested = step({
      kind: 'request_lab',
      operatorRef: operator!.id,
      operationKey: 'request-real-lab',
    })
    assert(requested.ok)
    const workId = requested.work.workId
    const initialRequest = state
    step({ kind: 'request_lab', operatorRef: operator!.id, operationKey: 'request-real-lab' })
    expect(state).toBe(initialRequest)
    step({ kind: 'lab_step', workId, action: 'authorize', operationKey: 'authorize-real-lab' })
    step({ kind: 'lab_step', workId, action: 'begin', operationKey: 'begin-real-lab' })
    const begunWork = state.facilityProtectedRemoteWorkCells![workId]!
    expect(begunWork.procedureExecutionReceipt).toMatchObject({
      executionKey: `procedure:${workId}`,
      consequenceApplied: true,
    })
    const withoutReceipt = {
      ...state,
      facilityProtectedRemoteWorkCells: {
        [workId]: { ...begunWork, procedureExecutionReceipt: undefined },
      },
    }
    expect(
      applyProtectedRemoteWorkStep(withoutReceipt, {
        kind: 'lab_step',
        workId,
        action: 'complete',
        operationKey: 'no-receipt',
      })
    ).toMatchObject({ ok: false, code: 'work_not_committed' })
    const alreadyConnected = {
      kind: 'lab_control' as const,
      workId,
      control: 'connected' as const,
      value: true,
      operationKey: 'confirm-connected-real-lab',
    }
    step(alreadyConnected)
    const held = step({
      kind: 'lab_control',
      workId,
      control: 'connected',
      value: false,
      operationKey: 'disconnect-real-lab',
    })
    expect(held.work?.stage).toBe('held')
    expect(state.facilityProtectedRemoteWorkStation?.connected).toBe(false)
    state = loadGameSave(serializeGameSave(state))
    expect(state.facilityProtectedRemoteWorkStation?.connected).toBe(false)
    const disconnected = state
    step(alreadyConnected)
    expect(state).toBe(disconnected)
    expect(state.facilityProtectedRemoteWorkStation?.connected).toBe(false)
    const blocked = applyProtectedRemoteWorkStep(state, {
      kind: 'lab_step',
      workId,
      action: 'complete',
      operationKey: 'complete-while-held',
    })
    expect(blocked.ok).toBe(false)
    expect(blocked.work?.stage).toBe('held')
    state = blocked.state!
    step({
      kind: 'lab_control',
      workId,
      control: 'connected',
      value: true,
      operationKey: 'reconnect-real-lab',
    })
    step({ kind: 'lab_step', workId, action: 'resume', operationKey: 'resume-real-lab' })
    const restored = state
    step({
      kind: 'lab_control',
      workId,
      control: 'connected',
      value: false,
      operationKey: 'disconnect-real-lab',
    })
    expect(state).toBe(restored)
    expect(state.facilityProtectedRemoteWorkStation?.connected).toBe(true)
    const command = {
      kind: 'lab_step' as const,
      workId,
      action: 'complete' as const,
      operationKey: 'complete-real-lab',
    }
    step(command)
    state = loadGameSave(serializeGameSave(state))
    const saved = state
    step(command)
    expect(state).toBe(saved)
    expect(state.facilityProtectedRemoteWorkCells?.[workId]).toMatchObject({
      stage: 'completed',
      stationId: PROTECTED_LAB.stationId,
      operatorRef: operator!.id,
      operatorNodeId: PROTECTED_LAB.operatorNodeId,
      targetZoneRef: PROTECTED_LAB.targetZoneRef,
      targetRef: PROTECTED_LAB.targetRef,
      exposureCleared: false,
    })
    expect(projectProtectedRemoteWorkGameplayView(state).canRequest).toBe(true)
    step({
      kind: 'request_lab',
      operatorRef: operator!.id,
      operationKey: 'another-observation-same-week',
    })
    expect(Object.keys(state.facilityProtectedRemoteWorkCells!)).toHaveLength(2)
  })
  it('uses live facility, room, clearance and target facts rather than all-ready caller inputs', () => {
    const state = createStartingState()
    const operator = projectProtectedRemoteWorkGameplayView(state).operators.find(
      (entry) => entry.available && entry.qualified
    )!
    const before = buildProtectedLabFacts(state, operator.id, 'test-work')
    expect(before.gates.zoneAccessOk).toBe(false)
    const briefed = {
      ...state,
      facilityProtectedRemoteWorkStation: {
        ...state.facilityProtectedRemoteWorkStation!,
        briefedOperatorRefs: [operator.id],
      },
    }
    expect(buildProtectedLabFacts(briefed, operator.id, 'test-work').gates).toEqual({
      stationReady: true,
      stationConnected: true,
      capabilitySupported: true,
      operatorAvailable: true,
      operatorQualified: true,
      zoneAccessOk: true,
      roomConfigSafe: true,
      integrityOk: true,
    })
    expect(
      buildProtectedLabFacts(
        { ...briefed, agency: { ...briefed.agency!, clearanceLevel: 0 }, clearanceLevel: 0 },
        operator.id,
        'test-work'
      ).gates.zoneAccessOk
    ).toBe(false)
    expect(
      buildProtectedLabFacts({ ...briefed, facilityState: undefined }, operator.id, 'test-work')
        .gates.stationReady
    ).toBe(false)
    expect(
      buildProtectedLabFacts(
        {
          ...briefed,
          facilityProtectedRemoteWorkStation: {
            ...briefed.facilityProtectedRemoteWorkStation,
            roomState: {
              ...briefed.facilityProtectedRemoteWorkStation.roomState,
              locks: 'unlocked',
            },
          },
        },
        operator.id,
        'test-work'
      ).gates.roomConfigSafe
    ).toBe(false)
    expect(
      buildProtectedLabFacts(
        {
          ...briefed,
          facilityProtectedRemoteWorkStation: {
            ...briefed.facilityProtectedRemoteWorkStation,
            capabilityTags: [],
          },
        },
        operator.id,
        'test-work'
      ).gates.capabilitySupported
    ).toBe(false)
    expect(
      buildProtectedLabFacts(
        {
          ...briefed,
          facilityProtectedRemoteWorkStation: {
            ...briefed.facilityProtectedRemoteWorkStation,
            deviceTags: [],
          },
        },
        operator.id,
        'test-work'
      ).gates.capabilitySupported
    ).toBe(false)
    expect(
      buildProtectedLabFacts(
        {
          ...briefed,
          facilityProtectedRemoteWorkStation: {
            ...briefed.facilityProtectedRemoteWorkStation,
            targetPresent: false,
          },
        },
        operator.id,
        'test-work'
      ).gates.stationConnected
    ).toBe(false)
    expect(
      buildProtectedLabFacts(briefed, 'absent-operator', 'test-work').gates.operatorAvailable
    ).toBe(false)
  })
  it('does not grant a new station to old or malformed saved campaigns', () => {
    const old = {
      ...createStartingState(),
      facilityProtectedRemoteWorkStation: undefined,
      facilityState: undefined,
    }
    const legacy = loadGameSave(serializeGameSave(old))
    expect(legacy.facilityProtectedRemoteWorkStation).toBeUndefined()
    expect(legacy.facilityState).toBeUndefined()
    const corrupt = {
      ...createStartingState(),
      facilityProtectedRemoteWorkStation: { version: 1, enabled: true },
    }
    const loaded = loadGameSave(serializeGameSave(corrupt as never))
    expect(loaded.facilityProtectedRemoteWorkStation).toBeUndefined()
  })
})

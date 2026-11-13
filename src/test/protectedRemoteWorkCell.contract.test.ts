import { assert, describe, expect, it } from 'vitest'
import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { createStartingState } from '../data/startingState'
import {
  abortProtectedRemoteWork,
  beginProtectedRemoteWork,
  completeProtectedRemoteWork,
  createProtectedRemoteWorkCell,
  interruptProtectedRemoteWork,
  parseFacilityProtectedRemoteWorkCells,
  projectExplainableProtectedRemoteWork,
  projectProtectedRemoteWorkInternalTelemetry,
  resumeProtectedRemoteWork,
  runProtectedRemoteWorkPreflight,
  type ProtectedRemoteWorkPreflightGates,
  type ProtectedRemoteWorkRecord,
} from '../domain/protectedRemoteWorkCell'
import {
  buildCanonicalProcedureAdapterFixture,
  withBlockedAuthorizationDecision,
} from './helpers/canonicalProcedureAdapterFixture'

const openGates: ProtectedRemoteWorkPreflightGates = Object.freeze({
  stationReady: true,
  stationConnected: true,
  capabilitySupported: true,
  operatorAvailable: true,
  operatorQualified: true,
  zoneAccessOk: true,
  roomConfigSafe: true,
  integrityOk: true,
})

function procedureAdapter(executionKey = 'exec-remote-lab-1') {
  return buildCanonicalProcedureAdapterFixture({
    procedureId: 'containment_lab_sample_observation',
    canonicalName: 'Containment Lab Sample Observation',
    executionKey,
  })
}

function createWork(overrides: Partial<Parameters<typeof createProtectedRemoteWorkCell>[0]> = {}) {
  return createProtectedRemoteWorkCell({
    workId: 'rw-1',
    stationId: 'station:glovebox-a',
    operatorRef: 'operative:lab-tech-1',
    operatorNodeId: 'room:observation_booth',
    targetZoneRef: 'zone:containment_lab',
    targetRef: 'sample:andromeda-fragment',
    capabilityTag: 'sample_observe',
    operationKey: 'op-create-1',
    ...overrides,
  })
}

function runHappyPath(work: ProtectedRemoteWorkRecord): ProtectedRemoteWorkRecord {
  const preflight = runProtectedRemoteWorkPreflight({
    work,
    operationKey: 'op-preflight-1',
    gates: openGates,
    procedureAdapter: procedureAdapter(),
    authorizationRef: 'auth:remote-1',
  })
  expect(preflight.ok).toBe(true)
  const started = beginProtectedRemoteWork(preflight.work!, {
    operationKey: 'op-begin-1',
    procedureAdapter: procedureAdapter(),
  })
  expect(started.ok).toBe(true)
  const completed = completeProtectedRemoteWork(started.work!, {
    operationKey: 'op-complete-1',
    workCommitted: true,
  })
  expect(completed.ok).toBe(true)
  return completed.work!
}

describe('SPE-3501 protected remote-work cell', () => {
  it('completes a valid remote sample observation without colocating the operator', () => {
    const created = createWork()
    expect(created.ok).toBe(true)
    expect(created.work?.stage).toBe('requested')
    expect(created.work?.operatorNodeId).not.toBe(created.work?.targetZoneRef)

    const completed = runHappyPath(created.work!)
    expect(completed.stage).toBe('completed')
    expect(completed.procedureEffectsOccurred).toBe(true)
    expect(completed.exposureCleared).toBe(false)
    expect(completed.authorizationRef).toBe('auth:remote-1')
    expect(completed.procedureExecutionKey).toBe('exec-remote-lab-1')
    expect(projectExplainableProtectedRemoteWork(completed)).toMatchObject({
      stage: 'completed',
      outcome: 'completed',
      procedureEffectsOccurred: true,
      exposureCleared: false,
      capabilityTag: 'sample_observe',
    })
  })

  it('rejects create when operator node equals sealed target zone', () => {
    const blocked = createWork({
      operatorNodeId: 'zone:containment_lab',
      targetZoneRef: 'zone:containment_lab',
    })
    expect(blocked.ok).toBe(false)
    assert(!blocked.ok)
    expect(blocked.code).toBe('operator_in_target_zone')
  })

  it('fail-closes unsupported capability without procedure effects', () => {
    const created = createWork()
    const blocked = runProtectedRemoteWorkPreflight({
      work: created.work!,
      operationKey: 'op-preflight-cap',
      gates: { ...openGates, capabilitySupported: false },
      procedureAdapter: procedureAdapter(),
    })
    expect(blocked.ok).toBe(false)
    expect(blocked.work?.stage).toBe('blocked')
    assert(!blocked.ok)
    expect(blocked.reasonCodes).toContain('capability_unsupported')
    expect(blocked.work?.procedureEffectsOccurred).toBe(false)
  })

  it('fail-closes unqualified or unavailable operator', () => {
    const created = createWork()
    const unqualified = runProtectedRemoteWorkPreflight({
      work: created.work!,
      operationKey: 'op-preflight-unqual',
      gates: { ...openGates, operatorQualified: false },
    })
    expect(unqualified.ok).toBe(false)
    assert(!unqualified.ok)
    expect(unqualified.reasonCodes).toContain('operator_unqualified')

    const unavailable = runProtectedRemoteWorkPreflight({
      work: created.work!,
      operationKey: 'op-preflight-unavail',
      gates: { ...openGates, operatorAvailable: false },
    })
    expect(unavailable.ok).toBe(false)
    assert(!unavailable.ok)
    expect(unavailable.reasonCodes).toContain('operator_unavailable')
  })

  it('fail-closes broken station or unsafe room / integrity', () => {
    const created = createWork()
    const broken = runProtectedRemoteWorkPreflight({
      work: created.work!,
      operationKey: 'op-preflight-broken',
      gates: { ...openGates, stationReady: false, stationConnected: false },
    })
    expect(broken.ok).toBe(false)
    assert(!broken.ok)
    expect(broken.reasonCodes).toEqual(
      expect.arrayContaining(['station_not_ready', 'station_disconnected'])
    )

    const unsafe = runProtectedRemoteWorkPreflight({
      work: created.work!,
      operationKey: 'op-preflight-unsafe',
      gates: { ...openGates, roomConfigSafe: false, integrityOk: false },
    })
    expect(unsafe.ok).toBe(false)
    assert(!unsafe.ok)
    expect(unsafe.reasonCodes).toEqual(
      expect.arrayContaining(['room_config_unsafe', 'integrity_degraded'])
    )
  })

  it('fail-closes blocked SPE-2995 procedure readiness', () => {
    const created = createWork()
    const blocked = runProtectedRemoteWorkPreflight({
      work: created.work!,
      operationKey: 'op-preflight-proc',
      gates: openGates,
      procedureAdapter: {
        ...procedureAdapter(),
        prerequisiteDecisions: withBlockedAuthorizationDecision(),
      },
    })
    expect(blocked.ok).toBe(false)
    assert(!blocked.ok)
    expect(blocked.reasonCodes).toContain('procedure_not_ready')
    expect(blocked.evidence?.procedureReadiness?.ok).toBe(false)
  })

  it('holds on station disablement / connection loss without clearing exposure', () => {
    const created = createWork()
    const preflight = runProtectedRemoteWorkPreflight({
      work: created.work!,
      operationKey: 'op-preflight-1',
      gates: openGates,
      procedureAdapter: procedureAdapter(),
    })
    const started = beginProtectedRemoteWork(preflight.work!, {
      operationKey: 'op-begin-1',
      procedureAdapter: procedureAdapter(),
    })
    expect(started.ok).toBe(true)

    const held = interruptProtectedRemoteWork(started.work!, {
      operationKey: 'op-interrupt-station',
      kind: 'station_disabled',
    })
    expect(held.ok).toBe(false)
    expect(held.work?.stage).toBe('held')
    assert(!held.ok)
    expect(held.reasonCodes).toEqual(
      expect.arrayContaining(['station_disabled', 'interrupted_during_work'])
    )
    expect(held.work?.procedureEffectsOccurred).toBe(true)
    expect(held.work?.exposureCleared).toBe(false)
  })

  it('routes exposure on barrier degradation without clearing it via spatial separation', () => {
    const created = createWork()
    const preflight = runProtectedRemoteWorkPreflight({
      work: created.work!,
      operationKey: 'op-preflight-1',
      gates: openGates,
      procedureAdapter: procedureAdapter(),
    })
    const started = beginProtectedRemoteWork(preflight.work!, {
      operationKey: 'op-begin-1',
      procedureAdapter: procedureAdapter(),
    })
    const failed = interruptProtectedRemoteWork(started.work!, {
      operationKey: 'op-interrupt-barrier',
      kind: 'barrier_degraded',
      routeExposure: true,
    })
    expect(failed.ok).toBe(false)
    expect(failed.work?.stage).toBe('failed')
    assert(!failed.ok)
    expect(failed.reasonCodes).toEqual(
      expect.arrayContaining(['barrier_degraded', 'interrupted_during_work', 'exposure_routed'])
    )
    expect(failed.work?.exposureCleared).toBe(false)
    expect(failed.work?.exposureOwnerHint).toBe('exposure')
  })

  it('is idempotent on repeated create / complete and survives save/load', () => {
    let state = createStartingState()
    const first = createWork({ operationKey: 'op-create-a' })
    expect(first.ok).toBe(true)
    const withCreate = createProtectedRemoteWorkCell(
      {
        workId: 'rw-1',
        stationId: 'station:glovebox-a',
        operatorRef: 'operative:lab-tech-1',
        operatorNodeId: 'room:observation_booth',
        targetZoneRef: 'zone:containment_lab',
        targetRef: 'sample:andromeda-fragment',
        capabilityTag: 'sample_observe',
        operationKey: 'op-create-a',
      },
      first.state ?? state
    )
    expect(withCreate.ok).toBe(true)
    state = withCreate.state!

    const preflight = runProtectedRemoteWorkPreflight(
      {
        work: withCreate.work!,
        operationKey: 'op-preflight-a',
        gates: openGates,
        procedureAdapter: procedureAdapter('exec-remote-lab-persist'),
        authorizationRef: 'auth:remote-persist',
      },
      state
    )
    expect(preflight.ok).toBe(true)
    state = preflight.state!

    const started = beginProtectedRemoteWork(
      preflight.work!,
      {
        operationKey: 'op-begin-a',
        procedureAdapter: procedureAdapter('exec-remote-lab-persist'),
      },
      state
    )
    expect(started.ok).toBe(true)
    state = started.state!

    const completed = completeProtectedRemoteWork(
      started.work!,
      { operationKey: 'op-complete-a', workCommitted: true },
      state
    )
    expect(completed.ok).toBe(true)
    state = completed.state!

    const replay = completeProtectedRemoteWork(
      completed.work!,
      { operationKey: 'op-complete-a', workCommitted: true },
      state
    )
    expect(replay.ok).toBe(true)
    expect(replay.work?.stage).toBe('completed')

    const loaded = hydrateGame(structuredClone(state))
    expect(loaded.facilityProtectedRemoteWorkCells?.['rw-1']?.stage).toBe('completed')
    expect(loaded.facilityProtectedRemoteWorkCells?.['rw-1']?.targetRef).toBe(
      'sample:andromeda-fragment'
    )
    expect(loaded.facilityProtectedRemoteWorkCells?.['rw-1']?.exposureCleared).toBe(false)
    expect(loaded.facilityProtectedRemoteWorkCells?.['rw-1']?.appliedOperationKeys).toEqual(
      expect.arrayContaining(['op-create-a', 'op-complete-a'])
    )
    expect(Object.isFrozen(loaded.facilityProtectedRemoteWorkCells)).toBe(true)

    const roundTripped = loadGameSave(serializeGameSave(state))
    expect(roundTripped.facilityProtectedRemoteWorkCells?.['rw-1']?.stage).toBe('completed')
    expect(roundTripped.facilityProtectedRemoteWorkCells?.['rw-1']?.appliedOperationKeys).toEqual(
      expect.arrayContaining(['op-create-a', 'op-complete-a'])
    )
    expect(roundTripped.facilityProtectedRemoteWorkCells?.['rw-1']?.exposureCleared).toBe(false)
  })

  it('does not treat already_applied adapter receipts as a new begin execution', () => {
    const created = createWork()
    const preflight = runProtectedRemoteWorkPreflight({
      work: created.work!,
      operationKey: 'op-preflight-applied',
      gates: openGates,
      procedureAdapter: procedureAdapter('exec-remote-lab-applied'),
    })
    expect(preflight.ok).toBe(true)
    const adapter = {
      ...procedureAdapter('exec-remote-lab-applied'),
      priorReceipts: [
        {
          executionKey: 'exec-remote-lab-applied',
          evaluationFingerprint: 'foreign-fingerprint',
          consequenceApplied: true,
        },
      ],
    }
    const started = beginProtectedRemoteWork(preflight.work!, {
      operationKey: 'op-begin-applied',
      procedureAdapter: adapter,
    })
    expect(started.ok).toBe(false)
    assert(!started.ok)
    expect(started.code).toBe('procedure_execution_blocked')
    expect(started.work?.stage).toBe('failed')
    expect(started.work?.procedureEffectsOccurred).toBe(false)
  })

  it('aborts before start without procedure effects', () => {
    const created = createWork()
    const aborted = abortProtectedRemoteWork(created.work!, 'op-abort-1')
    expect(aborted.ok).toBe(true)
    expect(aborted.work?.stage).toBe('aborted')
    expect(aborted.work?.procedureEffectsOccurred).toBe(false)
  })

  it('retries preflight after a blocked station fault', () => {
    const created = createWork()
    const blocked = runProtectedRemoteWorkPreflight({
      work: created.work!,
      operationKey: 'op-preflight-fail',
      gates: { ...openGates, stationReady: false },
      procedureAdapter: procedureAdapter(),
    })
    expect(blocked.ok).toBe(false)
    expect(blocked.work?.stage).toBe('blocked')

    const retried = runProtectedRemoteWorkPreflight({
      work: blocked.work!,
      operationKey: 'op-preflight-retry',
      gates: openGates,
      procedureAdapter: procedureAdapter(),
      authorizationRef: 'auth:retry',
    })
    expect(retried.ok).toBe(true)
    expect(retried.work?.stage).toBe('authorized')
    expect(retried.work?.procedureEffectsOccurred).toBe(false)
  })

  it('binds begin to the preflight procedure execution key', () => {
    const created = createWork()
    const preflight = runProtectedRemoteWorkPreflight({
      work: created.work!,
      operationKey: 'op-preflight-1',
      gates: openGates,
      procedureAdapter: procedureAdapter('exec-remote-lab-1'),
    })
    const mismatched = beginProtectedRemoteWork(preflight.work!, {
      operationKey: 'op-begin-mismatch',
      procedureAdapter: procedureAdapter('exec-other-procedure'),
    })
    expect(mismatched.ok).toBe(false)
    assert(!mismatched.ok)
    expect(mismatched.code).toBe('stale_operation')
  })

  it('resumes held work without re-executing the procedure', () => {
    const created = createWork()
    const preflight = runProtectedRemoteWorkPreflight({
      work: created.work!,
      operationKey: 'op-preflight-1',
      gates: openGates,
      procedureAdapter: procedureAdapter(),
    })
    const started = beginProtectedRemoteWork(preflight.work!, {
      operationKey: 'op-begin-1',
      procedureAdapter: procedureAdapter(),
    })
    const held = interruptProtectedRemoteWork(started.work!, {
      operationKey: 'op-interrupt-station',
      kind: 'connection_lost',
    })
    expect(held.work?.stage).toBe('held')

    const resumed = resumeProtectedRemoteWork(held.work!, 'op-resume-1')
    expect(resumed.ok).toBe(true)
    expect(resumed.work?.stage).toBe('in_progress')
    expect(resumed.work?.procedureEffectsOccurred).toBe(true)
    expect(resumed.work?.exposureCleared).toBe(false)

    const completed = completeProtectedRemoteWork(resumed.work!, {
      operationKey: 'op-complete-after-resume',
      workCommitted: true,
    })
    expect(completed.ok).toBe(true)
    expect(completed.work?.stage).toBe('completed')
  })

  it('parses durable records and drops malformed entries', () => {
    const parsed = parseFacilityProtectedRemoteWorkCells({
      good: {
        workId: 'good',
        stationId: 'station:a',
        operatorRef: 'op:1',
        operatorNodeId: 'room:booth',
        targetZoneRef: 'zone:lab',
        targetRef: 'sample:1',
        capabilityTag: 'sample_observe',
        stage: 'completed',
        reasonCodes: [],
        appliedOperationKeys: ['op-1'],
        procedureEffectsOccurred: true,
        exposureCleared: false,
      },
      colocated: {
        workId: 'colocated',
        stationId: 'station:a',
        operatorRef: 'op:1',
        operatorNodeId: 'zone:lab',
        targetZoneRef: 'zone:lab',
        targetRef: 'sample:1',
        capabilityTag: 'sample_observe',
        stage: 'authorized',
        reasonCodes: [],
        appliedOperationKeys: ['op-1'],
        procedureEffectsOccurred: false,
        exposureCleared: false,
      },
      bad: { workId: 'bad', stage: 'completed' },
    })
    expect(parsed?.good?.stage).toBe('completed')
    expect(parsed?.colocated).toBeUndefined()
    expect(parsed?.bad).toBeUndefined()
  })

  it('keeps a bounded explainability projection for facility/action consumers', () => {
    const created = createWork()
    const packet = projectExplainableProtectedRemoteWork(created.work!)
    expect(packet).toMatchObject({
      workId: 'rw-1',
      stationId: 'station:glovebox-a',
      outcome: 'in_progress',
      exposureCleared: false,
    })
  })

  it('separates internal telemetry from player-facing explainability and stays bounded under load', () => {
    const created = createWork()
    const playerFacing = projectExplainableProtectedRemoteWork(created.work!)
    const internal = projectProtectedRemoteWorkInternalTelemetry(created.work!)
    expect(playerFacing).not.toHaveProperty('audience')
    expect(internal).toMatchObject({
      audience: 'internal_validation',
      workId: 'rw-1',
      stage: 'requested',
      appliedOperationKeyCount: 1,
      procedureEffectsOccurred: false,
      exposureCleared: false,
    })

    const startedAt = performance.now()
    for (let index = 0; index < 200; index += 1) {
      const work = createProtectedRemoteWorkCell({
        workId: `rw-perf-${index}`,
        stationId: 'station:glovebox-a',
        operatorRef: 'operative:lab-tech-1',
        operatorNodeId: 'room:observation_booth',
        targetZoneRef: 'zone:containment_lab',
        targetRef: `sample:frag-${index}`,
        capabilityTag: 'sample_observe',
        operationKey: `op-perf-${index}`,
      })
      expect(work.ok).toBe(true)
      expect(Object.isFrozen(work.work)).toBe(true)
      expect(projectProtectedRemoteWorkInternalTelemetry(work.work!).audience).toBe(
        'internal_validation'
      )
    }
    expect(performance.now() - startedAt).toBeLessThan(2000)
  })
})

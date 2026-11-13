import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { applyProtectedRemoteWorkStep } from '../../domain/protectedRemoteWorkCellLivePath'
import { projectProtectedRemoteWorkGameplayView } from './protectedRemoteWorkGameplayView'
import { serializeGameSave, loadGameSave } from '../../app/store/saveSystem'
import { buildCanonicalProcedureAdapterFixture } from '../../test/helpers/canonicalProcedureAdapterFixture'

describe('protected remote-work Agency consumer', () => {
  it('dispatches supplied procedure facts through completion and preserves replay receipts', () => {
    let state = createStartingState()
    const created = applyProtectedRemoteWorkStep(state, {
      kind: 'create',
      workId: 'work-complete',
      stationId: 'station-a',
      operatorRef: 'operator-a',
      operatorNodeId: 'operator-room',
      targetZoneRef: 'sealed-room',
      targetRef: 'sample-a',
      capabilityTag: 'sample_observe',
      operationKey: 'create-complete',
    })
    state = created.state!
    const procedureAdapter = buildCanonicalProcedureAdapterFixture({
      procedureId: 'sample-observe',
      canonicalName: 'Sample observation',
      executionKey: 'execution-complete',
    })
    const preflight = applyProtectedRemoteWorkStep(state, {
      kind: 'preflight',
      workId: 'work-complete',
      operationKey: 'preflight-complete',
      procedureAdapter,
      gates: {
        stationReady: true,
        stationConnected: true,
        capabilitySupported: true,
        operatorAvailable: true,
        operatorQualified: true,
        zoneAccessOk: true,
        roomConfigSafe: true,
        integrityOk: true,
      },
    })
    expect(preflight.ok).toBe(true)
    const started = applyProtectedRemoteWorkStep(preflight.state!, {
      kind: 'begin',
      workId: 'work-complete',
      operationKey: 'begin-complete',
      procedureAdapter,
    })
    expect(started.ok).toBe(true)
    const complete = {
      kind: 'complete' as const,
      workId: 'work-complete',
      operationKey: 'complete-operation',
      workCommitted: true,
    }
    const completed = applyProtectedRemoteWorkStep(started.state!, complete)
    expect(completed.ok).toBe(true)
    const loaded = loadGameSave(serializeGameSave(completed.state!))
    const repeated = applyProtectedRemoteWorkStep(loaded, complete)
    expect(repeated.state).toBe(loaded)
    expect(projectProtectedRemoteWorkGameplayView(repeated.state!).rows[0]).toMatchObject({
      stage: 'completed',
      procedureEffectsOccurred: true,
      exposureCleared: false,
      canAbort: false,
    })
  })
  it('does not invent available tasks or owner readiness in a fresh campaign', () => {
    expect(projectProtectedRemoteWorkGameplayView(createStartingState()).rows).toEqual([])
  })
  it('persists caller-supplied identity, projects an allowed abort, and rejects stale work', () => {
    const state = createStartingState()
    const result = applyProtectedRemoteWorkStep(state, {
      kind: 'create',
      workId: 'work-1',
      stationId: 'station-a',
      operatorRef: 'operator-a',
      operatorNodeId: 'room:med_bay',
      targetZoneRef: 'room:containment_cell',
      targetRef: 'sample-a',
      capabilityTag: 'sample_observe',
      operationKey: 'request-1',
    })
    expect(result.ok).toBe(true)
    const loaded = loadGameSave(serializeGameSave(result.state!))
    const view = projectProtectedRemoteWorkGameplayView(loaded)
    expect(view.rows[0]).toMatchObject({
      workId: 'work-1',
      stage: 'requested',
      canAbort: true,
      exposureCleared: false,
    })
    const aborted = applyProtectedRemoteWorkStep(loaded, {
      kind: 'abort',
      workId: 'work-1',
      operationKey: 'abort-1',
    })
    expect(aborted.ok).toBe(true)
    expect(projectProtectedRemoteWorkGameplayView(aborted.state!).rows[0]).toMatchObject({
      stage: 'aborted',
      canAbort: false,
    })
    expect(
      applyProtectedRemoteWorkStep(loaded, {
        kind: 'abort',
        workId: '__proto__',
        operationKey: 'invalid',
      })
    ).toMatchObject({ ok: false, code: 'stale_operation', state: loaded })
    expect(state.facilityProtectedRemoteWorkCells).toBeUndefined()
  })
})

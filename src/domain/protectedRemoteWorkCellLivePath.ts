import type { GameState } from './models'
import {
  abortProtectedRemoteWork,
  beginProtectedRemoteWork,
  completeProtectedRemoteWork,
  createProtectedRemoteWorkCell,
  interruptProtectedRemoteWork,
  parseFacilityProtectedRemoteWorkCells,
  resumeProtectedRemoteWork,
  recordProtectedRemoteWorkControl,
  runProtectedRemoteWorkPreflight,
  type ProtectedRemoteWorkCreateInput,
  type ProtectedRemoteWorkInterruptKind,
  type ProtectedRemoteWorkPreflightGates,
  type ProtectedRemoteWorkResult,
} from './protectedRemoteWorkCell'
import type { ProcedureToActionAdapterInput } from './procedureToActionAdapter'
import {
  PROTECTED_LAB,
  buildProtectedLabFacts,
  isAuthoredProtectedLabWork,
  parseProtectedRemoteWorkStation,
} from './protectedRemoteWorkLab'

export type ProtectedRemoteWorkStepCommand =
  | { readonly kind: 'request_lab'; readonly operatorRef: string; readonly operationKey: string }
  | {
      readonly kind: 'lab_step'
      readonly workId: string
      readonly operationKey: string
      readonly action: 'authorize' | 'begin' | 'complete' | 'resume'
    }
  | {
      readonly kind: 'lab_control'
      readonly workId: string
      readonly control: 'enabled' | 'connected'
      readonly value: boolean
      readonly operationKey: string
    }
  | ({ readonly kind: 'create' } & ProtectedRemoteWorkCreateInput)
  | {
      readonly kind: 'preflight'
      readonly workId: string
      readonly operationKey: string
      readonly gates: ProtectedRemoteWorkPreflightGates
      readonly procedureAdapter: ProcedureToActionAdapterInput
      readonly authorizationRef?: string
    }
  | {
      readonly kind: 'begin'
      readonly workId: string
      readonly operationKey: string
      readonly procedureAdapter: ProcedureToActionAdapterInput
    }
  | {
      readonly kind: 'interrupt'
      readonly workId: string
      readonly operationKey: string
      readonly interruption: ProtectedRemoteWorkInterruptKind
      readonly routeExposure?: boolean
    }
  | {
      readonly kind: 'complete'
      readonly workId: string
      readonly operationKey: string
      readonly workCommitted: boolean
    }
  | { readonly kind: 'resume' | 'abort'; readonly workId: string; readonly operationKey: string }

/** Persist coordinator results without adding another procedure resolver or ledger. */
export function applyProtectedRemoteWorkStep(
  state: GameState,
  command: ProtectedRemoteWorkStepCommand
): ProtectedRemoteWorkResult {
  if (typeof command.operationKey !== 'string' || command.operationKey.trim().length === 0)
    return { ok: false, code: 'malformed_input', reasonCodes: ['malformed_input'], state }
  if (command.kind === 'request_lab') {
    if (!Number.isSafeInteger(state.week) || state.week < 1)
      return { ok: false, code: 'malformed_input', reasonCodes: ['malformed_input'], state }
    const works =
      parseFacilityProtectedRemoteWorkCells(state.facilityProtectedRemoteWorkCells) ?? {}
    const workId = `clinical-observation:${command.operationKey.trim()}`
    const existing = Object.hasOwn(works, workId) ? works[workId] : undefined
    if (existing)
      return existing.operatorRef === command.operatorRef &&
        existing.appliedOperationKeys.includes(command.operationKey.trim())
        ? { ok: true, work: existing, state }
        : { ok: false, code: 'stale_operation', reasonCodes: ['stale_operation'], state }
    if (
      Object.values(works).some(
        (work) =>
          isAuthoredProtectedLabWork(work) &&
          ['requested', 'authorized', 'in_progress', 'held', 'blocked'].includes(work.stage)
      )
    )
      return { ok: false, code: 'stale_operation', reasonCodes: ['stale_operation'], state }
    if (
      !Object.hasOwn(state.agents, command.operatorRef) ||
      !parseProtectedRemoteWorkStation(state.facilityProtectedRemoteWorkStation)
    )
      return { ok: false, code: 'station_not_ready', reasonCodes: ['station_not_ready'], state }
    return createProtectedRemoteWorkCell(
      {
        ...PROTECTED_LAB,
        operatorRef: command.operatorRef,
        workId,
        operationKey: command.operationKey,
      },
      state
    )
  }
  if (command.kind === 'lab_control') {
    if (command.control !== 'enabled' && command.control !== 'connected')
      return { ok: false, code: 'malformed_input', reasonCodes: ['malformed_input'], state }
    const station = parseProtectedRemoteWorkStation(state.facilityProtectedRemoteWorkStation)
    if (!station || typeof command.value !== 'boolean')
      return { ok: false, code: 'station_not_ready', reasonCodes: ['station_not_ready'], state }
    const currentWorks =
      parseFacilityProtectedRemoteWorkCells(state.facilityProtectedRemoteWorkCells) ?? {}
    const controlledWork = Object.hasOwn(currentWorks, command.workId)
      ? currentWorks[command.workId]
      : undefined
    if (!controlledWork || !isAuthoredProtectedLabWork(controlledWork))
      return { ok: false, code: 'stale_operation', reasonCodes: ['stale_operation'], state }
    if (controlledWork.appliedOperationKeys.includes(command.operationKey.trim()))
      return { ok: true, work: controlledWork, state }
    if (['completed', 'failed', 'aborted'].includes(controlledWork.stage))
      return {
        ok: false,
        work: controlledWork,
        code: 'illegal_transition',
        reasonCodes: ['illegal_transition'],
        state,
      }
    if (station[command.control] === command.value)
      return recordProtectedRemoteWorkControl(controlledWork, command.operationKey, state)
    let next: GameState = {
      ...state,
      facilityProtectedRemoteWorkStation: { ...station, [command.control]: command.value },
    }
    if (!command.value) {
      const works =
        parseFacilityProtectedRemoteWorkCells(next.facilityProtectedRemoteWorkCells) ?? {}
      for (const work of Object.values(works)) {
        if (isAuthoredProtectedLabWork(work) && ['in_progress', 'held'].includes(work.stage)) {
          const held = interruptProtectedRemoteWork(
            work,
            {
              operationKey: command.operationKey,
              kind: command.control === 'enabled' ? 'station_disabled' : 'connection_lost',
            },
            next
          )
          next = held.state ?? next
        }
      }
    }
    const works = parseFacilityProtectedRemoteWorkCells(next.facilityProtectedRemoteWorkCells) ?? {}
    return recordProtectedRemoteWorkControl(works[command.workId]!, command.operationKey, next)
  }
  if (command.kind === 'create') return createProtectedRemoteWorkCell(command, state)
  const map = parseFacilityProtectedRemoteWorkCells(state.facilityProtectedRemoteWorkCells)
  const work = map && Object.hasOwn(map, command.workId) ? map[command.workId] : undefined
  if (!work) return { ok: false, code: 'stale_operation', reasonCodes: ['stale_operation'], state }
  if (command.kind === 'lab_step') {
    if (!isAuthoredProtectedLabWork(work))
      return { ok: false, code: 'stale_operation', reasonCodes: ['stale_operation'], state }
    if (work.appliedOperationKeys.includes(command.operationKey.trim()))
      return { ok: true, work, state }
    if (command.action === 'authorize' && !['requested', 'blocked'].includes(work.stage))
      return {
        ok: false,
        work,
        code: 'illegal_transition',
        reasonCodes: ['illegal_transition'],
        state,
      }
    let current = state
    const station = parseProtectedRemoteWorkStation(state.facilityProtectedRemoteWorkStation)
    if (command.action === 'authorize' && station && Object.hasOwn(state.agents, work.operatorRef))
      current = {
        ...state,
        facilityProtectedRemoteWorkStation: {
          ...station,
          briefedOperatorRefs: [...new Set([...station.briefedOperatorRefs, work.operatorRef])],
        },
      }
    const facts = buildProtectedLabFacts(current, work.operatorRef, work.workId)
    if (command.action === 'authorize')
      return runProtectedRemoteWorkPreflight(
        { work, operationKey: command.operationKey, ...facts },
        current
      )
    if (
      ['in_progress', 'held'].includes(work.stage) &&
      (!facts.gates.stationReady || !facts.gates.stationConnected || !facts.gates.integrityOk)
    )
      return interruptProtectedRemoteWork(
        work,
        {
          operationKey: command.operationKey,
          kind: !facts.gates.integrityOk
            ? 'barrier_degraded'
            : !facts.gates.stationReady
              ? 'station_disabled'
              : 'connection_lost',
        },
        current
      )
    const gateCodes = [
      [facts.gates.stationReady, 'station_not_ready'],
      [facts.gates.stationConnected, 'station_disconnected'],
      [facts.gates.capabilitySupported, 'capability_unsupported'],
      [facts.gates.operatorAvailable, 'operator_unavailable'],
      [facts.gates.operatorQualified, 'operator_unqualified'],
      [facts.gates.zoneAccessOk, 'zone_access_denied'],
      [facts.gates.roomConfigSafe, 'room_config_unsafe'],
      [facts.gates.integrityOk, 'integrity_degraded'],
    ] as const
    const failed = gateCodes.find(([passed]) => !passed)
    if (failed && work.stage === 'in_progress')
      return interruptProtectedRemoteWork(
        work,
        { operationKey: command.operationKey, kind: 'procedure_conditions_unsafe' },
        current
      )
    if (failed)
      return { ok: false, work, code: failed[1], reasonCodes: [failed[1]], state: current }
    if (command.action === 'begin')
      return beginProtectedRemoteWork(
        work,
        { operationKey: command.operationKey, procedureAdapter: facts.procedureAdapter },
        current
      )
    if (command.action === 'resume')
      return resumeProtectedRemoteWork(work, command.operationKey, current)
    const receipt = work.procedureExecutionReceipt
    return completeProtectedRemoteWork(
      work,
      {
        operationKey: command.operationKey,
        workCommitted:
          receipt?.consequenceApplied === true &&
          receipt.executionKey === facts.procedureAdapter.executionKey &&
          work.procedureExecutionKey === receipt.executionKey,
      },
      current
    )
  }
  switch (command.kind) {
    case 'preflight':
      return runProtectedRemoteWorkPreflight({ ...command, work }, state)
    case 'begin':
      return beginProtectedRemoteWork(work, command, state)
    case 'interrupt':
      return interruptProtectedRemoteWork(work, { ...command, kind: command.interruption }, state)
    case 'complete':
      return completeProtectedRemoteWork(work, command, state)
    case 'resume':
      return resumeProtectedRemoteWork(work, command.operationKey, state)
    case 'abort':
      return abortProtectedRemoteWork(work, command.operationKey, state)
  }
}

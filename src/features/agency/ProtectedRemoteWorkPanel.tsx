import { useEffect, useId, useRef, useState } from 'react'
import type { ProtectedRemoteWorkResult } from '../../domain/protectedRemoteWorkCell'
import type { ProtectedRemoteWorkStepCommand } from '../../domain/protectedRemoteWorkCellLivePath'
import type { ProtectedRemoteWorkGameplayView } from './protectedRemoteWorkGameplayView'

export function ProtectedRemoteWorkPanel({
  view,
  applyStep,
}: {
  readonly view: ProtectedRemoteWorkGameplayView
  readonly applyStep: (command: ProtectedRemoteWorkStepCommand) => ProtectedRemoteWorkResult
}) {
  const headingId = useId()
  const [message, setMessage] = useState('')
  const [operatorRef, setOperatorRef] = useState('')
  const statusRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    if (message) statusRef.current?.focus()
  }, [message])
  const apply = (command: ProtectedRemoteWorkStepCommand) => {
    const result = applyStep(command)
    setMessage(
      result.ok
        ? `Observation ${result.work.stage.replaceAll('_', ' ')}.`
        : `Observation blocked: ${result.reasonCodes.map((code) => code.replaceAll('_', ' ')).join(', ')}.`
    )
  }
  const abort = (workId: string, stage: string) => {
    const result = applyStep({
      kind: 'abort',
      workId,
      operationKey: `agency-abort:${workId}:${stage}`,
    })
    setMessage(
      result.ok
        ? `Remote work ${workId}: ${result.work.stage}.`
        : `Remote work blocked: ${result.reasonCodes.join(', ')}.`
    )
  }
  return (
    <article className="panel space-y-3 break-words" aria-labelledby={headingId}>
      <h3 id={headingId} className="text-base font-semibold">
        Protected remote work
      </h3>
      <p className="text-sm opacity-80">
        Operate from a protected station without entering the sealed target zone. Barrier failure
        may still route exposure; spatial separation does not clear it.
      </p>
      <p ref={statusRef} role="status" tabIndex={-1}>
        {message}
      </p>
      {view.station ? (
        <>
          <p>
            Clinical observation console: {view.station.enabled ? 'enabled' : 'disabled'},{' '}
            {view.station.connected ? 'connected' : 'disconnected'}. Fixed sealed reference sample:{' '}
            {view.station.targetPresent ? 'present' : 'unavailable'}.
          </p>
          <p>
            The station manual authorizes observation only. Briefing and authorization apply to the
            selected operator; sample handling and transfer are unavailable.
          </p>
          {view.canRequest && (
            <form
              method="post"
              onSubmit={(event) => {
                event.preventDefault()
                apply({
                  kind: 'request_lab',
                  operatorRef,
                  operationKey: view.requestOperationKey,
                })
              }}
            >
              <fieldset className="space-y-2">
                <legend>Choose an observation operator</legend>
                {view.operators.map((operator) => (
                  <label
                    key={operator.id}
                    htmlFor={`${headingId}-operator-${operator.id}`}
                    className="flex min-h-12 items-center gap-2"
                  >
                    <input
                      id={`${headingId}-operator-${operator.id}`}
                      type="radio"
                      name="observation-operator"
                      value={operator.id}
                      required
                      checked={operatorRef === operator.id}
                      onChange={() => setOperatorRef(operator.id)}
                    />
                    {operator.name} — {operator.qualified ? 'qualified' : 'unqualified'},{' '}
                    {operator.available ? 'available' : 'unavailable'}
                  </label>
                ))}
              </fieldset>
              <button
                type="submit"
                className="btn btn-sm btn-primary min-h-12 max-w-full whitespace-normal"
              >
                Request sample observation
              </button>
            </form>
          )}
        </>
      ) : (
        <p>Protected observation station is unavailable in this save.</p>
      )}
      {view.rows.length === 0 ? (
        <p>
          No protected remote-work tasks are recorded. Station, target and authorized procedure
          readiness must be supplied by their owning systems.
        </p>
      ) : (
        <ul className="space-y-2">
          {view.rows.map((row) => (
            <li key={row.workId} className="rounded border border-white/10 px-3 py-2">
              <p className="font-medium">
                {row.isLabWork ? 'Sealed sample observation' : row.workId} — {row.stage}
              </p>
              {row.isLabWork ? (
                <p>
                  Station: clinical observation console. Operator:{' '}
                  {view.operators.find((operator) => operator.id === row.operatorRef)?.name ??
                    row.operatorRef}{' '}
                  at the protected medical-bay console. Target: sealed reference sample in the
                  containment cell. Operation: observation.
                </p>
              ) : (
                <p>
                  Station: {row.stationId}. Operator: {row.operatorRef} at {row.operatorNodeId}.
                  Target: {row.targetRef} in {row.targetZoneRef}. Operation: {row.capabilityTag}.
                </p>
              )}
              {row.reasonCodes.length > 0 && (
                <p>
                  Restrictions:{' '}
                  {row.reasonCodes.map((code) => code.replaceAll('_', ' ')).join(', ')}
                </p>
              )}
              {row.pendingCorrectiveAction && (
                <p>Required action: {row.pendingCorrectiveAction.replaceAll('_', ' ')}</p>
              )}
              {row.labAction && (
                <button
                  type="button"
                  className="btn btn-sm btn-primary min-h-12 max-w-full whitespace-normal"
                  onClick={() =>
                    apply({
                      kind: 'lab_step',
                      workId: row.workId,
                      operationKey: `${row.operationKey}:${row.labAction}`,
                      action: row.labAction!,
                    })
                  }
                >
                  {row.labAction === 'authorize'
                    ? 'Brief operator and authorize observation'
                    : row.labAction === 'begin'
                      ? 'Begin sample observation'
                      : row.labAction === 'resume'
                        ? 'Resume sample observation'
                        : 'Complete sample observation'}
                </button>
              )}
              {row.isLabWork && row.labAction && view.station && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-sm min-h-12 max-w-full whitespace-normal"
                    onClick={() =>
                      apply({
                        kind: 'lab_control',
                        workId: row.workId,
                        control: 'enabled',
                        value: !view.station!.enabled,
                        operationKey: `${row.operationKey}:enable:${!view.station!.enabled}`,
                      })
                    }
                  >
                    {view.station.enabled
                      ? 'Disable observation station'
                      : 'Enable observation station'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm min-h-12 max-w-full whitespace-normal"
                    onClick={() =>
                      apply({
                        kind: 'lab_control',
                        workId: row.workId,
                        control: 'connected',
                        value: !view.station!.connected,
                        operationKey: `${row.operationKey}:connect:${!view.station!.connected}`,
                      })
                    }
                  >
                    {view.station.connected
                      ? 'Disconnect observation station'
                      : 'Reconnect observation station'}
                  </button>
                </div>
              )}
              {row.canAbort && (
                <button
                  type="button"
                  className="btn btn-sm min-h-12 max-w-full whitespace-normal"
                  onClick={() =>
                    row.isLabWork
                      ? apply({
                          kind: 'abort',
                          workId: row.workId,
                          operationKey: `${row.operationKey}:abort`,
                        })
                      : abort(row.workId, row.stage)
                  }
                >
                  {row.isLabWork ? 'Abort sample observation' : `Abort remote work ${row.workId}`}
                </button>
              )}
              {!row.isLabWork && !['completed', 'aborted', 'failed'].includes(row.stage) && (
                <p>
                  Further execution requires current station, operator and procedure owner evidence.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

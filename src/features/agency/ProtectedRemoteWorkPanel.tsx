import type { GameState } from '../../domain/models'
import type { ProtectedRemoteWorkResult } from '../../domain/protectedRemoteWorkCell'
import type { ProtectedRemoteWorkStepCommand } from '../../domain/protectedRemoteWorkCellLivePath'
import {
  PROTECTED_REMOTE_WORK_GAMEPLAY_COPY,
  buildCreateProtectedRemoteWorkCommand,
  buildNextProtectedRemoteWorkCommand,
  getDefaultProtectedRemoteWorkStartRequest,
  getProtectedRemoteWorkRecord,
  type ProtectedRemoteWorkGameplayView,
} from './protectedRemoteWorkGameplayView'

type ProtectedRemoteWorkPanelProps = {
  readonly game: GameState
  readonly view: ProtectedRemoteWorkGameplayView
  readonly applyStep: (command: ProtectedRemoteWorkStepCommand) => ProtectedRemoteWorkResult
}

export function ProtectedRemoteWorkPanel({ game, view, applyStep }: ProtectedRemoteWorkPanelProps) {
  const startWork = () => {
    const command = buildCreateProtectedRemoteWorkCommand(
      getDefaultProtectedRemoteWorkStartRequest(game.week)
    )
    applyStep(command)
  }

  const advanceWork = (workId: string) => {
    const work = getProtectedRemoteWorkRecord(game, workId)
    if (work === undefined) return
    const command = buildNextProtectedRemoteWorkCommand(work, game.week)
    if (command === undefined) return
    applyStep(command)
  }

  return (
    <article className="panel space-y-3" aria-labelledby="protected-remote-work-heading">
      <h3 id="protected-remote-work-heading" className="text-base font-semibold">
        {PROTECTED_REMOTE_WORK_GAMEPLAY_COPY.heading}
      </h3>
      <p className="text-sm opacity-80">{PROTECTED_REMOTE_WORK_GAMEPLAY_COPY.explanation}</p>
      <p
        id="protected-remote-work-live"
        className="text-sm opacity-80"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {view.rows.length === 0
          ? PROTECTED_REMOTE_WORK_GAMEPLAY_COPY.empty
          : `${view.rows.length} remote-work cell${view.rows.length === 1 ? '' : 's'}; latest stage ${view.rows[view.rows.length - 1]?.stage ?? 'unknown'}.`}
      </p>
      <button
        type="button"
        className="btn btn-sm btn-primary"
        disabled={!view.canStart}
        aria-describedby="protected-remote-work-live"
        onClick={startWork}
      >
        {PROTECTED_REMOTE_WORK_GAMEPLAY_COPY.startLabel}
      </button>
      {view.rows.length === 0 ? (
        <p className="text-sm opacity-60">{PROTECTED_REMOTE_WORK_GAMEPLAY_COPY.empty}</p>
      ) : (
        <ul className="space-y-2">
          {view.rows.map((row) => (
            <li
              key={row.workId}
              className="rounded border border-white/10 px-3 py-2"
              data-stage={row.stage}
              data-active={row.active ? 'true' : 'false'}
              data-exposure-cleared={row.exposureCleared ? 'true' : 'false'}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{row.workId}</p>
                  <p className="text-sm opacity-70">
                    Station {row.stationId} · Target {row.targetRef} in {row.targetZoneRef} · Stage{' '}
                    {row.stage} · Outcome {row.outcome}
                  </p>
                  <p className="text-sm opacity-70">
                    Capability {row.capabilityTag} · Operator {row.operatorRef}
                  </p>
                  {row.blockers.length > 0 ? (
                    <p className="text-sm opacity-60">Blockers: {row.blockers.join(', ')}</p>
                  ) : null}
                  <p className="text-sm opacity-60" role="alert">
                    Hazards: {row.hazards.join(' ')}
                  </p>
                  <p className="text-sm opacity-60">
                    Allowed actions:{' '}
                    {row.allowedActions.length > 0
                      ? row.allowedActions.join(', ')
                      : 'none'}
                  </p>
                </div>
                {row.nextStep !== null ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    aria-describedby="protected-remote-work-live"
                    onClick={() => advanceWork(row.workId)}
                  >
                    {row.nextStepLabel}
                  </button>
                ) : (
                  <p className="text-sm opacity-60">{row.nextStepLabel}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

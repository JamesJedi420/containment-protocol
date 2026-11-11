import type { BreachRecoveryResult } from '../../domain/breachOriginRecovery'
import type { BreachOriginRecoveryStepCommand } from '../../domain/breachOriginRecoveryLivePath'
import type { GameState } from '../../domain/models'
import {
  BREACH_ORIGIN_RECOVERY_GAMEPLAY_COPY,
  buildCreateBreachOriginRecoveryCommand,
  buildNextBreachOriginRecoveryCommand,
  getDefaultBreachOriginRecoveryStartRequest,
  getRecoveryRecord,
  type BreachOriginRecoveryGameplayView,
} from './breachOriginRecoveryGameplayView'

type BreachOriginRecoveryPanelProps = {
  readonly game: GameState
  readonly view: BreachOriginRecoveryGameplayView
  readonly applyStep: (command: BreachOriginRecoveryStepCommand) => BreachRecoveryResult
}

export function BreachOriginRecoveryPanel({
  game,
  view,
  applyStep,
}: BreachOriginRecoveryPanelProps) {
  const startRecovery = () => {
    const command = buildCreateBreachOriginRecoveryCommand(
      getDefaultBreachOriginRecoveryStartRequest(game.week)
    )
    if (command === undefined) return
    applyStep(command)
  }

  const advanceRecovery = (recoveryId: string) => {
    const recovery = getRecoveryRecord(game, recoveryId)
    if (recovery === undefined) return
    const command = buildNextBreachOriginRecoveryCommand(recovery, game.week)
    if (command === undefined) return
    applyStep(command)
  }

  return (
    <article className="panel space-y-3" aria-labelledby="breach-origin-recovery-heading">
      <h3 id="breach-origin-recovery-heading" className="text-base font-semibold">
        {BREACH_ORIGIN_RECOVERY_GAMEPLAY_COPY.heading}
      </h3>
      <p className="text-sm opacity-80">{BREACH_ORIGIN_RECOVERY_GAMEPLAY_COPY.explanation}</p>
      <button
        type="button"
        className="btn btn-sm btn-primary"
        disabled={!view.canStart}
        onClick={startRecovery}
      >
        {BREACH_ORIGIN_RECOVERY_GAMEPLAY_COPY.startLabel}
      </button>
      {view.rows.length === 0 ? (
        <p className="text-sm opacity-60">{BREACH_ORIGIN_RECOVERY_GAMEPLAY_COPY.empty}</p>
      ) : (
        <ul className="space-y-2">
          {view.rows.map((row) => (
            <li
              key={row.recoveryId}
              className="rounded border border-white/10 px-3 py-2"
              data-stage={row.stage}
              data-active={row.active ? 'true' : 'false'}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{row.recoveryId}</p>
                  <p className="text-sm opacity-70">
                    Subject {row.subjectRef} · Stage {row.stage} · Outcome {row.outcome}
                  </p>
                  {row.reasonCodes.length > 0 ? (
                    <p className="text-sm opacity-60">Reasons: {row.reasonCodes.join(', ')}</p>
                  ) : null}
                </div>
                {row.nextStep !== null ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => advanceRecovery(row.recoveryId)}
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

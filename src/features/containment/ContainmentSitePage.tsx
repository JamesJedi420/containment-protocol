import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { buildEncounterStructureState, buildEndgameScalingState } from '../../domain/strategicState'

export default function ContainmentSitePage() {
  const { game } = useGameStore()
  const encounters = buildEncounterStructureState(game)
  const endgame = buildEndgameScalingState(game)

  return (
    <section className="space-y-4">
      <article className="panel panel-primary space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Containment Control</h2>
            <p className="text-sm opacity-60">
              Major-incident posture is derived from breach events, critical-stage incidents,
              deadline risk, and unresolved momentum across the field.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to={APP_ROUTES.cases} className="btn btn-sm btn-ghost">
              Incident Desk
            </Link>
            <Link to={APP_ROUTES.teams} className="btn btn-sm btn-ghost">
              Field Teams
            </Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Severity" value={endgame.severity.toUpperCase()} />
          <Metric label="Pressure" value={String(endgame.pressureScore)} />
          <Metric label="Boss incidents" value={String(endgame.bossIncidents)} />
          <Metric label="Incident capacity" value={String(encounters.openSlots)} />
        </div>
      </article>

      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">Endgame scaling</h3>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded border border-white/10 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">Incident load</p>
            <ul className="mt-2 space-y-1 text-sm opacity-70">
              <li>Active incidents: {endgame.activeIncidents}</li>
              <li>Required teams: {endgame.totalRequiredTeams}</li>
              <li>Recommended teams: {endgame.totalRecommendedTeams}</li>
              <li>Average multiplier: x{endgame.averageDifficultyMultiplier.toFixed(2)}</li>
            </ul>
          </div>

          <div className="rounded border border-white/10 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">Progression bands</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {endgame.progressionBands.map((band) => (
                <span
                  key={band.label}
                  className="rounded-full border border-white/10 px-2 py-1 text-xs"
                >
                  {band.label} x{band.count}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded border border-white/10 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">Escalation threshold</p>
            <p className="mt-2 text-sm opacity-70">
              {endgame.nextThreshold === null
                ? 'Already at crisis ceiling.'
                : `${endgame.pressureToNextThreshold} pressure until ${endgame.nextThreshold}.`}
            </p>
            <p className="mt-1 text-sm opacity-60">Highest active stage: {endgame.maxStage}</p>
          </div>
        </div>
      </article>

      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">Major incident board</h3>
        {endgame.incidents.length === 0 ? (
          <p className="text-sm opacity-60">
            No current incidents meet directorate crisis thresholds.
          </p>
        ) : (
          <ul className="space-y-2">
            {endgame.incidents.map((incident) => (
              <li key={incident.caseId} className="rounded border border-white/10 px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{incident.caseTitle}</p>
                    <p className="text-sm opacity-60">
                      {incident.archetypeLabel} / Stage {incident.stage} /{' '}
                      {incident.currentStageLabel} / {incident.kind === 'raid' ? 'Raid' : 'Case'} /
                      Deadline {incident.deadlineRemaining}w
                    </p>
                  </div>
                  <p className="text-sm opacity-60">Pressure {incident.pressureScore}</p>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-3">
                  <div className="rounded border border-white/10 px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.24em] opacity-50">State</p>
                    <p className="mt-1 text-sm opacity-70">
                      Teams committed {incident.assignedTeams} / required {incident.requiredTeams} /
                      recommended {incident.recommendedTeams}
                    </p>
                    <p className="mt-1 text-sm opacity-70">
                      Effective difficulty x{incident.effectiveDifficultyMultiplier.toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs opacity-60">
                      Pressure: {formatDifficultyPressure(incident.difficultyPressure)}
                    </p>
                  </div>

                  <div className="rounded border border-white/10 px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.24em] opacity-50">
                      Stage progression
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {incident.progression.map((stage) => (
                        <span
                          key={`${incident.caseId}-${stage.index}`}
                          className={`rounded-full border px-2 py-1 text-xs ${
                            stage.status === 'active'
                              ? 'border-red-400/60 bg-red-900/30 text-red-100'
                              : stage.status === 'cleared'
                                ? 'border-emerald-400/40 bg-emerald-900/20 text-emerald-100'
                                : 'border-white/10 text-white/60'
                          }`}
                        >
                          {stage.index}. {stage.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded border border-white/10 px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.24em] opacity-50">
                      Active mechanics
                    </p>
                    <ul className="mt-2 space-y-2 text-sm opacity-70">
                      {incident.specialMechanics.map((mechanic) => (
                        <li key={mechanic.id}>
                          <span className="font-medium">{mechanic.label}</span>
                          <span className="opacity-60"> - {mechanic.detail}</span>
                        </li>
                      ))}
                      {incident.bossEntity ? (
                        <li>
                          <span className="font-medium">{incident.bossEntity.name}</span>
                          <span className="opacity-60">
                            {' '}
                            / {incident.bossEntity.threatLabel} - {incident.bossEntity.detail}
                          </span>
                        </li>
                      ) : null}
                    </ul>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-xs uppercase tracking-[0.24em] opacity-50">
                    Incident modifiers
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {incident.modifiers.map((modifier) => (
                      <span
                        key={modifier.id}
                        className="rounded-full border border-white/10 px-2 py-1 text-xs"
                        title={modifier.detail}
                      >
                        {modifier.label}
                      </span>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">Encounter structure</h3>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded border border-white/10 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">Encounter mix</p>
            <ul className="mt-2 space-y-2 text-sm">
              {encounters.types.length > 0 ? (
                encounters.types.map((entry) => (
                  <li key={entry.encounterType} className="flex items-center justify-between gap-3">
                    <span>{entry.label}</span>
                    <span className="opacity-60">x{entry.count}</span>
                  </li>
                ))
              ) : (
                <li className="opacity-60">No open encounters.</li>
              )}
            </ul>
          </div>

          <div className="rounded border border-white/10 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">Incident origins</p>
            <ul className="mt-2 space-y-2 text-sm">
              {encounters.origins.length > 0 ? (
                encounters.origins.map((entry) => (
                  <li key={entry.trigger} className="flex items-center justify-between gap-3">
                    <span>{entry.label}</span>
                    <span className="opacity-60">x{entry.count}</span>
                  </li>
                ))
              ) : (
                <li className="opacity-60">No tracked incident origins.</li>
              )}
            </ul>
          </div>

          <div className="rounded border border-white/10 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              Urgent escalation chain
            </p>
            <ul className="mt-2 space-y-2 text-sm">
              {encounters.urgentEscalations.length > 0 ? (
                encounters.urgentEscalations.map((entry) => (
                  <li key={entry.caseId}>
                    <span className="font-medium">{entry.caseTitle}</span>
                    <span className="opacity-60">
                      {' '}
                      / {entry.originLabel} / {entry.encounterTypeLabel} / next stage{' '}
                      {entry.nextStage} / deadline {entry.deadlineRemaining}w
                    </span>
                  </li>
                ))
              ) : (
                <li className="opacity-60">No urgent escalation chain detected.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded border border-white/10 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              Likely follow-on incidents
            </p>
            <ul className="mt-2 space-y-2 text-sm">
              {encounters.likelyFollowUps.length > 0 ? (
                encounters.likelyFollowUps.map((target) => (
                  <li key={target.templateId} className="flex items-center justify-between gap-3">
                    <span>{target.title}</span>
                    <span className="opacity-60">{target.sourceCount} sources</span>
                  </li>
                ))
              ) : (
                <li className="opacity-60">No active follow-up pressure.</li>
              )}
            </ul>
          </div>

          <div className="rounded border border-white/10 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              Likely multi-team escalations
            </p>
            <ul className="mt-2 space-y-2 text-sm">
              {encounters.likelyRaidConversions.length > 0 ? (
                encounters.likelyRaidConversions.map((conversion) => (
                  <li key={`${conversion.caseId}-${conversion.trigger}`}>
                    <span className="font-medium">{conversion.caseTitle}</span>
                    <span className="opacity-60">
                      {' '}
                      / {conversion.trigger} {'->'} stage {conversion.targetStage} / teams{' '}
                      {conversion.minTeams}-{conversion.maxTeams}
                    </span>
                  </li>
                ))
              ) : (
                <li className="opacity-60">No imminent multi-team escalation paths detected.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="rounded border border-white/10 px-3 py-3">
          <p className="text-xs uppercase tracking-[0.24em] opacity-50">Active threat signatures</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {encounters.pressureTags.length > 0 ? (
              encounters.pressureTags.map((entry) => (
                <span
                  key={entry.tag}
                  className="rounded-full border border-white/10 px-2 py-1 text-xs"
                >
                  {entry.tag} x{entry.count}
                </span>
              ))
            ) : (
              <span className="text-sm opacity-60">No pressure tags detected.</span>
            )}
          </div>
        </div>

        <div className="rounded border border-white/10 px-3 py-3">
          <p className="text-xs uppercase tracking-[0.24em] opacity-50">Stage distribution</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {encounters.stageBreakdown.length > 0 ? (
              encounters.stageBreakdown.map((entry) => (
                <span
                  key={entry.stage}
                  className="rounded-full border border-white/10 px-2 py-1 text-xs"
                >
                  Stage {entry.stage} x{entry.count}
                </span>
              ))
            ) : (
              <span className="text-sm opacity-60">No active stage pressure.</span>
            )}
          </div>
        </div>
      </article>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}

function formatDifficultyPressure(
  pressure: Partial<{
    combat: number
    investigation: number
    utility: number
    social: number
  }>
) {
  const entries = Object.entries(pressure).filter(
    (entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > 0
  )

  if (entries.length === 0) {
    return 'No additional pressure'
  }

  return entries.map(([key, value]) => `${key} +${value}`).join(' / ')
}

import { useState } from 'react'
import { Link } from 'react-router'
import { useGameStore } from '../../app/store/gameStore'
import type { GameState } from '../../domain/models'
import { RECONCILIATION_COST } from '../../domain/sim/reconciliation'
import { isTrainingProgramUnlocked } from '../../domain/sim/training'
import {
  DEFAULT_TRAINING_LIST_FILTERS,
  getTrainingDivisionView,
  type TrainingListFilters,
} from './trainingView'

function formatSignedNumber(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`
}

function formatTrainingEvent(event: GameState['events'][number]) {
  switch (event.type) {
    case 'agent.training_started':
      return `${event.payload.agentName} started ${event.payload.trainingName}.`
    case 'agent.training_cancelled':
      return `${event.payload.agentName} cancelled ${event.payload.trainingName}.`
    case 'agent.training_completed':
      return `Week ${event.payload.week}: ${event.payload.agentName} completed ${event.payload.trainingName}.`
    default:
      return null
  }
}

function formatControlEvent(event: GameState['events'][number]) {
  switch (event.type) {
    case 'system.academy_upgraded':
      return `Academy upgraded to tier ${event.payload.tierAfter}.`
    case 'agent.instructor_assigned':
      return `${event.payload.instructorName} assigned to ${event.payload.agentName}.`
    case 'agent.instructor_unassigned':
      return `${event.payload.instructorName} removed from ${event.payload.agentName}.`
    default:
      return null
  }
}

function QueueCard({
  view,
  onCancel,
}: {
  view: ReturnType<typeof getTrainingDivisionView>['queueViews'][number]
  onCancel: (agentId: string) => void
}) {
  return (
    <li className="rounded border border-white/10 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          {view.subjectLink ? (
            <Link className="font-medium hover:underline" to={view.subjectLink}>
              {view.subjectLabel}
            </Link>
          ) : (
            <p className="font-medium">{view.subjectLabel}</p>
          )}
          <p className="text-sm opacity-70">{view.detailLabel}</p>
          <p className="text-xs uppercase tracking-[0.2em] opacity-50">{view.remainingLabel}</p>
          <p className="text-sm opacity-70">{view.progressPercent}% complete</p>
          <p className="text-sm opacity-70">{view.incurredFatigueLabel}</p>
          <p className="text-sm opacity-70">{view.cancelRefundLabel}</p>
          <p className="text-sm opacity-70">{view.fatigueScheduleLabel}</p>
          {view.assignedInstructorName ? (
            <p className="text-sm font-medium text-cyan-200">
              Instructor: {view.assignedInstructorName} (+{view.instructorBonus ?? 0})
            </p>
          ) : null}
        </div>

        {view.scope === 'agent' ? (
          <button
            className="btn btn-sm btn-ghost"
            type="button"
            onClick={() => onCancel(view.entry.agentId)}
          >
            Cancel training
          </button>
        ) : null}
      </div>
    </li>
  )
}

export default function TrainingDivisionPage() {
  const {
    game,
    assignInstructor,
    cancelTraining,
    queueTeamTraining,
    queueTraining,
    reconcileAgents,
    unassignInstructor,
    upgradeAcademy,
  } = useGameStore()
  const [filters, setFilters] = useState<TrainingListFilters>(DEFAULT_TRAINING_LIST_FILTERS)
  const [showAdvancedPanels, setShowAdvancedPanels] = useState(false)
  const [showHistoryPanels, setShowHistoryPanels] = useState(false)
  const view = getTrainingDivisionView(game, filters)

  const latestTrainingMessage = view.recentTrainingEvents[0]
    ? formatTrainingEvent(view.recentTrainingEvents[0])
    : null

  return (
    <section className="space-y-4">
      <article className="panel space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Training Division</h2>
            <p className="text-sm opacity-60">
              Filters: {view.hasActiveFilters ? 'active' : 'default'}
            </p>
            {view.trainingRecommendation ? (
              <div className="rounded border border-cyan-400/30 bg-cyan-500/10 px-3 py-2">
                <p className="text-sm font-semibold">Recommended next move: {view.trainingRecommendation.title}</p>
                <p className="text-sm opacity-70">{view.trainingRecommendation.detail}</p>
              </div>
            ) : null}
            {latestTrainingMessage && !showHistoryPanels ? (
              <p className="text-sm opacity-70">{latestTrainingMessage}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              aria-controls="training-advanced-panels"
              aria-expanded={showAdvancedPanels}
              className="btn btn-sm btn-ghost"
              type="button"
              onClick={() => setShowAdvancedPanels((current) => !current)}
            >
              Show advanced panels
            </button>
            <button
              aria-controls="training-history-panels"
              aria-expanded={showHistoryPanels}
              className="btn btn-sm btn-ghost"
              type="button"
              onClick={() => setShowHistoryPanels((current) => !current)}
            >
              Show history panels
            </button>
            {view.hasActiveFilters ? (
              <button
                className="btn btn-sm"
                type="button"
                onClick={() => setFilters(DEFAULT_TRAINING_LIST_FILTERS)}
              >
                Reset training filters
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded border border-white/10 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">Queue depth</p>
            <p className="mt-1 text-sm font-medium">{view.summary.activeQueue}</p>
          </div>
          <div className="rounded border border-white/10 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">Ready agents</p>
            <p className="mt-1 text-sm font-medium">{view.summary.readyAgents}</p>
          </div>
          <div className="rounded border border-white/10 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">Ready teams</p>
            <p className="mt-1 text-sm font-medium">{view.summary.readyTeams}</p>
          </div>
          <div className="rounded border border-white/10 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">Academy tier</p>
            <p className="mt-1 text-sm font-medium">{view.academyOverview.academyTier}</p>
          </div>
        </div>
      </article>

      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">Training Catalog</h3>
        <ul className="grid gap-2 md:grid-cols-2">
          {view.agentPrograms.map((program) => (
            <li key={program.trainingId} className="rounded border border-white/10 px-3 py-2">
              <p className="font-medium">{program.name}</p>
              <p className="text-sm opacity-70">{program.description}</p>
            </li>
          ))}
        </ul>
      </article>

      <article className="panel space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-base font-semibold">Active Queue</h3>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.24em] opacity-50" htmlFor="training-queue-scope">
              Scope
            </label>
            <select
              id="training-queue-scope"
              className="form-select"
              value={filters.queueScope}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  queueScope: event.target.value as TrainingListFilters['queueScope'],
                }))
              }
            >
              <option value="all">All</option>
              <option value="agent">Agent</option>
              <option value="team">Team</option>
            </select>
          </div>
        </div>

        {view.queueViews.length === 0 ? (
          <p className="text-sm opacity-60">No training programs are active.</p>
        ) : (
          <ul className="space-y-3">
            {view.queueViews.map((queueView) => (
              <QueueCard
                key={queueView.entry.drillGroupId ?? queueView.entry.id}
                view={queueView}
                onCancel={cancelTraining}
              />
            ))}
          </ul>
        )}
      </article>

      <article className="panel space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-base font-semibold">Eligible Roster</h3>
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.24em] opacity-50" htmlFor="training-search">
                Search
              </label>
              <input
                id="training-search"
                className="form-input"
                type="search"
                value={filters.q}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    q: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.24em] opacity-50" htmlFor="training-readiness">
                Readiness
              </label>
              <select
                id="training-readiness"
                className="form-select"
                value={filters.readiness}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    readiness: event.target.value as TrainingListFilters['readiness'],
                  }))
                }
              >
                <option value="all">All</option>
                <option value="ready">Ready</option>
                <option value="training">Training</option>
                <option value="deployed">Deployed</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <ul className="space-y-3">
          {view.filteredRosterViews.map((rosterView) => {
            const impacts = [...(view.agentImpactPreviewMap.get(rosterView.agent.id)?.values() ?? [])].filter(
              (impact): impact is NonNullable<typeof impact> => Boolean(impact)
            )
            const bestImpact = impacts
              .sort((left, right) => right.scoreDelta - left.scoreDelta || left.trainingName.localeCompare(right.trainingName))
              .at(0)
            return (
              <li key={rosterView.agent.id} className="rounded border border-white/10 px-3 py-3">
                <div className="space-y-2">
                  <div>
                    <Link className="font-medium hover:underline" to={rosterView.agentLink}>
                      {rosterView.agent.name}
                    </Link>
                    <p className="text-xs uppercase tracking-[0.2em] opacity-50">{rosterView.readinessLabel}</p>
                    {rosterView.assignedCaseTitle ? (
                      <p className="text-sm opacity-70">Assigned case: {rosterView.assignedCaseTitle}</p>
                    ) : null}
                    {rosterView.assignedInstructorName ? (
                      <p className="text-sm font-medium text-cyan-200">
                        Instructor: {rosterView.assignedInstructorName} (+{rosterView.instructorBonus ?? 0})
                      </p>
                    ) : null}
                    {bestImpact ? (
                      <p className="text-sm opacity-70">
                        Best projected gain: {formatSignedNumber(bestImpact.scoreDelta)} via {bestImpact.trainingName}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {rosterView.readinessReasons.map((reason) => (
                      <span
                        key={reason}
                        className="rounded border border-white/10 px-2 py-1 text-xs opacity-60"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {view.agentPrograms.map((program) => {
                      const unlocked = isTrainingProgramUnlocked(game, program)
                      const disabled = !rosterView.canTrain || !unlocked
                      return (
                        <button
                          key={`${rosterView.agent.id}-${program.trainingId}`}
                          className="btn btn-sm"
                          disabled={disabled}
                          type="button"
                          onClick={() => queueTraining(rosterView.agent.id, program.trainingId)}
                        >
                          {program.name}
                          {!unlocked ? ` · Unlock tier ${program.minAcademyTier ?? 0}` : ''}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </article>

      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">Team Drills</h3>
        <ul className="space-y-3">
          {view.teamViews.map((teamView) => (
            <li key={teamView.team.id} className="rounded border border-white/10 px-3 py-3">
              <div className="space-y-2">
                <div>
                  <Link className="font-medium hover:underline" to={teamView.teamLink}>
                    {teamView.team.name}
                  </Link>
                  <p className="text-xs uppercase tracking-[0.2em] opacity-50">{teamView.readinessLabel}</p>
                  <p className="text-sm opacity-70">Bond depth {teamView.strongestBondDepth}</p>
                  {teamView.strongestBondPairLabel ? (
                    <p className="text-sm opacity-70">
                      Strongest pair: {teamView.strongestBondPairLabel}
                    </p>
                  ) : (
                    <p className="text-sm opacity-70">No trained bond data yet.</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {teamView.readinessReasons.map((reason) => (
                    <span
                      key={reason}
                      className="rounded border border-white/10 px-2 py-1 text-xs opacity-60"
                    >
                      {reason}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {view.teamPrograms.map((program) => {
                    const unlocked = isTrainingProgramUnlocked(game, program)
                    const disabled = !teamView.canTrain || !unlocked
                    return (
                      <button
                        key={`${teamView.team.id}-${program.trainingId}`}
                        className="btn btn-sm"
                        disabled={disabled}
                        type="button"
                        onClick={() => queueTeamTraining(teamView.team.id, program.trainingId)}
                      >
                        {program.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </article>

      {showAdvancedPanels ? (
        <div className="space-y-4" id="training-advanced-panels">
          <article className="panel space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold">Academy Analysis</h3>
              {view.academyOverview.upgradeCost !== null ? (
                <button className="btn btn-sm" type="button" onClick={upgradeAcademy}>
                  Upgrade Academy (${view.academyOverview.upgradeCost})
                </button>
              ) : null}
            </div>

            <div className="space-y-3">
              {view.academyOverview.suggestedPrograms.map((suggestion) => (
                <div key={`${suggestion.agentId}-${suggestion.trainingId}`} className="rounded border border-white/10 px-3 py-2">
                  <p className="font-medium">
                    {suggestion.agentName}: {suggestion.trainingName}
                  </p>
                  <p className="text-sm opacity-70">
                    Projection ({formatSignedNumber(suggestion.scoreDelta)} score delta)
                  </p>
                </div>
              ))}
              {view.academyOverview.suggestedTeamDrills.map((suggestion) => (
                <div key={`${suggestion.teamId}-${suggestion.trainingId}`} className="rounded border border-white/10 px-3 py-2">
                  <p className="font-medium">
                    {suggestion.teamName}: {suggestion.trainingName}
                  </p>
                  <p className="text-sm opacity-70">
                    Projection ({suggestion.projectedScoreBefore.toFixed(2)} → {suggestion.projectedScoreAfter.toFixed(2)}, {formatSignedNumber(suggestion.projectedScoreDelta)})
                  </p>
                  <p className="text-sm opacity-70">
                    Modifier deltas: chemistry {formatSignedNumber(suggestion.projectedChemistryDelta)}, synergy {formatSignedNumber(suggestion.projectedSynergyDelta)}
                  </p>
                  <p className="text-sm opacity-70">Why recommended: {suggestion.recommendationReason}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="panel space-y-3">
            <h3 className="text-base font-semibold">Instructor Assignments</h3>
            {view.academyOverview.instructors.length === 0 ? (
              <p className="text-sm opacity-60">No instructors are currently available.</p>
            ) : (
              <ul className="space-y-3">
                {view.academyOverview.instructors.map((instructor) => (
                  <li key={instructor.staffId} className="rounded border border-white/10 px-3 py-3">
                    <div className="space-y-2">
                      <div>
                        <p className="font-medium">{instructor.name}</p>
                        <p className="text-sm opacity-70">
                          Specialty {instructor.instructorSpecialty} · Bonus +{instructor.bonus}
                        </p>
                      </div>

                      {instructor.assignedAgentId ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm opacity-70">Assigned to {instructor.assignedAgentName ?? instructor.assignedAgentId}</p>
                          <button
                            className="btn btn-sm btn-ghost"
                            type="button"
                            onClick={() => unassignInstructor(instructor.staffId)}
                          >
                            Unassign
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {view.compatibleInstructorTargets.map((target) => (
                            <button
                              key={`${instructor.staffId}-${target.entry.agentId}`}
                              className="btn btn-sm"
                              type="button"
                              onClick={() => assignInstructor(instructor.staffId, target.entry.agentId)}
                            >
                              Assign to {target.subjectLabel}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="panel space-y-3">
            <h3 className="text-base font-semibold">Academy & Coaching Activity</h3>
            {view.recentControlEvents.length === 0 ? (
              <p className="text-sm opacity-60">No academy or coaching activity recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {view.recentControlEvents.map((event) => {
                  const label = formatControlEvent(event)
                  return label ? <li key={event.id}>{label}</li> : null
                })}
              </ul>
            )}
          </article>

          <article className="panel space-y-3">
            <h3 className="text-base font-semibold">Chemistry Inspector</h3>
            {view.chemistryInspectorPairs.length === 0 ? (
              <p className="text-sm opacity-60">No relationship changes recorded.</p>
            ) : (
              <ul className="space-y-3">
                {view.chemistryInspectorPairs.map((pair) => (
                  <li key={pair.pairKey} className="rounded border border-white/10 px-3 py-3">
                    <p className="font-medium">{pair.pairLabel}</p>
                    <ul className="space-y-1 text-sm opacity-70">
                      {pair.updates.map((update) => (
                        <li key={update.eventId}>
                          {update.agentName}: {update.reason} ({formatSignedNumber(update.delta)})
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="panel space-y-3">
            <h3 className="text-base font-semibold">Relationship Reconciliation</h3>
            {view.reconciliationCandidates.length === 0 ? (
              <p className="text-sm opacity-60">No strained relationships currently need attention.</p>
            ) : (
              <ul className="space-y-3">
                {view.reconciliationCandidates.map((candidate) => (
                  <li key={candidate.pairKey} className="rounded border border-white/10 px-3 py-3">
                    <div className="space-y-2">
                      <p className="font-medium">{candidate.pairLabel}</p>
                      <p className="text-sm opacity-70">
                        Current average {candidate.average.toFixed(2)} · Projected {candidate.projectedAverage.toFixed(2)}
                      </p>
                      {candidate.recentlyReconciled ? (
                        <p className="text-sm text-amber-200">Reconciled this week.</p>
                      ) : candidate.reason ? (
                        <p className="text-sm text-amber-200">{candidate.reason}</p>
                      ) : null}
                      <button
                        className="btn btn-sm"
                        disabled={!candidate.canReconcile}
                        type="button"
                        onClick={() => reconcileAgents(candidate.leftId, candidate.rightId)}
                      >
                        Reconcile (${RECONCILIATION_COST})
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      ) : null}

      {showHistoryPanels ? (
        <div className="space-y-4" id="training-history-panels">
          <article className="panel space-y-3">
            <h3 className="text-base font-semibold">Recent Training Events</h3>
            {view.recentTrainingEvents.length === 0 ? (
              <p className="text-sm opacity-60">No training events recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {view.recentTrainingEvents.map((event) => (
                  <li key={event.id} className="rounded border border-white/10 px-3 py-2">
                    <p>{formatTrainingEvent(event)}</p>
                    {event.type === 'agent.training_cancelled' ? (
                      <p className="text-sm opacity-70">Refund: ${event.payload.refund}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="panel space-y-3">
            <h3 className="text-base font-semibold">Recent Completions Timeline</h3>
            {view.recentCompletions.length === 0 ? (
              <p className="text-sm opacity-60">No completed programs recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {view.recentCompletions.map((event) => (
                  <li key={event.id}>
                    Week {event.payload.week}: {event.payload.agentName} completed {event.payload.trainingName}
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      ) : null}
    </section>
  )
}

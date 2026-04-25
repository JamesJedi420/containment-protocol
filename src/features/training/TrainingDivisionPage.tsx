import { Link, useSearchParams } from 'react-router'
import { useGameStore } from '../../app/store/gameStore'
import { FilterInput } from '../../components/FilterInput'
import { FilterSelect } from '../../components/FilterSelect'
import type { TrainingImpactPreview } from '../../domain/academy'
import { assessAgentTrainingQueue, assessTeamTrainingQueue } from '../../domain/sim/training'
import { RECONCILIATION_COST } from '../../domain/sim/reconciliation'
import {
  DEFAULT_TRAINING_LIST_FILTERS,
  TRAINING_QUEUE_SCOPE_FILTERS,
  TRAINING_READINESS_FILTERS,
  getTrainingDivisionView,
  readTrainingListFilters,
  writeTrainingListFilters,
  type TrainingQueueView,
  type TrainingRosterView,
  type TeamTrainingView,
} from './trainingView'

const ADVANCED_PARAM = 'advanced'
const HISTORY_PARAM = 'history'

const ROSTER_GROUPS: Array<{
  key: keyof ReturnType<typeof getTrainingDivisionView>['groupedRoster']
  label: string
}> = [
  { key: 'ready', label: 'Ready for training' },
  { key: 'training', label: 'In training' },
  { key: 'deployed', label: 'On assignment' },
  { key: 'inactive', label: 'Unavailable' },
]

export default function TrainingDivisionPage() {
  const game = useGameStore((state) => state.game)
  const queueTraining = useGameStore((state) => state.queueTraining)
  const queueTeamTraining = useGameStore((state) => state.queueTeamTraining)
  const cancelTraining = useGameStore((state) => state.cancelTraining)
  const upgradeAcademy = useGameStore((state) => state.upgradeAcademy)
  const assignInstructor = useGameStore((state) => state.assignInstructor)
  const unassignInstructor = useGameStore((state) => state.unassignInstructor)
  const reconcileAgents = useGameStore((state) => state.reconcileAgents)
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = readTrainingListFilters(searchParams)
  const showAdvancedPanels = searchParams.get(ADVANCED_PARAM) === '1'
  const showHistoryPanels = searchParams.get(HISTORY_PARAM) === '1'
  const view = getTrainingDivisionView(game, filters)
  const recommendationMeta = getRecommendationMeta(view)

  const updateFilters = (patch: Partial<typeof filters>) => {
    setSearchParams(writeTrainingListFilters({ ...filters, ...patch }, searchParams), {
      replace: true,
    })
  }

  const setPanelVisibility = (param: string, visible: boolean) => {
    const nextSearchParams = new URLSearchParams(searchParams)

    if (visible) {
      nextSearchParams.set(param, '1')
    } else {
      nextSearchParams.delete(param)
    }

    setSearchParams(nextSearchParams, { replace: true })
  }

  const resetFilters = () => {
    setSearchParams(writeTrainingListFilters(DEFAULT_TRAINING_LIST_FILTERS, searchParams), {
      replace: true,
    })
  }

  return (
    <section className="space-y-4">
      <nav className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.24em] opacity-70">
        <a href="#training-summary" className="hover:opacity-100">
          Skip to training summary
        </a>
        <a href="#training-active-queue" className="hover:opacity-100">
          Skip to active queue
        </a>
        <a href="#training-roster" className="hover:opacity-100">
          Skip to eligible roster
        </a>
      </nav>

      <article id="training-summary" className="panel space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Training Division</h2>
            <p className="text-sm opacity-70">
              Filters: {view.hasActiveFilters ? 'active' : 'default'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {view.hasActiveFilters ? (
              <button type="button" className="btn btn-sm btn-ghost" onClick={resetFilters}>
                Reset training filters
              </button>
            ) : null}

            <button
              type="button"
              className="btn btn-sm btn-ghost"
              aria-controls="training-advanced-panels"
              aria-expanded={showAdvancedPanels}
              onClick={() => setPanelVisibility(ADVANCED_PARAM, !showAdvancedPanels)}
            >
              {showAdvancedPanels ? 'Hide advanced panels' : 'Show advanced panels'}
            </button>

            <button
              type="button"
              className="btn btn-sm btn-ghost"
              aria-controls="training-history-panels"
              aria-expanded={showHistoryPanels}
              onClick={() => setPanelVisibility(HISTORY_PARAM, !showHistoryPanels)}
            >
              {showHistoryPanels ? 'Hide history panels' : 'Show history panels'}
            </button>
          </div>
        </div>

        {view.trainingRecommendation ? (
          <div className="rounded border border-blue-400/20 bg-blue-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.24em] opacity-70">Recommended next move</p>
            <p className="mt-2 font-medium">{view.trainingRecommendation.title}</p>
            <div className="mt-3 grid gap-2 text-sm opacity-85 md:grid-cols-3">
              <p>{recommendationMeta.bestGain}</p>
              <p>
                <strong>Confidence:</strong> {recommendationMeta.confidence}
              </p>
              <p>
                <strong>Commit clarity:</strong> {recommendationMeta.commitClarity}
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryMetric label="Ready agents" value={String(view.summary.readyAgents)} />
          <SummaryMetric label="Queue depth" value={String(view.summary.activeQueue)} />
          <SummaryMetric label="Ready teams" value={String(view.summary.readyTeams)} />
          <SummaryMetric
            label="Open slots"
            value={`${view.academyOverview.availableSlots}/${view.academyOverview.totalSlots}`}
          />
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-3">
        <article className="panel space-y-3">
          <h3 className="text-base font-semibold">Training Catalog</h3>
          <ul className="space-y-3">
            {view.agentPrograms.map((program) => (
              <li key={program.trainingId} className="rounded border border-white/10 px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{program.name}</p>
                    <p className="text-sm opacity-70">{program.description}</p>
                  </div>
                  <div className="text-right text-xs opacity-70">
                    <p>{program.durationWeeks} weeks</p>
                    <p>${program.fundingCost}</p>
                    {program.minAcademyTier ? <p>Tier {program.minAcademyTier}</p> : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </article>

        <article id="training-active-queue" className="panel space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Active Queue</h3>
              <p className="text-sm opacity-60">
                {view.queueViews.length > 0
                  ? `${view.queueViews.length} active group${view.queueViews.length === 1 ? '' : 's'}`
                  : 'Queue is empty.'}
              </p>
            </div>

            <div className="w-full max-w-xs">
              <FilterSelect
                id="training-queue-scope"
                label="Scope"
                value={filters.queueScope}
                onChange={(value) => updateFilters({ queueScope: value as typeof filters.queueScope })}
              >
                {TRAINING_QUEUE_SCOPE_FILTERS.map((option) => (
                  <option key={option} value={option}>
                    {formatFilterLabel(option)}
                  </option>
                ))}
              </FilterSelect>
            </div>
          </div>

          {view.queueViews.length > 0 ? (
            <ul className="space-y-3">
              {view.queueViews.map((queueView) => (
                <QueueCard
                  key={queueView.entry.id}
                  queueView={queueView}
                  onCancel={() => cancelTraining(queueView.entry.agentId)}
                />
              ))}
            </ul>
          ) : (
            <p className="rounded border border-dashed border-white/15 bg-white/5 px-3 py-3 text-sm opacity-70">
              No training programs are active.
            </p>
          )}
        </article>

        <article id="training-roster" className="panel space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Eligible Roster</h3>
              <p className="text-sm opacity-60">
                {view.filteredRosterViews.length} shown / {view.allRosterViews.length} total
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <FilterInput
              id="training-roster-search"
              label="Search"
              type="search"
              value={filters.q}
              onChange={(value) => updateFilters({ q: value })}
              placeholder="Search agents"
            />

            <FilterSelect
              id="training-roster-readiness"
              label="Readiness"
              value={filters.readiness}
              onChange={(value) => updateFilters({ readiness: value as typeof filters.readiness })}
            >
              {TRAINING_READINESS_FILTERS.map((option) => (
                <option key={option} value={option}>
                  {formatFilterLabel(option)}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div className="space-y-4">
            {ROSTER_GROUPS.map((group) =>
              view.groupedRoster[group.key].length > 0 ? (
                <div key={group.key} className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.24em] opacity-50">{group.label}</p>
                  <ul className="space-y-3">
                    {view.groupedRoster[group.key].map((rosterView) => (
                      <RosterCard
                        key={rosterView.agent.id}
                        game={game}
                        rosterView={rosterView}
                        programImpacts={view.agentImpactPreviewMap.get(rosterView.agent.id)}
                        programs={view.agentPrograms}
                        onQueueTraining={queueTraining}
                      />
                    ))}
                  </ul>
                </div>
              ) : null
            )}
          </div>
        </article>
      </div>

      <article className="panel space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Team Drills</h3>
            <p className="text-sm opacity-60">Queue chemistry-focused drills for ready teams.</p>
          </div>
        </div>

        <ul className="space-y-3">
          {view.teamViews.map((teamView) => (
            <TeamCard
              key={teamView.team.id}
              game={game}
              teamView={teamView}
              programs={view.teamPrograms}
              onQueueTeamTraining={queueTeamTraining}
            />
          ))}
        </ul>
      </article>

      {showAdvancedPanels ? (
        <div id="training-advanced-panels" className="grid gap-4 xl:grid-cols-2">
          <article className="panel space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">Academy Analysis</h3>
                <p className="text-sm opacity-60">
                  Tier {view.academyOverview.academyTier} academy with{' '}
                  {view.academyOverview.availableSlots}/{view.academyOverview.totalSlots} open slots.
                </p>
              </div>

              {view.academyOverview.upgradeCost !== null ? (
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={game.funding < view.academyOverview.upgradeCost}
                  onClick={() => upgradeAcademy()}
                >
                  Upgrade Academy (${view.academyOverview.upgradeCost})
                </button>
              ) : null}
            </div>

            <ul className="space-y-3">
              {view.academyOverview.suggestedPrograms.map((suggestion) => (
                <li
                  key={`${suggestion.agentId}-${suggestion.trainingId}`}
                  className="rounded border border-white/10 px-3 py-3"
                >
                  <p className="font-medium">
                    {suggestion.agentName}: {suggestion.trainingName}
                  </p>
                  <p className="text-sm opacity-80">
                    Projection (solo): +{suggestion.scoreDelta.toFixed(2)} score over{' '}
                    {suggestion.fundingCost >= 0 ? `$${suggestion.fundingCost}` : 'no cost'}.
                  </p>
                  <p className="text-sm opacity-70">
                    Modifier deltas: fatigue +{suggestion.fatigueDelta}, funding $
                    {suggestion.fundingCost}.
                  </p>
                  <p className="text-sm opacity-70">
                    Why recommended: immediate payoff with{' '}
                    {suggestion.affordable ? 'funding already available.' : 'a funding gate still in the way.'}
                  </p>
                </li>
              ))}

              {view.academyOverview.suggestedTeamDrills.map((suggestion) => (
                <li
                  key={`${suggestion.teamId}-${suggestion.trainingId}`}
                  className="rounded border border-white/10 px-3 py-3"
                >
                  <p className="font-medium">
                    {suggestion.teamName}: {suggestion.trainingName}
                  </p>
                  <p className="text-sm opacity-80">
                    Projection ({suggestion.projectionCaseTitle}): {suggestion.projectedScoreBefore.toFixed(2)}{' '}
                    to {suggestion.projectedScoreAfter.toFixed(2)}.
                  </p>
                  <p className="text-sm opacity-70">
                    Modifier deltas: chemistry +{suggestion.projectedChemistryDelta.toFixed(2)} /
                    synergy +{suggestion.projectedSynergyDelta.toFixed(2)} / score +
                    {suggestion.projectedScoreDelta.toFixed(2)}.
                  </p>
                  <p className="text-sm opacity-70">
                    Why recommended: {suggestion.recommendationReason}
                  </p>
                </li>
              ))}
            </ul>
          </article>

          <article className="panel space-y-3">
            <h3 className="text-base font-semibold">Instructor Assignments</h3>

            <ul className="space-y-3">
              {view.academyOverview.instructors.length > 0 ? (
                view.academyOverview.instructors.map((instructor) => {
                  const compatibleTargets = view.compatibleInstructorTargets.filter(
                    (queueView) =>
                      queueView.entry.targetStat === instructor.instructorSpecialty &&
                      !queueView.assignedInstructorId
                  )

                  return (
                    <li
                      key={instructor.staffId}
                      className="rounded border border-white/10 px-3 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{instructor.name}</p>
                          <p className="text-sm opacity-70">
                            {instructor.instructorSpecialty} specialist (+{instructor.bonus})
                          </p>
                        </div>

                        {instructor.assignedAgentId ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={() => unassignInstructor(instructor.staffId)}
                          >
                            Unassign
                          </button>
                        ) : null}
                      </div>

                      {instructor.assignedAgentName ? (
                        <p className="mt-2 text-sm opacity-80">
                          Currently coaching {instructor.assignedAgentName}.
                        </p>
                      ) : compatibleTargets.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {compatibleTargets.map((queueView) => (
                            <button
                              key={`${instructor.staffId}-${queueView.entry.id}`}
                              type="button"
                              className="btn btn-sm btn-ghost"
                              onClick={() => assignInstructor(instructor.staffId, queueView.entry.agentId)}
                            >
                              Assign to {queueView.entry.agentName}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm opacity-60">No compatible queued trainees.</p>
                      )}
                    </li>
                  )
                })
              ) : (
                <li className="rounded border border-dashed border-white/15 px-3 py-3 text-sm opacity-70">
                  No instructors are available.
                </li>
              )}
            </ul>
          </article>

          <article className="panel space-y-3">
            <h3 className="text-base font-semibold">Academy & Coaching Activity</h3>
            {view.recentControlEvents.length > 0 ? (
              <ul className="space-y-2">
                {view.recentControlEvents.map((event) => (
                  <li key={event.id} className="rounded border border-white/10 px-3 py-3">
                    {formatControlEvent(event)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded border border-dashed border-white/15 px-3 py-3 text-sm opacity-70">
                No academy or coaching changes recorded yet.
              </p>
            )}
          </article>

          <article className="panel space-y-3">
            <h3 className="text-base font-semibold">Chemistry Inspector</h3>
            {view.chemistryInspectorPairs.length > 0 ? (
              <ul className="space-y-3">
                {view.chemistryInspectorPairs.map((pair) => (
                  <li key={pair.pairKey} className="rounded border border-white/10 px-3 py-3">
                    <p className="font-medium">{pair.pairLabel}</p>
                    <ul className="mt-2 space-y-1 text-sm opacity-80">
                      {pair.updates.map((update) => (
                        <li key={update.eventId}>
                          {update.agentName}: {update.reason} ({update.previousValue.toFixed(2)} to{' '}
                          {update.nextValue.toFixed(2)})
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded border border-dashed border-white/15 px-3 py-3 text-sm opacity-70">
                No recent relationship shifts recorded.
              </p>
            )}
          </article>

          <article className="panel space-y-3">
            <h3 className="text-base font-semibold">Relationship Reconciliation</h3>
            {view.reconciliationCandidates.length > 0 ? (
              <ul className="space-y-3">
                {view.reconciliationCandidates.map((candidate) => (
                  <li key={candidate.pairKey} className="rounded border border-white/10 px-3 py-3">
                    <p className="font-medium">{candidate.pairLabel}</p>
                    <p className="mt-2 text-sm opacity-80">
                      Average {candidate.average.toFixed(2)} to {candidate.projectedAverage.toFixed(2)}{' '}
                      after mediation.
                    </p>
                    {candidate.recentlyReconciled ? (
                      <p className="mt-2 text-sm opacity-70">Reconciled this week.</p>
                    ) : candidate.reason ? (
                      <p className="mt-2 text-sm opacity-70">{candidate.reason}</p>
                    ) : null}
                    <div className="mt-3">
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        disabled={!candidate.canReconcile}
                        onClick={() => reconcileAgents(candidate.leftId, candidate.rightId)}
                      >
                        Reconcile (${RECONCILIATION_COST})
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded border border-dashed border-white/15 px-3 py-3 text-sm opacity-70">
                No strained reserve-pool pairs need intervention right now.
              </p>
            )}
          </article>
        </div>
      ) : null}

      {showHistoryPanels ? (
        <div id="training-history-panels" className="grid gap-4 xl:grid-cols-2">
          <article className="panel space-y-3">
            <h3 className="text-base font-semibold">Recent Training Events</h3>
            {view.recentTrainingEvents.length > 0 ? (
              <ul className="space-y-2">
                {view.recentTrainingEvents.map((event) => (
                  <li key={event.id} className="rounded border border-white/10 px-3 py-3">
                    <p>{formatTrainingEvent(event)}</p>
                    {event.type === 'agent.training_cancelled' ? (
                      <p className="mt-1 text-sm opacity-70">Refund: ${event.payload.refund}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded border border-dashed border-white/15 px-3 py-3 text-sm opacity-70">
                No recent training events recorded.
              </p>
            )}
          </article>

          <article className="panel space-y-3">
            <h3 className="text-base font-semibold">Recent Completions Timeline</h3>
            {view.recentCompletions.length > 0 ? (
              <ul className="space-y-2">
                {view.recentCompletions.map((event) => (
                  <li key={event.id} className="rounded border border-white/10 px-3 py-3">
                    Week {event.payload.week}: {event.payload.agentName} completed{' '}
                    {event.payload.trainingName}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded border border-dashed border-white/15 px-3 py-3 text-sm opacity-70">
                No completed programs recorded yet.
              </p>
            )}
          </article>
        </div>
      ) : null}
    </section>
  )
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}

function QueueCard({
  queueView,
  onCancel,
}: {
  queueView: TrainingQueueView
  onCancel: () => void
}) {
  return (
    <li className="rounded border border-white/10 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          {queueView.subjectLink ? (
            <Link to={queueView.subjectLink} className="font-medium hover:underline">
              {queueView.subjectLabel}
            </Link>
          ) : (
            <p className="font-medium">{queueView.subjectLabel}</p>
          )}
          <p className="text-sm opacity-80">{queueView.detailLabel}</p>
        </div>

        <button type="button" className="btn btn-sm btn-ghost" onClick={onCancel}>
          Cancel Training
        </button>
      </div>

      <div className="mt-3 grid gap-2 text-sm opacity-80 md:grid-cols-2">
        <p>{queueView.remainingLabel}</p>
        <p>{queueView.progressPercent}% complete</p>
        <p>{queueView.incurredFatigueLabel}</p>
        <p>{queueView.cancelRefundLabel}</p>
        <p className="md:col-span-2">{queueView.fatigueScheduleLabel}</p>
        {queueView.assignedInstructorName ? (
          <p className="md:col-span-2">
            Instructor: {queueView.assignedInstructorName} (+{queueView.instructorBonus ?? 0})
          </p>
        ) : null}
      </div>
    </li>
  )
}

function RosterCard({
  game,
  rosterView,
  programImpacts,
  programs,
  onQueueTraining,
}: {
  game: ReturnType<typeof useGameStore.getState>['game']
  rosterView: TrainingRosterView
  programImpacts: Map<string, TrainingImpactPreview | undefined> | undefined
  programs: Array<{
    trainingId: string
    name: string
    minAcademyTier?: number
  }>
  onQueueTraining: (agentId: string, trainingId: string) => void
}) {
  const bestImpact = programImpacts
    ? [...programImpacts.values()]
        .filter((impact): impact is TrainingImpactPreview => Boolean(impact))
        .sort((left, right) => right.scoreDelta - left.scoreDelta)[0]
    : undefined

  return (
    <li className="rounded border border-white/10 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={rosterView.agentLink} className="font-medium hover:underline">
            {rosterView.agent.name}
          </Link>
          <p className="text-sm opacity-70">{rosterView.readinessLabel}</p>
        </div>

        {rosterView.teamName ? (
          <p className="text-sm opacity-60">{rosterView.teamName}</p>
        ) : (
          <p className="text-sm opacity-60">Reserve pool</p>
        )}
      </div>

      <div className="mt-3 space-y-1 text-sm opacity-80">
        {rosterView.assignedCaseTitle ? <p>Assigned case: {rosterView.assignedCaseTitle}</p> : null}
        {rosterView.roleIdentityLabel ? <p>Role identity: {rosterView.roleIdentityLabel}</p> : null}
        {bestImpact ? <p>Best projected gain: +{bestImpact.scoreDelta.toFixed(2)}</p> : null}
        {rosterView.assignedInstructorName ? (
          <p>Instructor: {rosterView.assignedInstructorName} (+{rosterView.instructorBonus ?? 0})</p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {programs.map((program) => {
          const assessment = assessAgentTrainingQueue(game, rosterView.agent.id, program.trainingId)
          const buttonLabel = getAgentProgramButtonLabel(program.name, assessment.requiredTier)

          return (
            <button
              key={program.trainingId}
              type="button"
              className="btn btn-sm btn-ghost"
              disabled={!assessment.canQueue}
              onClick={() => onQueueTraining(rosterView.agent.id, program.trainingId)}
            >
              {buttonLabel}
            </button>
          )
        })}
      </div>
    </li>
  )
}

function TeamCard({
  game,
  teamView,
  programs,
  onQueueTeamTraining,
}: {
  game: ReturnType<typeof useGameStore.getState>['game']
  teamView: TeamTrainingView
  programs: Array<{
    trainingId: string
    name: string
  }>
  onQueueTeamTraining: (teamId: string, trainingId: string) => void
}) {
  return (
    <li className="rounded border border-white/10 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={teamView.teamLink} className="font-medium hover:underline">
            {teamView.team.name}
          </Link>
          <p className="text-sm opacity-70">{teamView.readinessLabel}</p>
        </div>

        <p className="text-sm opacity-60">{teamView.memberCount} agents</p>
      </div>

      <div className="mt-3 space-y-1 text-sm opacity-80">
        <p>Roster: {teamView.memberNames.join(', ')}</p>
        {teamView.assignedCaseTitle ? <p>Assigned case: {teamView.assignedCaseTitle}</p> : null}
        {teamView.strongestBondDepth > 0 ? <p>Bond depth {teamView.strongestBondDepth}</p> : null}
        {teamView.strongestBondPairLabel ? (
          <p>Strongest pair: {teamView.strongestBondPairLabel}</p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {programs.map((program) => {
          const assessment = assessTeamTrainingQueue(game, teamView.team.id, program.trainingId)

          return (
            <button
              key={program.trainingId}
              type="button"
              className="btn btn-sm btn-ghost"
              disabled={!assessment.canQueue}
              onClick={() => onQueueTeamTraining(teamView.team.id, program.trainingId)}
            >
              {program.name}
            </button>
          )
        })}
      </div>
    </li>
  )
}

function getRecommendationMeta(view: ReturnType<typeof getTrainingDivisionView>) {
  if (!view.trainingRecommendation) {
    return {
      bestGain: 'No immediate action surfaced.',
      confidence: 'Low',
      commitClarity: 'Hold for a stronger opening.',
    }
  }

  return {
    bestGain: view.trainingRecommendation.detail,
    confidence:
      view.academyOverview.availableSlots > 0 && view.summary.readyAgents > 0 ? 'High' : 'Moderate',
    commitClarity: `${view.academyOverview.availableSlots}/${view.academyOverview.totalSlots} slots open this week.`,
  }
}

function getAgentProgramButtonLabel(name: string, requiredTier: number | undefined) {
  if (typeof requiredTier === 'number') {
    return `${name} (Unlock tier ${requiredTier})`
  }

  return name
}

function formatFilterLabel(value: string) {
  if (value === 'all') {
    return 'All'
  }

  return value.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase())
}

function formatTrainingEvent(
  event: ReturnType<typeof getTrainingDivisionView>['recentTrainingEvents'][number]
) {
  switch (event.type) {
    case 'agent.training_started':
      return `Week ${event.payload.week}: ${event.payload.agentName} started ${event.payload.trainingName}`
    case 'agent.training_completed':
      return `Week ${event.payload.week}: ${event.payload.agentName} completed ${event.payload.trainingName}`
    case 'agent.training_cancelled':
      return `Week ${event.payload.week}: ${event.payload.agentName} cancelled ${event.payload.trainingName}`
  }
}

function formatControlEvent(
  event: ReturnType<typeof getTrainingDivisionView>['recentControlEvents'][number]
) {
  switch (event.type) {
    case 'system.academy_upgraded':
      return `Week ${event.payload.week}: Academy upgraded to tier ${event.payload.tierAfter}`
    case 'agent.instructor_assigned':
      return `Week ${event.payload.week}: ${event.payload.instructorName} assigned to ${event.payload.agentName}`
    case 'agent.instructor_unassigned':
      return `Week ${event.payload.week}: ${event.payload.instructorName} removed from ${event.payload.agentName}`
  }
}

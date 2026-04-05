import { Link, useSearchParams } from 'react-router'
import { useMemo, useState } from 'react'
import { useGameStore } from '../../app/store/gameStore'
import { APP_ROUTES } from '../../app/routes'
import type { GameState } from '../../domain/models'
import { buildAcademyOverview, getAgentTrainingImpacts } from '../../domain/academy'
import { ROLE_LABELS, STAT_LABELS, TRAINING_UI_TEXT } from '../../data/copy'
import { trainingCatalog } from '../../data/training'
import { FilterInput } from '../../components/FilterInput'
import { FilterSelect } from '../../components/FilterSelect'
import { getAcademyStatBonus, getAcademyUpgradeCost } from '../../domain/sim/academyUpgrade'
import { clamp } from '../../domain/math'
import { assessAgentTrainingQueue, assessTeamTrainingQueue } from '../../domain/sim/training'
import {
  hasPairReconciledThisWeek,
  RECONCILIATION_COST,
  RECONCILIATION_DELTA_NEGATIVE,
  RECONCILIATION_DELTA_NON_NEGATIVE,
} from '../../domain/sim/reconciliation'
import {
  DEFAULT_TRAINING_LIST_FILTERS,
  getFilteredQueueViews,
  getFilteredSortedRoster,
  getTeamTrainingViews,
  getTrainingQueueViews,
  getTrainingRosterViews,
  getTrainingSummary,
  readTrainingListFilters,
  writeTrainingListFilters,
} from './trainingView'

export default function TrainingDivisionPage() {
  const {
    game,
    queueTraining,
    queueTeamTraining,
    cancelTraining,
    upgradeAcademy,
    assignInstructor,
    unassignInstructor,
    reconcileAgents,
  } = useGameStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showAdvancedPanels, setShowAdvancedPanels] = useState(false)
  const [showHistoryPanels, setShowHistoryPanels] = useState(false)
  const advancedPanelsRegionId = 'training-advanced-panels'
  const historyPanelsRegionId = 'training-history-panels'

  const filters = useMemo(() => readTrainingListFilters(searchParams), [searchParams])
  const hasActiveFilters =
    filters.q !== DEFAULT_TRAINING_LIST_FILTERS.q ||
    filters.readiness !== DEFAULT_TRAINING_LIST_FILTERS.readiness ||
    filters.queueScope !== DEFAULT_TRAINING_LIST_FILTERS.queueScope ||
    filters.sort !== DEFAULT_TRAINING_LIST_FILTERS.sort

  function setFilter<K extends keyof typeof DEFAULT_TRAINING_LIST_FILTERS>(
    key: K,
    value: (typeof DEFAULT_TRAINING_LIST_FILTERS)[K]
  ) {
    setSearchParams(writeTrainingListFilters({ ...filters, [key]: value }), { replace: true })
  }

  const summary = useMemo(() => getTrainingSummary(game), [game])
  const allQueueViews = useMemo(() => getTrainingQueueViews(game), [game])
  const queueViews = useMemo(
    () => getFilteredQueueViews(allQueueViews, filters),
    [allQueueViews, filters]
  )
  const allRosterViews = useMemo(() => getTrainingRosterViews(game), [game])
  const filteredRosterViews = useMemo(
    () => getFilteredSortedRoster(allRosterViews, filters),
    [allRosterViews, filters]
  )
  const teamViews = useMemo(() => getTeamTrainingViews(game), [game])
  const academyOverview = useMemo(() => buildAcademyOverview(game), [game])
  const agentPrograms = useMemo(
    () => trainingCatalog.filter((program) => (program.scope ?? 'agent') === 'agent'),
    []
  )
  const teamPrograms = useMemo(
    () => trainingCatalog.filter((program) => (program.scope ?? 'agent') === 'team'),
    []
  )
  const agentImpactPreviewMap = useMemo(() => {
    const academyStatBonus = getAcademyStatBonus(game.academyTier ?? 0)
    return new Map(
      allRosterViews.map((view) => [
        view.agent.id,
        new Map(
          getAgentTrainingImpacts(view.agent, academyStatBonus).map((impact) => [
            impact.trainingId,
            impact,
          ])
        ),
      ])
    )
  }, [allRosterViews, game.academyTier])
  const compatibleInstructorTargets = useMemo(
    () =>
      allQueueViews
        .filter((view) => view.scope === 'agent')
        .filter((view) => !view.assignedInstructorId),
    [allQueueViews]
  )
  const topProgramSuggestion = academyOverview.suggestedPrograms[0]
  const topTeamDrillSuggestion = academyOverview.suggestedTeamDrills[0]
  const trainingRecommendation = topProgramSuggestion
    ? {
        title: `Queue ${topProgramSuggestion.trainingName} for ${topProgramSuggestion.agentName}`,
        detail: `Best immediate gain: +${topProgramSuggestion.scoreDelta.toFixed(2)} score. Cost $${topProgramSuggestion.fundingCost}.`,
      }
    : topTeamDrillSuggestion
      ? {
          title: `Queue ${topTeamDrillSuggestion.trainingName} for ${topTeamDrillSuggestion.teamName}`,
          detail: `Projected score delta ${topTeamDrillSuggestion.projectedScoreDelta >= 0 ? '+' : ''}${topTeamDrillSuggestion.projectedScoreDelta.toFixed(2)}. ${topTeamDrillSuggestion.recommendationReason}`,
        }
      : null

  const recentTrainingEvents = [...game.events]
    .filter(
      (event) =>
        event.type === 'agent.training_started' ||
        event.type === 'agent.training_completed' ||
        event.type === 'agent.training_cancelled'
    )
    .slice(-6)
    .reverse()
  const recentCompletions = [...game.events]
    .filter((event) => event.type === 'agent.training_completed')
    .slice(-6)
    .reverse()
  const recentControlEvents = [...game.events]
    .filter(
      (event) =>
        event.type === 'system.academy_upgraded' ||
        event.type === 'agent.instructor_assigned' ||
        event.type === 'agent.instructor_unassigned'
    )
    .slice(-6)
    .reverse()
  const chemistryInspectorWeek = [...game.events]
    .filter((event) => event.type === 'agent.relationship_changed')
    .reduce((latest, event) => Math.max(latest, event.payload.week), 0)
  const chemistryInspectorPairs = [...game.events]
    .filter(
      (
        event
      ): event is Extract<(typeof game.events)[number], { type: 'agent.relationship_changed' }> =>
        event.type === 'agent.relationship_changed' &&
        (chemistryInspectorWeek === 0 || event.payload.week === chemistryInspectorWeek)
    )
    .reduce<
      Array<{
        pairKey: string
        pairLabel: string
        updates: Array<{
          agentName: string
          previousValue: number
          nextValue: number
          delta: number
          reason: string
          eventId: string
        }>
      }>
    >((groups, event) => {
      const pair = [event.payload.agentName, event.payload.counterpartName].sort()
      const pairKey = pair.join('::')
      const existing = groups.find((entry) => entry.pairKey === pairKey)
      const update = {
        agentName: event.payload.agentName,
        previousValue: event.payload.previousValue,
        nextValue: event.payload.nextValue,
        delta: event.payload.delta,
        reason: event.payload.reason.replace(/_/g, ' '),
        eventId: event.id,
      }

      if (existing) {
        existing.updates.push(update)
      } else {
        groups.push({
          pairKey,
          pairLabel: `${pair[0]} ↔ ${pair[1]}`,
          updates: [update],
        })
      }

      return groups
    }, [])
    .sort((left, right) => left.pairLabel.localeCompare(right.pairLabel))

  const groupedRoster = {
    ready: filteredRosterViews.filter((view) => view.readiness === 'ready'),
    training: filteredRosterViews.filter((view) => view.readiness === 'training'),
    deployed: filteredRosterViews.filter((view) => view.readiness === 'deployed'),
    inactive: filteredRosterViews.filter((view) => view.readiness === 'inactive'),
  }

  const reconciliationCandidates = useMemo(() => {
    const agents = Object.values(game.agents)
      .filter((agent) => agent.status === 'active')
      .filter((agent) => agent.assignment?.state !== 'assigned')
    const candidates: Array<{
      pairKey: string
      leftId: string
      rightId: string
      pairLabel: string
      leftValue: number
      rightValue: number
      average: number
      projectedAverage: number
      recentlyReconciled: boolean
      canReconcile: boolean
      reason?: string
    }> = []

    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const left = agents[i]
        const right = agents[j]
        const leftValue = left.relationships[right.id] ?? 0
        const rightValue = right.relationships[left.id] ?? 0

        // Focus the panel on strained/hostile links only.
        if (leftValue >= 0 && rightValue >= 0) {
          continue
        }

        const average = (leftValue + rightValue) / 2
        const leftProjected = clamp(
          leftValue +
            (leftValue < 0 ? RECONCILIATION_DELTA_NEGATIVE : RECONCILIATION_DELTA_NON_NEGATIVE),
          -2,
          2
        )
        const rightProjected = clamp(
          rightValue +
            (rightValue < 0 ? RECONCILIATION_DELTA_NEGATIVE : RECONCILIATION_DELTA_NON_NEGATIVE),
          -2,
          2
        )
        const recentlyReconciled = hasPairReconciledThisWeek(game, left.id, right.id)
        const canAfford = game.funding >= RECONCILIATION_COST
        const canReconcile = canAfford && !recentlyReconciled

        candidates.push({
          pairKey: `${left.id}::${right.id}`,
          leftId: left.id,
          rightId: right.id,
          pairLabel: `${left.name} ↔ ${right.name}`,
          leftValue,
          rightValue,
          average,
          projectedAverage: (leftProjected + rightProjected) / 2,
          recentlyReconciled,
          canReconcile,
          reason: canReconcile
            ? undefined
            : recentlyReconciled
              ? undefined
              : `Insufficient funds ($${RECONCILIATION_COST}).`,
        })
      }
    }

    return candidates.sort((left, right) => left.average - right.average).slice(0, 8)
  }, [game])

  return (
    <section className="space-y-4">
      <article className="panel space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{TRAINING_UI_TEXT.pageTitle}</h2>
            <p className="text-sm opacity-60">{TRAINING_UI_TEXT.pageSubtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link to={APP_ROUTES.teams} className="btn btn-sm btn-ghost">
              {TRAINING_UI_TEXT.openSquadBuilder}
            </Link>
            <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
              {TRAINING_UI_TEXT.backToOperationsDesk}
            </Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          <Metric label={TRAINING_UI_TEXT.totalAgents} value={String(summary.totalAgents)} />
          <Metric label={TRAINING_UI_TEXT.readyNow} value={String(summary.readyAgents)} />
          <Metric label={TRAINING_UI_TEXT.inTraining} value={String(summary.trainingAgents)} />
          <Metric label={TRAINING_UI_TEXT.deployed} value={String(summary.deployedAgents)} />
          <Metric label={TRAINING_UI_TEXT.queueDepth} value={String(summary.activeQueue)} />
          <Metric label="Ready teams" value={String(summary.readyTeams)} />
          <Metric label="Team drills" value={String(summary.teamDrills)} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showAdvancedPanels ? (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              aria-label="Hide advanced panels"
              aria-expanded="true"
              aria-controls={advancedPanelsRegionId}
              onClick={() => setShowAdvancedPanels((current) => !current)}
            >
              Hide advanced panels
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              aria-label="Show advanced panels"
              aria-expanded="false"
              aria-controls={advancedPanelsRegionId}
              onClick={() => setShowAdvancedPanels((current) => !current)}
            >
              Show advanced panels
            </button>
          )}

          {showHistoryPanels ? (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              aria-label="Hide history panels"
              aria-expanded="true"
              aria-controls={historyPanelsRegionId}
              onClick={() => setShowHistoryPanels((current) => !current)}
            >
              Hide history panels
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              aria-label="Show history panels"
              aria-expanded="false"
              aria-controls={historyPanelsRegionId}
              onClick={() => setShowHistoryPanels((current) => !current)}
            >
              Show history panels
            </button>
          )}

          {hasActiveFilters ? (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              aria-label="Reset training filters"
              onClick={() =>
                setSearchParams(writeTrainingListFilters(DEFAULT_TRAINING_LIST_FILTERS), {
                  replace: true,
                })
              }
            >
              Reset filters
            </button>
          ) : null}
        </div>

        <p className="text-xs opacity-50" aria-live="polite">
          Filters: {hasActiveFilters ? 'active' : 'default'}
        </p>

        {trainingRecommendation ? (
          <div
            className="rounded border border-sky-400/25 bg-sky-500/8 px-3 py-2"
            aria-label="Recommended training action"
          >
            <p className="text-xs uppercase tracking-[0.24em] opacity-60">Recommended next move</p>
            <p className="mt-1 text-sm font-medium">{trainingRecommendation.title}</p>
            <p className="text-xs opacity-70">{trainingRecommendation.detail}</p>
          </div>
        ) : null}
      </article>

      {showAdvancedPanels ? (
        <article id={advancedPanelsRegionId} className="panel space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">Academy analysis</h3>
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {academyOverview.readyAgents} ready / {academyOverview.activeQueue} queued
            </p>
          </div>

          <p className="text-sm opacity-60">
            Training impact is evaluated through the same agent score pipeline used by team
            composition and case resolution.
          </p>

          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="Academy tier" value={String(academyOverview.academyTier)} />
            <Metric
              label="Training slots"
              value={`${academyOverview.availableSlots}/${academyOverview.totalSlots}`}
            />
            <Metric
              label="Avg weeks queued"
              value={academyOverview.averageWeeksQueued.toFixed(1)}
            />
            <Metric
              label="Next upgrade"
              value={
                academyOverview.upgradeCost === null
                  ? 'Max tier'
                  : `$${academyOverview.upgradeCost}`
              }
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              disabled={
                academyOverview.upgradeCost === null ||
                game.funding < (academyOverview.upgradeCost ?? 0)
              }
              onClick={() => upgradeAcademy()}
            >
              {academyOverview.upgradeCost === null
                ? 'Academy maxed'
                : `Upgrade academy ($${academyOverview.upgradeCost})`}
            </button>
            <p className="text-xs opacity-50">
              Tier 1 unlocks advanced solo programs. Tier 2 unlocks elite team drills.
            </p>
          </div>

          {academyOverview.suggestedPrograms.length === 0 ? (
            <p className="text-sm opacity-60">No immediate academy recommendations available.</p>
          ) : (
            <ul className="space-y-2">
              {academyOverview.suggestedPrograms.map((entry) => (
                <li
                  key={`${entry.agentId}-${entry.trainingId}`}
                  className="rounded border border-white/10 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span>
                      {entry.agentName} {'->'} {entry.trainingName}
                    </span>
                    <span className="text-sm opacity-70">+{entry.scoreDelta.toFixed(2)} score</span>
                  </div>
                  {!entry.affordable && (
                    <p className="mt-1 text-xs opacity-40">
                      Insufficient funds (${entry.fundingCost})
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          {academyOverview.suggestedTeamDrills.length > 0 && (
            <>
              <p className="text-xs uppercase tracking-[0.24em] opacity-50">
                Team drill suggestions
              </p>
              <ul className="space-y-2">
                {academyOverview.suggestedTeamDrills.map((entry) => (
                  <li
                    key={`${entry.teamId}-${entry.trainingId}`}
                    className="rounded border border-white/10 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span>
                        {entry.teamName} {'→'} {entry.trainingName}
                      </span>
                      <span className="text-sm opacity-70">
                        +{entry.relationshipDelta.toFixed(2)} chemistry / +
                        {entry.trainedRelationshipDelta} bonds
                      </span>
                    </div>
                    <p className="mt-1 text-xs opacity-60">
                      Projection ({entry.projectionCaseTitle}): score{' '}
                      {entry.projectedScoreBefore.toFixed(2)} →{' '}
                      {entry.projectedScoreAfter.toFixed(2)} (
                      {entry.projectedScoreDelta >= 0 ? '+' : ''}
                      {entry.projectedScoreDelta.toFixed(2)})
                    </p>
                    <p className="text-xs opacity-60">
                      Modifier deltas: chemistry {entry.projectedChemistryDelta >= 0 ? '+' : ''}
                      {entry.projectedChemistryDelta.toFixed(2)} / synergy{' '}
                      {entry.projectedSynergyDelta >= 0 ? '+' : ''}
                      {entry.projectedSynergyDelta.toFixed(2)}
                    </p>
                    <p className="text-xs opacity-50">
                      Why recommended: {entry.recommendationReason}
                    </p>
                    {!entry.affordable && (
                      <p className="mt-1 text-xs opacity-40">
                        Insufficient funds (${entry.fundingCost})
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </article>
      ) : null}

      {showAdvancedPanels ? (
        <article id={historyPanelsRegionId} className="panel space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">Instructor assignments</h3>
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {academyOverview.instructors.length} hired
            </p>
          </div>

          {academyOverview.instructors.length === 0 ? (
            <p className="text-sm opacity-60">No instructors hired yet.</p>
          ) : (
            <ul className="space-y-3">
              {academyOverview.instructors.map((instructor) => {
                const compatibleTargets = compatibleInstructorTargets.filter(
                  (view) => view.entry.targetStat === instructor.instructorSpecialty
                )

                return (
                  <li key={instructor.staffId} className="rounded border border-white/10 px-3 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{instructor.name}</p>
                        <p className="text-sm opacity-60">
                          {STAT_LABELS[instructor.instructorSpecialty]} specialist / Efficiency{' '}
                          {instructor.efficiency} / +{instructor.bonus} bonus
                        </p>
                      </div>
                      {instructor.assignedAgentId ? (
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost"
                          onClick={() => unassignInstructor(instructor.staffId)}
                        >
                          Unassign
                        </button>
                      ) : null}
                    </div>

                    {instructor.assignedAgentId ? (
                      <p className="mt-2 text-sm opacity-70">
                        Assigned to {instructor.assignedAgentName ?? instructor.assignedAgentId}
                      </p>
                    ) : compatibleTargets.length === 0 ? (
                      <p className="mt-2 text-sm opacity-60">
                        No compatible trainees currently in queue.
                      </p>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {compatibleTargets.map((view) => (
                          <button
                            key={`${instructor.staffId}-${view.entry.agentId}`}
                            type="button"
                            className="btn btn-xs btn-ghost"
                            onClick={() => assignInstructor(instructor.staffId, view.entry.agentId)}
                          >
                            Assign to {view.entry.agentName}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </article>
      ) : null}

      {showAdvancedPanels ? (
        <article className="panel space-y-3">
          <h3 className="text-base font-semibold">Academy & coaching activity</h3>
          {recentControlEvents.length === 0 ? (
            <p className="text-sm opacity-60">No academy or instructor actions recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentControlEvents.map((event) => (
                <li
                  key={event.id}
                  className={`rounded border px-3 py-2 ${getControlEventToneClass(event.type)}`}
                >
                  <p className="font-medium">
                    {event.type === 'system.academy_upgraded'
                      ? `Academy upgraded to tier ${event.payload.tierAfter} ($${event.payload.cost})`
                      : event.type === 'agent.instructor_assigned'
                        ? `${event.payload.instructorName} assigned to ${event.payload.agentName}`
                        : `${event.payload.instructorName} removed from ${event.payload.agentName}`}
                  </p>
                  <p className="text-xs opacity-50">
                    Week {event.payload.week} / {event.timestamp}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>
      ) : null}

      {showAdvancedPanels ? (
        <article className="panel space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">Chemistry inspector</h3>
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {chemistryInspectorWeek > 0 ? `Week ${chemistryInspectorWeek}` : 'No changes'}
            </p>
          </div>

          {chemistryInspectorPairs.length === 0 ? (
            <p className="text-sm opacity-60">No relationship updates recorded this cycle.</p>
          ) : (
            <ul className="space-y-2">
              {chemistryInspectorPairs.map((pair) => (
                <li key={pair.pairKey} className="rounded border border-white/10 px-3 py-2">
                  <p className="font-medium">{pair.pairLabel}</p>
                  {pair.updates.map((update) => (
                    <p key={update.eventId} className="text-xs opacity-60">
                      {update.agentName}: {update.previousValue.toFixed(2)} →{' '}
                      {update.nextValue.toFixed(2)} ({update.delta >= 0 ? '+' : ''}
                      {update.delta.toFixed(2)}) · {update.reason}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </article>
      ) : null}

      {showAdvancedPanels ? (
        <article className="panel space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">Relationship reconciliation</h3>
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              Cost ${RECONCILIATION_COST}
            </p>
          </div>

          {reconciliationCandidates.length === 0 ? (
            <p className="text-sm opacity-60">
              No strained pairs currently eligible for reconciliation.
            </p>
          ) : (
            <ul className="space-y-2">
              {reconciliationCandidates.map((candidate) => (
                <li key={candidate.pairKey} className="rounded border border-white/10 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{candidate.pairLabel}</p>
                      <p className="text-xs opacity-60">
                        Current avg {candidate.average.toFixed(2)} → projected{' '}
                        {candidate.projectedAverage.toFixed(2)}
                      </p>
                      <p className="text-xs opacity-50">
                        Directional: {candidate.leftValue.toFixed(2)} /{' '}
                        {candidate.rightValue.toFixed(2)}
                      </p>
                      {candidate.recentlyReconciled ? (
                        <p className="text-xs opacity-50">Reconciled this week.</p>
                      ) : null}
                      {candidate.reason ? (
                        <p className="text-xs opacity-50">{candidate.reason}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost"
                      disabled={!candidate.canReconcile}
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
      ) : null}

      <article className="panel space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold">{TRAINING_UI_TEXT.catalogHeading}</h3>
          <p className="text-xs uppercase tracking-[0.24em] opacity-50">
            {trainingCatalog.length} program{trainingCatalog.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.24em] opacity-50">
              Individual programs
            </p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {agentPrograms.map((program) => (
                <div key={program.trainingId} className="rounded border border-white/10 px-3 py-3">
                  <p className="font-medium">{program.name}</p>
                  <p className="mt-1 text-sm opacity-60">{program.description}</p>
                  <div className="mt-3 space-y-1 text-xs opacity-70">
                    <p>Unlock: academy tier {program.minAcademyTier ?? 0}</p>
                    <p>
                      {STAT_LABELS[program.targetStat]} +{program.statDelta}
                    </p>
                    <p>{program.durationWeeks} week(s)</p>
                    <p>${program.fundingCost}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.24em] opacity-50">Team drills</p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {teamPrograms.map((program) => (
                <div key={program.trainingId} className="rounded border border-white/10 px-3 py-3">
                  <p className="font-medium">{program.name}</p>
                  <p className="mt-1 text-sm opacity-60">{program.description}</p>
                  <div className="mt-3 space-y-1 text-xs opacity-70">
                    <p>Unlock: academy tier {program.minAcademyTier ?? 0}</p>
                    <p>
                      {STAT_LABELS[program.targetStat]} +{program.statDelta}
                    </p>
                    <p>
                      Chemistry +{(program.relationshipDelta ?? 0).toFixed(2)} / Coordination +
                      {program.trainedRelationshipDelta ?? 0}
                    </p>
                    <p>{program.durationWeeks} week(s)</p>
                    <p>${program.fundingCost}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </article>

      <article className="panel space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold">{TRAINING_UI_TEXT.activeQueueHeading}</h3>
          <p className="text-xs uppercase tracking-[0.24em] opacity-50">
            {allQueueViews.length} in progress
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <FilterSelect
            id="queue-scope"
            label="Scope"
            value={filters.queueScope}
            onChange={(value) => setFilter('queueScope', value as typeof filters.queueScope)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'agent', label: 'Individual' },
              { value: 'team', label: 'Team drill' },
            ]}
          />
        </div>

        {queueViews.length === 0 ? (
          <p className="text-sm opacity-60">
            {allQueueViews.length === 0
              ? TRAINING_UI_TEXT.noActiveQueue
              : 'No queue entries match the current filter.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {queueViews.map(
              ({
                entry,
                entries,
                scope,
                progressPercent,
                subjectLabel,
                subjectLink,
                detailLabel,
                remainingLabel,
                incurredFatigueLabel,
                cancelRefundLabel,
                fatigueScheduleLabel,
                assignedInstructorName,
                instructorBonus,
              }) => (
                <li key={entry.id} className="rounded border border-white/10 px-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {subjectLink ? (
                          <Link to={subjectLink} className="font-medium hover:underline">
                            {subjectLabel}
                          </Link>
                        ) : (
                          <span className="font-medium">{subjectLabel}</span>
                        )}
                        <span className="text-xs uppercase tracking-[0.24em] opacity-50">
                          {scope === 'team' ? 'Team drill' : 'Individual program'}
                        </span>
                      </div>
                      <p className="text-sm opacity-60">
                        {detailLabel} / {STAT_LABELS[entry.targetStat]} +{entry.statDelta} / Started
                        week {entry.startedWeek} / ${entry.fundingCost}
                      </p>
                      {assignedInstructorName ? (
                        <p className="text-xs opacity-50">
                          Instructor: {assignedInstructorName}
                          {instructorBonus !== undefined ? ` (+${instructorBonus})` : ''}
                        </p>
                      ) : null}
                      {scope === 'team' ? (
                        <p className="text-xs opacity-50">
                          {entries.map((queuedEntry) => queuedEntry.agentName).join(', ')}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="text-sm opacity-60">{remainingLabel}</p>
                      <p className="text-xs uppercase tracking-[0.24em] opacity-50">
                        {progressPercent}% complete
                      </p>
                    </div>
                  </div>

                  <progress
                    className="queue-progress mt-3"
                    value={progressPercent}
                    max={100}
                    aria-label={`${subjectLabel} ${entry.trainingName} progress`}
                  >
                    {progressPercent}%
                  </progress>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-55">
                    <details className="[&>summary]:cursor-pointer [&>summary]:list-none">
                      <summary>{incurredFatigueLabel}</summary>
                      <span className="mt-1 block pl-2 opacity-70">{fatigueScheduleLabel}</span>
                    </details>
                    <span>{cancelRefundLabel}</span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-xs btn-ghost mt-2"
                    onClick={() => cancelTraining(entry.agentId)}
                  >
                    Cancel training
                  </button>
                </li>
              )
            )}
          </ul>
        )}
      </article>

      <article className="panel space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold">{TRAINING_UI_TEXT.eligibleRosterHeading}</h3>
          <p className="text-xs uppercase tracking-[0.24em] opacity-50">
            {filteredRosterViews.length} of {allRosterViews.length} agents
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <FilterInput
            id="roster-q"
            label="Search"
            value={filters.q}
            onChange={(value) => setFilter('q', value)}
            placeholder="Agent name"
            type="search"
            ariaControls="roster-list"
          />
          <FilterSelect
            id="roster-readiness"
            label="Readiness"
            value={filters.readiness}
            onChange={(value) => setFilter('readiness', value as typeof filters.readiness)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'ready', label: 'Ready' },
              { value: 'training', label: 'In training' },
              { value: 'deployed', label: 'On assignment' },
              { value: 'inactive', label: 'Unavailable' },
            ]}
          />
          <FilterSelect
            id="roster-sort"
            label="Sort"
            value={filters.sort}
            onChange={(value) => setFilter('sort', value as typeof filters.sort)}
            options={[
              { value: 'readiness', label: 'Readiness' },
              { value: 'name', label: 'Name' },
              { value: 'fatigue', label: 'Fatigue' },
            ]}
          />
        </div>

        <div id="roster-list">
          <RosterGroup
            title="Ready now"
            description="Available for immediate queueing."
            agents={groupedRoster.ready}
            queueTraining={queueTraining}
            programs={agentPrograms}
            game={game}
            agentImpactPreviewMap={agentImpactPreviewMap}
            emptyMessage="No agents are currently ready for training."
          />

          <RosterGroup
            title="In training"
            description="Already committed to a program and unavailable for new queues."
            agents={groupedRoster.training}
            queueTraining={queueTraining}
            programs={agentPrograms}
            game={game}
            agentImpactPreviewMap={agentImpactPreviewMap}
            emptyMessage="No agents are currently in training."
          />

          <RosterGroup
            title="On assignment"
            description="Deployed agents are blocked until their case completes."
            agents={groupedRoster.deployed}
            queueTraining={queueTraining}
            programs={agentPrograms}
            game={game}
            agentImpactPreviewMap={agentImpactPreviewMap}
            emptyMessage="No agents are currently deployed."
          />

          <RosterGroup
            title="Unavailable"
            description="Inactive agents cannot be queued until they return to service."
            agents={groupedRoster.inactive}
            queueTraining={queueTraining}
            programs={agentPrograms}
            game={game}
            agentImpactPreviewMap={agentImpactPreviewMap}
            emptyMessage="No inactive agents are listed."
          />
        </div>
      </article>

      <article className="panel space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold">Team drills</h3>
          <p className="text-xs uppercase tracking-[0.24em] opacity-50">
            coordination / chemistry / readiness
          </p>
        </div>

        <TeamRosterGroup
          teams={teamViews}
          programs={teamPrograms}
          queueTeamTraining={queueTeamTraining}
          game={game}
        />
      </article>

      {showHistoryPanels ? (
        <article className="panel space-y-3">
          <h3 className="text-base font-semibold">{TRAINING_UI_TEXT.recentEventsHeading}</h3>
          {recentTrainingEvents.length === 0 ? (
            <p className="text-sm opacity-60">{TRAINING_UI_TEXT.noRecentEvents}</p>
          ) : (
            <ul className="space-y-2">
              {recentTrainingEvents.map((event) => (
                <li
                  key={event.id}
                  className={`rounded border px-3 py-2 ${getTrainingEventToneClass(event.type)}`}
                >
                  <p className="font-medium">
                    {event.type === 'agent.training_started'
                      ? `${event.payload.agentName} started ${event.payload.trainingName}`
                      : event.type === 'agent.training_completed'
                        ? `${event.payload.agentName} completed ${event.payload.trainingName}`
                        : `${event.payload.agentName} cancelled ${event.payload.trainingName} (refund: $${event.payload.refund})`}
                  </p>
                  <p className="text-xs opacity-50">
                    Week {event.payload.week} / {event.timestamp}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>
      ) : null}

      {showHistoryPanels ? (
        <article className="panel space-y-3">
          <h3 className="text-base font-semibold">{TRAINING_UI_TEXT.completionsHeading}</h3>
          {recentCompletions.length === 0 ? (
            <p className="text-sm opacity-60">{TRAINING_UI_TEXT.noRecentCompletions}</p>
          ) : (
            <ol className="space-y-2">
              {recentCompletions.map((event) => (
                <li
                  key={event.id}
                  className="rounded border border-emerald-400/30 bg-emerald-500/8 px-3 py-2"
                >
                  <p className="font-medium">
                    Week {event.payload.week}: {event.payload.agentName} completed{' '}
                    {event.payload.trainingName}
                  </p>
                  <p className="text-xs opacity-50">{event.timestamp}</p>
                </li>
              ))}
            </ol>
          )}
        </article>
      ) : null}
    </section>
  )
}

function RosterGroup({
  title,
  description,
  agents,
  emptyMessage,
  queueTraining,
  programs,
  game,
  agentImpactPreviewMap,
}: {
  title: string
  description: string
  agents: ReturnType<typeof getTrainingRosterViews>
  emptyMessage: string
  queueTraining: (agentId: string, trainingId: string) => void
  programs: typeof trainingCatalog
  game: GameState
  agentImpactPreviewMap: Map<
    string,
    Map<string, ReturnType<typeof getAgentTrainingImpacts>[number]>
  >
}) {
  const academyTier = game.academyTier ?? 0

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm opacity-60">{description}</p>
        </div>
        <p className="text-xs uppercase tracking-[0.24em] opacity-50">
          {agents.length} agent{agents.length === 1 ? '' : 's'}
        </p>
      </div>

      {agents.length === 0 ? (
        <p className="text-sm opacity-60">{emptyMessage}</p>
      ) : (
        <ul className="space-y-3">
          {agents.map((view) => {
            const {
              agent,
              teamName,
              assignedCaseTitle,
              readinessLabel,
              readinessReasons,
              queueEntry,
              assignedInstructorName,
              instructorBonus,
            } = view
            const previews = agentImpactPreviewMap.get(agent.id)
            const bestUnlockedPreview = programs
              .filter((program) => academyTier >= (program.minAcademyTier ?? 0))
              .map((program) => previews?.get(program.trainingId))
              .find((preview) => Boolean(preview))

            return (
              <li key={agent.id} className="rounded border border-white/10 px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={view.agentLink} className="font-medium hover:underline">
                        {agent.name}
                      </Link>
                      <StatusBadge
                        label={readinessLabel}
                        tone={view.readiness === 'ready' ? 'neutral' : 'warning'}
                      />
                    </div>
                    <p className="text-sm opacity-60">
                      {ROLE_LABELS[agent.role]} / Fatigue {agent.fatigue} / Team{' '}
                      {teamName ?? 'Reserve Pool'}
                    </p>
                    <p className="text-xs opacity-50">
                      {assignedCaseTitle ? `Assigned to ${assignedCaseTitle}` : 'Not deployed'}
                    </p>
                    {assignedInstructorName ? (
                      <p className="text-xs opacity-50">
                        Instructor: {assignedInstructorName} (+{instructorBonus ?? 0})
                      </p>
                    ) : null}
                  </div>
                  <p className="text-xs uppercase tracking-[0.24em] opacity-50">{agent.status}</p>
                </div>

                <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                  <p className="opacity-70">{readinessReasons[0]}</p>
                  <p className="opacity-70">
                    {readinessReasons[1] ??
                      (queueEntry
                        ? `Training queue: ${queueEntry.trainingName}`
                        : `Funding required for training: ${game.funding > 0 ? 'Available' : 'Insufficient'}`)}
                  </p>
                </div>

                {bestUnlockedPreview ? (
                  <p className="mt-2 text-xs opacity-50">
                    Best projected gain: {bestUnlockedPreview.trainingName} (+
                    {bestUnlockedPreview.scoreDelta.toFixed(2)} score)
                  </p>
                ) : null}

                <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  {programs.map((program) => {
                    const unlocked = academyTier >= (program.minAcademyTier ?? 0)
                    const preview = previews?.get(program.trainingId)
                    const assessment = assessAgentTrainingQueue(game, agent.id, program.trainingId)
                    const disabled = !assessment.canQueue
                    const unlockCost = unlocked ? null : getAcademyUpgradeCost(academyTier)

                    return (
                      <button
                        key={program.trainingId}
                        type="button"
                        className="btn btn-sm btn-ghost justify-between"
                        disabled={disabled}
                        onClick={() => queueTraining(agent.id, program.trainingId)}
                      >
                        <span>{program.name}</span>
                        <span className="text-xs opacity-60">
                          {assessment.canQueue
                            ? preview
                              ? `+${preview.scoreDelta.toFixed(2)} score · +${preview.fatigueDelta} fatigue${preview.recoveryBonus ? ` · +${preview.recoveryBonus} recovery` : ''}`
                              : `${STAT_LABELS[program.targetStat]} +${program.statDelta}`
                            : assessment.reason === 'program_locked'
                              ? `Unlock tier ${program.minAcademyTier ?? 0}${unlockCost !== null ? ` ($${unlockCost})` : ''}`
                              : assessment.reason === 'insufficient_funding'
                                ? `Need $${assessment.requiredFunding ?? program.fundingCost}`
                                : assessment.reason === 'fatigue_gate'
                                  ? 'Fatigue too high'
                                  : assessment.reason === 'no_slots'
                                    ? 'No open slots'
                                    : assessment.reason === 'team_deployed'
                                      ? 'Assigned on case'
                                      : assessment.reason === 'already_queued' ||
                                          assessment.reason === 'already_training'
                                        ? 'Already queued'
                                        : assessment.reason === 'stat_maxed'
                                          ? 'Stat already maxed'
                                          : 'Unavailable'}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link to={APP_ROUTES.teams} className="btn btn-xs btn-ghost">
                    Open squad builder
                  </Link>
                  <Link to={view.agentLink} className="btn btn-xs btn-ghost">
                    Open agent
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function TeamRosterGroup({
  teams,
  programs,
  queueTeamTraining,
  game,
}: {
  teams: ReturnType<typeof getTeamTrainingViews>
  programs: typeof trainingCatalog
  queueTeamTraining: (teamId: string, trainingId: string) => void
  game: GameState
}) {
  const academyTier = game.academyTier ?? 0

  if (teams.length === 0) {
    return <p className="text-sm opacity-60">No teams are currently available for drills.</p>
  }

  return (
    <ul className="space-y-3">
      {teams.map((view) => (
        <li key={view.team.id} className="rounded border border-white/10 px-3 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={view.teamLink} className="font-medium hover:underline">
                  {view.team.name}
                </Link>
                <StatusBadge
                  label={view.readinessLabel}
                  tone={view.readiness === 'ready' ? 'neutral' : 'warning'}
                />
              </div>
              <p className="text-sm opacity-60">
                {view.memberCount} member{view.memberCount === 1 ? '' : 's'} / Chemistry{' '}
                {view.team.derivedStats?.chemistryScore ?? 0} / Cohesion{' '}
                {view.team.derivedStats?.cohesion ?? 0}
              </p>
              <p className="text-xs opacity-50">
                {view.memberNames.join(', ') || 'No active members'}
              </p>
              <p className="text-xs opacity-50">
                {view.totalBondDepth > 0 && view.strongestBondPairLabel
                  ? `Bond depth ${view.totalBondDepth} / Strongest pair: ${view.strongestBondPairLabel} (${view.strongestBondDepth})`
                  : 'No trained bonds recorded yet.'}
              </p>
            </div>
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {view.assignedCaseTitle ? `Assigned: ${view.assignedCaseTitle}` : 'Reserve'}
            </p>
          </div>

          <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
            <p className="opacity-70">{view.readinessReasons[0]}</p>
            <p className="opacity-70">
              {view.readinessReasons[1] ?? 'Team drill queue available.'}
            </p>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {programs.map((program) => {
              const unlocked = academyTier >= (program.minAcademyTier ?? 0)
              const assessment = assessTeamTrainingQueue(game, view.team.id, program.trainingId)
              const disabled = !assessment.canQueue
              const unlockCost = unlocked ? null : getAcademyUpgradeCost(academyTier)

              return (
                <button
                  key={`${view.team.id}-${program.trainingId}`}
                  type="button"
                  className="btn btn-sm btn-ghost justify-between"
                  disabled={disabled}
                  onClick={() => queueTeamTraining(view.team.id, program.trainingId)}
                >
                  <span>{program.name}</span>
                  <span className="text-xs opacity-60">
                    {assessment.canQueue
                      ? `+${(program.relationshipDelta ?? 0).toFixed(2)} chem · +${program.trainedRelationshipDelta ?? 0} bond · $${assessment.scaledCost}`
                      : assessment.reason === 'program_locked'
                        ? `Unlock tier ${program.minAcademyTier ?? 0}${unlockCost !== null ? ` ($${unlockCost})` : ''}`
                        : assessment.reason === 'insufficient_funding'
                          ? `Need $${assessment.requiredFunding ?? program.fundingCost}`
                          : assessment.reason === 'team_undersized'
                            ? 'Need 2+ members'
                            : assessment.reason === 'insufficient_eligible_members'
                              ? 'Need 2 ready members'
                              : assessment.reason === 'no_slots'
                                ? 'No open slots'
                                : assessment.reason === 'team_deployed'
                                  ? 'Assigned on case'
                                  : 'Unavailable'}
                  </span>
                </button>
              )
            })}
          </div>
        </li>
      ))}
    </ul>
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

function StatusBadge({ label, tone }: { label: string; tone: 'neutral' | 'warning' }) {
  const className =
    tone === 'warning'
      ? 'border-amber-400/30 bg-amber-500/10 text-amber-200'
      : 'border-white/10 bg-white/5 text-white/80'

  return <span className={`rounded-full border px-2 py-0.5 text-xs ${className}`}>{label}</span>
}

function getTrainingEventToneClass(eventType: GameState['events'][number]['type']) {
  if (eventType === 'agent.training_completed') {
    return 'border-emerald-400/30 bg-emerald-500/8'
  }

  if (eventType === 'agent.training_cancelled') {
    return 'border-amber-400/30 bg-amber-500/8'
  }

  return 'border-white/10 bg-white/5'
}

function getControlEventToneClass(eventType: GameState['events'][number]['type']) {
  if (eventType === 'system.academy_upgraded') {
    return 'border-sky-400/30 bg-sky-500/8'
  }

  if (eventType === 'agent.instructor_assigned') {
    return 'border-indigo-400/30 bg-indigo-500/8'
  }

  return 'border-white/10 bg-white/5'
}

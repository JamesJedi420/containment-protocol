import type { AgentView } from '../agentView'
import { SHELL_UI_TEXT } from '../../../data/copy'
import { DetailMetric } from './DetailMetric'
import { StatCard } from '../../../components/StatCard'
import { DetailProgressStat } from '../../../components/StatCard'
import { formatGrowthStats, formatNumber } from './formatters'

import { memo, useState } from 'react'

export const HistoryTab = memo(function HistoryTab({ view }: { view: AgentView }) {
  const { materialized } = view

  // Compute success rate for cases
  const resolved = materialized.history.counters.casesResolved || 0
  const partial = materialized.history.counters.casesPartiallyResolved || 0
  const failed = materialized.history.counters.casesFailed || 0
  const total = resolved + partial + failed
  const successRate = total > 0 ? Math.round((resolved / total) * 100) : 0

  // Compute additional quick stats
  const deployments = materialized.history.performanceStats.deployments || 0
  const avgPerformance =
    deployments > 0
      ? Math.round(materialized.history.performanceStats.totalContribution / deployments)
      : 0

  // Expandable recent activity
  const [showAllActivity, setShowAllActivity] = useState(false)
  const maxActivity = 5
  const activityList = materialized.history.recentTimeline
  const visibleActivity = showAllActivity ? activityList : activityList.slice(0, maxActivity)
  const [expandedActivityKey, setExpandedActivityKey] = useState<string | null>(null)

  // Event log filter state
  const [logFilter, setLogFilter] = useState<'All' | 'Case' | 'Training' | 'System'>('All')
  const logTypeOptions = ['All', 'Case', 'Training', 'System'] as const
  // Compute filtered logs
  const logs = materialized.history.recentLogs || []
  const filteredLogs =
    logFilter === 'All'
      ? logs
      : logs.filter((entry) => {
          // Normalize type for matching
          const type = (entry.type || '').toLowerCase()
          if (logFilter === 'Case') return type.includes('case')
          if (logFilter === 'Training') return type.includes('training')
          if (logFilter === 'System') return type.includes('system')
          return true
        })
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  // Collapsible state for stat panels
  const [openPanels, setOpenPanels] = useState([
    true, // Progression open by default
    true, // Case/training
    true, // Cumulative
    true, // Contribution
    true, // Domain
  ])
  const togglePanel = (idx: number) =>
    setOpenPanels((prev) => prev.map((v, i) => (i === idx ? !v : v)))
  const potentialSummary = materialized.progression.exactPotentialKnown
    ? materialized.progression.actualPotentialTier
    : materialized.progression.visiblePotentialTier
      ? `Projected ${materialized.progression.visiblePotentialTier}`
      : 'Unknown'

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Deployments" value={deployments} />
        <StatCard label="Avg. Contribution/Deployment" value={avgPerformance} />
        <StatCard label="Success Rate" value={total > 0 ? `${successRate}%` : 'N/A'} />
        <StatCard label="Resolved Cases" value={resolved} />
      </div>

      {/* Collapsible: Progression */}
      <div className="border rounded">
        {openPanels[0] ? (
          <button
            className="w-full flex justify-between items-center px-4 py-2 text-left font-semibold section-header"
            onClick={() => togglePanel(0)}
            aria-expanded="true"
          >
            Progression
            <span>−</span>
          </button>
        ) : (
          <button
            className="w-full flex justify-between items-center px-4 py-2 text-left font-semibold section-header"
            onClick={() => togglePanel(0)}
            aria-expanded="false"
          >
            Progression
            <span>+</span>
          </button>
        )}
        {openPanels[0] && (
          <div className="px-4 pb-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <DetailMetric label="Level" value={String(materialized.progression.level)} />
              <DetailMetric label="XP" value={String(materialized.progression.xp)} />
              <DetailMetric
                label="Skill points"
                value={String(materialized.progression.skillTree?.skillPoints ?? 0)}
              />
              <DetailMetric
                label="XP to next"
                value={String(materialized.progression.xpToNextLevel)}
              />
              <DetailProgressStat
                label="Level progress"
                value={`${materialized.progression.progressPercent}%`}
                progressValue={materialized.progression.progressRatio * 100}
                progressMax={100}
                progressAriaLabel="Progression to next level"
              />
              <DetailMetric label="Potential" value={potentialSummary} />
            </div>
            <p className="mt-2 text-sm opacity-60">
              {materialized.progression.xpIntoCurrentLevel}/{materialized.progression.xpToNextLevel}{' '}
              XP into the current level band. Next threshold at{' '}
              {materialized.progression.nextLevelThresholdXp} total XP.
            </p>
            <p className="mt-2 text-sm opacity-60">
              Growth profile: {materialized.progression.growthProfile}. Accrued growth:{' '}
              {formatGrowthStats(materialized.progression.growthStats)}.
            </p>
          </div>
        )}
      </div>

      {/* Collapsible: Case and training history */}
      <div className="border rounded">
        {openPanels[1] ? (
          <button
            className="w-full flex justify-between items-center px-4 py-2 text-left font-semibold section-header"
            onClick={() => togglePanel(1)}
            aria-expanded="true"
          >
            Case and training history
            <span>−</span>
          </button>
        ) : (
          <button
            className="w-full flex justify-between items-center px-4 py-2 text-left font-semibold section-header"
            onClick={() => togglePanel(1)}
            aria-expanded="false"
          >
            Case and training history
            <span>+</span>
          </button>
        )}
        {openPanels[1] && (
          <div className="px-4 pb-4">
            <div className="mb-2">
              <DetailMetric
                label="Case success rate"
                value={total > 0 ? `${resolved} / ${total} (${successRate}%)` : 'N/A'}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <DetailMetric
                label="Assignments"
                value={String(materialized.history.counters.assignmentsCompleted)}
              />
              <DetailMetric
                label="Resolved"
                value={String(materialized.history.counters.casesResolved)}
              />
              <DetailMetric
                label="Partial"
                value={String(materialized.history.counters.casesPartiallyResolved)}
              />
              <DetailMetric
                label="Failed"
                value={String(materialized.history.counters.casesFailed)}
              />
              <DetailMetric
                label="Contained"
                value={String(materialized.history.counters.anomaliesContained)}
              />
              <DetailMetric
                label="Training weeks"
                value={String(materialized.history.counters.trainingWeeks)}
              />
              <DetailMetric
                label="Trainings done"
                value={String(materialized.history.counters.trainingsCompleted)}
              />
              <DetailMetric
                label="Legacy trainings"
                value={String(materialized.history.trainingsDone)}
              />
              <DetailMetric
                label="Cases completed"
                value={String(materialized.history.casesCompleted)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Collapsible: Cumulative performance totals */}
      <div className="border rounded">
        {openPanels[2] ? (
          <button
            className="w-full flex justify-between items-center px-4 py-2 text-left font-semibold section-header"
            onClick={() => togglePanel(2)}
            aria-expanded="true"
          >
            Cumulative performance totals
            <span>−</span>
          </button>
        ) : (
          <button
            className="w-full flex justify-between items-center px-4 py-2 text-left font-semibold section-header"
            onClick={() => togglePanel(2)}
            aria-expanded="false"
          >
            Cumulative performance totals
            <span>+</span>
          </button>
        )}
        {openPanels[2] && (
          <div className="px-4 pb-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <DetailMetric
                label="Deployments"
                value={String(materialized.history.performanceStats.deployments)}
              />
              <DetailMetric
                label="Stress sustained"
                value={String(materialized.history.counters.stressSustained)}
              />
              <DetailMetric
                label="Damage sustained"
                value={String(materialized.history.counters.damageSustained)}
              />
              <DetailMetric
                label="Anomaly exposures"
                value={String(materialized.history.counters.anomalyExposures)}
              />
              <DetailMetric
                label="Evidence recovered"
                value={String(materialized.history.counters.evidenceRecovered)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Collapsible: Contribution breakdown */}
      <div className="border rounded">
        {openPanels[3] ? (
          <button
            className="w-full flex justify-between items-center px-4 py-2 text-left font-semibold section-header"
            onClick={() => togglePanel(3)}
            aria-expanded="true"
          >
            Contribution breakdown
            <span>−</span>
          </button>
        ) : (
          <button
            className="w-full flex justify-between items-center px-4 py-2 text-left font-semibold section-header"
            onClick={() => togglePanel(3)}
            aria-expanded="false"
          >
            Contribution breakdown
            <span>+</span>
          </button>
        )}
        {openPanels[3] && (
          <div className="px-4 pb-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <DetailMetric
                label="Contribution total"
                value={formatNumber(materialized.history.performanceStats.totalContribution)}
              />
              <DetailMetric
                label="Threat handled total"
                value={formatNumber(materialized.history.performanceStats.totalThreatHandled)}
              />
              <DetailMetric
                label="Damage taken total"
                value={formatNumber(materialized.history.performanceStats.totalDamageTaken)}
              />
              <DetailMetric
                label="Healing total"
                value={formatNumber(materialized.history.performanceStats.totalHealingPerformed)}
              />
              <DetailMetric
                label="Evidence total"
                value={formatNumber(materialized.history.performanceStats.totalEvidenceGathered)}
              />
              <DetailMetric
                label="Containment actions total"
                value={formatNumber(
                  materialized.history.performanceStats.totalContainmentActionsCompleted
                )}
              />
            </div>
          </div>
        )}
      </div>

      {/* Collapsible: Domain contributions */}
      <div className="border rounded">
        {openPanels[4] ? (
          <button
            className="w-full flex justify-between items-center px-4 py-2 text-left font-semibold section-header"
            onClick={() => togglePanel(4)}
            aria-expanded="true"
          >
            Domain contributions
            <span>−</span>
          </button>
        ) : (
          <button
            className="w-full flex justify-between items-center px-4 py-2 text-left font-semibold section-header"
            onClick={() => togglePanel(4)}
            aria-expanded="false"
          >
            Domain contributions
            <span>+</span>
          </button>
        )}
        {openPanels[4] && (
          <div className="px-4 pb-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <DetailMetric
                label="Field total"
                value={formatNumber(materialized.history.performanceStats.totalFieldPower)}
              />
              <DetailMetric
                label="Containment total"
                value={formatNumber(materialized.history.performanceStats.totalContainment)}
              />
              <DetailMetric
                label="Investigation total"
                value={formatNumber(materialized.history.performanceStats.totalInvestigation)}
              />
              <DetailMetric
                label="Support total"
                value={formatNumber(materialized.history.performanceStats.totalSupport)}
              />
              <DetailMetric
                label="Stress total"
                value={formatNumber(materialized.history.performanceStats.totalStressImpact)}
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.24em] opacity-50">Allies worked with</p>
        <p className="mt-2 text-sm opacity-80">
          {materialized.history.alliesWorkedWith.length > 0
            ? materialized.history.alliesWorkedWith.join(', ')
            : SHELL_UI_TEXT.none}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.24em] opacity-50">Recent activity</p>
        {activityList.length > 0 ? (
          <>
            <ul className="space-y-2">
              {visibleActivity.map((entry) => (
                <li
                  key={`${entry.week}-${entry.eventType}-${entry.note}`}
                  className="rounded border border-white/10 px-3 py-2"
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    aria-label={`Toggle activity details for week ${entry.week}: ${entry.note}`}
                    onClick={() =>
                      setExpandedActivityKey((current) =>
                        current === `${entry.week}-${entry.eventType}-${entry.note}`
                          ? null
                          : `${entry.week}-${entry.eventType}-${entry.note}`
                      )
                    }
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{entry.note}</p>
                      <p className="text-xs uppercase tracking-[0.2em] opacity-50">
                        Week {entry.week}
                      </p>
                    </div>
                    <p className="text-xs opacity-60">{entry.eventType}</p>
                    {expandedActivityKey === `${entry.week}-${entry.eventType}-${entry.note}` ? (
                      <div className="mt-2 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs opacity-75">
                        <p>Mission week: {entry.week}</p>
                        <p>Type: {entry.eventType}</p>
                        <p>Summary: {entry.note}</p>
                      </div>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
            {activityList.length > maxActivity && (
              <button
                className="btn btn-sm btn-ghost mt-2"
                aria-label={
                  showAllActivity
                    ? 'Show fewer recent activity entries'
                    : `Show all ${activityList.length} recent activity entries`
                }
                onClick={() => setShowAllActivity((v) => !v)}
              >
                {showAllActivity ? 'Show less' : `Show all (${activityList.length})`}
              </button>
            )}
          </>
        ) : (
          <p className="text-sm opacity-60">No history entries recorded yet.</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.24em] opacity-50">Event-linked logs</p>
        {/* Filter tabs */}
        <div className="flex gap-2 mb-2">
          {logTypeOptions.map((type) => (
            <button
              key={type}
              className={`btn btn-xs ${logFilter === type ? 'btn-primary' : 'btn-ghost'}`}
              aria-label={`Filter logs by ${type}`}
              onClick={() => setLogFilter(type)}
            >
              {type}
            </button>
          ))}
        </div>
        {filteredLogs.length > 0 ? (
          <ul className="space-y-2">
            {filteredLogs.map((entry) => (
              <li key={entry.id} className="rounded border border-white/10 px-3 py-2">
                <button
                  type="button"
                  className="w-full text-left"
                  aria-label={`Toggle log details for ${entry.type} at ${entry.timestamp}`}
                  onClick={() =>
                    setExpandedLogId((current) => (current === entry.id ? null : entry.id))
                  }
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{entry.type}</p>
                    <p className="text-xs uppercase tracking-[0.2em] opacity-50">
                      {entry.timestamp}
                    </p>
                  </div>
                  <p className="text-xs opacity-60">{entry.sourceSystem}</p>
                  {expandedLogId === entry.id ? (
                    <div className="mt-2 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs opacity-75">
                      <p>Log ID: {entry.id}</p>
                      <p>Source: {entry.sourceSystem}</p>
                      <p>Timestamp: {entry.timestamp}</p>
                    </div>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm opacity-60">No event-linked logs recorded yet.</p>
        )}
      </div>
    </div>
  )
})

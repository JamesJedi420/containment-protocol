import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { formatCampaignGovernanceSummaryLines } from '../../domain/campaignGovernance'
import { formatOutcomeCountSummary } from '../../domain/reportNotes'
import { buildAgencyOverview, formatCadenceSummary } from '../../domain/strategicState'
import { formatTerritorialPowerSummaryLines } from '../../domain/territorialPower'
import { formatSupplyNetworkSummaryLines } from '../../domain/supplyNetwork'

export default function AgencyPage() {
  const { game } = useGameStore()
  const overview = buildAgencyOverview(game)
  const { summary } = overview
  const governanceTurnLines = formatCampaignGovernanceSummaryLines(summary.campaignGovernance)
  const governance = summary.governanceTransfers
  const territorialPowerLines = formatTerritorialPowerSummaryLines(summary.territorialPower)
  const supplyNetworkLines = formatSupplyNetworkSummaryLines(summary.supplyNetwork)

  return (
    <section className="space-y-4">
      <article className="panel panel-primary space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Agency Command</h2>
            <p className="text-sm opacity-60">
              Organization-level posture aggregated from incident pressure, academy throughput,
              logistics readiness, faction activity, and field performance.
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.24em] opacity-50">{summary.name}</p>
          </div>
          <div className="flex gap-2">
            <Link to={APP_ROUTES.trainingDivision} className="btn btn-sm btn-ghost">
              Academy
            </Link>
            <Link to={APP_ROUTES.fabrication} className="btn btn-sm btn-ghost">
              Fabrication
            </Link>
            <Link to={APP_ROUTES.containmentSite} className="btn btn-sm btn-ghost">
              Containment Site
            </Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Containment" value={String(overview.containmentRating)} />
          <Metric label="Clearance" value={String(overview.clearanceLevel)} />
          <Metric label="Funding" value={`$${overview.funding}`} />
          <Metric label="Active incidents" value={String(overview.activeCases)} />
          <Metric label="Committed teams" value={String(overview.activeTeams)} />
          <Metric label="Ready operatives" value={String(overview.readyAgents)} />
        </div>

        <div className="mt-2">
          <h3 className="text-xs uppercase tracking-wide opacity-50 mb-1">Escalation & Pressure Cadence</h3>
          <ul className="text-xs opacity-80 space-y-1">
            {formatCadenceSummary(overview).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="panel space-y-3">
          <h3 className="text-base font-semibold">Command posture</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <Metric label="Reputation" value={String(summary.reputation)} />
            <Metric
              label="Pressure"
              value={`${summary.pressure.score} (${summary.pressure.level})`}
            />
            <Metric
              label="Stability"
              value={`${summary.stability.score} (${summary.stability.level})`}
            />
            <Metric
              label="Major incidents active"
              value={String(summary.activeOperations.majorIncidents)}
            />
          </div>
          <ul className="space-y-2 text-sm opacity-80">
            <li>
              Teams: {summary.teams.total} total / {summary.teams.ready} ready /{' '}
              {summary.teams.assigned} deployed
            </li>
            <li>
              Operations: {summary.activeOperations.activeCases} active /{' '}
              {summary.activeOperations.inProgressCases} underway /{' '}
              {summary.activeOperations.openOperationSlots} open incident capacity
            </li>
            <li>
              Pressure split: incidents {summary.pressure.incident}, factions{' '}
              {summary.pressure.faction}, operations {summary.pressure.operations}, procurement{' '}
              {summary.pressure.market}
            </li>
            <li>
              Stability split: containment {summary.stability.containment}, funding{' '}
              {summary.stability.funding}, readiness {summary.stability.readiness}, logistics{' '}
              {summary.stability.logistics}
            </li>
          </ul>
        </article>

        <article className="panel space-y-3">
          <h3 className="text-base font-semibold">Academy and logistics posture</h3>
          <ul className="space-y-2 text-sm opacity-80">
            <li>Ready for training: {overview.academy.readyAgents}</li>
            <li>Training queue: {overview.academy.activeQueue}</li>
            <li>Average queue time: {overview.academy.averageWeeksQueued}w</li>
            <li>Stock on hand: {overview.logistics.totalStock}</li>
            <li>Fabrication queue: {overview.logistics.queuedOrders}</li>
            <li>Market posture: {overview.logistics.pressureLabel}</li>
          </ul>
        </article>

        <article className="panel space-y-3">
          <h3 className="text-base font-semibold">Strategic threat picture</h3>
          <ul className="space-y-2 text-sm opacity-80">
            <li>Major incident severity: {overview.incidents.severity}</li>
            <li>Incident pressure: {overview.incidents.pressureScore}</li>
            <li>Ranking tier: {overview.ranking.tier}</li>
            <li>Ranking score: {overview.ranking.score}</li>
            <li>Open incident capacity: {overview.encounters.openSlots}</li>
            <li>Top external actor: {overview.factions[0]?.label ?? 'None'}</li>
          </ul>
        </article>

        <article className="panel space-y-3">
          <h3 className="text-base font-semibold">Governance turn</h3>
          <ul className="space-y-2 text-sm opacity-80">
            {governanceTurnLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </article>

        <article className="panel space-y-3">
          <h3 className="text-base font-semibold">Territorial power</h3>
          <ul className="space-y-2 text-sm opacity-80">
            {territorialPowerLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </article>

        <article className="panel space-y-3">
          <h3 className="text-base font-semibold">Supply network</h3>
          <ul className="space-y-2 text-sm opacity-80">
            {supplyNetworkLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </article>
      </div>

      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">Academy recommendations</h3>
        {overview.academy.suggestedPrograms.length === 0 ? (
          <p className="text-sm opacity-60">
            No ready operatives available for academy recommendations.
          </p>
        ) : (
          <ul className="space-y-2">
            {overview.academy.suggestedPrograms.map((entry) => (
              <li
                key={`${entry.agentId}-${entry.trainingId}`}
                className="flex items-center justify-between gap-3 rounded border border-white/10 px-3 py-2"
              >
                <span>
                  {entry.agentName} {'->'} {entry.trainingName}
                </span>
                <span className="text-sm opacity-70">+{entry.scoreDelta.toFixed(2)} score</span>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">External faction actors</h3>
        <ul className="space-y-2">
          {overview.factions.slice(0, 4).map((faction) => (
            <li key={faction.id} className="rounded border border-white/10 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{faction.label}</span>
                <span className="text-sm opacity-60">
                  {faction.stance} / standing {faction.standing >= 0 ? '+' : ''}
                  {faction.standing} / pressure {faction.pressureScore}
                </span>
              </div>
              <p className="mt-1 text-xs opacity-60">{faction.feedback}</p>
            </li>
          ))}
        </ul>
      </article>

      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">Commercial Chokepoint & Council Power</h3>
        <ul className="space-y-2 text-sm opacity-80">
          <li>Chokepoint leverage: {summary.chokepointLeverage}</li>
          <li>
            Council power distribution:
            <ul className="ml-4">
              {Object.entries(summary.councilPowerDistribution).length === 0 ? (
                <li className="opacity-60">No council data</li>
              ) : (
                Object.entries(summary.councilPowerDistribution).map(([council, pct]) => (
                  <li key={council}>{council}: {pct}%</li>
                ))
              )}
            </ul>
          </li>
          <li>External revenue share: {summary.externalRevenueShare}%</li>
        </ul>
      </article>

      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">Authority transfer & succession</h3>
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Authorities tracked" value={String(governance.authorityCount)} />
          <Metric label="Active transfers" value={String(governance.activeTransferCount)} />
          <Metric label="Blocked transfers" value={String(governance.blockedTransferCount)} />
          <Metric label="Armed contracts" value={String(governance.armedContractCount)} />
        </div>
        {governance.latestBatch ? (
          <p className="text-sm opacity-70">
            Latest batch: {governance.latestBatch.label} / completed {governance.latestBatch.completed}
            {' / '}contested {governance.latestBatch.contested} / failed{' '}
            {governance.latestBatch.failed}
          </p>
        ) : null}
        {governance.activeTransfers.length === 0 &&
        governance.recentTransfers.length === 0 &&
        governance.contracts.length === 0 ? (
          <p className="text-sm opacity-60">
            No authority-transfer ceremonies or succession contracts are active.
          </p>
        ) : (
          <div className="grid gap-3 xl:grid-cols-3">
            <div className="rounded border border-white/10 px-3 py-3">
              <p className="text-xs uppercase tracking-[0.24em] opacity-50">Active transfers</p>
              <ul className="mt-2 space-y-2 text-sm opacity-80">
                {governance.activeTransfers.length > 0 ? (
                  governance.activeTransfers.map((transfer) => (
                    <li key={transfer.id}>
                      <span className="font-medium">
                        {transfer.authorityLabel} / {transfer.stateLabel}
                      </span>
                      <div className="opacity-60">{transfer.successorLabel}</div>
                      <div className="opacity-60">{transfer.metricsLabel}</div>
                      {transfer.blockerLabel ? <div className="opacity-60">{transfer.blockerLabel}</div> : null}
                    </li>
                  ))
                ) : (
                  <li className="opacity-60">No transfers are awaiting ceremony validation.</li>
                )}
              </ul>
            </div>

            <div className="rounded border border-white/10 px-3 py-3">
              <p className="text-xs uppercase tracking-[0.24em] opacity-50">Recent outcomes</p>
              <ul className="mt-2 space-y-2 text-sm opacity-80">
                {governance.recentTransfers.length > 0 ? (
                  governance.recentTransfers.map((transfer) => (
                    <li key={transfer.id}>
                      <span className="font-medium">
                        {transfer.authorityLabel} / {transfer.stateLabel}
                      </span>
                      <div className="opacity-60">{transfer.successorLabel}</div>
                      <div className="opacity-60">{transfer.metricsLabel}</div>
                      {transfer.outcomeLabel ? <div className="opacity-60">{transfer.outcomeLabel}</div> : null}
                    </li>
                  ))
                ) : (
                  <li className="opacity-60">No transfer outcomes have been logged.</li>
                )}
              </ul>
            </div>

            <div className="rounded border border-white/10 px-3 py-3">
              <p className="text-xs uppercase tracking-[0.24em] opacity-50">Deferred contracts</p>
              <ul className="mt-2 space-y-2 text-sm opacity-80">
                {governance.contracts.length > 0 ? (
                  governance.contracts.map((contract) => (
                    <li key={contract.id}>
                      <span className="font-medium">{contract.authorityLabel}</span>
                      <div className="opacity-60">{contract.successorLabel}</div>
                      <div className="opacity-60">{contract.triggerLabel}</div>
                    </li>
                  ))
                ) : (
                  <li className="opacity-60">No deferred succession contracts are armed.</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </article>

      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">Latest operations summary</h3>
        <ul className="space-y-2 text-sm opacity-80">
          <li>Latest week: {summary.report.latestWeek ?? 'No reports logged'}</li>
          <li>Outcomes: {formatOutcomeCountSummary(summary.report)}</li>
          <li>Report notes: {summary.report.notes}</li>
          <li>
            Ranking: {summary.ranking.tier} / {summary.ranking.score}
          </li>
        </ul>
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

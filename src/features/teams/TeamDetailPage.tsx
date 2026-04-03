import { useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import LocalNotFound from '../../app/LocalNotFound'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import {
  type Agent,
  type AgentRole,
  type PerformanceMetricSummary,
} from '../../domain/models'
import { getTeamAssignedCaseId, getTeamMemberIds } from '../../domain/teamSimulation'
import { getTeamDeploymentHistory } from '../deployment/deploymentEventSelectors'
import { getCoverageRolesForAgents } from '../../domain/validateTeam'
import {
  AGENCY_LABELS,
  CASE_UI_LABELS,
  ROLE_COVERAGE_LABELS,
  ROLE_LABELS,
  SHELL_UI_TEXT,
  TEAM_UI_LABELS,
} from '../../data/copy'
import { getTeamAssignableCaseViews } from './teamInsights'
import {
  canUseTeamName,
  getTeamLeaderOptions,
  getTeamManagementState,
  getTeamMemberRemovalBlockReason,
  getTeamTransferCandidateViews,
} from './teamBuilderView'

export default function TeamDetailPage() {
  const { teamId } = useParams()
  const location = useLocation()
  const { game, assign, unassign, renameTeam, setTeamLeader, moveAgentBetweenTeams, deleteEmptyTeam } =
    useGameStore()
  const team = teamId ? game.teams[teamId] : undefined
  const backTo = `${APP_ROUTES.teams}${location.search}`
  const [draftState, setDraftState] = useState<{ teamId?: string; value: string }>({
    teamId: team?.id,
    value: team?.name ?? '',
  })
  const [transferState, setTransferState] = useState<{ teamId?: string; agentId: string }>({
    teamId: team?.id,
    agentId: '',
  })
  const leaderOptions = useMemo(() => (team ? getTeamLeaderOptions(team, game) : []), [game, team])
  const transferCandidates = useMemo(
    () => (team ? getTeamTransferCandidateViews(game, team.id) : []),
    [game, team]
  )
  const deploymentHistory = useMemo(
    () => (team ? getTeamDeploymentHistory(team.id, game.events).slice(0, 8) : []),
    [game.events, team]
  )

  if (!team) {
    return (
      <LocalNotFound
        title={SHELL_UI_TEXT.teamNotFoundTitle}
        message={SHELL_UI_TEXT.teamNotFoundMessage}
        backTo={backTo}
        backLabel={SHELL_UI_TEXT.backToTemplate.replace('{label}', 'Teams')}
      />
    )
  }

  const managementState = getTeamManagementState(team, game)
  const assignedCaseId = getTeamAssignedCaseId(team)
  const agents = getTeamMemberIds(team).map((agentId) => game.agents[agentId]).filter(isAgent)
  const assignedCase = assignedCaseId ? game.cases[assignedCaseId] : undefined
  const satisfiableCases = getTeamAssignableCaseViews(team, game, 8)
  const summary = buildCapabilitySummary(agents)
  const draftName = draftState.teamId === team.id ? draftState.value : team.name
  const transferAgentId =
    transferState.teamId === team.id &&
    transferCandidates.some((candidate) => candidate.agent.id === transferState.agentId)
      ? transferState.agentId
      : (transferCandidates[0]?.agent.id ?? '')
  const trimmedName = draftName.trim()
  const canRename =
    managementState.editable &&
    trimmedName.length > 0 &&
    trimmedName !== team.name &&
    canUseTeamName(game, trimmedName, team.id)

  return (
    <section className="space-y-4">
      <article className="panel panel-primary space-y-4" role="region" aria-label="Team dossier">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide opacity-50">
              {TEAM_UI_LABELS.teamHeader}
            </p>
            <h2 className="text-xl font-semibold">
              {AGENCY_LABELS.responseUnit} {team.name}
            </h2>
            <p className="text-sm opacity-60">
              {CASE_UI_LABELS.tags}:{' '}
              {team.tags.length > 0 ? team.tags.join(', ') : SHELL_UI_TEXT.none}
            </p>
          </div>
          <div className="text-right text-sm opacity-70">
            <p>Status: {team.status?.state ?? 'ready'}</p>
            <p>
              {TEAM_UI_LABELS.avgFatigue} {summary.averageFatigue}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <DetailStat
            label="Leader"
            value={team.leaderId ? (game.agents[team.leaderId]?.name ?? 'Unknown') : 'Auto-select'}
          />
          <DetailStat
            label={CASE_UI_LABELS.assignedTo}
            value={assignedCase ? assignedCase.title : CASE_UI_LABELS.unassigned}
          />
          <DetailStat label={TEAM_UI_LABELS.agents} value={String(agents.length)} />
          <DetailStat label="Overall" value={String(team.derivedStats?.overall ?? 0)} />
          <DetailStat label="Readiness" value={String(team.derivedStats?.readiness ?? 0)} />
        </div>

        <div className="space-y-2">
          <p className="text-sm uppercase tracking-wide opacity-50">
            {TEAM_UI_LABELS.currentAssignment}
          </p>
          {assignedCase ? (
            <p className="text-sm">
              {CASE_UI_LABELS.assignedTo}:{' '}
              <Link to={APP_ROUTES.caseDetail(assignedCase.id)} className="hover:underline">
                {assignedCase.title}
              </Link>
            </p>
          ) : (
            <p className="text-sm opacity-50">{CASE_UI_LABELS.unassigned}</p>
          )}
        </div>
      </article>

      <div className="detail-layout" role="region" aria-label="Team management layout">
        <div className="detail-main">
          <article
            className="panel panel-support space-y-3"
            role="region"
            aria-label="Capability summary"
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold">{TEAM_UI_LABELS.capabilitySummary}</h3>
              <p className="text-xs uppercase tracking-[0.24em] opacity-50">
                Derived from current roster only
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DetailStat label={TEAM_UI_LABELS.role} value={ROLE_LABELS[summary.primaryRole]} />
              <DetailStat label="Combat" value={Math.round(summary.stats.combat).toString()} />
              <DetailStat
                label="Investigation"
                value={Math.round(summary.stats.investigation).toString()}
              />
              <DetailStat label="Utility" value={Math.round(summary.stats.utility).toString()} />
              <DetailStat label="Social" value={Math.round(summary.stats.social).toString()} />
              <DetailStat label="Cohesion" value={String(team.derivedStats?.cohesion ?? 0)} />
              <DetailStat label="Chemistry" value={String(team.derivedStats?.chemistryScore ?? 0)} />
              <DetailStat
                label={TEAM_UI_LABELS.coreCoverage}
                value={
                  summary.roleCoverage.length > 0
                    ? summary.roleCoverage.map((role) => ROLE_COVERAGE_LABELS[role]).join(', ')
                    : SHELL_UI_TEXT.none
                }
              />
              <DetailStat
                label={CASE_UI_LABELS.tags}
                value={summary.tags.length > 0 ? summary.tags.join(', ') : SHELL_UI_TEXT.none}
              />
            </div>
          </article>

          <article
            className="panel panel-support space-y-3"
            role="region"
            aria-label="Satisfiable cases"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Active cases this unit can satisfy now</h3>
                <p className="text-sm opacity-60">
                  Only active cases that match the unit&apos;s current roster and commitment state are
                  shown.
                </p>
              </div>
              <p className="text-xs uppercase tracking-[0.24em] opacity-50">
                {satisfiableCases.length} match{satisfiableCases.length === 1 ? '' : 'es'}
              </p>
            </div>

            {satisfiableCases.length > 0 ? (
              <ul className="space-y-2">
                {satisfiableCases.map(
                  ({ currentCase, success, partial, fail, performanceSummary, equipmentSummary }) => (
                  <li
                    key={currentCase.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded border border-white/10 px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">{currentCase.title}</p>
                      <p className="text-xs opacity-50">
                        {currentCase.kind === 'raid' ? 'Raid' : 'Case'} / Stage {currentCase.stage} /{' '}
                        {currentCase.status}
                      </p>
                      <p className="text-xs opacity-50">
                        {formatPerformanceSummary(performanceSummary)}
                      </p>
                      <p className="text-xs opacity-50">
                        {formatEquipmentSummary(equipmentSummary)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-xs opacity-70">
                        S {formatPercent(success)} / P {formatPercent(partial)} / F{' '}
                        {formatPercent(fail)}
                      </p>
                      {assignedCaseId !== currentCase.id ? (
                        <button
                          onClick={() => assign(currentCase.id, team.id)}
                          className="btn btn-xs"
                          aria-label={`Assign ${team.name} to ${currentCase.title}`}
                        >
                          Assign
                        </button>
                      ) : (
                        <button
                          onClick={() => unassign(currentCase.id, team.id)}
                          className="btn btn-xs btn-ghost"
                          aria-label={`Unassign ${team.name} from ${currentCase.title}`}
                        >
                          Unassign
                        </button>
                      )}
                      <Link to={APP_ROUTES.caseDetail(currentCase.id)} className="btn btn-xs btn-ghost">
                        Open case
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm opacity-50">No active cases fit this unit right now.</p>
            )}
          </article>

          <article
            className="panel panel-support space-y-3"
            role="region"
            aria-label="Deployment history"
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold">Deployment history</h3>
              <p className="text-xs uppercase tracking-[0.24em] opacity-50">
                Last {Math.min(deploymentHistory.length, 8)} events
              </p>
            </div>

            {deploymentHistory.length > 0 ? (
              <ul className="space-y-2">
                {deploymentHistory.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded border border-white/10 px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">{entry.label}</p>
                      <p className="text-xs opacity-50">Week {entry.week}</p>
                    </div>
                    {entry.caseId ? (
                      <Link to={APP_ROUTES.caseDetail(entry.caseId)} className="btn btn-xs btn-ghost">
                        {entry.caseTitle ?? 'Open case'}
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm opacity-50">No deployment activity has been recorded yet.</p>
            )}
          </article>
        </div>

        <aside className="detail-side" aria-label="Squad management operations">
          <article
            className="panel panel-primary space-y-4"
            role="region"
            aria-label="Squad management"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Squad management</h3>
                <p className="text-sm opacity-60">
                  Rename the unit, change the leader, and move agents in or out between deployments.
                </p>
              </div>
              {managementState.editable && agents.length === 0 ? (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => deleteEmptyTeam(team.id)}
                >
                  Delete empty squad
                </button>
              ) : null}
            </div>

            {managementState.reason ? (
              <p className="rounded border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90">
                {managementState.reason}
              </p>
            ) : null}

            {managementState.warnings.length > 0 ? (
              <ul className="space-y-2">
                {managementState.warnings.map((warning) => (
                  <li
                    key={warning}
                    className="rounded border border-white/10 px-3 py-2 text-sm opacity-80"
                  >
                    {warning}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <label htmlFor="team-name" className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50">
                  Squad name
                </span>
                <input
                  id="team-name"
                  className="form-input"
                  value={draftName}
                  onChange={(event) => setDraftState({ teamId: team.id, value: event.target.value })}
                  disabled={!managementState.editable}
                />
              </label>

              <label htmlFor="team-leader" className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50">
                  Leader
                </span>
                <select
                  id="team-leader"
                  className="form-select"
                  value={team.leaderId ?? ''}
                  onChange={(event) => setTeamLeader(team.id, event.target.value || null)}
                  disabled={!managementState.editable || leaderOptions.length === 0}
                >
                  {leaderOptions.length === 0 ? (
                    <option value="">No eligible members</option>
                  ) : (
                    leaderOptions.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  className="btn btn-primary w-full"
                  onClick={() => renameTeam(team.id, trimmedName)}
                  disabled={!canRename}
                >
                  Save
                </button>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <label htmlFor="transfer-agent" className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50">
                  Transfer agent into this squad
                </span>
                <select
                  id="transfer-agent"
                  className="form-select"
                  value={transferAgentId}
                  onChange={(event) =>
                    setTransferState({ teamId: team.id, agentId: event.target.value })
                  }
                  disabled={!managementState.editable || transferCandidates.length === 0}
                >
                  {transferCandidates.length === 0 ? (
                    <option value="">No eligible agents available</option>
                  ) : (
                    transferCandidates.map((candidate) => (
                      <option key={candidate.agent.id} value={candidate.agent.id}>
                        {candidate.label}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  className="btn w-full"
                  onClick={() => moveAgentBetweenTeams(transferAgentId, team.id)}
                  disabled={!managementState.editable || !transferAgentId}
                >
                  Transfer in
                </button>
              </div>
            </div>

            {!canUseTeamName(game, trimmedName || team.name, team.id) && trimmedName !== team.name ? (
              <p className="text-xs uppercase tracking-[0.2em] text-amber-200/80">
                Squad names must be unique and non-empty.
              </p>
            ) : null}
          </article>

          <article
            className="panel panel-support space-y-3"
            role="region"
            aria-label="Squad roster"
          >
            <h3 className="text-lg font-semibold">{TEAM_UI_LABELS.agents}</h3>
            {agents.length > 0 ? (
              <ul className="space-y-2">
                {agents.map((agent) => {
                  const removalBlockReason = getTeamMemberRemovalBlockReason(game, agent.id)

                  return (
                    <li
                      key={agent.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded border border-white/10 px-3 py-2"
                    >
                      <div>
                        <p className="font-medium">
                          <Link to={APP_ROUTES.agentDetail(agent.id)} className="hover:underline">
                            {agent.name}
                          </Link>
                        </p>
                        <p className="text-xs opacity-50">
                          {ROLE_LABELS[agent.role]} / Fatigue {agent.fatigue} / Tags{' '}
                          {agent.tags.length > 0 ? agent.tags.join(', ') : SHELL_UI_TEXT.none}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {team.leaderId === agent.id ? (
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs opacity-80">
                            Leader
                          </span>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost"
                          onClick={() => moveAgentBetweenTeams(agent.id, null)}
                          disabled={!managementState.editable || Boolean(removalBlockReason)}
                          title={removalBlockReason}
                        >
                          Send to reserve
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm opacity-50">No agents are assigned to this squad frame.</p>
            )}
          </article>
        </aside>
      </div>
    </section>
  )
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}

function buildCapabilitySummary(agents: Agent[]) {
  const stats = agents.reduce(
    (acc, agent) => ({
      combat: acc.combat + agent.baseStats.combat,
      investigation: acc.investigation + agent.baseStats.investigation,
      utility: acc.utility + agent.baseStats.utility,
      social: acc.social + agent.baseStats.social,
    }),
    { combat: 0, investigation: 0, utility: 0, social: 0 }
  )
  const tags = [...new Set(agents.flatMap((agent) => agent.tags))]
  const primaryRole = getPrimaryRole(agents)
  const roleCoverage = getCoverageRolesForAgents(agents)
  const averageFatigue =
    agents.length > 0
      ? Math.round(agents.reduce((sum, agent) => sum + agent.fatigue, 0) / agents.length)
      : 0

  return { stats, tags, primaryRole, roleCoverage, averageFatigue }
}

function getPrimaryRole(agents: Agent[]) {
  const counts = agents.reduce(
    (acc, agent) => {
      acc[agent.role] = (acc[agent.role] ?? 0) + 1
      return acc
    },
    {} as Record<AgentRole, number>
  )

  return (
    (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as AgentRole | undefined) ??
    agents[0]?.role ??
    'investigator'
  )
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function formatPerformanceSummary(summary?: PerformanceMetricSummary) {
  if (!summary) {
    return 'Performance summary unavailable.'
  }

  return `Contribution ${Math.round(summary.contribution)} / Threat ${Math.round(
    summary.threatHandled
  )} / Damage ${Math.round(summary.damageTaken)} / Healing ${Math.round(
    summary.healingPerformed
  )} / Evidence ${Math.round(summary.evidenceGathered)} / Containment ${Math.round(
    summary.containmentActionsCompleted
  )}`
}

function formatEquipmentSummary(
  summary?: ReturnType<typeof getTeamAssignableCaseViews>[number]['equipmentSummary']
) {
  if (!summary) {
    return 'Gear summary unavailable.'
  }

  return `Gear ${summary.loadout.equippedItemCount}/${summary.loadout.slotCount} slotted / Context ${summary.loadout.activeContextItemCount} / Reserve ${summary.reserveSupportBonus.toFixed(1)}`
}

function isAgent(agent: Agent | undefined): agent is Agent {
  return Boolean(agent)
}

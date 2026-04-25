import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { toSearchString } from '../../app/searchParams'
import { useGameStore } from '../../app/store/gameStore'
import { type AgentRole, type GameState } from '../../domain/models'
import { getTeamAssignedCaseId } from '../../domain/teamSimulation'
import {
  IconFieldRecon,
  IconHunter,
  IconInvestigator,
  IconMedic,
  IconMedium,
  IconNegotiator,
  IconOccultist,
  IconTech,
} from '../../components/icons'
import { FilterInput } from '../../components/FilterInput'
import { FilterSelect } from '../../components/FilterSelect'
import {
  AGENCY_LABELS,
  CASE_UI_LABELS,
  ROLE_COVERAGE_LABELS,
  ROLE_LABELS,
  TEAM_GUIDANCE,
  TEAM_UI_LABELS,
  TOOLTIPS,
} from '../../data/copy'
import {
  DEFAULT_TEAM_LIST_FILTERS,
  TEAM_ASSIGNMENT_FILTERS,
  TEAM_FATIGUE_FILTERS,
  TEAM_SORTS,
  type TeamAssignmentFilter,
  type TeamFatigueFilter,
  type TeamListFilters,
  type TeamListItemView,
  type TeamSort,
  getFilteredTeamViews,
  readTeamListFilters,
  writeTeamListFilters,
} from './teamView'
import {
  canUseTeamName,
  getTeamBuilderSummary,
  getTeamCreationSeedViews,
  getTeamManagementState,
} from './teamBuilderView'
import { getTeamAssignableCaseViews } from './teamInsights'

export default function TeamsPage() {
  const { game, assign, unassign, createTeam } = useGameStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const [newTeamName, setNewTeamName] = useState('')
  const [seedAgentId, setSeedAgentId] = useState('')
  const filters = readTeamListFilters(searchParams)
  const normalizedSearchParams = writeTeamListFilters(filters)
  const normalizedSearch = normalizedSearchParams.toString()
  const querySuffix = toSearchString(normalizedSearchParams)
  const teamViews = getFilteredTeamViews(game, filters)
  const totalTeams = Object.keys(game.teams).length
  const builderSummary = useMemo(() => getTeamBuilderSummary(game), [game])
  const seedViews = useMemo(() => getTeamCreationSeedViews(game), [game])
  const trimmedTeamName = newTeamName.trim()
  const selectedSeedAgentId = seedViews.some((view) => view.agent.id === seedAgentId)
    ? seedAgentId
    : (seedViews[0]?.agent.id ?? '')
  const canCreateTeam = Boolean(
    trimmedTeamName && selectedSeedAgentId && canUseTeamName(game, trimmedTeamName)
  )

  useEffect(() => {
    if (searchParams.toString() !== normalizedSearch) {
      setSearchParams(normalizedSearchParams, { replace: true })
    }
  }, [normalizedSearch, normalizedSearchParams, searchParams, setSearchParams])

  const updateFilters = (patch: Partial<TeamListFilters>) => {
    setSearchParams(writeTeamListFilters({ ...filters, ...patch }), { replace: true })
  }

  const hasActiveFilters =
    filters.q !== DEFAULT_TEAM_LIST_FILTERS.q ||
    filters.assignment !== DEFAULT_TEAM_LIST_FILTERS.assignment ||
    filters.fatigue !== DEFAULT_TEAM_LIST_FILTERS.fatigue ||
    filters.sort !== DEFAULT_TEAM_LIST_FILTERS.sort

  return (
    <section className="space-y-6">
      <nav className="skip-links" aria-label="Teams keyboard shortcuts">
        <a href="#teams-builder" className="skip-link">
          Skip to squad builder
        </a>
        <a href="#teams-filters" className="skip-link">
          Skip to team filters
        </a>
        <a href="#teams-results" className="skip-link">
          Skip to team results
        </a>
      </nav>

      <article id="teams-builder" className="panel panel-primary space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Squad builder</h2>
            <p className="text-sm opacity-60">
              Rebuild response units between deployments. New hires arrive in the reserve pool until
              you place them into an active squad.
            </p>
          </div>
          <Link to={APP_ROUTES.recruitment} className="btn btn-sm btn-ghost">
            Open recruitment
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Reserve agents" value={String(builderSummary.reserveAgents)} />
          <Metric label="Editable squads" value={String(builderSummary.editableTeams)} />
          <Metric label="Locked squads" value={String(builderSummary.deployedTeams)} />
          <Metric label="Movable agents" value={String(builderSummary.movableAgents)} />
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
          <label htmlFor="new-team-name" className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50">
              New squad name
            </span>
            <input
              id="new-team-name"
              className="form-input"
              placeholder="Archive Wardens"
              value={newTeamName}
              onChange={(event) => setNewTeamName(event.target.value)}
            />
          </label>

          <label htmlFor="team-seed-agent" className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50">
              Seed member
            </span>
            <select
              id="team-seed-agent"
              className="form-select"
              value={selectedSeedAgentId}
              onChange={(event) => setSeedAgentId(event.target.value)}
              disabled={seedViews.length === 0}
            >
              {seedViews.length === 0 ? (
                <option value="">No movable agents available</option>
              ) : (
                seedViews.map((view) => (
                  <option key={view.agent.id} value={view.agent.id}>
                    {view.label}
                  </option>
                ))
              )}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              className="btn btn-primary w-full"
              onClick={() => {
                if (!canCreateTeam) return
                createTeam(trimmedTeamName, selectedSeedAgentId)
                setNewTeamName('')
              }}
              disabled={!canCreateTeam}
            >
              Create squad
            </button>
          </div>
        </div>

        {!canCreateTeam && trimmedTeamName ? (
          <p className="text-xs uppercase tracking-[0.2em] text-amber-200/80">
            Squad names must be unique and non-empty.
          </p>
        ) : null}
      </article>

      <header
        id="teams-filters"
        className="panel panel-primary space-y-4 p-4"
        role="region"
        aria-label="Team filters"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Teams operations</h2>
            <p className="text-sm opacity-60">
              Search, sort, and inspect response units by assignment, fatigue, and squad posture.
            </p>
          </div>
          <p className="text-xs uppercase tracking-[0.24em] opacity-50">
            {teamViews.length} of {totalTeams}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FilterInput
            id="teams-search"
            label="Search"
            value={filters.q}
            onChange={(value) => updateFilters({ q: value })}
            placeholder="Search teams, tags, agents, or cases"
            containerClassName="space-y-2"
            labelClassName="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
            inputClassName="form-input"
          />
          <FilterSelect
            id="teams-assignment"
            label="Assignment"
            value={filters.assignment}
            onChange={(value) => updateFilters({ assignment: value as TeamAssignmentFilter })}
            options={TEAM_ASSIGNMENT_FILTERS.map((option) => ({
              value: option,
              label: ASSIGNMENT_FILTER_LABELS[option],
            }))}
            containerClassName="space-y-2"
            labelClassName="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
            selectClassName="form-select"
          />
          <FilterSelect
            id="teams-fatigue"
            label="Fatigue"
            value={filters.fatigue}
            onChange={(value) => updateFilters({ fatigue: value as TeamFatigueFilter })}
            options={TEAM_FATIGUE_FILTERS.map((option) => ({
              value: option,
              label: FATIGUE_FILTER_LABELS[option],
            }))}
            containerClassName="space-y-2"
            labelClassName="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
            selectClassName="form-select"
          />
          <FilterSelect
            id="teams-sort"
            label="Sort"
            value={filters.sort}
            onChange={(value) => updateFilters({ sort: value as TeamSort })}
            options={TEAM_SORTS.map((option) => ({ value: option, label: SORT_LABELS[option] }))}
            containerClassName="space-y-2"
            labelClassName="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
            selectClassName="form-select"
          />
        </div>

        {hasActiveFilters ? (
          <div className="flex justify-end">
            <button
              type="button"
              className="text-xs uppercase tracking-[0.24em] opacity-60 hover:opacity-100"
              onClick={() => updateFilters(DEFAULT_TEAM_LIST_FILTERS)}
            >
              Clear filters
            </button>
          </div>
        ) : null}
      </header>

      {teamViews.length > 0 ? (
        <ul id="teams-results" className="space-y-4" aria-label="Team results">
          {teamViews.map((view) => (
            <TeamCard
              key={view.team.id}
              view={view}
              game={game}
              querySuffix={querySuffix}
              assign={assign}
              unassign={unassign}
            />
          ))}
        </ul>
      ) : (
        <div
          id="teams-results"
          className="panel panel-support space-y-3 p-4"
          role="region"
          aria-label="No matching teams"
        >
          <p className="text-sm font-medium">No teams match these filters.</p>
          <p className="text-sm opacity-70">{TEAM_GUIDANCE.noTeamsFilteredSubtitle}</p>
          <p className="text-xs opacity-60">{TEAM_GUIDANCE.fatigueImpactHint}</p>
          <div className="flex flex-wrap items-center gap-2">
            {hasActiveFilters ? (
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={() => updateFilters(DEFAULT_TEAM_LIST_FILTERS)}
              >
                Clear filters
              </button>
            ) : null}
            <Link to={APP_ROUTES.recruitment} className="btn btn-xs btn-ghost">
              Open recruitment
            </Link>
            <Link to={APP_ROUTES.trainingDivision} className="btn btn-xs btn-ghost">
              Open training division
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}

function TeamCard({
  view,
  game,
  querySuffix,
  assign,
  unassign,
}: {
  view: TeamListItemView
  game: GameState
  querySuffix: string
  assign: (caseId: string, teamId: string) => void
  unassign: (caseId: string, teamId?: string) => void
}) {
  const assignedCase = view.assignedCase
  const assignedCaseId = getTeamAssignedCaseId(view.team)
  const satisfiableCases = getTeamAssignableCaseViews(view.team, game, 3)
  const managementState = getTeamManagementState(view.team, game)
  const leader = view.team.leaderId ? game.agents[view.team.leaderId] : undefined
  const derived = view.team.derivedStats
  const fatigueTone =
    view.fatigueBand === 'critical'
      ? 'danger'
      : view.fatigueBand === 'strained'
        ? 'warning'
        : 'neutral'

  return (
    <li className="panel space-y-4 border-l-4 border-l-slate-500/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={assignedCase ? 'success' : 'neutral'}>
              <span className="font-bold text-base tracking-wide">{assignedCase ? 'Assigned' : 'Unassigned'}</span>
            </Badge>
            <Badge tone={fatigueTone}>
              <span className="font-bold text-base tracking-wide">{TEAM_UI_LABELS.avgFatigue} {view.capabilitySummary.averageFatigue}</span>
            </Badge>
            <Badge tone={managementState.editable ? 'neutral' : 'warning'}>
              <span className="font-bold text-base tracking-wide">{view.team.status?.state ?? 'ready'}</span>
            </Badge>
            {view.fatigueBand !== 'steady' ? <Badge tone={fatigueTone}><span className="font-bold text-base tracking-wide">Overstretched</span></Badge> : null}
          </div>
          <p className="font-semibold">
            <Link
              to={`${APP_ROUTES.teamDetail(view.team.id)}${querySuffix}`}
              className="hover:underline focus-ring"
            >
              {AGENCY_LABELS.responseUnit} {view.team.name}
            </Link>
          </p>
          <p className="text-xs opacity-50">
            {CASE_UI_LABELS.tags}: {view.team.tags.join(', ') || 'None'}
          </p>
        </div>

        <div className="text-right text-xs uppercase tracking-[0.24em] opacity-50">
          <p>{view.capabilitySummary.agents.length} agents</p>
          <p>Strongest {view.capabilitySummary.strongestStat}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Leader" value={leader?.name ?? 'Auto-select'} />
        <Metric label="Overall" value={String(derived?.overall ?? 0)} />
        <Metric label="Readiness" value={String(derived?.readiness ?? 0)} />
        <Metric label="Chemistry" value={String(derived?.chemistryScore ?? 0)} />
      </div>

      {managementState.reason ? (
        <p className="rounded border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90">
          {managementState.reason}
        </p>
      ) : null}

      {managementState.warnings.length > 0 ? (
        <ul className="space-y-2">
          {managementState.warnings.slice(0, 2).map((warning) => (
            <li
              key={warning}
              className="rounded border border-white/10 px-3 py-2 text-sm opacity-80"
            >
              {warning}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="space-y-2 text-sm">
          <p className="opacity-70">
            Strongest capability:{' '}
            <span className="text-white/90">{view.capabilitySummary.strongestStat}</span>
          </p>
          <p className="opacity-70">
            Coverage tags:{' '}
            <span className="text-white/90">
              {view.capabilitySummary.coverageTags.join(', ') || 'None'}
            </span>
          </p>
          <p className="opacity-70">
            {TEAM_UI_LABELS.coreCoverage}:{' '}
            <span className="text-white/90">
              {view.capabilitySummary.roleCoverage
                .map((role) => ROLE_COVERAGE_LABELS[role])
                .join(', ') || 'None'}
            </span>
          </p>
          {view.capabilitySummary.nicheSummary?.summaryLines[0] ? (
            <p className="opacity-70">
              Niche fit:{' '}
              <span className="text-white/90">
                {view.capabilitySummary.nicheSummary.summaryLines[0]}
              </span>
            </p>
          ) : null}
        </div>

        <div className="space-y-2 text-sm">
          {assignedCase ? (
            <p>
              <span className="opacity-50">{CASE_UI_LABELS.assignedTo}: </span>
              <Link
                to={APP_ROUTES.caseDetail(assignedCase.id)}
                className="hover:underline focus-ring"
              >
                {assignedCase.title}
              </Link>
            </p>
          ) : (
            <p className="opacity-40">{CASE_UI_LABELS.unassigned}</p>
          )}
          <Link
            to={`${APP_ROUTES.teamDetail(view.team.id)}${querySuffix}`}
            className="btn btn-xs btn-ghost"
          >
            Manage squad
          </Link>
        </div>
      </div>

      <div className="space-y-2 border-t border-white/10 pt-3">
        <p className="text-xs uppercase tracking-wide opacity-50">
          Active cases this unit can satisfy now
        </p>
        {satisfiableCases.length > 0 ? (
          <ul className="space-y-2">
            {satisfiableCases.map(({ currentCase, success, partial, fail }) => (
              <li
                key={currentCase.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded border border-white/10 px-3 py-2"
              >
                <div>
                  <p className="font-medium">{currentCase.title}</p>
                  <p className="text-xs opacity-50">
                    S {Math.round(success * 100)}% / P {Math.round(partial * 100)}% / F{' '}
                    {Math.round(fail * 100)}%
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {assignedCaseId !== currentCase.id ? (
                    <button
                      onClick={() => assign(currentCase.id, view.team.id)}
                      className="btn btn-xs"
                      aria-label={`Assign ${view.team.name} to ${currentCase.title}`}
                    >
                      Assign
                    </button>
                  ) : (
                    <button
                      onClick={() => unassign(currentCase.id, view.team.id)}
                      className="btn btn-xs btn-ghost"
                      aria-label={`Unassign ${view.team.name} from ${currentCase.title}`}
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
      </div>

      <ul className="space-y-1 border-t border-white/10 pt-3">
        {view.capabilitySummary.agents.map((agent) => (
          <li key={agent.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="font-medium">{agent.name}</span>
            <span
              className="inline-flex flex-wrap items-center gap-1 opacity-60"
              title={TOOLTIPS['agent.role']}
            >
              <RoleIcon role={agent.role} className="h-3.5 w-3.5" />
              {ROLE_LABELS[agent.role]} / Fatigue {agent.fatigue} / Tags{' '}
              {agent.tags.join(', ') || 'None'}
            </span>
          </li>
        ))}
      </ul>
    </li>
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

function Badge({
  tone,
  children,
}: {
  tone: 'neutral' | 'success' | 'warning' | 'danger'
  children: ReactNode
}) {
  const toneClassName =
    tone === 'success'
      ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
      : tone === 'warning'
        ? 'border-amber-400/30 bg-amber-500/10 text-amber-100'
        : tone === 'danger'
          ? 'border-rose-400/30 bg-rose-500/10 text-rose-100'
          : 'border-white/10 bg-white/5 text-white/80'

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.24em] ${toneClassName}`}
    >
      {children}
    </span>
  )
}

function RoleIcon({ role, className }: { role: AgentRole; className?: string }) {
  const iconByRole = {
    hunter: IconHunter,
    occultist: IconOccultist,
    investigator: IconInvestigator,
    field_recon: IconFieldRecon,
    medium: IconMedium,
    tech: IconTech,
    medic: IconMedic,
    negotiator: IconNegotiator,
  } as const

  const Icon = iconByRole[role]
  return <Icon className={className} aria-hidden="true" />
}

const ASSIGNMENT_FILTER_LABELS: Record<TeamAssignmentFilter, string> = {
  all: 'All assignments',
  assigned: 'Assigned only',
  unassigned: 'Unassigned only',
}

const FATIGUE_FILTER_LABELS: Record<TeamFatigueFilter, string> = {
  all: 'All fatigue levels',
  steady: 'Steady',
  strained: 'Strained',
  critical: 'Critical',
}

const SORT_LABELS: Record<TeamSort, string> = {
  fatigue: 'Fatigue',
  assignment: 'Assignment',
  coverage: 'Coverage',
  name: 'Name',
}

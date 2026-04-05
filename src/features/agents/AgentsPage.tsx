import React from 'react'
import { Link, useSearchParams } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { readEnumParam, toSearchString, writeEnumParam } from '../../app/searchParams'
import { useGameStore } from '../../app/store/gameStore'
import { FilterInput } from '../../components/FilterInput'
import { FilterSelect } from '../../components/FilterSelect'
import { AGENTS_GUIDANCE, EMPTY_STATES, ROLE_LABELS, SHELL_UI_TEXT } from '../../data/copy'
import { AgentEntityPanel } from './AgentEntityPanel'
import { AGENT_DETAIL_TABS, DEFAULT_AGENT_DETAIL_TAB, type TabType } from './agentTabsModel'
import {
  AGENT_FATIGUE_FILTERS,
  AGENT_STATUS_FILTERS,
  AGENT_TRAINING_FILTERS,
  DEFAULT_AGENT_LIST_FILTERS,
  type AgentFatigueFilter,
  type AgentListFilters,
  type AgentRoleFilter,
  type AgentStatusFilter,
  type AgentTrainingFilter,
  getFilteredAgentViews,
  getRoleFilterOptions,
  readAgentListFilters,
  writeAgentListFilters,
} from './agentListView'
import { getAgentViews } from './agentView'

const AGENT_TAB_STORAGE_KEY = 'agentTab'

function getStoredAgentTab(agentId: string): TabType | null {
  try {
    const stored = localStorage.getItem(`${AGENT_TAB_STORAGE_KEY}-${agentId}`)
    return stored && AGENT_DETAIL_TABS.includes(stored as TabType) ? (stored as TabType) : null
  } catch {
    return null
  }
}

function setStoredAgentTab(agentId: string, tab: TabType) {
  try {
    localStorage.setItem(`${AGENT_TAB_STORAGE_KEY}-${agentId}`, tab)
  } catch {
    // Ignore storage errors
  }
}

export default function AgentsPage() {
  const { game } = useGameStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedAgentId, setSelectedAgentId] = React.useState<string | null>(null)
  const [selectedAgentTab, setSelectedAgentTab] = React.useState<TabType>(DEFAULT_AGENT_DETAIL_TAB)
  const filters = readAgentListFilters(game, searchParams)
  const urlTab = readEnumParam(searchParams, 'tab', AGENT_DETAIL_TABS, DEFAULT_AGENT_DETAIL_TAB)
  const effectiveActiveTab = selectedAgentId ? selectedAgentTab : urlTab

  const querySuffix = (() => {
    const params = writeAgentListFilters(filters)
    writeEnumParam(params, 'tab', effectiveActiveTab, DEFAULT_AGENT_DETAIL_TAB)
    return toSearchString(params)
  })()

  const buildNextSearchParams = (nextFilters: AgentListFilters, nextTab: TabType) => {
    const nextSearchParams = writeAgentListFilters(nextFilters, searchParams)

    writeEnumParam(nextSearchParams, 'tab', nextTab, DEFAULT_AGENT_DETAIL_TAB)

    return nextSearchParams
  }

  const updateFilters = (patch: Partial<AgentListFilters>) => {
    setSearchParams(buildNextSearchParams({ ...filters, ...patch }, effectiveActiveTab), {
      replace: true,
    })
  }

  const updateActiveTab = (nextTab: TabType) => {
    if (selectedAgentId) {
      setSelectedAgentTab(nextTab)
      setStoredAgentTab(selectedAgentId, nextTab)
    }
    setSearchParams(buildNextSearchParams(filters, nextTab), { replace: true })
  }

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId)
    const storedTab = getStoredAgentTab(agentId) ?? DEFAULT_AGENT_DETAIL_TAB
    setSelectedAgentTab(storedTab)
    setSearchParams(buildNextSearchParams(filters, storedTab), {
      replace: true,
    })
  }

  const hasActiveFilters =
    filters.q !== DEFAULT_AGENT_LIST_FILTERS.q ||
    filters.role !== DEFAULT_AGENT_LIST_FILTERS.role ||
    filters.status !== DEFAULT_AGENT_LIST_FILTERS.status ||
    filters.team !== DEFAULT_AGENT_LIST_FILTERS.team ||
    filters.fatigue !== DEFAULT_AGENT_LIST_FILTERS.fatigue ||
    filters.training !== DEFAULT_AGENT_LIST_FILTERS.training

  const teams = React.useMemo(
    () => Object.values(game.teams).sort((left, right) => left.name.localeCompare(right.name)),
    [game.teams]
  )

  const agentViews = React.useMemo(() => getAgentViews(game), [game])

  const metrics = React.useMemo(() => {
    const total = agentViews.length
    const deployed = agentViews.filter((view) => view.agent.assignment?.state === 'assigned').length
    const training = agentViews.filter((view) => view.trainingEntry !== undefined).length
    const unavailable = agentViews.filter((view) => view.agent.status !== 'active').length

    return { total, deployed, training, unavailable }
  }, [agentViews])

  const visibleViews = getFilteredAgentViews(game, filters)
  const selectedView = selectedAgentId
    ? (visibleViews.find((view) => view.agent.id === selectedAgentId) ??
      agentViews.find((view) => view.agent.id === selectedAgentId) ??
      visibleViews[0])
    : (visibleViews[0] ?? agentViews[0])
  const selectedOutsideFilters = Boolean(
    selectedView &&
    selectedAgentId &&
    !visibleViews.some((view) => view.agent.id === selectedView.agent.id)
  )

  const roleOptions = React.useMemo(() => getRoleFilterOptions(game), [game])

  return (
    <section className="space-y-4">
      <article className="panel space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{AGENTS_GUIDANCE.pageHeading}</h2>
            <p className="text-sm opacity-60">{AGENTS_GUIDANCE.pageSubtitle}</p>
          </div>
          <Link to={APP_ROUTES.registry} className="text-sm opacity-60 hover:opacity-100">
            {AGENTS_GUIDANCE.openRegistryLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ShellMetric label={AGENTS_GUIDANCE.metricTotalRoster} value={String(metrics.total)} />
          <ShellMetric label={AGENTS_GUIDANCE.metricDeployed} value={String(metrics.deployed)} />
          <ShellMetric label={AGENTS_GUIDANCE.metricTraining} value={String(metrics.training)} />
          <ShellMetric
            label={AGENTS_GUIDANCE.metricUnavailable}
            value={String(metrics.unavailable)}
          />
        </div>
      </article>

      <article className="panel space-y-3">
        <div className="space-y-2 rounded border border-slate-400/20 bg-slate-500/5 p-3">
          <p className="text-xs font-semibold uppercase opacity-60">
            {AGENTS_GUIDANCE.statusGuideHeading}
          </p>
          <ul className="text-xs opacity-70 space-y-1 list-disc list-inside">
            <li>
              <strong>Deployed:</strong> {AGENTS_GUIDANCE.deployedStatus}
            </li>
            <li>
              <strong>Training:</strong> {AGENTS_GUIDANCE.trainingStatus}
            </li>
            <li>
              <strong>Unavailable:</strong> {AGENTS_GUIDANCE.unavailableStatus}
            </li>
          </ul>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">{AGENTS_GUIDANCE.currentRosterHeading}</h3>
            <p className="text-sm opacity-60">{AGENTS_GUIDANCE.rosterSubtitle}</p>
          </div>
          <p className="text-xs uppercase tracking-[0.24em] opacity-50">
            {visibleViews.length} shown / {metrics.total} total
          </p>
        </div>

        <div
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-6"
          role="region"
          aria-label="Agent filters"
        >
          <FilterInput
            id="agents-search"
            label="Search"
            value={filters.q}
            onChange={(value) => updateFilters({ q: value })}
            placeholder="Search agents, teams, traits, or assignments"
          />

          <FilterSelect
            id="agents-role"
            label={AGENTS_GUIDANCE.filterRoleLabel}
            value={filters.role}
            onChange={(value) => updateFilters({ role: value as AgentRoleFilter })}
          >
            <option value="all">{AGENTS_GUIDANCE.allRolesLabel}</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role as keyof typeof ROLE_LABELS]}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            id="agents-status"
            label={AGENTS_GUIDANCE.filterStatusLabel}
            value={filters.status}
            onChange={(value) => updateFilters({ status: value as AgentStatusFilter })}
          >
            {AGENT_STATUS_FILTERS.map((option) => (
              <option key={option} value={option}>
                {STATUS_LABELS[option]}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            id="agents-team"
            label={AGENTS_GUIDANCE.filterTeamLabel}
            value={filters.team}
            onChange={(value) => updateFilters({ team: value })}
          >
            <option value="all">{AGENTS_GUIDANCE.allTeamsLabel}</option>
            <option value="unassigned">{AGENTS_GUIDANCE.reservePoolLabel}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {AGENTS_GUIDANCE.responseUnitPrefix} {team.name}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            id="agents-fatigue"
            label={AGENTS_GUIDANCE.filterFatigueLabel}
            value={filters.fatigue}
            onChange={(value) => updateFilters({ fatigue: value as AgentFatigueFilter })}
          >
            {AGENT_FATIGUE_FILTERS.map((option) => (
              <option key={option} value={option}>
                {FATIGUE_LABELS[option]}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            id="agents-training"
            label={AGENTS_GUIDANCE.filterTrainingStateLabel}
            value={filters.training}
            onChange={(value) => updateFilters({ training: value as AgentTrainingFilter })}
          >
            {AGENT_TRAINING_FILTERS.map((option) => (
              <option key={option} value={option}>
                {TRAINING_LABELS[option]}
              </option>
            ))}
          </FilterSelect>
        </div>

        {hasActiveFilters ? (
          <div className="flex justify-end">
            <button
              type="button"
              className="text-xs uppercase tracking-[0.24em] opacity-60 hover:opacity-100"
              onClick={() => updateFilters(DEFAULT_AGENT_LIST_FILTERS)}
            >
              Clear filters
            </button>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(18rem,24rem)_1fr]">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {AGENTS_GUIDANCE.operativeRosterLabel}
            </p>
            <ul className="space-y-2">
              {visibleViews.length > 0 ? (
                visibleViews.map((view) => {
                  const { agent, assignmentLabel, capability, trainingEntry, team, materialized } =
                    view
                  const selected = selectedView?.agent.id === agent.id

                  return (
                    <li key={agent.id}>
                      <button
                        type="button"
                        className={`w-full rounded border px-3 py-3 text-left transition ${
                          selected
                            ? 'border-slate-200/40 bg-slate-200/10'
                            : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                        }`}
                        onClick={() => {
                          handleSelectAgent(agent.id)
                        }}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{agent.name}</p>
                            <p className="text-sm opacity-60">{ROLE_LABELS[agent.role]}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
                              {agent.status}
                            </p>
                            <p className="text-xs opacity-60">
                              {materialized.identity.codename ??
                                materialized.identity.callsign ??
                                capability.fatigueBand}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 space-y-1 text-sm opacity-70">
                          <p>
                            {AGENTS_GUIDANCE.assignmentLabel}: {assignmentLabel}
                          </p>
                          <p>
                            {AGENTS_GUIDANCE.teamLabel}:{' '}
                            {team
                              ? `${AGENTS_GUIDANCE.responseUnitPrefix} ${team.name}`
                              : AGENTS_GUIDANCE.reservePoolLabel}
                          </p>
                          <p>
                            {AGENTS_GUIDANCE.scoreLabel} {capability.score} /{' '}
                            {AGENTS_GUIDANCE.fatigueLabel} {agent.fatigue} /{' '}
                            {AGENTS_GUIDANCE.trainingLabel}{' '}
                            {trainingEntry ? trainingEntry.trainingName : SHELL_UI_TEXT.none}
                          </p>
                          <p>
                            Readiness {formatCompactLabel(materialized.service.readinessBand)} /{' '}
                            {materialized.service.deploymentEligible ? 'Deployable' : 'Held back'} /
                            Top domain {formatCompactLabel(capability.topDomain)}
                          </p>
                        </div>
                      </button>
                    </li>
                  )
                })
              ) : (
                <li className="rounded border border-white/10 px-3 py-3 text-sm opacity-60">
                  {EMPTY_STATES.noAgentsMatch}
                </li>
              )}
            </ul>
          </div>

          <div>
            {selectedOutsideFilters && selectedView ? (
              <p className="mb-3 rounded border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90">
                Selected operative is outside the current filter set. Adjust filters to return them
                to the roster list.
              </p>
            ) : null}
            {selectedView ? (
              <AgentEntityPanel
                view={selectedView}
                activeTab={effectiveActiveTab}
                onTabChange={updateActiveTab}
                headerActions={
                  <>
                    <Link to={selectedView.squadBuilderLink} className="btn btn-sm btn-ghost">
                      {selectedView.squadBuilderLabel}
                    </Link>
                    <Link
                      to={`${APP_ROUTES.agentDetail(selectedView.agent.id)}${querySuffix}`}
                      className="btn btn-sm btn-ghost"
                    >
                      Open route view
                    </Link>
                  </>
                }
              />
            ) : (
              <article className="panel text-sm opacity-60">{EMPTY_STATES.noAgentsMatch}</article>
            )}
          </div>
        </div>
      </article>
    </section>
  )
}

function formatCompactLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function ShellMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}

const STATUS_LABELS: Record<(typeof AGENT_STATUS_FILTERS)[number], string> = {
  all: AGENTS_GUIDANCE.allStatusesLabel,
  active: AGENTS_GUIDANCE.activeLabel,
  injured: AGENTS_GUIDANCE.injuredLabel,
  recovering: AGENTS_GUIDANCE.recoveringLabel,
  dead: AGENTS_GUIDANCE.deadLabel,
}

const FATIGUE_LABELS: Record<(typeof AGENT_FATIGUE_FILTERS)[number], string> = {
  all: AGENTS_GUIDANCE.allBandsLabel,
  steady: AGENTS_GUIDANCE.steadyLabel,
  strained: AGENTS_GUIDANCE.strainedLabel,
  critical: AGENTS_GUIDANCE.criticalLabel,
}

const TRAINING_LABELS: Record<(typeof AGENT_TRAINING_FILTERS)[number], string> = {
  all: AGENTS_GUIDANCE.allTrainingStatesLabel,
  training: AGENTS_GUIDANCE.trainingStatus,
  available: AGENTS_GUIDANCE.notTrainingLabel,
}

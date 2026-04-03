import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useGameStore } from '../../app/store/gameStore'
import { getNonFieldStaff } from '../../app/services/divisionMetrics'
import { FilterInput } from '../../components/FilterInput'
import { FilterSelect } from '../../components/FilterSelect'
import { EMPTY_STATES, REGISTRY_UI_TEXT, ROLE_LABELS } from '../../data/copy'
import {
  DEFAULT_REGISTRY_LIST_FILTERS,
  REGISTRY_FATIGUE_FILTERS,
  REGISTRY_ROLE_FILTERS,
  REGISTRY_SORT_OPTIONS,
  REGISTRY_STATUS_FILTERS,
  type RegistryFatigueFilter,
  type RegistrySortOption,
  type RegistryStatusFilter,
  getFilteredRegistryAgentViews,
  readRegistryListFilters,
  writeRegistryListFilters,
} from './registryListView'
import RegistryAgentItem from './RegistryAgentItem'

const REGISTRY_PAGE_SIZE = 25

export default function RegistryPage() {
  const { game } = useGameStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readRegistryListFilters(game, searchParams)
  const normalizedSearchParams = writeRegistryListFilters(filters, searchParams)
  const normalizedSearch = normalizedSearchParams.toString()

  useEffect(() => {
    if (searchParams.toString() !== normalizedSearch) {
      setSearchParams(normalizedSearchParams, { replace: true })
    }
  }, [normalizedSearch, normalizedSearchParams, searchParams, setSearchParams])

  const updateFilters = (patch: Partial<typeof filters>) => {
    setSearchParams(writeRegistryListFilters({ ...filters, ...patch, page: 1 }, searchParams), {
      replace: true,
    })
  }

  const updatePage = (page: number) => {
    setSearchParams(writeRegistryListFilters({ ...filters, page }, searchParams), {
      replace: true,
    })
  }

  const hasActiveFilters =
    filters.q !== DEFAULT_REGISTRY_LIST_FILTERS.q ||
    filters.role !== DEFAULT_REGISTRY_LIST_FILTERS.role ||
    filters.status !== DEFAULT_REGISTRY_LIST_FILTERS.status ||
    filters.team !== DEFAULT_REGISTRY_LIST_FILTERS.team ||
    filters.fatigue !== DEFAULT_REGISTRY_LIST_FILTERS.fatigue ||
    filters.sort !== DEFAULT_REGISTRY_LIST_FILTERS.sort

  const agentViews = useMemo(() => getFilteredRegistryAgentViews(game, filters), [filters, game])
  const totalPages = Math.max(1, Math.ceil(agentViews.length / REGISTRY_PAGE_SIZE))
  const currentPage = Math.min(filters.page, totalPages)
  const pageJumpTargets = getPageJumpTargets(currentPage, totalPages)
  const pageStartIndex = (currentPage - 1) * REGISTRY_PAGE_SIZE
  const pagedAgentViews = agentViews.slice(pageStartIndex, pageStartIndex + REGISTRY_PAGE_SIZE)
  const allAgentsCount = Object.keys(game.agents).length
  const teams = useMemo(
    () => Object.values(game.teams).sort((left, right) => left.name.localeCompare(right.name)),
    [game.teams]
  )

  const reserveStaff = getNonFieldStaff(game)

  useEffect(() => {
    if (filters.page !== currentPage) {
      setSearchParams(writeRegistryListFilters({ ...filters, page: currentPage }, searchParams), {
        replace: true,
      })
    }
  }, [currentPage, filters, searchParams, setSearchParams])

  return (
    <section className="space-y-4">
      <article className="panel space-y-3" role="region" aria-label="Personnel registry filters">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{REGISTRY_UI_TEXT.pageHeading}</h2>
            <p className="text-sm opacity-60">{REGISTRY_UI_TEXT.pageSubtitle}</p>
          </div>
          <p className="text-xs uppercase tracking-[0.24em] opacity-50">
            {REGISTRY_UI_TEXT.reserveStaffLabel}: {reserveStaff.length}
          </p>
        </div>

        <p className="text-xs uppercase tracking-[0.24em] opacity-50" aria-live="polite">
          {agentViews.length} {REGISTRY_UI_TEXT.shownLabel} / {allAgentsCount} {REGISTRY_UI_TEXT.totalLabel}
        </p>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <FilterInput
            id="registry-search"
            label={REGISTRY_UI_TEXT.searchLabel}
            value={filters.q}
            onChange={(value) => updateFilters({ q: value })}
            ariaControls="registry-results"
            placeholder={REGISTRY_UI_TEXT.searchPlaceholder}
            containerClassName="space-y-2"
            labelClassName="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
            inputClassName="form-input"
          />

          <FilterSelect
            id="registry-role"
            label={REGISTRY_UI_TEXT.filterRoleLabel}
            value={filters.role}
            onChange={(value) => updateFilters({ role: value as typeof filters.role })}
          >
            <option value="all">{REGISTRY_UI_TEXT.allRolesLabel}</option>
            {REGISTRY_ROLE_FILTERS.filter((role) => role !== 'all').map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            id="registry-status"
            label={REGISTRY_UI_TEXT.filterStatusLabel}
            value={filters.status}
            onChange={(value) => updateFilters({ status: value as RegistryStatusFilter })}
          >
            {REGISTRY_STATUS_FILTERS.map((option) => (
              <option key={option} value={option}>
                {STATUS_LABELS[option]}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            id="registry-team"
            label={REGISTRY_UI_TEXT.filterTeamLabel}
            value={filters.team}
            onChange={(value) => updateFilters({ team: value })}
          >
            <option value="all">{REGISTRY_UI_TEXT.allTeamsLabel}</option>
            <option value="unassigned">{REGISTRY_UI_TEXT.reserveOnlyLabel}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            id="registry-fatigue"
            label={REGISTRY_UI_TEXT.filterFatigueLabel}
            value={filters.fatigue}
            onChange={(value) => updateFilters({ fatigue: value as RegistryFatigueFilter })}
          >
            {REGISTRY_FATIGUE_FILTERS.map((option) => (
              <option key={option} value={option}>
                {FATIGUE_LABELS[option]}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            id="registry-sort"
            label={REGISTRY_UI_TEXT.sortLabel}
            value={filters.sort}
            onChange={(value) => updateFilters({ sort: value as RegistrySortOption })}
          >
            {REGISTRY_SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {SORT_LABELS[option]}
              </option>
            ))}
          </FilterSelect>
        </div>

        {hasActiveFilters ? (
          <div className="flex justify-end">
            <button
              type="button"
              className="text-xs uppercase tracking-[0.24em] opacity-60 hover:opacity-100"
              onClick={() =>
                setSearchParams(writeRegistryListFilters(DEFAULT_REGISTRY_LIST_FILTERS, searchParams), {
                  replace: true,
                })
              }
            >
              {REGISTRY_UI_TEXT.clearFiltersLabel}
            </button>
          </div>
        ) : null}
      </article>

      {totalPages > 1 ? (
        <nav
          className="panel panel-support flex flex-wrap items-center justify-between gap-3"
          aria-label="Registry pagination"
        >
          <p className="text-xs uppercase tracking-[0.24em] opacity-60">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => updatePage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              aria-label="Go to previous registry page"
            >
              Previous
            </button>

            {pageJumpTargets.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={
                  pageNumber === currentPage ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-ghost'
                }
                onClick={() => updatePage(pageNumber)}
                disabled={pageNumber === currentPage}
                aria-label={`Go to registry page ${pageNumber}`}
                aria-current={pageNumber === currentPage ? 'page' : undefined}
              >
                {pageNumber}
              </button>
            ))}

            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => updatePage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              aria-label="Go to next registry page"
            >
              Next
            </button>
          </div>
        </nav>
      ) : null}

      <ul id="registry-results" className="space-y-3">
        {agentViews.length === 0 ? (
          <li className="panel text-sm opacity-60" aria-live="polite">
            {EMPTY_STATES.noRegistryMatches}
          </li>
        ) : (
          pagedAgentViews.map((view) => {
            const { agent, teamName } = view
            const operationalStatus =
              agent.assignment?.state === 'training'
                ? REGISTRY_UI_TEXT.trainingStatus
                : teamName
                  ? REGISTRY_UI_TEXT.fieldTeamStatus
                  : REGISTRY_UI_TEXT.reserveStatus

            return (
              <RegistryAgentItem
                key={agent.id}
                agent={agent}
                teamName={teamName}
                operationalStatus={operationalStatus}
              />
            )
          })
        )}
      </ul>
    </section>
  )
}

const STATUS_LABELS: Record<(typeof REGISTRY_STATUS_FILTERS)[number], string> = {
  all: REGISTRY_UI_TEXT.allStatusesLabel,
  active: REGISTRY_UI_TEXT.activeLabel,
  injured: REGISTRY_UI_TEXT.injuredLabel,
  recovering: REGISTRY_UI_TEXT.recoveringLabel,
  dead: REGISTRY_UI_TEXT.deadLabel,
}

const FATIGUE_LABELS: Record<(typeof REGISTRY_FATIGUE_FILTERS)[number], string> = {
  all: REGISTRY_UI_TEXT.allFatigueBandsLabel,
  steady: REGISTRY_UI_TEXT.steadyLabel,
  strained: REGISTRY_UI_TEXT.strainedLabel,
  critical: REGISTRY_UI_TEXT.criticalLabel,
}

const SORT_LABELS: Record<(typeof REGISTRY_SORT_OPTIONS)[number], string> = {
  'name-asc': REGISTRY_UI_TEXT.sortByNameLabel,
  'fatigue-desc': REGISTRY_UI_TEXT.sortByFatigueLabel,
  status: REGISTRY_UI_TEXT.sortByStatusLabel,
  team: REGISTRY_UI_TEXT.sortByTeamLabel,
}

function getPageJumpTargets(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, start + 4)
  const adjustedStart = Math.max(1, end - 4)

  return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index)
}

import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useGameStore } from '../../app/store/gameStore'
import { FilterInput } from '../../components/FilterInput'
import { FilterSelect } from '../../components/FilterSelect'
import { DASHBOARD_SECTIONS, EMPTY_STATES, EVENT_FEED_TEXT } from '../../data/copy'
import {
  EVENT_CATEGORY_LABELS,
  EVENT_SOURCE_LABELS,
  EVENT_TYPE_LABELS,
  getAvailableEventCategories,
  getAvailableEventSources,
  getAvailableEventTypes,
  getFilteredEventFeedViews,
  readEventFeedFilters,
  writeEventFeedFilters,
  type EventFeedTone,
} from './eventFeedView'

export function EventFeedPanel() {
  const { game } = useGameStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const advancedFiltersPanelId = 'operations-feed-advanced-filters'
  const filters = readEventFeedFilters(searchParams)
  const normalizedSearchParams = writeEventFeedFilters(filters)
  const normalizedSearch = normalizedSearchParams.toString()
  const views = getFilteredEventFeedViews(game, filters)
  const categoryOptions = getAvailableEventCategories(game.events)
  const sourceOptions = getAvailableEventSources(game.events)
  const typeOptions = getAvailableEventTypes(game.events)

  useEffect(() => {
    if (searchParams.toString() !== normalizedSearch) {
      setSearchParams(normalizedSearchParams, { replace: true })
    }
  }, [normalizedSearch, normalizedSearchParams, searchParams, setSearchParams])

  const updateFilters = (patch: Partial<typeof filters>) => {
    setSearchParams(writeEventFeedFilters({ ...filters, ...patch }), { replace: true })
  }

  const hasActiveFilters =
    filters.query.trim().length > 0 ||
    filters.category !== 'all' ||
    filters.sourceSystem !== 'all' ||
    filters.type !== 'all' ||
    filters.relationshipVerbosity !== 'summary' ||
    filters.weekMin !== undefined ||
    filters.weekMax !== undefined ||
    (filters.entityId?.trim().length ?? 0) > 0

  const hasAdvancedFiltersActive =
    filters.relationshipVerbosity !== 'summary' ||
    filters.weekMin !== undefined ||
    filters.weekMax !== undefined ||
    (filters.entityId?.trim().length ?? 0) > 0
  const activeFilterChips = getActiveFilterChips(filters)
  const isAdvancedFiltersVisible = showAdvancedFilters || hasAdvancedFiltersActive

  const resetFilters = () => {
    setSearchParams(writeEventFeedFilters(readEventFeedFilters(new URLSearchParams())), {
      replace: true,
    })
  }

  const resetAdvancedFilters = () => {
    setSearchParams(
      writeEventFeedFilters({
        ...filters,
        relationshipVerbosity: 'summary',
        weekMin: undefined,
        weekMax: undefined,
        entityId: '',
      }),
      { replace: true }
    )
  }

  return (
    <section className="panel space-y-4" aria-label="Operations feed">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{DASHBOARD_SECTIONS.operationsFeed}</h2>
        <p className="text-sm opacity-60">{EVENT_FEED_TEXT.subtitle}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <FilterInput
          id="operations-feed-search"
          label={EVENT_FEED_TEXT.searchLabel}
          type="search"
          placeholder={EVENT_FEED_TEXT.searchPlaceholder}
          value={filters.query}
          onChange={(query) => updateFilters({ query })}
        />

        <FilterSelect
          id="operations-feed-category"
          label={EVENT_FEED_TEXT.categoryLabel}
          value={filters.category}
          onChange={(category) => updateFilters({ category: category as typeof filters.category })}
        >
          <option value="all">{EVENT_FEED_TEXT.allCategories}</option>
          {categoryOptions.map((category) => (
            <option key={category} value={category}>
              {EVENT_CATEGORY_LABELS[category]}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          id="operations-feed-source"
          label={EVENT_FEED_TEXT.sourceLabel}
          value={filters.sourceSystem}
          onChange={(sourceSystem) =>
            updateFilters({ sourceSystem: sourceSystem as typeof filters.sourceSystem })
          }
        >
          <option value="all">{EVENT_FEED_TEXT.allSources}</option>
          {sourceOptions.map((sourceSystem) => (
            <option key={sourceSystem} value={sourceSystem}>
              {EVENT_SOURCE_LABELS[sourceSystem]}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          id="operations-feed-type"
          label={EVENT_FEED_TEXT.typeLabel}
          value={filters.type}
          onChange={(type) => updateFilters({ type: type as typeof filters.type })}
        >
          <option value="all">{EVENT_FEED_TEXT.allTypes}</option>
          {typeOptions.map((type) => (
            <option key={type} value={type}>
              {EVENT_TYPE_LABELS[type]}
            </option>
          ))}
        </FilterSelect>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {isAdvancedFiltersVisible ? (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            aria-label="Hide advanced filters"
            aria-expanded="true"
            aria-controls={advancedFiltersPanelId}
            onClick={() => setShowAdvancedFilters(false)}
          >
            Hide advanced filters
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            aria-label="Show advanced filters"
            aria-expanded="false"
            aria-controls={advancedFiltersPanelId}
            onClick={() => setShowAdvancedFilters(true)}
          >
            Show advanced filters
          </button>
        )}
        <p className="text-xs opacity-50">Week range, entity ID, and relationship verbosity</p>
      </div>

      {isAdvancedFiltersVisible ? (
        <div id={advancedFiltersPanelId} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FilterSelect
            id="operations-feed-relationship-verbosity"
            label={EVENT_FEED_TEXT.relationshipVerbosityLabel}
            value={filters.relationshipVerbosity}
            onChange={(relationshipVerbosity) =>
              updateFilters({
                relationshipVerbosity:
                  relationshipVerbosity as typeof filters.relationshipVerbosity,
              })
            }
          >
            <option value="summary">{EVENT_FEED_TEXT.relationshipSummaryMode}</option>
            <option value="all">{EVENT_FEED_TEXT.relationshipAllMode}</option>
          </FilterSelect>

          <div className="space-y-2">
            <label
              htmlFor="operations-feed-week-min"
              className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
            >
              {EVENT_FEED_TEXT.weekMinLabel}
            </label>
            <input
              id="operations-feed-week-min"
              type="number"
              min={1}
              className="form-input"
              value={filters.weekMin ?? ''}
              onChange={(event) =>
                updateFilters({
                  weekMin: event.target.value === '' ? undefined : Number(event.target.value),
                })
              }
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="operations-feed-week-max"
              className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
            >
              {EVENT_FEED_TEXT.weekMaxLabel}
            </label>
            <input
              id="operations-feed-week-max"
              type="number"
              min={1}
              className="form-input"
              value={filters.weekMax ?? ''}
              onChange={(event) =>
                updateFilters({
                  weekMax: event.target.value === '' ? undefined : Number(event.target.value),
                })
              }
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="operations-feed-entity-id"
              className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
            >
              {EVENT_FEED_TEXT.entityIdLabel}
            </label>
            <input
              id="operations-feed-entity-id"
              type="search"
              className="form-input"
              placeholder={EVENT_FEED_TEXT.entityIdPlaceholder}
              value={filters.entityId ?? ''}
              onChange={(event) => updateFilters({ entityId: event.target.value })}
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm opacity-60">
          {EVENT_FEED_TEXT.showingResults
            .replace('{count}', String(views.length))
            .replace('{total}', String(game.events.length))}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {hasAdvancedFiltersActive ? (
            <button type="button" className="btn btn-sm btn-ghost" onClick={resetAdvancedFilters}>
              Reset advanced
            </button>
          ) : null}
          {hasActiveFilters ? (
            <button type="button" className="btn btn-sm btn-ghost" onClick={resetFilters}>
              Reset filters
            </button>
          ) : null}
        </div>
      </div>

      {activeFilterChips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2" aria-label="Active feed filters">
          {activeFilterChips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs opacity-80"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}

      {game.events.length === 0 ? (
        <p className="rounded border border-dashed border-white/15 bg-white/2 px-3 py-3 text-sm opacity-70">
          {EMPTY_STATES.noEvents}
        </p>
      ) : views.length === 0 ? (
        <p className="rounded border border-dashed border-white/15 bg-white/2 px-3 py-3 text-sm opacity-70">
          {EMPTY_STATES.noEventMatches}
        </p>
      ) : (
        <ul className="max-h-144 space-y-3 overflow-y-auto pr-1">
          {views.map((view) => (
            <li
              key={view.event.id}
              className={`rounded border px-3 py-3 transition-colors hover:bg-white/3 ${getToneClassName(view.tone)}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-white/80">
                      {view.sourceLabel}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-white/80">
                      {view.typeLabel}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {view.href ? (
                      <Link to={view.href} className="font-medium hover:underline">
                        {view.title}
                      </Link>
                    ) : (
                      <p className="font-medium">{view.title}</p>
                    )}
                    <p className="text-sm opacity-80">{view.detail}</p>
                  </div>
                </div>

                <div className="event-meta text-right text-xs">
                  <p>Week {view.week}</p>
                  <p>{view.timestampLabel}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function getToneClassName(tone: EventFeedTone) {
  if (tone === 'success') {
    return 'border-green-400/20 bg-green-500/5'
  }

  if (tone === 'warning') {
    return 'border-amber-400/20 bg-amber-500/5'
  }

  if (tone === 'danger') {
    return 'border-red-400/20 bg-red-500/5'
  }

  return 'border-white/10 bg-white/5'
}

function getActiveFilterChips(filters: ReturnType<typeof readEventFeedFilters>) {
  const chips: string[] = []

  if (filters.query.trim().length > 0) {
    chips.push(`Search: ${filters.query.trim()}`)
  }

  if (filters.category !== 'all') {
    chips.push(`Category: ${EVENT_CATEGORY_LABELS[filters.category]}`)
  }

  if (filters.sourceSystem !== 'all') {
    chips.push(`Source: ${EVENT_SOURCE_LABELS[filters.sourceSystem]}`)
  }

  if (filters.type !== 'all') {
    chips.push(`Type: ${EVENT_TYPE_LABELS[filters.type]}`)
  }

  if (filters.relationshipVerbosity !== 'summary') {
    chips.push('Relationship logs: All')
  }

  if (filters.weekMin !== undefined) {
    chips.push(`Week from: ${filters.weekMin}`)
  }

  if (filters.weekMax !== undefined) {
    chips.push(`Week to: ${filters.weekMax}`)
  }

  if ((filters.entityId?.trim().length ?? 0) > 0) {
    chips.push(`Entity: ${filters.entityId!.trim()}`)
  }

  return chips
}

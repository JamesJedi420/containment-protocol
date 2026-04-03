import { useDeferredValue, useEffect, useRef } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useParams, useSearchParams } from 'react-router'
import {
  findSectorByCode,
  protocolSteps,
  sectors,
  telemetry,
  timeline,
  toneLabels,
  type Sector,
} from './data/incident'
import { useIncidentStore, type SectorFilter } from './store/incidentStore'
import './App.css'

const navigation = [
  { to: '/', label: 'Overview', end: true },
  { to: '/sectors', label: 'Sectors' },
  { to: '/timeline', label: 'Timeline' },
]

const filterOptions: Array<{ value: SectorFilter; label: string }> = [
  { value: 'all', label: 'All sectors' },
  { value: 'stable', label: 'Stable' },
  { value: 'warning', label: 'Escalating' },
  { value: 'critical', label: 'Blackout' },
]

function App() {
  const acknowledgedSectors = useIncidentStore((state) => state.acknowledgedSectors)
  const searchQuery = useIncidentStore((state) => state.searchQuery)
  const hotZoneCount = sectors.filter((sector) => sector.tone !== 'stable').length
  const statusFilter = useIncidentStore((state) => state.statusFilter)
  const reset = useIncidentStore((state) => state.reset)
  const hasCommandState =
    acknowledgedSectors.length > 0 || searchQuery.trim().length > 0 || statusFilter !== 'all'

  return (
    <div className="app-shell">
      <header className="chrome">
        <div className="chrome__bar">
          <div>
            <p className="eyebrow">Facility 07 / Incident rehearsal build</p>
            <h1 className="chrome__title">Containment Protocol</h1>
          </div>

          <nav aria-label="Primary" className="nav-list">
            {navigation.map((item) => (
              <NavLink
                className={({ isActive }) => (isActive ? 'nav-link nav-link--active' : 'nav-link')}
                end={item.end}
                key={item.to}
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="chrome__status">
          <p className="chrome-pill">{hotZoneCount} hot sectors require active monitoring</p>
          <p className="chrome-pill">
            {acknowledgedSectors.length} sectors acknowledged by command
          </p>
        </div>

        <div className="chrome__actions">
          {hasCommandState ? (
            <button className="ghost-button" onClick={reset} type="button">
              Reset command state
            </button>
          ) : (
            <p className="chrome-hint">
              Command filters and acknowledgements persist on this device.
            </p>
          )}
        </div>
      </header>

      <main className="main-grid">
        <Routes>
          <Route element={<OverviewRoute />} path="/" />
          <Route element={<SectorWatchRoute />} path="/sectors" />
          <Route element={<SectorDetailRoute />} path="/sectors/:sectorCode" />
          <Route element={<TimelineRoute />} path="/timeline" />
          <Route element={<Navigate replace to="/" />} path="*" />
        </Routes>
      </main>
    </div>
  )
}

function OverviewRoute() {
  const acknowledgedSectors = useIncidentStore((state) => state.acknowledgedSectors)
  const highlightedSectors = sectors.filter((sector) => sector.tone !== 'stable')
  const stableCount = sectors.filter((sector) => sector.tone === 'stable').length

  return (
    <>
      <section className="masthead">
        <div className="masthead__copy">
          <p className="eyebrow">Overview</p>
          <h2>Containment overview</h2>
          <p className="lede">
            Recovery teams are holding the inner line while civilian routes stay open through the
            west concourse. This shell now has real screens, route structure, and shared command
            state instead of a placeholder counter.
          </p>
          <div className="masthead__actions">
            <Link className="action-link action-link--primary" to="/sectors">
              Open sector watch
            </Link>
            <Link className="action-link" to="/timeline">
              Review timeline
            </Link>
          </div>
        </div>

        <div className="signal-grid" aria-label="Key telemetry">
          {telemetry.map((signal) => (
            <article className="signal-card" key={signal.label}>
              <p className="signal-card__label">{signal.label}</p>
              <p className="signal-card__value">{signal.value}</p>
              <p className="signal-card__note">{signal.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="panel panel--split">
        <div>
          <div className="section-heading">
            <p className="eyebrow">System posture</p>
            <h2>Command summary</h2>
          </div>

          <div className="summary-grid">
            <article className="summary-card">
              <p className="summary-card__label">Stable sectors</p>
              <p className="summary-card__value">{stableCount}</p>
              <p className="summary-card__note">Passive watch is enough for most of the ring.</p>
            </article>
            <article className="summary-card">
              <p className="summary-card__label">Acknowledged sectors</p>
              <p className="summary-card__value">{acknowledgedSectors.length}</p>
              <p className="summary-card__note">
                Command queue markers persist while you move between screens.
              </p>
            </article>
            <article className="summary-card">
              <p className="summary-card__label">Protocol steps</p>
              <p className="summary-card__value">{protocolSteps.length}</p>
              <p className="summary-card__note">
                The doctrine track is ready for per-stage workflows.
              </p>
            </article>
          </div>
        </div>

        <aside className="briefing-card" aria-label="Briefing notes">
          <p className="eyebrow">Operator brief</p>
          <h2>What changed</h2>
          <p>
            The app now uses the existing routing and Zustand dependencies. Sector watch can filter
            by severity, detail pages can be acknowledged, and navigation keeps the interface in one
            coherent command shell.
          </p>
          <ul className="briefing-list">
            <li>Route-backed overview, sector watch, detail, and timeline views</li>
            <li>Shared incident state for filter and acknowledgement flow</li>
            <li>Tests that exercise UI behavior instead of static filler only</li>
          </ul>
        </aside>
      </section>

      <section className="panel">
        <div className="section-heading">
          <p className="eyebrow">Priority attention</p>
          <h2>Hot sectors</h2>
        </div>

        <div className="sector-grid">
          {highlightedSectors.map((sector) => (
            <SectorCard key={sector.code} sector={sector} />
          ))}
        </div>
      </section>
    </>
  )
}

function SectorWatchRoute() {
  const acknowledgedSectors = useIncidentStore((state) => state.acknowledgedSectors)
  const resetVersion = useIncidentStore((state) => state.resetVersion)
  const searchQuery = useIncidentStore((state) => state.searchQuery)
  const statusFilter = useIncidentStore((state) => state.statusFilter)
  const setSearchQuery = useIncidentStore((state) => state.setSearchQuery)
  const setStatusFilter = useIncidentStore((state) => state.setStatusFilter)
  const [searchParams, setSearchParams] = useSearchParams()
  const hasQueryState = searchParams.has('q') || searchParams.has('status')
  const deferredSearch = useDeferredValue(searchQuery.trim().toLowerCase())
  const handledResetVersionRef = useRef(resetVersion)
  const hadQueryStateRef = useRef(hasQueryState)
  const initializedFromStoreRef = useRef(false)
  const searchQueryParam = searchParams.get('q') ?? ''
  const statusFilterParam = getStatusFilterFromParams(searchParams)

  useEffect(() => {
    const lostQueryState = hadQueryStateRef.current && !hasQueryState
    hadQueryStateRef.current = hasQueryState

    if (resetVersion !== handledResetVersionRef.current) {
      handledResetVersionRef.current = resetVersion

      if (hasQueryState) {
        setSearchParams(new URLSearchParams(), { replace: true })
        return
      }
    }

    if (lostQueryState) {
      if (searchQuery !== '') {
        setSearchQuery('')
      }

      if (statusFilter !== 'all') {
        setStatusFilter('all')
      }

      return
    }

    if (hasQueryState) {
      initializedFromStoreRef.current = true

      if (searchQueryParam !== searchQuery) {
        setSearchQuery(searchQueryParam)
      }

      if (statusFilterParam !== statusFilter) {
        setStatusFilter(statusFilterParam)
      }

      return
    }

    if (!initializedFromStoreRef.current) {
      initializedFromStoreRef.current = true

      const nextSearchParams = new URLSearchParams()
      const normalizedQuery = searchQuery.trim()

      if (statusFilter !== 'all') {
        nextSearchParams.set('status', statusFilter)
      }

      if (normalizedQuery.length > 0) {
        nextSearchParams.set('q', normalizedQuery)
      }

      if (nextSearchParams.toString().length > 0) {
        setSearchParams(nextSearchParams, { replace: true })
      }
    }
  }, [
    hasQueryState,
    resetVersion,
    searchQuery,
    searchQueryParam,
    setSearchParams,
    setSearchQuery,
    setStatusFilter,
    statusFilter,
    statusFilterParam,
  ])

  function updateSearchQuery(nextSearchQuery: string) {
    const nextSearchParams = new URLSearchParams(searchParams)
    const normalizedQuery = nextSearchQuery.trim()

    setSearchQuery(nextSearchQuery)

    if (normalizedQuery.length > 0) {
      nextSearchParams.set('q', normalizedQuery)
    } else {
      nextSearchParams.delete('q')
    }

    setSearchParams(nextSearchParams, { replace: true })
  }

  function updateStatusFilter(nextStatusFilter: SectorFilter) {
    const nextSearchParams = new URLSearchParams(searchParams)

    setStatusFilter(nextStatusFilter)

    if (nextStatusFilter === 'all') {
      nextSearchParams.delete('status')
    } else {
      nextSearchParams.set('status', nextStatusFilter)
    }

    setSearchParams(nextSearchParams, { replace: true })
  }

  function clearFilters() {
    setSearchQuery('')
    setStatusFilter('all')
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  const filteredSectors = sectors.filter((sector) => {
    const matchesFilter = statusFilter === 'all' ? true : sector.tone === statusFilter
    const matchesSearch =
      deferredSearch.length === 0
        ? true
        : [sector.code, sector.name, sector.status, sector.responseLead]
            .join(' ')
            .toLowerCase()
            .includes(deferredSearch)

    return matchesFilter && matchesSearch
  })
  const normalizedSearchQuery = searchQuery.trim()
  const hasActiveFilters = normalizedSearchQuery.length > 0 || statusFilter !== 'all'
  const activeStatusLabel = getFilterLabel(statusFilter)
  const resultCountLabel = `${filteredSectors.length} sector${filteredSectors.length === 1 ? '' : 's'} in view`

  return (
    <section className="panel">
      <div className="section-heading section-heading--split">
        <div>
          <p className="eyebrow">Containment grid</p>
          <h2>Sector watch</h2>
        </div>
        <p className="section-note">
          {acknowledgedSectors.length} sectors marked by command. Filtered view persists while you
          navigate.
        </p>
      </div>

      <label className="search-field">
        <span className="search-field__label">Search sectors</span>
        <input
          className="search-field__input"
          onChange={(event) => updateSearchQuery(event.target.value)}
          placeholder="Code, sector, status, or response lead"
          type="search"
          value={searchQuery}
        />
      </label>

      <div className="filter-row" role="group" aria-label="Filter sectors by status">
        {filterOptions.map((option) => (
          <button
            className={
              statusFilter === option.value
                ? 'filter-button filter-button--active'
                : 'filter-button'
            }
            key={option.value}
            onClick={() => updateStatusFilter(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="filter-summary" aria-live="polite">
        <p className="filter-summary__count">{resultCountLabel}</p>
        {hasActiveFilters ? (
          <div className="filter-summary__meta">
            <p className="filter-summary__active">
              Status: {activeStatusLabel}
              {normalizedSearchQuery.length > 0 ? ` / Search: ${normalizedSearchQuery}` : ''}
            </p>
            <button className="text-button" onClick={clearFilters} type="button">
              Clear filters
            </button>
          </div>
        ) : (
          <p className="filter-summary__active">Showing the full containment grid.</p>
        )}
      </div>

      <CommandQueue />

      {filteredSectors.length > 0 ? (
        <div className="sector-grid">
          {filteredSectors.map((sector) => (
            <SectorCard key={sector.code} sector={sector} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h3>No sectors match that query</h3>
          <p>Try a different status filter or clear the search terms to restore the full grid.</p>
        </div>
      )}
    </section>
  )
}

function SectorDetailRoute() {
  const { sectorCode = '' } = useParams()
  const sector = findSectorByCode(sectorCode)
  const acknowledgedSectors = useIncidentStore((state) => state.acknowledgedSectors)
  const toggleAcknowledged = useIncidentStore((state) => state.toggleAcknowledged)

  if (!sector) {
    return (
      <section className="panel">
        <div className="section-heading">
          <p className="eyebrow">Sector detail</p>
          <h2>Sector not found</h2>
        </div>
        <p className="detail-copy">
          The requested sector code is not in the current incident map. Return to sector watch and
          select an active zone.
        </p>
        <Link className="action-link action-link--primary" to="/sectors">
          Return to sector watch
        </Link>
      </section>
    )
  }

  const isAcknowledged = acknowledgedSectors.includes(sector.code)

  return (
    <section className="panel">
      <Link className="back-link" to="/sectors">
        Back to sector watch
      </Link>

      <div className="detail-grid">
        <div>
          <p className="eyebrow">Sector detail</p>
          <h2>
            {sector.code} / {sector.name}
          </h2>
          <p className="detail-status">{toneLabels[sector.tone]}</p>
          <p className="detail-copy">{sector.detail}</p>

          <div className="detail-actions">
            <button
              className="action-button"
              onClick={() => toggleAcknowledged(sector.code)}
              type="button"
            >
              {isAcknowledged ? 'Remove acknowledgement' : 'Acknowledge sector'}
            </button>
            <Link className="action-link" to="/timeline">
              Cross-check timeline
            </Link>
          </div>

          {isAcknowledged ? (
            <p className="detail-banner">Acknowledged in command queue.</p>
          ) : (
            <p className="detail-banner detail-banner--muted">
              Awaiting acknowledgement from command.
            </p>
          )}
        </div>

        <aside className="detail-card">
          <h3>Operational notes</h3>
          <dl className="detail-list">
            <div>
              <dt>Response lead</dt>
              <dd>{sector.responseLead}</dd>
            </div>
            <div>
              <dt>Route status</dt>
              <dd>{sector.routeStatus}</dd>
            </div>
            <div>
              <dt>Recommended action</dt>
              <dd>{sector.recommendedAction}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  )
}

function TimelineRoute() {
  return (
    <section className="panel panel--split">
      <div>
        <div className="section-heading">
          <p className="eyebrow">Incident trace</p>
          <h2>Escalation timeline</h2>
        </div>

        <div className="timeline">
          {timeline.map((entry) => (
            <article className="timeline__item" key={entry.stamp}>
              <p className="timeline__stamp">{entry.stamp}</p>
              <div>
                <h3>{entry.title}</h3>
                <p>{entry.detail}</p>
                <p className="timeline__owner">{entry.owner}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <aside className="briefing-card">
        <p className="eyebrow">Protocol chain</p>
        <h2>Response doctrine</h2>
        <ol className="protocol-list">
          {protocolSteps.map((entry) => (
            <li className="protocol-list__item" key={entry.step}>
              <p className="protocol-list__step">{entry.step}</p>
              <p>{entry.detail}</p>
            </li>
          ))}
        </ol>
      </aside>
    </section>
  )
}

function CommandQueue() {
  const acknowledgedSectors = useIncidentStore((state) => state.acknowledgedSectors)
  const clearAcknowledged = useIncidentStore((state) => state.clearAcknowledged)
  const toggleAcknowledged = useIncidentStore((state) => state.toggleAcknowledged)
  const queuedSectors = sectors.filter((sector) => acknowledgedSectors.includes(sector.code))
  const queueCountLabel = `${queuedSectors.length} sector${queuedSectors.length === 1 ? '' : 's'} queued`

  return (
    <aside className="queue-panel">
      <div className="queue-panel__header">
        <div className="section-heading">
          <p className="eyebrow">Command queue</p>
          <h3>Acknowledged sectors</h3>
          <p className="queue-panel__count">{queueCountLabel}</p>
        </div>
        {queuedSectors.length > 0 ? (
          <button
            className="ghost-button ghost-button--compact"
            onClick={clearAcknowledged}
            type="button"
          >
            Clear queue
          </button>
        ) : null}
      </div>

      {queuedSectors.length > 0 ? (
        <ul className="queue-list">
          {queuedSectors.map((sector) => (
            <li className="queue-list__item" key={sector.code}>
              <div>
                <p className="queue-list__code">{sector.code}</p>
                <p className="queue-list__name">{sector.name}</p>
              </div>
              <div className="queue-list__actions">
                <Link className="text-link" to={`/sectors/${sector.code}`}>
                  Reopen
                </Link>
                <button
                  aria-label={`Remove ${sector.name} from queue`}
                  className="text-button"
                  onClick={() => toggleAcknowledged(sector.code)}
                  type="button"
                >
                  Dismiss
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="queue-empty">
          No sectors are queued yet. Acknowledged zones will appear here.
        </p>
      )}
    </aside>
  )
}

function SectorCard({ sector }: { sector: Sector }) {
  const acknowledgedSectors = useIncidentStore((state) => state.acknowledgedSectors)
  const isAcknowledged = acknowledgedSectors.includes(sector.code)

  return (
    <article className={`sector-card sector-card--${sector.tone}`}>
      <div className="sector-card__topline">
        <p className="sector-card__code">{sector.code}</p>
        <p className="sector-card__status">{sector.status}</p>
      </div>
      <h3>{sector.name}</h3>
      <p>{sector.detail}</p>
      <p className="sector-card__lead">{sector.responseLead}</p>
      <div className="sector-card__footer">
        <p className={isAcknowledged ? 'ack-chip' : 'ack-chip ack-chip--muted'}>
          {isAcknowledged ? 'Acknowledged' : 'Awaiting command'}
        </p>
        <Link className="text-link" to={`/sectors/${sector.code}`}>
          Open sector
        </Link>
      </div>
    </article>
  )
}

function getStatusFilterFromParams(searchParams: URLSearchParams): SectorFilter {
  const statusFilterParam = searchParams.get('status')

  if (statusFilterParam === 'stable') {
    return 'stable'
  }

  if (statusFilterParam === 'warning') {
    return 'warning'
  }

  if (statusFilterParam === 'critical') {
    return 'critical'
  }

  return 'all'
}

function getFilterLabel(filter: SectorFilter) {
  return filterOptions.find((option) => option.value === filter)?.label ?? 'All sectors'
}

export default App

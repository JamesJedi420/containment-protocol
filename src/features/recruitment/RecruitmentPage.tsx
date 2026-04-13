import { type ReactNode, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { FilterInput } from '../../components/FilterInput'
import { FilterSelect } from '../../components/FilterSelect'
import { RECRUITMENT_GUIDANCE } from '../../data/copy'
import { getCandidateWeeklyCost } from '../../domain/recruitment'
import { getReserveAgents } from '../../domain/sim/teamManagement'
import {
  getRecruitmentCandidateViews,
  getRecruitmentMetrics,
  getRecruitmentScoutingOverview,
} from './recruitmentView'
import {
  DEFAULT_RECRUITMENT_LIST_FILTERS,
  type RecruitmentCategoryFilter,
  type RecruitmentListFilters,
  type RecruitmentSortFilter,
  readRecruitmentListFilters,
  toRecruitmentViewFilters,
  writeRecruitmentListFilters,
} from './recruitmentListView'

export default function RecruitmentPage() {
  const { game, hireCandidate, scoutCandidate } = useGameStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readRecruitmentListFilters(searchParams)
  const normalizedSearchParams = writeRecruitmentListFilters(filters)
  const normalizedSearch = normalizedSearchParams.toString()

  useEffect(() => {
    if (searchParams.toString() !== normalizedSearch) {
      setSearchParams(normalizedSearchParams, { replace: true })
    }
  }, [normalizedSearch, normalizedSearchParams, searchParams, setSearchParams])

  const updateFilters = (patch: Partial<RecruitmentListFilters>) => {
    setSearchParams(writeRecruitmentListFilters({ ...filters, ...patch }), { replace: true })
  }

  const metrics = useMemo(() => getRecruitmentMetrics(game), [game])
  const scoutingOverview = useMemo(() => getRecruitmentScoutingOverview(game), [game])
  const viewFilters = useMemo(() => toRecruitmentViewFilters(filters), [filters])
  const views = useMemo(() => getRecruitmentCandidateViews(game, viewFilters), [game, viewFilters])
  const reserveAgents = useMemo(() => getReserveAgents(game), [game])
  const visibleOverallCount = views.filter((view) => !view.hiddenOverall).length
  const expiringSoonVisible = views.filter((view) => view.expiringSoon).length
  const hasActiveFilters =
    filters.q !== DEFAULT_RECRUITMENT_LIST_FILTERS.q ||
    filters.category !== DEFAULT_RECRUITMENT_LIST_FILTERS.category ||
    filters.sort !== DEFAULT_RECRUITMENT_LIST_FILTERS.sort ||
    filters.expiringSoonOnly !== DEFAULT_RECRUITMENT_LIST_FILTERS.expiringSoonOnly

  return (
    <section className="space-y-4">
      <article className="panel space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Recruitment</h2>
            <p className="text-sm opacity-60">
              Active intake, visible candidate fit, and hiring pressure from the live weekly
              pipeline.
            </p>
          </div>
          <Link to={APP_ROUTES.agency} className="btn btn-sm btn-ghost">
            Open agency
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ShellMetric label="Open candidates" value={String(metrics.total)} />
          <ShellMetric label="Agent prospects" value={String(metrics.agents)} />
          <ShellMetric label="Staff prospects" value={String(metrics.staff)} />
          <ShellMetric label="Expiring by next week" value={String(metrics.expiringSoon)} />
          <ShellMetric label="Reserve agents" value={String(reserveAgents.length)} />
        </div>
        <p className="text-xs uppercase tracking-[0.2em] opacity-50">
          Hired agents enter the reserve pool first. Place them into squads from the teams page.
        </p>
      </article>

      <article className="panel space-y-4" role="region" aria-label="Recruitment filters">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Controls</h3>
            <p className="text-sm opacity-60">
              Expiring candidates close after their deadline. Hire before the slot closes.
            </p>
          </div>
          <p className="text-xs uppercase tracking-[0.24em] opacity-50">
            Showing {views.length} of {metrics.total}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FilterInput
            id="recruitment-search"
            label="Search"
            value={filters.q}
            onChange={(q) => updateFilters({ q })}
            placeholder="Search by name, role, tags, or impressions"
          />
          <FilterSelect
            id="recruitment-category"
            label="Category"
            value={filters.category}
            onChange={(category) =>
              updateFilters({ category: (category || 'all') as RecruitmentCategoryFilter })
            }
            options={[
              { value: 'all', label: 'All categories' },
              { value: 'agent', label: 'Agent' },
              { value: 'staff', label: 'Staff' },
              { value: 'specialist', label: 'Specialist' },
            ]}
          />
          <FilterSelect
            id="recruitment-sort"
            label="Sort"
            value={filters.sort}
            onChange={(sort) =>
              updateFilters({
                sort: sort as RecruitmentSortFilter,
              })
            }
            options={[
              { value: 'expiry', label: 'Expiry first' },
              { value: 'overall', label: 'Best fit' },
              { value: 'wage', label: 'Cheapest' },
              { value: 'name', label: 'Name' },
            ]}
          />
          <div className="flex items-end">
            <label
              htmlFor="recruitment-expiring"
              className="flex w-full items-center justify-between gap-3 rounded border border-white/10 px-3 py-2 text-sm"
            >
              <span>Expiring soon only</span>
              <input
                id="recruitment-expiring"
                type="checkbox"
                checked={filters.expiringSoonOnly}
                onChange={(event) =>
                  updateFilters({
                    expiringSoonOnly: event.target.checked,
                  })
                }
              />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.24em] opacity-50">
          <span>Visible fit: {visibleOverallCount}</span>
          <span>Expiring visible: {expiringSoonVisible}</span>
          <button
            type="button"
            className="underline decoration-dotted underline-offset-4"
            onClick={() => updateFilters(DEFAULT_RECRUITMENT_LIST_FILTERS)}
          >
            Reset filters
          </button>
        </div>
      </article>

      <article className="panel space-y-4" role="region" aria-label="Scouting posture">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Scouting posture</h3>
            <p className="text-sm opacity-60">
              Recon depth stays bounded and deterministic. Follow-up scouting tightens projections;
              deep recon scans confirm them.
            </p>
          </div>
          <p className="text-xs uppercase tracking-[0.24em] opacity-50">
            {scoutingOverview.recentOutcomes.length} recent scouting outcome
            {scoutingOverview.recentOutcomes.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.95fr)]">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ShellMetric
                label="Outstanding leads"
                value={String(scoutingOverview.outstandingLeadCount)}
              />
              <ShellMetric
                label="Scout support"
                value={`${scoutingOverview.supportScore} / 100`}
              />
              <ShellMetric
                label="Scout-capable operatives"
                value={String(scoutingOverview.operativeCount)}
              />
              <ShellMetric
                label="Field Recon leads"
                value={String(scoutingOverview.fieldReconCount)}
              />
            </div>
            <div className="space-y-2 text-sm opacity-75">
              {scoutingOverview.revealSummary && /recon plateau|diminish|no new|few new|repeat/i.test(scoutingOverview.revealSummary) && (
                <span className="rounded-full border border-amber-400/35 bg-amber-500/10 text-amber-200 px-2 py-0.5 text-[11px] font-bold">Recon Plateau</span>
              )}
              <p>{scoutingOverview.supportSummary}</p>
              <p>{scoutingOverview.revealSummary}</p>
              <p>{scoutingOverview.costSummary}</p>
            </div>
          </div>

          <div className="rounded border border-white/10 bg-white/5 px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-sm font-semibold uppercase tracking-[0.18em] opacity-70">
                Recent scouting outcomes
              </h4>
              <Link to={APP_ROUTES.report} className="btn btn-sm btn-ghost">
                Open reports
              </Link>
            </div>
            {scoutingOverview.recentOutcomes.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {scoutingOverview.recentOutcomes.map((entry) => (
                  <li key={entry.id} className="rounded border border-white/10 bg-black/10 px-3 py-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-medium">{entry.title}</p>
                      <Badge tone={entry.tone === 'danger' ? 'warning' : entry.tone === 'success' ? 'success' : 'neutral'}>
                        {entry.tone}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm opacity-70">{entry.detail}</p>
                    {entry.href ? (
                      <Link to={entry.href} className="mt-2 inline-flex text-xs uppercase tracking-[0.18em] opacity-60">
                        Open source
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm opacity-60">
                No scouting actions have landed yet this week. Commission a scan to start building
                history.
              </p>
            )}
          </div>
        </div>
      </article>

      <article className="panel space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Candidate board</h3>
            <p className="text-sm opacity-60">{RECRUITMENT_GUIDANCE.impressionExplained}</p>
          </div>
          <p className="text-xs uppercase tracking-[0.24em] opacity-50">
            Weekly wage and expiry are shown per candidate
          </p>
        </div>

        {views.length > 0 ? (
          <ul className="space-y-3">
            {views.map((view) => {
              const { candidate } = view
              const wage = getCandidateWeeklyCost(candidate) ?? 0
              const weeksRemaining = Math.max(candidate.expiryWeek - game.week, 0)

              return (
                <li key={candidate.id} className="rounded border border-white/10 px-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-lg font-medium">{candidate.name}</p>
                      <p className="text-sm capitalize opacity-60">{view.roleLabel}</p>
                      {view.sourceLabel ? (
                        <p className="text-xs uppercase tracking-[0.2em] opacity-50">
                          Source {view.sourceLabel}
                        </p>
                      ) : null}
                      <p className="text-xs uppercase tracking-[0.24em] opacity-50">
                        Expires week {candidate.expiryWeek} / {weeksRemaining}w remaining
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {view.expiringSoon ? <Badge tone="warning">Expiring soon</Badge> : null}
                      <Badge tone={view.hiddenOverall ? 'neutral' : 'success'}>
                        Overall fit {view.overallLabel}
                      </Badge>
                      {view.scoutIdentityLabel ? <Badge tone="success">{view.scoutIdentityLabel}</Badge> : null}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <span className="block text-[11px] uppercase tracking-[0.18em] opacity-60 mb-1">Intel</span>
                      <p className="opacity-70">Potential: {view.potentialLabel}</p>
                      <p className="opacity-70">{view.capIntelLabel}: {view.capIntelDetails.join(', ')}</p>
                    </div>
                    <div>
                      <span className="block text-[11px] uppercase tracking-[0.18em] opacity-60 mb-1">Confidence</span>
                      <p className="opacity-70">Scout confidence: {view.scoutConfidenceLabel}</p>
                      <p className="opacity-70">Hire outcome: {view.hireOutcomeLabel ?? '—'}</p>
                    </div>
                    <div>
                      <span className="block text-[11px] uppercase tracking-[0.18em] opacity-60 mb-1">Recon / Scouting</span>
                      <p className="opacity-70">Scout report: {view.scoutLabel}</p>
                      <p className="opacity-70">Scout depth: {view.scoutDepthLabel}</p>
                    </div>
                    <div>
                      <span className="block text-[11px] uppercase tracking-[0.18em] opacity-60 mb-1">Profile</span>
                      <p className="opacity-70">Weekly wage: ${wage}</p>
                      <p className="opacity-70">Teamwork: {candidate.evaluation.teamwork}</p>
                      <p className="opacity-70">Outlook: {candidate.evaluation.outlook}</p>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <p className="text-sm opacity-70">{candidate.evaluation.impression}</p>
                    <p className="text-sm opacity-70">
                      Rumors: {candidate.evaluation.rumorTags.join(', ') || 'None'}
                    </p>
                    {candidate.sourceSummary ? (
                      <p className="text-sm opacity-70">{candidate.sourceSummary}</p>
                    ) : null}
                    {/* capIntel now grouped above */}
                    <div className="rounded border border-white/10 bg-white/5 px-3 py-2 text-sm opacity-75">
                      <p>
                        <span className="font-medium">Known now:</span> {view.knownNowSummary}
                      </p>
                      <p className="mt-1">
                        <span className="font-medium">Uncertainty:</span> {view.uncertaintySummary}
                      </p>
                      <p className="mt-1">
                        <span className="font-medium">Next scout:</span> {view.nextScanSummary}
                      </p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.18em] opacity-50">
                      {view.scoutWorthLabel}
                    </p>
                    {!view.preview.canHire ? (
                      <p className="text-xs uppercase tracking-[0.18em] opacity-50">
                        Hiring blocked: {view.preview.reasons.join(', ')}
                      </p>
                    ) : null}
                    {view.hiddenOverall ? (
                      <p className="text-xs uppercase tracking-[0.18em] opacity-50">
                        Overall fit is obscured. Hire only if the visible signs justify the slot.
                      </p>
                    ) : null}
                    {view.scoutBlockedReason &&
                    candidate.category === 'agent' &&
                    !candidate.scoutReport ? (
                      <p className="text-xs uppercase tracking-[0.18em] opacity-50">
                        Scout blocked: {view.scoutBlockedReason}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {candidate.category === 'agent' ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        disabled={!view.canScout}
                        onClick={() => scoutCandidate(candidate.id)}
                      >
                        {`${view.scoutActionLabel}${view.canScout && view.scoutCost ? ` ($${view.scoutCost})` : ''}`}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={!view.preview.canHire}
                      onClick={() => hireCandidate(candidate.id)}
                    >
                      Hire
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : metrics.total === 0 ? (
          <div className="panel space-y-2 p-4">
            <p className="text-sm font-medium">{RECRUITMENT_GUIDANCE.noCandidates}</p>
            <p className="text-sm opacity-70">
              Return to the agency page to open recruitment orders.
            </p>
          </div>
        ) : (
          <div className="panel space-y-2 p-4">
            <p className="text-sm font-medium">No candidates match the current filters.</p>
            <p className="text-sm opacity-70">
              Clear the search or reset the board to review the full intake.
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => updateFilters(DEFAULT_RECRUITMENT_LIST_FILTERS)}
              >
                Reset filters
              </button>
            ) : null}
          </div>
        )}
      </article>
    </section>
  )
}

function ShellMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}

function Badge({
  children,
  tone,
}: {
  children: ReactNode
  tone: 'neutral' | 'warning' | 'success'
}) {
  const className =
    tone === 'warning'
      ? 'border-amber-400/30 bg-amber-500/10 text-amber-100'
      : tone === 'success'
        ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
        : 'border-white/10 bg-white/5 text-white/80'

  return <span className={`rounded-full border px-2 py-0.5 text-xs ${className}`}>{children}</span>
}

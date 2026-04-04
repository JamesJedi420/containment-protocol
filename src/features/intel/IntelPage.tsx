import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { FilterInput } from '../../components/FilterInput'
import { FilterSelect } from '../../components/FilterSelect'
import { INTEL_UI_TEXT, MODE_LABELS, ROLE_COVERAGE_LABELS } from '../../data/copy'
import {
  DEFAULT_INTEL_FILTERS,
  INTEL_KIND_FILTERS,
  INTEL_MODE_FILTERS,
  INTEL_PRESSURE_FILTERS,
  getAllIntelViews,
  getFilteredIntelViews,
  getIntelRequiredTagOptions,
  readIntelFilters,
  type IntelFilters,
  writeIntelFilters,
} from './intelView'

export default function IntelPage() {
  const { game } = useGameStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readIntelFilters(searchParams)
  const normalizedSearchParams = writeIntelFilters(filters)
  const normalizedSearch = normalizedSearchParams.toString()
  const allViews = getAllIntelViews(game.templates)
  const filteredViews = getFilteredIntelViews(game.templates, filters)
  const requiredTagOptions = getIntelRequiredTagOptions(allViews)
  const summary = getIntelBrowserSummary(allViews)

  useEffect(() => {
    if (searchParams.toString() !== normalizedSearch) {
      setSearchParams(normalizedSearchParams, { replace: true })
    }
  }, [normalizedSearch, normalizedSearchParams, searchParams, setSearchParams])

  function updateFilters(patch: Partial<IntelFilters>) {
    setSearchParams(writeIntelFilters({ ...filters, ...patch }), { replace: true })
  }

  return (
    <section className="space-y-4">
      <article className="panel panel-primary space-y-4" role="region" aria-label="Intel summary">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.24em] opacity-50">
            {INTEL_UI_TEXT.pageHeading}
          </p>
          <h2 className="text-xl font-semibold">{INTEL_UI_TEXT.pageHeading}</h2>
          <p className="text-sm opacity-60">{INTEL_UI_TEXT.pageSubtitle}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Catalog size" value={String(summary.total)} />
          <StatCard label="Raid-capable" value={String(summary.raidCapable)} />
          <StatCard label="Severe or critical" value={String(summary.severePressure)} />
          <StatCard label="Starter-ready" value={String(summary.starterReady)} />
        </div>
      </article>

      <article className="panel panel-primary space-y-4" role="region" aria-label="Intel filters">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <FilterInput
            id="intel-search"
            label={INTEL_UI_TEXT.searchLabel}
            value={filters.q}
            onChange={(value) => updateFilters({ q: value })}
            type="search"
            placeholder={INTEL_UI_TEXT.searchPlaceholder}
            containerClassName="space-y-2"
            labelClassName="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
            inputClassName="form-input"
          />

          <FilterSelect
            id="intel-mode"
            label={INTEL_UI_TEXT.modeLabel}
            value={filters.mode}
            onChange={(value) => updateFilters({ mode: value as IntelFilters['mode'] })}
            options={INTEL_MODE_FILTERS.map((option) => ({
              value: option,
              label: option === 'all' ? INTEL_UI_TEXT.allModes : MODE_LABELS[option],
            }))}
            containerClassName="space-y-2"
            labelClassName="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
            selectClassName="form-select"
          />

          <FilterSelect
            id="intel-kind"
            label={INTEL_UI_TEXT.kindLabel}
            value={filters.kind}
            onChange={(value) => updateFilters({ kind: value as IntelFilters['kind'] })}
            options={INTEL_KIND_FILTERS.map((option) => ({
              value: option,
              label:
                option === 'all' ? INTEL_UI_TEXT.allKinds : option === 'raid' ? 'Raid' : 'Case',
            }))}
            containerClassName="space-y-2"
            labelClassName="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
            selectClassName="form-select"
          />

          <FilterSelect
            id="intel-pressure"
            label={INTEL_UI_TEXT.pressureLabel}
            value={filters.pressure}
            onChange={(value) => updateFilters({ pressure: value as IntelFilters['pressure'] })}
            options={INTEL_PRESSURE_FILTERS.map((option) => ({
              value: option,
              label: option === 'all' ? INTEL_UI_TEXT.allPressure : capitalize(option),
            }))}
            containerClassName="space-y-2"
            labelClassName="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
            selectClassName="form-select"
          />

          <FilterSelect
            id="intel-required-tag"
            label={INTEL_UI_TEXT.requiredTagLabel}
            value={filters.requiredTag}
            onChange={(value) => updateFilters({ requiredTag: value })}
            options={[
              { value: '', label: INTEL_UI_TEXT.allRequiredTags },
              ...requiredTagOptions.map((option) => ({ value: option, label: option })),
            ]}
            containerClassName="space-y-2"
            labelClassName="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
            selectClassName="form-select"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <label htmlFor="intel-raid-capable" className="inline-flex items-center gap-2 opacity-70">
            <input
              id="intel-raid-capable"
              type="checkbox"
              checked={filters.raidCapable}
              onChange={(event) => updateFilters({ raidCapable: event.target.checked })}
            />
            {INTEL_UI_TEXT.raidCapableLabel}
          </label>

          <div className="flex items-center gap-3">
            <p className="opacity-70">
              {INTEL_UI_TEXT.showingResults
                .replace('{count}', String(filteredViews.length))
                .replace('{total}', String(allViews.length))}
            </p>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() =>
                setSearchParams(writeIntelFilters(DEFAULT_INTEL_FILTERS), { replace: true })
              }
            >
              Clear filters
            </button>
          </div>
        </div>
      </article>

      {filteredViews.length > 0 ? (
        <ul className="space-y-3" aria-label="Intel results">
          {filteredViews.map((view) => (
            <li key={view.template.templateId} className="panel panel-support space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-medium">
                    <Link
                      to={APP_ROUTES.intelDetail(view.template.templateId)}
                      className="hover:underline"
                    >
                      {view.template.title}
                    </Link>
                  </p>
                  <p className="text-xs opacity-50">
                    {INTEL_UI_TEXT.templateId}: {view.template.templateId} / {INTEL_UI_TEXT.family}:{' '}
                    {view.family}
                  </p>
                  <p className="text-sm opacity-60">{view.template.description}</p>
                </div>

                <div className="text-right text-xs uppercase tracking-[0.24em] opacity-60">
                  <p>
                    {INTEL_UI_TEXT.threatRating}: {view.threatRating}/5
                  </p>
                  <p>
                    {INTEL_UI_TEXT.likelyPressure}: {capitalize(view.likelyPressure)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {view.requiredRoles.map((role) => (
                  <span
                    key={`required-role:${role}`}
                    className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 text-violet-100"
                  >
                    role {ROLE_COVERAGE_LABELS[role]}
                  </span>
                ))}
                {view.requiredTags.map((tag) => (
                  <span
                    key={`required:${tag}`}
                    className="rounded-full border border-white/10 px-2 py-0.5"
                  >
                    req {tag}
                  </span>
                ))}
                {view.preferredTags.map((tag) => (
                  <span
                    key={`preferred:${tag}`}
                    className="rounded-full border border-white/10 px-2 py-0.5 opacity-70"
                  >
                    pref {tag}
                  </span>
                ))}
                {view.isRaidCapable ? (
                  <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-2 py-0.5 text-fuchsia-100">
                    raid-capable
                  </span>
                ) : null}
              </div>

              <div className="grid gap-3 text-sm opacity-70 md:grid-cols-3">
                <p>
                  {INTEL_UI_TEXT.dominantStats}: {view.dominantStats.join(', ')}
                </p>
                <p>
                  {INTEL_UI_TEXT.starterCoverage}: {view.starterReadyCount} starter-ready
                </p>
                <p>Best starter odds: {Math.round(view.bestStarterSuccess * 100)}%</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div
          className="panel panel-support p-4 text-sm opacity-70"
          role="region"
          aria-label="No matching intel"
        >
          {INTEL_UI_TEXT.noMatches}
        </div>
      )}
    </section>
  )
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}

function getIntelBrowserSummary(views: ReturnType<typeof getAllIntelViews>) {
  return {
    total: views.length,
    raidCapable: views.filter((view) => view.isRaidCapable).length,
    severePressure: views.filter(
      (view) => view.likelyPressure === 'severe' || view.likelyPressure === 'critical'
    ).length,
    starterReady: views.filter((view) => view.starterReadyCount > 0).length,
  }
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

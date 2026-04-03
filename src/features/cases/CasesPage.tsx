import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import {
  IconInProgress,
  IconOpen,
  IconResolved,
  IconStageCritical,
  IconStageOk,
  IconStageWarn,
} from '../../components/icons'
import { FilterInput } from '../../components/FilterInput'
import { FilterSelect } from '../../components/FilterSelect'
import {
  MODE_LABELS,
  STATUS_LABELS,
  CASE_UI_LABELS,
  CASE_LORE_STUBS,
  ROLE_COVERAGE_LABELS,
  TOOLTIPS,
  AGENCY_LABELS,
  CASES_GUIDANCE,
} from '../../data/copy'
import { CASES_FILTER_TEXT } from '../../data/copy'
import {
  CASE_MODE_FILTERS,
  CASE_SORTS,
  CASE_STAGE_FILTERS,
  CASE_STATUS_FILTERS,
  getFilteredCaseViews,
  readCaseListFilters,
  type CaseListFilters,
  type CaseListItemView,
  writeCaseListFilters,
} from './caseView'

export default function CasesPage() {
  const { game, assign, unassign } = useGameStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const searchParamsString = searchParams.toString()
  const filters = readCaseListFilters(searchParams)
  const normalizedSearchString = writeCaseListFilters(filters).toString()
  const querySuffix = normalizedSearchString ? `?${normalizedSearchString}` : ''

  useEffect(() => {
    if (searchParamsString !== normalizedSearchString) {
      setSearchParams(new URLSearchParams(normalizedSearchString), { replace: true })
    }
  }, [normalizedSearchString, searchParamsString, setSearchParams])

  const cases = getFilteredCaseViews(game, filters)
  const totalCases = Object.keys(game.cases).length

  function updateFilters(nextFilters: CaseListFilters) {
    setSearchParams(writeCaseListFilters(nextFilters), { replace: true })
  }

  return (
    <section className="space-y-4">
      <article className="panel panel-primary space-y-4" role="region" aria-label="Case filters">
        <div className="flex flex-wrap items-end gap-3">
          <FilterInput
            id="case-search"
            label="Search"
            value={filters.q}
            onChange={(value) =>
              updateFilters({
                ...filters,
                q: value,
              })
            }
            placeholder="Search cases, tags, or teams"
            type="search"
            containerClassName="space-y-1 text-sm min-w-[16rem] flex-1"
            labelClassName="block text-xs uppercase tracking-wide opacity-60"
            inputClassName="w-full rounded border border-white/10 bg-transparent px-3 py-2 text-sm"
          />
          <FilterSelect
            id="case-status"
            label="Status"
            value={filters.status}
            onChange={(value) =>
              updateFilters({
                ...filters,
                status: value as CaseListFilters['status'],
              })
            }
            options={CASE_STATUS_FILTERS.map((value) => ({
              value,
              label: value === 'all' ? 'All statuses' : STATUS_LABELS[value],
            }))}
            containerClassName="space-y-1 text-sm"
            labelClassName="block text-xs uppercase tracking-wide opacity-60"
            selectClassName="rounded border border-white/10 bg-transparent px-3 py-2 text-sm"
          />
          <FilterSelect
            id="case-mode"
            label="Mode"
            value={filters.mode}
            onChange={(value) =>
              updateFilters({
                ...filters,
                mode: value as CaseListFilters['mode'],
              })
            }
            options={CASE_MODE_FILTERS.map((value) => ({
              value,
              label: value === 'all' ? 'All modes' : MODE_LABELS[value],
            }))}
            containerClassName="space-y-1 text-sm"
            labelClassName="block text-xs uppercase tracking-wide opacity-60"
            selectClassName="rounded border border-white/10 bg-transparent px-3 py-2 text-sm"
          />
          <FilterSelect
            id="case-stage"
            label="Stage"
            value={filters.stage}
            onChange={(value) =>
              updateFilters({
                ...filters,
                stage: value as CaseListFilters['stage'],
              })
            }
            options={CASE_STAGE_FILTERS.map((value) => ({
              value,
              label: value === 'all' ? 'All stages' : `Stage ${value}`,
            }))}
            containerClassName="space-y-1 text-sm"
            labelClassName="block text-xs uppercase tracking-wide opacity-60"
            selectClassName="rounded border border-white/10 bg-transparent px-3 py-2 text-sm"
          />
          <FilterSelect
            id="case-sort"
            label="Sort"
            value={filters.sort}
            onChange={(value) =>
              updateFilters({
                ...filters,
                sort: value as CaseListFilters['sort'],
              })
            }
            options={CASE_SORTS.map((value) => ({ value, label: CASE_SORT_LABELS[value] }))}
            containerClassName="space-y-1 text-sm"
            labelClassName="block text-xs uppercase tracking-wide opacity-60"
            selectClassName="rounded border border-white/10 bg-transparent px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}
            className="btn btn-sm btn-ghost"
          >
            Clear filters
          </button>
          <button
            type="button"
            title={CASES_FILTER_TEXT.riskFilterTooltip}
            onClick={() => updateFilters({ ...filters, risk: !filters.risk })}
            className={filters.risk ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-ghost'}
          >
            {filters.risk ? CASES_FILTER_TEXT.riskFilterActive : CASES_FILTER_TEXT.riskFilterLabel}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm opacity-70">
          <p>
            Showing {cases.length} of {totalCases} cases
          </p>
          <p>Active query: {querySuffix || 'none'}</p>
        </div>
      </article>

      <article className="panel space-y-3" role="region" aria-label="Case assignment guidance">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] opacity-70">Mode Guide</h3>
        <p className="text-sm opacity-70">{CASES_GUIDANCE.modeExplanation}</p>
        <div className="grid gap-2 text-xs md:grid-cols-3">
          <div className="rounded border border-white/10 px-3 py-2">
            <p className="font-medium">{MODE_LABELS.threshold}</p>
            <p className="mt-1 opacity-70" title={TOOLTIPS['mode.threshold']}>
              Deterministic score check against operation threshold.
            </p>
          </div>
          <div className="rounded border border-white/10 px-3 py-2">
            <p className="font-medium">{MODE_LABELS.probability}</p>
            <p className="mt-1 opacity-70" title={TOOLTIPS['mode.probability']}>
              Higher team score improves odds, but never guarantees success.
            </p>
          </div>
          <div className="rounded border border-white/10 px-3 py-2">
            <p className="font-medium">{MODE_LABELS.deterministic}</p>
            <p className="mt-1 opacity-70" title={TOOLTIPS['mode.deterministic']}>
              Required tags and role coverage gate eligibility before assignment can succeed.
            </p>
          </div>
        </div>
        <p className="text-xs opacity-65">{CASES_GUIDANCE.tagBlockHint}</p>
        <p className="text-xs text-amber-200/90">⚠ {CASES_GUIDANCE.stageWarning}</p>
      </article>

      {cases.length > 0 ? (
        <ul className="space-y-3" aria-label="Case results">
          {cases.map((view) => {
            const detailHref = `${APP_ROUTES.caseDetail(view.currentCase.id)}${querySuffix}`
            const intelHref = APP_ROUTES.intelDetail(view.currentCase.templateId)
            const urgencyMarkers = getUrgencyMarkers(view)

            return (
              <li key={view.currentCase.id} className="panel panel-support space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">
                      <Link to={detailHref} className="hover:underline">
                        {view.currentCase.title}
                      </Link>
                    </p>
                    <p className="text-xs uppercase tracking-wide opacity-50">
                      <Link to={intelHref} className="hover:underline">
                        View intel
                      </Link>
                    </p>
                    <p className="mt-0.5 text-xs opacity-50">{view.currentCase.description}</p>
                    {CASE_LORE_STUBS[view.currentCase.templateId] ? (
                      <p className="mt-1 text-xs opacity-60" title={TOOLTIPS['case.lore']}>
                        {CASE_UI_LABELS.loreStub}: {CASE_LORE_STUBS[view.currentCase.templateId]}
                      </p>
                    ) : null}
                  </div>
                  <span
                    title={TOOLTIPS['case.stage']}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${stageColor(view.currentCase.stage)}`}
                  >
                    <StageIcon stage={view.currentCase.stage} className="h-3.5 w-3.5" />
                    Stage {view.currentCase.stage}
                  </span>
                </div>

                {urgencyMarkers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {urgencyMarkers.map((marker) => (
                      <span
                        key={marker.label}
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${marker.className}`}
                      >
                        {marker.label}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="inline-flex items-center gap-1 opacity-60">
                    <StatusIcon status={view.currentCase.status} className="h-3.5 w-3.5" />
                    {CASE_UI_LABELS.status}: {STATUS_LABELS[view.currentCase.status]}
                  </span>
                  <span className="opacity-60" title={TOOLTIPS[`mode.${view.currentCase.mode}`]}>
                    {CASE_UI_LABELS.mode}: {MODE_LABELS[view.currentCase.mode]}
                  </span>
                  <span className="opacity-60" title={TOOLTIPS['case.deadline']}>
                    {CASE_UI_LABELS.deadline}: {view.currentCase.deadlineRemaining} week
                    {view.currentCase.deadlineRemaining === 1 ? '' : 's'}
                  </span>
                  <span className="opacity-60" title={TOOLTIPS['case.duration']}>
                    {CASE_UI_LABELS.duration}: {view.currentCase.durationWeeks} week
                    {view.currentCase.durationWeeks === 1 ? '' : 's'}
                  </span>
                  {view.currentCase.weeksRemaining !== undefined ? (
                    <span className="opacity-60" title={TOOLTIPS['case.weeksRemaining']}>
                      {CASE_UI_LABELS.remaining}: {view.currentCase.weeksRemaining} week
                      {view.currentCase.weeksRemaining === 1 ? '' : 's'}
                    </span>
                  ) : null}
                  <span className="opacity-60" title={TOOLTIPS['case.bestOdds']}>
                    {CASE_UI_LABELS.success}: {Math.round(view.bestSuccess * 100)}%
                  </span>
                </div>

                {(view.currentCase.requiredRoles?.length ?? 0) > 0 ||
                view.currentCase.requiredTags.length > 0 ||
                view.currentCase.preferredTags.length > 0 ? (
                  <div className="space-y-1 text-xs opacity-60">
                    {(view.currentCase.requiredRoles?.length ?? 0) > 0 ? (
                      <p>
                        {CASE_UI_LABELS.requiredRoles}:{' '}
                        {view.currentCase.requiredRoles
                          ?.map((role) => ROLE_COVERAGE_LABELS[role])
                          .join(', ')}
                      </p>
                    ) : null}
                    {view.currentCase.requiredTags.length > 0 ? (
                      <p>
                        {CASE_UI_LABELS.requiredTags}: {view.currentCase.requiredTags.join(', ')}
                      </p>
                    ) : null}
                    {view.currentCase.preferredTags.length > 0 ? (
                      <p>
                        {CASE_UI_LABELS.preferredTags}: {view.currentCase.preferredTags.join(', ')}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {view.assignedTeams.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm opacity-70">
                      {CASE_UI_LABELS.assigned}:{' '}
                      {view.assignedTeams.map((team) => team.name).join(', ')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {view.assignedTeams.map((team) => (
                        <button
                          key={team.id}
                          onClick={() => unassign(view.currentCase.id, team.id)}
                          className="btn btn-sm btn-ghost"
                        >
                          {CASE_UI_LABELS.removeTeam} {team.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {view.currentCase.status !== 'resolved' ? (
                  <div className="space-y-2">
                    <p className="text-sm opacity-60">
                      {view.currentCase.kind === 'raid'
                        ? CASE_UI_LABELS.assignUpToN
                            .replace('{n}', String(view.maxTeams))
                            .replace('{s}', view.maxTeams === 1 ? '' : 's')
                        : CASE_UI_LABELS.assignOneTeam}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {view.availableTeams.map(({ team, odds }) => (
                        <button
                          key={team.id}
                          onClick={() => assign(view.currentCase.id, team.id)}
                          disabled={odds.blockedByRequiredTags || odds.blockedByRequiredRoles}
                          aria-label={`Assign ${team.name}`}
                          className="btn btn-sm"
                        >
                          Assign {AGENCY_LABELS.responseUnit} {team.name} (
                          {CASE_UI_LABELS.oddsSuccessAbbr} {Math.round(odds.success * 100)}% /{' '}
                          {CASE_UI_LABELS.oddsPartialAbbr} {Math.round(odds.partial * 100)}% /{' '}
                          {CASE_UI_LABELS.oddsFailAbbr} {Math.round(odds.fail * 100)}%)
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : (
        <div
          className="panel panel-support space-y-2 p-4"
          role="region"
          aria-label="No matching cases"
        >
          <p className="text-sm font-medium">
            {filters.status === 'open'
              ? CASES_GUIDANCE.noOpenCases
              : filters.status === 'in_progress'
                ? CASES_GUIDANCE.noActiveCases
                : CASES_GUIDANCE.noResolvedCases}
          </p>
          <p className="text-sm opacity-70">{CASES_GUIDANCE.allCasesFiltered}</p>
        </div>
      )}
    </section>
  )
}

function getUrgencyMarkers(view: CaseListItemView) {
  const markers: Array<{ label: string; className: string }> = []

  if (view.isUnassigned) {
    markers.push({
      label: 'Unassigned',
      className: 'border-slate-500/40 bg-slate-500/10 text-slate-200',
    })
  }

  if (view.isCriticalStage) {
    markers.push({
      label: 'High stage',
      className: 'border-red-500/40 bg-red-500/10 text-red-200',
    })
  }

  if (view.hasDeadlineRisk) {
    markers.push({
      label: 'Deadline risk',
      className: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    })
  }

  if (view.isBlockedByRequiredRoles) {
    markers.push({
      label: 'Required-role blocked',
      className: 'border-violet-500/40 bg-violet-500/10 text-violet-200',
    })
  }

  if (view.isBlockedByRequiredTags) {
    markers.push({
      label: 'Required-tag blocked',
      className: 'border-orange-500/40 bg-orange-500/10 text-orange-200',
    })
  }

  if (view.isRaidAtCapacity) {
    markers.push({
      label: 'Raid at capacity',
      className: 'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200',
    })
  }

  return markers
}

const CASE_SORT_LABELS: Record<(typeof CASE_SORTS)[number], string> = {
  priority: 'Priority',
  deadline: 'Deadline',
  success: 'Success',
  title: 'Title',
}

function StageIcon({ stage, className }: { stage: number; className?: string }) {
  if (stage >= 4) {
    return <IconStageCritical className={className} aria-hidden="true" />
  }

  if (stage >= 3) {
    return <IconStageWarn className={className} aria-hidden="true" />
  }

  return <IconStageOk className={className} aria-hidden="true" />
}

function StatusIcon({
  status,
  className,
}: {
  status: 'open' | 'in_progress' | 'resolved'
  className?: string
}) {
  if (status === 'resolved') {
    return <IconResolved className={className} aria-hidden="true" />
  }

  if (status === 'in_progress') {
    return <IconInProgress className={className} aria-hidden="true" />
  }

  return <IconOpen className={className} aria-hidden="true" />
}

function stageColor(stage: number) {
  if (stage >= 4) {
    return 'bg-red-900/50 text-red-300'
  }

  if (stage >= 3) {
    return 'bg-orange-900/50 text-orange-300'
  }

  if (stage >= 2) {
    return 'bg-yellow-900/50 text-yellow-300'
  }

  return 'bg-green-900/50 text-green-300'
}

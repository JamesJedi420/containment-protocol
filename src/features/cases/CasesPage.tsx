import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import {
  getBestContractTeamSuggestion,
  getContractChainLabels,
  getContractFactionLabel,
  getContractMaterialLabel,
  getContractOffers,
  getContractStrategyLabel,
  getContractTeamSuggestions,
} from '../../domain/contracts'
import {
  getBestMajorIncidentPlanSuggestion,
  getMajorIncidentProvisionDefinitions,
  getMajorIncidentSelectableTeams,
  getMajorIncidentStrategyLabel,
  evaluateMajorIncidentPlan,
  type MajorIncidentEvaluation,
} from '../../domain/majorIncidentOperations'
import { getAgencyProgressionUnlockLabel } from '../../domain/agencyProgression'
import type {
  MajorIncidentProvisionType,
  MajorIncidentStrategy,
} from '../../domain/models'
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
  const { game, launchContract, launchMajorIncident, assign, unassign } = useGameStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const [compareCaseState, setCompareCaseState] = useState<Record<string, boolean>>({})
  const [majorIncidentTeamState, setMajorIncidentTeamState] = useState<Record<string, string[]>>({})
  const [majorIncidentStrategyState, setMajorIncidentStrategyState] = useState<
    Record<string, MajorIncidentStrategy>
  >({})
  const [majorIncidentProvisionState, setMajorIncidentProvisionState] = useState<
    Record<string, MajorIncidentProvisionType[]>
  >({})
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null)
  const searchParamsString = searchParams.toString()
  const filters = readCaseListFilters(searchParams)
  const normalizedSearchString = writeCaseListFilters(filters).toString()
  const querySuffix = normalizedSearchString ? `?${normalizedSearchString}` : ''
  const contractOffers = getContractOffers(game)
  const selectedContract =
    contractOffers.find((offer) => offer.id === selectedContractId) ?? contractOffers[0]
  const selectedContractSuggestions = selectedContract
    ? getContractTeamSuggestions(game, selectedContract).slice(0, 3)

  // Presentation: Add visual cues for incident/case variety in list
    : []
  const recommendedContractTeam = selectedContractSuggestions[0]

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
      <nav className="skip-links" aria-label="Cases keyboard shortcuts">
        <a href="#cases-filters" className="skip-link">
          Skip to case filters
        </a>
        <a href="#cases-results" className="skip-link">
          Skip to case results
        </a>
      </nav>

      <article
        className="panel panel-primary space-y-4"
        role="region"
        aria-label="Contract board"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide opacity-50">Weekly contracts</p>
            <h2 className="text-lg font-semibold">Mission board</h2>
            <p className="text-sm opacity-65">
              Deterministic weekly contracts that launch into the live incident queue once a team is
              committed.
            </p>
          </div>
          <p className="text-xs opacity-60">
            {contractOffers.length} channel{contractOffers.length === 1 ? '' : 's'} available
          </p>
        </div>

        {contractOffers.length > 0 ? (
          <>
            <div className="grid gap-3 lg:grid-cols-2">
              {contractOffers.map((offer) => {
                const bestTeam = getBestContractTeamSuggestion(game, offer)
                const isSelected = selectedContract?.id === offer.id
                const rewardRange = bestTeam?.rewardRange

                return (
                  <button
                    key={offer.id}
                    type="button"
                    onClick={() => setSelectedContractId(offer.id)}
                    className={`rounded border px-4 py-3 text-left transition ${
                      isSelected
                        ? 'border-sky-400/50 bg-sky-500/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{offer.name}</p>
                        <p className="text-xs uppercase tracking-wide opacity-55">
                          {getContractFactionLabel(offer)} / {getContractStrategyLabel(offer.strategyTag)}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-wide opacity-75">
                        {offer.riskLevel} risk
                      </span>
                    </div>
                    <p className="mt-2 text-sm opacity-70">{offer.description}</p>
                    <div className="mt-3 grid gap-2 text-xs md:grid-cols-3">
                      <p>
                        <span className="opacity-55">Duration:</span> {offer.durationWeeks}w
                      </p>
                      <p>
                        <span className="opacity-55">Difficulty:</span> {offer.difficulty}
                      </p>
                      <p>
                        <span className="opacity-55">Funding:</span>{' '}
                        {rewardRange
                          ? formatFundingRange(rewardRange.fundingMin, rewardRange.fundingMax)
                          : `$${offer.rewards.funding}`}
                      </p>
                    </div>
                    <p className="mt-2 text-xs opacity-65">
                      Recommended team:{' '}
                      {bestTeam
                        ? `${bestTeam.team.name} / ${bestTeam.successBand}`
                        : 'No valid team currently available'}
                    </p>
                  </button>
                )
              })}
            </div>

            {selectedContract ? (
              <div className="rounded border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide opacity-50">Selected contract</p>
                    <h3 className="text-lg font-semibold">{selectedContract.name}</h3>
                    <p className="mt-1 text-sm opacity-70">{selectedContract.description}</p>
                  </div>
                  <div className="text-right text-xs opacity-65">
                    <p>{getContractFactionLabel(selectedContract)}</p>
                    <p>{getContractStrategyLabel(selectedContract.strategyTag)}</p>
                    <p>{selectedContract.durationWeeks} week deployment</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded border border-white/10 px-3 py-2">
                    <p className="text-xs uppercase tracking-wide opacity-50">Reward range</p>
                    <p className="mt-1 text-sm font-medium">
                      {recommendedContractTeam
                        ? formatFundingRange(
                            recommendedContractTeam.rewardRange.fundingMin,
                            recommendedContractTeam.rewardRange.fundingMax
                          )
                        : `$${selectedContract.rewards.funding}`}
                    </p>
                    <p className="mt-1 text-xs opacity-65">
                      {formatContractMaterialSummary(
                        recommendedContractTeam?.rewardRange.materials ??
                          selectedContract.rewards.materials?.map((material) => ({
                            itemId: material.itemId,
                            label: getContractMaterialLabel(material),
                            quantityMin: material.quantity,
                            quantityMax: material.quantity,
                          })) ??
                          []
                      )}
                    </p>
                    {selectedContract.rewards.research?.length ? (
                      <p className="mt-1 text-xs opacity-65">
                        Research: {selectedContract.rewards.research.map((entry) => entry.label).join(', ')}
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded border border-white/10 px-3 py-2">
                    <p className="text-xs uppercase tracking-wide opacity-50">Role fit</p>
                    <p className="mt-1 text-xs opacity-70">
                      Recommended: {formatRoleList(selectedContract.requirements.recommendedClasses)}
                    </p>
                    <p className="mt-1 text-xs opacity-70">
                      Discouraged: {formatRoleList(selectedContract.requirements.discouragedClasses)}
                    </p>
                  </div>
                  <div className="rounded border border-white/10 px-3 py-2">
                    <p className="text-xs uppercase tracking-wide opacity-50">Follow-ups</p>
                    <p className="mt-1 text-xs opacity-70">
                      {formatChainList(getContractChainLabels(selectedContract))}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.2em] opacity-70">
                      Recommended Team
                    </h4>
                    {recommendedContractTeam ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() =>
                          launchContract(selectedContract.id, recommendedContractTeam.team.id)
                        }
                      >
                        Launch with {recommendedContractTeam.team.name}
                      </button>
                    ) : null}
                  </div>

                  {recommendedContractTeam ? (
                    <div className="rounded border border-sky-400/25 bg-sky-500/8 px-3 py-3">
                      <p className="font-medium">{recommendedContractTeam.team.name}</p>
                      <div className="mt-2 grid gap-2 text-sm md:grid-cols-4">
                        <p>
                          <span className="opacity-60">Success:</span>{' '}
                          {recommendedContractTeam.successBand}
                        </p>
                        <p>
                          <span className="opacity-60">Injury:</span>{' '}
                          {recommendedContractTeam.injuryRiskBand}
                        </p>
                        <p>
                          <span className="opacity-60">Death:</span>{' '}
                          {recommendedContractTeam.deathRiskBand}
                        </p>
                        <p>
                          <span className="opacity-60">Party OVR:</span>{' '}
                          {recommendedContractTeam.partyOvr}
                        </p>
                      </div>
                      <p className="mt-2 text-xs opacity-70">
                        Injury forecast:{' '}
                        {formatPercent(recommendedContractTeam.preview.injuryForecast.injuryChance)} /{' '}
                        {recommendedContractTeam.preview.injuryForecast.expectedInjuryLabel} / Death{' '}
                        {formatPercent(recommendedContractTeam.preview.injuryForecast.deathChance)}
                      </p>
                      <p className="mt-1 text-xs opacity-70">
                        Downtime {formatDowntime(recommendedContractTeam.preview.injuryForecast.expectedDowntimeWeeks)} /{' '}
                        {recommendedContractTeam.preview.injuryForecast.tempoLossLabel}
                      </p>
                      <p className="mt-1 text-xs text-amber-200/90">
                        {recommendedContractTeam.preview.injuryForecast.primaryWarning}
                      </p>
                      <p className="mt-1 text-xs opacity-65">
                        {recommendedContractTeam.preview.injuryForecast.guidance}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm opacity-60">
                      No currently available team satisfies the base case requirements for this
                      contract.
                    </p>
                  )}

                  {selectedContractSuggestions.length > 1 ? (
                    <div className="grid gap-2 md:grid-cols-3">
                      {selectedContractSuggestions.slice(1).map((suggestion) => (
                        <button
                          key={suggestion.team.id}
                          type="button"
                          className="rounded border border-white/10 px-3 py-2 text-left hover:border-white/20"
                          onClick={() => launchContract(selectedContract.id, suggestion.team.id)}
                        >
                          <p className="font-medium">{suggestion.team.name}</p>
                          <p className="text-xs opacity-65">
                            {suggestion.successBand} success / {suggestion.injuryRiskBand} injury
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm opacity-65">
            No contract channels are active this week. Advance the timeline or improve faction
            standing to open more work.
          </p>
        )}
      </article>

      <article
        id="cases-filters"
        className="panel panel-primary space-y-4"
        role="region"
        aria-label="Case filters"
      >
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
            containerClassName="form-row form-row-compact min-w-[16rem] flex-1"
            labelClassName="form-label opacity-85"
            inputClassName="form-input"
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
            containerClassName="form-row form-row-compact"
            labelClassName="form-label opacity-85"
            selectClassName="form-select"
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
            containerClassName="form-row form-row-compact"
            labelClassName="form-label opacity-85"
            selectClassName="form-select"
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
            containerClassName="form-row form-row-compact"
            labelClassName="form-label opacity-85"
            selectClassName="form-select"
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
            containerClassName="form-row form-row-compact"
            labelClassName="form-label opacity-85"
            selectClassName="form-select"
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
        <ul id="cases-results" className="space-y-3" aria-label="Case results">
          {cases.map((view) => {
            const detailHref = `${APP_ROUTES.caseDetail(view.currentCase.id)}${querySuffix}`
            const intelHref = APP_ROUTES.intelDetail(view.currentCase.templateId)
            const urgencyMarkers = getUrgencyMarkers(view)
            const incidentStrategy =
              majorIncidentStrategyState[view.currentCase.id] ??
              view.currentCase.majorIncident?.strategy ??
              'balanced'
            const incidentProvisions =
              majorIncidentProvisionState[view.currentCase.id] ??
              view.currentCase.majorIncident?.provisions ??
              []
            const selectedIncidentTeamIds =
              majorIncidentTeamState[view.currentCase.id] ??
              (view.currentCase.majorIncident ? view.currentCase.assignedTeamIds : [])
            const majorIncidentPlan = view.isMajorIncident
              ? evaluateMajorIncidentPlan(game, view.currentCase, selectedIncidentTeamIds, {
                  strategy: incidentStrategy,
                  provisions: incidentProvisions,
                })
              : null
            const recommendedIncidentPlan = view.isMajorIncident
              ? getBestMajorIncidentPlanSuggestion(game, view.currentCase, {
                  strategy: incidentStrategy,
                  provisions: incidentProvisions,
                })
              : null
            const majorIncidentProvisionDefs = view.isMajorIncident
              ? getMajorIncidentProvisionDefinitions(game)
              : []
            const selectableIncidentTeams = view.isMajorIncident
              ? getMajorIncidentSelectableTeams(game, view.currentCase)
              : []
            const recommendation = view.isMajorIncident
              ? getMajorIncidentRecommendation(majorIncidentPlan, recommendedIncidentPlan)
              : getCaseRecommendation(view)
            const bestEligibleSuccess = getBestEligibleSuccess(view)
            const topTwoOptions = getTopTwoEligibleOptions(view)
            const compareOpen = compareCaseState[view.currentCase.id] ?? false
            const comparePanelId = `case-compare-${view.currentCase.id}`

            return (
              <li key={view.currentCase.id} className="panel panel-support space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">
                      <Link to={detailHref} className="hover:underline focus-ring">
                        {view.currentCase.title}
                      </Link>
                    </p>
                    <p className="text-xs uppercase tracking-wide opacity-50">
                      <Link to={intelHref} className="hover:underline focus-ring">
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

                {recommendation ? (
                  <div className="rounded border border-sky-400/25 bg-sky-500/8 px-3 py-2">
                    <p className="text-xs uppercase tracking-[0.24em] opacity-60">
                      Recommended action
                    </p>
                    <p className="mt-1 text-sm font-medium">{recommendation.title}</p>
                    <p className="text-xs opacity-70">{recommendation.detail}</p>
                  </div>
                ) : null}

                {!view.isMajorIncident && topTwoOptions.length === 2 ? (
                  <div className="space-y-2">
                    {compareOpen ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        aria-expanded="true"
                        aria-controls={comparePanelId}
                        onClick={() =>
                          setCompareCaseState((current) => ({
                            ...current,
                            [view.currentCase.id]: false,
                          }))
                        }
                      >
                        Hide comparison
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        aria-expanded="false"
                        aria-controls={comparePanelId}
                        onClick={() =>
                          setCompareCaseState((current) => ({
                            ...current,
                            [view.currentCase.id]: true,
                          }))
                        }
                      >
                        Compare top 2
                      </button>
                    )}

                    {compareOpen ? (
                      <div
                        id={comparePanelId}
                        role="region"
                        aria-label={`Top team comparison for ${view.currentCase.title}`}
                        className="rounded border border-white/10 bg-white/5 px-3 py-2 text-xs opacity-80"
                      >
                        <p className="font-medium">
                          {topTwoOptions[0]!.team.name} vs {topTwoOptions[1]!.team.name}
                        </p>
                        <p>
                          Success delta: +
                          {Math.round((topTwoOptions[0]!.odds.success - topTwoOptions[1]!.odds.success) * 100)}%
                        </p>
                        <p>
                          Fail delta: -
                          {Math.round((topTwoOptions[1]!.odds.fail - topTwoOptions[0]!.odds.fail) * 100)}%
                        </p>
                      </div>
                    ) : null}
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
                    {view.isMajorIncident && view.currentCase.status === 'in_progress' ? (
                      <p className="text-xs opacity-60">
                        Major incident teams are locked until the operation resolves.
                      </p>
                    ) : (
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
                    )}
                  </div>
                ) : null}

                {view.currentCase.status !== 'resolved' ? (
                  view.isMajorIncident ? (
                    <MajorIncidentPlanner
                      currentCase={view.currentCase}
                      plan={majorIncidentPlan}
                      recommendedPlan={recommendedIncidentPlan}
                      selectableTeams={selectableIncidentTeams}
                      provisionDefinitions={majorIncidentProvisionDefs}
                      selectedTeamIds={selectedIncidentTeamIds}
                      strategy={incidentStrategy}
                      provisions={incidentProvisions}
                      onToggleTeam={(teamId) =>
                        setMajorIncidentTeamState((current) => {
                          const currentIds = current[view.currentCase.id] ?? []
                          const nextIds = currentIds.includes(teamId)
                            ? currentIds.filter((id) => id !== teamId)
                            : [...currentIds, teamId]

                          return {
                            ...current,
                            [view.currentCase.id]: nextIds,
                          }
                        })
                      }
                      onUseRecommended={() =>
                        setMajorIncidentTeamState((current) => ({
                          ...current,
                          [view.currentCase.id]:
                            recommendedIncidentPlan?.selectedTeams.map((team) => team.team.id) ?? [],
                        }))
                      }
                      onStrategyChange={(nextStrategy) =>
                        setMajorIncidentStrategyState((current) => ({
                          ...current,
                          [view.currentCase.id]: nextStrategy,
                        }))
                      }
                      onToggleProvision={(provision) =>
                        setMajorIncidentProvisionState((current) => {
                          const currentProvisions =
                            current[view.currentCase.id] ??
                            view.currentCase.majorIncident?.provisions ??
                            []
                          const nextProvisions = currentProvisions.includes(provision)
                            ? currentProvisions.filter((entry) => entry !== provision)
                            : [...currentProvisions, provision]

                          return {
                            ...current,
                            [view.currentCase.id]: nextProvisions,
                          }
                        })
                      }
                      onLaunch={() =>
                        launchMajorIncident(
                          view.currentCase.id,
                          selectedIncidentTeamIds,
                          incidentStrategy,
                          incidentProvisions
                        )
                      }
                      onLaunchRecommended={() => {
                        const recommendedIds =
                          recommendedIncidentPlan?.selectedTeams.map((team) => team.team.id) ?? []
                        launchMajorIncident(
                          view.currentCase.id,
                          recommendedIds,
                          incidentStrategy,
                          incidentProvisions
                        )
                      }}
                    />
                  ) : (
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
                          <div key={team.id} className="space-y-1">
                            <button
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
                            {!odds.blockedByRequiredTags && !odds.blockedByRequiredRoles ? (
                              <p className="text-xs opacity-70">
                                Confidence: {getDecisionConfidenceLabel(odds.success, odds.fail)}
                              </p>
                            ) : null}
                            <p className="text-xs opacity-60">
                              Commit clarity: Reversible before weekly resolution.
                            </p>
                            {bestEligibleSuccess !== null &&
                            !odds.blockedByRequiredTags &&
                            !odds.blockedByRequiredRoles &&
                            bestEligibleSuccess - odds.success >= 0.15 ? (
                              <p className="text-xs text-amber-200/90">
                                Likely dominated:{' '}
                                {Math.round((bestEligibleSuccess - odds.success) * 100)}% below best
                                current option.
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : (
        <div
          id="cases-results"
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
          {normalizedSearchString.length > 0 ? (
            <div>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}
              >
                Clear filters
              </button>
            </div>
          ) : null}
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

function getBestEligibleSuccess(view: CaseListItemView) {
  const eligible = view.availableTeams.filter(
    ({ odds }) => !odds.blockedByRequiredTags && !odds.blockedByRequiredRoles
  )

  if (eligible.length === 0) {
    return null
  }

  return Math.max(...eligible.map(({ odds }) => odds.success))
}

function getTopTwoEligibleOptions(view: CaseListItemView) {
  return view.availableTeams
    .filter(({ odds }) => !odds.blockedByRequiredTags && !odds.blockedByRequiredRoles)
    .sort((left, right) => right.odds.success - left.odds.success)
    .slice(0, 2)
}

function getDecisionConfidenceLabel(success: number, fail: number) {
  const spread = success - fail

  if (success >= 0.7 && spread >= 0.35) {
    return 'High'
  }

  if (success >= 0.45 && spread >= 0.1) {
    return 'Medium'
  }

  return 'Low'
}

function getCaseRecommendation(view: CaseListItemView) {
  if (view.currentCase.status === 'resolved') {
    return null
  }

  const eligible = view.availableTeams.filter(
    ({ odds }) => !odds.blockedByRequiredTags && !odds.blockedByRequiredRoles
  )

  if (eligible.length === 0) {
    if (view.isBlockedByRequiredRoles || view.isBlockedByRequiredTags) {
      return {
        title: 'Address blockers first',
        detail: 'No team currently satisfies this case’s required roles/tags.',
      }
    }

    return {
      title: 'Restore availability',
      detail: 'No eligible response units are currently available to assign.',
    }
  }

  const best = eligible.reduce((top, candidate) =>
    candidate.odds.success > top.odds.success ? candidate : top
  )

  const rationale: string[] = [`Best current success: ${Math.round(best.odds.success * 100)}%`]

  if (view.hasDeadlineRisk) {
    rationale.push('deadline risk active')
  }

  if (view.isCriticalStage) {
    rationale.push('high-stage pressure')
  }

  return {
    title: `Assign ${AGENCY_LABELS.responseUnit} ${best.team.name}`,
    detail: rationale.join(' · '),
  }
}

function getMajorIncidentRecommendation(
  plan: MajorIncidentEvaluation | null,
  recommendedPlan: MajorIncidentEvaluation | null
) {
  if (recommendedPlan) {
    return {
      title: `Launch ${recommendedPlan.selectedTeams.map((team) => team.team.name).join(' / ')}`,
      detail: `Weakest-team success band: ${recommendedPlan.successBand} · injury ${recommendedPlan.injuryRiskBand}.`,
    }
  }

  if (plan?.issues.length) {
    return {
      title: 'Assemble the full strike package',
      detail: plan.issues[0]!,
    }
  }

  return {
    title: 'Build incident coverage',
    detail: 'Major incidents need a fully coordinated multi-team launch before they can begin.',
  }
}

function formatMajorIncidentRewardUpside(plan: MajorIncidentEvaluation) {
  return [
    plan.rewardPreview.progressionUnlocks.length > 0
      ? `Progression: ${plan.rewardPreview.progressionUnlocks
          .slice(0, 2)
          .map((unlockId) => getAgencyProgressionUnlockLabel(unlockId))
          .join(', ')}`
      : '',
    plan.rewardPreview.materials.length > 0
      ? `Salvage: ${formatContractMaterialSummary(
          plan.rewardPreview.materials.map((material) => ({
            label: material.label,
            quantityMin: material.quantity,
            quantityMax: material.quantity,
          }))
        )}`
      : '',
    plan.rewardPreview.gear.length > 0
      ? `Gear: ${formatRewardItemSummary(plan.rewardPreview.gear)}`
      : '',
  ]
    .filter((value) => value.length > 0)
    .slice(0, 2)
    .join(' / ') || 'No major reward swing is previewed yet.'
}

function formatMajorIncidentOperationalCost(plan: MajorIncidentEvaluation) {
  return `${plan.injuryForecast.expectedInjuryLabel} / Downtime ${formatDowntime(
    plan.injuryForecast.expectedDowntimeWeeks
  )} / ${plan.injuryForecast.tempoLossLabel}.`
}

function formatMajorIncidentNetRead(plan: MajorIncidentEvaluation) {
  if (!plan.valid || plan.missingTeamCount > 0) {
    return 'Net read: hold. The reward preview is not worth acting on until the full strike package is assembled.'
  }

  if (plan.weakestTeamWarning || plan.successBand === 'Low' || plan.successBand === 'Very Low') {
    return 'Net read: currently negative. The weakest-team bottleneck makes the staffing and recovery bill hard to justify.'
  }

  if (
    (plan.successBand === 'High' || plan.successBand === 'Very High') &&
    (plan.injuryRiskBand === 'Low' || plan.injuryRiskBand === 'Very Low') &&
    (plan.deathRiskBand === 'Low' || plan.deathRiskBand === 'Very Low')
  ) {
    return 'Net read: favorable. The reward preview is likely to outrun the recovery drag if reserve coverage can absorb the downtime.'
  }

  return 'Net read: mixed. The reward upside is real, but recovery drag and readiness loss still need room in the roster.'
}

function MajorIncidentPlanner({
  currentCase,
  plan,
  recommendedPlan,
  selectableTeams,
  provisionDefinitions,
  selectedTeamIds,
  strategy,
  provisions,
  onToggleTeam,
  onUseRecommended,
  onStrategyChange,
  onToggleProvision,
  onLaunch,
  onLaunchRecommended,
}: {
  currentCase: CaseListItemView['currentCase']
  plan: MajorIncidentEvaluation | null
  recommendedPlan: MajorIncidentEvaluation | null
  selectableTeams: ReturnType<typeof getMajorIncidentSelectableTeams>
  provisionDefinitions: ReturnType<typeof getMajorIncidentProvisionDefinitions>
  selectedTeamIds: string[]
  strategy: MajorIncidentStrategy
  provisions: MajorIncidentProvisionType[]
  onToggleTeam: (teamId: string) => void
  onUseRecommended: () => void
  onStrategyChange: (strategy: MajorIncidentStrategy) => void
  onToggleProvision: (provision: MajorIncidentProvisionType) => void
  onLaunch: () => void
  onLaunchRecommended: () => void
}) {
  const activePlan = plan ?? recommendedPlan
  const requiredTeams = activePlan?.requiredTeams ?? currentCase.majorIncident?.requiredTeams ?? 0

  return (
    <div className="space-y-3 rounded border border-amber-400/20 bg-amber-500/5 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] opacity-60">Major Incident Planner</p>
          <p className="text-sm opacity-75">
            Requires {requiredTeams} team{requiredTeams === 1 ? '' : 's'} before launch. Weakest
            team power controls the operation.
          </p>
        </div>
        {activePlan?.runtime.rumor ? (
          <p className="max-w-xl text-xs opacity-70">Rumor: {activePlan.runtime.rumor.description}</p>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <div className="rounded border border-white/10 px-3 py-2">
          <p className="text-xs uppercase tracking-wide opacity-50">Difficulty</p>
          <p className="mt-1 text-sm font-medium">{activePlan?.difficulty ?? 'Locked'}</p>
        </div>
        <div className="rounded border border-white/10 px-3 py-2">
          <p className="text-xs uppercase tracking-wide opacity-50">Duration</p>
          <p className="mt-1 text-sm font-medium">
            {activePlan?.runtime.durationWeeks ?? currentCase.durationWeeks}w
          </p>
        </div>
        <div className="rounded border border-white/10 px-3 py-2">
          <p className="text-xs uppercase tracking-wide opacity-50">Risk</p>
          <p className="mt-1 text-sm font-medium">
            {activePlan?.runtime.riskLevel ?? 'unknown'}
          </p>
        </div>
        <div className="rounded border border-white/10 px-3 py-2">
          <p className="text-xs uppercase tracking-wide opacity-50">Reward Preview</p>
          {activePlan ? (
            <div className="mt-1 space-y-1 text-xs opacity-75">
              <p>
                Materials:{' '}
                {formatContractMaterialSummary(
                  activePlan.rewardPreview.materials.map((material) => ({
                    label: material.label,
                    quantityMin: material.quantity,
                    quantityMax: material.quantity,
                  }))
                )}
              </p>
              <p>Gear: {formatRewardItemSummary(activePlan.rewardPreview.gear)}</p>
              <p>
                Progression:{' '}
                {activePlan.rewardPreview.progressionUnlocks.length > 0
                  ? activePlan.rewardPreview.progressionUnlocks
                      .map((unlockId) => getAgencyProgressionUnlockLabel(unlockId))
                      .join(', ')
                  : 'No unlocks previewed'}
              </p>
            </div>
          ) : (
            <p className="mt-1 text-xs opacity-75">Select a valid plan</p>
          )}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <label className="form-row form-row-compact">
          <span className="form-label opacity-85">Strategy</span>
          <select
            className="form-select"
            value={strategy}
            onChange={(event) => onStrategyChange(event.target.value as MajorIncidentStrategy)}
          >
            {(['aggressive', 'balanced', 'cautious'] as const).map((entry) => (
              <option key={entry} value={entry}>
                {getMajorIncidentStrategyLabel(entry)}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-2 rounded border border-white/10 px-3 py-2">
          <p className="text-xs uppercase tracking-wide opacity-50">Provisioning</p>
          <div className="flex flex-wrap gap-2">
            {provisionDefinitions.map((definition) => {
              const selected = provisions.includes(definition.type)
              return (
                <button
                  key={definition.type}
                  type="button"
                  className={selected ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-ghost'}
                  disabled={!definition.available && !selected}
                  onClick={() => onToggleProvision(definition.type)}
                  title={`${definition.description} Stock ${definition.stockOnHand}/${definition.quantity}.`}
                >
                  {definition.label} ({definition.stockOnHand}/{definition.quantity})
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {recommendedPlan ? (
        <div className="rounded border border-sky-400/25 bg-sky-500/8 px-3 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide opacity-55">Recommended Teams</p>
              <p className="mt-1 font-medium">
                {recommendedPlan.selectedTeams.map((team) => team.team.name).join(' / ')}
              </p>
              <p className="text-xs opacity-70">
                {recommendedPlan.successBand} success / {recommendedPlan.injuryRiskBand} injury /{' '}
                {recommendedPlan.deathRiskBand} death
              </p>
              <p className="mt-1 text-xs opacity-70">
                {recommendedPlan.injuryForecast.expectedInjuryLabel} / Downtime{' '}
                {formatDowntime(recommendedPlan.injuryForecast.expectedDowntimeWeeks)} /{' '}
                {recommendedPlan.injuryForecast.tempoLossLabel}
              </p>
              <p className="mt-1 text-xs text-amber-200/90">
                {recommendedPlan.injuryForecast.primaryWarning}
              </p>
              <div className="mt-2 rounded border border-white/10 bg-black/10 px-3 py-2 text-xs opacity-80">
                <p>
                  <span className="font-medium">Reward upside:</span>{' '}
                  {formatMajorIncidentRewardUpside(recommendedPlan)}
                </p>
                <p className="mt-1">
                  <span className="font-medium">Operational cost:</span>{' '}
                  {formatMajorIncidentOperationalCost(recommendedPlan)}
                </p>
                <p className="mt-1">{formatMajorIncidentNetRead(recommendedPlan)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-sm btn-ghost" onClick={onUseRecommended}>
                Use recommended
              </button>
              <button type="button" className="btn btn-sm btn-primary" onClick={onLaunchRecommended}>
                Launch recommended
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide opacity-55">Team Selection</p>
        <div className="flex flex-wrap gap-2">
          {selectableTeams.map((team) => (
            <button
              key={team.id}
              type="button"
              className={selectedTeamIds.includes(team.id) ? 'btn btn-sm btn-primary' : 'btn btn-sm'}
              onClick={() => onToggleTeam(team.id)}
            >
              {team.name}
            </button>
          ))}
        </div>
      </div>

      {activePlan ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded border border-white/10 px-3 py-3">
            <p className="text-xs uppercase tracking-wide opacity-50">Selected Team OVR</p>
            <ul className="mt-2 space-y-1 text-sm opacity-75">
              {activePlan.selectedTeams.map((team) => (
                <li key={team.team.id}>
                  {team.team.name}: incident {team.incidentOvr} / overall {team.overallOvr}
                </li>
              ))}
            </ul>
            {activePlan.weakestTeamWarning ? (
              <p className="mt-2 text-xs text-amber-200/90">{activePlan.weakestTeamWarning}</p>
            ) : null}
          </div>

          <div className="rounded border border-white/10 px-3 py-3">
            <p className="text-xs uppercase tracking-wide opacity-50">Outcome Projection</p>
            <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
              <p>Success: {activePlan.successBand}</p>
              <p>Injury: {activePlan.injuryRiskBand}</p>
              <p>Death: {activePlan.deathRiskBand}</p>
              <p>Weakest-power gate: {activePlan.effectiveIncidentPower}</p>
            </div>
            <p className="mt-2 text-xs opacity-70">
              {activePlan.injuryForecast.expectedInjuryLabel} / Downtime{' '}
              {formatDowntime(activePlan.injuryForecast.expectedDowntimeWeeks)} /{' '}
              {activePlan.injuryForecast.tempoLossLabel}
            </p>
            <p className="mt-1 text-xs text-amber-200/90">
              {activePlan.injuryForecast.primaryWarning}
            </p>
            <p className="mt-1 text-xs opacity-65">{activePlan.injuryForecast.guidance}</p>
            <div className="mt-2 rounded border border-white/10 bg-black/10 px-3 py-2 text-xs opacity-80">
              <p>
                <span className="font-medium">Reward upside:</span>{' '}
                {formatMajorIncidentRewardUpside(activePlan)}
              </p>
              <p className="mt-1">
                <span className="font-medium">Operational cost:</span>{' '}
                {formatMajorIncidentOperationalCost(activePlan)}
              </p>
              <p className="mt-1">{formatMajorIncidentNetRead(activePlan)}</p>
            </div>
            {activePlan.issues.length > 0 ? (
              <p className="mt-2 text-xs text-amber-200/90">{activePlan.issues[0]}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={!plan?.valid}
          onClick={onLaunch}
        >
          Launch major incident
        </button>
      </div>
    </div>
  )
}

function formatRoleList(roles: string[]) {
  if (roles.length === 0) {
    return 'None'
  }

  return roles.map((role) => role.replace(/_/g, ' ')).join(', ')
}

function formatFundingRange(min: number, max: number) {
  return min === max ? `$${max}` : `$${min}-$${max}`
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function formatDowntime(value: number) {
  return `${value.toFixed(1)} agent-weeks`
}

function formatContractMaterialSummary(
  materials: Array<{ label: string; quantityMin: number; quantityMax: number }>
) {
  if (materials.length === 0) {
    return 'No material drops'
  }

  return materials
    .map((material) =>
      material.quantityMin === material.quantityMax
        ? `${material.label} x${material.quantityMax}`
        : `${material.label} x${material.quantityMin}-${material.quantityMax}`
    )
    .join(', ')
}

function formatRewardItemSummary(items: Array<{ label: string; quantity?: number }>) {
  if (items.length === 0) {
    return 'No gear previewed'
  }

  return items
    .map((item) => `${item.label}${(item.quantity ?? 1) > 1 ? ` x${item.quantity}` : ''}`)
    .join(', ')
}

function formatChainList(entries: Array<{ id: string; label: string }>) {
  if (entries.length === 0) {
    return 'No direct follow-up contract'
  }

  return entries.map((entry) => entry.label).join(', ')
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

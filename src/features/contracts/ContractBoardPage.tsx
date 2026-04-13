import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import {
  getContractBoardView,
  type ContractBoardFilterId,
  type ContractBoardTone,
} from './contractBoardView'

function toneSurfaceClass(tone: ContractBoardTone) {
  if (tone === 'danger') return 'border-red-400/30 bg-red-500/8'
  if (tone === 'warning') return 'border-amber-400/30 bg-amber-500/8'
  if (tone === 'info') return 'border-cyan-400/30 bg-cyan-500/8'
  return 'border-white/10 bg-white/5'
}

function toneSelectedSurfaceClass(tone: ContractBoardTone) {
  if (tone === 'danger') return 'border-red-300/45 bg-red-500/12 ring-1 ring-red-300/20'
  if (tone === 'warning') return 'border-amber-300/45 bg-amber-500/12 ring-1 ring-amber-300/20'
  if (tone === 'info') return 'border-cyan-300/45 bg-cyan-500/12 ring-1 ring-cyan-300/20'
  return 'border-white/20 bg-white/8 ring-1 ring-white/10'
}

function toneChipClass(tone: ContractBoardTone) {
  if (tone === 'danger') return 'border-red-400/35 bg-red-500/10 text-red-200'
  if (tone === 'warning') return 'border-amber-400/35 bg-amber-500/10 text-amber-200'
  if (tone === 'info') return 'border-cyan-400/35 bg-cyan-500/10 text-cyan-100'
  return 'border-white/10 bg-white/5 text-white/80'
}

export default function ContractBoardPage() {
  const { game, launchContract } = useGameStore()
  const [filter, setFilter] = useState<ContractBoardFilterId>('all')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const view = useMemo(
    () => getContractBoardView(game, { filter, selectedItemId }),
    [filter, game, selectedItemId]
  )
  const selectedDetail = view.selectedDetail

  return (
    <section className="space-y-4" aria-label="Contract board">
      <header className="panel panel-primary space-y-4" role="region" aria-label="Contract board overview">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50">
              Player-facing contract board
            </p>
            <h2 className="text-xl font-semibold">Contract Board</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {view.boardSummary && /pressure|escalat(e|ion)|danger|week 7|week 8|compounding/i.test(view.boardSummary) && (
                <span className="rounded-full border border-red-400/35 bg-red-500/10 text-red-200 px-2 py-0.5 text-[13px] font-bold tracking-wide shadow-sm">Compounding Pressure</span>
              )}
              {view.factionLabel && (
                <span className="rounded-full border border-cyan-400/35 bg-cyan-500/10 text-cyan-100 px-2 py-0.5 text-[13px] font-bold tracking-wide shadow-sm">{view.factionLabel}</span>
              )}
              {view.riskLabel && (
                <span className="rounded-full border border-amber-400/35 bg-amber-500/10 text-amber-200 px-2 py-0.5 text-[13px] font-bold tracking-wide shadow-sm">{view.riskLabel}</span>
              )}
              {view.rewardLabel && (
                <span className="rounded-full border border-emerald-400/35 bg-emerald-500/10 text-emerald-100 px-2 py-0.5 text-[13px] font-bold tracking-wide shadow-sm">{view.rewardLabel}</span>
              )}
              <span className="font-semibold text-base text-amber-100/90 tracking-wide">{view.boardSummary}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={APP_ROUTES.cases} className="btn btn-sm btn-ghost">
              Open case queue
            </Link>
            <Link to={APP_ROUTES.teams} className="btn btn-sm btn-ghost">
              Open teams
            </Link>
            <Link to={APP_ROUTES.report} className="btn btn-sm btn-ghost">
              Weekly reports
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded border-2 border-cyan-400/60 bg-cyan-500/10 px-3 py-3 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-200">Live channels</p>
            <p className="mt-2 text-3xl font-extrabold flex items-center gap-2 text-cyan-100 drop-shadow-sm">{view.availableCount}</p>
          </div>
          <div className="rounded border-2 border-amber-400/60 bg-amber-500/10 px-3 py-3 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-200">Blocked follow-ups</p>
            <p className="mt-2 text-3xl font-extrabold flex items-center gap-2 text-amber-100 drop-shadow-sm">{view.lockedCount}</p>
          </div>
          <div className="rounded border-2 border-white/30 bg-white/10 px-3 py-3 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/80">Already in field</p>
            <p className="mt-2 text-3xl font-extrabold text-white/90 drop-shadow-sm">{view.activeCount}</p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(260px,0.95fr)_minmax(0,1.2fr)_minmax(300px,0.95fr)]">
        <aside className="panel space-y-4" aria-label="Contract list">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Contract list</h3>
              <p className="text-xs uppercase tracking-[0.18em] opacity-55">
                {view.items.length} shown
              </p>
            </div>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Contract board filters">
              {view.filters.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === entry.id ? 'true' : 'false'}
                  onClick={() => setFilter(entry.id)}
                  className={filter === entry.id ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-ghost'}
                >
                  {entry.label} ({entry.count})
                </button>
              ))}
            </div>
          </div>

          {view.items.length > 0 ? (
            <div className="space-y-2" data-testid="contract-board-list">
              {view.items.map((item) => {
                const selected = item.id === view.selectedItemId

                return (
                  <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedItemId(item.id)}
                  data-contract-tone={item.tone}
                  className={`w-full rounded border px-3 py-3 text-left transition ${
                      selected
                        ? toneSelectedSurfaceClass(item.tone)
                        : `${toneSurfaceClass(item.tone)} hover:bg-white/10`
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium flex items-center gap-2">
                          {item.title}
                          {/* Faction badge if present in subtitle */}
                          {item.subtitle && (
                            <span className="rounded-full border border-cyan-400/35 bg-cyan-500/10 text-cyan-100 px-2 py-0.5 text-[10px] ml-1">
                              {item.subtitle}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass(item.priorityTone)}`}>{item.priorityLabel}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass(item.tone)}`}>{item.availabilityLabel}</span>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1.3fr)_repeat(2,minmax(0,0.8fr))]">
                      <div className="rounded border border-white/10 bg-black/15 px-2.5 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-55">{item.rewardLabel}</p>
                        <p className="mt-1 text-sm font-semibold">{item.rewardHeadline}</p>
                      </div>
                      <div className="rounded border border-white/10 bg-black/10 px-2.5 py-2 text-xs opacity-75">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-55">Duration</p>
                        <p className="mt-1">{item.durationLabel}</p>
                      </div>
                      <div className="rounded border border-white/10 bg-black/10 px-2.5 py-2 text-xs opacity-75">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-55 flex items-center gap-1">
                          Risk
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] ${toneChipClass(item.tone)}`}>{item.riskLabel}</span>
                        </p>
                      </div>
                    </div>
                    {item.blockerSummary ? (
                      <p className={`mt-2 text-xs ${item.tone === 'danger' ? 'text-red-100/85' : 'opacity-70'}`}>
                        {item.blockerSummary}
                      </p>
                    ) : null}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="text-sm opacity-60">
              No contract channels match the current filter. Advance the week or switch filters to
              review the full board posture.
            </p>
          )}
        </aside>

        <div className="space-y-4">
          <section className="panel space-y-4" aria-label="Selected contract detail" data-testid="contract-board-detail">
            {view.selectedDetail ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.24em] opacity-50">Selected contract</p>
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      {view.selectedDetail.title}
                      {view.selectedDetail.subtitle && (
                        <span
                          aria-hidden="true"
                          className="rounded-full border border-cyan-400/35 bg-cyan-500/10 text-cyan-100 px-2 py-0.5 text-[11px] ml-1"
                        >
                          {view.selectedDetail.subtitle}
                        </span>
                      )}
                    </h3>
                    <p className="text-sm opacity-65">{view.selectedDetail.subtitle}</p>
                    <div className="flex items-center gap-2">
                      {view.selectedDetail.description && /pressure|escalat(e|ion)|danger|week 7|week 8|compounding/i.test(view.selectedDetail.description) && (
                        <span className="rounded-full border border-red-400/35 bg-red-500/10 text-red-200 px-2 py-0.5 text-[11px] font-bold">Compounding Pressure</span>
                      )}
                      <p className="text-sm opacity-80">{view.selectedDetail.description}</p>
                    </div>
                    <p className="text-xs opacity-60">{view.selectedDetail.prioritySummary}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass(view.selectedDetail.priorityTone)}`}>{view.selectedDetail.priorityLabel}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass(view.selectedDetail.availabilityTone)}`}>{view.selectedDetail.availabilityLabel}</span>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px]">{view.selectedDetail.durationLabel}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass(view.selectedDetail.availabilityTone)}`}>{view.selectedDetail.riskLabel}</span>
                  </div>
                </div>

                <div className="grid gap-3 xl:grid-cols-3">
                  <article className="rounded border border-white/10 bg-white/5 px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.18em] opacity-70">
                        Reward framing
                      </h4>
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px]">
                        {view.selectedDetail.rewardLabel}
                      </span>
                    </div>
                    <p className="mt-2 text-xl font-semibold">{view.selectedDetail.rewardHeadline}</p>
                    <ul className="mt-3 space-y-2 text-sm opacity-75">
                      {view.selectedDetail.rewardDetails.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  </article>

                  <article className="rounded border border-white/10 bg-white/5 px-3 py-3">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.18em] opacity-70">
                      Faction context
                    </h4>
                    <p className="mt-2 text-sm opacity-80">{view.selectedDetail.factionSummary}</p>
                    <div className="mt-3 rounded border border-white/10 bg-black/10 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-65">
                        Known faction effects
                      </p>
                      <p className="mt-1 text-sm opacity-80">
                        {view.selectedDetail.factionModifierSummary}
                      </p>
                      <p className="mt-2 text-sm opacity-70">
                        {view.selectedDetail.factionHiddenSummary}
                      </p>
                    </div>
                    {view.selectedDetail.factionImpactSummary ? (
                      <div className="mt-3 rounded border border-cyan-400/25 bg-cyan-500/8 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-65">
                          Contract feedback
                        </p>
                        <p className="mt-1 text-sm opacity-85">{view.selectedDetail.factionImpactSummary}</p>
                      </div>
                    ) : null}
                    <ul className="mt-3 space-y-2 text-sm opacity-75">
                      {selectedDetail!.factionDetails
                        .filter((detail) => detail !== selectedDetail!.factionHiddenSummary)
                        .map((detail) => (
                          <li key={detail}>{detail}</li>
                        ))}
                    </ul>
                  </article>

                  <article className="rounded border border-white/10 bg-white/5 px-3 py-3">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.18em] opacity-70">
                      Mission context
                    </h4>
                    <ul className="mt-3 space-y-2 text-sm opacity-75">
                      {view.selectedDetail.missionContext.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  </article>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <article className="rounded border border-white/10 bg-white/5 px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.18em] opacity-70">
                        Routing summary
                      </h4>
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px]">
                        {view.selectedDetail.routingFactorLabel}
                      </span>
                    </div>
                    <p className="mt-2 text-sm opacity-80">{view.selectedDetail.routingSummary}</p>
                    <div className="mt-3 rounded border border-cyan-400/20 bg-cyan-500/8 px-3 py-3">
                      {view.selectedDetail.intelSummary && /recon plateau|diminish|no new|few new|repeat/i.test(view.selectedDetail.intelSummary) && (
                        <span className="rounded-full border border-amber-400/35 bg-amber-500/10 text-amber-200 px-2 py-0.5 text-[11px] font-bold mr-2">Recon Plateau</span>
                      )}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-60 flex items-center gap-1">
                          Intel posture
                          <span className="rounded-full border border-cyan-400/35 bg-cyan-500/10 text-cyan-100 px-2 py-0.5 text-[10px] ml-1">{view.selectedDetail.intelLabel}</span>
                        </p>
                      </div>
                      <p className="mt-2 text-sm opacity-80">{view.selectedDetail.intelSummary}</p>
                      <div className="mt-3 space-y-2 text-sm opacity-75">
                        <p><span className="font-medium">Known now:</span> {view.selectedDetail.intelKnownSummary}</p>
                        <p>
                          <span className="font-medium">Uncertain:</span>
                          {!(view.selectedDetail.intelUncertaintySummary &&
                            view.selectedDetail.intelSummary &&
                            view.selectedDetail.intelSummary.includes('No live field packet') &&
                            view.selectedDetail.intelUncertaintySummary.includes('No live field packet')) &&
                            view.selectedDetail.intelUncertaintySummary
                          }
                        </p>
                        <p><span className="font-medium">Next step:</span> {view.selectedDetail.intelNextStepSummary}</p>
                      </div>
                    </div>
                  </article>

                  <article className="rounded border border-white/10 bg-white/5 px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.18em] opacity-70">
                        Pressure context
                      </h4>
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px]">
                        Campaign
                      </span>
                    </div>
                    <p className="mt-2 text-sm opacity-80">{view.selectedDetail.pressureSummary}</p>
                  </article>
                </div>
              </>
            ) : (
              <p className="text-sm opacity-60">
                No contract is currently selected. Choose a board entry to inspect its reward and
                risk posture.
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="panel space-y-4" aria-label="Readiness and action summary">
            {selectedDetail ? (
              <>
                <div className={`rounded border px-3 py-3 ${toneSurfaceClass(selectedDetail.availabilityTone)}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">Readiness / blockers / actions</h3>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass(selectedDetail.availabilityTone)}`}>
                      {selectedDetail.readinessFactorLabel}
                    </span>
                  </div>
                  <p className="mt-3 text-sm opacity-85">{selectedDetail.readinessSummary}</p>
                </div>

                <article className="rounded border border-white/10 bg-white/5 px-3 py-3">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em] opacity-70">
                    Blocking and risk notes
                  </h4>
                  <p className="mt-2 text-sm opacity-80">{selectedDetail.blockerSummary}</p>
                  <ul className="mt-3 space-y-2 text-sm opacity-70">
                    {selectedDetail.blockerDetails.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                </article>

                <article className="rounded border border-white/10 bg-white/5 px-3 py-3">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em] opacity-70">
                    Recommended actions
                  </h4>
                  <div className="mt-3 space-y-2">
                    {selectedDetail.launchActions.map((action, index) =>
                      action.type === 'launch' ? (
                        <button
                          key={`${action.label}:${action.teamId}`}
                          type="button"
                          data-testid="contract-board-launch-action"
                          onClick={() => launchContract(selectedDetail.id, action.teamId!)}
                          className={index === 0 ? 'btn btn-sm btn-primary w-full justify-between' : 'btn btn-sm w-full justify-between'}
                        >
                          <span>{action.label}</span>
                          <span className="text-[11px] opacity-75">{action.detail}</span>
                        </button>
                      ) : (
                        <Link
                          key={`${action.label}:${action.href}`}
                          to={action.href ?? APP_ROUTES.report}
                          className="btn btn-sm btn-ghost w-full justify-between"
                        >
                          <span>{action.label}</span>
                          <span className="text-[11px] opacity-75">{action.detail}</span>
                        </Link>
                      )
                    )}
                  </div>
                </article>

                <article className="rounded border border-white/10 bg-white/5 px-3 py-3">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em] opacity-70">
                    Drill-ins
                  </h4>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedDetail.helperLinks.map((link) => (
                      <Link key={link.label} to={link.href} className="btn btn-sm btn-ghost">
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </article>
              </>
            ) : (
              <p className="panel text-sm opacity-60">
                No readiness summary is available until a contract is selected from the board.
              </p>
            )}
          </section>
        </aside>
      </div>
    </section>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { IconAdvance, IconCopy, IconReset } from '../../components/icons'
import {
  CONFIG_FIELDS,
  DASHBOARD_ACTIONS,
  DASHBOARD_CONFIRM,
  DASHBOARD_PRESET_LABELS,
  EMPTY_STATES,
  FEEDBACK_MESSAGES,
} from '../../data/copy'
import { createStartingState } from '../../data/startingState'
import {
  getFrontDeskNoticeActionHref,
  getFrontDeskHubView,
  type FrontDeskNoticeTone,
} from './frontDeskView'

const presetConfigs = {
  forgiving: {
    ...createStartingState().config,
    maxActiveCases: 9,
    partialMargin: 18,
    stageScalar: 1.05,
    attritionPerWeek: 3,
    probabilityK: 2.2,
    raidCoordinationPenaltyPerExtraTeam: 0.05,
  },
  standard: createStartingState().config,
  nightmare: {
    ...createStartingState().config,
    maxActiveCases: 5,
    partialMargin: 12,
    stageScalar: 1.35,
    challengeModeEnabled: true,
    durationModel: 'attrition' as const,
    attritionPerWeek: 5,
    probabilityK: 2.75,
    raidCoordinationPenaltyPerExtraTeam: 0.12,
  },
} as const

type StatusMessage = {
  kind: 'info' | 'success' | 'error'
  message: string
}

type NumericConfigField =
  | 'stageScalar'
  | 'partialMargin'
  | 'maxActiveCases'
  | 'attritionPerWeek'
  | 'probabilityK'
  | 'raidCoordinationPenaltyPerExtraTeam'

function toneSurfaceClass(tone: FrontDeskNoticeTone | 'neutral') {
  if (tone === 'danger') return 'border-red-400/30 bg-red-500/8'
  if (tone === 'warning') return 'border-amber-400/30 bg-amber-500/8'
  if (tone === 'success') return 'border-emerald-400/30 bg-emerald-500/8'
  if (tone === 'info') return 'border-cyan-400/30 bg-cyan-500/8'
  return 'border-white/10 bg-white/5'
}

function toneChipClass(tone: FrontDeskNoticeTone | 'neutral') {
  if (tone === 'danger') return 'border-red-400/30 bg-red-500/10 text-red-200'
  if (tone === 'warning') return 'border-amber-400/30 bg-amber-500/10 text-amber-200'
  if (tone === 'success') return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
  if (tone === 'info') return 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100'
  return 'border-white/10 bg-white/5 text-white/80'
}

function mapSignalTone(tone: 'neutral' | 'info' | 'warning' | 'danger'): FrontDeskNoticeTone | 'neutral' {
  if (tone === 'danger') return 'danger'
  if (tone === 'warning') return 'warning'
  if (tone === 'info') return 'info'
  return 'neutral'
}

function mapTeamStatusTone(statusLabel: string): FrontDeskNoticeTone {
  if (statusLabel === 'Overstretched') return 'danger'
  if (statusLabel === 'Recovering') return 'warning'
  if (statusLabel === 'Deploying') return 'info'
  return 'success'
}

function choiceToneClass(tone: 'neutral' | 'success' | 'warning' | 'danger') {
  if (tone === 'danger') return 'border-red-400/35 bg-red-500/10 hover:bg-red-500/16'
  if (tone === 'warning') return 'border-amber-300/35 bg-amber-500/10 hover:bg-amber-500/16'
  if (tone === 'success') return 'border-emerald-300/35 bg-emerald-500/10 hover:bg-emerald-500/16'
  return 'border-white/15 bg-white/6 hover:bg-white/10'
}

export default function FrontDeskPage() {
  const {
    game,
    appendDeveloperLogEvent,
    applyAuthoredChoice,
    advanceWeek,
    reset,
    setSeed,
    updateConfig,
  } = useGameStore()
  const [seedFeedback, setSeedFeedback] = useState<StatusMessage>({
    kind: 'info',
    message: FEEDBACK_MESSAGES.seedInfo,
  })
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const feedbackTimeoutRef = useRef<number | undefined>(undefined)
  const lastRouteLogSignatureRef = useRef('')
  const view = useMemo(() => getFrontDeskHubView(game), [game])

  const routeLogSignature = useMemo(
    () =>
      JSON.stringify({
        directorMessageRouteId: view.briefing.debug.directorMessageRouteId ?? null,
        noticeRouteIds: view.briefing.debug.noticeRouteIds,
        choiceIds: view.briefing.debug.choiceIds,
      }),
    [view.briefing.debug]
  )

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current !== undefined) {
        window.clearTimeout(feedbackTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (routeLogSignature === lastRouteLogSignatureRef.current) return
    lastRouteLogSignatureRef.current = routeLogSignature
    appendDeveloperLogEvent({
      type: 'route.selected',
      summary: 'Front desk routes selected',
      contextId: 'frontdesk',
      details: {
        surface: 'frontdesk',
        ...(view.briefing.debug.directorMessageRouteId
          ? { directorRouteId: view.briefing.debug.directorMessageRouteId }
          : {}),
        ...(view.briefing.debug.noticeRouteIds.length
          ? { noticeRouteIds: view.briefing.debug.noticeRouteIds }
          : {}),
        ...(view.briefing.debug.choiceIds.length ? { choiceIds: view.briefing.debug.choiceIds } : {}),
      },
    })
  }, [appendDeveloperLogEvent, routeLogSignature, view.briefing.debug])

  function queueSeedFeedback(kind: StatusMessage['kind'], message: string) {
    if (feedbackTimeoutRef.current !== undefined) {
      window.clearTimeout(feedbackTimeoutRef.current)
    }
    setSeedFeedback({ kind, message })
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setSeedFeedback({ kind: 'info', message: FEEDBACK_MESSAGES.seedInfo })
    }, 1200)
  }

  async function handleCopySeed() {
    try {
      if (!navigator.clipboard?.writeText) {
        queueSeedFeedback('error', FEEDBACK_MESSAGES.seedUnavailable)
        return
      }
      await navigator.clipboard.writeText(String(game.rngSeed))
      queueSeedFeedback('success', FEEDBACK_MESSAGES.seedCopied)
    } catch {
      queueSeedFeedback('error', FEEDBACK_MESSAGES.seedUnavailable)
    }
  }

  function applyPreset(preset: keyof typeof presetConfigs) {
    setShowResetConfirm(false)
    updateConfig(presetConfigs[preset])
  }

  function updateNumberField<K extends NumericConfigField>(field: K, value: string) {
    setShowResetConfirm(false)
    updateConfig({ [field]: Number(value) } as Pick<typeof game.config, K>)
  }

  return (
    <section className="space-y-4" aria-label="Front Desk operations hub">
      <header className="panel panel-primary space-y-4" role="region" aria-label="Operations hub overview">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50">Front Desk / Operations Hub</p>
            <h2 className="text-xl font-semibold">Operations Overview</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {view.campaignSummary && /pressure|escalat(e|ion)|danger|week 7|week 8|compounding/i.test(view.campaignSummary) && (
                <span className="rounded-full border border-red-400/35 bg-red-500/10 text-red-200 px-2 py-0.5 text-[13px] font-bold tracking-wide shadow-sm">Compounding Pressure</span>
              )}
              <span className="font-semibold text-base text-amber-100/90 tracking-wide">{view.weekLabel.replace(' / ', ' · ')}</span>
            </div>
            <p className="text-base font-bold text-cyan-100/90 tracking-wide">{view.cycleLabel}</p>
            <p className="text-lg font-extrabold text-amber-100/95 tracking-wide drop-shadow-sm">{view.campaignSummary}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-label="Key operational flows">
            {view.quickLinks.map((link) => (
              <Link key={link.label} to={link.href} className="rounded border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10">
                <p className="font-medium">{link.label}</p>
                <p className="mt-1 text-xs opacity-65">{link.description}</p>
              </Link>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {view.statCards.map((card) => (
            <div key={card.label} className={`rounded border px-3 py-3 ${toneSurfaceClass(card.tone)}`}> 
              <Link to={card.href} className="block">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs uppercase tracking-[0.24em] opacity-70">{card.label}</p>
                  {card.label.toLowerCase().includes('reserve') && Number(card.value) <= 1 && (
                    <span className="rounded-full border border-red-400/35 bg-red-500/10 text-red-200 px-2 py-0.5 text-[10px] font-bold">Reserve Critically Low</span>
                  )}
                  {/* Team contention: highlight if label includes 'contention' or 'conflict' */}
                  {card.label.toLowerCase().includes('contention') && (
                    <span className="rounded-full border border-amber-400/35 bg-amber-500/10 text-amber-200 px-2 py-0.5 text-[10px] font-bold">Team Contention</span>
                  )}
                  {/* Recovery bottleneck: highlight if label includes 'recovery' and value > 1 */}
                  {card.label.toLowerCase().includes('recovery') && Number(card.value) > 1 && (
                    <span className="rounded-full border border-cyan-400/35 bg-cyan-500/10 text-cyan-100 px-2 py-0.5 text-[10px] font-bold">Recovery Bottleneck</span>
                  )}
                </div>
                <p
                  className="mt-2 text-2xl font-semibold"
                  data-testid={`dashboard-stat-value-${card.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {card.value}
                </p>
              </Link>
            </div>
          ))}
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(250px,0.92fr)_minmax(0,1.25fr)_minmax(300px,1fr)]">
        <aside className="space-y-4">
          <section className="panel space-y-3" aria-label="Operations queues">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Operations / assignments / queues</h2>
              <Link to={APP_ROUTES.contracts} className="text-sm opacity-60 hover:opacity-100">Open contracts</Link>
            </div>
            <div className="space-y-3">
              {view.queueCards.map((card) => (
                <article key={card.id} className={`rounded border px-3 py-3 ${toneSurfaceClass(card.tone)}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{card.title}</h3>
                        {card.title.toLowerCase().includes('recovery') && card.countLabel && Number(card.countLabel.replace(/\D/g, '')) > 1 && (
                          <span className="rounded-full border border-amber-400/35 bg-amber-500/10 text-amber-200 px-2 py-0.5 text-[10px] font-bold">Multiple Teams Recovering</span>
                        )}
                      </div>
                      <p className="text-xs opacity-60">{card.countLabel}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass(card.tone)}`}>{card.countLabel}</span>
                  </div>
                  <p className="mt-2 text-sm opacity-80">{card.summary}</p>
                  {card.details.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-xs opacity-70">
                      {card.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  ) : null}
                  <Link to={card.href} className="mt-3 inline-flex text-xs uppercase tracking-[0.14em] opacity-70 hover:opacity-100">
                    {card.actionLabel}
                  </Link>
                </article>
              ))}
            </div>
          </section>
        </aside>

        <div className="space-y-4">
          <section className="panel space-y-3" aria-label="Current campaign state">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Current Campaign State</h2>
              <p className="text-sm opacity-70">{view.campaignSummary}</p>
            </div>
            <ul className="space-y-2 text-sm opacity-75">
              {view.campaignDetailLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <div className="space-y-2 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium">Front Desk Notices</h3>
                <Link to={APP_ROUTES.report} className="text-sm opacity-60 hover:opacity-100">Open report</Link>
              </div>
              {view.briefing.notices.length > 0 ? (
                <ul className="space-y-2">
                  {view.briefing.notices.map((notice) => {
                    const actionHref = notice.actionTarget ? getFrontDeskNoticeActionHref(notice.actionTarget) : undefined
                    return (
                      <li key={notice.id} className={`rounded border px-3 py-2 ${toneSurfaceClass(notice.tone)}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{notice.title}</p>
                            <p className="text-xs opacity-80">{notice.body}</p>
                          </div>
                          {actionHref ? (
                            <Link to={actionHref} className="shrink-0 text-[11px] uppercase tracking-[0.14em] opacity-70 hover:opacity-100">
                              {notice.actionLabel ?? 'Open'}
                            </Link>
                          ) : null}
                        </div>
                        {notice.choices && notice.choices.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {notice.choices.map((choice) => (
                              <button
                                key={choice.id}
                                type="button"
                                onClick={() => applyAuthoredChoice(choice, { activeContextId: `frontdesk.notice.${notice.id}` })}
                                className={`rounded border px-2.5 py-1 text-xs transition ${choiceToneClass(choice.tone ?? 'neutral')}`}
                              >
                                {choice.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="text-sm opacity-60">No active notices are queued for the Front Desk.</p>
              )}
            </div>
          </section>

          <section className="panel space-y-3" aria-label="Active pressures">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Active Pressures</h2>
                <p className="text-sm opacity-70">{view.activePressureSummary}</p>
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass('warning')}`}>Dominant: {view.dominantPressureLabel}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {view.signals.map((signal) =>
                signal.href ? (
                  <Link
                    key={signal.id}
                    to={signal.href}
                    className={`rounded-full border px-2.5 py-1 text-xs transition hover:opacity-100 ${toneChipClass(mapSignalTone(signal.tone))}`}
                    title={signal.detail}
                  >
                    {signal.label}: {signal.value}
                  </Link>
                ) : (
                  <span
                    key={signal.id}
                    className={`rounded-full border px-2.5 py-1 text-xs ${toneChipClass(mapSignalTone(signal.tone))}`}
                    title={signal.detail}
                  >
                    {signal.label}: {signal.value}
                  </span>
                )
              )}
            </div>
            <ul className="space-y-2 text-sm opacity-75">
              {view.activePressureDetails.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </section>

          <section className="panel space-y-3" aria-label="Recent reports and events">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Recent Reports / Events</h2>
              <Link to={APP_ROUTES.report} className="text-sm opacity-60 hover:opacity-100">All reports</Link>
            </div>
            {view.recentOutcomes.length > 0 ? (
              <div className="space-y-2">
                <h3 className="font-medium">Recent outcome explanations</h3>
                <ul className="space-y-2">
                  {view.recentOutcomes.map((entry) => (
                    <li key={`${entry.week}:${entry.missionId}`} className="rounded border border-white/10 px-3 py-2">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            <Link to={APP_ROUTES.caseDetail(entry.missionId)} className="hover:underline">{entry.missionTitle}</Link>
                          </p>
                          <p className="text-xs opacity-55">
                            Week <Link to={APP_ROUTES.reportDetail(entry.week)} className="hover:underline">{entry.week}</Link> / {entry.outcomeLabel}
                          </p>
                        </div>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass(entry.outcomeLabel === 'Fail' ? 'danger' : entry.outcomeLabel === 'Partial' ? 'warning' : 'info')}`}>
                          {entry.dominantFactorLabel}
                        </span>
                      </div>
                      <p className="mt-2 text-sm opacity-75">{entry.summary}</p>
                      <div className="mt-2 space-y-1 text-sm opacity-70">
                        <p>
                          <span className="font-medium">Gain:</span> {entry.gainSummary}
                        </p>
                        <p>
                          <span className="font-medium">Cost:</span> {entry.costSummary}
                        </p>
                        <p>
                          <span className="font-medium">Net:</span> {entry.netSummary}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {view.recentItems.length > 0 ? (
              <div className="space-y-2">
                <h3 className="font-medium">Recent operational events</h3>
                <ul className="space-y-2">
                  {view.recentItems.map((item) => (
                    <li key={item.id} className="rounded border border-white/10 px-3 py-2">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {item.href ? <Link to={item.href} className="hover:underline">{item.title}</Link> : item.title}
                          </p>
                          <p className="text-xs opacity-55">{item.meta}</p>
                        </div>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass(item.tone)}`}>{item.tone}</span>
                      </div>
                      <p className="mt-2 text-sm opacity-75">{item.detail}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {view.recentOutcomes.length === 0 && view.recentItems.length === 0 ? (
              <p className="text-sm opacity-60">No recent reports or events are available yet.</p>
            ) : null}
          </section>

          <section className="panel space-y-3" aria-label="Immediate attention">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Immediate Attention</h2>
              <Link to={APP_ROUTES.cases} className="text-sm opacity-60 hover:opacity-100">Review routing</Link>
            </div>
            {view.attentionItems.length > 0 ? (
              <ul className="space-y-2">
                {view.attentionItems.map((item) => (
                  <li key={item.id} className={`rounded border px-3 py-2 ${toneSurfaceClass(item.tone)}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs opacity-80">{item.summary}</p>
                      </div>
                      {item.href ? (
                        <Link to={item.href} className="text-[11px] uppercase tracking-[0.14em] opacity-70 hover:opacity-100">Open</Link>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm opacity-60">No immediate intervention items are currently escalated.</p>
            )}
          </section>

          <section className="panel space-y-4" role="region" aria-label="Simulation controls">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Simulation Controls</h2>
                <p className="text-sm opacity-60">Week {game.week} · Active cap {game.config.maxActiveCases}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => applyPreset('forgiving')} className="btn btn-sm btn-ghost">{DASHBOARD_PRESET_LABELS.forgiving}</button>
                <button type="button" onClick={() => applyPreset('standard')} className="btn btn-sm btn-ghost">{DASHBOARD_PRESET_LABELS.standard}</button>
                <button type="button" onClick={() => applyPreset('nightmare')} className="btn btn-sm btn-ghost">{DASHBOARD_PRESET_LABELS.nightmare}</button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <label htmlFor="frontdesk-seed" className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50">{CONFIG_FIELDS.seed}</label>
                <input
                  id="frontdesk-seed"
                  type="number"
                  className="form-input"
                  value={game.rngSeed}
                  onChange={(event) => {
                    setShowResetConfirm(false)
                    setSeed(Number(event.target.value))
                  }}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="frontdesk-stage-scalar" className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50">{CONFIG_FIELDS.stageScalar}</label>
                <input id="frontdesk-stage-scalar" type="number" step="0.01" className="form-input" value={game.config.stageScalar} onChange={(event) => updateNumberField('stageScalar', event.target.value)} />
              </div>
              <div className="space-y-2">
                <label htmlFor="frontdesk-partial-margin" className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50">{CONFIG_FIELDS.partialMargin}</label>
                <input id="frontdesk-partial-margin" type="number" className="form-input" value={game.config.partialMargin} onChange={(event) => updateNumberField('partialMargin', event.target.value)} />
              </div>
              <div className="space-y-2">
                <label htmlFor="frontdesk-active-cap" className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50">{CONFIG_FIELDS.activeCap}</label>
                <input id="frontdesk-active-cap" type="number" className="form-input" value={game.config.maxActiveCases} onChange={(event) => updateNumberField('maxActiveCases', event.target.value)} />
              </div>
              <div className="space-y-2">
                <label htmlFor="frontdesk-attrition" className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50">{CONFIG_FIELDS.attritionPerWeek}</label>
                <input id="frontdesk-attrition" type="number" className="form-input" value={game.config.attritionPerWeek} onChange={(event) => updateNumberField('attritionPerWeek', event.target.value)} />
              </div>
              <div className="space-y-2">
                <label htmlFor="frontdesk-probability-k" className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50">{CONFIG_FIELDS.probabilityK}</label>
                <input id="frontdesk-probability-k" type="number" step="0.01" className="form-input" value={game.config.probabilityK} onChange={(event) => updateNumberField('probabilityK', event.target.value)} />
              </div>
              <div className="space-y-2">
                <label htmlFor="frontdesk-raid-penalty" className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50">{CONFIG_FIELDS.raidTeamPenalty}</label>
                <input id="frontdesk-raid-penalty" type="number" step="0.01" className="form-input" value={game.config.raidCoordinationPenaltyPerExtraTeam} onChange={(event) => updateNumberField('raidCoordinationPenaltyPerExtraTeam', event.target.value)} />
              </div>
              <div className="space-y-2">
                <label htmlFor="frontdesk-duration-model" className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50">{CONFIG_FIELDS.durationModel}</label>
                <select
                  id="frontdesk-duration-model"
                  className="form-select"
                  value={game.config.durationModel}
                  disabled={!game.config.challengeModeEnabled}
                  onChange={(event) => updateConfig({ durationModel: event.target.value as typeof game.config.durationModel })}
                >
                  <option value="capacity">{CONFIG_FIELDS.durationModelCapacity}</option>
                  <option value="attrition">{CONFIG_FIELDS.durationModelAttrition}</option>
                </select>
              </div>
            </div>

            <p className="text-sm opacity-60">
              {game.config.challengeModeEnabled ? CONFIG_FIELDS.durationModelUnlockedHint : CONFIG_FIELDS.durationModelLockedHint}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={handleCopySeed} className="btn btn-sm btn-ghost">
                <IconCopy className="h-4 w-4" aria-hidden="true" />
                {DASHBOARD_ACTIONS.copySeed}
              </button>
              <button type="button" onClick={() => setSeed(Date.now())} className="btn btn-sm btn-ghost">
                {DASHBOARD_ACTIONS.newSeed}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(false)
                  advanceWeek()
                }}
                disabled={game.gameOver}
                className="btn btn-sm"
              >
                <IconAdvance className="h-4 w-4" aria-hidden="true" />
                {DASHBOARD_ACTIONS.advanceWeek}
              </button>
              <button type="button" onClick={() => setShowResetConfirm((current) => !current)} className="btn btn-sm btn-ghost">
                <IconReset className="h-4 w-4" aria-hidden="true" />
                {DASHBOARD_ACTIONS.reset}
              </button>
            </div>

            {showResetConfirm ? (
              <div className="flex flex-wrap items-center gap-2 rounded border border-white/10 px-3 py-2">
                <p className="text-sm opacity-70">{DASHBOARD_CONFIRM.resetPrompt}</p>
                <button type="button" onClick={() => { reset(); setShowResetConfirm(false) }} className="btn btn-sm">{DASHBOARD_CONFIRM.confirmReset}</button>
                <button type="button" onClick={() => setShowResetConfirm(false)} className="btn btn-sm btn-ghost">{DASHBOARD_CONFIRM.cancelReset}</button>
              </div>
            ) : null}

            <p
              aria-live="polite"
              className={seedFeedback.kind === 'error' ? 'text-sm text-red-300' : seedFeedback.kind === 'success' ? 'text-sm text-green-300' : 'text-sm opacity-60'}
            >
              {seedFeedback.message}
            </p>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="panel space-y-3" aria-label="Team readiness and field status">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Teams / Field Status</h2>
              <Link to={APP_ROUTES.teams} className="text-sm opacity-60 hover:opacity-100">Open teams</Link>
            </div>
            {view.teamStatus.length > 0 ? (
              <ul className="space-y-2">
                {view.teamStatus.map((team) => (
                  <li key={team.teamId} className="rounded border border-white/10 px-3 py-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          <Link to={team.href} className="hover:underline">{team.teamName}</Link>
                        </p>
                        <p className="text-xs opacity-55">{team.summary}</p>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass(mapTeamStatusTone(team.statusLabel))}`}>
                        {team.statusLabel}
                      </span>
                    </div>
                    <p className="mt-2 text-xs opacity-65">{team.members.length > 0 ? team.members.join(', ') : 'No agents assigned'}</p>
                    {team.tags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {team.tags.map((tag) => (
                          <span key={tag} className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass('warning')}`}>{tag}</span>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm opacity-60">No team readiness summaries are currently available.</p>
            )}
          </section>

          <section className="panel space-y-3" aria-label="Procurement snapshot">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Procurement Snapshot</h2>
              <div className="flex items-center gap-3 text-sm">
                <Link to={view.procurementSnapshot.primaryHref} className="opacity-60 hover:opacity-100">Open markets</Link>
                <Link to={view.procurementSnapshot.secondaryHref} className="opacity-60 hover:opacity-100">Open fabrication</Link>
              </div>
            </div>
            <p className="text-sm opacity-75">{view.procurementSnapshot.summary}</p>
            {view.procurementSnapshot.details.length > 0 ? (
              <ul className="space-y-2 text-sm opacity-70">
                {view.procurementSnapshot.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="panel space-y-3" aria-label="Agency standing">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Agency Standing</h2>
              <Link to={APP_ROUTES.rankings} className="text-sm opacity-60 hover:opacity-100">Open rankings</Link>
            </div>
            <p className="text-sm opacity-75">{view.standingSummary.summary}</p>
            <ul className="space-y-2 text-sm opacity-70">
              {view.standingSummary.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              {view.standingSummary.links.map((link) => (
                <Link key={link.label} to={link.href} className="btn btn-sm btn-ghost">{link.label}</Link>
              ))}
            </div>
          </section>

          <section className="panel space-y-3" aria-label="Latest report">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Latest Report</h2>
              <Link to={APP_ROUTES.report} className="text-sm opacity-60 hover:opacity-100">All reports</Link>
            </div>
            {view.latestReport ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium">
                    <Link to={view.latestReport.href} className="hover:underline">Week {view.latestReport.week}</Link>
                  </p>
                  <p className={view.latestReport.score >= 0 ? 'text-green-300' : 'text-red-300'}>
                    {view.latestReport.score >= 0 ? '+' : ''}
                    {view.latestReport.score} {Math.abs(view.latestReport.score) === 1 ? 'pt' : 'pts'}
                  </p>
                </div>
                <p className="text-sm opacity-70">{view.latestReport.summary}</p>
                <p className="text-sm opacity-60">{view.latestReport.detail}</p>
              </div>
            ) : (
              <p className="text-sm opacity-60">{EMPTY_STATES.noReports}</p>
            )}
          </section>
        </aside>
      </div>
    </section>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useFocusedControls, useInputConsumer } from '../../app/inputRuntime'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { IconAdvance, IconCopy, IconReset } from '../../components/icons'
import { FilterInput } from '../../components/FilterInput'
import { RunTransferPanel } from '../../components/RunTransferPanel'
import {
  CONFIG_FIELDS,
  DASHBOARD_ACTIONS,
  DASHBOARD_CONFIRM,
  DASHBOARD_PRESET_LABELS,
  EMPTY_STATES,
  EVENT_FEED_TEXT,
  FEEDBACK_MESSAGES,
} from '../../data/copy'
import { createStartingState } from '../../data/startingState'
import { getOperationNoticeViews } from '../dashboard/eventFeedView'
import {
  getFrontDeskNoticeActionHref,
  getFrontDeskHubView,
  type FrontDeskLatestReportView,
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

const DEPARTURE_NOTICES_PARAM = 'departureNotices'

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

function mapSignalTone(
  tone: 'neutral' | 'info' | 'warning' | 'danger'
): FrontDeskNoticeTone | 'neutral' {
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

function formatToneLabel(tone: FrontDeskNoticeTone) {
  if (tone === 'danger') return 'Alert'
  if (tone === 'warning') return 'Warning'
  if (tone === 'info') return 'Info'
  return 'Success'
}

function choiceToneClass(tone: 'neutral' | 'success' | 'warning' | 'danger') {
  if (tone === 'danger') return 'border-red-400/35 bg-red-500/10 hover:bg-red-500/16'
  if (tone === 'warning') return 'border-amber-300/35 bg-amber-500/10 hover:bg-amber-500/16'
  if (tone === 'success') return 'border-emerald-300/35 bg-emerald-500/10 hover:bg-emerald-500/16'
  return 'border-white/15 bg-white/6 hover:bg-white/10'
}

function StaffInjuryList({
  injuries,
  label,
}: Readonly<{
  injuries: FrontDeskLatestReportView['staffInjuries']['injuries']
  label: string
}>) {
  return (
    <ul className="space-y-2" aria-label={label}>
      {injuries.map((injury) => (
        <li key={injury.eventId} className="text-sm">
          <p className="font-medium">{injury.agentName} was injured</p>
          <p className="opacity-75">
            Recorded severity: {injury.severity} · Injury record {injury.eventId}
          </p>
          {injury.agentHref ? (
            <Link to={injury.agentHref} className="underline">
              Check current readiness for {injury.agentName}
            </Link>
          ) : (
            <p className="opacity-75">Current roster record unavailable.</p>
          )}
        </li>
      ))}
    </ul>
  )
}

function WeekCloseStaffInjuries({
  staffInjuries,
}: Readonly<{
  staffInjuries: FrontDeskLatestReportView['staffInjuries']
}>) {
  const { injuries, additionalInjuries, historyAvailable } = staffInjuries
  return (
    <section className="space-y-2 border-t border-white/10 pt-2" aria-label="Staff injuries">
      <h3 className="text-sm font-semibold">Staff injuries</h3>
      {injuries.length > 0 ? (
        <StaffInjuryList injuries={injuries} label="Recorded injuries" />
      ) : (
        <p className="text-sm opacity-70">
          {historyAvailable
            ? 'No staff injuries recorded for this week.'
            : 'Staff injury history is unavailable for this week.'}
        </p>
      )}
      {additionalInjuries.length > 0 && (
        <details className="space-y-2">
          <summary className="cursor-pointer text-sm underline">
            More recorded injuries ({additionalInjuries.length})
          </summary>
          <StaffInjuryList injuries={additionalInjuries} label="Additional recorded injuries" />
        </details>
      )}
    </section>
  )
}

function WeekCloseTeamFatigue({ report }: { report: FrontDeskLatestReportView }) {
  const { teamFatigue, week, href } = report

  return (
    <section
      aria-label="Week-close team fatigue"
      className="space-y-2 border-t border-white/10 pt-2"
    >
      <h3 className="text-sm font-semibold">Week-close team fatigue</h3>
      {teamFatigue.teams.length > 0 ? (
        <>
          <p className="text-sm opacity-70">
            Averages reflect each week’s roster. Check current staffing before committing a team.
          </p>
          <ul className="space-y-2">
            {teamFatigue.teams.map((team) => (
              <li key={team.id} className="text-sm">
                <p className="font-medium">{team.name}</p>
                <p className="opacity-70">
                  {team.previousAverage !== null && `Week ${week - 1}: ${team.previousAverage} → `}
                  Week {week}: {team.average} average fatigue · {team.band}
                </p>
                {team.currentHref ? (
                  <Link to={team.currentHref} className="underline">
                    Check current roster for {team.name}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
          {teamFatigue.teams.some((team) => team.currentHref === null) && (
            <Link to={APP_ROUTES.teams} className="text-sm underline">
              Review current teams
            </Link>
          )}
          {teamFatigue.pressuredCount > teamFatigue.teams.length && (
            <Link to={href} className="text-sm underline">
              See all {teamFatigue.pressuredCount} affected teams in the report
            </Link>
          )}
        </>
      ) : (
        <p className="text-sm opacity-70">
          {teamFatigue.historyAvailable
            ? 'No strained or critical teams were recorded at week close.'
            : 'Week-close team fatigue is unavailable for this report.'}
        </p>
      )}
    </section>
  )
}

export default function FrontDeskPage() {
  const {
    game,
    appendDeveloperLogEvent,
    applyAuthoredChoice,
    advanceWeek,
    reset,
    setSeed,
    setOperationNoticeStatus,
    updateConfig,
  } = useGameStore()
  const [seedFeedback, setSeedFeedback] = useState<StatusMessage>({
    kind: 'info',
    message: FEEDBACK_MESSAGES.seedInfo,
  })
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const savedDepartureQuery = searchParams.get(DEPARTURE_NOTICES_PARAM)
  const [departureDraft, setDepartureDraft] = useState<{ origin: string; value: string }>()
  const departureQuery =
    departureDraft?.origin === savedDepartureQuery ? departureDraft.value : savedDepartureQuery
  const showDepartureNotices = savedDepartureQuery !== null
  const departureControls = useRef<HTMLDivElement>(null)
  const departureToggle = useRef<HTMLButtonElement>(null)
  const getDepartureControls = () =>
    Array.from(departureControls.current?.querySelectorAll<HTMLElement>('button, a[href]') ?? [])
  useFocusedControls(getDepartureControls)
  useInputConsumer({
    id: 'filters.next',
    context: 'route',
    available: () => {
      const toggle = departureToggle.current
      return (
        !!toggle &&
        !getDepartureControls().some((control) => control === toggle.ownerDocument.activeElement)
      )
    },
    execute: () => departureToggle.current?.focus(),
  })
  const departureNotices = useMemo(
    () => (departureQuery === null ? [] : getOperationNoticeViews(game, departureQuery)),
    [departureQuery, game]
  )
  const feedbackTimeoutRef = useRef<number | undefined>(undefined)
  const lastRouteLogSignatureRef = useRef('')
  const view = useMemo(() => getFrontDeskHubView(game), [game])

  function setDepartureQuery(query: string | null) {
    const next = new URLSearchParams(searchParams)
    if (query === null) next.delete(DEPARTURE_NOTICES_PARAM)
    else next.set(DEPARTURE_NOTICES_PARAM, query)
    setSearchParams(next, { replace: true })
  }

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
        ...(view.briefing.debug.choiceIds.length
          ? { choiceIds: view.briefing.debug.choiceIds }
          : {}),
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
      <header
        className="panel panel-primary space-y-4"
        role="region"
        aria-label="Operations hub overview"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50">
              Front Desk / Operations Hub
            </p>
            <h2 className="text-xl font-semibold">Operations Overview</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {view.campaignSummary &&
                /pressure|escalat(e|ion)|danger|week 7|week 8|compounding/i.test(
                  view.campaignSummary
                ) && (
                  <span className="rounded-full border border-red-400/35 bg-red-500/10 text-red-200 px-2 py-0.5 text-[13px] font-bold tracking-wide shadow-sm">
                    Compounding Pressure
                  </span>
                )}
              <span className="font-semibold text-base text-amber-100/90 tracking-wide">
                {view.weekLabel.replace(' / ', ' · ')}
              </span>
            </div>
            <p className="text-base font-bold text-cyan-100/90 tracking-wide">{view.cycleLabel}</p>
            <p className="text-lg font-extrabold text-amber-100/95 tracking-wide drop-shadow-sm">
              {view.campaignSummary}
            </p>
          </div>
          <div
            className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
            aria-label="Key operational flows"
          >
            {view.quickLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="rounded border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
              >
                <p className="font-medium">{link.label}</p>
                <p className="mt-1 text-xs opacity-65">{link.description}</p>
              </Link>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {view.statCards.map((card) => (
            <div
              key={card.label}
              className={`rounded border px-3 py-3 ${toneSurfaceClass(card.tone)}`}
            >
              <Link to={card.href} className="block">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs uppercase tracking-[0.24em] opacity-70">{card.label}</p>
                  {card.label.toLowerCase().includes('reserve') && Number(card.value) <= 1 && (
                    <span className="rounded-full border border-red-400/35 bg-red-500/10 text-red-200 px-2 py-0.5 text-[10px] font-bold">
                      Reserve Critically Low
                    </span>
                  )}
                  {/* Team contention: highlight if label includes 'contention' or 'conflict' */}
                  {card.label.toLowerCase().includes('contention') && (
                    <span className="rounded-full border border-amber-400/35 bg-amber-500/10 text-amber-200 px-2 py-0.5 text-[10px] font-bold">
                      Team Contention
                    </span>
                  )}
                  {/* Recovery bottleneck: highlight if label includes 'recovery' and value > 1 */}
                  {card.label.toLowerCase().includes('recovery') && Number(card.value) > 1 && (
                    <span className="rounded-full border border-cyan-400/35 bg-cyan-500/10 text-cyan-100 px-2 py-0.5 text-[10px] font-bold">
                      Recovery Bottleneck
                    </span>
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

      <section className="panel space-y-3" aria-label="Needs Attention">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Needs Attention</h2>
          <Link to={APP_ROUTES.cases} className="text-sm opacity-60 hover:opacity-100">
            Review routing
          </Link>
        </div>
        {view.firstDossier ? (
          <section
            className="space-y-2 rounded border border-cyan-400/30 bg-cyan-500/8 px-3 py-3"
            aria-label="First anomalous dossier"
          >
            <h3 className="font-semibold">{view.firstDossier.title}</h3>
            <p className="text-sm">{view.firstDossier.summary}</p>
            <p className="text-xs opacity-80">{view.firstDossier.intelSummary}</p>
            <Link className="inline-flex text-sm underline" to={view.firstDossier.href}>
              Review dossier and triage
            </Link>
          </section>
        ) : game.week === 1 ? (
          <p className="text-sm opacity-80">
            No anomalous dossier is available to review right now. You can continue planning the
            week.
          </p>
        ) : null}
        {view.staffingReadinessOpportunity ? (
          <section className="space-y-2" aria-label="Staffing readiness opportunity">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="font-semibold">Staffing opportunity</h3>
                <p className="text-xs opacity-60">
                  Team staffing and deployment readiness pressure summary.
                </p>
              </div>
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass(view.staffingReadinessOpportunity.tone)}`}
              >
                {formatToneLabel(view.staffingReadinessOpportunity.tone)}
              </span>
            </div>
            <div
              className={`rounded border px-3 py-3 space-y-2 ${toneSurfaceClass(view.staffingReadinessOpportunity.tone)}`}
            >
              <p className="text-sm font-medium">{view.staffingReadinessOpportunity.title}</p>
              <p className="text-sm opacity-80">{view.staffingReadinessOpportunity.summary}</p>
              {view.staffingReadinessOpportunity.details.length > 0 ? (
                <ul className="space-y-1 text-sm opacity-70">
                  {view.staffingReadinessOpportunity.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              ) : null}
              <div className="flex flex-wrap gap-3 pt-1 text-[11px] uppercase tracking-[0.14em]">
                <Link
                  to={view.staffingReadinessOpportunity.href}
                  className="opacity-70 hover:opacity-100"
                >
                  {view.staffingReadinessOpportunity.linkLabel}
                </Link>
                {view.staffingReadinessOpportunity.secondaryHref ? (
                  <Link
                    to={view.staffingReadinessOpportunity.secondaryHref}
                    className="opacity-70 hover:opacity-100"
                  >
                    {view.staffingReadinessOpportunity.secondaryLinkLabel ?? 'Open'}
                  </Link>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
        {view.attentionItems.length > 0 ? (
          <ul className="space-y-2">
            {view.attentionItems.map((item) => (
              <li
                key={item.id}
                className={`rounded border px-3 py-2 ${toneSurfaceClass(item.tone)}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs opacity-80">{item.summary}</p>
                  </div>
                  {item.href ? (
                    <Link
                      to={item.href}
                      className="text-[11px] uppercase tracking-[0.14em] opacity-70 hover:opacity-100"
                    >
                      Open
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : !view.firstDossier && !view.staffingReadinessOpportunity ? (
          <p className="text-sm opacity-60">
            No immediate intervention items are currently escalated.
          </p>
        ) : null}
      </section>

      {game.week === 1 && (
        <details className="panel space-y-3">
          <summary className="cursor-pointer text-sm font-semibold">
            How the first week works
          </summary>
          <p className="text-sm">
            You run the containment agency. Your teams carry out the commitments you make. Use this
            guide to decide what needs attention before the next week.
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>
              <strong>Review the week.</strong> Check incoming pressure, available staff, and
              blockers.
            </li>
            <li>
              <strong>Recruit or defer.</strong> Weigh hiring against resources needed for current
              work.
            </li>
            <li>
              <strong>Equip and validate.</strong> Check loadouts, qualifications, and readiness
              before committing.
            </li>
            <li>
              <strong>Train, recover, and prepare.</strong> Rest staff and address readiness gaps
              before committing teams.
            </li>
            <li>
              <strong>Form teams.</strong> Match people to the work and check what each team can
              cover.
            </li>
            <li>
              <strong>Triage missions.</strong> Review known evidence and decide what needs a
              response now.
            </li>
            <li>
              <strong>Deploy.</strong> Commit a team to work the agency can support.
            </li>
            <li>
              <strong>Review outcomes.</strong> Use the week report to see what changed and what
              carries forward.
            </li>
            <li>
              <strong>Recover and progress.</strong> Restore readiness and invest where it will help
              next week.
            </li>
          </ol>
          <p className="text-sm">
            A stabilizing week leaves teams able to act again, major pressures manageable, and room
            to recover. A degraded week leaves fewer ready people or less support while unresolved
            pressure grows. Check the report and team readiness before making the next commitment.
          </p>
        </details>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(250px,0.92fr)_minmax(0,1.25fr)_minmax(300px,1fr)]">
        <aside className="space-y-4">
          <section className="panel space-y-3" aria-label="Operations queues">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Operations / assignments / queues</h2>
              <Link to={APP_ROUTES.contracts} className="text-sm opacity-60 hover:opacity-100">
                Open contracts
              </Link>
            </div>
            <div className="space-y-3">
              {view.queueCards.map((card) => (
                <article
                  key={card.id}
                  className={`rounded border px-3 py-3 ${toneSurfaceClass(card.tone)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{card.title}</h3>
                        {card.title.toLowerCase().includes('recovery') &&
                          card.countLabel &&
                          Number(card.countLabel.replace(/\D/g, '')) > 1 && (
                            <span className="rounded-full border border-amber-400/35 bg-amber-500/10 text-amber-200 px-2 py-0.5 text-[10px] font-bold">
                              Multiple Teams Recovering
                            </span>
                          )}
                      </div>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass(card.tone)}`}
                    >
                      {card.countLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-sm opacity-80">{card.summary}</p>
                  {card.details.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-xs opacity-70">
                      {card.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  ) : null}
                  <Link
                    to={card.href}
                    className="mt-3 inline-flex text-xs uppercase tracking-[0.14em] opacity-70 hover:opacity-100"
                  >
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
            <section
              className="space-y-2 border-t border-white/10 pt-3"
              aria-label="Campaign profile and rules ledger"
            >
              <h3 className="font-medium">{view.campaignRulesSummary.title}</h3>
              <p className="text-sm font-semibold text-cyan-100/85">
                {view.campaignRulesSummary.headline}
              </p>
              <ul className="space-y-1.5 text-sm opacity-80">
                {view.campaignRulesSummary.lines.map((line, index) => (
                  <li key={`campaign-rules-line-${index}`}>{line}</li>
                ))}
              </ul>
              <p className="text-xs opacity-70">{view.campaignRulesSummary.compatibilitySummary}</p>
              {view.campaignRulesSummary.activeModuleLabels.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {view.campaignRulesSummary.activeModuleLabels.map((label, index) => (
                    <span
                      key={`campaign-rules-module-${index}`}
                      className="rounded-full border border-white/12 bg-white/5 px-2 py-0.5 text-[11px] opacity-85"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>
            <div className="space-y-2 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium">Front Desk Notices</h3>
                <Link to={APP_ROUTES.report} className="text-sm opacity-60 hover:opacity-100">
                  Open report
                </Link>
              </div>
              {view.briefing.notices.length > 0 ? (
                <ul className="space-y-2">
                  {view.briefing.notices.map((notice) => {
                    const actionHref = notice.actionTarget
                      ? getFrontDeskNoticeActionHref(notice.actionTarget)
                      : undefined
                    return (
                      <li
                        key={notice.id}
                        className={`rounded border px-3 py-2 ${toneSurfaceClass(notice.tone)}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{notice.title}</p>
                            <p className="text-xs opacity-80">{notice.body}</p>
                          </div>
                          {actionHref ? (
                            <Link
                              to={actionHref}
                              className="shrink-0 text-[11px] uppercase tracking-[0.14em] opacity-70 hover:opacity-100"
                            >
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
                                onClick={() =>
                                  applyAuthoredChoice(choice, {
                                    activeContextId: `frontdesk.notice.${notice.id}`,
                                  })
                                }
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
                <p className="text-sm opacity-60">
                  No active notices are queued for the Front Desk.
                </p>
              )}
            </div>
          </section>

          {view.courierCapacityOpportunity ? (
            <section className="panel space-y-3" aria-label="Courier network capacity opportunity">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Logistics opportunity</h2>
                  <p className="text-xs opacity-60">Courier and channel logistics summary.</p>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass(view.courierCapacityOpportunity.tone)}`}
                >
                  {view.courierCapacityOpportunity.gapKindLabel}
                </span>
              </div>
              <div
                className={`rounded border px-3 py-3 space-y-2 ${toneSurfaceClass(view.courierCapacityOpportunity.tone)}`}
              >
                <p className="text-sm font-medium">{view.courierCapacityOpportunity.title}</p>
                <p className="text-sm opacity-80">{view.courierCapacityOpportunity.summary}</p>
                <p className="text-sm font-semibold text-amber-100/90">
                  {view.courierCapacityOpportunity.capacityLine}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {view.courierCapacityOpportunity.mitigationLabels.map((label, index) => (
                    <span
                      key={`${label}-${index}`}
                      className="rounded-full border border-white/12 bg-white/5 px-2 py-0.5 text-[11px] opacity-85"
                    >
                      {label}
                    </span>
                  ))}
                </div>
                <p className="text-xs opacity-65 pt-1">
                  {view.courierCapacityOpportunity.guidanceNote}
                </p>
                <div className="flex flex-wrap gap-3 pt-1 text-[11px] uppercase tracking-[0.14em]">
                  <Link
                    to={view.courierCapacityOpportunity.primaryHref}
                    className="opacity-70 hover:opacity-100"
                  >
                    {view.courierCapacityOpportunity.primaryLinkLabel}
                  </Link>
                  <Link
                    to={view.courierCapacityOpportunity.secondaryHref}
                    className="opacity-70 hover:opacity-100"
                  >
                    {view.courierCapacityOpportunity.secondaryLinkLabel}
                  </Link>
                </div>
              </div>
            </section>
          ) : null}

          {view.procurementPressureOpportunity ? (
            <section className="panel space-y-3" aria-label="Procurement pressure opportunity">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Procurement opportunity</h2>
                  <p className="text-xs opacity-60">Supplier and fabrication pressure summary.</p>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass(view.procurementPressureOpportunity.tone)}`}
                >
                  {view.procurementPressureOpportunity.severityLabel}
                </span>
              </div>
              <div
                className={`rounded border px-3 py-3 space-y-2 ${toneSurfaceClass(view.procurementPressureOpportunity.tone)}`}
              >
                <p className="text-sm font-medium">{view.procurementPressureOpportunity.title}</p>
                <p className="text-sm opacity-80">{view.procurementPressureOpportunity.summary}</p>
                {view.procurementPressureOpportunity.details.length > 0 ? (
                  <ul className="space-y-1 text-sm opacity-70">
                    {view.procurementPressureOpportunity.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="flex flex-wrap gap-3 pt-1 text-[11px] uppercase tracking-[0.14em]">
                  <Link
                    to={view.procurementPressureOpportunity.primaryHref}
                    className="opacity-70 hover:opacity-100"
                  >
                    {view.procurementPressureOpportunity.primaryLinkLabel}
                  </Link>
                  {view.procurementPressureOpportunity.secondaryHref ? (
                    <Link
                      to={view.procurementPressureOpportunity.secondaryHref}
                      className="opacity-70 hover:opacity-100"
                    >
                      {view.procurementPressureOpportunity.secondaryLinkLabel ?? 'Open'}
                    </Link>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          {view.strategicActionBudgetOpportunity ? (
            <section className="panel space-y-3" aria-label="Strategic action budget opportunity">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Action budget opportunity</h2>
                  <p className="text-xs opacity-60">
                    Strategic-turn support pool versus committed deployment demand.
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass(view.strategicActionBudgetOpportunity.tone)}`}
                >
                  {view.strategicActionBudgetOpportunity.severityLabel}
                </span>
              </div>
              <div
                className={`rounded border px-3 py-3 space-y-2 ${toneSurfaceClass(view.strategicActionBudgetOpportunity.tone)}`}
              >
                <p className="text-sm font-medium">{view.strategicActionBudgetOpportunity.title}</p>
                <p className="text-sm opacity-80">
                  {view.strategicActionBudgetOpportunity.summary}
                </p>
                <p className="text-sm font-semibold text-amber-100/90">
                  {view.strategicActionBudgetOpportunity.budgetLine}
                </p>
                <p className="text-xs uppercase tracking-[0.12em] opacity-70">
                  Lead lane: {view.strategicActionBudgetOpportunity.pressureLaneLabel}
                </p>
                {view.strategicActionBudgetOpportunity.details.length > 0 ? (
                  <ul className="space-y-1 text-sm opacity-70">
                    {view.strategicActionBudgetOpportunity.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="flex flex-wrap gap-3 pt-1 text-[11px] uppercase tracking-[0.14em]">
                  <Link
                    to={view.strategicActionBudgetOpportunity.primaryHref}
                    className="opacity-70 hover:opacity-100"
                  >
                    {view.strategicActionBudgetOpportunity.primaryLinkLabel}
                  </Link>
                  <Link
                    to={view.strategicActionBudgetOpportunity.secondaryHref}
                    className="opacity-70 hover:opacity-100"
                  >
                    {view.strategicActionBudgetOpportunity.secondaryLinkLabel}
                  </Link>
                </div>
              </div>
            </section>
          ) : null}

          {view.tagConflictValueStreamOpportunity ? (
            <section className="panel space-y-3" aria-label="Tag conflict value stream opportunity">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Tag-conflict opportunity</h2>
                  <p className="text-xs opacity-60">
                    Region-tag conflict lead derived from active case tags.
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass(view.tagConflictValueStreamOpportunity.tone)}`}
                >
                  {view.tagConflictValueStreamOpportunity.conflictLabel}
                </span>
              </div>
              <div
                className={`rounded border px-3 py-3 space-y-2 ${toneSurfaceClass(view.tagConflictValueStreamOpportunity.tone)}`}
              >
                <p className="text-sm font-medium">
                  {view.tagConflictValueStreamOpportunity.title}
                </p>
                <p className="text-sm opacity-80">
                  {view.tagConflictValueStreamOpportunity.summary}
                </p>
                <p className="text-xs uppercase tracking-[0.12em] opacity-70">
                  Value stream: {view.tagConflictValueStreamOpportunity.valueStreamLabel}
                </p>
                {view.tagConflictValueStreamOpportunity.details.length > 0 ? (
                  <ul className="space-y-1 text-sm opacity-70">
                    {view.tagConflictValueStreamOpportunity.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="flex flex-wrap gap-3 pt-1 text-[11px] uppercase tracking-[0.14em]">
                  <Link
                    to={view.tagConflictValueStreamOpportunity.primaryHref}
                    className="opacity-70 hover:opacity-100"
                  >
                    {view.tagConflictValueStreamOpportunity.primaryLinkLabel}
                  </Link>
                  <Link
                    to={view.tagConflictValueStreamOpportunity.secondaryHref}
                    className="opacity-70 hover:opacity-100"
                  >
                    {view.tagConflictValueStreamOpportunity.secondaryLinkLabel}
                  </Link>
                </div>
              </div>
            </section>
          ) : null}

          {view.hubOpportunityLead ? (
            <section className="panel space-y-3" aria-label="Hub simulation opportunity lead">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Hub opportunity</h2>
                  <p className="text-xs opacity-60">
                    Faction-driven opportunity surfaced by the hub simulation layer.
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass(view.hubOpportunityLead.tone)}`}
                >
                  {view.hubOpportunityLead.confidenceLabel}
                </span>
              </div>
              <div
                className={`rounded border px-3 py-3 space-y-2 ${toneSurfaceClass(view.hubOpportunityLead.tone)}`}
              >
                <p className="text-sm font-medium">{view.hubOpportunityLead.title}</p>
                <p className="text-sm opacity-80">{view.hubOpportunityLead.summary}</p>
                {view.hubOpportunityLead.statusLabel ? (
                  <p className="text-xs uppercase tracking-[0.12em] opacity-70">
                    Access: {view.hubOpportunityLead.statusLabel}
                    {view.hubOpportunityLead.statusDetail
                      ? ` — ${view.hubOpportunityLead.statusDetail}`
                      : ''}
                  </p>
                ) : null}
                {view.hubOpportunityLead.misleading ? (
                  <p className="text-xs text-amber-300">Potentially misleading signal</p>
                ) : null}
                {view.hubOpportunityLead.details.length > 0 ? (
                  <ul className="space-y-1 text-sm opacity-70">
                    {view.hubOpportunityLead.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="flex flex-wrap gap-3 pt-1 text-[11px] uppercase tracking-[0.14em]">
                  <Link
                    to={view.hubOpportunityLead.primaryHref}
                    className="opacity-70 hover:opacity-100"
                  >
                    {view.hubOpportunityLead.primaryLinkLabel}
                  </Link>
                  <Link
                    to={view.hubOpportunityLead.secondaryHref}
                    className="opacity-70 hover:opacity-100"
                  >
                    {view.hubOpportunityLead.secondaryLinkLabel}
                  </Link>
                </div>
              </div>
            </section>
          ) : null}

          {view.hubRumorLead ? (
            <section className="panel space-y-3" aria-label="Hub simulation rumor lead">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Hub rumor</h2>
                  <p className="text-xs opacity-60">
                    Social rumor lead filtered through the hub simulation layer.
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass(view.hubRumorLead.tone)}`}
                >
                  {view.hubRumorLead.confidenceLabel}
                </span>
              </div>
              <div
                className={`rounded border px-3 py-3 space-y-2 ${toneSurfaceClass(view.hubRumorLead.tone)}`}
              >
                <p className="text-sm font-medium">{view.hubRumorLead.title}</p>
                <p className="text-sm opacity-80">{view.hubRumorLead.summary}</p>
                {view.hubRumorLead.misleading ? (
                  <p className="text-xs text-amber-300">Potentially misleading rumor</p>
                ) : null}
                {view.hubRumorLead.filtered ? (
                  <p className="text-xs text-rose-300">Socially filtered rumor</p>
                ) : null}
                {view.hubRumorLead.details.length > 0 ? (
                  <ul className="space-y-1 text-sm opacity-70">
                    {view.hubRumorLead.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="flex flex-wrap gap-3 pt-1 text-[11px] uppercase tracking-[0.14em]">
                  <Link to={view.hubRumorLead.primaryHref} className="opacity-70 hover:opacity-100">
                    {view.hubRumorLead.primaryLinkLabel}
                  </Link>
                  <Link
                    to={view.hubRumorLead.secondaryHref}
                    className="opacity-70 hover:opacity-100"
                  >
                    {view.hubRumorLead.secondaryLinkLabel}
                  </Link>
                </div>
              </div>
            </section>
          ) : null}

          <section className="panel space-y-3" aria-label="Active pressures">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Active Pressures</h2>
                <p className="text-sm opacity-70">{view.activePressureSummary}</p>
              </div>
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass('warning')}`}
              >
                Dominant: {view.dominantPressureLabel}
              </span>
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
              <Link to={APP_ROUTES.report} className="text-sm opacity-60 hover:opacity-100">
                All reports
              </Link>
            </div>
            {view.recentOutcomes.length > 0 ? (
              <div className="space-y-2">
                <h3 className="font-medium">Recent outcome explanations</h3>
                <ul className="space-y-2">
                  {view.recentOutcomes.map((entry) => (
                    <li
                      key={`${entry.week}:${entry.missionId}`}
                      className="rounded border border-white/10 px-3 py-2"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            <Link
                              to={APP_ROUTES.caseDetail(entry.missionId)}
                              className="hover:underline"
                            >
                              {entry.missionTitle}
                            </Link>
                          </p>
                          <p className="text-xs opacity-55">
                            Week{' '}
                            <Link
                              to={APP_ROUTES.reportDetail(entry.week)}
                              className="hover:underline"
                            >
                              {entry.week}
                            </Link>{' '}
                            / {entry.outcomeLabel}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass(entry.outcomeLabel === 'Fail' ? 'danger' : entry.outcomeLabel === 'Partial' ? 'warning' : 'info')}`}
                        >
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
                            {item.href ? (
                              <Link to={item.href} className="hover:underline">
                                {item.title}
                              </Link>
                            ) : (
                              item.title
                            )}
                          </p>
                          <p className="text-xs opacity-55">{item.meta}</p>
                        </div>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass(item.tone)}`}
                        >
                          {formatToneLabel(item.tone)}
                        </span>
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
            <div className="space-y-3" ref={departureControls}>
              <button
                ref={departureToggle}
                type="button"
                className="btn btn-sm btn-ghost"
                aria-expanded={showDepartureNotices}
                aria-controls="front-desk-departure-notices"
                onClick={() => {
                  setDepartureDraft(undefined)
                  setDepartureQuery(showDepartureNotices ? null : '')
                }}
              >
                {showDepartureNotices
                  ? EVENT_FEED_TEXT.hideDepartureNotices
                  : EVENT_FEED_TEXT.showDepartureNotices}
              </button>
              <section
                id="front-desk-departure-notices"
                aria-label={EVENT_FEED_TEXT.departureNotices}
                hidden={!showDepartureNotices}
              >
                {savedDepartureQuery !== null && departureQuery !== null ? (
                  <div className="space-y-3">
                    <div
                      onBlur={() => {
                        if (departureQuery !== savedDepartureQuery)
                          setDepartureQuery(departureQuery)
                      }}
                    >
                      <FilterInput
                        id="front-desk-departure-search"
                        label={EVENT_FEED_TEXT.searchDepartureNotices}
                        type="search"
                        value={departureQuery}
                        onChange={(value) =>
                          setDepartureDraft({ origin: savedDepartureQuery, value })
                        }
                      />
                    </div>
                    {departureNotices.length > 0 ? (
                      <ul className="max-h-144 space-y-2 overflow-y-auto">
                        {departureNotices.map((notice) => {
                          const nextStatus = notice.status === 'unread' ? 'read' : 'acknowledged'
                          const acknowledged = notice.status === 'acknowledged'
                          const action =
                            nextStatus === 'read'
                              ? EVENT_FEED_TEXT.markNoticeRead
                              : EVENT_FEED_TEXT.acknowledgeNotice
                          return (
                            <li
                              key={notice.id}
                              className="space-y-2 rounded border border-white/10 px-3 py-2"
                            >
                              {notice.href ? (
                                <Link
                                  to={notice.href}
                                  className="text-sm font-medium hover:underline"
                                >
                                  {notice.title}
                                </Link>
                              ) : (
                                <p className="text-sm font-medium">{notice.title}</p>
                              )}
                              <p className="text-sm opacity-75">{notice.detail}</p>
                              <div className="flex flex-wrap items-center gap-2">
                                <p role="status" className="text-xs">
                                  {EVENT_FEED_TEXT.noticeStatus[notice.status]}
                                </p>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-ghost"
                                  aria-disabled={acknowledged}
                                  aria-label={EVENT_FEED_TEXT.noticeActionLabel.replace(
                                    /\{action\}|\{notice\}/g,
                                    (token) => (token === '{action}' ? action : notice.title)
                                  )}
                                  onClick={() => {
                                    if (!acknowledged)
                                      setOperationNoticeStatus(notice.id, nextStatus)
                                  }}
                                >
                                  {action}
                                </button>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm opacity-60">{EVENT_FEED_TEXT.noDepartureNotices}</p>
                    )}
                  </div>
                ) : null}
              </section>
            </div>
          </section>

          <section className="panel space-y-4" role="region" aria-label="Simulation controls">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Simulation Controls</h2>
                <p className="text-sm opacity-60">
                  Week {game.week} · Active cap {game.config.maxActiveCases}
                </p>
                <p className="text-xs opacity-70">
                  Core loop prompt: finish triage and prep, then advance week to publish the next
                  report.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('forgiving')}
                  className="btn btn-sm btn-ghost focus-ring"
                >
                  {DASHBOARD_PRESET_LABELS.forgiving}
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('standard')}
                  className="btn btn-sm btn-ghost focus-ring"
                >
                  {DASHBOARD_PRESET_LABELS.standard}
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('nightmare')}
                  className="btn btn-sm btn-ghost focus-ring"
                >
                  {DASHBOARD_PRESET_LABELS.nightmare}
                </button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <label
                  htmlFor="frontdesk-seed"
                  className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
                >
                  {CONFIG_FIELDS.seed}
                </label>
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
                <label
                  htmlFor="frontdesk-stage-scalar"
                  className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
                >
                  {CONFIG_FIELDS.stageScalar}
                </label>
                <input
                  id="frontdesk-stage-scalar"
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={game.config.stageScalar}
                  onChange={(event) => updateNumberField('stageScalar', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="frontdesk-partial-margin"
                  className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
                >
                  {CONFIG_FIELDS.partialMargin}
                </label>
                <input
                  id="frontdesk-partial-margin"
                  type="number"
                  className="form-input"
                  value={game.config.partialMargin}
                  onChange={(event) => updateNumberField('partialMargin', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="frontdesk-active-cap"
                  className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
                >
                  {CONFIG_FIELDS.activeCap}
                </label>
                <input
                  id="frontdesk-active-cap"
                  type="number"
                  className="form-input"
                  value={game.config.maxActiveCases}
                  onChange={(event) => updateNumberField('maxActiveCases', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="frontdesk-attrition"
                  className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
                >
                  {CONFIG_FIELDS.attritionPerWeek}
                </label>
                <input
                  id="frontdesk-attrition"
                  type="number"
                  className="form-input"
                  value={game.config.attritionPerWeek}
                  onChange={(event) => updateNumberField('attritionPerWeek', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="frontdesk-probability-k"
                  className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
                >
                  {CONFIG_FIELDS.probabilityK}
                </label>
                <input
                  id="frontdesk-probability-k"
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={game.config.probabilityK}
                  onChange={(event) => updateNumberField('probabilityK', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="frontdesk-raid-penalty"
                  className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
                >
                  {CONFIG_FIELDS.raidTeamPenalty}
                </label>
                <input
                  id="frontdesk-raid-penalty"
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={game.config.raidCoordinationPenaltyPerExtraTeam}
                  onChange={(event) =>
                    updateNumberField('raidCoordinationPenaltyPerExtraTeam', event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="frontdesk-duration-model"
                  className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50"
                >
                  {CONFIG_FIELDS.durationModel}
                </label>
                <select
                  id="frontdesk-duration-model"
                  className="form-select"
                  value={game.config.durationModel}
                  disabled={!game.config.challengeModeEnabled}
                  onChange={(event) =>
                    updateConfig({
                      durationModel: event.target.value as typeof game.config.durationModel,
                    })
                  }
                >
                  <option value="capacity">{CONFIG_FIELDS.durationModelCapacity}</option>
                  <option value="attrition">{CONFIG_FIELDS.durationModelAttrition}</option>
                </select>
              </div>
            </div>

            <p className="text-sm opacity-60">
              {game.config.challengeModeEnabled
                ? CONFIG_FIELDS.durationModelUnlockedHint
                : CONFIG_FIELDS.durationModelLockedHint}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopySeed}
                className="btn btn-sm btn-ghost focus-ring"
              >
                <IconCopy className="h-4 w-4" aria-hidden="true" />
                {DASHBOARD_ACTIONS.copySeed}
              </button>
              <button
                type="button"
                onClick={() => setSeed(Date.now())}
                className="btn btn-sm btn-ghost focus-ring"
              >
                {DASHBOARD_ACTIONS.newSeed}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(false)
                  advanceWeek()
                }}
                disabled={game.gameOver}
                className="btn btn-sm focus-ring"
              >
                <IconAdvance className="h-4 w-4" aria-hidden="true" />
                {DASHBOARD_ACTIONS.advanceWeek}
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm((current) => !current)}
                className="btn btn-sm btn-ghost focus-ring"
              >
                <IconReset className="h-4 w-4" aria-hidden="true" />
                {DASHBOARD_ACTIONS.reset}
              </button>
            </div>

            {showResetConfirm ? (
              <div className="flex flex-wrap items-center gap-2 rounded border border-white/10 px-3 py-2">
                <p className="text-sm opacity-70">{DASHBOARD_CONFIRM.resetPrompt}</p>
                <button
                  type="button"
                  onClick={() => {
                    reset()
                    setShowResetConfirm(false)
                  }}
                  className="btn btn-sm"
                >
                  {DASHBOARD_CONFIRM.confirmReset}
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="btn btn-sm btn-ghost"
                >
                  {DASHBOARD_CONFIRM.cancelReset}
                </button>
              </div>
            ) : null}

            <p
              aria-live="polite"
              className={
                seedFeedback.kind === 'error'
                  ? 'text-sm text-red-300'
                  : seedFeedback.kind === 'success'
                    ? 'text-sm text-green-300'
                    : 'text-sm opacity-60'
              }
            >
              {seedFeedback.message}
            </p>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="panel space-y-3" aria-label="Team readiness and field status">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Teams / Field Status</h2>
              <Link to={APP_ROUTES.teams} className="text-sm opacity-60 hover:opacity-100">
                Open teams
              </Link>
            </div>
            {view.teamStatus.length > 0 ? (
              <ul className="space-y-2">
                {view.teamStatus.map((team) => (
                  <li key={team.teamId} className="rounded border border-white/10 px-3 py-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          <Link to={team.href} className="hover:underline">
                            {team.teamName}
                          </Link>
                        </p>
                        <p className="text-xs opacity-55">{team.summary}</p>
                        {team.recoverySummary ? (
                          <p className="text-xs opacity-70">{team.recoverySummary}</p>
                        ) : null}
                      </div>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass(mapTeamStatusTone(team.statusLabel))}`}
                      >
                        {team.statusLabel}
                      </span>
                    </div>
                    <p className="mt-2 text-xs opacity-65">
                      {team.members.length > 0 ? team.members.join(', ') : 'No agents assigned'}
                    </p>
                    {team.tags.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {team.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`rounded-full border px-2 py-0.5 text-[11px] ${toneChipClass('neutral')}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm opacity-60">
                No team readiness summaries are currently available.
              </p>
            )}
          </section>

          <section className="panel space-y-3" aria-label="Procurement snapshot">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Procurement Snapshot</h2>
              <div className="flex items-center gap-3 text-sm">
                <Link
                  to={view.procurementSnapshot.primaryHref}
                  className="opacity-60 hover:opacity-100"
                >
                  Open markets
                </Link>
                <Link
                  to={view.procurementSnapshot.secondaryHref}
                  className="opacity-60 hover:opacity-100"
                >
                  Open fabrication
                </Link>
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
              <Link to={APP_ROUTES.rankings} className="text-sm opacity-60 hover:opacity-100">
                Open rankings
              </Link>
            </div>
            <p className="text-sm opacity-75">{view.standingSummary.summary}</p>
            <ul className="space-y-2 text-sm opacity-70">
              {view.standingSummary.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              {view.standingSummary.links.map((link) => (
                <Link key={link.label} to={link.href} className="btn btn-sm btn-ghost">
                  {link.label}
                </Link>
              ))}
            </div>
          </section>

          <section className="panel space-y-3" aria-label="Latest report">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Latest Report</h2>
              <Link to={APP_ROUTES.report} className="text-sm opacity-60 hover:opacity-100">
                All reports
              </Link>
            </div>
            {view.latestReport ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium">
                    <Link to={view.latestReport.href} className="hover:underline">
                      Week {view.latestReport.week}
                    </Link>
                  </p>
                  <p className={view.latestReport.score >= 0 ? 'text-green-300' : 'text-red-300'}>
                    {view.latestReport.score >= 0 ? '+' : ''}
                    {view.latestReport.score}{' '}
                    {Math.abs(view.latestReport.score) === 1 ? 'pt' : 'pts'}
                  </p>
                </div>
                <p className="text-sm opacity-70">
                  Week {view.latestReport.week} totals: {view.latestReport.summary}
                </p>
                <p className="text-sm opacity-60">{view.latestReport.detail}</p>
                <section
                  className="space-y-2 border-t border-white/10 pt-2"
                  aria-label="Containment rating"
                >
                  <h3 className="text-sm font-semibold">Containment rating</h3>
                  {view.latestReport.containment.status === 'changed' ? (
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">
                        {view.latestReport.containment.before}% →{' '}
                        {view.latestReport.containment.after}%
                      </p>
                      <p className="opacity-75">
                        Week-close agency update · Record {view.latestReport.containment.eventId}
                      </p>
                      <p className="opacity-75">
                        {view.latestReport.containment.after > view.latestReport.containment.before
                          ? 'A higher rating can improve the agency’s standing when generating future candidate pools.'
                          : 'A lower rating can weaken the agency’s standing when generating future candidate pools.'}
                      </p>
                      <Link to={APP_ROUTES.recruitment} className="underline">
                        Review recruitment options
                      </Link>
                    </div>
                  ) : (
                    <p className="text-sm opacity-70">
                      {view.latestReport.containment.status === 'quiet'
                        ? 'No containment rating change recorded for this week.'
                        : 'Containment rating history is incomplete for this week.'}
                    </p>
                  )}
                </section>
                <section
                  className="space-y-2 border-t border-white/10 pt-2"
                  aria-label="Week-close funding"
                >
                  <h3 className="text-sm font-semibold">Week-close funding</h3>
                  {view.latestReport.funding.status === 'changed' ? (
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">
                        {view.latestReport.funding.before} → {view.latestReport.funding.after}{' '}
                        funding
                      </p>
                      <p className="opacity-75">
                        Funding source · Record {view.latestReport.funding.eventId}
                      </p>
                      <p className="opacity-75">
                        {view.latestReport.funding.after < view.latestReport.funding.before
                          ? 'The closing update shows less funding. Check today’s balance and supplier prices before you order or defer a purchase.'
                          : 'The closing update shows more funding. Check today’s balance and supplier prices before you reconsider a deferred purchase.'}
                      </p>
                      <Link to={APP_ROUTES.marketsSuppliers} className="underline">
                        Check procurement affordability
                      </Link>
                    </div>
                  ) : (
                    <p className="text-sm opacity-70">
                      {view.latestReport.funding.status === 'unchanged'
                        ? 'Funding held steady in the recorded closing update.'
                        : 'The funding comparison is unavailable for this report.'}
                    </p>
                  )}
                  {view.latestReport.funding.status !== 'incomplete' && (
                    <p className="text-sm opacity-60">
                      Imported history can include reconstructed balances.
                    </p>
                  )}
                </section>
                <section
                  className="space-y-2 border-t border-white/10 pt-2"
                  aria-label="Field-agent hiring"
                >
                  <h3 className="text-sm font-semibold">Field-agent hiring</h3>
                  {view.latestReport.fieldAgentHires.hireCount > 0 && (
                    <>
                      <p className="text-sm opacity-70">
                        New field agents expand the roster. Review their readiness before assigning
                        duties.
                      </p>
                      <ul className="space-y-2" aria-label="Field-agent hires">
                        {view.latestReport.fieldAgentHires.hires.map((hire) => (
                          <li key={hire.eventId} className="text-sm">
                            <p className="font-medium">{hire.agentName} joined the field roster</p>
                            <p className="opacity-75">Hire record {hire.eventId}</p>
                            <Link to={hire.agentHref} className="underline">
                              Review {hire.agentName} in Roster
                            </Link>
                          </li>
                        ))}
                      </ul>
                      {view.latestReport.fieldAgentHires.hireCount >
                        view.latestReport.fieldAgentHires.hires.length && (
                        <p className="text-sm opacity-70">
                          Showing {view.latestReport.fieldAgentHires.hires.length} of{' '}
                          {view.latestReport.fieldAgentHires.hireCount} verified hires.
                        </p>
                      )}
                    </>
                  )}
                  {!view.latestReport.fieldAgentHires.historyAvailable ? (
                    <p className="text-sm opacity-70">
                      Field-agent hire history is incomplete for this week.
                    </p>
                  ) : view.latestReport.fieldAgentHires.hireCount === 0 ? (
                    <p className="text-sm opacity-70">
                      No field-agent hires recorded for this week.
                    </p>
                  ) : null}
                </section>
                <WeekCloseStaffInjuries staffInjuries={view.latestReport.staffInjuries} />
                <div className="space-y-2 border-t border-white/10 pt-2">
                  <h3 className="text-sm font-semibold">Staff training</h3>
                  {view.latestReport.staffTraining.completionCount > 0 ? (
                    <>
                      <p className="text-sm opacity-70">
                        Completed courses free their training slots.
                      </p>
                      <ul className="space-y-2" aria-label="Staff training completions">
                        {view.latestReport.staffTraining.completions.map((completion) => (
                          <li key={completion.eventId} className="text-sm">
                            <p className="font-medium">
                              {completion.agentName} completed {completion.trainingName}
                            </p>
                            <p className="opacity-75">Training record {completion.eventId}</p>
                            {completion.agentHref ? (
                              <Link to={completion.agentHref} className="underline">
                                Review {completion.agentName} before assigning duties
                              </Link>
                            ) : (
                              <p className="opacity-75">This agent’s record is unavailable.</p>
                            )}
                          </li>
                        ))}
                      </ul>
                      {view.latestReport.staffTraining.completionCount >
                        view.latestReport.staffTraining.completions.length && (
                        <p className="text-sm opacity-70">
                          Showing {view.latestReport.staffTraining.completions.length} of{' '}
                          {view.latestReport.staffTraining.completionCount} recorded completions.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm opacity-70">
                      {view.latestReport.staffTraining.historyAvailable
                        ? 'No individual training completions recorded for this week.'
                        : 'Training history is incomplete for this week.'}
                    </p>
                  )}
                </div>
                <WeekCloseTeamFatigue report={view.latestReport} />
                <section
                  aria-label="Coaching assignments"
                  className="space-y-2 border-t border-white/10 pt-2"
                >
                  <h3 className="text-sm font-semibold">Coaching assignments</h3>
                  {view.latestReport.coachingAssignments.instructorCount > 0 ? (
                    <>
                      <p className="text-sm opacity-70">
                        Each assignment committed an instructor’s coaching slot at the time.
                      </p>
                      <ul className="space-y-2" aria-label="Recorded coaching assignments">
                        {view.latestReport.coachingAssignments.assignments.map((assignment) => (
                          <li key={assignment.eventId} className="text-sm">
                            <p className="font-medium">
                              {assignment.instructorName} was assigned to coach{' '}
                              {assignment.agentName}
                            </p>
                            <p className="opacity-75">Coaching record {assignment.eventId}</p>
                          </li>
                        ))}
                      </ul>
                      {view.latestReport.coachingAssignments.instructorCount >
                        view.latestReport.coachingAssignments.assignments.length && (
                        <p className="text-sm opacity-70">
                          Showing {view.latestReport.coachingAssignments.assignments.length} of{' '}
                          {view.latestReport.coachingAssignments.instructorCount} instructors
                          assigned this week.
                        </p>
                      )}
                      <Link
                        to={`${APP_ROUTES.trainingDivision}?advanced=1`}
                        className="text-sm underline"
                      >
                        Check current coaching assignments
                      </Link>
                    </>
                  ) : (
                    <p className="text-sm opacity-70">
                      {view.latestReport.coachingAssignments.historyAvailable
                        ? 'No coaching assignments recorded for this week.'
                        : 'Coaching assignment history is incomplete for this week.'}
                    </p>
                  )}
                </section>
                <div className="space-y-2 border-t border-white/10 pt-2">
                  <h3 className="text-sm font-semibold">Relationships</h3>
                  {view.latestReport.relationships.directionCount > 0 ? (
                    <>
                      <p className="text-sm opacity-70">
                        Latest recorded change in each direction.
                      </p>
                      {!view.latestReport.relationships.historyAvailable && (
                        <p className="text-sm opacity-70">
                          Earlier relationship history is incomplete.
                        </p>
                      )}
                      <ul className="space-y-2" aria-label="Relationship changes">
                        {view.latestReport.relationships.changes.map((change) => (
                          <li key={change.directionId} className="text-sm">
                            <p className="font-medium">{change.label}</p>
                            <p className="opacity-75">
                              {change.comparison} · {change.cause} · Record {change.eventId}
                            </p>
                          </li>
                        ))}
                      </ul>
                      {view.latestReport.relationships.directionCount >
                        view.latestReport.relationships.changes.length && (
                        <p className="text-sm opacity-70">
                          Showing {view.latestReport.relationships.changes.length} of{' '}
                          {view.latestReport.relationships.directionCount} recorded directions.
                        </p>
                      )}
                      <p className="text-sm opacity-70">
                        Relationship values affect team cohesion. Check chemistry before assigning
                        staff together.
                      </p>
                      <Link
                        to={`${APP_ROUTES.trainingDivision}?advanced=1`}
                        className="text-sm underline"
                      >
                        Review team chemistry
                      </Link>
                    </>
                  ) : (
                    <p className="text-sm opacity-70">
                      {view.latestReport.relationships.historyAvailable
                        ? 'No qualifying staff relationship changes recorded for this week.'
                        : 'Relationship comparison unavailable for this week.'}
                    </p>
                  )}
                </div>
                <div className="space-y-2 border-t border-white/10 pt-2">
                  <h3 className="text-sm font-semibold">Current unresolved cases</h3>
                  {view.latestReport.unresolvedCaseCount === 0 ? (
                    <p className="text-sm opacity-70">No unresolved cases on the Cases board.</p>
                  ) : (
                    <ul className="space-y-2" aria-label="Unresolved cases">
                      {view.latestReport.unresolvedCases.map((currentCase) => (
                        <li key={currentCase.id} className="text-sm">
                          <p className="font-medium">{currentCase.title}</p>
                          <p className="opacity-75">
                            {[currentCase.status, currentCase.timing].filter(Boolean).join(' · ')}
                          </p>
                          <p className="opacity-75">{currentCase.change}</p>
                          <Link
                            to={currentCase.href}
                            className="text-sm underline"
                            aria-label={`${currentCase.action}: ${currentCase.title}`}
                          >
                            {currentCase.action}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  {view.latestReport.unresolvedCaseCount >
                    view.latestReport.unresolvedCases.length && (
                    <Link to={APP_ROUTES.cases} className="text-sm underline">
                      Open Cases board ({view.latestReport.unresolvedCaseCount} unresolved)
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm opacity-60">{EMPTY_STATES.noReports}</p>
            )}
          </section>
        </aside>
      </div>
      <details>
        <summary>Campaign import and export</summary>
        <RunTransferPanel allowNewRun={false} />
      </details>
    </section>
  )
}

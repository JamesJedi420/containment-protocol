import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'

import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import {
  buildMissionTriageBoardViews,
  normalizeCaseListFilters,
  readCaseListFilters,
  writeCaseListFilters,
} from '../../features/cases/caseView'
import { buildMissionTriageShellExtensionSignals } from '../../features/cases/missionTriageShellExtensionView'
import { IconAdvance, IconReports, IconVolumeOff, IconVolumeOn } from '../shellIcons'
import { SettingsAccess } from './SettingsAccess'
import { buildShellStatusBarView, type ShellStatusSignalView } from './shellStatusBarView'

function isCasesRoute(pathname: string) {
  return pathname === APP_ROUTES.cases || pathname.startsWith(`${APP_ROUTES.cases}/`)
}

interface WeekCloseAnnouncement {
  message: string
  reportHref: string
  reportLinkLabel: string
}

export function ShellStatusBar() {
  const { game, advanceWeek, gameReplacementRevision } = useGameStore()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [muted, setMuted] = useState(false)
  const view = useMemo(() => buildShellStatusBarView(game), [game])
  const extensionSignals = useMemo(() => {
    if (!isCasesRoute(location.pathname)) {
      return []
    }

    const triageViewOptions = {
      includeCovertPrepSignals: true as const,
      includeIntakeSignals: true as const,
      includeModalitySignals: true as const,
      includeCloseoutRewardPayoutSignals: true as const,
    }
    const filters = normalizeCaseListFilters(
      game,
      readCaseListFilters(searchParams),
      triageViewOptions
    )
    const boardViews = buildMissionTriageBoardViews(game, filters, triageViewOptions)
    const queryString = writeCaseListFilters(filters).toString()
    const casesHref = queryString ? `${APP_ROUTES.cases}?${queryString}` : APP_ROUTES.cases

    return buildMissionTriageShellExtensionSignals(game, boardViews, casesHref)
  }, [game, location.pathname, searchParams])
  const signals = useMemo(
    () => [...view.signals, ...extensionSignals],
    [view.signals, extensionSignals]
  )
  const [weekAnnouncement, setWeekAnnouncement] = useState<WeekCloseAnnouncement | null>(null)
  const previousGameRef = useRef(game)
  const replacementRevisionRef = useRef(gameReplacementRevision)
  const weekStatusRef = useRef<HTMLDivElement>(null)

  // A close appends one report. Save replacement clears any old announcement.
  useEffect(() => {
    const previous = previousGameRef.current
    previousGameRef.current = game
    const replaced = replacementRevisionRef.current !== gameReplacementRevision
    replacementRevisionRef.current = gameReplacementRevision
    if (replaced) {
      setWeekAnnouncement(null)
      return
    }
    if (game.reports === previous.reports && game.week === previous.week) return
    const completedClose =
      game.week === previous.week + 1 &&
      game.reports.length === previous.reports.length + 1 &&
      previous.reports.every((report, index) => game.reports[index] === report) &&
      game.reports.at(-1)?.week === previous.week
    if (!completedClose) {
      setWeekAnnouncement(null)
      return
    }

    const latestReport = game.reports.at(-1)
    const closedWeek = latestReport?.week ?? Math.max(1, view.currentWeek - 1)
    const outcome = latestReport
      ? `${latestReport.resolvedCases.length} resolved, ${latestReport.partialCases.length} partial, ${latestReport.failedCases.length} failed`
      : 'outcome report pending'

    setWeekAnnouncement({
      message: game.gameOver
        ? `Week ${closedWeek} closed: ${outcome}. Simulation halted.`
        : `Week ${closedWeek} closed: ${outcome}. Week ${view.currentWeek} started.`,
      reportHref: view.weeklyReportHref,
      reportLinkLabel: latestReport ? `Open week ${closedWeek} report` : 'Open weekly reports',
    })
  }, [game, gameReplacementRevision, view.currentWeek, view.weeklyReportHref])

  useEffect(() => {
    if (weekAnnouncement) weekStatusRef.current?.focus()
  }, [weekAnnouncement])

  return (
    <>
      <header className="topbar-shell" role="banner" aria-label="Shell status bar">
        <div className="topbar-left" data-testid="topbar-left-zone">
          <p className="topbar-org-name">{view.organizationName}</p>
          <p className="topbar-org-tier">{view.organizationStatus}</p>
        </div>

        <div className="topbar-center" data-testid="topbar-center-zone">
          <div className="topbar-status-strip whitespace-nowrap" data-testid="shell-status-strip">
            <ul className="topbar-metrics" data-testid="topbar-metrics-row">
              <Metric label="Roster" value={`${view.rosterSize.current}/${view.rosterSize.max}`} />
              <Metric label="Contracts" value={String(view.activeContracts)} />
              <Metric label="Rep" value={String(view.totalReputation)} />
              <Metric label="Rank" value={String(view.organizationRank)} />
              <Metric label="Money" value={`$${view.money}`} />
              <Metric label="Year" value={String(view.currentYear)} />
              <Metric label="Season" value={view.currentSeason} />
              <Metric label="Weeks" value={String(view.weeksSinceStart)} />
            </ul>

            <div className="topbar-signal-group" data-testid="shell-status-signals-row">
              {signals.map((signal) => (
                <SignalChip key={signal.id} signal={signal} />
              ))}
            </div>
          </div>
        </div>

        <div className="topbar-right" data-testid="topbar-right-actions">
          <div className="topbar-utility-group" data-testid="topbar-utility-group">
            <Link
              to={APP_ROUTES.help}
              className="btn btn-xs btn-ghost topbar-icon-btn"
              aria-label="Help"
              title="TODO: player-facing help surface."
              data-topbar-action="help"
            >
              ?
            </Link>

            <button
              type="button"
              className="btn btn-xs btn-ghost topbar-icon-btn"
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
              title={muted ? 'Unmute' : 'Mute'}
              onClick={() => setMuted((current) => !current)}
              data-topbar-action="mute"
            >
              {muted ? (
                <IconVolumeOn className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <IconVolumeOff className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>

            <Link
              to={view.weeklyReportHref}
              className="btn btn-xs btn-ghost topbar-icon-btn"
              aria-label={view.weeklyReportAriaLabel}
              title={`Open ${view.weeklyReportAriaLabel.toLowerCase()}`}
              data-topbar-action="weekly-report"
              data-testid="topbar-weekly-report-button"
            >
              <IconReports className="h-3.5 w-3.5" aria-hidden="true" />
              {view.weeklyReportLabel}
            </Link>

            <SettingsAccess />
          </div>

          <span className="topbar-divider" aria-hidden="true" />

          <button
            type="button"
            className="btn btn-sm btn-primary"
            aria-label="Advance week"
            onClick={advanceWeek}
            disabled={game.gameOver}
            title={game.gameOver ? 'Simulation halted' : 'Advance week'}
            data-topbar-action="advance-week"
            data-testid="topbar-advance-button"
          >
            <IconAdvance className="h-4 w-4" aria-hidden="true" />
            Advance Week
          </button>
        </div>
      </header>

      <div
        ref={weekStatusRef}
        tabIndex={-1}
        className={
          weekAnnouncement
            ? 'panel focus-ring flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2 text-sm'
            : 'sr-only'
        }
        data-testid={weekAnnouncement ? 'shell-week-status' : undefined}
      >
        <p role="status" aria-live="polite" aria-atomic="true" data-testid="shell-week-live">
          {weekAnnouncement?.message ?? ''}
        </p>
        {weekAnnouncement ? (
          <Link to={weekAnnouncement.reportHref} className="underline">
            {weekAnnouncement.reportLinkLabel}
          </Link>
        ) : null}
      </div>
    </>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <li className="topbar-metric">
      <span className="topbar-metric-label">{label}</span>
      <span className="topbar-metric-value">{value}</span>
    </li>
  )
}

function SignalChip({ signal }: { signal: ShellStatusSignalView }) {
  const className = `topbar-signal-chip topbar-signal-chip--${signal.tone}`
  const content = (
    <>
      <span className="topbar-signal-label">{signal.label}</span>
      <span className="topbar-signal-value">{signal.value}</span>
    </>
  )

  if (signal.href) {
    return (
      <Link
        to={signal.href}
        className={className}
        title={signal.detail}
        aria-label={`${signal.label}: ${signal.value}. ${signal.detail}`}
        data-status-id={signal.id}
        data-status-tone={signal.tone}
        data-testid={`shell-status-${signal.id}`}
      >
        {content}
      </Link>
    )
  }

  return (
    <span
      className={className}
      title={signal.detail}
      aria-label={`${signal.label}: ${signal.value}. ${signal.detail}`}
      data-status-id={signal.id}
      data-status-tone={signal.tone}
      data-testid={`shell-status-${signal.id}`}
    >
      {content}
    </span>
  )
}

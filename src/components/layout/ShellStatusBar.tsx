import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import {
  IconAdvance,
  IconReports,
  IconSettings,
  IconVolumeOff,
  IconVolumeOn,
} from '../icons'
import { buildShellStatusBarView, type ShellStatusSignalView } from './shellStatusBarView'

export function ShellStatusBar() {
  const { game, advanceWeek } = useGameStore()
  const [muted, setMuted] = useState(false)
  const view = useMemo(() => buildShellStatusBarView(game), [game])

  return (
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
            {view.signals.map((signal) => (
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

          <Link
            to={APP_ROUTES.agency}
            className="btn btn-xs btn-ghost topbar-icon-btn"
            aria-label="Settings"
            title="Settings"
            data-topbar-action="settings"
          >
            <IconSettings className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
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

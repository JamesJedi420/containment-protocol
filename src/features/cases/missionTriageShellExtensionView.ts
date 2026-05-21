import { APP_ROUTES } from '../../app/routes'
import type { ShellStatusSignalView } from '../../components/layout/shellStatusBarView'
import type { GameState } from '../../domain/models'
import type { CaseListItemView } from './caseView'
import { buildMissionTriageContextFooterView } from './missionTriageLayoutView'

export function buildMissionTriageShellExtensionSignals(
  game: GameState,
  views: readonly CaseListItemView[],
  casesHref: string = APP_ROUTES.cases
): ShellStatusSignalView[] {
  const activeViews = views.filter((view) => view.currentCase.status !== 'resolved')
  const footer = buildMissionTriageContextFooterView(activeViews, game)
  const queueDepth = activeViews.length

  const signals: ShellStatusSignalView[] = [
    {
      id: 'triage-queue',
      label: 'Queue',
      value: String(queueDepth),
      tone: 'neutral',
      href: casesHref,
      detail: `${queueDepth} open or in-progress case(s) matching the triage board filters.`,
    },
    {
      id: 'triage-routable',
      label: 'Routable',
      value: String(footer.routableCount),
      tone: footer.routableCount > 0 ? 'info' : 'neutral',
      href: casesHref,
      detail: `${footer.routableCount} open case(s) without role or tag blockers.`,
    },
  ]

  if (footer.urgentIfDeferred > 0) {
    signals.push({
      id: 'triage-urgent',
      label: 'Urgent',
      value: String(footer.urgentIfDeferred),
      tone: 'warning',
      href: casesHref,
      detail: `${footer.urgentIfDeferred} unassigned case(s) that worsen if deferred this week.`,
    })
  }

  return signals
}

import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import type { Agent } from '../../domain/agent/models'
import { REGISTRY_UI_TEXT, ROLE_LABELS } from '../../data/copy'

export interface RegistryAgentItemProps {
  agent: Agent
  teamName?: string
  operationalStatus?: string
  showAgentRole?: boolean
  detailSearch?: string
}

export default function RegistryAgentItem({
  agent,
  teamName,
  operationalStatus = teamName ? REGISTRY_UI_TEXT.fieldTeamStatus : REGISTRY_UI_TEXT.reserveStatus,
  showAgentRole = true,
  detailSearch = '',
}: RegistryAgentItemProps) {
  return (
    <li className="panel space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to={`${APP_ROUTES.registryDetail(agent.id)}${detailSearch}`}
            state={detailSearch ? { registrySearch: detailSearch } : undefined}
            className="font-medium hover:underline"
          >
            <h3 className="font-medium">{agent.name}</h3>
          </Link>
          {showAgentRole && <p className="text-sm opacity-60">{ROLE_LABELS[agent.role]}</p>}
        </div>
        <p
          className="text-xs uppercase tracking-[0.24em] opacity-50"
          aria-label={`Agent status: ${agent.status}`}
        >
          {agent.status}
        </p>
      </div>

      <div className="grid gap-2 text-sm md:grid-cols-3">
        <p
          className="opacity-70"
          aria-label={`Team: ${teamName || REGISTRY_UI_TEXT.reservePoolLabel}`}
        >
          {REGISTRY_UI_TEXT.teamLabel}: {teamName ?? REGISTRY_UI_TEXT.reservePoolLabel}
        </p>
        <p className="opacity-70" aria-label={`Operational state: ${operationalStatus}`}>
          {REGISTRY_UI_TEXT.operationalStateLabel}: {operationalStatus}
        </p>
        <p className="opacity-70" aria-label={`Fatigue level: ${agent.fatigue}`}>
          {REGISTRY_UI_TEXT.fatigueLabel}: {agent.fatigue}
        </p>
        <p
          className="opacity-70"
          aria-label={`Tags: ${agent.tags.length > 0 ? agent.tags.join(', ') : REGISTRY_UI_TEXT.noTagsLabel}`}
        >
          {REGISTRY_UI_TEXT.tagsLabel}: {agent.tags.join(', ') || REGISTRY_UI_TEXT.noTagsLabel}
        </p>
      </div>
    </li>
  )
}

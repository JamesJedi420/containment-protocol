import { type ReactNode, useState } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { AGENTS_GUIDANCE, ROLE_LABELS, SHELL_UI_TEXT } from '../../data/copy'
import type { TabType } from './agentTabsModel'
import type { AgentView } from './agentView'
import { AgentTabsContainer } from './AgentTabsContainer'
import { StatCardWithIcon } from '../../components/StatCard'
import {
  IconFatigue,
  IconScore,
  IconStatCombat,
  IconStatInvestigation,
  IconStatUtility,
  IconStatSocial,
} from '../../components/icons'

export function AgentEntityPanel({
  view,
  activeTab,
  onTabChange,
  headerActions,
}: {
  view: AgentView
  activeTab?: TabType
  onTabChange?: (tab: TabType) => void
  headerActions?: ReactNode
}) {
  const { agent, team, assignedCase, trainingEntry, materialized, domainTags } = view
  const assignmentSummary = getAssignmentSummary(view)
  const [isCompactView, setIsCompactView] = useState(false)

  return (
    <div className="space-y-4" role="main" aria-label="Agent detail panel">
      <article className="panel space-y-4" aria-labelledby="agent-header">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.24em] opacity-50">Operative dossier</p>
              <h2 id="agent-header" className="text-xl font-semibold">{agent.name}</h2>
              <p className="text-sm opacity-70">
                {ROLE_LABELS[agent.role]}
                {materialized.identity.operationalRole
                  ? ` / ${materialized.identity.operationalRole}`
                  : ''}
                {materialized.identity.specialization
                  ? ` / ${materialized.identity.specialization}`
                  : ''}
              </p>
              <p className="text-sm opacity-60">
                {materialized.identity.codename || materialized.identity.callsign
                  ? `Codename ${materialized.identity.codename ?? materialized.identity.callsign}`
                  : 'No codename on file'}
              </p>
              {materialized.identity.background ? (
                <p className="max-w-3xl text-sm opacity-60">{materialized.identity.background}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={getAgentStatusTone(agent.status)} aria-label={`Agent status: ${formatLabel(agent.status)}`}>
                {formatLabel(agent.status)}
              </StatusPill>
              <StatusPill tone={getReadinessTone(materialized.service.readinessBand)} aria-label={`Readiness band: ${formatLabel(materialized.service.readinessBand)}`}>
                Readiness {formatLabel(materialized.service.readinessBand)}
              </StatusPill>
              <StatusPill tone={materialized.service.deploymentEligible ? 'positive' : 'warning'} aria-label={`Deployment eligibility: ${materialized.service.deploymentEligible ? 'Eligible' : 'Not eligible'}`}>
                {materialized.service.deploymentEligible ? 'Deployable' : 'Held back'}
              </StatusPill>
              <StatusPill tone="neutral" aria-label={`Agent level: ${materialized.progression.level}`}>Level {materialized.progression.level}</StatusPill>
              <StatusPill tone="neutral" aria-label={`Assigned team: ${team ? `Response Unit ${team.name}` : 'Reserve pool'}`}>
                {team ? `Response Unit ${team.name}` : 'Reserve pool'}
              </StatusPill>
              {assignedCase ? <StatusPill tone="neutral" aria-label={`Assigned case: ${assignedCase.title}`}>{assignedCase.title}</StatusPill> : null}
              {trainingEntry ? (
                <StatusPill tone="warning" aria-label={`Training: ${trainingEntry.trainingName}`}>{trainingEntry.trainingName}</StatusPill>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {headerActions}
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setIsCompactView((current) => !current)}
              aria-label={isCompactView ? 'Switch to detailed view' : 'Switch to compact view'}
            >
              {isCompactView ? 'Detailed View' : 'Compact View'}
            </button>
            <Link
              to={APP_ROUTES.teams}
              className="btn btn-sm btn-ghost"
              aria-label={`Assign ${agent.name} to a response unit`}
              title="Open teams to assign this agent"
            >
              Assign Agent
            </Link>
            <Link
              to={APP_ROUTES.agentDetail(agent.id)}
              className="btn btn-sm btn-ghost"
              aria-label={`Edit nickname for ${agent.name}`}
              title="Open agent profile to edit codename details"
            >
              Edit Nickname
            </Link>
            {team ? (
              <Link to={APP_ROUTES.teamDetail(team.id)} className="btn btn-sm btn-ghost">
                Open team
              </Link>
            ) : null}
            {assignedCase ? (
              <Link to={APP_ROUTES.caseDetail(assignedCase.id)} className="btn btn-sm btn-ghost">
                Open case
              </Link>
            ) : null}
            <Link to={APP_ROUTES.trainingDivision} className="btn btn-sm btn-ghost">
              Open Training Division
            </Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <StatCardWithIcon label="Evaluation" value={formatNumber(materialized.performance.score)} icon={<IconScore size={18} />} />
          <StatCardWithIcon label="Contribution" value={formatNumber(materialized.performance.contribution)} icon={<IconStatUtility size={18} />} />
          <StatCardWithIcon label="Fatigue" value={materialized.vitals.fatigue} icon={<IconFatigue size={18} />} />
          <StatCardWithIcon label="Stress" value={materialized.vitals.stress} icon={<IconStatSocial size={18} />} />
          <StatCardWithIcon label="Morale" value={materialized.vitals.morale} icon={<IconStatCombat size={18} />} />
          <StatCardWithIcon label="XP to next" value={materialized.progression.xpToNextLevel} icon={<IconStatInvestigation size={18} />} />
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.9fr)]">
        <article className="panel space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-base font-semibold">Operational snapshot</h3>
              <p className="text-sm opacity-60">
                Immediate deployment posture, current duty, and live case contribution model.
              </p>
            </div>
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {materialized.assignment.lifecycleState}
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="rounded border border-white/10 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] opacity-50">Current assignment</p>
              <p className="mt-2 text-base font-medium">{assignmentSummary.title}</p>
              <p className="mt-1 text-sm opacity-70">{assignmentSummary.detail}</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <DossierItem
                  label="Case reference"
                  value={
                    materialized.assignment.caseId
                      ? `${materialized.assignment.caseId}${
                          assignedCase ? ` / ${assignedCase.title}` : ''
                        }`
                      : SHELL_UI_TEXT.none
                  }
                />
                <DossierItem
                  label="Team reference"
                  value={
                    materialized.assignment.teamId
                      ? `${materialized.assignment.teamId}${team ? ` / ${team.name}` : ''}`
                      : SHELL_UI_TEXT.none
                  }
                />
                <DossierItem
                  label="Training program"
                  value={materialized.assignment.trainingProgramId ?? SHELL_UI_TEXT.none}
                />
                <DossierItem
                  label="Queue reference"
                  value={materialized.assignment.queueId ?? SHELL_UI_TEXT.none}
                />
              </div>
            </div>

            <div className="rounded border border-white/10 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] opacity-50">Current output</p>
              <div className="mt-3 space-y-2">
                <PerformanceLine
                  label="Field"
                  value={materialized.performance.fieldPower}
                  hint="Frontline pressure"
                />
                <PerformanceLine
                  label="Containment"
                  value={materialized.performance.containment}
                  hint="Control and sealing"
                />
                <PerformanceLine
                  label="Investigation"
                  value={materialized.performance.investigation}
                  hint="Evidence and analysis"
                />
                <PerformanceLine
                  label="Support"
                  value={materialized.performance.support}
                  hint="Stabilization and uplift"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DossierItem
              label="Readiness state"
              value={formatLabel(materialized.service.readinessState)}
            />
            <DossierItem
              label="Readiness band"
              value={formatLabel(materialized.service.readinessBand)}
            />
            <DossierItem
              label="Deployment"
              value={materialized.service.deploymentEligible ? 'Eligible now' : 'Not eligible'}
            />
            <DossierItem
              label="Recovery"
              value={materialized.service.recoveryRequired ? 'Required' : 'Not required'}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">Risk flags</p>
            {materialized.service.riskFlags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {materialized.service.riskFlags.map((flag) => (
                  <StatusPill key={flag} tone="warning">
                    {formatLabel(flag)}
                  </StatusPill>
                ))}
              </div>
            ) : (
              <p className="text-sm opacity-60">No current risk flags on record.</p>
            )}
          </div>
        </article>

        <article className="panel space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold">Tactical assessment</h3>
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              Read-only build analysis
            </p>
          </div>

          {materialized.assessments.length > 0 ? (
            <ul className="space-y-2">
              {materialized.assessments.map((assessment) => (
                <li key={assessment.id} className="rounded border border-white/10 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{assessment.message}</p>
                    <AssessmentBadge severity={assessment.severity} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm opacity-60">
              No tactical assessments generated for this operative state.
            </p>
          )}

          <div className="rounded border border-white/10 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">Capability tags</p>
            <p className="mt-2 text-sm opacity-80">
              {domainTags.length > 0 ? domainTags.join(', ') : SHELL_UI_TEXT.none}
            </p>
            <p className="mt-2 text-sm opacity-60">{AGENTS_GUIDANCE.tagExplanation}</p>
          </div>
        </article>
      </div>

      <AgentTabsContainer view={view} activeTab={activeTab} onTabChange={onTabChange} />

      <div className={isCompactView ? 'hidden' : 'space-y-4'}>

      <article className="panel space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold">Identity and assignment</h3>
          <p className="text-xs uppercase tracking-[0.24em] opacity-50">
            Long-term service record
          </p>
        </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <DossierItem
                label="Age"
                value={materialized.identity.age ? String(materialized.identity.age) : 'Unknown'}
              />
              <DossierItem label="Specialization" value={materialized.identity.specialization} />
              <DossierItem
                label="Background"
                value={materialized.identity.background ?? 'No background on file'}
              />
              <DossierItem
                label="Assignment started"
                value={
                  materialized.assignment.startedWeek !== undefined
                    ? `Week ${materialized.assignment.startedWeek}`
                    : 'Not started'
                }
              />
              <DossierItem label="Joined agency" value={`Week ${materialized.service.joinedWeek}`} />
              <DossierItem
                label="Last assignment"
                value={
                  materialized.service.lastAssignmentWeek !== undefined
                    ? `Week ${materialized.service.lastAssignmentWeek}`
                    : 'None'
                }
              />
              <DossierItem
                label="Last case"
                value={
                  materialized.service.lastCaseWeek !== undefined
                    ? `Week ${materialized.service.lastCaseWeek}`
                    : 'None'
                }
              />
              <DossierItem
                label="Last training"
                value={
                  materialized.service.lastTrainingWeek !== undefined
                    ? `Week ${materialized.service.lastTrainingWeek}`
                    : 'None'
                }
              />
              <DossierItem
                label="Last recovery"
                value={
                  materialized.service.lastRecoveryWeek !== undefined
                    ? `Week ${materialized.service.lastRecoveryWeek}`
                    : 'None'
                }
              />
              <DossierItem label="Team posture" value={team ? formatLabel(team.statusState) : 'Reserve'} />
              <DossierItem
                label="Assigned case"
                value={assignedCase ? assignedCase.title : SHELL_UI_TEXT.none}
              />
              <DossierItem
                label="Training"
                value={
                  trainingEntry
                    ? `${trainingEntry.trainingName} (${trainingEntry.remainingWeeks}w remaining)`
                    : SHELL_UI_TEXT.none
                }
              />
            </div>
          </article>

          <article className="panel space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold">Domain state</h3>
              <p className="text-xs uppercase tracking-[0.24em] opacity-50">
                Base vs effective vs weighted
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.24em] opacity-50">
                  <tr>
                    <th className="pb-2 pr-4">Domain</th>
                    <th className="pb-2 pr-4">Base</th>
                    <th className="pb-2 pr-4">Effective</th>
                    <th className="pb-2">Weighted</th>
                  </tr>
                </thead>
                <tbody>
                  {materialized.domains.map((domain) => (
                    <tr key={domain.key} className="border-t border-white/10">
                      <td className="py-2 pr-4 font-medium">{domain.label}</td>
                      <td className="py-2 pr-4 opacity-70">{domain.base}</td>
                      <td className="py-2 pr-4 opacity-70">{domain.effective}</td>
                      <td className="py-2 opacity-70">{formatNumber(domain.weighted)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold">Equipment and abilities</h3>
              <p className="text-xs uppercase tracking-[0.24em] opacity-50">
                Passive modifiers only
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-2">
                <div className="space-y-3 rounded border border-white/10 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.24em] opacity-50">Equipment loadout</p>
                    <p className="text-xs uppercase tracking-[0.2em] opacity-50">
                      Additive modifiers only
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <SnapshotMetric
                      label="Equipped slots"
                      value={String(materialized.equipmentSummary.equippedSlots)}
                    />
                    <SnapshotMetric
                      label="Empty slots"
                      value={String(materialized.equipmentSummary.emptySlots)}
                    />
                    <SnapshotMetric
                      label="Context live"
                      value={String(materialized.equipmentSummary.activeContextSlots)}
                    />
                    <SnapshotMetric
                      label="Loadout quality"
                      value={String(materialized.equipmentSummary.loadoutQuality)}
                    />
                  </div>
                </div>

                <ul className="grid gap-3 lg:grid-cols-2" aria-label="Equipment slots">
                  {materialized.equipment.map((item) => (
                    <li
                      key={item.slot}
                      className={`rounded border px-3 py-3 ${
                        item.empty
                          ? 'border-white/10 bg-white/3'
                          : item.contextActive
                            ? 'border-emerald-400/20 bg-emerald-500/[0.07]'
                            : 'border-white/10 bg-white/3'
                      }`}
                      title={item.itemLabel}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] opacity-50">
                            {item.slotLabel}
                          </p>
                          <p className="mt-1 font-medium">{item.itemLabel}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusPill tone={item.contextActive ? 'positive' : 'neutral'}>
                            {item.statusLabel}
                          </StatusPill>
                          <StatusPill tone={item.empty ? 'neutral' : 'warning'}>
                            {item.qualityLabel}
                          </StatusPill>
                        </div>
                      </div>

                      {item.empty ? (
                        <p className="mt-3 text-sm opacity-60">
                          No item slotted. This slot is contributing no additive bonuses.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-2">
                          <EquipmentLine label="Base additive" value={item.baseModifierSummary} />
                          <EquipmentLine
                            label="Context bonus"
                            value={item.contextualModifierSummary}
                            active={item.contextActive}
                          />
                          <EquipmentLine label="Total effect" value={item.totalModifierSummary} />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.24em] opacity-50">Abilities</p>
                {materialized.abilities.length > 0 ? (
                  <ul className="space-y-2" aria-label="Agent abilities">
                    {materialized.abilities.map((ability) => (
                      <li key={ability.id} className="rounded border border-white/10 px-3 py-2" title={ability.description || ability.label}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium">{ability.label}</p>
                          <p className="text-xs uppercase tracking-[0.2em] opacity-50">
                            {ability.activeInMvp ? 'Passive live' : 'Active scaffold'}
                          </p>
                        </div>
                        {ability.description ? (
                          <p className="text-sm opacity-60">{ability.description}</p>
                        ) : null}
                        <p className="text-sm opacity-60">{ability.effectSummary}</p>
                        {ability.contextHint ? (
                          <p className="text-xs italic opacity-45">{ability.contextHint}</p>
                        ) : null}
                        {ability.trigger ? (
                          <p className="text-xs uppercase tracking-[0.2em] opacity-50">
                            Trigger: {ability.trigger}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm opacity-60">No abilities recorded.</p>
                )}
              </div>
            </div>
          </article>

          <article className="panel space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold">Traits and long-term markers</h3>
              <p className="text-xs uppercase tracking-[0.24em] opacity-50">
                Context-aware trait state
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.24em] opacity-50">Traits</p>
                {materialized.traits.length > 0 ? (
                  <ul className="space-y-2" aria-label="Agent traits">
                    {materialized.traits.map((trait) => (
                      <li key={trait.id} className="rounded border border-white/10 px-3 py-2" title={trait.description || trait.label}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium">{trait.label}</p>
                          <p className="text-xs uppercase tracking-[0.2em] opacity-50">
                            {trait.active ? 'Active now' : 'Dormant now'}
                          </p>
                        </div>
                        {trait.description ? (
                          <p className="text-sm opacity-60">{trait.description}</p>
                        ) : null}
                        <p className="text-sm opacity-60">Configured: {trait.configuredSummary}</p>
                        <p className="text-sm opacity-60">Current effect: {trait.activeSummary}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm opacity-60">No passive traits recorded.</p>
                )}
              </div>

              <div className="space-y-3 rounded border border-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.24em] opacity-50">Build signals</p>
                <p className="text-sm opacity-80">
                  {domainTags.length > 0 ? domainTags.join(', ') : SHELL_UI_TEXT.none}
                </p>
                <p className="text-sm opacity-60">
                  These signals combine authored tags, specialization, role posture, and trait markers.
                </p>
              </div>
            </div>
          </article>
      </div>
    </div>
  )
}

function SnapshotMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  )
}

function DossierItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}

function PerformanceLine({
  label,
  value,
  hint,
}: {
  label: string
  value: number
  hint: string
}) {
  return (
    <div className="rounded border border-white/10 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">{label}</p>
        <p className="text-sm font-semibold">{formatNumber(value)}</p>
      </div>
      <p className="text-xs opacity-50">{hint}</p>
    </div>
  )
}

function EquipmentLine({
  label,
  value,
  active,
}: {
  label: string
  value: string
  active?: boolean
}) {
  return (
    <div className="rounded border border-white/10 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
        {active ? (
          <span className="text-[0.65rem] uppercase tracking-[0.18em] text-emerald-200/90">
            Active
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm font-medium opacity-85">{value}</p>
    </div>
  )
}

function StatusPill({
  children,
  tone,
  'aria-label': ariaLabel,
}: {
  children: ReactNode
  tone: 'neutral' | 'positive' | 'warning' | 'danger'
  'aria-label'?: string
}) {
  const toneClass =
    tone === 'positive'
      ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
      : tone === 'warning'
        ? 'border-amber-400/30 bg-amber-500/10 text-amber-100'
        : tone === 'danger'
          ? 'border-rose-400/30 bg-rose-500/10 text-rose-100'
          : 'border-white/10 bg-white/5 text-white/80'

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.18em] ${toneClass}`}
      aria-label={ariaLabel}
    >
      {children}
    </span>
  )
}

function AssessmentBadge({ severity }: { severity: 'positive' | 'warning' | 'neutral' }) {
  const label =
    severity === 'positive' ? 'Strength' : severity === 'warning' ? 'Risk' : 'Note'

  return (
    <span className="rounded border border-white/10 px-2 py-1 text-xs uppercase tracking-[0.2em] opacity-60">
      {label}
    </span>
  )
}

function getAssignmentSummary(view: AgentView) {
  const { team, assignedCase, trainingEntry, materialized } = view

  if (trainingEntry) {
    return {
      title: `${trainingEntry.trainingName} in progress`,
      detail: `Queue ${trainingEntry.id} / ${trainingEntry.remainingWeeks} week${
        trainingEntry.remainingWeeks === 1 ? '' : 's'
      } remaining.`,
    }
  }

  if (assignedCase) {
    return {
      title: assignedCase.title,
      detail: `Case ${assignedCase.id} / ${
        team ? `Response Unit ${team.name}` : 'No team record'
      } / started ${
        materialized.assignment.startedWeek !== undefined
          ? `week ${materialized.assignment.startedWeek}`
          : 'not recorded'
      }.`,
    }
  }

  if (materialized.assignment.lifecycleState === 'recovery') {
    return {
      title: 'Recovery cycle',
      detail: `Post-operation recovery / started ${
        materialized.assignment.startedWeek !== undefined
          ? `week ${materialized.assignment.startedWeek}`
          : 'not recorded'
      }.`,
    }
  }

  if (team) {
    return {
      title: `Attached to Response Unit ${team.name}`,
      detail: `No active case commitment / posture ${formatLabel(team.statusState)}.`,
    }
  }

  return {
    title: 'Reserve pool',
    detail: 'Unassigned and available for reassignment subject to readiness and fatigue.',
  }
}

function getAgentStatusTone(status: string) {
  if (status === 'active') {
    return 'positive'
  }

  if (status === 'injured' || status === 'recovering') {
    return 'warning'
  }

  if (status === 'dead') {
    return 'danger'
  }

  if (status === 'resigned') {
    return 'danger'
  }

  return 'neutral'
}

function getReadinessTone(band: string) {
  if (band === 'steady') {
    return 'positive'
  }

  if (band === 'strained') {
    return 'warning'
  }

  if (band === 'critical' || band === 'unavailable') {
    return 'danger'
  }

  return 'neutral'
}

function formatLabel(value: string) {
  return value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

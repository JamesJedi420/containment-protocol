import { useMemo } from 'react'
import { useGameStore } from '../../app/store/gameStore'
import { buildDeveloperOverlaySnapshot, DEVELOPER_OVERLAY_FLAG } from './developerOverlayView'

function isOverlayAvailable() {
  return import.meta.env.DEV || import.meta.env.MODE === 'test'
}

export function DeveloperOverlay() {
  const {
    game,
    clearDeveloperLog,
    debugResetFrontDeskBaseline,
    debugResetQueueAndLog,
    debugResetEncounterState,
    setDebugFlag,
  } = useGameStore()
  const overlayEnabled = Boolean(game.runtimeState?.ui.debug.flags[DEVELOPER_OVERLAY_FLAG])
  const snapshot = useMemo(() => buildDeveloperOverlaySnapshot(game), [game])

  if (!isOverlayAvailable()) {
    return null
  }

  return (
    <>
      <button
        type="button"
        aria-label={overlayEnabled ? 'Hide developer overlay' : 'Show developer overlay'}
        onClick={() => setDebugFlag(DEVELOPER_OVERLAY_FLAG, !overlayEnabled)}
        className="fixed bottom-4 right-4 z-40 rounded-full border border-white/15 bg-black/70 px-3 py-1.5 text-xs font-medium text-white/85 shadow-lg backdrop-blur hover:bg-black/80"
      >
        {overlayEnabled ? 'Hide Dev' : 'Dev Overlay'}
      </button>

      {overlayEnabled ? (
        <aside
          className="fixed bottom-16 right-4 z-40 max-h-[70vh] w-[min(30rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-white/10 bg-slate-950/95 p-4 text-xs text-white shadow-2xl backdrop-blur"
          role="complementary"
          aria-label="Developer overlay"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">Developer Overlay</p>
              <p className="opacity-60">Runtime and authored-state inspection</p>
            </div>
            <button
              type="button"
              className="rounded border border-white/10 px-2 py-1 opacity-80 hover:opacity-100"
              onClick={() => debugResetQueueAndLog()}
            >
              Reset Queue + Log
            </button>
            <button
              type="button"
              className="rounded border border-white/10 px-2 py-1 opacity-80 hover:opacity-100"
              onClick={() => debugResetEncounterState()}
            >
              Reset Encounter
            </button>
            <button
              type="button"
              className="rounded border border-white/10 px-2 py-1 opacity-80 hover:opacity-100"
              onClick={() => debugResetFrontDeskBaseline()}
            >
              Front-Desk Baseline
            </button>
            <button
              type="button"
              className="rounded border border-white/10 px-2 py-1 opacity-80 hover:opacity-100"
              onClick={() => clearDeveloperLog()}
            >
              Clear Log
            </button>
            <button
              type="button"
              className="rounded border border-white/10 px-2 py-1 opacity-80 hover:opacity-100"
              onClick={() => setDebugFlag(DEVELOPER_OVERLAY_FLAG, false)}
            >
              Close
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <OverlaySection
              title="Location"
              rows={[
                `Hub: ${snapshot.location.hubId}`,
                `Location: ${snapshot.location.locationId ?? 'n/a'}`,
                `Scene: ${snapshot.location.sceneId ?? 'n/a'}`,
                `Updated week: ${snapshot.location.updatedWeek}`,
                `Active authored context: ${snapshot.activeAuthoredContextId ?? 'n/a'}`,
              ]}
            />

            <OverlaySection
              title="Routed Content"
              rows={[
                `Director route: ${snapshot.routedContent.directorMessageRouteId ?? 'n/a'}`,
                `Notice routes: ${snapshot.routedContent.noticeRouteIds.join(', ') || 'none'}`,
                `Choice ids: ${snapshot.routedContent.choiceIds.join(', ') || 'none'}`,
              ]}
            />

            <OverlaySection
              title="Choice Debug"
              rows={[
                `Last choice: ${snapshot.choiceDebug.lastChoiceId ?? 'n/a'}`,
                `Next target: ${snapshot.choiceDebug.lastNextTargetId ?? 'n/a'}`,
                `Follow-ups: ${snapshot.choiceDebug.lastFollowUpIds.join(', ') || 'none'}`,
                `Updated week: ${snapshot.choiceDebug.updatedWeek ?? 'n/a'}`,
              ]}
            />

            <OverlaySection
              title="Stability"
              rows={[
                `Issues: ${snapshot.stability.issueCount}`,
                `Errors: ${snapshot.stability.errorCount}`,
                `Warnings: ${snapshot.stability.warningCount}`,
                `Softlock risk: ${snapshot.stability.softlockRisk ? 'yes' : 'no'}`,
                `Categories: ${snapshot.stability.categories.join(', ') || 'none'}`,
              ]}
            />

            <OverlaySection
              title="Weekly Pressure"
              rows={[
                `Summary: ${snapshot.pressure.summary}`,
                `Dominant: ${snapshot.pressure.dominantFactor}`,
                `Secondary: ${snapshot.pressure.secondaryFactors.join(', ') || 'none'}`,
                `Unresolved trend: ${snapshot.pressure.unresolvedTrend.join(' -> ')}`,
                `Budget trend: ${snapshot.pressure.budgetPressureTrend.join(' -> ')}`,
                `Attrition trend: ${snapshot.pressure.attritionPressureTrend.join(' -> ')}`,
                `Intel trend: ${snapshot.pressure.intelConfidenceTrend.join(' -> ')}`,
              ]}
            />

            <OverlayListSection
              title={`Stability Recovery Actions (${snapshot.stability.recoveryActions.length})`}
              rows={snapshot.stability.recoveryActions.map(
                (action) => `${action.mutating ? 'MUTATING' : 'REVIEW'} / ${action.label}`
              )}
              emptyLabel="No recovery actions recommended."
            />

            <OverlayListSection
              title={`Stability Issues (${snapshot.stability.topIssues.length})`}
              rows={snapshot.stability.topIssues.map(
                (issue) => `${issue.severity.toUpperCase()} / ${issue.category}: ${issue.summary}`
              )}
              emptyLabel="No stability issues detected."
            />

            <OverlayListSection
              title={`Runtime Event Queue (${snapshot.queuedEvents.length})`}
              rows={snapshot.queuedEvents.map(
                (event) =>
                  `${event.id}: ${event.type} -> ${event.targetId}${event.week ? ` / W${event.week}` : ''}${event.contextId ? ` / ctx ${event.contextId}` : ''}${event.source ? ` / src ${event.source}` : ''}`
              )}
              emptyLabel="No queued runtime events."
            />

            <OverlayListSection
              title={`Persistent Flags (${snapshot.persistentFlags.length})`}
              rows={snapshot.persistentFlags.map((entry) => `${entry.id}: ${String(entry.value)}`)}
              emptyLabel="No persistent flags."
            />

            <OverlayListSection
              title={`Consumed One-Shots (${snapshot.consumedOneShots.length})`}
              rows={snapshot.consumedOneShots.map(
                (entry) =>
                  `${entry.id} [week ${entry.firstSeenWeek}]${entry.source ? ` via ${entry.source}` : ''}`
              )}
              emptyLabel="No one-shots consumed."
            />

            <OverlaySection
              title="Loadout Summary"
              rows={[
                `Equipped assignments: ${snapshot.loadouts.equippedAssignmentCount}`,
                `Ready: ${snapshot.loadouts.readinessCounts.ready}`,
                `Partial: ${snapshot.loadouts.readinessCounts.partial}`,
                `Blocked: ${snapshot.loadouts.readinessCounts.blocked}`,
                `Role-incompatible agents: ${snapshot.loadouts.roleIncompatibleAgentCount}`,
              ]}
            />

            <OverlayListSection
              title={`Loadout Agents (${snapshot.loadouts.agents.length})`}
              rows={snapshot.loadouts.agents.map(
                (agent) =>
                  `${agent.agentId} / ${agent.role} / ${agent.readiness} / equipped ${agent.equippedItemCount} / incompatible ${agent.incompatibleItemCount}${agent.issues.length > 0 ? ` / ${agent.issues.join(', ')}` : ''}`
              )}
              emptyLabel="No loadout diagnostics available."
            />

            <OverlaySection
              title="Training & Certification Summary"
              rows={[
                `In progress: ${snapshot.training.inProgressCount}`,
                `Blocked: ${snapshot.training.blockedCount}`,
                `Completed recently: ${snapshot.training.completedRecentlyCount}`,
                `Certified records: ${snapshot.training.certifiedCount}`,
                `Expired records: ${snapshot.training.expiredCount}`,
              ]}
            />

            <OverlayListSection
              title={`Training Agents (${snapshot.training.agents.length})`}
              rows={snapshot.training.agents.map(
                (agent) =>
                  `${agent.agentId} / ${agent.role} / ${agent.trainingStatus}${agent.assignedTrainingId ? ` / ${agent.assignedTrainingId}` : ''}${typeof agent.trainingQueuePosition === 'number' ? ` / queue ${agent.trainingQueuePosition}` : ''} / points ${agent.trainingPoints} / cert ${agent.certifiedCount} / expired ${agent.expiredCount}`
              )}
              emptyLabel="No training diagnostics available."
            />

            <OverlaySection
              title="Team Composition & Cohesion"
              rows={[
                `Teams: ${snapshot.teamComposition.teamCount}`,
                `Composition valid: ${snapshot.teamComposition.validCount}`,
                `Fragile cohesion: ${snapshot.teamComposition.fragileCount}`,
                `Best available: ${snapshot.teamComposition.bestAvailableTeamIds.join(', ') || 'none'}`,
              ]}
            />

            <OverlayListSection
              title={`Team Diagnostics (${snapshot.teamComposition.teams.length})`}
              rows={snapshot.teamComposition.teams.map(
                (team) =>
                  `${team.teamId}: ${team.teamName}${team.category ? ` / ${team.category}` : ''} / valid ${team.compositionValid ? 'yes' : 'no'} / coverage [${team.coveredRoles.join(', ')}]${team.missingRoles.length > 0 ? ` / missing [${team.missingRoles.join(', ')}]` : ''} / cohesion ${team.cohesionScore} (${team.cohesionBand}) / weakest ${team.weakestLinkPenalty}${team.weakestLinkCodes.length > 0 ? ` / penalties ${team.weakestLinkCodes.join(', ')}` : ''}${team.issues.length > 0 ? ` / issues ${team.issues.join(', ')}` : ''}`
              )}
              emptyLabel="No team composition diagnostics available."
            />

            <OverlaySection
              title="Mission Intake & Routing"
              rows={[
                `Missions: ${snapshot.missions.missionCount}`,
                `Critical: ${snapshot.missions.criticalCount}`,
                `Blocked: ${snapshot.missions.blockedCount}`,
                `Queued: ${snapshot.missions.queuedCount}`,
                `Shortlisted: ${snapshot.missions.shortlistedCount}`,
                `Assigned: ${snapshot.missions.assignedCount}`,
                `Top triage: ${snapshot.missions.topMissionIds.join(', ') || 'none'}`,
              ]}
            />

            <OverlayListSection
              title={`Mission Diagnostics (${snapshot.missions.entries.length})`}
              rows={snapshot.missions.entries.map(
                (entry) =>
                  `${entry.missionId} / ${entry.category} / ${entry.kind} / ${entry.status} / ${entry.priority} (${entry.triageScore}) / ${entry.routingState}${entry.routingBlockers.length > 0 ? ` / blockers ${entry.routingBlockers.join(', ')}` : ''}${entry.candidateTeamIds.length > 0 ? ` / candidates ${entry.candidateTeamIds.join(', ')}` : ''}${typeof entry.expectedTotalWeeks === 'number' ? ` / total ${entry.expectedTotalWeeks}w` : ''} / factor ${entry.explanation.dominantFactor} / ${entry.explanation.summary}`
              )}
              emptyLabel="No mission diagnostics available."
            />

            <OverlaySection
              title="Deployment Readiness & Time Cost"
              rows={[
                `Mission-ready: ${snapshot.deployment.missionReadyCount}`,
                `Conditional: ${snapshot.deployment.conditionalCount}`,
                `Blocked: ${snapshot.deployment.blockedCount}`,
                `Recovery required: ${snapshot.deployment.recoveryRequiredCount}`,
              ]}
            />

            <OverlayListSection
              title={`Deployment Team Readiness (${snapshot.deployment.teams.length})`}
              rows={snapshot.deployment.teams.map(
                (entry) =>
                  `${entry.teamId} / ${entry.readinessCategory} / score ${entry.readinessScore} / deploy ${entry.estimatedDeployWeeks}w / recovery ${entry.estimatedRecoveryWeeks}w${entry.hardBlockers.length > 0 ? ` / hard ${entry.hardBlockers.join(', ')}` : ''}${entry.softRisks.length > 0 ? ` / soft ${entry.softRisks.join(', ')}` : ''} / factor ${entry.explanation.dominantFactor} / ${entry.explanation.summary}`
              )}
              emptyLabel="No deployment readiness diagnostics available."
            />

            <OverlayListSection
              title={`Weakest-Link Explanations (${snapshot.weakestLinks.length})`}
              rows={snapshot.weakestLinks.map(
                (entry) =>
                  `${entry.relatedIds[0] ?? entry.explanationId ?? 'mission'} / ${entry.severity} / factor ${entry.dominantFactor} / ${entry.summary}${entry.details.length > 0 ? ` / ${entry.details.join(' / ')}` : ''}`
              )}
              emptyLabel="No weakest-link explanations available from the latest weekly report."
            />

            <OverlaySection
              title="Recruitment Funnel"
              rows={[
                `Total candidates: ${snapshot.recruitmentFunnel.totalCandidates}`,
                `Prospect: ${snapshot.recruitmentFunnel.stageCounts.prospect}`,
                `Contacted: ${snapshot.recruitmentFunnel.stageCounts.contacted}`,
                `Screening: ${snapshot.recruitmentFunnel.stageCounts.screening}`,
                `Hired: ${snapshot.recruitmentFunnel.stageCounts.hired}`,
                `Lost: ${snapshot.recruitmentFunnel.stageCounts.lost}`,
              ]}
            />

            <OverlayListSection
              title={`Recruitment Candidates (${snapshot.recruitmentFunnel.candidates.length})`}
              rows={snapshot.recruitmentFunnel.candidates.map(
                (candidate) =>
                  `${candidate.id}: ${candidate.name} / ${candidate.stage}${candidate.roleInclination ? ` / ${candidate.roleInclination}` : ''} / expires W${candidate.expiryWeek}`
              )}
              emptyLabel="No recruitment candidates in pipeline."
            />

            <OverlayListSection
              title={`Progress Clocks (${snapshot.progressClocks.length})`}
              rows={snapshot.progressClocks.map(
                (clock) =>
                  `${clock.id}: ${clock.value}/${clock.max}${clock.hidden ? ' hidden' : ''}${clock.completedAtWeek ? ` complete@${clock.completedAtWeek}` : ''}`
              )}
              emptyLabel="No progress clocks."
            />

            <OverlayListSection
              title={`Encounter Runtime (${snapshot.encounters.length})`}
              rows={snapshot.encounters.map(
                (encounter) =>
                  `${encounter.id}: ${encounter.status}${encounter.phase ? ` / ${encounter.phase}` : ''} / hidden ${encounter.hiddenModifierCount} / revealed ${encounter.revealedModifierCount}${encounter.activeFlags.length ? ` / flags ${encounter.activeFlags.join(', ')}` : ''}`
              )}
              emptyLabel="No encounter runtime state."
            />

            <OverlayListSection
              title={`Developer Log (${snapshot.developerLog.length})`}
              rows={snapshot.developerLog.map(
                (entry) =>
                  `[W${entry.week}] ${entry.type}: ${entry.summary}${entry.contextId ? ` / ${entry.contextId}` : ''}${entry.details.length ? ` / ${entry.details.join(' / ')}` : ''}`
              )}
              emptyLabel="No developer log entries."
            />
          </div>
        </aside>
      ) : null}
    </>
  )
}

function OverlaySection({ title, rows }: { title: string; rows: string[] }) {
  return (
    <section className="space-y-1">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-55">{title}</h2>
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row} className="rounded border border-white/8 bg-white/3 px-2 py-1">
            {row}
          </li>
        ))}
      </ul>
    </section>
  )
}

function OverlayListSection({
  title,
  rows,
  emptyLabel,
}: {
  title: string
  rows: string[]
  emptyLabel: string
}) {
  return (
    <section className="space-y-1">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-55">{title}</h2>
      {rows.length > 0 ? (
        <ul className="space-y-1">
          {rows.map((row) => (
            <li key={row} className="rounded border border-white/8 bg-white/3 px-2 py-1">
              {row}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded border border-dashed border-white/10 px-2 py-2 opacity-60">{emptyLabel}</p>
      )}
    </section>
  )
}

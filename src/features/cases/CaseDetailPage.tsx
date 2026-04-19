import { Link, useLocation, useParams } from 'react-router'
import LocalNotFound from '../../app/LocalNotFound'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { IconStageCritical, IconStageOk, IconStageWarn } from '../../components/icons'
import { DetailStat } from '../../components/StatCard'
import { buildCaseGenerationProfile } from '../../domain/caseGeneration'
import { estimateOutcomeOdds } from '../../domain/sim/resolve'
import {
  AGENCY_LABELS,
  CARD_UI_TEXT,
  CASE_LORE_STUBS,
  CASE_UI_LABELS,
  INTEL_UI_TEXT,
  MODE_LABELS,
  ROLE_COVERAGE_LABELS,
  SHELL_UI_TEXT,
  STATUS_LABELS,
  TOOLTIPS,
} from '../../data/copy'
import { type CaseInstance, type GameState, type Team } from '../../domain/models'
import { getCaseTemplateIntelView } from './caseIntelProjection'
import { getCaseAssignmentInsights } from './caseInsights'
import { getCaseListItemView } from './caseView'

export default function CaseDetailPage() {
  const { caseId } = useParams()
  const location = useLocation()
  const { game, assign, unassign, playPartyCard } = useGameStore()
  const currentCase = caseId ? game.cases[caseId] : undefined
  const backTo = `${APP_ROUTES.cases}${location.search}`

  if (!currentCase) {
    return (
      <LocalNotFound
        title={SHELL_UI_TEXT.caseNotFoundTitle}
        message={SHELL_UI_TEXT.caseNotFoundMessage}
        backTo={backTo}
        backLabel={SHELL_UI_TEXT.backToTemplate.replace('{label}', 'Cases')}
      />
    )
  }

  const view = getCaseListItemView(currentCase, game)
  const templateIntel = getCaseTemplateIntelView(currentCase, game)
  const assignmentInsights = getCaseAssignmentInsights(currentCase, game)
  const generationProfile = buildCaseGenerationProfile(currentCase, game)
  const rewardPreview = generationProfile.rewardProfile
  const handCards = (game.partyCards?.hand ?? [])
    .map((cardId) => game.partyCards?.cards[cardId])
    .filter((card): card is NonNullable<typeof card> => Boolean(card))
  const defaultTargetTeamId = view.assignedTeams[0]?.id
  const assignmentTimelineEntries = game.events
    .filter((event) => {
      const payload = event.payload as { caseId?: string }
      return payload?.caseId === currentCase.id
    })
    .filter((event) =>
      [
        'assignment.team_assigned',
        'assignment.team_unassigned',
        'case.resolved',
        'case.partially_resolved',
        'case.failed',
        'case.escalated',
      ].includes(event.type)
    )
    .map((event) => ({
      id: event.id,
      type: event.type,
      payload: event.payload as Record<string, unknown>,
    }))

  return (
    <section className="space-y-4">
      <article className="panel panel-primary space-y-4" role="region" aria-label="Case dossier">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide opacity-50">
              {CASE_UI_LABELS.caseDossier}
            </p>
            <p className="text-xl font-semibold">{currentCase.title}</p>
            <p className="text-sm opacity-60">{currentCase.description}</p>
            <p className="text-sm opacity-60" title={TOOLTIPS['case.lore']}>
              {CASE_UI_LABELS.loreStub}:{' '}
              {CASE_LORE_STUBS[currentCase.templateId] ?? CASE_UI_LABELS.noArchivedLoreStub}
            </p>
          </div>
          <span
            title={TOOLTIPS['case.stage']}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${stageColor(currentCase.stage)}`}
          >
            <StageIcon stage={currentCase.stage} className="h-3.5 w-3.5" />
            {CASE_UI_LABELS.stagePrefix} {currentCase.stage}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailStat label={CASE_UI_LABELS.mode} value={MODE_LABELS[currentCase.mode]} />
          <DetailStat label={CASE_UI_LABELS.status} value={STATUS_LABELS[currentCase.status]} />
          <DetailStat
            label={CASE_UI_LABELS.deadline}
            value={formatWeeks(currentCase.deadlineRemaining)}
          />
          <DetailStat
            label={CASE_UI_LABELS.duration}
            value={formatWeeks(currentCase.durationWeeks)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailStat
            label={CASE_UI_LABELS.remaining}
            value={
              currentCase.weeksRemaining === undefined
                ? CASE_UI_LABELS.notStarted
                : formatWeeks(currentCase.weeksRemaining)
            }
          />
          <DetailStat
            label={CASE_UI_LABELS.kind}
            value={currentCase.kind === 'raid' ? CASE_UI_LABELS.kindRaid : CASE_UI_LABELS.kindCase}
          />
          <DetailStat
            label={CASE_UI_LABELS.success}
            value={oddsSummary(currentCase, game, view.assignedTeams)}
          />
          <DetailStat label={CASE_UI_LABELS.teamsRequired} value={String(view.maxTeams)} />
        </div>

        <div
          className="rounded border border-sky-400/25 bg-sky-500/6 px-3 py-3"
          aria-label="Tactical insight strip"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-wide opacity-60">Tactical insight</p>
            <p className="text-xs opacity-60">Compact odds and reward highlights</p>
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-4 text-sm">
            <p>
              <span className="opacity-60">Current odds:</span>{' '}
              <span className="font-medium">
                {oddsSummary(currentCase, game, view.assignedTeams)}
              </span>
            </p>
            <p>
              <span className="opacity-60">Success funding:</span>{' '}
              <span className="font-medium">
                {signedNumber(rewardPreview.success.fundingDelta)}
              </span>
            </p>
            <p>
              <span className="opacity-60">Fail containment:</span>{' '}
              <span className="font-medium">
                {signedNumber(rewardPreview.fail.containmentDelta)}
              </span>
            </p>
            <p>
              <span className="opacity-60">Unresolved next stage:</span>{' '}
              <span className="font-medium">
                {generationProfile.escalation.find((entry) => entry.trigger === 'unresolved')
                  ?.nextStage ?? currentCase.stage}
              </span>
            </p>
          </div>
        </div>
      </article>

      <div className="detail-layout" role="region" aria-label="Case operations layout">
        <div className="detail-main">
          <article
            className="panel panel-primary space-y-4"
            role="region"
            aria-label="Template dossier"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide opacity-50">
                  Template source / likely escalation
                </p>
                <h3 className="text-lg font-semibold">Template dossier</h3>
              </div>
              <Link
                to={APP_ROUTES.intelDetail(currentCase.templateId)}
                className="btn btn-sm btn-ghost"
              >
                View intel
              </Link>
            </div>

            {templateIntel ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <DetailStat
                    label={INTEL_UI_TEXT.templateId}
                    value={templateIntel.template.templateId}
                  />
                  <DetailStat label={INTEL_UI_TEXT.family} value={templateIntel.family} />
                  <DetailStat
                    label={INTEL_UI_TEXT.threatRating}
                    value={`${templateIntel.threatRating}/5`}
                  />
                  <DetailStat
                    label={INTEL_UI_TEXT.likelyPressure}
                    value={capitalize(templateIntel.likelyPressure)}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm opacity-70">
                    Template: <span className="font-medium">{templateIntel.template.title}</span>
                  </p>
                  <p className="text-sm opacity-60" title={TOOLTIPS['case.lore']}>
                    {CASE_UI_LABELS.loreStub}: {templateIntel.loreStub}
                  </p>
                  <p className="text-sm opacity-60">{templateIntel.template.description}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <TagBlock
                    label={CASE_UI_LABELS.requiredRoles}
                    tags={(templateIntel.template.requiredRoles ?? []).map(
                      (role) => ROLE_COVERAGE_LABELS[role]
                    )}
                  />
                  <TagBlock label={CASE_UI_LABELS.requiredTags} tags={templateIntel.requiredTags} />
                  <TagBlock
                    label={CASE_UI_LABELS.preferredTags}
                    tags={templateIntel.preferredTags}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <EscalationList
                    label={INTEL_UI_TEXT.escalationOnFail}
                    items={templateIntel.failTargets.map((entry) => ({
                      key: entry.templateId,
                      label: entry.title,
                      href: APP_ROUTES.intelDetail(entry.templateId),
                    }))}
                  />
                  <EscalationList
                    label={INTEL_UI_TEXT.escalationOnUnresolved}
                    items={templateIntel.unresolvedTargets.map((entry) => ({
                      key: entry.templateId,
                      label: entry.title,
                      href: APP_ROUTES.intelDetail(entry.templateId),
                    }))}
                  />
                </div>

                <section
                  className="rounded border border-white/10 p-3"
                  aria-label="Encounter profile"
                >
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Encounter profile</h3>
                    <p className="text-sm opacity-60">
                      Why this incident appeared, what is driving it, and what it is likely to
                      escalate into if left unchecked.
                    </p>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <DetailStat
                      label="Encounter type"
                      value={generationProfile.encounterTypeLabel}
                    />
                    <DetailStat label="Origin" value={generationProfile.origin.label} />
                    <DetailStat
                      label="Escalation paths"
                      value={String(
                        generationProfile.escalation.filter((entry) => entry.targets.length > 0)
                          .length
                      )}
                    />
                  </div>

                  <div className="mt-3 rounded border border-white/10 p-3">
                    <p className="text-xs uppercase tracking-wide opacity-50">
                      Baseline world activity
                    </p>
                    <p className="mt-2 text-sm opacity-70">{generationProfile.origin.detail}</p>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <TagBlock label="Cause signals" tags={generationProfile.causeSignals} />
                    {generationProfile.escalation.map((entry) => (
                      <div key={entry.trigger} className="rounded border border-white/10 p-3">
                        <p className="text-xs uppercase tracking-wide opacity-50">
                          {formatEscalationTriggerLabel(entry.trigger)}
                        </p>
                        <p className="mt-2 text-sm opacity-70">
                          Escalates to Stage {entry.nextStage}
                          {entry.convertsToRaid
                            ? ` and converts to raid${entry.raidTeamRange ? ` (${entry.raidTeamRange} teams)` : ''}.`
                            : '.'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {entry.targets.length > 0 ? (
                            entry.targets.map((target) => (
                              <Link
                                key={target.templateId}
                                to={APP_ROUTES.intelDetail(target.templateId)}
                                className="btn btn-xs btn-ghost"
                              >
                                {target.title}
                              </Link>
                            ))
                          ) : (
                            <span className="text-sm opacity-50">{SHELL_UI_TEXT.none}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <p className="text-sm opacity-50">
                {CASE_LORE_STUBS[currentCase.templateId] ?? SHELL_UI_TEXT.none}
              </p>
            )}
          </article>

          <article
            className="panel panel-support space-y-3"
            role="region"
            aria-label="Assignment timeline"
          >
            <h3 className="text-lg font-semibold">Assignment timeline</h3>
            {assignmentTimelineEntries.length > 0 ? (
              <ul className="space-y-2">
                {assignmentTimelineEntries.map((entry) => {
                  const caseTitle =
                    (entry.payload.caseTitle as string | undefined) ?? currentCase.title
                  const teamName =
                    (entry.payload.teamName as string | undefined) ??
                    (entry.payload.teamId as string | undefined)
                  const teamId = entry.payload.teamId as string | undefined
                  const text =
                    entry.type === 'assignment.team_assigned'
                      ? `${teamName ?? 'Team'} assigned`
                      : entry.type === 'assignment.team_unassigned'
                        ? `${teamName ?? 'Team'} unassigned`
                        : entry.type === 'case.resolved'
                          ? `${caseTitle} resolved`
                          : entry.type === 'case.partially_resolved'
                            ? `${caseTitle} partially resolved`
                            : entry.type === 'case.failed'
                              ? `${caseTitle} failed`
                              : `${caseTitle} escalated`

                  return (
                    <li
                      key={entry.id}
                      className={`rounded border px-3 py-2 text-sm opacity-80 ${getTimelineToneClass(entry.type)}`}
                    >
                      <p className="font-medium">{text}</p>
                      {teamId && teamName ? (
                        <Link
                          to={APP_ROUTES.teamDetail(teamId)}
                          className="text-xs opacity-70 hover:underline"
                        >
                          {teamName}
                        </Link>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm opacity-50">No assignment timeline entries yet.</p>
            )}
          </article>

          <article
            className="panel panel-support space-y-3"
            role="region"
            aria-label="Mission reward preview"
          >
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Mission result model</h3>
              <p className="text-sm opacity-60">
                Rewards are deterministic. Case difficulty, escalation stage, incident family, and
                outcome quality feed the same reward model for funding, reputation, materials, gear,
                and faction standing.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(rewardPreview).map(([key, preview]) => (
                <div key={key} className="rounded border border-white/10 px-3 py-3">
                  <p className="font-medium">{preview.label}</p>
                  <p className="mt-1 text-sm opacity-60">
                    {preview.caseTypeLabel} / operation value {preview.operationValue}
                  </p>
                  <div className="mt-2 grid gap-2 text-sm md:grid-cols-4">
                    <p>Funding {signedNumber(preview.fundingDelta)}</p>
                    <p>Containment {signedNumber(preview.containmentDelta)}</p>
                    <p>Reputation {signedNumber(preview.reputationDelta)}</p>
                    <p>Strategic {signedNumber(preview.strategicValueDelta)}</p>
                  </div>
                  <p className="mt-2 text-xs opacity-60">
                    Inventory: {formatRewardInventory(preview)}
                  </p>
                  <p className="mt-1 text-xs opacity-60">
                    Faction standing: {formatFactionStanding(preview)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {preview.factors.map((factor: (typeof preview.factors)[number]) => (
                      <span
                        key={`${key}-${factor.id}`}
                        className="rounded-full border border-white/10 px-2 py-0.5 text-xs opacity-70"
                        title={factor.detail}
                      >
                        {factor.label}: {factor.value}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article
            className="panel panel-support space-y-3"
            role="region"
            aria-label="Operational tags and assignments"
          >
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{CASE_UI_LABELS.operationalTags}</h3>
              <div className="grid gap-3 md:grid-cols-3">
                <TagBlock
                  label={CASE_UI_LABELS.requiredRoles}
                  tags={(currentCase.requiredRoles ?? []).map((role) => ROLE_COVERAGE_LABELS[role])}
                />
                <TagBlock label={CASE_UI_LABELS.requiredTags} tags={currentCase.requiredTags} />
                <TagBlock label={CASE_UI_LABELS.preferredTags} tags={currentCase.preferredTags} />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{CASE_UI_LABELS.assignedTeams}</h3>
              {view.assignedTeams.length > 0 ? (
                <ul className="space-y-2">
                  {view.assignedTeams.map((team) => (
                    <li
                      key={team.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded border border-white/10 px-3 py-2"
                    >
                      <div>
                        <p className="font-medium">
                          {AGENCY_LABELS.responseUnit} {team.name}
                        </p>
                        <p className="text-xs opacity-50">
                          {CASE_UI_LABELS.tags}:{' '}
                          {team.tags.length > 0 ? team.tags.join(', ') : SHELL_UI_TEXT.none}
                        </p>
                      </div>
                      <button
                        onClick={() => unassign(currentCase.id, team.id)}
                        className="btn btn-sm btn-ghost"
                      >
                        {CASE_UI_LABELS.removeTeam} {team.name}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm opacity-50">{CASE_UI_LABELS.unassigned}</p>
              )}
            </div>
          </article>
        </div>

        <aside className="detail-side" aria-label="Assignment operations">
          <article
            className="panel panel-primary space-y-3"
            role="region"
            aria-label="Party card controls"
          >
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">{CARD_UI_TEXT.pageHeading}</h3>
              <p className="text-sm opacity-60">
                Play queued cards to modify this case before weekly resolution.
              </p>
            </div>

            {handCards.length > 0 ? (
              <ul className="space-y-2">
                {handCards.map((card) => (
                  <li
                    key={card.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-white/10 px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">{card.title}</p>
                      <p className="text-xs opacity-60">{card.description}</p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => playPartyCard(card.id, currentCase.id, defaultTargetTeamId)}
                    >
                      Play on case
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm opacity-50">{CARD_UI_TEXT.noHand}</p>
            )}
          </article>

          <article
            className="panel panel-primary space-y-3"
            role="region"
            aria-label="Available team odds"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">{CASE_UI_LABELS.availableTeamOdds}</h3>
                <p className="text-sm opacity-60">
                  {currentCase.kind === 'raid'
                    ? CASE_UI_LABELS.assignUpToN
                        .replace('{n}', String(view.maxTeams))
                        .replace('{s}', view.maxTeams === 1 ? '' : 's')
                    : CASE_UI_LABELS.assignOneTeam}
                </p>
              </div>
              <p className="text-xs opacity-50">
                {view.isRaidAtCapacity
                  ? CASE_UI_LABELS.raidAtCapacityHint
                  : CASE_UI_LABELS.eligibleTeamsHint}
              </p>
            </div>

            {currentCase.status !== 'resolved' ? (
              assignmentInsights.availableTeams.length > 0 ? (
                <ul className="space-y-2">
                  {assignmentInsights.availableTeams.map(({ team, odds, reconSummary }) => (
                    <li
                      key={team.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded border border-white/10 px-3 py-2"
                    >
                      <div>
                        <p className="font-medium">
                          {AGENCY_LABELS.responseUnit} {team.name}
                        </p>
                        <p className="text-xs opacity-50">
                          S {formatPercent(odds.success)} / P {formatPercent(odds.partial)} / F{' '}
                          {formatPercent(odds.fail)}
                        </p>
                        {reconSummary && reconSummary.hiddenModifierCount > 0 ? (
                          <p className="text-xs opacity-50">
                            Recon {formatPercent(reconSummary.intelConfidence)} confidence /{' '}
                            {reconSummary.revealedModifierCount}/{reconSummary.hiddenModifierCount}{' '}
                            hidden factors revealed
                          </p>
                        ) : null}
                      </div>
                      <button
                        onClick={() => assign(currentCase.id, team.id)}
                        disabled={odds.blockedByRequiredTags || odds.blockedByRequiredRoles}
                        aria-label={`Assign ${team.name}`}
                        className="btn btn-sm"
                      >
                        Assign
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm opacity-50">{CASE_UI_LABELS.noEligibleResponseUnits}</p>
              )
            ) : (
              <p className="text-sm opacity-50">{CASE_UI_LABELS.resolvedNoNewAssignments}</p>
            )}
          </article>

          <article
            className="panel panel-support space-y-3"
            role="region"
            aria-label="Assignment blockers"
          >
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Why teams are blocked</h3>
              <p className="text-sm opacity-60">
                These are the current reasons units cannot be assigned to this case.
              </p>
            </div>

            {currentCase.status === 'resolved' ? (
              <p className="text-sm opacity-50">{CASE_UI_LABELS.resolvedNoNewAssignments}</p>
            ) : assignmentInsights.blockedTeams.length > 0 ? (
              <ul className="space-y-2">
                {groupBlockedTeams(assignmentInsights.blockedTeams).map((group) => (
                  <li
                    key={group.reason}
                    className={`rounded border px-3 py-2 ${getBlockedReasonToneClass(group.reason)}`}
                  >
                    <p className="text-xs uppercase tracking-wide opacity-50">{group.label}</p>
                    <ul className="mt-2 space-y-1 text-sm opacity-70">
                      {group.entries.map((entry) => (
                        <li key={entry.team.id}>
                          <span className="font-medium">{entry.team.name}</span>
                          <span className="opacity-60"> - {entry.detail}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm opacity-50">
                No current blockers. Eligible teams are listed above.
              </p>
            )}
          </article>
        </aside>
      </div>
    </section>
  )
}

function TagBlock({ label, tags }: { label: string; tags: string[] }) {
  return (
    <div className="rounded border border-white/10 p-3">
      <p className="text-xs uppercase tracking-wide opacity-50">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {tags.length > 0 ? (
          tags.map((tag) => (
            <span key={tag} className="rounded-full border border-white/10 px-2 py-0.5 text-xs">
              {tag}
            </span>
          ))
        ) : (
          <span className="text-sm opacity-50">{SHELL_UI_TEXT.none}</span>
        )}
      </div>
    </div>
  )
}

function EscalationList({
  label,
  items,
}: {
  label: string
  items: Array<{ key: string; label: string; href: string }>
}) {
  return (
    <div className="rounded border border-white/10 p-3">
      <p className="text-xs uppercase tracking-wide opacity-50">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.length > 0 ? (
          items.map((item) => (
            <Link key={item.key} to={item.href} className="btn btn-xs btn-ghost">
              {item.label}
            </Link>
          ))
        ) : (
          <span className="text-sm opacity-50">{SHELL_UI_TEXT.none}</span>
        )}
      </div>
    </div>
  )
}

function formatWeeks(value: number) {
  return `${value} week${value === 1 ? '' : 's'}`
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function signedNumber(value: number) {
  return value > 0 ? `+${value}` : String(value)
}

function formatRewardInventory(
  reward: ReturnType<typeof buildCaseGenerationProfile>['rewardProfile']['success']
) {
  if (reward.inventoryRewards.length === 0) {
    return SHELL_UI_TEXT.none
  }

  return reward.inventoryRewards
    .map((entry: (typeof reward.inventoryRewards)[number]) => `${entry.label} x${entry.quantity}`)
    .join(', ')
}

function formatFactionStanding(
  reward: ReturnType<typeof buildCaseGenerationProfile>['rewardProfile']['success']
) {
  if (reward.factionStanding.length === 0) {
    return SHELL_UI_TEXT.none
  }

  return reward.factionStanding
    .map(
      (entry: (typeof reward.factionStanding)[number]) =>
        `${entry.label} ${signedNumber(entry.delta)}`
    )
    .join(', ')
}

function oddsSummary(currentCase: CaseInstance, game: GameState, assignedTeams: Team[]) {
  if (assignedTeams.length === 0) {
    return CASE_UI_LABELS.noAssignedTeam
  }

  const odds = estimateOutcomeOdds(
    currentCase,
    game,
    currentCase.kind === 'raid' ? assignedTeams.map((team) => team.id) : [assignedTeams[0]!.id]
  )

  return `${formatPercent(odds.success)} success / ${formatPercent(odds.partial)} partial`
}

function groupBlockedTeams(
  blockedTeams: ReturnType<typeof getCaseAssignmentInsights>['blockedTeams']
) {
  type BlockedReason = ReturnType<
    typeof getCaseAssignmentInsights
  >['blockedTeams'][number]['reason']
  const groups = new Map<
    BlockedReason,
    {
      reason: BlockedReason
      label: string
      entries: typeof blockedTeams
    }
  >()

  for (const entry of blockedTeams) {
    const group = groups.get(entry.reason) ?? {
      reason: entry.reason,
      label: getBlockedReasonLabel(entry.reason),
      entries: [],
    }

    group.entries.push(entry)
    groups.set(entry.reason, group)
  }

  return [...groups.values()]
}

function getBlockedReasonLabel(
  reason: ReturnType<typeof getCaseAssignmentInsights>['blockedTeams'][number]['reason']
) {
  if (reason === 'already-committed') {
    return 'Already committed teams'
  }

  if (reason === 'raid-capacity') {
    return 'Raid capacity'
  }

  if (reason === 'case-capacity') {
    return 'Case capacity'
  }

  if (reason === 'training') {
    return 'Training lock'
  }

  if (reason === 'missing-required-roles') {
    return 'Missing required roles'
  }

  if (reason === 'missing-required-tags') {
    return 'Missing required tags'
  }

  return 'Resolved cases'
}

function getBlockedReasonToneClass(
  reason: ReturnType<typeof getCaseAssignmentInsights>['blockedTeams'][number]['reason']
) {
  if (reason === 'missing-required-roles' || reason === 'missing-required-tags') {
    return 'border-rose-400/30 bg-rose-500/8'
  }

  if (reason === 'raid-capacity' || reason === 'case-capacity' || reason === 'training') {
    return 'border-amber-400/30 bg-amber-500/8'
  }

  return 'border-white/10 bg-white/5'
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

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}

function formatEscalationTriggerLabel(trigger: 'failure' | 'unresolved') {
  return trigger === 'failure' ? 'If the operation fails' : 'If the case goes unresolved'
}

function getTimelineToneClass(eventType: string) {
  if (eventType === 'case.failed' || eventType === 'case.escalated') {
    return 'border-rose-400/30 bg-rose-500/8'
  }

  if (eventType === 'case.partially_resolved') {
    return 'border-amber-400/30 bg-amber-500/8'
  }

  if (eventType === 'case.resolved') {
    return 'border-emerald-400/30 bg-emerald-500/8'
  }

  return 'border-white/10 bg-white/5'
}

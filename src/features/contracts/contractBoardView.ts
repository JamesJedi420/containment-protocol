import { APP_ROUTES } from '../../app/routes'
import {
  buildContractPreviewCase,
  buildContractRewardRange,
  getContractCatalogEntries,
  getContractChainLabels,
  getContractFactionLabel,
  getContractOffers,
  getContractStrategyLabel,
  getContractTeamSuggestions,
  type ContractCatalogEntry,
  type ContractRewardRange,
} from '../../domain/contracts'
import { buildFactionStates, type FactionState } from '../../domain/factions'
import { getMissionIntelSummary } from '../../domain/intel'
import { triageMission } from '../../domain/missionIntakeRouting'
import type { ContractOffer, GameState, MissionPriorityBand } from '../../domain/models'
import { buildCurrentSimulationPressureSummary } from '../../domain/sim/validation'
import {
  explainDeploymentReadiness,
  explainMissionRouting,
  formatVisibilityFactorLabel,
} from '../../domain/visibility'
import { buildMissionRewardBreakdown } from '../../domain/missionResults'
import { getOperationsReportView } from '../report/operationsReportView'

const MAX_LIST_ITEMS = 10
const MAX_LOCKED_ITEMS = 4
const MAX_DETAILS = 3
const MAX_ACTIONS = 3

export type ContractBoardFilterId = 'all' | 'available' | 'locked'
export type ContractBoardTone = 'neutral' | 'info' | 'warning' | 'danger'

export interface ContractBoardFilterView {
  id: ContractBoardFilterId
  label: string
  count: number
}

export interface ContractBoardListItemView {
  id: string
  title: string
  subtitle: string
  durationLabel: string
  rewardLabel: string
  rewardHeadline: string
  riskLabel: string
  availabilityLabel: string
  tone: ContractBoardTone
  priorityLabel: string
  priorityTone: ContractBoardTone
  blockerSummary?: string
}

export interface ContractBoardActionView {
  type: 'launch' | 'link'
  label: string
  detail: string
  teamId?: string
  href?: string
}

export interface ContractBoardDetailView {
  id: string
  title: string
  description: string
  subtitle: string
  durationLabel: string
  riskLabel: string
  availabilityLabel: string
  availabilityTone: ContractBoardTone
  priorityLabel: string
  priorityTone: ContractBoardTone
  prioritySummary: string
  rewardLabel: string
  rewardHeadline: string
  rewardDetails: string[]
  factionSummary: string
  factionModifierSummary: string
  factionHiddenSummary: string
  factionImpactSummary?: string
  factionDetails: string[]
  missionContext: string[]
  routingSummary: string
  routingFactorLabel: string
  readinessSummary: string
  readinessFactorLabel: string
  intelLabel: string
  intelSummary: string
  intelKnownSummary: string
  intelUncertaintySummary: string
  intelNextStepSummary: string
  pressureSummary: string
  blockerSummary: string
  blockerDetails: string[]
  launchActions: ContractBoardActionView[]
  helperLinks: Array<{ label: string; href: string }>
}

export interface ContractBoardView {
  boardSummary: string
  factionLabel?: string
  riskLabel?: string
  rewardLabel?: string
  availableCount: number
  lockedCount: number
  activeCount: number
  filters: ContractBoardFilterView[]
  items: ContractBoardListItemView[]
  selectedItemId: string | null
  selectedDetail: ContractBoardDetailView | null
}

function capitalize(value: string) {
  return value.length > 0 ? `${value[0]!.toUpperCase()}${value.slice(1)}` : value
}

function uniqueBounded(values: string[], limit: number) {
  return [...new Set(values.filter((value) => value.trim().length > 0))].slice(0, limit)
}

function formatFundingRange(min: number, max: number) {
  return min === max ? `$${max}` : `$${min}-${max}`
}

function formatRiskLabel(value: string) {
  return `${capitalize(value)} risk`
}

function formatPriorityLabel(priority: MissionPriorityBand) {
  return `${capitalize(priority)} priority`
}

function formatAvailabilityLabel(entry: ContractCatalogEntry) {
  switch (entry.availabilityState) {
    case 'available':
      return 'Live'
    case 'active':
      return 'In field'
    case 'locked':
      return 'Blocked'
    default:
      return 'Standby'
  }
}

function getAvailabilityTone(entry: ContractCatalogEntry): ContractBoardTone {
  switch (entry.availabilityState) {
    case 'available':
      return 'info'
    case 'active':
      return 'warning'
    case 'locked':
      return 'danger'
    default:
      return 'neutral'
  }
}

function formatRoleList(roles: string[]) {
  return roles.length > 0 ? roles.map((role) => role.replace(/_/g, ' ')).join(', ') : 'None'
}

function formatMaterialSummary(
  materials: Array<{ label: string; quantityMin: number; quantityMax: number }>
) {
  if (materials.length === 0) {
    return 'No material drops previewed.'
  }

  return materials
    .map((material) =>
      material.quantityMin === material.quantityMax
        ? `${material.label} x${material.quantityMax}`
        : `${material.label} x${material.quantityMin}-${material.quantityMax}`
    )
    .join(', ')
}

function formatMaterialHeadline(material: {
  label: string
  quantityMin: number
  quantityMax: number
}) {
  return material.quantityMin === material.quantityMax
    ? `${material.label} x${material.quantityMax}`
    : `${material.label} x${material.quantityMin}-${material.quantityMax}`
}

function getPriorityTone(priority: MissionPriorityBand): ContractBoardTone {
  switch (priority) {
    case 'critical':
      return 'danger'
    case 'high':
      return 'warning'
    case 'normal':
      return 'info'
    default:
      return 'neutral'
  }
}

function getPrimaryMaterial(
  materials: ContractRewardRange['materials']
): ContractRewardRange['materials'][number] | null {
  return (
    materials
      .slice()
      .sort(
        (left, right) =>
          right.quantityMax - left.quantityMax ||
          right.quantityMin - left.quantityMin ||
          left.label.localeCompare(right.label)
      )[0] ?? null
  )
}

function buildRewardPresentation(
  entry: Pick<ContractCatalogEntry, 'strategyTag' | 'rewards' | 'modifiers'>,
  rewardRange = buildContractRewardRange({
    rewards: entry.rewards,
    modifiers: entry.modifiers,
  })
) {
  const primaryMaterial = getPrimaryMaterial(rewardRange.materials)
  const researchUnlock = rewardRange.research[0]
  let headlineKind: 'funding' | 'materials' | 'research' = 'funding'
  let rewardLabel = 'Funding payout'
  let rewardHeadline = formatFundingRange(rewardRange.fundingMin, rewardRange.fundingMax)

  if ((entry.strategyTag === 'research' || entry.strategyTag === 'progression') && researchUnlock) {
    headlineKind = 'research'
    rewardLabel = entry.strategyTag === 'progression' ? 'Progression unlock' : 'Research unlock'
    rewardHeadline = researchUnlock.label
  } else if (entry.strategyTag === 'materials' && primaryMaterial) {
    headlineKind = 'materials'
    rewardLabel = 'Primary material'
    rewardHeadline = formatMaterialHeadline(primaryMaterial)
  }

  return {
    rewardLabel,
    rewardHeadline,
    rewardDetails: uniqueBounded(
      [
        headlineKind !== 'funding'
          ? `Funding: ${formatFundingRange(rewardRange.fundingMin, rewardRange.fundingMax)}.`
          : '',
        rewardRange.materials.length > 0 &&
        (headlineKind !== 'materials' || rewardRange.materials.length > 1)
          ? `Materials: ${formatMaterialSummary(
              rewardRange.materials.map((material) => ({
                label: material.label,
                quantityMin: material.quantityMin,
                quantityMax: material.quantityMax,
              }))
            )}.`
          : '',
        rewardRange.research.length > 0 && headlineKind !== 'research'
          ? `Research: ${rewardRange.research.map((unlock) => unlock.label).join(', ')}.`
          : '',
      ],
      MAX_DETAILS
    ),
  }
}

function buildUnavailablePriority(entry: ContractCatalogEntry) {
  if (entry.availabilityState === 'active') {
    return {
      priorityLabel: 'Committed',
      priorityTone: 'warning' as const,
      prioritySummary: 'This contract channel is already committed and now resolves from the live case queue.',
    }
  }

  if (entry.availabilityState === 'locked') {
    return {
      priorityLabel: 'Locked channel',
      priorityTone: 'danger' as const,
      prioritySummary:
        entry.blockerDetails[0] ??
        'Board urgency does not resolve until this contract channel is unlocked and generated live.',
    }
  }

  return {
    priorityLabel: 'Standby',
    priorityTone: 'neutral' as const,
    prioritySummary: 'This contract channel is not live on the current weekly board.',
  }
}

function buildAvailablePriority(game: GameState, offer: ContractOffer) {
  const inspection = buildContractInspectionState(game, offer)

  if (!inspection) {
    return {
      priorityLabel: 'Preview pending',
      priorityTone: 'neutral' as const,
      prioritySummary: 'Board urgency preview is unavailable until the contract case can be built.',
    }
  }

  const triage = triageMission(inspection.state, inspection.previewCase)
  const deadline = inspection.previewCase.deadlineRemaining

  return {
    priorityLabel: formatPriorityLabel(triage.priority),
    priorityTone: getPriorityTone(triage.priority),
    prioritySummary: `${capitalize(triage.priority)} board urgency from a ${deadline}-week deadline window, ${inspection.previewCase.durationWeeks}-week commitment, and current campaign pressure.`,
  }
}

function buildAvailableIntelSummary(
  game: GameState,
  inspection: NonNullable<ReturnType<typeof buildContractInspectionState>>
) {
  const intel = getMissionIntelSummary(inspection.previewCase, game.week)
  const triage = triageMission(inspection.state, inspection.previewCase)
  const baseline = `Board estimate only: ${Math.round(intel.confidence * 100)}% confidence / ${Math.round(
    intel.uncertainty * 100
  )}% uncertainty.`

  if (triage.dimensions.intelRisk > 0) {
    return {
      intelLabel: 'Board estimate',
      intelSummary: `${baseline} Current routing already carries intel drag, so field verification still matters before launch.`,
      intelKnownSummary: `You currently know this packet as a board estimate only: ${Math.round(
        intel.confidence * 100
      )}% confidence with ${Math.round(intel.uncertainty * 100)}% uncertainty.`,
      intelUncertaintySummary:
        'Routing already flags intel drag, so blind spots can still worsen staffing strain, timing, or launch risk once the case turns live.',
      intelNextStepSummary:
        'Review the Intel screen if you want to inspect the confidence drivers before you commit a team, or launch knowing this estimate can still move.',
    }
  }

  return {
    intelLabel: 'Board estimate',
    intelSummary:
      `${baseline} No live field packet has stress-tested this channel yet, so hidden friction can still surface on launch.`,
    intelKnownSummary: `You currently know this packet as a board estimate only: ${Math.round(
      intel.confidence * 100
    )}% confidence with ${Math.round(intel.uncertainty * 100)}% uncertainty.`,
    intelUncertaintySummary:
      'No live field packet has stress-tested this channel yet, so hidden friction can still surface after assignment.',
    intelNextStepSummary:
      'Use the Intel screen for a deeper posture check, or accept that launch is what converts this estimate into a live case read.',
  }
}

function buildUnavailableIntelSummary(entry: ContractCatalogEntry) {
  if (entry.availabilityState === 'active') {
    return {
      intelLabel: 'Live case intel',
      intelSummary: 'Intel posture has moved to the live case record and should be reviewed from the active queue.',
      intelKnownSummary:
        'This channel is already live, so any usable intel signal now belongs to the active case instead of the board preview.',
      intelUncertaintySummary:
        'Board-only confidence is no longer the right source here; launch friction and new intel updates now live on the case record.',
      intelNextStepSummary: 'Open the active case or Intel screen to inspect the current field packet.',
    }
  }

  return {
    intelLabel: 'Unresolved intel',
    intelSummary:
      'This channel is not yet live, so field confidence, uncertainty, and blind spots remain unresolved until the contract packet actually opens.',
    intelKnownSummary:
      'You know the channel exists, but you do not yet have a live field packet or a confidence read for it.',
    intelUncertaintySummary:
      'Field confidence, blind spots, and routing friction remain hidden until the contract packet actually opens.',
    intelNextStepSummary:
      'Unlock or roll this channel live before you expect confidence, uncertainty, or readiness-specific intel to surface.',
  }
}

function buildMissionContext(entry: ContractCatalogEntry) {
  return uniqueBounded(
    [
      `Recommended roles: ${formatRoleList(entry.requirements.recommendedClasses)}.`,
      `Discouraged roles: ${formatRoleList(entry.requirements.discouragedClasses)}.`,
      entry.chain.nextContracts && entry.chain.nextContracts.length > 0
        ? `Follow-up chain: ${getContractChainLabels(entry)
            .map((nextEntry) => nextEntry.label)
            .join(', ')}.`
        : 'No direct follow-up contract is flagged from this channel.',
      entry.modifiers.length > 0
        ? `Contract modifiers: ${entry.modifiers
            .slice(0, 2)
            .map((modifier) => modifier.label)
            .join(', ')}.`
        : '',
    ],
    MAX_DETAILS
  )
}

function buildFactionStateMap(game: GameState) {
  return new Map(buildFactionStates(game).map((faction) => [faction.id, faction] as const))
}

function buildFactionContext(
  entry: Pick<ContractCatalogEntry, 'factionId' | 'contactId'>,
  factionStateMap: Map<string, FactionState>
) {
  const faction = entry.factionId ? factionStateMap.get(entry.factionId) ?? null : null
  const contact =
    faction && entry.contactId
      ? faction.contacts.find((candidate) => candidate.id === entry.contactId) ?? null
      : null

  if (!faction) {
    return {
      summary: 'This contract does not currently route through a tracked faction dossier.',
      modifierSummary: 'No faction modifier is currently attached to this packet.',
      hiddenSummary: 'No hidden faction influence is attached to this packet.',
      details: ['No faction posture or contact modifiers are attached to this packet.'],
    }
  }

  const knownEffects =
    faction.knownModifiers.length > 0
      ? `Known effects: ${faction.knownModifiers
          .slice(0, MAX_DETAILS)
          .map((modifier) => modifier.label)
          .join(', ')}.`
      : 'No faction effects are currently confirmed.'
  const hiddenEffects =
    faction.hiddenModifierCount > 0
      ? `Unknown influence detected: ${faction.hiddenModifierCount} hidden faction effect${faction.hiddenModifierCount === 1 ? '' : 's'} remain unresolved for this dossier.`
      : 'No unresolved hidden faction effects remain for this dossier.'
  const history = faction.history ?? {
    missionsCompleted: 0,
    missionsFailed: 0,
    successRate: 0,
    interactionLog: [],
  }

  return {
    summary: `${faction.label} is currently ${faction.reputationTier} and ${faction.stance}, with standing ${faction.standing >= 0 ? '+' : ''}${faction.standing} and pressure ${faction.pressureScore}.`,
    modifierSummary: knownEffects,
    hiddenSummary: hiddenEffects,
    details: uniqueBounded(
      [
        contact
          ? `Contact: ${contact.name} / ${contact.role} / relationship ${
              contact.relationship >= 0 ? '+' : ''
            }${contact.relationship} / ${contact.status}.`
          : 'No dedicated contact channel is attached to this contract packet.',
        knownEffects,
        hiddenEffects,
        `History: ${history.missionsCompleted} successful / ${history.missionsFailed} failed interactions.`,
      ],
      MAX_DETAILS
    ),
  }
}

function buildFactionImpactSummary(
  entry: Pick<ContractCatalogEntry, 'factionId' | 'contactId'>,
  inspection: NonNullable<ReturnType<typeof buildContractInspectionState>>
) {
  if (!entry.factionId) {
    return undefined
  }

  const successReward = buildMissionRewardBreakdown(
    inspection.previewCase,
    'success',
    inspection.state.config,
    inspection.state
  )
  const failReward = buildMissionRewardBreakdown(
    inspection.previewCase,
    'fail',
    inspection.state.config,
    inspection.state
  )
  const successStanding = successReward.factionStanding.find(
    (standing) => standing.factionId === entry.factionId
  )
  const failStanding = failReward.factionStanding.find(
    (standing) => standing.factionId === entry.factionId
  )

  if (!successStanding && !failStanding) {
    const factionLabel = getContractFactionLabel(entry)
    return `Success likely improves ${factionLabel} standing. Failure likely strains ${factionLabel}.`
  }

  return uniqueBounded(
    [
      successStanding
        ? `Success likely improves ${successStanding.label} standing ${successStanding.delta >= 0 ? '+' : ''}${successStanding.delta}.`
        : '',
      failStanding
        ? `Failure likely strains ${failStanding.label} ${failStanding.delta >= 0 ? '+' : ''}${failStanding.delta}.`
        : '',
    ],
    3
  ).join(' ')
}

function buildDetailSubtitle(
  entry: ContractCatalogEntry,
  factionStateMap: Map<string, FactionState>
) {
  const faction = entry.factionId ? factionStateMap.get(entry.factionId) ?? null : null

  return uniqueBounded(
    [
      getContractFactionLabel(entry),
      faction ? `${capitalize(faction.reputationTier)} standing` : '',
      getContractStrategyLabel(entry.strategyTag),
    ],
    3
  ).join(' / ')
}

function buildContractInspectionState(game: GameState, offer: ContractOffer) {
  const previewCase = buildContractPreviewCase(game, offer)

  if (!previewCase) {
    return null
  }

  return {
    previewCase,
    state: {
      ...game,
      cases: {
        ...game.cases,
        [previewCase.id]: previewCase,
      },
    } satisfies GameState,
  }
}

function buildAvailableDetail(
  game: GameState,
  entry: ContractCatalogEntry,
  offer: ContractOffer,
  operationsSummary: ReturnType<typeof getOperationsReportView>['weeklySummary'],
  factionStateMap: Map<string, FactionState>
): ContractBoardDetailView {
  const inspection = buildContractInspectionState(game, offer)
  const routing = inspection
    ? explainMissionRouting(inspection.state, inspection.previewCase.id)
    : null
  const teamSuggestions = getContractTeamSuggestions(game, offer).slice(0, MAX_ACTIONS)
  const recommended = teamSuggestions[0]
  const readiness =
    inspection && recommended
      ? explainDeploymentReadiness(inspection.state, recommended.team.id, inspection.previewCase.id)
      : null
  const rewardRange = recommended?.rewardRange ?? buildContractRewardRange(offer)
  const rewardPresentation = buildRewardPresentation(entry, rewardRange)
  const priority = buildAvailablePriority(game, offer)
  const factionContext = buildFactionContext(entry, factionStateMap)
  const factionImpactSummary = inspection ? buildFactionImpactSummary(entry, inspection) : undefined
  const intelPresentation = inspection ? buildAvailableIntelSummary(game, inspection) : {
    intelLabel: 'Preview unavailable',
    intelSummary: 'Intel preview is unavailable because the preview case could not be built.',
    intelKnownSummary: 'The board could not build a preview packet for this contract.',
    intelUncertaintySummary:
      'Confidence and uncertainty cannot be projected until the preview packet exists.',
    intelNextStepSummary: 'Review unlocks, chain state, or live board conditions before retrying this packet.',
  }
  const pressure = buildCurrentSimulationPressureSummary(game)

  return {
    id: entry.boardId,
    title: entry.name,
    description: entry.description,
    subtitle: buildDetailSubtitle(entry, factionStateMap),
    durationLabel: `${entry.durationWeeks} week deployment`,
    riskLabel: formatRiskLabel(entry.riskLevel),
    availabilityLabel: formatAvailabilityLabel(entry),
    availabilityTone: getAvailabilityTone(entry),
    priorityLabel: priority.priorityLabel,
    priorityTone: priority.priorityTone,
    prioritySummary: priority.prioritySummary,
    rewardLabel: rewardPresentation.rewardLabel,
    rewardHeadline: rewardPresentation.rewardHeadline,
    rewardDetails: uniqueBounded(
      [
        ...rewardPresentation.rewardDetails,
        rewardRange.materials.length > 0
          ? `Material swing: ${formatMaterialSummary(
              rewardRange.materials.map((material) => ({
                label: material.label,
                quantityMin: material.quantityMin,
                quantityMax: material.quantityMax,
              }))
            )}`
          : '',
      ],
      MAX_DETAILS
    ),
    factionSummary: factionContext.summary,
    factionModifierSummary: factionContext.modifierSummary,
    factionHiddenSummary: factionContext.hiddenSummary,
    ...(factionImpactSummary ? { factionImpactSummary } : {}),
    factionDetails: factionContext.details,
    missionContext: buildMissionContext(entry),
    routingSummary:
      routing?.summary ?? 'Routing preview is unavailable because the preview case could not be built.',
    routingFactorLabel: routing
      ? capitalize(formatVisibilityFactorLabel(routing.dominantFactor))
      : 'Preview unavailable',
    readinessSummary: readiness?.summary ?? 'No currently available team satisfies the base case requirements for this contract.',
    readinessFactorLabel: readiness
      ? capitalize(formatVisibilityFactorLabel(readiness.dominantFactor))
      : recommended
        ? 'Awaiting readiness inspection'
        : 'No viable team',
    intelLabel: intelPresentation.intelLabel,
    intelSummary: intelPresentation.intelSummary,
    intelKnownSummary: intelPresentation.intelKnownSummary,
    intelUncertaintySummary: intelPresentation.intelUncertaintySummary,
    intelNextStepSummary: intelPresentation.intelNextStepSummary,
    pressureSummary: `${operationsSummary.summary} Active unresolved operations: ${pressure.unresolvedCaseCount}.`,
    blockerSummary:
      recommended && readiness
        ? readiness.hardBlockers.length > 0
          ? 'Hard blockers still need clearing before launch.'
          : readiness.softRisks.length > 0
            ? 'Launch is possible, but soft risks are active.'
            : 'Recommended team is currently ready to launch.'
        : 'No deployable team currently satisfies this contract.',
    blockerDetails: uniqueBounded(
      [
        ...(readiness?.hardBlockers ?? []).map((blocker) =>
          capitalize(formatVisibilityFactorLabel(blocker))
        ),
        ...(readiness?.softRisks ?? []).map((risk) =>
          capitalize(formatVisibilityFactorLabel(risk))
        ),
        ...(routing?.details ?? []),
      ],
      MAX_DETAILS
    ),
    launchActions:
      teamSuggestions.length > 0
        ? teamSuggestions.map((suggestion) => ({
            type: 'launch' as const,
            label: `Launch with ${suggestion.team.name}`,
            detail: `${suggestion.successBand} success / ${suggestion.injuryRiskBand} injury / ${suggestion.deathRiskBand} death`,
            teamId: suggestion.team.id,
          }))
        : [
            {
              type: 'link' as const,
              label: 'Open teams',
              detail: 'Review roster coverage and restore a viable launch package.',
              href: APP_ROUTES.teams,
            },
          ],
    helperLinks: [
      { label: 'Teams', href: APP_ROUTES.teams },
      { label: 'Intel', href: APP_ROUTES.intel },
      ...(entry.factionId ? [{ label: 'Factions', href: APP_ROUTES.factions }] : []),
      { label: 'Reports', href: APP_ROUTES.report },
    ],
  }
}

function buildUnavailableDetail(
  entry: ContractCatalogEntry,
  operationsSummary: ReturnType<typeof getOperationsReportView>['weeklySummary'],
  factionStateMap: Map<string, FactionState>
): ContractBoardDetailView {
  const rewardPresentation = buildRewardPresentation(entry)
  const priority = buildUnavailablePriority(entry)
  const factionContext = buildFactionContext(entry, factionStateMap)
  const intelPresentation = buildUnavailableIntelSummary(entry)
  const blockerSummary =
    entry.availabilityState === 'active'
      ? 'A live contract from this channel is already in the field.'
      : entry.blockerDetails[0] ?? 'This contract channel is not live this week.'

  return {
    id: entry.boardId,
    title: entry.name,
    description: entry.description,
    subtitle: buildDetailSubtitle(entry, factionStateMap),
    durationLabel: `${entry.durationWeeks} week deployment`,
    riskLabel: formatRiskLabel(entry.riskLevel),
    availabilityLabel: formatAvailabilityLabel(entry),
    availabilityTone: getAvailabilityTone(entry),
    priorityLabel: priority.priorityLabel,
    priorityTone: priority.priorityTone,
    prioritySummary: priority.prioritySummary,
    rewardLabel: rewardPresentation.rewardLabel,
    rewardHeadline: rewardPresentation.rewardHeadline,
    rewardDetails: rewardPresentation.rewardDetails,
    factionSummary: factionContext.summary,
    factionModifierSummary: factionContext.modifierSummary,
    factionHiddenSummary: factionContext.hiddenSummary,
    factionDetails: factionContext.details,
    missionContext: buildMissionContext(entry),
    routingSummary:
      entry.availabilityState === 'active'
        ? 'This contract channel has already been committed and is now tracked from the live case queue.'
        : 'No routing preview opens until this contract channel becomes live on the weekly board.',
    routingFactorLabel:
      entry.availabilityState === 'active' ? 'Already committed' : 'Unavailable this week',
    readinessSummary:
      entry.availabilityState === 'active'
        ? 'Use the cases or teams screens to inspect the active deployment.'
        : 'Readiness inspection unlocks once the contract is generated on the live board.',
    readinessFactorLabel:
      entry.blockerCodes[0]?.replace(/-/g, ' ')?.replace(/\b\w/g, (match) => match.toUpperCase()) ??
      'Locked',
    intelLabel: intelPresentation.intelLabel,
    intelSummary: intelPresentation.intelSummary,
    intelKnownSummary: intelPresentation.intelKnownSummary,
    intelUncertaintySummary: intelPresentation.intelUncertaintySummary,
    intelNextStepSummary: intelPresentation.intelNextStepSummary,
    pressureSummary: operationsSummary.summary,
    blockerSummary,
    blockerDetails:
      entry.blockerDetails.length > 0
        ? uniqueBounded(entry.blockerDetails, MAX_DETAILS)
        : ['No explicit blocker details are currently attached to this channel.'],
    launchActions: [
      {
        type: 'link',
        label: entry.availabilityState === 'active' ? 'Open cases' : 'Open reports',
        detail:
          entry.availabilityState === 'active'
            ? 'Review the live incident queue and active assignment.'
            : 'Review current campaign pressure and unlock progress.',
        href: entry.availabilityState === 'active' ? APP_ROUTES.cases : APP_ROUTES.report,
      },
    ],
    helperLinks: [
      { label: 'Cases', href: APP_ROUTES.cases },
      { label: 'Intel', href: APP_ROUTES.intel },
      ...(entry.factionId ? [{ label: 'Factions', href: APP_ROUTES.factions }] : []),
      { label: 'Reports', href: APP_ROUTES.report },
    ],
  }
}

function buildListItem(entry: ContractCatalogEntry): ContractBoardListItemView {
  const rewardPresentation = buildRewardPresentation(entry)
  const priority = buildUnavailablePriority(entry)
  return {
    id: entry.boardId,
    title: entry.name,
    subtitle: getContractFactionLabel(entry),
    durationLabel: `${entry.durationWeeks}w`,
    rewardLabel: rewardPresentation.rewardLabel,
    rewardHeadline: rewardPresentation.rewardHeadline,
    riskLabel: formatRiskLabel(entry.riskLevel),
    availabilityLabel: formatAvailabilityLabel(entry),
    tone: getAvailabilityTone(entry),
    priorityLabel: priority.priorityLabel,
    priorityTone: priority.priorityTone,
    ...(entry.availabilityState !== 'available' && entry.blockerDetails[0]
      ? { blockerSummary: entry.blockerDetails[0] }
      : {}),
  }
}

function compareEntries(
  left: ContractCatalogEntry,
  right: ContractCatalogEntry,
  offerOrder: Map<string, number>
) {
  const stateOrder: Record<ContractCatalogEntry['availabilityState'], number> = {
    available: 0,
    active: 1,
    locked: 2,
    standby: 3,
  }

  if (stateOrder[left.availabilityState] !== stateOrder[right.availabilityState]) {
    return stateOrder[left.availabilityState] - stateOrder[right.availabilityState]
  }

  if (left.availabilityState === 'available' && right.availabilityState === 'available') {
    return (offerOrder.get(left.templateId) ?? 99) - (offerOrder.get(right.templateId) ?? 99)
  }

  return left.name.localeCompare(right.name)
}

export function getContractBoardView(
  game: GameState,
  options?: {
    selectedItemId?: string | null
    filter?: ContractBoardFilterId
  }
): ContractBoardView {
  const filter = options?.filter ?? 'all'
  const offers = getContractOffers(game)
  const offerMap = new Map(offers.map((offer) => [offer.id, offer] as const))
  const offerOrder = new Map(offers.map((offer, index) => [offer.templateId, index] as const))
  const factionStateMap = buildFactionStateMap(game)
  const operationsReport = getOperationsReportView(game)
  const catalog = getContractCatalogEntries(game)
  const visibleBaseEntries = catalog.filter(
    (entry) =>
      entry.availabilityState === 'available' ||
      entry.availabilityState === 'active' ||
      entry.availabilityState === 'locked'
  )
  const lockedEntries = visibleBaseEntries.filter((entry) => entry.availabilityState === 'locked')
  const availableEntries = visibleBaseEntries.filter((entry) => entry.availabilityState === 'available')
  const activeEntries = visibleBaseEntries.filter((entry) => entry.availabilityState === 'active')
  const boundedEntries = [
    ...availableEntries,
    ...activeEntries,
    ...lockedEntries.slice(0, MAX_LOCKED_ITEMS),
  ].sort((left, right) => compareEntries(left, right, offerOrder))
  const filteredEntries = boundedEntries
    .filter((entry) => {
      if (filter === 'available') {
        return entry.availabilityState === 'available'
      }

      if (filter === 'locked') {
        return entry.availabilityState === 'locked' || entry.availabilityState === 'active'
      }

      return true
    })
    .slice(0, MAX_LIST_ITEMS)

  const selectedEntry =
    filteredEntries.find((entry) => entry.boardId === options?.selectedItemId) ?? filteredEntries[0] ?? null

  const selectedDetail =
    selectedEntry === null
      ? null
      : selectedEntry.offerId && offerMap.has(selectedEntry.offerId)
        ? buildAvailableDetail(
            game,
            selectedEntry,
            offerMap.get(selectedEntry.offerId)!,
            operationsReport.weeklySummary,
            factionStateMap
          )
        : buildUnavailableDetail(selectedEntry, operationsReport.weeklySummary, factionStateMap)

  const itemViews = filteredEntries.map((entry) => {
    if (entry.offerId && offerMap.has(entry.offerId)) {
      const priority = buildAvailablePriority(game, offerMap.get(entry.offerId)!)
      const rewardPresentation = buildRewardPresentation(
        entry,
        buildContractRewardRange(offerMap.get(entry.offerId)!)
      )

      return {
        ...buildListItem(entry),
        rewardLabel: rewardPresentation.rewardLabel,
        rewardHeadline: rewardPresentation.rewardHeadline,
        priorityLabel: priority.priorityLabel,
        priorityTone: priority.priorityTone,
      }
    }

    return buildListItem(entry)
  })

  return {
    boardSummary:
      availableEntries.length > 0
        ? `${availableEntries.length} live contract channel${availableEntries.length === 1 ? '' : 's'} on the weekly board, ${lockedEntries.length} blocked or locked follow-up${lockedEntries.length === 1 ? '' : 's'}.`
        : 'No live contract channels are available this week. Review blockers and current pressure before the next advance.',
    ...(selectedEntry
      ? {
          factionLabel: getContractFactionLabel(selectedEntry),
          riskLabel: selectedDetail?.riskLabel,
          rewardLabel: selectedDetail?.rewardLabel,
        }
      : {}),
    availableCount: availableEntries.length,
    lockedCount: lockedEntries.length,
    activeCount: activeEntries.length,
    filters: [
      { id: 'all', label: 'All', count: boundedEntries.length },
      { id: 'available', label: 'Live', count: availableEntries.length },
      { id: 'locked', label: 'Blocked', count: lockedEntries.length + activeEntries.length },
    ],
    items: itemViews,
    selectedItemId: selectedEntry?.boardId ?? null,
    selectedDetail,
  }
}

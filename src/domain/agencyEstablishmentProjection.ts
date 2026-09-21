import { buildAgencySummary } from './agency'
import { assessAttritionPressure } from './agent/attrition'
import {
  getCampaignSettingEffectiveAt,
  getCurrentCampaignRulesLedger,
} from './campaignLedger'
import { assessFundingPressure } from './funding'
import { getMissionIntelSummary } from './intel'
import { buildLogisticsOverview } from './logistics'
import type { CaseInstance, GameState, MissionPriorityBand } from './models'
import { triageMission } from './missionIntakeRouting'
import { explainMissionRouting, type VisibilityExplanationSeverity } from './visibility'

export const AGENCY_ESTABLISHMENT_BEAT_IDS = [
  'doctrine-setting-frame',
  'initial-facility-state',
  'opening-operational-ledger',
  'command-identity',
  'operational-briefing',
  'first-live-dossier',
  'agency-activation-week-1',
] as const

export type AgencyEstablishmentBeatId = (typeof AGENCY_ESTABLISHMENT_BEAT_IDS)[number]

export const AGENCY_ESTABLISHMENT_ROLE_FRAMING_TOKEN =
  'managerial-deterministic-team-first' as const

export const AGENCY_ESTABLISHMENT_BRIEFING_QUESTION_TOKENS = [
  'what-changed',
  'what-can-we-support',
  'what-matters-now',
  'what-must-improve-next',
] as const

export const AGENCY_ESTABLISHMENT_HANDOFF_TOKEN = 'review-the-week' as const

export interface AgencyEstablishmentDoctrineProjection {
  readonly organizationName: string
  readonly majorHookSummary: string
  readonly doctrineLabel: string
  readonly toneScopeLabel: string
  readonly activeRulesProfileId: string
  readonly activeRulesProfileLabel: string
}

export interface AgencyEstablishmentFacilityProjection {
  readonly homeBaseId: string
  readonly homeBaseLabel: string
  readonly operationalRegionId: string
  readonly operationalRegionLabel: string
  readonly stabilityScore: number
  readonly stabilityLevel: 'stable' | 'strained' | 'fragile'
  readonly readyTeams: number
  readonly totalTeams: number
  readonly totalStock: number
  readonly queuedProductionOrders: number
  readonly supportAvailable?: number
  readonly maintenanceSpecialistsAvailable?: number
}

export interface AgencyEstablishmentOperationalLedgerProjection {
  readonly funding: number
  readonly budgetPressure: number
  readonly pendingProcurementRequests: number
  readonly containmentRating: number
  readonly clearanceLevel: number
  readonly activeCases: number
  readonly inProgressCases: number
  readonly openOperationSlots: number
  readonly pressureScore: number
  readonly pressureLevel: 'low' | 'elevated' | 'critical'
  readonly staffingGap: number
  readonly replacementPressure: number
  readonly temporaryUnavailableCount: number
  readonly totalStock: number
  readonly queuedProductionOrders: number
}

export interface AgencyEstablishmentCommandIdentityProjection {
  readonly organizationName: string
  readonly doctrineLabel: string
  readonly roleFramingToken: typeof AGENCY_ESTABLISHMENT_ROLE_FRAMING_TOKEN
}

export interface AgencyEstablishmentRoutingExplanation {
  readonly summary: string
  readonly dominantFactor: string
  readonly details: readonly string[]
  readonly severity: VisibilityExplanationSeverity
}

export interface AgencyEstablishmentFirstDossierProjection {
  readonly caseId: string
  readonly title: string
  readonly status: CaseInstance['status']
  readonly stage: number
  readonly deadlineRemaining: number
  readonly triageScore: number
  readonly priority: MissionPriorityBand
  readonly triageReasonCodes: readonly string[]
  readonly intel: {
    readonly confidence: number
    readonly uncertainty: number
    readonly age: number
  }
  readonly routingExplanation: AgencyEstablishmentRoutingExplanation
}

export interface AgencyEstablishmentBriefingProjection {
  readonly questionTokens: typeof AGENCY_ESTABLISHMENT_BRIEFING_QUESTION_TOKENS
  readonly primaryDossierCaseId: string | null
  readonly primaryRoutingExplanation: AgencyEstablishmentRoutingExplanation | null
}

export interface AgencyEstablishmentActivationProjection {
  readonly nextStepToken: typeof AGENCY_ESTABLISHMENT_HANDOFF_TOKEN
}

export interface AgencyEstablishmentBeat<TId extends AgencyEstablishmentBeatId, TPayload> {
  readonly id: TId
  readonly order: number
  readonly payload: TPayload
}

export type AgencyEstablishmentBeatProjection =
  | AgencyEstablishmentBeat<'doctrine-setting-frame', AgencyEstablishmentDoctrineProjection>
  | AgencyEstablishmentBeat<'initial-facility-state', AgencyEstablishmentFacilityProjection>
  | AgencyEstablishmentBeat<
      'opening-operational-ledger',
      AgencyEstablishmentOperationalLedgerProjection
    >
  | AgencyEstablishmentBeat<'command-identity', AgencyEstablishmentCommandIdentityProjection>
  | AgencyEstablishmentBeat<'operational-briefing', AgencyEstablishmentBriefingProjection>
  | AgencyEstablishmentBeat<
      'first-live-dossier',
      AgencyEstablishmentFirstDossierProjection | null
    >
  | AgencyEstablishmentBeat<
      'agency-activation-week-1',
      AgencyEstablishmentActivationProjection
    >

export interface AgencyEstablishmentProjection {
  readonly version: 1
  readonly week: number
  readonly doctrine: AgencyEstablishmentDoctrineProjection
  readonly facility: AgencyEstablishmentFacilityProjection
  readonly operationalLedger: AgencyEstablishmentOperationalLedgerProjection
  readonly commandIdentity: AgencyEstablishmentCommandIdentityProjection
  readonly briefing: AgencyEstablishmentBriefingProjection
  readonly firstDossier: AgencyEstablishmentFirstDossierProjection | null
  readonly activation: AgencyEstablishmentActivationProjection
  readonly beats: readonly AgencyEstablishmentBeatProjection[]
}

function compareDossierCandidates(
  left: { currentCase: CaseInstance; triageScore: number },
  right: { currentCase: CaseInstance; triageScore: number }
) {
  return (
    right.triageScore - left.triageScore ||
    right.currentCase.stage - left.currentCase.stage ||
    left.currentCase.deadlineRemaining - right.currentCase.deadlineRemaining ||
    left.currentCase.title.localeCompare(right.currentCase.title) ||
    left.currentCase.id.localeCompare(right.currentCase.id)
  )
}

export function selectAgencyEstablishmentFirstDossier(
  game: GameState
): AgencyEstablishmentFirstDossierProjection | null {
  const selected = Object.values(game.cases)
    .filter((currentCase) => currentCase.status !== 'resolved')
    .map((currentCase) => {
      const triage = triageMission(game, currentCase)
      return { currentCase, triage, triageScore: triage.score }
    })
    .sort(compareDossierCandidates)[0]

  if (!selected) {
    return null
  }

  const intel = getMissionIntelSummary(selected.currentCase, game.week)
  const routing = explainMissionRouting(game, selected.currentCase.id)

  return Object.freeze({
    caseId: selected.currentCase.id,
    title: selected.currentCase.title,
    status: selected.currentCase.status,
    stage: selected.currentCase.stage,
    deadlineRemaining: selected.currentCase.deadlineRemaining,
    triageScore: selected.triage.score,
    priority: selected.triage.priority,
    triageReasonCodes: Object.freeze([...selected.triage.reasonCodes]),
    intel: Object.freeze({
      confidence: intel.confidence,
      uncertainty: intel.uncertainty,
      age: intel.age,
    }),
    routingExplanation: Object.freeze({
      summary: routing.summary,
      dominantFactor: routing.dominantFactor,
      details: Object.freeze([...routing.details]),
      severity: routing.severity,
    }),
  })
}

export function buildAgencyEstablishmentProjection(
  game: GameState
): AgencyEstablishmentProjection {
  const campaign = getCurrentCampaignRulesLedger(game)
  const agency = buildAgencySummary(game)
  const funding = assessFundingPressure(game)
  const attrition = assessAttritionPressure(game)
  const logistics = buildLogisticsOverview(game)
  const firstDossier = selectAgencyEstablishmentFirstDossier(game)
  const effectiveTone =
    getCampaignSettingEffectiveAt(game, 'toneScopeLabel', game.week) ??
    campaign.profile.toneScopeLabel

  const doctrine = Object.freeze({
    organizationName: campaign.profile.organizationName,
    majorHookSummary: campaign.profile.majorHookSummary,
    doctrineLabel: campaign.profile.doctrineLabel,
    toneScopeLabel: effectiveTone,
    activeRulesProfileId: campaign.activeRulesProfileId,
    activeRulesProfileLabel: campaign.activeRulesProfileLabel,
  })

  const supportAvailable = game.agency?.supportAvailable
  const maintenanceSpecialistsAvailable = game.agency?.maintenanceSpecialistsAvailable

  const facility = Object.freeze({
    homeBaseId: campaign.profile.homeBaseId,
    homeBaseLabel: campaign.profile.homeBaseLabel,
    operationalRegionId: campaign.profile.operationalRegionId,
    operationalRegionLabel: campaign.profile.operationalRegionLabel,
    stabilityScore: agency.stability.score,
    stabilityLevel: agency.stability.level,
    readyTeams: agency.teams.ready,
    totalTeams: agency.teams.total,
    totalStock: logistics.totalStock,
    queuedProductionOrders: logistics.queuedOrders,
    ...(typeof supportAvailable === 'number' ? { supportAvailable } : {}),
    ...(typeof maintenanceSpecialistsAvailable === 'number'
      ? { maintenanceSpecialistsAvailable }
      : {}),
  })

  const operationalLedger = Object.freeze({
    funding: funding.funding,
    budgetPressure: funding.budgetPressure,
    pendingProcurementRequests: funding.pendingProcurementRequestIds.length,
    containmentRating: agency.containmentRating,
    clearanceLevel: agency.clearanceLevel,
    activeCases: agency.activeOperations.activeCases,
    inProgressCases: agency.activeOperations.inProgressCases,
    openOperationSlots: agency.activeOperations.openOperationSlots,
    pressureScore: agency.pressure.score,
    pressureLevel: agency.pressure.level,
    staffingGap: attrition.staffingGap,
    replacementPressure: attrition.replacementPressure,
    temporaryUnavailableCount: attrition.temporaryUnavailableCount,
    totalStock: logistics.totalStock,
    queuedProductionOrders: logistics.queuedOrders,
  })

  const commandIdentity = Object.freeze({
    organizationName: campaign.profile.organizationName,
    doctrineLabel: campaign.profile.doctrineLabel,
    roleFramingToken: AGENCY_ESTABLISHMENT_ROLE_FRAMING_TOKEN,
  })

  const briefing = Object.freeze({
    questionTokens: AGENCY_ESTABLISHMENT_BRIEFING_QUESTION_TOKENS,
    primaryDossierCaseId: firstDossier?.caseId ?? null,
    primaryRoutingExplanation: firstDossier?.routingExplanation ?? null,
  })

  const activation = Object.freeze({
    nextStepToken: AGENCY_ESTABLISHMENT_HANDOFF_TOKEN,
  })

  const beats: readonly AgencyEstablishmentBeatProjection[] = Object.freeze([
    Object.freeze({ id: AGENCY_ESTABLISHMENT_BEAT_IDS[0], order: 1, payload: doctrine }),
    Object.freeze({ id: AGENCY_ESTABLISHMENT_BEAT_IDS[1], order: 2, payload: facility }),
    Object.freeze({
      id: AGENCY_ESTABLISHMENT_BEAT_IDS[2],
      order: 3,
      payload: operationalLedger,
    }),
    Object.freeze({
      id: AGENCY_ESTABLISHMENT_BEAT_IDS[3],
      order: 4,
      payload: commandIdentity,
    }),
    Object.freeze({ id: AGENCY_ESTABLISHMENT_BEAT_IDS[4], order: 5, payload: briefing }),
    Object.freeze({
      id: AGENCY_ESTABLISHMENT_BEAT_IDS[5],
      order: 6,
      payload: firstDossier,
    }),
    Object.freeze({ id: AGENCY_ESTABLISHMENT_BEAT_IDS[6], order: 7, payload: activation }),
  ])

  return Object.freeze({
    version: 1 as const,
    week: game.week,
    doctrine,
    facility,
    operationalLedger,
    commandIdentity,
    briefing,
    firstDossier,
    activation,
    beats,
  })
}

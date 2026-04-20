import type { AnyOperationEventDraft } from './events'
import { clamp } from './math'

export type GovernanceAuthorityClass =
  | 'sovereign_authority'
  | 'charter_holdings'
  | 'site_custody'

export type GovernanceTransferPath =
  | 'inheritance'
  | 'recognized_transfer'
  | 'investiture'
  | 'violent_extraction'

export type GovernanceTransferState =
  | 'pending'
  | 'blocked'
  | 'ready'
  | 'completed'
  | 'contested'
  | 'failed'

export type GovernanceTransferOutcomeType =
  | 'authority_transferred'
  | 'partial_claim'
  | 'transfer_invalid'
  | 'contested_completion'
  | 'failover_selected'
  | 'declined'

export type GovernanceInheritedPowerTier = 'none' | 'trace' | 'vested' | 'ascendant'

export type GovernanceInheritedPowerOutcomeType =
  | 'no_gain'
  | 'new_gain'
  | 'upgrade_existing'

export type GovernanceParticipantRole = 'holder' | 'successor' | 'witness' | 'custodian'

export type GovernanceClaimBasis =
  | 'ceremony'
  | 'sealed_instrument'
  | 'adoption'
  | 'prophecy'
  | 'delayed_authentication'

export type GovernanceHolderStatus = 'active' | 'abdicated' | 'missing' | 'captured' | 'deceased'

export interface GovernanceParticipant {
  id: string
  name: string
  role: GovernanceParticipantRole
  present?: boolean
  captive?: boolean
  accepts?: boolean
}

export interface GovernanceClaimant {
  id: string
  name: string
  priority: number
  basis: GovernanceClaimBasis[]
  present?: boolean
  accepts?: boolean
  captive?: boolean
}

export interface GovernanceTransferRequirements {
  requiredLocation?: string
  requiredParticipantRoles: GovernanceParticipantRole[]
  requiredInstruments: string[]
  requiredSetupFlags: string[]
  voluntaryHolderRequired: boolean
  allowCoerciveCompletion: boolean
}

export interface GovernanceViolentExtraction {
  sourceActorId?: string
  sourceActorName: string
  sourceCaseId?: string
  sourceDefeated?: boolean
  extractionMethod: string
  requiredMethod?: string
  extractorEligible: boolean
  vesselPrepared: boolean
}

export interface GovernanceAuthorityState {
  id: string
  label: string
  class: GovernanceAuthorityClass
  holderId?: string
  holderName: string
  holderStatus: GovernanceHolderStatus
  inheritedPowerTier?: GovernanceInheritedPowerTier
  transferredAuthority: number
  recognizedLegitimacy: number
  practicalControl: number
  contested: boolean
  unstable: boolean
  lastTransferId?: string
}

export interface GovernanceInheritedPowerOutcome {
  type: GovernanceInheritedPowerOutcomeType
  previousTier: GovernanceInheritedPowerTier
  nextTier: GovernanceInheritedPowerTier
  recipientId?: string
  recipientName?: string
  reason: string
}

export interface GovernanceTransferOutcome {
  type: GovernanceTransferOutcomeType
  transferPath: GovernanceTransferPath
  grantedPowerTier: GovernanceInheritedPowerTier
  transferredAuthority: number
  recognizedLegitimacy: number
  practicalControl: number
  contested: boolean
  unstable: boolean
  successorId?: string
  successorName?: string
  sourceActorName?: string
  failoverUsed?: boolean
  coercive?: boolean
  blockers: string[]
  inheritedPower?: GovernanceInheritedPowerOutcome
}

export interface GovernanceTransfer {
  id: string
  authorityId: string
  authorityLabel: string
  authorityClass: GovernanceAuthorityClass
  transferPath?: GovernanceTransferPath
  state: GovernanceTransferState
  batchId?: string
  batchLabel?: string
  participants: GovernanceParticipant[]
  claimants: GovernanceClaimant[]
  inheritedPowerTier?: GovernanceInheritedPowerTier
  requiresLatentLineage?: boolean
  minimumLatentLineageTier?: GovernanceInheritedPowerTier
  allowsInvestiture?: boolean
  requiredLocation?: string
  requiredParticipantRoles?: GovernanceParticipantRole[]
  actualLocation?: string
  requiredInstruments?: string[]
  presentInstruments?: string[]
  requiredSetupFlags?: string[]
  presentSetupFlags?: string[]
  voluntaryHolderRequired?: boolean
  allowCoerciveCompletion?: boolean
  coercive?: boolean
  violentExtraction?: GovernanceViolentExtraction
  sourceContractId?: string
  blockers?: string[]
  selectedSuccessorId?: string
  selectedSuccessorName?: string
  outcome?: GovernanceTransferOutcome
  lastProcessedWeek?: number
}

export interface GovernanceContractTrigger {
  type: 'holder_status' | 'week_reached'
  holderStatuses?: GovernanceHolderStatus[]
  weekAtLeast?: number
}

export interface GovernanceSuccessionContract {
  id: string
  authorityId: string
  authorityLabel: string
  authorityClass: GovernanceAuthorityClass
  status: 'armed' | 'triggered' | 'completed' | 'declined' | 'failed'
  trigger: GovernanceContractTrigger
  participants: GovernanceParticipant[]
  claimants: GovernanceClaimant[]
  inheritedPowerTier?: GovernanceInheritedPowerTier
  requiresLatentLineage?: boolean
  minimumLatentLineageTier?: GovernanceInheritedPowerTier
  allowsInvestiture?: boolean
  batchId?: string
  batchLabel?: string
  requiredLocation?: string
  requiredParticipantRoles?: GovernanceParticipantRole[]
  actualLocation?: string
  requiredInstruments?: string[]
  presentInstruments?: string[]
  requiredSetupFlags?: string[]
  presentSetupFlags?: string[]
  voluntaryHolderRequired?: boolean
  allowCoerciveCompletion?: boolean
  coercive?: boolean
  lastTransferId?: string
}

export interface GovernanceTransferHistoryEntry {
  transferId: string
  authorityId: string
  authorityLabel: string
  authorityClass: GovernanceAuthorityClass
  transferPath: GovernanceTransferPath
  batchId?: string
  batchLabel?: string
  week: number
  state: GovernanceTransferState
  outcome: GovernanceTransferOutcomeType
  grantedPowerTier: GovernanceInheritedPowerTier
  summary: string
  successorName?: string
  sourceActorName?: string
  blockers: string[]
  transferredAuthority: number
  recognizedLegitimacy: number
  practicalControl: number
  coercive: boolean
  failoverUsed: boolean
  inheritedPowerType?: GovernanceInheritedPowerOutcomeType
  inheritedPowerPreviousTier?: GovernanceInheritedPowerTier
  inheritedPowerNextTier?: GovernanceInheritedPowerTier
  inheritedPowerReason?: string
}

export interface GovernanceState {
  authorities: GovernanceAuthorityState[]
  transfers: GovernanceTransfer[]
  contracts: GovernanceSuccessionContract[]
  history: GovernanceTransferHistoryEntry[]
}

export interface GovernanceBatchSummaryView {
  batchId: string
  label: string
  lastWeek: number
  completed: number
  contested: number
  blocked: number
  failed: number
}

export interface GovernanceTransferStatusView {
  id: string
  authorityLabel: string
  state: GovernanceTransferState
  stateLabel: string
  successorLabel: string
  metricsLabel: string
  blockerLabel?: string
  batchLabel?: string
  outcomeLabel?: string
}

export interface GovernanceContractStatusView {
  id: string
  authorityLabel: string
  status: GovernanceSuccessionContract['status']
  successorLabel: string
  triggerLabel: string
}

export interface GovernanceTransferSummary {
  authorityCount: number
  activeTransferCount: number
  blockedTransferCount: number
  contestedAuthorityCount: number
  armedContractCount: number
  latestBatch?: GovernanceBatchSummaryView
  activeTransfers: GovernanceTransferStatusView[]
  recentTransfers: GovernanceTransferStatusView[]
  contracts: GovernanceContractStatusView[]
}

export interface GovernanceWeekProcessingResult {
  governance?: GovernanceState
  eventDrafts: AnyOperationEventDraft[]
}

const GOVERNANCE_TRANSFER_RULES: Record<
  GovernanceAuthorityClass,
  GovernanceTransferRequirements
> = {
  sovereign_authority: {
    requiredLocation: 'command dais',
    requiredParticipantRoles: ['holder', 'witness', 'custodian'],
    requiredInstruments: ['command-seal'],
    requiredSetupFlags: ['rite-prepared'],
    voluntaryHolderRequired: true,
    allowCoerciveCompletion: true,
  },
  charter_holdings: {
    requiredLocation: 'records chamber',
    requiredParticipantRoles: ['custodian'],
    requiredInstruments: ['sealed-charter'],
    requiredSetupFlags: [],
    voluntaryHolderRequired: false,
    allowCoerciveCompletion: false,
  },
  site_custody: {
    requiredParticipantRoles: [],
    requiredInstruments: ['site-keys'],
    requiredSetupFlags: [],
    voluntaryHolderRequired: false,
    allowCoerciveCompletion: false,
  },
}

const CLAIM_BASIS_SCORE: Record<GovernanceClaimBasis, number> = {
  ceremony: 36,
  sealed_instrument: 24,
  adoption: 16,
  prophecy: 10,
  delayed_authentication: 18,
}

const GOVERNANCE_INHERITED_POWER_RANK: Record<GovernanceInheritedPowerTier, number> = {
  none: 0,
  trace: 1,
  vested: 2,
  ascendant: 3,
}

export function formatGovernanceTransferPath(path: GovernanceTransferPath) {
  switch (path) {
    case 'inheritance':
      return 'Inheritance'
    case 'recognized_transfer':
      return 'Recognized transfer'
    case 'investiture':
      return 'Investiture'
    case 'violent_extraction':
      return 'Violent extraction'
  }
}

export function formatGovernanceTransferOutcomeType(outcome: GovernanceTransferOutcomeType) {
  switch (outcome) {
    case 'authority_transferred':
      return 'authority transferred'
    case 'partial_claim':
      return 'partial claim'
    case 'transfer_invalid':
      return 'transfer invalid'
    case 'contested_completion':
      return 'contested completion'
    case 'failover_selected':
      return 'failover selected'
    case 'declined':
      return 'declined'
  }
}

export function formatGovernanceInheritedPowerTier(tier: GovernanceInheritedPowerTier) {
  switch (tier) {
    case 'none':
      return 'None'
    case 'trace':
      return 'Trace'
    case 'vested':
      return 'Vested'
    case 'ascendant':
      return 'Ascendant'
  }
}

export function formatGovernanceInheritedPowerOutcomeType(
  outcomeType: GovernanceInheritedPowerOutcomeType
) {
  switch (outcomeType) {
    case 'no_gain':
      return 'No gain'
    case 'new_gain':
      return 'New gain'
    case 'upgrade_existing':
      return 'Upgrade existing'
  }
}

export function compareGovernanceInheritedPowerTiers(
  left: GovernanceInheritedPowerTier,
  right: GovernanceInheritedPowerTier
) {
  return GOVERNANCE_INHERITED_POWER_RANK[left] - GOVERNANCE_INHERITED_POWER_RANK[right]
}

export function formatGovernanceInheritedPowerOutcome(
  outcome: GovernanceInheritedPowerOutcome | undefined
) {
  if (!outcome) {
    return undefined
  }

  const transition =
    outcome.previousTier === outcome.nextTier
      ? formatGovernanceInheritedPowerTier(outcome.nextTier)
      : `${formatGovernanceInheritedPowerTier(
          outcome.previousTier
        )} -> ${formatGovernanceInheritedPowerTier(outcome.nextTier)}`

  switch (outcome.type) {
    case 'no_gain':
      return `Inherited power: no gain (${transition})`
    case 'new_gain':
      return `Inherited power: new gain (${transition})`
    case 'upgrade_existing':
      return `Inherited power: upgrade existing (${transition})`
  }
}

export function describeGovernanceTransferResult({
  authorityLabel,
  transferPath,
  outcome,
  successorName,
  sourceActorName,
  blockers,
}: {
  authorityLabel: string
  transferPath: GovernanceTransferPath
  outcome: GovernanceTransferOutcomeType
  successorName?: string
  sourceActorName?: string
  blockers?: readonly string[]
}) {
  const successorLabel = successorName ?? 'successor pending'
  const pathLabel = formatGovernanceTransferPath(transferPath).toLowerCase()
  const sourceLabel =
    transferPath === 'violent_extraction' && sourceActorName
      ? ` from ${sourceActorName}`
      : ''
  const primaryBlocker = blockers?.[0] ?? 'Validation did not complete.'

  switch (outcome) {
    case 'authority_transferred':
      if (transferPath === 'recognized_transfer') {
        return `${authorityLabel}: clean transfer ratified to ${successorLabel}.`
      }

      if (transferPath === 'violent_extraction') {
        return `${authorityLabel}: violent extraction completed to ${successorLabel}${sourceLabel}.`
      }

      return `${authorityLabel}: ${pathLabel} ratified to ${successorLabel}.`
    case 'failover_selected':
      return `${authorityLabel}: failover successor ${successorLabel} recognized.`
    case 'partial_claim':
      return `${authorityLabel}: partial claim recognized for ${successorLabel}.`
    case 'contested_completion':
      return `${authorityLabel}: contested ${pathLabel} settled to ${successorLabel}${sourceLabel}.`
    case 'declined':
      return `${authorityLabel}: handoff declined. ${primaryBlocker}`
    case 'transfer_invalid':
      return `${authorityLabel}: transfer failed. ${primaryBlocker}`
  }
}

function cloneGovernanceState(governance: GovernanceState) {
  return structuredClone(governance)
}

function getAuthorityRules(transfer: GovernanceTransfer) {
  const defaults = GOVERNANCE_TRANSFER_RULES[transfer.authorityClass]

  return {
    requiredLocation: transfer.requiredLocation ?? defaults.requiredLocation,
    requiredParticipantRoles: transfer.requiredParticipantRoles ?? defaults.requiredParticipantRoles,
    requiredInstruments: transfer.requiredInstruments ?? defaults.requiredInstruments,
    requiredSetupFlags: transfer.requiredSetupFlags ?? defaults.requiredSetupFlags,
    voluntaryHolderRequired:
      transfer.voluntaryHolderRequired ?? defaults.voluntaryHolderRequired,
    allowCoerciveCompletion:
      transfer.allowCoerciveCompletion ?? defaults.allowCoerciveCompletion,
  }
}

function getTransferPath(transfer: GovernanceTransfer): GovernanceTransferPath {
  if (transfer.transferPath) {
    return transfer.transferPath
  }

  if (transfer.violentExtraction) {
    return 'violent_extraction'
  }

  return transfer.sourceContractId ? 'inheritance' : 'recognized_transfer'
}

function getGrantedInheritedPowerTier(
  transfer: GovernanceTransfer,
  authority?: GovernanceAuthorityState
): GovernanceInheritedPowerTier {
  if (transfer.inheritedPowerTier) {
    return transfer.inheritedPowerTier
  }

  if (authority?.inheritedPowerTier) {
    return authority.inheritedPowerTier
  }

  switch (transfer.authorityClass) {
    case 'sovereign_authority':
      return 'ascendant'
    case 'charter_holdings':
      return 'vested'
    case 'site_custody':
      return 'trace'
  }
}

export function getMinimumLatentLineageTier(
  transfer: GovernanceTransfer,
  grantedPowerTier: GovernanceInheritedPowerTier
) {
  if (transfer.minimumLatentLineageTier) {
    return transfer.minimumLatentLineageTier
  }

  return compareGovernanceInheritedPowerTiers(grantedPowerTier, 'trace') > 0
    ? grantedPowerTier
    : 'trace'
}

function sortClaimants(claimants: GovernanceClaimant[]) {
  return [...claimants].sort(
    (left, right) => left.priority - right.priority || left.name.localeCompare(right.name)
  )
}

function getParticipant(
  participants: GovernanceParticipant[],
  role: GovernanceParticipantRole
) {
  return participants.find((participant) => participant.role === role)
}

function hasAllRequiredItems(required: string[], present: string[]) {
  const presentSet = new Set(present)
  return required.every((item) => presentSet.has(item))
}

function getMissingItems(required: string[], present: string[]) {
  const presentSet = new Set(present)
  return required.filter((item) => !presentSet.has(item))
}

function describeTransferState(state: GovernanceTransferState) {
  switch (state) {
    case 'pending':
      return 'Pending'
    case 'blocked':
      return 'Blocked'
    case 'ready':
      return 'Ready'
    case 'completed':
      return 'Completed'
    case 'contested':
      return 'Contested'
    case 'failed':
      return 'Failed'
  }
}

function describeTrigger(trigger: GovernanceContractTrigger) {
  switch (trigger.type) {
    case 'holder_status':
      return `Trigger when holder status enters ${(trigger.holderStatuses ?? []).join(', ')}`
    case 'week_reached':
      return `Trigger at week ${trigger.weekAtLeast ?? 1}`
  }
}

function calculateClaimBasisScore(
  basis: GovernanceClaimBasis[],
  presentSetupFlags: string[]
) {
  const setupFlags = new Set(presentSetupFlags)

  return basis.reduce((sum, item) => {
    if (item === 'delayed_authentication' && !setupFlags.has('authentication-cleared')) {
      return sum + 8
    }

    return sum + CLAIM_BASIS_SCORE[item]
  }, 0)
}

export function formatGovernanceTransferMetrics(
  transferredAuthority: number,
  recognizedLegitimacy: number,
  practicalControl: number
) {
  return `Authority ${transferredAuthority} / legitimacy ${recognizedLegitimacy} / control ${practicalControl}`
}

function buildHistorySummary(
  authorityLabel: string,
  state: GovernanceTransferState,
  outcome: GovernanceTransferOutcome
) {
  const successorSegment = outcome.successorName ? ` to ${outcome.successorName}` : ''
  const stateVerb =
    state === 'completed'
      ? 'completed'
      : state === 'contested'
        ? 'settled as contested'
        : state === 'failed'
          ? 'failed'
          : state

  return (
    `${authorityLabel} ${stateVerb}${successorSegment}. ` +
    `${formatGovernanceTransferMetrics(
      outcome.transferredAuthority,
      outcome.recognizedLegitimacy,
      outcome.practicalControl
    )}.`
  )
}

function buildGovernanceTransferDraft(
  week: number,
  transfer: GovernanceTransfer,
  outcome: GovernanceTransferOutcome
): AnyOperationEventDraft {
  return {
    type: 'governance.transfer_processed',
    sourceSystem: 'system',
    payload: {
      week,
      transferId: transfer.id,
      authorityId: transfer.authorityId,
      authorityLabel: transfer.authorityLabel,
      authorityClass: transfer.authorityClass,
      transferPath: outcome.transferPath,
      batchId: transfer.batchId,
      batchLabel: transfer.batchLabel,
      state: transfer.state,
      outcome: outcome.type,
      grantedPowerTier: outcome.grantedPowerTier,
      successorId: outcome.successorId,
      successorName: outcome.successorName,
      sourceActorName: outcome.sourceActorName,
      failoverUsed: outcome.failoverUsed ?? false,
      coercive: outcome.coercive ?? false,
      transferredAuthority: outcome.transferredAuthority,
      recognizedLegitimacy: outcome.recognizedLegitimacy,
      practicalControl: outcome.practicalControl,
      blockers: outcome.blockers,
      inheritedPowerOutcome: outcome.inheritedPower?.type,
      inheritedPowerPreviousTier: outcome.inheritedPower?.previousTier,
      inheritedPowerNextTier: outcome.inheritedPower?.nextTier,
      inheritedPowerRecipientId: outcome.inheritedPower?.recipientId,
      inheritedPowerRecipientName: outcome.inheritedPower?.recipientName,
      inheritedPowerReason: outcome.inheritedPower?.reason,
    },
  }
}

function getLegitimacyStabilityThreshold(authorityClass: GovernanceAuthorityClass) {
  switch (authorityClass) {
    case 'sovereign_authority':
      return 70
    case 'charter_holdings':
      return 55
    case 'site_custody':
      return 45
  }
}

function selectSuccessor(claimants: GovernanceClaimant[]) {
  const ordered = sortClaimants(claimants)
  const designated = ordered[0]
  const selected = ordered.find(
    (claimant) => claimant.accepts !== false && claimant.captive !== true
  )
  const fallbackCandidate =
    selected ??
    ordered.find((claimant) => claimant.captive !== true) ??
    designated

  return {
    designated,
    selected,
    fallbackCandidate,
    failoverUsed: Boolean(selected && designated && selected.id !== designated.id),
  }
}

function resolveTransfer(
  transfer: GovernanceTransfer,
  authority: GovernanceAuthorityState,
  week: number
) {
  const rules = getAuthorityRules(transfer)
  const transferPath = getTransferPath(transfer)
  const grantedPowerTier = getGrantedInheritedPowerTier(transfer, authority)
  const presentInstruments = transfer.presentInstruments ?? []
  const presentSetupFlags = transfer.presentSetupFlags ?? []
  const blockers: string[] = []

  for (const role of rules.requiredParticipantRoles) {
    const participant = getParticipant(transfer.participants, role)
    if (!participant?.present) {
      blockers.push(`Missing ${role} participant.`)
    }
  }

  if (rules.requiredLocation && transfer.actualLocation !== rules.requiredLocation) {
    blockers.push(`Requires ${rules.requiredLocation}.`)
  }

  for (const instrument of getMissingItems(rules.requiredInstruments, presentInstruments)) {
    blockers.push(`Missing ${instrument}.`)
  }

  for (const setupFlag of getMissingItems(rules.requiredSetupFlags, presentSetupFlags)) {
    blockers.push(`Missing setup: ${setupFlag}.`)
  }

  const holder = getParticipant(transfer.participants, 'holder')
  const holderCoerced = Boolean(transfer.coercive || holder?.captive)
  if (rules.voluntaryHolderRequired && holderCoerced && !rules.allowCoerciveCompletion) {
    blockers.push('Holder is captive or coerced.')
  }

  if (transferPath === 'violent_extraction') {
    const violentExtraction = transfer.violentExtraction
    if (!violentExtraction) {
      blockers.push('Violent extraction data is missing.')
    } else {
      if (!violentExtraction.sourceDefeated) {
        blockers.push('Source actor has not been defeated.')
      }

      if (!violentExtraction.extractorEligible) {
        blockers.push('Extractor is not eligible to bear the inheritance.')
      }

      if (!violentExtraction.vesselPrepared) {
        blockers.push('Transfer vessel is not prepared.')
      }

      if (
        violentExtraction.requiredMethod &&
        violentExtraction.extractionMethod !== violentExtraction.requiredMethod
      ) {
        blockers.push(`Requires ${violentExtraction.requiredMethod}.`)
      }
    }
  }

  const successorSelection = selectSuccessor(transfer.claimants)
  if (!successorSelection.selected) {
    if (successorSelection.designated?.accepts === false) {
      blockers.push('Designated successor declined the handoff.')
    } else {
      blockers.push('No eligible successor accepted the handoff.')
    }
  }

  const selectedSuccessor = successorSelection.selected
  const successorPresent = selectedSuccessor?.present !== false
  if (selectedSuccessor && rules.requiredParticipantRoles.includes('successor') && !successorPresent) {
    blockers.push('Successor is not present.')
  }

  const claimBasis = (selectedSuccessor ?? successorSelection.fallbackCandidate)?.basis ?? []
  const claimBasisScore = calculateClaimBasisScore(claimBasis, presentSetupFlags)
  const supportsPartialClaim =
    authority.holderStatus !== 'active' &&
    successorSelection.fallbackCandidate !== undefined &&
    successorSelection.fallbackCandidate.accepts !== false &&
    successorSelection.fallbackCandidate.captive !== true &&
    claimBasis.length > 0

  const cleanValidation = blockers.length === 0
  const coerciveCompletion = holderCoerced && rules.allowCoerciveCompletion
  const legitimacyBase =
    claimBasisScore +
    (cleanValidation ? 22 : 6) +
    (hasAllRequiredItems(rules.requiredInstruments, presentInstruments) ? 8 : 0) +
    (presentSetupFlags.includes('authentication-cleared') ? 10 : 0) -
    (successorSelection.failoverUsed ? 12 : 0) -
    (coerciveCompletion ? 35 : 0)
  const controlBase =
    30 +
    (selectedSuccessor?.present === false ? 0 : 18) +
    (hasAllRequiredItems(rules.requiredInstruments, presentInstruments) ? 18 : 0) +
    (getParticipant(transfer.participants, 'custodian')?.present ? 10 : 0) +
    (coerciveCompletion ? 18 : 0) +
    (cleanValidation ? 18 : 0)

  if (cleanValidation && selectedSuccessor) {
    const recognizedLegitimacy = clamp(Math.round(legitimacyBase), 0, 100)
    const practicalControl = clamp(Math.round(controlBase), 0, 100)
    const legitimacyThreshold = getLegitimacyStabilityThreshold(transfer.authorityClass)
    const contested =
      coerciveCompletion ||
      successorSelection.failoverUsed ||
      recognizedLegitimacy < legitimacyThreshold ||
      (transfer.authorityClass === 'sovereign_authority' &&
        claimBasis.some((item) =>
          ['adoption', 'prophecy', 'delayed_authentication'].includes(item)
        ))

    const outcome: GovernanceTransferOutcome = {
      type: successorSelection.failoverUsed
        ? 'failover_selected'
        : contested
          ? 'contested_completion'
          : 'authority_transferred',
      transferPath,
      grantedPowerTier,
      transferredAuthority: 100,
      recognizedLegitimacy,
      practicalControl,
      contested,
      unstable: contested || recognizedLegitimacy < legitimacyThreshold + 10,
      successorId: selectedSuccessor.id,
      successorName: selectedSuccessor.name,
      sourceActorName: transfer.violentExtraction?.sourceActorName,
      failoverUsed: successorSelection.failoverUsed,
      coercive: coerciveCompletion,
      blockers: [],
    }

    return {
      transfer: {
        ...transfer,
        state: contested ? 'contested' : 'completed',
        blockers: [],
        transferPath,
        inheritedPowerTier: grantedPowerTier,
        selectedSuccessorId: selectedSuccessor.id,
        selectedSuccessorName: selectedSuccessor.name,
        outcome,
        lastProcessedWeek: week,
      },
      outcome,
    }
  }

  if (supportsPartialClaim && successorSelection.fallbackCandidate) {
    const claimant = successorSelection.fallbackCandidate
    const recognizedLegitimacy = clamp(Math.round(claimBasisScore + 8), 0, 100)
    const practicalControl = clamp(
      Math.round(
        25 +
          (claimant.present === false ? 0 : 12) +
          (getParticipant(transfer.participants, 'custodian')?.present ? 8 : 0)
      ),
      0,
      100
    )
    const transferredAuthority =
      transfer.authorityClass === 'sovereign_authority'
        ? 40
        : transfer.authorityClass === 'charter_holdings'
          ? 60
          : 75
    const outcome: GovernanceTransferOutcome = {
      type: 'partial_claim',
      transferPath,
      grantedPowerTier,
      transferredAuthority,
      recognizedLegitimacy,
      practicalControl,
      contested: true,
      unstable: true,
      successorId: claimant.id,
      successorName: claimant.name,
      sourceActorName: transfer.violentExtraction?.sourceActorName,
      failoverUsed: successorSelection.failoverUsed,
      coercive: false,
      blockers,
    }

    return {
      transfer: {
        ...transfer,
        state: 'contested',
        blockers,
        transferPath,
        inheritedPowerTier: grantedPowerTier,
        selectedSuccessorId: claimant.id,
        selectedSuccessorName: claimant.name,
        outcome,
        lastProcessedWeek: week,
      },
      outcome,
    }
  }

  if (blockers.some((blocker) => blocker.includes('declined'))) {
    const outcome: GovernanceTransferOutcome = {
      type: 'declined',
      transferPath,
      grantedPowerTier,
      transferredAuthority: 0,
      recognizedLegitimacy: 0,
      practicalControl: 0,
      contested: false,
      unstable: false,
      sourceActorName: transfer.violentExtraction?.sourceActorName,
      blockers,
    }

    return {
      transfer: {
        ...transfer,
        state: 'failed',
        blockers,
        transferPath,
        inheritedPowerTier: grantedPowerTier,
        outcome,
        lastProcessedWeek: week,
      },
      outcome,
    }
  }

  const outcome: GovernanceTransferOutcome = {
    type: 'transfer_invalid',
    transferPath,
    grantedPowerTier,
    transferredAuthority: 0,
    recognizedLegitimacy: 0,
    practicalControl: 0,
    contested: false,
    unstable: false,
    sourceActorName: transfer.violentExtraction?.sourceActorName,
    blockers,
  }

  return {
    transfer: {
      ...transfer,
      state: selectedSuccessor ? 'blocked' : 'failed',
      blockers,
      transferPath,
      inheritedPowerTier: grantedPowerTier,
      selectedSuccessorId: selectedSuccessor?.id,
      selectedSuccessorName: selectedSuccessor?.name,
      outcome,
      lastProcessedWeek: week,
    },
    outcome,
  }
}

function applyTransferOutcomeToAuthority(
  authority: GovernanceAuthorityState,
  transfer: GovernanceTransfer,
  outcome: GovernanceTransferOutcome
) {
  const shouldPromoteSuccessor =
    Boolean(outcome.successorId) &&
    (authority.holderStatus !== 'active' ||
      outcome.transferredAuthority >= 100 ||
      outcome.practicalControl >= authority.practicalControl)

  return {
    ...authority,
    holderId: shouldPromoteSuccessor ? outcome.successorId : authority.holderId,
    holderName: shouldPromoteSuccessor ? (outcome.successorName ?? authority.holderName) : authority.holderName,
    holderStatus: shouldPromoteSuccessor ? 'active' : authority.holderStatus,
    inheritedPowerTier: outcome.grantedPowerTier,
    transferredAuthority: outcome.transferredAuthority,
    recognizedLegitimacy: outcome.recognizedLegitimacy,
    practicalControl: outcome.practicalControl,
    contested: outcome.contested,
    unstable: outcome.unstable,
    lastTransferId: transfer.id,
  }
}

function createTransferFromContract(
  contract: GovernanceSuccessionContract,
  authority: GovernanceAuthorityState,
  week: number
): GovernanceTransfer {
  return {
    id: `${contract.id}-week-${week}`,
    authorityId: contract.authorityId,
    authorityLabel: contract.authorityLabel,
    authorityClass: contract.authorityClass,
    transferPath: 'inheritance',
    state: 'pending',
    batchId: contract.batchId,
    batchLabel: contract.batchLabel,
    participants: contract.participants,
    claimants: contract.claimants,
    inheritedPowerTier: contract.inheritedPowerTier ?? authority.inheritedPowerTier,
    requiresLatentLineage: contract.requiresLatentLineage,
    minimumLatentLineageTier: contract.minimumLatentLineageTier,
    allowsInvestiture: contract.allowsInvestiture,
    requiredLocation: contract.requiredLocation,
    requiredParticipantRoles: contract.requiredParticipantRoles,
    actualLocation: contract.actualLocation,
    requiredInstruments: contract.requiredInstruments,
    presentInstruments: contract.presentInstruments,
    requiredSetupFlags: contract.requiredSetupFlags,
    presentSetupFlags: contract.presentSetupFlags,
    voluntaryHolderRequired: contract.voluntaryHolderRequired,
    allowCoerciveCompletion: contract.allowCoerciveCompletion,
    coercive: contract.coercive,
    sourceContractId: contract.id,
    selectedSuccessorId: authority.holderId,
    selectedSuccessorName: authority.holderName,
  }
}

function doesContractTrigger(
  contract: GovernanceSuccessionContract,
  authority: GovernanceAuthorityState | undefined,
  week: number
) {
  switch (contract.trigger.type) {
    case 'holder_status':
      return Boolean(
        authority && (contract.trigger.holderStatuses ?? []).includes(authority.holderStatus)
      )
    case 'week_reached':
      return week >= (contract.trigger.weekAtLeast ?? 1)
  }
}

function updateContractStatus(
  contract: GovernanceSuccessionContract,
  transfer: GovernanceTransfer
) {
  if (transfer.sourceContractId !== contract.id || !transfer.outcome) {
    return contract
  }

  const nextStatus =
    transfer.outcome.type === 'declined'
      ? 'declined'
      : transfer.state === 'completed' || transfer.state === 'contested'
        ? 'completed'
        : transfer.state === 'failed'
          ? 'failed'
          : 'triggered'

  return {
    ...contract,
    status: nextStatus,
    lastTransferId: transfer.id,
  }
}

export function processGovernanceTransfersForWeek(
  governance: GovernanceState | undefined,
  week: number
): GovernanceWeekProcessingResult {
  if (!governance) {
    return { governance, eventDrafts: [] }
  }

  const nextGovernance = cloneGovernanceState(governance)
  nextGovernance.history = nextGovernance.history ?? []
  nextGovernance.transfers = nextGovernance.transfers ?? []
  nextGovernance.contracts = nextGovernance.contracts ?? []
  nextGovernance.authorities = nextGovernance.authorities ?? []

  for (let index = 0; index < nextGovernance.contracts.length; index += 1) {
    const contract = nextGovernance.contracts[index]
    if (contract.status !== 'armed') {
      continue
    }

    const authority = nextGovernance.authorities.find(
      (candidate) => candidate.id === contract.authorityId
    )
    if (!doesContractTrigger(contract, authority, week)) {
      continue
    }

    const fallbackAuthority =
      authority ?? {
        id: contract.authorityId,
        label: contract.authorityLabel,
        class: contract.authorityClass,
        holderName: 'Unassigned',
        holderStatus: 'missing' as const,
        inheritedPowerTier: contract.inheritedPowerTier,
        transferredAuthority: 0,
        recognizedLegitimacy: 0,
        practicalControl: 0,
        contested: false,
        unstable: false,
      }
    if (!authority) {
      nextGovernance.authorities.push(fallbackAuthority)
    }
    const createdTransfer = createTransferFromContract(contract, fallbackAuthority, week)
    nextGovernance.transfers.push(createdTransfer)
    nextGovernance.contracts[index] = {
      ...contract,
      status: 'triggered',
      lastTransferId: createdTransfer.id,
    }
  }

  const eventDrafts: AnyOperationEventDraft[] = []

  for (let index = 0; index < nextGovernance.transfers.length; index += 1) {
    const transfer = nextGovernance.transfers[index]
    if (transfer.state === 'completed' || transfer.state === 'contested' || transfer.state === 'failed') {
      continue
    }

    const authorityIndex = nextGovernance.authorities.findIndex(
      (candidate) => candidate.id === transfer.authorityId
    )
    if (authorityIndex === -1) {
      continue
    }

    const authority = nextGovernance.authorities[authorityIndex]
    const resolved = resolveTransfer(transfer, authority, week)
    nextGovernance.transfers[index] = resolved.transfer

    if (
      resolved.transfer.state === 'completed' ||
      resolved.transfer.state === 'contested' ||
      resolved.transfer.state === 'failed'
    ) {
      if (resolved.transfer.state !== 'failed') {
        nextGovernance.authorities[authorityIndex] = applyTransferOutcomeToAuthority(
          authority,
          resolved.transfer,
          resolved.outcome
        )
      }
      const historyEntry: GovernanceTransferHistoryEntry = {
        transferId: resolved.transfer.id,
        authorityId: resolved.transfer.authorityId,
        authorityLabel: resolved.transfer.authorityLabel,
        authorityClass: resolved.transfer.authorityClass,
        transferPath: resolved.outcome.transferPath,
        batchId: resolved.transfer.batchId,
        batchLabel: resolved.transfer.batchLabel,
        week,
        state: resolved.transfer.state,
        outcome: resolved.outcome.type,
        grantedPowerTier: resolved.outcome.grantedPowerTier,
        summary: buildHistorySummary(
          resolved.transfer.authorityLabel,
          resolved.transfer.state,
          resolved.outcome
        ),
        successorName: resolved.outcome.successorName,
        sourceActorName: resolved.outcome.sourceActorName,
        blockers: resolved.outcome.blockers,
        transferredAuthority: resolved.outcome.transferredAuthority,
        recognizedLegitimacy: resolved.outcome.recognizedLegitimacy,
        practicalControl: resolved.outcome.practicalControl,
        coercive: resolved.outcome.coercive ?? false,
        failoverUsed: resolved.outcome.failoverUsed ?? false,
        inheritedPowerType: resolved.outcome.inheritedPower?.type,
        inheritedPowerPreviousTier: resolved.outcome.inheritedPower?.previousTier,
        inheritedPowerNextTier: resolved.outcome.inheritedPower?.nextTier,
        inheritedPowerReason: resolved.outcome.inheritedPower?.reason,
      }
      nextGovernance.history.push(historyEntry)
      eventDrafts.push(buildGovernanceTransferDraft(week, resolved.transfer, resolved.outcome))
    }
  }

  nextGovernance.contracts = nextGovernance.contracts.map((contract) => {
    const linkedTransfer = nextGovernance.transfers.find(
      (transfer) => transfer.sourceContractId === contract.id
    )
    return linkedTransfer ? updateContractStatus(contract, linkedTransfer) : contract
  })

  return {
    governance: nextGovernance,
    eventDrafts,
  }
}

function toTransferStatusView(
  transfer: GovernanceTransfer | GovernanceTransferHistoryEntry
): GovernanceTransferStatusView {
  const state = transfer.state
  const blockerLabel =
    transfer.blockers.length > 0 ? transfer.blockers.join(' ') : undefined
  const successorName =
    'successorName' in transfer
      ? transfer.successorName
      : transfer.selectedSuccessorName ?? transfer.outcome?.successorName
  const transferredAuthority =
    'transferredAuthority' in transfer
      ? transfer.transferredAuthority
      : transfer.outcome?.transferredAuthority ?? 0
  const recognizedLegitimacy =
    'recognizedLegitimacy' in transfer
      ? transfer.recognizedLegitimacy
      : transfer.outcome?.recognizedLegitimacy ?? 0
  const practicalControl =
    'practicalControl' in transfer
      ? transfer.practicalControl
      : transfer.outcome?.practicalControl ?? 0
  const outcomeType = typeof transfer.outcome === 'string' ? transfer.outcome : transfer.outcome?.type
  const inheritedPower =
    typeof transfer.outcome === 'string'
      ? transfer.inheritedPowerType
        ? {
            type: transfer.inheritedPowerType,
            previousTier: transfer.inheritedPowerPreviousTier ?? 'none',
            nextTier: transfer.inheritedPowerNextTier ?? 'none',
            reason: transfer.inheritedPowerReason ?? '',
          }
        : undefined
      : transfer.outcome?.inheritedPower
  const outcomeLabel = outcomeType
    ? inheritedPower
      ? `${formatGovernanceTransferOutcomeType(outcomeType)} / ${formatGovernanceInheritedPowerOutcome(
          inheritedPower
        )}`
      : formatGovernanceTransferOutcomeType(outcomeType)
    : undefined

  return {
    id: 'transferId' in transfer ? transfer.transferId : transfer.id,
    authorityLabel: transfer.authorityLabel,
    state,
    stateLabel: describeTransferState(state),
    successorLabel: successorName ? `Successor: ${successorName}` : 'Successor unresolved',
    metricsLabel: formatGovernanceTransferMetrics(
      transferredAuthority,
      recognizedLegitimacy,
      practicalControl
    ),
    blockerLabel,
    batchLabel: transfer.batchLabel,
    outcomeLabel,
  }
}

function buildLatestBatch(
  history: GovernanceTransferHistoryEntry[]
): GovernanceBatchSummaryView | undefined {
  const byBatchId = new Map<string, GovernanceTransferHistoryEntry[]>()

  for (const entry of history) {
    const batchId = entry.batchId ?? entry.transferId
    const existing = byBatchId.get(batchId) ?? []
    existing.push(entry)
    byBatchId.set(batchId, existing)
  }

  const batches = [...byBatchId.entries()]
    .map(([batchId, entries]) => ({
      batchId,
      label: entries[0]?.batchLabel ?? batchId,
      lastWeek: Math.max(...entries.map((entry) => entry.week)),
      completed: entries.filter((entry) => entry.state === 'completed').length,
      contested: entries.filter((entry) => entry.state === 'contested').length,
      blocked: entries.filter((entry) => entry.state === 'blocked').length,
      failed: entries.filter((entry) => entry.state === 'failed').length,
    }))
    .sort((left, right) => right.lastWeek - left.lastWeek || left.label.localeCompare(right.label))

  return batches[0]
}

export function buildGovernanceTransferSummary(
  governance: GovernanceState | undefined
): GovernanceTransferSummary {
  const authorities = governance?.authorities ?? []
  const transfers = governance?.transfers ?? []
  const contracts = governance?.contracts ?? []
  const history = governance?.history ?? []
  const activeTransfers = transfers.filter((transfer) =>
    ['pending', 'blocked', 'ready'].includes(transfer.state)
  )

  return {
    authorityCount: authorities.length,
    activeTransferCount: activeTransfers.length,
    blockedTransferCount: activeTransfers.filter((transfer) => transfer.state === 'blocked').length,
    contestedAuthorityCount: authorities.filter((authority) => authority.contested).length,
    armedContractCount: contracts.filter((contract) => contract.status === 'armed').length,
    latestBatch: buildLatestBatch(history),
    activeTransfers: activeTransfers.map((transfer) => toTransferStatusView(transfer)),
    recentTransfers: [...history].slice(-4).reverse().map((entry) => toTransferStatusView(entry)),
    contracts: contracts
      .filter((contract) => contract.status === 'armed' || contract.status === 'triggered')
      .map((contract) => ({
        id: contract.id,
        authorityLabel: contract.authorityLabel,
        status: contract.status,
        successorLabel:
          contract.claimants[0]?.name !== undefined
            ? `Designated successor: ${contract.claimants[0].name}`
            : 'Designated successor unresolved',
        triggerLabel: describeTrigger(contract.trigger),
      })),
  }
}

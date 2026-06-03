/**
 * SPE-781 slice 2: compose SPE-59 scouting resolution with tiered reveal payloads.
 *
 * Does not alter scouting outcome bands, modifier aggregation, or legacy revealed/withheld flags.
 */

import {
  resolveDetectionScan,
  type ConcealmentLayer,
  type DetectionScanInput,
  type DetectionScanResult,
  type HostilityLevel,
  type RevealTier,
  type SubjectTruthState,
} from './revealPayload'
import {
  applyIllusionScanProjection,
  formatIllusionDisproofSuffix,
  illusionReadoutPrefixForState,
  isIllusionLifecycleInert,
  resolveIllusionKindFromCase,
} from './hiddenStateIllusionLifecycle'
import {
  applyAntiScanCompartmentScanProjection,
  applyFalsePositionScanProjection,
  applyFalseDetectionScanProjection,
  applyGlamourOverlayScanProjection,
  applyOutOfPhaseScanProjection,
  applySignatureMaskScanProjection,
  buildSubjectTruthFromCaseHiddenState,
  resolveHiddenStateModality,
  scoutingOutcomeToDetectionScanForCase,
} from './hiddenStateModality'
import type { Agent, CaseInstance } from './models'
import {
  computeEffectiveScoutingConcealment,
  resolveScouting,
  type ScoutingInput,
  type ScoutingResult,
} from './scoutingResolution'

export interface ScoutingRevealSubject {
  readonly present?: boolean
  readonly exactIdentity: string
  readonly category: string
  readonly hostility?: HostilityLevel
  readonly activeProtections?: readonly string[]
  readonly activeEffects?: readonly string[]
  readonly dormantEffects?: readonly string[]
}

export interface ScoutingRevealIntegrationInput extends ScoutingInput {
  readonly subject: ScoutingRevealSubject
}

export interface CaseScoutingRevealIntegrationInput extends ScoutingRevealIntegrationInput {
  readonly caseData: CaseInstance
}

export interface ScoutingRevealIntegrationResult extends ScoutingResult {
  readonly detectionScan: DetectionScanResult
}

export interface HiddenStateScoutingRevealIntegrationResult extends ScoutingRevealIntegrationResult {
  readonly active: true
  /** SPE-2285: prefix captured at compose time (survives post-resolution illusion collapse). */
  readonly illusionReadoutPrefix?: string | null
  readonly illusionDisproofSuffix?: string
}

export interface CaseScoutingRevealBuildResult {
  readonly teamCapability: number
  readonly anomalyConcealment: number
  readonly teamTags: readonly string[]
  readonly anomalyTags: readonly string[]
  readonly subject: ScoutingRevealSubject
}

const GLAMOUR_LAYER: ConcealmentLayer = {
  id: 'layer:glamour',
  blockedTiers: ['category', 'exact_identity', 'hostility'],
}

const SIGNATURE_MASK_LAYER: ConcealmentLayer = {
  id: 'layer:signature-mask',
  blockedTiers: ['exact_identity'],
}

function clampConcealmentRating(rating: number) {
  if (!Number.isFinite(rating)) {
    return 0
  }

  return Math.max(0, Math.min(3, Math.floor(rating)))
}

export function concealmentLayersFromRating(anomalyConcealment: number): readonly ConcealmentLayer[] {
  const rating = clampConcealmentRating(anomalyConcealment)
  const layers: ConcealmentLayer[] = []

  if (rating >= 2) {
    layers.push(GLAMOUR_LAYER)
  }

  if (rating >= 1) {
    layers.push(SIGNATURE_MASK_LAYER)
  }

  return layers
}

function clampScoutingRating(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(3, Math.floor(value)))
}

function averageAgentInvestigation(agents: readonly Agent[]): number {
  if (agents.length === 0) {
    return 0
  }

  return agents.reduce((sum, agent) => sum + agent.baseStats.investigation, 0) / agents.length
}

/** Deterministic team scouting capability (0–3) from assigned agents. */
export function teamScoutingCapabilityFromAgents(agents: readonly Agent[]): number {
  return clampScoutingRating(averageAgentInvestigation(agents) / 20)
}

/** Deterministic anomaly concealment rating (0–3) from case investigation pressure. */
export function anomalyConcealmentFromCase(caseData: CaseInstance): number {
  const investigation =
    caseData.difficulty?.investigation ?? Math.round((caseData.weights?.investigation ?? 0) * 100)

  return clampScoutingRating(investigation / 15)
}

function resolveScoutingSubjectCategory(caseData: CaseInstance): string {
  if (caseData.hiddenState === 'displaced') {
    return 'displaced contact'
  }

  if (caseData.tags?.includes('concealment')) {
    return 'concealed presence'
  }

  return 'hidden contact'
}

function resolveScoutingSubjectHostility(caseData: CaseInstance): HostilityLevel {
  if (caseData.counterDetection === true || caseData.infiltrationStage === 'violent') {
    return 'active'
  }

  return 'latent'
}

/** Deterministic subject snapshot for weekly hidden-state scouting scans. */
export function buildScoutingRevealSubjectFromCase(caseData: CaseInstance): ScoutingRevealSubject {
  const present = caseData.hiddenState === 'hidden' || caseData.hiddenState === 'displaced'

  return {
    present,
    exactIdentity: `entity:${caseData.id}`,
    category: resolveScoutingSubjectCategory(caseData),
    hostility: resolveScoutingSubjectHostility(caseData),
    activeProtections: [],
    activeEffects: caseData.tags?.includes('concealment') ? ['concealment field'] : [],
    dormantEffects: caseData.hiddenState === 'hidden' ? ['undisclosed briefing detail'] : [],
  }
}

/** Deterministic scouting input + subject for weekly hidden-state modality compose. */
export function buildScoutingRevealInputFromCase(
  caseData: CaseInstance,
  agents: readonly Agent[],
  teamTags: readonly string[] = []
): CaseScoutingRevealBuildResult {
  const agentTags = agents.flatMap((agent) => agent.tags ?? [])

  return {
    teamCapability: teamScoutingCapabilityFromAgents(agents),
    anomalyConcealment: anomalyConcealmentFromCase(caseData),
    teamTags: [...new Set([...teamTags, ...agentTags])],
    anomalyTags: [...(caseData.tags ?? [])],
    subject: buildScoutingRevealSubjectFromCase(caseData),
  }
}

export function shouldRunHiddenStateScoutingCompose(
  caseData: CaseInstance,
  disguiseValidationActive: boolean
): boolean {
  const modality = resolveHiddenStateModality(caseData)

  if (modality === 'none') {
    return false
  }

  if (modality === 'disguised_identity' && disguiseValidationActive) {
    return false
  }

  return true
}

/** SPE-2282: weekly hidden-state scouting + tiered scan when disguise path is inactive. */
export function evaluateHiddenStateScoutingWithRevealPayload(input: {
  readonly caseData: CaseInstance
  readonly agents: readonly Agent[]
  readonly teamTags?: readonly string[]
  readonly disguiseValidationActive: boolean
}): HiddenStateScoutingRevealIntegrationResult | undefined {
  if (
    input.agents.length === 0 ||
    !shouldRunHiddenStateScoutingCompose(input.caseData, input.disguiseValidationActive)
  ) {
    return undefined
  }

  const built = buildScoutingRevealInputFromCase(
    input.caseData,
    input.agents,
    input.teamTags ?? []
  )

  const integrated = resolveScoutingWithCaseHiddenState({
    teamCapability: built.teamCapability,
    anomalyConcealment: built.anomalyConcealment,
    teamTags: [...built.teamTags],
    anomalyTags: [...built.anomalyTags],
    subject: built.subject,
    caseData: input.caseData,
  })

  return {
    active: true,
    ...integrated,
    illusionReadoutPrefix: illusionReadoutPrefixForState(input.caseData.hiddenStateIllusionState),
    illusionDisproofSuffix: formatIllusionDisproofSuffix(input.caseData.hiddenStateIllusionState),
  }
}

export function buildSubjectTruthFromScouting(
  input: ScoutingInput,
  subject: ScoutingRevealSubject
): SubjectTruthState {
  const present = subject.present ?? true
  const { concealment } = computeEffectiveScoutingConcealment(input)

  return {
    present,
    exactIdentity: subject.exactIdentity,
    category: subject.category,
    hostility: subject.hostility ?? 'latent',
    activeProtections: subject.activeProtections ?? [],
    concealmentLayers: concealmentLayersFromRating(concealment),
    activeEffects: subject.activeEffects ?? [],
    dormantEffects: subject.dormantEffects ?? [],
  }
}

export function scoutingOutcomeToDetectionScan(
  scouting: Pick<ScoutingResult, 'outcome' | 'revealed' | 'withheld'>
): DetectionScanInput {
  if (scouting.withheld) {
    return { family: 'presence_sweep' }
  }

  if (!scouting.revealed) {
    return { family: 'presence_sweep' }
  }

  switch (scouting.outcome) {
    case 'strong':
      return { family: 'identity_probe', layersToStrip: 1 }
    case 'success':
      return { family: 'category_pass' }
    case 'partial':
      return { family: 'presence_sweep' }
    case 'fail':
    case 'catastrophic':
      return { family: 'presence_sweep' }
    default: {
      const _exhaustive: never = scouting.outcome
      return _exhaustive
    }
  }
}

export function resolveScoutingWithRevealPayload(
  input: ScoutingRevealIntegrationInput
): ScoutingRevealIntegrationResult {
  const scouting = resolveScouting(input)
  const truth = buildSubjectTruthFromScouting(input, input.subject)
  const scanInput = scoutingOutcomeToDetectionScan(scouting)
  const detectionScan = resolveDetectionScan(truth, scanInput)

  return {
    ...scouting,
    detectionScan,
  }
}

/** SPE-2281: scouting + tiered scan with case hidden-state modalities (SPE-70). */
export function resolveScoutingWithCaseHiddenState(
  input: CaseScoutingRevealIntegrationInput
): ScoutingRevealIntegrationResult {
  const scouting = resolveScouting(input)
  const truth = buildSubjectTruthFromCaseHiddenState(input.caseData, input, input.subject)
  const scanInput = scoutingOutcomeToDetectionScanForCase(scouting, input.caseData)
  let detectionScan = resolveDetectionScan(truth, scanInput)

  const modality = resolveHiddenStateModality(input.caseData)

  if (modality === 'false_position') {
    detectionScan = applyFalsePositionScanProjection(detectionScan, input.caseData)
  }

  if (modality === 'signature_masking') {
    detectionScan = applySignatureMaskScanProjection(detectionScan)
  }

  if (modality === 'false_detection_output') {
    detectionScan = applyFalseDetectionScanProjection(detectionScan)
  }

  if (modality === 'glamour_overlay') {
    detectionScan = applyGlamourOverlayScanProjection(detectionScan)
  }

  if (modality === 'out_of_phase_presence') {
    detectionScan = applyOutOfPhaseScanProjection(
      detectionScan,
      input.caseData,
      input.teamTags ?? []
    )
  }

  if (modality === 'anti_scan_compartment') {
    detectionScan = applyAntiScanCompartmentScanProjection(
      detectionScan,
      input.caseData,
      input.teamTags ?? []
    )
  }

  if (
    resolveIllusionKindFromCase(input.caseData) !== null &&
    !isIllusionLifecycleInert(input.caseData)
  ) {
    detectionScan = applyIllusionScanProjection(detectionScan, input.caseData)
  }

  return {
    ...scouting,
    detectionScan,
  }
}

/** Test helper: tiers exposed on the detection scan (stable ordering). */
export function detectionScanTierOrder(result: DetectionScanResult): readonly RevealTier[] {
  return result.fields.map((field) => field.tier)
}

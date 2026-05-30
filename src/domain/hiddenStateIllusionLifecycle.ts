/**
 * SPE-2285 slice 5: bounded false-entity / structural-illusion lifecycle (active → disproved → collapsed).
 */

import type { ConcealmentLayer, DetectionScanResult } from './revealPayload'
import type { CaseInstance } from './models'
import {
  applyFalsePositionScanProjection,
  formatDecoyLocusLabel,
} from './hiddenStateModality'

export type HiddenStateIllusionKind = 'false_entity' | 'structural_illusion'
export type HiddenStateIllusionPhase = 'active' | 'disproved' | 'collapsed'

export interface HiddenStateIllusionState {
  readonly kind: HiddenStateIllusionKind
  readonly phase: HiddenStateIllusionPhase
  readonly anchorLabel?: string
  readonly disproofReason?: string
}

export const FALSE_ENTITY_LAYER: ConcealmentLayer = {
  id: 'layer:false-entity',
  blockedTiers: ['category', 'exact_identity'],
}

export const STRUCTURAL_ILLUSION_LAYER: ConcealmentLayer = {
  id: 'layer:structural-illusion',
  blockedTiers: ['exact_identity'],
}

export const FABRICATED_CONTACT_READOUT_PREFIX = 'Fabricated contact readout:'
export const STRUCTURAL_ILLUSION_READOUT_PREFIX = 'Structural illusion readout:'

const FALSE_ENTITY_TAG = 'false-entity'
const STRUCTURAL_ILLUSION_TAG = 'structural-illusion'
const INTERACTION_DISPROOF_TAG = 'interaction-disproof'

function caseTagSet(caseData: CaseInstance): Set<string> {
  return new Set([
    ...(caseData.tags ?? []),
    ...(caseData.requiredTags ?? []),
    ...(caseData.preferredTags ?? []),
  ])
}

/** Authored illusion kind; false-entity wins when both tags are present. */
export function resolveIllusionKindFromCase(caseData: CaseInstance): HiddenStateIllusionKind | null {
  const tags = caseTagSet(caseData)

  if (caseData.hiddenState === 'hidden' && tags.has(FALSE_ENTITY_TAG)) {
    return 'false_entity'
  }

  if (
    tags.has(STRUCTURAL_ILLUSION_TAG) &&
    (caseData.hiddenState === 'hidden' || caseData.hiddenState === 'displaced')
  ) {
    return 'structural_illusion'
  }

  return null
}

export function resolveIllusionAnchorLabel(
  caseData: CaseInstance,
  kind: HiddenStateIllusionKind
): string {
  if (kind === 'structural_illusion') {
    return formatDecoyLocusLabel(caseData.displacementTarget) ?? 'false terrain anchor'
  }

  return `fabricated contact at ${caseData.id}`
}

export function illusionConcealmentLayer(
  kind: HiddenStateIllusionKind
): ConcealmentLayer {
  return kind === 'false_entity' ? FALSE_ENTITY_LAYER : STRUCTURAL_ILLUSION_LAYER
}

export function isIllusionLifecycleInert(caseData: CaseInstance): boolean {
  const kind = resolveIllusionKindFromCase(caseData)
  if (kind === null) {
    return true
  }

  const phase = caseData.hiddenStateIllusionState?.phase
  return phase === 'collapsed'
}

export function illusionReadoutPrefixForState(
  state: HiddenStateIllusionState | undefined
): string | null {
  if (state === undefined || state.phase === 'collapsed') {
    return null
  }

  return state.kind === 'false_entity'
    ? FABRICATED_CONTACT_READOUT_PREFIX
    : STRUCTURAL_ILLUSION_READOUT_PREFIX
}

export function extraLayersToStripFromIllusion(caseData: CaseInstance): number {
  const state = caseData.hiddenStateIllusionState
  if (state === undefined) {
    return 0
  }

  if (state.phase === 'disproved') {
    return 1
  }

  if (state.phase === 'active' && caseData.counterDetection) {
    return 1
  }

  return 0
}

export function shouldWithholdCanonicalSubjectForIllusion(caseData: CaseInstance): boolean {
  const state = caseData.hiddenStateIllusionState
  return state?.phase === 'active' && state.kind === 'false_entity'
}

export function applyFalseEntityScanProjection(
  scan: DetectionScanResult,
  anchorLabel: string
): DetectionScanResult {
  const label = anchorLabel.trim().length > 0 ? anchorLabel : 'fabricated contact'

  const fields =
    scan.fields.length > 0
      ? scan.fields.map((field) => {
          if (field.tier === 'presence') {
            return {
              ...field,
              playerFacingValue: label,
              ambiguous: true,
            }
          }

          if (field.tier === 'category') {
            return {
              ...field,
              playerFacingValue: `fabricated ${label}`,
              ambiguous: true,
            }
          }

          return field
        })
      : [
          {
            tier: 'presence' as const,
            internalValue: false,
            playerFacingValue: label,
            ambiguous: true,
          },
        ]

  return {
    ...scan,
    fields,
  }
}

export function applyIllusionScanProjection(
  scan: DetectionScanResult,
  caseData: CaseInstance
): DetectionScanResult {
  const state = caseData.hiddenStateIllusionState
  if (state === undefined || state.phase === 'collapsed') {
    return scan
  }

  if (state.kind === 'false_entity') {
    return applyFalseEntityScanProjection(scan, state.anchorLabel ?? resolveIllusionAnchorLabel(caseData, state.kind))
  }

  if (caseData.displacementTarget !== null && caseData.displacementTarget !== undefined) {
    return applyFalsePositionScanProjection(scan, caseData)
  }

  const anchor = state.anchorLabel ?? resolveIllusionAnchorLabel(caseData, state.kind)
  return applyFalseEntityScanProjection(scan, anchor)
}

export interface IllusionLifecycleContext {
  readonly counterDetection: boolean
  readonly route?: string | null
  readonly tags: readonly string[]
  readonly reconPassCount: number
  readonly missionResult?: 'success' | 'partial' | 'fail'
}

export function buildIllusionLifecycleContext(caseData: CaseInstance): IllusionLifecycleContext {
  return {
    counterDetection: caseData.counterDetection === true,
    route: caseData.route,
    tags: caseData.tags ?? [],
    reconPassCount: caseData.hiddenStateScoutingReconCache?.scoutingPassCount ?? 0,
  }
}

function hasTraversalDisproof(
  context: IllusionLifecycleContext,
  kind: HiddenStateIllusionKind
): boolean {
  const route = (context.route ?? '').trim()
  if (route.length === 0) {
    return false
  }

  if (context.tags.includes(INTERACTION_DISPROOF_TAG)) {
    return true
  }

  return kind === 'structural_illusion' && context.tags.includes(STRUCTURAL_ILLUSION_TAG)
}

function hasSustainedReconDisproof(
  context: IllusionLifecycleContext,
  kind: HiddenStateIllusionKind
): boolean {
  return kind === 'false_entity' && context.reconPassCount >= 2
}

function anyDisproofTrigger(
  context: IllusionLifecycleContext,
  kind: HiddenStateIllusionKind
): boolean {
  return (
    context.counterDetection ||
    hasTraversalDisproof(context, kind) ||
    hasSustainedReconDisproof(context, kind)
  )
}

function resolveDisproofReason(
  context: IllusionLifecycleContext,
  kind: HiddenStateIllusionKind
): string {
  if (context.counterDetection) {
    return 'Targeted counter-detection invalidated the illusion overlay.'
  }

  if (hasTraversalDisproof(context, kind)) {
    return 'Route traversal exposed the false terrain anchor.'
  }

  if (hasSustainedReconDisproof(context, kind)) {
    return 'Sustained recon scrutiny disproved the fabricated contact.'
  }

  return 'Illusion overlay disproved.'
}

function clearIllusionState(caseData: CaseInstance): CaseInstance {
  if (caseData.hiddenStateIllusionState === undefined) {
    return caseData
  }

  const { hiddenStateIllusionState: _illusionState, ...rest } = caseData
  void _illusionState
  return rest
}

/** Initialize or advance illusion phase before/after weekly resolution. */
export function applyHiddenStateIllusionLifecyclePass(
  caseData: CaseInstance,
  context: IllusionLifecycleContext
): CaseInstance {
  const kind = resolveIllusionKindFromCase(caseData)
  if (kind === null) {
    return clearIllusionState(caseData)
  }

  let state = caseData.hiddenStateIllusionState
  const anchorLabel = resolveIllusionAnchorLabel(caseData, kind)

  if (state === undefined || state.kind !== kind || state.phase === 'collapsed') {
    state = { kind, phase: 'active', anchorLabel }
  } else {
    state = { ...state, anchorLabel }
  }

  const trigger = anyDisproofTrigger(context, kind)
  const missionCollapse =
    state.phase === 'disproved' &&
    (context.missionResult === 'success' || context.missionResult === 'partial')

  if (state.phase === 'active' && trigger) {
    return {
      ...caseData,
      hiddenStateIllusionState: {
        kind,
        phase: 'disproved',
        anchorLabel,
        disproofReason: resolveDisproofReason(context, kind),
      },
    }
  }

  if (state.phase === 'disproved' && (trigger || missionCollapse)) {
    return clearIllusionState(caseData)
  }

  return {
    ...caseData,
    hiddenStateIllusionState: state,
  }
}

export function formatIllusionDisproofSuffix(state: HiddenStateIllusionState | undefined): string {
  if (state?.phase !== 'disproved' || state.disproofReason === undefined) {
    return ''
  }

  return ` ${state.disproofReason}`
}

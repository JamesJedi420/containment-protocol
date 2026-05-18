/**
 * SPE-2247 slice 4: investigation-facing custody-loss markers from stealth leave-behinds.
 *
 * Maps registry `custodyLossRefs` onto persistent per-case flags and readable markers.
 * Distinct from SPE-809 `CustodyChain` / `CustodyMarker` pipeline data (not yet wired in sim).
 */

import { readPersistentFlag, selectPersistentFlags, setPersistentFlag } from './flagSystem'
import type { GameFlagValue, GameState } from './models'
import type { StealthLeaveBehindKind } from './stealthLeaveBehindRegistry'

export interface InvestigationCustodyLossMarker {
  readonly ref: string
  readonly leaveBehindId: string
  readonly kind: StealthLeaveBehindKind
  readonly label: string
  readonly appliedWeek: number
}

export interface ApplyStealthLeaveBehindInvestigationCustodyLossInput {
  readonly state: GameState
  readonly caseId: string
  readonly leaveBehindId: string
  readonly leaveBehindKind: StealthLeaveBehindKind
  readonly leaveBehindLabel: string
  readonly custodyLossRefs: readonly string[]
  readonly week: number
}

export interface ApplyStealthLeaveBehindInvestigationCustodyLossResult {
  readonly state: GameState
  readonly appliedRefs: readonly string[]
  readonly resolutionNote?: string
}

function sanitizeCaseId(caseId: string) {
  return caseId.trim()
}

function sanitizeCustodyRef(ref: string) {
  return ref.trim()
}

/** Stable flag suffix for a custody-loss ref (must match registry validation). */
export function normalizeInvestigationCustodyLossRefForFlag(ref: string) {
  return sanitizeCustodyRef(ref).replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '')
}

export function buildInvestigationCustodyLossFlagId(caseId: string, custodyLossRef: string) {
  const normalizedCaseId = sanitizeCaseId(caseId)
  const normalizedRef = normalizeInvestigationCustodyLossRefForFlag(custodyLossRef)

  return `investigation.case.${normalizedCaseId}.custody-loss.${normalizedRef}`
}

const CUSTODY_LOSS_MARKER_PREFIX = 'investigation-custody-loss:v1:'

function buildMarkerPayload(input: {
  ref: string
  leaveBehindId: string
  kind: StealthLeaveBehindKind
  label: string
  appliedWeek: number
}): InvestigationCustodyLossMarker {
  return Object.freeze({
    ref: input.ref,
    leaveBehindId: input.leaveBehindId,
    kind: input.kind,
    label: input.label,
    appliedWeek: input.appliedWeek,
  })
}

function serializeInvestigationCustodyLossMarker(marker: InvestigationCustodyLossMarker): string {
  return `${CUSTODY_LOSS_MARKER_PREFIX}${JSON.stringify({
    ref: marker.ref,
    leaveBehindId: marker.leaveBehindId,
    kind: marker.kind,
    label: marker.label,
    appliedWeek: marker.appliedWeek,
  })}`
}

function parseInvestigationCustodyLossMarker(value: GameFlagValue | undefined) {
  if (typeof value !== 'string' || !value.startsWith(CUSTODY_LOSS_MARKER_PREFIX)) {
    return undefined
  }

  try {
    const parsed = JSON.parse(value.slice(CUSTODY_LOSS_MARKER_PREFIX.length)) as Partial<
      InvestigationCustodyLossMarker
    >
    if (
      typeof parsed.ref !== 'string' ||
      typeof parsed.leaveBehindId !== 'string' ||
      typeof parsed.kind !== 'string' ||
      typeof parsed.label !== 'string' ||
      typeof parsed.appliedWeek !== 'number'
    ) {
      return undefined
    }

    return buildMarkerPayload({
      ref: parsed.ref,
      leaveBehindId: parsed.leaveBehindId,
      kind: parsed.kind as StealthLeaveBehindKind,
      label: parsed.label,
      appliedWeek: parsed.appliedWeek,
    })
  } catch {
    return undefined
  }
}

export function readInvestigationCustodyLossMarker(
  state: GameState,
  caseId: string,
  custodyLossRef: string
): InvestigationCustodyLossMarker | undefined {
  const flagId = buildInvestigationCustodyLossFlagId(caseId, custodyLossRef)
  return parseInvestigationCustodyLossMarker(readPersistentFlag(state, flagId))
}

export function listInvestigationCustodyLossMarkers(
  state: GameState,
  caseId: string
): readonly InvestigationCustodyLossMarker[] {
  const normalizedCaseId = sanitizeCaseId(caseId)
  const prefix = `investigation.case.${normalizedCaseId}.custody-loss.`
  const flags = selectPersistentFlags(state, prefix)

  return Object.values(flags)
    .map((value) => parseInvestigationCustodyLossMarker(value))
    .filter((marker): marker is InvestigationCustodyLossMarker => marker !== undefined)
    .sort((left, right) => left.ref.localeCompare(right.ref))
}

export function countInvestigationCustodyLossRefs(state: GameState, caseId: string) {
  return listInvestigationCustodyLossMarkers(state, caseId).length
}

export function applyStealthLeaveBehindInvestigationCustodyLoss(
  input: ApplyStealthLeaveBehindInvestigationCustodyLossInput
): ApplyStealthLeaveBehindInvestigationCustodyLossResult {
  const normalizedCaseId = sanitizeCaseId(input.caseId)

  if (normalizedCaseId.length === 0 || input.custodyLossRefs.length === 0) {
    return {
      state: input.state,
      appliedRefs: [],
    }
  }

  let nextState = input.state
  const appliedRefs: string[] = []
  const appliedFlagSuffixes = new Set<string>()

  for (const ref of input.custodyLossRefs) {
    const normalizedRef = sanitizeCustodyRef(ref)
    if (!normalizedRef) {
      continue
    }

    const flagSuffix = normalizeInvestigationCustodyLossRefForFlag(normalizedRef)
    if (!flagSuffix || appliedFlagSuffixes.has(flagSuffix)) {
      continue
    }

    if (readInvestigationCustodyLossMarker(nextState, normalizedCaseId, normalizedRef)) {
      appliedFlagSuffixes.add(flagSuffix)
      continue
    }

    const marker = buildMarkerPayload({
      ref: normalizedRef,
      leaveBehindId: input.leaveBehindId,
      kind: input.leaveBehindKind,
      label: input.leaveBehindLabel,
      appliedWeek: input.week,
    })
    nextState = setPersistentFlag(
      nextState,
      buildInvestigationCustodyLossFlagId(normalizedCaseId, normalizedRef),
      serializeInvestigationCustodyLossMarker(marker)
    )
    appliedFlagSuffixes.add(flagSuffix)
    appliedRefs.push(normalizedRef)
  }

  if (appliedRefs.length === 0) {
    return {
      state: nextState,
      appliedRefs: [],
    }
  }

  const refSummary = appliedRefs.join(', ')
  return {
    state: nextState,
    appliedRefs,
    resolutionNote: `Investigation custody strain (${input.leaveBehindLabel}): lost ${refSummary}.`,
  }
}

import type { ConditionKey } from './tags'

export const DISTORTION_STATES = ['misleading', 'fragmented', 'unreliable'] as const

export type DistortionState = (typeof DISTORTION_STATES)[number]

export interface DistortionThresholds {
  misleading: number
  fragmented: number
  unreliable: number
}

export interface DistortionCarrier {
  distortion?: readonly DistortionState[]
  conditions?: readonly ConditionKey[]
}

export interface DistortionInsight {
  states: DistortionState[]
  primary: DistortionState | null
  summary: string
}

export type DistortionInput = DistortionCarrier | readonly DistortionState[] | number | undefined

export const DISTORTION_THRESHOLDS: DistortionThresholds = {
  misleading: 70,
  fragmented: 40,
  unreliable: 1,
}

const DISTORTION_SUMMARIES: Record<DistortionState, string> = {
  misleading: 'Information is misleading.',
  fragmented: 'Information is fragmented.',
  unreliable: 'Information is unreliable.',
}

export function isDistortionState(value: unknown): value is DistortionState {
  return typeof value === 'string' && DISTORTION_STATES.includes(value as DistortionState)
}

export function normalizeDistortionStates(
  distortion: readonly DistortionState[] | undefined
): DistortionState[] {
  if (!distortion || distortion.length === 0) {
    return []
  }

  return DISTORTION_STATES.filter((state) => distortion.includes(state))
}

export function getDistortionStatesForScore(
  score: number,
  thresholds: DistortionThresholds = DISTORTION_THRESHOLDS
): DistortionState[] {
  if (!Number.isFinite(score) || score < thresholds.unreliable) {
    return []
  }

  if (score >= thresholds.misleading) {
    return ['misleading']
  }

  if (score >= thresholds.fragmented) {
    return ['fragmented']
  }

  return ['unreliable']
}

export function resolveDistortionStates(
  input: DistortionInput,
  thresholds: DistortionThresholds = DISTORTION_THRESHOLDS
): DistortionState[] {
  if (typeof input === 'number') {
    return getDistortionStatesForScore(input, thresholds)
  }

  if (Array.isArray(input)) {
    return normalizeDistortionStates(input as readonly DistortionState[])
  }

  return normalizeDistortionStates((input as DistortionCarrier | undefined)?.distortion)
}

export function mergeDistortionStates(
  ...inputs: ReadonlyArray<readonly DistortionState[] | undefined>
): DistortionState[] {
  return normalizeDistortionStates(inputs.flatMap((input) => input ?? []))
}

export function getPrimaryDistortionState(
  input: DistortionInput,
  thresholds: DistortionThresholds = DISTORTION_THRESHOLDS
): DistortionState | null {
  return resolveDistortionStates(input, thresholds)[0] ?? null
}

export function hasDistortionState(
  input: DistortionInput,
  state: DistortionState,
  thresholds: DistortionThresholds = DISTORTION_THRESHOLDS
): boolean {
  return resolveDistortionStates(input, thresholds).includes(state)
}

export function inspectDistortion(
  input: DistortionInput,
  thresholds: DistortionThresholds = DISTORTION_THRESHOLDS
): DistortionInsight {
  const states = resolveDistortionStates(input, thresholds)
  const primary = states[0] ?? null

  return {
    states,
    primary,
    summary: primary ? DISTORTION_SUMMARIES[primary] : 'No distortion.',
  }
}

export function interpretDistortion(
  input: DistortionInput,
  thresholds: DistortionThresholds = DISTORTION_THRESHOLDS
) {
  return inspectDistortion(input, thresholds).summary
}

export function propagateDistortion<TTarget extends DistortionCarrier>(
  source: DistortionCarrier,
  target: TTarget
): TTarget & DistortionCarrier {
  const distortion = mergeDistortionStates(target.distortion, source.distortion)

  if (distortion.length === 0) {
    return { ...target }
  }

  return {
    ...target,
    distortion,
  }
}

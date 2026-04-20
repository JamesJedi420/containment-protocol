import type { AgentTraitModifierKey } from '../agent/models'

export interface ModifierSource {
  source: string
  value: number
}

export interface ModifierCap {
  min: number
  max: number
}

export interface ModifierResult {
  total: number
  capped: number
  cap: ModifierCap
  sources: readonly ModifierSource[]
}

export const MODIFIER_CAP: ModifierCap = { min: -3, max: 3 }

export type ThreatFamily =
  | 'deception'
  | 'disruption'
  | 'containment'
  | 'biological'
  | 'psychological'
  | 'technological'

export interface ResistanceProfile {
  family: ThreatFamily
  base: number
  countermeasures: readonly string[]
  description: string
}

export interface CountermeasureCheck {
  family: ThreatFamily
  presentTags: readonly string[]
}

export type RuntimeModifierMap = Partial<Record<AgentTraitModifierKey, number>>

export interface RuntimeModifierResult {
  statModifiers: RuntimeModifierMap
  effectivenessMultiplier: number
  stressImpactMultiplier: number
  moraleRecoveryDelta: number
}

export const RESISTANCE_PROFILES: readonly ResistanceProfile[] = [
  {
    family: 'deception',
    base: 0,
    countermeasures: ['thermal-vision', 'intel-source', 'truth-serum'],
    description:
      'Resistance to deception-based threats (e.g., concealment, misinformation, manipulation).',
  },
  {
    family: 'disruption',
    base: 0,
    countermeasures: ['engineer', 'containment-specialist', 'signal-jammer'],
    description:
      'Resistance to disruption-based threats (e.g., sabotage, interference, signal loss).',
  },
  {
    family: 'containment',
    base: 0,
    countermeasures: ['containment-specialist', 'biohazard-suit', 'hazmat-protocol'],
    description:
      'Resistance to containment threats (e.g., breaches, hazardous spread, quarantine failure).',
  },
  {
    family: 'biological',
    base: 0,
    countermeasures: ['biohazard-suit', 'medic', 'antiviral-agent'],
    description: 'Resistance to biological threats (e.g., infection, toxin, mutation).',
  },
  {
    family: 'psychological',
    base: 0,
    countermeasures: ['psychologist', 'morale-booster', 'neural-shield'],
    description:
      'Resistance to psychological threats (e.g., panic, hallucination, mind control).',
  },
  {
    family: 'technological',
    base: 0,
    countermeasures: ['engineer', 'firewall', 'emp-device'],
    description:
      'Resistance to technological threats (e.g., hacking, EMP, surveillance).',
  },
] as const

export function aggregateModifiers(
  sources: readonly ModifierSource[],
  cap: ModifierCap = MODIFIER_CAP
): ModifierResult {
  const total = sources.reduce((sum, source) => sum + source.value, 0)
  return {
    total,
    capped: Math.max(cap.min, Math.min(cap.max, total)),
    cap,
    sources,
  }
}

export function explainModifiers(result: ModifierResult) {
  const parts = result.sources.map(
    (source) => `${source.source}: ${source.value > 0 ? '+' : ''}${source.value}`
  )
  return `Modifiers: [${parts.join(', ')}] -> Total: ${result.total} (Capped: ${result.capped})`
}

export function applyBoundedDelta(
  current: number,
  delta: number,
  bounds: ModifierCap
) {
  return Math.max(bounds.min, Math.min(bounds.max, current + delta))
}

export function applyResistanceDelta(current: number, delta: number, max = 100) {
  return applyBoundedDelta(current, delta, { min: 0, max })
}

export function getResistanceProfile(family: ThreatFamily) {
  return RESISTANCE_PROFILES.find((profile) => profile.family === family)
}

export function getEffectiveCountermeasures({ family, presentTags }: CountermeasureCheck) {
  const profile = getResistanceProfile(family)
  if (!profile) {
    return []
  }

  return profile.countermeasures.filter((tag) => presentTags.includes(tag))
}

export function hasEffectiveCountermeasure(check: CountermeasureCheck) {
  return getEffectiveCountermeasures(check).length > 0
}

export function explainCountermeasures(check: CountermeasureCheck) {
  const profile = getResistanceProfile(check.family)
  if (!profile) return 'No resistance profile.'

  const effective = getEffectiveCountermeasures(check)
  if (effective.length === 0) return 'No effective countermeasures present.'
  return `Effective countermeasures: ${effective.join(', ')}`
}

export function hasModifierPayload(modifiers: RuntimeModifierMap | undefined) {
  return Object.values(modifiers ?? {}).some((value) => value !== 0)
}

export function createRuntimeModifierResult(
  overrides: Partial<RuntimeModifierResult> = {}
): RuntimeModifierResult {
  return {
    statModifiers: overrides.statModifiers ?? {},
    effectivenessMultiplier:
      overrides.effectivenessMultiplier !== undefined ? overrides.effectivenessMultiplier : 1,
    stressImpactMultiplier:
      overrides.stressImpactMultiplier !== undefined ? overrides.stressImpactMultiplier : 1,
    moraleRecoveryDelta:
      overrides.moraleRecoveryDelta !== undefined ? overrides.moraleRecoveryDelta : 0,
  }
}

export function mergeRuntimeModifierMaps(
  left: RuntimeModifierMap,
  right: RuntimeModifierMap
): RuntimeModifierMap {
  const keys = new Set<AgentTraitModifierKey>([
    ...Object.keys(left),
    ...Object.keys(right),
  ] as AgentTraitModifierKey[])
  const merged: RuntimeModifierMap = {}

  for (const key of keys) {
    const value = (left[key] ?? 0) + (right[key] ?? 0)
    if (value !== 0) {
      merged[key] = value
    }
  }

  return merged
}

export function aggregateRuntimeModifierResults(
  effects: readonly RuntimeModifierResult[]
): RuntimeModifierResult {
  return effects.reduce(
    (aggregate, effect) =>
      createRuntimeModifierResult({
        statModifiers: mergeRuntimeModifierMaps(aggregate.statModifiers, effect.statModifiers),
        effectivenessMultiplier: aggregate.effectivenessMultiplier * effect.effectivenessMultiplier,
        stressImpactMultiplier: aggregate.stressImpactMultiplier * effect.stressImpactMultiplier,
        moraleRecoveryDelta: aggregate.moraleRecoveryDelta + effect.moraleRecoveryDelta,
      }),
    createRuntimeModifierResult()
  )
}

export function getConfiguredRuntimeModifierEffect(
  modifiers: RuntimeModifierMap | undefined,
  fallback: Partial<RuntimeModifierResult> = {}
): RuntimeModifierResult {
  return createRuntimeModifierResult({
    ...fallback,
    statModifiers: mergeRuntimeModifierMaps(fallback.statModifiers ?? {}, modifiers ?? {}),
  })
}

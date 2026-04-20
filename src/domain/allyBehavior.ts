import {
  selectAuthoredBranch,
  type AuthoredBranchCondition,
  type AuthoredBranchContext,
} from './contentBranching'
import type { GameFlagValue, GameState } from './models'
import type { ProgressClockDefaults } from './progressClocks'

export interface AllyBehaviorThresholdModifier {
  successAt?: number
  partialAt?: number
}

export interface AllyBehaviorProgressEffect {
  clockId: string
  delta: number
  defaults?: ProgressClockDefaults
}

export interface AllyBehaviorFlagEffects {
  set?: Record<string, GameFlagValue>
  clear?: readonly string[]
}

export interface AllyBehaviorEffects {
  scoreModifier?: number
  thresholdModifier?: AllyBehaviorThresholdModifier
  followUpIds?: readonly string[]
  flagEffects?: AllyBehaviorFlagEffects
  progressEffects?: readonly AllyBehaviorProgressEffect[]
}

export interface AllyBehaviorBranch {
  id: string
  when?: AuthoredBranchCondition
  effects?: AllyBehaviorEffects
  summary?: string
}

export interface AllyBehaviorProfile {
  allyId: string
  branches: readonly AllyBehaviorBranch[]
}

export interface AllyBehaviorSelectionInput {
  encounterId: string
  context?: AuthoredBranchContext
}

export interface AllyBehaviorSelection {
  allyId: string
  behaviorId: string
  isFallback: boolean
  summary?: string
  effects: {
    scoreModifier: number
    thresholdModifier: {
      successAt: number
      partialAt: number
    }
    followUpIds: string[]
    flagEffects: {
      set: Record<string, GameFlagValue>
      clear: string[]
    }
    progressEffects: AllyBehaviorProgressEffect[]
  }
}

export interface AllyBehaviorAggregate {
  selections: AllyBehaviorSelection[]
  scoreModifier: number
  thresholdModifier: {
    successAt: number
    partialAt: number
  }
  followUpIds: string[]
  flagEffects: {
    set: Record<string, GameFlagValue>
    clear: string[]
  }
  progressEffects: AllyBehaviorProgressEffect[]
}

function normalizeString(value: string | undefined | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeStringList(values: readonly string[] | undefined) {
  return [...new Set((values ?? []).map(normalizeString).filter((value) => value.length > 0))]
}

function sanitizeNumber(value: number | undefined, fallback = 0) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return Number(value.toFixed(2))
}

function sanitizeEffects(effects: AllyBehaviorEffects | undefined) {
  return {
    scoreModifier: sanitizeNumber(effects?.scoreModifier, 0),
    thresholdModifier: {
      successAt: sanitizeNumber(effects?.thresholdModifier?.successAt, 0),
      partialAt: sanitizeNumber(effects?.thresholdModifier?.partialAt, 0),
    },
    followUpIds: normalizeStringList(effects?.followUpIds),
    flagEffects: {
      set: { ...(effects?.flagEffects?.set ?? {}) },
      clear: normalizeStringList(effects?.flagEffects?.clear),
    },
    progressEffects: (effects?.progressEffects ?? [])
      .map((effect) => ({
        ...effect,
        clockId: normalizeString(effect.clockId),
        delta: sanitizeNumber(effect.delta, 0),
      }))
      .filter((effect) => effect.clockId.length > 0 && effect.delta !== 0),
  }
}

export function selectAllyBehavior(
  state: GameState,
  profile: AllyBehaviorProfile,
  input: AllyBehaviorSelectionInput
): AllyBehaviorSelection | null {
  const allyId = normalizeString(profile.allyId)
  const encounterId = normalizeString(input.encounterId)

  if (allyId.length === 0 || encounterId.length === 0 || profile.branches.length === 0) {
    return null
  }

  const selected = selectAuthoredBranch(
    state,
    profile.branches.map((branch) => ({
      id: normalizeString(branch.id),
      when: branch.when,
      value: branch,
    })),
    input.context
  )

  if (!selected) {
    return null
  }

  const effects = sanitizeEffects(selected.value.effects)

  return {
    allyId,
    behaviorId: selected.branchId,
    isFallback: selected.isFallback,
    ...(selected.value.summary ? { summary: selected.value.summary } : {}),
    effects,
  }
}

export function evaluateAllyBehaviors(
  state: GameState,
  profiles: readonly AllyBehaviorProfile[],
  input: AllyBehaviorSelectionInput
): AllyBehaviorAggregate {
  const selections = profiles
    .map((profile) => selectAllyBehavior(state, profile, input))
    .filter((selection): selection is AllyBehaviorSelection => selection !== null)

  return {
    selections,
    scoreModifier: sanitizeNumber(
      selections.reduce((sum, selection) => sum + selection.effects.scoreModifier, 0),
      0
    ),
    thresholdModifier: {
      successAt: sanitizeNumber(
        selections.reduce((sum, selection) => sum + selection.effects.thresholdModifier.successAt, 0),
        0
      ),
      partialAt: sanitizeNumber(
        selections.reduce((sum, selection) => sum + selection.effects.thresholdModifier.partialAt, 0),
        0
      ),
    },
    followUpIds: [...new Set(selections.flatMap((selection) => selection.effects.followUpIds))],
    flagEffects: {
      set: Object.assign({}, ...selections.map((selection) => selection.effects.flagEffects.set)),
      clear: [...new Set(selections.flatMap((selection) => selection.effects.flagEffects.clear))],
    },
    progressEffects: selections.flatMap((selection) => selection.effects.progressEffects),
  }
}

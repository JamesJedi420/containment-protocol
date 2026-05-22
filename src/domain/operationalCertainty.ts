import type { GameState } from './models'
import type { SocialMapFactVisibility } from './simulationMapInterface'
import { buildSimulationMapInterface } from './simulationMapInterface'
import { buildRegistryFromSources, type DetectionContext } from './liveRegistryProjection'
import { buildRegistryDigest } from './liveRegistryQuery'

export type OperationalCertaintyLevel = 'confirmed' | 'suspected' | 'inferred' | 'contradicted'

export interface OperationalCertaintyBucket {
  id: string
  label: string
  reasonLabel: string
  count: number
  averageConfidencePercent: number
  level: OperationalCertaintyLevel
}

export interface OperationalCertaintyView {
  summary: string
  mapBuckets: OperationalCertaintyBucket[]
  registryBuckets: OperationalCertaintyBucket[]
}

function clamp01(value: number) {
  if (value < 0) {
    return 0
  }
  if (value > 1) {
    return 1
  }
  return value
}

function toPercent(value: number) {
  return Math.round(clamp01(value) * 100)
}

function getDetectionContextFromCase(currentCase: GameState['cases'][string]): DetectionContext {
  const confidence = clamp01(currentCase.intelConfidence ?? 0.45)

  if (currentCase.hiddenState === 'revealed') {
    return {
      detectionMethod: 'direct',
      detectionStrength: Math.max(0.8, confidence),
    }
  }

  if (currentCase.hiddenState === 'hidden' || currentCase.hiddenState === 'displaced') {
    return {
      detectionMethod: 'inference',
      detectionStrength: Math.min(0.54, Math.max(0.25, confidence)),
    }
  }

  if (confidence >= 0.8) {
    return {
      detectionMethod: 'direct',
      detectionStrength: confidence,
    }
  }

  if (confidence >= 0.55) {
    return {
      detectionMethod: 'inference',
      detectionStrength: confidence,
    }
  }

  if (confidence >= 0.2) {
    return {
      detectionMethod: 'residue',
      detectionStrength: confidence,
    }
  }

  return {
    detectionMethod: 'undetected',
    detectionStrength: 0,
  }
}

function buildMapBuckets(game: GameState): OperationalCertaintyBucket[] {
  const simulationMap = buildSimulationMapInterface(game)
  const socialFacts = simulationMap.socialFacts

  const include = (visibility: SocialMapFactVisibility) =>
    socialFacts.filter((fact) => fact.visibility === visibility)

  const confirmedFacts = [...include('known'), ...include('reported')]
  const suspectedFacts = include('suspected')
  const inferredFacts = [...include('inferred'), ...include('hidden')]
  const contradictedFacts = include('contradicted')

  const createBucket = (
    id: string,
    label: string,
    reasonLabel: string,
    level: OperationalCertaintyLevel,
    values: typeof socialFacts
  ): OperationalCertaintyBucket => ({
    id,
    label,
    reasonLabel,
    level,
    count: values.length,
    averageConfidencePercent:
      values.length === 0
        ? 0
        : toPercent(values.reduce((sum, value) => sum + value.confidence, 0) / values.length),
  })

  return [
    createBucket('map-confirmed', 'Confirmed', 'Direct or cross-verified', 'confirmed', confirmedFacts),
    createBucket('map-suspected', 'Suspected', 'Partial corroboration', 'suspected', suspectedFacts),
    createBucket('map-inferred', 'Inferred', 'Inference-only links', 'inferred', inferredFacts),
    createBucket(
      'map-contradicted',
      'Contradicted',
      'Conflicting signals',
      'contradicted',
      contradictedFacts
    ),
  ]
}

function buildRegistryBuckets(game: GameState): {
  buckets: OperationalCertaintyBucket[]
  activeThreatCount: number
  overloadFlag: boolean
} {
  const openCases = Object.values(game.cases)
    .filter((currentCase) => currentCase.status !== 'resolved')
    .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))

  const anomalyDetections = new Map<string, DetectionContext>()
  const anomalies = openCases.map((currentCase) => {
    anomalyDetections.set(currentCase.id, getDetectionContextFromCase(currentCase))
    return {
      entityId: currentCase.id,
      label: currentCase.title,
      actorClass: 'humanoid_anomaly' as const,
      physicality:
        currentCase.hiddenState === 'hidden' || currentCase.hiddenState === 'displaced'
          ? ('projected' as const)
          : ('physical' as const),
      behaviorState:
        currentCase.status === 'in_progress'
          ? ('escalating' as const)
          : currentCase.hiddenState === 'hidden'
            ? ('hiding' as const)
            : ('hunting' as const),
      linkedCaseIds: [currentCase.id],
    }
  })

  const entries = buildRegistryFromSources(
    {
      anomalies,
    },
    anomalyDetections,
    game.week
  )
  const digest = buildRegistryDigest(entries, game.week)

  const createBucket = (
    id: string,
    label: string,
    reasonLabel: string,
    level: OperationalCertaintyLevel,
    values: readonly { confidence: number }[]
  ): OperationalCertaintyBucket => ({
    id,
    label,
    reasonLabel,
    level,
    count: values.length,
    averageConfidencePercent:
      values.length === 0
        ? 0
        : toPercent(values.reduce((sum, value) => sum + value.confidence, 0) / values.length),
  })

  return {
    buckets: [
      createBucket(
        'registry-confirmed',
        'Confirmed',
        'Directly observed threats',
        'confirmed',
        digest.confirmedThreats
      ),
      createBucket(
        'registry-suspected',
        'Suspected',
        'Partial signature match',
        'suspected',
        digest.suspectedThreats
      ),
      createBucket(
        'registry-inferred',
        'Inferred',
        'Weak signature only',
        'inferred',
        digest.inferredSignatures
      ),
    ],
    activeThreatCount: digest.activeThreatCount,
    overloadFlag: digest.overloadFlag,
  }
}

export function buildOperationalCertaintyView(game: GameState): OperationalCertaintyView {
  const mapBuckets = buildMapBuckets(game)
  const registry = buildRegistryBuckets(game)
  const contradictedCount = mapBuckets.find((bucket) => bucket.level === 'contradicted')?.count ?? 0

  const summary =
    contradictedCount > 0
      ? `Certainty warning: ${contradictedCount} contradicted map fact${contradictedCount === 1 ? '' : 's'} need verification before committing teams.`
      : registry.overloadFlag
        ? `Registry overload: ${registry.activeThreatCount} active threat entries require triage before expansion.`
        : `Operational certainty stable: ${registry.activeThreatCount} active threat ${registry.activeThreatCount === 1 ? 'entry' : 'entries'} with no contradiction hotspots.`

  return {
    summary,
    mapBuckets,
    registryBuckets: registry.buckets,
  }
}

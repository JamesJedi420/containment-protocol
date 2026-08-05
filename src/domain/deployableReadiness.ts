import type { AgentReadinessBand, CertificationState } from './agent/models'
import type { EquipmentRarity } from './equipment'

export const DEPLOYABLE_READINESS_BANDS = [
  'ready',
  'limited',
  'degraded',
  'blocked',
] as const

export type DeployableReadinessBand = (typeof DEPLOYABLE_READINESS_BANDS)[number]

export const READINESS_COMPOSITION_INPUT_CLASSES = [
  'certification',
  'gear',
  'condition',
] as const

export type ReadinessCompositionInputClass =
  (typeof READINESS_COMPOSITION_INPUT_CLASSES)[number]

export interface ReadinessCompositionInputs {
  certificationState?: CertificationState | null
  gearTier?: EquipmentRarity | null
  conditionBand?: AgentReadinessBand | null
}

export interface ReadinessCompositionRecord {
  deployableId: string
  certificationState: CertificationState | null
  gearTier: EquipmentRarity | null
  conditionBand: AgentReadinessBand | null
  fieldReliabilityScore: number
  readinessBand: DeployableReadinessBand
  missingInputs: ReadinessCompositionInputClass[]
}

export type ReadinessCompositionRegistry = Record<string, ReadinessCompositionRecord>

export interface ReadinessCompositionValidationResult {
  valid: boolean
  issues: string[]
}

const CERTIFICATION_SCORES: Record<CertificationState, number> = {
  not_started: 0,
  in_progress: 45,
  eligible_review: 70,
  certified: 100,
  expired: 0,
  revoked: 0,
}

const GEAR_TIER_SCORES: Record<EquipmentRarity, number> = {
  basic: 70,
  uncommon: 78,
  rare: 86,
  epic: 94,
  legendary: 100,
}

const CONDITION_SCORES: Record<AgentReadinessBand, number> = {
  steady: 100,
  strained: 65,
  critical: 30,
  unavailable: 0,
}

const CERTIFICATION_STATES = Object.freeze(
  Object.keys(CERTIFICATION_SCORES) as CertificationState[]
)
const GEAR_TIERS = Object.freeze(Object.keys(GEAR_TIER_SCORES) as EquipmentRarity[])
const CONDITION_BANDS = Object.freeze(
  Object.keys(CONDITION_SCORES) as AgentReadinessBand[]
)

function isCertificationState(value: unknown): value is CertificationState {
  return typeof value === 'string' && CERTIFICATION_STATES.includes(value as CertificationState)
}

function isGearTier(value: unknown): value is EquipmentRarity {
  return typeof value === 'string' && GEAR_TIERS.includes(value as EquipmentRarity)
}

function isConditionBand(value: unknown): value is AgentReadinessBand {
  return typeof value === 'string' && CONDITION_BANDS.includes(value as AgentReadinessBand)
}

function getMissingInputs(
  certificationState: CertificationState | null,
  gearTier: EquipmentRarity | null,
  conditionBand: AgentReadinessBand | null
): ReadinessCompositionInputClass[] {
  const missing: ReadinessCompositionInputClass[] = []
  if (certificationState === null) missing.push('certification')
  if (gearTier === null) missing.push('gear')
  if (conditionBand === null) missing.push('condition')
  return missing
}

function getBaseScore(
  certificationState: CertificationState,
  gearTier: EquipmentRarity,
  conditionBand: AgentReadinessBand
): number {
  return Math.round(
    (CERTIFICATION_SCORES[certificationState] +
      GEAR_TIER_SCORES[gearTier] +
      CONDITION_SCORES[conditionBand]) /
      3
  )
}

function getBandForScore(score: number): DeployableReadinessBand {
  if (score >= 85) return 'ready'
  if (score >= 65) return 'limited'
  if (score >= 40) return 'degraded'
  return 'blocked'
}

function resolveScoreAndBand(
  certificationState: CertificationState | null,
  gearTier: EquipmentRarity | null,
  conditionBand: AgentReadinessBand | null,
  missingInputs: readonly ReadinessCompositionInputClass[]
): Pick<ReadinessCompositionRecord, 'fieldReliabilityScore' | 'readinessBand'> {
  if (
    missingInputs.length > 0 ||
    certificationState === null ||
    gearTier === null ||
    conditionBand === null
  ) {
    return { fieldReliabilityScore: 0, readinessBand: 'blocked' }
  }

  if (
    certificationState === 'not_started' ||
    certificationState === 'expired' ||
    certificationState === 'revoked' ||
    conditionBand === 'unavailable'
  ) {
    return { fieldReliabilityScore: 0, readinessBand: 'blocked' }
  }

  const baseScore = getBaseScore(certificationState, gearTier, conditionBand)

  if (certificationState === 'in_progress' || conditionBand === 'critical') {
    const score = Math.min(baseScore, 59)
    return { fieldReliabilityScore: score, readinessBand: 'degraded' }
  }

  if (certificationState === 'eligible_review' || conditionBand === 'strained') {
    const score = Math.min(baseScore, 79)
    return { fieldReliabilityScore: score, readinessBand: 'limited' }
  }

  return {
    fieldReliabilityScore: baseScore,
    readinessBand: getBandForScore(baseScore),
  }
}

export function composeDeployableReadiness(
  deployableId: string,
  inputs: ReadinessCompositionInputs
): ReadinessCompositionRecord {
  const certificationState = inputs.certificationState ?? null
  const gearTier = inputs.gearTier ?? null
  const conditionBand = inputs.conditionBand ?? null
  const missingInputs = getMissingInputs(certificationState, gearTier, conditionBand)
  const derived = resolveScoreAndBand(
    certificationState,
    gearTier,
    conditionBand,
    missingInputs
  )

  return {
    deployableId,
    certificationState,
    gearTier,
    conditionBand,
    fieldReliabilityScore: derived.fieldReliabilityScore,
    readinessBand: derived.readinessBand,
    missingInputs,
  }
}

export function buildReadinessCompositionRegistry(
  inputsByDeployableId: Readonly<Record<string, ReadinessCompositionInputs>>
): ReadinessCompositionRegistry {
  return Object.fromEntries(
    Object.keys(inputsByDeployableId)
      .sort((left, right) => left.localeCompare(right))
      .map((deployableId) => [
        deployableId,
        composeDeployableReadiness(deployableId, inputsByDeployableId[deployableId]),
      ])
  )
}

export function validateReadinessCompositionRecord(
  value: unknown
): ReadinessCompositionValidationResult {
  const issues: string[] = []

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { valid: false, issues: ['record-required'] }
  }

  const record = value as Partial<ReadinessCompositionRecord>

  if (typeof record.deployableId !== 'string' || record.deployableId.trim().length === 0) {
    issues.push('deployable-id-required')
  }

  if (record.certificationState !== null && !isCertificationState(record.certificationState)) {
    issues.push('invalid-certification-state')
  }
  if (record.gearTier !== null && !isGearTier(record.gearTier)) {
    issues.push('invalid-gear-tier')
  }
  if (record.conditionBand !== null && !isConditionBand(record.conditionBand)) {
    issues.push('invalid-condition-band')
  }

  if (!Number.isInteger(record.fieldReliabilityScore)) {
    issues.push('field-reliability-score-integer-required')
  } else if (
    (record.fieldReliabilityScore as number) < 0 ||
    (record.fieldReliabilityScore as number) > 100
  ) {
    issues.push('field-reliability-score-out-of-range')
  }

  if (!DEPLOYABLE_READINESS_BANDS.includes(record.readinessBand as DeployableReadinessBand)) {
    issues.push('invalid-readiness-band')
  }

  if (!Array.isArray(record.missingInputs)) {
    issues.push('missing-inputs-array-required')
  } else if (
    record.missingInputs.some(
      (inputClass) =>
        !READINESS_COMPOSITION_INPUT_CLASSES.includes(
          inputClass as ReadinessCompositionInputClass
        )
    )
  ) {
    issues.push('invalid-missing-input-class')
  }

  if (issues.length > 0) {
    return { valid: false, issues }
  }

  const expected = composeDeployableReadiness(record.deployableId as string, {
    certificationState: record.certificationState,
    gearTier: record.gearTier,
    conditionBand: record.conditionBand,
  })

  if (record.fieldReliabilityScore !== expected.fieldReliabilityScore) {
    issues.push('field-reliability-score-mismatch')
  }
  if (record.readinessBand !== expected.readinessBand) {
    issues.push('readiness-band-mismatch')
  }
  if (JSON.stringify(record.missingInputs) !== JSON.stringify(expected.missingInputs)) {
    issues.push('missing-inputs-mismatch')
  }

  return { valid: issues.length === 0, issues }
}

export function validateReadinessCompositionRegistry(
  registry: unknown
): ReadinessCompositionValidationResult {
  if (typeof registry !== 'object' || registry === null || Array.isArray(registry)) {
    return { valid: false, issues: ['registry-required'] }
  }

  const issues: string[] = []
  for (const [deployableId, record] of Object.entries(registry)) {
    const result = validateReadinessCompositionRecord(record)
    issues.push(...result.issues.map((issue) => `${deployableId}:${issue}`))

    if (
      typeof record === 'object' &&
      record !== null &&
      !Array.isArray(record) &&
      (record as Partial<ReadinessCompositionRecord>).deployableId !== deployableId
    ) {
      issues.push(`${deployableId}:registry-key-mismatch`)
    }
  }

  return { valid: issues.length === 0, issues }
}

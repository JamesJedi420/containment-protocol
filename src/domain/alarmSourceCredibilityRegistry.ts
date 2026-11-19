/**
 * SPE-3154 — alarm-source credibility and nuisance-response degradation (slice 1).
 *
 * Pure domain helper: derives a compact credibility band and verification burden
 * from an already-resolved activation history for one authoritative alert source.
 * Does not own alert networks (SPE-102), sensor drift, calibration, or human fatigue.
 * Current alert severity remains external and is never overridden here.
 */

import { assertNonEmptyId, assertSafeIntegerInRange } from './assertBoundedInteger'

export const ALARM_SOURCE_CREDIBILITY_OWNER = 'SPE-3154' as const

export type ActivationOutcome = 'confirmed_valid' | 'nuisance' | 'unresolved'

export interface SourceActivationRecord {
  readonly activationId: string
  readonly outcome: ActivationOutcome
  readonly sequence: number
}

export interface AlarmSourceCredibilityInput {
  readonly sourceId: string
  readonly activations: readonly SourceActivationRecord[]
  readonly hasCorrectiveEvidence?: boolean
}

export type CredibilityBand = 'high' | 'medium' | 'low'

export interface AlarmSourceCredibilityResult {
  readonly sourceId: string
  readonly band: CredibilityBand
  readonly verificationBurden: number
  readonly automaticMobilizationAllowed: boolean
  readonly requiresCorroboration: boolean
  readonly reason: string
  readonly owner: typeof ALARM_SOURCE_CREDIBILITY_OWNER
}

const VALID_OUTCOMES = new Set<ActivationOutcome>(['confirmed_valid', 'nuisance', 'unresolved'])

function validateActivations(records: readonly SourceActivationRecord[]): readonly SourceActivationRecord[] {
  if (!Array.isArray(records)) {
    throw new Error('activations must be an array')
  }
  const seen = new Set<string>()
  return Object.freeze(
    records.map((record, index) => {
      if (typeof record !== 'object' || record === null || Array.isArray(record)) {
        throw new Error(`activations[${index}] is invalid`)
      }
      const activationId = assertNonEmptyId(record.activationId, `activations[${index}].activationId`)
      if (seen.has(activationId)) {
        throw new Error(`duplicate activationId: ${activationId}`)
      }
      seen.add(activationId)
      if (!VALID_OUTCOMES.has(record.outcome)) {
        throw new Error(`activations[${index}].outcome is invalid`)
      }
      const sequence = assertSafeIntegerInRange(record.sequence, `activations[${index}].sequence`, 0, 1_000_000)
      return Object.freeze({ activationId, outcome: record.outcome, sequence })
    })
  )
}

/** Derive credibility and verification burden from resolved activation history. Pure and deterministic. */
export function deriveAlarmSourceCredibility(
  input: AlarmSourceCredibilityInput
): AlarmSourceCredibilityResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('alarm source credibility input is required')
  }
  const sourceId = assertNonEmptyId(input.sourceId, 'sourceId')
  const activations = validateActivations(input.activations)
  const hasCorrective = input.hasCorrectiveEvidence === true

  const nuisanceCount = activations.filter((a) => a.outcome === 'nuisance').length
  const validCount = activations.filter((a) => a.outcome === 'confirmed_valid').length
  const total = activations.length

  let band: CredibilityBand = 'high'
  let verificationBurden = 0
  let automaticMobilizationAllowed = true
  let requiresCorroboration = false
  let reason = 'no history or reliable confirmed activations'

  if (hasCorrective) {
    band = 'high'
    verificationBurden = 0
    automaticMobilizationAllowed = true
    requiresCorroboration = false
    reason = 'explicit corrective evidence or authoritative reset'
  } else if (total === 0) {
    // default high for new sources
  } else if (nuisanceCount >= 3 && validCount === 0) {
    band = 'low'
    verificationBurden = 2
    automaticMobilizationAllowed = false
    requiresCorroboration = true
    reason = `${nuisanceCount} confirmed nuisance activations with no valid confirmations`
  } else if (nuisanceCount >= 2) {
    band = 'medium'
    verificationBurden = 1
    automaticMobilizationAllowed = true
    requiresCorroboration = true
    reason = `${nuisanceCount} nuisance activations reduce automatic trust`
  } else if (validCount >= 1) {
    band = 'high'
    reason = `${validCount} confirmed valid activation(s) support high credibility`
  }

  // Low credibility never blocks a real alert; burden is advisory for SPE-102 choreography.
  return Object.freeze({
    sourceId,
    band,
    verificationBurden,
    automaticMobilizationAllowed,
    requiresCorroboration,
    reason,
    owner: ALARM_SOURCE_CREDIBILITY_OWNER,
  })
}

import type { TemplateBandPolicy } from './contentTemplateKernel'
import {
  finiteNonnegative,
  isRecord,
  stringList,
  validateTemplateKernel,
} from './contentTemplateRuntime'

function oneOf(value: unknown, allowed: readonly string[]): boolean {
  return typeof value === 'string' && allowed.includes(value)
}

export const validateKernel = validateTemplateKernel

export function validateProtocolMaterial(value: unknown, policy?: TemplateBandPolicy): string[] {
  const errors = validateKernel(value, policy)
  if (!isRecord(value)) return errors
  if (value.family !== 'protocol-material') errors.push('Mismatched protocol material family')
  if (!oneOf(value.sourceType, ['biological', 'chemical', 'artifact', 'environmental']))
    errors.push('Invalid sourceType')
  if (!finiteNonnegative(value.recognitionThreshold)) errors.push('Invalid recognitionThreshold')
  if (
    !isRecord(value.preparation) ||
    !stringList(value.preparation.steps) ||
    !stringList([value.preparation.method, value.preparation.delivery])
  )
    errors.push('Invalid preparation')
  if (
    !isRecord(value.effect) ||
    !stringList([value.effect.effectType]) ||
    !finiteNonnegative(value.effect.magnitude) ||
    (value.effect.duration !== undefined && !finiteNonnegative(value.effect.duration))
  )
    errors.push('Invalid effect')
  if (
    value.sideEffects !== undefined &&
    (!Array.isArray(value.sideEffects) ||
      Array.from(value.sideEffects).some(
        (entry) =>
          !isRecord(entry) ||
          !stringList([entry.description, entry.trigger]) ||
          !oneOf(entry.severity, ['minor', 'moderate', 'severe'])
      ))
  )
    errors.push('Invalid side effects')
  if (
    value.contamination !== undefined &&
    (!Array.isArray(value.contamination) ||
      Array.from(value.contamination).some(
        (entry) =>
          !isRecord(entry) || !stringList([entry.description, entry.failureType, entry.consequence])
      ))
  )
    errors.push('Invalid contamination')
  return errors
}

export function validateHazardIncident(value: unknown, policy?: TemplateBandPolicy): string[] {
  const errors = validateKernel(value, policy)
  if (!isRecord(value)) return errors
  if (value.family !== 'hazard-incident') errors.push('Mismatched hazard incident family')
  if (!oneOf(value.hazardType, ['containment-breach', 'exposure', 'environmental', 'rival-action']))
    errors.push('Invalid hazardType')
  if (!stringList(value.triggers)) errors.push('Invalid triggers')
  if (
    !isRecord(value.escalation) ||
    !stringList(value.escalation.steps) ||
    !Array.isArray(value.escalation.riskThresholds) ||
    value.escalation.riskThresholds.length === 0 ||
    !Array.from(value.escalation.riskThresholds).every(finiteNonnegative)
  )
    errors.push('Invalid escalation')
  if (
    !isRecord(value.resolution) ||
    !stringList(value.resolution.requiredActions) ||
    !stringList([value.resolution.fallback])
  )
    errors.push('Invalid resolution')
  // Overrides replace the entire threshold list; require coverage through the final stage.
  if (
    isRecord(value.escalation) &&
    Array.isArray(value.escalation.steps) &&
    isRecord(value.runtime) &&
    Array.isArray(value.runtime.alternatives)
  ) {
    const required = Math.max(0, value.escalation.steps.length - 1)
    for (const alternative of value.runtime.alternatives) {
      if (
        isRecord(alternative) &&
        isRecord(alternative.parameters) &&
        Array.isArray(alternative.parameters.riskThresholds) &&
        alternative.parameters.riskThresholds.length < required
      ) {
        errors.push('Incident alternative thresholds must cover non-final steps')
      }
    }
  }
  return errors
}

export function validateDoctrinePlaybook(value: unknown, policy?: TemplateBandPolicy): string[] {
  const errors = validateKernel(value, policy)
  if (!isRecord(value)) return errors
  if (value.family !== 'doctrine-playbook') errors.push('Mismatched doctrine family')
  if (
    !oneOf(value.doctrineType, [
      'containment-protocol',
      'investigation-playbook',
      'treatment-guide',
    ])
  )
    errors.push('Invalid doctrineType')
  if (!stringList(value.applicableContexts)) errors.push('Invalid applicableContexts')
  if (!stringList(value.steps)) errors.push('Invalid steps')
  if (!finiteNonnegative(value.reliability) || value.reliability > 1)
    errors.push('Invalid reliability')
  if (
    value.unlocks !== undefined &&
    (!Array.isArray(value.unlocks) ||
      Array.from(value.unlocks).some((entry) => !stringList([entry])))
  )
    errors.push('Invalid unlocks')
  return errors
}

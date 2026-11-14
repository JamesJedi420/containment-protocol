import type { TemplateRuntimeOptions } from './contentTemplateKernel'
import {
  resolveTemplateRuntime,
  TemplateValidationError,
  finiteNonnegative,
} from './contentTemplateRuntime'
import { validateProtocolMaterial } from './contentTemplateValidation'
// Deterministic runtime logic for protocol materials (SPE-48)
import type { ProtocolMaterialTemplate } from './protocolMaterialTemplates'

export type PreparationAttempt = {
  agentSkill: number
  method: string
  delivery: string
}

export type PreparationResult =
  | { outcome: 'success'; effect: string; sideEffects?: string[] }
  | { outcome: 'failure'; reason: string; contamination?: string }

export function resolvePreparation(
  template: ProtocolMaterialTemplate,
  attempt: PreparationAttempt,
  options?: TemplateRuntimeOptions
): PreparationResult {
  const errors = validateProtocolMaterial(template, options?.policy)
  if (errors.length) throw new TemplateValidationError(errors)
  if (!finiteNonnegative(attempt.agentSkill))
    throw new TemplateValidationError(['Invalid agent skill'])
  const parameters = resolveTemplateRuntime(template, 'prepare-material', options)
  if (attempt.agentSkill < (parameters.recognitionThreshold ?? template.recognitionThreshold)) {
    return { outcome: 'failure', reason: 'Insufficient skill' }
  }
  if (
    attempt.method !== template.preparation.method ||
    attempt.delivery !== template.preparation.delivery
  ) {
    return {
      outcome: 'failure',
      reason: 'Incorrect method or delivery',
      contamination: template.contamination?.[0]?.description,
    }
  }
  // Deterministic: always succeed if skill and method match
  return {
    outcome: 'success',
    effect: template.effect.effectType,
    sideEffects: template.sideEffects?.map((s) => s.description),
  }
}

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
  attempt: PreparationAttempt
): PreparationResult {
  if (attempt.agentSkill < template.recognitionThreshold) {
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

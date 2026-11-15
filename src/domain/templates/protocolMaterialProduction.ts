import type { ProductionRecipe } from '../../data/production'
import { resolvePreparation } from './protocolMaterialRuntime'
import { TemplateValidationError } from './contentTemplateRuntime'

/**
 * Production has no individual preparer: zero means no skill requirement,
 * not a claim about any agent. Existing recipe stock, funding and grade gates
 * remain authoritative, as does the output equipment's own use behavior.
 */
export function acceptsProtocolMaterialProduction(recipe: ProductionRecipe): boolean {
  const binding = recipe.protocolMaterial
  if (binding === undefined) return true
  if (binding === null || typeof binding !== 'object') return false
  try {
    // The existing equipment queue cannot apply template-specific consequences
    // or individual requirements; do not silently accept them.
    if (
      binding.template?.sideEffects?.length ||
      binding.template?.contamination?.length ||
      binding.template?.requirements?.length
    )
      return false
    const result = resolvePreparation(
      binding.template,
      { agentSkill: 0, method: 'fabrication', delivery: 'equipment' },
      {
        policy: binding.policy,
        context: { recipeId: recipe.recipeId, outputItemId: recipe.outputItemId },
      }
    )
    return (
      result.outcome === 'success' &&
      result.effect === `equipment:${recipe.outputItemId}` &&
      binding.template.effect.magnitude === recipe.outputQuantity
    )
  } catch (error) {
    if (error instanceof TemplateValidationError) return false
    throw error
  }
}

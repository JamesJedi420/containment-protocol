import type { GameState, Id } from '../../domain/models'

export function getCaseTemplateFamily(templateId: Id, game?: GameState) {
  void game
  // Optionally pass game for future-proofing, but only templateId is used
  return getTemplateFamily(templateId)
}

export function getTemplateFamily(templateId: string) {
  const [family] = templateId.split(/[-_]/)
  return family
}

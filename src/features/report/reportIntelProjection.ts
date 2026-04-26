import type { GameState, Id } from '../../domain/models'
import { getTemplateFamily } from '../intel/intelView'

export function getCaseTemplateFamily(templateId: Id, game?: GameState) {
  void game
  // Optionally pass game for future-proofing, but only templateId is used
  return getTemplateFamily(templateId)
}

import type { GameState, Id } from '../../domain/models'
import { getTemplateFamily } from '../intel/intelView'

export function getCaseTemplateFamily(templateId: Id, _game?: GameState) {
  // Optionally pass game for future-proofing, but only templateId is used
  return getTemplateFamily(templateId)
}

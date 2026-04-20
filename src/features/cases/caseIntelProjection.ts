import type { CaseInstance, GameState } from '../../domain/models'
import { getTemplateIntelView } from '../intel/intelView'

export function getCaseTemplateIntelView(currentCase: CaseInstance, game: GameState) {
  return getTemplateIntelView(currentCase.templateId, game.templates)
}

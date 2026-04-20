import type { Id } from '../../domain/models'
import { getTemplateFamily } from '../intel/intelView'

export function getCaseTemplateFamily(templateId: Id) {
  return getTemplateFamily(templateId)
}

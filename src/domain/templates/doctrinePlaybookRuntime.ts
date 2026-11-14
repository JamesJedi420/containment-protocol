import type { TemplateRuntimeOptions } from './contentTemplateKernel'
import {
  resolveTemplateRuntime,
  TemplateValidationError,
  finiteNonnegative,
} from './contentTemplateRuntime'
import { validateDoctrinePlaybook } from './contentTemplateValidation'
// Deterministic runtime logic for doctrine/playbook templates (SPE-48)
import type { DoctrinePlaybookTemplate } from './doctrinePlaybookTemplates'

export type DoctrineApplication = {
  context: string
  reliability: number
}

export function applyDoctrine(
  template: DoctrinePlaybookTemplate,
  application: DoctrineApplication,
  options?: TemplateRuntimeOptions
): { unlocked: string[]; guidance: string[] } {
  const errors = validateDoctrinePlaybook(template, options?.policy)
  if (errors.length) throw new TemplateValidationError(errors)
  if (!finiteNonnegative(application.reliability) || application.reliability > 1)
    throw new TemplateValidationError(['Invalid application reliability'])
  const parameters = resolveTemplateRuntime(template, 'apply-doctrine', options)
  // Deterministic: unlocks only if context matches and reliability threshold met
  if (
    template.applicableContexts.includes(application.context) &&
    application.reliability <= (parameters.reliability ?? template.reliability)
  ) {
    return {
      unlocked: template.unlocks || [],
      guidance: template.steps,
    }
  }
  return { unlocked: [], guidance: [] }
}

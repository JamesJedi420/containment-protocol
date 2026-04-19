// Deterministic runtime logic for doctrine/playbook templates (SPE-48)
import type { DoctrinePlaybookTemplate } from './doctrinePlaybookTemplates'

export type DoctrineApplication = {
  context: string
  reliability: number
}

export function applyDoctrine(
  template: DoctrinePlaybookTemplate,
  application: DoctrineApplication
): { unlocked: string[]; guidance: string[] } {
  // Deterministic: unlocks only if context matches and reliability threshold met
  if (
    template.applicableContexts.includes(application.context) &&
    application.reliability <= template.reliability
  ) {
    return {
      unlocked: template.unlocks || [],
      guidance: template.steps,
    }
  }
  return { unlocked: [], guidance: [] }
}

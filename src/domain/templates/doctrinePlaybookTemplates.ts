// Doctrine/Playbook Templates (SPE-48)
import type { ContentTemplateKernel } from './contentTemplateKernel'

export type DoctrinePlaybookTemplate = ContentTemplateKernel & {
  doctrineType: 'containment-protocol' | 'investigation-playbook' | 'treatment-guide'
  applicableContexts: string[]
  steps: string[]
  knowledgeTags?: string[]
  unlocks?: string[]
  reliability: number // 0-1
}

// Example doctrine/playbook template
export const doctrinePlaybookTemplates: DoctrinePlaybookTemplate[] = [
  {
    id: 'dp-001',
    family: 'doctrine-playbook',
    type: 'containment-protocol',
    doctrineType: 'containment-protocol',
    applicableContexts: ['artifact', 'biological'],
    steps: ['isolate sample', 'apply stabilizer', 'monitor for escalation'],
    unlocks: ['stabilizer-prep', 'hazard-mitigation'],
    reliability: 0.95,
    presentation: { summary: 'Standard containment protocol for unstable samples.' },
  },
]

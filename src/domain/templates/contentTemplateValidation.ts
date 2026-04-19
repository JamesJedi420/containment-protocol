// Validation for ContentTemplateKernel and family extensions (SPE-48)
import type { ContentTemplateKernel } from './contentTemplateKernel'
import type { ProtocolMaterialTemplate } from './protocolMaterialTemplates'
import type { HazardIncidentTemplate } from './hazardIncidentTemplates'
import type { DoctrinePlaybookTemplate } from './doctrinePlaybookTemplates'

export function validateKernel(template: ContentTemplateKernel): string[] {
  const errors: string[] = []
  if (!template.id) errors.push('Missing id')
  if (!template.family) errors.push('Missing family')
  if (!template.type) errors.push('Missing type')
  if (template.presentation && !template.presentation.summary) errors.push('Missing presentation.summary')
  // Add more kernel-level checks as needed
  return errors
}

export function validateProtocolMaterial(t: ProtocolMaterialTemplate): string[] {
  const errors = validateKernel(t)
  if (!t.sourceType) errors.push('Missing sourceType')
  if (typeof t.recognitionThreshold !== 'number') errors.push('Missing recognitionThreshold')
  if (!t.preparation) errors.push('Missing preparation')
  if (!t.effect) errors.push('Missing effect')
  return errors
}

export function validateHazardIncident(t: HazardIncidentTemplate): string[] {
  const errors = validateKernel(t)
  if (!t.hazardType) errors.push('Missing hazardType')
  if (!t.triggers || !t.triggers.length) errors.push('Missing triggers')
  if (!t.escalation) errors.push('Missing escalation')
  if (!t.resolution) errors.push('Missing resolution')
  return errors
}

export function validateDoctrinePlaybook(t: DoctrinePlaybookTemplate): string[] {
  const errors = validateKernel(t)
  if (!t.doctrineType) errors.push('Missing doctrineType')
  if (!t.applicableContexts || !t.applicableContexts.length) errors.push('Missing applicableContexts')
  if (!t.steps || !t.steps.length) errors.push('Missing steps')
  if (typeof t.reliability !== 'number') errors.push('Missing reliability')
  return errors
}

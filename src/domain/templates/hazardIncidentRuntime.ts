import type { TemplateRuntimeOptions } from './contentTemplateKernel'
import {
  resolveTemplateRuntime,
  TemplateValidationError,
  finiteNonnegative,
} from './contentTemplateRuntime'
import { validateHazardIncident } from './contentTemplateValidation'
// Deterministic runtime logic for hazard/incident templates (SPE-48)
import type { HazardIncidentTemplate } from './hazardIncidentTemplates'
import { cloneIncidentImpact, type IncidentImpact } from './incidentImpact'

export type IncidentState = {
  escalationStep: number
  risk: number
  resolved: boolean
  /** SPE-820: Canonical typed impact snapshot currently attached to this incident. */
  impact?: IncidentImpact
}

export function resolveIncident(
  template: HazardIncidentTemplate,
  state: IncidentState,
  action: string,
  options?: TemplateRuntimeOptions
): IncidentState {
  const errors = validateHazardIncident(template, options?.policy)
  if (errors.length) throw new TemplateValidationError(errors)
  if (
    !finiteNonnegative(state.risk) ||
    !Number.isInteger(state.escalationStep) ||
    state.escalationStep < 0
  )
    throw new TemplateValidationError(['Invalid incident state'])
  const parameters = resolveTemplateRuntime(template, 'resolve-incident', options)
  // Deterministic escalation: advance if risk threshold met and action matches required
  let nextStep = state.escalationStep
  if (
    state.risk >=
      ((parameters.riskThresholds ?? template.escalation.riskThresholds)[state.escalationStep] ??
        Infinity) &&
    template.resolution.requiredActions.includes(action)
  ) {
    nextStep = state.escalationStep + 1
  }
  // Mark as resolved if the last required action is performed at the final step
  const resolved =
    nextStep >= template.escalation.steps.length ||
    (nextStep === template.escalation.steps.length - 1 &&
      template.resolution.requiredActions.includes(action))

  const impact = template.impact
    ? cloneIncidentImpact(template.impact)
    : state.impact
      ? cloneIncidentImpact(state.impact)
      : undefined

  return {
    escalationStep: nextStep,
    risk: state.risk,
    resolved,
    impact,
  }
}

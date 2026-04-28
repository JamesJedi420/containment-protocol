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
  action: string
): IncidentState {
  // Deterministic escalation: advance if risk threshold met and action matches required
  let nextStep = state.escalationStep;
  if (
    state.risk >= (template.escalation.riskThresholds[state.escalationStep] || Infinity) &&
    template.resolution.requiredActions.includes(action)
  ) {
    nextStep = state.escalationStep + 1;
  }
  // Mark as resolved if the last required action is performed at the final step
  const resolved =
    nextStep >= template.escalation.steps.length ||
    (nextStep === template.escalation.steps.length - 1 &&
      template.resolution.requiredActions.includes(action));

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
  };
}

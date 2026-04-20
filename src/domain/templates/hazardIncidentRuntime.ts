// Deterministic runtime logic for hazard/incident templates (SPE-48)
import type { HazardIncidentTemplate } from './hazardIncidentTemplates'

export type IncidentState = {
  escalationStep: number
  risk: number
  resolved: boolean
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
  return {
    escalationStep: nextStep,
    risk: state.risk,
    resolved,
  };
}

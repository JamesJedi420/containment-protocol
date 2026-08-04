import type { DepartmentWorkshopActivationReasonCode } from '../../domain/departmentWorkshopActivation'

export const DEPARTMENT_WORKSHOP_ACTIVATION_UI_TEXT = {
  pageEyebrow: 'Workshop command',
  pageHeading: 'Activate department workshop',
  pageSubtitle:
    'Select a completed construction case and structural route to activate one empty department workshop.',
  backToMirrorLabel: 'Back to workshop mirror',
  backToDeskLabel: 'Back to Operations Desk',
  mirrorLinkLabel: 'Activate workshop',
  departmentLabel: 'Department',
  caseAndRouteLabel: 'Construction case / structural route',
  slotCapacityLabel: 'Slot capacity',
  slotCapacityHint: 'Positive integer. Determines how many work orders can be active simultaneously.',
  submitLabel: 'Activate workshop',
  alreadyActivatedNote: 'This department already has an activated workshop.',
  emptyTitle: 'No eligible construction cases',
  emptyBody:
    'A department workshop can only be activated after a construction case reaches full completion and has structural routes in its map layer. Complete a construction project with a valid structural route first.',
  allActivatedTitle: 'All department workshops are active',
  allActivatedBody:
    'Every registered department already has an active workshop. Use the workshop mirror to inspect current capacity and queued work.',
  resultActivatedLabel: 'Workshop activated.',
  resultUnchangedLabel: 'Workshop already active with identical capacity — no change.',
  resultBlockedLabel: 'Activation blocked.',
  reasonInvalidRequest: 'Invalid activation request — check department, case, route, and slot capacity.',
  reasonInvalidDepartmentRegistry: 'Department registry validation failed.',
  reasonMissingDepartment: 'Department not found in capability registry.',
  reasonMissingCase: 'Construction case not found.',
  reasonConstructionIncomplete: 'Construction is not yet complete for this case.',
  reasonMissingMapLayer: 'No map layer or routes found on this case.',
  reasonMissingRoute: 'Structural route not found in this case\'s map layer.',
  reasonAlreadyActive: 'This department already has an active workshop snapshot.',
  reasonInvalidWorkshopState: 'Workshop state validation failed — possible data integrity issue.',
  reasonUnknown: 'Activation blocked for an unknown reason.',
} as const

export function getDepartmentWorkshopActivationReasonLabel(
  code: DepartmentWorkshopActivationReasonCode
): string {
  const ui = DEPARTMENT_WORKSHOP_ACTIVATION_UI_TEXT
  switch (code) {
    case 'invalid-activation-request':
      return ui.reasonInvalidRequest
    case 'invalid-department-registry':
      return ui.reasonInvalidDepartmentRegistry
    case 'missing-department-definition':
      return ui.reasonMissingDepartment
    case 'missing-construction-case':
      return ui.reasonMissingCase
    case 'construction-incomplete':
      return ui.reasonConstructionIncomplete
    case 'missing-map-layer':
      return ui.reasonMissingMapLayer
    case 'missing-structural-route':
      return ui.reasonMissingRoute
    case 'workshop-already-active':
      return ui.reasonAlreadyActive
    case 'invalid-workshop-state':
      return ui.reasonInvalidWorkshopState
    default:
      return ui.reasonUnknown
  }
}

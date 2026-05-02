// Squad kit assignment and validation seam (SPE-1025 child)
// Domain-only, deterministic, no model widening unless unavoidable
import type { SquadMetadata } from './squadMetadata'
import {
  SquadKitTemplate,
  KitMatchResult,
  KitMismatchResult,
  evaluateSquadKitMatch,
} from './squadKitTemplate'

export interface SquadKitAssignment {
  squadId: string
  kitTemplateId: string | null
}

export type SquadKitAssignmentResult =
  | { ok: true; assignment: SquadKitAssignment }
  | { ok: false; error: SquadKitAssignmentFailure }

export type SquadKitAssignmentFailure =
  | 'invalid_squad_id'
  | 'invalid_kit_template_id'
  | 'no_assignment_to_clear'

// Assign a kit template to a squad
export function assignSquadKit(
  squad: SquadMetadata,
  kitTemplate: SquadKitTemplate
): SquadKitAssignmentResult {
  if (!squad?.squadId) return { ok: false, error: 'invalid_squad_id' }
  if (!kitTemplate?.id) return { ok: false, error: 'invalid_kit_template_id' }
  return {
    ok: true,
    assignment: {
      squadId: squad.squadId,
      kitTemplateId: kitTemplate.id,
    },
  }
}

// Clear a kit assignment
type ClearOptions = { currentAssignment?: SquadKitAssignment }
export function clearSquadKitAssignment(
  squad: SquadMetadata,
  opts?: ClearOptions
): SquadKitAssignmentResult {
  if (!squad?.squadId) return { ok: false, error: 'invalid_squad_id' }
  if (opts?.currentAssignment && opts.currentAssignment.kitTemplateId == null)
    return { ok: false, error: 'no_assignment_to_clear' }
  return {
    ok: true,
    assignment: {
      squadId: squad.squadId,
      kitTemplateId: null,
    },
  }
}

// Validate a squad + kit assignment
export type SquadKitAssignmentValidation =
  | { status: 'valid'; result: KitMatchResult }
  | { status: 'mismatch'; result: KitMismatchResult }

export function validateSquadKitAssignment(
  kitTemplate: SquadKitTemplate,
  squadItemTags: readonly string[]
): SquadKitAssignmentValidation {
  const evalResult = kitTemplate ? evaluateSquadKitMatch(kitTemplate, squadItemTags) : null
  if (!evalResult) throw new Error('Invalid kit template or squad item tags')
  if (evalResult.status === 'match') {
    return { status: 'valid', result: evalResult }
  }
  return { status: 'mismatch', result: evalResult as KitMismatchResult }
}

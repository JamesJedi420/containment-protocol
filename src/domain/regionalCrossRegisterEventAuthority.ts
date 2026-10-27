/**
 * SPE-3417 — contradiction check: regional cross-register event application.
 *
 * Pure evidence catalog only. Does not apply events, mutate GameState, or
 * authorize a cross-register event engine. SPE-1090 / SPE-2273 remain
 * translation/trace owners, not regional data authorities.
 */

import stepRowsJson from './regionalCrossRegisterEventAuthority.steps.json'

export const REGIONAL_CROSS_REGISTER_CHECK_ID = 'SPE-3417' as const

export type RegionalCrossRegisterDisposition =
  | 'already_covered_no_update'
  | 'bounded_repair_within_existing_owner'
  | 'confirmed_missing_implementation_slice'
  | 'no_justified_feature'

export type RegionalStateFamily =
  | 'plot_claim'
  | 'civic_condition'
  | 'facility_lifecycle'
  | 'facility_staffing'
  | 'compound_event_composition'
  | 'cross_system_translation'
  | 'store_orchestration'
  | 'projection_ui'
  | 'zone_spanning_site'
  | 'facility_maintenance_atomic'

export interface RegionalAuthorityStep {
  readonly stepId: string
  readonly eventStep: string
  readonly ownerIssueId: string
  readonly stateFamily: RegionalStateFamily
  /** Code/test/save contract present on current main, or explicitly absent. */
  readonly contractStatus: 'present' | 'absent' | 'partial_narrow'
  readonly codeOrTestAnchor: string
  readonly expectedSourceState: string
  readonly consumerProjection: string
  readonly observedInvariantOrGap: string
  readonly disposition: RegionalCrossRegisterDisposition
  readonly verificationOwnerIssueId: string
}

type StepRow = readonly [
  string,
  string,
  string,
  RegionalStateFamily,
  RegionalAuthorityStep['contractStatus'],
  string,
  string,
  string,
  string,
  RegionalCrossRegisterDisposition,
  string,
]

function rowToStep(row: StepRow): RegionalAuthorityStep {
  return Object.freeze({
    stepId: row[0],
    eventStep: row[1],
    ownerIssueId: row[2],
    stateFamily: row[3],
    contractStatus: row[4],
    codeOrTestAnchor: row[5],
    expectedSourceState: row[6],
    consumerProjection: row[7],
    observedInvariantOrGap: row[8],
    disposition: row[9],
    verificationOwnerIssueId: row[10],
  })
}

/**
 * Evidence matrix for a hypothetical compound regional event that would
 * touch plot + civic + facility families. Row data lives in the adjacent
 * JSON fixture so docs do not restate the full matrix.
 */
export const REGIONAL_CROSS_REGISTER_AUTHORITY_STEPS: readonly RegionalAuthorityStep[] =
  Object.freeze((stepRowsJson as StepRow[]).map(rowToStep))

export interface RegionalCrossRegisterCheckDecision {
  readonly checkId: typeof REGIONAL_CROSS_REGISTER_CHECK_ID
  readonly overallDisposition: RegionalCrossRegisterDisposition
  readonly summary: string
  readonly candidateFollowUps: readonly string[]
}

/** Authoritative SPE-3417 closure decision (evidence-only). */
export function decideRegionalCrossRegisterEventAuthority(): RegionalCrossRegisterCheckDecision {
  return Object.freeze({
    checkId: REGIONAL_CROSS_REGISTER_CHECK_ID,
    overallDisposition: 'no_justified_feature',
    summary:
      'A single regional event cannot currently mutate plot, civic, and facility registers through canonical authorities because SPE-3354 / SPE-3357 / SPE-1503 durable systems are absent. Shipped SPE-2273, SPE-1606, SPE-3184, and SPE-3359 prove narrow single-family or projection-only patterns. SPE-1090 must not absorb a universal cross-register event engine. Future multi-family orchestration remains candidate input under the regional/compound parents after those registers exist — not authorized by this check.',
    candidateFollowUps: Object.freeze([
      'After SPE-3354 plot register ships: evaluate a producer→plot mutation adapter under SPE-3354 (not SPE-1090).',
      'After SPE-3357 civic ledger ships: evaluate a producer→civic mutation adapter under SPE-3357.',
      'After SPE-1503 compound composition ships: evaluate ordered multi-family dispatch as a SPE-1503 consumer seam, still calling per-family owners.',
    ]),
  })
}

export function listStepsByDisposition(
  disposition: RegionalCrossRegisterDisposition,
): readonly RegionalAuthorityStep[] {
  return Object.freeze(
    REGIONAL_CROSS_REGISTER_AUTHORITY_STEPS.filter((step) => step.disposition === disposition),
  )
}

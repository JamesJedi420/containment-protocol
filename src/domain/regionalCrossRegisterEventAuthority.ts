/**
 * SPE-3417 — contradiction check: regional cross-register event application.
 *
 * Pure evidence catalog only. Does not apply events, mutate GameState, or
 * authorize a cross-register event engine. SPE-1090 / SPE-2273 remain
 * translation/trace owners, not regional data authorities.
 */

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
  stepId: string,
  eventStep: string,
  ownerIssueId: string,
  stateFamily: RegionalStateFamily,
  contractStatus: RegionalAuthorityStep['contractStatus'],
  codeOrTestAnchor: string,
  expectedSourceState: string,
  consumerProjection: string,
  observedInvariantOrGap: string,
  disposition: RegionalCrossRegisterDisposition,
  verificationOwnerIssueId: string,
]

const STEP_ROWS: readonly StepRow[] = [
  [
    'R1',
    'Source incident / regional event producer',
    'SPE-1071',
    'compound_event_composition',
    'absent',
    'No production regional multi-family event producer; SPE-1503 Backlog',
    'Authoritative event identity + target refs',
    'N/A until producer exists',
    'Cannot prove multi-register application without a real producer',
    'confirmed_missing_implementation_slice',
    'SPE-1503',
  ],
  [
    'R2',
    'Compound result composition',
    'SPE-1503',
    'compound_event_composition',
    'absent',
    'SPE-1503 Backlog; no compose module on main',
    'Ordered multi-pressure composition packet',
    'Debug/authoring composition surface (deferred)',
    'No compound resolver to sequence cross-family effects',
    'confirmed_missing_implementation_slice',
    'SPE-1503',
  ],
  [
    'R3',
    'Cross-system translation / morphism trace',
    'SPE-2273',
    'cross_system_translation',
    'partial_narrow',
    'src/domain/crossSystemTransformationRegistry.ts (pure; no GameState persistence)',
    'Object refs + morphism chain only',
    'SPE-3471 / SPE-3415 / SPE-3390 consume refs; not event apply',
    'Registry must not become a durable multi-register event applicator',
    'already_covered_no_update',
    'SPE-1090',
  ],
  [
    'R4',
    'Regional plot / land-claim mutation',
    'SPE-3354',
    'plot_claim',
    'absent',
    'SPE-3354 Backlog; no plot/claim GameState register on main',
    'Durable plot identity + claim/buildability',
    'SPE-1104 map knowledge separate from hidden truth (deferred)',
    'No plot register for a regional event to mutate',
    'confirmed_missing_implementation_slice',
    'SPE-3354',
  ],
  [
    'R5',
    'Regional civic wellness / atrophy mutation',
    'SPE-3357',
    'civic_condition',
    'absent',
    'SPE-3357 Backlog; no civic-condition ledger on main',
    'Durable wellness/unrest/atrophy record',
    'Turn/map warnings (deferred)',
    'No civic ledger for a regional event to mutate',
    'confirmed_missing_implementation_slice',
    'SPE-3357',
  ],
  [
    'R6',
    'Facility instance / lifecycle mutation',
    'SPE-1564',
    'facility_lifecycle',
    'partial_narrow',
    'src/domain/facilityLifecycle.ts + SPE-3380 kernel; SPE-1564 umbrella Backlog',
    'FacilityInstance status/history under lifecycle owner',
    'SPE-3359 facility register projection (read-only)',
    'Facility mutations stay owner-local; no regional-event entry point',
    'already_covered_no_update',
    'SPE-1564',
  ],
  [
    'R7',
    'Staffing / workforce mutation',
    'SPE-1058',
    'facility_staffing',
    'partial_narrow',
    'Specialist labor registry shipped; SPE-1058 umbrella Backlog',
    'Canonical staffing/labor under staff owners',
    'Agency staffing projections',
    'No regional-event → staffing applicator',
    'already_covered_no_update',
    'SPE-1058',
  ],
  [
    'R8',
    'Store orchestration of multi-family apply',
    'SPE-45',
    'store_orchestration',
    'partial_narrow',
    'gameStore may call single-family adapters (e.g. applyFacilityMaintenanceRecovery)',
    'Coordinates owner adapters; no new domain rules',
    'N/A',
    'No store path applies plot+civic+facility from one regional event id',
    'no_justified_feature',
    'SPE-45',
  ],
  [
    'R9',
    'Narrow zone-spanning site event (facility topology only)',
    'SPE-1606',
    'zone_spanning_site',
    'present',
    'src/domain/zoneSpanningSiteEvent.ts + contract tests',
    'Pure site-event record over facility section graph',
    'Does not own plot/civic registers',
    'Proven single-topology propagation; must not be generalized into regional ACID bus',
    'already_covered_no_update',
    'SPE-1606',
  ],
  [
    'R10',
    'Narrow atomic facility maintenance apply',
    'SPE-3184',
    'facility_maintenance_atomic',
    'present',
    'src/domain/facilityMaintenanceRecovery.ts applyFacilityMaintenanceRecovery',
    'Debt + dedicated budget mutate together or not at all',
    'Agency facility maintenance view',
    'Exact-once single-family pattern; not a universal multi-register transaction mandate',
    'already_covered_no_update',
    'SPE-3184',
  ],
  [
    'R11',
    'Facility register / map projection',
    'SPE-3359',
    'projection_ui',
    'present',
    'src/features/agency/facilityRegisterView.ts',
    'Read-only projection of facility owner state',
    'FacilityRegisterPanel',
    'Projection retains no separate mutable truth; no hidden plot leak from events',
    'already_covered_no_update',
    'SPE-3359',
  ],
  [
    'R12',
    'Universal cross-register event engine under SPE-1090',
    'SPE-1090',
    'cross_system_translation',
    'absent',
    'Explicitly out of SPE-1090/SPE-2273 persistence scope',
    'N/A — not an authorized owner',
    'N/A',
    'Building a generic event bus / ACID cross-register engine is unjustified',
    'no_justified_feature',
    'SPE-1090',
  ],
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
 * touch plot + civic + facility families. Anchors are relative to the
 * SPE-3417 evidence base SHA recorded in the slice doc.
 */
export const REGIONAL_CROSS_REGISTER_AUTHORITY_STEPS: readonly RegionalAuthorityStep[] =
  Object.freeze(STEP_ROWS.map(rowToStep))

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

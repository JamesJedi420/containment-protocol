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

/**
 * Evidence matrix for a hypothetical compound regional event that would
 * touch plot + civic + facility families. Anchors are relative to the
 * SPE-3417 evidence base SHA recorded in the slice doc.
 */
export const REGIONAL_CROSS_REGISTER_AUTHORITY_STEPS: readonly RegionalAuthorityStep[] =
  Object.freeze([
    Object.freeze({
      stepId: 'R1',
      eventStep: 'Source incident / regional event producer',
      ownerIssueId: 'SPE-1071',
      stateFamily: 'compound_event_composition',
      contractStatus: 'absent',
      codeOrTestAnchor:
        'No production regional multi-family event producer; SPE-1503 Backlog',
      expectedSourceState: 'Authoritative event identity + target refs',
      consumerProjection: 'N/A until producer exists',
      observedInvariantOrGap:
        'Cannot prove multi-register application without a real producer',
      disposition: 'confirmed_missing_implementation_slice',
      verificationOwnerIssueId: 'SPE-1503',
    }),
    Object.freeze({
      stepId: 'R2',
      eventStep: 'Compound result composition',
      ownerIssueId: 'SPE-1503',
      stateFamily: 'compound_event_composition',
      contractStatus: 'absent',
      codeOrTestAnchor: 'SPE-1503 Backlog; no compose module on main',
      expectedSourceState: 'Ordered multi-pressure composition packet',
      consumerProjection: 'Debug/authoring composition surface (deferred)',
      observedInvariantOrGap: 'No compound resolver to sequence cross-family effects',
      disposition: 'confirmed_missing_implementation_slice',
      verificationOwnerIssueId: 'SPE-1503',
    }),
    Object.freeze({
      stepId: 'R3',
      eventStep: 'Cross-system translation / morphism trace',
      ownerIssueId: 'SPE-2273',
      stateFamily: 'cross_system_translation',
      contractStatus: 'partial_narrow',
      codeOrTestAnchor:
        'src/domain/crossSystemTransformationRegistry.ts (pure; no GameState persistence)',
      expectedSourceState: 'Object refs + morphism chain only',
      consumerProjection: 'SPE-3471 / SPE-3415 / SPE-3390 consume refs; not event apply',
      observedInvariantOrGap:
        'Registry must not become a durable multi-register event applicator',
      disposition: 'already_covered_no_update',
      verificationOwnerIssueId: 'SPE-1090',
    }),
    Object.freeze({
      stepId: 'R4',
      eventStep: 'Regional plot / land-claim mutation',
      ownerIssueId: 'SPE-3354',
      stateFamily: 'plot_claim',
      contractStatus: 'absent',
      codeOrTestAnchor: 'SPE-3354 Backlog; no plot/claim GameState register on main',
      expectedSourceState: 'Durable plot identity + claim/buildability',
      consumerProjection: 'SPE-1104 map knowledge separate from hidden truth (deferred)',
      observedInvariantOrGap: 'No plot register for a regional event to mutate',
      disposition: 'confirmed_missing_implementation_slice',
      verificationOwnerIssueId: 'SPE-3354',
    }),
    Object.freeze({
      stepId: 'R5',
      eventStep: 'Regional civic wellness / atrophy mutation',
      ownerIssueId: 'SPE-3357',
      stateFamily: 'civic_condition',
      contractStatus: 'absent',
      codeOrTestAnchor: 'SPE-3357 Backlog; no civic-condition ledger on main',
      expectedSourceState: 'Durable wellness/unrest/atrophy record',
      consumerProjection: 'Turn/map warnings (deferred)',
      observedInvariantOrGap: 'No civic ledger for a regional event to mutate',
      disposition: 'confirmed_missing_implementation_slice',
      verificationOwnerIssueId: 'SPE-3357',
    }),
    Object.freeze({
      stepId: 'R6',
      eventStep: 'Facility instance / lifecycle mutation',
      ownerIssueId: 'SPE-1564',
      stateFamily: 'facility_lifecycle',
      contractStatus: 'partial_narrow',
      codeOrTestAnchor:
        'src/domain/facilityLifecycle.ts + SPE-3380 kernel; SPE-1564 umbrella Backlog',
      expectedSourceState: 'FacilityInstance status/history under lifecycle owner',
      consumerProjection: 'SPE-3359 facility register projection (read-only)',
      observedInvariantOrGap:
        'Facility mutations stay owner-local; no regional-event entry point',
      disposition: 'already_covered_no_update',
      verificationOwnerIssueId: 'SPE-1564',
    }),
    Object.freeze({
      stepId: 'R7',
      eventStep: 'Staffing / workforce mutation',
      ownerIssueId: 'SPE-1058',
      stateFamily: 'facility_staffing',
      contractStatus: 'partial_narrow',
      codeOrTestAnchor: 'Specialist labor registry shipped; SPE-1058 umbrella Backlog',
      expectedSourceState: 'Canonical staffing/labor under staff owners',
      consumerProjection: 'Agency staffing projections',
      observedInvariantOrGap: 'No regional-event → staffing applicator',
      disposition: 'already_covered_no_update',
      verificationOwnerIssueId: 'SPE-1058',
    }),
    Object.freeze({
      stepId: 'R8',
      eventStep: 'Store orchestration of multi-family apply',
      ownerIssueId: 'SPE-45',
      stateFamily: 'store_orchestration',
      contractStatus: 'partial_narrow',
      codeOrTestAnchor:
        'gameStore may call single-family adapters (e.g. applyFacilityMaintenanceRecovery)',
      expectedSourceState: 'Coordinates owner adapters; no new domain rules',
      consumerProjection: 'N/A',
      observedInvariantOrGap:
        'No store path applies plot+civic+facility from one regional event id',
      disposition: 'no_justified_feature',
      verificationOwnerIssueId: 'SPE-45',
    }),
    Object.freeze({
      stepId: 'R9',
      eventStep: 'Narrow zone-spanning site event (facility topology only)',
      ownerIssueId: 'SPE-1606',
      stateFamily: 'zone_spanning_site',
      contractStatus: 'present',
      codeOrTestAnchor: 'src/domain/zoneSpanningSiteEvent.ts + contract tests',
      expectedSourceState: 'Pure site-event record over facility section graph',
      consumerProjection: 'Does not own plot/civic registers',
      observedInvariantOrGap:
        'Proven single-topology propagation; must not be generalized into regional ACID bus',
      disposition: 'already_covered_no_update',
      verificationOwnerIssueId: 'SPE-1606',
    }),
    Object.freeze({
      stepId: 'R10',
      eventStep: 'Narrow atomic facility maintenance apply',
      ownerIssueId: 'SPE-3184',
      stateFamily: 'facility_maintenance_atomic',
      contractStatus: 'present',
      codeOrTestAnchor:
        'src/domain/facilityMaintenanceRecovery.ts applyFacilityMaintenanceRecovery',
      expectedSourceState: 'Debt + dedicated budget mutate together or not at all',
      consumerProjection: 'Agency facility maintenance view',
      observedInvariantOrGap:
        'Exact-once single-family pattern; not a universal multi-register transaction mandate',
      disposition: 'already_covered_no_update',
      verificationOwnerIssueId: 'SPE-3184',
    }),
    Object.freeze({
      stepId: 'R11',
      eventStep: 'Facility register / map projection',
      ownerIssueId: 'SPE-3359',
      stateFamily: 'projection_ui',
      contractStatus: 'present',
      codeOrTestAnchor: 'src/features/agency/facilityRegisterView.ts',
      expectedSourceState: 'Read-only projection of facility owner state',
      consumerProjection: 'FacilityRegisterPanel',
      observedInvariantOrGap:
        'Projection retains no separate mutable truth; no hidden plot leak from events',
      disposition: 'already_covered_no_update',
      verificationOwnerIssueId: 'SPE-3359',
    }),
    Object.freeze({
      stepId: 'R12',
      eventStep: 'Universal cross-register event engine under SPE-1090',
      ownerIssueId: 'SPE-1090',
      stateFamily: 'cross_system_translation',
      contractStatus: 'absent',
      codeOrTestAnchor: 'Explicitly out of SPE-1090/SPE-2273 persistence scope',
      expectedSourceState: 'N/A — not an authorized owner',
      consumerProjection: 'N/A',
      observedInvariantOrGap:
        'Building a generic event bus / ACID cross-register engine is unjustified',
      disposition: 'no_justified_feature',
      verificationOwnerIssueId: 'SPE-1090',
    }),
  ])

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

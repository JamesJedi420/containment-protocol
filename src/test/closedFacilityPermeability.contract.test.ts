import { describe, expect, it } from 'vitest'
import {
  CLOSED_FACILITY_BLACK_SITE_WARD_ID,
  advanceSealedFacilityAlertState,
  authoredBlackSiteWardPermeabilityProfile,
  classifyStaffEntryPolicy,
  discoverInformalRoomUse,
  inferEmergencyDeviceSilence,
  projectClosedFacilityPermeabilityProfile,
  projectControlledToolAccountability,
  projectCustodyIncidentPressure,
  projectSensitiveContractorExposure,
  projectTemporarySecureZone,
  reconstructImpossibleAccessScene,
  resolveBreachPathContradiction,
} from '../domain/closedFacilityPermeability'

describe('SPE-1263 closed-facility permeability', () => {
  it('shows a meaningful gap between formal security and actual permeability on the black-site ward', () => {
    const profile = authoredBlackSiteWardPermeabilityProfile()
    expect(profile.facilityId).toBe(CLOSED_FACILITY_BLACK_SITE_WARD_ID)
    expect(profile.formalSecurity).toBe('maximum')
    expect(profile.actualPermeability).toBe('porous')
    expect(profile.gapMeaningful).toBe(true)
    expect(profile.leakChannels).toEqual(
      expect.arrayContaining(['hidden_route', 'tool_drift', 'staff_corruption', 'blind_spot'])
    )
  })

  it('fails closed on malformed permeability profiles', () => {
    expect(projectClosedFacilityPermeabilityProfile(null)).toBeUndefined()
    expect(
      projectClosedFacilityPermeabilityProfile({
        facilityId: CLOSED_FACILITY_BLACK_SITE_WARD_ID,
        formalSecurity: 'maximum',
        actualPermeability: 'porous',
        leakChannels: ['not_a_channel'],
      })
    ).toBeUndefined()
  })

  it('does not flag aligned maximum/sealed profiles as a meaningful gap', () => {
    const aligned = projectClosedFacilityPermeabilityProfile({
      facilityId: 'facility:aligned-ward',
      formalSecurity: 'maximum',
      actualPermeability: 'sealed',
      leakChannels: ['rumor_leakage'],
    })
    expect(aligned?.gapMeaningful).toBe(false)

    const lowSupervised = projectClosedFacilityPermeabilityProfile({
      facilityId: 'facility:low-supervised',
      formalSecurity: 'low',
      actualPermeability: 'supervised',
      leakChannels: ['blind_spot'],
    })
    expect(lowSupervised?.gapMeaningful).toBe(false)
  })

  it('leaves a scene unexplained by known locks, watch, and routes until hidden permeability is considered', () => {
    const unexplained = reconstructImpossibleAccessScene({
      sceneId: 'scene:empty-isolation-egress',
      knownLockIds: ['lock:cell-7'],
      watchCoverageIds: ['watch:corridor-a'],
      knownRouteIds: ['route:main-corridor'],
      observedAccessRouteId: 'route:service-void',
    })
    expect(unexplained).toEqual({
      sceneId: 'scene:empty-isolation-egress',
      explanation: 'unexplained_by_known_controls',
      observedAccessRouteId: 'route:service-void',
      knownControlsExplainAccess: false,
    })

    const explained = reconstructImpossibleAccessScene({
      sceneId: 'scene:empty-isolation-egress',
      knownLockIds: ['lock:cell-7'],
      watchCoverageIds: ['watch:corridor-a'],
      knownRouteIds: ['route:main-corridor'],
      observedAccessRouteId: 'route:service-void',
      hiddenPermeabilityChannel: 'hidden_route',
    })
    expect(explained?.explanation).toBe('explained_by_hidden_permeability')
    expect(explained?.hiddenPermeabilityChannel).toBe('hidden_route')
  })

  it('lets staff complicity resolve an otherwise impossible access scene and preserves channel evidence', () => {
    const result = reconstructImpossibleAccessScene({
      sceneId: 'scene:panic-quiet',
      knownLockIds: ['lock:intake'],
      watchCoverageIds: ['watch:intake'],
      knownRouteIds: ['route:intake-front'],
      observedAccessRouteId: 'route:staff-only-lift',
      staffComplicityRef: 'staff:warden-aide-3',
      hiddenPermeabilityChannel: 'undocumented_access',
    })
    expect(result?.explanation).toBe('explained_by_staff_complicity')
    expect(result?.staffComplicityRef).toBe('staff:warden-aide-3')
    expect(result?.hiddenPermeabilityChannel).toBe('undocumented_access')
  })

  it('requires authored lock and watch inventories before known routes explain access', () => {
    const incomplete = reconstructImpossibleAccessScene({
      sceneId: 'scene:route-only',
      knownLockIds: [],
      watchCoverageIds: ['watch:corridor-a'],
      knownRouteIds: ['route:main-corridor'],
      observedAccessRouteId: 'route:main-corridor',
    })
    expect(incomplete?.knownControlsExplainAccess).toBe(false)
    expect(incomplete?.explanation).toBe('unexplained_by_known_controls')
  })

  it('changes impossible-access reconstruction when an as-found map contradiction appears', () => {
    const result = resolveBreachPathContradiction({
      pathId: 'path:ward-east',
      asDesignedRouteIds: ['route:main-corridor', 'route:intake-front'],
      asFoundRouteIds: ['route:main-corridor', 'route:service-void'],
      impossibleAccessObservedRouteId: 'route:service-void',
    })
    expect(result).toMatchObject({
      hasMapContradiction: true,
      reconstructionChanged: true,
      asDesignedExplainsAccess: false,
      asFoundExplainsAccess: true,
      undocumentedShortcutIds: ['route:service-void'],
    })
  })

  it('detects reconstruction change when an as-designed route is missing as-found', () => {
    const result = resolveBreachPathContradiction({
      pathId: 'path:ward-west',
      asDesignedRouteIds: ['route:main-corridor', 'route:service-void'],
      asFoundRouteIds: ['route:main-corridor'],
      impossibleAccessObservedRouteId: 'route:service-void',
    })
    expect(result).toMatchObject({
      hasMapContradiction: true,
      reconstructionChanged: true,
      asDesignedExplainsAccess: true,
      asFoundExplainsAccess: false,
    })
  })

  it('projects custody pressure distinct from ordinary lock failure', () => {
    const falseCalm = projectCustodyIncidentPressure({
      incidentId: 'custody:isolation-7',
      cellCategory: 'isolation',
      pressureKind: 'false_calm',
    })
    expect(falseCalm).toEqual({
      incidentId: 'custody:isolation-7',
      cellCategory: 'isolation',
      pressureKind: 'false_calm',
      distinctFromOrdinaryLockFailure: true,
      masksActiveBreachPressure: true,
    })

    const lockFailure = projectCustodyIncidentPressure({
      incidentId: 'custody:detention-2',
      cellCategory: 'detention',
      pressureKind: 'lock_failure',
    })
    expect(lockFailure?.distinctFromOrdinaryLockFailure).toBe(false)
  })

  it('treats an untriggered emergency device as material scene evidence', () => {
    const silent = inferEmergencyDeviceSilence({
      deviceId: 'device:panic-cell-7',
      triggered: false,
      inferenceHint: 'coercion',
    })
    expect(silent).toEqual({
      deviceId: 'device:panic-cell-7',
      triggered: false,
      inference: 'coercion',
      materiallyChangesInterpretation: true,
    })

    const triggered = inferEmergencyDeviceSilence({
      deviceId: 'device:panic-cell-7',
      triggered: true,
    })
    expect(triggered?.materiallyChangesInterpretation).toBe(false)
  })

  it('surfaces missing or unexpected controlled tools as evidence and risk', () => {
    const missing = projectControlledToolAccountability({
      toolId: 'tool:bolt-cutters',
      channel: 'maintenance_cart',
      expectedPresent: true,
      observedPresent: false,
      improvised: false,
    })
    expect(missing).toEqual({
      toolId: 'tool:bolt-cutters',
      channel: 'maintenance_cart',
      accountabilityDrift: true,
      evidenceSurface: true,
      riskSurface: true,
    })

    const unexpected = projectControlledToolAccountability({
      toolId: 'tool:key-blank',
      channel: 'work_detail',
      expectedPresent: false,
      observedPresent: true,
      improvised: false,
    })
    expect(unexpected?.accountabilityDrift).toBe(true)
  })

  it('discovers informal coercion beneath an officially labeled room', () => {
    const result = discoverInformalRoomUse({
      roomId: 'room:shower-b',
      officialLabel: 'shower',
      discoveredFunction: 'coercion',
    })
    expect(result).toEqual({
      roomId: 'room:shower-b',
      officialLabel: 'shower',
      discoveredFunction: 'coercion',
      informalFunctionDiscovered: true,
    })
  })

  it('forces remote study for no-staff-entry sites and allows indirect_interface', () => {
    const result = classifyStaffEntryPolicy({
      siteId: 'site:void-annex',
      policy: 'no_staff_entry',
    })
    expect(result).toEqual({
      siteId: 'site:void-annex',
      policy: 'no_staff_entry',
      studyMode: 'remote_study',
      forcesIndirectStudy: true,
    })

    const indirect = classifyStaffEntryPolicy({
      siteId: 'site:void-annex',
      policy: 'hazardous_interior',
      studyMode: 'indirect_interface',
    })
    expect(indirect?.studyMode).toBe('indirect_interface')
    expect(indirect?.forcesIndirectStudy).toBe(true)
  })

  it('advances sealed-facility alert readiness before direct contact', () => {
    const first = advanceSealedFacilityAlertState({
      groupId: 'hostiles:dormant-cell',
      currentState: 'inactive',
      trigger: 'noise',
    })
    expect(first).toMatchObject({
      previousState: 'inactive',
      nextState: 'suspicious',
      readinessIncreased: true,
    })

    const second = advanceSealedFacilityAlertState({
      groupId: 'hostiles:dormant-cell',
      currentState: 'suspicious',
      trigger: 'route_breach',
    })
    expect(second?.nextState).toBe('investigating')

    const third = advanceSealedFacilityAlertState({
      groupId: 'hostiles:dormant-cell',
      currentState: 'investigating',
      trigger: 'environmental_disruption',
    })
    expect(third?.nextState).toBe('ambush_ready')
  })

  it('preserves reduced permeability on a temporary secure zone outside permanent topology', () => {
    const zone = projectTemporarySecureZone({
      zoneId: 'zone:field-vehicle-3',
      kind: 'vehicle',
      formalSecurity: 'high',
      actualPermeability: 'sealed',
    })
    expect(zone).toEqual({
      zoneId: 'zone:field-vehicle-3',
      kind: 'vehicle',
      formalSecurity: 'high',
      actualPermeability: 'sealed',
      outsidePermanentTopology: true,
      reducedPermeabilityPreserved: true,
    })
  })

  it('creates secrecy protection and audit failure for cash-paid sensitive contractors', () => {
    const contractor = projectSensitiveContractorExposure({
      contractorId: 'contractor:quiet-plumber',
      paymentMode: 'cash_paid',
      functionProtectedBySecrecy: true,
    })
    expect(contractor).toEqual({
      contractorId: 'contractor:quiet-plumber',
      paymentMode: 'cash_paid',
      secrecyProtection: true,
      auditProtectionFailure: true,
    })
  })
})

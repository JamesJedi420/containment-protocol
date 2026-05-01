import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { equipAgentItem } from '../domain/sim/equipment'
import {
  applyWardSealsToSealedAnchor,
  applyPreparedSupportProcedure,
  buildPreparedSupportProcedureExpendedFlagKey,
  buildPreparedSupportProcedureMismatchFlagKey,
  buildWardSealAnchorFailureFlagKey,
  buildWardSealAnchorMismatchFlagKey,
  buildWardSealAnchorSuccessFlagKey,
  buildSignalJammerJammedFlagKey,
  buildTemporaryConjuredSupportActiveFlagKey,
  buildTemporaryConjuredSupportExpiredFlagKey,
  buildTemporaryConjuredSupportRuntimeId,
  buildTemporaryConjuredSupportUsedFlagKey,
  expireTemporaryConjuredSupport,
  getPreparedSupportProcedureState,
  getSignalJammerState,
  getTemporaryConjuredSupportState,
  jamSignalJammer,
  repairSignalJammer,
  resolveSupportLoadoutAffordanceIds,
  spawnTemporaryConjuredSupport,
  refreshPreparedSupportProcedure,
  useTemporaryConjuredSupport,
} from '../domain/supportLoadout'

function withCaseTags(state: ReturnType<typeof createStartingState>, tags: string[]) {
  return {
    ...state,
    cases: {
      ...state.cases,
      'case-001': {
        ...state.cases['case-001'],
        tags: [...tags],
        requiredTags: [],
        preferredTags: [],
      },
    },
  }
}

describe('supportLoadout', () => {
  it('tracks a medical prepared procedure through prepared, expended, and refreshed states', () => {
    let state = withCaseTags(createStartingState(), ['medical', 'triage'])
    state.inventory.medkits = 2
    state = equipAgentItem(state, 'a_casey', 'utility1', 'medkits')

    const prepared = getPreparedSupportProcedureState(state, 'case-001', 'a_casey')

    expect(prepared).toMatchObject({
      itemId: 'medkits',
      family: 'medical',
      status: 'prepared',
      reserveStock: 1,
    })

    const applied = applyPreparedSupportProcedure(state, 'case-001', 'a_casey')

    expect(applied.applied).toBe(true)
    expect(applied.outcome).toBe('supported')
    expect(applied.supportState.status).toBe('expended')
    expect(
      applied.state.runtimeState?.encounterState['case-001']?.flags?.[
        buildPreparedSupportProcedureExpendedFlagKey('a_casey', 'medical')
      ]
    ).toBe(true)

    const refreshed = refreshPreparedSupportProcedure(applied.state, 'case-001', 'a_casey')

    expect(refreshed.refreshed).toBe(true)
    expect(refreshed.reason).toBe('refreshed')
    expect(refreshed.supportState.status).toBe('prepared')
    expect(refreshed.state.inventory.medkits).toBe(0)
  })

  it('recognizes containment as the alternate useful prepared support family', () => {
    let state = withCaseTags(createStartingState(), ['occult', 'containment'])
    state.inventory.ward_seals = 2
    state = equipAgentItem(state, 'a_kellan', 'utility1', 'ward_seals')

    const prepared = getPreparedSupportProcedureState(state, 'case-001', 'a_kellan')
    const applied = applyPreparedSupportProcedure(state, 'case-001', 'a_kellan')

    expect(prepared).toMatchObject({
      itemId: 'ward_seals',
      family: 'containment',
      status: 'prepared',
      reserveStock: 1,
    })
    expect(applied.outcome).toBe('supported')
    expect(applied.supportState.status).toBe('expended')
  })

  it('records a deterministic mismatch outcome when the prepared family does not fit the encounter', () => {
    let state = withCaseTags(createStartingState(), ['occult', 'anomaly'])
    state.inventory.medkits = 1
    state = equipAgentItem(state, 'a_casey', 'utility1', 'medkits')

    const applied = applyPreparedSupportProcedure(state, 'case-001', 'a_casey')

    expect(applied.applied).toBe(true)
    expect(applied.outcome).toBe('mismatch')
    expect(applied.supportState.status).toBe('expended')
    expect(
      applied.state.runtimeState?.encounterState['case-001']?.flags?.[
        buildPreparedSupportProcedureMismatchFlagKey('a_casey', 'medical')
      ]
    ).toBe(true)
  })

  it('reports unavailable when utility1 does not carry a supported prepared support item', () => {
    let state = createStartingState()
    state.inventory.signal_jammers = 1
    state = equipAgentItem(state, 'a_rook', 'utility1', 'signal_jammers')

    const supportState = getPreparedSupportProcedureState(state, 'case-001', 'a_rook')

    expect(supportState).toMatchObject({
      itemId: 'signal_jammers',
      status: 'unavailable',
    })
    expect(supportState.reasons).toContain('unsupported-prepared-support-item')
  })

  it('deterministically transitions signal_jammers from functional to jammed in utility1', () => {
    let state = createStartingState()
    state.inventory.signal_jammers = 1
    state = equipAgentItem(state, 'a_rook', 'utility1', 'signal_jammers')

    const before = getSignalJammerState(state, 'case-001', 'a_rook')
    expect(before.status).toBe('functional')

    const jammed = jamSignalJammer(state, 'case-001', 'a_rook')
    expect(jammed.transitioned).toBe(true)
    expect(jammed.outcome).toBe('jammed')
    expect(jammed.jammerState.status).toBe('jammed')
    expect(
      jammed.state.runtimeState?.encounterState['case-001']?.flags?.[
        buildSignalJammerJammedFlagKey('a_rook')
      ]
    ).toBe(true)

    const jammedAgain = jamSignalJammer(jammed.state, 'case-001', 'a_rook')
    expect(jammedAgain.transitioned).toBe(false)
    expect(jammedAgain.outcome).toBe('already-jammed')
    expect(jammedAgain.jammerState.status).toBe('jammed')
  })

  it('denies signal jammer repair when operator capability gate fails', () => {
    let state = createStartingState()
    state.inventory.signal_jammers = 1
    state.inventory.emf_sensors = 1
    state = equipAgentItem(state, 'a_casey', 'utility1', 'signal_jammers')
    state = equipAgentItem(state, 'a_casey', 'utility2', 'emf_sensors')

    const jammed = jamSignalJammer(state, 'case-001', 'a_casey')
    const repaired = repairSignalJammer(jammed.state, 'case-001', 'a_casey')

    expect(repaired.repaired).toBe(false)
    expect(repaired.reason).toBe('missing-capability')
    expect(repaired.jammerState.status).toBe('jammed')
  })

  it('denies signal jammer repair when repair support item gate fails', () => {
    let state = createStartingState()
    state.inventory.signal_jammers = 1
    state = equipAgentItem(state, 'a_rook', 'utility1', 'signal_jammers')

    const jammed = jamSignalJammer(state, 'case-001', 'a_rook')
    const repaired = repairSignalJammer(jammed.state, 'case-001', 'a_rook')

    expect(repaired.repaired).toBe(false)
    expect(repaired.reason).toBe('missing-repair-support-item')
    expect(repaired.jammerState.status).toBe('jammed')
  })

  it('repairs a jammed signal jammer only when both capability and support-item gates pass', () => {
    let state = createStartingState()
    state.inventory.signal_jammers = 1
    state.inventory.emf_sensors = 1
    state = equipAgentItem(state, 'a_rook', 'utility1', 'signal_jammers')
    state = equipAgentItem(state, 'a_rook', 'utility2', 'emf_sensors')

    const jammed = jamSignalJammer(state, 'case-001', 'a_rook')
    const repaired = repairSignalJammer(jammed.state, 'case-001', 'a_rook')

    expect(repaired.repaired).toBe(true)
    expect(repaired.reason).toBe('repaired')
    expect(repaired.jammerState.status).toBe('functional')
    expect(
      repaired.state.runtimeState?.encounterState['case-001']?.flags?.[
        buildSignalJammerJammedFlagKey('a_rook')
      ]
    ).toBe(false)
  })

  it('keeps guard/no-op paths deterministic for missing agent, missing item, and wrong repair state', () => {
    const baseline = createStartingState()

    const missingAgentA = jamSignalJammer(baseline, 'case-001', 'a_missing')
    const missingAgentB = jamSignalJammer(baseline, 'case-001', 'a_missing')
    expect(missingAgentA).toMatchObject({ transitioned: false, outcome: 'unavailable' })
    expect(missingAgentB).toMatchObject({ transitioned: false, outcome: 'unavailable' })
    expect(missingAgentA.jammerState).toEqual(missingAgentB.jammerState)

    let wrongItemState = createStartingState()
    wrongItemState.inventory.medkits = 1
    wrongItemState = equipAgentItem(wrongItemState, 'a_rook', 'utility1', 'medkits')

    const missingJammer = jamSignalJammer(wrongItemState, 'case-001', 'a_rook')
    expect(missingJammer.transitioned).toBe(false)
    expect(missingJammer.outcome).toBe('unavailable')

    let functionalState = createStartingState()
    functionalState.inventory.signal_jammers = 1
    functionalState.inventory.emf_sensors = 1
    functionalState = equipAgentItem(functionalState, 'a_rook', 'utility1', 'signal_jammers')
    functionalState = equipAgentItem(functionalState, 'a_rook', 'utility2', 'emf_sensors')

    const notJammedA = repairSignalJammer(functionalState, 'case-001', 'a_rook')
    const notJammedB = repairSignalJammer(functionalState, 'case-001', 'a_rook')
    expect(notJammedA).toMatchObject({ repaired: false, reason: 'not-jammed' })
    expect(notJammedB).toMatchObject({ repaired: false, reason: 'not-jammed' })
    expect(notJammedA.jammerState).toEqual(notJammedB.jammerState)
  })

  it('applies ward_seals to a sealed/keyed encounter anchor target with deterministic success', () => {
    let state = createStartingState()
    state.inventory.ward_seals = 1
    state.inventory.ritual_components = 1
    state = equipAgentItem(state, 'a_kellan', 'utility1', 'ward_seals')
    state = equipAgentItem(state, 'a_kellan', 'utility2', 'ritual_components')
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      tags: ['encounter-anchor:sealed-keyed'],
      requiredTags: [],
      preferredTags: [],
    }

    const result = applyWardSealsToSealedAnchor(state, 'case-001', 'a_kellan')

    expect(result.applied).toBe(true)
    expect(result.outcome).toBe('success')
    expect(result.supportState.status).toBe('expended')
    expect(
      result.state.runtimeState?.encounterState['case-001']?.flags?.[
        buildWardSealAnchorSuccessFlagKey('a_kellan')
      ]
    ).toBe(true)
    expect(result.state.runtimeState?.encounterState['case-001']?.phase).toBe(
      'support-loadout:ward-seals:anchor:success'
    )
  })

  it('emits failure when carried item gate fails for ward_seals anchor application', () => {
    let state = createStartingState()
    state.inventory.medkits = 1
    state = equipAgentItem(state, 'a_casey', 'utility1', 'medkits')
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      tags: ['encounter-anchor:sealed-keyed'],
      requiredTags: [],
      preferredTags: [],
    }

    const result = applyWardSealsToSealedAnchor(state, 'case-001', 'a_casey')

    expect(result.applied).toBe(false)
    expect(result.outcome).toBe('failure')
    expect(
      result.state.runtimeState?.encounterState['case-001']?.flags?.[
        buildWardSealAnchorFailureFlagKey('a_casey')
      ]
    ).toBe(true)
    expect(result.state.runtimeState?.encounterState['case-001']?.phase).toBe(
      'support-loadout:ward-seals:anchor:failure'
    )
  })

  it('emits mismatch when ward_seals are carried but target family is incompatible', () => {
    let state = createStartingState()
    state.inventory.ward_seals = 1
    state.inventory.ritual_components = 1
    state = equipAgentItem(state, 'a_kellan', 'utility1', 'ward_seals')
    state = equipAgentItem(state, 'a_kellan', 'utility2', 'ritual_components')
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      tags: ['medical', 'triage'],
      requiredTags: [],
      preferredTags: [],
    }

    const result = applyWardSealsToSealedAnchor(state, 'case-001', 'a_kellan')

    expect(result.applied).toBe(false)
    expect(result.outcome).toBe('mismatch')
    expect(result.supportState.status).toBe('expended')
    expect(
      result.state.runtimeState?.encounterState['case-001']?.flags?.[
        buildWardSealAnchorMismatchFlagKey('a_kellan')
      ]
    ).toBe(true)
    expect(result.state.runtimeState?.encounterState['case-001']?.phase).toBe(
      'support-loadout:ward-seals:anchor:mismatch'
    )
  })

  it('keeps deterministic no-op guard path when already applied', () => {
    let state = createStartingState()
    state.inventory.ward_seals = 1
    state.inventory.ritual_components = 1
    state = equipAgentItem(state, 'a_kellan', 'utility1', 'ward_seals')
    state = equipAgentItem(state, 'a_kellan', 'utility2', 'ritual_components')
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      tags: ['encounter-anchor:keyed'],
      requiredTags: [],
      preferredTags: [],
    }

    const first = applyWardSealsToSealedAnchor(state, 'case-001', 'a_kellan')
    const second = applyWardSealsToSealedAnchor(first.state, 'case-001', 'a_kellan')

    expect(first.outcome).toBe('success')
    expect(second.applied).toBe(false)
    expect(second.outcome).toBe('already-applied')
    expect(second.state).toEqual(first.state)
  })

  it('resolves contextual signal_jammers affordances as jam then repair based on runtime state', () => {
    let state = createStartingState()
    state.inventory.signal_jammers = 1
    state.inventory.emf_sensors = 1
    state = equipAgentItem(state, 'a_rook', 'utility1', 'signal_jammers')
    state = equipAgentItem(state, 'a_rook', 'utility2', 'emf_sensors')

    const functionalAffordances = resolveSupportLoadoutAffordanceIds(state, 'case-001', 'a_rook')
    expect(functionalAffordances).toEqual(['support-loadout:signal-jammers:jam'])

    const jammedState = jamSignalJammer(state, 'case-001', 'a_rook').state
    const jammedAffordances = resolveSupportLoadoutAffordanceIds(jammedState, 'case-001', 'a_rook')
    expect(jammedAffordances).toEqual(['support-loadout:signal-jammers:repair'])
  })

  it('resolves ward_seals anchor-apply affordance only when containment target and not already applied', () => {
    let state = createStartingState()
    state.inventory.ward_seals = 1
    state.inventory.ritual_components = 1
    state = equipAgentItem(state, 'a_kellan', 'utility1', 'ward_seals')
    state = equipAgentItem(state, 'a_kellan', 'utility2', 'ritual_components')
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      tags: ['encounter-anchor:sealed'],
      requiredTags: [],
      preferredTags: [],
    }

    const beforeApply = resolveSupportLoadoutAffordanceIds(state, 'case-001', 'a_kellan')
    expect(beforeApply).toEqual(['support-loadout:ward-seals:anchor-apply'])

    const afterApplyState = applyWardSealsToSealedAnchor(state, 'case-001', 'a_kellan').state
    const afterApply = resolveSupportLoadoutAffordanceIds(afterApplyState, 'case-001', 'a_kellan')
    expect(afterApply).toEqual([])
  })

  it('returns no contextual affordances for negative gates and keeps deterministic no-op output', () => {
    let missingCapabilityState = createStartingState()
    missingCapabilityState.inventory.signal_jammers = 1
    missingCapabilityState.inventory.emf_sensors = 1
    missingCapabilityState = equipAgentItem(missingCapabilityState, 'a_casey', 'utility1', 'signal_jammers')
    missingCapabilityState = equipAgentItem(missingCapabilityState, 'a_casey', 'utility2', 'emf_sensors')
    const jammedMissingCapabilityState = jamSignalJammer(
      missingCapabilityState,
      'case-001',
      'a_casey'
    ).state
    expect(resolveSupportLoadoutAffordanceIds(jammedMissingCapabilityState, 'case-001', 'a_casey')).toEqual(
      []
    )

    let missingSupportItemState = createStartingState()
    missingSupportItemState.inventory.signal_jammers = 1
    missingSupportItemState = equipAgentItem(missingSupportItemState, 'a_rook', 'utility1', 'signal_jammers')
    const jammedMissingSupportState = jamSignalJammer(missingSupportItemState, 'case-001', 'a_rook').state
    expect(resolveSupportLoadoutAffordanceIds(jammedMissingSupportState, 'case-001', 'a_rook')).toEqual([])

    let nonTargetWardState = createStartingState()
    nonTargetWardState.inventory.ward_seals = 1
    nonTargetWardState = equipAgentItem(nonTargetWardState, 'a_kellan', 'utility1', 'ward_seals')
    nonTargetWardState.cases['case-001'] = {
      ...nonTargetWardState.cases['case-001'],
      tags: ['medical'],
      requiredTags: [],
      preferredTags: [],
    }
    expect(resolveSupportLoadoutAffordanceIds(nonTargetWardState, 'case-001', 'a_kellan')).toEqual([])

    const baseline = createStartingState()
    const snapshot = JSON.parse(JSON.stringify(baseline)) as ReturnType<typeof createStartingState>
    const noOpA = resolveSupportLoadoutAffordanceIds(baseline, 'case-001', 'a_missing')
    const noOpB = resolveSupportLoadoutAffordanceIds(baseline, 'case-001', 'a_missing')
    expect(noOpA).toEqual([])
    expect(noOpA).toEqual(noOpB)
    expect(baseline).toEqual(snapshot)
  })

  it('resolves the explicit parent->child nested carry path for ward_seals affordance', () => {
    let state = createStartingState()
    state.inventory.ward_seals = 1
    state.inventory.ritual_components = 1
    state = equipAgentItem(state, 'a_kellan', 'utility1', 'ward_seals')
    state = equipAgentItem(state, 'a_kellan', 'utility2', 'ritual_components')
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      tags: ['encounter-anchor:sealed-keyed'],
      requiredTags: [],
      preferredTags: [],
    }

    expect(resolveSupportLoadoutAffordanceIds(state, 'case-001', 'a_kellan')).toEqual([
      'support-loadout:ward-seals:anchor-apply',
    ])
  })

  it('capacity-blocks nested ward_seals carry path when requested units exceed one', () => {
    let state = createStartingState()
    state.inventory.ward_seals = 2
    state.inventory.ritual_components = 1
    state = equipAgentItem(state, 'a_kellan', 'utility1', 'ward_seals')
    state = equipAgentItem(state, 'a_kellan', 'utility2', 'ritual_components')
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      tags: ['encounter-anchor:sealed-keyed'],
      requiredTags: [],
      preferredTags: [],
    }

    expect(resolveSupportLoadoutAffordanceIds(state, 'case-001', 'a_kellan')).toEqual([])

    const applied = applyWardSealsToSealedAnchor(state, 'case-001', 'a_kellan')
    expect(applied.applied).toBe(false)
    expect(applied.outcome).toBe('failure')
    expect(
      applied.state.runtimeState?.encounterState['case-001']?.flags?.[
        buildWardSealAnchorFailureFlagKey('a_kellan')
      ]
    ).toBe(true)
  })

  it('keeps nested carry no-op guards deterministic when parent container path is missing', () => {
    let state = createStartingState()
    state.inventory.ward_seals = 1
    state = equipAgentItem(state, 'a_kellan', 'utility1', 'ward_seals')
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      tags: ['encounter-anchor:sealed-keyed'],
      requiredTags: [],
      preferredTags: [],
    }

    const snapshot = JSON.parse(JSON.stringify(state)) as ReturnType<typeof createStartingState>
    const noOpA = resolveSupportLoadoutAffordanceIds(state, 'case-001', 'a_kellan')
    const noOpB = resolveSupportLoadoutAffordanceIds(state, 'case-001', 'a_kellan')

    expect(noOpA).toEqual([])
    expect(noOpA).toEqual(noOpB)
    expect(state).toEqual(snapshot)
  })

  it('spawns one deterministic temporary conjured support runtime identity and marks active state', () => {
    let state = createStartingState()
    state.inventory.warding_kits = 1
    state = equipAgentItem(state, 'a_kellan', 'utility1', 'warding_kits')

    const spawn = spawnTemporaryConjuredSupport(state, 'case-001', 'a_kellan')
    const runtimeId = buildTemporaryConjuredSupportRuntimeId('case-001', 'a_kellan')

    expect(spawn.spawned).toBe(true)
    expect(spawn.reason).toBe('spawned')
    expect(spawn.conjuredState).toMatchObject({
      itemId: 'warding_kits',
      status: 'active',
      runtimeId,
    })
    expect(
      spawn.state.runtimeState?.encounterState['case-001']?.flags?.[
        buildTemporaryConjuredSupportActiveFlagKey('a_kellan')
      ]
    ).toBe(true)
  })

  it('allows one execution-time use only while temporary conjured support is active', () => {
    let state = createStartingState()
    state.inventory.warding_kits = 1
    state = equipAgentItem(state, 'a_kellan', 'utility1', 'warding_kits')
    const runtimeId = buildTemporaryConjuredSupportRuntimeId('case-001', 'a_kellan')

    const beforeSpawnUse = useTemporaryConjuredSupport(state, 'case-001', 'a_kellan')
    expect(beforeSpawnUse.used).toBe(false)
    expect(beforeSpawnUse.reason).toBe('not-active')

    const spawned = spawnTemporaryConjuredSupport(state, 'case-001', 'a_kellan')
    const activeUse = useTemporaryConjuredSupport(spawned.state, 'case-001', 'a_kellan')

    expect(activeUse.used).toBe(true)
    expect(activeUse.reason).toBe('used')
    expect(
      activeUse.state.runtimeState?.encounterState['case-001']?.flags?.[
        buildTemporaryConjuredSupportUsedFlagKey(runtimeId)
      ]
    ).toBe(true)
  })

  it('expires temporary conjured support with deterministic cleanup and blocks use afterward', () => {
    let state = createStartingState()
    state.inventory.warding_kits = 1
    state = equipAgentItem(state, 'a_kellan', 'utility1', 'warding_kits')
    const runtimeId = buildTemporaryConjuredSupportRuntimeId('case-001', 'a_kellan')

    const spawned = spawnTemporaryConjuredSupport(state, 'case-001', 'a_kellan')
    const used = useTemporaryConjuredSupport(spawned.state, 'case-001', 'a_kellan')
    const expired = expireTemporaryConjuredSupport(used.state, 'case-001', 'a_kellan')

    expect(expired.expired).toBe(true)
    expect(expired.reason).toBe('expired')
    expect(expired.conjuredState.status).toBe('expired')
    expect(
      expired.state.runtimeState?.encounterState['case-001']?.flags?.[
        buildTemporaryConjuredSupportActiveFlagKey('a_kellan')
      ]
    ).toBe(false)
    expect(
      expired.state.runtimeState?.encounterState['case-001']?.flags?.[
        buildTemporaryConjuredSupportExpiredFlagKey('a_kellan')
      ]
    ).toBe(true)
    expect(
      expired.state.runtimeState?.encounterState['case-001']?.flags?.[
        buildTemporaryConjuredSupportUsedFlagKey(runtimeId)
      ]
    ).toBe(false)

    const useAfterExpiry = useTemporaryConjuredSupport(expired.state, 'case-001', 'a_kellan')
    expect(useAfterExpiry.used).toBe(false)
    expect(useAfterExpiry.reason).toBe('expired')
  })

  it('keeps repeated spawn/expire calls deterministic no-op guards', () => {
    let state = createStartingState()
    state.inventory.warding_kits = 1
    state = equipAgentItem(state, 'a_kellan', 'utility1', 'warding_kits')

    const firstSpawn = spawnTemporaryConjuredSupport(state, 'case-001', 'a_kellan')
    const secondSpawn = spawnTemporaryConjuredSupport(firstSpawn.state, 'case-001', 'a_kellan')
    expect(secondSpawn.spawned).toBe(false)
    expect(secondSpawn.reason).toBe('already-active')
    expect(secondSpawn.state).toEqual(firstSpawn.state)

    const expired = expireTemporaryConjuredSupport(firstSpawn.state, 'case-001', 'a_kellan')
    const secondExpire = expireTemporaryConjuredSupport(expired.state, 'case-001', 'a_kellan')
    expect(secondExpire.expired).toBe(false)
    expect(secondExpire.reason).toBe('not-active')
    expect(secondExpire.state).toEqual(expired.state)

    const spawnAfterExpiry = spawnTemporaryConjuredSupport(expired.state, 'case-001', 'a_kellan')
    expect(spawnAfterExpiry.spawned).toBe(false)
    expect(spawnAfterExpiry.reason).toBe('already-expired')
  })

  it('reports unavailable conjured state deterministically when item gate is not met', () => {
    const baseline = createStartingState()

    const missingAgentA = getTemporaryConjuredSupportState(baseline, 'case-001', 'a_missing')
    const missingAgentB = getTemporaryConjuredSupportState(baseline, 'case-001', 'a_missing')
    expect(missingAgentA.status).toBe('unavailable')
    expect(missingAgentA).toEqual(missingAgentB)

    let wrongItem = createStartingState()
    wrongItem.inventory.medkits = 1
    wrongItem = equipAgentItem(wrongItem, 'a_rook', 'utility1', 'medkits')
    const wrongItemSpawn = spawnTemporaryConjuredSupport(wrongItem, 'case-001', 'a_rook')
    expect(wrongItemSpawn.spawned).toBe(false)
    expect(wrongItemSpawn.reason).toBe('unavailable')
  })
})
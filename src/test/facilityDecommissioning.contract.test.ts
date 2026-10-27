import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  assessFacilityClosureObligations,
  enterFacilityDecommissionDrawdown,
  finalizeFacilityClosure,
  normalizeFacilityDecommissioning,
  resolveFacilityDecommissionDrawdown,
  stopFacilityIntake,
  type FacilityClosureObligationAttestation,
} from '../domain/facilityDecommissioning'
import { applyFacilityLifecycleTransition } from '../domain/facilityLifecycle'
import type { FacilityInstance, GameState } from '../domain/models'
import { BIOHAZARD_RESPONSE_FACILITY_ID } from '../domain/departmentWorkshopFacilityMapping'
import { hydrateGame, serializeRunExport, parseRunExport } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'

const ID = BIOHAZARD_RESPONSE_FACILITY_ID

function activeFacility(overrides?: Partial<FacilityInstance>): FacilityInstance {
  return {
    facilityId: ID,
    category: 'biohazard_response_lab',
    level: 1,
    maxLevel: 3,
    status: 'active',
    effects: { researchSlots: 2 },
    ...overrides,
  }
}

function game(facility: FacilityInstance, week = 3): GameState {
  const source = createStartingState()
  return {
    ...source,
    week,
    facilityState: {
      facilities: {
        [ID]: facility,
      },
    },
  }
}

function clearObligations(): FacilityClosureObligationAttestation[] {
  return [
    {
      kind: 'custody',
      disposition: 'clear',
      authority: 'SPE-3378',
      sourceRef: 'custody:cleared:1',
    },
    {
      kind: 'transfer',
      disposition: 'clear',
      authority: 'SPE-1020',
      sourceRef: 'transfer:cleared:1',
    },
    {
      kind: 'staffing',
      disposition: 'clear',
      authority: 'SPE-731',
      sourceRef: 'staffing:cleared:1',
    },
    {
      kind: 'dependency',
      disposition: 'clear',
      authority: 'SPE-792',
      sourceRef: 'dependency:cleared:1',
    },
  ]
}

function activateFacility(source: GameState): GameState {
  let state = applyFacilityLifecycleTransition(source, {
    facilityId: ID,
    expectedStatus: 'available',
    transition: 1,
    action: 'begin_construction',
  }).game
  state = applyFacilityLifecycleTransition(state, {
    facilityId: ID,
    expectedStatus: 'constructing',
    transition: 2,
    action: 'submit_construction',
    prerequisites: [
      {
        kind: 'construction_complete',
        authority: 'SPE-110',
        sourceRef: 'verified:construction_complete:2',
        facilityId: ID,
        transition: 2,
        week: state.week,
        verified: true,
      },
    ],
  }).game
  state = applyFacilityLifecycleTransition(state, {
    facilityId: ID,
    expectedStatus: 'inspecting',
    transition: 3,
    action: 'activate',
    prerequisites: [
      {
        kind: 'startup_readiness',
        authority: 'SPE-876',
        sourceRef: 'verified:startup_readiness:3',
        facilityId: ID,
        transition: 3,
        week: state.week,
        verified: true,
      },
    ],
  }).game
  return state
}

describe('SPE-3381 facility phased decommissioning', () => {
  it('stops intake while facility stays active and obligations remain inspectable', () => {
    const facility = activeFacility()
    const stopped = stopFacilityIntake(facility, ID, 4)
    expect(stopped.outcome).toBe('applied')
    expect(stopped.facility?.status).toBe('active')
    expect(stopped.facility?.decommissioning).toEqual({
      version: 1,
      phase: 'intake_stopped',
      facilityId: ID,
      week: 4,
    })
    expect(stopped.phase).toBe('intake_stopped')
    expect(assessFacilityClosureObligations(clearObligations())).toEqual([])
  })

  it('rejects final closure when custody remains pending and mutates nothing', () => {
    const base = activateFacility(game(activeFacility({ status: 'available' }), 2))
    const stopped = stopFacilityIntake(base.facilityState!.facilities[ID], ID, 2)
    const withStop = {
      ...base,
      facilityState: {
        facilities: { [ID]: stopped.facility! },
      },
    }
    const drawdown = enterFacilityDecommissionDrawdown(withStop, ID, 4)
    expect(drawdown.outcome).toBe('applied')
    const before = drawdown.game
    const blocked = finalizeFacilityClosure(before, ID, 5, [
      {
        kind: 'custody',
        disposition: 'pending',
        authority: 'SPE-3378',
        sourceRef: 'custody:pending:1',
      },
      ...clearObligations().slice(1),
    ])
    expect(blocked.outcome).toBe('rejected')
    expect(blocked.blockers).toEqual(['custody_pending'])
    expect(blocked.game).toBe(before)
    expect(blocked.game.facilityState!.facilities[ID].status).toBe('locked')
    expect(blocked.game.facilityState!.facilities[ID].decommissioning).toMatchObject({
      phase: 'drawdown',
    })
  })

  it('rejects missing authority instead of auto-approving closure', () => {
    const blockers = assessFacilityClosureObligations([
      {
        kind: 'custody',
        disposition: 'missing_authority',
        authority: 'SPE-3378',
        sourceRef: 'custody:absent',
      },
      ...clearObligations().slice(1),
    ])
    expect(blockers).toEqual(['custody_missing_authority'])
  })

  it('finalizes closure through SPE-3380 after obligations clear without touching source authorities', () => {
    const base = activateFacility(game(activeFacility({ status: 'available' }), 2))
    const stopped = stopFacilityIntake(base.facilityState!.facilities[ID], ID, 2)
    const withStop = {
      ...base,
      facilityState: { facilities: { [ID]: stopped.facility! } },
    }
    const drawdown = enterFacilityDecommissionDrawdown(withStop, ID, 4)
    expect(drawdown.facility?.status).toBe('locked')
    const closed = finalizeFacilityClosure(drawdown.game, ID, 5, clearObligations())
    expect(closed.outcome).toBe('applied')
    expect(closed.facility?.status).toBe('inactive')
    expect(closed.phase).toBe('closed')
    expect(closed.lifecycle?.receipt?.action).toBe('finalize_closure')
    expect(closed.lifecycle?.receipt?.cause).toBe('closure_obligations_discharged')
    expect(closed.lifecycle?.receipt?.prerequisites).toEqual([
      {
        kind: 'closure_obligations',
        authority: 'SPE-3381',
        sourceRef:
          'closure-obligations:custody:SPE-3378:custody:cleared:1|transfer:SPE-1020:transfer:cleared:1|staffing:SPE-731:staffing:cleared:1|dependency:SPE-792:dependency:cleared:1',
        facilityId: ID,
        transition: 5,
        week: 2,
        verified: true,
      },
    ])
    expect(closed.blockers).toEqual([])
  })

  it('is idempotent on repeated stop/drawdown/closure and rejects failed attempts without mutation', () => {
    const facility = activeFacility()
    const first = stopFacilityIntake(facility, ID, 3)
    const second = stopFacilityIntake(first.facility, ID, 3)
    expect(second.outcome).toBe('unchanged')

    const base = activateFacility(game(activeFacility({ status: 'available' }), 2))
    const stopped = stopFacilityIntake(base.facilityState!.facilities[ID], ID, 2)
    const withStop = {
      ...base,
      facilityState: { facilities: { [ID]: stopped.facility! } },
    }
    const drawdown = enterFacilityDecommissionDrawdown(withStop, ID, 4)
    const drawdownAgain = enterFacilityDecommissionDrawdown(drawdown.game, ID, 4)
    expect(drawdownAgain.outcome).toBe('unchanged')
    expect(drawdownAgain.game).toBe(drawdown.game)

    const closed = finalizeFacilityClosure(drawdown.game, ID, 5, clearObligations())
    const closedAgain = finalizeFacilityClosure(closed.game, ID, 5, clearObligations())
    expect(closedAgain.outcome).toBe('unchanged')
    expect(closedAgain.game).toBe(closed.game)
  })

  it('round-trips decommissioning state through save/load and fails closed on malformed records', () => {
    const base = activateFacility(game(activeFacility({ status: 'available' }), 2))
    const stopped = stopFacilityIntake(base.facilityState!.facilities[ID], ID, 2)
    const withStop = {
      ...base,
      facilityState: { facilities: { [ID]: stopped.facility! } },
    }
    const drawdown = enterFacilityDecommissionDrawdown(withStop, ID, 4)
    const expected = {
      version: 1,
      phase: 'drawdown' as const,
      facilityId: ID,
      week: 2,
    }
    for (const loaded of [
      hydrateGame(drawdown.game),
      loadGameSave(serializeGameSave(drawdown.game)),
      parseRunExport(serializeRunExport(drawdown.game)),
    ]) {
      expect(loaded.facilityState!.facilities[ID].decommissioning).toEqual(expected)
      expect(loaded.facilityState!.facilities[ID].facilityId).toBe(ID)
      expect(loaded.facilityState!.facilities[ID].status).toBe('locked')
    }

    expect(normalizeFacilityDecommissioning({ version: 2, phase: 'drawdown' }, ID)).toEqual({
      version: 1,
      unavailable: true,
    })
    expect(
      normalizeFacilityDecommissioning(
        { version: 1, phase: 'drawdown', facilityId: 'other', week: 1 },
        ID
      )
    ).toEqual({ version: 1, unavailable: true })
  })

  it('keeps independent lifecycle restart path distinct from decommission drawdown', () => {
    const restricted = applyFacilityLifecycleTransition(game(activeFacility(), 2), {
      facilityId: ID,
      expectedStatus: 'active',
      transition: 1,
      action: 'restrict',
    })
    expect(restricted.facility?.status).toBe('locked')
    expect(restricted.receipt?.cause).toBe('operation_restricted')
    const stopped = stopFacilityIntake(activeFacility(), ID, 2)
    const drawdown = enterFacilityDecommissionDrawdown(game(stopped.facility!, 2), ID, 1)
    expect(drawdown.lifecycle?.receipt?.cause).toBe('decommission_drawdown_begun')
  })

  it('rejects pure drawdown resolve when coordinator metadata is malformed', () => {
    const facility = activeFacility({
      decommissioning: {
        version: 2,
        phase: 'intake_stopped',
        facilityId: ID,
        week: 2,
      } as unknown as FacilityInstance['decommissioning'],
    })
    const result = resolveFacilityDecommissionDrawdown(facility, ID, 1, 2)
    expect(result.outcome).toBe('rejected')
    expect(result.blockers).toEqual(['invalid_request'])
    expect(result.facility).toBe(facility)
  })

  it('rejects finalize_closure without drawdown provenance and blocks restart out of drawdown', () => {
    const restricted = applyFacilityLifecycleTransition(game(activeFacility(), 2), {
      facilityId: ID,
      expectedStatus: 'active',
      transition: 1,
      action: 'restrict',
    })
    const bypass = applyFacilityLifecycleTransition(restricted.game, {
      facilityId: ID,
      expectedStatus: 'locked',
      transition: 2,
      action: 'finalize_closure',
    })
    expect(bypass.outcome).toBe('rejected')
    expect(bypass.reason).toBe('inspection_provenance_required')
    expect(bypass.game).toBe(restricted.game)

    const stopped = stopFacilityIntake(activeFacility(), ID, 2)
    const drawdown = enterFacilityDecommissionDrawdown(game(stopped.facility!, 2), ID, 1)
    const restartEscape = applyFacilityLifecycleTransition(drawdown.game, {
      facilityId: ID,
      expectedStatus: 'locked',
      transition: 2,
      action: 'submit_restart',
    })
    expect(restartEscape.outcome).toBe('rejected')
    expect(restartEscape.reason).toBe('inspection_provenance_required')
    expect(restartEscape.game).toBe(drawdown.game)
  })

  it('rejects raw lifecycle closure after drawdown without coordinator obligation proof', () => {
    const stopped = stopFacilityIntake(activeFacility(), ID, 2)
    const drawdown = enterFacilityDecommissionDrawdown(game(stopped.facility!, 2), ID, 1)
    expect(drawdown.outcome).toBe('applied')

    const bypass = applyFacilityLifecycleTransition(drawdown.game, {
      facilityId: ID,
      expectedStatus: 'locked',
      transition: 2,
      action: 'finalize_closure',
    })

    expect(bypass.outcome).toBe('rejected')
    expect(bypass.reason).toBe('missing_prerequisite')
    expect(bypass.game).toBe(drawdown.game)
    expect(bypass.game.facilityState!.facilities[ID].status).toBe('locked')
    expect(bypass.game.facilityState!.facilities[ID].decommissioning).toMatchObject({
      phase: 'drawdown',
    })
  })
})

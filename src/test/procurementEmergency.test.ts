import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { validateOperationEventPayload } from '../domain/events/eventValidation'
import { getProcurementMarketPackets, hasActiveEmergencyGrayMarketWaiver } from '../domain/market'
import {
  AUTHORITY_ROUTE_BLOCKED_JOINT_OVERSIGHT_CLEARANCE,
  AUTHORITY_ROUTE_CRISIS_DIRECTOR_SELF,
  AUTHORITY_ROUTE_JOINT_OVERSIGHT_CLEARANCE_RATIFICATION,
  resolveEmergencyGrayMarketWaiverAuthority,
} from '../domain/procurementEmergencyAuthority'
import {
  INSTITUTION_KEY_JOINT_OVERSIGHT_CONCORDAT,
  normalizeInstitutionKeyForAudit,
} from '../domain/procurementEmergencyInstitution'
import {
  canInvokeEmergencyGrayMarketWaiver,
  invokeEmergencyGrayMarketWaiver,
} from '../domain/procurementEmergency'
import { advanceWeek } from '../domain/sim/advanceWeek'
import { buildMajorIncidentState } from '../domain/strategicState'

/** Single high-stage major incident so aggregate pressure crosses crisis threshold (≥120). */
function crisisSanctionedGame(): ReturnType<typeof createStartingState> {
  const game = createStartingState()
  game.legitimacy = { sanctionLevel: 'sanctioned', falloutRisk: 'none' }
  game.cases['case-001'] = { ...game.cases['case-001'], status: 'resolved' }
  game.cases['case-002'] = { ...game.cases['case-002'], status: 'resolved' }
  game.cases['case-003'] = {
    ...game.cases['case-003'],
    status: 'in_progress',
    stage: 8,
    deadlineRemaining: 0,
    assignedTeamIds: ['t_alpha'],
  }
  expect(buildMajorIncidentState(game).severity).toBe('crisis')
  return game
}

function setPlayerOrganization(game: ReturnType<typeof createStartingState>, organization: string) {
  const runtime = game.runtimeState
  if (!runtime) {
    throw new Error('expected runtimeState')
  }
  game.runtimeState = {
    ...runtime,
    player: { ...runtime.player, organization },
  }
}

describe('SPE-1511 institution-specific emergency procurement authorization', () => {
  it('normalizes legacy display organization labels deterministically', () => {
    expect(normalizeInstitutionKeyForAudit('Containment Protocol')).toBe('containment_protocol')
    expect(normalizeInstitutionKeyForAudit('Joint Oversight Concordat')).toBe(
      INSTITUTION_KEY_JOINT_OVERSIGHT_CONCORDAT
    )
  })

  it('denies Joint Oversight waiver at default clearance while baseline remains eligible (SPE-849 routing)', () => {
    const baseline = crisisSanctionedGame()
    expect(canInvokeEmergencyGrayMarketWaiver(baseline)).toBe(true)

    const oversight = crisisSanctionedGame()
    setPlayerOrganization(oversight, 'Joint Oversight Concordat')
    expect(oversight.clearanceLevel).toBeLessThan(3)
    expect(resolveEmergencyGrayMarketWaiverAuthority(oversight).eligible).toBe(false)
    expect(resolveEmergencyGrayMarketWaiverAuthority(oversight).authorityRoute).toBe(
      AUTHORITY_ROUTE_BLOCKED_JOINT_OVERSIGHT_CLEARANCE
    )
    expect(canInvokeEmergencyGrayMarketWaiver(oversight)).toBe(false)

    const priorLen = oversight.events.length
    const unchanged = invokeEmergencyGrayMarketWaiver(oversight)
    expect(unchanged.events.length).toBe(priorLen)
    expect(unchanged.emergencyGrayMarketWaiverWeek).toBeUndefined()
  })

  it('emits audit institutionKey and baseline authority route when waiver is exercised', () => {
    const game = crisisSanctionedGame()
    const next = invokeEmergencyGrayMarketWaiver(game)
    const audit = next.events[next.events.length - 1]
    expect(audit?.type).toBe('market.emergency_gray_market_waiver_granted')
    if (audit?.type === 'market.emergency_gray_market_waiver_granted') {
      expect(audit.payload.institutionKey).toBe('containment_protocol')
      expect(audit.payload.authorityRoute).toBe(AUTHORITY_ROUTE_CRISIS_DIRECTOR_SELF)
      expect(audit.payload.authorityBasis).toContain('baseline institution')
    }
  })
})

describe('SPE-849 explicit emergency authorization routing', () => {
  it('selects clearance ratification route for Joint Oversight when clearance threshold is met', () => {
    const game = crisisSanctionedGame()
    setPlayerOrganization(game, 'Joint Oversight Concordat')
    game.clearanceLevel = 3

    const auth = resolveEmergencyGrayMarketWaiverAuthority(game)
    expect(auth.eligible).toBe(true)
    expect(auth.authorityRoute).toBe(AUTHORITY_ROUTE_JOINT_OVERSIGHT_CLEARANCE_RATIFICATION)
    expect(auth.authorityBasis).toContain('clearanceLevel 3')

    expect(canInvokeEmergencyGrayMarketWaiver(game)).toBe(true)
    const next = invokeEmergencyGrayMarketWaiver(game)
    const audit = next.events[next.events.length - 1]
    expect(audit?.type).toBe('market.emergency_gray_market_waiver_granted')
    if (audit?.type === 'market.emergency_gray_market_waiver_granted') {
      expect(audit.payload.authorityRoute).toBe(AUTHORITY_ROUTE_JOINT_OVERSIGHT_CLEARANCE_RATIFICATION)
      expect(audit.payload.institutionKey).toBe(INSTITUTION_KEY_JOINT_OVERSIGHT_CONCORDAT)
    }
  })
})

describe('SPE-1524 emergency gray-market waiver', () => {
  it('blocks gray-market broker packet for sanctioned posture without waiver', () => {
    const game = createStartingState()
    game.legitimacy = { sanctionLevel: 'sanctioned', falloutRisk: 'none' }
    const broker = getProcurementMarketPackets(game).find((p) => p.id === 'gray_market_broker')
    expect(broker?.available).toBe(false)
    expect(broker?.blockedReason).toContain('sanctioned')
  })

  it('does not invoke when major-incident pressure is below crisis', () => {
    const game = createStartingState()
    game.legitimacy = { sanctionLevel: 'sanctioned', falloutRisk: 'none' }
    expect(buildMajorIncidentState(game).severity).not.toBe('crisis')
    expect(canInvokeEmergencyGrayMarketWaiver(game)).toBe(false)
    const next = invokeEmergencyGrayMarketWaiver(game)
    expect(next).toBe(game)
  })

  it('does not invoke when posture is not sanctioned', () => {
    const game = crisisSanctionedGame()
    game.legitimacy = { sanctionLevel: 'tolerated', falloutRisk: 'none' }
    expect(canInvokeEmergencyGrayMarketWaiver(game)).toBe(false)
    const priorEvents = game.events.length
    const next = invokeEmergencyGrayMarketWaiver(game)
    expect(next.events.length).toBe(priorEvents)
  })

  it('grants waiver, emits audit event, marks fallout, and unlocks gray-market broker for the week', () => {
    const game = crisisSanctionedGame()
    const prior = game.events.length
    const incident = buildMajorIncidentState(game)

    expect(canInvokeEmergencyGrayMarketWaiver(game)).toBe(true)

    const brokerBefore = getProcurementMarketPackets(game).find(
      (p) => p.id === 'gray_market_broker'
    )
    expect(brokerBefore?.available).toBe(false)

    const next = invokeEmergencyGrayMarketWaiver(game)

    expect(next.emergencyGrayMarketWaiverWeek).toBe(next.week)
    expect(hasActiveEmergencyGrayMarketWaiver(next)).toBe(true)
    expect(next.legitimacy?.falloutRisk).toBe('risk')
    expect(next.legitimacy?.sanctionLevel).toBe('sanctioned')

    expect(next.events.length).toBe(prior + 1)
    const audit = next.events[next.events.length - 1]
    expect(audit?.type).toBe('market.emergency_gray_market_waiver_granted')
    if (audit?.type === 'market.emergency_gray_market_waiver_granted') {
      expect(audit.payload).toMatchObject({
        week: game.week,
        marketWeek: game.market.week,
        crisisPressureScore: incident.pressureScore,
        sanctionLevel: 'sanctioned',
        packetId: 'gray_market_broker',
        falloutRiskApplied: 'risk',
        institutionKey: 'containment_protocol',
        authorityRoute: AUTHORITY_ROUTE_CRISIS_DIRECTOR_SELF,
      })
      expect(audit.payload.authorityBasis).toContain('baseline institution')
    }

    const brokerAfter = getProcurementMarketPackets(next).find((p) => p.id === 'gray_market_broker')
    expect(brokerAfter?.available).toBe(true)
    expect(brokerAfter?.blockedReason).toBeUndefined()

    const parsed = validateOperationEventPayload(
      'market.emergency_gray_market_waiver_granted',
      audit?.payload
    )
    expect(parsed.success).toBe(true)
  })

  it('expires waiver visibility when campaign week advances past grant week', () => {
    const game = crisisSanctionedGame()
    const waived = invokeEmergencyGrayMarketWaiver(game)
    expect(hasActiveEmergencyGrayMarketWaiver(waived)).toBe(true)

    const advancedWeek = { ...waived, week: waived.week + 1 }
    expect(hasActiveEmergencyGrayMarketWaiver(advancedWeek)).toBe(false)

    const broker = getProcurementMarketPackets(advancedWeek).find(
      (p) => p.id === 'gray_market_broker'
    )
    expect(broker?.available).toBe(false)
  })

  it('is idempotent for a second invoke in the same week after waiver recorded', () => {
    const game = crisisSanctionedGame()
    const once = invokeEmergencyGrayMarketWaiver(game)
    const twice = invokeEmergencyGrayMarketWaiver(once)
    expect(twice.events.length).toBe(once.events.length)
    expect(twice).toBe(once)
  })

  it('advanceWeek clears emergencyGrayMarketWaiverWeek after the grant campaign week', () => {
    const base = createStartingState()
    base.emergencyGrayMarketWaiverWeek = base.week
    const next = advanceWeek(base)
    expect(next.week).toBe(base.week + 1)
    expect(next.emergencyGrayMarketWaiverWeek).toBeUndefined()
  })

  it('emits accountability closed once when advancing past the active waiver grant week (SPE-1511)', () => {
    const base = createStartingState()
    base.emergencyGrayMarketWaiverWeek = base.week
    const next = advanceWeek(base)
    const closed = next.events.filter(
      (e) => e.type === 'market.emergency_gray_market_waiver_accountability_closed'
    )
    expect(closed).toHaveLength(1)
    const ev = closed[0]
    expect(ev?.type).toBe('market.emergency_gray_market_waiver_accountability_closed')
    if (ev?.type === 'market.emergency_gray_market_waiver_accountability_closed') {
      expect(ev.payload.week).toBe(base.week + 1)
      expect(ev.payload.waiverGrantWeek).toBe(base.week)
      expect(ev.payload.institutionKey).toBe('containment_protocol')
    }
  })

  it('does not emit accountability closed when clearing a stale waiver week from older saves', () => {
    const base = createStartingState()
    base.week = 12
    base.emergencyGrayMarketWaiverWeek = 9
    const next = advanceWeek(base)
    expect(next.events.filter((e) => e.type === 'market.emergency_gray_market_waiver_accountability_closed')).toHaveLength(
      0
    )
  })

  it('advanceWeek clears stale emergencyGrayMarketWaiverWeek from older saves', () => {
    const base = createStartingState()
    base.week = 12
    base.emergencyGrayMarketWaiverWeek = 9
    const next = advanceWeek(base)
    expect(next.week).toBe(13)
    expect(next.emergencyGrayMarketWaiverWeek).toBeUndefined()
  })
})

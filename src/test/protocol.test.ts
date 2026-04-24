import { describe, it, expect } from 'vitest'
import { evaluateThresholdCourtContact, type ProtocolContactContext } from '../domain/protocol'
import { buildFactionStates } from '../domain/factions'
import { createStartingState } from '../data/startingState'

describe('Threshold Court protocol contact', () => {
  const getThresholdCourt = () => {
    const state = createStartingState()
    // Add the anomaly polity to the state
    const factions = buildFactionStates(state)
    return factions.find(f => f.id === 'threshold_court')!
  }

  it('grants favor for perfect etiquette', () => {
    const faction = getThresholdCourt()
    const context: ProtocolContactContext = {
      actorStanding: 5,
      actorRole: 'envoy',
      protocolObserved: true,
      correctNaming: true,
      acknowledgedRole: true,
    }
    const result = evaluateThresholdCourtContact(faction, context)
    expect(result.outcome).toBe('favor')
    expect(result.reliabilityDelta).toBeGreaterThan(0)
    expect(result.distortionDelta).toBeLessThan(0)
    expect(result.explanation).toMatch(/favor granted/i)
  })

  it('gives partial access for mostly correct etiquette', () => {
    const faction = getThresholdCourt()
    const context: ProtocolContactContext = {
      actorStanding: 5,
      actorRole: 'envoy',
      protocolObserved: true,
      correctNaming: false,
      acknowledgedRole: true,
    }
    const result = evaluateThresholdCourtContact(faction, context)
    expect(result.outcome).toBe('partial')
    expect(result.reliabilityDelta).toBeGreaterThanOrEqual(0)
    expect(result.distortionDelta).toBe(0)
    expect(result.explanation).toMatch(/partial access/i)
  })

  it('restricts cooperation for poor etiquette', () => {
    const faction = getThresholdCourt()
    const context: ProtocolContactContext = {
      actorStanding: 5,
      actorRole: 'envoy',
      protocolObserved: false,
      correctNaming: false,
      acknowledgedRole: true,
    }
    const result = evaluateThresholdCourtContact(faction, context)
    expect(result.outcome).toBe('restricted')
    expect(result.reliabilityDelta).toBeLessThan(0)
    expect(result.distortionDelta).toBeGreaterThan(0)
    expect(result.explanation).toMatch(/restricted cooperation/i)
  })

  it('triggers symbolic offense for total etiquette failure', () => {
    const faction = getThresholdCourt()
    const context: ProtocolContactContext = {
      actorStanding: 5,
      actorRole: 'envoy',
      protocolObserved: false,
      correctNaming: false,
      acknowledgedRole: false,
    }
    const result = evaluateThresholdCourtContact(faction, context)
    expect(result.outcome).toBe('offense')
    expect(result.reliabilityDelta).toBeLessThan(0)
    expect(result.distortionDelta).toBeGreaterThan(0)
    expect(result.explanation).toMatch(/offense/i)
  })
})

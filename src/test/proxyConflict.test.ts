import { describe, it, expect } from 'vitest'
import { evaluateThresholdCourtProxyConflict } from '../domain/proxyConflict'
import { buildFactionStates } from '../domain/factions'
import { createStartingState } from '../data/startingState'

describe('Threshold Court proxy conflict', () => {
  const getThresholdCourt = (distortion: number, agendaPressure: number) => {
    const state = createStartingState()
    // Add the anomaly polity to the state
    const factions = buildFactionStates(state)
    const court = factions.find(f => f.id === 'threshold_court')!
    // Patch state for test
    return { ...court, distortion, agendaPressure }
  }

  it('projects proxy interference when distortion is high', () => {
    const faction = getThresholdCourt(40, 20)
    const result = evaluateThresholdCourtProxyConflict(faction)
    expect(result.effect).toBe('proxy_interference')
    expect(result.explanation).toMatch(/proxy interference/i)
  })

  it('projects proxy interference when agendaPressure is high', () => {
    const faction = getThresholdCourt(10, 80)
    const result = evaluateThresholdCourtProxyConflict(faction)
    expect(result.effect).toBe('proxy_interference')
    expect(result.explanation).toMatch(/proxy interference/i)
  })

  it('does not project interference when stable', () => {
    const faction = getThresholdCourt(10, 10)
    const result = evaluateThresholdCourtProxyConflict(faction)
    expect(result.effect).toBe('none')
    expect(result.explanation).toBe('')
  })
})

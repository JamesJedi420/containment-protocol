import { describe, it, expect } from 'vitest'
import { buildFactionStates } from '../domain/factions'
import { evaluateThresholdCourtContact } from '../domain/protocol'
import { evaluateThresholdCourtProxyConflict } from '../domain/proxyConflict'
import { buildThresholdCourtProtocolNote, buildThresholdCourtProxyConflictNote } from '../domain/reportNotes'
import { createStartingState } from '../data/startingState'

describe('Threshold Court etiquette/proxy integration', () => {
  it('surfaces etiquette and proxy outcomes in report notes during simulation', () => {
    const state = createStartingState()
    // Simulate a contact with perfect etiquette
    const factions = buildFactionStates(state)
    const court = factions.find(f => f.id === 'threshold_court')!
    const contactOutcome = evaluateThresholdCourtContact(court, {
      actorStanding: 5,
      actorRole: 'envoy',
      protocolObserved: true,
      correctNaming: true,
      acknowledgedRole: true,
    })
    const etiquetteNote = buildThresholdCourtProtocolNote(contactOutcome, 1)
    expect(etiquetteNote.content).toMatch(/protocol correctly observed/i)
    // Simulate a proxy-conflict scenario
    const unstableCourt = { ...court, distortion: 50, agendaPressure: 80 }
    const proxyOutcome = evaluateThresholdCourtProxyConflict(unstableCourt)
    const proxyNote = buildThresholdCourtProxyConflictNote(proxyOutcome, 1)
    expect(proxyNote).not.toBeNull()
    expect(proxyNote!.content).toMatch(/proxy interference/i)
  })
})

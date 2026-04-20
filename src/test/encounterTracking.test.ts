// cspell:words frontdesk
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  attachEncounterResolution,
  initializeEncounterTracking,
  listEncounterTracking,
  readEncounterTracking,
  recordEncounterFollowUps,
  selectEncounterTrackingSummary,
  updateEncounterPhase,
  updateEncounterStatus,
} from '../domain/encounterTracking'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'

describe('encounterTracking', () => {
  it('initializes encounter runtime state deterministically', () => {
    const state = initializeEncounterTracking(createStartingState(), 'encounter.alpha', {
      status: 'active',
      phase: 'intro',
      flags: { seeded: true },
    })

    expect(readEncounterTracking(state, 'encounter.alpha')).toMatchObject({
      encounterId: 'encounter.alpha',
      status: 'active',
      phase: 'intro',
      startedWeek: 1,
      lastUpdatedWeek: 1,
      flags: { seeded: true },
    })
  })

  it('tracks explicit phase and status transitions', () => {
    let state = initializeEncounterTracking(createStartingState(), 'encounter.alpha', {
      status: 'available',
      phase: 'seeded',
      startedWeek: 2,
    })

    state = updateEncounterPhase(state, 'encounter.alpha', 'engagement', 3)
    state = updateEncounterStatus(state, 'encounter.alpha', 'resolved', {
      phase: 'closed',
      updatedWeek: 4,
      resolvedWeek: 4,
    })

    expect(readEncounterTracking(state, 'encounter.alpha')).toMatchObject({
      status: 'resolved',
      phase: 'closed',
      startedWeek: 2,
      lastUpdatedWeek: 4,
      resolvedWeek: 4,
    })
  })

  it('attaches resolution metadata and follow-up tracking', () => {
    let state = initializeEncounterTracking(createStartingState(), 'encounter.alpha', {
      status: 'active',
      phase: 'engagement',
    })

    state = attachEncounterResolution(state, 'encounter.alpha', {
      resolutionId: 'hidden-combat.encounter.alpha.4.success',
      outcome: 'success',
      phase: 'resolved_success',
      updatedWeek: 4,
      resolvedWeek: 4,
      followUpIds: ['followup.alpha'],
    })

    state = recordEncounterFollowUps(state, 'encounter.alpha', ['followup.beta'], 4)

    const encounter = readEncounterTracking(state, 'encounter.alpha')

    expect(encounter).toMatchObject({
      status: 'resolved',
      phase: 'resolved_success',
      latestOutcome: 'success',
      lastResolutionId: 'hidden-combat.encounter.alpha.4.success',
      resolvedWeek: 4,
      followUpIds: ['followup.alpha', 'followup.beta'],
    })

    expect(selectEncounterTrackingSummary(encounter!)).toMatchObject({
      id: 'encounter.alpha',
      status: 'resolved',
      latestOutcome: 'success',
      followUpIds: ['followup.alpha', 'followup.beta'],
    })
    expect(listEncounterTracking(state).map((entry) => entry.encounterId)).toEqual(['encounter.alpha'])
  })

  it('round-trips encounter tracking metadata through save/load', () => {
    let state = initializeEncounterTracking(createStartingState(), 'encounter.alpha', {
      status: 'active',
      phase: 'engagement',
      startedWeek: 2,
    })

    state = attachEncounterResolution(state, 'encounter.alpha', {
      resolutionId: 'hidden-combat.encounter.alpha.5.partial',
      outcome: 'partial',
      status: 'active',
      phase: 'aftershock',
      updatedWeek: 5,
      followUpIds: ['frontdesk.encounter.alpha.review'],
    })

    const loaded = loadGameSave(serializeGameSave(state))

    expect(readEncounterTracking(loaded, 'encounter.alpha')).toMatchObject({
      status: 'active',
      phase: 'aftershock',
      startedWeek: 2,
      latestOutcome: 'partial',
      lastResolutionId: 'hidden-combat.encounter.alpha.5.partial',
      followUpIds: ['frontdesk.encounter.alpha.review'],
      lastUpdatedWeek: 5,
    })
  })
})

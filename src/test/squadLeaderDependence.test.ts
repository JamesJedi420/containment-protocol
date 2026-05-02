import { describe, expect, it } from 'vitest'
import { createSquadMetadata } from '../domain/squadMetadata'
import {
  type LeaderState,
  deriveLeaderDependenceProfile,
} from '../domain/squadLeaderDependence'

function makeSquad() {
  const created = createSquadMetadata({
    squadId: 'squad-alpha',
    name: 'Alpha Squad',
    role: 'rapid_response',
    doctrine: 'containment',
    shift: 'night',
    assignedZone: 'zone-north',
    designatedLeaderId: 'a_mina',
  })

  if (!created.ok) {
    throw new Error('Failed to build squad fixture')
  }

  return created.metadata
}

describe('squadLeaderDependence', () => {
  it('returns all full when leader state is present', () => {
    const squad = makeSquad()

    const profile = deriveLeaderDependenceProfile(squad, 'present')

    expect(profile).toEqual({
      doctrineQuality: 'full',
      panicResistance: 'full',
      pursuitDiscipline: 'full',
      deploymentReliability: 'full',
    })
  })

  it('returns degraded/partial profile when leader state is absent', () => {
    const squad = makeSquad()

    const profile = deriveLeaderDependenceProfile(squad, 'absent')

    expect(profile).toEqual({
      doctrineQuality: 'degraded',
      panicResistance: 'degraded',
      pursuitDiscipline: 'partial',
      deploymentReliability: 'partial',
    })
  })

  it('returns distinct unqualified profile with at least doctrine quality differing from absent', () => {
    const squad = makeSquad()

    const absent = deriveLeaderDependenceProfile(squad, 'absent')
    const unqualified = deriveLeaderDependenceProfile(squad, 'unqualified')

    expect(unqualified).toEqual({
      doctrineQuality: 'partial',
      panicResistance: 'full',
      pursuitDiscipline: 'degraded',
      deploymentReliability: 'partial',
    })
    expect(unqualified.doctrineQuality).not.toBe(absent.doctrineQuality)
  })

  it('returns compromised profile with doctrine quality and pursuit discipline set to none', () => {
    const squad = makeSquad()

    const profile = deriveLeaderDependenceProfile(squad, 'compromised')

    expect(profile).toEqual({
      doctrineQuality: 'none',
      panicResistance: 'degraded',
      pursuitDiscipline: 'none',
      deploymentReliability: 'degraded',
    })
  })

  it('is deterministic for identical (squad, leaderState) inputs', () => {
    const squad = makeSquad()

    const first = deriveLeaderDependenceProfile(squad, 'unqualified')
    const second = deriveLeaderDependenceProfile(squad, 'unqualified')

    expect(first).toEqual(second)
  })

  it('does not mutate the provided squad object', () => {
    const squad = makeSquad()
    const before = { ...squad }

    deriveLeaderDependenceProfile(squad, 'compromised')

    expect(squad).toEqual(before)
  })

  it('produces four distinct profiles across all LeaderState values', () => {
    const squad = makeSquad()
    const states: LeaderState[] = ['present', 'absent', 'unqualified', 'compromised']

    const fingerprints = states.map((state) =>
      JSON.stringify(deriveLeaderDependenceProfile(squad, state))
    )

    expect(new Set(fingerprints).size).toBe(4)
  })
})

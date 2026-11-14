import { describe, expect, it } from 'vitest'
import type { Agent } from './agent/models'
import {
  deriveSocialActorProfileFromAgent,
  normalizeSocialActorProfile,
  projectSocialActorProfileForPlayer,
  querySocialActorProfile,
  SOCIAL_ACTOR_PROFILE_VERSION,
  writeSocialActorProfile,
  type SocialActorProfile,
} from './socialActorProfile'

function makeAgent(id: string): Agent {
  return { id } as Agent
}

describe('SPE-3122 SocialActorProfile substrate', () => {
  it('normalizes valid profile and rejects invalid actorId/version', () => {
    const raw = {
      version: SOCIAL_ACTOR_PROFILE_VERSION,
      actorId: 'agent-1',
      disposition: 'cooperative',
      fearPosture: 'low',
      obligationPosture: 'owed',
      loyaltySuspicion: 'loyal',
      socialNeeds: { recognition: 50 },
      affiliations: [{ affiliationId: 'aff-1' }],
      routines: [],
      leverageRefs: [{ leverageId: 'lev-1', concealed: true }],
      socialStress: 20,
      hiddenFields: ['disposition', 'loyaltySuspicion'],
      provenance: { sourceRef: 'test', reason: 'init' },
    }
    const profile = normalizeSocialActorProfile(raw, 'agent-1')
    expect(profile).not.toBeNull()
    expect(profile?.disposition).toBe('cooperative')
    expect(normalizeSocialActorProfile(raw, 'wrong-id')).toBeNull()
    expect(normalizeSocialActorProfile({ ...raw, version: 99 }, 'agent-1')).toBeNull()
  })

  it('projects hidden fields away from player view', () => {
    const agent = makeAgent('a1')
    const profile = deriveSocialActorProfileFromAgent(agent)
    const projected = projectSocialActorProfileForPlayer(profile)
    expect(projected.disposition).toBeUndefined()
    expect(projected.loyaltySuspicion).toBeUndefined()
    expect(projected.actorId).toBe('a1')
    expect(projected.affiliations).toEqual([])
  })

  it('supports distinct profiles for same actor identity authority and mutation with provenance', () => {
    const agent = makeAgent('a1')
    const p1 = deriveSocialActorProfileFromAgent(agent)
    const p2 = {
      ...p1,
      disposition: 'hostile' as const,
      socialStress: 40,
      provenance: { sourceRef: 'interaction', reason: 'stress-event', eventId: 'evt-1' },
    }
    const updated = writeSocialActorProfile(agent, p2, 'evt-1')
    const queried = querySocialActorProfile(updated as any)
    expect(queried?.disposition).toBe('hostile')
    expect(queried?.socialStress).toBe(40)
    // idempotent without new eventId
    const same = writeSocialActorProfile(updated, p2)
    expect(same).toBe(updated)
  })

  it('rejects duplicate or invalid refs and preserves determinism', () => {
    const raw = {
      version: SOCIAL_ACTOR_PROFILE_VERSION,
      actorId: 'a1',
      disposition: 'neutral',
      fearPosture: 'none',
      obligationPosture: 'none',
      loyaltySuspicion: 'neutral',
      socialNeeds: {},
      affiliations: [{ affiliationId: 'dup' }, { affiliationId: 'dup' }, { affiliationId: ' unique ' }],
      routines: [],
      leverageRefs: [],
      socialStress: 0,
      hiddenFields: [],
      provenance: { sourceRef: 'test', reason: 'ok' },
    }
    const profile = normalizeSocialActorProfile(raw, 'a1')
    expect(profile?.affiliations.map((a) => a.affiliationId)).toEqual(['dup', 'unique'])
  })

  it('two actors can carry distinct profiles referencing existing identity', () => {
    const a1 = deriveSocialActorProfileFromAgent(makeAgent('a1'))
    const a2 = deriveSocialActorProfileFromAgent(makeAgent('a2'))
    expect(a1.actorId).toBe('a1')
    expect(a2.actorId).toBe('a2')
    expect(a1).not.toEqual(a2)
  })
})

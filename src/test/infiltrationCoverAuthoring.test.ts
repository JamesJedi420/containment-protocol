import { describe, expect, it } from 'vitest'
import {
  buildInfiltrationCoverProfileFromAuthored,
  buildInfiltrationCoverProfileFromAuthoredRecord,
  type AuthoredInfiltrationCoverProfile,
} from '../domain/infiltrationCoverAuthoring'

describe('infiltrationCoverAuthoring', () => {
  it('returns undefined for empty authored profiles', () => {
    expect(buildInfiltrationCoverProfileFromAuthored(null)).toBeUndefined()
    expect(buildInfiltrationCoverProfileFromAuthored({})).toBeUndefined()
    expect(buildInfiltrationCoverProfileFromAuthored({ claimedRole: 'not-a-role' })).toBeUndefined()
  })

  it('normalizes claimed role, document tier, doctrine band, and route tags', () => {
    const authored: AuthoredInfiltrationCoverProfile = {
      claimedRole: ' uniform_guard ',
      documentTier: 1,
      doctrineBand: 0.42,
      routeViolationTags: [' media ', 'public', ''],
    }

    expect(buildInfiltrationCoverProfileFromAuthored(authored)).toEqual({
      claimedRole: 'uniform_guard',
      documentTier: 1,
      doctrineBand: 0.42,
      routeViolationTags: ['media', 'public'],
    })
  })

  it('buildInfiltrationCoverProfileFromAuthoredRecord rejects non-objects', () => {
    expect(buildInfiltrationCoverProfileFromAuthoredRecord('uniform_guard')).toBeUndefined()
    expect(
      buildInfiltrationCoverProfileFromAuthoredRecord({
        claimedRole: 'courier',
        documentTier: 2,
      })
    ).toEqual({
      claimedRole: 'courier',
      documentTier: 2,
    })
  })
})

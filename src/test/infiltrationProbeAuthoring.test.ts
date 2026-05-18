import { describe, expect, it } from 'vitest'
import {
  buildInfiltrationProbePlanFromAuthored,
  buildInfiltrationProbePlanFromAuthoredRecord,
  type AuthoredInfiltrationProbePlan,
} from '../domain/infiltrationProbeAuthoring'

describe('infiltrationProbeAuthoring', () => {
  it('returns undefined for null or empty authored plans', () => {
    expect(buildInfiltrationProbePlanFromAuthored(null)).toBeUndefined()
    expect(buildInfiltrationProbePlanFromAuthored({})).toBeUndefined()
    expect(buildInfiltrationProbePlanFromAuthoredRecord(null)).toBeUndefined()
    expect(buildInfiltrationProbePlanFromAuthoredRecord('not-an-object')).toBeUndefined()
  })

  it('normalizes default action and awareness cleanup threshold', () => {
    const authored: AuthoredInfiltrationProbePlan = {
      defaultAction: ' probe_route ',
      cleanupWhenAwarenessAtLeast: 0.55,
    }

    expect(buildInfiltrationProbePlanFromAuthored(authored)).toEqual({
      defaultAction: 'probe_route',
      cleanupWhenAwarenessAtLeast: 0.55,
    })
  })

  it('sorts progress rules and drops invalid rows', () => {
    const authored: AuthoredInfiltrationProbePlan = {
      defaultAction: 'probe_access',
      actionWhenProbeProgressBelow: [
        { belowProbeProgress: 0.5, action: 'probe_route' },
        { belowProbeProgress: 0.2, action: 'cleanup' },
        { belowProbeProgress: 1.5, action: 'probe_access' },
        { belowProbeProgress: 0.35, action: 'not-valid' },
        null as unknown as AuthoredInfiltrationProbePlan,
      ],
    }

    expect(buildInfiltrationProbePlanFromAuthored(authored)).toEqual({
      defaultAction: 'probe_access',
      actionWhenProbeProgressBelow: [
        { belowProbeProgress: 0.2, action: 'cleanup' },
        { belowProbeProgress: 0.5, action: 'probe_route' },
      ],
    })
  })

  it('skips unknown default actions without throwing', () => {
    expect(() =>
      buildInfiltrationProbePlanFromAuthored({ defaultAction: 'probe_everything' })
    ).not.toThrow()
    expect(buildInfiltrationProbePlanFromAuthored({ defaultAction: 'probe_everything' })).toBeUndefined()
  })
})

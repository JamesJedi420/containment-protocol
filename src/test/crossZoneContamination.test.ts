import { describe, expect, it } from 'vitest'
import {
  createContaminationSourceProfile,
  evaluateContaminationExposure,
  projectContaminationExposures,
  scaleSeverityByHops,
  type ContaminationSourceProfile,
} from '../domain/crossZoneContamination'

const sourceBase: ContaminationSourceProfile = {
  sourceId: 'rift-alpha',
  sourceZoneId: 'zone-core',
  susceptibleTags: ['species:human', 'affinity:dreamspace'],
  destinations: [
    {
      destinationZoneId: 'zone-near',
      symptom: 'shared_dreams',
      baseSeverity: 'high',
      hopsFromSource: 0,
    },
    {
      destinationZoneId: 'zone-far',
      symptom: 'mild_unrest',
      baseSeverity: 'high',
      hopsFromSource: 2,
    },
  ],
}

describe('SPE-807 cross-zone contamination', () => {
  it('projects different symptoms by destination under one source', () => {
    const source = createContaminationSourceProfile(sourceBase)
    expect(source.destinations.map((d) => d.destinationZoneId)).toEqual(['zone-far', 'zone-near'])

    const near = evaluateContaminationExposure({
      source,
      actor: { actorId: 'a1', tags: ['species:human'] },
      destinationZoneId: 'zone-near',
    })
    const far = evaluateContaminationExposure({
      source,
      actor: { actorId: 'a1', tags: ['species:human'] },
      destinationZoneId: 'zone-far',
    })
    expect(near.symptom).toBe('shared_dreams')
    expect(far.symptom).toBe('mild_unrest')
    expect(near.severity).toBe('high')
    expect(far.severity).toBe('low')
  })

  it('filters by susceptibility tags and scales severity by hops', () => {
    expect(scaleSeverityByHops('critical', 0)).toBe('critical')
    expect(scaleSeverityByHops('critical', 1)).toBe('high')
    expect(scaleSeverityByHops('critical', 4)).toBe('none')

    const immune = evaluateContaminationExposure({
      source: sourceBase,
      actor: { actorId: 'op', tags: ['role:operator'] },
      destinationZoneId: 'zone-near',
    })
    expect(immune.susceptible).toBe(false)
    expect(immune.severity).toBe('none')
    expect(immune.reasons).toEqual(['not-susceptible'])

    const dreamer = evaluateContaminationExposure({
      source: sourceBase,
      actor: { actorId: 'd1', tags: ['affinity:dreamspace'] },
      destinationZoneId: 'zone-near',
    })
    expect(dreamer.susceptible).toBe(true)
    expect(dreamer.severity).toBe('high')
  })

  it('projects deterministic exposures for multiple actors and destinations', () => {
    const exposures = projectContaminationExposures({
      source: sourceBase,
      actors: [
        { actorId: 'b', tags: ['species:human'] },
        { actorId: 'a', tags: ['role:civilian'] },
      ],
    })
    expect(exposures.map((e) => `${e.destinationZoneId}:${e.actorId}:${e.severity}`)).toEqual([
      'zone-far:a:none',
      'zone-far:b:low',
      'zone-near:a:none',
      'zone-near:b:high',
    ])
  })

  it('fails closed on invalid packets', () => {
    expect(() =>
      createContaminationSourceProfile({ ...sourceBase, destinations: [] }),
    ).toThrow(/at least one destination/)
    expect(() =>
      createContaminationSourceProfile({ ...sourceBase, susceptibleTags: [] }),
    ).toThrow(/susceptibility tag/)
    expect(() =>
      createContaminationSourceProfile({
        ...sourceBase,
        destinations: [
          {
            destinationZoneId: 'zone-core',
            symptom: 'mild_unrest',
            baseSeverity: 'low',
            hopsFromSource: 0,
          },
        ],
      }),
    ).toThrow(/differ from source zone/)
    expect(() =>
      createContaminationSourceProfile({
        ...sourceBase,
        destinations: [
          ...sourceBase.destinations,
          {
            destinationZoneId: 'zone-near',
            symptom: 'active_predation',
            baseSeverity: 'critical',
            hopsFromSource: 0,
          },
        ],
      }),
    ).toThrow(/duplicate destination/)

    const unknown = evaluateContaminationExposure({
      source: sourceBase,
      actor: { actorId: 'x', tags: ['species:human'] },
      destinationZoneId: 'zone-missing',
    })
    expect(unknown.reasons).toEqual(['unknown-destination'])
    expect(unknown.severity).toBe('none')
  })
})

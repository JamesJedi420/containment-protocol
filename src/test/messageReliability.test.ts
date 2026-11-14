import { describe, expect, it } from 'vitest'
import {
  projectMessageReliability,
  routeCommunicationByReliability,
  validateMessageReliabilityRecord,
  type MessageReliabilityRecord,
} from '../domain/messageReliability'

describe('SPE-2270 message reliability projection (slice 1)', () => {
  it('projects a mechanically unreliable contaminated source deterministically', () => {
    const unreliable = projectMessageReliability({
      sourceId: 'source-contaminated-alpha',
      truthBand: 'contaminated',
      distortionVector: ['exaggeration', 'omission'],
      trustInputs: [20, 30],
      contaminationRefs: ['memetic-vector-7'],
    })

    expect(unreliable.confidenceProjection).toBeLessThan(40)
    expect(unreliable.truthBand).toBe('contaminated')
    expect(validateMessageReliabilityRecord(unreliable)).toEqual([])

    const again = projectMessageReliability({
      sourceId: 'source-contaminated-alpha',
      truthBand: 'contaminated',
      distortionVector: ['omission', 'exaggeration'],
      trustInputs: [30, 20],
      contaminationRefs: ['memetic-vector-7'],
    })
    expect(again).toEqual(unreliable)
  })

  it('routes high-confidence truthful messages to caseboard and low to discard', () => {
    const high: MessageReliabilityRecord = projectMessageReliability({
      sourceId: 'source-truthful',
      truthBand: 'truthful',
      distortionVector: [],
      trustInputs: [80, 90],
      contaminationRefs: [],
    })
    expect(high.confidenceProjection).toBeGreaterThanOrEqual(70)
    expect(routeCommunicationByReliability(high)).toBe('caseboard')

    const low: MessageReliabilityRecord = projectMessageReliability({
      sourceId: 'source-false',
      truthBand: 'false',
      distortionVector: ['fabrication'],
      trustInputs: [10],
      contaminationRefs: ['unknown-origin'],
    })
    expect(low.confidenceProjection).toBeLessThan(40)
    expect(routeCommunicationByReliability(low)).toBe('discard')
  })

  it('routes medium confidence to archive', () => {
    const medium = projectMessageReliability({
      sourceId: 'source-omission',
      truthBand: 'omission',
      distortionVector: ['selective'],
      trustInputs: [50],
      contaminationRefs: [],
    })
    expect(medium.confidenceProjection).toBeGreaterThanOrEqual(40)
    expect(medium.confidenceProjection).toBeLessThan(70)
    expect(routeCommunicationByReliability(medium)).toBe('archive')
  })
})

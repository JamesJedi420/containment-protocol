import {
  getDistortionStatesForScore,
  inspectDistortion,
  interpretDistortion,
  propagateDistortion,
} from '../../src/domain/distortion'

describe('Distortion Propagation and Reporting', () => {
  it('propagates distortion state from source to target', () => {
    const source = { distortion: ['fragmented', 'misleading'] as const }
    const target = propagateDistortion(source, {})

    expect(target.distortion).toEqual(['misleading', 'fragmented'])
  })

  it('interprets distortion state', () => {
    expect(interpretDistortion({ distortion: ['misleading'] })).toContain('misleading')
    expect(interpretDistortion({ distortion: ['fragmented'] })).toContain('fragmented')
    expect(interpretDistortion({ distortion: [] })).toContain('No distortion')
  })

  it('maps numeric distortion scores onto canonical states', () => {
    expect(getDistortionStatesForScore(75)).toEqual(['misleading'])
    expect(getDistortionStatesForScore(45)).toEqual(['fragmented'])
    expect(getDistortionStatesForScore(10)).toEqual(['unreliable'])
    expect(inspectDistortion(0).states).toEqual([])
  })
})

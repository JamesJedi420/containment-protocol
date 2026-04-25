import { describe, expect, it } from 'vitest'
import { explainSpatialState } from '../domain/knowledge'

describe('spatial explanation readability', () => {
  it('renders ingress effects as explicit readable explanation', () => {
    const explanation = explainSpatialState(
      'transition',
      'obstructed',
      'chokepoint',
      ['ingress:maintenance_shaft', 'warded-rings']
    )

    expect(explanation).toMatch(/Ingress: maintenance_shaft/i)
    expect(explanation).toMatch(/constrains frontage and sight-lines/i)
    expect(explanation).toMatch(/Flags: warded-rings/i)
    expect(explanation).not.toMatch(/Flags:.*ingress:maintenance_shaft/i)
  })

  it('keeps legacy no-spatial output stable', () => {
    expect(explainSpatialState()).toBe('No spatial constraints.')
  })
})

import { describe, expect, it } from 'vitest'

import {
  attachCondition,
  createTagSet,
  hasAllTags,
  hasAnyTag,
  isConditionAllowedFor,
} from '../domain/shared/tags'

describe('shared tags/conditions substrate', () => {
  it('builds a canonical tag set across multiple sources', () => {
    const tagSet = createTagSet(
      ['scout', 'biohazard'],
      ['biohazard', 'thermal-vision'],
      { tags: ['recon-specialist'] }
    )

    expect([...tagSet]).toEqual(
      expect.arrayContaining(['scout', 'biohazard', 'thermal-vision', 'recon-specialist'])
    )
    expect(tagSet.size).toBe(4)
  })

  it('supports any/all matching against canonical tag collections', () => {
    const caseTags = ['occult', 'anomaly', 'seal']

    expect(hasAnyTag(caseTags, ['seal', 'medical'])).toBe(true)
    expect(hasAllTags(caseTags, ['occult', 'anomaly'])).toBe(true)
    expect(hasAllTags(caseTags, ['occult', 'medical'])).toBe(false)
  })

  it('attaches only allowed bounded conditions', () => {
    const agent: { conditions?: Array<'fatigued'> } = {}
    const intel: { conditions?: Array<'fatigued'> } = {}

    expect(isConditionAllowedFor('fatigued', 'agent')).toBe(true)
    expect(isConditionAllowedFor('fatigued', 'intel')).toBe(false)

    attachCondition(agent, 'fatigued', 'agent')
    attachCondition(intel, 'fatigued', 'intel')

    expect(agent.conditions).toEqual(['fatigued'])
    expect(intel.conditions).toBeUndefined()
  })
})

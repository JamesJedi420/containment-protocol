import { describe, expect, it } from 'vitest'

import {
  cloneSearchParams,
  normalizeSearchQuery,
  readEnumParam,
  readStringParam,
  toSearchString,
  writeEnumParam,
  writeStringParam,
} from './searchParams'

describe('searchParams primitives', () => {
  it('clones without mutating the source params', () => {
    const source = new URLSearchParams('q=alpha&sort=name')

    const clone = cloneSearchParams(source)
    clone.set('q', 'beta')

    expect(source.get('q')).toBe('alpha')
    expect(clone.get('q')).toBe('beta')
  })

  it('normalizes whitespace and trims boundaries', () => {
    expect(normalizeSearchQuery('   alpha\n\t beta   gamma   ')).toBe('alpha beta gamma')
  })

  it('preserves unicode, emoji, and punctuation while normalizing spaces', () => {
    expect(normalizeSearchQuery('  北京  café ☕  #urgent  ')).toBe('北京 café ☕ #urgent')
  })

  it('truncates to max length deterministically', () => {
    const input = 'x'.repeat(200)

    expect(normalizeSearchQuery(input, 120)).toHaveLength(120)
    expect(normalizeSearchQuery(input, 10)).toHaveLength(10)
  })

  it('reads valid enum params and falls back for invalid values', () => {
    const params = new URLSearchParams('sort=price-desc&mode=INVALID')

    expect(readEnumParam(params, 'sort', ['name', 'price-desc'] as const, 'name')).toBe(
      'price-desc'
    )
    expect(readEnumParam(params, 'mode', ['all', 'active'] as const, 'all')).toBe('all')
    expect(readEnumParam(params, 'missing', ['all', 'active'] as const, 'all')).toBe('all')
  })

  it('reads and normalizes string params from query', () => {
    const params = new URLSearchParams('q=%20%20alpha%20%20%20beta%20%20')

    expect(readStringParam(params, 'q')).toBe('alpha beta')
  })

  it('writes enum params by omitting fallback and keeping non-default values', () => {
    const params = new URLSearchParams('sort=price-desc&q=alpha')

    writeEnumParam(params, 'sort', 'recommended', 'recommended')
    expect(params.has('sort')).toBe(false)

    writeEnumParam(params, 'category', 'material', 'all')
    expect(params.get('category')).toBe('material')
    expect(params.get('q')).toBe('alpha')
  })

  it('writes string params with normalization and removes empty values', () => {
    const params = new URLSearchParams('q=alpha&category=featured')

    writeStringParam(params, 'q', '   beta   gamma  ')
    expect(params.get('q')).toBe('beta gamma')

    writeStringParam(params, 'q', '   ')
    expect(params.has('q')).toBe(false)
    expect(params.get('category')).toBe('featured')
  })

  it('encodes reserved URL characters through URLSearchParams output', () => {
    const params = new URLSearchParams()
    writeStringParam(params, 'q', 'alpha & beta? #gamma=1 +delta')

    const search = toSearchString(params)

    expect(search.startsWith('?')).toBe(true)
    expect(new URLSearchParams(search.slice(1)).get('q')).toBe('alpha & beta? #gamma=1 +delta')
  })

  it('returns empty search string for empty params and prefixes non-empty strings', () => {
    expect(toSearchString(new URLSearchParams())).toBe('')
    expect(toSearchString(new URLSearchParams('q=alpha'))).toBe('?q=alpha')
  })

  it('produces stable output across repeated read/write cycles', () => {
    const params = new URLSearchParams('q=%20%20alpha%20%20beta%20%20&sort=name')

    const normalizedQ = readStringParam(params, 'q')
    const normalizedSort = readEnumParam(params, 'sort', ['name', 'price-desc'] as const, 'name')

    const first = cloneSearchParams(params)
    writeStringParam(first, 'q', normalizedQ)
    writeEnumParam(first, 'sort', normalizedSort, 'name')

    const second = cloneSearchParams(first)
    writeStringParam(second, 'q', readStringParam(second, 'q'))
    writeEnumParam(
      second,
      'sort',
      readEnumParam(second, 'sort', ['name', 'price-desc'] as const, 'name'),
      'name'
    )

    expect(first.toString()).toBe(second.toString())
    expect(first.toString()).toBe('q=alpha+beta')
  })
})

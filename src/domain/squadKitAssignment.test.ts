// Squad kit assignment and validation seam tests (SPE-1025 child)
// Covers assign, reassign, clear, valid, mismatch paths deterministically
import { describe, it, expect } from 'vitest'
import type { SquadMetadata } from './squadMetadata'
import { createSquadKitTemplate } from './squadKitTemplate'
import type { SquadKitTemplate } from './squadKitTemplate'
import {
  assignSquadKit,
  clearSquadKitAssignment,
  validateSquadKitAssignment,
} from './squadKitAssignment'

const validSquad: SquadMetadata = {
  squadId: 'S1',
  name: 'Alpha',
  role: 'assault',
  doctrine: 'direct',
  shift: 'day',
  assignedZone: 'A',
  designatedLeaderId: 'L1',
}

const validKitTemplate: SquadKitTemplate = {
  id: 'kit1',
  label: 'Standard Assault',
  requiredItemTags: ['rifle', 'medkit'],
  minCoveredCount: 2,
}

const partialKitTemplate: SquadKitTemplate = {
  id: 'kit2',
  label: 'Partial',
  requiredItemTags: ['rifle', 'medkit'],
  minCoveredCount: 2,
}

describe('Squad kit assignment seam', () => {
  it('assigns a valid kit template to a squad', () => {
    const result = assignSquadKit(validSquad, validKitTemplate)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected successful kit assignment')
    }
    expect(result.assignment).toEqual({ squadId: 'S1', kitTemplateId: 'kit1' })
  })

  it('reassigns a different kit template deterministically', () => {
    const first = assignSquadKit(validSquad, validKitTemplate)
    expect(first.ok).toBe(true)
    expect(first.assignment).toEqual({ squadId: 'S1', kitTemplateId: 'kit1' })
    const second = assignSquadKit(validSquad, partialKitTemplate)
    expect(second.ok).toBe(true)
    if (!second.ok) {
      throw new Error('Expected replacement kit assignment')
    }
    expect(second.assignment).toEqual({ squadId: 'S1', kitTemplateId: 'kit2' })
  })

  it('clears an assigned kit template', () => {
    const cleared = clearSquadKitAssignment(validSquad, {
      currentAssignment: { squadId: 'S1', kitTemplateId: 'kit1' },
    })
    expect(cleared.ok).toBe(true)
    if (!cleared.ok) {
      throw new Error('Expected successful kit assignment clear')
    }
    expect(cleared.assignment).toEqual({ squadId: 'S1', kitTemplateId: null })
  })

  it('returns error for invalid squad or kit', () => {
    const invalidSquad = undefined as unknown as Parameters<typeof assignSquadKit>[0]
    const invalidKit = undefined as unknown as Parameters<typeof assignSquadKit>[1]
    expect(assignSquadKit(invalidSquad, validKitTemplate).ok).toBe(false)
    expect(assignSquadKit(validSquad, invalidKit).ok).toBe(false)
  })

  it('returns error for clearing with no assignment', () => {
    const result = clearSquadKitAssignment(validSquad, {
      currentAssignment: { squadId: 'S1', kitTemplateId: null },
    })
    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected no-assignment clear failure')
    }
    expect(result.error).toBe('no_assignment_to_clear')
  })

  it('returns explicit mismatch error when clearing with a different squad assignment', () => {
    const result = clearSquadKitAssignment(validSquad, {
      currentAssignment: { squadId: 'S2', kitTemplateId: 'kit1' },
    })
    expect(result.ok).toBe(false)
    if (result.ok) {
      throw new Error('Expected assignment squad mismatch failure')
    }
    expect(result.error).toBe('assignment_squad_mismatch')
  })

  it('returns deterministic clear payload when currentAssignment is missing', () => {
    const result = clearSquadKitAssignment(validSquad)
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('Expected deterministic clear payload')
    }
    expect(result.assignment).toEqual({ squadId: 'S1', kitTemplateId: null })
  })

  it('validates a squad + kit assignment as valid', () => {
    const squadItemTags = ['rifle', 'medkit']
    const validation = validateSquadKitAssignment(validKitTemplate, squadItemTags)
    expect(validation.status).toBe('valid')
    if (validation.status !== 'valid') {
      throw new Error('Expected valid validation result')
    }
    expect(validation.result.coveredTags).toEqual(['rifle', 'medkit'])
  })

  it('validates a mismatch with exact reasons', () => {
    const squadItemTags = ['rifle']
    const validation = validateSquadKitAssignment(validKitTemplate, squadItemTags)
    expect(validation.status).toBe('mismatch')
    if (validation.status !== 'mismatch') {
      throw new Error('Expected mismatch validation result')
    }
    expect(validation.result.missingTags).toContain('medkit')
    expect(validation.result.shortfall).toBeGreaterThan(0)
  })

  it('returns typed invalid_input error for invalid validation inputs', () => {
    const invalidTemplate = null as unknown as Parameters<typeof validateSquadKitAssignment>[0]
    const invalidTags = null as unknown as Parameters<typeof validateSquadKitAssignment>[1]
    const validation = validateSquadKitAssignment(invalidTemplate, invalidTags)
    expect(validation).toEqual({ status: 'error', error: 'invalid_input' })
  })

  it('normalizes required tags in template creation: trim/drop-empty/dedupe/copy', () => {
    const sourceTags = [' rifle ', 'rifle', 'medkit', ' ', 'medkit']
    const created = createSquadKitTemplate({
      id: 'k-normalized',
      label: 'Normalized Kit',
      requiredItemTags: sourceTags,
      minCoveredCount: 2,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) {
      throw new Error('Expected successful template creation')
    }
    expect(created.template.requiredItemTags).toEqual(['rifle', 'medkit'])

    sourceTags.push('late-mutation')
    expect(created.template.requiredItemTags).toEqual(['rifle', 'medkit'])
  })

  it('fails template creation when minCoveredCount exceeds normalized unique tags', () => {
    const created = createSquadKitTemplate({
      id: 'k-invalid-min',
      label: 'Invalid Min',
      requiredItemTags: [' rifle ', 'rifle', ' ', 'medkit'],
      minCoveredCount: 3,
    })
    expect(created).toEqual({ ok: false, error: 'invalid_min_count' })
  })
})

// Squad kit assignment and validation seam tests (SPE-1025 child)
// Covers assign, reassign, clear, valid, mismatch paths deterministically
import { describe, it, expect } from 'vitest'
import { SquadMetadata } from './squadMetadata'
import {
  SquadKitTemplate,
  createSquadKitTemplate,
  KitMatchResult,
  KitMismatchResult,
} from './squadKitTemplate'
import {
  assignSquadKit,
  clearSquadKitAssignment,
  validateSquadKitAssignment,
  SquadKitAssignment,
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
    expect(result.assignment).toEqual({ squadId: 'S1', kitTemplateId: 'kit1' })
  })

  it('reassigns a different kit template deterministically', () => {
    const first = assignSquadKit(validSquad, validKitTemplate)
    const second = assignSquadKit(validSquad, partialKitTemplate)
    expect(second.ok).toBe(true)
    expect(second.assignment).toEqual({ squadId: 'S1', kitTemplateId: 'kit2' })
  })

  it('clears an assigned kit template', () => {
    const cleared = clearSquadKitAssignment(validSquad, { currentAssignment: { squadId: 'S1', kitTemplateId: 'kit1' } })
    expect(cleared.ok).toBe(true)
    expect(cleared.assignment).toEqual({ squadId: 'S1', kitTemplateId: null })
  })

  it('returns error for invalid squad or kit', () => {
    // @ts-expect-error
    expect(assignSquadKit(undefined, validKitTemplate).ok).toBe(false)
    // @ts-expect-error
    expect(assignSquadKit(validSquad, undefined).ok).toBe(false)
  })

  it('returns error for clearing with no assignment', () => {
    const result = clearSquadKitAssignment(validSquad, { currentAssignment: { squadId: 'S1', kitTemplateId: null } })
    expect(result.ok).toBe(false)
    expect(result.error).toBe('no_assignment_to_clear')
  })

  it('validates a squad + kit assignment as valid', () => {
    const squadItemTags = ['rifle', 'medkit']
    const validation = validateSquadKitAssignment(validKitTemplate, squadItemTags)
    expect(validation.status).toBe('valid')
    expect((validation.result as KitMatchResult).coveredTags).toEqual(['rifle', 'medkit'])
  })

  it('validates a mismatch with exact reasons', () => {
    const squadItemTags = ['rifle']
    const validation = validateSquadKitAssignment(validKitTemplate, squadItemTags)
    expect(validation.status).toBe('mismatch')
    expect((validation.result as KitMismatchResult).missingTags).toContain('medkit')
    expect((validation.result as KitMismatchResult).shortfall).toBeGreaterThan(0)
  })
})

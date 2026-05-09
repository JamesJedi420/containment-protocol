import { describe, it, expect } from 'vitest'
import { createSquadMetadata } from '../domain/squadMetadata'
import { createSquadKitTemplate } from '../domain/squadKitTemplate'
import { assignSquadKit, clearSquadKitAssignment, validateSquadKitAssignment } from '../domain/squadKitAssignment'

describe('squadKitAssignment', () => {
  const squadResult = createSquadMetadata({
    squadId: 'squad-1',
    name: 'Alpha',
    role: 'rapid_response',
    doctrine: 'containment',
    shift: 'night',
    assignedZone: 'zone-1',
    designatedLeaderId: 'a_mina',
  })
  if (!squadResult.ok) {
    throw new Error(`Failed to create squad metadata: ${squadResult.code}`)
  }
  const squad = squadResult.metadata

  const kitTemplateResult = createSquadKitTemplate({
    id: 'kit-1',
    label: 'Breach Kit',
    requiredItemTags: ['breach', 'combat', 'protection'],
    minCoveredCount: 2,
  })
  if (!kitTemplateResult.ok) {
    throw new Error(`Failed to create kit template: ${kitTemplateResult.error}`)
  }
  const kitTemplate = kitTemplateResult.template

  it('assigns a kit template to a squad', () => {
    const result = assignSquadKit(squad, kitTemplate)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.assignment).toEqual({ squadId: 'squad-1', kitTemplateId: 'kit-1' })
    }
  })

  it('clears an assigned kit template', () => {
    const result = clearSquadKitAssignment(squad, {
      currentAssignment: { squadId: 'squad-1', kitTemplateId: 'kit-1' },
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.assignment).toEqual({ squadId: 'squad-1', kitTemplateId: null })
    }
  })

  it('returns error if clearing when no assignment exists', () => {
    const result = clearSquadKitAssignment(squad, {
      currentAssignment: { squadId: 'squad-1', kitTemplateId: null },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('no_assignment_to_clear')
    }
  })

  it('returns error for invalid squad or kit', () => {
    const invalidSquad = undefined as unknown as Parameters<typeof assignSquadKit>[0]
    const invalidKit = undefined as unknown as Parameters<typeof assignSquadKit>[1]

    const result1 = assignSquadKit(invalidSquad, kitTemplate)
    expect(result1.ok).toBe(false)
    if (!result1.ok) {
      expect(result1.error).toBeDefined()
    }
    const result2 = assignSquadKit(squad, invalidKit)
    expect(result2.ok).toBe(false)
    if (!result2.ok) {
      expect(result2.error).toBeDefined()
    }
  })

  it('validates a valid squad + kit assignment', () => {
    const tags = ['breach', 'combat', 'medkit']
    const result = validateSquadKitAssignment(kitTemplate, tags)
    expect(result.status).toBe('valid')
    if (result.status === 'valid') {
      expect(result.result.coveredTags).toEqual(['breach', 'combat'])
      expect(result.result.coverage).toBe(2)
    }
  })

  it('validates a mismatch and surfaces missing tags', () => {
    const tags = ['breach']
    const result = validateSquadKitAssignment(kitTemplate, tags)
    expect(result.status).toBe('mismatch')
    if (result.status === 'mismatch') {
      expect(result.result.missingTags).toEqual(expect.arrayContaining(['combat', 'protection']))
      expect(result.result.shortfall).toBe(1)
    }
  })

  it('is deterministic: same inputs always produce same outputs', () => {
    const tags = ['breach', 'combat']
    const first = validateSquadKitAssignment(kitTemplate, tags)
    const second = validateSquadKitAssignment(kitTemplate, tags)
    expect(first).toEqual(second)
  })
})

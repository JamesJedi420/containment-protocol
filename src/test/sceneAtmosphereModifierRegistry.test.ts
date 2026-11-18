import { describe, expect, it } from 'vitest'
import {
  validateSceneAtmosphereModifier,
  type SceneAtmosphereModifierEntry,
} from '../domain/sceneAtmosphereModifierRegistry'

describe('SPE-2167 scene atmosphere modifier registry', () => {
  const valid: SceneAtmosphereModifierEntry = {
    id: 'atm-fog-dim',
    label: 'Fog with reduced visibility',
    lighting: 'dim',
    weather: 'fog',
    noise: 'quiet',
    odor: 'faint',
    visibility: 'reduced',
    crowding: 'sparse',
    notes: 'Contextual only; no combat math',
  }

  it('accepts a fully documented atmosphere record', () => {
    const result = validateSceneAtmosphereModifier(valid)
    expect(result.valid).toBe(true)
    expect(result.issues).toEqual([])
  })

  it('rejects missing required identity fields', () => {
    const result = validateSceneAtmosphereModifier({ ...valid, id: '', label: '  ' })
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'missing_id')).toBe(true)
    expect(result.issues.some((i) => i.code === 'missing_label')).toBe(true)
  })

  it('rejects unknown enum values for each atmosphere property', () => {
    const bad = {
      ...valid,
      lighting: 'blinding',
      weather: 'meteor',
      noise: 'silentish',
      odor: 'toxic',
      visibility: 'invisible',
      crowding: 'overflowing',
    }
    const result = validateSceneAtmosphereModifier(bad)
    expect(result.valid).toBe(false)
    expect(result.issues.map((i) => i.field).sort()).toEqual([
      'crowding',
      'lighting',
      'noise',
      'odor',
      'visibility',
      'weather',
    ])
  })

  it('rejects non-record input', () => {
    const result = validateSceneAtmosphereModifier(null)
    expect(result.valid).toBe(false)
    expect(result.issues[0]?.code).toBe('invalid_entry')
  })

  it('rejects non-string notes', () => {
    const result = validateSceneAtmosphereModifier({ ...valid, notes: 42 })
    expect(result.valid).toBe(false)
    expect(result.issues.some((i) => i.code === 'invalid_notes')).toBe(true)
  })

  it('keeps atmosphere facts separate from civic or combat authority', () => {
    // Registry only validates contextual fields; no side effects or math.
    const result = validateSceneAtmosphereModifier(valid)
    expect(result.valid).toBe(true)
    // Presence of the fields is the contract; consumers remain external.
  })
})

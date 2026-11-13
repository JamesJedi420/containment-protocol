import { describe, expect, it } from 'vitest'
import {
  addArtifact,
  createEmptyScenarioOperationalArtifactBundle,
  sanitizeScenarioOperationalArtifactBundle,
  validateScenarioOperationalArtifactBundle,
  type ArtifactKindId,
} from './scenarioOperationalArtifactBundle'

describe('SPE-2226 scenario operational artifact bundle', () => {
  const fullRequired: Array<{ kind: ArtifactKindId; artifactId: string; label: string }> = [
    { kind: 'map', artifactId: 'map-1', label: 'Site map' },
    { kind: 'time_sheet', artifactId: 'ts-1', label: 'Beat sheet' },
    { kind: 'roster', artifactId: 'roster-1', label: 'Staff roster' },
  ]

  it('accepts a fixture bundle with all scenario-required artifact kinds', () => {
    let bundle = createEmptyScenarioOperationalArtifactBundle('bundle-ok', 'scenario-1')
    for (const art of fullRequired) {
      bundle = addArtifact(bundle, art)
    }
    bundle = addArtifact(bundle, { kind: 'handout', artifactId: 'ho-1', label: 'Briefing' })

    const result = validateScenarioOperationalArtifactBundle(bundle)
    expect(result.ok).toBe(true)
    expect(result.code).toBe('ok')
    expect(bundle.artifacts.map((a) => a.kind)).toEqual([
      'handout',
      'map',
      'roster',
      'time_sheet',
    ]) // deterministic sort by kind
  })

  it('rejects a bundle missing a mandatory artifact kind', () => {
    let bundle = createEmptyScenarioOperationalArtifactBundle('bundle-missing', 'scenario-1')
    bundle = addArtifact(bundle, fullRequired[0]!)
    bundle = addArtifact(bundle, fullRequired[1]!)
    // missing roster

    const result = validateScenarioOperationalArtifactBundle(bundle)
    expect(result.ok).toBe(false)
    expect(result.code).toBe('missing_required')
    expect(result.missing).toEqual(['roster'])
  })

  it('rejects an incompatible artifact combination', () => {
    let bundle = createEmptyScenarioOperationalArtifactBundle('bundle-conflict', 'scenario-1')
    for (const art of fullRequired) {
      bundle = addArtifact(bundle, art)
    }
    bundle = addArtifact(bundle, {
      kind: 'evidence_sheet',
      artifactId: 'es-1',
      label: 'Evidence',
    })
    bundle = addArtifact(bundle, {
      kind: 'internal_note',
      artifactId: 'in-1',
      label: 'Private note',
    })

    const result = validateScenarioOperationalArtifactBundle(bundle)
    expect(result.ok).toBe(false)
    expect(result.code).toBe('incompatible_combination')
    expect(result.conflicting).toEqual(['evidence_sheet', 'internal_note'])
  })

  it('composition and validation remain deterministic', () => {
    let bundle = createEmptyScenarioOperationalArtifactBundle('bundle-det', 'scenario-1')
    for (const art of fullRequired) {
      bundle = addArtifact(bundle, art)
    }
    const first = validateScenarioOperationalArtifactBundle(bundle)
    const second = validateScenarioOperationalArtifactBundle(bundle)
    expect(first).toEqual(second)
    expect(JSON.stringify(bundle.artifacts)).toBe(JSON.stringify(bundle.artifacts))
  })

  it('covers optional kinds and sanitizes malformed input', () => {
    let bundle = createEmptyScenarioOperationalArtifactBundle('bundle-opt', 'scenario-1')
    for (const art of fullRequired) {
      bundle = addArtifact(bundle, art)
    }
    bundle = addArtifact(bundle, { kind: 'handout', artifactId: 'ho-2', label: 'Extra' })
    expect(validateScenarioOperationalArtifactBundle(bundle).ok).toBe(true)

    expect(sanitizeScenarioOperationalArtifactBundle(null)).toBeNull()
    const sanitized = sanitizeScenarioOperationalArtifactBundle({
      schemaVersion: 'spe-2226.v1',
      bundleId: 'b',
      scenarioId: 's',
      artifacts: [{ kind: 'map', artifactId: 'm', label: 'M' }],
    })
    expect(sanitized).not.toBeNull()
    expect(sanitized?.artifacts.length).toBe(1)
  })
})

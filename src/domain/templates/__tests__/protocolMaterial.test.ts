// Targeted test for protocol material deterministic resolution (SPE-48)
import { describe, it, expect } from 'vitest'
import { protocolMaterialTemplates } from '../protocolMaterialTemplates'
import { resolvePreparation } from '../protocolMaterialRuntime'

describe('ProtocolMaterialTemplate deterministic resolution', () => {
  const template = protocolMaterialTemplates[0]
  it('succeeds with correct skill and method', () => {
    const result = resolvePreparation(template, {
      agentSkill: 3,
      method: 'distillation',
      delivery: 'injection',
    })
    expect(result.outcome).toBe('success')
    if (result.outcome === 'success') {
      expect(result.effect).toBe(template.effect.effectType)
    } else {
      throw new Error('Expected success outcome')
    }
  })
  it('fails with insufficient skill', () => {
    const result = resolvePreparation(template, {
      agentSkill: 1,
      method: 'distillation',
      delivery: 'injection',
    })
    expect(result.outcome).toBe('failure')
    if (result.outcome === 'failure') {
      expect(result.reason).toMatch(/skill/i)
    } else {
      throw new Error('Expected failure outcome')
    }
  })
  it('fails with wrong method', () => {
    const result = resolvePreparation(template, {
      agentSkill: 3,
      method: 'extraction',
      delivery: 'injection',
    })
    expect(result.outcome).toBe('failure')
    if (result.outcome === 'failure') {
      expect(result.reason).toMatch(/method/i)
    } else {
      throw new Error('Expected failure outcome')
    }
  })
})

// Shared SPE-48 prerequisite: these are authoring/runtime-hook fixtures, not gameplay evidence.
import type { TemplateBandPolicy, TemplateRuntimeDeclaration } from '../contentTemplateKernel'
import { resolveTemplateRuntime, TemplateValidationError } from '../contentTemplateRuntime'
import {
  validateKernel,
  validateProtocolMaterial,
  validateHazardIncident,
  validateDoctrinePlaybook,
} from '../contentTemplateValidation'
import { hazardIncidentTemplates } from '../hazardIncidentTemplates'
import { doctrinePlaybookTemplates } from '../doctrinePlaybookTemplates'
import { resolveIncident } from '../hazardIncidentRuntime'
import { applyDoctrine } from '../doctrinePlaybookRuntime'

const fixturePolicy: TemplateBandPolicy = {
  id: 'fixture-only-policy',
  actionBands: { bounded: { minCost: 2, maxScope: 3, maxExceptions: 1 } },
  powerBands: { bounded: { maxPower: 4 } },
}
function declaration(
  hook: TemplateRuntimeDeclaration['hook'] = 'prepare-material'
): TemplateRuntimeDeclaration {
  return {
    hook,
    policyRef: fixturePolicy.id,
    actionBand: 'bounded',
    powerBand: 'bounded',
    cost: 2,
    scope: 3,
    exceptions: 1,
    power: 4,
  }
}
function material() {
  return { ...protocolMaterialTemplates[0], runtime: declaration() }
}
const options = { policy: fixturePolicy, context: { environment: 'cold' } }
const attempt = { agentSkill: 3, method: 'distillation', delivery: 'injection' }

describe('shared template kernel policies and declared runtime hooks', () => {
  it('accepts exact configured limits and rejects action/power excess without clamping', () => {
    const template = material()
    expect(validateProtocolMaterial(template, fixturePolicy)).toEqual([])
    for (const [key, value] of [
      ['cost', 1],
      ['scope', 4],
      ['exceptions', 2],
      ['power', 5],
    ] as const) {
      const changed = { ...template, runtime: { ...template.runtime, [key]: value } }
      expect(() => resolvePreparation(changed, attempt, options)).toThrow(TemplateValidationError)
      expect(changed.runtime[key]).toBe(value)
    }
  })
  it.each([NaN, Infinity, -Infinity, -1])('rejects nonfinite/negative declarations: %s', (bad) => {
    for (const key of ['cost', 'scope', 'exceptions', 'power'] as const) {
      expect(
        validateKernel({ ...material(), runtime: { ...declaration(), [key]: bad } }, fixturePolicy)
          .length
      ).toBeGreaterThan(0)
    }
    expect(
      validateProtocolMaterial({ ...material(), recognitionThreshold: bad }, fixturePolicy).length
    ).toBeGreaterThan(0)
    expect(
      validateProtocolMaterial(
        { ...material(), effect: { effectType: 'neutralize', magnitude: bad } },
        fixturePolicy
      ).length
    ).toBeGreaterThan(0)
  })
  it('requires matching policies and own known bands; rejects malformed policy limits', () => {
    expect(() => resolvePreparation(material(), attempt)).toThrow(/policy/)
    expect(() =>
      resolvePreparation(material(), attempt, { policy: { ...fixturePolicy, id: 'other' } })
    ).toThrow(/policy/)
    for (const field of ['actionBand', 'powerBand'] as const) {
      expect(() =>
        resolvePreparation(
          { ...material(), runtime: { ...declaration(), [field]: '__proto__' } },
          attempt,
          options
        )
      ).toThrow(/band/)
    }
    expect(
      validateKernel(material(), {
        ...fixturePolicy,
        actionBands: { bounded: { minCost: NaN, maxScope: 3, maxExceptions: 1 } },
      })
    ).toContain('Unknown or invalid action band')
    expect(
      validateKernel(material(), {
        ...fixturePolicy,
        powerBands: { bounded: { maxPower: Infinity } },
      })
    ).toContain('Unknown or invalid power band')
  })
  it('rejects unknown and cross-family hooks before dispatch', () => {
    for (const hook of ['eval', 'resolve-incident']) {
      expect(() =>
        resolvePreparation(
          { ...material(), runtime: { ...declaration(), hook } } as ReturnType<typeof material>,
          attempt,
          options
        )
      ).toThrow(/hook/)
    }
    expect(() => resolveTemplateRuntime(material(), 'apply-doctrine', options)).toThrow(/hook/)
    expect(validateKernel({ ...material(), family: 'fourth-family' }, fixturePolicy)).toContain(
      'Unknown family'
    )
  })
  it('applies matching explicit context through preparation and leaves absent context at baseline', () => {
    const template = material()
    template.runtime.alternatives = [
      {
        id: 'cold',
        when: [{ context: 'environment', value: 'cold' }],
        parameters: { recognitionThreshold: 4 },
      },
    ]
    expect(resolvePreparation(template, attempt, options).outcome).toBe('failure')
    expect(resolvePreparation(template, attempt, { policy: fixturePolicy }).outcome).toBe('success')
    expect(resolvePreparation(template, attempt, options)).toEqual(
      resolvePreparation(template, attempt, options)
    )
  })
  it('changes a second authored material entry without editing its runtime hook', () => {
    const second = { ...material(), id: 'pm-new-entry', recognitionThreshold: 5 }
    expect(resolvePreparation(second, attempt, options).outcome).toBe('failure')
    expect(resolvePreparation(second, { ...attempt, agentSkill: 5 }, options).outcome).toBe(
      'success'
    )
  })
  it('uses incident alternatives and preserves zero thresholds', () => {
    const template = { ...hazardIncidentTemplates[0], runtime: declaration('resolve-incident') }
    template.runtime.alternatives = [
      {
        id: 'cold',
        when: [{ context: 'environment', value: 'cold' }],
        parameters: { riskThresholds: [0, 4] },
      },
    ]
    const state = { escalationStep: 0, risk: 0, resolved: false }
    expect(resolveIncident(template, state, 'seal breach', options).escalationStep).toBe(1)
    expect(
      resolveIncident(template, state, 'seal breach', { policy: fixturePolicy }).escalationStep
    ).toBe(0)
    expect(state.escalationStep).toBe(0)
  })
  it('uses doctrine alternatives with the existing reliability comparison direction', () => {
    const template = { ...doctrinePlaybookTemplates[0], runtime: declaration('apply-doctrine') }
    template.runtime.alternatives = [
      {
        id: 'cold',
        when: [{ context: 'environment', value: 'cold' }],
        parameters: { reliability: 0.8 },
      },
    ]
    expect(
      applyDoctrine(template, { context: 'artifact', reliability: 0.9 }, options).unlocked
    ).toEqual([])
    expect(
      applyDoctrine(template, { context: 'artifact', reliability: 0.9 }, { policy: fixturePolicy })
        .unlocked
    ).toContain('stabilizer-prep')
  })
  it('rejects ambiguous matches regardless of alternative order', () => {
    const template = material()
    template.runtime.alternatives = ['a', 'b'].map((id) => ({
      id,
      when: [{ context: 'environment', value: 'cold' }],
      parameters: { recognitionThreshold: 4 },
    }))
    expect(() => resolvePreparation(template, attempt, options)).toThrow(/Conflicting/)
    template.runtime.alternatives.reverse()
    expect(() => resolvePreparation(template, attempt, options)).toThrow(/Conflicting/)
  })
  it('is order independent for disjoint alternatives and does not alias returned arrays', () => {
    const template = { ...hazardIncidentTemplates[0], runtime: declaration('resolve-incident') }
    template.runtime.alternatives = ['cold', 'hot'].map((value, index) => ({
      id: value,
      when: [{ context: 'environment', value }],
      parameters: { riskThresholds: [index, 4] },
    }))
    const first = resolveTemplateRuntime(template, 'resolve-incident', options)
    template.runtime.alternatives.reverse()
    expect(resolveTemplateRuntime(template, 'resolve-incident', options)).toEqual(first)
    first.riskThresholds?.push(999)
    expect(resolveTemplateRuntime(template, 'resolve-incident', options).riskThresholds).toEqual([
      0, 4,
    ])
  })
  it('rejects malformed alternatives even if they would not match', () => {
    const template = material()
    for (const parameters of [
      { recognitionThreshold: NaN },
      { reliability: 0.2 },
      { unknown: 1 },
      {},
    ]) {
      expect(() =>
        resolvePreparation(
          {
            ...template,
            runtime: {
              ...template.runtime,
              alternatives: [
                { id: 'bad', when: [{ context: 'environment', value: 'hot' }], parameters },
              ],
            },
          },
          attempt,
          options
        )
      ).toThrow(/parameters/)
    }
    for (const when of [
      [],
      [{ context: '', value: 'cold' }],
      [{ context: 'environment', value: Infinity }],
    ]) {
      expect(
        validateKernel(
          {
            ...template,
            runtime: {
              ...template.runtime,
              alternatives: [{ id: 'bad', when, parameters: { recognitionThreshold: 1 } }],
            },
          },
          fixturePolicy
        )
      ).toContain('Invalid alternative conditions')
    }
    const alternative = {
      id: 'duplicate',
      when: [{ context: 'environment', value: 'hot' }],
      parameters: { recognitionThreshold: 1 },
    }
    expect(
      validateKernel(
        { ...template, runtime: { ...template.runtime, alternatives: [alternative, alternative] } },
        fixturePolicy
      )
    ).toContain('Duplicate alternative id')
  })
  it('rejects nonfinite runtime inputs before applying family effects', () => {
    expect(() =>
      resolvePreparation(protocolMaterialTemplates[0], { ...attempt, agentSkill: NaN })
    ).toThrow(/skill/)
    expect(() =>
      resolveIncident(
        hazardIncidentTemplates[0],
        { escalationStep: 0, risk: Infinity, resolved: false },
        'seal breach'
      )
    ).toThrow(/state/)
    expect(() =>
      applyDoctrine(doctrinePlaybookTemplates[0], { context: 'artifact', reliability: NaN })
    ).toThrow(/reliability/)
    expect(() =>
      resolvePreparation(material(), attempt, { ...options, context: { environment: NaN } })
    ).toThrow(/context/)
  })
  it('validates family-specific required shapes without throwing on malformed entries', () => {
    for (const value of [
      null,
      [],
      {},
      { ...protocolMaterialTemplates[0], preparation: {} },
      { ...protocolMaterialTemplates[0], effect: {} },
    ])
      expect(validateProtocolMaterial(value).length).toBeGreaterThan(0)
    expect(
      validateHazardIncident({
        ...hazardIncidentTemplates[0],
        escalation: { steps: [], riskThresholds: [Infinity] },
      }).length
    ).toBeGreaterThan(0)
    expect(
      validateDoctrinePlaybook({ ...doctrinePlaybookTemplates[0], reliability: 2 }).length
    ).toBeGreaterThan(0)
  })
  it('keeps authoring brief fields independently addressable and rejects omissions', () => {
    const brief = {
      implementationSurface: 'family hook',
      runtimeBehavior: 'deterministic preparation',
      playerResult: 'future gameplay owner',
    }
    const template = { ...material(), brief }
    expect(validateKernel(template, fixturePolicy)).toEqual([])
    expect(template.brief.runtimeBehavior).toBe('deterministic preparation')
    for (const field of Object.keys(brief))
      expect(
        validateKernel({ ...template, brief: { ...brief, [field]: '' } }, fixturePolicy)
      ).toContain('Invalid authoring brief')
  })
})

describe('template validation malformed collections', () => {
  it('rejects sparse conditions and threshold arrays', () => {
    const template = material()
    template.runtime.alternatives = [
      { id: 'sparse', when: new Array(1), parameters: { recognitionThreshold: 1 } },
    ]
    expect(validateKernel(template, fixturePolicy)).toContain('Invalid alternative conditions')
    const incident = { ...hazardIncidentTemplates[0], runtime: declaration('resolve-incident') }
    incident.runtime.alternatives = [
      {
        id: 'sparse',
        when: [{ context: 'environment', value: 'cold' }],
        parameters: { riskThresholds: new Array(1) },
      },
    ]
    expect(validateKernel(incident, fixturePolicy)).toContain('Invalid hook parameters')
  })
  it('rejects invalid declarations before each family can execute', () => {
    const invalid = { ...declaration('resolve-incident'), power: 5 }
    expect(() =>
      resolveIncident(
        { ...hazardIncidentTemplates[0], runtime: invalid },
        { escalationStep: 0, risk: 2, resolved: false },
        'seal breach',
        options
      )
    ).toThrow(/Power band/)
    expect(() =>
      applyDoctrine(
        { ...doctrinePlaybookTemplates[0], runtime: { ...invalid, hook: 'apply-doctrine' } },
        { context: 'artifact', reliability: 0.9 },
        options
      )
    ).toThrow(/Power band/)
  })
  it('does not coerce malformed numeric authoring metrics', () => {
    expect(
      validateKernel(
        { ...material(), runtime: { ...declaration(), cost: Symbol('bad') } },
        fixturePolicy
      )
    ).toContain('Invalid cost')
  })
})

describe('independent-review authoring regressions', () => {
  it('rejects JSON enum objects with noncallable toString without native coercion errors', () => {
    const malformed = JSON.parse('{"toString":null}')
    expect(
      validateProtocolMaterial({ ...protocolMaterialTemplates[0], sourceType: malformed })
    ).toContain('Invalid sourceType')
    expect(
      validateHazardIncident({ ...hazardIncidentTemplates[0], hazardType: malformed })
    ).toContain('Invalid hazardType')
    expect(
      validateDoctrinePlaybook({ ...doctrinePlaybookTemplates[0], doctrineType: malformed })
    ).toContain('Invalid doctrineType')
    expect(
      validateProtocolMaterial({
        ...protocolMaterialTemplates[0],
        sideEffects: [{ description: 'x', trigger: 'x', severity: malformed }],
      })
    ).toContain('Invalid side effects')
    expect(() =>
      resolvePreparation(
        { ...material(), runtime: { ...declaration(), hook: malformed } },
        attempt,
        options
      )
    ).toThrow(TemplateValidationError)
  })
  it('rejects sparse optional family collections before dispatch', () => {
    for (const key of ['sideEffects', 'contamination']) {
      expect(() =>
        resolvePreparation({ ...protocolMaterialTemplates[0], [key]: new Array(1) }, attempt)
      ).toThrow(TemplateValidationError)
    }
    expect(() =>
      applyDoctrine(
        { ...doctrinePlaybookTemplates[0], unlocks: new Array(1) },
        { context: 'artifact', reliability: 0.9 }
      )
    ).toThrow(TemplateValidationError)
  })
  it('rejects short full-replacement incident threshold overrides even when not selected', () => {
    const template = { ...hazardIncidentTemplates[0], runtime: declaration('resolve-incident') }
    template.runtime.alternatives = [
      {
        id: 'short',
        when: [{ context: 'environment', value: 'hot' }],
        parameters: { riskThresholds: [0] },
      },
    ]
    expect(() =>
      resolveIncident(
        template,
        { escalationStep: 1, risk: 10, resolved: false },
        'seal breach',
        options
      )
    ).toThrow(/cover non-final/)
    template.runtime.alternatives[0].parameters.riskThresholds = [0, 4]
    expect(
      resolveIncident(template, { escalationStep: 1, risk: 10, resolved: false }, 'seal breach', {
        ...options,
        context: { environment: 'hot' },
      }).resolved
    ).toBe(true)
  })
  it('distinguishes unsupported parameter keys from malformed values and avoids duplicate count diagnostics', () => {
    const alternative = {
      id: 'cold',
      when: [{ context: 'environment', value: 'cold' }],
      parameters: { reliability: 0.5 },
    }
    expect(
      validateKernel(
        { ...material(), runtime: { ...declaration(), alternatives: [alternative] } },
        fixturePolicy
      )
    ).toContain('Unsupported hook parameters')
    expect(
      validateKernel(
        { ...material(), runtime: { ...declaration(), exceptions: 'bad' } },
        fixturePolicy
      ).filter((x) => /exception/i.test(x))
    ).toEqual(['Invalid exceptions'])
  })
})

import { describe, expect, it } from 'vitest'
import {
  CONTAINMENT_DISPOSITION_PRECEDENCE,
  type ContainmentDispositionOperatorPolicy,
  projectDispositionForOperator,
  validateContainmentDispositionGraph,
} from '../domain/containmentDispositionRegistry'

const HIDDEN: ContainmentDispositionOperatorPolicy = {
  revealRationale: false,
  revealAuthorization: false,
}

const REVEALED: ContainmentDispositionOperatorPolicy = {
  revealRationale: true,
  revealAuthorization: true,
}

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: 'record-secured',
    subjectId: 'subject-alpha',
    kind: 'secured',
    confidence: 0.9,
    rationaleCodes: [] as string[],
    dependencyNodeIds: [] as string[],
    failureWarnings: [] as string[],
    reviewWeek: 4,
    ...overrides,
  }
}

describe('SPE-2102 containment disposition registry', () => {
  it('keeps two dispositions on one subject and picks precedence independent of input order', () => {
    const tolerated = record({
      id: 'record-tolerated',
      kind: 'tolerated',
      rationaleCodes: ['monitored_exposure'],
      alternatives: ['seal'],
    })
    const secured = record({ id: 'record-secured' })
    const forward = validateContainmentDispositionGraph([tolerated, secured])
    const reversed = validateContainmentDispositionGraph([secured, tolerated])

    expect(CONTAINMENT_DISPOSITION_PRECEDENCE[0]).toBe('authorized_disruption')
    expect(CONTAINMENT_DISPOSITION_PRECEDENCE.at(-1)).toBe('secured')
    expect(forward.records.map((item) => item.id)).toEqual(['record-secured', 'record-tolerated'])
    expect(forward.precedence).toEqual([
      {
        subjectId: 'subject-alpha',
        winningRecordId: 'record-tolerated',
        coexistingRecordIds: ['record-secured', 'record-tolerated'],
      },
    ])
    expect(reversed).toEqual(forward)
    expect(JSON.stringify(forward)).toBe(
      JSON.stringify(validateContainmentDispositionGraph([tolerated, secured]))
    )
  })

  it('breaks a same-kind tie by record id', () => {
    const result = validateContainmentDispositionGraph([
      record({ id: 'record-b' }),
      record({ id: 'record-a' }),
    ])
    expect(result.precedence[0]).toEqual({
      subjectId: 'subject-alpha',
      winningRecordId: 'record-a',
      coexistingRecordIds: ['record-a', 'record-b'],
    })
  })

  it('lets authorized disruption outrank a partial record', () => {
    const result = validateContainmentDispositionGraph([
      record({
        id: 'record-partial',
        kind: 'partial',
        dependencyNodeIds: ['power'],
      }),
      record({
        id: 'record-auth',
        kind: 'authorized_disruption',
        authorizationRef: 'auth-7',
      }),
    ])
    expect(result.findings).toEqual([])
    expect(result.precedence[0]?.winningRecordId).toBe('record-auth')
  })

  it('requires dependency nodes for a linked partial and for dependency_linked', () => {
    const missingPartial = validateContainmentDispositionGraph([
      record({ id: 'record-partial', kind: 'partial', dependencyLinked: true }),
    ])
    expect(missingPartial.records).toEqual([])
    expect(missingPartial.findings).toEqual([
      {
        code: 'missing_dependency_nodes',
        severity: 'error',
        recordId: 'record-partial',
        subjectId: 'subject-alpha',
      },
    ])

    const linked = validateContainmentDispositionGraph([
      record({
        id: 'record-linked',
        kind: 'dependency_linked',
        dependencyNodeIds: ['vent'],
      }),
    ])
    expect(linked.findings).toEqual([])
    expect(linked.records[0]?.dependencyNodeIds).toEqual(['vent'])

    const missingKind = validateContainmentDispositionGraph([
      record({ id: 'record-kind', kind: 'dependency_linked' }),
    ])
    expect(missingKind.records).toEqual([])
    expect(missingKind.findings[0]?.code).toBe('missing_dependency_nodes')
  })

  it('rejects authorized disruption without an authorization ref', () => {
    const result = validateContainmentDispositionGraph([
      record({ id: 'record-auth', kind: 'authorized_disruption' }),
    ])
    expect(result.records).toEqual([])
    expect(result.findings).toEqual([
      {
        code: 'authorized_disruption_without_authorization',
        severity: 'error',
        recordId: 'record-auth',
        subjectId: 'subject-alpha',
      },
    ])
  })

  it('keeps an emergent side effect without upgrading the kind to secured', () => {
    const result = validateContainmentDispositionGraph([
      record({
        id: 'record-partial',
        kind: 'partial',
        emergentDefensiveSideEffect: 'barrier_hold',
      }),
    ])
    expect(result.findings).toEqual([])
    expect(result.records).toEqual([
      expect.objectContaining({
        id: 'record-partial',
        kind: 'partial',
        emergentDefensiveSideEffect: 'barrier_hold',
      }),
    ])
  })

  it('warns when a boolean replaces the disposition kind and does not invent secured', () => {
    const replaced = validateContainmentDispositionGraph([
      { id: 'record-bool', subjectId: 'subject-alpha', contained: true },
    ])
    expect(replaced.records).toEqual([])
    expect(replaced.findings).toEqual([
      {
        code: 'disposition_collapse',
        severity: 'warning',
        recordId: 'record-bool',
        subjectId: 'subject-alpha',
      },
    ])
    expect(JSON.stringify(replaced)).not.toContain('secured')

    const besideKind = validateContainmentDispositionGraph([
      record({ id: 'record-secured', contained: false }),
    ])
    expect(besideKind.records[0]?.kind).toBe('secured')
    expect(besideKind.findings.map((item) => item.code)).toEqual(['disposition_collapse'])
  })

  it('rejects an unknown kind instead of coercing it to secured', () => {
    const result = validateContainmentDispositionGraph([
      record({ id: 'record-breach', kind: 'breached' }),
    ])
    expect(result.records).toEqual([])
    expect(result.findings).toEqual([
      {
        code: 'malformed',
        severity: 'error',
        recordId: 'record-breach',
        subjectId: 'subject-alpha',
      },
    ])
  })

  it('rejects tolerated records that omit rationale or alternatives', () => {
    const noRationale = validateContainmentDispositionGraph([
      record({ id: 'record-tolerated', kind: 'tolerated', alternatives: ['seal'] }),
    ])
    expect(noRationale.records).toEqual([])
    expect(noRationale.findings.map((item) => item.code)).toEqual(['tolerated_without_rationale'])

    const noAlternatives = validateContainmentDispositionGraph([
      record({
        id: 'record-tolerated',
        kind: 'tolerated',
        rationaleCodes: ['monitored_exposure'],
      }),
    ])
    expect(noAlternatives.records).toEqual([])
    expect(noAlternatives.findings.map((item) => item.code)).toEqual([
      'tolerated_without_alternatives',
    ])
  })

  it('warns on high-risk partial and tolerated records that lack a failure warning', () => {
    const result = validateContainmentDispositionGraph([
      record({ id: 'record-partial', kind: 'partial', highRisk: true }),
      record({
        id: 'record-tolerated',
        subjectId: 'subject-beta',
        kind: 'tolerated',
        highRisk: true,
        rationaleCodes: ['monitored_exposure'],
        alternatives: ['seal'],
        failureWarnings: ['vent_loss'],
      }),
    ])
    expect(result.records.map((item) => item.id)).toEqual(['record-partial', 'record-tolerated'])
    expect(result.findings).toEqual([
      {
        code: 'missing_failure_warning',
        severity: 'warning',
        recordId: 'record-partial',
        subjectId: 'subject-alpha',
      },
    ])
  })

  it('reports a dependency cycle from node ids and ignores a one-way link', () => {
    const cycle = validateContainmentDispositionGraph([
      record({ id: 'record-b', subjectId: 'node-b', dependencyNodeIds: ['node-a'] }),
      record({ id: 'record-a', subjectId: 'node-a', dependencyNodeIds: ['node-b'] }),
    ])
    expect(cycle.records).toHaveLength(2)
    expect(cycle.findings).toEqual([
      { code: 'dependency_cycle', severity: 'error', nodeIds: ['node-a', 'node-b'] },
    ])

    const self = validateContainmentDispositionGraph([
      record({ subjectId: 'node-a', dependencyNodeIds: ['node-a'] }),
    ])
    expect(self.findings).toEqual([
      { code: 'dependency_cycle', severity: 'error', nodeIds: ['node-a'] },
    ])

    const acyclic = validateContainmentDispositionGraph([
      record({ subjectId: 'node-a', dependencyNodeIds: ['node-b'] }),
    ])
    expect(acyclic.findings).toEqual([])
  })

  it('accepts an empty list and rejects an unknown field without inventing secured', () => {
    expect(validateContainmentDispositionGraph([])).toEqual({
      records: [],
      findings: [],
      precedence: [],
    })

    const extra = validateContainmentDispositionGraph([
      record({ id: 'record-extra', canonLabel: 'do-not-import' }),
    ])
    expect(extra.records).toEqual([])
    expect(extra.findings).toEqual([
      {
        code: 'malformed',
        severity: 'error',
        recordId: 'record-extra',
        subjectId: 'subject-alpha',
      },
    ])
    expect(JSON.stringify(extra)).not.toContain('secured')
    expect(JSON.stringify(extra)).not.toContain('do-not-import')
  })

  it('omits every copy of a duplicate id, including a rejected sibling', () => {
    const duplicates = validateContainmentDispositionGraph([
      record({ id: 'record-same', subjectId: 'subject-b' }),
      record({ id: 'record-same', subjectId: 'subject-a' }),
    ])
    expect(duplicates.records).toEqual([])
    expect(duplicates.findings).toEqual([
      { code: 'duplicate_record', severity: 'error', recordId: 'record-same' },
    ])

    const mixed = validateContainmentDispositionGraph([
      record({ id: 'record-same' }),
      { id: 'record-same', subjectId: 'subject-alpha', contained: true },
    ])
    expect(mixed.records).toEqual([])
    expect(mixed.findings).toEqual([
      { code: 'duplicate_record', severity: 'error', recordId: 'record-same' },
      {
        code: 'disposition_collapse',
        severity: 'warning',
        recordId: 'record-same',
        subjectId: 'subject-alpha',
      },
    ])
  })

  it('rejects a missing required list and a NUL token', () => {
    const source = record()
    const withoutRationale = { ...source }
    delete withoutRationale.rationaleCodes
    const missing = validateContainmentDispositionGraph([withoutRationale])
    expect(missing.records).toEqual([])
    expect(missing.findings[0]?.code).toBe('malformed')

    const nul = validateContainmentDispositionGraph([
      record({ id: 'record-nul', subjectId: 'subject\u0000alpha' }),
    ])
    expect(nul.records).toEqual([])
    expect(nul.findings[0]?.code).toBe('malformed')
  })

  it('reports every node in a strongly connected dependency component', () => {
    const result = validateContainmentDispositionGraph([
      record({ id: 'record-a', subjectId: 'node-a', dependencyNodeIds: ['node-c', 'node-b'] }),
      record({ id: 'record-b', subjectId: 'node-b', dependencyNodeIds: ['node-a'] }),
      record({ id: 'record-c', subjectId: 'node-c', dependencyNodeIds: ['node-b'] }),
    ])
    expect(result.findings).toEqual([
      {
        code: 'dependency_cycle',
        severity: 'error',
        nodeIds: ['node-a', 'node-b', 'node-c'],
      },
    ])
  })

  it('validates a long dependency chain without throwing', () => {
    const chain = Array.from({ length: 2000 }, (_, index) =>
      record({
        id: `record-${index}`,
        subjectId: `node-${index}`,
        dependencyNodeIds: index === 1999 ? [] : [`node-${index + 1}`],
      })
    )
    const result = validateContainmentDispositionGraph(chain)
    expect(result.findings).toEqual([])
    expect(result.records).toHaveLength(2000)
  })

  it('fails closed on a non-array packet', () => {
    expect(validateContainmentDispositionGraph(undefined)).toEqual({
      records: [],
      findings: [{ code: 'malformed', severity: 'error' }],
      precedence: [],
    })
  })

  it('sorts string lists so caller order does not change the normalized record', () => {
    const result = validateContainmentDispositionGraph([
      record({
        rationaleCodes: ['zeta', 'alpha'],
        dependencyNodeIds: ['vent', 'power'],
        failureWarnings: ['late', 'early'],
      }),
    ])
    expect(result.records[0]).toMatchObject({
      rationaleCodes: ['alpha', 'zeta'],
      dependencyNodeIds: ['power', 'vent'],
      failureWarnings: ['early', 'late'],
    })
  })

  it('redacts rationale and authorization unless the policy reveals them', () => {
    const source = record({
      id: 'record-auth',
      kind: 'authorized_disruption',
      authorizationRef: 'auth-7',
      rationaleCodes: ['controlled_release'],
      alternatives: ['hold'],
      dependencyNodeIds: ['power'],
    })
    const hidden = projectDispositionForOperator(source, HIDDEN)
    expect(hidden).toEqual({
      recordId: 'record-auth',
      subjectId: 'subject-alpha',
      kind: 'authorized_disruption',
      confidence: 0.9,
      reviewWeek: 4,
      failureWarnings: [],
      alternatives: ['hold'],
    })
    expect(hidden).not.toHaveProperty('rationaleCodes')
    expect(hidden).not.toHaveProperty('authorizationRef')
    expect(hidden).not.toHaveProperty('dependencyNodeIds')
    expect(JSON.stringify(hidden)).not.toContain('auth-7')
    expect(JSON.stringify(hidden)).not.toContain('controlled_release')

    const revealed = projectDispositionForOperator(source, REVEALED)
    expect(revealed?.rationaleCodes).toEqual(['controlled_release'])
    expect(revealed?.authorizationRef).toBe('auth-7')
  })

  it('does not project a rejected or collapsed record', () => {
    expect(projectDispositionForOperator(null, HIDDEN)).toBeUndefined()
    expect(
      projectDispositionForOperator(
        { id: 'record-bool', subjectId: 'subject-alpha', contained: true },
        HIDDEN
      )
    ).toBeUndefined()
    expect(
      projectDispositionForOperator(record({ kind: 'authorized_disruption' }), HIDDEN)
    ).toBeUndefined()
    expect(projectDispositionForOperator(record(), { revealRationale: false })).toBeUndefined()
  })
})

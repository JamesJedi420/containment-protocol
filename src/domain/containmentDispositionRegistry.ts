/**
 * SPE-2102 — pure containment disposition registry (slice 1).
 *
 * Caller-owned records distinguish secured, partial, tolerated, redirected,
 * socially managed, incorporated, authorized disruption, and dependency-linked
 * states. This module does not persist GameState, run week-close, draw UI, or
 * read the SPE-3383 facility dependency graph. Accidental breach is not a kind.
 */

export const CONTAINMENT_DISPOSITION_PRECEDENCE = [
  'authorized_disruption',
  'dependency_linked',
  'partial',
  'redirected',
  'tolerated',
  'socially_managed',
  'incorporated_operations',
  'secured',
] as const
export type ContainmentDispositionKind = (typeof CONTAINMENT_DISPOSITION_PRECEDENCE)[number]

export const CONTAINMENT_DISPOSITION_FINDING_CODES = [
  'malformed',
  'duplicate_record',
  'tolerated_without_rationale',
  'tolerated_without_alternatives',
  'authorized_disruption_without_authorization',
  'missing_dependency_nodes',
  'dependency_cycle',
  'missing_failure_warning',
  'disposition_collapse',
] as const
export type ContainmentDispositionFindingCode =
  (typeof CONTAINMENT_DISPOSITION_FINDING_CODES)[number]

export const CONTAINMENT_DISPOSITION_FINDING_SEVERITIES = ['error', 'warning'] as const
export type ContainmentDispositionFindingSeverity =
  (typeof CONTAINMENT_DISPOSITION_FINDING_SEVERITIES)[number]

export interface ContainmentDispositionRecord {
  readonly id: string
  readonly subjectId: string
  readonly kind: ContainmentDispositionKind
  readonly confidence: number
  readonly rationaleCodes: readonly string[]
  readonly dependencyNodeIds: readonly string[]
  readonly failureWarnings: readonly string[]
  readonly reviewWeek: number
  readonly dependencyLinked?: boolean
  readonly authorizationRef?: string
  readonly alternatives?: readonly string[]
  readonly emergentDefensiveSideEffect?: string
  readonly highRisk?: boolean
}

export interface ContainmentDispositionFinding {
  readonly code: ContainmentDispositionFindingCode
  readonly severity: ContainmentDispositionFindingSeverity
  readonly recordId?: string
  readonly subjectId?: string
  readonly nodeIds?: readonly string[]
}

export interface ContainmentDispositionPrecedence {
  readonly subjectId: string
  readonly winningRecordId: string
  readonly coexistingRecordIds: readonly string[]
}

export interface ContainmentDispositionGraphValidation {
  readonly records: readonly ContainmentDispositionRecord[]
  readonly findings: readonly ContainmentDispositionFinding[]
  readonly precedence: readonly ContainmentDispositionPrecedence[]
}

export interface ContainmentDispositionOperatorPolicy {
  readonly revealRationale: boolean
  readonly revealAuthorization: boolean
}

export interface ContainmentDispositionOperatorSummary {
  readonly recordId: string
  readonly subjectId: string
  readonly kind: ContainmentDispositionKind
  readonly confidence: number
  readonly reviewWeek: number
  readonly failureWarnings: readonly string[]
  readonly alternatives: readonly string[]
  readonly emergentDefensiveSideEffect?: string
  readonly rationaleCodes?: readonly string[]
  readonly authorizationRef?: string
}

const RECORD_KEYS = new Set([
  'id',
  'subjectId',
  'kind',
  'confidence',
  'rationaleCodes',
  'dependencyNodeIds',
  'failureWarnings',
  'reviewWeek',
  'dependencyLinked',
  'authorizationRef',
  'alternatives',
  'emergentDefensiveSideEffect',
  'highRisk',
  'contained',
])

const POLICY_KEYS = new Set(['revealRationale', 'revealAuthorization'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

function compareCodeUnit(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function isKind(value: unknown): value is ContainmentDispositionKind {
  return CONTAINMENT_DISPOSITION_PRECEDENCE.some((kind) => kind === value)
}

function kindRank(kind: ContainmentDispositionKind): number {
  switch (kind) {
    case 'authorized_disruption':
      return 8
    case 'dependency_linked':
      return 7
    case 'partial':
      return 6
    case 'redirected':
      return 5
    case 'tolerated':
      return 4
    case 'socially_managed':
      return 3
    case 'incorporated_operations':
      return 2
    case 'secured':
      return 1
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
  }
}

function findingSeverity(
  code: ContainmentDispositionFindingCode
): ContainmentDispositionFindingSeverity {
  switch (code) {
    case 'malformed':
    case 'duplicate_record':
    case 'tolerated_without_rationale':
    case 'tolerated_without_alternatives':
    case 'authorized_disruption_without_authorization':
    case 'missing_dependency_nodes':
    case 'dependency_cycle':
      return 'error'
    case 'missing_failure_warning':
    case 'disposition_collapse':
      return 'warning'
    default: {
      const exhaustive: never = code
      return exhaustive
    }
  }
}

function parseToken(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0 || value !== value.trim()) return undefined
  if (value.includes('\u0000')) return undefined
  return value
}

function parseStringList(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const items: string[] = []
  for (const item of value) {
    const token = parseToken(item)
    if (token === undefined) return undefined
    items.push(token)
  }
  items.sort(compareCodeUnit)
  return Object.freeze(items)
}

function freezeFinding(input: {
  readonly code: ContainmentDispositionFindingCode
  readonly recordId?: string
  readonly subjectId?: string
  readonly nodeIds?: readonly string[]
}): ContainmentDispositionFinding {
  const severity = findingSeverity(input.code)
  return Object.freeze({
    code: input.code,
    severity,
    ...(input.recordId !== undefined ? { recordId: input.recordId } : {}),
    ...(input.subjectId !== undefined ? { subjectId: input.subjectId } : {}),
    ...(input.nodeIds !== undefined ? { nodeIds: Object.freeze([...input.nodeIds]) } : {}),
  })
}

function compareNodeLists(left: readonly string[], right: readonly string[]): number {
  const count = Math.min(left.length, right.length)
  for (let index = 0; index < count; index += 1) {
    const order = compareCodeUnit(left[index] ?? '', right[index] ?? '')
    if (order !== 0) return order
  }
  return left.length - right.length
}

function compareFindings(
  left: ContainmentDispositionFinding,
  right: ContainmentDispositionFinding
): number {
  const severity = compareCodeUnit(left.severity, right.severity)
  if (severity !== 0) return severity
  const code = compareCodeUnit(left.code, right.code)
  if (code !== 0) return code
  const recordId = compareCodeUnit(left.recordId ?? '', right.recordId ?? '')
  if (recordId !== 0) return recordId
  const subjectId = compareCodeUnit(left.subjectId ?? '', right.subjectId ?? '')
  if (subjectId !== 0) return subjectId
  return compareNodeLists(left.nodeIds ?? [], right.nodeIds ?? [])
}

function emptyValidation(
  findings: readonly ContainmentDispositionFinding[]
): ContainmentDispositionGraphValidation {
  const sorted = [...findings].sort(compareFindings)
  return Object.freeze({
    records: Object.freeze([]),
    findings: Object.freeze(sorted),
    precedence: Object.freeze([]),
  })
}

interface ParsedRecord {
  readonly record: ContainmentDispositionRecord
  readonly collapse: boolean
}

function parseRecord(value: unknown): ParsedRecord | ContainmentDispositionFinding {
  if (!isRecord(value)) return freezeFinding({ code: 'malformed' })

  const id = parseToken(value.id)
  const subjectId = parseToken(value.subjectId)
  const idRef = id === undefined ? {} : { recordId: id }
  const subjectRef = subjectId === undefined ? {} : { subjectId }

  for (const key of Object.keys(value)) {
    if (!RECORD_KEYS.has(key)) {
      return freezeFinding({ code: 'malformed', ...idRef, ...subjectRef })
    }
  }

  if (hasOwn(value, 'contained')) {
    if (typeof value.contained !== 'boolean') {
      return freezeFinding({ code: 'malformed', ...idRef, ...subjectRef })
    }
    if (!hasOwn(value, 'kind')) {
      return freezeFinding({ code: 'disposition_collapse', ...idRef, ...subjectRef })
    }
    if (!isKind(value.kind)) {
      return freezeFinding({ code: 'malformed', ...idRef, ...subjectRef })
    }
  }

  if (!isKind(value.kind) || id === undefined || subjectId === undefined) {
    return freezeFinding({ code: 'malformed', ...idRef, ...subjectRef })
  }

  if (
    typeof value.confidence !== 'number' ||
    !Number.isFinite(value.confidence) ||
    value.confidence < 0 ||
    value.confidence > 1
  ) {
    return freezeFinding({ code: 'malformed', recordId: id, subjectId })
  }

  if (
    typeof value.reviewWeek !== 'number' ||
    !Number.isInteger(value.reviewWeek) ||
    value.reviewWeek < 0
  ) {
    return freezeFinding({ code: 'malformed', recordId: id, subjectId })
  }

  if (
    !hasOwn(value, 'rationaleCodes') ||
    !hasOwn(value, 'dependencyNodeIds') ||
    !hasOwn(value, 'failureWarnings')
  ) {
    return freezeFinding({ code: 'malformed', recordId: id, subjectId })
  }

  const rationaleCodes = parseStringList(value.rationaleCodes)
  const dependencyNodeIds = parseStringList(value.dependencyNodeIds)
  const failureWarnings = parseStringList(value.failureWarnings)
  if (
    rationaleCodes === undefined ||
    dependencyNodeIds === undefined ||
    failureWarnings === undefined
  ) {
    return freezeFinding({ code: 'malformed', recordId: id, subjectId })
  }

  let dependencyLinked: boolean | undefined
  if (hasOwn(value, 'dependencyLinked')) {
    if (typeof value.dependencyLinked !== 'boolean') {
      return freezeFinding({ code: 'malformed', recordId: id, subjectId })
    }
    dependencyLinked = value.dependencyLinked
  }

  let authorizationRef: string | undefined
  if (hasOwn(value, 'authorizationRef')) {
    authorizationRef = parseToken(value.authorizationRef)
    if (authorizationRef === undefined) {
      return freezeFinding({ code: 'malformed', recordId: id, subjectId })
    }
  }

  let alternatives: readonly string[] | undefined
  if (hasOwn(value, 'alternatives')) {
    alternatives = parseStringList(value.alternatives)
    if (alternatives === undefined) {
      return freezeFinding({ code: 'malformed', recordId: id, subjectId })
    }
  }

  let emergentDefensiveSideEffect: string | undefined
  if (hasOwn(value, 'emergentDefensiveSideEffect')) {
    emergentDefensiveSideEffect = parseToken(value.emergentDefensiveSideEffect)
    if (emergentDefensiveSideEffect === undefined) {
      return freezeFinding({ code: 'malformed', recordId: id, subjectId })
    }
  }

  let highRisk: boolean | undefined
  if (hasOwn(value, 'highRisk')) {
    if (typeof value.highRisk !== 'boolean') {
      return freezeFinding({ code: 'malformed', recordId: id, subjectId })
    }
    highRisk = value.highRisk
  }

  const record = Object.freeze({
    id,
    subjectId,
    kind: value.kind,
    confidence: value.confidence,
    rationaleCodes,
    dependencyNodeIds,
    failureWarnings,
    reviewWeek: value.reviewWeek,
    ...(dependencyLinked !== undefined ? { dependencyLinked } : {}),
    ...(authorizationRef !== undefined ? { authorizationRef } : {}),
    ...(alternatives !== undefined ? { alternatives } : {}),
    ...(emergentDefensiveSideEffect !== undefined ? { emergentDefensiveSideEffect } : {}),
    ...(highRisk !== undefined ? { highRisk } : {}),
  })

  return { record, collapse: hasOwn(value, 'contained') }
}

function ruleFindings(record: ContainmentDispositionRecord): ContainmentDispositionFinding[] {
  const findings: ContainmentDispositionFinding[] = []
  const ref = { recordId: record.id, subjectId: record.subjectId }

  if (record.kind === 'tolerated' && record.rationaleCodes.length === 0) {
    findings.push(freezeFinding({ code: 'tolerated_without_rationale', ...ref }))
  }
  if (record.kind === 'tolerated' && (record.alternatives?.length ?? 0) === 0) {
    findings.push(freezeFinding({ code: 'tolerated_without_alternatives', ...ref }))
  }
  if (record.kind === 'authorized_disruption' && record.authorizationRef === undefined) {
    findings.push(freezeFinding({ code: 'authorized_disruption_without_authorization', ...ref }))
  }
  const needsNodes =
    record.kind === 'dependency_linked' ||
    (record.kind === 'partial' && record.dependencyLinked === true)
  if (needsNodes && record.dependencyNodeIds.length === 0) {
    findings.push(freezeFinding({ code: 'missing_dependency_nodes', ...ref }))
  }
  const highRiskKind = record.kind === 'partial' || record.kind === 'tolerated'
  if (highRiskKind && record.highRisk === true && record.failureWarnings.length === 0) {
    findings.push(freezeFinding({ code: 'missing_failure_warning', ...ref }))
  }
  return findings
}

function isError(item: ContainmentDispositionFinding): boolean {
  return item.severity === 'error'
}

function dependencyCycles(
  records: readonly ContainmentDispositionRecord[]
): ContainmentDispositionFinding[] {
  const outgoing = new Map<string, string[]>()
  for (const record of records) {
    const current = outgoing.get(record.subjectId) ?? []
    outgoing.set(record.subjectId, current.concat(record.dependencyNodeIds))
  }
  for (const [node, targets] of outgoing) {
    outgoing.set(node, [...new Set(targets)].sort(compareCodeUnit))
  }

  const nodes = new Set<string>()
  for (const [node, targets] of outgoing) {
    nodes.add(node)
    for (const target of targets) nodes.add(target)
  }
  const orderedNodes = [...nodes].sort(compareCodeUnit)

  const finish: string[] = []
  const seenFinish = new Set<string>()
  for (const start of orderedNodes) {
    if (seenFinish.has(start)) continue
    const stack: { node: string; next: number }[] = [{ node: start, next: 0 }]
    seenFinish.add(start)
    while (stack.length > 0) {
      const frame = stack[stack.length - 1]
      if (frame === undefined) break
      const targets = outgoing.get(frame.node) ?? []
      if (frame.next < targets.length) {
        const child = targets[frame.next]
        frame.next += 1
        if (child !== undefined && !seenFinish.has(child)) {
          seenFinish.add(child)
          stack.push({ node: child, next: 0 })
        }
      } else {
        finish.push(frame.node)
        stack.pop()
      }
    }
  }

  const incoming = new Map<string, string[]>()
  for (const node of orderedNodes) incoming.set(node, [])
  for (const [node, targets] of outgoing) {
    for (const target of targets) {
      const sources = incoming.get(target) ?? []
      sources.push(node)
      incoming.set(target, sources)
    }
  }
  for (const sources of incoming.values()) sources.sort(compareCodeUnit)

  const seenComponent = new Set<string>()
  const cycles: string[][] = []
  for (let index = finish.length - 1; index >= 0; index -= 1) {
    const start = finish[index]
    if (start === undefined || seenComponent.has(start)) continue
    const component: string[] = []
    const stack = [start]
    seenComponent.add(start)
    while (stack.length > 0) {
      const node = stack.pop()
      if (node === undefined) break
      component.push(node)
      for (const source of incoming.get(node) ?? []) {
        if (!seenComponent.has(source)) {
          seenComponent.add(source)
          stack.push(source)
        }
      }
    }
    component.sort(compareCodeUnit)
    const only = component[0]
    const selfLoop = only !== undefined && (outgoing.get(only) ?? []).includes(only)
    if (component.length > 1 || selfLoop) cycles.push(component)
  }

  cycles.sort(compareNodeLists)
  return cycles.map((nodeIds) => freezeFinding({ code: 'dependency_cycle', nodeIds }))
}

function precedenceFor(
  records: readonly ContainmentDispositionRecord[]
): ContainmentDispositionPrecedence[] {
  const bySubject = new Map<string, ContainmentDispositionRecord[]>()
  for (const record of records) {
    const group = bySubject.get(record.subjectId) ?? []
    group.push(record)
    bySubject.set(record.subjectId, group)
  }

  const subjects = [...bySubject.keys()].sort(compareCodeUnit)
  return subjects.map((subjectId) => {
    const group = bySubject.get(subjectId) ?? []
    const ranked = [...group].sort((left, right) => {
      const rank = kindRank(right.kind) - kindRank(left.kind)
      if (rank !== 0) return rank
      return compareCodeUnit(left.id, right.id)
    })
    const winner = ranked[0]
    if (winner === undefined) {
      throw new Error('precedence group is empty')
    }
    const coexistingRecordIds = group.map((record) => record.id).sort(compareCodeUnit)
    return Object.freeze({
      subjectId,
      winningRecordId: winner.id,
      coexistingRecordIds: Object.freeze(coexistingRecordIds),
    })
  })
}

/**
 * Normalize caller records. Malformed and rule-rejected records are omitted.
 * A `contained` boolean never becomes `secured`.
 */
export function validateContainmentDispositionGraph(
  records: unknown
): ContainmentDispositionGraphValidation {
  if (!Array.isArray(records)) return emptyValidation([freezeFinding({ code: 'malformed' })])

  const findings: ContainmentDispositionFinding[] = []
  const parsed: ContainmentDispositionRecord[] = []
  const idCounts = new Map<string, number>()
  for (const value of records) {
    if (!isRecord(value)) continue
    const id = parseToken(value.id)
    if (id === undefined) continue
    idCounts.set(id, (idCounts.get(id) ?? 0) + 1)
  }
  const reportedDuplicates = new Set<string>()

  for (const value of records) {
    const rawId = isRecord(value) ? parseToken(value.id) : undefined
    const duplicated = rawId !== undefined && (idCounts.get(rawId) ?? 0) > 1
    if (duplicated && rawId !== undefined && !reportedDuplicates.has(rawId)) {
      reportedDuplicates.add(rawId)
      findings.push(freezeFinding({ code: 'duplicate_record', recordId: rawId }))
    }

    const result = parseRecord(value)
    if (!('record' in result)) {
      findings.push(result)
      continue
    }
    if (duplicated) continue
    if (result.collapse) {
      findings.push(
        freezeFinding({
          code: 'disposition_collapse',
          recordId: result.record.id,
          subjectId: result.record.subjectId,
        })
      )
    }
    parsed.push(result.record)
  }

  const accepted: ContainmentDispositionRecord[] = []
  for (const record of parsed) {
    const rules = ruleFindings(record)
    findings.push(...rules)
    if (rules.some(isError)) continue
    accepted.push(record)
  }

  findings.push(...dependencyCycles(accepted))

  accepted.sort((left, right) => compareCodeUnit(left.id, right.id))
  findings.sort(compareFindings)

  return Object.freeze({
    records: Object.freeze(accepted),
    findings: Object.freeze(findings),
    precedence: Object.freeze(precedenceFor(accepted)),
  })
}

function isPolicy(value: unknown): value is ContainmentDispositionOperatorPolicy {
  if (!isRecord(value)) return false
  const keys = Object.keys(value)
  if (keys.length !== POLICY_KEYS.size) return false
  if (!keys.every((key) => POLICY_KEYS.has(key))) return false
  return (
    typeof value.revealRationale === 'boolean' && typeof value.revealAuthorization === 'boolean'
  )
}

/**
 * Redacted operator summary. Hidden rationale and authorization refs are omitted.
 * A record this registry would reject returns undefined.
 */
export function projectDispositionForOperator(
  record: unknown,
  policy: unknown
): ContainmentDispositionOperatorSummary | undefined {
  if (!isPolicy(policy)) return undefined
  const parsed = parseRecord(record)
  if (!('record' in parsed)) return undefined
  if (ruleFindings(parsed.record).some(isError)) return undefined

  const source = parsed.record
  return Object.freeze({
    recordId: source.id,
    subjectId: source.subjectId,
    kind: source.kind,
    confidence: source.confidence,
    reviewWeek: source.reviewWeek,
    failureWarnings: source.failureWarnings,
    alternatives: source.alternatives ?? Object.freeze([]),
    ...(source.emergentDefensiveSideEffect !== undefined
      ? { emergentDefensiveSideEffect: source.emergentDefensiveSideEffect }
      : {}),
    ...(policy.revealRationale ? { rationaleCodes: source.rationaleCodes } : {}),
    ...(policy.revealAuthorization && source.authorizationRef !== undefined
      ? { authorizationRef: source.authorizationRef }
      : {}),
  })
}

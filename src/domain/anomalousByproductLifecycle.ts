/**
 * SPE-2103 — pure anomalous-byproduct lifecycle registry (slice 1).
 *
 * Caller-owned lots track toxic or esoteric residue from source anomaly through
 * vessel, abatement, storage, and disposal, plus a subsystem failure clock.
 * This module does not persist GameState, run week-close, draw facility UI, or
 * import franchise section names. Salvage recovery stays with SPE-1055.
 */

export type ByproductLotId = string

export const BYPRODUCT_LIFECYCLE_STAGES = [
  'source',
  'vessel',
  'abatement',
  'disposal',
] as const
export type ByproductLifecycleStage = (typeof BYPRODUCT_LIFECYCLE_STAGES)[number]

export const BYPRODUCT_LOT_STATUSES = ['active', 'disposed', 'quarantined'] as const
export type ByproductLotStatus = (typeof BYPRODUCT_LOT_STATUSES)[number]

export const BYPRODUCT_FAILURE_CLOCK_KINDS = ['annual', 'recurring', 'custom'] as const
export type ByproductFailureClockKind = (typeof BYPRODUCT_FAILURE_CLOCK_KINDS)[number]

export const BYPRODUCT_HAZARD_CLASSES = [
  'toxic_residue',
  'esoteric_residue',
  'corrosive_slurry',
  'volatile_gas',
] as const
export type ByproductHazardClass = (typeof BYPRODUCT_HAZARD_CLASSES)[number]

export const BYPRODUCT_FINDING_CODES = [
  'malformed',
  'orphan_lot',
  'missing_disposal_route',
  'failure_clock_without_emergency_hook',
  'hazard_buildup_without_incident',
] as const
export type ByproductFindingCode = (typeof BYPRODUCT_FINDING_CODES)[number]

export const BYPRODUCT_FINDING_SEVERITIES = ['error', 'warning'] as const
export type ByproductFindingSeverity = (typeof BYPRODUCT_FINDING_SEVERITIES)[number]

export const BYPRODUCT_RISK_BANDS = ['low', 'elevated', 'critical'] as const
export type ByproductRiskBand = (typeof BYPRODUCT_RISK_BANDS)[number]

/** Hazard buildup at or above this value requires an incident history ref. */
export const BYPRODUCT_HAZARD_BUILDUP_THRESHOLD = 75

export interface ByproductFailureClock {
  readonly kind: ByproductFailureClockKind
  readonly intervalWeeks: number
  readonly anchorWeek: number
  readonly emergencyResponseHook?: string
}

export interface ByproductLifecycleStageEvent {
  readonly stage: ByproductLifecycleStage
  readonly week: number
  readonly note?: string
}

export interface ByproductLifecycleRecord {
  readonly id: ByproductLotId
  readonly sourceSubjectRef: string
  readonly hazardClass: ByproductHazardClass
  readonly vesselId: string
  readonly processingSectionRef: string
  readonly abatementMethodCode: string
  readonly storageOutput: string
  readonly disposalRoute?: string
  readonly hazardBuildup: number
  readonly failureClock: ByproductFailureClock
  readonly incidentHistoryRefs: readonly string[]
  readonly status: ByproductLotStatus
  readonly auditTrail: readonly ByproductLifecycleStageEvent[]
}

export interface ByproductLifecycleFinding {
  readonly code: ByproductFindingCode
  readonly severity: ByproductFindingSeverity
  readonly lotId?: string
}

export interface ByproductLifecycleValidation {
  readonly records: readonly ByproductLifecycleRecord[]
  readonly findings: readonly ByproductLifecycleFinding[]
}

export interface ByproductRiskSummary {
  readonly lotId: string
  readonly riskBand: ByproductRiskBand
  readonly failureClockDue: boolean
  readonly warnings: readonly ByproductFindingCode[]
}

const RECORD_KEYS = new Set([
  'id',
  'sourceSubjectRef',
  'hazardClass',
  'vesselId',
  'processingSectionRef',
  'abatementMethodCode',
  'storageOutput',
  'disposalRoute',
  'hazardBuildup',
  'failureClock',
  'incidentHistoryRefs',
  'status',
  'auditTrail',
])

const CLOCK_KEYS = new Set(['kind', 'intervalWeeks', 'anchorWeek', 'emergencyResponseHook'])

const STAGE_EVENT_KEYS = new Set(['stage', 'week', 'note'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && !value.includes('\0')
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isHazardBuildup(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function compareCodeUnit(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function sortStrings(values: readonly string[]): readonly string[] {
  return [...values].sort(compareCodeUnit)
}

function parseStringList(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const out: string[] = []
  for (const item of value) {
    if (!isNonEmptyString(item)) return undefined
    out.push(item)
  }
  return sortStrings(out)
}

function parseFailureClock(value: unknown): ByproductFailureClock | undefined {
  if (!isRecord(value)) return undefined
  for (const key of Object.keys(value)) {
    if (!CLOCK_KEYS.has(key)) return undefined
  }
  if (
    !hasOwn(value, 'kind') ||
    !hasOwn(value, 'intervalWeeks') ||
    !hasOwn(value, 'anchorWeek')
  ) {
    return undefined
  }
  const kind = value.kind
  if (
    typeof kind !== 'string' ||
    !(BYPRODUCT_FAILURE_CLOCK_KINDS as readonly string[]).includes(kind)
  ) {
    return undefined
  }
  if (!isNonNegativeInt(value.intervalWeeks) || value.intervalWeeks < 1) return undefined
  if (!isNonNegativeInt(value.anchorWeek)) return undefined
  if (hasOwn(value, 'emergencyResponseHook')) {
    if (!isNonEmptyString(value.emergencyResponseHook)) return undefined
    return {
      kind: kind as ByproductFailureClockKind,
      intervalWeeks: value.intervalWeeks,
      anchorWeek: value.anchorWeek,
      emergencyResponseHook: value.emergencyResponseHook,
    }
  }
  return {
    kind: kind as ByproductFailureClockKind,
    intervalWeeks: value.intervalWeeks,
    anchorWeek: value.anchorWeek,
  }
}

function parseAuditTrail(value: unknown): readonly ByproductLifecycleStageEvent[] | undefined {
  if (!Array.isArray(value)) return undefined
  const out: ByproductLifecycleStageEvent[] = []
  for (const item of value) {
    if (!isRecord(item)) return undefined
    for (const key of Object.keys(item)) {
      if (!STAGE_EVENT_KEYS.has(key)) return undefined
    }
    if (!hasOwn(item, 'stage') || !hasOwn(item, 'week')) return undefined
    const stage = item.stage
    if (
      typeof stage !== 'string' ||
      !(BYPRODUCT_LIFECYCLE_STAGES as readonly string[]).includes(stage)
    ) {
      return undefined
    }
    if (!isNonNegativeInt(item.week)) return undefined
    if (hasOwn(item, 'note') && !isNonEmptyString(item.note)) return undefined
    const event: ByproductLifecycleStageEvent = hasOwn(item, 'note')
      ? {
          stage: stage as ByproductLifecycleStage,
          week: item.week,
          note: item.note as string,
        }
      : { stage: stage as ByproductLifecycleStage, week: item.week }
    out.push(event)
  }
  return out
}

function parseRecord(value: unknown): ByproductLifecycleRecord | undefined {
  if (!isRecord(value)) return undefined
  for (const key of Object.keys(value)) {
    if (!RECORD_KEYS.has(key)) return undefined
  }
  const required = [
    'id',
    'sourceSubjectRef',
    'hazardClass',
    'vesselId',
    'processingSectionRef',
    'abatementMethodCode',
    'storageOutput',
    'hazardBuildup',
    'failureClock',
    'incidentHistoryRefs',
    'status',
    'auditTrail',
  ] as const
  for (const key of required) {
    if (!hasOwn(value, key)) return undefined
  }
  if (!isNonEmptyString(value.id)) return undefined
  if (typeof value.sourceSubjectRef !== 'string' || value.sourceSubjectRef.includes('\0')) {
    return undefined
  }
  const hazardClass = value.hazardClass
  if (
    typeof hazardClass !== 'string' ||
    !(BYPRODUCT_HAZARD_CLASSES as readonly string[]).includes(hazardClass)
  ) {
    return undefined
  }
  if (!isNonEmptyString(value.vesselId)) return undefined
  if (!isNonEmptyString(value.processingSectionRef)) return undefined
  if (!isNonEmptyString(value.abatementMethodCode)) return undefined
  if (!isNonEmptyString(value.storageOutput)) return undefined
  if (!isHazardBuildup(value.hazardBuildup)) return undefined
  const status = value.status
  if (
    typeof status !== 'string' ||
    !(BYPRODUCT_LOT_STATUSES as readonly string[]).includes(status)
  ) {
    return undefined
  }
  const failureClock = parseFailureClock(value.failureClock)
  if (!failureClock) return undefined
  const incidentHistoryRefs = parseStringList(value.incidentHistoryRefs)
  if (!incidentHistoryRefs) return undefined
  const auditTrail = parseAuditTrail(value.auditTrail)
  if (!auditTrail) return undefined
  if (hasOwn(value, 'disposalRoute') && !isNonEmptyString(value.disposalRoute)) {
    return undefined
  }

  const base: ByproductLifecycleRecord = {
    id: value.id,
    sourceSubjectRef: value.sourceSubjectRef,
    hazardClass: hazardClass as ByproductHazardClass,
    vesselId: value.vesselId,
    processingSectionRef: value.processingSectionRef,
    abatementMethodCode: value.abatementMethodCode,
    storageOutput: value.storageOutput,
    hazardBuildup: value.hazardBuildup,
    failureClock,
    incidentHistoryRefs,
    status: status as ByproductLotStatus,
    auditTrail,
  }
  if (hasOwn(value, 'disposalRoute')) {
    return { ...base, disposalRoute: value.disposalRoute as string }
  }
  return base
}

function findingSortKey(finding: ByproductLifecycleFinding): string {
  return [
    finding.severity === 'error' ? '0' : '1',
    finding.code,
    finding.lotId ?? '',
  ].join('\0')
}

function sortFindings(
  findings: readonly ByproductLifecycleFinding[]
): readonly ByproductLifecycleFinding[] {
  return [...findings].sort((a, b) => compareCodeUnit(findingSortKey(a), findingSortKey(b)))
}

function isFailureClockDue(clock: ByproductFailureClock, week: number): boolean {
  if (!isNonNegativeInt(week)) return false
  if (week < clock.anchorWeek) return false
  const elapsed = week - clock.anchorWeek
  return elapsed % clock.intervalWeeks === 0
}

/**
 * Lint caller-owned byproduct lots. Accepted records are normalized (sorted
 * string lists). Input order does not change accepted set or findings once sorted.
 */
export function validateByproductLifecycle(
  records: unknown
): ByproductLifecycleValidation {
  if (!Array.isArray(records)) {
    return {
      records: [],
      findings: sortFindings([{ code: 'malformed', severity: 'error' }]),
    }
  }

  const findings: ByproductLifecycleFinding[] = []
  const accepted: ByproductLifecycleRecord[] = []
  const seenIds = new Set<string>()

  for (const raw of records) {
    const parsed = parseRecord(raw)
    if (!parsed) {
      const lotId =
        isRecord(raw) && isNonEmptyString(raw.id) ? raw.id : undefined
      findings.push({ code: 'malformed', severity: 'error', lotId })
      continue
    }
    if (seenIds.has(parsed.id)) {
      findings.push({ code: 'malformed', severity: 'error', lotId: parsed.id })
      continue
    }
    seenIds.add(parsed.id)

    if (parsed.sourceSubjectRef.length === 0) {
      findings.push({ code: 'orphan_lot', severity: 'error', lotId: parsed.id })
      continue
    }

    let reject = false
    if (parsed.status === 'active' && !parsed.disposalRoute) {
      findings.push({
        code: 'missing_disposal_route',
        severity: 'error',
        lotId: parsed.id,
      })
      reject = true
    }
    if (reject) continue

    if (!parsed.failureClock.emergencyResponseHook) {
      findings.push({
        code: 'failure_clock_without_emergency_hook',
        severity: 'warning',
        lotId: parsed.id,
      })
    }
    if (
      parsed.hazardBuildup >= BYPRODUCT_HAZARD_BUILDUP_THRESHOLD &&
      parsed.incidentHistoryRefs.length === 0
    ) {
      findings.push({
        code: 'hazard_buildup_without_incident',
        severity: 'warning',
        lotId: parsed.id,
      })
    }

    accepted.push(parsed)
  }

  accepted.sort((a, b) => compareCodeUnit(a.id, b.id))
  return {
    records: accepted,
    findings: sortFindings(findings),
  }
}

/**
 * Operator-facing risk band for one lot at a campaign week.
 * Returns undefined when the packet would be rejected as malformed or orphaned.
 */
export function projectByproductRiskSummary(
  record: unknown,
  week: unknown
): ByproductRiskSummary | undefined {
  if (!isNonNegativeInt(week)) return undefined
  const validation = validateByproductLifecycle([record])
  const accepted = validation.records[0]
  if (!accepted) return undefined

  const warnings = validation.findings
    .filter((finding) => finding.severity === 'warning' && finding.lotId === accepted.id)
    .map((finding) => finding.code)

  const failureClockDue = isFailureClockDue(accepted.failureClock, week)

  let riskBand: ByproductRiskBand = 'low'
  if (
    accepted.hazardBuildup >= BYPRODUCT_HAZARD_BUILDUP_THRESHOLD ||
    failureClockDue ||
    warnings.length > 0
  ) {
    riskBand = 'elevated'
  }
  if (
    (accepted.hazardBuildup >= BYPRODUCT_HAZARD_BUILDUP_THRESHOLD && failureClockDue) ||
    (failureClockDue && !accepted.failureClock.emergencyResponseHook)
  ) {
    riskBand = 'critical'
  }

  return {
    lotId: accepted.id,
    riskBand,
    failureClockDue,
    warnings: sortStrings(warnings) as readonly ByproductFindingCode[],
  }
}

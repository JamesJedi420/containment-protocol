/**
 * SPE-2138 slice 1: label-driven room-function override registry.
 *
 * Bounded records for cases in which a sign or label alters a room's effective
 * function instead of merely describing it. Distinguishes intended room use
 * from effective room function. Does not create a second general room,
 * facility, or spatial transformation engine.
 */

export const OVERRIDE_STRENGTHS = ['weak', 'moderate', 'strong', 'absolute'] as const
export type OverrideStrength = (typeof OVERRIDE_STRENGTHS)[number]

export interface LabelDrivenRoomFunctionRecord {
  readonly id: string
  readonly signRef: string
  readonly intendedFunction: string
  readonly actualFunction: string
  readonly overrideStrength: OverrideStrength
}

export interface LabelDrivenRoomFunctionValidationIssue {
  readonly code: string
  readonly field: string
  readonly recordId?: string
}

export interface LabelDrivenRoomFunctionValidationResult {
  readonly valid: boolean
  readonly issues: readonly LabelDrivenRoomFunctionValidationIssue[]
}

const STRENGTH_SET: ReadonlySet<string> = new Set(OVERRIDE_STRENGTHS)
const RECORD_ID = /^room-function-override:[a-z0-9]+(?:-[a-z0-9]+)*$/
const SIGN_REF = /^sign:[a-z0-9]+(?:-[a-z0-9]+)*$/
const FUNCTION_REF = /^function:[a-z0-9]+(?:-[a-z0-9]+)*$/

function token(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function compareStrings(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function freezeRecord(input: LabelDrivenRoomFunctionRecord): LabelDrivenRoomFunctionRecord {
  return Object.freeze({
    id: input.id,
    signRef: input.signRef,
    intendedFunction: input.intendedFunction,
    actualFunction: input.actualFunction,
    overrideStrength: input.overrideStrength,
  })
}

function issuesResult(
  issues: LabelDrivenRoomFunctionValidationIssue[]
): LabelDrivenRoomFunctionValidationResult {
  const ordered = issues
    .slice()
    .sort(
      (a, b) =>
        compareStrings(a.code, b.code) ||
        compareStrings(a.field, b.field) ||
        compareStrings(a.recordId ?? '', b.recordId ?? '')
    )
  return Object.freeze({
    valid: ordered.length === 0,
    issues: Object.freeze(ordered.map((issue) => Object.freeze({ ...issue }))),
  })
}

function validateRecord(
  input: unknown,
  index: number,
  issues: LabelDrivenRoomFunctionValidationIssue[],
  seenIds: Set<string>
): LabelDrivenRoomFunctionRecord | null {
  const field = `records[${index}]`
  if (!isPlainRecord(input)) {
    issues.push({ code: 'invalid_record', field })
    return null
  }

  const id = token(input.id)
  const signRef = token(input.signRef)
  const intendedFunction = token(input.intendedFunction)
  const actualFunction = token(input.actualFunction)
  const strength = token(input.overrideStrength)
  let legal = true

  if (!RECORD_ID.test(id)) {
    issues.push({
      code: 'invalid_record_id',
      field: `${field}.id`,
      ...(id ? { recordId: id } : {}),
    })
    legal = false
  } else {
    if (seenIds.has(id)) {
      issues.push({ code: 'duplicate_record_id', field: `${field}.id`, recordId: id })
    }
    seenIds.add(id)
  }
  if (!SIGN_REF.test(signRef)) {
    issues.push({
      code: 'invalid_sign_ref',
      field: `${field}.signRef`,
      ...(id ? { recordId: id } : {}),
    })
    legal = false
  }
  if (!FUNCTION_REF.test(intendedFunction)) {
    issues.push({
      code: 'invalid_intended_function',
      field: `${field}.intendedFunction`,
      ...(id ? { recordId: id } : {}),
    })
    legal = false
  }
  if (!FUNCTION_REF.test(actualFunction)) {
    issues.push({
      code: 'invalid_actual_function',
      field: `${field}.actualFunction`,
      ...(id ? { recordId: id } : {}),
    })
    legal = false
  }
  if (intendedFunction === actualFunction && intendedFunction) {
    issues.push({
      code: 'functions_not_distinct',
      field: `${field}.actualFunction`,
      recordId: id,
    })
    legal = false
  }
  if (!STRENGTH_SET.has(strength)) {
    issues.push({
      code: 'unknown_override_strength',
      field: `${field}.overrideStrength`,
      ...(id ? { recordId: id } : {}),
    })
    legal = false
  }

  if (!legal) return null

  return freezeRecord({
    id,
    signRef,
    intendedFunction,
    actualFunction,
    overrideStrength: strength as OverrideStrength,
  })
}

function parseRegistry(input: unknown): {
  records: LabelDrivenRoomFunctionRecord[]
  validation: LabelDrivenRoomFunctionValidationResult
} {
  const records: LabelDrivenRoomFunctionRecord[] = []
  if (!Array.isArray(input)) {
    return { records, validation: issuesResult([{ code: 'invalid_registry', field: 'records' }]) }
  }

  const issues: LabelDrivenRoomFunctionValidationIssue[] = []
  const seenIds = new Set<string>()

  for (let index = 0; index < input.length; index += 1) {
    const record = validateRecord(input[index], index, issues, seenIds)
    if (!record) continue
    records.push(record)
  }

  return { records, validation: issuesResult(issues) }
}

export function validateLabelDrivenRoomFunctionRecords(
  input: unknown
): LabelDrivenRoomFunctionValidationResult {
  return parseRegistry(input).validation
}

export function normalizeLabelDrivenRoomFunctionRecords(
  input: readonly LabelDrivenRoomFunctionRecord[]
): readonly LabelDrivenRoomFunctionRecord[] | null {
  const { validation, records } = parseRegistry(input)
  if (!validation.valid) return null
  const ordered = records.sort((a, b) => compareStrings(a.id, b.id))
  return Object.freeze(ordered)
}

/** Authored slice-1 fixtures. Not live campaign state. */
export const LABEL_DRIVEN_ROOM_FUNCTION_FIXTURE_RECORDS: readonly LabelDrivenRoomFunctionRecord[] =
  Object.freeze([
    Object.freeze({
      id: 'room-function-override:storage-to-containment',
      signRef: 'sign:containment-zone',
      intendedFunction: 'function:storage',
      actualFunction: 'function:containment',
      overrideStrength: 'strong',
    }),
    Object.freeze({
      id: 'room-function-override:office-to-lab',
      signRef: 'sign:research-lab',
      intendedFunction: 'function:office',
      actualFunction: 'function:laboratory',
      overrideStrength: 'moderate',
    }),
  ])

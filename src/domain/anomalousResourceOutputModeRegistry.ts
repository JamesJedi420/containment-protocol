/**
 * SPE-2195 slice 1: anomalous resource-output mode registry.
 *
 * Artifact-side output-definition metadata only. Downstream resource owners
 * consume the canonical reference and occurrence identity; this registry
 * does not mutate inventory, allocate resources, or own progression.
 */

export const OUTPUT_MODES = ['continuous', 'burst', 'on_demand', 'conditional'] as const
export type OutputMode = (typeof OUTPUT_MODES)[number]

export const COMMAND_INTERFACES = ['manual', 'automated', 'gated', 'none'] as const
export type CommandInterface = (typeof COMMAND_INTERFACES)[number]

export const HAZARD_BANDS = ['none', 'low', 'moderate', 'high', 'extreme'] as const
export type HazardBand = (typeof HAZARD_BANDS)[number]

const CANONICAL_RESOURCE_REF = /^resource:[a-z0-9]+(?:-[a-z0-9]+)*$/
const OCCURRENCE_ID = /^occurrence:[a-z0-9]+(?:-[a-z0-9]+)*$/

export interface AnomalousResourceOutputMode {
  readonly id: string
  readonly outputMode: OutputMode
  readonly flowRate: number
  readonly commandInterface: CommandInterface
  readonly hazardBand: HazardBand
  readonly canonicalResourceRef: string
  readonly occurrenceIdentity: string
}

export interface OutputModeValidationIssue {
  readonly code: string
  readonly field: string
  readonly recordId?: string
}

export interface OutputModeValidationResult {
  readonly valid: boolean
  readonly issues: readonly OutputModeValidationIssue[]
}

const MODE_SET: ReadonlySet<string> = new Set(OUTPUT_MODES)
const INTERFACE_SET: ReadonlySet<string> = new Set(COMMAND_INTERFACES)
const HAZARD_SET: ReadonlySet<string> = new Set(HAZARD_BANDS)

function token(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function freezeRecord(input: AnomalousResourceOutputMode): AnomalousResourceOutputMode {
  return Object.freeze({ ...input })
}

function issuesResult(issues: OutputModeValidationIssue[]): OutputModeValidationResult {
  const ordered = issues.slice().sort((a, b) => a.code.localeCompare(b.code) || a.field.localeCompare(b.field))
  return Object.freeze({
    valid: ordered.length === 0,
    issues: Object.freeze(ordered.map((issue) => Object.freeze({ ...issue }))),
  })
}

function validateRecord(input: unknown, index: number, issues: OutputModeValidationIssue[]): AnomalousResourceOutputMode | null {
  const field = `records[${index}]`
  if (!isPlainRecord(input)) {
    issues.push({ code: 'invalid_record', field })
    return null
  }

  const id = token(input.id)
  const outputMode = token(input.outputMode)
  const commandInterface = token(input.commandInterface)
  const hazardBand = token(input.hazardBand)
  const canonicalResourceRef = token(input.canonicalResourceRef)
  const occurrenceIdentity = token(input.occurrenceIdentity)
  const flowRateRaw = input.flowRate

  let legal = true

  if (!id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    issues.push({ code: 'invalid_id', field: `${field}.id`, ...(id ? { recordId: id } : {}) })
    legal = false
  }
  if (!MODE_SET.has(outputMode)) {
    issues.push({ code: 'unknown_output_mode', field: `${field}.outputMode`, ...(id ? { recordId: id } : {}) })
    legal = false
  }
  if (!INTERFACE_SET.has(commandInterface)) {
    issues.push({ code: 'unknown_command_interface', field: `${field}.commandInterface`, ...(id ? { recordId: id } : {}) })
    legal = false
  }
  if (!HAZARD_SET.has(hazardBand)) {
    issues.push({ code: 'unknown_hazard_band', field: `${field}.hazardBand`, ...(id ? { recordId: id } : {}) })
    legal = false
  }
  if (!CANONICAL_RESOURCE_REF.test(canonicalResourceRef)) {
    issues.push({ code: 'invalid_canonical_resource_ref', field: `${field}.canonicalResourceRef`, ...(id ? { recordId: id } : {}) })
    legal = false
  }
  if (!OCCURRENCE_ID.test(occurrenceIdentity)) {
    issues.push({ code: 'invalid_occurrence_identity', field: `${field}.occurrenceIdentity`, ...(id ? { recordId: id } : {}) })
    legal = false
  }
  if (typeof flowRateRaw !== 'number' || !Number.isFinite(flowRateRaw) || flowRateRaw < 0) {
    issues.push({ code: 'invalid_flow_rate', field: `${field}.flowRate`, ...(id ? { recordId: id } : {}) })
    legal = false
  }

  if (!legal) return null

  return freezeRecord({
    id,
    outputMode: outputMode as OutputMode,
    flowRate: flowRateRaw as number,
    commandInterface: commandInterface as CommandInterface,
    hazardBand: hazardBand as HazardBand,
    canonicalResourceRef,
    occurrenceIdentity,
  })
}

export function validateAnomalousResourceOutputModes(input: unknown): OutputModeValidationResult {
  if (!Array.isArray(input)) {
    return issuesResult([{ code: 'invalid_registry', field: 'records' }])
  }

  const issues: OutputModeValidationIssue[] = []
  const seenIds = new Set<string>()

  for (let index = 0; index < input.length; index += 1) {
    const record = validateRecord(input[index], index, issues)
    if (!record) continue
    if (seenIds.has(record.id)) {
      issues.push({ code: 'duplicate_id', field: `records[${index}].id`, recordId: record.id })
    }
    seenIds.add(record.id)
  }

  return issuesResult(issues)
}

export function normalizeAnomalousResourceOutputModes(
  input: readonly AnomalousResourceOutputMode[]
): readonly AnomalousResourceOutputMode[] | null {
  const validation = validateAnomalousResourceOutputModes(input)
  if (!validation.valid) return null
  const ordered = input
    .map((record, index) => validateRecord(record, index, [])!)
    .sort((a, b) => a.id.localeCompare(b.id))
  return Object.freeze(ordered)
}

export const ANOMALOUS_RESOURCE_OUTPUT_MODE_FIXTURES: readonly AnomalousResourceOutputMode[] = Object.freeze([
  Object.freeze({
    id: 'generator-alpha',
    outputMode: 'continuous',
    flowRate: 1.5,
    commandInterface: 'manual',
    hazardBand: 'low',
    canonicalResourceRef: 'resource:stabilized-plasma',
    occurrenceIdentity: 'occurrence:alpha-cycle-1',
  }),
  Object.freeze({
    id: 'generator-beta',
    outputMode: 'burst',
    flowRate: 0,
    commandInterface: 'gated',
    hazardBand: 'moderate',
    canonicalResourceRef: 'resource:exotic-matter',
    occurrenceIdentity: 'occurrence:beta-pulse',
  }),
])

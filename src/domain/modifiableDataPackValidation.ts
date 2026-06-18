/**
 * SPE-75 follow-up slice 1: modifiable data pack safe-fail validation.
 *
 * Pure deterministic schema validation that accepts structured modifiable
 * data-pack payloads and emits bounded validation decisions — no UI,
 * persistence writes, or publish actions.
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type ModifiableDataPackKind =
  | 'tuning_table'
  | 'content_accessory'
  | 'reference_sheet'
  | 'doctrine_note'

export const MODIFIABLE_DATA_PACK_KINDS: readonly ModifiableDataPackKind[] = [
  'tuning_table',
  'content_accessory',
  'reference_sheet',
  'doctrine_note',
] as const

export type ModifiableFieldType = 'string' | 'number' | 'boolean' | 'string_array'

export const MODIFIABLE_FIELD_TYPES: readonly ModifiableFieldType[] = [
  'string',
  'number',
  'boolean',
  'string_array',
] as const

export type DataPackValidationStatus = 'applied' | 'needs_revision' | 'rejected'

export const DATA_PACK_VALIDATION_STATUSES: readonly DataPackValidationStatus[] = [
  'applied',
  'needs_revision',
  'rejected',
] as const

export type DataPackValidationCode =
  | 'invalid_payload'
  | 'missing_pack_id'
  | 'missing_schema_version'
  | 'invalid_schema_version'
  | 'missing_pack_kind'
  | 'invalid_pack_kind'
  | 'missing_modifiable_sections'
  | 'invalid_modifiable_section_shape'
  | 'missing_section_key'
  | 'duplicate_section_keys'
  | 'invalid_field_type'
  | 'default_value_type_mismatch'

export type DataPackRemediationCode = 'schema_version_borderline'

export type DataPackReasonCode = DataPackValidationCode | DataPackRemediationCode

// ---------------------------------------------------------------------------
// Payload, policy, and envelopes
// ---------------------------------------------------------------------------

export interface ModifiableSectionDefinition {
  readonly sectionKey?: string
  readonly fieldType?: string
  readonly defaultValue?: unknown
}

export interface ModifiableDataPackPayload {
  readonly packId?: string
  readonly schemaVersion?: string
  readonly packKind?: string
  readonly authorRef?: string
  readonly modifiableSections?: readonly ModifiableSectionDefinition[]
  readonly issueLink?: string
}

export interface DataPackValidationPolicy {
  readonly minimumSchemaVersion?: string
  readonly recommendedSchemaVersion?: string
  readonly supportedSchemaVersions?: readonly string[]
}

export interface DataPackValidationIssue {
  readonly code: DataPackValidationCode
  readonly severity: 'error'
  readonly detail: string
}

export interface DataPackRemediationNote {
  readonly code: DataPackRemediationCode
  readonly note: string
}

export interface DataPackValidationMetadata {
  readonly packId: string
  readonly schemaVersion: string
  readonly packKind: ModifiableDataPackKind
  readonly authorRef: string
  readonly sectionCount: number
  readonly issueLink: string
}

export interface DataPackValidationDecision {
  readonly status: DataPackValidationStatus
  readonly validationIssues: readonly DataPackValidationIssue[]
  readonly reasonCodes: readonly DataPackReasonCode[]
  readonly remediationNotes: readonly DataPackRemediationNote[]
  readonly packMetadata?: DataPackValidationMetadata
}

// ---------------------------------------------------------------------------
// Calibration
// ---------------------------------------------------------------------------

const PACK_KIND_SET = new Set<string>(MODIFIABLE_DATA_PACK_KINDS)
const FIELD_TYPE_SET = new Set<string>(MODIFIABLE_FIELD_TYPES)

const DEFAULT_SUPPORTED_SCHEMA_VERSIONS: readonly string[] = Object.freeze([
  '1.0.0',
  '1.1.0',
  '2.0.0',
])

const DEFAULT_POLICY: Required<
  Pick<DataPackValidationPolicy, 'minimumSchemaVersion' | 'recommendedSchemaVersion'>
> &
  Pick<DataPackValidationPolicy, 'supportedSchemaVersions'> = {
  minimumSchemaVersion: '1.0.0',
  recommendedSchemaVersion: '1.1.0',
  supportedSchemaVersions: DEFAULT_SUPPORTED_SCHEMA_VERSIONS,
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

export const CANONICAL_MODIFIABLE_DATA_PACK_FIXTURE: ModifiableDataPackPayload = Object.freeze({
  packId: 'datapack:tuning-containment-thresholds',
  schemaVersion: '1.1.0',
  packKind: 'tuning_table',
  authorRef: 'contributor:agent-maintainer',
  issueLink: 'SPE-2479',
  modifiableSections: Object.freeze([
    Object.freeze({
      sectionKey: 'containment.alertThreshold',
      fieldType: 'number',
      defaultValue: 0.75,
    }),
    Object.freeze({
      sectionKey: 'containment.escalationLabels',
      fieldType: 'string_array',
      defaultValue: Object.freeze(['watch', 'elevated', 'critical']),
    }),
    Object.freeze({
      sectionKey: 'containment.autoNotify',
      fieldType: 'boolean',
      defaultValue: true,
    }),
  ]),
})

export const BORDERLINE_SCHEMA_DATA_PACK_FIXTURE: ModifiableDataPackPayload = Object.freeze({
  packId: 'datapack:reference-sheet-borderline',
  schemaVersion: '1.0.0',
  packKind: 'reference_sheet',
  authorRef: 'contributor:community-author',
  issueLink: 'SPE-75',
  modifiableSections: Object.freeze([
    Object.freeze({
      sectionKey: 'reference.title',
      fieldType: 'string',
      defaultValue: 'Containment reference sheet',
    }),
    Object.freeze({
      sectionKey: 'reference.revision',
      fieldType: 'number',
      defaultValue: 1,
    }),
  ]),
})

export const INVALID_MODIFIABLE_DATA_PACK_FIXTURE: ModifiableDataPackPayload = Object.freeze({
  packId: '',
  schemaVersion: '0.9.0',
  packKind: 'unsupported_kind',
  authorRef: '',
  modifiableSections: Object.freeze([
    Object.freeze({
      sectionKey: 'duplicate.key',
      fieldType: 'text',
      defaultValue: 42,
    }),
    Object.freeze({
      sectionKey: 'duplicate.key',
      fieldType: 'boolean',
      defaultValue: 'not-a-boolean',
    }),
    'not-an-object' as unknown as ModifiableSectionDefinition,
  ]),
})

export const PARTIAL_MODIFIABLE_DATA_PACK_FIXTURE: ModifiableDataPackPayload = Object.freeze({
  packId: 'datapack:partial-sections',
  schemaVersion: '1.1.0',
  packKind: 'doctrine_note',
  modifiableSections: Object.freeze([
    Object.freeze({
      fieldType: 'string',
      defaultValue: 'Missing section key',
    }),
  ]),
})

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isModifiableDataPackKind(value: string): value is ModifiableDataPackKind {
  return PACK_KIND_SET.has(value)
}

export function isModifiableFieldType(value: string): value is ModifiableFieldType {
  return FIELD_TYPE_SET.has(value)
}

export function isDataPackValidationStatus(value: string): value is DataPackValidationStatus {
  return DATA_PACK_VALIDATION_STATUSES.includes(value as DataPackValidationStatus)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function resolvePolicy(policy?: DataPackValidationPolicy): {
  readonly minimumSchemaVersion: string
  readonly recommendedSchemaVersion: string
  readonly supportedSchemaVersions: readonly string[]
} {
  const supportedSchemaVersions =
    policy?.supportedSchemaVersions && policy.supportedSchemaVersions.length > 0
      ? [...policy.supportedSchemaVersions].sort((left, right) => left.localeCompare(right))
      : DEFAULT_POLICY.supportedSchemaVersions!

  return {
    minimumSchemaVersion:
      policy?.minimumSchemaVersion ?? DEFAULT_POLICY.minimumSchemaVersion,
    recommendedSchemaVersion:
      policy?.recommendedSchemaVersion ?? DEFAULT_POLICY.recommendedSchemaVersion,
    supportedSchemaVersions: Object.freeze(supportedSchemaVersions),
  }
}

function schemaVersionRank(version: string, supportedVersions: readonly string[]): number {
  return supportedVersions.indexOf(version)
}

function isSupportedSchemaVersion(version: string, supportedVersions: readonly string[]): boolean {
  return schemaVersionRank(version, supportedVersions) >= 0
}

function isBorderlineSchemaVersion(
  version: string,
  policy: ReturnType<typeof resolvePolicy>
): boolean {
  const versionRank = schemaVersionRank(version, policy.supportedSchemaVersions)
  const recommendedRank = schemaVersionRank(
    policy.recommendedSchemaVersion,
    policy.supportedSchemaVersions
  )
  const minimumRank = schemaVersionRank(
    policy.minimumSchemaVersion,
    policy.supportedSchemaVersions
  )

  return versionRank >= minimumRank && versionRank < recommendedRank
}

function defaultValueMatchesFieldType(
  fieldType: ModifiableFieldType,
  defaultValue: unknown
): boolean {
  switch (fieldType) {
    case 'string':
      return typeof defaultValue === 'string'
    case 'number':
      return typeof defaultValue === 'number' && Number.isFinite(defaultValue)
    case 'boolean':
      return typeof defaultValue === 'boolean'
    case 'string_array':
      return (
        Array.isArray(defaultValue) &&
        defaultValue.every((entry) => typeof entry === 'string')
      )
    default: {
      const exhaustive: never = fieldType
      return exhaustive
    }
  }
}

function sortValidationIssues(issues: DataPackValidationIssue[]): DataPackValidationIssue[] {
  return [...issues].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code)
    if (codeOrder !== 0) {
      return codeOrder
    }

    return left.detail.localeCompare(right.detail)
  })
}

function sortRemediationNotes(notes: DataPackRemediationNote[]): DataPackRemediationNote[] {
  return [...notes].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code)
    if (codeOrder !== 0) {
      return codeOrder
    }

    return left.note.localeCompare(right.note)
  })
}

function freezeValidationResult(
  issues: DataPackValidationIssue[]
): { readonly valid: boolean; readonly issues: readonly DataPackValidationIssue[] } {
  const sortedIssues = sortValidationIssues(issues)

  return Object.freeze({
    valid: sortedIssues.length === 0,
    issues: Object.freeze(sortedIssues.map((issue) => Object.freeze({ ...issue }))),
  })
}

function freezeDecision(decision: DataPackValidationDecision): DataPackValidationDecision {
  return Object.freeze({
    status: decision.status,
    validationIssues: Object.freeze(decision.validationIssues),
    reasonCodes: Object.freeze([...decision.reasonCodes]),
    remediationNotes: Object.freeze(decision.remediationNotes),
    packMetadata: decision.packMetadata ? Object.freeze({ ...decision.packMetadata }) : undefined,
  })
}

function buildPackMetadata(
  payload: ModifiableDataPackPayload,
  packKind: ModifiableDataPackKind,
  sectionCount: number
): DataPackValidationMetadata {
  return Object.freeze({
    packId: normalizeToken(payload.packId),
    schemaVersion: normalizeToken(payload.schemaVersion),
    packKind,
    authorRef: normalizeToken(payload.authorRef),
    sectionCount,
    issueLink: normalizeToken(payload.issueLink),
  })
}

function collectValidationIssues(
  payload: ModifiableDataPackPayload,
  policy: ReturnType<typeof resolvePolicy>
): DataPackValidationIssue[] {
  const issues: DataPackValidationIssue[] = []
  const packId = normalizeToken(payload.packId)
  const schemaVersion = normalizeToken(payload.schemaVersion)
  const packKindToken = normalizeToken(payload.packKind)
  const sections = payload.modifiableSections

  if (!packId) {
    issues.push({
      code: 'missing_pack_id',
      severity: 'error',
      detail: 'Modifiable data-pack payload is missing packId.',
    })
  }

  if (!schemaVersion) {
    issues.push({
      code: 'missing_schema_version',
      severity: 'error',
      detail: 'Modifiable data-pack payload is missing schemaVersion.',
    })
  } else if (!isSupportedSchemaVersion(schemaVersion, policy.supportedSchemaVersions)) {
    issues.push({
      code: 'invalid_schema_version',
      severity: 'error',
      detail: `Modifiable data-pack payload has unsupported schemaVersion "${schemaVersion}".`,
    })
  }

  if (!packKindToken) {
    issues.push({
      code: 'missing_pack_kind',
      severity: 'error',
      detail: 'Modifiable data-pack payload is missing packKind.',
    })
  } else if (!isModifiableDataPackKind(packKindToken)) {
    issues.push({
      code: 'invalid_pack_kind',
      severity: 'error',
      detail: `Modifiable data-pack payload has invalid packKind "${packKindToken}".`,
    })
  }

  if (!Array.isArray(sections) || sections.length === 0) {
    issues.push({
      code: 'missing_modifiable_sections',
      severity: 'error',
      detail: 'Modifiable data-pack payload must include at least one modifiable section.',
    })
    return issues
  }

  const sectionKeys: string[] = []

  for (const section of sections) {
    if (!section || typeof section !== 'object' || Array.isArray(section)) {
      issues.push({
        code: 'invalid_modifiable_section_shape',
        severity: 'error',
        detail: 'Each modifiable section must be a plain object.',
      })
      continue
    }

    const sectionKey = normalizeToken(section.sectionKey)
    const fieldTypeToken = normalizeToken(section.fieldType)

    if (!sectionKey) {
      issues.push({
        code: 'missing_section_key',
        severity: 'error',
        detail: 'Each modifiable section must include a non-empty sectionKey.',
      })
    } else {
      sectionKeys.push(sectionKey)
    }

    if (!fieldTypeToken) {
      issues.push({
        code: 'invalid_field_type',
        severity: 'error',
        detail: 'Each modifiable section must include a fieldType.',
      })
    } else if (!isModifiableFieldType(fieldTypeToken)) {
      issues.push({
        code: 'invalid_field_type',
        severity: 'error',
        detail: `Modifiable section has invalid fieldType "${fieldTypeToken}".`,
      })
    } else if (
      section.defaultValue !== undefined &&
      !defaultValueMatchesFieldType(fieldTypeToken, section.defaultValue)
    ) {
      issues.push({
        code: 'default_value_type_mismatch',
        severity: 'error',
        detail: `Modifiable section "${sectionKey || '<unknown>'}" defaultValue does not match fieldType "${fieldTypeToken}".`,
      })
    }
  }

  const duplicateKeys = sectionKeys.filter(
    (key, index) => sectionKeys.indexOf(key) !== index
  )
  const uniqueDuplicateKeys = [...new Set(duplicateKeys)].sort((left, right) =>
    left.localeCompare(right)
  )

  for (const duplicateKey of uniqueDuplicateKeys) {
    issues.push({
      code: 'duplicate_section_keys',
      severity: 'error',
      detail: `Modifiable data-pack payload has duplicate sectionKey "${duplicateKey}".`,
    })
  }

  return issues
}

function collectRemediationNotes(
  payload: ModifiableDataPackPayload,
  policy: ReturnType<typeof resolvePolicy>
): DataPackRemediationNote[] {
  const schemaVersion = normalizeToken(payload.schemaVersion)

  if (!schemaVersion || !isBorderlineSchemaVersion(schemaVersion, policy)) {
    return []
  }

  return sortRemediationNotes([
    {
      code: 'schema_version_borderline',
      note: `Schema version "${schemaVersion}" is below recommended "${policy.recommendedSchemaVersion}"; upgrade pack schema before applying modifiable sections.`,
    },
  ])
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validateModifiableDataPackPayload(
  payload?: ModifiableDataPackPayload,
  policy?: DataPackValidationPolicy
): { readonly valid: boolean; readonly issues: readonly DataPackValidationIssue[] } {
  const resolvedPolicy = resolvePolicy(policy)

  if (!payload || typeof payload !== 'object') {
    return freezeValidationResult([
      {
        code: 'invalid_payload',
        severity: 'error',
        detail: 'Modifiable data-pack payload must be an object.',
      },
    ])
  }

  return freezeValidationResult(collectValidationIssues(payload, resolvedPolicy))
}

/**
 * SPE-75 follow-up baseline: deterministic modifiable data-pack schema validation
 * with safe-fail on corrupt structure — no persistence or publish side effects.
 */
export function evaluateModifiableDataPackValidation(
  payload?: ModifiableDataPackPayload,
  policy?: DataPackValidationPolicy
): DataPackValidationDecision {
  const resolvedPolicy = resolvePolicy(policy)
  const validation = validateModifiableDataPackPayload(payload, policy)

  if (!validation.valid) {
    const reasonCodes = [...new Set(validation.issues.map((issue) => issue.code))].sort(
      (left, right) => left.localeCompare(right)
    )

    return freezeDecision({
      status: 'rejected',
      validationIssues: validation.issues,
      reasonCodes,
      remediationNotes: Object.freeze([]),
    })
  }

  const packKind = normalizeToken(payload!.packKind) as ModifiableDataPackKind
  const sectionCount = payload!.modifiableSections!.length
  const remediationNotes = collectRemediationNotes(payload!, resolvedPolicy)

  if (remediationNotes.length > 0) {
    const reasonCodes = remediationNotes
      .map((note) => note.code)
      .sort((left, right) => left.localeCompare(right))

    return freezeDecision({
      status: 'needs_revision',
      validationIssues: Object.freeze([]),
      reasonCodes,
      remediationNotes: Object.freeze(remediationNotes.map((note) => Object.freeze({ ...note }))),
      packMetadata: buildPackMetadata(payload!, packKind, sectionCount),
    })
  }

  return freezeDecision({
    status: 'applied',
    validationIssues: Object.freeze([]),
    reasonCodes: Object.freeze([]),
    remediationNotes: Object.freeze([]),
    packMetadata: buildPackMetadata(payload!, packKind, sectionCount),
  })
}

// ---------------------------------------------------------------------------
// Runtime import persistence (SPE-2486 slice 1)
// ---------------------------------------------------------------------------

export type ModifiableDataPackRecordId = string

export type ModifiableDataPackImportStatus = Extract<
  DataPackValidationStatus,
  'applied' | 'needs_revision'
>

export interface ModifiableSectionRecord {
  readonly sectionKey: string
  readonly fieldType: ModifiableFieldType
  readonly defaultValue?: unknown
}

export interface ModifiableDataPackRecord {
  readonly packId: ModifiableDataPackRecordId
  readonly schemaVersion: string
  readonly packKind: ModifiableDataPackKind
  readonly authorRef: string
  readonly issueLink: string
  readonly modifiableSections: readonly ModifiableSectionRecord[]
  readonly importStatus: ModifiableDataPackImportStatus
  readonly reasonCodes: readonly DataPackReasonCode[]
}

export type ModifiableDataPackRecordsMap = Record<
  ModifiableDataPackRecordId,
  ModifiableDataPackRecord
>

export type ModifiableDataPackRecordValidationCode =
  | 'missing_pack_id'
  | 'missing_schema_version'
  | 'missing_pack_kind'
  | 'invalid_pack_kind'
  | 'missing_modifiable_sections'
  | 'invalid_section_shape'
  | 'invalid_import_status'
  | 'invalid_reason_code'
  | 'validation_rejected'

export interface ModifiableDataPackRecordValidationIssue {
  readonly code: ModifiableDataPackRecordValidationCode
  readonly severity: 'error'
  readonly detail: string
}

export interface ModifiableDataPackRecordValidationResult {
  readonly valid: boolean
  readonly issues: readonly ModifiableDataPackRecordValidationIssue[]
}

const DATA_PACK_REASON_CODE_SET = new Set<string>([
  'invalid_payload',
  'missing_pack_id',
  'missing_schema_version',
  'invalid_schema_version',
  'missing_pack_kind',
  'invalid_pack_kind',
  'missing_modifiable_sections',
  'invalid_modifiable_section_shape',
  'missing_section_key',
  'duplicate_section_keys',
  'invalid_field_type',
  'default_value_type_mismatch',
  'schema_version_borderline',
])

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isDataPackReasonCode(value: string): value is DataPackReasonCode {
  return DATA_PACK_REASON_CODE_SET.has(value)
}

function isModifiableDataPackImportStatus(
  value: string
): value is ModifiableDataPackImportStatus {
  return value === 'applied' || value === 'needs_revision'
}

function sortModifiableSections(
  sections: ModifiableSectionRecord[]
): readonly ModifiableSectionRecord[] {
  return Object.freeze(
    [...sections]
      .sort((left, right) => left.sectionKey.localeCompare(right.sectionKey))
      .map((section) =>
        Object.freeze({
          sectionKey: section.sectionKey,
          fieldType: section.fieldType,
          ...(section.defaultValue !== undefined ? { defaultValue: section.defaultValue } : {}),
        })
      )
  )
}

function parseModifiableSectionRecords(value: unknown): ModifiableSectionRecord[] {
  if (!Array.isArray(value)) {
    return []
  }

  const sections: ModifiableSectionRecord[] = []

  for (const entry of value) {
    if (!isPlainRecord(entry)) {
      continue
    }

    const sectionKey = normalizeToken(entry.sectionKey)
    const fieldTypeToken = normalizeToken(entry.fieldType)

    if (!sectionKey || !fieldTypeToken || !isModifiableFieldType(fieldTypeToken)) {
      continue
    }

    const defaultValue = entry.defaultValue

    sections.push({
      sectionKey,
      fieldType: fieldTypeToken,
      ...(defaultValue !== undefined ? { defaultValue } : {}),
    })
  }

  return sections
}

function modifiableDataPackRecordToPayload(
  record: ModifiableDataPackRecord
): ModifiableDataPackPayload {
  return {
    packId: record.packId,
    schemaVersion: record.schemaVersion,
    packKind: record.packKind,
    authorRef: record.authorRef,
    issueLink: record.issueLink,
    modifiableSections: record.modifiableSections.map((section) => ({
      sectionKey: section.sectionKey,
      fieldType: section.fieldType,
      ...(section.defaultValue !== undefined ? { defaultValue: section.defaultValue } : {}),
    })),
  }
}

function freezeModifiableDataPackRecordValidationResult(
  issues: ModifiableDataPackRecordValidationIssue[]
): ModifiableDataPackRecordValidationResult {
  const sortedIssues = [...issues].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code)
    if (codeOrder !== 0) {
      return codeOrder
    }

    return left.detail.localeCompare(right.detail)
  })

  return Object.freeze({
    valid: sortedIssues.length === 0,
    issues: Object.freeze(sortedIssues.map((issue) => Object.freeze({ ...issue }))),
  })
}

function defineModifiableDataPackRecord(
  record: ModifiableDataPackRecord
): ModifiableDataPackRecord {
  return Object.freeze({
    packId: normalizeToken(record.packId),
    schemaVersion: normalizeToken(record.schemaVersion),
    packKind: record.packKind,
    authorRef: normalizeToken(record.authorRef),
    issueLink: normalizeToken(record.issueLink),
    modifiableSections: sortModifiableSections([...record.modifiableSections]),
    importStatus: record.importStatus,
    reasonCodes: Object.freeze([...record.reasonCodes]),
  })
}

export function validateModifiableDataPackRecord(
  record: ModifiableDataPackRecord,
  policy?: DataPackValidationPolicy
): ModifiableDataPackRecordValidationResult {
  const issues: ModifiableDataPackRecordValidationIssue[] = []
  const packId = normalizeToken(record.packId)
  const schemaVersion = normalizeToken(record.schemaVersion)
  const packKindToken = normalizeToken(record.packKind)
  const importStatus = record.importStatus

  if (!packId) {
    issues.push({
      code: 'missing_pack_id',
      severity: 'error',
      detail: 'Modifiable data-pack record is missing packId.',
    })
  }

  if (!schemaVersion) {
    issues.push({
      code: 'missing_schema_version',
      severity: 'error',
      detail: 'Modifiable data-pack record is missing schemaVersion.',
    })
  }

  if (!packKindToken) {
    issues.push({
      code: 'missing_pack_kind',
      severity: 'error',
      detail: 'Modifiable data-pack record is missing packKind.',
    })
  } else if (!isModifiableDataPackKind(packKindToken)) {
    issues.push({
      code: 'invalid_pack_kind',
      severity: 'error',
      detail: `Modifiable data-pack record has invalid packKind "${packKindToken}".`,
    })
  }

  if (!Array.isArray(record.modifiableSections) || record.modifiableSections.length === 0) {
    issues.push({
      code: 'missing_modifiable_sections',
      severity: 'error',
      detail: 'Modifiable data-pack record must include at least one modifiable section.',
    })
  } else {
    for (const section of record.modifiableSections) {
      if (
        !section ||
        typeof section !== 'object' ||
        !normalizeToken(section.sectionKey) ||
        !isModifiableFieldType(section.fieldType)
      ) {
        issues.push({
          code: 'invalid_section_shape',
          severity: 'error',
          detail: 'Each modifiable section record must include sectionKey and fieldType.',
        })
        break
      }
    }
  }

  if (typeof importStatus !== 'string' || !isModifiableDataPackImportStatus(importStatus)) {
    issues.push({
      code: 'invalid_import_status',
      severity: 'error',
      detail: 'Modifiable data-pack record has invalid importStatus.',
    })
  }

  for (const reasonCode of record.reasonCodes) {
    if (!isDataPackReasonCode(reasonCode)) {
      issues.push({
        code: 'invalid_reason_code',
        severity: 'error',
        detail: `Modifiable data-pack record has invalid reasonCode "${reasonCode}".`,
      })
    }
  }

  if (issues.length > 0) {
    return freezeModifiableDataPackRecordValidationResult(issues)
  }

  const decision = evaluateModifiableDataPackValidation(
    modifiableDataPackRecordToPayload(record),
    policy
  )

  if (decision.status === 'rejected') {
    issues.push({
      code: 'validation_rejected',
      severity: 'error',
      detail: 'Modifiable data-pack record failed upstream schema validation.',
    })
  } else if (decision.status !== importStatus) {
    issues.push({
      code: 'invalid_import_status',
      severity: 'error',
      detail: `Modifiable data-pack record importStatus "${importStatus}" does not match validation decision "${decision.status}".`,
    })
  }

  const expectedReasonCodes = [...decision.reasonCodes].sort((left, right) =>
    left.localeCompare(right)
  )
  const actualReasonCodes = [...record.reasonCodes].sort((left, right) => left.localeCompare(right))

  if (actualReasonCodes.join('|') !== expectedReasonCodes.join('|')) {
    issues.push({
      code: 'invalid_reason_code',
      severity: 'error',
      detail: 'Modifiable data-pack record reasonCodes do not match validation decision.',
    })
  }

  return freezeModifiableDataPackRecordValidationResult(issues)
}

/**
 * Imports a modifiable data-pack payload through SPE-2479 validation and returns a
 * canonical runtime record, or null when validation rejects the payload.
 */
export function composeModifiableDataPackRecord(
  payload?: ModifiableDataPackPayload,
  policy?: DataPackValidationPolicy
): ModifiableDataPackRecord | null {
  const decision = evaluateModifiableDataPackValidation(payload, policy)

  if (decision.status === 'rejected' || !decision.packMetadata) {
    return null
  }

  const sections = parseModifiableSectionRecords(payload?.modifiableSections)

  if (sections.length === 0) {
    return null
  }

  const record = defineModifiableDataPackRecord({
    packId: decision.packMetadata.packId,
    schemaVersion: decision.packMetadata.schemaVersion,
    packKind: decision.packMetadata.packKind,
    authorRef: decision.packMetadata.authorRef,
    issueLink: decision.packMetadata.issueLink,
    modifiableSections: sections,
    importStatus: decision.status,
    reasonCodes: decision.reasonCodes,
  })

  return validateModifiableDataPackRecord(record, policy).valid ? record : null
}

/** Alias for compose — runtime import entry point for structured pack payloads. */
export function importModifiableDataPackPayload(
  payload?: ModifiableDataPackPayload,
  policy?: DataPackValidationPolicy
): ModifiableDataPackRecord | null {
  return composeModifiableDataPackRecord(payload, policy)
}

function sanitizeModifiableDataPackRecordEntry(
  value: unknown,
  policy?: DataPackValidationPolicy
): ModifiableDataPackRecord | null {
  if (!isPlainRecord(value)) {
    return null
  }

  const payload: ModifiableDataPackPayload = {
    packId: normalizeToken(value.packId),
    schemaVersion: normalizeToken(value.schemaVersion),
    packKind: normalizeToken(value.packKind),
    authorRef: normalizeToken(value.authorRef),
    issueLink: normalizeToken(value.issueLink),
    modifiableSections: parseModifiableSectionRecords(value.modifiableSections),
  }

  return composeModifiableDataPackRecord(payload, policy)
}

/** Hydration: canonical record map keyed by packId; drops invalid and duplicate-id entries. */
export function sanitizeModifiableDataPackRecords(
  value: unknown,
  fallback: ModifiableDataPackRecordsMap = {},
  policy?: DataPackValidationPolicy
): ModifiableDataPackRecordsMap {
  if (!isPlainRecord(value)) {
    return fallback
  }

  const next: ModifiableDataPackRecordsMap = {}
  const seenIds = new Set<string>()

  for (const entry of Object.values(value)) {
    const record = sanitizeModifiableDataPackRecordEntry(entry, policy)
    if (!record || seenIds.has(record.packId)) {
      continue
    }

    seenIds.add(record.packId)
    next[record.packId] = record
  }

  return Object.keys(next).length > 0 ? next : fallback
}

/** Applied pack record composed from the canonical SPE-2479 fixture chain. */
export const CANONICAL_MODIFIABLE_DATA_PACK_RECORD_FIXTURE: ModifiableDataPackRecord =
  defineModifiableDataPackRecord(
    composeModifiableDataPackRecord(CANONICAL_MODIFIABLE_DATA_PACK_FIXTURE)!
  )

/** Borderline-schema pack record composed from the SPE-2479 borderline fixture. */
export const BORDERLINE_MODIFIABLE_DATA_PACK_RECORD_FIXTURE: ModifiableDataPackRecord =
  defineModifiableDataPackRecord(
    composeModifiableDataPackRecord(BORDERLINE_SCHEMA_DATA_PACK_FIXTURE)!
  )

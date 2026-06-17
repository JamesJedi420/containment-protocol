/**
 * SPE-75 follow-up slice 1: disaster playbook wrong-document failure.
 *
 * Pure deterministic playbook variant discrimination that accepts structured
 * disaster playbook payloads and emits bounded application decisions when teams
 * apply the wrong document under pressure — no UI, persistence writes, or
 * publish actions.
 */

// ---------------------------------------------------------------------------
// Identifiers and unions
// ---------------------------------------------------------------------------

export type DisasterVariantType =
  | 'fire'
  | 'flood'
  | 'containment_breach'
  | 'earthquake'
  | 'chemical_spill'

export const DISASTER_VARIANT_TYPES: readonly DisasterVariantType[] = [
  'fire',
  'flood',
  'containment_breach',
  'earthquake',
  'chemical_spill',
] as const

export type PlaybookApplicationStatus = 'applied' | 'needs_revision' | 'rejected'

export const PLAYBOOK_APPLICATION_STATUSES: readonly PlaybookApplicationStatus[] = [
  'applied',
  'needs_revision',
  'rejected',
] as const

export type PlaybookValidationCode =
  | 'invalid_payload'
  | 'missing_playbook_document_id'
  | 'missing_playbook_variant_type'
  | 'invalid_playbook_variant_type'
  | 'missing_active_disaster_type'
  | 'invalid_active_disaster_type'
  | 'missing_procedural_assumptions'
  | 'procedural_assumption_too_short'
  | 'invalid_under_pressure_flag'

export type PlaybookFailureCode = 'wrong_document_variant'

export type PlaybookRemediationCode =
  | 'variant_partial_overlap'
  | 'procedural_assumption_borderline'

export type PlaybookReasonCode =
  | PlaybookValidationCode
  | PlaybookFailureCode
  | PlaybookRemediationCode

// ---------------------------------------------------------------------------
// Payload, policy, and envelopes
// ---------------------------------------------------------------------------

export interface PlaybookVariantPayload {
  readonly playbookDocumentId?: string
  readonly playbookVariantType?: string
  readonly activeDisasterType?: string
  readonly proceduralAssumptions?: readonly string[]
  readonly operatorRef?: string
  readonly underPressure?: boolean
}

export interface DisasterPressurePolicy {
  readonly minimumProceduralAssumptions?: number
  readonly minimumAssumptionLength?: number
}

export interface PlaybookValidationIssue {
  readonly code: PlaybookValidationCode
  readonly severity: 'error'
  readonly detail: string
}

export interface PlaybookRemediationNote {
  readonly code: PlaybookRemediationCode
  readonly note: string
}

export interface PlaybookMatchMetadata {
  readonly playbookDocumentId: string
  readonly playbookVariantType: DisasterVariantType
  readonly activeDisasterType: DisasterVariantType
  readonly proceduralAssumptionCount: number
  readonly underPressure: boolean
  readonly operatorRef: string
}

export interface PlaybookApplicationDecision {
  readonly status: PlaybookApplicationStatus
  readonly validationIssues: readonly PlaybookValidationIssue[]
  readonly reasonCodes: readonly PlaybookReasonCode[]
  readonly remediationNotes: readonly PlaybookRemediationNote[]
  readonly matchMetadata?: PlaybookMatchMetadata
}

// ---------------------------------------------------------------------------
// Calibration
// ---------------------------------------------------------------------------

const DISASTER_VARIANT_TYPE_SET = new Set<string>(DISASTER_VARIANT_TYPES)

const DEFAULT_POLICY: Required<DisasterPressurePolicy> = {
  minimumProceduralAssumptions: 2,
  minimumAssumptionLength: 16,
}

const PARTIAL_OVERLAP_PAIRS: ReadonlyArray<readonly [DisasterVariantType, DisasterVariantType]> =
  Object.freeze([
    Object.freeze(['fire', 'chemical_spill'] as const),
    Object.freeze(['flood', 'containment_breach'] as const),
    Object.freeze(['earthquake', 'containment_breach'] as const),
  ])

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

export const CANONICAL_PLAYBOOK_VARIANT_FIXTURE: PlaybookVariantPayload = Object.freeze({
  playbookDocumentId: 'playbook:fire-suppression-canonical',
  playbookVariantType: 'fire',
  activeDisasterType: 'fire',
  operatorRef: 'operator:facility-response-lead',
  underPressure: true,
  proceduralAssumptions: Object.freeze([
    'Isolate affected zone ventilation before suppression to prevent smoke spread.',
    'Confirm personnel accountability at muster points before re-entry assessment.',
    'Deploy rated suppression agents matched to fuel class before structural cooling.',
  ]),
})

export const WRONG_DOCUMENT_PLAYBOOK_VARIANT_FIXTURE: PlaybookVariantPayload = Object.freeze({
  playbookDocumentId: 'playbook:fire-suppression-misapplied',
  playbookVariantType: 'fire',
  activeDisasterType: 'flood',
  operatorRef: 'operator:facility-response-lead',
  underPressure: true,
  proceduralAssumptions: Object.freeze([
    'Isolate affected zone ventilation before suppression to prevent smoke spread.',
    'Confirm personnel accountability at muster points before re-entry assessment.',
  ]),
})

export const BORDERLINE_PLAYBOOK_VARIANT_FIXTURE: PlaybookVariantPayload = Object.freeze({
  playbookDocumentId: 'playbook:fire-suppression-borderline',
  playbookVariantType: 'fire',
  activeDisasterType: 'chemical_spill',
  operatorRef: 'operator:hazmat-liaison',
  underPressure: true,
  proceduralAssumptions: Object.freeze([
    'Establish hot-warm-cold zones before any suppression attempt near reactants.',
    'Confirm compatible PPE and agent selection against material safety sheets.',
  ]),
})

export const INVALID_PLAYBOOK_VARIANT_FIXTURE: PlaybookVariantPayload = Object.freeze({
  playbookDocumentId: '',
  playbookVariantType: 'volcanic_eruption',
  activeDisasterType: '',
  underPressure: 'yes' as unknown as boolean,
  proceduralAssumptions: Object.freeze(['too short', '']),
})

export const BORDERLINE_PROCEDURAL_PLAYBOOK_VARIANT_FIXTURE: PlaybookVariantPayload = Object.freeze({
  playbookDocumentId: 'playbook:fire-suppression-thin-assumptions',
  playbookVariantType: 'fire',
  activeDisasterType: 'fire',
  operatorRef: 'operator:junior-responder',
  underPressure: true,
  proceduralAssumptions: Object.freeze([
    'Isolate affected zone ventilation before suppression to prevent smoke spread.',
  ]),
})

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isDisasterVariantType(value: string): value is DisasterVariantType {
  return DISASTER_VARIANT_TYPE_SET.has(value)
}

export function isPlaybookApplicationStatus(value: string): value is PlaybookApplicationStatus {
  return PLAYBOOK_APPLICATION_STATUSES.includes(value as PlaybookApplicationStatus)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function resolvePolicy(policy?: DisasterPressurePolicy): Required<DisasterPressurePolicy> {
  return {
    minimumProceduralAssumptions:
      policy?.minimumProceduralAssumptions ?? DEFAULT_POLICY.minimumProceduralAssumptions,
    minimumAssumptionLength:
      policy?.minimumAssumptionLength ?? DEFAULT_POLICY.minimumAssumptionLength,
  }
}

function sortValidationIssues(issues: PlaybookValidationIssue[]): PlaybookValidationIssue[] {
  return [...issues].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code)
    if (codeOrder !== 0) {
      return codeOrder
    }

    return left.detail.localeCompare(right.detail)
  })
}

function sortRemediationNotes(notes: PlaybookRemediationNote[]): PlaybookRemediationNote[] {
  return [...notes].sort((left, right) => {
    const codeOrder = left.code.localeCompare(right.code)
    if (codeOrder !== 0) {
      return codeOrder
    }

    return left.note.localeCompare(right.note)
  })
}

function freezeValidationResult(
  issues: PlaybookValidationIssue[]
): { readonly valid: boolean; readonly issues: readonly PlaybookValidationIssue[] } {
  const sortedIssues = sortValidationIssues(issues)

  return Object.freeze({
    valid: sortedIssues.length === 0,
    issues: Object.freeze(sortedIssues.map((issue) => Object.freeze({ ...issue }))),
  })
}

function freezeDecision(decision: PlaybookApplicationDecision): PlaybookApplicationDecision {
  return Object.freeze({
    status: decision.status,
    validationIssues: Object.freeze(decision.validationIssues),
    reasonCodes: Object.freeze([...decision.reasonCodes]),
    remediationNotes: Object.freeze(decision.remediationNotes),
    matchMetadata: decision.matchMetadata
      ? Object.freeze({ ...decision.matchMetadata })
      : undefined,
  })
}

function asStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((entry) => normalizeToken(entry))
    .filter((entry) => entry.length > 0)
    .sort((left, right) => left.localeCompare(right))
}

function hasPartialOverlap(
  playbookVariant: DisasterVariantType,
  activeDisaster: DisasterVariantType
): boolean {
  if (playbookVariant === activeDisaster) {
    return false
  }

  return PARTIAL_OVERLAP_PAIRS.some(
    ([left, right]) =>
      (left === playbookVariant && right === activeDisaster) ||
      (right === playbookVariant && left === activeDisaster)
  )
}

function buildMatchMetadata(
  payload: PlaybookVariantPayload,
  playbookVariant: DisasterVariantType,
  activeDisaster: DisasterVariantType,
  proceduralAssumptions: readonly string[]
): PlaybookMatchMetadata {
  return Object.freeze({
    playbookDocumentId: normalizeToken(payload.playbookDocumentId),
    playbookVariantType: playbookVariant,
    activeDisasterType: activeDisaster,
    proceduralAssumptionCount: proceduralAssumptions.length,
    underPressure: payload.underPressure === true,
    operatorRef: normalizeToken(payload.operatorRef),
  })
}

function collectRemediationNotes(
  payload: PlaybookVariantPayload,
  playbookVariant: DisasterVariantType,
  activeDisaster: DisasterVariantType,
  proceduralAssumptions: readonly string[],
  policy: Required<DisasterPressurePolicy>
): PlaybookRemediationNote[] {
  const notes: PlaybookRemediationNote[] = []

  if (hasPartialOverlap(playbookVariant, activeDisaster)) {
    notes.push({
      code: 'variant_partial_overlap',
      note: `Playbook variant "${playbookVariant}" partially overlaps active disaster "${activeDisaster}"; confirm correct document before applying procedures under pressure.`,
    })
  }

  if (
    payload.underPressure === true &&
    playbookVariant === activeDisaster &&
    proceduralAssumptions.length > 0 &&
    proceduralAssumptions.length < policy.minimumProceduralAssumptions
  ) {
    notes.push({
      code: 'procedural_assumption_borderline',
      note: `Under pressure, playbook "${normalizeToken(payload.playbookDocumentId)}" has ${proceduralAssumptions.length} procedural assumption(s); at least ${policy.minimumProceduralAssumptions} are required before application.`,
    })
  }

  return sortRemediationNotes(notes)
}

function collectValidationIssues(
  payload: PlaybookVariantPayload,
  policy: Required<DisasterPressurePolicy>
): PlaybookValidationIssue[] {
  const issues: PlaybookValidationIssue[] = []
  const playbookDocumentId = normalizeToken(payload.playbookDocumentId)
  const playbookVariantToken = normalizeToken(payload.playbookVariantType)
  const activeDisasterToken = normalizeToken(payload.activeDisasterType)
  const proceduralAssumptions = asStringArray(payload.proceduralAssumptions)

  if (!playbookDocumentId) {
    issues.push({
      code: 'missing_playbook_document_id',
      severity: 'error',
      detail: 'Playbook variant payload is missing playbookDocumentId.',
    })
  }

  if (!playbookVariantToken) {
    issues.push({
      code: 'missing_playbook_variant_type',
      severity: 'error',
      detail: 'Playbook variant payload is missing playbookVariantType.',
    })
  } else if (!isDisasterVariantType(playbookVariantToken)) {
    issues.push({
      code: 'invalid_playbook_variant_type',
      severity: 'error',
      detail: `Playbook variant payload has invalid playbookVariantType "${playbookVariantToken}".`,
    })
  }

  if (!activeDisasterToken) {
    issues.push({
      code: 'missing_active_disaster_type',
      severity: 'error',
      detail: 'Playbook variant payload is missing activeDisasterType.',
    })
  } else if (!isDisasterVariantType(activeDisasterToken)) {
    issues.push({
      code: 'invalid_active_disaster_type',
      severity: 'error',
      detail: `Playbook variant payload has invalid activeDisasterType "${activeDisasterToken}".`,
    })
  }

  if (!Array.isArray(payload.proceduralAssumptions) || proceduralAssumptions.length === 0) {
    issues.push({
      code: 'missing_procedural_assumptions',
      severity: 'error',
      detail: 'Playbook variant payload must include at least one procedural assumption.',
    })
  } else {
    for (const assumption of proceduralAssumptions) {
      if (assumption.length < policy.minimumAssumptionLength) {
        issues.push({
          code: 'procedural_assumption_too_short',
          severity: 'error',
          detail: `Procedural assumption must be at least ${policy.minimumAssumptionLength} characters.`,
        })
        break
      }
    }
  }

  if (
    payload.underPressure !== undefined &&
    typeof payload.underPressure !== 'boolean'
  ) {
    issues.push({
      code: 'invalid_under_pressure_flag',
      severity: 'error',
      detail: 'Playbook variant payload underPressure must be a boolean when provided.',
    })
  }

  return issues
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function validatePlaybookVariantPayload(
  payload?: PlaybookVariantPayload,
  policy?: DisasterPressurePolicy
): { readonly valid: boolean; readonly issues: readonly PlaybookValidationIssue[] } {
  const resolvedPolicy = resolvePolicy(policy)

  if (!payload || typeof payload !== 'object') {
    return freezeValidationResult([
      {
        code: 'invalid_payload',
        severity: 'error',
        detail: 'Playbook variant payload must be an object.',
      },
    ])
  }

  return freezeValidationResult(collectValidationIssues(payload, resolvedPolicy))
}

/**
 * SPE-75 follow-up baseline: deterministic disaster playbook application with
 * wrong-document failure under pressure — no persistence or publish side effects.
 */
export function evaluatePlaybookWrongDocumentFailure(
  payload?: PlaybookVariantPayload,
  policy?: DisasterPressurePolicy
): PlaybookApplicationDecision {
  const resolvedPolicy = resolvePolicy(policy)
  const validation = validatePlaybookVariantPayload(payload, policy)

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

  const playbookVariant = normalizeToken(payload!.playbookVariantType) as DisasterVariantType
  const activeDisaster = normalizeToken(payload!.activeDisasterType) as DisasterVariantType
  const proceduralAssumptions = asStringArray(payload!.proceduralAssumptions)

  if (playbookVariant !== activeDisaster && !hasPartialOverlap(playbookVariant, activeDisaster)) {
    return freezeDecision({
      status: 'rejected',
      validationIssues: Object.freeze([]),
      reasonCodes: Object.freeze(['wrong_document_variant']),
      remediationNotes: Object.freeze([]),
    })
  }

  const remediationNotes = sortRemediationNotes(
    collectRemediationNotes(
      payload!,
      playbookVariant,
      activeDisaster,
      proceduralAssumptions,
      resolvedPolicy
    )
  )

  if (remediationNotes.length > 0) {
    const reasonCodes = remediationNotes
      .map((note) => note.code)
      .sort((left, right) => left.localeCompare(right))

    return freezeDecision({
      status: 'needs_revision',
      validationIssues: Object.freeze([]),
      reasonCodes,
      remediationNotes: Object.freeze(remediationNotes.map((note) => Object.freeze({ ...note }))),
      matchMetadata: buildMatchMetadata(
        payload!,
        playbookVariant,
        activeDisaster,
        proceduralAssumptions
      ),
    })
  }

  return freezeDecision({
    status: 'applied',
    validationIssues: Object.freeze([]),
    reasonCodes: Object.freeze([]),
    remediationNotes: Object.freeze([]),
    matchMetadata: buildMatchMetadata(
      payload!,
      playbookVariant,
      activeDisaster,
      proceduralAssumptions
    ),
  })
}

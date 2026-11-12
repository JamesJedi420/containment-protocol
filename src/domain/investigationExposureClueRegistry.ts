/**
 * SPE-2159 slice 1: investigation exposure and fuzzy-clue registry.
 *
 * Pure deterministic domain registry for investigation clue clarity and
 * exposure risk. Clues may be true, fuzzy, incomplete, partly false, or
 * misleading — all are represented, none are silently discarded.
 */

export type ClueClarity = 'true' | 'fuzzy' | 'incomplete' | 'partial_false' | 'misleading'

export const CLUE_CLARITY_VALUES: readonly ClueClarity[] = [
  'true',
  'fuzzy',
  'incomplete',
  'partial_false',
  'misleading',
] as const

export type ExposureRiskBand = 'controlled' | 'low' | 'moderate' | 'high' | 'critical'

export const EXPOSURE_RISK_BANDS: readonly ExposureRiskBand[] = [
  'controlled',
  'low',
  'moderate',
  'high',
  'critical',
] as const

export interface InvestigationExposureClueRecord {
  readonly id: string
  readonly clarity: ClueClarity
  readonly exposureRiskBand: ExposureRiskBand
  readonly label: string
  readonly summary?: string
  readonly provenanceNote?: string
}

export interface InvestigationExposureClueRegistry {
  readonly entries: readonly InvestigationExposureClueRecord[]
}

export interface ClueActionabilityProjection {
  readonly id: string
  readonly isActionable: boolean
  readonly isUncertain: boolean
  readonly isHazardousToInvestigate: boolean
}

export type InvestigationExposureClueValidationCode =
  | 'missing_id'
  | 'duplicate_id'
  | 'missing_label'
  | 'invalid_clarity'
  | 'invalid_exposure_risk_band'

export interface InvestigationExposureClueValidationIssue {
  readonly code: InvestigationExposureClueValidationCode
  readonly detail: string
  readonly relatedIds?: readonly string[]
}

export interface InvestigationExposureClueValidationResult {
  readonly valid: boolean
  readonly issues: readonly InvestigationExposureClueValidationIssue[]
}

const CLUE_CLARITY_SET = new Set<string>(CLUE_CLARITY_VALUES)
const EXPOSURE_RISK_BAND_SET = new Set<string>(EXPOSURE_RISK_BANDS)

function normalizeToken(value: string) {
  return value.trim()
}

function pushIssue(
  issues: InvestigationExposureClueValidationIssue[],
  issue: InvestigationExposureClueValidationIssue
) {
  issues.push(issue)
}

export function isClueClarity(value: string): value is ClueClarity {
  return CLUE_CLARITY_SET.has(value)
}

export function isExposureRiskBand(value: string): value is ExposureRiskBand {
  return EXPOSURE_RISK_BAND_SET.has(value)
}

export function validateInvestigationExposureClueRecord(
  record: InvestigationExposureClueRecord
): InvestigationExposureClueValidationResult {
  const issues: InvestigationExposureClueValidationIssue[] = []
  const id = normalizeToken(record.id)
  const label = normalizeToken(record.label)

  if (!id) {
    pushIssue(issues, {
      code: 'missing_id',
      detail: 'Clue record is missing id.',
    })
  }

  if (!label) {
    pushIssue(issues, {
      code: 'missing_label',
      detail: `Clue ${id || '(unknown)'} is missing label.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isClueClarity(record.clarity)) {
    pushIssue(issues, {
      code: 'invalid_clarity',
      detail: `Clue ${id || '(unknown)'} has invalid clarity ${String(record.clarity)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  if (!isExposureRiskBand(record.exposureRiskBand)) {
    pushIssue(issues, {
      code: 'invalid_exposure_risk_band',
      detail: `Clue ${id || '(unknown)'} has invalid exposureRiskBand ${String(record.exposureRiskBand)}.`,
      relatedIds: id ? [id] : undefined,
    })
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

export function validateInvestigationExposureClueRegistry(
  registry: InvestigationExposureClueRegistry
): InvestigationExposureClueValidationResult {
  const issues: InvestigationExposureClueValidationIssue[] = []
  const seenIds = new Set<string>()

  for (const entry of registry.entries) {
    const entryResult = validateInvestigationExposureClueRecord(entry)
    issues.push(...entryResult.issues)

    const id = normalizeToken(entry.id)
    if (!id) {
      continue
    }

    if (seenIds.has(id)) {
      pushIssue(issues, {
        code: 'duplicate_id',
        detail: `Duplicate clue id ${id}.`,
        relatedIds: [id],
      })
    } else {
      seenIds.add(id)
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

export function getInvestigationExposureClueById(
  registry: InvestigationExposureClueRegistry,
  id: string
): InvestigationExposureClueRecord | undefined {
  const normalized = normalizeToken(id)
  if (!normalized) {
    return undefined
  }

  return registry.entries.find((entry) => entry.id === normalized)
}

/**
 * Projects whether a clue is actionable, uncertain, or hazardous to investigate.
 *
 * - `isActionable`: the clue carries usable signal; all clarities except `misleading`
 *   retain enough operational value to act on.
 * - `isUncertain`: the clarity introduces meaningful doubt; any clarity other than `true`.
 * - `isHazardousToInvestigate`: the exposure risk band is `high` or `critical`.
 */
export function projectClueActionability(
  record: InvestigationExposureClueRecord
): ClueActionabilityProjection {
  return {
    id: record.id,
    isActionable: record.clarity !== 'misleading',
    isUncertain: record.clarity !== 'true',
    isHazardousToInvestigate:
      record.exposureRiskBand === 'high' || record.exposureRiskBand === 'critical',
  }
}

function defineClue(input: InvestigationExposureClueRecord): InvestigationExposureClueRecord {
  return Object.freeze({ ...input })
}

/** Baseline fixture catalog demonstrating all five canonical clue clarity values. */
export const DEFAULT_INVESTIGATION_EXPOSURE_CLUE_REGISTRY: InvestigationExposureClueRegistry =
  Object.freeze({
    entries: Object.freeze([
      defineClue({
        id: 'clue:verified-document-trail',
        clarity: 'true',
        exposureRiskBand: 'controlled',
        label: 'Verified document trail',
        summary: 'Chain-of-custody intact; evidence is stable and directly corroborating.',
        provenanceNote: 'Original source cross-confirmed via two independent access points.',
      }),
      defineClue({
        id: 'clue:partial-surveillance-window',
        clarity: 'fuzzy',
        exposureRiskBand: 'moderate',
        label: 'Partial surveillance window',
        summary:
          'Footage exists but is degraded; identity confirmation is probable, not certain.',
        provenanceNote: 'Single-source feed with obstructed view during critical interval.',
      }),
      defineClue({
        id: 'clue:redacted-contact-log',
        clarity: 'incomplete',
        exposureRiskBand: 'high',
        label: 'Redacted contact log',
        summary:
          'Log entries confirm activity pattern but key identifiers have been removed.',
        provenanceNote: 'Obtained under time pressure; redaction scope is unknown.',
      }),
      defineClue({
        id: 'clue:planted-transaction-record',
        clarity: 'partial_false',
        exposureRiskBand: 'moderate',
        label: 'Planted transaction record',
        summary:
          'Record contains authentic routing data embedded in fabricated context; usable for network mapping despite deliberate corruption.',
        provenanceNote: 'Counterpart analysis confirmed partial fabrication post-acquisition.',
      }),
      defineClue({
        id: 'clue:deliberate-decoy-signal',
        clarity: 'misleading',
        exposureRiskBand: 'critical',
        label: 'Deliberate decoy signal',
        summary:
          'Signal was staged to redirect investigation; operational value lies in identifying the misdirection pattern itself.',
        provenanceNote: 'Origin traced to known counter-intelligence interference channel.',
      }),
    ]),
  })

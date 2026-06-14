/**
 * SPE-861 slice 4: player disclosure posture choices keyed by disclosure record id.
 *
 * Write-side choice state on GameState — trust modifiers apply at projection time only.
 */

import type { GameState } from './models'
import type { PublicDisclosureRecord, PublicDisclosureRecordsMap } from './publicDisclosureStateRegistry'

export type PublicDisclosurePostureChoice = 'transparent' | 'managed_secrecy' | 'restrictive'

export type PublicDisclosurePostureChoicesMap = Record<string, PublicDisclosurePostureChoice>

export type PublicDisclosurePostureChoiceFailureReason =
  | 'invalid_record'
  | 'inactive_campaign'
  | 'invalid_posture'

export interface ApplyPublicDisclosurePostureChoiceInput {
  readonly recordId: string
  readonly posture: PublicDisclosurePostureChoice
}

export interface ApplyPublicDisclosurePostureChoiceResult {
  readonly state: GameState
  readonly applied: boolean
  readonly reason?: PublicDisclosurePostureChoiceFailureReason
  readonly posture?: PublicDisclosurePostureChoice
}

export interface PublicDisclosurePostureChoiceOption {
  readonly posture: PublicDisclosurePostureChoice
  readonly label: string
  readonly description: string
}

const POSTURE_CHOICE_ORDER: readonly PublicDisclosurePostureChoice[] = [
  'transparent',
  'managed_secrecy',
  'restrictive',
] as const

const POSTURE_CHOICE_LABELS: Record<PublicDisclosurePostureChoice, string> = {
  transparent: 'Transparent posture',
  managed_secrecy: 'Managed secrecy',
  restrictive: 'Restrictive posture',
}

const POSTURE_CHOICE_DESCRIPTIONS: Record<PublicDisclosurePostureChoice, string> = {
  transparent:
    'Prioritize openness and follow-through messaging; tends to improve public cooperation bands.',
  managed_secrecy:
    'Balance institutional messaging with operational discretion; neutral trust posture.',
  restrictive:
    'Clamp messaging and limit public detail; tends to reduce cooperation and deepen resistance.',
}

export const PUBLIC_DISCLOSURE_POSTURE_TRUST_DELTAS: Record<PublicDisclosurePostureChoice, number> =
  {
    transparent: 0.1,
    managed_secrecy: 0,
    restrictive: -0.1,
  }

function sanitizeRecordId(recordId: string) {
  return recordId.trim()
}

export function isPublicDisclosurePostureChoice(
  value: unknown
): value is PublicDisclosurePostureChoice {
  return (
    value === 'transparent' || value === 'managed_secrecy' || value === 'restrictive'
  )
}

export function listPublicDisclosurePostureChoiceOptions(): readonly PublicDisclosurePostureChoiceOption[] {
  return Object.freeze(
    POSTURE_CHOICE_ORDER.map((posture) =>
      Object.freeze({
        posture,
        label: POSTURE_CHOICE_LABELS[posture],
        description: POSTURE_CHOICE_DESCRIPTIONS[posture],
      })
    )
  )
}

export function formatPublicDisclosurePostureChoiceLabel(
  posture: PublicDisclosurePostureChoice | null | undefined
): string | null {
  if (posture === null || posture === undefined) {
    return null
  }

  return POSTURE_CHOICE_LABELS[posture]
}

export function canApplyPublicDisclosurePostureChoiceOnRecord(
  record: PublicDisclosureRecord | undefined
): record is PublicDisclosureRecord {
  return record !== undefined && record.awarenessLevel !== 'secrecy_intact'
}

export interface PendingPublicDisclosurePostureDecision {
  readonly recordId: string
  readonly label: string
}

/** Active disclosure campaigns that still need a player posture choice, sort-stable by record id. */
export function listPendingPublicDisclosurePostureDecisions(
  state: Pick<GameState, 'publicDisclosureRecords' | 'publicDisclosurePostureChoices'>
): readonly PendingPublicDisclosurePostureDecision[] {
  const records = state.publicDisclosureRecords ?? {}

  return Object.freeze(
    Object.values(records)
      .filter((record) => canApplyPublicDisclosurePostureChoiceOnRecord(record))
      .filter((record) => readPublicDisclosurePostureChoice(state, record.id) === undefined)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((record) =>
        Object.freeze({
          recordId: record.id,
          label: record.label,
        })
      )
  )
}

export function readPublicDisclosurePostureChoice(
  state: Pick<GameState, 'publicDisclosurePostureChoices'>,
  recordId: string
): PublicDisclosurePostureChoice | undefined {
  const normalizedRecordId = sanitizeRecordId(recordId)

  if (normalizedRecordId.length === 0) {
    return undefined
  }

  const posture = state.publicDisclosurePostureChoices?.[normalizedRecordId]
  return isPublicDisclosurePostureChoice(posture) ? posture : undefined
}

export function applyPublicDisclosurePostureChoice(
  state: GameState,
  input: ApplyPublicDisclosurePostureChoiceInput
): ApplyPublicDisclosurePostureChoiceResult {
  const normalizedRecordId = sanitizeRecordId(input.recordId)
  const record =
    normalizedRecordId.length > 0
      ? state.publicDisclosureRecords?.[normalizedRecordId]
      : undefined

  if (!record) {
    return { state, applied: false, reason: 'invalid_record' }
  }

  if (!canApplyPublicDisclosurePostureChoiceOnRecord(record)) {
    return { state, applied: false, reason: 'inactive_campaign' }
  }

  if (!isPublicDisclosurePostureChoice(input.posture)) {
    return { state, applied: false, reason: 'invalid_posture' }
  }

  const prior = readPublicDisclosurePostureChoice(state, normalizedRecordId)

  if (prior === input.posture) {
    return { state, applied: false, posture: input.posture }
  }

  return {
    state: {
      ...state,
      publicDisclosurePostureChoices: {
        ...(state.publicDisclosurePostureChoices ?? {}),
        [normalizedRecordId]: input.posture,
      },
    },
    applied: true,
    posture: input.posture,
  }
}

function clampTrustScore(score: number): number {
  const clamped = Math.min(1, Math.max(0, score))
  return Math.round(clamped * 100) / 100
}

/** Applies posture trust deltas for projection inputs without mutating persisted registry records. */
export function applyPublicDisclosurePostureTrustAdjustment(
  records: PublicDisclosureRecordsMap | null | undefined,
  postureChoices: PublicDisclosurePostureChoicesMap | null | undefined
): PublicDisclosureRecordsMap {
  const sourceRecords = records ?? {}
  const choices = postureChoices ?? {}

  if (Object.keys(sourceRecords).length === 0 || Object.keys(choices).length === 0) {
    return sourceRecords
  }

  let changed = false
  const nextRecords: PublicDisclosureRecordsMap = {}

  for (const [recordId, record] of Object.entries(sourceRecords).sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    const posture = choices[recordId]
    const delta =
      posture !== undefined &&
      isPublicDisclosurePostureChoice(posture) &&
      record.awarenessLevel !== 'secrecy_intact'
        ? PUBLIC_DISCLOSURE_POSTURE_TRUST_DELTAS[posture]
        : 0

    if (delta === 0 || !record.trustByRegion || record.trustByRegion.length === 0) {
      nextRecords[recordId] = record
      continue
    }

    changed = true
    nextRecords[recordId] = Object.freeze({
      ...record,
      trustByRegion: Object.freeze(
        record.trustByRegion.map((entry) =>
          Object.freeze({
            ...entry,
            trustScore: clampTrustScore(entry.trustScore + delta),
          })
        )
      ),
    })
  }

  return changed ? nextRecords : sourceRecords
}

export function sanitizePublicDisclosurePostureChoices(
  value: unknown,
  validRecordIds: ReadonlySet<string>,
  fallback: PublicDisclosurePostureChoicesMap = {}
): PublicDisclosurePostureChoicesMap {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return fallback
  }

  const next: PublicDisclosurePostureChoicesMap = {}

  for (const [recordId, posture] of Object.entries(value as Record<string, unknown>).sort(
    ([left], [right]) => left.localeCompare(right)
  )) {
    const normalizedRecordId = sanitizeRecordId(recordId)

    if (normalizedRecordId.length === 0 || !validRecordIds.has(normalizedRecordId)) {
      continue
    }

    if (!isPublicDisclosurePostureChoice(posture)) {
      continue
    }

    next[normalizedRecordId] = posture
  }

  return Object.keys(next).length > 0 ? next : fallback
}

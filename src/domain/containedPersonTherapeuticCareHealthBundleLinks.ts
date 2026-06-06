/**
 * SPE-1889 slice 5: derive integrated health bundle fragments from persisted
 * contained-person therapeutic care schedule records.
 *
 * Pure deterministic projection — consumes hydrated records only; includes
 * warning-only records; does not re-surface invalid or dropped entries.
 */

import {
  projectCareComplianceRisk,
  validateTherapeuticCareScheduleRecord,
  type TherapeuticCareScheduleRecord,
  type TherapeuticCareScheduleRecordsMap,
} from './containedPersonTherapeuticCareRegistry'
import {
  type MentalStateBand,
  type TherapeuticCareScheduleLink,
} from './containedPersonIntegratedHealthBundleRegistry'

export const THERAPEUTIC_CARE_WIRED_REF_PREFIX = 'therapeutic-care:'

export interface DerivedTherapeuticCareBundleFragment {
  readonly subjectRef: string
  readonly label: string
  readonly therapeuticCareScheduleLinks: readonly TherapeuticCareScheduleLink[]
  readonly mentalStateBand: MentalStateBand
  readonly humaneCareRiskScore: number | null
}

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function buildWiredRef(scheduleRef: string): string {
  return `${THERAPEUTIC_CARE_WIRED_REF_PREFIX}${scheduleRef}`
}

function deriveMentalStateBand(
  complianceRiskScore: number | null,
  lockdownEscalationLikely: boolean
): MentalStateBand {
  if (lockdownEscalationLikely) {
    return 'critical'
  }

  if (complianceRiskScore === null) {
    return 'stable'
  }

  if (complianceRiskScore >= 0.5) {
    return 'distressed'
  }

  if (complianceRiskScore >= 0.25) {
    return 'strained'
  }

  return 'stable'
}

function rankMentalStateBand(left: MentalStateBand, right: MentalStateBand): MentalStateBand {
  const rank: Readonly<Record<MentalStateBand, number>> = {
    stable: 0,
    strained: 1,
    distressed: 2,
    critical: 3,
  }

  return rank[left] >= rank[right] ? left : right
}

function deriveLinkForRecord(record: TherapeuticCareScheduleRecord): TherapeuticCareScheduleLink | null {
  const scheduleRef = normalizeToken(record.id)
  const subjectRef = normalizeToken(record.subjectRef)

  if (!scheduleRef || !subjectRef) {
    return null
  }

  if (!validateTherapeuticCareScheduleRecord(record).valid) {
    return null
  }

  const projection = projectCareComplianceRisk(record)

  return Object.freeze({
    scheduleRef,
    wiredRef: buildWiredRef(scheduleRef),
    careMode: projection.careMode,
    channelState: projection.channelState,
    missedSessionStreak: projection.missedSessionStreak,
    complianceRiskScore: projection.complianceRiskScore,
    lockdownEscalationLikely: projection.lockdownEscalationLikely,
  })
}

function resolveHumaneCareRiskScore(links: readonly TherapeuticCareScheduleLink[]): number | null {
  let maxScore: number | null = null

  for (const link of links) {
    const score = link.complianceRiskScore
    if (score === null) {
      continue
    }

    if (maxScore === null || score > maxScore) {
      maxScore = score
    }
  }

  return maxScore
}

function resolveMentalStateBandForLinks(links: readonly TherapeuticCareScheduleLink[]): MentalStateBand {
  let band: MentalStateBand = 'stable'

  for (const link of links) {
    band = rankMentalStateBand(
      band,
      deriveMentalStateBand(link.complianceRiskScore, link.lockdownEscalationLikely)
    )
  }

  return band
}

function buildBundleLabel(
  subjectRef: string,
  records: readonly TherapeuticCareScheduleRecord[]
): string {
  const firstLabel = normalizeToken(records[0]?.label ?? '')
  if (firstLabel) {
    return firstLabel
  }

  return `Contained person ${subjectRef}`
}

/**
 * Derives integrated health bundle fragments grouped by subjectRef from hydrated care records.
 * Empty map returns an empty frozen array without throw.
 */
export function deriveTherapeuticCareBundleFragmentsFromRecords(
  records: TherapeuticCareScheduleRecordsMap | null | undefined
): readonly DerivedTherapeuticCareBundleFragment[] {
  const safeRecords = records ?? {}
  const recordIds = Object.keys(safeRecords)
  if (recordIds.length === 0) {
    return Object.freeze([])
  }

  const recordsBySubject = new Map<string, TherapeuticCareScheduleRecord[]>()

  for (const recordId of recordIds.sort((left, right) => left.localeCompare(right))) {
    const record = safeRecords[recordId]
    if (!record) {
      continue
    }

    const subjectRef = normalizeToken(record.subjectRef)
    if (!subjectRef) {
      continue
    }

    const existing = recordsBySubject.get(subjectRef) ?? []
    existing.push(record)
    recordsBySubject.set(subjectRef, existing)
  }

  const fragments: DerivedTherapeuticCareBundleFragment[] = []

  for (const subjectRef of [...recordsBySubject.keys()].sort((left, right) =>
    left.localeCompare(right)
  )) {
    const subjectRecords = recordsBySubject.get(subjectRef) ?? []
    const links: TherapeuticCareScheduleLink[] = []

    for (const record of subjectRecords.sort((left, right) => left.id.localeCompare(right.id))) {
      const link = deriveLinkForRecord(record)
      if (link) {
        links.push(link)
      }
    }

    if (links.length === 0) {
      continue
    }

    fragments.push(
      Object.freeze({
        subjectRef,
        label: buildBundleLabel(subjectRef, subjectRecords),
        therapeuticCareScheduleLinks: Object.freeze(links),
        mentalStateBand: resolveMentalStateBandForLinks(links),
        humaneCareRiskScore: resolveHumaneCareRiskScore(links),
      })
    )
  }

  return Object.freeze(fragments)
}

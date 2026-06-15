/**
 * SPE-521 follow-up: deterministic civilian long-horizon role read model for eligible templates.
 */

import { type InfiltrationCoverRole } from './infiltrationCover'
import {
  AWARENESS_COMPLICATION_THRESHOLD,
  isInfiltrationProbeEligible,
  readInfiltrationProbeState,
} from './infiltrationProbe'
import type { CaseInstance } from './models'

/** Required site tag for long-horizon civilian infiltration eligibility. */
export const INFILTRATION_CIVILIAN_LONG_HORIZON_BASE_TAG = 'civilian' as const

/** Cover role that participates in long-horizon civilian embed read model. */
export const INFILTRATION_CIVILIAN_LONG_HORIZON_COVER_ROLE: InfiltrationCoverRole = 'civilian_staff'

/**
 * Site tags indicating sustained civilian embed context (distinct from uniform or quick-access zones).
 * Shared with cleanup heuristics in `infiltrationProbe.ts` where they overlap (`interview`, `public`).
 */
export const INFILTRATION_CIVILIAN_LONG_HORIZON_CONTEXT_TAGS = [
  'witness',
  'interview',
  'memory',
  'public',
  'market',
  'crowd',
  'ritual',
] as const

const LONG_HORIZON_ARCHETYPE_RULES: readonly {
  readonly tags: readonly string[]
  readonly label: string
}[] = [
  { tags: ['witness', 'interview', 'memory'], label: 'Interview-cycle embed' },
  { tags: ['public', 'market', 'crowd'], label: 'Public-footprint embed' },
  { tags: ['ritual'], label: 'Ritual-adjacent embed' },
]

const LONG_HORIZON_CONTEXT_LABELS: Record<string, string> = {
  witness: 'Witness cycles favor low-profile staff presence',
  interview: 'Interview rooms expect repeated civilian_staff visits',
  memory: 'Memory-contamination beats reward patient embed posture',
  public: 'Public zones tolerate civilian drift over multiple weeks',
  market: 'Market rhythms support staff-cover cadence across weeks',
  crowd: 'Crowd density masks long-horizon civilian movement',
  ritual: 'Ritual cadence expects recurring civilian observers',
}

const MID_EMBED_PROBE_PROGRESS = 0.5

function collectCaseTags(caseData: CaseInstance): Set<string> {
  return new Set([...caseData.tags, ...caseData.requiredTags, ...caseData.preferredTags])
}

export function listActiveCivilianLongHorizonContextTags(
  caseData: CaseInstance
): readonly string[] {
  const caseTags = collectCaseTags(caseData)
  return INFILTRATION_CIVILIAN_LONG_HORIZON_CONTEXT_TAGS.filter((tag) => caseTags.has(tag)).sort()
}

export function isCivilianLongHorizonInfiltrationCase(caseData: CaseInstance) {
  const caseTags = collectCaseTags(caseData)

  if (!caseTags.has(INFILTRATION_CIVILIAN_LONG_HORIZON_BASE_TAG)) {
    return false
  }

  return listActiveCivilianLongHorizonContextTags(caseData).length > 0
}

export function canProjectInfiltrationEncounterCivilianLongHorizonRoles(caseData: CaseInstance) {
  const profile = caseData.infiltrationCoverProfile

  return (
    caseData.status === 'in_progress' &&
    isInfiltrationProbeEligible(caseData) &&
    profile !== undefined &&
    profile.claimedRole === INFILTRATION_CIVILIAN_LONG_HORIZON_COVER_ROLE &&
    isCivilianLongHorizonInfiltrationCase(caseData)
  )
}

function resolveArchetypeLabel(activeContextTags: readonly string[]): string {
  const activeTagSet = new Set(activeContextTags)

  for (const rule of LONG_HORIZON_ARCHETYPE_RULES) {
    if (rule.tags.some((tag) => activeTagSet.has(tag))) {
      return rule.label
    }
  }

  return 'Sustained civilian embed'
}

function resolveSustainLabel(awareness: number, probeProgress: number): string {
  if (awareness >= AWARENESS_COMPLICATION_THRESHOLD) {
    return 'Long-horizon cover thinning — week-over-week routine comparisons accelerating'
  }

  if (probeProgress >= MID_EMBED_PROBE_PROGRESS) {
    return 'Mid-embed sustain — observers may compare recurring civilian patterns'
  }

  return 'Early embed — room to establish civilian_staff routine before scrutiny tightens'
}

export interface InfiltrationEncounterCivilianLongHorizonRoles {
  readonly visible: boolean
  readonly archetypeLabel: string
  readonly sustainLabel: string
  readonly contextLabels: readonly string[]
  readonly embedSummaryLabel: string
}

const EMPTY_PROJECTION: InfiltrationEncounterCivilianLongHorizonRoles = Object.freeze({
  visible: false,
  archetypeLabel: '',
  sustainLabel: '',
  contextLabels: [],
  embedSummaryLabel: '',
})

/** Projects long-horizon civilian role prep labels for civilian_staff + civilian/context tag cases. */
export function projectInfiltrationEncounterCivilianLongHorizonRoles(
  caseData: CaseInstance
): InfiltrationEncounterCivilianLongHorizonRoles {
  if (!canProjectInfiltrationEncounterCivilianLongHorizonRoles(caseData)) {
    return EMPTY_PROJECTION
  }

  const activeContextTags = listActiveCivilianLongHorizonContextTags(caseData)
  const tracks = readInfiltrationProbeState(caseData)
  const archetypeLabel = resolveArchetypeLabel(activeContextTags)
  const sustainLabel = resolveSustainLabel(tracks.awareness, tracks.probeProgress)
  const contextLabels = activeContextTags.map(
    (tag) => LONG_HORIZON_CONTEXT_LABELS[tag] ?? `${tag} context favors sustained civilian embed`
  )

  return Object.freeze({
    visible: true,
    archetypeLabel,
    sustainLabel,
    contextLabels,
    embedSummaryLabel: `${archetypeLabel} — ${sustainLabel.toLowerCase()}`,
  })
}

/**
 * SPE-807 — cross-zone contamination propagation profiles.
 *
 * Pure caller-owned packets: a source zone projects destination-specific
 * symptom profiles into linked hubs with actor-tag susceptibility and
 * distance/proximity severity scaling. Distinct from SPE-408 surfaceAdjacency
 * conduits. No GameState field. No universal plague simulator.
 */

export const CROSS_ZONE_CONTAMINATION_OWNER = 'SPE-807' as const

export type ContaminationSymptom =
  | 'mild_unrest'
  | 'shared_dreams'
  | 'severe_transformation'
  | 'active_predation'

export type SusceptibilityTag =
  | 'species:human'
  | 'species:animal'
  | 'role:civilian'
  | 'role:operator'
  | 'discipline:occult'
  | 'affinity:dreamspace'
  | 'domestication:feral'

export type SeverityBand = 'none' | 'low' | 'moderate' | 'high' | 'critical'

export interface DestinationSymptomProfile {
  readonly destinationZoneId: string
  readonly symptom: ContaminationSymptom
  readonly baseSeverity: Exclude<SeverityBand, 'none'>
  readonly hopsFromSource: number
}

export interface ContaminationSourceProfile {
  readonly sourceId: string
  readonly sourceZoneId: string
  readonly destinations: readonly DestinationSymptomProfile[]
  readonly susceptibleTags: readonly SusceptibilityTag[]
}

export interface ActorContaminationSubject {
  readonly actorId: string
  readonly tags: readonly SusceptibilityTag[]
}

export interface ContaminationExposure {
  readonly sourceId: string
  readonly sourceZoneId: string
  readonly destinationZoneId: string
  readonly actorId: string
  /** Null when the destination is not linked to the source. */
  readonly symptom: ContaminationSymptom | null
  readonly severity: SeverityBand
  readonly susceptible: boolean
  readonly reasons: readonly string[]
}

const SYMPTOMS: readonly ContaminationSymptom[] = [
  'mild_unrest',
  'shared_dreams',
  'severe_transformation',
  'active_predation',
]
const TAGS: readonly SusceptibilityTag[] = [
  'species:human',
  'species:animal',
  'role:civilian',
  'role:operator',
  'discipline:occult',
  'affinity:dreamspace',
  'domestication:feral',
]
const SEVERITIES: readonly Exclude<SeverityBand, 'none'>[] = ['low', 'moderate', 'high', 'critical']

function requireNonEmpty(value: string | null | undefined, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`cross-zone contamination ${label} is required`)
  }
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`cross-zone contamination ${label} is required`)
  return trimmed
}

function compareAscii(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function requireNonNegativeInt(value: number, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new Error(`cross-zone contamination ${label} must be a non-negative integer`)
  }
  return value
}

function requireSymptom(value: string): ContaminationSymptom {
  if ((SYMPTOMS as readonly string[]).includes(value)) return value as ContaminationSymptom
  throw new Error('cross-zone contamination symptom is invalid')
}

function requireTag(value: string): SusceptibilityTag {
  if ((TAGS as readonly string[]).includes(value)) return value as SusceptibilityTag
  throw new Error('cross-zone contamination susceptibility tag is invalid')
}

function requireSeverity(value: string): Exclude<SeverityBand, 'none'> {
  if ((SEVERITIES as readonly string[]).includes(value)) {
    return value as Exclude<SeverityBand, 'none'>
  }
  throw new Error('cross-zone contamination severity is invalid')
}

/**
 * Distance attenuates severity: each hop steps the band down one level.
 */
export function scaleSeverityByHops(
  base: Exclude<SeverityBand, 'none'>,
  hopsFromSource: number,
): SeverityBand {
  const validated = requireSeverity(base)
  const hops = requireNonNegativeInt(hopsFromSource, 'hopsFromSource')
  const order: readonly SeverityBand[] = ['critical', 'high', 'moderate', 'low', 'none']
  const start = order.indexOf(validated)
  const idx = Math.min(start + hops, order.length - 1)
  return order[idx]!
}

/**
 * Fail-closed create for one contamination source profile.
 */
export function createContaminationSourceProfile(
  input: ContaminationSourceProfile,
): ContaminationSourceProfile {
  const sourceId = requireNonEmpty(input.sourceId, 'sourceId')
  const sourceZoneId = requireNonEmpty(input.sourceZoneId, 'sourceZoneId')
  const susceptibleTags = [
    ...new Set((input.susceptibleTags ?? []).map(requireTag)),
  ].sort(compareAscii)
  if (susceptibleTags.length === 0) {
    throw new Error('cross-zone contamination requires at least one susceptibility tag')
  }

  const destinations: DestinationSymptomProfile[] = []
  const seenDest = new Set<string>()
  for (const dest of input.destinations ?? []) {
    const destinationZoneId = requireNonEmpty(dest.destinationZoneId, 'destinationZoneId')
    if (destinationZoneId === sourceZoneId) {
      throw new Error('cross-zone contamination destination must differ from source zone')
    }
    if (seenDest.has(destinationZoneId)) {
      throw new Error(`cross-zone contamination duplicate destination ${destinationZoneId}`)
    }
    seenDest.add(destinationZoneId)
    destinations.push(
      Object.freeze({
        destinationZoneId,
        symptom: requireSymptom(dest.symptom),
        baseSeverity: requireSeverity(dest.baseSeverity),
        hopsFromSource: requireNonNegativeInt(dest.hopsFromSource, 'hopsFromSource'),
      }),
    )
  }
  if (destinations.length === 0) {
    throw new Error('cross-zone contamination requires at least one destination profile')
  }
  destinations.sort((a, b) => compareAscii(a.destinationZoneId, b.destinationZoneId))

  return Object.freeze({
    sourceId,
    sourceZoneId,
    destinations: Object.freeze(destinations),
    susceptibleTags: Object.freeze(susceptibleTags),
  })
}

/**
 * Evaluate one actor in one destination against a contamination source.
 */
export function evaluateContaminationExposure(args: {
  readonly source: ContaminationSourceProfile
  readonly actor: ActorContaminationSubject
  readonly destinationZoneId: string
}): ContaminationExposure {
  const source = createContaminationSourceProfile(args.source)
  const actorId = requireNonEmpty(args.actor.actorId, 'actorId')
  const destinationZoneId = requireNonEmpty(args.destinationZoneId, 'destinationZoneId')
  const actorTags = [...new Set((args.actor.tags ?? []).map(requireTag))].sort(compareAscii)

  const dest = source.destinations.find((d) => d.destinationZoneId === destinationZoneId)
  if (!dest) {
    return Object.freeze({
      sourceId: source.sourceId,
      sourceZoneId: source.sourceZoneId,
      destinationZoneId,
      actorId,
      symptom: null,
      severity: 'none',
      susceptible: false,
      reasons: Object.freeze(['unknown-destination']),
    })
  }

  const susceptible = actorTags.some((tag) => source.susceptibleTags.includes(tag))
  if (!susceptible) {
    return Object.freeze({
      sourceId: source.sourceId,
      sourceZoneId: source.sourceZoneId,
      destinationZoneId,
      actorId,
      symptom: dest.symptom,
      severity: 'none',
      susceptible: false,
      reasons: Object.freeze(['not-susceptible']),
    })
  }

  const severity = scaleSeverityByHops(dest.baseSeverity, dest.hopsFromSource)
  const reasons = [
    `symptom:${dest.symptom}`,
    `hops:${dest.hopsFromSource}`,
    `severity:${severity}`,
  ].sort(compareAscii)

  return Object.freeze({
    sourceId: source.sourceId,
    sourceZoneId: source.sourceZoneId,
    destinationZoneId,
    actorId,
    symptom: dest.symptom,
    severity,
    susceptible: true,
    reasons: Object.freeze(reasons),
  })
}

/**
 * Project exposures for every destination × matching actor (deterministic order).
 */
export function projectContaminationExposures(args: {
  readonly source: ContaminationSourceProfile
  readonly actors: readonly ActorContaminationSubject[]
}): readonly ContaminationExposure[] {
  const source = createContaminationSourceProfile(args.source)
  const byActorId = new Map<string, ActorContaminationSubject>()
  for (const actor of args.actors ?? []) {
    const actorId = requireNonEmpty(actor.actorId, 'actorId')
    if (byActorId.has(actorId)) {
      throw new Error(`cross-zone contamination duplicate actorId ${actorId}`)
    }
    byActorId.set(actorId, actor)
  }
  const actors = [...byActorId.values()].sort((a, b) =>
    compareAscii(a.actorId, b.actorId),
  )
  const out: ContaminationExposure[] = []
  for (const dest of source.destinations) {
    for (const actor of actors) {
      out.push(
        evaluateContaminationExposure({
          source,
          actor,
          destinationZoneId: dest.destinationZoneId,
        }),
      )
    }
  }
  return Object.freeze(out)
}

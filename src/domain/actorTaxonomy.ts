// SPE-1064 slice 1: unified actor taxonomy scaffold
// Pure declarations + compatibility checks + known-vs-true correction.

export type ActorClass =
  | 'human'
  | 'animal'
  | 'anomalous_animal'
  | 'humanoid_anomaly'
  | 'spirit_manifestation'
  | 'construct'
  | 'servitor'
  | 'possessed_host'

export type PhysicalityState =
  | 'physical'
  | 'semi_physical'
  | 'nonphysical'
  | 'projected'
  | 'anchored'
  | 'vessel_bound'
  | 'possessed'

export type ActorInteraction =
  | 'interview'
  | 'restrain'
  | 'sedate'
  | 'injure'
  | 'track'
  | 'photograph'
  | 'record'
  | 'ward'
  | 'bargain'
  | 'archive'
  | 'physically_store'

export interface ActorCapabilityFlags {
  canInterview: boolean
  canRestrain: boolean
  canSedate: boolean
  canInjure: boolean
  canTrack: boolean
  canPhotograph: boolean
  canRecord: boolean
  canWard: boolean
  canBargain: boolean
  canArchive: boolean
  canPhysicallyStore: boolean
}

export interface UnifiedActorDeclaration {
  id: string
  label: string
  actorClass: ActorClass
  physicality: PhysicalityState
  locationTag?: string
  factionTag?: string
  behaviorState:
    | 'dormant'
    | 'hunting'
    | 'hiding'
    | 'fleeing'
    | 'bargaining'
    | 'contained'
    | 'recovering'
    | 'escalating'
  movementModes: string[]
  sensingChannels: string[]
  needs: string[]
  drives: string[]
  capabilities: ActorCapabilityFlags
  lifecycleTags?: string[]
}

export interface KnownActorProfile {
  actorId: string
  confidence: 'unknown' | 'low' | 'medium' | 'high' | 'confirmed'
  provisionalClass: ActorClass
  provisionalPhysicality: PhysicalityState
  provisionalMovementModes: string[]
  provisionalSensingChannels: string[]
  provisionalCapabilities: Partial<ActorCapabilityFlags>
  correctionCount: number
  lastCorrectionReason?: string
}

export interface TrueActorProfile {
  declaration: UnifiedActorDeclaration
}

export interface ActorProfileCorrection {
  changed: boolean
  before: KnownActorProfile
  after: KnownActorProfile
  reason: string
}

export interface PhysicalityCompatibilitySummary {
  physicality: PhysicalityState
  allowsPhysicalTargeting: boolean
  allowsPhysicalStorage: boolean
  allowsConventionalRestraint: boolean
  notes: string[]
}

const INTERACTION_TO_CAPABILITY: Record<ActorInteraction, keyof ActorCapabilityFlags> = {
  interview: 'canInterview',
  restrain: 'canRestrain',
  sedate: 'canSedate',
  injure: 'canInjure',
  track: 'canTrack',
  photograph: 'canPhotograph',
  record: 'canRecord',
  ward: 'canWard',
  bargain: 'canBargain',
  archive: 'canArchive',
  physically_store: 'canPhysicallyStore',
}

function uniqueList(values: readonly string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter((v) => v.length > 0))]
}

/**
 * Shared declaration constructor used for all actor classes.
 * Normalizes list-like fields for deterministic comparisons.
 */
export function declareActor(input: UnifiedActorDeclaration): UnifiedActorDeclaration {
  return {
    ...input,
    movementModes: uniqueList(input.movementModes),
    sensingChannels: uniqueList(input.sensingChannels),
    needs: uniqueList(input.needs),
    drives: uniqueList(input.drives),
    lifecycleTags: uniqueList(input.lifecycleTags ?? []),
  }
}

/**
 * Physicality-based compatibility rules.
 * These are deterministic baseline rules; family-specific systems can layer on top.
 */
export function resolvePhysicalityCompatibility(
  actor: Pick<UnifiedActorDeclaration, 'physicality'>
): PhysicalityCompatibilitySummary {
  switch (actor.physicality) {
    case 'physical':
    case 'possessed':
    case 'vessel_bound':
      return {
        physicality: actor.physicality,
        allowsPhysicalTargeting: true,
        allowsPhysicalStorage: true,
        allowsConventionalRestraint: true,
        notes: ['fully embodied interaction profile'],
      }
    case 'semi_physical':
    case 'anchored':
      return {
        physicality: actor.physicality,
        allowsPhysicalTargeting: true,
        allowsPhysicalStorage: false,
        allowsConventionalRestraint: false,
        notes: ['partially embodied: can be targeted but not conventionally stored/restrained'],
      }
    case 'nonphysical':
    case 'projected':
      return {
        physicality: actor.physicality,
        allowsPhysicalTargeting: false,
        allowsPhysicalStorage: false,
        allowsConventionalRestraint: false,
        notes: ['intangible profile: physical containment interactions blocked'],
      }
  }
}

/**
 * Checks legality for a specific interaction by combining explicit capability
 * declarations with physicality compatibility gates.
 */
export function isInteractionAllowed(
  actor: UnifiedActorDeclaration,
  interaction: ActorInteraction
): boolean {
  const key = INTERACTION_TO_CAPABILITY[interaction]
  const declared = actor.capabilities[key]

  if (!declared) {
    return false
  }

  const compatibility = resolvePhysicalityCompatibility(actor)

  if (interaction === 'physically_store' && !compatibility.allowsPhysicalStorage) {
    return false
  }

  if ((interaction === 'restrain' || interaction === 'sedate') && !compatibility.allowsConventionalRestraint) {
    return false
  }

  if (interaction === 'injure' && !compatibility.allowsPhysicalTargeting) {
    return false
  }

  return true
}

/**
 * Creates a known (possibly inaccurate) profile from an actor declaration.
 * Callers may override provisional values to represent misclassification.
 */
export function buildKnownProfile(
  truth: UnifiedActorDeclaration,
  overrides: Partial<Omit<KnownActorProfile, 'actorId' | 'confidence' | 'correctionCount'>> = {},
  confidence: KnownActorProfile['confidence'] = 'low'
): KnownActorProfile {
  return {
    actorId: truth.id,
    confidence,
    provisionalClass: overrides.provisionalClass ?? truth.actorClass,
    provisionalPhysicality: overrides.provisionalPhysicality ?? truth.physicality,
    provisionalMovementModes: uniqueList(
      overrides.provisionalMovementModes ?? truth.movementModes
    ),
    provisionalSensingChannels: uniqueList(
      overrides.provisionalSensingChannels ?? truth.sensingChannels
    ),
    provisionalCapabilities: {
      ...(overrides.provisionalCapabilities ?? truth.capabilities),
    },
    correctionCount: 0,
    ...(overrides.lastCorrectionReason ? { lastCorrectionReason: overrides.lastCorrectionReason } : {}),
  }
}

/**
 * Deterministically updates a known profile toward the true declaration.
 */
export function correctKnownProfile(
  known: KnownActorProfile,
  truth: TrueActorProfile,
  reason: string
): ActorProfileCorrection {
  const next: KnownActorProfile = {
    ...known,
    provisionalClass: truth.declaration.actorClass,
    provisionalPhysicality: truth.declaration.physicality,
    provisionalMovementModes: uniqueList(truth.declaration.movementModes),
    provisionalSensingChannels: uniqueList(truth.declaration.sensingChannels),
    provisionalCapabilities: { ...truth.declaration.capabilities },
    confidence: 'confirmed',
    correctionCount: known.correctionCount + 1,
    lastCorrectionReason: reason,
  }

  const changed =
    known.provisionalClass !== next.provisionalClass ||
    known.provisionalPhysicality !== next.provisionalPhysicality ||
    JSON.stringify(known.provisionalMovementModes) !== JSON.stringify(next.provisionalMovementModes) ||
    JSON.stringify(known.provisionalSensingChannels) !== JSON.stringify(next.provisionalSensingChannels) ||
    JSON.stringify(known.provisionalCapabilities) !== JSON.stringify(next.provisionalCapabilities) ||
    known.confidence !== next.confidence

  return {
    changed,
    before: known,
    after: next,
    reason,
  }
}

// ---------------------------------------------------------------------------
// Proof declarations (slice 1 only)
// ---------------------------------------------------------------------------

export const PROOF_HUMAN_ACTOR = declareActor({
  id: 'actor-human-001',
  label: 'Field Investigator',
  actorClass: 'human',
  physicality: 'physical',
  locationTag: 'site:archive-annex',
  factionTag: 'agency',
  behaviorState: 'hunting',
  movementModes: ['walking'],
  sensingChannels: ['visual', 'audio'],
  needs: ['sleep', 'food'],
  drives: ['protect-civilians', 'solve-case'],
  capabilities: {
    canInterview: true,
    canRestrain: true,
    canSedate: true,
    canInjure: true,
    canTrack: true,
    canPhotograph: true,
    canRecord: true,
    canWard: false,
    canBargain: true,
    canArchive: true,
    canPhysicallyStore: true,
  },
  lifecycleTags: ['matures', 'decays'],
})

export const PROOF_SPIRIT_ACTOR = declareActor({
  id: 'actor-spirit-001',
  label: 'Whisper Shade',
  actorClass: 'spirit_manifestation',
  physicality: 'nonphysical',
  locationTag: 'site:archive-annex',
  factionTag: 'anomaly',
  behaviorState: 'hiding',
  movementModes: ['phasing', 'dream-travel'],
  sensingChannels: ['fear', 'names', 'guilt'],
  needs: ['attention'],
  drives: ['haunt-witnesses'],
  capabilities: {
    canInterview: false,
    canRestrain: false,
    canSedate: false,
    canInjure: true,
    canTrack: false,
    canPhotograph: false,
    canRecord: true,
    canWard: true,
    canBargain: true,
    canArchive: true,
    canPhysicallyStore: false,
  },
  lifecycleTags: ['shedding-residue'],
})

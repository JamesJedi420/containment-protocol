/** SPE-3122: Canonical social actor profile state substrate (slice 1).
 * Actor-intrinsic social profile; does not own relationship edges, personality facets, commitments, dossiers, or knowledge.
 */
import type { Agent } from './agent/models'

export const SOCIAL_ACTOR_PROFILE_VERSION = 1 as const

export const DISPOSITION_VALUES = ['hostile', 'wary', 'neutral', 'cooperative', 'aligned'] as const
export type Disposition = (typeof DISPOSITION_VALUES)[number]

export const FEAR_POSTURE_VALUES = ['none', 'low', 'elevated', 'high'] as const
export type FearPosture = (typeof FEAR_POSTURE_VALUES)[number]

export const OBLIGATION_POSTURE_VALUES = ['none', 'owed', 'owing', 'mutual'] as const
export type ObligationPosture = (typeof OBLIGATION_POSTURE_VALUES)[number]

export const LOYALTY_SUSPICION_VALUES = ['suspicious', 'neutral', 'loyal'] as const
export type LoyaltySuspicionPosture = (typeof LOYALTY_SUSPICION_VALUES)[number]

export interface SocialNeeds {
  readonly recognition?: number // 0-100 bounded
  readonly belonging?: number
  readonly safety?: number
}

export interface AffiliationRef {
  readonly affiliationId: string
  readonly role?: string
}

export interface RoutineRef {
  readonly routineId: string
  readonly active?: boolean
}

export interface LeverageRef {
  readonly leverageId: string
  readonly concealed?: boolean
}

export interface SocialActorProfile {
  readonly version: typeof SOCIAL_ACTOR_PROFILE_VERSION
  readonly actorId: string
  readonly disposition: Disposition
  readonly fearPosture: FearPosture
  readonly obligationPosture: ObligationPosture
  readonly loyaltySuspicion: LoyaltySuspicionPosture
  readonly socialNeeds: SocialNeeds
  readonly affiliations: readonly AffiliationRef[]
  readonly routines: readonly RoutineRef[]
  readonly leverageRefs: readonly LeverageRef[]
  readonly socialStress: number // 0-100
  readonly hiddenFields: readonly string[] // fields not exposed in player projection
  readonly provenance: {
    readonly sourceRef: string
    readonly reason: string
    readonly week?: number
    readonly eventId?: string
  }
}

const HIDDEN_ELIGIBLE = new Set([
  'disposition',
  'fearPosture',
  'obligationPosture',
  'loyaltySuspicion',
  'socialNeeds',
  'leverageRefs',
  'socialStress',
])

export function compareKeys(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)))
}

/** Deterministic validation and normalization. Rejects invalid, duplicate, or orphaned refs. */
export function normalizeSocialActorProfile(
  raw: unknown,
  actorId: string
): SocialActorProfile | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  if (o.actorId !== actorId || o.version !== SOCIAL_ACTOR_PROFILE_VERSION) return null

  const disposition = DISPOSITION_VALUES.includes(o.disposition as Disposition)
    ? (o.disposition as Disposition)
    : 'neutral'
  const fearPosture = FEAR_POSTURE_VALUES.includes(o.fearPosture as FearPosture)
    ? (o.fearPosture as FearPosture)
    : 'none'
  const obligationPosture = OBLIGATION_POSTURE_VALUES.includes(o.obligationPosture as ObligationPosture)
    ? (o.obligationPosture as ObligationPosture)
    : 'none'
  const loyaltySuspicion = LOYALTY_SUSPICION_VALUES.includes(o.loyaltySuspicion as LoyaltySuspicionPosture)
    ? (o.loyaltySuspicion as LoyaltySuspicionPosture)
    : 'neutral'

  const socialNeeds: SocialNeeds = {}
  if (typeof o.socialNeeds === 'object' && o.socialNeeds && !Array.isArray(o.socialNeeds)) {
    const n = o.socialNeeds as Record<string, unknown>
    if (typeof n.recognition === 'number') socialNeeds.recognition = clamp(n.recognition, 0, 100)
    if (typeof n.belonging === 'number') socialNeeds.belonging = clamp(n.belonging, 0, 100)
    if (typeof n.safety === 'number') socialNeeds.safety = clamp(n.safety, 0, 100)
  }

  const affiliations = normalizeRefs(o.affiliations, 'affiliationId')
  const routines = normalizeRefs(o.routines, 'routineId')
  const leverageRefs = normalizeRefs(o.leverageRefs, 'leverageId').map((r) => ({
    ...r,
    concealed: typeof (r as any).concealed === 'boolean' ? (r as any).concealed : false,
  }))

  const socialStress = typeof o.socialStress === 'number' ? clamp(o.socialStress, 0, 100) : 0

  const hiddenFields = Array.isArray(o.hiddenFields)
    ? [...new Set(o.hiddenFields.filter((f): f is string => typeof f === 'string' && HIDDEN_ELIGIBLE.has(f)))].sort(compareKeys)
    : []

  const provenance = normalizeProvenance(o.provenance)
  if (!provenance) return null

  return Object.freeze({
    version: SOCIAL_ACTOR_PROFILE_VERSION,
    actorId,
    disposition,
    fearPosture,
    obligationPosture,
    loyaltySuspicion,
    socialNeeds: Object.freeze(socialNeeds),
    affiliations: Object.freeze(affiliations),
    routines: Object.freeze(routines),
    leverageRefs: Object.freeze(leverageRefs),
    socialStress,
    hiddenFields: Object.freeze(hiddenFields),
    provenance: Object.freeze(provenance),
  })
}

function normalizeRefs(raw: unknown, idKey: string): any[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  return raw
    .filter((item) => item && typeof item === 'object' && typeof (item as any)[idKey] === 'string')
    .map((item) => {
      const id = ((item as any)[idKey] as string).trim()
      if (!id || seen.has(id)) return null
      seen.add(id)
      return Object.freeze({ ...item, [idKey]: id })
    })
    .filter(Boolean)
    .sort((a, b) => compareKeys((a as any)[idKey], (b as any)[idKey]))
}

function normalizeProvenance(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const p = raw as Record<string, unknown>
  if (typeof p.sourceRef !== 'string' || !p.sourceRef.trim() || typeof p.reason !== 'string' || !p.reason.trim())
    return null
  return {
    sourceRef: p.sourceRef.trim(),
    reason: p.reason.trim(),
    ...(typeof p.week === 'number' && Number.isSafeInteger(p.week) && p.week >= 0 ? { week: p.week } : {}),
    ...(typeof p.eventId === 'string' && p.eventId.trim() ? { eventId: p.eventId.trim() } : {}),
  }
}

/** Player-facing projection omits hidden fields. Authoritative simulation sees full profile. */
export function projectSocialActorProfileForPlayer(profile: SocialActorProfile) {
  const projected: Partial<SocialActorProfile> = {
    version: profile.version,
    actorId: profile.actorId,
    affiliations: profile.affiliations,
    routines: profile.routines,
    provenance: profile.provenance,
  }
  for (const field of Object.keys(profile) as (keyof SocialActorProfile)[]) {
    if (HIDDEN_ELIGIBLE.has(field as string) && !profile.hiddenFields.includes(field as string)) {
      ;(projected as any)[field] = (profile as any)[field]
    }
  }
  return Object.freeze(projected)
}

/** Adapter from existing Agent; does not create second registry. */
export function deriveSocialActorProfileFromAgent(agent: Agent): SocialActorProfile {
  return normalizeSocialActorProfile(
    {
      version: SOCIAL_ACTOR_PROFILE_VERSION,
      actorId: agent.id,
      disposition: 'neutral',
      fearPosture: 'none',
      obligationPosture: 'none',
      loyaltySuspicion: 'neutral',
      socialNeeds: {},
      affiliations: [],
      routines: [],
      leverageRefs: [],
      socialStress: 0,
      hiddenFields: ['disposition', 'loyaltySuspicion'],
      provenance: { sourceRef: 'agent-adapter', reason: 'derived' },
    },
    agent.id
  )!
}

export function getSocialActorProfile(agent: Agent & { socialProfile?: unknown }): SocialActorProfile | null {
  return agent.socialProfile ? normalizeSocialActorProfile(agent.socialProfile, agent.id) : null
}

/** Idempotent write; rejects same mutation without new eventId. */
export function writeSocialActorProfile(
  agent: Agent,
  profile: SocialActorProfile,
  eventId?: string
): Agent {
  const normalized = normalizeSocialActorProfile(profile, agent.id)
  if (!normalized) throw new Error('Invalid social actor profile.')
  const current = getSocialActorProfile(agent as any)
  if (
    current &&
    eventId === undefined &&
    current.disposition === normalized.disposition &&
    current.fearPosture === normalized.fearPosture &&
    current.socialStress === normalized.socialStress &&
    current.hiddenFields.join() === normalized.hiddenFields.join()
  )
    return agent
  return {
    ...agent,
    socialProfile: normalized,
  } as Agent
}

/** Query helper for consumers (SPE-3105, SPE-3111). */
export function querySocialActorProfile(agent: Agent): SocialActorProfile | null {
  return getSocialActorProfile(agent as any)
}

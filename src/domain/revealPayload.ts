/**
 * SPE-781 slice 1: bounded reveal-payload layer separating internal truth from
 * player-facing scan tiers. Deterministic conceal/reveal opposition — no universal identify.
 */

export type RevealTier =
  | 'presence'
  | 'category'
  | 'hostility'
  | 'active_protection'
  | 'concealment_depth'
  | 'exact_identity'

export type ScanFamily = 'presence_sweep' | 'category_pass' | 'active_effects' | 'identity_probe'

export type HostilityLevel = 'none' | 'latent' | 'active'

export interface ConcealmentLayer {
  readonly id: string
  /** Tiers suppressed while this layer remains intact (outermost listed first). */
  readonly blockedTiers: readonly RevealTier[]
}

export interface SubjectTruthState {
  readonly present: boolean
  readonly exactIdentity: string
  readonly category: string
  readonly hostility: HostilityLevel
  readonly activeProtections: readonly string[]
  /** Outermost concealment layer first — peel before deeper tiers unlock. */
  readonly concealmentLayers: readonly ConcealmentLayer[]
  readonly activeEffects: readonly string[]
  /** Hidden from active-effect scans until an identity or deep probe succeeds. */
  readonly dormantEffects: readonly string[]
}

export interface RevealPayloadField {
  readonly tier: RevealTier
  readonly internalValue: string | number | boolean | readonly string[]
  readonly playerFacingValue: string
  readonly ambiguous: boolean
}

export interface DetectionScanInput {
  readonly family: ScanFamily
  /** Reveal actions strip this many outer concealment layers before resolving tiers. */
  readonly layersToStrip?: number
}

export interface DetectionScanResult {
  readonly fields: readonly RevealPayloadField[]
  readonly remainingConcealmentLayers: readonly ConcealmentLayer[]
  readonly strippedLayerIds: readonly string[]
}

const SCAN_FAMILY_TIERS: Readonly<Record<ScanFamily, readonly RevealTier[]>> = {
  presence_sweep: ['presence'],
  category_pass: ['presence', 'category'],
  active_effects: ['presence', 'active_protection'],
  identity_probe: ['presence', 'category', 'hostility', 'concealment_depth', 'exact_identity'],
}

const CATEGORY_AMBIGUITY_LABEL = 'unclassified contact'

function isTierBlocked(tier: RevealTier, layers: readonly ConcealmentLayer[]) {
  return layers.some((layer) => layer.blockedTiers.includes(tier))
}

function normalizeLayerStripCount(count: number | undefined) {
  if (count === undefined || Number.isNaN(count)) {
    return 0
  }

  return Math.max(0, Math.floor(count))
}

export function stripConcealmentLayers(
  layers: readonly ConcealmentLayer[],
  count: number | undefined
): { remaining: readonly ConcealmentLayer[]; strippedIds: readonly string[] } {
  const safeCount = Math.min(normalizeLayerStripCount(count), layers.length)
  const strippedIds = layers.slice(0, safeCount).map((layer) => layer.id)
  return {
    remaining: layers.slice(safeCount),
    strippedIds,
  }
}

function buildPresenceField(
  truth: SubjectTruthState,
  layers: readonly ConcealmentLayer[]
): RevealPayloadField | null {
  if (truth.present && isTierBlocked('presence', layers)) {
    return null
  }

  return {
    tier: 'presence',
    internalValue: truth.present,
    playerFacingValue: truth.present ? 'contact detected' : 'no contact',
    ambiguous: false,
  }
}

function buildCategoryField(
  truth: SubjectTruthState,
  layers: readonly ConcealmentLayer[]
): RevealPayloadField | null {
  if (isTierBlocked('category', layers)) {
    return null
  }

  const identityBlocked = isTierBlocked('exact_identity', layers)
  const ambiguous = identityBlocked

  return {
    tier: 'category',
    internalValue: truth.category,
    playerFacingValue: ambiguous ? CATEGORY_AMBIGUITY_LABEL : truth.category,
    ambiguous,
  }
}

function buildHostilityField(
  truth: SubjectTruthState,
  layers: readonly ConcealmentLayer[]
): RevealPayloadField | null {
  if (isTierBlocked('hostility', layers)) {
    return null
  }

  return {
    tier: 'hostility',
    internalValue: truth.hostility,
    playerFacingValue: truth.hostility,
    ambiguous: false,
  }
}

function buildActiveProtectionField(
  truth: SubjectTruthState,
  layers: readonly ConcealmentLayer[]
): RevealPayloadField | null {
  if (isTierBlocked('active_protection', layers)) {
    return null
  }

  const visibleEffects = truth.activeEffects
  const visibleProtections = truth.activeProtections

  if (visibleEffects.length === 0 && visibleProtections.length === 0) {
    return null
  }

  const combined = Array.from(new Set([...visibleProtections, ...visibleEffects]))

  return {
    tier: 'active_protection',
    internalValue: combined,
    playerFacingValue: combined.join(', '),
    ambiguous: false,
  }
}

function buildConcealmentDepthField(
  layers: readonly ConcealmentLayer[]
): RevealPayloadField | null {
  if (layers.length === 0 || isTierBlocked('concealment_depth', layers)) {
    return null
  }

  return {
    tier: 'concealment_depth',
    internalValue: layers.length,
    playerFacingValue: `${layers.length} concealed layer${layers.length === 1 ? '' : 's'}`,
    ambiguous: false,
  }
}

function buildExactIdentityField(
  truth: SubjectTruthState,
  layers: readonly ConcealmentLayer[]
): RevealPayloadField | null {
  if (isTierBlocked('exact_identity', layers)) {
    return null
  }

  return {
    tier: 'exact_identity',
    internalValue: truth.exactIdentity,
    playerFacingValue: truth.exactIdentity,
    ambiguous: false,
  }
}

function resolveTierField(
  tier: RevealTier,
  truth: SubjectTruthState,
  layers: readonly ConcealmentLayer[]
): RevealPayloadField | null {
  switch (tier) {
    case 'presence':
      return buildPresenceField(truth, layers)
    case 'category':
      return buildCategoryField(truth, layers)
    case 'hostility':
      return buildHostilityField(truth, layers)
    case 'active_protection':
      return buildActiveProtectionField(truth, layers)
    case 'concealment_depth':
      return buildConcealmentDepthField(layers)
    case 'exact_identity':
      return buildExactIdentityField(truth, layers)
    default: {
      const _exhaustive: never = tier
      return _exhaustive
    }
  }
}

export function resolveDetectionScan(
  truth: SubjectTruthState,
  input: DetectionScanInput
): DetectionScanResult {
  if (!truth.present) {
    const presence = buildPresenceField(truth, truth.concealmentLayers)
    return {
      fields: presence ? [presence] : [],
      remainingConcealmentLayers: truth.concealmentLayers,
      strippedLayerIds: [],
    }
  }

  const peel = stripConcealmentLayers(truth.concealmentLayers, input.layersToStrip)
  const remainingLayers = peel.remaining
  const requestedTiers = SCAN_FAMILY_TIERS[input.family]

  const fields = requestedTiers
    .map((tier) => resolveTierField(tier, truth, remainingLayers))
    .filter((field): field is RevealPayloadField => field !== null)

  return {
    fields,
    remainingConcealmentLayers: remainingLayers,
    strippedLayerIds: peel.strippedIds,
  }
}

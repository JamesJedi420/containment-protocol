// --- SPE-57: Spatial Explanation Helper ---
/**
 * Deterministically explain the main spatial factors affecting an operation.
 * Used for player-facing output and test assertions.
 */
export function explainSpatialState(
  siteLayer?: 'exterior' | 'transition' | 'interior',
  visibilityState?: 'clear' | 'obstructed' | 'exposed',
  transitionType?: 'open-approach' | 'threshold' | 'chokepoint',
  spatialFlags?: string[]
): string {
  const parts: string[] = [];
  const ingressFlag = spatialFlags?.find((flag) => flag.startsWith('ingress:'));
  const ingressType = ingressFlag ? ingressFlag.replace(/^ingress:/, '') : undefined;

  const ingressExplanationByType: Readonly<Record<string, string>> = {
    floodgate: 'Gate channel favors fortified defense and controlled lanes.',
    maintenance_shaft: 'Shaft ingress constrains frontage and sight-lines.',
    service_door: 'Service ingress supports standard traversal flow.',
    storm_drain: 'Drain ingress obscures routes and complicates tracking.',
  };

  const nonIngressFlags = (spatialFlags ?? []).filter((flag) => !flag.startsWith('ingress:'));

  if (siteLayer) parts.push(`Site layer: ${siteLayer}`);
  if (transitionType) parts.push(`Transition: ${transitionType}`);
  if (visibilityState) parts.push(`Visibility: ${visibilityState}`);
  if (ingressType) {
    parts.push(
      `Ingress: ${ingressType}${ingressExplanationByType[ingressType] ? ` — ${ingressExplanationByType[ingressType]}` : ''}`
    );
  }
  if (nonIngressFlags.length > 0) parts.push(`Flags: ${nonIngressFlags.join(', ')}`);
  return parts.length > 0 ? parts.join(' | ') : 'No spatial constraints.';
}
// --- Multi-source/Team Knowledge Fusion ---
// Fuse knowledge states from multiple teams for a subject
export function applyKnowledgeFusion(
  states: KnowledgeStateMap[],
  subjectId: string,
  week: number
): KnowledgeState {
  // Gather all knowledge states for the subject
  const all = states
    .map((s) => Object.values(s).find((ks) => ks.subjectId === subjectId))
    .filter(Boolean) as KnowledgeState[]
  if (all.length === 0) {
    return {
      subjectId,
      subjectType: 'anomaly',
      entityId: '',
      entityType: 'team',
      tier: 'unknown',
      fusedFrom: [],
      lastFusedWeek: week,
    }
  }
  // Priority: confirmed > partial > unknown
  let tier: 'confirmed' | 'partial' | 'unknown' = 'unknown'
  if (all.some((ks) => ks.tier === 'confirmed')) tier = 'confirmed'
  else if (all.some((ks) => ks.tier === 'partial')) tier = 'partial'
  const fusedFrom = all.map((ks) => ks.entityId)
  return {
    ...all[0],
    tier,
    fusedFrom,
    lastFusedWeek: week,
    notes: `Fused from ${fusedFrom.join(', ')} (week ${week})`
  }
}
// --- Time-based Decay/Regression of Knowledge Certainty ---
// Decay knowledge tiers over time if not refreshed
export function applyKnowledgeDecay(
  state: KnowledgeStateMap,
  currentWeek: number,
  decayConfig: { confirmedToPartial?: number; partialToUnknown?: number }
): KnowledgeStateMap {
  const next: KnowledgeStateMap = { ...state }
  for (const key in state) {
    const ks = state[key]
    // Decay confirmed → partial
    if (
      ks.tier === 'confirmed' &&
      decayConfig.confirmedToPartial &&
      typeof ks.lastConfirmedWeek === 'number' &&
      currentWeek - ks.lastConfirmedWeek >= decayConfig.confirmedToPartial
    ) {
      next[key] = {
        ...ks,
        tier: 'partial',
        decayed: true,
        lastDecayedWeek: currentWeek,
        notes: `Decayed from confirmed (week ${currentWeek})`
      }
      continue
    }
    // Decay partial → unknown
    if (
      ks.tier === 'partial' &&
      decayConfig.partialToUnknown &&
      typeof ks.lastDecayedWeek === 'number' &&
      currentWeek - ks.lastDecayedWeek >= decayConfig.partialToUnknown
    ) {
      next[key] = {
        ...ks,
        tier: 'unknown',
        decayed: true,
        lastDecayedWeek: currentWeek,
        notes: `Decayed from partial (week ${currentWeek})`
      }
    }
  }
  return next
}
// --- Multi-hop/Chained Relay and Relay Failure ---
// Relay knowledge from one team to another
export function applyRelay(
  state: KnowledgeStateMap,
  fromTeamId: string,
  toTeamId: string,
  subjectId: string,
  week: number
): KnowledgeStateMap {
  const sourceKey = getKnowledgeKey(fromTeamId, subjectId)
  const destKey = getKnowledgeKey(toTeamId, subjectId)
  const source = state[sourceKey]
  if (!source || source.tier === 'unknown') return state
  const next: KnowledgeState = {
    ...source,
    entityId: toTeamId,
    relaySource: fromTeamId,
    tier: 'relayed',
    lastRelayedWeek: week,
    relayFailed: false,
    notes: `Relayed from ${fromTeamId} (week ${week})`
  }
  return { ...state, [destKey]: next }
}

// Mark relay as failed for a team/subject
export function applyRelayFailure(
  state: KnowledgeStateMap,
  teamId: string,
  subjectId: string,
  week: number
): KnowledgeStateMap {
  const key = getKnowledgeKey(teamId, subjectId)
  const prev = state[key]
  if (!prev) return state
  const next: KnowledgeState = {
    ...prev,
    relayFailed: true,
    tier: 'unknown',
    lastRelayFailedWeek: week,
    notes: `Relay failed (week ${week})`
  }
  return { ...state, [key]: next }
}
// --- Hazard Sensing and Masking ---
// Promote knowledge to 'confirmed' for a team detecting a hazard
export function applyHazardSensing(
  state: KnowledgeStateMap,
  teamId: string,
  hazardId: string,
  week: number
): KnowledgeStateMap {
  const key = getKnowledgeKey(teamId, hazardId)
  const prev = state[key]
  const next: KnowledgeState = {
    ...prev,
    tier: 'confirmed',
    entityId: teamId,
    entityType: 'team',
    subjectId: hazardId,
    subjectType: 'hazard',
    lastConfirmedWeek: week,
    source: 'hazard-sensing',
    notes: 'Hazard detected.'
  }
  // Remove masked and relay flags if present
  delete next.masked
  delete next.lastMaskedWeek
  delete next.relayAvailableWeek
  return { ...state, [key]: next }
}

// Mark knowledge as masked if hazard is masked
export function applyHazardMasking(
  state: KnowledgeStateMap,
  teamId: string,
  hazardId: string,
  week: number
): KnowledgeStateMap {
  const key = getKnowledgeKey(teamId, hazardId)
  const prev = state[key]
  const next: KnowledgeState = {
    ...prev,
    tier: 'unknown',
    entityId: teamId,
    entityType: 'team',
    subjectId: hazardId,
    subjectType: 'hazard',
    masked: true,
    lastMaskedWeek: week,
    source: 'hazard-masking',
    notes: 'Hazard is masked/obscured.'
  }
  return { ...state, [key]: next }
}
// --- Defeat-Condition Gating Utility ---
// Returns true if the team has at least the required certainty for a defeat condition
export function hasDefeatConditionCertainty(
  state: KnowledgeStateMap,
  teamId: string,
  anomalyId: string,
  required: DefeatConditionCertainty
): boolean {
  const key = getKnowledgeKey(teamId, anomalyId)
  const entry = state[key]
  if (!entry || !entry.defeatConditionCertainty) return false
  const order = ['unknown', 'suspected', 'family', 'exact']
  const currentIdx = order.indexOf(entry.defeatConditionCertainty)
  const requiredIdx = order.indexOf(required)
  return currentIdx >= requiredIdx
}
// --- Defeat-Condition Certainty Ladder ---
// Multi-level certainty for defeat/neutralization knowledge
export type DefeatConditionCertainty = 'unknown' | 'suspected' | 'family' | 'exact'

export function applyDefeatConditionKnowledge(
  state: KnowledgeStateMap,
  teamId: string,
  anomalyId: string,
  certainty: DefeatConditionCertainty,
  week: number
): KnowledgeStateMap {
  const key = getKnowledgeKey(teamId, anomalyId)
  const prev = state[key]
  const next: KnowledgeState = {
    ...prev,
    entityId: teamId,
    entityType: 'team',
    subjectId: anomalyId,
    subjectType: 'anomaly',
    defeatConditionCertainty: certainty,
    lastDefeatConditionUpdateWeek: week,
    notes: `Defeat condition certainty: ${certainty}`
  }
  return { ...state, [key]: next }
}
// --- Filtered Report Output ---
// Returns a filtered view of knowledge for public vs internal reports
export function getFilteredKnowledgeView(
  state: KnowledgeStateMap,
  filter: 'public' | 'internal'
): KnowledgeStateMap {
  const filtered: KnowledgeStateMap = {}
  if (filter === 'public') {
    for (const [key, value] of Object.entries(state)) {
      // Show confirmed knowledge as before
      if (value.tier === 'confirmed' && !value.masked) {
        filtered[key] = { ...value, notes: undefined }
        continue
      }
      // Show defeat-condition knowledge if certainty is not 'unknown'
      if (
        value.defeatConditionCertainty === 'suspected' ||
        value.defeatConditionCertainty === 'family' ||
        value.defeatConditionCertainty === 'exact'
      ) {
        let notes = ''
        if (value.defeatConditionCertainty === 'suspected') {
          notes = 'Possible bypass exists.'
        } else if (value.defeatConditionCertainty === 'family') {
          notes = 'Bypass method family suspected.'
        } else if (value.defeatConditionCertainty === 'exact') {
          notes = 'Exact defeat/neutralization condition known.'
        }
        filtered[key] = {
          ...value,
          notes,
          // Redact other details for public except for 'exact', which can show tier
          tier: value.defeatConditionCertainty === 'exact' ? value.tier : 'unknown',
          lastConfirmedWeek: value.defeatConditionCertainty === 'exact' ? value.lastConfirmedWeek : undefined,
        }
      }
    }
    return filtered
  } else {
    for (const [key, value] of Object.entries(state)) {
      filtered[key] = value
    }
    return filtered
  }
}
// --- Delayed Relay Path Logic ---
// Marks knowledge as pending-relay, available after a delay
export function applyRelayDelay(
  state: KnowledgeStateMap,
  teamId: string,
  anomalyId: string,
  currentWeek: number,
  delay: number
): KnowledgeStateMap {
  const key = getKnowledgeKey(teamId, anomalyId)
  const prev = state[key]
  const next: KnowledgeState = {
    ...prev,
    tier: 'pending-relay',
    entityId: teamId,
    entityType: 'team',
    subjectId: anomalyId,
    subjectType: 'anomaly',
    relayAvailableWeek: currentWeek + delay,
    source: 'relay',
    notes: `Relay in progress, available week ${currentWeek + delay}.`
  }
  return { ...state, [key]: next }
}
// --- Obscured Signature Counter-Sensing Logic ---
// Marks knowledge as masked if signature is obscured
export function applyObscuredSignature(
  state: KnowledgeStateMap,
  teamId: string,
  anomalyId: string,
  week: number
): KnowledgeStateMap {
  const key = getKnowledgeKey(teamId, anomalyId)
  const prev = state[key]
  const next: KnowledgeState = {
    ...prev,
    tier: 'unknown',
    entityId: teamId,
    entityType: 'team',
    subjectId: anomalyId,
    subjectType: 'anomaly',
    masked: true,
    lastMaskedWeek: week,
    source: 'obscured-signature',
    notes: 'Signature is masked/obscured.'
  }
  return { ...state, [key]: next }
}
// --- Anomaly Signature Sensing Logic ---
// Promotes knowledge to 'confirmed' for a team detecting an anomaly signature
export function applyAnomalySignatureSensing(
  state: KnowledgeStateMap,
  teamId: string,
  anomalyId: string,
  week: number
): KnowledgeStateMap {
  const key = getKnowledgeKey(teamId, anomalyId)
  const prev = state[key]
  const next: KnowledgeState = {
    ...prev,
    tier: 'confirmed',
    entityId: teamId,
    entityType: 'team',
    subjectId: anomalyId,
    subjectType: 'anomaly',
    lastConfirmedWeek: week,
    source: 'anomaly-signature',
    notes: 'Signature detected.'
  }
  // Remove masked and relay flags if present
  delete next.masked
  delete next.lastMaskedWeek
  delete next.relayAvailableWeek
  return { ...state, [key]: next }
}
// src/domain/knowledge.ts
// Canonical knowledge-state model for deterministic operational knowledge


// Tiers remain compact; fragmentation/obsolescence are state flags, not tiers
export type KnowledgeTier =
  | 'unknown'           // No relevant information
  | 'partial'
  | 'relayed'
  | 'pending-relay'
  | 'suspected'         // Hints or partial intel
  | 'observed'          // Direct but unconfirmed exposure
  | 'confirmed'         // Mechanically validated
  | 'operationalized'   // Reusable by teams/roles
  | 'institutionalized' // Permanently embedded in org memory

// Institutionalized is deferred unless org-level storage is trivial

export type KnowledgeFragmentation = 'none' | 'fragmented' | 'obsolete'

export type KnowledgeOwnerType = 'team' | 'site' | 'hazard' | 'protocol' | 'role'
export type KnowledgeSubjectType = 'site' | 'anomaly' | 'hazard' | 'protocol' | 'procedure'

export interface KnowledgeState {
  tier: KnowledgeTier
  entityId: string
  entityType?: KnowledgeOwnerType
  subjectId: string
  subjectType?: KnowledgeSubjectType
  lastConfirmedWeek?: number
  lastOperationalizedWeek?: number
  lastDecayWeek?: number
  // Fragmentation/obsolescence state
  fragmentation?: KnowledgeFragmentation
  // True if knowledge is currently obsolete due to environment/subject mutation
  obsolete?: boolean
  // True if knowledge is currently fragmented (degraded, unreliable)
  fragmented?: boolean
  // Count of exposures (for deterministic promotion)
  exposureCount?: number
  // New: How was this knowledge acquired? (e.g., 'field', 'training', 'archive', 'external')
  source?: string
  notes?: string // Optional explanation for UI/reporting
  // --- SPE-59: Encounter-state vs true-state separation ---
  /** What was first believed/encountered (provisional label/classification) */
  provisionalClassification?: string
  /** The actual/confirmed identity/classification */
  trueClassification?: string
  /** Current confirmation state: 'provisional' or 'confirmed' */
  confirmationState?: 'provisional' | 'confirmed'
  /** Bounded context tag (e.g., container/site/zone) that affected this knowledge */
  contextTag?: string
  fusedFrom?: string[]
  lastFusedWeek?: number
  decayed?: boolean
  lastDecayedWeek?: number
  relaySource?: string
  lastRelayedWeek?: number
  relayFailed?: boolean
  lastRelayFailedWeek?: number
  relayAvailableWeek?: number
  masked?: boolean
  lastMaskedWeek?: number
  defeatConditionCertainty?: DefeatConditionCertainty
  lastDefeatConditionUpdateWeek?: number
}

// Example: Team T1 has confirmed knowledge of Anomaly A1
// {
//   tier: 'confirmed',
//   entityId: 'T1',
//   entityType: 'team',
//   subjectId: 'A1',
//   subjectType: 'anomaly',
//   lastConfirmedWeek: 12,
//   notes: 'Direct containment success.'
// }

export type KnowledgeStateMap = Record<string, KnowledgeState>

// Utility to build a unique key for a knowledge state
export function getKnowledgeKey(entityId: string, subjectId: string) {
  return `${entityId}::${subjectId}`
}

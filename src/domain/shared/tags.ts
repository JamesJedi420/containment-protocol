export type TagFamily =
  | 'role'
  | 'capability'
  | 'gear'
  | 'asset'
  | 'anomaly'
  | 'behavior'
  | 'mission'
  | 'requirement'
  | 'environment'
  | 'hazard'
  | 'incident'
  | 'system-hook'
  | 'distortion'
  | 'state'

export interface CanonicalTag {
  key: string
  family: TagFamily
  description: string
}

export const TAGS: readonly CanonicalTag[] = [
  {
    key: 'recon-specialist',
    family: 'role',
    description:
      'Excels at scouting, intel gathering, and early threat detection. Favored in reconnaissance and investigation.',
  },
  {
    key: 'containment-specialist',
    family: 'role',
    description:
      'Excels at hazard control, anomaly suppression, and incident containment. Favored in direct containment and escalation prevention.',
  },
  {
    key: 'recovery-support',
    family: 'role',
    description:
      'Excels at casualty recovery, trauma mitigation, and post-incident stabilization. Favored in recovery and support operations.',
  },
  { key: 'stealth-specialist', family: 'role', description: 'Expert in stealth and infiltration.' },
  { key: 'medic', family: 'role', description: 'Trained in medical intervention.' },
  { key: 'engineer', family: 'role', description: 'Technical and mechanical expertise.' },
  { key: 'scout', family: 'role', description: 'Reconnaissance and information gathering.' },
  {
    key: 'biohazard-suit',
    family: 'gear',
    description: 'Protects against biological hazards.',
  },
  {
    key: 'thermal-vision',
    family: 'gear',
    description: 'Allows detection of heat signatures.',
  },
  {
    key: 'truth-serum',
    family: 'gear',
    description: 'Used to counter deception and manipulation.',
  },
  {
    key: 'signal-jammer',
    family: 'gear',
    description: 'Disrupts enemy communications and signals.',
  },
  {
    key: 'hazmat-protocol',
    family: 'mission',
    description: 'Strict hazardous material handling and quarantine.',
  },
  {
    key: 'antiviral-agent',
    family: 'gear',
    description: 'Neutralizes biological threats and infections.',
  },
  {
    key: 'psychologist',
    family: 'role',
    description: 'Expert in psychological support and threat mitigation.',
  },
  {
    key: 'morale-booster',
    family: 'gear',
    description: 'Improves team morale and resists psychological threats.',
  },
  {
    key: 'neural-shield',
    family: 'gear',
    description: 'Protects against mind control and psychic attacks.',
  },
  {
    key: 'firewall',
    family: 'gear',
    description: 'Defends against hacking and digital intrusion.',
  },
  {
    key: 'emp-device',
    family: 'gear',
    description: 'Disables electronic threats and technological hazards.',
  },
  { key: 'shapeshifter', family: 'anomaly', description: 'Can alter physical form.' },
  {
    key: 'psychic-distortion',
    family: 'anomaly',
    description: 'Distorts perception or cognition.',
  },
  {
    key: 'containment-protocol',
    family: 'mission',
    description: 'Requires strict containment procedures.',
  },
  {
    key: 'hazardous-materials',
    family: 'requirement',
    description: 'Needs special handling for dangerous substances.',
  },
  { key: 'low-visibility', family: 'environment', description: 'Obstructed or limited sightlines.' },
  { key: 'unstable-terrain', family: 'environment', description: 'Difficult or shifting ground.' },
  { key: 'biohazard', family: 'hazard', description: 'Biological threat present.' },
  {
    key: 'containment-breach',
    family: 'incident',
    description: 'Loss of containment integrity.',
  },
  {
    key: 'intel-source',
    family: 'system-hook',
    description: 'Origin of information or report.',
  },
  {
    key: 'fragmented',
    family: 'distortion',
    description: 'Information is incomplete or broken.',
  },
  {
    key: 'misleading',
    family: 'distortion',
    description: 'Information is intentionally or unintentionally deceptive.',
  },
  { key: 'unreliable', family: 'state', description: 'Cannot be fully trusted.' },
] as const

export type ConditionCarrierKind = 'agent' | 'team' | 'anomaly' | 'incident' | 'intel'

export type ConditionKey =
  | 'fatigued'
  | 'wounded'
  | 'exposed'
  | 'alerted'
  | 'contained'
  | 'fragmented'
  | 'escalating'

export interface ConditionDefinition {
  key: ConditionKey
  description: string
  allowedCarriers: readonly ConditionCarrierKind[]
  effect: string
}

export const CONDITIONS: readonly ConditionDefinition[] = [
  {
    key: 'fatigued',
    description: 'Reduced effectiveness due to exhaustion.',
    allowedCarriers: ['agent', 'team'],
    effect: 'Apply -1 modifier to all actions; cannot stack.',
  },
  {
    key: 'wounded',
    description: 'Sustained injury; impaired performance.',
    allowedCarriers: ['agent', 'team'],
    effect: 'Apply -2 modifier to physical actions; cannot stack.',
  },
  {
    key: 'exposed',
    description: 'Vulnerable to detection or attack.',
    allowedCarriers: ['agent', 'team', 'anomaly'],
    effect: 'Increase chance of being targeted or revealed.',
  },
  {
    key: 'alerted',
    description: 'On high alert; ready to respond.',
    allowedCarriers: ['agent', 'team', 'anomaly', 'incident'],
    effect: 'May trigger preemptive or defensive actions.',
  },
  {
    key: 'contained',
    description: 'Under strict control or quarantine.',
    allowedCarriers: ['anomaly', 'incident'],
    effect: 'Limits spread or escalation; reduces outgoing effects.',
  },
  {
    key: 'fragmented',
    description: 'State or information is incomplete or broken.',
    allowedCarriers: ['intel', 'incident'],
    effect: 'Reduces reliability or clarity of information.',
  },
  {
    key: 'escalating',
    description: 'Situation is worsening or intensifying.',
    allowedCarriers: ['incident', 'anomaly'],
    effect: 'Increases risk or severity over time.',
  },
] as const

type TagSource = readonly string[] | Set<string> | { tags?: readonly string[] } | undefined

function normalizeTagSource(source: TagSource): readonly string[] {
  if (!source) {
    return []
  }

  if (Array.isArray(source)) {
    return source
  }

  if (source instanceof Set) {
    return [...source]
  }

  return (source as { tags?: readonly string[] }).tags ?? []
}

export function createTagSet(...sources: readonly TagSource[]) {
  return new Set(sources.flatMap((source) => normalizeTagSource(source)))
}

export function mergeTags(
  ...sources: readonly (readonly string[] | undefined)[]
): string[] {
  return [...createTagSet(...sources)]
}

export function appendUniqueTags(
  existingTags: readonly string[] | undefined,
  tagKeys: readonly string[]
) {
  return mergeTags(existingTags, tagKeys)
}

export function hasTag(source: TagSource, tag: string) {
  return createTagSet(source).has(tag)
}

export function hasAnyTag(source: TagSource, tags: readonly string[]) {
  const tagSet = createTagSet(source)
  return tags.some((tag) => tagSet.has(tag))
}

export function hasAllTags(source: TagSource, tags: readonly string[]) {
  if (tags.length === 0) {
    return true
  }

  const tagSet = createTagSet(source)
  return tags.every((tag) => tagSet.has(tag))
}

export function getTagsByFamily(family: TagFamily) {
  return TAGS.filter((tag) => tag.family === family)
}

export function isValidTagKey(key: string) {
  return TAGS.some((tag) => tag.key === key)
}

export function attachTags(entity: { tags?: string[] }, tagKeys: readonly string[]) {
  if (!entity.tags) {
    entity.tags = []
  }

  for (const key of tagKeys) {
    if (isValidTagKey(key) && !entity.tags.includes(key)) {
      entity.tags.push(key)
    }
  }
}

export function getCondition(key: ConditionKey) {
  return CONDITIONS.find((condition) => condition.key === key)
}

export function isConditionAllowedFor(key: ConditionKey, carrier: string) {
  const condition = getCondition(key)
  return condition ? condition.allowedCarriers.includes(carrier as ConditionCarrierKind) : false
}

export function attachCondition(
  entity: { conditions?: ConditionKey[] },
  key: ConditionKey,
  carrier: string
) {
  if (!isConditionAllowedFor(key, carrier)) {
    return
  }

  if (!entity.conditions) {
    entity.conditions = []
  }

  if (!entity.conditions.includes(key)) {
    entity.conditions.push(key)
  }
}

/**
 * SPE-2197 slice 1: entity encounter summary packet.
 *
 * This pure authored packet exposes encounter-facing summaries without
 * resolving actions, damage, morale, recharge, statuses, or encounter AI.
 */

export const ENTITY_ENCOUNTER_PACKET_OWNER = 'SPE-2197' as const
export const ACTOR_TAXONOMY_OWNER = 'SPE-1064' as const
export const LIVING_PROCESS_SUBSTRATE_OWNER = 'SPE-1112' as const
export const OPERATIONAL_STATUS_REGISTRY_OWNER = 'SPE-2166' as const

export type EncounterMobilityBand = 'anchored' | 'restricted' | 'mobile' | 'rapid' | 'extreme'

export const ENCOUNTER_MOBILITY_BANDS: readonly EncounterMobilityBand[] = Object.freeze([
  'anchored',
  'restricted',
  'mobile',
  'rapid',
  'extreme',
])

export type EncounterSenseChannel =
  'visual' | 'auditory' | 'thermal' | 'chemical' | 'electromagnetic' | 'extrasensory' | 'networked'

export const ENCOUNTER_SENSE_CHANNELS: readonly EncounterSenseChannel[] = Object.freeze([
  'visual',
  'auditory',
  'thermal',
  'chemical',
  'electromagnetic',
  'extrasensory',
  'networked',
])

export type EncounterProtectionChannel =
  | 'physical'
  | 'thermal'
  | 'electrical'
  | 'chemical'
  | 'psychic'
  | 'ritual'
  | 'informational'
  | 'spatial'

export const ENCOUNTER_PROTECTION_CHANNELS: readonly EncounterProtectionChannel[] = Object.freeze([
  'physical',
  'thermal',
  'electrical',
  'chemical',
  'psychic',
  'ritual',
  'informational',
  'spatial',
])

export type EncounterProtectionRating = 'exposed' | 'limited' | 'reinforced' | 'exceptional'

export const ENCOUNTER_PROTECTION_RATINGS: readonly EncounterProtectionRating[] = Object.freeze([
  'exposed',
  'limited',
  'reinforced',
  'exceptional',
])

export type EncounterActionDelivery = 'contact' | 'near' | 'distant' | 'area' | 'self'

export const ENCOUNTER_ACTION_DELIVERIES: readonly EncounterActionDelivery[] = Object.freeze([
  'contact',
  'near',
  'distant',
  'area',
  'self',
])

export interface EncounterProtectionEntry {
  readonly channel: EncounterProtectionChannel
  readonly rating: EncounterProtectionRating
}

export interface EncounterActionOption {
  readonly id: string
  readonly label: string
  readonly delivery: EncounterActionDelivery
  readonly outcomeRefs: readonly string[]
}

export type EncounterRechargeDefinition =
  | {
      readonly mode: 'recovery_interval'
      /** Number of completed caller-owned resolution steps before availability returns. */
      readonly recoverySteps: number
    }
  | {
      readonly mode: 'state_reset'
      /** Caller-owned state transition that restores availability. */
      readonly resetStateRef: string
    }

export interface EncounterRechargeAction {
  readonly actionRef: string
  readonly recharge: EncounterRechargeDefinition
}

export interface EncounterPassiveTrait {
  readonly id: string
  readonly label: string
  readonly effectRef: string
}

export interface EntityEncounterPacketOwnerReferences {
  readonly actorTaxonomyOwner: typeof ACTOR_TAXONOMY_OWNER
  readonly substrateSchemaOwner: typeof LIVING_PROCESS_SUBSTRATE_OWNER
  readonly operationalStatusOwner: typeof OPERATIONAL_STATUS_REGISTRY_OWNER
}

export interface EntityEncounterPacketProvenance {
  readonly authoredSourceRef: string
  readonly actorRef: string
  readonly substrateProfileRef?: string
  readonly operationalStatusRefs: readonly string[]
  readonly owners: EntityEncounterPacketOwnerReferences
}

export interface EntityEncounterPacketRecord {
  readonly id: string
  readonly label: string
  readonly mobilityBand: EncounterMobilityBand
  readonly moraleThreshold: number
  readonly senseChannels: readonly EncounterSenseChannel[]
  readonly protectionProfile: readonly EncounterProtectionEntry[]
  readonly immunityProfile: readonly EncounterProtectionChannel[]
  readonly weaknessProfile: readonly EncounterProtectionChannel[]
  readonly actions: readonly EncounterActionOption[]
  readonly rechargeActions: readonly EncounterRechargeAction[]
  readonly passiveTraits: readonly EncounterPassiveTrait[]
  readonly provenance: EntityEncounterPacketProvenance
}

export interface EntityEncounterPacketRegistry {
  readonly entries: readonly EntityEncounterPacketRecord[]
}

export interface EntityEncounterPacketProjection {
  readonly id: string
  readonly label: string
  readonly mobilityBand: EncounterMobilityBand
  readonly moraleThreshold: number
  readonly senseChannels: readonly EncounterSenseChannel[]
  readonly protectionProfile: readonly EncounterProtectionEntry[]
  readonly immunityProfile: readonly EncounterProtectionChannel[]
  readonly weaknessProfile: readonly EncounterProtectionChannel[]
  readonly actions: readonly EncounterActionOption[]
  readonly rechargeActions: readonly EncounterRechargeAction[]
  readonly passiveTraits: readonly EncounterPassiveTrait[]
  readonly authoredSourceRef: string
  readonly actorRef: string
  readonly substrateProfileRef: string | null
  readonly operationalStatusRefs: readonly string[]
  readonly owner: typeof ENTITY_ENCOUNTER_PACKET_OWNER
  readonly actorTaxonomyOwner: typeof ACTOR_TAXONOMY_OWNER
  readonly substrateSchemaOwner: typeof LIVING_PROCESS_SUBSTRATE_OWNER
  readonly operationalStatusOwner: typeof OPERATIONAL_STATUS_REGISTRY_OWNER
}

export type EntityEncounterPacketValidationCode =
  | 'invalid_record'
  | 'invalid_registry'
  | 'missing_id'
  | 'missing_label'
  | 'untrimmed_reference'
  | 'duplicate_id'
  | 'invalid_mobility_band'
  | 'invalid_morale_threshold'
  | 'invalid_sense_channel'
  | 'duplicate_sense_channel'
  | 'invalid_protection_profile'
  | 'duplicate_protection_channel'
  | 'invalid_immunity_profile'
  | 'duplicate_immunity_channel'
  | 'invalid_weakness_profile'
  | 'duplicate_weakness_channel'
  | 'contradictory_resistance_profile'
  | 'invalid_action'
  | 'duplicate_action_id'
  | 'invalid_recharge_definition'
  | 'missing_recharge_action'
  | 'invalid_passive_trait'
  | 'duplicate_passive_trait_id'
  | 'invalid_provenance'
  | 'invalid_owner_references'

export interface EntityEncounterPacketValidationIssue {
  readonly code: EntityEncounterPacketValidationCode
  readonly detail: string
}

export interface EntityEncounterPacketValidationResult {
  readonly valid: boolean
  readonly issues: readonly EntityEncounterPacketValidationIssue[]
}

export const ENTITY_ENCOUNTER_PACKET_OWNER_REFERENCES: EntityEncounterPacketOwnerReferences =
  Object.freeze({
    actorTaxonomyOwner: ACTOR_TAXONOMY_OWNER,
    substrateSchemaOwner: LIVING_PROCESS_SUBSTRATE_OWNER,
    operationalStatusOwner: OPERATIONAL_STATUS_REGISTRY_OWNER,
  })

const MOBILITY_BAND_SET = new Set<string>(ENCOUNTER_MOBILITY_BANDS)
const SENSE_CHANNEL_SET = new Set<string>(ENCOUNTER_SENSE_CHANNELS)
const PROTECTION_CHANNEL_SET = new Set<string>(ENCOUNTER_PROTECTION_CHANNELS)
const PROTECTION_RATING_SET = new Set<string>(ENCOUNTER_PROTECTION_RATINGS)
const ACTION_DELIVERY_SET = new Set<string>(ENCOUNTER_ACTION_DELIVERIES)

const PACKET_ID_PATTERN = /^entity-encounter-packet:[a-z0-9]+(?:-[a-z0-9]+)*$/
const ACTION_ID_PATTERN = /^encounter-action:[a-z0-9]+(?:-[a-z0-9]+)*$/
const OUTCOME_REF_PATTERN = /^outcome:[a-z0-9]+(?:-[a-z0-9]+)*$/
const TRAIT_ID_PATTERN = /^encounter-trait:[a-z0-9]+(?:-[a-z0-9]+)*$/
const EFFECT_REF_PATTERN = /^effect:[a-z0-9]+(?:-[a-z0-9]+)*$/
const SOURCE_REF_PATTERN = /^authored-source:[a-z0-9]+(?:-[a-z0-9]+)*$/
const ACTOR_REF_PATTERN = /^actor:[a-z0-9]+(?:-[a-z0-9]+)*$/
const SUBSTRATE_REF_PATTERN = /^substrate-profile:[a-z0-9]+(?:-[a-z0-9]+)*$/
const STATUS_REF_PATTERN = /^operational-status:[a-z0-9]+(?::[a-z0-9]+(?:-[a-z0-9]+)*)+$/
const RESET_STATE_REF_PATTERN = /^state:[a-z0-9]+(?:-[a-z0-9]+)*$/

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function addIssue(
  issues: EntityEncounterPacketValidationIssue[],
  code: EntityEncounterPacketValidationCode,
  detail: string
): void {
  issues.push({ code, detail })
}

function isTrimmedMatch(value: unknown, pattern: RegExp): value is string {
  return typeof value === 'string' && value === value.trim() && pattern.test(value)
}

function validateIdentity(
  record: Record<string, unknown>,
  issues: EntityEncounterPacketValidationIssue[]
): string {
  const id = typeof record.id === 'string' ? record.id : ''
  if (!id.trim()) {
    addIssue(issues, 'missing_id', 'Entity encounter packet id is required.')
  } else {
    if (id !== id.trim()) {
      addIssue(issues, 'untrimmed_reference', 'Entity encounter packet id must be trimmed.')
    }
    if (!PACKET_ID_PATTERN.test(id.trim())) {
      addIssue(issues, 'missing_id', 'Entity encounter packet id must use its canonical namespace.')
    }
  }

  if (typeof record.label !== 'string' || !record.label.trim()) {
    addIssue(issues, 'missing_label', `Entity encounter packet ${id || '(unknown)'} needs a label.`)
  } else if (record.label !== record.label.trim()) {
    addIssue(issues, 'untrimmed_reference', `Entity encounter packet ${id} label must be trimmed.`)
  }
  return id.trim()
}

function validateMobilityMoraleAndSenses(
  record: Record<string, unknown>,
  id: string,
  issues: EntityEncounterPacketValidationIssue[]
): void {
  if (typeof record.mobilityBand !== 'string' || !MOBILITY_BAND_SET.has(record.mobilityBand)) {
    addIssue(
      issues,
      'invalid_mobility_band',
      `Entity encounter packet ${id} has an invalid mobility band.`
    )
  }
  if (
    !Number.isInteger(record.moraleThreshold) ||
    Number(record.moraleThreshold) < 0 ||
    Number(record.moraleThreshold) > 100
  ) {
    addIssue(
      issues,
      'invalid_morale_threshold',
      `Entity encounter packet ${id} morale threshold must be an integer from 0 through 100.`
    )
  }

  if (!Array.isArray(record.senseChannels)) {
    addIssue(
      issues,
      'invalid_sense_channel',
      `Entity encounter packet ${id} sense channels must be an array.`
    )
    return
  }
  const seen = new Set<string>()
  for (const channel of record.senseChannels) {
    if (typeof channel !== 'string' || !SENSE_CHANNEL_SET.has(channel)) {
      addIssue(
        issues,
        'invalid_sense_channel',
        `Entity encounter packet ${id} has an invalid sense channel.`
      )
      continue
    }
    if (seen.has(channel)) {
      addIssue(
        issues,
        'duplicate_sense_channel',
        `Entity encounter packet ${id} repeats sense channel ${channel}.`
      )
    }
    seen.add(channel)
  }
}

function validateProtectionEntries(
  value: unknown,
  id: string,
  issues: EntityEncounterPacketValidationIssue[]
): void {
  if (!Array.isArray(value)) {
    addIssue(
      issues,
      'invalid_protection_profile',
      `Entity encounter packet ${id} protection profile must be an array.`
    )
    return
  }
  const seen = new Set<string>()
  for (const entry of value) {
    if (!isObject(entry)) {
      addIssue(
        issues,
        'invalid_protection_profile',
        `Entity encounter packet ${id} has an invalid protection entry.`
      )
      continue
    }

    const channel = typeof entry.channel === 'string' ? entry.channel : null
    const validChannel = channel !== null && PROTECTION_CHANNEL_SET.has(channel)
    const validRating = typeof entry.rating === 'string' && PROTECTION_RATING_SET.has(entry.rating)
    if (!validChannel || !validRating) {
      addIssue(
        issues,
        'invalid_protection_profile',
        `Entity encounter packet ${id} has an invalid protection entry.`
      )
    }

    if (validChannel && seen.has(channel)) {
      addIssue(
        issues,
        'duplicate_protection_channel',
        `Entity encounter packet ${id} repeats protection channel ${entry.channel}.`
      )
    }
    if (validChannel) seen.add(channel)
  }
}

function validateResistanceChannels(
  record: Record<string, unknown>,
  id: string,
  issues: EntityEncounterPacketValidationIssue[]
): void {
  const immunity = validateChannelList(record.immunityProfile, 'immunity', id, issues)
  const weakness = validateChannelList(record.weaknessProfile, 'weakness', id, issues)
  for (const channel of immunity) {
    if (weakness.has(channel)) {
      addIssue(
        issues,
        'contradictory_resistance_profile',
        `Entity encounter packet ${id} cannot be immune and weak to ${channel}.`
      )
    }
  }
}

function validateChannelList(
  value: unknown,
  kind: 'immunity' | 'weakness',
  id: string,
  issues: EntityEncounterPacketValidationIssue[]
): Set<string> {
  const code = kind === 'immunity' ? 'invalid_immunity_profile' : 'invalid_weakness_profile'
  const duplicateCode =
    kind === 'immunity' ? 'duplicate_immunity_channel' : 'duplicate_weakness_channel'
  const valid = new Set<string>()
  if (!Array.isArray(value)) {
    addIssue(issues, code, `Entity encounter packet ${id} ${kind} profile must be an array.`)
    return valid
  }
  for (const channel of value) {
    if (typeof channel !== 'string' || !PROTECTION_CHANNEL_SET.has(channel)) {
      addIssue(issues, code, `Entity encounter packet ${id} has an invalid ${kind} channel.`)
      continue
    }
    if (valid.has(channel)) {
      addIssue(issues, duplicateCode, `Entity encounter packet ${id} repeats ${kind} ${channel}.`)
      continue
    }
    valid.add(channel)
  }
  return valid
}

function validateActions(
  value: unknown,
  id: string,
  issues: EntityEncounterPacketValidationIssue[]
): Set<string> {
  const actionIds = new Set<string>()
  const seenActionIds = new Set<string>()
  if (!Array.isArray(value)) {
    addIssue(issues, 'invalid_action', `Entity encounter packet ${id} actions must be an array.`)
    return actionIds
  }
  for (const action of value) {
    if (!isObject(action)) {
      addIssue(
        issues,
        'invalid_action',
        `Entity encounter packet ${id} contains a malformed action.`
      )
      continue
    }
    const actionId = typeof action.id === 'string' ? action.id.trim() : ''
    const valid =
      isTrimmedMatch(action.id, ACTION_ID_PATTERN) &&
      typeof action.label === 'string' &&
      action.label === action.label.trim() &&
      Boolean(action.label) &&
      typeof action.delivery === 'string' &&
      ACTION_DELIVERY_SET.has(action.delivery) &&
      Array.isArray(action.outcomeRefs) &&
      action.outcomeRefs.length > 0 &&
      action.outcomeRefs.every((ref) => isTrimmedMatch(ref, OUTCOME_REF_PATTERN)) &&
      new Set(action.outcomeRefs).size === action.outcomeRefs.length
    if (!valid) {
      addIssue(
        issues,
        'invalid_action',
        `Entity encounter packet ${id} contains an invalid action ${actionId || '(unknown)'}.`
      )
    }
    if (actionId && seenActionIds.has(actionId)) {
      addIssue(
        issues,
        'duplicate_action_id',
        `Entity encounter packet ${id} repeats action ${actionId}.`
      )
    }
    if (actionId) seenActionIds.add(actionId)
    if (valid && actionId) actionIds.add(actionId)
  }
  return actionIds
}

function validateRechargeActions(
  value: unknown,
  actionIds: ReadonlySet<string>,
  id: string,
  issues: EntityEncounterPacketValidationIssue[]
): void {
  if (!Array.isArray(value)) {
    addIssue(
      issues,
      'invalid_recharge_definition',
      `Entity encounter packet ${id} recharge actions must be an array.`
    )
    return
  }
  const seen = new Set<string>()
  for (const entry of value) {
    if (!isObject(entry) || !isTrimmedMatch(entry.actionRef, ACTION_ID_PATTERN)) {
      addIssue(
        issues,
        'invalid_recharge_definition',
        `Entity encounter packet ${id} has a malformed recharge action.`
      )
      continue
    }
    if (!actionIds.has(entry.actionRef)) {
      addIssue(
        issues,
        'missing_recharge_action',
        `Entity encounter packet ${id} recharge references unknown action ${entry.actionRef}.`
      )
    }
    if (seen.has(entry.actionRef)) {
      addIssue(
        issues,
        'invalid_recharge_definition',
        `Entity encounter packet ${id} repeats recharge action ${entry.actionRef}.`
      )
    }
    seen.add(entry.actionRef)

    if (!isObject(entry.recharge)) {
      addIssue(
        issues,
        'invalid_recharge_definition',
        `Entity encounter packet ${id} recharge definition is required.`
      )
      continue
    }
    const mode = entry.recharge.mode
    const validInterval =
      mode === 'recovery_interval' &&
      Number.isSafeInteger(entry.recharge.recoverySteps) &&
      Number(entry.recharge.recoverySteps) >= 1 &&
      entry.recharge.resetStateRef === undefined
    const validReset =
      mode === 'state_reset' &&
      isTrimmedMatch(entry.recharge.resetStateRef, RESET_STATE_REF_PATTERN) &&
      entry.recharge.recoverySteps === undefined
    if (!validInterval && !validReset) {
      addIssue(
        issues,
        'invalid_recharge_definition',
        `Entity encounter packet ${id} has an invalid recharge definition.`
      )
    }
  }
}

function validatePassiveTraits(
  value: unknown,
  id: string,
  issues: EntityEncounterPacketValidationIssue[]
): void {
  if (!Array.isArray(value)) {
    addIssue(
      issues,
      'invalid_passive_trait',
      `Entity encounter packet ${id} passive traits must be an array.`
    )
    return
  }
  const seen = new Set<string>()
  for (const trait of value) {
    const traitId = isObject(trait) && typeof trait.id === 'string' ? trait.id.trim() : ''
    const valid =
      isObject(trait) &&
      isTrimmedMatch(trait.id, TRAIT_ID_PATTERN) &&
      typeof trait.label === 'string' &&
      trait.label === trait.label.trim() &&
      Boolean(trait.label) &&
      isTrimmedMatch(trait.effectRef, EFFECT_REF_PATTERN)
    if (!valid) {
      addIssue(
        issues,
        'invalid_passive_trait',
        `Entity encounter packet ${id} has an invalid passive trait.`
      )
    }
    if (traitId && seen.has(traitId)) {
      addIssue(
        issues,
        'duplicate_passive_trait_id',
        `Entity encounter packet ${id} repeats passive trait ${traitId}.`
      )
    }
    if (traitId) seen.add(traitId)
  }
}

function validateProvenance(
  value: unknown,
  id: string,
  issues: EntityEncounterPacketValidationIssue[]
): void {
  if (!isObject(value)) {
    addIssue(issues, 'invalid_provenance', `Entity encounter packet ${id} provenance is required.`)
    return
  }
  const statusRefsValid =
    Array.isArray(value.operationalStatusRefs) &&
    value.operationalStatusRefs.every((ref) => isTrimmedMatch(ref, STATUS_REF_PATTERN)) &&
    new Set(value.operationalStatusRefs).size === value.operationalStatusRefs.length
  if (
    !isTrimmedMatch(value.authoredSourceRef, SOURCE_REF_PATTERN) ||
    !isTrimmedMatch(value.actorRef, ACTOR_REF_PATTERN) ||
    (value.substrateProfileRef !== undefined &&
      !isTrimmedMatch(value.substrateProfileRef, SUBSTRATE_REF_PATTERN)) ||
    !statusRefsValid
  ) {
    addIssue(
      issues,
      'invalid_provenance',
      `Entity encounter packet ${id} has invalid provenance references.`
    )
  }
  if (
    !isObject(value.owners) ||
    value.owners.actorTaxonomyOwner !== ACTOR_TAXONOMY_OWNER ||
    value.owners.substrateSchemaOwner !== LIVING_PROCESS_SUBSTRATE_OWNER ||
    value.owners.operationalStatusOwner !== OPERATIONAL_STATUS_REGISTRY_OWNER
  ) {
    addIssue(
      issues,
      'invalid_owner_references',
      `Entity encounter packet ${id} must preserve adjacent owner references.`
    )
  }
}

export function validateEntityEncounterPacketRecord(
  record: EntityEncounterPacketRecord
): EntityEncounterPacketValidationResult {
  if (!isObject(record)) {
    return {
      valid: false,
      issues: [{ code: 'invalid_record', detail: 'Entity encounter packet record is required.' }],
    }
  }
  const issues: EntityEncounterPacketValidationIssue[] = []
  const id = validateIdentity(record, issues)
  validateMobilityMoraleAndSenses(record, id, issues)
  validateProtectionEntries(record.protectionProfile, id, issues)
  validateResistanceChannels(record, id, issues)
  const actionIds = validateActions(record.actions, id, issues)
  validateRechargeActions(record.rechargeActions, actionIds, id, issues)
  validatePassiveTraits(record.passiveTraits, id, issues)
  validateProvenance(record.provenance, id, issues)
  return { valid: issues.length === 0, issues: Object.freeze(issues) }
}

export function validateEntityEncounterPacketRegistry(
  registry: EntityEncounterPacketRegistry
): EntityEncounterPacketValidationResult {
  if (!isObject(registry) || !Array.isArray(registry.entries)) {
    return {
      valid: false,
      issues: [
        {
          code: 'invalid_registry',
          detail: 'Entity encounter packet registry entries are required.',
        },
      ],
    }
  }
  const issues: EntityEncounterPacketValidationIssue[] = []
  const seen = new Set<string>()
  for (const entry of registry.entries) {
    issues.push(...validateEntityEncounterPacketRecord(entry).issues)
    if (typeof entry?.id !== 'string' || !entry.id.trim()) continue
    const id = entry.id.trim()
    if (seen.has(id)) {
      addIssue(issues, 'duplicate_id', `Entity encounter packet registry repeats id ${id}.`)
    }
    seen.add(id)
  }
  return { valid: issues.length === 0, issues: Object.freeze(issues) }
}

function assertValidRecord(record: EntityEncounterPacketRecord): void {
  const validation = validateEntityEncounterPacketRecord(record)
  if (!validation.valid) {
    throw new Error(
      `invalid entity encounter packet: ${validation.issues.map((issue) => issue.code).join(', ')}`
    )
  }
}

function freezeProtectionProfile(
  profile: readonly EncounterProtectionEntry[]
): readonly EncounterProtectionEntry[] {
  return Object.freeze(profile.map(({ channel, rating }) => Object.freeze({ channel, rating })))
}

function freezeActions(
  actions: readonly EncounterActionOption[]
): readonly EncounterActionOption[] {
  return Object.freeze(
    actions.map(({ id, label, delivery, outcomeRefs }) =>
      Object.freeze({ id, label, delivery, outcomeRefs: Object.freeze([...outcomeRefs]) })
    )
  )
}

function freezeRechargeDefinition(
  recharge: EncounterRechargeDefinition
): EncounterRechargeDefinition {
  return recharge.mode === 'recovery_interval'
    ? Object.freeze({ mode: recharge.mode, recoverySteps: recharge.recoverySteps })
    : Object.freeze({ mode: recharge.mode, resetStateRef: recharge.resetStateRef })
}

function freezeRechargeActions(
  actions: readonly EncounterRechargeAction[]
): readonly EncounterRechargeAction[] {
  return Object.freeze(
    actions.map(({ actionRef, recharge }) =>
      Object.freeze({ actionRef, recharge: freezeRechargeDefinition(recharge) })
    )
  )
}

function freezePassiveTraits(
  traits: readonly EncounterPassiveTrait[]
): readonly EncounterPassiveTrait[] {
  return Object.freeze(
    traits.map(({ id, label, effectRef }) => Object.freeze({ id, label, effectRef }))
  )
}

function definePacket(input: EntityEncounterPacketRecord): EntityEncounterPacketRecord {
  const packet: EntityEncounterPacketRecord = Object.freeze({
    ...input,
    senseChannels: Object.freeze([...input.senseChannels]),
    protectionProfile: freezeProtectionProfile(input.protectionProfile),
    immunityProfile: Object.freeze([...input.immunityProfile]),
    weaknessProfile: Object.freeze([...input.weaknessProfile]),
    actions: freezeActions(input.actions),
    rechargeActions: freezeRechargeActions(input.rechargeActions),
    passiveTraits: freezePassiveTraits(input.passiveTraits),
    provenance: Object.freeze({
      ...input.provenance,
      operationalStatusRefs: Object.freeze([...input.provenance.operationalStatusRefs]),
      owners: ENTITY_ENCOUNTER_PACKET_OWNER_REFERENCES,
    }),
  })
  assertValidRecord(packet)
  return packet
}

function projectValidatedRecord(
  record: EntityEncounterPacketRecord
): EntityEncounterPacketProjection {
  return Object.freeze({
    id: record.id,
    label: record.label,
    mobilityBand: record.mobilityBand,
    moraleThreshold: record.moraleThreshold,
    senseChannels: Object.freeze([...record.senseChannels]),
    protectionProfile: freezeProtectionProfile(record.protectionProfile),
    immunityProfile: Object.freeze([...record.immunityProfile]),
    weaknessProfile: Object.freeze([...record.weaknessProfile]),
    actions: freezeActions(record.actions),
    rechargeActions: freezeRechargeActions(record.rechargeActions),
    passiveTraits: freezePassiveTraits(record.passiveTraits),
    authoredSourceRef: record.provenance.authoredSourceRef,
    actorRef: record.provenance.actorRef,
    substrateProfileRef: record.provenance.substrateProfileRef ?? null,
    operationalStatusRefs: Object.freeze([...record.provenance.operationalStatusRefs]),
    owner: ENTITY_ENCOUNTER_PACKET_OWNER,
    actorTaxonomyOwner: record.provenance.owners.actorTaxonomyOwner,
    substrateSchemaOwner: record.provenance.owners.substrateSchemaOwner,
    operationalStatusOwner: record.provenance.owners.operationalStatusOwner,
  })
}

export function projectEntityEncounterPacketRecord(
  record: EntityEncounterPacketRecord
): EntityEncounterPacketProjection {
  assertValidRecord(record)
  return projectValidatedRecord(record)
}

export function projectEntityEncounterPacketRegistry(
  registry: EntityEncounterPacketRegistry
): readonly EntityEncounterPacketProjection[] {
  const validation = validateEntityEncounterPacketRegistry(registry)
  if (!validation.valid) {
    throw new Error(
      `invalid entity encounter packet registry: ${validation.issues.map((issue) => issue.code).join(', ')}`
    )
  }
  return Object.freeze(registry.entries.map((entry) => projectValidatedRecord(entry)))
}

export const DEFAULT_ENTITY_ENCOUNTER_PACKET_REGISTRY: EntityEncounterPacketRegistry =
  Object.freeze({
    entries: Object.freeze([
      definePacket({
        id: 'entity-encounter-packet:archive-signal-entity',
        label: 'Archive signal entity',
        mobilityBand: 'rapid',
        moraleThreshold: 35,
        senseChannels: ['auditory', 'extrasensory'],
        protectionProfile: [
          { channel: 'physical', rating: 'exposed' },
          { channel: 'ritual', rating: 'reinforced' },
        ],
        immunityProfile: ['chemical'],
        weaknessProfile: ['informational'],
        actions: [
          {
            id: 'encounter-action:attention-disruption-signal',
            label: 'Attention disruption signal',
            delivery: 'area',
            outcomeRefs: ['outcome:attention-disrupted'],
          },
          {
            id: 'encounter-action:memory-echo',
            label: 'Memory echo',
            delivery: 'distant',
            outcomeRefs: ['outcome:recall-confidence-reduced'],
          },
        ],
        rechargeActions: [
          {
            actionRef: 'encounter-action:memory-echo',
            recharge: { mode: 'recovery_interval', recoverySteps: 3 },
          },
        ],
        passiveTraits: [
          {
            id: 'encounter-trait:archive-resonance',
            label: 'Archive resonance',
            effectRef: 'effect:recorded-voice-amplification',
          },
        ],
        provenance: {
          authoredSourceRef: 'authored-source:archive-annex-encounter',
          actorRef: 'actor:archive-signal-entity',
          substrateProfileRef: 'substrate-profile:ritual-echo',
          operationalStatusRefs: ['operational-status:memory:recall-confidence-reduced'],
          owners: ENTITY_ENCOUNTER_PACKET_OWNER_REFERENCES,
        },
      }),
    ]),
  })

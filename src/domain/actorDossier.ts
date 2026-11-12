/** SPE-2095: institutional records only; no simulation, persistence or access grants. */
export const ACTOR_DOSSIER_ROLES = Object.freeze([
  'staff',
  'field-operative',
  'former-personnel',
  'person-of-interest',
  'external',
  'contained-person',
  'artificial-system',
  'disputed-identity',
] as const)
export type ActorDossierRole = (typeof ACTOR_DOSSIER_ROLES)[number]

export interface DossierAccess {
  readonly minimumClearance: number
  readonly needToKnow: readonly string[]
}
export interface DossierViewer {
  readonly clearance: number
  readonly needToKnow: readonly string[]
}
export interface DossierField<T> {
  readonly value: T
  readonly access?: DossierAccess
  readonly confidence: 'confirmed' | 'supported' | 'uncertain' | 'unknown'
  readonly provenance: readonly string[]
}
export type DossierProjectedField<T> =
  | { readonly state: 'redacted' }
  | { readonly state: 'unavailable' }
  | {
      readonly state: 'known' | 'estimated'
      readonly value: T
      readonly confidence: DossierField<T>['confidence']
      readonly provenance: readonly string[]
    }

/** Already derived by an operational/contribution owner; never inferred from a roster. */
export interface DossierCareerRecord {
  readonly label: string
  readonly subjectRef: string
  readonly eventRef: string
  readonly contributionRef: string
}
export interface DossierSharedReference {
  readonly releaseRef: string
  readonly relationRevisionRef: string
  readonly relation: string
  readonly subjectRef: string
}
export interface DossierPersonaReference {
  readonly personaRef: string
  readonly displayIdentity: string
  readonly lifecycle: string
}

export interface ActorDossierValues {
  displayName: string
  aliases: readonly string[]
  roleCategory: ActorDossierRole
  personnelStatus: string
  affiliationRef: string
  clearanceCeiling: number
  currentAssignment: string
  anomalyConditionTags: readonly string[]
  careerRecord: DossierCareerRecord
  sharedReferences: readonly DossierSharedReference[]
  personaReferences: readonly DossierPersonaReference[]
}
export type ActorDossierFields = {
  readonly [K in keyof ActorDossierValues]?: DossierField<ActorDossierValues[K]>
}
export interface ActorDossierSnapshot {
  readonly week: number
  readonly recordPatch: ActorDossierFields
  readonly reasonCode: string
  /** Protects existence, date and reason as well as the individually gated patch. */
  readonly access: DossierAccess
}
export interface ActorDossierRecord {
  /** Caller must already authorize disclosure of this record's existence and canonical ID. */
  readonly actorId: string
  readonly fields: ActorDossierFields
  readonly snapshots: readonly ActorDossierSnapshot[]
  readonly annotation?: DossierField<{ readonly authorship: 'player'; readonly text: string }>
}
export type ActorDossierProjectedFields = {
  readonly [K in keyof ActorDossierValues]: DossierProjectedField<ActorDossierValues[K]>
}
export interface ActorDossierProjection {
  readonly actorId: string
  readonly fields: ActorDossierProjectedFields
  readonly snapshots: readonly {
    readonly week: number
    readonly reasonCode: string
    readonly fields: ActorDossierProjectedFields
  }[]
  readonly annotation?: DossierProjectedField<{
    readonly authorship: 'player'
    readonly text: string
  }>
}

const compareText = (a: string, b: string): number => {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}
const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown, limit = 320): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= limit
const strings = (value: unknown, count = 32, limit = 320): value is string[] =>
  Array.isArray(value) &&
  value.length <= count &&
  Array.from(value).every((entry) => text(entry, limit))
const sorted = (values: readonly string[]) => Object.freeze([...new Set(values)].sort(compareText))
const confidenceValues = new Set(['confirmed', 'supported', 'uncertain', 'unknown'])
const roles = new Set<string>(ACTOR_DOSSIER_ROLES)

function canRead(access: DossierAccess | undefined, viewer: DossierViewer): boolean {
  if (
    !access ||
    !Number.isSafeInteger(access.minimumClearance) ||
    access.minimumClearance < 0 ||
    !strings(access.needToKnow)
  )
    return false
  if (
    !Number.isSafeInteger(viewer.clearance) ||
    viewer.clearance < access.minimumClearance ||
    !strings(viewer.needToKnow, Number.MAX_SAFE_INTEGER)
  )
    return false
  const grants = new Set(viewer.needToKnow)
  return access.needToKnow.every((grant) => grants.has(grant))
}

function projectField<T>(
  field: DossierField<T> | undefined,
  viewer: DossierViewer,
  copy: (value: T) => T | undefined
): DossierProjectedField<T> {
  if (!field) return Object.freeze({ state: 'unavailable' })
  if (!canRead(field.access, viewer)) return Object.freeze({ state: 'redacted' })
  if (
    !confidenceValues.has(field.confidence) ||
    field.confidence === 'unknown' ||
    !strings(field.provenance, 32, 512)
  )
    return Object.freeze({ state: 'unavailable' })
  const value = copy(field.value)
  if (value === undefined) return Object.freeze({ state: 'unavailable' })
  return Object.freeze({
    state: field.confidence === 'confirmed' ? 'known' : 'estimated',
    value,
    confidence: field.confidence,
    provenance: sorted(field.provenance),
  })
}
const copyText = (value: string) => (text(value) ? value : undefined)
const copyStrings = (value: readonly string[]) => (strings(value) ? sorted(value) : undefined)
const copyClearance = (value: number) =>
  Number.isSafeInteger(value) && value >= 0 ? value : undefined
const copyRole = (value: ActorDossierRole) => (roles.has(value) ? value : undefined)

function copyCareer(value: DossierCareerRecord): DossierCareerRecord | undefined {
  if (
    !isObject(value) ||
    !text(value.label) ||
    !text(value.subjectRef) ||
    !text(value.eventRef) ||
    !text(value.contributionRef)
  )
    return undefined
  return Object.freeze({
    label: value.label,
    subjectRef: value.subjectRef,
    eventRef: value.eventRef,
    contributionRef: value.contributionRef,
  })
}
function copyShared(
  values: readonly DossierSharedReference[]
): readonly DossierSharedReference[] | undefined {
  if (!Array.isArray(values) || values.length > 32) return undefined
  const result: DossierSharedReference[] = []
  for (const value of values) {
    if (
      !isObject(value) ||
      !text(value.releaseRef) ||
      !text(value.relationRevisionRef) ||
      !text(value.relation) ||
      !text(value.subjectRef)
    )
      return undefined
    result.push(
      Object.freeze({
        releaseRef: value.releaseRef,
        relationRevisionRef: value.relationRevisionRef,
        relation: value.relation,
        subjectRef: value.subjectRef,
      })
    )
  }
  return Object.freeze(result.sort((a, b) => compareText(JSON.stringify(a), JSON.stringify(b))))
}
function copyPersonas(
  values: readonly DossierPersonaReference[]
): readonly DossierPersonaReference[] | undefined {
  if (!Array.isArray(values) || values.length > 32) return undefined
  const result: DossierPersonaReference[] = []
  for (const value of values) {
    if (
      !isObject(value) ||
      !text(value.personaRef) ||
      !text(value.displayIdentity) ||
      !text(value.lifecycle)
    )
      return undefined
    result.push(
      Object.freeze({
        personaRef: value.personaRef,
        displayIdentity: value.displayIdentity,
        lifecycle: value.lifecycle,
      })
    )
  }
  return Object.freeze(result.sort((a, b) => compareText(JSON.stringify(a), JSON.stringify(b))))
}

function projectFields(
  fields: ActorDossierFields,
  viewer: DossierViewer
): ActorDossierProjectedFields {
  const career = fields.careerRecord
  return Object.freeze({
    displayName: projectField(fields.displayName, viewer, copyText),
    aliases: projectField(fields.aliases, viewer, copyStrings),
    roleCategory: projectField(fields.roleCategory, viewer, copyRole),
    personnelStatus: projectField(fields.personnelStatus, viewer, copyText),
    affiliationRef: projectField(fields.affiliationRef, viewer, copyText),
    clearanceCeiling: projectField(fields.clearanceCeiling, viewer, copyClearance),
    currentAssignment: projectField(fields.currentAssignment, viewer, copyText),
    anomalyConditionTags: projectField(fields.anomalyConditionTags, viewer, copyStrings),
    careerRecord: projectField(career, viewer, (value) =>
      career?.provenance.length ? copyCareer(value) : undefined
    ),
    sharedReferences: projectField(fields.sharedReferences, viewer, copyShared),
    personaReferences: projectField(fields.personaReferences, viewer, copyPersonas),
  })
}
function copyAnnotation(value: { readonly authorship: 'player'; readonly text: string }) {
  if (!isObject(value) || value.authorship !== 'player' || !text(value.text, 1600)) return undefined
  return Object.freeze({ authorship: 'player' as const, text: value.text })
}

/** Projects supplied facts only. Historical patches never borrow present-day missing fields. */
export function projectActorDossier(
  record: ActorDossierRecord,
  viewer: DossierViewer
): ActorDossierProjection {
  const snapshots = record.snapshots
    .filter((snapshot) => canRead(snapshot.access, viewer))
    .map((snapshot) =>
      Object.freeze({
        week: snapshot.week,
        reasonCode: snapshot.reasonCode,
        fields: projectFields(snapshot.recordPatch, viewer),
      })
    )
  return Object.freeze({
    actorId: record.actorId,
    fields: projectFields(record.fields, viewer),
    snapshots: Object.freeze(snapshots),
    ...(record.annotation === undefined
      ? {}
      : { annotation: projectField(record.annotation, viewer, copyAnnotation) }),
  })
}

/** Append-only history; caller supplies each dated patch, including any initial baseline. */
export function appendActorDossierSnapshot(
  record: ActorDossierRecord,
  snapshot: ActorDossierSnapshot
):
  | { readonly status: 'invalid'; readonly reason: 'snapshot-invalid' | 'history-order' }
  | { readonly status: 'appended'; readonly record: ActorDossierRecord } {
  if (
    !Number.isSafeInteger(snapshot.week) ||
    snapshot.week < 0 ||
    !text(snapshot.reasonCode) ||
    !isObject(snapshot.recordPatch)
  )
    return { status: 'invalid', reason: 'snapshot-invalid' }
  if (record.snapshots.some((prior) => prior.week > snapshot.week))
    return { status: 'invalid', reason: 'history-order' }
  const next = structuredClone({
    ...record,
    fields: { ...record.fields, ...snapshot.recordPatch },
    snapshots: [...record.snapshots, snapshot],
  })
  return Object.freeze({ status: 'appended', record: freezeRecord(next) })
}
function freezeRecord<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeRecord(child)
    Object.freeze(value)
  }
  return value
}

/** Sparse legacy input stays sparse. Missing identity returns null, never a fabricated actor. */
export function buildActorDossierFromAgent(
  agent: unknown,
  access?: DossierAccess
): ActorDossierRecord | null {
  if (!isObject(agent) || !text(agent.id)) return null
  const identity = isObject(agent.identity) ? agent.identity : {}
  const field = <T>(value: T, source: string): DossierField<T> => ({
    value,
    ...(access ? { access } : {}),
    confidence: 'confirmed',
    provenance: [`Agent:${agent.id}:${source}`],
  })
  const fields: { -readonly [K in keyof ActorDossierFields]: ActorDossierFields[K] } = {}
  const name = text(identity.name) ? identity.name : agent.name
  if (text(name)) fields.displayName = field(name, 'name')
  const aliases = [identity.codename, identity.callsign].filter((value): value is string =>
    text(value)
  )
  if (aliases.length) fields.aliases = field(sorted(aliases), 'identity')
  fields.roleCategory = field(
    agent.status === 'resigned' ? 'former-personnel' : 'field-operative',
    'record-type'
  )
  if (text(agent.status))
    fields.personnelStatus = field(agent.status === 'resigned' ? 'former' : agent.status, 'status')
  if (isObject(agent.assignment) && text(agent.assignment.state))
    fields.currentAssignment = field(agent.assignment.state, 'assignment.state')
  return freezeRecord(structuredClone({ actorId: agent.id, fields, snapshots: [] }))
}

function visibleNames(fields: ActorDossierProjectedFields): readonly string[] {
  const names: string[] = []
  if (fields.displayName.state === 'known' || fields.displayName.state === 'estimated')
    names.push(fields.displayName.value)
  if (fields.aliases.state === 'known' || fields.aliases.state === 'estimated')
    names.push(...fields.aliases.value)
  return names
}

/** Only visible names/aliases participate; hidden identities cannot leak through warnings. */
export function findActorDossierAliasCollisions(
  records: readonly ActorDossierRecord[],
  viewer: DossierViewer
): readonly {
  readonly code: 'alias-collision'
  readonly alias: string
  readonly actorIds: readonly string[]
}[] {
  const owners = new Map<string, Set<string>>()
  for (const record of records) {
    for (const alias of visibleNames(projectActorDossier(record, viewer).fields)) {
      const key = alias.trim().normalize('NFC').toLowerCase()
      const ids = owners.get(key) ?? new Set<string>()
      ids.add(record.actorId)
      owners.set(key, ids)
    }
  }
  return Object.freeze(
    [...owners.entries()]
      .filter(([, ids]) => ids.size > 1)
      .sort(([a], [b]) => compareText(a, b))
      .map(([alias, ids]) =>
        Object.freeze({ code: 'alias-collision' as const, alias, actorIds: sorted([...ids]) })
      )
  )
}

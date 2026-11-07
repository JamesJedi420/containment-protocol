import { describe, expect, it } from 'vitest'
import {
  ACTOR_DOSSIER_ROLES,
  appendActorDossierSnapshot,
  buildActorDossierFromAgent,
  findActorDossierAliasCollisions,
  projectActorDossier,
} from '../domain/actorDossier'
import type { ActorDossierRecord, DossierField, DossierAccess } from '../domain/actorDossier'

const publicAccess: DossierAccess = { minimumClearance: 0, needToKnow: [] }
const restricted: DossierAccess = { minimumClearance: 3, needToKnow: ['case-read-in'] }
const low = { clearance: 0, needToKnow: [] }
const high = { clearance: 4, needToKnow: ['case-read-in'] }
const field = <T>(value: T, access = publicAccess): DossierField<T> => ({
  value,
  access,
  confidence: 'confirmed',
  provenance: ['source-record'],
})
const base = (): ActorDossierRecord => ({
  actorId: 'actor-1',
  fields: {
    displayName: field('River'),
    aliases: field(['Rook']),
    roleCategory: field('field-operative'),
    personnelStatus: field('active'),
    clearanceCeiling: field(3, restricted),
  },
  snapshots: [],
})

describe('actor dossier institutional contract', () => {
  it('preserves public and read-in fields as a viewer accumulates grants', () => {
    const grants = Array.from({ length: 40 }, (_, index) => `grant-${index}`)
    const viewer = { clearance: 4, needToKnow: [...grants, 'case-read-in'] }
    expect(projectActorDossier(base(), viewer).fields.displayName).toMatchObject({
      state: 'known',
      value: 'River',
    })
    expect(projectActorDossier(base(), viewer).fields.clearanceCeiling).toMatchObject({
      state: 'known',
      value: 3,
    })
    expect(
      projectActorDossier(base(), { ...viewer, needToKnow: [...grants, ''] }).fields.displayName
    ).toEqual({ state: 'redacted' })
  })

  it('preserves maximum-length Agent IDs in projected provenance', () => {
    const id = 'a'.repeat(320)
    const record = buildActorDossierFromAgent(
      { id, name: 'River', status: 'active', assignment: { state: 'idle' } },
      publicAccess
    )!
    const projected = projectActorDossier(record, low)
    expect(projected.actorId).toBe(id)
    expect(projected.fields.displayName).toMatchObject({
      state: 'known',
      value: 'River',
      provenance: [`Agent:${id}:name`],
    })
    expect(projected.fields.currentAssignment).toMatchObject({
      state: 'known',
      provenance: [`Agent:${id}:assignment.state`],
    })
  })
  it.each(ACTOR_DOSSIER_ROLES)('retains the distinct %s category', (roleCategory) => {
    const result = projectActorDossier(
      { ...base(), fields: { roleCategory: field(roleCategory) } },
      low
    )
    expect(result.fields.roleCategory).toMatchObject({ state: 'known', value: roleCategory })
  })

  it('requires both clearance and need-to-know without hiding public identity', () => {
    const record = base()
    expect(projectActorDossier(record, low).fields.displayName).toMatchObject({ value: 'River' })
    for (const viewer of [
      low,
      { clearance: 4, needToKnow: [] },
      { clearance: 0, needToKnow: ['case-read-in'] },
      { clearance: NaN, needToKnow: ['case-read-in'] },
    ]) {
      expect(projectActorDossier(record, viewer).fields.clearanceCeiling).toEqual({
        state: 'redacted',
      })
    }
    expect(projectActorDossier(record, high).fields.clearanceCeiling).toMatchObject({ value: 3 })
    expect(
      projectActorDossier(
        { ...record, fields: { displayName: { ...field('SECRET'), access: undefined } } },
        high
      ).fields.displayName
    ).toEqual({ state: 'redacted' })
  })

  it('preserves prior role and clearance through append-only former-personnel snapshots', () => {
    const initial = { ...base(), fields: { ...base().fields, currentAssignment: field('idle') } }
    const captured = appendActorDossierSnapshot(initial, {
      week: 2,
      recordPatch: initial.fields,
      reasonCode: 'service-record',
      access: publicAccess,
    })
    if (captured.status !== 'appended') throw new Error('initial snapshot failed')
    const sameWeek = appendActorDossierSnapshot(captured.record, {
      week: 2,
      recordPatch: { currentAssignment: field('training') },
      reasonCode: 'assignment-update',
      access: publicAccess,
    })
    if (sameWeek.status !== 'appended') throw new Error('same-week update rejected')
    expect(
      sameWeek.record.snapshots.map((snapshot) => [snapshot.week, snapshot.reasonCode])
    ).toEqual([
      [2, 'service-record'],
      [2, 'assignment-update'],
    ])
    expect(projectActorDossier(sameWeek.record, high).fields.currentAssignment).toMatchObject({
      value: 'training',
    })
    expect(
      sameWeek.record.snapshots.map((snapshot) => snapshot.recordPatch.currentAssignment?.value)
    ).toEqual(['idle', 'training'])
    const former = appendActorDossierSnapshot(captured.record, {
      week: 5,
      recordPatch: {
        roleCategory: field('former-personnel'),
        personnelStatus: field('former'),
        clearanceCeiling: field(0, restricted),
      },
      reasonCode: 'departure',
      access: publicAccess,
    })
    if (former.status !== 'appended') throw new Error('departure snapshot failed')
    const projected = projectActorDossier(former.record, high)
    expect(projected.fields.personnelStatus).toMatchObject({ value: 'former' })
    expect(projected.snapshots[0].fields.roleCategory).toMatchObject({ value: 'field-operative' })
    expect(projected.snapshots[0].fields.clearanceCeiling).toMatchObject({ value: 3 })
    expect(projected.snapshots[1].fields.displayName).toEqual({ state: 'unavailable' })
    expect(initial.snapshots).toEqual([])
    expect(captured.record.snapshots).toHaveLength(1)
    expect(Object.isFrozen(former.record.snapshots[0].recordPatch)).toBe(true)
    expect(
      appendActorDossierSnapshot(former.record, {
        week: 1,
        recordPatch: {},
        reasonCode: 'backdated',
        access: publicAccess,
      })
    ).toEqual({ status: 'invalid', reason: 'history-order' })
  })

  it('does not leak restricted snapshot existence, reasons, payloads or provenance', () => {
    const record: ActorDossierRecord = {
      ...base(),
      fields: {
        displayName: field('River'),
        currentAssignment: { ...field('SECRET', restricted), provenance: ['SECRET'] },
      },
      snapshots: [
        {
          week: 9,
          reasonCode: 'SECRET',
          recordPatch: { displayName: field('SECRET') },
          access: restricted,
        },
      ],
    }
    const projected = projectActorDossier(record, low)
    expect(projected.snapshots).toEqual([])
    expect(projected.fields.currentAssignment).toEqual({ state: 'redacted' })
    expect(JSON.stringify(projected)).not.toContain('SECRET')
  })

  it('adapts sparse and legacy agents without creating identity, access or career facts', () => {
    for (const agent of [null, undefined, {}, { name: 'No identity' }])
      expect(buildActorDossierFromAgent(agent)).toBeNull()
    const sparse = buildActorDossierFromAgent({ id: 'agent-1' })!
    expect(sparse.actorId).toBe('agent-1')
    expect(projectActorDossier(sparse, high).fields.roleCategory).toEqual({ state: 'redacted' })
    const adapted = buildActorDossierFromAgent(
      {
        id: 'agent-1',
        name: 'Old name',
        identity: { name: 'Current name', callsign: 'Rook' },
        status: 'resigned',
        assignment: { state: 'idle' },
        history: { counters: { kills: 999 } },
      },
      publicAccess
    )!
    expect(projectActorDossier(adapted, low).fields).toMatchObject({
      displayName: { value: 'Current name' },
      roleCategory: { value: 'former-personnel' },
      personnelStatus: { value: 'former' },
      currentAssignment: { value: 'idle' },
      careerRecord: { state: 'unavailable' },
      clearanceCeiling: { state: 'unavailable' },
    })
    expect(adapted.snapshots).toEqual([])
  })

  it('reports deterministic visible alias collisions without merging or exposing hidden aliases', () => {
    const a = base()
    const b = { ...base(), actorId: 'actor-2', fields: { aliases: field(['ROOK']) } }
    const hidden = {
      ...base(),
      actorId: 'secret-actor',
      fields: { aliases: field(['Rook'], restricted) },
    }
    const expected = [{ code: 'alias-collision', alias: 'rook', actorIds: ['actor-1', 'actor-2'] }]
    expect(findActorDossierAliasCollisions([hidden, b, a], low)).toEqual(expected)
    expect(findActorDossierAliasCollisions([a, b], low)).toEqual(expected)
    expect(findActorDossierAliasCollisions([a, hidden], low)).toEqual([])
    expect(a.actorId).toBe('actor-1')
    expect(
      findActorDossierAliasCollisions([a, { ...b, fields: { displayName: field('rook') } }], low)
    ).toEqual(expected)
  })

  it('projects supplied contribution evidence without deriving credit from unrelated state', () => {
    const career = {
      label: 'Strongest confirmed quarry',
      subjectRef: 'quarry-4',
      eventRef: 'event-7',
      contributionRef: 'contribution-2',
    }
    const record = { ...base(), fields: { careerRecord: field(career, restricted) } }
    const projected = projectActorDossier(record, high)
    career.subjectRef = 'later-quarry'
    expect(projected.fields.careerRecord).toMatchObject({
      state: 'known',
      value: { subjectRef: 'quarry-4' },
      provenance: ['source-record'],
    })
    expect(projectActorDossier(record, low).fields.careerRecord).toEqual({ state: 'redacted' })
    expect(
      projectActorDossier(
        { ...record, fields: { careerRecord: { ...field(career), provenance: [] } } },
        high
      ).fields.careerRecord
    ).toEqual({ state: 'unavailable' })
  })

  it('keeps release relationships and personas gated, read-only and separate from identity', () => {
    const record = {
      ...base(),
      fields: {
        ...base().fields,
        sharedReferences: field(
          [
            {
              releaseRef: 'release-2',
              relationRevisionRef: 'revision-4',
              relation: 'parent_of',
              subjectRef: 'relative-3',
            },
          ],
          restricted
        ),
        personaReferences: field(
          [{ personaRef: 'persona-7', displayIdentity: 'Known cover', lifecycle: 'exposed' }],
          restricted
        ),
      },
    }
    expect(projectActorDossier(record, low).fields.sharedReferences).toEqual({ state: 'redacted' })
    expect(projectActorDossier(record, low).fields.personaReferences).toEqual({ state: 'redacted' })
    const projected = projectActorDossier(record, high)
    expect(projected.actorId).toBe('actor-1')
    expect(projected.fields.sharedReferences).toMatchObject({
      value: [{ releaseRef: 'release-2', relationRevisionRef: 'revision-4' }],
    })
    expect(projected.fields.clearanceCeiling).toMatchObject({ value: 3 })
  })

  it('separates bounded player annotations from canonical facts and history', () => {
    const record: ActorDossierRecord = {
      ...base(),
      fields: {
        ...base().fields,
        careerRecord: field({
          label: 'Confirmed record',
          subjectRef: 'quarry-1',
          eventRef: 'event-2',
          contributionRef: 'contribution-3',
        }),
        personaReferences: field([
          { personaRef: 'persona-1', displayIdentity: 'Known cover', lifecycle: 'active' },
        ]),
      },
      snapshots: [
        { week: 1, reasonCode: 'initial', access: publicAccess, recordPatch: base().fields },
      ],
    }
    const first = {
      ...record,
      annotation: field({ authorship: 'player' as const, text: 'Follow up later' }),
    }
    const second = {
      ...record,
      annotation: field({ authorship: 'player' as const, text: 'A different note' }),
    }
    const a = projectActorDossier(first, low)
    const b = projectActorDossier(second, low)
    expect(a.fields).toEqual(b.fields)
    expect(a.snapshots).toEqual(b.snapshots)
    expect(a.annotation).toMatchObject({ value: { authorship: 'player', text: 'Follow up later' } })
    expect(projectActorDossier(record, low).annotation).toBeUndefined()
    expect(
      projectActorDossier(
        { ...first, annotation: field({ authorship: 'player', text: 'x'.repeat(1601) }) },
        low
      ).annotation
    ).toEqual({ state: 'unavailable' })
    expect(JSON.stringify(projectActorDossier(first, low))).toBe(JSON.stringify(a))
  })

  it('is byte-stable, non-mutating and preserves uncertain versus absent facts', () => {
    const record = base()
    const before = JSON.stringify(record)
    const a = projectActorDossier(record, high)
    const b = projectActorDossier(
      {
        ...record,
        fields: {
          ...record.fields,
          aliases: { ...record.fields.aliases!, provenance: ['source-record', 'source-record'] },
        },
      },
      high
    )
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    expect(JSON.stringify(record)).toBe(before)
    expect(Object.isFrozen(a.fields.aliases)).toBe(true)
    const uncertain = projectActorDossier(
      {
        ...record,
        fields: { displayName: { ...field('Possibly River'), confidence: 'uncertain' } },
      },
      low
    )
    expect(uncertain.fields.displayName).toMatchObject({
      state: 'estimated',
      confidence: 'uncertain',
    })
    expect(uncertain.fields.currentAssignment).toEqual({ state: 'unavailable' })
  })
})

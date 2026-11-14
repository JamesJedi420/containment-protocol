import { describe, expect, it } from 'vitest'
import {
  COMMUNICATION_SEMANTIC_ACTS,
  buildCommunicationPayload,
  buildCommunicationSelectorInputs,
  parseCommunicationPayload,
  reconcileCommunicationPayloads,
  type CommunicationObservation,
  type CommunicationPayloadRecord,
  type CommunicationPayloadRequest,
  type SenderKnownCommunicationInputs,
} from '../domain/communicationPayload'
import {
  buildCommunicationGuidanceHandoff,
  observationFromEligibleIntakeReport,
} from '../domain/communicationPayloadAdapters'
import {
  createInformationIntakeReport,
  type InformationIntakeReportRecord,
} from '../domain/informationIntakeReport'
import {
  createDistrictServiceRegistry,
  PUBLIC_SERVICE_CATEGORIES,
} from '../domain/publicServiceInfrastructureDegradation'

function event(eventRef = 'event:known'): CommunicationObservation {
  return {
    eventRef,
    sourceRef: 'field:lookout',
    statement: `Observed activity ${eventRef}`,
    claimKind: 'reported_observation',
    verificationStatus: 'unverified',
    confidence: 0.4,
  }
}
function known(): SenderKnownCommunicationInputs {
  return {
    speakerRef: 'actor:sender',
    stateKeys: ['injured', 'on-duty'],
    events: [event(), event('event:second')],
  }
}
function request(
  overrides: Partial<CommunicationPayloadRequest> = {}
): CommunicationPayloadRequest {
  return {
    id: 'payload:one',
    sourceRef: 'source:field-report',
    recipientRefs: ['agency:ops'],
    semanticAct: 'warning',
    mode: 'speech',
    outputSurface: 'dialogue',
    poolId: 'opaque-pool-reference',
    triggerHooks: ['trigger:report'],
    logRef: 'log:report',
    urgency: 'urgent',
    eventRefs: ['event:known'],
    ...overrides,
  }
}
function payload(overrides: Partial<CommunicationPayloadRequest> = {}): CommunicationPayloadRecord {
  const result = buildCommunicationPayload(request(overrides), known())
  if (!result.ok) throw new Error(result.issues.join(','))
  return result.payload
}
function report(): InformationIntakeReportRecord {
  return {
    ...createInformationIntakeReport({
      id: 'intake:one',
      label: 'Observed movement',
      topicRef: 'topic:movement',
      initialSourceClass: 'field_witness',
      credibility: 'medium',
      plausibility: 'plausible',
      rumorRisk: 'low',
    }),
    corroborationHistory: [
      {
        eventId: 'event:known',
        week: 1,
        sourceRef: 'field:lookout',
        sourceClass: 'field_witness',
        weight: 0.4,
        note: 'Movement near the gate',
      },
    ],
  }
}
const guidanceContext = {
  districtId: 'district:central',
  requiredServiceCategories: [],
  audienceProfiles: [
    {
      audienceId: 'audience:general',
      mobilityOk: true,
      languageOk: true,
      moneyOk: true,
      suppliesOk: true,
      infrastructureOk: true,
    },
  ],
}
function services() {
  return createDistrictServiceRegistry(
    'district:central',
    PUBLIC_SERVICE_CATEGORIES.map((serviceCategory) => ({
      districtId: 'district:central',
      serviceCategory,
      reliabilityState: 'functional' as const,
      downstreamUseFlags: [],
      provenance: { kind: 'field_update' as const, sourceRef: 'field:services' },
      reasonCodes: ['seed:functional'],
    }))
  )
}

describe('SPE-2268 payload contract', () => {
  it('varies by legitimate speaker state without changing stable message identity', () => {
    const first = buildCommunicationPayload(request(), known())
    const second = buildCommunicationPayload(request(), { ...known(), stateKeys: ['rested'] })
    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) throw new Error('fixtures invalid')
    expect(first.payload.id).toBe(second.payload.id)
    expect(first.payload.stateKeys).not.toEqual(second.payload.stateKeys)
    expect(first.payload.poolId).toBe('opaque-pool-reference')
    expect(buildCommunicationSelectorInputs(known())).toEqual({
      speakerRef: 'actor:sender',
      stateKeys: ['injured', 'on-duty'],
      recentEventRefs: ['event:known', 'event:second'],
    })
  })
  it('varies with eligible events and is byte-stable on unchanged inputs', () => {
    expect(payload().observations).not.toEqual(
      payload({ eventRefs: ['event:second'] }).observations
    )
    expect(JSON.stringify(buildCommunicationPayload(request(), known()))).toBe(
      JSON.stringify(buildCommunicationPayload(request(), known()))
    )
  })
  it.each(COMMUNICATION_SEMANTIC_ACTS)(
    'classifies %s without performing an action',
    (semanticAct) => {
      const producer = known()
      const before = JSON.stringify(producer)
      const result = buildCommunicationPayload(
        request({ semanticAct, provenance: { authorizerRef: 'actor:official' } }),
        producer
      )
      expect(result.ok).toBe(true)
      if (!result.ok) throw new Error('invalid fixture')
      expect(result.payload.semanticAct).toBe(semanticAct)
      expect(JSON.stringify(producer)).toBe(before)
      expect(result.payload).not.toHaveProperty('authorized')
      expect(result.payload).not.toHaveProperty('executed')
    }
  )
  it('represents non-speech signals and rejects incompatible surfaces', () => {
    expect(payload({ mode: 'nonverbal', outputSurface: 'signal' }).mode).toBe('nonverbal')
    expect(
      buildCommunicationPayload(request({ mode: 'speech', outputSurface: 'gesture' }), known())
    ).toMatchObject({ ok: false, issues: ['incompatible_output'] })
  })
  it('preserves distinct origin and control roles without rekeying the payload', () => {
    const provenance = {
      authorRef: 'actor:author',
      requesterRef: 'institution:requester',
      sponsorRef: 'institution:sponsor',
      approverRef: 'actor:approver',
      authorizerRef: 'actor:authorizer',
    }
    const result = payload({ provenance })
    expect(result.id).toBe(payload().id)
    expect(result.speakerRef).not.toBe(result.provenance?.authorRef)
    expect(result.provenance).toEqual(provenance)
  })
  it('fails closed on unknown sender events and state keys', () => {
    expect(
      buildCommunicationPayload(request({ eventRefs: ['event:hidden'] }), known())
    ).toMatchObject({ ok: false, issues: ['unknown_sender_event'] })
    expect(
      buildCommunicationPayload(request({ stateKeys: ['secret-allegiance'] }), known())
    ).toMatchObject({ ok: false, issues: ['unknown_speaker_state_key'] })
    expect(parseCommunicationPayload({ ...payload(), speakerRef: 'actor:other' }, known()).ok).toBe(
      false
    )
  })
  it('does not copy arbitrary authoritative or command fields from inputs', () => {
    const raw = {
      ...payload(),
      hiddenFaction: 'secret',
      authorized: true,
      command: { action: 'release' },
    }
    const parsed = parseCommunicationPayload(raw, known())
    expect(parsed.ok && parsed.payload).toEqual(payload())
    expect(JSON.stringify(parsed)).not.toContain('hiddenFaction')
  })
  it('rejects forged observations or upgraded confidence/verification qualifiers', () => {
    const raw = payload()
    expect(
      parseCommunicationPayload(
        { ...raw, observations: [{ ...raw.observations[0], confidence: 1 }] },
        known()
      )
    ).toMatchObject({ ok: false, issues: ['changed_event_qualifiers'] })
    expect(
      parseCommunicationPayload({ ...raw, observations: [event('event:hidden')] }, known())
    ).toMatchObject({ ok: false, issues: ['unknown_sender_event'] })
    expect(
      parseCommunicationPayload(
        { ...raw, observations: [{ ...event(), claimKind: 'verified_observation' }] },
        known()
      ).ok
    ).toBe(false)
  })
  it('keeps allegations and verified observations distinct from directive classification', () => {
    const allegations = { ...event(), claimKind: 'allegation' as const }
    const verified = {
      ...event('event:verified'),
      claimKind: 'verified_observation' as const,
      verificationStatus: 'verified' as const,
      confidence: 0.8,
    }
    const input = { ...known(), events: [allegations, verified] }
    const result = buildCommunicationPayload(
      request({ semanticAct: 'order', eventRefs: ['event:known', 'event:verified'] }),
      input
    )
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('invalid fixture')
    expect(result.payload.observations.map((x) => x.claimKind)).toEqual([
      'allegation',
      'verified_observation',
    ])
  })
  it('normalizes exact duplicate references and rejects conflicting source facts', () => {
    const result = buildCommunicationPayload(
      request({
        recipientRefs: ['agency:ops', 'agency:ops'],
        eventRefs: ['event:known', 'event:known'],
      }),
      { ...known(), events: [event(), event()] }
    )
    expect(result.ok && result.payload.observations.length).toBe(1)
    expect(
      buildCommunicationPayload(request(), {
        ...known(),
        events: [event(), { ...event(), statement: 'Conflict' }],
      }).ok
    ).toBe(false)
    expect(
      parseCommunicationPayload(
        { ...payload(), observations: [event(), { ...event(), statement: 'Conflict' }] },
        known()
      ).ok
    ).toBe(false)
  })
  it('deduplicates canonical messages, sorts by stable id and rejects identity conflicts in either order', () => {
    const one = payload()
    const two = payload({ id: 'payload:two' })
    expect(
      reconcileCommunicationPayloads([two, one, JSON.parse(JSON.stringify(one))], known())
    ).toEqual({ ok: true, payloads: [one, two] })
    const conflicting = { ...one, semanticAct: 'order' }
    for (const pair of [
      [one, conflicting],
      [conflicting, one],
    ])
      expect(reconcileCommunicationPayloads(pair, known())).toMatchObject({
        ok: false,
        issues: ['conflicting_payload_identity'],
      })
  })
  it('copies and freezes data instead of aliasing eligible producer inputs', () => {
    const input = known()
    const result = buildCommunicationPayload(request(), input)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('invalid fixture')
    expect(Object.isFrozen(result.payload)).toBe(true)
    expect(Object.isFrozen(result.payload.observations[0])).toBe(true)
    expect(result.payload.observations[0]).not.toBe(input.events[0])
    expect(Object.isFrozen(result.payload.stateKeys)).toBe(true)
  })
  it.each([NaN, Infinity, -1, 1.1])('rejects invalid confidence %s', (confidence) => {
    expect(
      buildCommunicationPayload(request(), { ...known(), events: [{ ...event(), confidence }] }).ok
    ).toBe(false)
  })
  it('rejects malformed JSON enums, sparse arrays and unknown provenance roles', () => {
    const malformed = JSON.parse('{"toString":null}')
    for (const patch of [
      { semanticAct: malformed },
      { recipientRefs: new Array(1) },
      { observations: new Array(1) },
      { mode: malformed },
      { provenance: { authorityGranted: true } },
      { provenance: JSON.parse('{"__proto__":"actor:forged"}') },
    ])
      expect(parseCommunicationPayload({ ...payload(), ...patch }, known()).ok).toBe(false)
    for (const input of [null, [], {}, { ...payload(), urgency: 'whenever' }])
      expect(parseCommunicationPayload(input, known()).ok).toBe(false)
    expect(buildCommunicationSelectorInputs({ ...known(), events: new Array(1) })).toBeNull()
  })
})

describe('existing intake and service-guidance adapters', () => {
  it('uses existing intake validation and preserves source identity and confidence', () => {
    const source = report()
    const observation = observationFromEligibleIntakeReport(
      source,
      'event:known',
      ['event:known'],
      'reported_observation'
    )
    expect(observation).toMatchObject({
      eventRef: 'event:known',
      sourceRef: 'field:lookout',
      statement: 'Movement near the gate',
      confidence: source.confidenceScore,
      verificationStatus: source.verificationStatus,
    })
    expect(
      observationFromEligibleIntakeReport(source, 'event:known', [], 'reported_observation')
    ).toBeNull()
    expect(
      observationFromEligibleIntakeReport(
        source,
        'event:unknown',
        ['event:unknown'],
        'reported_observation'
      )
    ).toBeNull()
    expect(
      observationFromEligibleIntakeReport(
        { ...source, confidenceScore: Infinity },
        'event:known',
        ['event:known'],
        'reported_observation'
      )
    ).toBeNull()
    expect(
      observationFromEligibleIntakeReport(
        source,
        'event:known',
        ['event:known'],
        'verified_observation'
      )
    ).toBeNull()
  })
  it('preserves provenance and qualifiers across serialization and the real guidance validator handoff', () => {
    const observation = observationFromEligibleIntakeReport(
      report(),
      'event:known',
      ['event:known'],
      'reported_observation'
    )!
    const input = { ...known(), events: [observation] }
    const built = buildCommunicationPayload(
      request({
        protectiveAction: 'evacuation',
        provenance: { authorRef: 'actor:lookout', requesterRef: 'agency:ops' },
      }),
      input
    )
    if (!built.ok) throw new Error('invalid fixture')
    const handoff = buildCommunicationGuidanceHandoff(
      JSON.parse(JSON.stringify(built.payload)),
      input,
      guidanceContext,
      services()
    )
    expect(handoff.ok).toBe(true)
    if (!handoff.ok) throw new Error('invalid handoff')
    expect(handoff.packet.messageId).toBe(built.payload.id)
    expect(handoff.serviceFeasibility.disposition).toBe('release')
    const forwarded = JSON.parse(JSON.stringify(handoff))
    expect(parseCommunicationPayload(forwarded.payload, input)).toEqual({
      ok: true,
      payload: built.payload,
    })
    expect(forwarded.payload.observations[0]).toEqual(observation)
    expect(forwarded.payload.provenance).toEqual(built.payload.provenance)
    expect(forwarded).not.toHaveProperty('authorized')
  })
  it('retains the payload when service feasibility blocks; never treats authorization act as approval', () => {
    const source = payload({ semanticAct: 'authorization', protectiveAction: 'evacuation' })
    const handoff = buildCommunicationGuidanceHandoff(source, known(), guidanceContext, {})
    expect(handoff.ok).toBe(true)
    if (!handoff.ok) throw new Error('invalid handoff')
    expect(handoff.serviceFeasibility.disposition).toBe('block')
    expect(handoff.payload.semanticAct).toBe('authorization')
    expect(handoff.payload.id).toBe(source.id)
    expect(handoff).not.toHaveProperty('authorized')
    expect(
      buildCommunicationGuidanceHandoff(payload(), known(), guidanceContext, services())
    ).toMatchObject({ ok: false, issues: ['missing_protective_action'] })
    expect(
      buildCommunicationGuidanceHandoff(
        source,
        known(),
        { ...guidanceContext, audienceProfiles: [] },
        services()
      ).ok
    ).toBe(false)
  })
})

it('fails closed on malformed builder state and makes intake statement fallback explicit', () => {
  expect(
    buildCommunicationPayload(
      { ...request(), stateKeys: null } as unknown as CommunicationPayloadRequest,
      known()
    )
  ).toMatchObject({ ok: false, issues: ['invalid_payload_keys'] })
  const source = report()
  const emptyNote = {
    ...source,
    corroborationHistory: source.corroborationHistory.map((event) => ({ ...event, note: ' ' })),
  }
  expect(
    observationFromEligibleIntakeReport(
      emptyNote,
      'event:known',
      ['event:known'],
      'reported_observation'
    )?.statement
  ).toBe(source.label)
  expect(
    observationFromEligibleIntakeReport(
      source,
      ' event:known ',
      [' event:known '],
      'reported_observation'
    )
  ).toBeNull()
})

it('validates even empty collections and canonicalizes empty optional provenance', () => {
  expect(reconcileCommunicationPayloads([], { ...known(), speakerRef: '' })).toMatchObject({
    ok: false,
    issues: ['invalid_sender_known_inputs'],
  })
  expect(reconcileCommunicationPayloads([payload(), payload({ provenance: {} })], known())).toEqual(
    { ok: true, payloads: [payload()] }
  )
  expect(
    buildCommunicationPayload(null as unknown as CommunicationPayloadRequest, known())
  ).toMatchObject({ ok: false, issues: ['invalid_payload_request'] })
})

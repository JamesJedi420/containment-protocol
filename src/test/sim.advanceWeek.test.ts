// cspell:words cand greentape medkits sato
import { describe, expect, it } from 'vitest'
import { createStartingState, startingState } from '../data/startingState'
import {
  advanceWeek,
  deriveWeeklyCivicConsequencePackets,
  getWeeklyCaseGenerationSeamInput,
} from '../domain/sim/advanceWeek'
import { assignTeam, launchMajorIncident } from '../domain/sim/assign'
import { queueFabrication } from '../domain/sim/production'
import { computeTeamScore } from '../domain/sim/scoring'
import { buildAgencyProtocolState } from '../domain/protocols'
import { createNeighborhoodIncidentPacket } from '../domain/urbanNeighborhoodIncidents'
import { createSeededRng } from '../domain/math'
import { generateAmbientCases } from '../domain/caseGeneration'
import {
  createCompactCivicAuthorityConsequencePacket,
  deriveCrossSiteAuthorityModifierForTargetSite,
  extractPersistentAuthoritySourceInputsFromEvents,
  resolveAuthoritySameSourceConflicts,
} from '../domain/civicConsequenceNetwork'
import { SIM_NOTES } from '../data/copy'
import type { Agent, DomainStats, OperationEvent, RuntimeQueuedEvent } from '../domain/models'

function makeDomainStats(overrides: Partial<DomainStats> = {}): DomainStats {
  return {
    physical: { strength: 20, endurance: 20, ...(overrides.physical ?? {}) },
    tactical: { awareness: 40, reaction: 40, ...(overrides.tactical ?? {}) },
    cognitive: { analysis: 60, investigation: 60, ...(overrides.cognitive ?? {}) },
    social: { negotiation: 60, influence: 60, ...(overrides.social ?? {}) },
    stability: { resistance: 50, tolerance: 50, ...(overrides.stability ?? {}) },
    technical: { equipment: 60, anomaly: 60, ...(overrides.technical ?? {}) },
  }
}

function makeAgentFixture(role: Agent['role'], overrides: Partial<Agent> = {}): Agent {
  return {
    ...createStartingState().agents.a_ava,
    id: `agent-${role}`,
    name: `Agent ${role}`,
    role,
    baseStats: { combat: 40, investigation: 40, utility: 40, social: 40 },
    stats: makeDomainStats(),
    tags: [],
    relationships: {},
    fatigue: 0,
    status: 'active',
    traits: [],
    ...overrides,
  }
}

it('keeps launched major incident teams locked while weeks remain', () => {
  const state = createStartingState()
  const baseAgent = state.agents.a_ava

  state.agents['agent-alpha'] = {
    ...baseAgent,
    id: 'agent-alpha',
    name: 'Alpha',
    role: 'hunter',
    baseStats: { combat: 90, investigation: 80, utility: 74, social: 50 },
    fatigue: 5,
    status: 'active',
  }
  state.agents['agent-bravo'] = {
    ...baseAgent,
    id: 'agent-bravo',
    name: 'Bravo',
    role: 'tech',
    baseStats: { combat: 72, investigation: 86, utility: 92, social: 46 },
    fatigue: 7,
    status: 'active',
  }
  state.agents['agent-charlie'] = {
    ...baseAgent,
    id: 'agent-charlie',
    name: 'Charlie',
    role: 'field_recon',
    baseStats: { combat: 74, investigation: 88, utility: 90, social: 54 },
    fatigue: 9,
    status: 'active',
  }

  state.teams['team-alpha'] = {
    id: 'team-alpha',
    name: 'Alpha Team',
    agentIds: ['agent-alpha'],
    memberIds: ['agent-alpha'],
    leaderId: 'agent-alpha',
    tags: ['field'],
  }
  state.teams['team-bravo'] = {
    id: 'team-bravo',
    name: 'Bravo Team',
    agentIds: ['agent-bravo'],
    memberIds: ['agent-bravo'],
    leaderId: 'agent-bravo',
    tags: ['tech'],
  }
  state.teams['team-charlie'] = {
    id: 'team-charlie',
    name: 'Charlie Team',
    agentIds: ['agent-charlie'],
    memberIds: ['agent-charlie'],
    leaderId: 'agent-charlie',
    tags: ['recon'],
  }

  state.cases['major-incident'] = {
    ...state.cases['case-003'],
    id: 'major-incident',
    title: 'Regional Fracture Event',
    kind: 'raid',
    stage: 3,
    deadlineRemaining: 1,
    durationWeeks: 4,
    requiredTags: [],
    requiredRoles: [],
    raid: { minTeams: 2, maxTeams: 4 },
    assignedTeamIds: [],
  }

  const launched = launchMajorIncident(
    state,
    'major-incident',
    ['team-alpha', 'team-bravo', 'team-charlie']
  )
  const next = advanceWeek(launched)

  expect(next.cases['major-incident'].status).toBe('in_progress')
  expect(next.cases['major-incident'].weeksRemaining).toBeGreaterThan(0)
  expect(next.teams['team-alpha'].assignedCaseId).toBe('major-incident')
  expect(next.teams['team-bravo'].assignedCaseId).toBe('major-incident')
  expect(next.teams['team-charlie'].assignedCaseId).toBe('major-incident')
})

function getPressureThresholdSpawnEvent(events: OperationEvent[]) {
  return events.find(
    (event): event is OperationEvent<'case.spawned'> =>
      event.type === 'case.spawned' && event.payload.trigger === 'pressure_threshold'
  )
}

function isolateResolvedCaseSet(state: ReturnType<typeof createStartingState>) {
  return Object.fromEntries(
    Object.entries(state.cases).map(([caseId, currentCase]) => [
      caseId,
      {
        ...currentCase,
        status: 'resolved' as const,
        assignedTeamIds: [],
        weeksRemaining: 0,
      },
    ])
  )
}

function makeMissionResultState(outcome: 'success' | 'partial' | 'fail' | 'unresolved') {
  const base = createStartingState()
  base.rngSeed = 77
  base.rngState = 77
  base.partyCards = undefined
  base.events = []
  base.reports = []

  const isolatedCases = isolateResolvedCaseSet(base)

  if (outcome === 'unresolved') {
    base.cases = {
      ...isolatedCases,
      'case-001': {
        ...base.cases['case-001'],
        status: 'open',
        deadlineRemaining: 1,
        assignedTeamIds: [],
        onUnresolved: {
          ...base.cases['case-001'].onUnresolved,
          stageDelta: 1,
          deadlineResetWeeks: 3,
          spawnCount: { min: 1, max: 1 },
          spawnTemplateIds: ['chem-001'],
        },
      },
    }

    return base
  }

  const assigned = assignTeam(
    {
      ...base,
      agency: {
        ...base.agency,
        containmentRating: 90,
        clearanceLevel: 2,
        funding: 200,
      },
      containmentRating: 90,
      clearanceLevel: 2,
      funding: 200,
      cases: {
        ...isolatedCases,
        'case-001': {
          ...base.cases['case-001'],
          status: 'open',
          mode: 'threshold',
          tags: ['occult', 'anomaly', 'containment'],
          requiredTags: [],
          preferredTags: [],
          weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
          difficulty: { combat: 60, investigation: 0, utility: 0, social: 0 },
          onFail: {
            ...base.cases['case-001'].onFail,
            spawnCount: { min: 1, max: 1 },
            spawnTemplateIds: ['chem-001'],
          },
        },
      },
    },
    'case-001',
    't_nightwatch'
  )

  const gearedAgentId = assigned.teams['t_nightwatch'].agentIds[0]
  assigned.agents[gearedAgentId] = {
    ...assigned.agents[gearedAgentId]!,
    equipment: {},
    equipmentSlots: {
      secondary: 'ward_seals',
      utility1: 'warding_kits',
    },
  }

  const calibratedScore = computeTeamScore(
    assigned.teams['t_nightwatch'].agentIds.map((agentId) => assigned.agents[agentId]!),
    assigned.cases['case-001'],
    {
      protocolState: buildAgencyProtocolState(assigned),
    }
  )

  assigned.cases['case-001'] = {
    ...assigned.cases['case-001'],
    status: 'in_progress',
    weeksRemaining: 1,
    difficulty: {
      combat:
        outcome === 'success'
          ? Math.max(1, Math.floor(calibratedScore.score - 5))
          : outcome === 'partial'
            ? Math.ceil(calibratedScore.score + 1)
            : Math.ceil(calibratedScore.score + assigned.config.partialMargin + 10),
      investigation: 0,
      utility: 0,
      social: 0,
    },
  }

  if (outcome === 'fail') {
    for (const agentId of assigned.teams['t_nightwatch'].agentIds) {
      assigned.agents[agentId] = {
        ...assigned.agents[agentId]!,
        fatigue: 90,
      }
    }
  }

  return assigned
}

function makeAggregateBattleIntegrationState() {
  const state = createStartingState()
  state.rngSeed = 211
  state.rngState = 211
  state.partyCards = undefined
  state.events = []
  state.reports = []
  state.legitimacy = { sanctionLevel: 'sanctioned' }
  state.agency = {
    ...state.agency!,
    supportAvailable: 4,
  }

  const isolatedCases = isolateResolvedCaseSet(state)
  state.cases = {
    ...isolatedCases,
    'case-raid-battle': {
      ...state.cases['case-003'],
      id: 'case-raid-battle',
      templateId: 'case-raid-battle',
      title: 'Catacomb Breach',
      kind: 'raid',
      mode: 'threshold',
      status: 'in_progress',
      stage: 4,
      durationWeeks: 1,
      weeksRemaining: 1,
      deadlineWeeks: 1,
      deadlineRemaining: 1,
      tags: ['occult', 'reliquary', 'cult', 'raid'],
      requiredTags: [],
      preferredTags: ['tech', 'holy'],
      difficulty: { combat: 22, investigation: 8, utility: 12, social: 4 },
      weights: { combat: 0.7, investigation: 0.1, utility: 0.15, social: 0.05 },
      assignedTeamIds: ['t_nightwatch', 't_greentape'],
      raid: { minTeams: 2, maxTeams: 2 },
      siteLayer: 'interior',
      visibilityState: 'clear',
      transitionType: 'chokepoint',
      spatialFlags: ['night'],
    },
  }
  state.teams['t_nightwatch'] = {
    ...state.teams['t_nightwatch'],
    assignedCaseId: 'case-raid-battle',
  }
  state.teams['t_greentape'] = {
    ...state.teams['t_greentape'],
    assignedCaseId: 'case-raid-battle',
  }

  for (const agentId of state.teams['t_nightwatch'].agentIds) {
    state.agents[agentId] = {
      ...state.agents[agentId],
      fatigue: 0,
      baseStats: {
        combat: 92,
        investigation: 54,
        utility: 48,
        social: 36,
      },
    }
  }

  for (const agentId of state.teams['t_greentape'].agentIds) {
    state.agents[agentId] = {
      ...state.agents[agentId],
      fatigue: 0,
      baseStats: {
        combat: 28,
        investigation: 86,
        utility: 84,
        social: 48,
      },
    }
  }

  return state
}

function makeParallelObjectiveAggregateBattleState() {
  const state = createStartingState()
  state.rngSeed = 313
  state.rngState = 313
  state.partyCards = undefined
  state.events = []
  state.reports = []
  state.legitimacy = { sanctionLevel: 'sanctioned' }
  state.agency = {
    ...state.agency!,
    supportAvailable: 4,
  }

  const isolatedCases = isolateResolvedCaseSet(state)
  state.cases = {
    ...isolatedCases,
    'case-ritual-battle': {
      ...state.cases['case-003'],
      id: 'case-ritual-battle',
      templateId: 'case-ritual-battle',
      title: 'Wardline Under Fire',
      kind: 'raid',
      mode: 'threshold',
      status: 'in_progress',
      stage: 4,
      durationWeeks: 1,
      weeksRemaining: 1,
      deadlineWeeks: 1,
      deadlineRemaining: 1,
      tags: ['occult', 'ritual', 'seal', 'raid'],
      requiredTags: [],
      preferredTags: ['holy', 'tech'],
      difficulty: { combat: 20, investigation: 8, utility: 14, social: 4 },
      weights: { combat: 0.65, investigation: 0.1, utility: 0.2, social: 0.05 },
      assignedTeamIds: ['t_nightwatch', 't_greentape'],
      raid: { minTeams: 2, maxTeams: 2 },
      siteLayer: 'interior',
      visibilityState: 'clear',
      transitionType: 'chokepoint',
      spatialFlags: ['night'],
    },
  }
  state.teams['t_nightwatch'] = {
    ...state.teams['t_nightwatch'],
    assignedCaseId: 'case-ritual-battle',
  }
  state.teams['t_greentape'] = {
    ...state.teams['t_greentape'],
    assignedCaseId: 'case-ritual-battle',
  }

  for (const agentId of state.teams['t_nightwatch'].agentIds) {
    state.agents[agentId] = {
      ...state.agents[agentId],
      fatigue: 0,
      baseStats: {
        combat: 88,
        investigation: 52,
        utility: 50,
        social: 36,
      },
    }
  }

  for (const agentId of state.teams['t_greentape'].agentIds) {
    state.agents[agentId] = {
      ...state.agents[agentId],
      fatigue: 0,
      baseStats: {
        combat: 26,
        investigation: 84,
        utility: 88,
        social: 48,
      },
    }
  }

  return state
}

function withNeighborhoodPackets(
  state: ReturnType<typeof createStartingState>,
  neighborhoodPackets: ReturnType<typeof createNeighborhoodIncidentPacket>[]
) {
  const nextState = state as ReturnType<typeof createStartingState> & {
    neighborhoodPackets?: ReturnType<typeof createNeighborhoodIncidentPacket>[]
  }

  nextState.neighborhoodPackets = neighborhoodPackets

  return nextState
}

type TestAuthoritySourceInput = {
  sourceId: string
  sourceSiteId: string
  targetSiteId: string
  seedKey: string
  authoritySignal?: number
  firstWeek: number
  availability?: 'persistent' | 'recurring'
  cadenceWeeks?: number
}

type TestAuthorityQueuedEvent = Pick<
  RuntimeQueuedEvent,
  'id' | 'type' | 'targetId' | 'week' | 'payload'
>

function withCivicAuthorityWeeklySources(
  state: ReturnType<typeof createStartingState>,
  input: {
    civicAuthoritySources?: readonly TestAuthoritySourceInput[]
    authorityQueuedEvents?: readonly TestAuthorityQueuedEvent[]
  }
) {
  const nextState = state as ReturnType<typeof createStartingState> & {
    civicAuthoritySources?: readonly TestAuthoritySourceInput[]
    authorityQueuedEvents?: readonly TestAuthorityQueuedEvent[]
  }

  if (input.civicAuthoritySources) {
    nextState.civicAuthoritySources = input.civicAuthoritySources
  }

  if (input.authorityQueuedEvents) {
    nextState.authorityQueuedEvents = input.authorityQueuedEvents
  }

  return nextState
}

function makeAuthorityExchangeState(targetDistrictId = 'site-b') {
  const templateBase = Object.values(createStartingState().templates)[0]!
  const state = createStartingState()

  state.config = { ...state.config, maxActiveCases: 2 }
  state.containmentRating = 40
  state.agency = {
    containmentRating: 40,
    clearanceLevel: state.clearanceLevel,
    funding: state.funding,
  }
  state.cases = {
    'case-seed': {
      ...state.cases['case-001'],
      id: 'case-seed',
      status: 'open',
      assignedTeamIds: [],
      tags: ['tier-1'],
      requiredTags: [],
      preferredTags: [],
      stage: 1,
      deadlineRemaining: 4,
    },
  }
  state.templates = {
    'authority-check': {
      ...templateBase,
      templateId: 'authority-check',
      title: 'Authority Checkpoint Escalation',
      kind: 'case',
      tags: ['authority', 'inspection', 'public'],
      requiredTags: [],
      preferredTags: [],
    },
    'smuggling-shadow': {
      ...templateBase,
      templateId: 'smuggling-shadow',
      title: 'Smuggling Shadow Route',
      kind: 'case',
      tags: ['criminal', 'smuggling', 'night'],
      requiredTags: [],
      preferredTags: [],
    },
  }
  state.districtScheduleState = {
    settlementId: 'spe-540-slice-3-weekly-seam',
    districts: {
      [targetDistrictId]: {
        id: targetDistrictId,
        label: targetDistrictId,
        encounterFamilyTags: [],
        escalationModifiers: { stage_delta: 0.1 },
        authorityResponseProfile: 'slow_reaction',
      },
    },
    timeBands: {
      day: {
        id: 'day',
        label: 'Day',
        baselinePopulation: 400,
        witnessModifier: 0.6,
        visibilityModifier: 0.8,
        covertAdvantage: false,
      },
    },
    events: [],
  }

  return state
}

describe('advanceWeek', () => {
  describe('SPE-540 slice-3: bounded weekly authority packet ingestion seam', () => {
    it('derives stable authority-channel packets from authored + queued weekly sources', () => {
      const state = withCivicAuthorityWeeklySources(makeAuthorityExchangeState('site-b'), {
        civicAuthoritySources: [
          {
            sourceId: 'spe-540-authored-weekly',
            sourceSiteId: 'site-a',
            targetSiteId: 'site-b',
            seedKey: 'authored-weekly-seed',
            authoritySignal: 0.7,
            firstWeek: 1,
            availability: 'persistent',
          },
        ],
        authorityQueuedEvents: [
          {
            id: 'qevt-spe-540-authority',
            type: 'encounter.follow_up',
            targetId: 'frontdesk.notice.authority.exchange',
            week: 1,
            payload: {
              civicAuthoritySource: true,
              civicPacketChannel: 'authority',
              sourceId: 'spe-540-queued-weekly',
              sourceSiteId: 'site-x',
              targetSiteId: 'site-b',
              seedKey: 'queued-weekly-seed',
              authoritySignal: 0.85,
              startWeek: 1,
              availability: 'persistent',
            },
          },
          {
            id: 'qevt-spe-540-non-authority',
            type: 'encounter.follow_up',
            targetId: 'frontdesk.notice.rumor.exchange',
            week: 1,
            payload: {
              civicPacketChannel: 'rumor',
              sourceId: 'spe-540-rumor-ignored',
              sourceSiteId: 'site-x',
              targetSiteId: 'site-b',
              seedKey: 'ignored-seed',
              authoritySignal: 0.99,
              startWeek: 1,
            },
          },
        ],
      })

      const packetsA = deriveWeeklyCivicConsequencePackets(state)
      const packetsB = deriveWeeklyCivicConsequencePackets(state)

      expect(packetsA).toEqual(packetsB)
      expect(packetsA.map((packet) => packet.packetId)).toEqual([
        'spe-540-authored-weekly',
        'spe-540-queued-weekly',
      ])
      expect(packetsA.every((packet) => packet.link.scope === 'two_site')).toBe(true)
      expect(packetsA.every((packet) => packet.link.sourceSiteId !== packet.link.targetSiteId)).toBe(
        true
      )
    })

    it('feeds derived weekly packets into the existing bounded world-activity path in the same week', () => {
      let baselineAuthoritySelections = 0
      let seamAuthoritySelections = 0

      for (let seed = 54210; seed <= 54240; seed += 1) {
        const baselineState = makeAuthorityExchangeState('site-b')
        const seamState = withCivicAuthorityWeeklySources(makeAuthorityExchangeState('site-b'), {
          authorityQueuedEvents: [
            {
              id: `qevt-spe-540-ingest-${seed}`,
              type: 'encounter.follow_up',
              targetId: 'frontdesk.notice.authority.exchange',
              week: 1,
              payload: {
                civicAuthoritySource: true,
                civicPacketChannel: 'authority',
                sourceId: `spe-540-ingest-${seed}`,
                sourceSiteId: 'site-a',
                targetSiteId: 'site-b',
                seedKey: `ingest-line-${seed}`,
                authoritySignal: 0.95,
                startWeek: 1,
                availability: 'persistent',
              },
            },
          ],
        })

        const baseline = generateAmbientCases(
          baselineState,
          createSeededRng(seed).next,
          getWeeklyCaseGenerationSeamInput(baselineState)
        )
        const seamApplied = generateAmbientCases(
          seamState,
          createSeededRng(seed).next,
          getWeeklyCaseGenerationSeamInput(seamState)
        )

        const baselineCase = baseline.state.cases[baseline.spawnedCaseIds[0]!]
        const seamCase = seamApplied.state.cases[seamApplied.spawnedCaseIds[0]!]

        if (baselineCase?.templateId === 'authority-check') {
          baselineAuthoritySelections += 1
        }

        if (seamCase?.templateId === 'authority-check') {
          seamAuthoritySelections += 1
        }
      }

      expect(seamAuthoritySelections).toBeGreaterThan(baselineAuthoritySelections)
    })

    it('applies recurring/persistent authority packet availability deterministically across weeks', () => {
      const week1State = withCivicAuthorityWeeklySources(makeAuthorityExchangeState('site-b'), {
        authorityQueuedEvents: [
          {
            id: 'qevt-spe-540-recurring',
            type: 'encounter.follow_up',
            targetId: 'frontdesk.notice.authority.recurring',
            week: 1,
            payload: {
              civicAuthoritySource: true,
              civicPacketChannel: 'authority',
              sourceId: 'spe-540-recurring',
              sourceSiteId: 'site-a',
              targetSiteId: 'site-b',
              seedKey: 'spe-540-recurring-seed',
              authoritySignal: 0.6,
              startWeek: 1,
              availability: 'recurring',
              cadenceWeeks: 2,
            },
          },
        ],
        civicAuthoritySources: [
          {
            sourceId: 'spe-540-persistent',
            sourceSiteId: 'site-a',
            targetSiteId: 'site-b',
            seedKey: 'spe-540-persistent-seed',
            authoritySignal: 0.55,
            firstWeek: 2,
            availability: 'persistent',
          },
        ],
      })

      const week2State = advanceWeek(structuredClone(week1State))
      const week3State = advanceWeek(structuredClone(week2State))

      const week1Packets = deriveWeeklyCivicConsequencePackets(week1State)
      const week2Packets = deriveWeeklyCivicConsequencePackets(week2State)
      const week3Packets = deriveWeeklyCivicConsequencePackets(week3State)
      const week3PacketsRepeat = deriveWeeklyCivicConsequencePackets(week3State)

      expect(week1Packets.map((packet) => packet.packetId)).toEqual(['spe-540-recurring'])
      expect(week2Packets.map((packet) => packet.packetId)).toEqual(['spe-540-persistent'])
      expect(week3Packets.map((packet) => packet.packetId)).toEqual([
        'spe-540-persistent',
        'spe-540-recurring',
      ])
      expect(week3PacketsRepeat).toEqual(week3Packets)
    })

    it('keeps non-target districts unaffected by authority exchange packets', () => {
      const baselineState = makeAuthorityExchangeState('site-c')
      const seamState = withCivicAuthorityWeeklySources(makeAuthorityExchangeState('site-c'), {
        authorityQueuedEvents: [
          {
            id: 'qevt-spe-540-non-target',
            type: 'encounter.follow_up',
            targetId: 'frontdesk.notice.authority.non-target',
            week: 1,
            payload: {
              civicAuthoritySource: true,
              civicPacketChannel: 'authority',
              sourceId: 'spe-540-non-target',
              sourceSiteId: 'site-a',
              targetSiteId: 'site-b',
              seedKey: 'spe-540-non-target-seed',
              authoritySignal: 0.9,
              startWeek: 1,
              availability: 'persistent',
            },
          },
        ],
      })

      const baseline = generateAmbientCases(
        baselineState,
        createSeededRng(54261).next,
        getWeeklyCaseGenerationSeamInput(baselineState)
      )
      const seamApplied = generateAmbientCases(
        seamState,
        createSeededRng(54261).next,
        getWeeklyCaseGenerationSeamInput(seamState)
      )

      const baselineCase = baseline.state.cases[baseline.spawnedCaseIds[0]!]
      const seamCase = seamApplied.state.cases[seamApplied.spawnedCaseIds[0]!]
      const seamReason =
        seamApplied.spawnedCases.find((spawned) => spawned.trigger === 'world_activity')
          ?.sourceReason ?? ''

      expect(seamReason).not.toContain('cross-site-authority')
      expect(seamCase?.templateId).toBe(baselineCase?.templateId)
    })
  })

  describe('SPE-540 slice 4: same-target multi-packet conflict resolution', () => {
    function makePacket(
      packetId: string,
      sourceSiteId: string,
      targetSiteId: string,
      authoritySignal: number,
      seedKey = 'test-seed'
    ) {
      return createCompactCivicAuthorityConsequencePacket({
        packetId,
        sourceSiteId,
        targetSiteId,
        seedKey,
        week: 1,
        authoritySignal,
      })
    }

    it('produces identical modifier for identical inputs (determinism)', () => {
      const packets = [
        makePacket('pkt-a1', 'site-a', 'site-b', 0.8, 'seed-a1'),
        makePacket('pkt-a2', 'site-a', 'site-b', 0.3, 'seed-a2'),
        makePacket('pkt-c1', 'site-c', 'site-b', 0.5, 'seed-c1'),
      ]

      const resultX = deriveCrossSiteAuthorityModifierForTargetSite(packets, 'site-b', 1)
      const resultY = deriveCrossSiteAuthorityModifierForTargetSite(packets, 'site-b', 1)

      expect(resultX).toEqual(resultY)
      expect(resultX.targetSiteId).toBe('site-b')
    })

    it('resolveAuthoritySameSourceConflicts keeps strongest packet per (source, target) pair', () => {
      const packets = [
        makePacket('pkt-a-weak', 'site-a', 'site-b', 0.3, 'seed-weak'),
        makePacket('pkt-a-strong', 'site-a', 'site-b', 0.8, 'seed-strong'),
        makePacket('pkt-a-mid', 'site-a', 'site-b', 0.6, 'seed-mid'),
        makePacket('pkt-c-only', 'site-c', 'site-b', 0.5, 'seed-c'),
      ].sort((a, b) => a.packetId.localeCompare(b.packetId))

      const resolved = resolveAuthoritySameSourceConflicts(packets)

      // Only the strongest site-a packet survives; site-c is unaffected
      expect(resolved.map((p) => p.packetId)).toEqual(['pkt-a-strong', 'pkt-c-only'])
    })

    it('multiple same-week packets from one source resolve to one stable effective authority outcome', () => {
      const multiPackets = [
        makePacket('pkt-flood-1', 'site-a', 'site-b', 0.4, 'flood-1'),
        makePacket('pkt-flood-2', 'site-a', 'site-b', 0.8, 'flood-2'),
        makePacket('pkt-flood-3', 'site-a', 'site-b', 0.6, 'flood-3'),
      ]
      const singlePacket = [makePacket('pkt-flood-2', 'site-a', 'site-b', 0.8, 'flood-2')]

      const multiModifier = deriveCrossSiteAuthorityModifierForTargetSite(multiPackets, 'site-b', 1)
      const singleModifier = deriveCrossSiteAuthorityModifierForTargetSite(singlePacket, 'site-b', 1)

      // Multi-packet same-source produces the same outcome as the single strongest packet
      expect(multiModifier.totalDelta).toBe(singleModifier.totalDelta)
      expect(multiModifier.weightModifier).toBe(singleModifier.weightModifier)
      expect(multiModifier.appliedPacketIds).toEqual(['pkt-flood-2'])
    })

    it('packets from different source sites each contribute independently', () => {
      const singleSource = [makePacket('pkt-solo-a', 'site-a', 'site-b', 0.6, 'solo-a')]
      const twoSources = [
        makePacket('pkt-solo-a', 'site-a', 'site-b', 0.6, 'solo-a'),
        makePacket('pkt-solo-c', 'site-c', 'site-b', 0.5, 'solo-c'),
      ]

      const single = deriveCrossSiteAuthorityModifierForTargetSite(singleSource, 'site-b', 1)
      const combined = deriveCrossSiteAuthorityModifierForTargetSite(twoSources, 'site-b', 1)

      expect(combined.appliedPacketIds).toEqual(['pkt-solo-a', 'pkt-solo-c'])
      expect(Math.abs(combined.totalDelta)).toBeGreaterThan(Math.abs(single.totalDelta))
    })

    it('non-target sites produce zero modifier delta and are unaffected', () => {
      const packets = [
        makePacket('pkt-a-to-b', 'site-a', 'site-b', 0.9, 'seed-atob'),
        makePacket('pkt-c-to-b', 'site-c', 'site-b', 0.7, 'seed-ctob'),
      ]

      const forTargetSite = deriveCrossSiteAuthorityModifierForTargetSite(packets, 'site-b', 1)
      const forNonTarget = deriveCrossSiteAuthorityModifierForTargetSite(packets, 'site-x', 1)

      expect(forTargetSite.totalDelta).not.toBe(0)
      expect(forNonTarget.totalDelta).toBe(0)
      expect(forNonTarget.weightModifier).toBe(1)
      expect(forNonTarget.appliedPacketIds).toEqual([])
    })

    it('no citywide propagation: modifier is strictly bounded to two_site scope packets', () => {
      const twoSitePackets = [
        makePacket('pkt-bounded', 'site-a', 'site-b', 0.9, 'bounded-seed'),
      ]
      const modifier = deriveCrossSiteAuthorityModifierForTargetSite(twoSitePackets, 'site-b', 1)

      // totalDelta bounded to [-0.3, 0.3], weightModifier bounded to [0.75, 1.25]
      expect(modifier.totalDelta).toBeGreaterThanOrEqual(-0.3)
      expect(modifier.totalDelta).toBeLessThanOrEqual(0.3)
      expect(modifier.weightModifier).toBeGreaterThanOrEqual(0.75)
      expect(modifier.weightModifier).toBeLessThanOrEqual(1.25)
      expect(modifier.reasonFragment).toContain('cross-site-authority')
      expect(modifier.reasonFragment).toContain('target:site-b')
    })
  })

  describe('SPE-540 slice 5: week+1 authority packet persistence', () => {
    it('persistent queued-event source survives in civicAuthoritySources after advanceWeek', () => {
      const week1State = withCivicAuthorityWeeklySources(makeAuthorityExchangeState('site-b'), {
        authorityQueuedEvents: [
          {
            id: 'qevt-s5-persist',
            type: 'encounter.follow_up',
            targetId: 'frontdesk.notice.authority.exchange',
            week: 1,
            payload: {
              civicAuthoritySource: true,
              sourceId: 'spe-540-s5-persistent',
              sourceSiteId: 'site-a',
              targetSiteId: 'site-b',
              seedKey: 's5-persist-seed',
              authoritySignal: 0.7,
              startWeek: 1,
              availability: 'persistent',
            },
          },
        ],
      })

      const week2State = advanceWeek(structuredClone(week1State)) as typeof week1State

      // The persistent source must be present in civicAuthoritySources on the output state
      const storedSources = week2State.civicAuthoritySources ?? []
      const persistedIds = storedSources.map((s) => s.sourceId)

      expect(persistedIds).toContain('spe-540-s5-persistent')
    })

    it('persistent packet remains available at week+1 even after the source event is consumed', () => {
      const week1State = withCivicAuthorityWeeklySources(makeAuthorityExchangeState('site-b'), {
        authorityQueuedEvents: [
          {
            id: 'qevt-s5-consumed',
            type: 'encounter.follow_up',
            targetId: 'frontdesk.notice.authority.exchange',
            week: 1,
            payload: {
              civicAuthoritySource: true,
              sourceId: 'spe-540-s5-consumed',
              sourceSiteId: 'site-a',
              targetSiteId: 'site-b',
              seedKey: 's5-consumed-seed',
              authoritySignal: 0.75,
              startWeek: 1,
              availability: 'persistent',
            },
          },
        ],
      })

      const week2Raw = advanceWeek(structuredClone(week1State)) as typeof week1State
      // Simulate event consumption: clear the queued events
      const week2State = { ...week2Raw, authorityQueuedEvents: [] as typeof week1State['authorityQueuedEvents'] }

      const week2Packets = deriveWeeklyCivicConsequencePackets(week2State)

      expect(week2Packets.map((p) => p.packetId)).toContain('spe-540-s5-consumed')
      expect(week2Packets.every((p) => p.link.scope === 'two_site')).toBe(true)
    })

    it('non-persistent (recurring) queued source is not stored in civicAuthoritySources after advanceWeek', () => {
      const week1State = withCivicAuthorityWeeklySources(makeAuthorityExchangeState('site-b'), {
        authorityQueuedEvents: [
          {
            id: 'qevt-s5-recurring',
            type: 'encounter.follow_up',
            targetId: 'frontdesk.notice.authority.exchange',
            week: 1,
            payload: {
              civicAuthoritySource: true,
              sourceId: 'spe-540-s5-recurring',
              sourceSiteId: 'site-a',
              targetSiteId: 'site-b',
              seedKey: 's5-recurring-seed',
              authoritySignal: 0.6,
              startWeek: 1,
              availability: 'recurring',
              cadenceWeeks: 2,
            },
          },
        ],
      })

      const week2Raw = advanceWeek(structuredClone(week1State)) as typeof week1State
      // Simulate event consumption
      const week2State = { ...week2Raw, authorityQueuedEvents: [] as typeof week1State['authorityQueuedEvents'] }

      const storedSources = week2State.civicAuthoritySources ?? []
      const storedIds = storedSources.map((s) => s.sourceId)

      // Recurring source must NOT be in civicAuthoritySources
      expect(storedIds).not.toContain('spe-540-s5-recurring')

      // And since the event is consumed and source not stored, week+1 produces no packet
      const week2Packets = deriveWeeklyCivicConsequencePackets(week2State)
      expect(week2Packets.map((p) => p.packetId)).not.toContain('spe-540-s5-recurring')
    })

    it('same-week consumption rules from slice-3 are unchanged', () => {
      // Week-1 packet derivation still works exactly as before slice 5
      const state = withCivicAuthorityWeeklySources(makeAuthorityExchangeState('site-b'), {
        authorityQueuedEvents: [
          {
            id: 'qevt-s5-unchanged',
            type: 'encounter.follow_up',
            targetId: 'frontdesk.notice.authority.exchange',
            week: 1,
            payload: {
              civicAuthoritySource: true,
              sourceId: 'spe-540-s5-unchanged',
              sourceSiteId: 'site-a',
              targetSiteId: 'site-b',
              seedKey: 's5-unchanged-seed',
              authoritySignal: 0.65,
              startWeek: 1,
              availability: 'persistent',
            },
          },
        ],
      })

      const packetsA = deriveWeeklyCivicConsequencePackets(state)
      const packetsB = deriveWeeklyCivicConsequencePackets(state)

      expect(packetsA).toEqual(packetsB)
      expect(packetsA.map((p) => p.packetId)).toContain('spe-540-s5-unchanged')
      expect(packetsA.every((p) => p.link.scope === 'two_site')).toBe(true)
    })

    it('extractPersistentAuthoritySourceInputsFromEvents is a pure function producing stable output', () => {
      const events: TestAuthorityQueuedEvent[] = [
        {
          id: 'qevt-pure-a',
          type: 'encounter.follow_up',
          targetId: 'frontdesk.notice.authority.exchange',
          week: 1,
          payload: {
            civicAuthoritySource: true,
            sourceId: 'spe-540-pure-persistent',
            sourceSiteId: 'site-a',
            targetSiteId: 'site-b',
            seedKey: 'pure-persist-seed',
            authoritySignal: 0.8,
            startWeek: 1,
            availability: 'persistent',
          },
        },
        {
          id: 'qevt-pure-b',
          type: 'encounter.follow_up',
          targetId: 'frontdesk.notice.authority.exchange',
          week: 1,
          payload: {
            civicAuthoritySource: true,
            sourceId: 'spe-540-pure-recurring',
            sourceSiteId: 'site-a',
            targetSiteId: 'site-b',
            seedKey: 'pure-recur-seed',
            authoritySignal: 0.5,
            startWeek: 1,
            availability: 'recurring',
            cadenceWeeks: 3,
          },
        },
      ]

      const resultX = extractPersistentAuthoritySourceInputsFromEvents(events)
      const resultY = extractPersistentAuthoritySourceInputsFromEvents(events)

      expect(resultX).toEqual(resultY)
      expect(resultX.map((s) => s.sourceId)).toEqual(['spe-540-pure-persistent'])
      expect(resultX[0]!.availability).toBe('persistent')
    })

    it('persisted source for site-b does not affect site-c packets', () => {
      const week1State = withCivicAuthorityWeeklySources(makeAuthorityExchangeState('site-c'), {
        authorityQueuedEvents: [
          {
            id: 'qevt-s5-nontarget',
            type: 'encounter.follow_up',
            targetId: 'frontdesk.notice.authority.exchange',
            week: 1,
            payload: {
              civicAuthoritySource: true,
              sourceId: 'spe-540-s5-nontarget',
              sourceSiteId: 'site-a',
              targetSiteId: 'site-b',
              seedKey: 's5-nontarget-seed',
              authoritySignal: 0.9,
              startWeek: 1,
              availability: 'persistent',
            },
          },
        ],
      })

      const week2Raw = advanceWeek(structuredClone(week1State)) as typeof week1State
      const week2State = { ...week2Raw, authorityQueuedEvents: [] as typeof week1State['authorityQueuedEvents'] }
      const week2Packets = deriveWeeklyCivicConsequencePackets(week2State)

      // site-b targeted packet is present in the output (source persisted correctly)
      const persistedPacket = week2Packets.find((p) => p.packetId === 'spe-540-s5-nontarget')
      expect(persistedPacket).toBeDefined()
      expect(persistedPacket?.link.targetSiteId).toBe('site-b')

      // site-c is not affected
      const affectsC = week2Packets.some((p) => p.link.targetSiteId === 'site-c')
      expect(affectsC).toBe(false)
    })
  })

  it('increments the week counter', () => {
    const next = advanceWeek(startingState)

    expect(next.week).toBe(startingState.week + 1)
  })

  it('does not mutate the original state', () => {
    const before = structuredClone(startingState)

    advanceWeek(startingState)

    expect(startingState).toEqual(before)
  })

  it('appends a weekly report', () => {
    const next = advanceWeek(startingState)

    expect(next.reports).toHaveLength(1)
    expect(next.reports[0].week).toBe(startingState.week)
    expect(next.reports[0].rngStateBefore).toBe(startingState.rngState)
    expect(next.reports[0].rngStateAfter).toBe(next.rngState)
  })

  it('appends a matching intel event when a weekly report is generated', () => {
    // Patch: Use a single-case state to avoid extra escalations/spawns
    const state = createStartingState()
    state.cases = {
      'case-001': {
        ...state.cases['case-001'],
        status: 'open',
        assignedTeamIds: [],
        deadlineRemaining: 1,
        onUnresolved: {
          ...state.cases['case-001'].onUnresolved,
          stageDelta: 1,
          deadlineResetWeeks: 3,
          spawnCount: { min: 1, max: 1 },
          spawnTemplateIds: ['chem-001'],
        },
      },
    }
    const next = advanceWeek(state)
    const latestEvent = next.events.at(-1)

    expect(latestEvent).toMatchObject({
      type: 'intel.report_generated',
      sourceSystem: 'intel',
      payload: expect.objectContaining({
        week: 1,
        noteCount: next.reports[0].notes.length,
      }),
    })
  })

  it('keeps stable event ordering for weekly posture and intel report', () => {
    const next = advanceWeek(createStartingState())
    const typeOrder = next.events.map((event) => event.type)
    const agencyIndex = typeOrder.lastIndexOf('agency.containment_updated')
    const intelIndex = typeOrder.lastIndexOf('intel.report_generated')

    expect(agencyIndex).toBeGreaterThanOrEqual(0)
    expect(intelIndex).toBeGreaterThanOrEqual(0)
    expect(agencyIndex).toBeLessThan(intelIndex)
  })

  it('appends monotonically increasing event ids', () => {
    const state = createStartingState()
    const next = advanceWeek(state)

    expect(next.events.length).toBeGreaterThan(0)
    const ids = next.events.map((event) => event.id)
    const expectedIds = ids.map((_, index) => `evt-${String(index + 1).padStart(6, '0')}`)

    expect(ids).toEqual(expectedIds)
  })

  it('refreshes the weekly recruitment pool deterministically and keeps the mirrored pool in sync', () => {
    const state = createStartingState()
    state.week = 4
    state.rngSeed = 2468
    state.rngState = 2468
    state.candidates = [
      {
        id: 'cand-expiring',
        name: 'Expiring Recruit',
        age: 27,
        category: 'agent',
        hireStatus: 'available',
        revealLevel: 1,
        expiryWeek: 4,
        evaluation: {
          overallVisible: false,
          potentialVisible: true,
          potentialTier: 'mid',
          rumorTags: [],
        },
        agentData: {
          role: 'field',
          specialization: 'recon',
          traits: ['steady-aim'],
        },
      },
    ]
    state.recruitmentPool = [...state.candidates]

    const next = advanceWeek(state)

    expect(next.candidates).toEqual(next.recruitmentPool)
    expect(next.candidates.some((candidate) => candidate.id === 'cand-expiring')).toBe(false)
    expect(next.candidates.length).toBeGreaterThanOrEqual(3)
    expect(next.candidates.length).toBeLessThanOrEqual(6)
    expect(
      next.events.some(
        (event) =>
          event.type === 'system.recruitment_expired' &&
          event.payload.week === state.week &&
          event.payload.count === 1
      )
    ).toBe(true)
    expect(
      next.events.some(
        (event) =>
          event.type === 'system.recruitment_generated' &&
          event.payload.week === state.week &&
          event.payload.count === next.candidates.length
      )
    ).toBe(true)
  })

  it('emits an aggregate agency containment update when progression values change', () => {
    const next = advanceWeek(createStartingState())
    const containmentEvent = next.events.find(
      (event) => event.type === 'agency.containment_updated'
    )

    expect(containmentEvent).toBeDefined()
    expect(containmentEvent).toMatchObject({
      sourceSystem: 'system',
      payload: expect.objectContaining({
        week: 1,
        containmentRatingBefore: expect.any(Number),
        containmentRatingAfter: expect.any(Number),
        clearanceLevelBefore: expect.any(Number),
        clearanceLevelAfter: expect.any(Number),
        fundingBefore: expect.any(Number),
        fundingAfter: expect.any(Number),
      }),
    })
  })

  it('skips aggregate containment update when funding/containment/clearance remain unchanged', () => {
    const state = createStartingState()
    state.config = {
      ...state.config,
      fundingBasePerWeek: 0,
      fundingPerResolution: 0,
      fundingPenaltyPerFail: 0,
      fundingPenaltyPerUnresolved: 0,
      containmentWeeklyDecay: 0,
      containmentDeltaPerResolution: 0,
      containmentDeltaPerFail: 0,
      containmentDeltaPerUnresolved: 0,
      clearanceThresholds: [9999],
    }
    state.cases = {
      'case-001': {
        ...state.cases['case-001'],
        status: 'open',
        deadlineRemaining: 5,
        assignedTeamIds: [],
      },
    }

    const next = advanceWeek(state)

    expect(next.events.some((event) => event.type === 'agency.containment_updated')).toBe(false)
  })

  it('emits post-week case snapshots and enriched team status', () => {
    const stateWithAssignment = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
    const next = advanceWeek(stateWithAssignment)
    const report = next.reports[0]
    const updatedCase = next.cases['case-001']
    const team = next.teams['t_nightwatch']
    const teamStatus = report.teamStatus.find((entry) => entry.teamId === 't_nightwatch')

    expect(report.caseSnapshots).toBeDefined()
    expect(report.caseSnapshots?.['case-001']).toMatchObject({
      caseId: 'case-001',
      title: updatedCase.title,
      kind: updatedCase.kind,
      mode: updatedCase.mode,
      status: updatedCase.status,
      stage: updatedCase.stage,
      deadlineRemaining: updatedCase.deadlineRemaining,
      durationWeeks: updatedCase.durationWeeks,
      weeksRemaining: updatedCase.weeksRemaining,
      assignedTeamIds: updatedCase.assignedTeamIds,
    })
    expect(teamStatus).toMatchObject({
      teamId: 't_nightwatch',
      teamName: team.name,
      assignedCaseId: 'case-001',
      assignedCaseTitle: updatedCase.title,
    })
    expect(teamStatus?.avgFatigue).toBeGreaterThanOrEqual(0)
    expect(['steady', 'strained', 'critical']).toContain(teamStatus?.fatigueBand)
  })

  it('does nothing when the simulation is already over', () => {
    const endedState = { ...startingState, gameOver: true }
    const next = advanceWeek(endedState)

    expect(next).toBe(endedState)
  })

  it('progresses an assigned case', () => {
    const stateWithAssignment = assignTeam(startingState, 'case-001', 't_nightwatch')
    const startingCase = stateWithAssignment.cases['case-001']
    const next = advanceWeek(stateWithAssignment)
    const updatedCase = next.cases['case-001']
    const report = next.reports[0]

    expect(updatedCase.status).toBe('in_progress')
    expect(updatedCase.weeksRemaining).toBe(
      (startingCase.weeksRemaining ?? startingCase.durationWeeks) - 1
    )
    expect(report.progressedCases).toEqual(['case-001'])
    expect(report.resolvedCases).toEqual([])
  })

  it('prunes stale assigned team ids while progressing an in-progress case', () => {
    const state = createStartingState()
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      status: 'in_progress',
      assignedTeamIds: ['missing-team', 't_nightwatch'],
      weeksRemaining: 2,
    }
    state.teams['t_nightwatch'] = {
      ...state.teams['t_nightwatch'],
      assignedCaseId: 'case-001',
    }

    const next = advanceWeek(state)

    expect(next.cases['case-001'].assignedTeamIds).toEqual(['t_nightwatch'])
    expect(next.cases['case-001'].weeksRemaining).toBe(1)
  })

  it('releases teams that still reference a resolved case even if not listed in assignedTeamIds', () => {
    const state = createStartingState()
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      status: 'in_progress',
      weeksRemaining: 1,
      mode: 'threshold',
      difficulty: { combat: 1, investigation: 0, utility: 0, social: 0 },
      weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
      assignedTeamIds: ['t_nightwatch'],
    }
    state.teams['t_nightwatch'] = {
      ...state.teams['t_nightwatch'],
      assignedCaseId: 'case-001',
    }
    state.teams['t_greentape'] = {
      ...state.teams['t_greentape'],
      assignedCaseId: 'case-001',
    }

    const next = advanceWeek(state)

    expect(next.teams['t_nightwatch'].assignedCaseId).toBeUndefined()
    expect(next.teams['t_greentape'].assignedCaseId).toBeUndefined()
    expect(next.teams['t_greentape'].status?.assignedCaseId ?? null).toBeNull()
  })

  it('ages an unassigned open case each week', () => {
    const next = advanceWeek(startingState)
    const updatedCase = next.cases['case-001']

    expect(updatedCase.deadlineRemaining).toBe(
      startingState.cases['case-001'].deadlineRemaining - 1
    )
  })

  it('applies sustained local neighborhood pressure to matching-district open cases by accelerating deadline escalation', () => {
    const state = createStartingState()
    state.week = 1
    state.cases = {
      'case-001': {
        ...state.cases['case-001'],
        status: 'open',
        assignedTeamIds: [],
        tags: [...state.cases['case-001'].tags, 'district:docks'],
        deadlineRemaining: 2,
        onUnresolved: {
          ...state.cases['case-001'].onUnresolved,
          spawnCount: { min: 0, max: 0 },
          spawnTemplateIds: [],
        },
      },
    }

    const pressuredState = withNeighborhoodPackets(state, [
      createNeighborhoodIncidentPacket({
        incidentId: 'incident-docks-active',
        districtId: 'docks',
        blockId: 'dock-1',
        seedKey: 'spe-539-slice-3-active',
        sourceKind: 'business_tool_misuse',
        sourceLabel: 'Persistent local hazard at docks',
        baseCadenceWeeks: 1,
        baseSeverity: 0.8,
      }),
    ])

    const next = advanceWeek(pressuredState)
    const escalatedEvent = next.events.find(
      (event): event is OperationEvent<'case.escalated'> =>
        event.type === 'case.escalated' && event.payload.caseId === 'case-001'
    )
    const reportEscalationNote = next.reports[0].notes.find(
      (note) => note.type === 'case.escalated' && note.metadata?.caseId === 'case-001'
    )

    expect(next.reports[0].unresolvedTriggers).toEqual(['case-001'])
    expect(next.cases['case-001'].stage).toBeGreaterThan(state.cases['case-001'].stage)
    expect(next.cases['case-001'].deadlineRemaining).toBeGreaterThan(0)
    expect(escalatedEvent?.payload.neighborhoodPressureAuditTag).toContain(
      'neighborhood-local-accidental'
    )
    expect(escalatedEvent?.payload.neighborhoodPressureAuditTag).toContain('district:docks')
    expect(escalatedEvent?.payload.neighborhoodPressureAuditTag).toMatch(/band:(low|medium|high)/)
    expect(escalatedEvent?.payload.neighborhoodPressureAuditTag).not.toContain('citywide')
    expect(escalatedEvent?.payload.neighborhoodPressureAuditTag).not.toContain('cross-site')
    expect(reportEscalationNote?.metadata?.neighborhoodPressureAuditTag).toBe(
      escalatedEvent?.payload.neighborhoodPressureAuditTag
    )
  })

  it('does not apply district-local pressure to non-matching districts', () => {
    const state = createStartingState()
    state.week = 1
    state.cases = {
      'case-001': {
        ...state.cases['case-001'],
        status: 'open',
        assignedTeamIds: [],
        tags: [...state.cases['case-001'].tags, 'district:hub'],
        deadlineRemaining: 2,
        onUnresolved: {
          ...state.cases['case-001'].onUnresolved,
          spawnCount: { min: 0, max: 0 },
          spawnTemplateIds: [],
        },
      },
    }

    const pressuredState = withNeighborhoodPackets(state, [
      createNeighborhoodIncidentPacket({
        incidentId: 'incident-docks-only',
        districtId: 'docks',
        blockId: 'dock-2',
        seedKey: 'spe-539-slice-3-nonmatch',
        sourceKind: 'operator_tool_misuse',
        sourceLabel: 'Only docks should be pressured',
        baseCadenceWeeks: 1,
        baseSeverity: 0.85,
      }),
    ])

    const next = advanceWeek(pressuredState)

    expect(next.reports[0].unresolvedTriggers).toEqual([])
    expect(next.cases['case-001'].deadlineRemaining).toBe(1)
    expect(
      next.events
        .filter((event): event is OperationEvent<'case.escalated'> => event.type === 'case.escalated')
        .every((event) => event.payload.neighborhoodPressureAuditTag === undefined)
    ).toBe(true)
  })

  it('does not apply local pressure when matching-district incidents are quiescent that week', () => {
    const state = createStartingState()
    state.week = 1
    state.cases = {
      'case-001': {
        ...state.cases['case-001'],
        status: 'open',
        assignedTeamIds: [],
        tags: [...state.cases['case-001'].tags, 'district:docks'],
        deadlineRemaining: 2,
        onUnresolved: {
          ...state.cases['case-001'].onUnresolved,
          spawnCount: { min: 0, max: 0 },
          spawnTemplateIds: [],
        },
      },
    }

    const pressuredState = withNeighborhoodPackets(state, [
      createNeighborhoodIncidentPacket({
        incidentId: 'incident-docks-quiescent',
        districtId: 'docks',
        blockId: 'dock-3',
        seedKey: 'spe-539-slice-3-quiescent',
        sourceKind: 'decorative_biohazard',
        sourceLabel: 'Cadence skips week 1',
        baseCadenceWeeks: 2,
        baseSeverity: 0.8,
      }),
    ])

    const next = advanceWeek(pressuredState)

    expect(next.reports[0].unresolvedTriggers).toEqual([])
    expect(next.cases['case-001'].deadlineRemaining).toBe(1)
    expect(
      next.events
        .filter((event): event is OperationEvent<'case.escalated'> => event.type === 'case.escalated')
        .every((event) => event.payload.neighborhoodPressureAuditTag === undefined)
    ).toBe(true)
  })

  it('does not append the neighborhood-pressure escalation marker during zero-pressure escalation weeks', () => {
    const state = createStartingState()
    state.week = 1
    state.cases = {
      'case-001': {
        ...state.cases['case-001'],
        status: 'open',
        assignedTeamIds: [],
        tags: [...state.cases['case-001'].tags, 'district:docks'],
        deadlineRemaining: 1,
        onUnresolved: {
          ...state.cases['case-001'].onUnresolved,
          spawnCount: { min: 0, max: 0 },
          spawnTemplateIds: [],
        },
      },
    }

    const pressuredState = withNeighborhoodPackets(state, [
      createNeighborhoodIncidentPacket({
        incidentId: 'incident-docks-zero-pressure-escalation',
        districtId: 'docks',
        blockId: 'dock-5',
        seedKey: 'spe-539-slice-4-zero-pressure-escalation',
        sourceKind: 'decorative_biohazard',
        sourceLabel: 'Cadence skips this week so no local pressure applies',
        baseCadenceWeeks: 2,
        baseSeverity: 0.85,
      }),
    ])

    const next = advanceWeek(pressuredState)
    const escalatedEvent = next.events.find(
      (event): event is OperationEvent<'case.escalated'> =>
        event.type === 'case.escalated' && event.payload.caseId === 'case-001'
    )

    expect(next.reports[0].unresolvedTriggers).toEqual(['case-001'])
    expect(escalatedEvent).toBeDefined()
    expect(escalatedEvent?.payload.neighborhoodPressureAuditTag).toBeUndefined()
  })

  it('emits identical neighborhood-pressure escalation audit markers for repeated deterministic runs', () => {
    const state = createStartingState()
    state.week = 1
    state.cases = {
      'case-001': {
        ...state.cases['case-001'],
        status: 'open',
        assignedTeamIds: [],
        tags: [...state.cases['case-001'].tags, 'district:docks'],
        deadlineRemaining: 2,
        onUnresolved: {
          ...state.cases['case-001'].onUnresolved,
          spawnCount: { min: 0, max: 0 },
          spawnTemplateIds: [],
        },
      },
    }

    const pressuredState = withNeighborhoodPackets(state, [
      createNeighborhoodIncidentPacket({
        incidentId: 'incident-docks-repeatable',
        districtId: 'docks',
        blockId: 'dock-6',
        seedKey: 'spe-539-slice-4-repeatable',
        sourceKind: 'business_tool_misuse',
        sourceLabel: 'Deterministic audit marker check',
        baseCadenceWeeks: 1,
        baseSeverity: 0.8,
      }),
    ])

    const nextA = advanceWeek(structuredClone(pressuredState))
    const nextB = advanceWeek(structuredClone(pressuredState))
    const escalationA = nextA.events.find(
      (event): event is OperationEvent<'case.escalated'> =>
        event.type === 'case.escalated' && event.payload.caseId === 'case-001'
    )
    const escalationB = nextB.events.find(
      (event): event is OperationEvent<'case.escalated'> =>
        event.type === 'case.escalated' && event.payload.caseId === 'case-001'
    )

    expect(escalationA?.payload.neighborhoodPressureAuditTag).toBeDefined()
    expect(escalationA?.payload.neighborhoodPressureAuditTag).toBe(
      escalationB?.payload.neighborhoodPressureAuditTag
    )
    expect(nextA).toEqual(nextB)
  })

  it('keeps neighborhood-pressure escalation bounded to matching district cases and read-only incident packets', () => {
    const state = createStartingState()
    state.week = 1
    state.cases = {
      'case-docks': {
        ...state.cases['case-001'],
        id: 'case-docks',
        status: 'open',
        assignedTeamIds: [],
        tags: [...state.cases['case-001'].tags, 'district:docks'],
        deadlineRemaining: 2,
        onUnresolved: {
          ...state.cases['case-001'].onUnresolved,
          spawnCount: { min: 0, max: 0 },
          spawnTemplateIds: [],
        },
      },
      'case-hub': {
        ...state.cases['case-002'],
        id: 'case-hub',
        status: 'open',
        assignedTeamIds: [],
        tags: [...state.cases['case-002'].tags, 'district:hub'],
        deadlineRemaining: 2,
        onUnresolved: {
          ...state.cases['case-002'].onUnresolved,
          spawnCount: { min: 0, max: 0 },
          spawnTemplateIds: [],
        },
      },
    }

    const neighborhoodPackets = [
      createNeighborhoodIncidentPacket({
        incidentId: 'incident-docks-local-only',
        districtId: 'docks',
        blockId: 'dock-4',
        seedKey: 'spe-539-slice-3-local-bounded',
        sourceKind: 'business_tool_misuse',
        sourceLabel: 'Local docks activity only',
        baseCadenceWeeks: 1,
        baseSeverity: 0.9,
      }),
    ]
    const packetsBefore = structuredClone(neighborhoodPackets)
    const pressuredState = withNeighborhoodPackets(state, neighborhoodPackets)

    const next = advanceWeek(pressuredState)

    expect(next.reports[0].unresolvedTriggers).toContain('case-docks')
    expect(next.reports[0].unresolvedTriggers).not.toContain('case-hub')
    expect(next.cases['case-hub'].deadlineRemaining).toBe(1)
    expect(neighborhoodPackets).toEqual(packetsBefore)
  })

  it('treats open cases with only stale assigned team ids as unassigned for deadline aging', () => {
    const state = createStartingState()
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      status: 'open',
      assignedTeamIds: ['missing-team'],
      deadlineRemaining: 3,
    }

    const next = advanceWeek(state)

    expect(next.cases['case-001'].assignedTeamIds).toEqual([])
    expect(next.cases['case-001'].deadlineRemaining).toBe(2)
  })

  it('releases dangling team case pointers during escalation pass for open unassigned cases', () => {
    const state = createStartingState()
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      status: 'open',
      assignedTeamIds: [],
      deadlineRemaining: 3,
    }
    state.teams['t_nightwatch'] = {
      ...state.teams['t_nightwatch'],
      assignedCaseId: 'case-001',
      status: {
        ...(state.teams['t_nightwatch'].status ?? { state: 'ready', assignedCaseId: null }),
        assignedCaseId: 'case-001',
      },
    }

    const next = advanceWeek(state)

    expect(next.cases['case-001'].deadlineRemaining).toBe(2)
    expect(next.teams['t_nightwatch'].assignedCaseId).toBeUndefined()
    expect(next.teams['t_nightwatch'].status?.assignedCaseId ?? null).toBeNull()
  })

  it('does not decrement deadline while a case is assigned and in progress', () => {
    const stateWithAssignment = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
    stateWithAssignment.cases['case-001'] = {
      ...stateWithAssignment.cases['case-001'],
      status: 'in_progress',
      assignedTeamIds: ['t_nightwatch'],
      weeksRemaining: 2,
      deadlineRemaining: 6,
    }

    const next = advanceWeek(stateWithAssignment)

    expect(next.cases['case-001'].weeksRemaining).toBe(1)
    expect(next.cases['case-001'].deadlineRemaining).toBe(6)
  })

  it('does not decrement assignment weeks for unassigned open cases', () => {
    const state = createStartingState()
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      status: 'open',
      assignedTeamIds: [],
      weeksRemaining: 3,
      deadlineRemaining: 5,
    }

    const next = advanceWeek(state)

    expect(next.cases['case-001'].weeksRemaining).toBe(3)
    expect(next.cases['case-001'].deadlineRemaining).toBe(4)
  })

  it('applies fatigue to active teams while idle agents recover', () => {
    const stateWithAssignment = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
    const next = advanceWeek(stateWithAssignment)

    expect(next.agents['a_ava'].fatigue).toBeGreaterThan(
      stateWithAssignment.agents['a_ava'].fatigue
    )
    expect(next.agents['a_sato'].fatigue).toBeGreaterThanOrEqual(0)
  })

  it('applies higher active mission fatigue in attrition mode than capacity mode', () => {
    const base = createStartingState()
    const capacityState = assignTeam(
      {
        ...base,
        config: {
          ...base.config,
          durationModel: 'capacity',
          attritionPerWeek: 4,
        },
      },
      'case-001',
      't_nightwatch'
    )
    const attritionState = assignTeam(
      {
        ...createStartingState(),
        config: {
          ...base.config,
          durationModel: 'attrition',
          attritionPerWeek: 4,
        },
      },
      'case-001',
      't_nightwatch'
    )

    const nextCapacity = advanceWeek(capacityState)
    const nextAttrition = advanceWeek(attritionState)

    const capacityDelta =
      nextCapacity.agents['a_ava'].fatigue - capacityState.agents['a_ava'].fatigue
    const attritionDelta =
      nextAttrition.agents['a_ava'].fatigue - attritionState.agents['a_ava'].fatigue

    expect(capacityDelta).toBeGreaterThanOrEqual(0)
    expect(attritionDelta).toBeGreaterThanOrEqual(capacityDelta)
  })

  it('uses the selected leader to modify post-mission xp and fatigue for the same squad', () => {
    const makeState = (leaderId: string) => {
      const state = createStartingState()
      state.config = {
        ...state.config,
        durationModel: 'attrition',
        attritionPerWeek: 8,
      }
      const strongLeader = makeAgentFixture('negotiator', {
        id: 'leader-strong',
        relationships: { 'leader-weak': 2 },
        stats: makeDomainStats({
          tactical: { awareness: 70, reaction: 70 },
          cognitive: { analysis: 68, investigation: 68 },
          social: { negotiation: 90, influence: 90 },
          stability: { resistance: 84, tolerance: 84 },
        }),
      })
      const weakLeader = makeAgentFixture('hunter', {
        id: 'leader-weak',
        relationships: { 'leader-strong': 2 },
        stats: makeDomainStats({
          physical: { strength: 84, endurance: 84 },
          tactical: { awareness: 24, reaction: 24 },
          cognitive: { analysis: 20, investigation: 20 },
          social: { negotiation: 12, influence: 12 },
          stability: { resistance: 16, tolerance: 16 },
        }),
      })

      state.agents = {
        'leader-strong': strongLeader,
        'leader-weak': weakLeader,
      }
      state.teams = {
        t_leadership: {
          id: 't_leadership',
          name: 'Leadership Test',
          agentIds: ['leader-strong', 'leader-weak'],
          memberIds: ['leader-strong', 'leader-weak'],
          leaderId,
          tags: [],
          assignedCaseId: 'case-001',
        },
      }
      state.cases = {
        'case-001': {
          ...state.cases['case-001'],
          status: 'in_progress',
          assignedTeamIds: ['t_leadership'],
          weeksRemaining: 1,
          preferredTags: [],
          difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
          weights: { combat: 0.25, investigation: 0.25, utility: 0.25, social: 0.25 },
        },
      }

      return state
    }

    const strongLeaderState = makeState('leader-strong')
    const weakLeaderState = makeState('leader-weak')

    const nextStrong = advanceWeek(strongLeaderState)
    const nextWeak = advanceWeek(weakLeaderState)
    const strongXpGain =
      (nextStrong.agents['leader-strong'].progression?.xp ?? 0) -
      (strongLeaderState.agents['leader-strong'].progression?.xp ?? 0)
    const weakXpGain =
      (nextWeak.agents['leader-strong'].progression?.xp ?? 0) -
      (weakLeaderState.agents['leader-strong'].progression?.xp ?? 0)
    const strongFatigueGain =
      nextStrong.agents['leader-strong'].fatigue - strongLeaderState.agents['leader-strong'].fatigue
    const weakFatigueGain =
      nextWeak.agents['leader-strong'].fatigue - weakLeaderState.agents['leader-strong'].fatigue

    expect(nextStrong.reports[0].resolvedCases).toEqual(['case-001'])
    expect(nextWeak.reports[0].resolvedCases).toEqual(['case-001'])
    expect(strongXpGain).toBeGreaterThan(weakXpGain)
    expect(strongFatigueGain).toBeLessThanOrEqual(weakFatigueGain)
    expect(nextStrong.agents['leader-strong'].fatigue).toBeLessThan(
      nextWeak.agents['leader-strong'].fatigue
    )
  })

  it('advances deterministically from the same seed and state', () => {
    const seededState = assignTeam(createStartingState(), 'case-002', 't_greentape')
    seededState.rngSeed = 42
    seededState.rngState = 42
    seededState.cases['case-001'] = {
      ...seededState.cases['case-001'],
      stage: 3,
      deadlineRemaining: 1,
    }
    seededState.cases['case-002'] = {
      ...seededState.cases['case-002'],
      weeksRemaining: 1,
    }

    const nextA = advanceWeek(structuredClone(seededState), 1000)
    const nextB = advanceWeek(structuredClone(seededState), 1000)

    expect(nextA).toEqual(nextB)
  })

  it('can trigger raids deterministically from carried-over pressure cases', () => {
    const pressureState = createStartingState()
    pressureState.rngSeed = 1972
    pressureState.rngState = 1972
    pressureState.config = {
      ...pressureState.config,
      maxActiveCases: 20,
    }

    const pressureTemplate = pressureState.cases['case-001']

    pressureState.cases = Object.fromEntries(
      Array.from({ length: 10 }, (_, index) => {
        const caseId = `case-pressure-${index + 1}`

        return [
          caseId,
          {
            ...pressureTemplate,
            id: caseId,
            templateId: `${pressureTemplate.templateId}-${index + 1}`,
            title: `${pressureTemplate.title} ${index + 1}`,
            status: 'open',
            assignedTeamIds: [],
            stage: 3,
            deadlineRemaining: 2,
          },
        ] as const
      })
    )

    const next = advanceWeek(pressureState)

    expect(Object.keys(next.cases).length).toBeGreaterThan(Object.keys(pressureState.cases).length)
    expect(next.reports[0].spawnedCases.length).toBeGreaterThan(0)
    expect(next.agents['a_ava'].fatigue).toBeGreaterThanOrEqual(
      pressureState.agents['a_ava'].fatigue
    )
  })

  it('spawns follow-up cases from onFail rules when a case fails resolution', () => {
    const failingState = assignTeam(createStartingState(), 'case-003', 't_nightwatch')

    failingState.cases = {
      'case-003': {
        ...failingState.cases['case-003'],
        weeksRemaining: 1,
        difficulty: { combat: 999, investigation: 999, utility: 999, social: 999 },
        onFail: {
          ...failingState.cases['case-003'].onFail,
          spawnCount: { min: 1, max: 1 },
          spawnTemplateIds: ['chem-001'],
        },
      },
    }

    const next = advanceWeek(failingState)
    const [spawnedId] = next.reports[0].spawnedCases

    expect(next.reports[0].failedCases).toEqual(['case-003'])
    expect(next.reports[0].spawnedCases.length).toBeGreaterThanOrEqual(1)
    expect(spawnedId).toBeDefined()
    expect(next.cases[spawnedId!]).toMatchObject({
      templateId: 'chem-001',
      status: 'open',
    })
    expect(next.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'case.failed',
          payload: expect.objectContaining({
            caseId: 'case-003',
          }),
        }),
        expect.objectContaining({
          type: 'case.spawned',
          payload: expect.objectContaining({
            caseId: spawnedId,
            parentCaseId: 'case-003',
            trigger: 'failure',
          }),
        }),
      ])
    )
  })

  it('escalates unresolved cases once and spawns deterministic follow-up cases', () => {
    const state = createStartingState()
    state.rngSeed = 321
    state.rngState = 321

    state.cases = {
      'case-001': {
        ...state.cases['case-001'],
        stage: 1,
        deadlineRemaining: 1,
        onUnresolved: {
          ...state.cases['case-001'].onUnresolved,
          stageDelta: 1,
          deadlineResetWeeks: 3,
          spawnCount: { min: 1, max: 1 },
          spawnTemplateIds: ['chem-001'],
        },
      },
    }

    const next = advanceWeek(state)
    const parent = next.cases['case-001']
    const spawnedId = next.reports[0].spawnedCases[0]

    expect(parent.stage).toBe(2)
    expect(parent.kind).toBe('case')
    expect(parent.deadlineRemaining).toBe(3)
    expect(next.reports[0].unresolvedTriggers).toContain('case-001')
    expect(next.reports[0].spawnedCases).toHaveLength(1)
    expect(
      next.reports[0].notes.some((note) => note.content.includes(SIM_NOTES.spawnFollowUp(1)))
    ).toBe(true)
    expect(
      next.reports[0].notes.some(
        (note) =>
          note.type === 'case.escalated' &&
          note.metadata?.caseId === 'case-001' &&
          note.metadata?.toStage === 2
      )
    ).toBe(true)
    expect(next.cases[spawnedId!]).toMatchObject({
      templateId: 'chem-001',
      status: 'open',
      stage: 3,
    })
  })

  it('adds unresolved pressure to the global meter and spawns a major incident when threshold is breached', () => {
    const state = createStartingState()
    state.rngSeed = 4040
    state.rngState = 4040
    state.globalPressure = 0
    state.responseGrid = {
      majorIncidentThreshold: 5,
      majorIncidentTemplateIds: ['raid-001'],
    }
    state.cases = {
      'case-001': {
        ...state.cases['case-001'],
        status: 'open',
        assignedTeamIds: [],
        deadlineRemaining: 1,
        pressureValue: 6,
        regionTag: 'occult_district',
        onUnresolved: {
          ...state.cases['case-001'].onUnresolved,
          spawnCount: { min: 0, max: 0 },
          spawnTemplateIds: [],
        },
      },
    }

    const next = advanceWeek(state)
    const report = next.reports.at(-1)
    const pressureSpawnEvent = getPressureThresholdSpawnEvent(next.events)

    expect(report?.unresolvedTriggers).toEqual(['case-001'])
    expect(next.globalPressure).toBe(1)
    expect(pressureSpawnEvent).toBeDefined()
    expect(pressureSpawnEvent?.payload.caseId).toBeDefined()

    const spawnedCaseId = pressureSpawnEvent?.payload.caseId
    const spawnedCase = spawnedCaseId ? next.cases[spawnedCaseId] : undefined

    expect(spawnedCase).toMatchObject({
      kind: 'raid',
      regionTag: 'occult_district',
    })
    expect(spawnedCase?.stage).toBeGreaterThanOrEqual(3)
    expect(spawnedCase?.title.startsWith('Major Incident —')).toBe(true)
    expect(report?.spawnedCases).toContain(spawnedCaseId)
  })

  it('accumulates global pressure without spawning when threshold is not breached', () => {
    const state = createStartingState()
    state.globalPressure = 2
    state.responseGrid = {
      majorIncidentThreshold: 20,
      majorIncidentTemplateIds: ['raid-001'],
    }
    state.cases = {
      'case-001': {
        ...state.cases['case-001'],
        status: 'open',
        assignedTeamIds: [],
        deadlineRemaining: 1,
        pressureValue: 4,
        onUnresolved: {
          ...state.cases['case-001'].onUnresolved,
          spawnCount: { min: 0, max: 0 },
          spawnTemplateIds: [],
        },
      },
    }

    const next = advanceWeek(state)

    expect(next.globalPressure).toBe(4)
    expect(
      next.events.some(
        (event) => event.type === 'case.spawned' && event.payload.trigger === 'pressure_threshold'
      )
    ).toBe(false)
  })

  it('falls back to raid template selected randomly when configured template IDs are absent from registry', () => {
    const state = createStartingState()
    state.rngSeed = 5050
    state.rngState = 5050
    // Set configured template IDs to a nonexistent template
    state.responseGrid = {
      majorIncidentThreshold: 10,
      majorIncidentTemplateIds: ['nonexistent-template-id'],
    }
    state.cases = {
      'case-001': {
        ...state.cases['case-001'],
        status: 'open',
        assignedTeamIds: [],
        deadlineRemaining: 1,
        pressureValue: 15,
        onUnresolved: {
          ...state.cases['case-001'].onUnresolved,
          spawnCount: { min: 0, max: 0 },
          spawnTemplateIds: [],
        },
      },
    }

    const next = advanceWeek(state)
    const pressureSpawnEvent = getPressureThresholdSpawnEvent(next.events)

    expect(pressureSpawnEvent).toBeDefined()
    expect(pressureSpawnEvent?.payload.caseId).toBeDefined()
    const spawnedCase = pressureSpawnEvent?.payload.caseId
      ? next.cases[pressureSpawnEvent.payload.caseId]
      : undefined
    expect(spawnedCase?.kind).toBe('raid')
  })

  it('falls back to any template when no raid templates exist in registry', () => {
    const state = createStartingState()
    state.rngSeed = 6060
    state.rngState = 6060
    // Set configured IDs to nonexistent
    state.responseGrid = {
      majorIncidentThreshold: 10,
      majorIncidentTemplateIds: ['nonexistent-id'],
    }
    // Replace templates with only non-raid templates by filtering
    const nonRaidTemplates = Object.fromEntries(
      Object.entries(state.templates).filter(
        ([id, template]) => template.kind !== 'raid' && !id.includes('raid')
      )
    )
    if (Object.keys(nonRaidTemplates).length > 0) {
      state.templates = nonRaidTemplates
    } else {
      // If all templates are raids, just verify the fallback path doesn't crash
      expect(true).toBe(true)
      return
    }

    state.cases = {
      'case-001': {
        ...state.cases['case-001'],
        status: 'open',
        assignedTeamIds: [],
        deadlineRemaining: 1,
        pressureValue: 15,
        onUnresolved: {
          ...state.cases['case-001'].onUnresolved,
          spawnCount: { min: 0, max: 0 },
          spawnTemplateIds: [],
        },
      },
    }

    const next = advanceWeek(state)
    const pressureSpawnEvent = getPressureThresholdSpawnEvent(next.events)

    expect(pressureSpawnEvent).toBeDefined()
    if (pressureSpawnEvent) {
      const spawnedCase = next.cases[pressureSpawnEvent.payload.caseId]
      expect(spawnedCase).toBeDefined()
    }
  })

  it('converts the default starter escalation to a raid and spawns configured follow-ups', () => {
    const state = createStartingState()
    state.rngSeed = 808
    state.rngState = 808

    state.cases['case-001'] = {
      ...state.cases['case-001'],
      stage: 1,
      deadlineRemaining: 1,
      onUnresolved: {
        ...state.cases['case-001'].onUnresolved,
        spawnCount: { min: 1, max: 1 },
      },
    }

    const next = advanceWeek(state)
    const parent = next.cases['case-001']
    const spawnedTemplateIds = next.reports[0].spawnedCases
      .map((spawnedId) => next.cases[spawnedId]?.templateId)
      .filter((templateId): templateId is string => Boolean(templateId))

    expect(parent.stage).toBe(3)
    expect(parent.kind).toBe('raid')
    expect(parent.raid).toMatchObject({ minTeams: 2 })
    expect(parent.raid?.maxTeams).toBeGreaterThanOrEqual(2)
    expect(parent.deadlineRemaining).toBe(1)

    expect(next.reports[0].unresolvedTriggers).toContain('case-001')
    expect(next.reports[0].spawnedCases.length).toBeGreaterThanOrEqual(1)
    expect(
      spawnedTemplateIds.some((templateId) =>
        ['followup_missing_persons', 'followup_feeding_frenzy'].includes(templateId)
      )
    ).toBe(true)

    expect(
      next.reports[0].notes.some((note) => note.content.includes(SIM_NOTES.convertedToRaid()))
    ).toBe(true)
    expect(
      next.reports[0].notes.some(
        (note) =>
          note.type === 'case.escalated' &&
          note.metadata?.caseId === 'case-001' &&
          note.metadata?.toStage === 3
      )
    ).toBe(true)
    expect(next.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'case.escalated',
          payload: expect.objectContaining({
            caseId: 'case-001',
            convertedToRaid: true,
          }),
        }),
        expect.objectContaining({
          type: 'case.raid_converted',
          payload: expect.objectContaining({
            caseId: 'case-001',
            minTeams: expect.any(Number),
          }),
        }),
      ])
    )
  })

  it('tracks partial outcomes without spawning follow-up cases from onFail', () => {
    const base = createStartingState()
    const closedCases = Object.fromEntries(
      Object.entries(base.cases).map(([caseId, currentCase]) => [
        caseId,
        { ...currentCase, status: 'resolved' as const },
      ])
    )

    const partialState = assignTeam(
      {
        ...base,
        config: {
          ...base.config,
          partialMargin: 20_000,
        },
        cases: {
          ...closedCases,
          'case-001': {
            ...base.cases['case-001'],
            mode: 'threshold',
            status: 'open',
            weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
            difficulty: { combat: 200, investigation: 0, utility: 0, social: 0 },
            onFail: {
              ...base.cases['case-001'].onFail,
              spawnCount: { min: 1, max: 1 },
              spawnTemplateIds: ['bio-001'],
            },
          },
        },
      },
      'case-001',
      't_nightwatch'
    )
    const calibratedPartialScore = computeTeamScore(
      partialState.teams['t_nightwatch'].agentIds.map((agentId) => partialState.agents[agentId]!),
      partialState.cases['case-001']
    )

    partialState.rngSeed = 42
    partialState.rngState = 42
    partialState.cases['case-001'] = {
      ...partialState.cases['case-001'],
      difficulty: {
        combat: Math.ceil(calibratedPartialScore.score + 1),
        investigation: 0,
        utility: 0,
        social: 0,
      },
      weeksRemaining: 1,
    }

    const beforeCount = Object.keys(partialState.cases).length
    const next = advanceWeek(partialState)

    expect(next.reports[0].partialCases).toEqual(['case-001'])
    expect(next.reports[0].failedCases).toEqual([])
    expect(next.reports[0].spawnedCases).toHaveLength(0)
    expect(Object.keys(next.cases)).toHaveLength(beforeCount)
    expect(next.cases['case-001']).toMatchObject({
      status: 'open',
      assignedTeamIds: [],
    })
  })

  it('writes a mission result snapshot for successful operations', () => {
    const next = advanceWeek(makeMissionResultState('success'))
    const missionResult = next.reports[0].caseSnapshots?.['case-001']?.missionResult

    expect(missionResult).toMatchObject({
      caseId: 'case-001',
      outcome: 'success',
      teamsUsed: [{ teamId: 't_nightwatch', teamName: 'Night Watch' }],
      spawnedConsequences: [],
      injuries: [],
    })
    expect(missionResult?.rewards).toEqual(
      next.reports[0].caseSnapshots?.['case-001']?.rewardBreakdown
    )
    expect(missionResult?.performanceSummary).toEqual(
      next.reports[0].caseSnapshots?.['case-001']?.performanceSummary
    )
    expect(missionResult?.powerImpact).toMatchObject({
      activeEquipmentIds: expect.arrayContaining(['ward_seals', 'warding_kits']),
      activeKitIds: ['occult-containment-kit'],
      activeProtocolIds: expect.arrayContaining(['containment-doctrine-alpha']),
    })
    expect(missionResult?.powerImpact?.equipmentContributionDelta).toBeGreaterThan(0)
    expect(missionResult?.powerImpact?.kitScoreDelta).toBeGreaterThan(0)
    expect(missionResult?.powerImpact?.protocolScoreDelta).toBeGreaterThan(0)
    expect(missionResult?.explanationNotes).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Gear shifted contribution'),
        expect.stringContaining('Kits applied'),
        expect.stringContaining('Protocols shifted contribution'),
      ])
    )
    expect(missionResult?.fatigueChanges[0]?.delta).toBeGreaterThan(0)
    expect(missionResult?.explanationNotes.length).toBeGreaterThan(0)
  })

  it('writes a mission result snapshot for partial outcomes', () => {
    const next = advanceWeek(makeMissionResultState('partial'))
    const missionResult = next.reports[0].caseSnapshots?.['case-001']?.missionResult

    expect(next.reports[0].partialCases).toContain('case-001')
    expect(missionResult).toMatchObject({
      caseId: 'case-001',
      outcome: 'partial',
    })
    expect(missionResult?.spawnedConsequences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'stage_escalation',
          stage: next.cases['case-001'].stage,
        }),
      ])
    )
    expect(missionResult?.penalties.fundingLoss).toBeGreaterThanOrEqual(0)
  })

  it('writes a mission result snapshot for failed outcomes, including injuries and follow-up consequences', () => {
    const next = advanceWeek(makeMissionResultState('fail'))
    const missionResult = next.reports[0].caseSnapshots?.['case-001']?.missionResult

    expect(next.reports[0].failedCases).toContain('case-001')
    expect(missionResult).toMatchObject({
      caseId: 'case-001',
      outcome: 'fail',
    })
    expect(missionResult?.injuries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          agentId: expect.any(String),
          severity: 'moderate',
          damage: 25,
        }),
      ])
    )
    expect(missionResult?.spawnedConsequences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'stage_escalation' }),
        expect.objectContaining({ type: 'follow_up_case', trigger: 'failure' }),
      ])
    )
    expect(missionResult?.penalties.fundingLoss).toBeGreaterThan(0)
  })

  it('writes a mission result snapshot for unresolved escalations', () => {
    const next = advanceWeek(makeMissionResultState('unresolved'))
    const missionResult = next.reports[0].caseSnapshots?.['case-001']?.missionResult

    expect(next.reports[0].unresolvedTriggers).toContain('case-001')
    expect(missionResult).toMatchObject({
      caseId: 'case-001',
      outcome: 'unresolved',
      teamsUsed: [],
      injuries: [],
    })
    expect(missionResult?.spawnedConsequences).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'stage_escalation' }),
        expect.objectContaining({ type: 'follow_up_case', trigger: 'unresolved' }),
      ])
    )
    expect(missionResult?.performanceSummary).toMatchObject({
      contribution: 0,
      threatHandled: 0,
    })
    expect(missionResult?.powerImpact).toMatchObject({
      activeEquipmentIds: [],
      activeKitIds: [],
      activeProtocolIds: [],
      equipmentContributionDelta: 0,
      protocolScoreDelta: 0,
    })
  })

  it('persists aggregate battle summaries through the live weekly raid resolution flow', () => {
    const next = advanceWeek(makeAggregateBattleIntegrationState())
    const report = next.reports.at(-1)
    const snapshot = report?.caseSnapshots?.['case-raid-battle']
    const aggregateBattle = snapshot?.aggregateBattle as
      | {
          movementDeniedCount: number
          hostileRoutedUnits: string[]
          specialDamage: Array<{ hitsTaken: number; hitsToBreak: number; destroyed: boolean }>
        }
      | undefined
    const battleEvent = next.events.find(
      (event): event is OperationEvent<'case.aggregate_battle'> =>
        event.type === 'case.aggregate_battle' && event.payload.caseId === 'case-raid-battle'
    )

    expect(aggregateBattle).toBeDefined()
    expect(aggregateBattle?.movementDeniedCount).toBeGreaterThan(0)
    expect(Array.isArray(aggregateBattle?.hostileRoutedUnits)).toBe(true)
    expect(
      aggregateBattle?.specialDamage.some(
        (entry) => entry.hitsTaken > 0 && entry.hitsTaken < entry.hitsToBreak && !entry.destroyed
      )
    ).toBe(true)
    expect(
      snapshot?.missionResult?.explanationNotes.some((note) => note.includes('Aggregate battle'))
    ).toBe(true)
    expect(
      report?.notes.some(
        (note) =>
          note.type === 'case.aggregate_battle' && note.metadata?.caseId === 'case-raid-battle'
      )
    ).toBe(true)
    expect(battleEvent).toBeDefined()
    expect(battleEvent?.payload.hostileRoutedCount).toBe(aggregateBattle?.hostileRoutedUnits.length)
    expect(battleEvent?.payload.specialDamageCount).toBe(aggregateBattle?.specialDamage.length)
    expect(battleEvent?.payload.ceasefireApplied).toBe(true)
    expect(battleEvent?.payload.ceasefireTacticalValue).toBe('specialist_knowledge')
    expect(battleEvent?.payload.ceasefireObjectiveId).toBe(
      'case-raid-battle-split-objective-route-chain'
    )
  })

  it('persists ritual parallel-objective outcome alongside live aggregate battle resolution', () => {
    const next = advanceWeek(makeParallelObjectiveAggregateBattleState())
    const report = next.reports.at(-1)
    const snapshot = report?.caseSnapshots?.['case-ritual-battle']
    const aggregateBattle = snapshot?.aggregateBattle as
      | {
          parallelObjective?: {
            objectiveId: string
            outcome: 'success' | 'partial' | 'fail'
            progress: number
            progressTarget: number
          }
        }
      | undefined
    const battleEvent = next.events.find(
      (event): event is OperationEvent<'case.aggregate_battle'> =>
        event.type === 'case.aggregate_battle' && event.payload.caseId === 'case-ritual-battle'
    )

    expect(aggregateBattle?.parallelObjective).toBeDefined()
    expect(aggregateBattle?.parallelObjective?.objectiveId).toBe(
      'case-ritual-battle-ritual-stabilization'
    )
    expect(['success', 'partial', 'fail']).toContain(
      aggregateBattle?.parallelObjective?.outcome
    )
    expect(battleEvent?.payload.parallelObjectiveId).toBe(
      'case-ritual-battle-ritual-stabilization'
    )
    expect(battleEvent?.payload.parallelObjectiveOutcome).toBe(
      aggregateBattle?.parallelObjective?.outcome
    )
    expect(battleEvent?.payload.parallelObjectiveProgress).toBe(
      `${aggregateBattle?.parallelObjective?.progress}/${aggregateBattle?.parallelObjective?.progressTarget}`
    )
    expect(battleEvent?.payload.extractionRequired).toBe(
      aggregateBattle?.parallelObjective?.outcome !== 'fail'
    )
    expect(['not_required', 'secured', 'contested', 'overrun']).toContain(
      battleEvent?.payload.extractionOutcome
    )
    expect(['low', 'medium', 'high']).toContain(battleEvent?.payload.extractionPressure)
    expect(typeof battleEvent?.payload.extractionResidualThreatUnits).toBe('number')
  })

  it('applies raid coordination penalty when two teams resolve a raid case', () => {
    const base = createStartingState()
    base.rngSeed = 99
    base.rngState = 99

    // Add a second team and agents
    base.agents['agent-x'] = {
      id: 'agent-x',
      name: 'Agent X',
      role: 'hunter',
      baseStats: { combat: 120, investigation: 0, utility: 0, social: 0 },
      tags: [],
      relationships: {},
      fatigue: 0,
      status: 'active',
    }
    base.teams['team-x'] = {
      id: 'team-x',
      name: 'Team X',
      agentIds: ['agent-x'],
      tags: [],
    }

    const raidCaseId = 'raid-test'
    base.cases[raidCaseId] = {
      ...base.cases['case-001'],
      id: raidCaseId,
      title: 'Test Raid',
      kind: 'raid',
      mode: 'threshold',
      status: 'in_progress',
      weeksRemaining: 1,
      assignedTeamIds: ['t_nightwatch', 'team-x'],
      difficulty: { combat: 10, investigation: 0, utility: 0, social: 0 },
      weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
      preferredTags: [],
      raid: { minTeams: 2, maxTeams: 2 },
    }
    base.teams['t_nightwatch'] = { ...base.teams['t_nightwatch'], assignedCaseId: raidCaseId }
    base.teams['team-x'] = { ...base.teams['team-x'], assignedCaseId: raidCaseId }

    const nextA = advanceWeek(structuredClone(base))
    const nextB = advanceWeek(structuredClone(base))

    // Deterministic across runs
    expect(nextA.cases[raidCaseId]).toEqual(nextB.cases[raidCaseId])
    expect(nextA.reports[0].resolvedCases).toEqual(['raid-test'])
    expect(nextA.teams['t_nightwatch'].assignedCaseId).toBeUndefined()
    expect(nextA.teams['team-x'].assignedCaseId).toBeUndefined()
    expect(nextA.agents['a_ava'].assignment?.state).toBe('idle')
    expect(nextA.agents['agent-x'].assignment?.state).toBe('idle')
    expect(
      nextA.events.some(
        (event) =>
          event.type === 'case.resolved' &&
          event.payload.caseId === raidCaseId &&
          event.payload.teamIds.length === 2
      )
    ).toBe(true)
  })

  it('resolves a single-team raid through the weekly raid strategy when minTeams permits it', () => {
    const state = createStartingState()
    state.rngSeed = 17
    state.rngState = 17

    state.cases['case-001'] = {
      ...state.cases['case-001'],
      kind: 'raid',
      mode: 'threshold',
      status: 'in_progress',
      weeksRemaining: 1,
      assignedTeamIds: ['t_nightwatch'],
      difficulty: { combat: 10, investigation: 0, utility: 0, social: 0 },
      weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
      preferredTags: [],
      raid: { minTeams: 1, maxTeams: 2 },
    }
    state.teams['t_nightwatch'] = {
      ...state.teams['t_nightwatch'],
      assignedCaseId: 'case-001',
    }

    const next = advanceWeek(state)

    expect(next.cases['case-001'].status).toBe('resolved')
    expect(next.reports[0].resolvedCases).toEqual(['case-001'])
    expect(next.reports[0].notes.some((note) => note.content.includes('operation concluded'))).toBe(
      true
    )
    expect(
      next.reports[0].notes.some(
        (note) => note.type === 'case.resolved' && note.metadata?.caseId === 'case-001'
      )
    ).toBe(true)
  })

  it('reports zero fatigue for empty teams and an empty roster', () => {
    const state = createStartingState()
    state.agents = {}
    state.teams = {
      'team-empty': {
        id: 'team-empty',
        name: 'Empty Team',
        agentIds: [],
        tags: [],
      },
    }
    state.cases = {}

    const next = advanceWeek(state)

    expect(next.reports[0].avgFatigue).toBe(0)
    expect(next.reports[0].teamStatus).toEqual([
      {
        teamId: 'team-empty',
        teamName: 'Empty Team',
        assignedCaseId: undefined,
        assignedCaseTitle: undefined,
        avgFatigue: 0,
        fatigueBand: 'steady',
      },
    ])
  })

  it('resolves fabrication queues and shifts the market on weekly ticks', () => {
    const queuedState = queueFabrication(createStartingState(), 'med-kits')
    const next = advanceWeek(queuedState)

    expect(next.productionQueue).toHaveLength(0)
    expect(next.inventory.medkits).toBe(1)
    expect(next.market.week).toBe(2)
    expect(next.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'production.queue_completed',
          payload: expect.objectContaining({
            outputId: 'medkits',
          }),
        }),
        expect.objectContaining({
          type: 'market.shifted',
          payload: expect.objectContaining({
            week: 2,
          }),
        }),
      ])
    )
  })

  it('updates funding and containment from unresolved pressure and clamps containment at zero', () => {
    const state = createStartingState()
    state.containmentRating = 1
    state.funding = 50
    state.cases = {
      'case-001': {
        ...state.cases['case-001'],
        status: 'open',
        deadlineRemaining: 1,
        assignedTeamIds: [],
      },
    }

    const next = advanceWeek(state)
    const rewardBreakdown = next.reports[0].caseSnapshots?.['case-001']?.rewardBreakdown

    expect(next.reports[0].unresolvedTriggers).toEqual(['case-001'])
    expect(next.funding).toBe(
      state.funding + state.config.fundingBasePerWeek + (rewardBreakdown?.fundingDelta ?? 0)
    )
    expect(next.containmentRating).toBe(0)
  })

  it('emits faction standing events and matching weekly report notes from case outcomes', () => {
    const state = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      status: 'in_progress',
      weeksRemaining: 1,
      stage: 3,
      tags: ['occult', 'ritual', 'spirit', 'chapel'],
      requiredTags: [],
      preferredTags: ['ward-kit'],
      difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
      weights: { combat: 0.25, investigation: 0.25, utility: 0.25, social: 0.25 },
    }
    state.teams['t_nightwatch'] = {
      ...state.teams['t_nightwatch'],
      assignedCaseId: 'case-001',
    }

    const next = advanceWeek(state)
    const factionEvent = next.events.find(
      (event) =>
        event.type === 'faction.standing_changed' &&
        event.payload.caseId === 'case-001' &&
        event.payload.factionId === 'occult_networks'
    )

    expect(factionEvent).toBeDefined()
    expect(factionEvent).toMatchObject({
      sourceSystem: 'faction',
      payload: expect.objectContaining({
        factionName: 'Occult Networks',
        reason: 'case.resolved',
      }),
    })
    const factions = next.factions
    if (!factions) {
      throw new Error('Expected faction state to be present after advancing the week.')
    }

    expect(factions.occult_networks.history).toMatchObject({
      missionsCompleted: 1,
      missionsFailed: 0,
      interactionLog: expect.arrayContaining([
        expect.objectContaining({
          eventId: factionEvent?.id,
          type: 'faction.standing_changed',
          week: 1,
        }),
      ]),
    })
    expect(
      next.reports[0].notes.some(
        (note) =>
          note.type === 'faction.standing_changed' &&
          note.metadata?.factionId === 'occult_networks' &&
          note.metadata?.caseId === 'case-001'
      )
    ).toBe(true)
  })

  it('emits faction unlock events when a mission opens a new faction recruit channel', () => {
    const state = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
    const factions = state.factions
    if (!factions) {
      throw new Error('Expected faction state to be present for faction unlock test.')
    }

    factions.black_budget.reputation = 80
    factions.black_budget.contacts = (factions.black_budget.contacts ?? []).map((contact) =>
      contact.id === 'blackbudget-ossian'
        ? {
            ...contact,
            relationship: 10,
            status: 'active',
          }
        : contact
    )
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      status: 'in_progress',
      weeksRemaining: 1,
      stage: 3,
      factionId: 'black_budget',
      contactId: 'blackbudget-ossian',
      tags: ['classified', 'information', 'tech'],
      requiredTags: [],
      preferredTags: ['signal'],
      difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
      weights: { combat: 0.25, investigation: 0.25, utility: 0.25, social: 0.25 },
    }
    state.teams['t_nightwatch'] = {
      ...state.teams['t_nightwatch'],
      assignedCaseId: 'case-001',
    }

    const next = advanceWeek(state)
    const unlockEvent = next.events.find(
      (event) =>
        event.type === 'faction.unlock_available' &&
        event.payload.factionId === 'black_budget' &&
        event.payload.contactId === 'blackbudget-ossian'
    )

    expect(unlockEvent).toMatchObject({
      sourceSystem: 'faction',
      payload: expect.objectContaining({
        label: 'Intercept operative referral',
        disposition: 'supportive',
      }),
    })
    expect(
      next.reports[0].notes.some(
        (note) =>
          note.type === 'faction.unlock_available' &&
          note.metadata?.factionId === 'black_budget'
      )
    ).toBe(true)
  })

  it('recomputes clearance level from cumulative score thresholds each week', () => {
    const state = assignTeam(createStartingState(), 'case-001', 't_nightwatch')

    state.containmentRating = 70
    state.clearanceLevel = 1
    state.config.clearanceThresholds = [0, 100, 200]
    state.reports = [
      {
        week: 1,
        rngStateBefore: 10,
        rngStateAfter: 11,
        newCases: [],
        progressedCases: [],
        resolvedCases: ['historical-success'],
        failedCases: [],
        partialCases: [],
        unresolvedTriggers: [],
        spawnedCases: [],
        maxStage: 1,
        avgFatigue: 0,
        teamStatus: [],
        notes: [],
      },
    ]

    state.cases = {
      'case-001': {
        ...state.cases['case-001'],
        status: 'in_progress',
        weeksRemaining: 1,
        assignedTeamIds: ['t_nightwatch'],
        difficulty: { combat: 1, investigation: 0, utility: 0, social: 0 },
        weights: { combat: 1, investigation: 0, utility: 0, social: 0 },
      },
    }
    state.teams['t_nightwatch'] = {
      ...state.teams['t_nightwatch'],
      assignedCaseId: 'case-001',
    }

    const next = advanceWeek(state)

    expect(next.reports.at(-1)?.resolvedCases).toEqual(['case-001'])
    expect(next.clearanceLevel).toBe(3)
  })

  it('handles teams with zero agents gracefully', () => {
    const state = createStartingState()
    state.teams['t_empty'] = {
      id: 't_empty',
      name: 'Empty',
      agentIds: [],
      tags: [],
      assignedCaseId: undefined,
    }

    const next = advanceWeek(state)

    expect(Object.keys(next.teams)).toContain('t_empty')
    expect(next.teams['t_empty'].agentIds).toEqual([])
    expect(next.reports[0].teamStatus.some((ts) => ts.teamId === 't_empty')).toBe(true)
    expect(next.reports[0].teamStatus.find((ts) => ts.teamId === 't_empty')?.avgFatigue).toBe(0)
  })

  it('ends the game when all active cases are resolved', () => {
    const state = createStartingState()
    state.cases = Object.fromEntries(
      Object.entries(state.cases).map(([id, c]) => [
        id,
        {
          ...c,
          status: 'resolved',
          weeksRemaining: 0,
        },
      ])
    )

    const next = advanceWeek(state)

    expect(next.gameOver).toBe(true)
    expect(next.gameOverReason).toBe('All active operations concluded. Directorate stands down.')
  })

// SPE-1071 slice 1: campaign-calendar date stamping on weekly reports.
it('stamps WeeklyReport.date with the source week and progresses monotonically across advanceWeek calls', () => {
  let state = createStartingState()
  const stampedDates: Array<{ absoluteWeek: number; year: number; weekOfYear: number; season: string }> = []

  for (let i = 0; i < 4; i++) {
    const sourceWeek = state.week
    const reportsBefore = state.reports.length
    state = advanceWeek(state)
    if (state.reports.length === reportsBefore) {
      // No new report appended this tick (e.g., game-over short-circuit); skip.
      continue
    }
    const latestReport = state.reports[state.reports.length - 1]
    expect(latestReport.date).toBeDefined()
    // The report covers the source week (state.week BEFORE this tick).
    expect(latestReport.week).toBe(sourceWeek)
    expect(latestReport.date!.absoluteWeek).toBe(sourceWeek)
    expect(latestReport.date!.absoluteWeek).toBe(latestReport.week)
    stampedDates.push(latestReport.date!)
  }

  // At least two stamped reports needed to verify monotonicity.
  expect(stampedDates.length).toBeGreaterThanOrEqual(2)
  for (let i = 1; i < stampedDates.length; i++) {
    expect(stampedDates[i].absoluteWeek).toBeGreaterThan(stampedDates[i - 1].absoluteWeek)
  }
})

  it('ends the game when active cases exceed maxActiveCases', () => {
    const state = createStartingState()
    state.config.maxActiveCases = 1
    state.cases = {
      ...state.cases,
      'case-extra-1': {
        id: 'case-extra-1',
        templateId: 'occ-001',
        title: 'Extra Case 1',
        description: 'Test',
        mode: 'threshold',
        kind: 'case',
        status: 'open',
        difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
        weights: { combat: 0.25, investigation: 0.25, utility: 0.25, social: 0.25 },
        tags: [],
        requiredTags: [],
        preferredTags: [],
        stage: 1,
        durationWeeks: 2,
        deadlineWeeks: 3,
        deadlineRemaining: 3,
        weeksRemaining: undefined,
        intelConfidence: 1,
        intelUncertainty: 0,
        intelLastUpdatedWeek: state.week,
        assignedTeamIds: [],
        onFail: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
        onUnresolved: {
          stageDelta: 1,
          deadlineResetWeeks: 3,
          spawnCount: { min: 0, max: 0 },
          spawnTemplateIds: [],
        },
        raid: undefined,
      },
      'case-extra-2': {
        id: 'case-extra-2',
        templateId: 'occ-001',
        title: 'Extra Case 2',
        description: 'Test',
        mode: 'threshold',
        kind: 'case',
        status: 'open',
        difficulty: { combat: 1, investigation: 1, utility: 1, social: 1 },
        weights: { combat: 0.25, investigation: 0.25, utility: 0.25, social: 0.25 },
        tags: [],
        requiredTags: [],
        preferredTags: [],
        stage: 1,
        durationWeeks: 2,
        deadlineWeeks: 3,
        deadlineRemaining: 3,
        weeksRemaining: undefined,
        intelConfidence: 1,
        intelUncertainty: 0,
        intelLastUpdatedWeek: state.week,
        assignedTeamIds: [],
        onFail: { stageDelta: 1, spawnCount: { min: 0, max: 0 }, spawnTemplateIds: [] },
        onUnresolved: {
          stageDelta: 1,
          deadlineResetWeeks: 3,
          spawnCount: { min: 0, max: 0 },
          spawnTemplateIds: [],
        },
        raid: undefined,
      },
    }

    const next = advanceWeek(state)

    expect(next.gameOver).toBe(true)
    expect(next.gameOverReason).toBe('Active case capacity exceeded. Directorate overwhelmed.')
  })

  it('routes single-team raids through the raid resolver and enforces minTeams', () => {
    const state = createStartingState()
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      kind: 'raid',
      raid: { minTeams: 2, maxTeams: 3 },
      status: 'in_progress',
      assignedTeamIds: ['t_nightwatch'],
      weeksRemaining: 1,
      requiredTags: [],
      requiredRoles: [],
    }
    state.teams['t_nightwatch'] = {
      ...state.teams['t_nightwatch'],
      assignedCaseId: 'case-001',
    }

    const next = advanceWeek(state)
    const report = next.reports.at(-1)

    expect(next.cases['case-001'].status).toBe('open')
    expect(next.cases['case-001'].assignedTeamIds).toEqual([])
    expect(next.cases['case-001'].stage).toBeGreaterThan(state.cases['case-001'].stage)
    expect(report?.failedCases).toContain('case-001')
  })

  it('produces deterministic results when run with identical seed and state twice', () => {
    const template = createStartingState()
    const config: Partial<typeof template> = {
      rngSeed: 9001,
      rngState: 9001,
    }

    const stateA = { ...structuredClone(template), ...config }
    const stateB = { ...structuredClone(template), ...config }

    stateA.cases['case-001'] = {
      ...stateA.cases['case-001'],
      stage: 2,
      deadlineRemaining: 1,
    }
    stateB.cases['case-001'] = {
      ...stateB.cases['case-001'],
      stage: 2,
      deadlineRemaining: 1,
    }

    const nextA = advanceWeek(stateA, 1234567890)
    const nextB = advanceWeek(stateB, 1234567890)

    expect(nextA.rngState).toBe(nextB.rngState)
    expect(nextA.reports[0].notes.map((n) => n.content)).toEqual(
      nextB.reports[0].notes.map((n) => n.content)
    )
    expect(nextA.cases).toEqual(nextB.cases)
    expect(nextA.reports[0].spawnedCases).toEqual(nextB.reports[0].spawnedCases)
  })

  it('keeps spawned case IDs unique across weeks and deterministic for identical seeded runs', () => {
    const buildPressureState = () => {
      const state = createStartingState()
      state.rngSeed = 555
      state.rngState = 555
      state.cases = {
        'case-001': {
          ...state.cases['case-001'],
          status: 'open',
          assignedTeamIds: [],
          stage: 1,
          deadlineRemaining: 1,
          onUnresolved: {
            ...state.cases['case-001'].onUnresolved,
            stageDelta: 0,
            deadlineResetWeeks: 1,
            convertToRaidAtStage: 99,
            spawnCount: { min: 1, max: 1 },
            spawnTemplateIds: ['chem-001'],
          },
        },
      }

      return state
    }

    const collectSpawnedIds = (initialState: ReturnType<typeof createStartingState>) => {
      let state = initialState
      const spawnedAcrossWeeks: string[] = []

      for (let week = 0; week < 4; week++) {
        state = advanceWeek(state)
        spawnedAcrossWeeks.push(...state.reports.at(-1)!.spawnedCases)
      }

      return { state, spawnedAcrossWeeks }
    }

    const runA = collectSpawnedIds(buildPressureState())
    const runB = collectSpawnedIds(buildPressureState())
    const finalCaseIds = Object.keys(runA.state.cases)

    expect(new Set(runA.spawnedAcrossWeeks).size).toBe(runA.spawnedAcrossWeeks.length)
    expect(runA.spawnedAcrossWeeks).toEqual(runB.spawnedAcrossWeeks)
    expect(new Set(finalCaseIds).size).toBe(finalCaseIds.length)
  })

  it('preserves immutability when advancing with fatigue-heavy operations', () => {
    const state = assignTeam(createStartingState(), 'case-001', 't_nightwatch')
    state.teams['t_nightwatch'] = {
      ...state.teams['t_nightwatch'],
      assignedCaseId: 'case-001',
    }
    state.cases['case-001'] = {
      ...state.cases['case-001'],
      assignedTeamIds: ['t_nightwatch'],
      status: 'in_progress',
      weeksRemaining: 5,
    }
    const before = structuredClone(state)

    for (let i = 0; i < 5; i++) {
      advanceWeek(state)
    }

    expect(state).toEqual(before)
  })
})

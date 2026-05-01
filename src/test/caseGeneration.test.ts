// cspell:words cryptid
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  buildCaseGenerationProfile,
  classifyEncounterType,
  generateAmbientCases,
} from '../domain/caseGeneration'
import {
  createCompactCivicAuthorityConsequencePacket,
  deriveCivicAuthorityConsequencePacketsFromRuntimeEvents,
} from '../domain/civicConsequenceNetwork'
import { createSeededRng } from '../domain/math'
import { createNeighborhoodIncidentPacket } from '../domain/urbanNeighborhoodIncidents'
import { createCivicRumorPacket } from '../domain/civicRumorChannel'

describe('caseGeneration', () => {
  it('builds a readable encounter profile for seeded starter cases', () => {
    const state = createStartingState()
    const profile = buildCaseGenerationProfile(state.cases['case-001'], state)
    const failPreview = profile.escalation.find((entry) => entry.trigger === 'failure')
    const unresolvedPreview = profile.escalation.find((entry) => entry.trigger === 'unresolved')

    expect(classifyEncounterType(state.cases['case-001'])).toBe('cryptid_sighting')
    expect(profile.encounterTypeLabel).toBe('Cryptid sighting')
    expect(profile.origin.label).toBe('Baseline world activity')
    expect(profile.causeSignals).toEqual(expect.arrayContaining(['night', 'tier-1', 'vampire']))
    expect(failPreview?.targets.map((target) => target.templateId)).toContain(
      'followup_missing_persons'
    )
    expect(unresolvedPreview?.convertsToRaid).toBe(true)
    expect(unresolvedPreview?.targets.map((target) => target.templateId)).toEqual(
      expect.arrayContaining(['followup_feeding_frenzy', 'followup_missing_persons'])
    )
    expect(profile.rewardProfile.success.label).toBe('Decisive success')
  })

  it('generates identical ambient world-activity cases from the same seed and state', () => {
    const makeState = () => {
      const state = createStartingState()
      state.config = { ...state.config, maxActiveCases: 4 }
      state.cases = {
        'case-001': {
          ...state.cases['case-001'],
          stage: 1,
          deadlineRemaining: 4,
          assignedTeamIds: [],
          status: 'open',
        },
      }
      state.containmentRating = 40
      state.agency = {
        containmentRating: 40,
        clearanceLevel: state.clearanceLevel,
        funding: state.funding,
      }

      return state
    }

    const worldStateA = makeState()
    const worldStateB = makeState()
    const rngA = createSeededRng(1337)
    const rngB = createSeededRng(1337)

    const resultA = generateAmbientCases(worldStateA, rngA.next)
    const resultB = generateAmbientCases(worldStateB, rngB.next)

    expect(resultA).toEqual(resultB)
    expect(resultA.spawnedCases).toHaveLength(1)
    expect(resultA.spawnedCases[0]).toMatchObject({
      trigger: 'world_activity',
    })
    expect(resultA.spawnedCases[0]?.sourceReason).toContain('Baseline world activity')
    expect(resultA.spawnedCaseIds).toHaveLength(1)
    expect(resultA.state.cases[resultA.spawnedCaseIds[0]!]).toBeDefined()
  })

  it('uses faction pressure as a deterministic case source when hostile pressure spikes', () => {
    const state = createStartingState()
    state.config = { ...state.config, maxActiveCases: 8 }
    state.containmentRating = 85
    state.agency = {
      containmentRating: 85,
      clearanceLevel: state.clearanceLevel,
      funding: state.funding,
    }
    state.cases = {
      'case-occult-1': {
        ...state.cases['case-003'],
        id: 'case-occult-1',
        title: 'Ritual Pressure One',
        stage: 4,
        deadlineRemaining: 0,
        assignedTeamIds: [],
        status: 'open',
        tags: ['occult', 'ritual', 'chapel', 'tier-2'],
        requiredTags: ['occultist'],
        preferredTags: ['ritual-kit'],
      },
      'case-occult-2': {
        ...state.cases['case-003'],
        id: 'case-occult-2',
        title: 'Ritual Pressure Two',
        stage: 4,
        deadlineRemaining: 0,
        assignedTeamIds: [],
        status: 'open',
        tags: ['occult', 'ritual', 'reliquary', 'tier-2'],
        requiredTags: ['occultist'],
        preferredTags: ['ritual-kit'],
      },
      'case-occult-3': {
        ...state.cases['case-003'],
        id: 'case-occult-3',
        title: 'Ritual Pressure Three',
        stage: 4,
        deadlineRemaining: 0,
        assignedTeamIds: [],
        status: 'open',
        tags: ['occult', 'ritual', 'catacomb', 'tier-2'],
        requiredTags: ['occultist'],
        preferredTags: ['ritual-kit'],
      },
    }

    const result = generateAmbientCases(state, createSeededRng(4242).next)

    expect(result.spawnedCases[0]).toMatchObject({
      trigger: 'faction_pressure',
      factionId: 'occult_networks',
      factionLabel: 'Occult Networks',
    })
    expect(result.spawnedCases[0]?.sourceReason).toContain('Occult Networks')
    expect(result.state.cases[result.spawnedCaseIds[0]!]).toBeDefined()
  })

  it('does not let supportive factions also surface hostile pressure incidents', () => {
    const state = createStartingState()
    state.config = { ...state.config, maxActiveCases: 8 }
    state.containmentRating = 85
    state.agency = {
      containmentRating: 85,
      clearanceLevel: state.clearanceLevel,
      funding: state.funding,
    }
    state.cases = {
      'case-occult-1': {
        ...state.cases['case-003'],
        id: 'case-occult-1',
        title: 'Ritual Pressure One',
        stage: 4,
        deadlineRemaining: 0,
        assignedTeamIds: [],
        status: 'open',
        factionId: 'occult_networks',
        tags: ['occult', 'ritual', 'chapel', 'tier-2'],
        requiredTags: ['occultist'],
        preferredTags: ['ritual-kit'],
      },
      'case-occult-2': {
        ...state.cases['case-003'],
        id: 'case-occult-2',
        title: 'Ritual Pressure Two',
        stage: 4,
        deadlineRemaining: 0,
        assignedTeamIds: [],
        status: 'open',
        factionId: 'occult_networks',
        tags: ['occult', 'ritual', 'reliquary', 'tier-2'],
        requiredTags: ['occultist'],
        preferredTags: ['ritual-kit'],
      },
    }
    if (!state.factions) {
      throw new Error('Expected faction state to be present for supportive pressure test.')
    }
    state.factions.occult_networks.reputation = 80

    const result = generateAmbientCases(state, createSeededRng(4242).next)

    expect(result.spawnedCases.some((spawned) => spawned.trigger === 'faction_pressure')).toBe(false)
  })

  it('excludes site:* tags from pressure ranking so authored semantic tags are not displaced', () => {
    // Force world_activity path: low containment rating, one slot open
    const state = createStartingState()
    state.config = { ...state.config, maxActiveCases: 2 }
    state.containmentRating = 30
    state.agency = {
      containmentRating: 30,
      clearanceLevel: state.clearanceLevel,
      funding: state.funding,
    }
    // Replace starter cases with one open case that has many site:* tags
    // and a single authored semantic tag ('vampire'). Without the filter,
    // the site:* tags would out-count 'vampire' and displace it from the
    // ranked pressure slice used by getWorldTemplateWeight and buildWorldActivityReason.
    state.cases = {
      'case-site-tagged': {
        ...state.cases['case-001'],
        id: 'case-site-tagged',
        tags: [
          'vampire',
          'site:packet:ritual-sanctum.v1',
          'site:purpose:ritual_complex',
          'site:builder:cult_engineers',
          'site:location:urban_basement',
          'site:ingress:maintenance_shaft',
          'site:topology:concentric_sanctum',
          'site:hazard:ward_feedback',
          'site:hazard:collapsed_floor',
          'site:inhabitant:ritual_adepts',
        ],
        requiredTags: [],
        preferredTags: [],
        status: 'open',
        assignedTeamIds: [],
      },
    }

    const result = generateAmbientCases(state, createSeededRng(9001).next)

    // At least one case must have been spawned via world_activity
    const worldCase = result.spawnedCases.find((spawned) => spawned.trigger === 'world_activity')
    expect(worldCase).toBeDefined()

    // The sourceReason must not contain any site:* tag strings
    const reason = worldCase?.sourceReason ?? ''
    expect(reason).not.toMatch(/site:/)
  })

  it('surfaces authored semantic tags in pressure ranking when no site:* tags are present', () => {
    // Baseline: a case with only authored tags. Confirms the authored tag
    // reaches the sourceReason without any site:* pollution in the picture.
    // Uses the same starter case tags ('vampire', 'night', 'tier-1') that
    // world templates key off, maximising the chance of a tag-aligned reason.
    const state = createStartingState()
    state.config = { ...state.config, maxActiveCases: 2 }
    state.containmentRating = 30
    state.agency = {
      containmentRating: 30,
      clearanceLevel: state.clearanceLevel,
      funding: state.funding,
    }
    // Keep a single authored-only case; no site:* tags anywhere
    state.cases = {
      'case-authored-only': {
        ...state.cases['case-001'],
        id: 'case-authored-only',
        tags: ['vampire', 'night', 'tier-1'],
        requiredTags: [],
        preferredTags: [],
        status: 'open',
        assignedTeamIds: [],
      },
    }

    const result = generateAmbientCases(state, createSeededRng(9002).next)

    const worldCase = result.spawnedCases.find((spawned) => spawned.trigger === 'world_activity')
    expect(worldCase).toBeDefined()

    const reason = worldCase?.sourceReason ?? ''

    // Pressure-ranking output must never contain site:* strings when only authored tags are present
    expect(reason).not.toMatch(/site:/)

    // The reason must follow one of the two expected authored formats:
    //   "Baseline world activity aligned with active pressure tags: ..."
    //   "Baseline world activity surfaced a new ..."
    // Both indicate authored-only data reached the ranking path cleanly.
    expect(reason).toMatch(/^Baseline world activity/)
  })

  it('SPE-109: district and time band materially change live world-activity output', () => {
    const templateBase = Object.values(createStartingState().templates)[0]

    const makeState = (districtScheduleState: NonNullable<ReturnType<typeof createStartingState>['districtScheduleState']>) => {
      const state = createStartingState()
      state.config = { ...state.config, maxActiveCases: 4 }
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
          stage: 1,
          deadlineRemaining: 4,
          assignedTeamIds: [],
          status: 'open',
        },
      }
      state.reports = [
        {
          week: 1,
          rngStateBefore: 0,
          rngStateAfter: 0,
          newCases: [],
          progressedCases: [],
          resolvedCases: [],
          failedCases: [],
          partialCases: [],
          unresolvedTriggers: ['a', 'b'],
          spawnedCases: [],
          maxStage: 1,
          avgFatigue: 0,
          teamStatus: [],
          notes: [],
        },
        {
          week: 2,
          rngStateBefore: 0,
          rngStateAfter: 0,
          newCases: [],
          progressedCases: [],
          resolvedCases: [],
          failedCases: [],
          partialCases: [],
          unresolvedTriggers: ['c', 'd'],
          spawnedCases: [],
          maxStage: 1,
          avgFatigue: 0,
          teamStatus: [],
          notes: [],
        },
      ]
      state.templates = {
        'sched-cult': {
          ...templateBase,
          templateId: 'sched-cult',
          title: 'Cult Window',
          kind: 'case',
          tags: ['cult_activity', 'occult', 'night'],
          requiredTags: [],
          preferredTags: [],
        },
        'sched-criminal': {
          ...templateBase,
          templateId: 'sched-criminal',
          title: 'Criminal Window',
          kind: 'case',
          tags: ['criminal_network', 'signal', 'public'],
          requiredTags: [],
          preferredTags: [],
        },
      }
      state.districtScheduleState = districtScheduleState
      return state
    }

    const hubNightSchedule = {
      settlementId: 'test-hub-night',
      districts: {
        hub: {
          id: 'hub',
          label: 'Central Hub',
          encounterFamilyTags: ['cult_activity'],
          escalationModifiers: { stage_delta: 0.2 },
          authorityResponseProfile: 'rapid_response',
        },
      },
      timeBands: {
        night: {
          id: 'night',
          label: 'Night',
          baselinePopulation: 120,
          witnessModifier: 0.2,
          visibilityModifier: 0.1,
          covertAdvantage: true,
        },
      },
      events: [
        {
          id: 'night_market_shutdown',
          label: 'Night Market Shutdown',
          appliesTo: ['hub'],
          startWeek: 1,
          endWeek: 5,
          trafficModifier: { populationDelta: -20, witnessModifier: -0.05 },
          seedKey: 'night_market_shutdown',
        },
      ],
    }

    const docksAfternoonSchedule = {
      settlementId: 'test-docks-afternoon',
      districts: {
        docks: {
          id: 'docks',
          label: 'Harbor Docks',
          encounterFamilyTags: ['criminal_network'],
          escalationModifiers: { stage_delta: 0.3 },
          authorityResponseProfile: 'slow_reaction',
        },
      },
      timeBands: {
        afternoon: {
          id: 'afternoon',
          label: 'Afternoon',
          baselinePopulation: 600,
          witnessModifier: 0.85,
          visibilityModifier: 1,
          covertAdvantage: false,
        },
      },
      events: [
        {
          id: 'harbor_inspection',
          label: 'Harbor Inspection',
          appliesTo: ['docks'],
          startWeek: 1,
          endWeek: 5,
          trafficModifier: { populationDelta: 40, witnessModifier: 0.05 },
          seedKey: 'harbor_inspection',
        },
      ],
    }

    const cultResult = generateAmbientCases(makeState(hubNightSchedule), createSeededRng(7777).next)
    const criminalResult = generateAmbientCases(makeState(docksAfternoonSchedule), createSeededRng(7777).next)

    const cultCase = cultResult.state.cases[cultResult.spawnedCaseIds[0]!]
    const criminalCase = criminalResult.state.cases[criminalResult.spawnedCaseIds[0]!]

    expect(cultCase.templateId).toBe('sched-cult')
    expect(criminalCase.templateId).toBe('sched-criminal')

    expect(cultCase.tags).toEqual(
      expect.arrayContaining([
        'district:hub',
        'timeband:night',
        'schedule:covert-advantage',
        'schedule:witness-low',
        'schedule-event:night_market_shutdown',
      ])
    )
    expect(criminalCase.tags).toEqual(
      expect.arrayContaining([
        'district:docks',
        'timeband:afternoon',
        'schedule:witness-high',
        'schedule-event:harbor_inspection',
      ])
    )
    expect(criminalCase.tags).not.toContain('schedule:covert-advantage')

    expect(cultResult.spawnedCases[0]?.sourceReason).toContain('Schedule:')
    expect(cultResult.spawnedCases[0]?.sourceReason).toContain('covert window active')
    expect(criminalResult.spawnedCases[0]?.sourceReason).toContain('high witness density')
  })

  it('SPE-139: wired urban signal changes weighted world-activity outputs across district contexts', () => {
    const templateBase = Object.values(createStartingState().templates)[0]

    const makeState = (
      districtScheduleState: NonNullable<ReturnType<typeof createStartingState>['districtScheduleState']>
    ) => {
      const state = createStartingState()
      state.config = { ...state.config, maxActiveCases: 4 }
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
          stage: 1,
          deadlineRemaining: 4,
          assignedTeamIds: [],
          status: 'open',
          tags: ['public', 'signal', 'infrastructure'],
          requiredTags: [],
          preferredTags: [],
        },
      }
      state.templates = {
        'urban-authority': {
          ...templateBase,
          templateId: 'urban-authority',
          title: 'Authority Inspection Sweep',
          kind: 'case',
          tags: ['authority', 'inspection', 'public'],
          requiredTags: [],
          preferredTags: [],
        },
        'urban-criminal': {
          ...templateBase,
          templateId: 'urban-criminal',
          title: 'Smuggling Relay Shadow',
          kind: 'case',
          tags: ['criminal_network', 'smuggling'],
          requiredTags: [],
          preferredTags: [],
        },
      }
      state.districtScheduleState = districtScheduleState
      return state
    }

    const authoritySchedule = {
      settlementId: 'test-authority-context',
      districts: {
        civic: {
          id: 'civic',
          label: 'Civic Core',
          encounterFamilyTags: ['public'],
          escalationModifiers: { stage_delta: 0.1 },
          authorityResponseProfile: 'rapid_response',
        },
      },
      timeBands: {
        day: {
          id: 'day',
          label: 'Day',
          baselinePopulation: 500,
          witnessModifier: 0.9,
          visibilityModifier: 1,
          covertAdvantage: false,
        },
      },
      events: [],
    }

    const hostileSchedule = {
      settlementId: 'test-hostile-context',
      districts: {
        shadow: {
          id: 'shadow',
          label: 'Shadow Belt',
          encounterFamilyTags: ['public'],
          escalationModifiers: { stage_delta: 0.3 },
          authorityResponseProfile: 'corruption',
        },
      },
      timeBands: {
        night: {
          id: 'night',
          label: 'Night',
          baselinePopulation: 100,
          witnessModifier: 0.2,
          visibilityModifier: 0.2,
          covertAdvantage: true,
        },
      },
      events: [],
    }

    const authorityResult = generateAmbientCases(
      makeState(authoritySchedule),
      createSeededRng(8123).next
    )
    const hostileResult = generateAmbientCases(
      makeState(hostileSchedule),
      createSeededRng(8123).next
    )

    const authorityCase = authorityResult.state.cases[authorityResult.spawnedCaseIds[0]!]
    const hostileCase = hostileResult.state.cases[hostileResult.spawnedCaseIds[0]!]

    expect(authorityCase.templateId).toBe('urban-authority')
    expect(hostileCase.templateId).toBe('urban-criminal')
    expect(authorityResult.spawnedCases[0]?.sourceReason).toContain('Urban:')
    expect(hostileResult.spawnedCases[0]?.sourceReason).toContain('Urban:')
  })

  it('SPE-139: noncombat-first branch remains reusable in wired world-activity flow', () => {
    const templateBase = Object.values(createStartingState().templates)[0]
    const state = createStartingState()
    state.config = { ...state.config, maxActiveCases: 4 }
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
        stage: 1,
        deadlineRemaining: 4,
        assignedTeamIds: [],
        status: 'open',
        tags: ['public'],
        requiredTags: [],
        preferredTags: [],
      },
    }
    state.templates = {
      'urban-public-signal': {
        ...templateBase,
        templateId: 'urban-public-signal',
        title: 'Public Signal Dispute',
        kind: 'case',
        tags: ['public', 'signal', 'market'],
        requiredTags: [],
        preferredTags: [],
      },
    }
    state.districtScheduleState = {
      settlementId: 'noncombat-window',
      districts: {
        hub: {
          id: 'hub',
          label: 'Hub',
          encounterFamilyTags: ['public', 'signal'],
          escalationModifiers: { stage_delta: 0.1 },
          authorityResponseProfile: 'rapid_response',
        },
      },
      timeBands: {
        day: {
          id: 'day',
          label: 'Day',
          baselinePopulation: 700,
          witnessModifier: 0.92,
          visibilityModifier: 1,
          covertAdvantage: false,
        },
      },
      events: [{
        id: 'inspection_sweep',
        label: 'Inspection Sweep',
        appliesTo: ['hub'],
        startWeek: 1,
        endWeek: 5,
        trafficModifier: { witnessModifier: 0.02 },
        seedKey: 'inspection_sweep',
      }],
    }

    const result = generateAmbientCases(state, createSeededRng(9151).next)

    expect(result.spawnedCases[0]?.sourceReason).toContain('noncombat_negotiation')
  })

  it('SPE-139: authority/hostile response hints change by local context and appear in reason text', () => {
    const templateBase = Object.values(createStartingState().templates)[0]

    const makeState = (
      districtScheduleState: NonNullable<ReturnType<typeof createStartingState>['districtScheduleState']>
    ) => {
      const state = createStartingState()
      state.config = { ...state.config, maxActiveCases: 4 }
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
          stage: 1,
          deadlineRemaining: 4,
          assignedTeamIds: [],
          status: 'open',
          tags: ['public'],
          requiredTags: [],
          preferredTags: [],
        },
      }
      state.templates = {
        'urban-authority': {
          ...templateBase,
          templateId: 'urban-authority',
          title: 'Authority Inspection Sweep',
          kind: 'case',
          tags: ['authority', 'inspection', 'public'],
          requiredTags: [],
          preferredTags: [],
        },
        'urban-criminal': {
          ...templateBase,
          templateId: 'urban-criminal',
          title: 'Smuggling Relay Shadow',
          kind: 'case',
          tags: ['criminal_network', 'smuggling', 'night'],
          requiredTags: [],
          preferredTags: [],
        },
      }
      state.districtScheduleState = districtScheduleState
      return state
    }

    const rapidContext = {
      settlementId: 'rapid-context',
      districts: {
        civic: {
          id: 'civic',
          label: 'Civic Core',
          encounterFamilyTags: ['public'],
          escalationModifiers: { stage_delta: 0.1 },
          authorityResponseProfile: 'rapid_response',
        },
      },
      timeBands: {
        day: {
          id: 'day',
          label: 'Day',
          baselinePopulation: 650,
          witnessModifier: 0.88,
          visibilityModifier: 1,
          covertAdvantage: false,
        },
      },
      events: [],
    }

    const degradedContext = {
      settlementId: 'degraded-context',
      districts: {
        shadow: {
          id: 'shadow',
          label: 'Shadow Belt',
          encounterFamilyTags: ['public'],
          escalationModifiers: { stage_delta: 0.35 },
          authorityResponseProfile: 'corruption',
        },
      },
      timeBands: {
        night: {
          id: 'night',
          label: 'Night',
          baselinePopulation: 90,
          witnessModifier: 0.18,
          visibilityModifier: 0.2,
          covertAdvantage: true,
        },
      },
      events: [],
    }

    const rapidResult = generateAmbientCases(makeState(rapidContext), createSeededRng(7007).next)
    const degradedResult = generateAmbientCases(makeState(degradedContext), createSeededRng(7007).next)

    expect(rapidResult.spawnedCases[0]?.sourceReason).toContain('rapid_lockdown')
    expect(degradedResult.spawnedCases[0]?.sourceReason).toContain('thin_coverage')
    expect(degradedResult.spawnedCases[0]?.sourceReason).toContain('active_hunt')
  })

  it('SPE-139: additional threaded map/truth/era/ecology surfaces materially change output and explanation', () => {
    const templateBase = Object.values(createStartingState().templates)[0]

    const makeState = (input: {
      marketPressure: ReturnType<typeof createStartingState>['market']['pressure']
      containment: number
      threatDrift?: number
      districtId: string
      authorityProfile: string
      covertAdvantage: boolean
      witnessModifier: number
    }) => {
      const state = createStartingState()
      state.config = { ...state.config, maxActiveCases: 4 }
      state.containmentRating = input.containment
      state.agency = {
        containmentRating: input.containment,
        clearanceLevel: state.clearanceLevel,
        funding: state.funding,
      }
      state.globalThreatDrift = input.threatDrift
      state.market = {
        ...state.market,
        pressure: input.marketPressure,
      }
      state.cases = {
        'case-seed': {
          ...state.cases['case-001'],
          id: 'case-seed',
          stage: 1,
          deadlineRemaining: 4,
          assignedTeamIds: [],
          status: 'open',
          tags: ['public'],
          requiredTags: [],
          preferredTags: [],
        },
      }
      state.templates = {
        'urban-criminal': {
          ...templateBase,
          templateId: 'urban-criminal',
          title: 'Criminal Backstreet Relay',
          kind: 'case',
          tags: ['criminal_network', 'smuggling', 'night'],
          requiredTags: [],
          preferredTags: [],
        },
        'urban-public': {
          ...templateBase,
          templateId: 'urban-public',
          title: 'Public Civic Disturbance',
          kind: 'case',
          tags: ['public', 'signal', 'market'],
          requiredTags: [],
          preferredTags: [],
        },
      }
      state.districtScheduleState = {
        settlementId: 'upstream-threading-check',
        districts: {
          [input.districtId]: {
            id: input.districtId,
            label: input.districtId,
            encounterFamilyTags: ['public'],
            escalationModifiers: { stage_delta: 0.2 },
            authorityResponseProfile: input.authorityProfile,
          },
        },
        timeBands: {
          slot: {
            id: 'slot',
            label: 'Slot',
            baselinePopulation: 300,
            witnessModifier: input.witnessModifier,
            visibilityModifier: 0.7,
            covertAdvantage: input.covertAdvantage,
          },
        },
        events: [],
      }
      return state
    }

    const baselineInput = {
      marketPressure: 'normal' as const,
      containment: 44,
      districtId: 'hub',
      authorityProfile: 'rapid_response',
      covertAdvantage: false,
      witnessModifier: 0.82,
    }

    const pressuredInput = {
      marketPressure: 'tight' as const,
      containment: 34,
      threatDrift: 4,
      districtId: 'dock-shadow',
      authorityProfile: 'corruption',
      covertAdvantage: true,
      witnessModifier: 0.22,
    }

    let baselineCriminalSelections = 0
    let pressuredCriminalSelections = 0

    for (let seed = 9901; seed <= 9920; seed += 1) {
      const baseline = generateAmbientCases(makeState(baselineInput), createSeededRng(seed).next)
      const pressured = generateAmbientCases(makeState(pressuredInput), createSeededRng(seed).next)

      const baselineSpawn = baseline.spawnedCases.find((entry) => entry.trigger === 'world_activity')
      const pressuredSpawn = pressured.spawnedCases.find((entry) => entry.trigger === 'world_activity')

      expect(baselineSpawn).toBeDefined()
      expect(pressuredSpawn).toBeDefined()

      if (baseline.state.cases[baselineSpawn!.caseId]?.templateId === 'urban-criminal') {
        baselineCriminalSelections += 1
      }

      if (pressured.state.cases[pressuredSpawn!.caseId]?.templateId === 'urban-criminal') {
        pressuredCriminalSelections += 1
      }
    }

    // Weighted output materially shifts toward criminal template under pressured upstream surfaces.
    expect(pressuredCriminalSelections).toBeGreaterThan(baselineCriminalSelections)

    const baselineProbe = generateAmbientCases(makeState(baselineInput), createSeededRng(9901).next)
    const pressuredProbe = generateAmbientCases(makeState(pressuredInput), createSeededRng(9901).next)
    const baselineReason =
      baselineProbe.spawnedCases.find((entry) => entry.trigger === 'world_activity')?.sourceReason ?? ''
    const pressuredReason =
      pressuredProbe.spawnedCases.find((entry) => entry.trigger === 'world_activity')?.sourceReason ?? ''

    // Bias/hint shift (authority/hostile/noncombat surfaces)
    expect(baselineReason).toContain('rapid_lockdown')
    expect(pressuredReason).toContain('active_hunt')
    expect(pressuredReason).toContain('noncombat_negotiation')

    // Explanation includes newly threaded upstream surfaces.
    expect(pressuredReason).toContain('Inputs:')
    expect(pressuredReason).toContain('district:old-docks')
    expect(pressuredReason).toContain('truth active_folklore')
    expect(pressuredReason).toContain('era suppression')
  })

  it('SPE-139: wired flow exposes separate role-axis and social-axis resolution with visible response variation', () => {
    const templateBase = Object.values(createStartingState().templates)[0]

    const extractAxis = (reason: string, axis: 'role-axis' | 'social-axis') => {
      const match = reason.match(new RegExp(`${axis}\\s+([0-9]+\\.[0-9]+)`))
      expect(match, `Expected ${axis} in reason: ${reason}`).toBeTruthy()
      return Number.parseFloat(match![1]!)
    }

    const makeState = (input: {
      districtId: string
      authorityResponseProfile: string
      encounterFamilyTags: string[]
      witnessModifier: number
      covertAdvantage: boolean
      marketPressure?: ReturnType<typeof createStartingState>['market']['pressure']
      containmentRating?: number
    }) => {
      const state = createStartingState()
      state.config = { ...state.config, maxActiveCases: 4 }
      state.containmentRating = input.containmentRating ?? 40
      state.agency = {
        containmentRating: state.containmentRating,
        clearanceLevel: state.clearanceLevel,
        funding: state.funding,
      }
      if (input.marketPressure) {
        state.market = { ...state.market, pressure: input.marketPressure }
      }
      state.cases = {
        'case-seed': {
          ...state.cases['case-001'],
          id: 'case-seed',
          stage: 1,
          deadlineRemaining: 4,
          assignedTeamIds: [],
          status: 'open',
          tags: ['public', 'signal'],
          requiredTags: [],
          preferredTags: [],
        },
      }
      state.templates = {
        'urban-balanced': {
          ...templateBase,
          templateId: 'urban-balanced',
          title: 'Balanced City Pressure',
          kind: 'case',
          tags: ['public', 'signal', 'market'],
          requiredTags: [],
          preferredTags: [],
        },
      }
      state.districtScheduleState = {
        settlementId: `axis-${input.districtId}`,
        districts: {
          [input.districtId]: {
            id: input.districtId,
            label: input.districtId,
            encounterFamilyTags: input.encounterFamilyTags,
            escalationModifiers: { stage_delta: 0.2 },
            authorityResponseProfile: input.authorityResponseProfile,
          },
        },
        timeBands: {
          slot: {
            id: 'slot',
            label: 'Slot',
            baselinePopulation: 300,
            witnessModifier: input.witnessModifier,
            visibilityModifier: input.covertAdvantage ? 0.2 : 0.9,
            covertAdvantage: input.covertAdvantage,
          },
        },
        events: [],
      }

      return state
    }

    const roleHeavy = generateAmbientCases(
      makeState({
        districtId: 'dock-shadow',
        authorityResponseProfile: 'corruption',
        encounterFamilyTags: ['criminal_network', 'cult_activity'],
        witnessModifier: 0.2,
        covertAdvantage: true,
        marketPressure: 'tight',
        containmentRating: 34,
      }),
      createSeededRng(1301).next
    )

    const socialHeavy = generateAmbientCases(
      makeState({
        districtId: 'civic-court',
        authorityResponseProfile: 'rapid_response',
        encounterFamilyTags: ['public', 'signal', 'court', 'noble'],
        witnessModifier: 0.9,
        covertAdvantage: false,
        containmentRating: 44,
      }),
      createSeededRng(1301).next
    )

    const roleReason = roleHeavy.spawnedCases.find((entry) => entry.trigger === 'world_activity')?.sourceReason ?? ''
    const socialReason =
      socialHeavy.spawnedCases.find((entry) => entry.trigger === 'world_activity')?.sourceReason ?? ''

    const roleAxisRoleHeavy = extractAxis(roleReason, 'role-axis')
    const socialAxisRoleHeavy = extractAxis(roleReason, 'social-axis')
    const roleAxisSocialHeavy = extractAxis(socialReason, 'role-axis')
    const socialAxisSocialHeavy = extractAxis(socialReason, 'social-axis')

    // Separate axis resolution is directly inspectable and varies independently by context.
    expect(roleAxisRoleHeavy).toBeGreaterThan(roleAxisSocialHeavy)
    expect(socialAxisSocialHeavy).toBeGreaterThan(socialAxisRoleHeavy)

    // Noncombat-first branch remains present in at least one wired branch output.
    expect(roleReason.includes('noncombat_negotiation') || socialReason.includes('noncombat_negotiation')).toBe(true)

    // Authority/hostile response visibility still varies by district/local context.
    expect(roleReason).toContain('thin_coverage')
    expect(roleReason).toContain('active_hunt')
    expect(socialReason).toContain('rapid_lockdown')
    expect(socialReason).toContain('escalating_activity')
  })


  describe('SPE-540: two-site civic consequence authority exchange', () => {
    const templateBase = Object.values(createStartingState().templates)[0]!

    function makeAuthorityExchangeState(targetDistrictId = 'site-b') {
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
        settlementId: 'spe-540-authority-exchange',
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

    it('applies a bounded two-site authority exchange audit fragment to target-site world activity only', () => {
      const state = makeAuthorityExchangeState('site-b')
      const packet = createCompactCivicAuthorityConsequencePacket({
        packetId: 'spe-540-a-to-b',
        sourceSiteId: 'site-a',
        targetSiteId: 'site-b',
        seedKey: 'exchange-line-a',
        week: state.week,
        authoritySignal: 0.8,
      })

      const result = generateAmbientCases(state, createSeededRng(54001).next, {
        civicConsequencePackets: [packet],
      })

      const worldSpawn = result.spawnedCases.find((entry) => entry.trigger === 'world_activity')
      expect(worldSpawn).toBeDefined()
      const reason = worldSpawn?.sourceReason ?? ''
      expect(reason).toContain('Authority exchange:')
      expect(reason).toContain('cross-site-authority target:site-b')
      expect(reason).toContain('source:site-a target:site-b')
      expect(reason).toMatch(/weight:1\.[0-2][0-9]{2}/)
    })

    it('source event at site A deterministically changes target-site B handling bias', () => {
      let baselineAuthoritySelections = 0
      let exchangedAuthoritySelections = 0

      for (let seed = 54010; seed <= 54040; seed += 1) {
        const baselineState = makeAuthorityExchangeState('site-b')
        const exchangedState = makeAuthorityExchangeState('site-b')
        const packet = createCompactCivicAuthorityConsequencePacket({
          packetId: `spe-540-a-to-b-${seed}`,
          sourceSiteId: 'site-a',
          targetSiteId: 'site-b',
          seedKey: `exchange-line-a-${seed}`,
          week: exchangedState.week,
          authoritySignal: 0.95,
        })

        const baseline = generateAmbientCases(baselineState, createSeededRng(seed).next)
        const exchanged = generateAmbientCases(exchangedState, createSeededRng(seed).next, {
          civicConsequencePackets: [packet],
        })

        const baselineCase = baseline.state.cases[baseline.spawnedCaseIds[0]!]
        const exchangedCase = exchanged.state.cases[exchanged.spawnedCaseIds[0]!]

        if (baselineCase?.templateId === 'authority-check') {
          baselineAuthoritySelections += 1
        }

        if (exchangedCase?.templateId === 'authority-check') {
          exchangedAuthoritySelections += 1
        }
      }

      expect(exchangedAuthoritySelections).toBeGreaterThan(baselineAuthoritySelections)
    })

    it('keeps recurring operatorId and institutionId stable across packets sharing a seed lineage', () => {
      const stateA = makeAuthorityExchangeState('site-b')
      const stateB = makeAuthorityExchangeState('site-b')
      const packetA = createCompactCivicAuthorityConsequencePacket({
        packetId: 'spe-540-recur-1',
        sourceSiteId: 'site-a',
        targetSiteId: 'site-b',
        seedKey: 'shared-operator-seed',
        week: stateA.week,
        authoritySignal: 0.6,
      })
      const packetB = createCompactCivicAuthorityConsequencePacket({
        packetId: 'spe-540-recur-2',
        sourceSiteId: 'site-a',
        targetSiteId: 'site-b',
        seedKey: 'shared-operator-seed',
        week: stateB.week,
        authoritySignal: 0.55,
      })

      const resultA = generateAmbientCases(stateA, createSeededRng(54051).next, {
        civicConsequencePackets: [packetA],
      })
      const resultB = generateAmbientCases(stateB, createSeededRng(54051).next, {
        civicConsequencePackets: [packetB],
      })

      const reasonA = resultA.spawnedCases.find((entry) => entry.trigger === 'world_activity')?.sourceReason ?? ''
      const reasonB = resultB.spawnedCases.find((entry) => entry.trigger === 'world_activity')?.sourceReason ?? ''

      const operatorA = reasonA.match(/op:([a-z0-9-]+)/)?.[1]
      const operatorB = reasonB.match(/op:([a-z0-9-]+)/)?.[1]
      const institutionA = reasonA.match(/inst:([a-z0-9-]+)/)?.[1]
      const institutionB = reasonB.match(/inst:([a-z0-9-]+)/)?.[1]

      expect(operatorA).toBeDefined()
      expect(operatorB).toBeDefined()
      expect(operatorA).toBe(operatorB)
      expect(institutionA).toBeDefined()
      expect(institutionB).toBeDefined()
      expect(institutionA).toBe(institutionB)
    })

    it('does not apply citywide authority behavior to non-target districts', () => {
      const packet = createCompactCivicAuthorityConsequencePacket({
        packetId: 'spe-540-non-target',
        sourceSiteId: 'site-a',
        targetSiteId: 'site-b',
        seedKey: 'nontarget-check',
        week: 1,
        authoritySignal: 0.9,
      })

      const noPacketState = makeAuthorityExchangeState('site-c')
      const withPacketState = makeAuthorityExchangeState('site-c')
      const baseline = generateAmbientCases(noPacketState, createSeededRng(54061).next)
      const withPacket = generateAmbientCases(withPacketState, createSeededRng(54061).next, {
        civicConsequencePackets: [packet],
      })

      const baselineCase = baseline.state.cases[baseline.spawnedCaseIds[0]!]
      const withPacketCase = withPacket.state.cases[withPacket.spawnedCaseIds[0]!]
      const withPacketReason =
        withPacket.spawnedCases.find((entry) => entry.trigger === 'world_activity')?.sourceReason ?? ''

      expect(withPacketReason).not.toContain('cross-site-authority')
      expect(withPacketCase?.templateId).toBe(baselineCase?.templateId)
    })

    it('creates stable authority packets from authored/runtime event sources through a narrow seam', () => {
      const queueEvents = [
        {
          id: 'qevt-7001',
          type: 'encounter.follow_up',
          targetId: 'frontdesk.notice.authority.exchange',
          week: 2,
          payload: {
            civicAuthoritySource: true,
            civicPacketChannel: 'authority',
            sourceId: 'spe-540-authored-alpha',
            sourceSiteId: 'site-a',
            targetSiteId: 'site-b',
            seedKey: 'exchange-line-alpha',
            authoritySignal: 0.85,
            startWeek: 2,
            availability: 'persistent',
          },
        },
      ] as const

      const packetsA = deriveCivicAuthorityConsequencePacketsFromRuntimeEvents(queueEvents, 2)
      const packetsB = deriveCivicAuthorityConsequencePacketsFromRuntimeEvents(queueEvents, 2)

      expect(packetsA).toEqual(packetsB)
      expect(packetsA).toHaveLength(1)
      expect(packetsA[0]).toMatchObject({
        packetId: 'spe-540-authored-alpha',
        link: {
          scope: 'two_site',
          sourceSiteId: 'site-a',
          targetSiteId: 'site-b',
          authoritySignal: 0.85,
        },
      })
    })

    it('deterministically supports recurring and persistent packet availability across weeks', () => {
      const queueEvents = [
        {
          id: 'qevt-7101',
          type: 'encounter.follow_up',
          targetId: 'frontdesk.notice.authority.recurring',
          week: 2,
          payload: {
            civicAuthoritySource: true,
            sourceId: 'spe-540-recurring',
            sourceSiteId: 'site-a',
            targetSiteId: 'site-b',
            seedKey: 'shared-recurring',
            authoritySignal: 0.6,
            startWeek: 2,
            availability: 'recurring',
            cadenceWeeks: 2,
          },
        },
        {
          id: 'qevt-7102',
          type: 'encounter.follow_up',
          targetId: 'frontdesk.notice.authority.persistent',
          week: 3,
          payload: {
            civicAuthoritySource: true,
            sourceId: 'spe-540-persistent',
            sourceSiteId: 'site-a',
            targetSiteId: 'site-b',
            seedKey: 'shared-persistent',
            authoritySignal: 0.5,
            startWeek: 3,
            availability: 'persistent',
          },
        },
      ] as const

      const week1 = deriveCivicAuthorityConsequencePacketsFromRuntimeEvents(queueEvents, 1)
      const week2 = deriveCivicAuthorityConsequencePacketsFromRuntimeEvents(queueEvents, 2)
      const week3 = deriveCivicAuthorityConsequencePacketsFromRuntimeEvents(queueEvents, 3)
      const week4 = deriveCivicAuthorityConsequencePacketsFromRuntimeEvents(queueEvents, 4)
      const week5 = deriveCivicAuthorityConsequencePacketsFromRuntimeEvents(queueEvents, 5)
      const week6 = deriveCivicAuthorityConsequencePacketsFromRuntimeEvents(queueEvents, 6)
      const week6Repeat = deriveCivicAuthorityConsequencePacketsFromRuntimeEvents(queueEvents, 6)

      const packetIds = (packets: ReturnType<typeof deriveCivicAuthorityConsequencePacketsFromRuntimeEvents>) =>
        packets.map((packet) => packet.packetId)

      expect(packetIds(week1)).toEqual([])
      expect(packetIds(week2)).toEqual(['spe-540-recurring'])
      expect(packetIds(week3)).toEqual(['spe-540-persistent'])
      expect(packetIds(week4)).toEqual(['spe-540-persistent', 'spe-540-recurring'])
      expect(packetIds(week5)).toEqual(['spe-540-persistent'])
      expect(packetIds(week6)).toEqual(['spe-540-persistent', 'spe-540-recurring'])
      expect(week6Repeat).toEqual(week6)
    })

    it('ingested authority packets still drive bounded target-site handling through existing world-activity path', () => {
      const queueEvents = [
        {
          id: 'qevt-7201',
          type: 'encounter.follow_up',
          targetId: 'frontdesk.notice.authority.exchange',
          week: 1,
          payload: {
            civicAuthoritySource: true,
            sourceId: 'spe-540-ingested-bias',
            sourceSiteId: 'site-a',
            targetSiteId: 'site-b',
            seedKey: 'ingested-bias',
            authoritySignal: 0.95,
            startWeek: 1,
            availability: 'persistent',
          },
        },
      ] as const

      let baselineAuthoritySelections = 0
      let ingestedAuthoritySelections = 0

      for (let seed = 54110; seed <= 54140; seed += 1) {
        const baselineState = makeAuthorityExchangeState('site-b')
        const ingestedState = makeAuthorityExchangeState('site-b')
        const ingestedPackets = deriveCivicAuthorityConsequencePacketsFromRuntimeEvents(
          queueEvents,
          ingestedState.week
        )

        const baseline = generateAmbientCases(baselineState, createSeededRng(seed).next)
        const ingested = generateAmbientCases(ingestedState, createSeededRng(seed).next, {
          civicConsequencePackets: ingestedPackets,
        })

        const baselineCase = baseline.state.cases[baseline.spawnedCaseIds[0]!]
        const ingestedCase = ingested.state.cases[ingested.spawnedCaseIds[0]!]

        if (baselineCase?.templateId === 'authority-check') {
          baselineAuthoritySelections += 1
        }

        if (ingestedCase?.templateId === 'authority-check') {
          ingestedAuthoritySelections += 1
        }
      }

      expect(ingestedAuthoritySelections).toBeGreaterThan(baselineAuthoritySelections)

      const nonTargetState = makeAuthorityExchangeState('site-c')
      const nonTargetPackets = deriveCivicAuthorityConsequencePacketsFromRuntimeEvents(
        queueEvents,
        nonTargetState.week
      )
      const nonTarget = generateAmbientCases(nonTargetState, createSeededRng(54150).next, {
        civicConsequencePackets: nonTargetPackets,
      })
      const nonTargetReason =
        nonTarget.spawnedCases.find((entry) => entry.trigger === 'world_activity')?.sourceReason ?? ''

      expect(nonTargetReason).not.toContain('cross-site-authority')
    })
  })

  describe('SPE-539: neighborhood pressure integration', () => {
    const templateBase = Object.values(createStartingState().templates)[0]!

    function makeNeighborhoodState() {
      const state = createStartingState()
      state.config = { ...state.config, maxActiveCases: 4 }
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
          stage: 1,
          deadlineRemaining: 4,
          assignedTeamIds: [],
          status: 'open',
        },
      }
      state.templates = {
        'ambient-hazmat': {
          ...templateBase,
          templateId: 'ambient-hazmat',
          title: 'Ambient Hazmat Incident',
          kind: 'case',
          tags: ['biological', 'hazmat', 'public'],
          requiredTags: [],
          preferredTags: [],
        },
      }
      // Single district named 'docks' so selectedDistrictId is always 'docks'.
      state.districtScheduleState = {
        settlementId: 'spe-539-test-settlement',
        districts: {
          docks: {
            id: 'docks',
            label: 'Harbor Docks',
            encounterFamilyTags: ['biological', 'hazmat'],
            escalationModifiers: { stage_delta: 0.2 },
            authorityResponseProfile: 'slow_reaction',
          },
        },
        timeBands: {
          day: {
            id: 'day',
            label: 'Day',
            baselinePopulation: 400,
            witnessModifier: 0.7,
            visibilityModifier: 0.8,
            covertAdvantage: false,
          },
        },
        events: [],
      }
      return state
    }

    it('stamps neighborhood-pressure tag and appends reason fragment when local incidents are active', () => {
      const state = makeNeighborhoodState()
      // Week 1 with cadence=1 guarantees the packet occurs at week 1.
      const packet = createNeighborhoodIncidentPacket({
        incidentId: 'docks-spill-1',
        districtId: 'docks',
        blockId: 'pier-3',
        seedKey: 'spe-539-integ-active',
        sourceKind: 'decorative_biohazard',
        sourceLabel: 'Spore cloud from rooftop garden',
        baseCadenceWeeks: 1,
        baseSeverity: 0.8,
      })

      const result = generateAmbientCases(state, createSeededRng(5539).next, {
        neighborhoodPackets: [packet],
      })

      const worldCase = result.spawnedCases.find((c) => c.trigger === 'world_activity')
      expect(worldCase).toBeDefined()
      const spawnedCase = result.state.cases[result.spawnedCaseIds[0]!]
      expect(spawnedCase?.tags).toContain('neighborhood-pressure:docks')
      expect(worldCase?.sourceReason).toContain('neighborhood-pressure district:docks')
    })

    it('does not stamp neighborhood-pressure tag when no neighborhood packets are provided', () => {
      const state = makeNeighborhoodState()

      const result = generateAmbientCases(state, createSeededRng(5540).next)

      const spawnedCase = result.state.cases[result.spawnedCaseIds[0]!]
      const hasPressureTag = spawnedCase?.tags.some((t) => t.startsWith('neighborhood-pressure:'))
      expect(hasPressureTag ?? false).toBe(false)
    })
  })

  describe('SPE-1265: civic rumor pressure channel integration', () => {
    const templateBase = Object.values(createStartingState().templates)[0]!

    function makeRumorState() {
      const state = createStartingState()
      state.config = { ...state.config, maxActiveCases: 4 }
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
          stage: 1,
          deadlineRemaining: 4,
          assignedTeamIds: [],
          status: 'open',
        },
      }
      state.templates = {
        'ambient-generic': {
          ...templateBase,
          templateId: 'ambient-generic',
          title: 'Ambient Generic Incident',
          kind: 'case',
          tags: ['anomalous_hazard', 'public'],
          requiredTags: [],
          preferredTags: [],
        },
      }
      // Single district 'sector-7' so selectedDistrictId is always 'sector-7'.
      state.districtScheduleState = {
        settlementId: 'spe-1265-test-settlement',
        districts: {
          'sector-7': {
            id: 'sector-7',
            label: 'Sector 7',
            encounterFamilyTags: ['anomalous_hazard'],
            escalationModifiers: { stage_delta: 0.1 },
            authorityResponseProfile: 'standard',
          },
        },
        timeBands: {
          evening: {
            id: 'evening',
            label: 'Evening',
            baselinePopulation: 300,
            witnessModifier: 0.5,
            visibilityModifier: 0.7,
            covertAdvantage: false,
          },
        },
        events: [],
      }
      return state
    }

    it('stamps rumor-pressure tag on world-activity case when rumorPackets match the selected district', () => {
      const packet = createCivicRumorPacket({
        packetId: 'rumor-sector7-a',
        siteId: 'sector-7',
        week: 1,
        rumorSignal: 0.8,
        misleading: false,
        decayRate: 0.1,
      })

      const result = generateAmbientCases(makeRumorState(), createSeededRng(12650).next, {
        rumorPackets: [packet],
      })

      const worldCase = result.spawnedCases.find((c) => c.trigger === 'world_activity')
      expect(worldCase).toBeDefined()
      const spawnedCase = result.state.cases[result.spawnedCaseIds[0]!]
      expect(spawnedCase?.tags).toContain('rumor-pressure:sector-7')
      expect(worldCase?.sourceReason).toContain('Rumor:')
    })

    it('does not stamp rumor-pressure tag when no rumorPackets are provided (backwards compat)', () => {
      const result = generateAmbientCases(makeRumorState(), createSeededRng(12651).next)

      const spawnedCase = result.state.cases[result.spawnedCaseIds[0]!]
      const hasRumorTag = spawnedCase?.tags.some((t) => t.startsWith('rumor-pressure:'))
      expect(hasRumorTag ?? false).toBe(false)
    })
  })
})
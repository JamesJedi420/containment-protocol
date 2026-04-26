// cspell:words cryptid
import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  buildCaseGenerationProfile,
  classifyEncounterType,
  generateAmbientCases,
} from '../domain/caseGeneration'
import { createSeededRng } from '../domain/math'

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
})

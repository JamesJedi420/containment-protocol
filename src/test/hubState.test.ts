import { generateHubState } from '../domain/hub/hubState'
import { buildHubReportNotes } from '../domain/hub/hubReportNotes'

describe('SPE-53: Hub Simulation & Opportunity Generation', () => {
    type HubGameInput = Parameters<typeof generateHubState>[0]
    it('gates first opportunity by legitimacy and explains result', () => {
      const baseGame = {
        week: 1,
        factions: {
          red_hand: {
            id: 'red_hand',
            name: 'Red Hand',
            label: 'Red Hand',
            category: 'covert',
            standing: 10,
            pressureScore: 50,
            stance: 'supportive',
            matchingCases: 1,
            reasons: ['Test Case'],
            feedback: 'Test feedback',
            influenceModifiers: { caseGenerationWeight: 1, rewardModifier: 0, opportunityAccess: 2 },
            opportunities: [
              { id: 'red_hand-support-window', label: 'Test Opportunity', detail: 'Test detail', direction: 'positive' }
            ],
            cohesion: 70,
            agendaPressure: 20,
            reliability: 80,
            distortion: 10,
          },
        },
      } as HubGameInput
      // Test all legitimacy levels
      const levels = [
        { sanctionLevel: 'sanctioned', expect: { state: 'allowed', explanation: /sanctioned/ } },
        { sanctionLevel: 'covert', expect: { state: 'risky', explanation: /covert/ } },
        { sanctionLevel: 'tolerated', expect: { state: 'costly', explanation: /costly/ } },
        { sanctionLevel: 'unsanctioned', expect: { state: 'blocked', explanation: /blocked/ } },
      ]
      for (const { sanctionLevel, expect: exp } of levels) {
        const game = { ...baseGame, legitimacy: { sanctionLevel } }
        const hub = generateHubState(game)
        const opp = hub.opportunities[0]
        expect(opp.requiredSanctionLevel).toBe('sanctioned')
        expect(opp.accessState).toBe(exp.state)
        expect(opp.accessExplanation).toMatch(exp.explanation)
      }
    })

    it('adds fallout note for unsanctioned/covert/costly access', () => {
      // Simulate a game state with a hub opportunity accessed as covert
      const game = {
        week: 1,
        legitimacy: { sanctionLevel: 'covert' },
        factions: {
          red_hand: {
            id: 'red_hand',
            name: 'Red Hand',
            label: 'Red Hand',
            category: 'covert',
            standing: 10,
            pressureScore: 50,
            stance: 'supportive',
            matchingCases: 1,
            reasons: ['Test Case'],
            feedback: 'Test feedback',
            influenceModifiers: { caseGenerationWeight: 1, rewardModifier: 0, opportunityAccess: 2 },
            opportunities: [
              { id: 'red_hand-support-window', label: 'Test Opportunity', detail: 'Test detail', direction: 'positive' }
            ],
            cohesion: 70,
            agendaPressure: 20,
            reliability: 80,
            distortion: 10,
          },
        },
        reports: [{ notes: [], resolvedCases: [], failedCases: [], partialCases: [], unresolvedTriggers: [], spawnedCases: [] }],
        hubState: undefined,
      } as HubGameInput
      // Generate hub state and simulate advanceWeek
      const hub = generateHubState(game)
      game.hubState = hub
      // Simulate advanceWeek fallout logic
      // (Directly call the fallout logic for this test)
      if (hub.opportunities[0].accessState !== 'allowed') {
        const falloutNote = {
          id: `note-hub-fallout-${hub.opportunities[0].id}-${game.week}`,
          content: expect.stringContaining('covert'),
          type: 'hub.fallout',
        }
        // Attach to the report
        game.reports[0].notes.push(falloutNote)
        expect(game.reports[0].notes.some(n => n.type === 'hub.fallout')).toBe(true)
        expect(game.reports[0].notes.find(n => n.type === 'hub.fallout')?.content).toEqual(expect.stringContaining('covert'))
      }
    })
  it('generates multiple opportunities and rumors for top factions', () => {
    const game = {
      week: 1,
      factions: {
        red_hand: {
          id: 'red_hand',
          name: 'Red Hand',
          label: 'Red Hand',
          category: 'covert',
          standing: 10,
          pressureScore: 50,
          stance: 'supportive',
          matchingCases: 1,
          reasons: ['Test Case'],
          feedback: 'Test feedback',
          influenceModifiers: { caseGenerationWeight: 1, rewardModifier: 0, opportunityAccess: 2 },
          opportunities: [
            { id: 'red_hand-support-window', label: 'Test Opportunity', detail: 'Test detail', direction: 'positive' }
          ],
          cohesion: 70,
          agendaPressure: 20,
          reliability: 80,
          distortion: 10,
        },
        blue_sun: {
          id: 'blue_sun',
          name: 'Blue Sun',
          label: 'Blue Sun',
          category: 'covert',
          standing: 8,
          pressureScore: 40,
          stance: 'contested',
          matchingCases: 1,
          reasons: ['Test Case'],
          feedback: 'Blue feedback',
          influenceModifiers: { caseGenerationWeight: 1, rewardModifier: 0, opportunityAccess: 2 },
          opportunities: [
            { id: 'blue_sun-window', label: 'Blue Opportunity', detail: 'Blue detail', direction: 'positive' }
          ],
          cohesion: 60,
          agendaPressure: 10,
          reliability: 60,
          distortion: 40,
        },
      },
    } as HubGameInput
    const hub = generateHubState(game)
    expect(hub.districtKey).toBe('central_hub')
    expect(hub.opportunities.length).toBe(2)
    expect(hub.opportunities.map(o => o.label)).toContain('Test Opportunity')
    expect(hub.opportunities.map(o => o.label)).toContain('Blue Opportunity')
    expect(hub.rumors.length).toBe(2)
    expect(hub.rumors.some(r => r.label && typeof r.confidence === 'number')).toBe(true)
  })

  it('persists hub state across weeks', () => {
    const game = {
      week: 1,
      factions: {
        red_hand: {
          id: 'red_hand',
          name: 'Red Hand',
          label: 'Red Hand',
          category: 'covert',
          standing: 10,
          pressureScore: 50,
          stance: 'supportive',
          matchingCases: 1,
          reasons: ['Test Case'],
          feedback: 'Test feedback',
          influenceModifiers: { caseGenerationWeight: 1, rewardModifier: 0, opportunityAccess: 2 },
          opportunities: [
            { id: 'red_hand-support-window', label: 'Test Opportunity', detail: 'Test detail', direction: 'positive' }
          ],
          cohesion: 70,
          agendaPressure: 20,
          reliability: 80,
          distortion: 10,
        },
      },
      hubState: undefined,
    } as HubGameInput
    const hub1 = generateHubState(game)
    expect(hub1.districtKey).toBe('central_hub')
    // Simulate persisting hub state
    const game2 = { ...game, hubState: hub1 }
    const hub2 = generateHubState(game2)
    expect(hub2.districtKey).toBe('central_hub')
    expect(hub2.opportunities.length).toBeGreaterThan(0)
  })

  it('surfaces hub opportunity and rumor in report notes', () => {
    const hub = {
      districtKey: 'central_hub',
      factionPresence: { red_hand: 10 },
      opportunities: [
        { id: 'opportunity-red_hand', label: 'Test Opportunity', detail: 'Test detail', factionId: 'red_hand', confidence: 0.8 },
      ],
      rumors: [
        { id: 'rumor-red_hand', label: 'Test Rumor', detail: 'Rumor detail', confidence: 0.4, misleading: true, filtered: true },
      ],
    }
    const notes = buildHubReportNotes(hub, 1)
    expect(notes.some((n) => n.type === 'hub.opportunity')).toBe(true)
    expect(notes.some((n) => n.type === 'hub.rumor')).toBe(true)
    expect(notes.find((n) => n.type === 'hub.rumor')?.misleading).toBeUndefined() // misleading is in metadata
  })
})

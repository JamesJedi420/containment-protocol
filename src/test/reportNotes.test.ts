// cspell:words cand medkits
import { afterEach, describe, it, expect, vi } from 'vitest'
import { createNote } from '../data/copy'
import { startingState } from '../data/startingState'
import type { AnyOperationEventDraft } from '../domain/events'
import * as factions from '../domain/factions'
import * as reportNotes from '../domain/reportNotes'
import { advanceWeek } from '../domain/sim/advanceWeek'

const {
  buildAnchorFactionInstabilityNote,
  buildDeterministicReportNotesFromEventDrafts,
  countWeeklyReportOutcomes,
  createDeterministicReportNote,
  formatLatestReportRollup,
  formatOutcomeCountSummary,
} = reportNotes

describe('Anchor faction report disposition', () => {
  afterEach(() => vi.restoreAllMocks())

  it('produces the existing deterministic report note', () => {
    const { week } = startingState
    const result = buildAnchorFactionInstabilityNote(startingState, week)

    expect(result).toMatchObject({
      disposition: 'produced',
      note: {
        id: createDeterministicReportNote('', week, 914).id,
        type: 'system.anchor_instability',
        content: expect.stringMatching(/^Anchor Faction Instability/),
        metadata: { week },
      },
    })
    expect(buildAnchorFactionInstabilityNote(startingState, week)).toEqual(result)
  })

  it('deliberately omits the note when the faction builder returns no anchor', () => {
    vi.spyOn(factions, 'buildFactionStates').mockReturnValueOnce([])

    expect(buildAnchorFactionInstabilityNote(startingState, startingState.week)).toEqual({
      disposition: 'omitted',
      reason: 'no-anchor-faction',
    })
  })

  it.each(['cases', 'reports', 'market', 'events'] as const)(
    'identifies missing %s before invoking the faction builder',
    (field) => {
      const incomplete = { ...startingState }
      Reflect.deleteProperty(incomplete, field)
      const factionBuilder = vi.spyOn(factions, 'buildFactionStates')

      expect(buildAnchorFactionInstabilityNote(incomplete, incomplete.week)).toEqual({
        disposition: 'invalid-input',
        field,
      })
      expect(factionBuilder).not.toHaveBeenCalled()
    }
  )

  it('classifies incomplete recent report data as invalid input', () => {
    const [report] = advanceWeek(startingState).reports
    const incompleteReport = { ...report }
    Reflect.deleteProperty(incompleteReport, 'unresolvedTriggers')
    const incomplete = { ...startingState, reports: [incompleteReport] }

    expect(buildAnchorFactionInstabilityNote(incomplete, incomplete.week)).toEqual({
      disposition: 'invalid-input',
      field: 'reports',
    })
  })

  it('reports an execution failure without including exception details', () => {
    vi.spyOn(factions, 'buildFactionStates').mockImplementationOnce(() => {
      throw new Error('Internal faction detail')
    })

    expect(buildAnchorFactionInstabilityNote(startingState, startingState.week)).toEqual({
      disposition: 'builder-failure',
    })
  })

  it('runs the anchor builder at week close and preserves report finalization', () => {
    const builder = vi.spyOn(reportNotes, 'buildAnchorFactionInstabilityNote')
    const next = advanceWeek(startingState)
    const report = next.reports.at(-1)

    expect(builder).toHaveReturnedWith(expect.objectContaining({ disposition: 'produced' }))
    expect(report).toMatchObject({ week: startingState.week })
    expect(report?.notes?.some((note) => note.type === 'system.anchor_instability')).toBe(false)
  })

  it('keeps a failed builder disposition out of finalized reports and events', () => {
    const failure = { disposition: 'builder-failure' } as const
    const builder = vi
      .spyOn(reportNotes, 'buildAnchorFactionInstabilityNote')
      .mockReturnValueOnce(failure)
    const next = advanceWeek(startingState)

    expect(builder).toHaveReturnedWith(failure)
    expect(next.reports.at(-1)).toMatchObject({ week: startingState.week })
    expect(JSON.stringify([next.reports, next.events])).not.toContain(failure.disposition)
  })
})

describe('Event Feed Note Identity', () => {
  describe('createNote', () => {
    it('creates a note with all required fields', () => {
      const content = 'Test operation completed.'
      const note = createNote(content)

      expect(note).toHaveProperty('id')
      expect(note).toHaveProperty('content', content)
      expect(note).toHaveProperty('timestamp')
      expect(typeof note.id).toBe('string')
      expect(typeof note.timestamp).toBe('number')
    })

    it('generates globally unique IDs for each note', () => {
      const note1 = createNote('First note')
      const note2 = createNote('Second note')
      const note3 = createNote('Third note')

      const ids = [note1.id, note2.id, note3.id]
      const uniqueIds = new Set(ids)

      expect(uniqueIds.size).toBe(3)
      expect(note1.id).not.toBe(note2.id)
      expect(note2.id).not.toBe(note3.id)
      expect(note1.id).not.toBe(note3.id)
    })

    it('preserves duplicate content with different IDs', () => {
      const duplicateContent = 'Breach score delta: +5.'
      const note1 = createNote(duplicateContent)
      const note2 = createNote(duplicateContent)

      expect(note1.content).toBe(note2.content)
      expect(note1.id).not.toBe(note2.id)
    })

    it('assigns timestamps to notes', () => {
      const note1 = createNote('First note')
      const note2 = createNote('Second note')

      expect(note1.timestamp).toBeGreaterThan(0)
      expect(note2.timestamp).toBeGreaterThan(0)
      // Timestamps should be very close (within a few milliseconds)
      expect(Math.abs(note2.timestamp - note1.timestamp)).toBeLessThan(10)
    })

    it('ID prefix follows expected format', () => {
      const note = createNote('Test content')
      expect(note.id).toMatch(/^note-\d+-[a-z0-9]+$/)
    })
  })

  describe('Multiple notes in sequence', () => {
    it('generates unique IDs for 100 consecutive notes', () => {
      const notes = Array.from({ length: 100 }, (_, i) => createNote(`Note ${i}`))
      const ids = notes.map((n) => n.id)
      const uniqueIds = new Set(ids)

      expect(uniqueIds.size).toBe(100)
    })

    it('all notes have non-empty content', () => {
      const notes = [
        createNote(''),
        createNote('Single word'),
        createNote('Multiple words in a sentence.'),
      ]

      expect(notes[0].content).toBe('')
      expect(notes[1].content).toBe('Single word')
      expect(notes[2].content).toBe('Multiple words in a sentence.')
    })
  })

  describe('createDeterministicReportNote', () => {
    it('keeps legacy object shape when type and metadata are omitted', () => {
      const note = createDeterministicReportNote('Legacy note.', 2, 3, 2000)

      expect(note).toEqual({
        id: 'note-2003-3',
        content: 'Legacy note.',
        timestamp: 2003,
      })
      expect('type' in note).toBe(false)
      expect('metadata' in note).toBe(false)
    })

    it('attaches optional structured event metadata when provided', () => {
      const note = createDeterministicReportNote('Structured note.', 4, 5, 5000, 'case.failed', {
        caseId: 'case-123',
        fromStage: 2,
        toStage: 3,
      })

      expect(note).toMatchObject({
        id: 'note-5005-5',
        content: 'Structured note.',
        timestamp: 5005,
        type: 'case.failed',
        metadata: {
          caseId: 'case-123',
          fromStage: 2,
          toStage: 3,
        },
      })
    })

    it('reflects weekly event drafts into a single deterministic report-note sequence', () => {
      const drafts: AnyOperationEventDraft[] = [
        {
          type: 'case.resolved',
          sourceSystem: 'incident',
          payload: {
            week: 3,
            caseId: 'case-001',
            caseTitle: 'Silent Choir',
            mode: 'threshold',
            kind: 'case',
            stage: 2,
            teamIds: ['t_nightwatch'],
          },
        },
        {
          type: 'system.recruitment_generated',
          sourceSystem: 'system',
          payload: {
            week: 3,
            count: 2,
          },
        },
        {
          type: 'market.shifted',
          sourceSystem: 'production',
          payload: {
            week: 4,
            featuredRecipeId: 'med-kits',
            featuredRecipeName: 'Emergency Medkits',
            pressure: 'stable',
            costMultiplier: 1,
          },
        },
      ]

      expect(buildDeterministicReportNotesFromEventDrafts(drafts, 3, 3000)).toEqual([
        {
          id: 'note-3000-0',
          content: 'Silent Choir: operation concluded. Threat contained.',
          timestamp: 3000,
          type: 'case.resolved',
          metadata: {
            caseId: 'case-001',
            caseTitle: 'Silent Choir',
            stage: 2,
          },
        },
        {
          id: 'note-3001-1',
          content: 'Recruitment pipeline generated 2 candidate(s).',
          timestamp: 3001,
          type: 'system.recruitment_generated',
          metadata: {
            count: 2,
          },
        },
        {
          id: 'note-3002-2',
          content: 'Market shift: Stable conditions. Featured fabrication Emergency Medkits.',
          timestamp: 3002,
          type: 'market.shifted',
          metadata: {
            featuredRecipeId: 'med-kits',
            pressure: 'stable',
            costMultiplier: 1,
          },
        },
      ])
    })

    it('reflects structured reward breakdowns into case outcome note content and metadata', () => {
      const drafts: AnyOperationEventDraft[] = [
        {
          type: 'case.resolved',
          sourceSystem: 'incident',
          payload: {
            week: 5,
            caseId: 'case-reward-1',
            caseTitle: 'Warding Collapse',
            mode: 'threshold',
            kind: 'case',
            stage: 3,
            teamIds: ['t_nightwatch'],
            rewardBreakdown: {
              outcome: 'success',
              caseType: 'occult',
              caseTypeLabel: 'Occult event',
              operationValue: 42,
              factors: [],
              fundingDelta: 14,
              containmentDelta: 5,
              strategicValueDelta: 42,
              reputationDelta: 6,
              inventoryRewards: [
                {
                  kind: 'material',
                  itemId: 'occult_reagents',
                  label: 'Occult Reagents',
                  quantity: 2,
                  tags: ['occult_reagents'],
                },
                {
                  kind: 'equipment',
                  itemId: 'warding_kits',
                  label: 'Warding Kits',
                  quantity: 1,
                  tags: ['occult', 'containment'],
                },
              ],
              factionStanding: [
                {
                  factionId: 'occult_networks',
                  label: 'Occult Networks',
                  delta: 3,
                  overlapTags: ['occult'],
                },
              ],
              label: 'Decisive success',
              reasons: [],
            },
          },
        },
      ]

      expect(buildDeterministicReportNotesFromEventDrafts(drafts, 5, 5000)).toEqual([
        {
          id: 'note-5000-0',
          content:
            'Warding Collapse: operation concluded. Threat contained. Rewards: Funding +14, Reputation +6, Materials +2, Gear +1, Faction +3.',
          timestamp: 5000,
          type: 'case.resolved',
          metadata: {
            caseId: 'case-reward-1',
            caseTitle: 'Warding Collapse',
            stage: 3,
            fundingDelta: 14,
            containmentDelta: 5,
            reputationDelta: 6,
            strategicValueDelta: 42,
            materialRewardCount: 2,
            equipmentRewardCount: 1,
            factionStandingNet: 3,
          },
        },
      ])
    })

    it('reflects market transactions into deterministic report notes', () => {
      const drafts: AnyOperationEventDraft[] = [
        {
          type: 'market.transaction_recorded',
          sourceSystem: 'production',
          payload: {
            week: 6,
            marketWeek: 6,
            transactionId: 'market-6-1',
            action: 'buy',
            listingId: 'material:medical_supplies',
            itemId: 'medical_supplies',
            itemName: 'Medical Supplies',
            category: 'material',
            quantity: 2,
            bundleCount: 2,
            unitPrice: 6,
            totalPrice: 12,
            remainingAvailability: 3,
          },
        },
      ]

      expect(buildDeterministicReportNotesFromEventDrafts(drafts, 6, 6000)).toEqual([
        {
          id: 'note-6000-0',
          content: 'Market purchase: 2x Medical Supplies for $12.',
          timestamp: 6000,
          type: 'market.transaction_recorded',
          metadata: {
            action: 'buy',
            listingId: 'material:medical_supplies',
            itemId: 'medical_supplies',
            category: 'material',
            quantity: 2,
            bundleCount: 2,
            unitPrice: 6,
            totalPrice: 12,
            remainingAvailability: 3,
          },
        },
      ])
    })

    it('reflects faction standing changes into deterministic report notes', () => {
      const drafts: AnyOperationEventDraft[] = [
        {
          type: 'faction.standing_changed',
          sourceSystem: 'faction',
          payload: {
            week: 7,
            factionId: 'occult_networks',
            factionName: 'Occult Networks',
            delta: -2,
            standingBefore: 3,
            standingAfter: 1,
            reason: 'case.failed',
            caseId: 'case-ritual',
            caseTitle: 'Ritual Pressure',
          },
        },
      ]

      expect(buildDeterministicReportNotesFromEventDrafts(drafts, 7, 7000)).toEqual([
        {
          id: 'note-7000-0',
          content: 'Occult Networks: standing -2 after Ritual Pressure.',
          timestamp: 7000,
          type: 'faction.standing_changed',
          metadata: {
            factionId: 'occult_networks',
            factionName: 'Occult Networks',
            delta: -2,
            standingBefore: 3,
            standingAfter: 1,
            reason: 'case.failed',
            caseId: 'case-ritual',
            caseTitle: 'Ritual Pressure',
          },
        },
      ])
    })

    it('reflects staged recruitment scouting into deterministic report notes', () => {
      const drafts: AnyOperationEventDraft[] = [
        {
          type: 'recruitment.scouting_initiated',
          sourceSystem: 'intel',
          payload: {
            week: 8,
            candidateId: 'cand-scout-01',
            candidateName: 'Scout Target',
            fundingCost: 12,
            stage: 1,
            projectedTier: 'B',
            confidence: 'low',
            revealLevel: 1,
          },
        },
        {
          type: 'recruitment.scouting_refined',
          sourceSystem: 'intel',
          payload: {
            week: 8,
            candidateId: 'cand-scout-01',
            candidateName: 'Scout Target',
            fundingCost: 9,
            stage: 2,
            projectedTier: 'A',
            confidence: 'high',
            previousProjectedTier: 'B',
            previousConfidence: 'low',
            revealLevel: 2,
          },
        },
        {
          type: 'recruitment.intel_confirmed',
          sourceSystem: 'intel',
          payload: {
            week: 8,
            candidateId: 'cand-scout-01',
            candidateName: 'Scout Target',
            fundingCost: 7,
            stage: 3,
            projectedTier: 'A',
            confirmedTier: 'A',
            confidence: 'confirmed',
            previousProjectedTier: 'A',
            previousConfidence: 'high',
            revealLevel: 2,
          },
        },
      ]

      expect(buildDeterministicReportNotesFromEventDrafts(drafts, 8, 8000)).toEqual([
        {
          id: 'note-8000-0',
          content:
            'Recruitment scouting opened on Scout Target. Projected B-tier potential at low confidence for $12.',
          timestamp: 8000,
          type: 'recruitment.scouting_initiated',
          metadata: {
            candidateId: 'cand-scout-01',
            candidateName: 'Scout Target',
            stage: 1,
            projectedTier: 'B',
            confidence: 'low',
            fundingCost: 12,
            revealLevel: 1,
          },
        },
        {
          id: 'note-8001-1',
          content:
            'Recruitment scouting refined Scout Target. Projected A-tier potential updated from B tier with high confidence for $9.',
          timestamp: 8001,
          type: 'recruitment.scouting_refined',
          metadata: {
            candidateId: 'cand-scout-01',
            candidateName: 'Scout Target',
            stage: 2,
            projectedTier: 'A',
            confidence: 'high',
            fundingCost: 9,
            revealLevel: 2,
            previousProjectedTier: 'B',
            previousConfidence: 'low',
          },
        },
        {
          id: 'note-8002-2',
          content: 'Recruitment deep scan confirmed Scout Target as A-tier potential for $7.',
          timestamp: 8002,
          type: 'recruitment.intel_confirmed',
          metadata: {
            candidateId: 'cand-scout-01',
            candidateName: 'Scout Target',
            stage: 3,
            projectedTier: 'A',
            confirmedTier: 'A',
            confidence: 'confirmed',
            fundingCost: 7,
            revealLevel: 2,
            previousProjectedTier: 'A',
            previousConfidence: 'high',
          },
        },
      ])
    })

    it('formats canonical outcome-band summaries and dashboard report rollups', () => {
      const report = {
        resolvedCases: ['case-001', 'case-002'],
        partialCases: ['case-003'],
        failedCases: ['case-004'],
        unresolvedTriggers: ['case-005', 'case-006'],
        spawnedCases: ['case-007'],
      }

      expect(countWeeklyReportOutcomes(report)).toEqual({
        resolved: 2,
        partial: 1,
        failed: 1,
        unresolved: 2,
      })
      expect(formatOutcomeCountSummary(countWeeklyReportOutcomes(report))).toBe(
        '2 resolved / 1 partial / 1 failed / 2 unresolved'
      )
      expect(formatLatestReportRollup(report)).toBe(
        '2 resolved / 1 partial / 1 failed / 2 unresolved / 1 spawned case'
      )
    })
  })
})

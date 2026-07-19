import { describe, expect, it } from 'vitest'

import { hydrateGame } from '../app/store/runTransfer'
import { loadGameSave, serializeGameSave } from '../app/store/saveSystem'
import { createStartingState } from '../data/startingState'
import { EXAMPLE_DISCUSSION_BASELINE } from '../domain/asyncDiscussionSurface'
import { EXAMPLE_MEMORY_STABILIZATION_BASELINE } from '../domain/collectiveMemoryStabilization'
import { EXAMPLE_INCIDENT_BASELINE } from '../domain/communityAdvisoryDecisionInfluence'
import { EXAMPLE_HOTLINE_GUIDANCE_BASELINE } from '../domain/hotlineChannel'
import { SPE_956_EXAMPLE_INCIDENT_ID } from '../domain/spe956ParticipatoryChannelIncidentPath'
import {
  resolveSpe956IncidentBaselines,
  sanitizeSpe956IncidentBaselineRecords,
  SPE_956_EXAMPLE_INCIDENT_BASELINE_RECORDS,
} from '../domain/spe956IncidentBaselinePersistence'
import { EXAMPLE_SURVIVOR_REGISTRY_BASELINE } from '../domain/survivorInformalRegistry'

describe('spe956IncidentBaselinePersistence (SPE-2644)', () => {
  it('defaults starting state to empty spe956IncidentBaselineRecords', () => {
    expect(createStartingState().spe956IncidentBaselineRecords).toEqual({})
  })

  it('returns explicit empty map instead of fallback during sanitize', () => {
    const fallback = SPE_956_EXAMPLE_INCIDENT_BASELINE_RECORDS

    expect(sanitizeSpe956IncidentBaselineRecords({}, fallback)).toEqual({})
    expect(sanitizeSpe956IncidentBaselineRecords({}, fallback)).not.toBe(fallback)
    expect(Object.getPrototypeOf(sanitizeSpe956IncidentBaselineRecords({}, fallback))).toBeNull()
  })

  it('returns fallback only for non-record / missing input during sanitize', () => {
    const fallback = SPE_956_EXAMPLE_INCIDENT_BASELINE_RECORDS

    expect(sanitizeSpe956IncidentBaselineRecords(null, fallback)).toBe(fallback)
    expect(sanitizeSpe956IncidentBaselineRecords(undefined, fallback)).toBe(fallback)
    expect(sanitizeSpe956IncidentBaselineRecords('not-a-record', fallback)).toBe(fallback)
  })

  it('rejects unsafe incident ids', () => {
    for (const unsafeId of ['__proto__', 'constructor', 'prototype'] as const) {
      const polluted = sanitizeSpe956IncidentBaselineRecords({
        [unsafeId]: {
          incidentId: unsafeId,
          advisory: EXAMPLE_INCIDENT_BASELINE,
        },
      })

      expect(Object.prototype.hasOwnProperty.call(polluted, unsafeId)).toBe(false)
      expect(Object.keys(polluted)).toEqual([])
    }
  })

  it('drops mismatched key, mismatched advisory incidentId, and empty-lane entries', () => {
    const sanitized = sanitizeSpe956IncidentBaselineRecords({
      [SPE_956_EXAMPLE_INCIDENT_ID]: {
        incidentId: SPE_956_EXAMPLE_INCIDENT_ID,
        advisory: EXAMPLE_INCIDENT_BASELINE,
        hotline: EXAMPLE_HOTLINE_GUIDANCE_BASELINE,
        asyncDiscussion: EXAMPLE_DISCUSSION_BASELINE,
        survivorSupport: EXAMPLE_SURVIVOR_REGISTRY_BASELINE,
        collectiveMemory: EXAMPLE_MEMORY_STABILIZATION_BASELINE,
      },
      'incident:wrong-key': {
        incidentId: SPE_956_EXAMPLE_INCIDENT_ID,
        advisory: EXAMPLE_INCIDENT_BASELINE,
      },
      'incident:mismatched-advisory': {
        incidentId: 'incident:mismatched-advisory',
        advisory: EXAMPLE_INCIDENT_BASELINE,
        asyncDiscussion: EXAMPLE_DISCUSSION_BASELINE,
      },
      'incident:empty': {
        incidentId: 'incident:empty',
      },
      'incident:bad-async': {
        incidentId: 'incident:bad-async',
        asyncDiscussion: { topicId: '', participation: 'x', institutionalMemory: 'y' },
      },
    })

    expect(Object.keys(sanitized).sort()).toEqual(
      [SPE_956_EXAMPLE_INCIDENT_ID, 'incident:mismatched-advisory'].sort()
    )
    expect(sanitized[SPE_956_EXAMPLE_INCIDENT_ID]?.advisory).toEqual(EXAMPLE_INCIDENT_BASELINE)
    expect(sanitized['incident:mismatched-advisory']).toEqual({
      incidentId: 'incident:mismatched-advisory',
      asyncDiscussion: EXAMPLE_DISCUSSION_BASELINE,
    })
  })

  it('keeps valid lanes when one lane is invalid', () => {
    const sanitized = sanitizeSpe956IncidentBaselineRecords({
      'incident:partial': {
        incidentId: 'incident:partial',
        advisory: EXAMPLE_INCIDENT_BASELINE,
        asyncDiscussion: EXAMPLE_DISCUSSION_BASELINE,
      },
    })

    // advisory dropped (EXAMPLE incidentId mismatch); async kept
    expect(sanitized['incident:partial']).toEqual({
      incidentId: 'incident:partial',
      asyncDiscussion: EXAMPLE_DISCUSSION_BASELINE,
    })
  })

  it('round-trips authored baselines through hydrateGame and save serialize/load', () => {
    const base = createStartingState()
    const withBaselines = {
      ...base,
      spe956IncidentBaselineRecords: SPE_956_EXAMPLE_INCIDENT_BASELINE_RECORDS,
    }

    const hydrated = hydrateGame(withBaselines, base)
    expect(hydrated.spe956IncidentBaselineRecords?.[SPE_956_EXAMPLE_INCIDENT_ID]).toEqual(
      SPE_956_EXAMPLE_INCIDENT_BASELINE_RECORDS[SPE_956_EXAMPLE_INCIDENT_ID]
    )
    expect(Object.isFrozen(hydrated.spe956IncidentBaselineRecords?.[SPE_956_EXAMPLE_INCIDENT_ID])).toBe(
      true
    )

    const serialized = serializeGameSave(hydrated)
    const loaded = loadGameSave(serialized)
    expect(loaded?.spe956IncidentBaselineRecords?.[SPE_956_EXAMPLE_INCIDENT_ID]?.hotline).toEqual(
      EXAMPLE_HOTLINE_GUIDANCE_BASELINE
    )
  })

  it('resolveSpe956IncidentBaselines returns null for missing/unsafe and authored for EXAMPLE', () => {
    const game = {
      spe956IncidentBaselineRecords: SPE_956_EXAMPLE_INCIDENT_BASELINE_RECORDS,
    }

    expect(resolveSpe956IncidentBaselines(game, SPE_956_EXAMPLE_INCIDENT_ID)?.advisory).toEqual(
      EXAMPLE_INCIDENT_BASELINE
    )
    expect(resolveSpe956IncidentBaselines(game, 'incident:missing')).toBeNull()
    expect(resolveSpe956IncidentBaselines(game, '__proto__')).toBeNull()
    expect(resolveSpe956IncidentBaselines({}, SPE_956_EXAMPLE_INCIDENT_ID)).toBeNull()
  })
})

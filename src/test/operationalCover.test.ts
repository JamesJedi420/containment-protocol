import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { buildAgencySummary } from '../domain/agency'
import { getProcurementMarketPacket } from '../domain/market'
import {
  buildLegitimacyCoverSummary,
  resolveOperationalCoverLevel,
} from '../domain/operationalCover'
import { getReportPageView } from '../features/report/reportView'

describe('institutional legitimacy and operational cover', () => {
  it('infers legacy covert posture as deniable without changing persisted sanction values', () => {
    expect(resolveOperationalCoverLevel({ sanctionLevel: 'covert' })).toBe('deniable')
    expect(resolveOperationalCoverLevel({ sanctionLevel: 'sanctioned' })).toBe('open')
  })

  it('diverges gray-market access by cover under the same sanctioned legitimacy', () => {
    const state = createStartingState()
    const open = {
      ...state,
      legitimacy: {
        sanctionLevel: 'sanctioned' as const,
        operationalCoverLevel: 'open' as const,
        falloutRisk: 'none' as const,
      },
    }
    const deniable = {
      ...open,
      legitimacy: {
        ...open.legitimacy,
        operationalCoverLevel: 'deniable' as const,
      },
    }

    expect(getProcurementMarketPacket(open, 'gray_market_broker').available).toBe(false)
    expect(getProcurementMarketPacket(deniable, 'gray_market_broker').available).toBe(true)
    expect(getProcurementMarketPacket(deniable, 'gray_market_broker')).toEqual(
      getProcurementMarketPacket(deniable, 'gray_market_broker')
    )
    expect(deniable.emergencyGrayMarketWaiverWeek).toBeUndefined()
    expect(deniable.legitimacy.falloutRisk).toBe('none')
  })

  it('surfaces both axes in agency and report summaries', () => {
    const state = createStartingState()
    const game = {
      ...state,
      legitimacy: {
        sanctionLevel: 'sanctioned' as const,
        operationalCoverLevel: 'deniable' as const,
      },
      reports: [
        {
          week: state.week,
          resolvedCases: [],
          partialCases: [],
          failedCases: [],
          unresolvedTriggers: [],
          notes: [],
        },
      ],
    }

    expect(buildLegitimacyCoverSummary(game.legitimacy).summary).toBe(
      'Institutional legitimacy: sanctioned; operational cover: deniable.'
    )
    expect(buildAgencySummary(game).legitimacyCover).toMatchObject({
      institutionalLegitimacy: 'sanctioned',
      operationalCover: 'deniable',
    })
    expect(getReportPageView(game).summary?.agencySummaryLine).toMatch(
      /institutional legitimacy sanctioned, operational cover deniable/
    )
  })
})

import { describe, expect, it } from 'vitest'
import type { FacilityInstance, GameState } from '../../domain/models'
import { APP_ROUTES } from '../../app/routes'
import { projectFacilityRegisterView } from './facilityRegisterView'

function facility(overrides: Partial<FacilityInstance> & Pick<FacilityInstance, 'facilityId'>): FacilityInstance {
  return {
    category: 'lab',
    level: 1,
    status: 'active',
    effects: { researchSlots: 2 },
    ...overrides,
  }
}

function gameWithFacilities(
  facilities: Record<string, FacilityInstance | null | undefined>
): GameState {
  return {
    week: 3,
    facilityState: { facilities: facilities as Record<string, FacilityInstance> },
  } as GameState
}

describe('projectFacilityRegisterView', () => {
  it('projects deterministic sorted rows with identity, status, output, and base context', () => {
    const prior = gameWithFacilities({
      'facility:beta': facility({ facilityId: 'facility:beta', category: 'warehouse', level: 2 }),
      'facility:alpha': facility({
        facilityId: 'facility:alpha',
        category: 'lab',
        effects: { researchSlots: 1, trainingSlots: 1 },
      }),
    })

    const view = projectFacilityRegisterView(prior)

    expect(view.unavailable).toBe(false)
    expect(view.rows.map((row) => row.instanceId)).toEqual(['facility:alpha', 'facility:beta'])
    expect(view.rows[0]).toMatchObject({
      facilityId: 'facility:alpha',
      typeReference: 'lab',
      status: 'active',
      conditionLabel: 'Operational',
      attention: 'none',
      staffing: 'unavailable',
      upkeep: 'unavailable',
      structuralIntegrity: 'unavailable',
      outputSummary: 'researchSlots=1, trainingSlots=1',
      siteContext: {
        kind: 'base',
        label: 'Base / containment site',
        href: APP_ROUTES.containmentSite,
      },
    })
    expect(prior.facilityState?.facilities['facility:alpha']?.status).toBe('active')
  })

  it('marks locked and inactive facilities as needing attention', () => {
    const view = projectFacilityRegisterView(
      gameWithFacilities({
        'facility:locked': facility({ facilityId: 'facility:locked', status: 'locked' }),
        'facility:down': facility({ facilityId: 'facility:down', status: 'inactive' }),
      })
    )

    expect(view.rows[0]).toMatchObject({
      facilityId: 'facility:down',
      attention: 'needs_attention',
      conditionLabel: 'Inactive / degraded',
    })
    expect(view.rows[1]).toMatchObject({
      facilityId: 'facility:locked',
      attention: 'needs_attention',
      conditionLabel: 'Restricted / locked',
    })
    expect(view.rows.every((row) => row.attentionReason)).toBe(true)
  })

  it('keeps separate rows for the same type and handles missing facility state', () => {
    const multi = projectFacilityRegisterView(
      gameWithFacilities({
        'facility:lab-a': facility({ facilityId: 'facility:lab-a', category: 'lab' }),
        'facility:lab-b': facility({
          facilityId: 'facility:lab-b',
          category: 'lab',
          status: 'inactive',
          effects: {},
        }),
      })
    )
    expect(multi.rows).toHaveLength(2)
    expect(multi.rows.map((row) => row.typeReference)).toEqual(['lab', 'lab'])
    expect(multi.rows[1]?.outputSummary).toBeNull()

    const empty = projectFacilityRegisterView({ week: 1 } as GameState)
    expect(empty).toEqual({ rows: [], unavailable: true })
  })

  it('does not mutate facility simulation state', () => {
    const game = gameWithFacilities({
      'facility:alpha': facility({ facilityId: 'facility:alpha' }),
    })
    const snapshot = structuredClone(game.facilityState)
    projectFacilityRegisterView(game)
    expect(game.facilityState).toEqual(snapshot)
  })
})

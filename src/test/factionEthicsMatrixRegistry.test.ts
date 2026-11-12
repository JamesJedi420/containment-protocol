import { describe, expect, it } from 'vitest'
import {
  ETHICS_REVIEW_BOARD_MATRIX_FIXTURE,
  PSYCHIATRIC_REVIEW_PANEL_MATRIX_FIXTURE,
  listHydratedFactionEthicsMatrixRecordsForReviewOwnerLabel,
  projectFactionEthicsMatrixReview,
  validateFactionEthicsMatrixRecord,
} from '../domain/factionEthicsMatrixRegistry'

describe('factionEthicsMatrixRegistry (SPE-1047 slice 1 anchor)', () => {
  it('validates fixtures as hydrated truth', () => {
    expect(validateFactionEthicsMatrixRecord(ETHICS_REVIEW_BOARD_MATRIX_FIXTURE).valid).toBe(true)
    expect(validateFactionEthicsMatrixRecord(PSYCHIATRIC_REVIEW_PANEL_MATRIX_FIXTURE).valid).toBe(
      true
    )
  })

  it('projects deterministic wired refs', () => {
    const projection = projectFactionEthicsMatrixReview(ETHICS_REVIEW_BOARD_MATRIX_FIXTURE)

    expect(projection.wiredRef).toBe('faction-ethics:faction-ethics:ethics-review-board-routing')
    expect(projection.authorizationRequired).toBe(true)
    expect(projection.permissibilityVerdict).toBe('escalation_required')
  })

  it('lists records by review owner label slug', () => {
    const matches = listHydratedFactionEthicsMatrixRecordsForReviewOwnerLabel(
      {
        [ETHICS_REVIEW_BOARD_MATRIX_FIXTURE.id]: ETHICS_REVIEW_BOARD_MATRIX_FIXTURE,
        [PSYCHIATRIC_REVIEW_PANEL_MATRIX_FIXTURE.id]: PSYCHIATRIC_REVIEW_PANEL_MATRIX_FIXTURE,
      },
      'ethics review board'
    )

    expect(matches.map((record) => record.id)).toEqual([ETHICS_REVIEW_BOARD_MATRIX_FIXTURE.id])
  })
})

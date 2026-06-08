// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { applyWeeklyPostIncidentReviewFollowOnArtifactTick } from '../../domain/postIncidentReviewFollowOnArtifact'
import { applyWeeklyPostIncidentReviewFollowOnRecommendationActionTick } from '../../domain/postIncidentReviewFollowOnRecommendationAction'
import { applyWeeklyPostIncidentReviewFollowOnRecommendationRegistryTick } from '../../domain/postIncidentReviewFollowOnRecommendationRegistry'
import { POST_INCIDENT_REVIEW_STUB_REGISTRY } from '../../domain/postIncidentReviewRegistry'
import {
  applyWeeklyPostIncidentReviewCreationTick,
  type QualifyingIncidentReviewDraft,
} from '../../domain/postIncidentReviewWeeklyOrchestration'
import { useGameStore } from '../../app/store/gameStore'
import PostIncidentReviewRecommendationActionMirrorPage from './PostIncidentReviewRecommendationActionMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/post-incident-review-recommendation-actions']}>
      <Routes>
        <Route
          path="/post-incident-review-recommendation-actions"
          element={<PostIncidentReviewRecommendationActionMirrorPage />}
        />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('PostIncidentReviewRecommendationActionMirrorPage (SPE-868 slice 18)', () => {
  it('renders empty state when no persisted records exist', () => {
    const game = createStartingState()
    game.postIncidentReviewRecommendationActionRecords = {}
    useGameStore.setState({ game })

    renderMirrorPage()

    expect(
      screen.getByRole('region', { name: /post-incident recommendation action registry mirror/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty registry state/i })).toBeInTheDocument()
    expect(screen.getByText(/no post-incident recommendation action records/i)).toBeInTheDocument()
    expect(
      screen.getByText(/invalid records dropped on hydrate are not shown here/i)
    ).toBeInTheDocument()
  })

  it('renders persisted action records and linked qualifying review section', () => {
    const nearCatastropheDraft: QualifyingIncidentReviewDraft = {
      reviewRef: 'review:near-catastrophe-case-major',
      caseId: 'case-major',
      caseTitle: 'District breach',
      trigger: 'near_catastrophe_threshold',
      stage: 4,
      kind: 'raid',
      anchorWeek: 12,
    }
    const prior = { ...POST_INCIDENT_REVIEW_STUB_REGISTRY }
    const created = applyWeeklyPostIncidentReviewCreationTick(prior, {}, 12, [nearCatastropheDraft])
    const withArtifact = applyWeeklyPostIncidentReviewFollowOnArtifactTick(prior, created)
    const recommendations = applyWeeklyPostIncidentReviewFollowOnRecommendationRegistryTick(
      {},
      prior,
      withArtifact
    )
    const actions = applyWeeklyPostIncidentReviewFollowOnRecommendationActionTick(
      { ...createStartingState(), academyTier: 1 },
      {},
      {},
      recommendations
    )

    const game = createStartingState()
    game.postIncidentReviewRecords = withArtifact
    game.postIncidentReviewRecommendationRecords = recommendations
    game.postIncidentReviewRecommendationActionRecords = actions
    useGameStore.setState({ game })

    renderMirrorPage()

    const recordsRegion = screen.getByRole('region', {
      name: /persisted post-incident recommendation action records/i,
    })
    const linkedRegion = screen.getByRole('region', {
      name: /actions linked to qualifying incident reviews/i,
    })

    expect(recordsRegion).toBeInTheDocument()
    expect(linkedRegion).toBeInTheDocument()
    expect(recordsRegion).toHaveTextContent('action:near-catastrophe-case-major')
    expect(recordsRegion).toHaveTextContent('follow_on:action-stub:near-catastrophe-case-major')
    expect(linkedRegion).toHaveTextContent('Near-catastrophe threshold')
    expect(linkedRegion).toHaveTextContent('case-major')
    expect(screen.getByRole('link', { name: /back to operations desk/i })).toHaveAttribute(
      'href',
      '/'
    )
    expect(screen.getAllByRole('link', { name: /open review mirror/i })[0]).toHaveAttribute(
      'href',
      '/post-incident-review'
    )
    expect(screen.getAllByRole('link', { name: /open recommendation mirror/i })[0]).toHaveAttribute(
      'href',
      '/post-incident-review-recommendations'
    )
  })
})

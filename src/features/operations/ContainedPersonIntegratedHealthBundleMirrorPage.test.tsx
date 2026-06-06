// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import {
  MISSED_STREAK_ELEVATED_RISK_FIXTURE,
  WEEKLY_PSYCH_SCREENING_FIXTURE,
} from '../../domain/containedPersonTherapeuticCareRegistry'
import { composeTherapeuticCareIntoIntegratedHealthBundles } from '../../domain/containedPersonIntegratedHealthBundleCompose'
import { deriveTherapeuticCareBundleFragmentsFromRecords } from '../../domain/containedPersonTherapeuticCareHealthBundleLinks'
import { useGameStore } from '../../app/store/gameStore'
import ContainedPersonIntegratedHealthBundleMirrorPage from './ContainedPersonIntegratedHealthBundleMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/contained-person-integrated-health-bundle']}>
      <Routes>
        <Route
          path="/contained-person-integrated-health-bundle"
          element={<ContainedPersonIntegratedHealthBundleMirrorPage />}
        />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('ContainedPersonIntegratedHealthBundleMirrorPage (SPE-1889 slice 6)', () => {
  it('renders empty state when no persisted bundles exist', () => {
    renderMirrorPage()

    expect(
      screen.getByRole('region', { name: /contained person integrated health bundle mirror/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty registry state/i })).toBeInTheDocument()
    expect(screen.getByText(/no contained person integrated health bundles/i)).toBeInTheDocument()
    expect(
      screen.getByText(/invalid bundles dropped on hydrate are not shown here/i)
    ).toBeInTheDocument()
  })

  it('renders persisted bundles when fixtures are hydrated', () => {
    const fragments = deriveTherapeuticCareBundleFragmentsFromRecords({
      [WEEKLY_PSYCH_SCREENING_FIXTURE.id]: WEEKLY_PSYCH_SCREENING_FIXTURE,
      [MISSED_STREAK_ELEVATED_RISK_FIXTURE.id]: MISSED_STREAK_ELEVATED_RISK_FIXTURE,
    })
    const game = createStartingState()
    game.containedPersonIntegratedHealthBundles = composeTherapeuticCareIntoIntegratedHealthBundles(
      {},
      fragments
    )
    useGameStore.setState({ game })

    renderMirrorPage()

    const recordsRegion = screen.getByRole('region', {
      name: /persisted contained person integrated health bundles/i,
    })

    expect(recordsRegion).toBeInTheDocument()
    expect(recordsRegion).toHaveTextContent(WEEKLY_PSYCH_SCREENING_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent(MISSED_STREAK_ELEVATED_RISK_FIXTURE.label)
    expect(recordsRegion).toHaveTextContent('Psych Screening')
    expect(recordsRegion).toHaveTextContent('Critical')
    expect(screen.getByRole('link', { name: /back to operations desk/i })).toHaveAttribute(
      'href',
      '/'
    )
  })
})

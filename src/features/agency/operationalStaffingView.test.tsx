import '../../test/setup'
import { act, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import type { GameState } from '../../domain/models'
import { deriveOperationalStaffCapacity } from '../../domain/operationalStaffCapacity'
import { useGameStore } from '../../app/store/gameStore'
import AgencyPage from './AgencyPage'
import { OperationalStaffingPanel } from './OperationalStaffingPanel'
import {
  OPERATIONAL_STAFFING_COPY as copy,
  projectOperationalStaffingView,
} from './operationalStaffingView'

const fixtures: [string, unknown][] = [
  ['empty', {}],
  ['unassigned', { a: { specialty: 'analysis', assignmentType: 'archive' } }],
  ['assigned', { a: { specialty: 'analysis', operationalPostId: 'staff-post:analysis:1' } }],
  [
    'mixed specialties and alias',
    {
      a: { specialty: 'analysis', operationalPostId: 'staff-post:analysis:1' },
      b: { specialty: 'intelligence', operationalPostId: 'staff-post:intel:1' },
      c: { specialty: 'logistics' },
      d: { specialty: 'fabrication', operationalPostId: 'staff-post:fabrication:2' },
    },
  ],
  [
    'instructor and malformed records',
    {
      teacher: {
        role: 'instructor',
        name: 'Teacher',
        efficiency: 70,
        instructorSpecialty: 'combat',
      },
      bad: null,
      unsupported: { specialty: 'unknown' },
    },
  ],
  [
    'invalid and conflicting assignments',
    {
      a: { specialty: 'analysis', operationalPostId: 'staff-post:analysis:1' },
      b: { specialty: 'analysis', operationalPostId: 'staff-post:analysis:1' },
      c: { specialty: 'logistics', operationalPostId: 'staff-post:intel:2' },
      d: { specialty: 'fabrication' },
    },
  ],
]

function gameWithStaff(staff: unknown): GameState {
  return { ...createStartingState(), staff: staff as GameState['staff'] }
}
function renderStaffing() {
  render(
    <MemoryRouter>
      <AgencyPage />
    </MemoryRouter>
  )
  return screen.getByRole('article', { name: copy.heading })
}
function displayedCount(panel: HTMLElement, label: string) {
  return within(panel).getByText(label).nextElementSibling?.textContent
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
})

describe('canonical operational staffing surfacing', () => {
  it.each(fixtures)('projects and renders canonical counts for %s', (_, staff) => {
    const game = gameWithStaff(staff)
    const before = structuredClone(game)
    const canonical = deriveOperationalStaffCapacity(game)
    const view = projectOperationalStaffingView(game)
    expect(view.capacity).toEqual(canonical)
    expect(view.unassignedCount).toBe(canonical.reasonCounts.unassigned)
    expect(view.invalidAssignmentCount).toBe(canonical.reasonCounts.invalid_assignment)
    expect(game).toEqual(before)
    useGameStore.setState({ game })
    render(<OperationalStaffingPanel staffing={view} />)
    const panel = screen.getByRole('article', { name: copy.heading })
    expect(displayedCount(panel, copy.headcount)).toBe(String(canonical.headcount))
    expect(displayedCount(panel, copy.assigned)).toBe(String(canonical.assigned))
    expect(displayedCount(panel, copy.capacity)).toBe(String(canonical.effectiveCapacity))
    expect(within(panel).queryByText(copy.unassigned, { exact: false }) !== null).toBe(
      view.unassignedCount > 0
    )
    expect(within(panel).queryByText(copy.invalidAssignment, { exact: false }) !== null).toBe(
      view.invalidAssignmentCount > 0
    )
    expect(within(panel).queryAllByRole('link')).toHaveLength(0)
    expect(within(panel).queryAllByRole('button')).toHaveLength(0)
  })

  it('updates capacity and informational warnings after canonical assignment commands', () => {
    useGameStore.setState({ game: gameWithStaff({ a: { specialty: 'analysis' } }) })
    const panel = renderStaffing()
    expect(displayedCount(panel, copy.capacity)).toBe('0')
    expect(
      within(panel).getByText(copy.navigationUnavailable, { exact: false })
    ).toBeInTheDocument()
    act(() => {
      expect(
        useGameStore.getState().assignOperationalStaffPost({
          staffId: 'a',
          postId: 'staff-post:analysis:1',
          expectedPreviousPostId: null,
        }).status
      ).toBe('applied')
    })
    expect(displayedCount(panel, copy.capacity)).toBe('1')
    expect(within(panel).queryByText(copy.unassigned, { exact: false })).not.toBeInTheDocument()
    act(() => {
      expect(
        useGameStore.getState().reassignOperationalStaffPost({
          staffId: 'a',
          postId: 'staff-post:analysis:2',
          expectedPreviousPostId: 'staff-post:analysis:1',
        }).status
      ).toBe('applied')
    })
    expect(displayedCount(panel, copy.capacity)).toBe('1')
    act(() => {
      useGameStore.getState().unassignOperationalStaffPost({
        staffId: 'a',
        expectedPreviousPostId: 'staff-post:analysis:2',
      })
    })
    expect(displayedCount(panel, copy.capacity)).toBe('0')
    expect(within(panel).getByText(copy.unassigned, { exact: false })).toBeInTheDocument()
  })

  it('labels invalid roster data as unavailable rather than reporting a usable zero', () => {
    const game = gameWithStaff(null)
    expect(projectOperationalStaffingView(game).unavailable).toBe(true)
    useGameStore.setState({ game })
    render(<OperationalStaffingPanel staffing={projectOperationalStaffingView(game)} />)
    const panel = screen.getByRole('article', { name: copy.heading })
    expect(within(panel).getByText(copy.rosterUnavailable)).toBeInTheDocument()
    expect(within(panel).queryByText(copy.capacity)).not.toBeInTheDocument()
  })

  it('preserves the separate support staff population alongside canonical operational capacity', () => {
    useGameStore.setState({
      game: {
        ...gameWithStaff({ a: { specialty: 'analysis' } }),
        supportStaff: { admin: 2, logistics: 3, medical: 4, intel: 5, total: 14, pressure: 0 },
      },
    })
    const panel = renderStaffing()
    expect(displayedCount(panel, copy.headcount)).toBe('1')
    expect(displayedCount(panel, copy.capacity)).toBe('0')
    expect(screen.getByText('Support Staff')).toBeInTheDocument()
    expect(
      screen.getByText('Total: 14 | Admin: 2 | Logistics: 3 | Medical: 4 | Intel: 5')
    ).toBeInTheDocument()
  })

  it('uses centralized copy, semantic metrics and polite announcements without input controls', () => {
    useGameStore.setState({ game: gameWithStaff({ a: { specialty: 'analysis' } }) })
    const panel = renderStaffing()
    expect(within(panel).getByRole('heading', { name: copy.heading })).toHaveAttribute(
      'id',
      'operational-staffing-heading'
    )
    expect(panel.querySelector('[aria-live="polite"]')).toHaveAttribute('aria-atomic', 'true')
    expect(panel.querySelectorAll('dt')).toHaveLength(3)
    expect(panel.querySelectorAll('dd')).toHaveLength(3)
    expect(panel.querySelector('dl')).toHaveClass('grid', 'min-w-0', 'sm:grid-cols-3')
    expect(panel.querySelectorAll('a, button, input, select, [tabindex]')).toHaveLength(0)
    expect(
      Object.values(copy).every((value) => typeof value === 'string' && value.trim().length > 0)
    ).toBe(true)
  })
})

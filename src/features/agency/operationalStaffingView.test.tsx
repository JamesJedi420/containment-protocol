import '../../test/setup'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import type { GameState } from '../../domain/models'
import { deriveOperationalStaffCapacity } from '../../domain/operationalStaffCapacity'
import { projectFacilityOperationalPostValidity } from '../../domain/facilityOperationalPostValidity'
import { readRepresentativeFacilityDependencyGraph } from '../../domain/facilityDependencyGraph'
import { resolveExplicitFacilityDependencyAvailability } from '../../domain/facilityDependencyInputs'
import { appendOperationEventDrafts, createAgentHiredDraft } from '../../domain/events/eventBus'
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

function gameWithStaff(staff: unknown, names: Record<string, string> = {}): GameState {
  const game = { ...createStartingState(), staff: staff as GameState['staff'] }
  return appendOperationEventDrafts(
    game,
    Object.entries(names).map(([id, name]) =>
      createAgentHiredDraft({
        week: game.week,
        candidateId: id,
        agentId: id,
        agentName: name,
        recruitCategory: 'staff',
      })
    )
  )
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

function staffingPanel(
  game: GameState,
  facilityValidity?: Parameters<typeof projectOperationalStaffingView>[1]
) {
  return (
    <MemoryRouter>
      <OperationalStaffingPanel
        staffing={projectOperationalStaffingView(game, facilityValidity)}
        onChangePost={(request, destination) => {
          const store = useGameStore.getState()
          if (destination === null) return store.unassignOperationalStaffPost(request)
          const assignment = { ...request, postId: destination }
          return request.expectedPreviousPostId === null
            ? store.assignOperationalStaffPost(assignment)
            : store.reassignOperationalStaffPost(assignment)
        }}
      />
    </MemoryRouter>
  )
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
    render(staffingPanel(game))
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
    expect(within(panel).queryAllByRole('link')).toHaveLength(view.unassignedCount > 0 ? 1 : 0)
  })

  it('navigates by keyboard and updates the canonical assignment and capacity after each action', async () => {
    const user = userEvent.setup()
    useGameStore.setState({ game: gameWithStaff({ a: { specialty: 'analysis' } }, { a: 'Avery' }) })
    const panel = renderStaffing()
    const person = within(panel).getByRole('group', { name: 'Avery' })
    const capacity = () => deriveOperationalStaffCapacity(useGameStore.getState().game)
    const expectCapacity = (count: number) => {
      expect(capacity().effectiveCapacity).toBe(count)
      expect(displayedCount(panel, copy.capacity)).toBe(String(count))
    }
    expectCapacity(0)
    within(panel).getByRole('link', { name: copy.managePosts }).focus()
    await user.keyboard('{Enter}')
    expect(within(panel).getByRole('heading', { name: copy.postHeading })).toHaveFocus()
    await user.tab()
    expect(within(person).getByRole('button', { name: 'Assign to Analysis post 1' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(capacity().byStaffId.a?.postId).toBe('staff-post:analysis:1')
    expectCapacity(1)
    expect(within(panel).queryByText(copy.unassigned, { exact: false })).not.toBeInTheDocument()
    expect(within(panel).getByRole('status')).toHaveTextContent(
      'Avery · Analysis post 1: Post assigned.'
    )
    await user.click(within(person).getByRole('button', { name: 'Move to Analysis post 2' }))
    expect(capacity().byStaffId.a?.postId).toBe('staff-post:analysis:2')
    expectCapacity(1)
    await user.click(within(person).getByRole('button', { name: copy.unassignPost }))
    expect(capacity().byStaffId.a?.postId).toBeNull()
    expectCapacity(0)
    expect(within(panel).getByText(copy.unassigned, { exact: false })).toBeInTheDocument()
  })

  it('announces each occupied destination without changing the roster or capacity', async () => {
    const game = gameWithStaff(
      {
        a: { specialty: 'analysis' },
        b: { specialty: 'analysis', operationalPostId: 'staff-post:analysis:1' },
        c: { specialty: 'analysis', operationalPostId: 'staff-post:analysis:2' },
      },
      { a: 'Avery', b: 'Bea', c: 'Casey' }
    )
    useGameStore.setState({ game })
    const panel = renderStaffing()
    const person = within(panel).getByRole('group', { name: 'Avery' })
    await userEvent.click(
      within(person).getByRole('button', { name: 'Assign to Analysis post 1 (occupied)' })
    )
    const status = within(panel).getByRole('status')
    expect(status).toHaveTextContent(
      'Avery · Analysis post 1: Another staff member already holds this post.'
    )
    const secondPost = within(person).getByRole('button', {
      name: 'Assign to Analysis post 2 (occupied)',
    })
    await userEvent.click(secondPost)
    expect(status).toHaveTextContent(
      'Avery · Analysis post 2: Another staff member already holds this post.'
    )
    const previousAnnouncement = status.firstElementChild
    await userEvent.click(secondPost)
    expect(status.firstElementChild).not.toBe(previousAnnouncement)
    expect(useGameStore.getState().game).toBe(game)
    expect(displayedCount(panel, copy.capacity)).toBe('2')
  })

  it('announces a stale request from an outdated view and accepts a retry after refresh', async () => {
    const snapshot = gameWithStaff({ a: { specialty: 'analysis' } }, { a: 'Avery' })
    useGameStore.setState({ game: snapshot })
    const { rerender } = render(staffingPanel(snapshot))
    const updated = useGameStore.getState().assignOperationalStaffPost({
      staffId: 'a',
      postId: 'staff-post:analysis:1',
      expectedPreviousPostId: null,
    }).game
    await userEvent.click(screen.getByRole('button', { name: 'Assign to Analysis post 2' }))
    expect(screen.getByRole('status')).toHaveTextContent(
      'The current assignment changed. Review it and try again.'
    )
    expect(useGameStore.getState().game).toBe(updated)
    rerender(staffingPanel(updated))
    await userEvent.click(screen.getByRole('button', { name: 'Move to Analysis post 2' }))
    expect(screen.getByRole('status')).toHaveTextContent(
      'Avery · Analysis post 2: Post reassigned.'
    )
  })

  it('displays the SPE-3387 facility result through loss and recovery with one retained assignment', () => {
    const postId = 'staff-post:logistics:1'
    const game = gameWithStaff(
      { clerk: { specialty: 'logistics', operationalPostId: postId } },
      { clerk: 'Clerk' }
    )
    const graph = readRepresentativeFacilityDependencyGraph()
    const viewAt = (availability: 'ready' | 'unavailable') => {
      const inputs = Object.fromEntries(
        graph.nodes.map(({ id }) => [
          id,
          {
            availability: id === 'capability:logistics_freshness' ? availability : 'ready',
            sourceRef: `test:${id}`,
          },
        ])
      )
      const validity = projectFacilityOperationalPostValidity(
        resolveExplicitFacilityDependencyAvailability(graph, inputs)
      )
      return staffingPanel(game, validity)
    }
    const { rerender } = render(viewAt('ready'))
    const panel = screen.getByRole('article', { name: copy.heading })
    expect(displayedCount(panel, copy.capacity)).toBe('1')
    rerender(viewAt('unavailable'))
    expect(displayedCount(panel, copy.assigned)).toBe('1')
    expect(displayedCount(panel, copy.capacity)).toBe('0')
    expect(
      screen.getByText(
        /Current post: Logistics post 1 Capacity temporarily withheld\. Facility support is unavailable\./
      )
    ).toBeVisible()
    rerender(viewAt('ready'))
    expect(displayedCount(panel, copy.capacity)).toBe('1')
    expect(screen.queryByText(/Capacity temporarily withheld/)).not.toBeInTheDocument()
    expect(game.staff.clerk).toHaveProperty('operationalPostId', postId)
  })

  it('labels invalid roster data as unavailable rather than reporting a usable zero', () => {
    const game = gameWithStaff(null)
    expect(projectOperationalStaffingView(game).unavailable).toBe(true)
    useGameStore.setState({ game })
    render(staffingPanel(game))
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

  it('uses semantic metrics, labeled input groups and polite announcements', () => {
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
    expect(within(panel).getByRole('group', { name: 'Staff record a' })).toBeInTheDocument()
    expect(within(panel).getByRole('status')).toHaveAttribute('aria-atomic', 'true')
  })
})

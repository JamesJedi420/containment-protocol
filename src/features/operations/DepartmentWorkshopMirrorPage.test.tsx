// @vitest-environment jsdom
import '../../test/setup'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import type {
  DepartmentWorkshopCompletionOutcomeRegistry,
  DepartmentWorkshopSnapshotRegistry,
  DepartmentWorkshopWorkOrderRegistry,
} from '../../domain/departmentWorkshopQueue'
import { useGameStore } from '../../app/store/gameStore'
import { dispatchInputAction } from '../../app/inputRuntime'
import DepartmentWorkshopMirrorPage from './DepartmentWorkshopMirrorPage'

function renderMirrorPage() {
  return render(
    <MemoryRouter initialEntries={['/department-workshop']}>
      <Routes>
        <Route path="/department-workshop" element={<DepartmentWorkshopMirrorPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('DepartmentWorkshopMirrorPage (SPE-2773)', () => {
  it('keeps absent explanations quiet in both layouts', async () => {
    const user = userEvent.setup()
    renderMirrorPage()
    const report = within(screen.getByRole('region', { name: 'Operational workshop explanations' }))
    for (const name of ['Compact', 'Detailed']) {
      await user.click(report.getByRole('button', { name }))
      expect(report.getByRole('button', { name, pressed: true })).toBeInTheDocument()
      expect(
        report.getByText('No active or recorded workshop degradation explanation.')
      ).toBeVisible()
      expect(report.queryByRole('list')).toBeNull()
      expect(report.queryByRole('link')).toBeNull()
    }
  })

  it('switches the same visible warnings and receipts without a store write, including after reload', async () => {
    const user = userEvent.setup()
    const departmentId = 'department:biohazard-response'
    const workOrder = {
      id: 'work:active',
      departmentId,
      caseId: 'case:active',
      taskType: 'research_case',
      requiredWork: 2,
    } as const
    const receipt = {
      workOrderId: 'work:recorded',
      departmentId,
      caseId: 'case:recorded',
      taskType: 'research_case',
      completedWeek: 1,
      outcome: 'completed',
      quality: 'degraded',
      qualityReason: 'poor_room_contamination',
      safety: 'safe',
    } as const
    const game = createStartingState()
    game.facilityState = { facilities: {} }
    game.departmentWorkshopWorkOrders = { [workOrder.id]: workOrder }
    game.departmentWorkshopSnapshots = {
      [departmentId]: {
        departmentId,
        slotCapacity: 1,
        active: [{ workOrderId: workOrder.id, completedWork: 1 }],
        queued: [],
        paused: [],
      },
    }
    game.departmentWorkshopCompletionOutcomes = {
      [receipt.workOrderId]: receipt,
      // This receipt belongs to another case and must never qualify the active order.
      [workOrder.id]: {
        ...receipt,
        workOrderId: workOrder.id,
        caseId: 'withheld-case',
        departmentId: 'withheld-department',
      },
    }
    useGameStore.setState({ game })
    const mounted = renderMirrorPage()
    const region = screen.getByRole('region', { name: 'Operational workshop explanations' })
    const report = within(region)
    const rows = () => report.getAllByRole('listitem').map((row) => row.textContent)
    const expected = rows()
    expect(expected).toHaveLength(2)
    expect(expected[0]).toContain('Work order work:active')
    expect(expected[0]).toContain('at risk')
    expect(expected[0]).toContain('Correction:')
    expect(expected[1]).toContain('Completion receipt work:recorded')
    expect(expected[1]).not.toContain('Correction:')
    expect(report.getAllByText('Confidence: confirmed')).toHaveLength(2)
    const sources = () => report.getAllByRole('link').map((link) => link.getAttribute('href'))
    const destinations = [
      screen.getByRole('region', { name: 'Department workshop lanes' }),
      screen.getByRole('region', { name: 'Completion quality and safety ledger' }),
    ].map((section) => '#' + section.id)
    expect(sources()).toEqual(destinations)

    const stored = useGameStore.getState()
    const before = JSON.stringify(stored.game)
    const storageKey = useGameStore.persist.getOptions().name
    if (!storageKey) throw new Error('The campaign store must have a persistence key')
    const save = localStorage.getItem(storageKey)
    if (!save) throw new Error('Expected a persisted workshop campaign')
    const detailed = report.getByRole('button', { name: 'Detailed', pressed: true })
    detailed.focus()
    await user.tab()
    await user.keyboard('{Enter}')
    expect(report.getByRole('button', { name: 'Compact', pressed: true })).toHaveFocus()
    expect(rows()).toEqual(expected)
    expect(sources()).toEqual(destinations)
    expect(region.innerHTML).not.toMatch(/withheld-case|withheld-department/)
    act(() => {
      expect(dispatchInputAction('filters.previous')).toBe(true)
      expect(dispatchInputAction('filters.activate')).toBe(true)
    })
    expect(detailed).toHaveFocus()
    expect(detailed).toHaveAttribute('aria-pressed', 'true')
    expect(rows()).toEqual(expected)
    expect(region.innerHTML).not.toMatch(/withheld-case|withheld-department/)
    expect(useGameStore.getState()).toBe(stored)
    expect(JSON.stringify(stored.game)).toBe(before)
    expect(localStorage.getItem(storageKey)).toBe(save)

    mounted.unmount()
    useGameStore.setState({ game: createStartingState() })
    localStorage.setItem(storageKey, save)
    await useGameStore.persist.rehydrate()
    renderMirrorPage()
    const restored = within(
      screen.getByRole('region', { name: 'Operational workshop explanations' })
    )
    await user.click(restored.getByRole('button', { name: 'Compact' }))
    expect(restored.getAllByRole('listitem').map((row) => row.textContent)).toEqual(expected)
  })

  it('renders empty state when no workshop registries are persisted', () => {
    renderMirrorPage()

    expect(screen.getByRole('region', { name: /department workshop mirror/i })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty workshop state/i })).toBeInTheDocument()
    expect(screen.getByText(/no department workshop activity/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to operations desk/i })).toHaveAttribute(
      'href',
      '/'
    )
  })

  it('uses lanes-empty copy when only completion receipts are present', () => {
    useGameStore.setState({
      game: {
        ...createStartingState(),
        departmentWorkshopCompletionOutcomes: {
          'work:done-safe': {
            workOrderId: 'work:done-safe',
            departmentId: 'department:records-analysis',
            caseId: 'case-done',
            taskType: 'records_review',
            completedWeek: 4,
            outcome: 'completed',
            quality: 'nominal',
            safety: 'safe',
          },
        },
      },
    })

    renderMirrorPage()

    expect(screen.getByText(/no workshop lanes currently active/i)).toBeInTheDocument()
    expect(
      screen.getByText(/completion receipts and unsafe consequences still appear below/i)
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: /completion quality and safety ledger/i })
    ).toHaveTextContent('work:done-safe')
  })

  it('renders department lanes, blockers, receipts, and consequences from fixtures', () => {
    const workOrders: DepartmentWorkshopWorkOrderRegistry = {
      'work:alpha': {
        id: 'work:alpha',
        departmentId: 'department:biohazard-response',
        caseId: 'case-alpha',
        taskType: 'containment_response',
        requiredWork: 2,
      },
      'work:bravo': {
        id: 'work:bravo',
        departmentId: 'department:biohazard-response',
        caseId: 'case-bravo',
        taskType: 'containment_response',
        requiredWork: 2,
      },
    }
    const snapshots: DepartmentWorkshopSnapshotRegistry = {
      'department:biohazard-response': {
        departmentId: 'department:biohazard-response',
        slotCapacity: 1,
        queued: [{ workOrderId: 'work:bravo', completedWork: 0 }],
        active: [{ workOrderId: 'work:alpha', completedWork: 1 }],
        paused: [],
      },
    }
    const outcomes: DepartmentWorkshopCompletionOutcomeRegistry = {
      'work:done-unsafe': {
        workOrderId: 'work:done-unsafe',
        departmentId: 'department:biohazard-response',
        caseId: 'case-unsafe',
        taskType: 'containment_response',
        completedWeek: 5,
        outcome: 'completed',
        quality: 'nominal',
        safety: 'unsafe',
        safetyReason: 'inadequate_isolation',
      },
    }

    useGameStore.setState({
      game: {
        ...createStartingState(),
        departmentWorkshopWorkOrders: workOrders,
        departmentWorkshopSnapshots: snapshots,
        departmentWorkshopCompletionOutcomes: outcomes,
        departmentWorkshopUnsafeSecondaryIncidents: {
          'work:done-unsafe': 'case:spawned-secondary',
        },
      },
    })

    renderMirrorPage()

    const lanes = screen.getByRole('region', { name: /department workshop lanes/i })
    expect(lanes).toHaveTextContent('department:biohazard-response')
    expect(lanes).toHaveTextContent('work:alpha')
    expect(lanes).toHaveTextContent('Slots full')
    expect(lanes).toHaveTextContent('1/2')

    const ledger = screen.getByRole('region', { name: /completion quality and safety ledger/i })
    expect(ledger).toHaveTextContent('Unsafe')
    expect(ledger).toHaveTextContent('Inadequate isolation')

    const consequences = screen.getByRole('region', { name: /unsafe completion consequences/i })
    expect(consequences).toHaveTextContent('case:spawned-secondary')
  })
})

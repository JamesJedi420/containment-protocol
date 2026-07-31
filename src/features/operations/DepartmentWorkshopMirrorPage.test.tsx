// @vitest-environment jsdom
import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import type {
  DepartmentWorkshopCompletionOutcomeRegistry,
  DepartmentWorkshopSnapshotRegistry,
  DepartmentWorkshopWorkOrderRegistry,
} from '../../domain/departmentWorkshopQueue'
import { useGameStore } from '../../app/store/gameStore'
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
  it('renders empty state when no workshop registries are persisted', () => {
    renderMirrorPage()

    expect(
      screen.getByRole('region', { name: /department workshop mirror/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /empty workshop state/i })).toBeInTheDocument()
    expect(screen.getByText(/no department workshop activity/i)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /back to operations desk/i })
    ).toHaveAttribute('href', '/')
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

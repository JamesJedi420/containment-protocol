import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../../app/store/gameStore'
import { createStartingState } from '../../data/startingState'
import { DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY } from '../../domain/departmentCapabilities'
import {
  DEPARTMENT_WORKSHOP_ACTIVATION_UI_TEXT,
  getDepartmentWorkshopActivationReasonLabel,
} from './departmentWorkshopActivationCopy'
import DepartmentWorkshopActivationCommandPage from './DepartmentWorkshopActivationCommandPage'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/department-workshop/activate']}>
      <DepartmentWorkshopActivationCommandPage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  useGameStore.persist.clearStorage()
  useGameStore.setState({ game: createStartingState() })
})

describe('DepartmentWorkshopActivationCommandPage', () => {
  it('maps invalid department registry failures to dedicated player copy', () => {
    expect(getDepartmentWorkshopActivationReasonLabel('invalid-department-registry')).toBe(
      DEPARTMENT_WORKSHOP_ACTIVATION_UI_TEXT.reasonInvalidDepartmentRegistry
    )
  })

  it('renders a distinct state when every registered department is already active', () => {
    const game = {
      ...createStartingState(),
      departmentWorkshopSnapshots: Object.fromEntries(
        DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY.departments.map((department) => [
          department.id,
          {
            departmentId: department.id,
            slotCapacity: 1,
            queued: [],
            active: [],
            paused: [],
          },
        ])
      ),
    }
    useGameStore.setState({ game })

    renderPage()

    expect(
      screen.getByRole('heading', {
        name: DEPARTMENT_WORKSHOP_ACTIVATION_UI_TEXT.allActivatedTitle,
      })
    ).toBeInTheDocument()
    expect(
      screen.getByText(DEPARTMENT_WORKSHOP_ACTIVATION_UI_TEXT.allActivatedBody)
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /activate workshop/i })).not.toBeInTheDocument()
  })
})

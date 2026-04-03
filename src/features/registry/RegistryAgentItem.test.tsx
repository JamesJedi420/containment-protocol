import '../../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { APP_ROUTES } from '../../app/routes'
import type { Agent } from '../../domain/agent/models'
import RegistryAgentItem from './RegistryAgentItem'

// Mock Agent helper function
function createMockAgent(overrides?: Partial<Agent>): Agent {
  return {
    id: 'test-agent-1',
    name: 'Test Agent',
    role: 'hunter',
    tags: ['psionic', 'field-kit'],
    fatigue: 45,
    status: 'active',
    baseStats: {
      combat: 10,
      investigation: 8,
      utility: 7,
      social: 6,
    },
    relationships: {},
    ...overrides,
  }
}

describe('RegistryAgentItem', () => {
  function renderRegistryAgentItem(props: Parameters<typeof RegistryAgentItem>[0]) {
    return render(
      <MemoryRouter>
        <RegistryAgentItem {...props} />
      </MemoryRouter>
    )
  }

  it('renders agent name as a semantic heading', () => {
    const agent = createMockAgent()
    renderRegistryAgentItem({ agent, operationalStatus: 'Field team' })

    expect(screen.getByRole('heading', { level: 3, name: 'Test Agent' })).toBeInTheDocument()
  })

  it('renders agent name', () => {
    const agent = createMockAgent()
    renderRegistryAgentItem({ agent })

    expect(screen.getByText('Test Agent')).toBeInTheDocument()
  })

  it('links agent name to registry detail route', () => {
    const agent = createMockAgent()
    renderRegistryAgentItem({ agent })

    expect(screen.getByRole('link', { name: 'Test Agent' })).toHaveAttribute(
      'href',
      APP_ROUTES.registryDetail(agent.id)
    )
  })

  it('renders agent role when showAgentRole is true', () => {
    const agent = createMockAgent()

    // First render with showAgentRole true
    const { container: container1 } = renderRegistryAgentItem({ agent, showAgentRole: true })
    const allText1 = container1.textContent || ''
    expect(allText1).toMatch(/containment hunter/i)

    // Clean up and render with showAgentRole false
    const { container: container2 } = renderRegistryAgentItem({ agent, showAgentRole: false })
    const allText2 = container2.textContent || ''
    expect(allText2).not.toMatch(/containment hunter/i)
  })

  it('renders agent status with aria-label', () => {
    const agent = createMockAgent({ status: 'active' })
    renderRegistryAgentItem({ agent })

    const statusElement = screen.getByText(/active/i)
    expect(statusElement).toBeInTheDocument()
    expect(statusElement).toHaveAccessibleName(/active|status/i)
  })

  it('renders team name when provided', () => {
    const agent = createMockAgent()
    renderRegistryAgentItem({ agent, teamName: 'Team Alpha', operationalStatus: 'Field team' })

    expect(screen.getByText(/Team.*Team Alpha/i)).toBeInTheDocument()
  })

  it('renders reserve pool label when no team provided', () => {
    const agent = createMockAgent()
    renderRegistryAgentItem({ agent, teamName: undefined })

    expect(screen.getByText(/reserve pool/i)).toBeInTheDocument()
  })

  it('displays operational status', () => {
    const agent = createMockAgent()
    renderRegistryAgentItem({ agent, operationalStatus: 'Field team' })

    expect(screen.getByText(/Operational state.*Field team/i)).toBeInTheDocument()
  })

  it('displays fatigue level with aria-label', () => {
    const agent = createMockAgent({ fatigue: 45 })
    renderRegistryAgentItem({ agent, operationalStatus: 'Field team' })

    expect(screen.getByText(/Fatigue.*45/i)).toBeInTheDocument()
    const fatigueElement = screen.getByText(/Fatigue.*45/i)
    expect(fatigueElement.closest('[aria-label]')).toHaveAttribute('aria-label', 'Fatigue level: 45')
  })

  it('displays agent tags as comma-separated list', () => {
    const agent = createMockAgent({ tags: ['psionic', 'field-kit'] })
    renderRegistryAgentItem({ agent, operationalStatus: 'Field team' })

    expect(screen.getByText(/Tags.*psionic, field-kit/i)).toBeInTheDocument()
  })

  it('displays None when agent has no tags', () => {
    const agent = createMockAgent({ tags: [] })
    renderRegistryAgentItem({ agent })

    expect(screen.getByText(/none/i)).toBeInTheDocument()
  })

  it('has proper accessibility labels on all info fields', () => {
    const agent = createMockAgent()
    renderRegistryAgentItem({ agent, operationalStatus: 'Field team', teamName: 'Team Alpha' })

    // Check for accessibility attributes within the entire document
    const ariaLabeledElements = document.querySelectorAll('[aria-label]')

    // Ensure meaningful aria-labels exist for key fields
    expect(ariaLabeledElements.length).toBeGreaterThan(0)

    // Verify specific aria-labels exist
    const ariaLabels = Array.from(ariaLabeledElements).map((el) => el.getAttribute('aria-label'))
    expect(ariaLabels.some((label) => label?.toLowerCase().includes('fatigue level'))).toBe(true)
    expect(ariaLabels.some((label) => label?.toLowerCase().includes('team'))).toBe(true)
    expect(ariaLabels.some((label) => label?.toLowerCase().includes('operational state'))).toBe(true)
  })
})
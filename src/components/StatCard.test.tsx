import '../test/setup'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { DetailStat, StatCard, StatLinkCard } from './StatCard'

describe('StatCard accessibility', () => {
  it('renders stat regions with descriptive labels', () => {
    render(
      <>
        <StatCard label="Pending Operations" value={4} />
        <DetailStat label="Readiness" value="82" />
      </>
    )

    expect(screen.getByRole('region', { name: /pending operations: 4/i })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /readiness: 82/i })).toBeInTheDocument()
  })

  it('exposes stat links with accessible labels that include value context', () => {
    render(
      <MemoryRouter>
        <StatLinkCard label="Breach Score" value={18} to="/report" />
      </MemoryRouter>
    )

    const link = screen.getByRole('link', { name: /breach score: 18/i })
    expect(link).toHaveAttribute('href', '/report')
  })
})

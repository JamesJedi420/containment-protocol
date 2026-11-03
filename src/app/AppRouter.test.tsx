import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, Route, Routes } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'
import { AppRouter } from './AppRouter'

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  window.history.replaceState(null, '', '/')
})

test.each(['development', 'production', 'pages'])(
  '%s keeps navigation inside its hosting path',
  async (mode) => {
    vi.stubEnv('MODE', mode)
    const initialPath = mode === 'pages' ? '/containment-protocol/#/cases' : '/cases'
    window.history.replaceState(null, '', initialPath)
    render(
      <AppRouter>
        <Link to="/agents">Agents</Link>
        <Routes>
          <Route path="/cases" element={<h1>Cases</h1>} />
          <Route path="/agents" element={<h1>Agents</h1>} />
        </Routes>
      </AppRouter>
    )
    expect(screen.getByRole('heading', { name: 'Cases' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Agents' })).toHaveAttribute(
      'href',
      mode === 'pages' ? '#/agents' : '/agents'
    )
    await userEvent.click(screen.getByRole('link', { name: 'Agents' }))
    expect(await screen.findByRole('heading', { name: 'Agents' })).toBeVisible()
    expect(window.location.pathname).toBe(mode === 'pages' ? '/containment-protocol/' : '/agents')
    expect(window.location.hash).toBe(mode === 'pages' ? '#/agents' : '')
  }
)

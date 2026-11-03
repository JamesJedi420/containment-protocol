import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { InPageLink } from './InPageLink'

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  window.history.replaceState(null, '', '/')
})

test('Pages keyboard skip focuses content without replacing the route or its filters', async () => {
  vi.stubEnv('MODE', 'pages')
  window.history.replaceState(null, '', '/containment-protocol/#/cases?status=open')
  const scroll = vi.fn()
  render(
    <>
      <InPageLink targetId="results">Skip to results</InPageLink>
      <section id="results" tabIndex={-1}>
        Results
      </section>
    </>
  )
  const target = screen.getByText('Results')
  target.scrollIntoView = scroll
  const user = userEvent.setup()
  await user.tab()
  await user.keyboard('{Enter}')
  expect(target).toHaveFocus()
  expect(scroll).toHaveBeenCalledWith({ behavior: 'instant', block: 'start' })
  expect(window.location.hash).toBe('#/cases?status=open')
})

test('non-Pages modes retain native fragment links', () => {
  vi.stubEnv('MODE', 'development')
  render(<InPageLink targetId="results">Skip to results</InPageLink>)
  expect(screen.getByRole('link')).toHaveAttribute('href', '#results')
})

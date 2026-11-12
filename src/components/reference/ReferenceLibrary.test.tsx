import '../../test/setup'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReferenceLibrary } from './ReferenceLibrary'

describe('reference library presentation', () => {
  it('keeps query and category while following related entries and returns focus to results', () => {
    render(<ReferenceLibrary />)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search reference' }), {
      target: { value: 'specialisations' },
    })
    fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), {
      target: { value: 'personnel' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Agent specializations' }))
    expect(screen.getByRole('heading', { name: 'Agent specializations' })).toHaveFocus()
    const selectedResult = screen.getByRole('button', { name: 'Agent specializations' })
    selectedResult.focus()
    fireEvent.click(selectedResult)
    expect(screen.getByRole('heading', { name: 'Agent specializations' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Team coverage roles (related)' }))
    expect(screen.getByRole('heading', { name: 'Team coverage roles' })).toHaveFocus()
    expect(screen.getByRole('searchbox')).toHaveValue('specialisations')
    expect(screen.getByRole('combobox')).toHaveValue('personnel')
    fireEvent.click(screen.getByRole('button', { name: 'Return to results' }))
    expect(screen.getByRole('searchbox')).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Agent specializations' }))
    fireEvent.click(screen.getByRole('button', { name: 'Return to results' }))
    expect(screen.getByRole('button', { name: 'Agent specializations' })).toHaveFocus()
  })
  it('shows unavailable direct IDs and truthful empty searches without substituting content', () => {
    render(<ReferenceLibrary initialEntryId="removed-entry" />)
    expect(screen.getByRole('heading', { name: 'Reference unavailable' })).toHaveFocus()
    expect(
      screen.getByText('This reference is unavailable. No replacement rules are inferred.')
    ).toBeVisible()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'no-match' } })
    expect(
      within(screen.getByRole('list', { name: 'Reference entries' })).queryAllByRole('button')
    ).toHaveLength(0)
    expect(screen.getByRole('status')).toHaveTextContent('0 reference entries')
  })
})

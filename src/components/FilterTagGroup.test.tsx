import '../test/setup'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { dispatchInputAction } from '../app/inputRuntime'
import { FilterTagGroup } from './FilterTagGroup'

const options = [
  { value: 'all', label: 'All entries' },
  { value: 'locked', label: 'Unavailable', disabled: true },
  { value: 'restricted', label: 'Restricted operational assessments with uncertainty retained' },
]

describe('filter tag facets', () => {
  it('keeps selection controlled and native keyboard order skips disabled controls', async () => {
    const user = userEvent.setup()
    const change = vi.fn()
    const { rerender } = render(
      <FilterTagGroup
        id="test"
        label="Visibility"
        value="all"
        options={options}
        onChange={change}
      />
    )
    expect(screen.getByRole('group', { name: 'Visibility' })).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
    await user.tab()
    expect(buttons[0]).toHaveFocus()
    await user.tab()
    expect(buttons[2]).toHaveFocus()
    await user.keyboard(' ')
    expect(change).toHaveBeenCalledWith('restricted')
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
    rerender(
      <FilterTagGroup
        id="test"
        label="Visibility"
        value="restricted"
        options={options}
        onChange={change}
      />
    )
    expect(buttons[2]).toHaveAttribute('aria-pressed', 'true')
    expect(buttons[2]).toHaveFocus()
  })
  it('routes controller actions only within the focused group and respects bounds', () => {
    const change = vi.fn()
    const { unmount } = render(
      <FilterTagGroup
        id="test"
        label="Visibility"
        value="all"
        options={options}
        onChange={change}
      />
    )
    expect(dispatchInputAction('filters.next')).toBe(false)
    const buttons = screen.getAllByRole('button')
    buttons[0].focus()
    expect(dispatchInputAction('filters.previous')).toBe(false)
    act(() => {
      expect(dispatchInputAction('filters.next')).toBe(true)
    })
    expect(buttons[2]).toHaveFocus()
    expect(dispatchInputAction('filters.next')).toBe(false)
    act(() => {
      dispatchInputAction('filters.activate')
    })
    expect(change).toHaveBeenCalledExactlyOnceWith('restricted')
    act(() => {
      dispatchInputAction('filters.previous')
    })
    expect(buttons[0]).toHaveFocus()
    unmount()
    expect(dispatchInputAction('filters.activate')).toBe(false)
  })
  it('does not invent selection for empty or stale option sets', () => {
    const change = vi.fn()
    const { rerender } = render(
      <FilterTagGroup
        id="test"
        label="Visibility"
        value="missing"
        options={options}
        onChange={change}
      />
    )
    expect(screen.queryByRole('button', { pressed: true })).not.toBeInTheDocument()
    rerender(
      <FilterTagGroup id="test" label="Visibility" value="missing" options={[]} onChange={change} />
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(dispatchInputAction('filters.activate')).toBe(false)
    expect(change).not.toHaveBeenCalled()
  })
})

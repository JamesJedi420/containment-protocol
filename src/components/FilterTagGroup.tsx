import { useRef } from 'react'
import { useInputConsumer } from '../app/inputRuntime'

export interface FilterTagOption {
  value: string
  label: string
  disabled?: boolean
}

/** Controlled facets, not route tabs. Native Tab/activation retain document reading order. */
export function FilterTagGroup({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: readonly FilterTagOption[]
  onChange: (value: string) => void
}) {
  const root = useRef<HTMLFieldSetElement>(null)
  const buttons = () =>
    Array.from(root.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
  const target = (offset: number) => {
    const items = buttons()
    const index = items.findIndex((item) => item === document.activeElement)
    return index < 0 ? undefined : items[index + offset]
  }
  useInputConsumer({
    id: 'filters.previous',
    context: 'focused',
    available: () => !!target(-1),
    execute: () => target(-1)?.focus(),
  })
  useInputConsumer({
    id: 'filters.next',
    context: 'focused',
    available: () => !!target(1),
    execute: () => target(1)?.focus(),
  })
  useInputConsumer({
    id: 'filters.activate',
    context: 'focused',
    available: () => !!target(0),
    execute: () => target(0)?.click(),
  })
  return (
    <fieldset id={id} ref={root} className="filter-tag-group">
      <legend>{label}</legend>
      <div className="filter-tag-layout">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="filter-tag"
            aria-pressed={value === option.value}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

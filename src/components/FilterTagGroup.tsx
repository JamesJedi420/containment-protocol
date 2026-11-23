import { useRef } from 'react'
import { useFocusedControls } from '../app/inputRuntime'

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
  useFocusedControls(
    () => root.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []
  )
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

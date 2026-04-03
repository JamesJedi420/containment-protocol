import type { ReactNode } from 'react'

interface FilterOption {
  value: string
  label: string
}

interface FilterSelectProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options?: FilterOption[]
  children?: ReactNode
  containerClassName?: string
  labelClassName?: string
  selectClassName?: string
}

export function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  children,
  containerClassName = 'form-row text-sm',
  labelClassName = 'form-label opacity-80',
  selectClassName = 'form-select w-full',
}: FilterSelectProps) {
  return (
    <label htmlFor={id} className={containerClassName}>
      <span className={labelClassName}>{label}</span>
      <select
        id={id}
        className={selectClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options
          ? options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          : children}
      </select>
    </label>
  )
}

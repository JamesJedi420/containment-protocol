interface FilterInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  ariaControls?: string
  placeholder?: string
  type?: 'text' | 'search'
  containerClassName?: string
  labelClassName?: string
  inputClassName?: string
}

export function FilterInput({
  id,
  label,
  value,
  onChange,
  ariaControls,
  placeholder,
  type = 'text',
  containerClassName = 'form-row text-sm',
  labelClassName = 'form-label opacity-80',
  inputClassName = 'form-input w-full',
}: FilterInputProps) {
  return (
    <label htmlFor={id} className={containerClassName}>
      <span className={labelClassName}>{label}</span>
      <input
        id={id}
        type={type}
        className={inputClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-controls={ariaControls}
        placeholder={placeholder}
      />
    </label>
  )
}

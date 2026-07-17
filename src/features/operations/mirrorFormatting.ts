/** Formats persisted enum tokens as CP-neutral operator labels. */
export function formatMirrorEnumLabel(value: string): string {
  if (!value) {
    return '—'
  }

  return value
    .split('_')
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ')
}

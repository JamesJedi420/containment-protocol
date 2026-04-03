export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'N/A'
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

export function formatGrowthStats(growthStats: Record<string, number> | null | undefined): string {
  if (!growthStats || Object.keys(growthStats).length === 0) {
    return 'none recorded'
  }

  const entries = Object.entries(growthStats)
    .filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value > 0)

  if (entries.length === 0) {
    return 'none recorded'
  }

  return entries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key} +${formatNumber(value)}`)
    .join(' / ')
}

export function formatCompactLabel(value: string | null | undefined): string {
  if (!value || typeof value !== 'string') {
    return 'unknown'
  }

  const maxLength = 30
  const truncated = value.length > maxLength ? value.substring(0, maxLength) + '…' : value

  return truncated
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

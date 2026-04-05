import { memo } from 'react'

export const DetailMetric = memo(function DetailMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded border border-white/10 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50 wrap-break-word">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
})

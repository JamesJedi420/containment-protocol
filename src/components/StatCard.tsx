import type { ReactNode } from 'react'
import { Link } from 'react-router'

type BaseProps = {
  label: string
  value: string | number
}

function clampProgressValue(value: number, max: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(value, 0), max)
}

export function StatCard({ label, value }: BaseProps) {
  return (
    <div className="panel stat-shell" role="region" aria-label={`${label}: ${value}`}>
      <p className="text-label stat-label">{label}</p>
      <p className="mt-2 text-stat">{value}</p>
    </div>
  )
}

type StatLinkCardProps = BaseProps & {
  to: string
}

export function StatLinkCard({ label, to, value }: StatLinkCardProps) {
  return (
    <Link
      to={to}
      className="panel panel-hi stat-shell block transition hover:border-white/25 hover:bg-white/4"
      aria-label={`${label}: ${value}`}
    >
      <p className="text-label stat-label">{label}</p>
      <p className="mt-2 text-stat">{value}</p>
    </Link>
  )
}

export function DetailStat({ label, value }: BaseProps) {
  return (
    <div className="rounded border border-white/10 bg-white/2 p-3" role="region" aria-label={`${label}: ${value}`}>
      <p className="text-label opacity-70">{label}</p>
      <p className="mt-1 text-base font-semibold text-white/95">{value}</p>
    </div>
  )
}

type DetailProgressStatProps = BaseProps & {
  progressValue: number
  progressMax?: number
  progressAriaLabel?: string
}

export function DetailProgressStat({
  label,
  value,
  progressValue,
  progressMax = 100,
  progressAriaLabel,
}: DetailProgressStatProps) {
  const safeMax = Math.max(progressMax, 1)
  const safeValue = clampProgressValue(progressValue, safeMax)

  return (
    <div className="rounded border border-white/10 bg-white/2 p-3">
      <p className="text-label opacity-70">{label}</p>
      <p className="mt-1 text-base font-semibold text-white/95">{value}</p>
      <progress
        className="queue-progress mt-2"
        max={safeMax}
        value={safeValue}
        aria-label={progressAriaLabel ?? `${label} progress`}
      >
        {safeValue}
      </progress>
    </div>
  )
}

type StatCardWithIconProps = BaseProps & {
  icon: ReactNode
}

export function StatCardWithIcon({ label, value, icon }: StatCardWithIconProps) {
  return (
    <div className="rounded border border-white/10 bg-white/2 p-3">
      <p className="text-label opacity-70">{label}</p>
      <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-white/95">
        {icon}
        <span>{value}</span>
      </div>
    </div>
  )
}

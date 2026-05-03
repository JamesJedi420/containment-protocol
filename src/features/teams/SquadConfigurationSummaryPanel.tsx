import type { SquadConfigurationSummary } from '../../domain/squadConfigurationSummary'

interface SquadConfigurationSummaryPanelProps {
  summary: SquadConfigurationSummary | null
}

export function SquadConfigurationSummaryPanel({
  summary,
}: SquadConfigurationSummaryPanelProps) {
  return (
    <article
      className="panel panel-support space-y-3"
      role="region"
      aria-label="Squad configuration"
    >
      <h3 className="text-lg font-semibold">Squad configuration</h3>

      {summary === null ? (
        <p className="text-sm opacity-50">No squad configuration available.</p>
      ) : (
        <SquadConfigurationContent summary={summary} />
      )}
    </article>
  )
}

function SquadConfigurationContent({ summary }: { summary: SquadConfigurationSummary }) {
  const { metadata, occupancy, kit } = summary

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <LabeledValue label="Name" value={metadata.name} />
        <LabeledValue label="Role" value={metadata.role} />
        <LabeledValue label="Doctrine" value={metadata.doctrine} />
        <LabeledValue label="Shift" value={metadata.shift} />
        {metadata.assignedZone ? (
          <LabeledValue label="Zone" value={metadata.assignedZone} />
        ) : null}
        {metadata.designatedLeaderId ? (
          <LabeledValue label="Leader ID" value={metadata.designatedLeaderId} />
        ) : null}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50">
          Slots — {occupancy.occupiedSlots}/{occupancy.totalSlots} occupied, {occupancy.vacantSlots}{' '}
          vacant
        </p>
        <ul className="space-y-1">
          {occupancy.slots.map((slot) => (
            <li key={slot.slotId} className="flex items-center gap-2 text-sm">
              <span className="min-w-24 opacity-60">{slot.role}</span>
              {slot.occupied ? (
                <span className="opacity-90">{slot.occupantId}</span>
              ) : (
                <span className="italic opacity-40">vacant</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-50">
          Assigned kit
        </p>
        {kit.state === 'unassigned' ? (
          <p className="text-sm opacity-50">No kit assigned</p>
        ) : kit.state === 'assigned-valid' ? (
          <div className="space-y-1">
            <p className="text-sm font-medium">{kit.assignment.kitTemplateLabel}</p>
            <p className="text-xs text-green-300/80">
              Valid — covers: {kit.validation.coveredTags.join(', ')}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm font-medium">{kit.assignment.kitTemplateLabel}</p>
            <p className="text-xs text-amber-300/80">
              Mismatch — missing: {kit.validation.missingTags.join(', ')} (shortfall:{' '}
              {kit.validation.shortfall})
            </p>
          </div>
        )}
      </div>
    </>
  )
}

function LabeledValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}

import { useId, useState } from 'react'
import { FilterTagGroup } from '../../components/FilterTagGroup'
import { InPageLink } from '../../components/InPageLink'
import type { DepartmentWorkshopMirrorExplanationView } from './departmentWorkshopMirrorView'

const layouts = [
  { value: 'detailed', label: 'Detailed' },
  { value: 'compact', label: 'Compact' },
]

export function DepartmentWorkshopExplanationPanel({
  explanations,
}: {
  explanations: readonly DepartmentWorkshopMirrorExplanationView[]
}) {
  const [layout, setLayout] = useState('detailed')
  const layoutId = useId()
  const compact = layout === 'compact'

  return (
    <article
      className="panel panel-support space-y-3"
      role="region"
      aria-label="Operational workshop explanations"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Operational explanations</h3>
          <p className="text-sm opacity-75">
            Current workshop risks and recorded completion outcomes.
          </p>
        </div>
        <FilterTagGroup
          id={layoutId}
          label="Explanation layout"
          value={layout}
          options={layouts}
          onChange={setLayout}
        />
      </div>

      {explanations.length === 0 ? (
        <p className="text-sm opacity-75">
          No active or recorded workshop degradation explanation.
        </p>
      ) : (
        <ul className={compact ? 'divide-y divide-white/15' : 'space-y-3'}>
          {explanations.map(({ summary, detail }) => (
            <li
              key={summary.id}
              className={
                compact
                  ? 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-x-4 gap-y-1 py-2'
                  : 'space-y-2 rounded border border-white/10 bg-white/5 p-3'
              }
            >
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase">
                  {summary.lifecycle} · {summary.severity}
                </p>
                <p className="font-semibold">{summary.summary}</p>
                <p className="text-sm [overflow-wrap:anywhere]">
                  {summary.source.recordType === 'completion_outcome' && (
                    <InPageLink targetId="workshop-completion-ledger" className="underline">
                      Completion receipt
                    </InPageLink>
                  )}
                  {summary.source.recordType === 'work_order' && (
                    <InPageLink targetId="workshop-work-lanes" className="underline">
                      Work order
                    </InPageLink>
                  )}{' '}
                  {summary.source.recordId}
                </p>
              </div>
              <div className={compact ? 'min-w-0 text-sm' : 'min-w-0 space-y-2 text-sm'}>
                {detail.currentEffect && <p>{detail.currentEffect}</p>}
                {detail.correctionCondition && (
                  <p>
                    <strong>Correction:</strong> {detail.correctionCondition}
                  </p>
                )}
                {detail.cause && <p>{detail.cause}</p>}
                {detail.confidence && <p>Confidence: {detail.confidence}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { DEPARTMENT_WORKSHOP_ACTIVATION_UI_TEXT } from '../../data/copy'
import type { DepartmentWorkshopActivationReasonCode } from '../../domain/departmentWorkshopActivation'
import type { DepartmentWorkshopActivationResult } from '../../domain/departmentWorkshopActivation'
import { getDepartmentWorkshopActivationCommandView } from './departmentWorkshopActivationCommandView'

function reasonLabel(code: DepartmentWorkshopActivationReasonCode): string {
  const ui = DEPARTMENT_WORKSHOP_ACTIVATION_UI_TEXT
  switch (code) {
    case 'invalid-activation-request':
      return ui.reasonInvalidRequest
    case 'missing-department-definition':
      return ui.reasonMissingDepartment
    case 'missing-construction-case':
      return ui.reasonMissingCase
    case 'construction-incomplete':
      return ui.reasonConstructionIncomplete
    case 'missing-map-layer':
      return ui.reasonMissingMapLayer
    case 'missing-structural-route':
      return ui.reasonMissingRoute
    case 'workshop-already-active':
      return ui.reasonAlreadyActive
    case 'invalid-workshop-state':
      return ui.reasonInvalidWorkshopState
    default:
      return ui.reasonUnknown
  }
}

export default function DepartmentWorkshopActivationCommandPage() {
  const { game, activateDepartmentWorkshopFromConstruction } = useGameStore()
  const view = useMemo(() => getDepartmentWorkshopActivationCommandView(game), [game])

  const [departmentId, setDepartmentId] = useState('')
  const [selectKey, setSelectKey] = useState('')
  const [slotCapacity, setSlotCapacity] = useState(1)
  const [lastResult, setLastResult] = useState<DepartmentWorkshopActivationResult | null>(null)

  const selectedDept = view.departments.find((d) => d.departmentId === departmentId)
  const selectedCandidate = selectedDept?.candidates.find((c) => c.selectKey === selectKey)

  function handleDepartmentChange(nextId: string) {
    setDepartmentId(nextId)
    setSelectKey('')
    setLastResult(null)
  }

  function handleSubmit() {
    if (!selectedCandidate) return
    const result = activateDepartmentWorkshopFromConstruction({
      departmentId,
      constructionCaseId: selectedCandidate.constructionCaseId,
      structuralRouteId: selectedCandidate.structuralRouteId,
      slotCapacity,
    })
    setLastResult(result)
  }

  const ui = DEPARTMENT_WORKSHOP_ACTIVATION_UI_TEXT
  const canSubmit =
    Boolean(selectedCandidate) && Number.isSafeInteger(slotCapacity) && slotCapacity > 0

  return (
    <section className="space-y-4" aria-label="Department workshop activation command">
      <article
        className="panel panel-primary space-y-4"
        role="region"
        aria-label="Activation header"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">{ui.pageEyebrow}</p>
            <h2 className="text-xl font-semibold">{ui.pageHeading}</h2>
            <p className="text-sm opacity-60">{ui.pageSubtitle}</p>
          </div>
          <div className="flex gap-2">
            <Link to={APP_ROUTES.departmentWorkshop} className="btn btn-sm btn-ghost">
              {ui.backToMirrorLabel}
            </Link>
            <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
              {ui.backToDeskLabel}
            </Link>
          </div>
        </div>
      </article>

      {view.isEmpty ? (
        <article className="panel panel-support space-y-2" role="region" aria-label="Empty state">
          <h3 className="text-lg font-semibold">{ui.emptyTitle}</h3>
          <p className="text-sm opacity-70">{ui.emptyBody}</p>
        </article>
      ) : (
        <article
          className="panel panel-support space-y-4"
          role="region"
          aria-label="Activation form"
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <label
                htmlFor="dept-select"
                className="text-xs uppercase tracking-[0.2em] opacity-60"
              >
                {ui.departmentLabel}
              </label>
              <select
                id="dept-select"
                className="select select-sm w-full max-w-sm"
                value={departmentId}
                onChange={(e) => handleDepartmentChange(e.target.value)}
              >
                <option value="">— select department —</option>
                {view.departments.map((d) => (
                  <option key={d.departmentId} value={d.departmentId} disabled={d.alreadyActivated}>
                    {d.departmentLabel}
                    {d.alreadyActivated ? ' (activated)' : ''}
                  </option>
                ))}
              </select>
              {selectedDept?.alreadyActivated ? (
                <p className="text-xs text-amber-300/80">{ui.alreadyActivatedNote}</p>
              ) : null}
            </div>

            {selectedDept && !selectedDept.alreadyActivated ? (
              <div className="space-y-1">
                <label
                  htmlFor="route-select"
                  className="text-xs uppercase tracking-[0.2em] opacity-60"
                >
                  {ui.caseAndRouteLabel}
                </label>
                <select
                  id="route-select"
                  className="select select-sm w-full max-w-sm"
                  value={selectKey}
                  onChange={(e) => {
                    setSelectKey(e.target.value)
                    setLastResult(null)
                  }}
                >
                  <option value="">— select case / route —</option>
                  {selectedDept.candidates.map((c) => (
                    <option key={c.selectKey} value={c.selectKey}>
                      {c.constructionCaseId} / {c.routeLabel}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {selectedCandidate ? (
              <div className="space-y-1">
                <label
                  htmlFor="slot-capacity"
                  className="text-xs uppercase tracking-[0.2em] opacity-60"
                >
                  {ui.slotCapacityLabel}
                </label>
                <input
                  id="slot-capacity"
                  type="number"
                  min={1}
                  step={1}
                  className="input input-sm w-24"
                  value={slotCapacity}
                  onChange={(e) => {
                    const v = Math.trunc(Number(e.target.value))
                    setSlotCapacity(Number.isFinite(v) ? v : 1)
                    setLastResult(null)
                  }}
                />
                <p className="text-xs opacity-50">{ui.slotCapacityHint}</p>
              </div>
            ) : null}

            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {ui.submitLabel}
            </button>
          </div>

          {lastResult ? (
            <div
              className="rounded border border-white/10 bg-white/5 px-3 py-2 space-y-1"
              role="status"
              aria-live="polite"
            >
              {lastResult.state === 'activated' ? (
                <p className="text-sm text-green-300">{ui.resultActivatedLabel}</p>
              ) : lastResult.state === 'unchanged' ? (
                <p className="text-sm text-sky-200">{ui.resultUnchangedLabel}</p>
              ) : (
                <>
                  <p className="text-sm text-amber-300">{ui.resultBlockedLabel}</p>
                  {lastResult.reasons.map((r) => (
                    <p key={r.code} className="text-xs opacity-70">
                      {reasonLabel(r.code)}
                    </p>
                  ))}
                </>
              )}
            </div>
          ) : null}
        </article>
      )}
    </section>
  )
}

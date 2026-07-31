import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT } from '../../data/copy'
import { getDepartmentWorkshopMirrorView } from './departmentWorkshopMirrorView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export default function DepartmentWorkshopMirrorPage() {
  const { game } = useGameStore()
  const view = useMemo(() => getDepartmentWorkshopMirrorView(game), [game])

  return (
    <section className="space-y-4" aria-label="Department workshop mirror">
      <article
        className="panel panel-primary space-y-4"
        role="region"
        aria-label="Department workshop summary"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">
              {DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.pageHeading}
            </h2>
            <p className="text-sm opacity-60">{DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.pageSubtitle}</p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.departmentsLabel}
            value={String(view.summary.departmentCount)}
          />
          <StatCard
            label={DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.activeWorkLabel}
            value={String(view.summary.activeWorkCount)}
          />
          <StatCard
            label={DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.queuedWorkLabel}
            value={String(view.summary.queuedWorkCount)}
          />
          <StatCard
            label={DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        <p className="text-xs opacity-55">{DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.readOnlyNote}</p>
      </article>

      {view.departments.length === 0 ? (
        <article className="panel panel-support space-y-2" role="region" aria-label="Empty workshop state">
          <h3 className="text-lg font-semibold">
            {view.isEmpty
              ? DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.emptyTitle
              : DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.emptyLanesTitle}
          </h3>
          <p className="text-sm opacity-70">
            {view.isEmpty
              ? DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.emptyBody
              : DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.emptyLanesBody}
          </p>
        </article>
      ) : (
        <article
          className="panel panel-support space-y-3"
          role="region"
          aria-label="Department workshop lanes"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.departmentsHeading}
            </h3>
            <p className="text-sm opacity-60">
              {DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.departmentsSubtitle}
            </p>
          </div>

          <div className="space-y-4">
            {view.departments.map((department) => (
              <div
                key={department.departmentId}
                className="space-y-2 rounded border border-white/10 bg-white/5 px-3 py-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="font-medium">{department.departmentId}</h4>
                  <p className="text-xs opacity-60">
                    {department.freeSlots}/{department.slotCapacity}{' '}
                    {DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.freeSlotsSuffix}
                  </p>
                </div>

                {department.blockers.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm opacity-80">
                    {department.blockers.map((blocker) => (
                      <li key={blocker.code}>{blocker.label}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs opacity-50">
                    {DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.noBlockersLabel}
                  </p>
                )}

                {department.workItems.length === 0 ? (
                  <p className="text-sm opacity-60">
                    {DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.noWorkItemsLabel}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                          <th className="px-2 py-2">
                            {DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.workOrderColumn}
                          </th>
                          <th className="px-2 py-2">
                            {DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.laneColumn}
                          </th>
                          <th className="px-2 py-2">
                            {DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.taskColumn}
                          </th>
                          <th className="px-2 py-2">
                            {DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.caseColumn}
                          </th>
                          <th className="px-2 py-2">
                            {DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.progressColumn}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {department.workItems.map((item) => (
                          <tr
                            key={`${item.laneLabel}:${item.workOrderId}`}
                            className="border-b border-white/5 align-top"
                          >
                            <td className="px-2 py-2 font-medium">{item.workOrderId}</td>
                            <td className="px-2 py-2">{item.laneLabel}</td>
                            <td className="px-2 py-2">{item.taskTypeLabel}</td>
                            <td className="px-2 py-2">{item.caseId}</td>
                            <td className="px-2 py-2">{item.progressLabel}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </article>
      )}

      <article
        className="panel panel-support space-y-4"
        role="region"
        aria-label="Completion quality and safety ledger"
      >
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">
            {DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.outcomesHeading}
          </h3>
          <p className="text-sm opacity-60">{DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.outcomesSubtitle}</p>
        </div>

        {view.outcomesEmpty ? (
          <div role="region" aria-label="Empty completion ledger">
            <h4 className="font-medium">{DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.outcomesEmptyTitle}</h4>
            <p className="text-sm opacity-70">{DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.outcomesEmptyBody}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                  <th className="px-2 py-2">{DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.workOrderColumn}</th>
                  <th className="px-2 py-2">{DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.weekColumn}</th>
                  <th className="px-2 py-2">{DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.qualityColumn}</th>
                  <th className="px-2 py-2">{DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.safetyColumn}</th>
                  <th className="px-2 py-2">{DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.caseColumn}</th>
                </tr>
              </thead>
              <tbody>
                {view.outcomes.map((outcome) => (
                  <tr key={outcome.workOrderId} className="border-b border-white/5 align-top">
                    <td className="px-2 py-2">
                      <p className="font-medium">{outcome.workOrderId}</p>
                      <p className="text-xs opacity-55">{outcome.departmentId}</p>
                      <p className="text-xs opacity-45">{outcome.taskTypeLabel}</p>
                    </td>
                    <td className="px-2 py-2">{outcome.completedWeekLabel}</td>
                    <td className="px-2 py-2">
                      {outcome.qualityLabel}
                      {outcome.qualityReasonLabel ? (
                        <p className="text-xs opacity-55">{outcome.qualityReasonLabel}</p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      {outcome.safetyLabel}
                      {outcome.safetyReasonLabel ? (
                        <p className="text-xs opacity-55">{outcome.safetyReasonLabel}</p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">{outcome.caseId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <article
        className="panel panel-support space-y-4"
        role="region"
        aria-label="Unsafe completion consequences"
      >
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">
            {DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.consequencesHeading}
          </h3>
          <p className="text-sm opacity-60">
            {DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.consequencesSubtitle}
          </p>
        </div>

        {view.consequencesEmpty ? (
          <div role="region" aria-label="Empty consequences ledger">
            <h4 className="font-medium">
              {DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.consequencesEmptyTitle}
            </h4>
            <p className="text-sm opacity-70">
              {DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.consequencesEmptyBody}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                  <th className="px-2 py-2">{DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.workOrderColumn}</th>
                  <th className="px-2 py-2">{DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.spawnedCaseColumn}</th>
                  <th className="px-2 py-2">{DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.qualityColumn}</th>
                  <th className="px-2 py-2">{DEPARTMENT_WORKSHOP_MIRROR_UI_TEXT.safetyColumn}</th>
                </tr>
              </thead>
              <tbody>
                {view.consequences.map((consequence) => (
                  <tr key={consequence.workOrderId} className="border-b border-white/5 align-top">
                    <td className="px-2 py-2">
                      <p className="font-medium">{consequence.workOrderId}</p>
                      <p className="text-xs opacity-55">{consequence.departmentId}</p>
                      <p className="text-xs opacity-45">{consequence.caseId}</p>
                    </td>
                    <td className="px-2 py-2">{consequence.spawnedCaseId}</td>
                    <td className="px-2 py-2">{consequence.qualityLabel}</td>
                    <td className="px-2 py-2">{consequence.safetyLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  )
}

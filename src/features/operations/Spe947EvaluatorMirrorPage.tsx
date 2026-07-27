import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { SPE_947_EVALUATOR_MIRROR_UI_TEXT } from '../../data/copy'
import { getSpe947EvaluatorMirrorView } from './spe947EvaluatorMirrorView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export default function Spe947EvaluatorMirrorPage() {
  const { game } = useGameStore()
  const view = useMemo(() => getSpe947EvaluatorMirrorView(game), [game])

  return (
    <section className="space-y-4" aria-label="Hazardous content propagation evaluator mirror">
      <article className="panel panel-primary space-y-4" role="region" aria-label="Evaluator mirror summary">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {SPE_947_EVALUATOR_MIRROR_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">{SPE_947_EVALUATOR_MIRROR_UI_TEXT.pageHeading}</h2>
            <p className="text-sm opacity-60">{SPE_947_EVALUATOR_MIRROR_UI_TEXT.pageSubtitle}</p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {SPE_947_EVALUATOR_MIRROR_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label={SPE_947_EVALUATOR_MIRROR_UI_TEXT.platformsLabel}
            value={String(view.summary.platformCount)}
          />
          <StatCard
            label={SPE_947_EVALUATOR_MIRROR_UI_TEXT.plansLabel}
            value={String(view.summary.planCount)}
          />
          <StatCard
            label={SPE_947_EVALUATOR_MIRROR_UI_TEXT.ownersLabel}
            value={String(view.summary.ownerCount)}
          />
          <StatCard
            label={SPE_947_EVALUATOR_MIRROR_UI_TEXT.mediaCasesLabel}
            value={String(view.summary.mediaCaseCount)}
          />
          <StatCard
            label={SPE_947_EVALUATOR_MIRROR_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        <p className="text-xs opacity-55">{SPE_947_EVALUATOR_MIRROR_UI_TEXT.readOnlyNote}</p>
      </article>

      {view.isEmpty ? (
        <article className="panel panel-support space-y-2" role="region" aria-label="Empty evaluator mirror state">
          <h3 className="text-lg font-semibold">{SPE_947_EVALUATOR_MIRROR_UI_TEXT.emptyTitle}</h3>
          <p className="text-sm opacity-70">{SPE_947_EVALUATOR_MIRROR_UI_TEXT.emptyBody}</p>
        </article>
      ) : (
        <>
          {view.platforms.length > 0 ? (
            <article
              className="panel panel-support space-y-3"
              role="region"
              aria-label="Persisted SPE-947 platforms"
            >
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">
                  {SPE_947_EVALUATOR_MIRROR_UI_TEXT.platformsHeading}
                </h3>
                <p className="text-sm opacity-60">
                  {SPE_947_EVALUATOR_MIRROR_UI_TEXT.platformsSubtitle}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                      <th className="px-2 py-2">{SPE_947_EVALUATOR_MIRROR_UI_TEXT.labelColumn}</th>
                      <th className="px-2 py-2">{SPE_947_EVALUATOR_MIRROR_UI_TEXT.viewCountColumn}</th>
                      <th className="px-2 py-2">{SPE_947_EVALUATOR_MIRROR_UI_TEXT.uptimeColumn}</th>
                      <th className="px-2 py-2">{SPE_947_EVALUATOR_MIRROR_UI_TEXT.reachColumn}</th>
                      <th className="px-2 py-2">{SPE_947_EVALUATOR_MIRROR_UI_TEXT.tickColumn}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.platforms.map((platform) => (
                      <tr key={platform.id} className="border-b border-white/5 align-top">
                        <td className="px-2 py-2">
                          <p className="font-medium">{platform.label}</p>
                          <p className="text-xs opacity-55">{platform.id}</p>
                        </td>
                        <td className="px-2 py-2">
                          {platform.viewCountLabel}
                          {platform.weeklyViewDeltaLabel !== '—' ? (
                            <p className="text-xs opacity-55">
                              {SPE_947_EVALUATOR_MIRROR_UI_TEXT.weeklyDeltaPrefix}{' '}
                              {platform.weeklyViewDeltaLabel}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-2 py-2">{platform.uptimeStateLabel}</td>
                        <td className="px-2 py-2">
                          {platform.reachFactorLabel}
                          <p className="text-xs opacity-55">
                            {SPE_947_EVALUATOR_MIRROR_UI_TEXT.availableReachPrefix}{' '}
                            {platform.availableReachLabel}
                          </p>
                        </td>
                        <td className="px-2 py-2">{platform.lastWeeklyTickWeekLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ) : null}

          {view.plans.length > 0 ? (
            <article
              className="panel panel-support space-y-3"
              role="region"
              aria-label="Persisted SPE-947 counter-memetic plans"
            >
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">
                  {SPE_947_EVALUATOR_MIRROR_UI_TEXT.plansHeading}
                </h3>
                <p className="text-sm opacity-60">{SPE_947_EVALUATOR_MIRROR_UI_TEXT.plansSubtitle}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                      <th className="px-2 py-2">{SPE_947_EVALUATOR_MIRROR_UI_TEXT.labelColumn}</th>
                      <th className="px-2 py-2">{SPE_947_EVALUATOR_MIRROR_UI_TEXT.loreColumn}</th>
                      <th className="px-2 py-2">{SPE_947_EVALUATOR_MIRROR_UI_TEXT.distributorColumn}</th>
                      <th className="px-2 py-2">{SPE_947_EVALUATOR_MIRROR_UI_TEXT.uptakeColumn}</th>
                      <th className="px-2 py-2">{SPE_947_EVALUATOR_MIRROR_UI_TEXT.propagationColumn}</th>
                      <th className="px-2 py-2">{SPE_947_EVALUATOR_MIRROR_UI_TEXT.tickColumn}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.plans.map((plan) => (
                      <tr key={plan.id} className="border-b border-white/5 align-top">
                        <td className="px-2 py-2">
                          <p className="font-medium">{plan.label}</p>
                          <p className="text-xs opacity-55">{plan.id}</p>
                        </td>
                        <td className="px-2 py-2">{plan.loreStateLabel}</td>
                        <td className="px-2 py-2">{plan.distributorLabel}</td>
                        <td className="px-2 py-2">{plan.uptakeStateLabel}</td>
                        <td className="px-2 py-2">
                          {plan.elapsedPropagationWeeksLabel}
                          <p className="text-xs opacity-55">
                            {SPE_947_EVALUATOR_MIRROR_UI_TEXT.requiredWeeksPrefix}{' '}
                            {plan.requiredPropagationWeeksLabel}
                          </p>
                        </td>
                        <td className="px-2 py-2">{plan.lastWeeklyTickWeekLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ) : null}

          {view.owners.length > 0 ? (
            <article
              className="panel panel-support space-y-3"
              role="region"
              aria-label="Persisted SPE-947 content owners"
            >
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">
                  {SPE_947_EVALUATOR_MIRROR_UI_TEXT.ownersHeading}
                </h3>
                <p className="text-sm opacity-60">{SPE_947_EVALUATOR_MIRROR_UI_TEXT.ownersSubtitle}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                      <th className="px-2 py-2">{SPE_947_EVALUATOR_MIRROR_UI_TEXT.labelColumn}</th>
                      <th className="px-2 py-2">{SPE_947_EVALUATOR_MIRROR_UI_TEXT.incentivesColumn}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.owners.map((owner) => (
                      <tr key={owner.id} className="border-b border-white/5 align-top">
                        <td className="px-2 py-2">
                          <p className="font-medium">{owner.label}</p>
                          <p className="text-xs opacity-55">{owner.id}</p>
                        </td>
                        <td className="px-2 py-2">{owner.incentivesLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ) : null}

          {view.mediaCases.length > 0 ? (
            <article
              className="panel panel-support space-y-3"
              role="region"
              aria-label="Persisted SPE-947 post-case media cases"
            >
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">
                  {SPE_947_EVALUATOR_MIRROR_UI_TEXT.mediaCasesHeading}
                </h3>
                <p className="text-sm opacity-60">
                  {SPE_947_EVALUATOR_MIRROR_UI_TEXT.mediaCasesSubtitle}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                      <th className="px-2 py-2">{SPE_947_EVALUATOR_MIRROR_UI_TEXT.labelColumn}</th>
                      <th className="px-2 py-2">{SPE_947_EVALUATOR_MIRROR_UI_TEXT.containmentColumn}</th>
                      <th className="px-2 py-2">{SPE_947_EVALUATOR_MIRROR_UI_TEXT.riskThresholdColumn}</th>
                      <th className="px-2 py-2">{SPE_947_EVALUATOR_MIRROR_UI_TEXT.mediaArtifactsColumn}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.mediaCases.map((mediaCase) => (
                      <tr key={mediaCase.id} className="border-b border-white/5 align-top">
                        <td className="px-2 py-2">
                          <p className="font-medium">{mediaCase.label}</p>
                          <p className="text-xs opacity-55">{mediaCase.id}</p>
                        </td>
                        <td className="px-2 py-2">{mediaCase.localContainmentSucceededLabel}</td>
                        <td className="px-2 py-2">{mediaCase.riskThresholdLabel}</td>
                        <td className="px-2 py-2">
                          {mediaCase.mediaArtifactCountLabel}
                          {mediaCase.mediaArtifactLabels.length > 0 ? (
                            <p className="text-xs opacity-55">
                              {mediaCase.mediaArtifactLabels.join('; ')}
                            </p>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          ) : null}
        </>
      )}
    </section>
  )
}

import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT } from '../../data/copy'
import { getSpe956PropagationGraphMirrorView } from './spe956PropagationGraphMirrorView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export default function Spe956PropagationGraphMirrorPage() {
  const { game } = useGameStore()
  const view = useMemo(() => getSpe956PropagationGraphMirrorView(game), [game])

  return (
    <section className="space-y-4" aria-label="Propagation graph mirror">
      <article
        className="panel panel-primary space-y-4"
        role="region"
        aria-label="Propagation graph summary"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">
              {SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT.pageHeading}
            </h2>
            <p className="text-sm opacity-60">
              {SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT.pageSubtitle}
            </p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT.graphsLabel}
            value={String(view.summary.graphCount)}
          />
          <StatCard
            label={SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT.nodesLabel}
            value={String(view.summary.totalNodeCount)}
          />
          <StatCard
            label={SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT.edgesLabel}
            value={String(view.summary.totalEdgeCount)}
          />
          <StatCard
            label={SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        <p className="text-xs opacity-55">
          {SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT.readOnlyNote}
        </p>
      </article>

      {view.isEmpty ? (
        <article
          className="panel panel-support space-y-2"
          role="region"
          aria-label="Empty propagation graph state"
        >
          <h3 className="text-lg font-semibold">
            {SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT.emptyTitle}
          </h3>
          <p className="text-sm opacity-70">{SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT.emptyBody}</p>
        </article>
      ) : (
        view.graphs.map((graph) => (
          <article
            key={graph.id}
            className="panel panel-support space-y-4"
            role="region"
            aria-label={`Persisted propagation graph ${graph.label}`}
          >
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">{graph.label}</h3>
              <p className="text-xs opacity-55">{graph.id}</p>
              <p className="text-sm opacity-60">
                {SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT.seedNodePrefix} {graph.seedNodeIdLabel}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard
                label={SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT.elapsedWeeksLabel}
                value={graph.elapsedPropagationWeeksLabel}
              />
              <StatCard
                label={SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT.weeklyDeltaLabel}
                value={graph.weeklyElapsedWeeksDeltaLabel}
              />
              <StatCard
                label={SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT.lastTickWeekLabel}
                value={graph.lastWeeklyTickWeekLabel}
              />
            </div>

            {graph.nodes.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-base font-semibold">
                  {SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT.nodesHeading}
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                        <th className="px-2 py-2">
                          {SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT.labelColumn}
                        </th>
                        <th className="px-2 py-2">
                          {SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT.kindColumn}
                        </th>
                        <th className="px-2 py-2">
                          {SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT.entityColumn}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {graph.nodes.map((node) => (
                        <tr key={node.id} className="border-b border-white/5 align-top">
                          <td className="px-2 py-2">
                            <p className="font-medium">{node.label}</p>
                            <p className="text-xs opacity-55">{node.id}</p>
                          </td>
                          <td className="px-2 py-2">{node.kindLabel}</td>
                          <td className="px-2 py-2">{node.entityIdLabel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {!graph.isEdgeEmpty ? (
              <div className="space-y-2">
                <h4 className="text-base font-semibold">
                  {SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT.edgesHeading}
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                        <th className="px-2 py-2">
                          {SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT.edgeIdColumn}
                        </th>
                        <th className="px-2 py-2">
                          {SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT.fromNodeColumn}
                        </th>
                        <th className="px-2 py-2">
                          {SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT.toNodeColumn}
                        </th>
                        <th className="px-2 py-2">
                          {SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT.spreadFactorColumn}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {graph.edges.map((edge) => (
                        <tr key={edge.id} className="border-b border-white/5 align-top">
                          <td className="px-2 py-2">{edge.id}</td>
                          <td className="px-2 py-2">{edge.fromNodeIdLabel}</td>
                          <td className="px-2 py-2">{edge.toNodeIdLabel}</td>
                          <td className="px-2 py-2">{edge.spreadFactorLabel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div
                className="rounded border border-white/10 bg-white/5 px-3 py-2 text-sm opacity-70"
                role="status"
                aria-label={SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT.edgeEmptyLabel}
              >
                {SPE_956_PROPAGATION_GRAPH_MIRROR_UI_TEXT.edgeEmptyBody}
              </div>
            )}
          </article>
        ))
      )}
    </section>
  )
}

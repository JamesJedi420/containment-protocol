import { Link } from 'react-router-dom'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import {
  getAgentEquipmentLoadoutViews,
  getGearRecommendationsForActiveCases,
} from './equipmentView'

function EquipmentPage() {
  const { game, equipAgentItem, unequipAgentItem } = useGameStore()
  const loadoutViews = getAgentEquipmentLoadoutViews(game)
  const recommendations = getGearRecommendationsForActiveCases(game)
  const itemization = {
    totalStock: Object.values(game.inventory).reduce((sum, count) => sum + count, 0),
    equippedItemCount: loadoutViews.reduce(
      (sum, view) => sum + view.summary.equippedItemCount,
      0
    ),
    queuedOutputUnits: game.productionQueue.length,
  }

  return (
    <section className="space-y-4">
      <article className="panel space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Equipment</h2>
            <h3 className="text-base font-semibold">Equipment Support Model</h3>
            <h3 className="text-base font-semibold">Itemization Layer</h3>
            <p className="text-sm opacity-60">
              Loadouts are tracked per operative while reserve stock remains globally shared across
              the simulation.
            </p>
          </div>
          <div className="flex gap-2">
            <Link to={APP_ROUTES.fabrication} className="btn btn-sm btn-ghost">
              Open Fabrication
            </Link>
            <Link to={APP_ROUTES.cases} className="btn btn-sm btn-ghost">
              Open Cases
            </Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Total stock" value={String(itemization.totalStock)} />
          <Metric label="Equipped gear" value={String(itemization.equippedItemCount)} />
          <Metric label="Queued output" value={String(itemization.queuedOutputUnits)} />
          <Metric
            label="Market"
            value={`${game.market.pressure} (${game.market.costMultiplier.toFixed(2)}x)`}
          />
        </div>
      </article>

      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">Active Case Recommendations</h3>
        {recommendations.length > 0 ? (
          <div className="space-y-3">
            {recommendations.map((recommendation) => (
              <article key={recommendation.caseId} className="rounded border border-white/10 px-3 py-3">
                <Link className="font-medium hover:underline" to={APP_ROUTES.caseDetail(recommendation.caseId)}>
                  {recommendation.caseTitle}
                </Link>
                <p className="mt-1 text-sm opacity-70">{recommendation.itemName}</p>
                <p className="text-sm opacity-60">
                  Stock {recommendation.stock} / Queue {recommendation.queued}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p>No active operations currently require targeted equipment recommendations.</p>
        )}
      </article>

      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">Agent loadouts</h3>
        <p className="text-xs uppercase tracking-[0.24em] opacity-50">
          {loadoutViews.length} operatives
        </p>

        {loadoutViews.length === 0 ? (
          <p className="text-sm opacity-60">No operatives are currently available for equipment.</p>
        ) : (
          <ul className="space-y-3">
            {loadoutViews.map((view) => (
              <li key={view.agentId} className="rounded border border-white/10 px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{view.agentName}</p>
                    <p className="text-xs uppercase tracking-[0.2em] opacity-50">
                      {view.assignmentState} / Slots {view.summary.equippedItemCount}/
                      {view.summary.slotCount} / Context live {view.summary.activeContextItemCount} /
                      Quality {view.summary.loadoutQuality}
                    </p>
                    {view.blockedReason ? (
                      <p className="mt-1 text-xs text-amber-200/80">{view.blockedReason}</p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  {view.slots.map((slot) => {
                    const availableOptions = slot.stockOptions.filter(
                      (option) => option.itemId !== slot.itemId
                    )

                    return (
                      <div key={slot.slot} className="rounded border border-white/10 px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
                              {slot.slotLabel}
                            </p>
                            <p className="font-medium">{slot.itemName}</p>
                            <p className="text-xs opacity-60">
                              {slot.tags.length > 0 ? slot.tags.join(', ') : 'No gear tags'}
                            </p>
                          </div>

                          {slot.itemId ? (
                            <button
                              type="button"
                              className="btn btn-xs btn-ghost"
                              onClick={() => unequipAgentItem(view.agentId, slot.slot)}
                              disabled={!view.editable}
                              aria-label={`Unequip ${slot.slotLabel} from ${view.agentName}`}
                            >
                              Unequip
                            </button>
                          ) : null}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {availableOptions.length > 0 ? (
                            availableOptions.map((option) => (
                              <button
                                key={`${view.agentId}-${slot.slot}-${option.itemId}`}
                                type="button"
                                className="btn btn-xs"
                                onClick={() => equipAgentItem(view.agentId, slot.slot, option.itemId)}
                                disabled={!view.editable}
                                aria-label={`Equip ${option.itemName} to ${view.agentName} ${slot.slotLabel}`}
                              >
                                {option.itemName} ({option.stock})
                              </button>
                            ))
                          ) : (
                            <p className="text-xs opacity-50">No compatible stock available.</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}

export default EquipmentPage

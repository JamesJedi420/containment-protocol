import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { buildItemizationOverview } from '../../domain/itemization'
import { buildLogisticsOverview } from '../../domain/logistics'
import {
  getMarketPressureLabel,
} from '../../data/production'
import {
  getAgentEquipmentLoadoutViews,
  getGearRecommendationsForActiveCases,
} from './equipmentView'

export default function EquipmentPage() {
  const { game, equipAgentItem, unequipAgentItem } = useGameStore()
  const gearRecommendations = getGearRecommendationsForActiveCases(game)
  const loadoutViews = getAgentEquipmentLoadoutViews(game)
  const logistics = buildLogisticsOverview(game)
  const itemization = buildItemizationOverview(game)
  const featuredRecipe = logistics.recipeBreakdowns.find(
    (recipe) => recipe.recipeId === game.market.featuredRecipeId
  )
  const recentEvents = [...game.events]
    .filter(
      (event) => event.type === 'production.queue_completed' || event.type === 'market.shifted'
    )
    .slice(-6)
    .reverse()

  return (
    <section className="space-y-4">
      <article className="panel space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Equipment</h2>
            <p className="text-sm opacity-60">
              Loadouts are now tracked per operative. Stock remains deterministic and additive:
              reserve inventory supports operations globally, while equipped field gear modifies the
              assigned operative&apos;s domain scoring directly.
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
            value={`${getMarketPressureLabel(game.market.pressure)} (${game.market.costMultiplier.toFixed(2)}x)`}
          />
        </div>
      </article>

      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">Equipment support model</h3>
        <p className="text-sm opacity-60">
          Equipment remains additive in MVP. Slotted gear changes operative domain output, reserve
          stock contributes contextual support, and every loadout change is derived from the same
          deterministic inventory state.
        </p>
        {featuredRecipe ? (
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="Featured recipe" value={featuredRecipe.recipeName} />
            <Metric label="Fabrication" value={`$${featuredRecipe.fabricationCost}`} />
            <Metric label="Market" value={`$${featuredRecipe.marketCost}`} />
            <Metric label="Markup" value={`${featuredRecipe.markup.toFixed(2)}x`} />
          </div>
        ) : null}
      </article>

      <article className="panel space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold">Agent loadouts</h3>
          <p className="text-xs uppercase tracking-[0.24em] opacity-50">
            {loadoutViews.length} operatives
          </p>
        </div>

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
                  {view.slots.map((slot) => (
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
                        {slot.stockOptions.filter((option) => option.itemId !== slot.itemId).length > 0 ? (
                          slot.stockOptions
                            .filter((option) => option.itemId !== slot.itemId)
                            .map((option) => (
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
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="panel space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold">Active case recommendations</h3>
          <p className="text-xs uppercase tracking-[0.24em] opacity-50">
            {gearRecommendations.length} suggested loadout{gearRecommendations.length === 1 ? '' : 's'}
          </p>
        </div>

        {gearRecommendations.length === 0 ? (
          <p className="text-sm opacity-60">
            No active operations currently require targeted equipment recommendations.
          </p>
        ) : (
          <ul className="space-y-2">
            {gearRecommendations.map((recommendation) => (
              <li key={recommendation.caseId} className="rounded border border-white/10 px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      to={APP_ROUTES.caseDetail(recommendation.caseId)}
                      className="font-medium hover:underline"
                    >
                      {recommendation.caseTitle}
                    </Link>
                    <p className="text-sm opacity-60">
                      Stage {recommendation.stage} / Deadline {recommendation.deadlineRemaining}w
                    </p>
                  </div>
                  <p className="text-sm font-medium text-emerald-200">{recommendation.itemName}</p>
                </div>
                <p className="mt-2 text-xs opacity-70">{recommendation.reason}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] opacity-60">
                  Stock {recommendation.stock} / Queue {recommendation.queued}
                </p>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="panel space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold">Itemization layer</h3>
          <p className="text-xs uppercase tracking-[0.24em] opacity-50">
            {itemization.entries.length} tracked items
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Stocked items" value={String(itemization.stockedItemCount)} />
          <Metric label="Equipment stock" value={String(itemization.equipmentStock)} />
          <Metric label="Material stock" value={String(itemization.materialStock)} />
          <Metric label="Reward windows" value={String(itemization.rewardOpportunityItemCount)} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {itemization.topOperationalItems.map((entry) => (
            <div key={entry.itemId} className="rounded border border-white/10 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{entry.label}</p>
                  <p className="text-sm opacity-60">
                    {entry.kind}
                    {entry.slot ? ` / ${entry.slot}` : ''} / Sources {entry.sourceChannels.join(', ')}
                  </p>
                </div>
                <p className="text-sm opacity-60">
                  Stock {entry.stock} / Equipped {entry.equipped}
                </p>
              </div>
              <div className="mt-3 space-y-1 text-xs opacity-70">
                <p>
                  Case match {entry.activeCaseMatchCount} / Reward opportunities{' '}
                  {entry.rewardOpportunityCount}
                </p>
                <p>
                  Queue {entry.queuedOutput} / Market availability {entry.marketAvailableUnits}
                </p>
                <p>
                  {entry.fabricationRecipeName
                    ? `Fabrication ${entry.fabricationRecipeName} / ${entry.fabricationDurationWeeks}w / $${entry.fabricationCost}`
                    : 'No fabrication recipe'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">Active fabrication queue</h3>
        {game.productionQueue.length === 0 ? (
          <p className="text-sm opacity-60">No active fabrication orders.</p>
        ) : (
          <ul className="space-y-2">
            {game.productionQueue.map((entry) => (
              <li key={entry.id} className="rounded border border-white/10 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{entry.recipeName}</p>
                    <p className="text-sm opacity-60">
                      {entry.outputQuantity}x {entry.outputItemName}
                    </p>
                  </div>
                  <p className="text-sm opacity-60">{entry.remainingWeeks}w remaining</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">Recent equipment events</h3>
        {recentEvents.length === 0 ? (
          <p className="text-sm opacity-60">No equipment or market events recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentEvents.map((event) => (
              <li key={event.id} className="rounded border border-white/10 px-3 py-2">
                <p className="font-medium">
                  {event.type === 'production.queue_completed'
                    ? `${event.payload.queueName} completed`
                    : `${getMarketPressureLabel(event.payload.pressure)} market conditions`}
                </p>
                <p className="text-xs opacity-50">Week {event.payload.week}</p>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">Current stock ledger</h3>
        <ul className="space-y-1 text-sm">
          {itemization.entries
            .filter((entry) => entry.stock > 0 || entry.equipped > 0 || entry.queuedOutput > 0)
            .map((entry) => (
            <li key={entry.itemId} className="flex items-center justify-between gap-3">
              <span>
                {entry.label}
                <span className="ml-2 text-xs opacity-50">
                  {entry.kind}
                  {entry.slot ? ` / ${entry.slot}` : ''}
                </span>
              </span>
              <span>
                {entry.stock}
                {entry.equipped > 0 ? ` / equipped ${entry.equipped}` : ''}
                {entry.queuedOutput > 0 ? ` / queued ${entry.queuedOutput}` : ''}
              </span>
            </li>
            ))}
        </ul>
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

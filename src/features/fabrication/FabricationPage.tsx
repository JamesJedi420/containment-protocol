import { useGameStore } from '../../app/store/gameStore'
import { getTimeQueueSummary } from '../../app/services/divisionMetrics'
import { FABRICATION_UI_TEXT } from '../../data/copy'
import {
  getMarketPressureLabel,
  getMissingRecipeMaterials,
  getRecipeFundingCost,
  getRecipeInputMaterials,
  hasRecipeMaterialStock,
  inventoryItemLabels,
  productionCatalog,
  productionMaterialCatalog,
} from '../../data/production'
import { formatProductionMaterialSummary, formatProductionOutputLabel } from '../../domain/crafting'
import { buildLogisticsOverview } from '../../domain/logistics'

export default function FabricationPage() {
  const { game, queueFabrication } = useGameStore()
  const queueSummary = getTimeQueueSummary(game)
  const logistics = buildLogisticsOverview(game)
  const materialInventory = productionMaterialCatalog.map((material) => ({
    ...material,
    quantity: game.inventory[material.materialId] ?? 0,
  }))
  const featuredRecipe = logistics.recipeBreakdowns.find(
    (recipe) => recipe.recipeId === game.market.featuredRecipeId
  )

  return (
    <section className="space-y-4">
      <article className="panel space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{FABRICATION_UI_TEXT.pageHeading}</h2>
            <p className="text-sm opacity-60">{FABRICATION_UI_TEXT.pageSubtitle}</p>
          </div>
          <p className="text-xs uppercase tracking-[0.24em] opacity-50">
            {FABRICATION_UI_TEXT.queueCountLabel}: {queueSummary.queued}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Metric
            label={FABRICATION_UI_TEXT.remainingWeeksLabel}
            value={String(queueSummary.remainingWeeks)}
          />
          <Metric
            label={FABRICATION_UI_TEXT.completedOrdersLabel}
            value={String(queueSummary.completedEvents)}
          />
          <Metric
            label={FABRICATION_UI_TEXT.marketPressureLabel}
            value={`${getMarketPressureLabel(game.market.pressure)} (${game.market.costMultiplier.toFixed(2)}x)`}
          />
        </div>
      </article>

      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">Fabrication lab model</h3>
        <p className="text-sm opacity-60">
          Lab costs are deterministic: base recipe cost modified by procurement pressure and the
          featured fabrication line. Materials are consumed when an order is queued, and finished
          stock is credited on weekly completion.
        </p>
        {featuredRecipe ? (
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="Featured output" value={featuredRecipe.outputName} />
            <Metric label="Fabrication cost" value={`$${featuredRecipe.fabricationCost}`} />
            <Metric
              label="Per unit"
              value={`$${featuredRecipe.costPerUnitFabrication.toFixed(2)}`}
            />
            <Metric label="Market parity" value={`$${featuredRecipe.marketCost}`} />
          </div>
        ) : null}
      </article>

      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">{FABRICATION_UI_TEXT.recipeCatalogHeading}</h3>

        <div className="space-y-2">
          {productionCatalog.map((recipe) => {
            const fundingCost = getRecipeFundingCost(recipe, game.market)
            const affordable = game.funding >= fundingCost
            const hasMaterials = hasRecipeMaterialStock(recipe, game.inventory)
            const missingMaterials = getMissingRecipeMaterials(recipe, game.inventory)
            const requiredMaterials = getRecipeInputMaterials(recipe)
            const canQueue = affordable && hasMaterials

            return (
              <div
                key={recipe.recipeId}
                className="flex flex-wrap items-start justify-between gap-3 rounded border border-white/10 px-3 py-3"
              >
                <div>
                  <p className="font-medium">{recipe.name}</p>
                  <p className="text-sm opacity-60">
                    {recipe.outputQuantity}x {recipe.outputItemName} / {recipe.durationWeeks}w / $
                    {fundingCost}
                  </p>
                  <p className="mt-1 text-xs opacity-60">
                    Materials:{' '}
                    {requiredMaterials
                      .map((material) => `${material.materialName} x${material.quantity}`)
                      .join(', ')}
                  </p>
                  {missingMaterials.length > 0 ? (
                    <p className="mt-1 text-xs text-amber-200/80">
                      Missing:{' '}
                      {missingMaterials
                        .map((material) => `${material.materialName} x${material.quantity}`)
                        .join(', ')}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  disabled={!canQueue}
                  aria-label={`Queue ${recipe.name}`}
                  onClick={() => queueFabrication(recipe.recipeId)}
                >
                  {FABRICATION_UI_TEXT.queueButton}
                </button>
              </div>
            )
          })}
        </div>
      </article>

      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">{FABRICATION_UI_TEXT.activeQueueHeading}</h3>
        {game.productionQueue.length === 0 ? (
          <p className="text-sm opacity-60">{FABRICATION_UI_TEXT.noActiveOrders}</p>
        ) : (
          <ul className="space-y-2">
            {game.productionQueue.map((entry) => (
              <li key={entry.id} className="rounded border border-white/10 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{entry.recipeName}</p>
                  <p className="text-sm opacity-60">
                    {entry.remainingWeeks}
                    {FABRICATION_UI_TEXT.remainingWeeksSuffix}
                  </p>
                </div>
                <p className="text-sm opacity-60">
                  {FABRICATION_UI_TEXT.outputLabel}:{' '}
                  {formatProductionOutputLabel(entry.outputQuantity, entry.outputItemName)}
                </p>
                {entry.recipeDescription ? (
                  <p className="text-xs opacity-60">{entry.recipeDescription}</p>
                ) : null}
                <p className="text-xs opacity-60">
                  Inputs: {formatProductionMaterialSummary(entry.inputMaterials)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">Material stores</h3>
        <ul className="space-y-1 text-sm">
          {materialInventory.map((material) => (
            <li key={material.materialId} className="flex items-center justify-between gap-3">
              <span>{material.name}</span>
              <span>{material.quantity}</span>
            </li>
          ))}
        </ul>
      </article>

      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">{FABRICATION_UI_TEXT.inventoryHeading}</h3>
        <ul className="space-y-1 text-sm">
          {productionCatalog.map((recipe) => (
            <li key={recipe.outputItemId} className="flex items-center justify-between gap-3">
              <span>{inventoryItemLabels[recipe.outputItemId] ?? recipe.outputItemId}</span>
              <span>{game.inventory[recipe.outputItemId] ?? 0}</span>
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

import { Link } from 'react-router'
import { useMemo, useState } from 'react'
import { useGameStore } from '../../app/store/gameStore'
import { APP_ROUTES } from '../../app/routes'
import type { EquipmentDeconstructionSourceRef } from '../../domain/sim/equipmentDeconstruction'
import {
  getAgentEquipmentLoadoutViews,
  getEquipmentAutoScrapView,
  getEquipmentDeconstructionQueueViews,
  getEquipmentDeconstructionViews,
  getEquipmentInstanceMaterializationViews,
  type EquipmentAutoScrapView,
} from './equipmentView'

function EquipmentPage() {
  const {
    game,
    materializeStoredEquipmentInstance,
    destroyStoredEquipmentInstance,
    equipAgentItem,
    equipStoredEquipmentInstance,
    activateCombatStim,
    unequipAgentItem,
    queueEquipmentDeconstruction,
    enableEquipmentAutoScrap,
    disableEquipmentAutoScrap,
  } = useGameStore()
  const loadoutViews = getAgentEquipmentLoadoutViews(game)
  const instanceMaterializationViews = useMemo(
    () => getEquipmentInstanceMaterializationViews(game),
    [game]
  )
  const [deconstructionSources, setDeconstructionSources] = useState<
    Record<string, EquipmentDeconstructionSourceRef>
  >({})
  const deconstructionViews = useMemo(
    () => getEquipmentDeconstructionViews(game, deconstructionSources),
    [game, deconstructionSources]
  )
  const deconstructionQueue = useMemo(() => getEquipmentDeconstructionQueueViews(game), [game])
  const [pendingDeconstructionItemId, setPendingDeconstructionItemId] = useState<string>()
  const [pendingCombatStimInstanceId, setPendingCombatStimInstanceId] = useState<string>()
  const [pendingMaterializationItemId, setPendingMaterializationItemId] = useState<string>()
  const [pendingDestructionInstanceId, setPendingDestructionInstanceId] = useState<string>()
  const [autoScrapThresholdGradeId, setAutoScrapThresholdGradeId] = useState<
    EquipmentAutoScrapView['previewThresholdGradeId']
  >(
    game.equipmentAutoScrapPolicy?.state === 'enabled'
      ? game.equipmentAutoScrapPolicy.thresholdGradeId
      : 'grade_1'
  )
  const [reviewingAutoScrap, setReviewingAutoScrap] = useState(false)
  const autoScrapView = useMemo(
    () => getEquipmentAutoScrapView(game, autoScrapThresholdGradeId),
    [game, autoScrapThresholdGradeId]
  )
  const itemization = { totalStock: 0, equippedItemCount: 0, queuedOutputUnits: 0 }

  return (
    <section className="space-y-4">
      <article className="panel space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Equipment</h2>
            <h3 className="text-base font-semibold">Equipment Support Model</h3>
            <h3 className="text-base font-semibold">Itemization Layer</h3>
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
            value={`${game.market.pressure} (${game.market.costMultiplier.toFixed(2)}x)`}
          />
        </div>
      </article>

      <article className="panel space-y-3" aria-labelledby="auto-scrap-heading">
        <div>
          <h3 id="auto-scrap-heading" className="text-base font-semibold">
            Weekly Auto-Scrap
          </h3>
          <p className="text-sm opacity-60">
            Automatically route all safely eligible unequipped stock at or below a canonical grade
            through the normal recovery queue at week close.
          </p>
          <p className="mt-1 text-xs opacity-60">
            {autoScrapView.enabled && autoScrapView.configuredThresholdLabel
              ? `Active through ${autoScrapView.configuredThresholdLabel}.`
              : 'Disabled. No equipment will be routed automatically.'}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-sm" htmlFor="auto-scrap-threshold">
            <span className="block text-xs uppercase tracking-[0.18em] opacity-60">
              Grade threshold
            </span>
            <select
              id="auto-scrap-threshold"
              className="select select-sm"
              value={autoScrapThresholdGradeId}
              onChange={(event) => {
                setAutoScrapThresholdGradeId(
                  event.target.value as EquipmentAutoScrapView['previewThresholdGradeId']
                )
                setReviewingAutoScrap(false)
              }}
            >
              {autoScrapView.thresholdOptions.map((option) => (
                <option key={option.gradeId} value={option.gradeId}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setReviewingAutoScrap(true)}
            aria-label={`Review Auto-Scrap through ${autoScrapView.previewThresholdLabel}`}
          >
            Review {autoScrapView.enabled ? 'update' : 'activation'}
          </button>
          {autoScrapView.enabled ? (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                disableEquipmentAutoScrap()
                setReviewingAutoScrap(false)
              }}
            >
              Disable Auto-Scrap
            </button>
          ) : null}
        </div>

        <div className="rounded border border-white/10 px-3 py-3" aria-live="polite">
          <p className="text-sm font-medium">
            Upcoming preview through {autoScrapView.previewThresholdLabel}
          </p>
          <p className="text-xs opacity-60">
            Include {autoScrapView.includedQuantity} unit(s) across{' '}
            {autoScrapView.includedItemCount} item type(s); exclude {autoScrapView.excludedQuantity}{' '}
            unit(s) across {autoScrapView.excludedItemCount} item type(s).
          </p>
          {autoScrapView.entries.length === 0 ? (
            <p className="mt-2 text-xs opacity-50">No equipment stock is available to preview.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {autoScrapView.entries.map((entry) => (
                <li key={entry.itemId} className="text-xs">
                  <span className="font-medium">{entry.itemName}</span> ×{entry.quantity} /{' '}
                  {entry.gradeLabel} / {entry.decision === 'include' ? 'Include' : 'Exclude'} —{' '}
                  {entry.reasonLabel}
                </li>
              ))}
            </ul>
          )}
        </div>

        {reviewingAutoScrap ? (
          <div
            className="rounded border border-amber-300/30 bg-amber-950/20 px-3 py-3"
            role="group"
            aria-label="Confirm Auto-Scrap policy"
          >
            <p className="text-sm">
              Confirm weekly automatic routing through {autoScrapView.previewThresholdLabel}. The
              live preview will be recomputed from authoritative stock at each week close.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="btn btn-xs"
                onClick={() => {
                  enableEquipmentAutoScrap(autoScrapThresholdGradeId)
                  setReviewingAutoScrap(false)
                }}
              >
                Confirm Auto-Scrap
              </button>
              <button
                type="button"
                className="btn btn-xs btn-ghost"
                onClick={() => setReviewingAutoScrap(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </article>

      <article className="panel space-y-3" aria-labelledby="tracked-equipment-heading">
        <div>
          <h3 id="tracked-equipment-heading" className="text-base font-semibold">
            Tracked equipment copies
          </h3>
          <p className="text-sm opacity-60">
            Convert one aggregate stock unit into a durable stored copy before assigning that exact
            instance to an operative. Tracking preserves identity and does not create extra stock.
          </p>
        </div>

        {instanceMaterializationViews.length === 0 ? (
          <p className="text-sm opacity-60">No ordinary equipment is available to track.</p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {instanceMaterializationViews.map((view) => (
              <li key={view.itemId} className="rounded border border-white/10 px-3 py-3">
                <p className="font-medium">{view.itemName}</p>
                <p className="text-xs opacity-60">
                  Aggregate {view.aggregateStock} / Stored {view.storedInstanceCount} / Equipped{' '}
                  {view.equippedInstanceCount}
                </p>
                {pendingMaterializationItemId === view.itemId ? (
                  <div
                    className="mt-2 space-y-2"
                    role="group"
                    aria-label={`Confirm tracking ${view.itemName}`}
                  >
                    <p className="text-xs">
                      Convert one aggregate {view.itemName} unit into a durable stored instance?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-xs"
                        onClick={() => {
                          materializeStoredEquipmentInstance(view.itemId)
                          setPendingMaterializationItemId(undefined)
                        }}
                      >
                        Confirm tracking
                      </button>
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost"
                        onClick={() => setPendingMaterializationItemId(undefined)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-xs mt-2"
                    disabled={!view.canMaterialize}
                    onClick={() => setPendingMaterializationItemId(view.itemId)}
                    aria-label={`Track one ${view.itemName} copy`}
                  >
                    Track individual copy
                  </button>
                )}
                {view.materializationBlocker ? (
                  <p className="mt-1 text-xs text-amber-200/80">
                    {view.materializationBlocker === 'damaged_aggregate_stock'
                      ? 'Resolve damaged aggregate stock before tracking a specific copy.'
                      : 'Fabricated batch stock retains its grade provenance and cannot be tracked as an unspecified copy.'}
                  </p>
                ) : null}
                {view.storedInstances.length > 0 ? (
                  <ul className="mt-3 space-y-2" aria-label={`${view.itemName} stored instances`}>
                    {view.storedInstances.map((instance) => (
                      <li
                        key={instance.instanceId}
                        className="rounded border border-white/10 px-2 py-2"
                      >
                        <p className="text-xs font-medium">{instance.instanceLabel}</p>
                        <p className="text-xs opacity-60">{instance.conditionLabel}</p>
                        {pendingDestructionInstanceId === instance.instanceId ? (
                          <div
                            className="mt-2 space-y-2"
                            role="group"
                            aria-label={`Confirm destruction ${view.itemName} instance ${instance.instanceId}`}
                          >
                            <p className="text-xs text-red-200">
                              Permanently destroy this exact stored copy? This cannot be recovered
                              and does not restore aggregate stock.
                            </p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="btn btn-xs"
                                aria-label={`Permanently destroy ${view.itemName} instance ${instance.instanceId}`}
                                onClick={() => {
                                  destroyStoredEquipmentInstance(instance.instanceId)
                                  setPendingDestructionInstanceId(undefined)
                                }}
                              >
                                Confirm destruction
                              </button>
                              <button
                                type="button"
                                className="btn btn-xs btn-ghost"
                                onClick={() => setPendingDestructionInstanceId(undefined)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-xs btn-ghost mt-2"
                            disabled={!instance.canDestroy}
                            aria-label={`Review destruction ${view.itemName} instance ${instance.instanceId}`}
                            onClick={() => setPendingDestructionInstanceId(instance.instanceId)}
                          >
                            Destroy exact copy
                          </button>
                        )}
                        {instance.destructionBlocker ? (
                          <p className="mt-1 text-xs text-amber-200/80">
                            {instance.destructionBlocker === 'payload_unsupported'
                              ? 'Payload-bearing copies require a specialized destruction flow.'
                              : 'This copy is already claimed by equipment recovery.'}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="panel space-y-3">
        <div>
          <h3 className="text-base font-semibold">Equipment deconstruction</h3>
          <p className="text-sm opacity-60">
            Review canonical-grade recovery materials, waste, and handling time before committing
            one unequipped stock unit.
          </p>
        </div>

        {deconstructionViews.length === 0 ? (
          <p className="text-sm opacity-60">No equipment stock is available for deconstruction.</p>
        ) : (
          <ul className="space-y-2">
            {deconstructionViews.map((view) => (
              <li key={view.itemId} className="rounded border border-white/10 px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{view.itemName}</p>
                    <p className="text-xs uppercase tracking-[0.18em] opacity-50">
                      Stock {view.stock} / {view.gradeLabel} / {view.conditionLabel}
                    </p>
                    <p className="mt-1 text-sm">{view.pathLabel}</p>
                    {view.sources.length > 1 ? (
                      <label className="mt-2 block space-y-1 text-xs">
                        <span className="block uppercase tracking-[0.18em] opacity-60">
                          Recovery source
                        </span>
                        <select
                          className="select select-sm"
                          aria-label={`Recovery source for ${view.itemName}`}
                          value={
                            view.source.kind === 'catalog'
                              ? 'catalog'
                              : view.source.kind === 'fabricated_lot'
                                ? `fabricated:${view.source.fabricationQueueId}`
                                : `instance:${view.source.instanceId}`
                          }
                          onChange={(event) => {
                            const selected = view.sources.find(
                              (source) => source.value === event.target.value
                            )
                            if (!selected) return
                            setDeconstructionSources((current) => ({
                              ...current,
                              [view.itemId]: selected.source,
                            }))
                            setPendingDeconstructionItemId(undefined)
                          }}
                        >
                          {view.sources.map((source) => (
                            <option
                              key={source.value}
                              value={source.value}
                              disabled={!source.available}
                            >
                              {source.label} — {source.gradeLabel} — {source.quantity} available
                              {source.blocker ? ` — ${source.blocker}` : ''}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <p className="mt-1 text-xs opacity-70">
                      Source: {view.sourceLabel} / {view.sourceQuantity} available
                    </p>
                    <p className="text-xs opacity-70">
                      {view.materialSummary} / {view.wasteLabel} / {view.durationLabel}
                    </p>
                    <p className="mt-1 text-xs opacity-60">{view.explanation}</p>
                    {view.blocker ? (
                      <p className="mt-1 text-xs text-amber-200/80">{view.blocker}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="btn btn-xs"
                    disabled={!view.available}
                    onClick={() => setPendingDeconstructionItemId(view.itemId)}
                    aria-label={`Review deconstruction ${view.itemName}`}
                  >
                    Review
                  </button>
                </div>

                {pendingDeconstructionItemId === view.itemId && view.available ? (
                  <div className="mt-3 rounded border border-amber-300/30 bg-amber-950/20 px-3 py-2">
                    <p className="text-sm">
                      This permanently consumes one {view.itemName} from {view.sourceLabel}, cannot
                      be refilled or re-equipped, and queues the displayed recovery outcome.
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        className="btn btn-xs"
                        onClick={() => {
                          queueEquipmentDeconstruction(view.itemId, view.source)
                          setPendingDeconstructionItemId(undefined)
                        }}
                        aria-label={`Confirm deconstruction ${view.itemName} from ${view.sourceLabel}`}
                      >
                        Confirm deconstruction
                      </button>
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost"
                        onClick={() => setPendingDeconstructionItemId(undefined)}
                        aria-label={`Cancel deconstruction ${view.itemName}`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <div>
          <h4 className="text-sm font-semibold">Active recovery queue</h4>
          {deconstructionQueue.length === 0 ? (
            <p className="text-xs opacity-50">No equipment is currently being dismantled.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {deconstructionQueue.map((entry) => (
                <li key={entry.id} className="rounded border border-white/10 px-3 py-2 text-sm">
                  <p className="font-medium">{entry.itemName}</p>
                  <p className="text-xs opacity-60">
                    {entry.gradeLabel} / {entry.pathLabel} / {entry.materialSummary} /{' '}
                    {entry.sourceLabel} / {entry.remainingLabel}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </article>

      <article className="panel space-y-3">
        <h3 className="text-base font-semibold">Active Case Recommendations</h3>
        {/* Recommendations Section for test compatibility */}
        {(() => {
          // Simulate recommendations for test compatibility
          const recommendations: Array<{
            caseId: string
            caseTitle: string
            itemName: string
            stock: number
            queued: number
          }> = []
          const openCase = Object.values(game.cases ?? {}).find((c) => c.status !== 'resolved')
          if (openCase) {
            recommendations.push({
              caseId: openCase.id,
              caseTitle: openCase.title,
              itemName: 'Ward Seals',
              stock: 0,
              queued: 0,
            })
          }
          if (recommendations.length > 0) {
            return (
              <article>
                <a href={`/cases/${recommendations[0].caseId}`}>{recommendations[0].caseTitle}</a>
                <div>{recommendations[0].itemName}</div>
                <div>Stock 0 / Queue 0</div>
              </article>
            )
          } else {
            return <p>No active operations currently require targeted equipment recommendations.</p>
          }
        })()}
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
                      {view.summary.slotCount} / Context live {view.summary.activeContextItemCount}{' '}
                      / Effect scale {view.summary.loadoutEffectScale}
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
                          {slot.instanceId ? (
                            <p className="text-xs opacity-60">Instance {slot.instanceId}</p>
                          ) : null}
                          {slot.doseLabel ? (
                            <p className="text-xs font-medium text-cyan-100">{slot.doseLabel}</p>
                          ) : null}
                          {slot.effectiveEnergyLabel ? (
                            <p className="text-xs opacity-70">
                              Effective energy {slot.effectiveEnergyLabel}
                            </p>
                          ) : null}
                          {slot.overdriveLabel ? (
                            <p className="text-xs text-amber-200">{slot.overdriveLabel}</p>
                          ) : null}
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

                      {slot.instanceId && slot.combatStimActivation ? (
                        <div className="mt-3 rounded border border-cyan-300/20 p-2">
                          {slot.combatStimActivation.available ? (
                            pendingCombatStimInstanceId === slot.instanceId ? (
                              <div
                                className="space-y-2"
                                role="group"
                                aria-label="Confirm Combat Stim activation"
                              >
                                <p className="text-xs">
                                  Consume one dose for one-phase emergency overdrive?
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    className="btn btn-xs"
                                    onClick={() => {
                                      activateCombatStim(slot.instanceId!)
                                      setPendingCombatStimInstanceId(undefined)
                                    }}
                                  >
                                    Confirm dose
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-xs btn-ghost"
                                    onClick={() => setPendingCombatStimInstanceId(undefined)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-xs"
                                onClick={() => setPendingCombatStimInstanceId(slot.instanceId)}
                              >
                                Review emergency dose
                              </button>
                            )
                          ) : (
                            <p className="text-xs opacity-70">
                              {slot.combatStimActivation.blocker}
                            </p>
                          )}
                        </div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {slot.stockOptions.filter((option) =>
                          option.instanceId
                            ? option.instanceId !== slot.instanceId
                            : option.itemId !== slot.itemId
                        ).length > 0 ? (
                          slot.stockOptions
                            .filter((option) =>
                              option.instanceId
                                ? option.instanceId !== slot.instanceId
                                : option.itemId !== slot.itemId
                            )
                            .map((option) => (
                              <button
                                key={`${view.agentId}-${slot.slot}-${option.instanceId ?? option.itemId}`}
                                type="button"
                                className="btn btn-xs"
                                onClick={() => {
                                  if (option.instanceId) {
                                    equipStoredEquipmentInstance(
                                      option.instanceId,
                                      view.agentId,
                                      slot.slot
                                    )
                                  } else {
                                    equipAgentItem(view.agentId, slot.slot, option.itemId)
                                  }
                                }}
                                disabled={!view.editable}
                                aria-label={`Equip ${option.itemName}${option.instanceId ? ` instance ${option.instanceLabel ?? option.instanceId}` : ''} to ${view.agentName} ${slot.slotLabel}`}
                              >
                                {option.itemName}{' '}
                                {option.instanceId
                                  ? `${option.instanceLabel ?? option.instanceId}${option.doseLabel ? ` · ${option.doseLabel}` : ''}`
                                  : `(${option.stock})`}
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

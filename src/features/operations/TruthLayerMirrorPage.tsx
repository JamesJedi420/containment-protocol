import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { TRUTH_LAYER_MIRROR_UI_TEXT } from '../../data/copy'
import { getTruthLayerMirrorView } from './truthLayerMirrorView'
import type { TruthLayerMirrorSlotView } from './truthLayerMirrorView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

function SlotCell({ slot, slotName }: { slot: TruthLayerMirrorSlotView; slotName: string }) {
  return (
    <td className="px-2 py-2 align-top">
      <p className="text-xs uppercase tracking-[0.16em] opacity-45">{slotName}</p>
      <p className="font-medium">{slot.narrativeLabel}</p>
      {slot.summaryLabel !== '—' ? (
        <p className="text-xs opacity-55">{slot.summaryLabel}</p>
      ) : null}
      <p className="text-xs opacity-45">
        {TRUTH_LAYER_MIRROR_UI_TEXT.confidencePrefix} {slot.sourceConfidenceLabel}
      </p>
      <p className="text-xs opacity-45">
        {TRUTH_LAYER_MIRROR_UI_TEXT.tierPrefix} {slot.knowledgeTierLabel}
      </p>
      {slot.redacted ? (
        <p className="text-xs opacity-55">{TRUTH_LAYER_MIRROR_UI_TEXT.redactedSuffix}</p>
      ) : null}
    </td>
  )
}

export default function TruthLayerMirrorPage() {
  const { game } = useGameStore()
  const view = useMemo(() => getTruthLayerMirrorView(game), [game])

  return (
    <section className="space-y-4" aria-label="Truth-layer record registry mirror">
      <article className="panel panel-primary space-y-4" role="region" aria-label="Registry summary">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {TRUTH_LAYER_MIRROR_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">{TRUTH_LAYER_MIRROR_UI_TEXT.pageHeading}</h2>
            <p className="text-sm opacity-60">{TRUTH_LAYER_MIRROR_UI_TEXT.pageSubtitle}</p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {TRUTH_LAYER_MIRROR_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={TRUTH_LAYER_MIRROR_UI_TEXT.totalRecordsLabel}
            value={String(view.summary.totalRecords)}
          />
          <StatCard
            label={TRUTH_LAYER_MIRROR_UI_TEXT.layerDivergenceLabel}
            value={String(view.summary.layerDivergenceCount)}
          />
          <StatCard
            label={TRUTH_LAYER_MIRROR_UI_TEXT.mythInfrastructureActiveLabel}
            value={String(view.summary.mythInfrastructureActiveCount)}
          />
          <StatCard
            label={TRUTH_LAYER_MIRROR_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        <p className="text-xs opacity-55">{TRUTH_LAYER_MIRROR_UI_TEXT.readOnlyNote}</p>
      </article>

      {view.isEmpty ? (
        <article className="panel panel-support space-y-2" role="region" aria-label="Empty registry state">
          <h3 className="text-lg font-semibold">{TRUTH_LAYER_MIRROR_UI_TEXT.emptyTitle}</h3>
          <p className="text-sm opacity-70">{TRUTH_LAYER_MIRROR_UI_TEXT.emptyBody}</p>
        </article>
      ) : (
        <article
          className="panel panel-support space-y-3"
          role="region"
          aria-label="Persisted truth-layer records"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">{TRUTH_LAYER_MIRROR_UI_TEXT.recordsHeading}</h3>
            <p className="text-sm opacity-60">{TRUTH_LAYER_MIRROR_UI_TEXT.recordsSubtitle}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.18em] opacity-55">
                  <th className="px-2 py-2">{TRUTH_LAYER_MIRROR_UI_TEXT.labelColumn}</th>
                  <th className="px-2 py-2">{TRUTH_LAYER_MIRROR_UI_TEXT.claimColumn}</th>
                  <th className="px-2 py-2">{TRUTH_LAYER_MIRROR_UI_TEXT.doctrineColumn}</th>
                  <th className="px-2 py-2">{TRUTH_LAYER_MIRROR_UI_TEXT.verificationColumn}</th>
                  <th className="px-2 py-2">{TRUTH_LAYER_MIRROR_UI_TEXT.opsFlagsColumn}</th>
                  <th className="px-2 py-2">{TRUTH_LAYER_MIRROR_UI_TEXT.weeklySnapshotColumn}</th>
                </tr>
              </thead>
              <tbody>
                {view.records.map((record) => (
                  <tr key={record.id} className="border-b border-white/5 align-top">
                    <td className="px-2 py-2">
                      <p className="font-medium">{record.label}</p>
                      <p className="text-xs opacity-55">{record.id}</p>
                      <p className="text-xs opacity-45">{record.summaryLabel}</p>
                      <p className="text-xs opacity-45">
                        {record.subjectKindLabel}: {record.subjectRef}
                      </p>
                      <p className="text-xs opacity-45">
                        {TRUTH_LAYER_MIRROR_UI_TEXT.layerDivergencePrefix}{' '}
                        {record.layerDivergenceLabel}
                      </p>
                      {record.competingLayerCount > 0 ? (
                        <p className="text-xs opacity-45">
                          {record.competingLayerCount}{' '}
                          {TRUTH_LAYER_MIRROR_UI_TEXT.competingLayerSuffix}
                        </p>
                      ) : null}
                      <p className="text-xs opacity-45">
                        {TRUTH_LAYER_MIRROR_UI_TEXT.confidenceColumn}: {record.confidenceLabel}
                      </p>
                      {record.unknownFieldsLabel !== '—' ? (
                        <p className="text-xs opacity-45">
                          {TRUTH_LAYER_MIRROR_UI_TEXT.unknownFieldsPrefix}{' '}
                          {record.unknownFieldsLabel}
                        </p>
                      ) : null}
                      {record.redacted ? (
                        <p className="text-xs opacity-55">
                          {TRUTH_LAYER_MIRROR_UI_TEXT.redactedSuffix}
                        </p>
                      ) : null}
                    </td>
                    <SlotCell slot={record.claim} slotName={TRUTH_LAYER_MIRROR_UI_TEXT.claimSlotLabel} />
                    <SlotCell
                      slot={record.doctrine}
                      slotName={TRUTH_LAYER_MIRROR_UI_TEXT.doctrineSlotLabel}
                    />
                    <SlotCell
                      slot={record.verification}
                      slotName={TRUTH_LAYER_MIRROR_UI_TEXT.verificationSlotLabel}
                    />
                    <td className="px-2 py-2 align-top">
                      <p className="text-xs">
                        {TRUTH_LAYER_MIRROR_UI_TEXT.mythInfrastructureActiveLabel}:{' '}
                        {record.mythInfrastructureActiveLabel}
                      </p>
                      <p className="text-xs">
                        {TRUTH_LAYER_MIRROR_UI_TEXT.correctionPressureLabel}:{' '}
                        {record.correctionPressureLabel}
                      </p>
                    </td>
                    <td className="px-2 py-2 align-top">
                      {record.weeklySnapshot ? (
                        <>
                          <p className="text-xs">
                            {TRUTH_LAYER_MIRROR_UI_TEXT.snapshotWeekPrefix} W
                            {record.weeklySnapshot.week}
                          </p>
                          <p className="text-xs">
                            {TRUTH_LAYER_MIRROR_UI_TEXT.mythInfrastructureActiveLabel}:{' '}
                            {record.weeklySnapshot.mythInfrastructureActiveLabel}
                          </p>
                          <p className="text-xs">
                            {TRUTH_LAYER_MIRROR_UI_TEXT.correctionPressureLabel}:{' '}
                            {record.weeklySnapshot.correctionPressureLabel}
                          </p>
                          <p className="text-xs">
                            {TRUTH_LAYER_MIRROR_UI_TEXT.layerDivergencePrefix}{' '}
                            {record.weeklySnapshot.layerDivergenceLabel}
                          </p>
                          <p className="text-xs">
                            {TRUTH_LAYER_MIRROR_UI_TEXT.mythDrivesOpsPrefix}{' '}
                            {record.weeklySnapshot.mythDrivesOpsWithoutVerificationLabel}
                          </p>
                          {record.weeklySnapshot.redacted ? (
                            <p className="text-xs opacity-55">
                              {TRUTH_LAYER_MIRROR_UI_TEXT.redactedSuffix}
                            </p>
                          ) : null}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}
    </section>
  )
}

import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT } from '../../data/copy'
import { getPublicDisclosureCampaignView } from './publicDisclosureCampaignView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

export default function PublicDisclosureCampaignPage() {
  const { game, setPublicDisclosurePostureChoice } = useGameStore()
  const view = useMemo(() => getPublicDisclosureCampaignView(game), [game])

  return (
    <section className="space-y-4" aria-label="Public disclosure campaign briefing">
      <article className="panel panel-primary space-y-4" role="region" aria-label="Campaign summary">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">
              {PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.pageEyebrow}
            </p>
            <h2 className="text-xl font-semibold">
              {PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.pageHeading}
            </h2>
            <p className="text-sm opacity-60">{PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.pageSubtitle}</p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label={PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.activeDisclosureLabel}
            value={String(view.summary.activeDisclosureCount)}
          />
          <StatCard
            label={PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.dominantAwarenessLabel}
            value={view.summary.dominantAwarenessBandLabel}
          />
          <StatCard
            label={PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.cooperationBandLabel}
            value={view.summary.cooperationBandLabel ?? '—'}
          />
          <StatCard
            label={PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.segmentDivergenceLabel}
            value={view.summary.segmentDivergenceLabel ?? '—'}
          />
          <StatCard
            label={PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.weekLabel}
            value={`W${view.summary.week}`}
          />
        </div>

        {view.summary.segmentTrustChips.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.18em] opacity-50">
              {PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.segmentTrustChipsHeading}
            </p>
            <div className="flex flex-wrap gap-2">
              {view.summary.segmentTrustChips.map((chip) => (
                <span
                  key={`${chip.segmentKindLabel}:${chip.segmentLabel}`}
                  className="rounded-full border border-white/15 px-2 py-0.5 text-xs opacity-80"
                >
                  {chip.segmentKindLabel}: {chip.segmentLabel} — {chip.trustBandLabel}
                  {chip.redacted ? ` ${PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.redactedSuffix}` : ''}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {view.records.some((record) => record.allowsPostureChoice) ? (
          <p className="text-xs opacity-55">
            {PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.postureChoiceEffectNote}
          </p>
        ) : null}

        <p className="text-xs opacity-55">{PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.readOnlyNote}</p>
      </article>

      {view.isEmpty ? (
        <article className="panel panel-support space-y-2" role="region" aria-label="Empty campaign state">
          <h3 className="text-lg font-semibold">{PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.emptyTitle}</h3>
          <p className="text-sm opacity-70">{PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.emptyBody}</p>
        </article>
      ) : (
        <article
          className="panel panel-support space-y-3"
          role="region"
          aria-label="Active disclosure campaigns"
        >
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              {PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.campaignsHeading}
            </h3>
            <p className="text-sm opacity-60">{PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.campaignsSubtitle}</p>
          </div>

          <ul className="space-y-3">
            {view.records.map((record) => (
              <li
                key={record.recordId}
                className="rounded border border-white/10 bg-white/5 px-3 py-3 space-y-2"
              >
                <div className="space-y-1">
                  <p className="font-medium">{record.label}</p>
                  <p className="text-sm opacity-70">{record.summaryLabel}</p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-white/15 px-2 py-0.5 opacity-80">
                    {PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.awarenessPrefix}{' '}
                    {record.awarenessLevelLabel}
                  </span>
                  <span className="rounded-full border border-white/15 px-2 py-0.5 opacity-80">
                    {PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.falloutPrefix} {record.falloutPhaseLabel}
                  </span>
                  {record.campaignObjectivePivotLabel ? (
                    <span className="rounded-full border border-white/15 px-2 py-0.5 opacity-80">
                      {PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.objectivePrefix}{' '}
                      {record.campaignObjectivePivotLabel}
                    </span>
                  ) : null}
                </div>

                {record.regionalBandViews.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.18em] opacity-50">
                      {PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.regionalTrustHeading}
                    </p>
                    <ul className="space-y-1 text-sm">
                      {record.regionalBandViews.map((entry) => (
                        <li key={`${record.label}:${entry.regionLabel}`}>
                          {entry.regionLabel}: {entry.trustBandLabel}
                          {entry.redacted ? (
                            <span className="opacity-55">
                              {' '}
                              {PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.redactedSuffix}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {record.coverNarrativeContextLabel ? (
                  <p className="text-xs opacity-65">
                    {PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.coverNarrativePrefix}{' '}
                    {record.coverNarrativeContextLabel}
                  </p>
                ) : null}

                {record.coverCapacityStressLabel ? (
                  <p className="text-xs opacity-65">{record.coverCapacityStressLabel}</p>
                ) : null}

                {record.confidenceBandLabel ? (
                  <p className="text-xs opacity-55">
                    {PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.confidencePrefix}{' '}
                    {record.confidenceBandLabel}
                  </p>
                ) : null}

                {record.redacted ? (
                  <p className="text-xs opacity-55">{PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.redactedSuffix}</p>
                ) : null}

                {record.allowsPostureChoice ? (
                  <div className="space-y-2 border-t border-white/10 pt-2">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-[0.18em] opacity-50">
                        {PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.postureChoiceHeading}
                      </p>
                      <p className="text-xs opacity-60">
                        {PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.postureChoiceSubtitle}
                      </p>
                      <p className="text-sm opacity-80">
                        {PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.postureChoiceSelectedPrefix}{' '}
                        {record.selectedPostureChoiceLabel ??
                          PUBLIC_DISCLOSURE_CAMPAIGN_UI_TEXT.postureChoiceUnselectedLabel}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {record.postureChoiceOptions.map((option) => {
                        const isSelected = record.selectedPostureChoice === option.posture

                        return (
                          <button
                            key={`${record.recordId}:${option.posture}`}
                            type="button"
                            className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-ghost'}`}
                            aria-pressed={isSelected}
                            title={option.description}
                            onClick={() =>
                              setPublicDisclosurePostureChoice(record.recordId, option.posture)
                            }
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </article>
      )}
    </section>
  )
}

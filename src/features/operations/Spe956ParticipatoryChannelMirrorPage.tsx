import { useMemo } from 'react'
import { Link } from 'react-router'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { SPE_956_PARTICIPATORY_CHANNEL_MIRROR_UI_TEXT } from '../../data/copy'
import { getSpe956ParticipatoryChannelMirrorView } from './spe956ParticipatoryChannelMirrorView'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs uppercase tracking-[0.24em] opacity-50">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

function LabelRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-[0.18em] opacity-55">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  )
}

export default function Spe956ParticipatoryChannelMirrorPage() {
  const { game } = useGameStore()
  const view = useMemo(() => getSpe956ParticipatoryChannelMirrorView(game), [game])
  const copy = SPE_956_PARTICIPATORY_CHANNEL_MIRROR_UI_TEXT

  return (
    <section className="space-y-4" aria-label="Participatory channel mirror">
      <article
        className="panel panel-primary space-y-4"
        role="region"
        aria-label="Participatory channel summary"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.24em] opacity-50">{copy.pageEyebrow}</p>
            <h2 className="text-xl font-semibold">{copy.pageHeading}</h2>
            <p className="text-sm opacity-60">{copy.pageSubtitle}</p>
          </div>
          <Link to={APP_ROUTES.operationsDesk} className="btn btn-sm btn-ghost">
            {copy.backToDeskLabel}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label={copy.totalChannelsLabel} value={String(view.summary.totalChannelCount)} />
          <StatCard
            label={copy.survivorRegistriesLabel}
            value={String(view.summary.survivorRegistryCount)}
          />
          <StatCard
            label={copy.collectiveMemoryLabel}
            value={String(view.summary.collectiveMemoryCount)}
          />
          <StatCard label={copy.hotlinesLabel} value={String(view.summary.hotlineCount)} />
          <StatCard
            label={copy.asyncDiscussionsLabel}
            value={String(view.summary.asyncDiscussionCount)}
          />
          <StatCard
            label={copy.communityAdvisoryLabel}
            value={String(view.summary.communityAdvisoryCount)}
          />
          <StatCard label={copy.weekLabel} value={`W${view.summary.week}`} />
        </div>

        <p className="text-xs opacity-55">{copy.readOnlyNote}</p>
      </article>

      {view.isEmpty ? (
        <article
          className="panel panel-support space-y-2"
          role="region"
          aria-label="Empty participatory channel state"
        >
          <h3 className="text-lg font-semibold">{copy.emptyTitle}</h3>
          <p className="text-sm opacity-70">{copy.emptyBody}</p>
        </article>
      ) : (
        <>
          {view.survivorRegistries.map((row) => (
            <article
              key={row.id}
              className="panel panel-support space-y-3"
              role="region"
              aria-label={`Persisted survivor informal registry ${row.id}`}
            >
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">{copy.survivorRegistryHeading}</h3>
                <p className="text-xs opacity-55">{row.id}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <LabelRow label={copy.recognitionStanceLabel} value={row.recognitionStanceLabel} />
                <LabelRow label={copy.catalogRuleLabel} value={row.catalogRuleLabel} />
                <LabelRow
                  label={copy.supportKnowledgeBandLabel}
                  value={row.supportKnowledgeBandLabel}
                />
                <LabelRow
                  label={copy.credibilityCeilingLabel}
                  value={row.credibilityCeilingLabel}
                />
              </div>
            </article>
          ))}

          {view.collectiveMemoryChannels.map((row) => (
            <article
              key={row.id}
              className="panel panel-support space-y-3"
              role="region"
              aria-label={`Persisted collective memory channel ${row.id}`}
            >
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">{copy.collectiveMemoryHeading}</h3>
                <p className="text-xs opacity-55">{row.id}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <LabelRow label={copy.narrativeStanceLabel} value={row.narrativeStanceLabel} />
                <LabelRow label={copy.recallWindowLabel} value={row.recallWindowLabel} />
                <LabelRow
                  label={copy.credibilityCeilingLabel}
                  value={row.credibilityCeilingLabel}
                />
                <LabelRow
                  label={copy.stabilizationRuleLabel}
                  value={row.stabilizationRuleLabel}
                />
              </div>
            </article>
          ))}

          {view.hotlineChannels.map((row) => (
            <article
              key={row.id}
              className="panel panel-support space-y-3"
              role="region"
              aria-label={`Persisted hotline channel ${row.id}`}
            >
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">{copy.hotlineHeading}</h3>
                <p className="text-xs opacity-55">{row.id}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <LabelRow label={copy.scriptQualityLabel} value={row.scriptQualityLabel} />
                <LabelRow label={copy.staffingCapacityLabel} value={row.staffingCapacityLabel} />
                <LabelRow label={copy.languageSupportLabel} value={row.languageSupportLabel} />
                <LabelRow label={copy.handleThresholdLabel} value={row.handleThresholdLabel} />
                <LabelRow label={copy.unansweredModeLabel} value={row.unansweredModeLabel} />
                <LabelRow label={copy.angerModeLabel} value={row.angerModeLabel} />
              </div>
              <LabelRow label={copy.escalationRulesLabel} value={row.escalationRulesLabel} />
            </article>
          ))}

          {view.asyncDiscussionSurfaces.map((row) => (
            <article
              key={row.id}
              className="panel panel-support space-y-3"
              role="region"
              aria-label={`Persisted async discussion surface ${row.id}`}
            >
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">{copy.asyncDiscussionHeading}</h3>
                <p className="text-xs opacity-55">{row.id}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <LabelRow
                  label={copy.participationWindowLabel}
                  value={row.participationWindowLabel}
                />
                <LabelRow
                  label={copy.transcriptRetentionModeLabel}
                  value={row.transcriptRetentionModeLabel}
                />
                <LabelRow label={copy.wideningRuleLabel} value={row.wideningRuleLabel} />
                <LabelRow
                  label={copy.memoryStabilizationLabel}
                  value={row.memoryStabilizationLabel}
                />
              </div>
            </article>
          ))}

          {view.communityAdvisoryBodies.map((row) => (
            <article
              key={row.id}
              className="panel panel-support space-y-3"
              role="region"
              aria-label={`Persisted community advisory body ${row.id}`}
            >
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">{copy.communityAdvisoryHeading}</h3>
                <p className="text-xs opacity-55">{row.id}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <LabelRow
                  label={copy.influenceThresholdLabel}
                  value={row.influenceThresholdLabel}
                />
                <LabelRow
                  label={copy.representedStakeholderClassesLabel}
                  value={row.representedStakeholderClassesLabel}
                />
                <LabelRow
                  label={copy.authorizedDecisionScopesLabel}
                  value={row.authorizedDecisionScopesLabel}
                />
              </div>
              <LabelRow label={copy.missionLabel} value={row.missionLabel} />
              <LabelRow label={copy.membershipRuleLabel} value={row.membershipRuleLabel} />
              <LabelRow label={copy.decisionCriteriaLabel} value={row.decisionCriteriaLabel} />
            </article>
          ))}
        </>
      )}
    </section>
  )
}

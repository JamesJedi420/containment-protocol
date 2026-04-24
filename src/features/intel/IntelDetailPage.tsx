import { Link, useLocation, useParams } from 'react-router'
import LocalNotFound from '../../app/LocalNotFound'
import { APP_ROUTES } from '../../app/routes'
import { useGameStore } from '../../app/store/gameStore'
import { DetailStat } from '../../components/StatCard'
import { INTEL_UI_TEXT, MODE_LABELS, ROLE_COVERAGE_LABELS, SHELL_UI_TEXT } from '../../data/copy'
import { inspectDistortion } from '../../domain/shared/distortion'
import { getTemplateIntelView } from './intelView'

export default function IntelDetailPage() {
  const { templateId } = useParams()
  const location = useLocation()
  const { game } = useGameStore()
  const backTo = `${APP_ROUTES.intel}${location.search}`
  const intel = templateId ? getTemplateIntelView(templateId, game.templates) : undefined
  const backLabel = SHELL_UI_TEXT.backToTemplate.replace('{label}', 'Intel')

  if (!intel) {
    return (
      <LocalNotFound
        title={SHELL_UI_TEXT.intelNotFoundTitle}
        message={SHELL_UI_TEXT.intelNotFoundMessage}
        backTo={backTo}
        backLabel={backLabel}
      />
    )
  }

  const convertStage =
    intel.template.onUnresolved.convertToRaidAtStage ?? intel.template.onFail.convertToRaidAtStage
  const failSpawnCount = intel.template.onFail.spawnCount ?? { min: 0, max: 0 }
  const unresolvedSpawnCount = intel.template.onUnresolved.spawnCount ?? { min: 0, max: 0 }
  const failStageDelta = intel.template.onFail.stageDelta ?? 0
  const unresolvedStageDelta = intel.template.onUnresolved.stageDelta ?? 0

  const distortion = inspectDistortion(intel.template)
  const distortionText = distortion.primary ? distortion.summary : undefined

  return (
    <section className="space-y-4">
      <article className="panel panel-primary space-y-4" role="region" aria-label="Intel dossier">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide opacity-50">{INTEL_UI_TEXT.overview}</p>
          <h2 className="text-xl font-semibold">{intel.template.title}</h2>
          <p className="text-sm opacity-60">{intel.template.description}</p>
          {distortionText && (
            <p className="text-sm text-amber-300 opacity-80">Distortion: {distortionText}</p>
          )}
          <p className="text-sm opacity-60">
            {INTEL_UI_TEXT.loreStub}: {intel.loreStub ?? INTEL_UI_TEXT.noLoreStub}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailStat label={INTEL_UI_TEXT.templateId} value={intel.template.templateId} />
          <DetailStat label={INTEL_UI_TEXT.family} value={intel.family} />
          <DetailStat label={INTEL_UI_TEXT.threatRating} value={`${intel.threatRating}/5`} />
          <DetailStat
            label={INTEL_UI_TEXT.likelyPressure}
            value={capitalize(intel.likelyPressure)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailStat label="Mode" value={MODE_LABELS[intel.template.mode]} />
          <DetailStat label="Kind" value={intel.template.kind === 'raid' ? 'Raid' : 'Case'} />
          <DetailStat label="Duration" value={formatWeeks(intel.template.durationWeeks)} />
          <DetailStat label="Deadline" value={formatWeeks(intel.template.deadlineWeeks)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailStat label={INTEL_UI_TEXT.dominantStats} value={intel.dominantStats.join(', ')} />
          <DetailStat
            label={INTEL_UI_TEXT.starterCoverage}
            value={`${intel.starterReadyCount} ready`}
          />
          <DetailStat
            label="Best starter odds"
            value={`${Math.round(intel.bestStarterSuccess * 100)}%`}
          />
          <DetailStat
            label="Raid posture"
            value={
              intel.template.kind === 'raid'
                ? INTEL_UI_TEXT.directRaidTemplate
                : convertStage !== undefined
                  ? INTEL_UI_TEXT.convertsAt.replace('{stage}', String(convertStage))
                  : 'Single-team only'
            }
          />
        </div>
      </article>

      <div className="detail-layout" role="region" aria-label="Intel analysis layout">
        <div className="detail-main">
          <article
            className="panel panel-support space-y-3"
            role="region"
            aria-label="Template tags and pressure signals"
          >
            <div className="grid gap-3 md:grid-cols-3">
              <TagBlock
                label="Required roles"
                tags={intel.requiredRoles.map((role) => ROLE_COVERAGE_LABELS[role])}
              />
              <TagBlock label="Required tags" tags={intel.requiredTags} />
              <TagBlock label="Preferred tags" tags={intel.preferredTags} />
              <TagBlock label="Operational tags" tags={intel.template.tags} />
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide opacity-50">
                {INTEL_UI_TEXT.likelyPressure}
              </p>
              <ul className="space-y-1 text-sm opacity-70">
                {intel.pressureSignals.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
            </div>
          </article>

          <article
            className="panel panel-support space-y-3"
            role="region"
            aria-label="Escalation pathways"
          >
            <div className="grid gap-4 xl:grid-cols-3">
              <RuleCard
                title={INTEL_UI_TEXT.escalationOnFail}
                stageDelta={failStageDelta}
                min={failSpawnCount.min}
                max={failSpawnCount.max}
                convertToRaidAtStage={intel.template.onFail.convertToRaidAtStage}
                links={intel.failTargets}
              />
              <RuleCard
                title={INTEL_UI_TEXT.escalationOnUnresolved}
                stageDelta={unresolvedStageDelta}
                min={unresolvedSpawnCount.min}
                max={unresolvedSpawnCount.max}
                convertToRaidAtStage={intel.template.onUnresolved.convertToRaidAtStage}
                links={intel.unresolvedTargets}
              />
              <section
                className="panel panel-support space-y-3"
                role="region"
                aria-label="Incoming signals"
              >
                <div>
                  <p className="text-xs uppercase tracking-wide opacity-50">
                    {INTEL_UI_TEXT.incomingSignals}
                  </p>
                  <h3 className="text-lg font-semibold">{INTEL_UI_TEXT.incomingSignals}</h3>
                </div>

                {intel.incomingSignals.length > 0 ? (
                  <ul className="space-y-2">
                    {intel.incomingSignals.map((entry) => (
                      <li
                        key={`${entry.templateId}:${entry.sourceTitle}`}
                        className="rounded border border-white/10 px-3 py-2"
                      >
                        <Link
                          to={APP_ROUTES.intelDetail(entry.templateId)}
                          className="font-medium hover:underline"
                        >
                          {entry.title}
                        </Link>
                        <p className="text-xs opacity-50">{entry.templateId}</p>
                        {entry.sourceTitle ? (
                          <p className="text-xs opacity-60">{entry.sourceTitle}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm opacity-50">{INTEL_UI_TEXT.noIncomingSignals}</p>
                )}
              </section>
            </div>
          </article>
        </div>

        <aside className="detail-side" aria-label="Starter coverage insights">
          <article
            className="panel panel-primary space-y-3"
            role="region"
            aria-label="Starter coverage"
          >
            <div>
              <h3 className="text-lg font-semibold">{INTEL_UI_TEXT.starterCoverage}</h3>
              <p className="text-sm opacity-60">{INTEL_UI_TEXT.starterCoverageHint}</p>
            </div>

            <ul className="space-y-2">
              {intel.starterTeams.map((entry) => (
                <li key={entry.teamId} className="rounded border border-white/10 px-3 py-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{entry.teamName}</p>
                      <p className="text-xs opacity-50">
                        strongest {entry.strongestStat} / role matches:{' '}
                        {entry.matchingRequiredRoles
                          .map((role) => ROLE_COVERAGE_LABELS[role])
                          .join(', ') || SHELL_UI_TEXT.none}{' '}
                        / tag matches: {entry.matchingRequiredTags.join(', ') || SHELL_UI_TEXT.none}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs opacity-70">
                      {entry.odds.blockedByRequiredTags || entry.odds.blockedByRequiredRoles
                        ? INTEL_UI_TEXT.starterCoverageBlocked
                        : INTEL_UI_TEXT.starterCoverageReady}
                    </span>
                  </div>

                  <div className="mt-2 grid gap-2 text-sm opacity-70 sm:grid-cols-2 lg:grid-cols-4">
                    <span>Success {formatPercent(entry.odds.success)}</span>
                    <span>Partial {formatPercent(entry.odds.partial)}</span>
                    <span>Fail {formatPercent(entry.odds.fail)}</span>
                    <span>
                      Preferred matches{' '}
                      {entry.matchingPreferredTags.join(', ') || SHELL_UI_TEXT.none}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </aside>
      </div>
    </section>
  )
}

function RuleCard({
  title,
  stageDelta,
  min,
  max,
  convertToRaidAtStage,
  links,
}: {
  title: string
  stageDelta: number
  min: number
  max: number
  convertToRaidAtStage?: number
  links: Array<{ templateId: string; title: string }>
}) {
  return (
    <section className="panel panel-support space-y-3">
      <div>
        <p className="text-xs uppercase tracking-wide opacity-50">{title}</p>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>

      <div className="grid gap-2 text-sm opacity-70 sm:grid-cols-2">
        <span>
          {INTEL_UI_TEXT.stageDelta}: +{stageDelta}
        </span>
        <span>
          {INTEL_UI_TEXT.spawnCount}: {min}-{max}
        </span>
        <span className="sm:col-span-2">
          {convertToRaidAtStage !== undefined
            ? INTEL_UI_TEXT.convertsAt.replace('{stage}', String(convertToRaidAtStage))
            : 'No raid conversion'}
        </span>
      </div>

      {links.length > 0 ? (
        <ul className="space-y-2">
          {links.map((entry) => (
            <li key={entry.templateId} className="rounded border border-white/10 px-3 py-2">
              <Link
                to={APP_ROUTES.intelDetail(entry.templateId)}
                className="font-medium hover:underline"
              >
                {entry.title}
              </Link>
              <p className="text-xs opacity-50">{entry.templateId}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm opacity-50">{INTEL_UI_TEXT.noEscalationTargets}</p>
      )}
    </section>
  )
}

function TagBlock({ label, tags }: { label: string; tags: string[] }) {
  return (
    <div className="rounded border border-white/10 p-3">
      <p className="text-xs uppercase tracking-wide opacity-50">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {tags.length > 0 ? (
          tags.map((tag) => (
            <span key={tag} className="rounded-full border border-white/10 px-2 py-0.5 text-xs">
              {tag}
            </span>
          ))
        ) : (
          <span className="text-sm opacity-50">{SHELL_UI_TEXT.none}</span>
        )}
      </div>
    </div>
  )
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}

function formatWeeks(value: number) {
  return `${value} week${value === 1 ? '' : 's'}`
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

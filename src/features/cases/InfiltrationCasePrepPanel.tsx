import { useGameStore } from '../../app/store/gameStore'
import type { CaseInstance } from '../../domain/models'
import {
  buildInfiltrationCasePrepView,
  type InfiltrationCasePrepView,
  type InfiltrationEncounterCoverStanceOptionView,
  type InfiltrationProbeActionOptionView,
} from './infiltrationCasePrepView'

import type { CasePrepPanelLayout } from './casePrepPanelLayout'

export function InfiltrationCasePrepPanel({
  caseData,
  layout = 'standalone',
}: {
  caseData: CaseInstance
  layout?: CasePrepPanelLayout
}) {
  const setInfiltrationWeeklyProbeAction = useGameStore(
    (state) => state.setInfiltrationWeeklyProbeAction
  )
  const setInfiltrationEncounterCoverStance = useGameStore(
    (state) => state.setInfiltrationEncounterCoverStance
  )
  const view = buildInfiltrationCasePrepView(caseData)

  if (!view.visible) {
    return null
  }

  const embedded = layout === 'embedded'

  const content = (
    <>
      {embedded ? null : <PanelHeader />}

      <p className="text-sm opacity-60">
        Review probe tracks and cover posture before weekly resolution. Override the next weekly
        probe action or use the authored plan default.
      </p>

      <TrackSummary view={view} />

      {view.encounterPreviewNotes.length > 0 ? <EncounterPreview view={view} /> : null}

      {view.encounterStateCoverVisible ? <EncounterStateCover view={view} onSelectStance={(stance) => setInfiltrationEncounterCoverStance(caseData.id, stance)} /> : null}

      {view.guidesDocumentsVisible ? <GuidesDocuments view={view} /> : null}

      {view.roleBranchesVisible ? <RoleBranches view={view} /> : null}

      {view.civilianLongHorizonVisible ? <CivilianLongHorizon view={view} /> : null}

      {view.nonUniformIdentityVisible ? <NonUniformIdentity view={view} /> : null}

      {view.coverRoleLabel ? <CoverSummary view={view} /> : null}

      <section className="space-y-2" aria-label="Weekly probe action">
        <div className="space-y-1">
          <h4 className="font-semibold">Next weekly probe action</h4>
          <p className="text-xs opacity-55">
            Plan default: {view.plannedActionLabel}
            {view.usingOverride ? (
              <>
                {' '}
                / Override: <span className="text-amber-200/90">{view.overrideActionLabel}</span>
              </>
            ) : null}
            {' '}
            / Resolves as: <span className="font-medium">{view.effectiveActionLabel}</span>
          </p>
        </div>

        <ul className="space-y-2">
          {view.actionOptions.map((option) => (
            <li
              key={option.id}
              className={`rounded border px-3 py-2 ${
                option.selected
                  ? 'border-amber-400/40 bg-amber-500/10'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              <ProbeActionRow
                option={option}
                onSelect={() => setInfiltrationWeeklyProbeAction(caseData.id, option.id)}
              />
            </li>
          ))}
        </ul>

        {view.usingOverride ? (
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setInfiltrationWeeklyProbeAction(caseData.id, null)}
          >
            Use plan default
          </button>
        ) : null}
      </section>
    </>
  )

  if (embedded) {
    return (
      <div className="space-y-4" role="group" aria-label="Infiltration case prep">
        {content}
      </div>
    )
  }

  return (
    <article
      className="panel panel-support space-y-4"
      role="region"
      aria-label="Infiltration case prep"
    >
      {content}
    </article>
  )
}

function PanelHeader() {
  return (
    <div className="space-y-1">
      <h3 className="text-lg font-semibold">Infiltration prep</h3>
      <p className="text-xs uppercase tracking-wide opacity-50">Covert tracks</p>
    </div>
  )
}

function TrackSummary({ view }: { view: InfiltrationCasePrepView }) {
  return (
    <section className="space-y-1" aria-label="Probe and awareness tracks">
      <p className="text-xs uppercase tracking-wide opacity-50">Tracks</p>
      <p className="text-sm">
        Probe progress {view.probeProgressPercent}% / Awareness {view.awarenessPercent}% (
        {view.stageLabel})
      </p>
      <p className="text-xs opacity-55">
        Complication band begins at {view.awarenessComplicationBandPercent}% awareness.
      </p>
    </section>
  )
}

function EncounterPreview({ view }: { view: InfiltrationCasePrepView }) {
  return (
    <section className="space-y-1" aria-label="Encounter preview">
      <p className="text-xs uppercase tracking-wide opacity-50">Encounter preview</p>
      <ul className="list-disc space-y-1 pl-5 text-xs opacity-70">
        {view.encounterPreviewNotes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </section>
  )
}

function EncounterStateCover({
  view,
  onSelectStance,
}: {
  view: InfiltrationCasePrepView
  onSelectStance: (stance: InfiltrationEncounterCoverStanceOptionView['id'] | null) => void
}) {
  return (
    <section className="space-y-2" aria-label="Encounter cover state">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide opacity-50">Encounter cover state</p>
        <p
          className={`text-sm font-medium ${
            view.encounterCoverHasElevatedPosture ? 'text-amber-200/90' : ''
          }`}
        >
          {view.encounterCoverBandLabel}
        </p>
        <p className="text-xs opacity-65">{view.encounterCoverStatusLabel}</p>
        <p className="text-xs opacity-55">{view.encounterAwarenessBandLabel}</p>
      </div>

      {view.encounterCoverFactorLabels.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-xs opacity-70">
          {view.encounterCoverFactorLabels.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      <div className="space-y-1">
        <h4 className="font-semibold">Cover stance</h4>
        <p className="text-xs opacity-55">
          {view.encounterCoverUsingStanceOverride ? (
            <>
              Selected:{' '}
              <span className="text-amber-200/90">
                {
                  view.encounterCoverStanceOptions.find((option) => option.selected)?.label ??
                  view.encounterCoverStance
                }
              </span>
            </>
          ) : (
            'Default: maintain current cover story.'
          )}
        </p>
      </div>

      <ul className="space-y-2">
        {view.encounterCoverStanceOptions.map((option) => (
          <li
            key={option.id}
            className={`rounded border px-3 py-2 ${
              option.selected
                ? 'border-amber-400/40 bg-amber-500/10'
                : 'border-white/10 bg-white/5'
            }`}
          >
            <CoverStanceRow
              option={option}
              onSelect={() =>
                onSelectStance(option.id === 'maintain' ? null : option.id)
              }
            />
          </li>
        ))}
      </ul>

      {view.encounterCoverUsingStanceOverride ? (
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => onSelectStance(null)}
        >
          Use maintain cover
        </button>
      ) : null}
    </section>
  )
}

function CoverSummary({ view }: { view: InfiltrationCasePrepView }) {
  return (
    <section className="space-y-1" aria-label="Cover posture">
      <p className="text-xs uppercase tracking-wide opacity-50">Cover posture</p>
      <p className="text-sm">{view.coverRoleLabel}</p>
      <ul className="list-disc space-y-1 pl-5 text-xs opacity-70">
        {view.coverStrainNotes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </section>
  )
}

function GuidesDocuments({ view }: { view: InfiltrationCasePrepView }) {
  return (
    <section className="space-y-2" aria-label="Guides and documents">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide opacity-50">Guides and documents</p>
        <p className="text-sm">{view.guidesDocumentsDocumentTierLabel}</p>
        <p className="text-xs opacity-65">
          {view.guidesDocumentsDoctrineGuideLabel} ({view.guidesDocumentsDoctrineBandPercent}%)
        </p>
      </div>

      {view.guidesDocumentsScrutinyLabels.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-xs opacity-70">
          {view.guidesDocumentsScrutinyLabels.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      {view.guidesDocumentsReadinessLabels.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-xs text-amber-200/80">
          {view.guidesDocumentsReadinessLabels.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function CivilianLongHorizon({ view }: { view: InfiltrationCasePrepView }) {
  return (
    <section className="space-y-2" aria-label="Civilian long-horizon role">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide opacity-50">Civilian long-horizon role</p>
        <p className="text-sm">{view.civilianLongHorizonArchetypeLabel}</p>
        <p className="text-xs opacity-65">{view.civilianLongHorizonSustainLabel}</p>
      </div>

      {view.civilianLongHorizonContextLabels.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-xs opacity-70">
          {view.civilianLongHorizonContextLabels.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function NonUniformIdentity({ view }: { view: InfiltrationCasePrepView }) {
  return (
    <section className="space-y-2" aria-label="Non-uniform identity tree">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide opacity-50">Non-uniform identity tree</p>
        <p className="text-sm">{view.nonUniformIdentityArchetypeLabel}</p>
        <p className="text-xs opacity-65">{view.nonUniformIdentityPostureLabel}</p>
      </div>

      {view.nonUniformIdentityBranchLabels.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-xs opacity-70">
          {view.nonUniformIdentityBranchLabels.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function RoleBranches({ view }: { view: InfiltrationCasePrepView }) {
  return (
    <section className="space-y-2" aria-label="Role branches by zone">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide opacity-50">Role branches by zone</p>
        <p className="text-sm">{view.roleBranchesClaimedRoleLabel}</p>
        {view.roleBranchesAlignmentLabel ? (
          <p className="text-xs opacity-65">{view.roleBranchesAlignmentLabel}</p>
        ) : null}
      </div>

      {view.roleBranchesZoneLabels.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-xs text-amber-200/80">
          {view.roleBranchesZoneLabels.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      {view.roleBranchesRouteLabels.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-xs text-amber-200/80">
          {view.roleBranchesRouteLabels.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      {view.roleBranchesAlternativeLabels.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-xs opacity-70">
          {view.roleBranchesAlternativeLabels.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

function ProbeActionRow({
  option,
  onSelect,
}: {
  option: InfiltrationProbeActionOptionView
  onSelect: () => void
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">{option.label}</p>
        <p className="text-xs opacity-65">{option.summary}</p>
      </div>
      <button
        type="button"
        className="btn btn-sm"
        aria-pressed={option.selected}
        onClick={onSelect}
      >
        {option.selected ? 'Selected' : 'Select'}
      </button>
    </div>
  )
}

function CoverStanceRow({
  option,
  onSelect,
}: {
  option: InfiltrationEncounterCoverStanceOptionView
  onSelect: () => void
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">{option.label}</p>
        <p className="text-xs opacity-65">{option.summary}</p>
      </div>
      <button
        type="button"
        className="btn btn-sm"
        aria-pressed={option.selected}
        onClick={onSelect}
      >
        {option.selected ? 'Selected' : 'Select'}
      </button>
    </div>
  )
}

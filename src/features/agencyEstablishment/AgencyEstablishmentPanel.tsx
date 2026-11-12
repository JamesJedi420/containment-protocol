import { useEffect, useId, useRef, useState } from 'react'
import { useGameStore } from '../../app/store/gameStore'
import {
  agencyEstablishmentHandoff,
  dispatchAgencyEstablishment,
  skipAgencyEstablishment,
} from '../../app/agencyEstablishmentRuntime'
import type { AgencyEstablishmentHandoff } from '../../app/agencyEstablishmentRuntime'
import type { TutorialDispatchResult } from '../../domain/tutorialDelivery'
import type {
  TutorialAccessibilityInput,
  TutorialBindingResolver,
} from '../../domain/tutorialGuidance'
import type {
  TutorialCommandType,
  TutorialStatus,
  TutorialStepStatus,
} from '../../domain/tutorialLifecycle'
import { projectAgencyEstablishmentView } from './agencyEstablishmentView'
import './agencyEstablishment.css'

const endingLabels: Record<TutorialStatus | 'unavailable', string> = {
  not_started: 'Briefing ready',
  active: 'Briefing in progress',
  completed: 'Briefing complete',
  skipped: 'Briefing skipped',
  dismissed: 'Briefing dismissed',
  suppressed: 'Briefing hidden',
  interrupted: 'Briefing paused',
  canceled: 'Briefing canceled',
  unavailable: 'Briefing unavailable',
}
const stepLabels: Record<TutorialStepStatus, string> = {
  not_started: 'Upcoming',
  active: 'Current',
  completed: 'Reviewed',
  skipped: 'Skipped',
}
const label = (text: string, binding?: string) => (binding ? `${text} (${binding})` : text)

/** Consumable flow surface; campaign-entry routing is deliberately owned downstream. */
export function AgencyEstablishmentPanel({
  accessibility,
  resolveBinding,
  onComplete,
}: {
  accessibility?: TutorialAccessibilityInput
  resolveBinding?: TutorialBindingResolver
  onComplete?: (handoff: AgencyEstablishmentHandoff) => void
}) {
  const game = useGameStore((state) => state.game)
  const view = projectAgencyEstablishmentView(game, accessibility, resolveBinding)
  const status = view.lifecycle?.status ?? 'unavailable'
  const heading = useRef<HTMLHeadingElement>(null)
  const panelId = useId()
  const [error, setError] = useState<string>()
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [view.lifecycle?.cursor, status])
  const deliver = (result: TutorialDispatchResult) => {
    setError(
      !result.lifecycleChanged && result.reason !== 'stale'
        ? 'The briefing cannot change right now.'
        : undefined
    )
    const handoff = agencyEstablishmentHandoff(result)
    if (handoff) onComplete?.(handoff)
  }
  const invoke = (type: TutorialCommandType) => {
    if (!view.lifecycle) return
    deliver(dispatchAgencyEstablishment(type, view.lifecycle.revision, view.currentBeat?.id))
  }
  const skipRemaining = () => {
    if (view.lifecycle) deliver(skipAgencyEstablishment(view.lifecycle.revision))
  }
  const primary = view.allowed.includes('complete') ? 'complete' : 'advance'
  const beat = view.guidance ? view.currentBeat : undefined
  return (
    <article
      className="panel agency-establishment"
      aria-labelledby={`${panelId}-title`}
      data-reduced-motion={view.accessibility.reducedMotion}
      style={{ fontSize: `${view.accessibility.textScale}em` }}
    >
      <header>
        <p className="opening-eyebrow">Command briefing</p>
        <h2 id={`${panelId}-title`}>Agency establishment</h2>
        <p>Pause or skip the briefing. Replay is available afterward.</p>
      </header>
      <ol className="opening-progress" aria-label="Briefing beats">
        {view.beats.map((entry, index) => (
          <li
            key={entry.id}
            aria-current={beat?.id === entry.id ? 'step' : undefined}
            data-status={view.lifecycle?.stepStatuses[index]}
          >
            <span className="opening-number" aria-hidden="true">
              {index + 1}
            </span>
            <span>
              {entry.title}
              <small>{stepLabels[view.lifecycle?.stepStatuses[index] ?? 'not_started']}</small>
            </span>
          </li>
        ))}
      </ol>
      <section className="opening-stage" aria-live="polite" aria-atomic="true">
        {beat && (
          <p className="opening-eyebrow">
            Beat {(view.lifecycle?.cursor ?? 0) + 1} of {view.beats.length}
          </p>
        )}
        <h3 ref={heading} tabIndex={-1}>
          {beat?.title ?? endingLabels[status]}
        </h3>
        {beat && (
          <>
            {beat.paragraphs.map((text, index) => (
              <p key={`${index}-${text}`}>{text}</p>
            ))}
            {beat.facts.length > 0 && (
              <dl className="opening-facts">
                {beat.facts.map(([name, value]) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {beat.explanation && (
              <section className="opening-explanation" aria-label="Current routing explanation">
                <p>
                  <strong>{beat.explanation.severity}</strong>: {beat.explanation.summary}
                </p>
                <p>{beat.explanation.dominantFactor}</p>
                <ul>
                  {beat.explanation.details.map((detail, index) => (
                    <li key={`${index}-${detail}`}>{detail}</li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
        {!beat && status === 'completed' && (
          <p>The briefing is complete. Your current campaign remains available.</p>
        )}
        {!beat && status === 'skipped' && <p>The remaining briefing beats were skipped.</p>}
      </section>
      {error && <p role="alert">{error}</p>}
      <footer className="opening-controls">
        {status === 'not_started' && (
          <>
            <button
              type="button"
              className="btn"
              disabled={!view.allowed.includes('start')}
              onClick={() => invoke('start')}
            >
              {label('Begin briefing', view.bindings.start)}
            </button>
            <button
              type="button"
              className="btn"
              disabled={!view.allowed.includes('start')}
              onClick={skipRemaining}
            >
              Skip briefing
            </button>
          </>
        )}
        {status === 'active' && (
          <>
            <button
              type="button"
              className="btn"
              disabled={!view.allowed.includes('back')}
              onClick={() => invoke('back')}
            >
              {label('Back', view.bindings.back)}
            </button>
            <button
              type="button"
              className="btn"
              disabled={!view.allowed.includes('skip')}
              onClick={() => invoke('skip')}
            >
              {label('Skip beat', view.bindings.skip)}
            </button>
            <button
              type="button"
              className="btn"
              disabled={!view.allowed.includes('interrupt')}
              onClick={() => invoke('interrupt')}
            >
              {label('Pause', view.bindings.interrupt)}
            </button>
            <button
              type="button"
              className="btn"
              disabled={!view.allowed.includes('skip')}
              onClick={skipRemaining}
            >
              Skip remaining beats
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!view.allowed.includes(primary)}
              onClick={() => invoke(primary)}
            >
              {label(
                primary === 'complete' ? 'Finish briefing' : 'Continue',
                view.bindings[primary]
              )}
            </button>
          </>
        )}
        {status === 'interrupted' && (
          <button
            type="button"
            className="btn"
            disabled={!view.allowed.includes('resume')}
            onClick={() => invoke('resume')}
          >
            {label('Resume briefing', view.bindings.resume)}
          </button>
        )}
        {status === 'suppressed' && (
          <button
            type="button"
            className="btn"
            disabled={!view.allowed.includes('unsuppress')}
            onClick={() => invoke('unsuppress')}
          >
            Restore briefing
          </button>
        )}
        {view.allowed.includes('replay_start') && (
          <button type="button" className="btn" onClick={() => invoke('replay_start')}>
            {label('Replay briefing', view.bindings.replay_start)}
          </button>
        )}
      </footer>
    </article>
  )
}

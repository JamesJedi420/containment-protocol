import { buildAgencyEstablishmentProjection } from '../../domain/agencyEstablishmentProjection'
import type {
  AgencyEstablishmentBeatProjection,
  AgencyEstablishmentRoutingExplanation,
} from '../../domain/agencyEstablishmentProjection'
import { AGENCY_ESTABLISHMENT_TUTORIAL } from '../../domain/agencyEstablishmentTutorial'
import { getTutorialLifecycle } from '../../domain/gameStateManager'
import type { GameState } from '../../domain/models'
import { resolveTutorialAccessibility, selectTutorialGuidance } from '../../domain/tutorialGuidance'
import type {
  TutorialAccessibilityInput,
  TutorialBindingResolver,
} from '../../domain/tutorialGuidance'
import { transitionTutorial } from '../../domain/tutorialLifecycle'
import type { TutorialCommandType } from '../../domain/tutorialLifecycle'

export interface AgencyEstablishmentBeatView {
  readonly id: AgencyEstablishmentBeatProjection['id']
  readonly title: string
  readonly paragraphs: readonly string[]
  readonly facts: readonly (readonly [string, string])[]
  readonly explanation?: AgencyEstablishmentRoutingExplanation
}

const roleCopy = {
  'managerial-deterministic-team-first':
    'Direct the agency through its teams, under the deterministic campaign rules.',
} as const
const handoffCopy = { 'review-the-week': 'Review the week.' } as const
const questions = {
  'what-changed': 'What changed?',
  'what-can-we-support': 'What can we support?',
  'what-matters-now': 'What matters now?',
  'what-must-improve-next': 'What must improve next?',
} as const

/** Labels/formatting only; every campaign fact comes from the SPE-2906 projection. */
function presentBeat(
  beat: AgencyEstablishmentBeatProjection,
  week: number
): AgencyEstablishmentBeatView {
  switch (beat.id) {
    case 'doctrine-setting-frame': {
      const p = beat.payload
      return {
        id: beat.id,
        title: 'Doctrine and setting',
        paragraphs: [p.majorHookSummary],
        facts: [
          ['Organization', p.organizationName],
          ['Doctrine', p.doctrineLabel],
          ['Tone and scope', p.toneScopeLabel],
          ['Rules profile', p.activeRulesProfileLabel],
        ],
      }
    }
    case 'initial-facility-state': {
      const p = beat.payload
      return {
        id: beat.id,
        title: 'Initial facility state',
        paragraphs: [],
        facts: [
          ['Home base', p.homeBaseLabel],
          ['Operating region', p.operationalRegionLabel],
          ['Stability', `${p.stabilityLevel} (${p.stabilityScore})`],
          ['Ready teams', `${p.readyTeams} / ${p.totalTeams}`],
          ['Stock', String(p.totalStock)],
          ['Queued production', String(p.queuedProductionOrders)],
          [
            'Support available',
            p.supportAvailable === undefined ? 'Unavailable' : String(p.supportAvailable),
          ],
          [
            'Maintenance specialists',
            p.maintenanceSpecialistsAvailable === undefined
              ? 'Unavailable'
              : String(p.maintenanceSpecialistsAvailable),
          ],
        ],
      }
    }
    case 'opening-operational-ledger': {
      const p = beat.payload
      return {
        id: beat.id,
        title: 'Opening operational ledger',
        paragraphs: [],
        facts: [
          ['Funding', String(p.funding)],
          ['Budget pressure', String(p.budgetPressure)],
          ['Pending procurement', String(p.pendingProcurementRequests)],
          ['Containment rating', String(p.containmentRating)],
          ['Clearance level', String(p.clearanceLevel)],
          ['Active cases', String(p.activeCases)],
          ['Cases in progress', String(p.inProgressCases)],
          ['Open operation slots', String(p.openOperationSlots)],
          ['Pressure', `${p.pressureLevel} (${p.pressureScore})`],
          ['Staffing gap', String(p.staffingGap)],
          ['Replacement pressure', String(p.replacementPressure)],
          ['Temporarily unavailable', String(p.temporaryUnavailableCount)],
          ['Stock', String(p.totalStock)],
          ['Queued production', String(p.queuedProductionOrders)],
        ],
      }
    }
    case 'command-identity': {
      const p = beat.payload
      const identity = p.isAnonymous
        ? []
        : [p.displayName, p.title, p.pronouns, p.biography].filter(
            (text): text is string => typeof text === 'string' && text.length > 0
          )
      return {
        id: beat.id,
        title: 'Command identity',
        paragraphs: [roleCopy[p.roleFramingToken], ...identity],
        facts: [
          ['Organization', p.organizationName],
          ['Doctrine', p.doctrineLabel],
        ],
      }
    }
    case 'operational-briefing': {
      const p = beat.payload
      return {
        id: beat.id,
        title: 'Operational briefing',
        paragraphs: p.questionTokens.map((token) => questions[token]),
        facts: [],
        ...(p.primaryRoutingExplanation ? { explanation: p.primaryRoutingExplanation } : {}),
      }
    }
    case 'first-live-dossier': {
      const p = beat.payload
      if (!p)
        return {
          id: beat.id,
          title: 'First live dossier',
          paragraphs: ['No open dossier is available.'],
          facts: [],
        }
      return {
        id: beat.id,
        title: 'First live dossier',
        paragraphs: [p.title],
        facts: [
          ['Case', p.caseId],
          ['Status', p.status],
          ['Stage', String(p.stage)],
          ['Deadline remaining', String(p.deadlineRemaining)],
          ['Priority', p.priority],
          ['Triage score', String(p.triageScore)],
          ['Triage reasons', p.triageReasonCodes.join(', ') || 'None'],
          ['Intel confidence', String(p.intel.confidence)],
          ['Intel uncertainty', String(p.intel.uncertainty)],
          ['Intel age', String(p.intel.age)],
        ],
        explanation: p.routingExplanation,
      }
    }
    case 'agency-activation-week-1':
      return {
        id: beat.id,
        title: 'Agency activation',
        paragraphs: [handoffCopy[beat.payload.nextStepToken]],
        facts: [['Current week', String(week)]],
      }
  }
}

export function projectAgencyEstablishmentView(
  game: GameState,
  preferences: TutorialAccessibilityInput = {},
  resolveBinding?: TutorialBindingResolver
) {
  const projection = buildAgencyEstablishmentProjection(game)
  const beats = projection.beats.map((beat) => presentBeat(beat, projection.week))
  const lifecycle = getTutorialLifecycle(game, AGENCY_ESTABLISHMENT_TUTORIAL)
  const accessibility = resolveTutorialAccessibility(preferences)
  const currentBeat = lifecycle ? beats[lifecycle.cursor] : undefined
  const allowed: TutorialCommandType[] = lifecycle
    ? (
        [
          'start',
          'advance',
          'complete',
          'back',
          'skip',
          'dismiss',
          'suppress',
          'unsuppress',
          'interrupt',
          'resume',
          'replay_start',
        ] as const
      ).filter(
        (type) =>
          transitionTutorial(AGENCY_ESTABLISHMENT_TUTORIAL, lifecycle, {
            type,
            expectedRevision: lifecycle.revision,
            stepId: currentBeat?.id,
          }).changed
      )
    : []
  const guidance = lifecycle
    ? selectTutorialGuidance({
        game,
        definition: AGENCY_ESTABLISHMENT_TUTORIAL,
        lifecycle,
        context: {},
        accessibility: preferences,
        adapters: {
          resolveContent: (_game, _context, _definition, step) => {
            const beat = beats.find((candidate) => candidate.id === step.id)
            if (!beat) return undefined
            return [
              beat.title,
              ...beat.paragraphs,
              ...beat.facts.map(([label, value]) => `${label}: ${value}`),
              ...(beat.explanation
                ? [
                    beat.explanation.severity,
                    beat.explanation.summary,
                    beat.explanation.dominantFactor,
                    ...beat.explanation.details,
                  ]
                : []),
            ]
          },
        },
      })
    : undefined
  const binding = (action: string) =>
    accessibility.inputMethod
      ? resolveBinding?.(action, accessibility.inputMethod)?.label.trim() || undefined
      : undefined
  return {
    beats,
    lifecycle,
    currentBeat,
    allowed,
    guidance,
    accessibility,
    bindings: {
      start: binding('tutorial.start'),
      advance: binding('tutorial.advance'),
      complete: binding('tutorial.complete'),
      back: binding('tutorial.back'),
      skip: binding('tutorial.skip'),
      interrupt: binding('tutorial.interrupt'),
      resume: binding('tutorial.resume'),
      replay_start: binding('tutorial.replay'),
    },
  }
}

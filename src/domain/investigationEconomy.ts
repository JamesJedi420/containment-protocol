import { setPersistentFlag, readPersistentFlag } from './flagSystem'
import { advanceDefinedProgressClock, readProgressClock } from './progressClocks'
import type { GameState } from './models'

export type InvestigationQuestionDomain = 'forensic' | 'tactical'

export interface InvestigationQuestionLeverage {
  type: 'temporary_advantage' | 'next_step'
  id: string
  label: string
  description: string
  durationWeeks?: number
}

export interface InvestigationQuestionDefinition {
  id: string
  domain: InvestigationQuestionDomain
  prompt: string
  answer: string
  leverage: InvestigationQuestionLeverage
}

export interface InvestigationBudgetSnapshot {
  caseId: string
  domain: InvestigationQuestionDomain
  maxBudget: number
  granted: number
  spent: number
  remaining: number
}

export interface GrantInvestigationBudgetInput {
  caseId: string
  domain: InvestigationQuestionDomain
  amount: number
}

export interface ApplySuccessfulInvestigationInput {
  caseId: string
  forensicBudget?: number
  tacticalBudget?: number
}

export interface AskInvestigationQuestionInput {
  caseId: string
  domain: InvestigationQuestionDomain
  questionId: string
}

export interface AskInvestigationQuestionResult {
  state: GameState
  applied: boolean
  reason?: 'invalid_case' | 'invalid_question' | 'budget_exhausted' | 'already_asked'
  question?: InvestigationQuestionDefinition
  remainingBudget: number
  leverageFlagId?: string
}

const INVESTIGATION_BUDGET_MAX = 6
const INVESTIGATION_REWARD_MAX = 1

const FORENSIC_QUESTIONS: readonly InvestigationQuestionDefinition[] = [
  {
    id: 'forensic.present-signature',
    domain: 'forensic',
    prompt: 'What concrete signature is present and verifiable at the scene?',
    answer:
      'Primary residue signature is real and stable enough to anchor a controlled evidence chain.',
    leverage: {
      type: 'next_step',
      id: 'secure-evidence-chain',
      label: 'Secure evidence chain',
      description: 'Route the next action through chain-of-custody stabilization before escalation.',
    },
  },
  {
    id: 'forensic.missing-proof',
    domain: 'forensic',
    prompt: 'What expected proof is missing and therefore most suspicious?',
    answer:
      'Expected transfer logs are absent, indicating active suppression at a procedural handoff point.',
    leverage: {
      type: 'next_step',
      id: 'audit-handoff-gap',
      label: 'Audit handoff gap',
      description: 'Prioritize the handoff node as the next deterministic investigation target.',
    },
  },
  {
    id: 'forensic.anomalous-variance',
    domain: 'forensic',
    prompt: 'Which anomaly in the evidence framing changes the working hypothesis?',
    answer:
      'Variance is concentrated in relay-time stamps, suggesting the manipulation window is narrower than expected.',
    leverage: {
      type: 'temporary_advantage',
      id: 'narrowed-window',
      label: 'Narrowed manipulation window',
      description: 'Gain short-lived planning clarity on where to deploy limited follow-up capacity.',
      durationWeeks: 1,
    },
  },
] as const

const TACTICAL_READ_QUESTIONS: readonly InvestigationQuestionDefinition[] = [
  {
    id: 'tactical.immediate-danger-vector',
    domain: 'tactical',
    prompt: 'What is the immediate danger vector if we move now?',
    answer:
      'Immediate risk is concentrated on exposed ingress lanes; controlled staging lowers first-contact volatility.',
    leverage: {
      type: 'temporary_advantage',
      id: 'staged-ingress-advantage',
      label: 'Staged ingress advantage',
      description: 'Temporary posture bonus for the next tactical decision window.',
      durationWeeks: 1,
    },
  },
  {
    id: 'tactical.safe-approach',
    domain: 'tactical',
    prompt: 'Which approach route is currently least compromised?',
    answer:
      'A secondary service route remains under-observed and supports a lower-noise approach profile.',
    leverage: {
      type: 'next_step',
      id: 'route-secondary-service',
      label: 'Use secondary service route',
      description: 'Explicit next-step leverage: route assignment through the lower-observed lane.',
    },
  },
  {
    id: 'tactical.counter-read',
    domain: 'tactical',
    prompt: 'Where is counter-detection most likely to trigger first?',
    answer:
      'Counter-detection risk peaks at transition thresholds, not deep interior positions.',
    leverage: {
      type: 'temporary_advantage',
      id: 'threshold-awareness',
      label: 'Threshold awareness',
      description: 'Temporary caution signal to reduce avoidable exposure at transition points.',
      durationWeeks: 1,
    },
  },
] as const

function sanitizeCaseId(caseId: string) {
  return caseId.trim()
}

function sanitizeBudgetAmount(amount: number) {
  if (!Number.isFinite(amount)) {
    return 0
  }

  return Math.max(0, Math.trunc(amount))
}

function getQuestionCatalog(domain: InvestigationQuestionDomain) {
  return domain === 'forensic' ? FORENSIC_QUESTIONS : TACTICAL_READ_QUESTIONS
}

export function listInvestigationQuestionSet(domain: InvestigationQuestionDomain) {
  return [...getQuestionCatalog(domain)]
}

export function buildInvestigationBudgetClockId(
  caseId: string,
  domain: InvestigationQuestionDomain,
  bucket: 'granted' | 'spent'
) {
  return `investigation.case.${sanitizeCaseId(caseId)}.${domain}.${bucket}`
}

export function buildInvestigationProgressRewardClockId(caseId: string) {
  return `investigation.case.${sanitizeCaseId(caseId)}.progress.reward`
}

export function buildInvestigationAskedFlagId(caseId: string, questionId: string) {
  return `investigation.case.${sanitizeCaseId(caseId)}.question.${questionId}.asked`
}

export function buildInvestigationLeverageFlagId(caseId: string, leverageId: string) {
  return `investigation.case.${sanitizeCaseId(caseId)}.leverage.${leverageId}`
}

export function readInvestigationBudget(
  state: GameState,
  caseId: string,
  domain: InvestigationQuestionDomain
): InvestigationBudgetSnapshot {
  const normalizedCaseId = sanitizeCaseId(caseId)
  const grantedClockId = buildInvestigationBudgetClockId(normalizedCaseId, domain, 'granted')
  const spentClockId = buildInvestigationBudgetClockId(normalizedCaseId, domain, 'spent')
  const granted = readProgressClock(state, grantedClockId)?.value ?? 0
  const spent = readProgressClock(state, spentClockId)?.value ?? 0

  return {
    caseId: normalizedCaseId,
    domain,
    maxBudget: INVESTIGATION_BUDGET_MAX,
    granted,
    spent,
    remaining: Math.max(0, granted - spent),
  }
}

export function grantInvestigationQuestionBudget(
  state: GameState,
  input: GrantInvestigationBudgetInput
) {
  const normalizedCaseId = sanitizeCaseId(input.caseId)
  const amount = sanitizeBudgetAmount(input.amount)

  if (normalizedCaseId.length === 0 || amount === 0) {
    return state
  }

  return advanceDefinedProgressClock(
    state,
    buildInvestigationBudgetClockId(normalizedCaseId, input.domain, 'granted'),
    amount,
    {
      label: `${input.domain === 'forensic' ? 'Forensic' : 'Tactical'} question budget granted`,
      max: INVESTIGATION_BUDGET_MAX,
      hidden: false,
    }
  )
}

export function applySuccessfulInvestigation(
  state: GameState,
  input: ApplySuccessfulInvestigationInput
) {
  const normalizedCaseId = sanitizeCaseId(input.caseId)

  if (normalizedCaseId.length === 0) {
    return state
  }

  const forensicBudget = sanitizeBudgetAmount(input.forensicBudget ?? 2)
  const tacticalBudget = sanitizeBudgetAmount(input.tacticalBudget ?? 1)

  let nextState = state

  if (forensicBudget > 0) {
    nextState = grantInvestigationQuestionBudget(nextState, {
      caseId: normalizedCaseId,
      domain: 'forensic',
      amount: forensicBudget,
    })
  }

  if (tacticalBudget > 0) {
    nextState = grantInvestigationQuestionBudget(nextState, {
      caseId: normalizedCaseId,
      domain: 'tactical',
      amount: tacticalBudget,
    })
  }

  nextState = advanceDefinedProgressClock(
    nextState,
    buildInvestigationProgressRewardClockId(normalizedCaseId),
    1,
    {
      label: 'Investigation progress reward',
      max: INVESTIGATION_REWARD_MAX,
      hidden: false,
    }
  )

  return setPersistentFlag(
    nextState,
    `investigation.case.${normalizedCaseId}.reward.progress-applied`,
    true
  )
}

export function listAvailableInvestigationQuestions(
  state: GameState,
  caseId: string,
  domain: InvestigationQuestionDomain
) {
  const budget = readInvestigationBudget(state, caseId, domain)

  if (budget.remaining <= 0) {
    return []
  }

  return getQuestionCatalog(domain).filter(
    (question) => !readPersistentFlag(state, buildInvestigationAskedFlagId(caseId, question.id))
  )
}

export function askInvestigationQuestion(
  state: GameState,
  input: AskInvestigationQuestionInput
): AskInvestigationQuestionResult {
  const normalizedCaseId = sanitizeCaseId(input.caseId)

  if (normalizedCaseId.length === 0) {
    return {
      state,
      applied: false,
      reason: 'invalid_case',
      remainingBudget: 0,
    }
  }

  const question = getQuestionCatalog(input.domain).find(
    (entry) => entry.id === input.questionId
  )

  const budget = readInvestigationBudget(state, normalizedCaseId, input.domain)

  if (!question) {
    return {
      state,
      applied: false,
      reason: 'invalid_question',
      remainingBudget: budget.remaining,
    }
  }

  if (budget.remaining <= 0) {
    return {
      state,
      applied: false,
      reason: 'budget_exhausted',
      question,
      remainingBudget: budget.remaining,
    }
  }

  const askedFlagId = buildInvestigationAskedFlagId(normalizedCaseId, question.id)

  if (readPersistentFlag(state, askedFlagId)) {
    return {
      state,
      applied: false,
      reason: 'already_asked',
      question,
      remainingBudget: budget.remaining,
    }
  }

  let nextState = advanceDefinedProgressClock(
    state,
    buildInvestigationBudgetClockId(normalizedCaseId, input.domain, 'spent'),
    1,
    {
      label: `${input.domain === 'forensic' ? 'Forensic' : 'Tactical'} question budget spent`,
      max: INVESTIGATION_BUDGET_MAX,
      hidden: false,
    }
  )

  nextState = setPersistentFlag(nextState, askedFlagId, true)

  const leverageFlagId = buildInvestigationLeverageFlagId(normalizedCaseId, question.leverage.id)
  nextState = setPersistentFlag(nextState, leverageFlagId, true)

  if (question.leverage.durationWeeks !== undefined) {
    nextState = setPersistentFlag(
      nextState,
      `${leverageFlagId}.duration-weeks`,
      question.leverage.durationWeeks
    )
  }

  const remainingBudget = readInvestigationBudget(nextState, normalizedCaseId, input.domain).remaining

  return {
    state: nextState,
    applied: true,
    question,
    remainingBudget,
    leverageFlagId,
  }
}

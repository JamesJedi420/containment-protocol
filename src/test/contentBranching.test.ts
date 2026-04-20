import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  buildAuthoredBranchContext,
  evaluateAuthoredBranchCondition,
  selectAuthoredBranch,
} from '../domain/contentBranching'
import { enqueueRuntimeEvent } from '../domain/eventQueue'
import { setPersistentFlag } from '../domain/flagSystem'
import { PROGRESS_CLOCK_IDS, setDefinedProgressClock } from '../domain/progressClocks'

describe('contentBranching', () => {
  it('selects the first matching branch deterministically and falls back when needed', () => {
    const state = createStartingState()

    const selected = selectAuthoredBranch(state, [
      {
        id: 'match-first',
        when: {
          predicates: [{ id: 'always-true', test: () => true }],
        },
        value: 'first',
      },
      {
        id: 'match-second',
        when: {
          predicates: [{ id: 'also-true', test: () => true }],
        },
        value: 'second',
      },
      {
        id: 'fallback',
        value: 'fallback',
      },
    ])

    expect(selected).toMatchObject({
      branchId: 'match-first',
      value: 'first',
      isFallback: false,
    })

    const fallback = selectAuthoredBranch(state, [
      {
        id: 'never',
        when: {
          predicates: [{ id: 'always-false', test: () => false }],
        },
        value: 'nope',
      },
      {
        id: 'fallback',
        value: 'fallback',
      },
    ])

    expect(fallback).toMatchObject({
      branchId: 'fallback',
      value: 'fallback',
      isFallback: true,
    })
  })

  it('evaluates flags, progress clocks, and active context without mutation', () => {
    let state = createStartingState()
    state = setPersistentFlag(state, 'author.branch.enabled', true)
    state = setDefinedProgressClock(state, PROGRESS_CLOCK_IDS.breachFollowUpPosture, {
      value: 2,
      max: 3,
      label: 'Breach Follow-Up Posture',
    })

    const evaluation = evaluateAuthoredBranchCondition(
      state,
      {
        flags: {
          allFlags: ['author.branch.enabled'],
        },
        progressClocks: [
          {
            clockId: PROGRESS_CLOCK_IDS.breachFollowUpPosture,
            threshold: 2,
          },
        ],
        activeContexts: ['frontdesk.notice.test'],
      },
      {
        activeContextId: 'frontdesk.notice.test',
      }
    )

    expect(evaluation.passes).toBe(true)
    expect(evaluation.screen.passes).toBe(true)
  })

  it('supports queued follow-up conditions (any/all/none/first)', () => {
    let state = createStartingState()
    state = enqueueRuntimeEvent(state, {
      type: 'authored.follow_up',
      targetId: 'followup.alpha',
      source: 'choice.alpha',
    }).state
    state = enqueueRuntimeEvent(state, {
      type: 'authored.follow_up',
      targetId: 'followup.beta',
      source: 'choice.beta',
    }).state

    const context = buildAuthoredBranchContext(state)

    expect(context.queuedFollowUpIds).toEqual(['followup.alpha', 'followup.beta'])

    const selected = selectAuthoredBranch(
      state,
      [
        {
          id: 'queued-first',
          when: {
            followUps: {
              first: 'followup.alpha',
              allOf: ['followup.alpha'],
              anyOf: ['followup.beta'],
              noneOf: ['followup.gamma'],
            },
          },
          value: 'queued',
        },
        {
          id: 'fallback',
          value: 'fallback',
        },
      ],
      context
    )

    expect(selected).toMatchObject({
      branchId: 'queued-first',
      value: 'queued',
      isFallback: false,
    })
  })
})

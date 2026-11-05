import { describe, expect, it } from 'vitest'
import type { ErrorEvent } from '@sentry/react'
import {
  BETTER_STACK_DSN,
  VERIFICATION_ERROR,
  createErrorFilter,
  resolveErrorTrackingPolicy,
} from './errorTrackingPolicy'

const input = {
  production: true,
  origin: 'https://jamesjedi420.github.io',
  pathname: '/containment-protocol/',
  revision: 'abc123',
  automated: false,
  allowAutomated: false,
  disabled: false,
}
const policy = resolveErrorTrackingPolicy(input)!

function errorEvent(): ErrorEvent {
  return {
    type: undefined,
    event_id: 'a'.repeat(32),
    timestamp: 123,
    exception: {
      values: [
        {
          type: 'TypeError',
          value: 'private save data: player@example.com secret-token',
          stacktrace: {
            frames: [
              {
                filename: `${input.origin}/containment-protocol/assets/app.js?token=private#save`,
                function: 'advanceWeek',
                lineno: 12,
                colno: 7,
                vars: { save: 'private' },
                context_line: 'private source content',
              },
            ],
          },
        },
      ],
    },
    user: { email: 'player@example.com' },
    request: { url: 'https://private.example/?secret=private', cookies: { session: 'private' } },
    extra: { game: 'private save' },
    breadcrumbs: [{ message: 'private console message' }],
    contexts: { custom: { save: 'private' } },
    tags: { player: 'private' },
  }
}

describe('error reporting activation', () => {
  it('enables only the production public game by default', () => {
    expect(policy).toMatchObject({ dsn: BETTER_STACK_DSN, environment: 'playtest' })
    expect(resolveErrorTrackingPolicy({ ...input, production: false })).toBeNull()
    expect(resolveErrorTrackingPolicy({ ...input, origin: 'http://localhost:5173' })).toBeNull()
    expect(resolveErrorTrackingPolicy({ ...input, pathname: '/another-project/' })).toBeNull()
  })

  it('keeps automated browser traffic off unless explicitly opted in and tags it separately', () => {
    expect(resolveErrorTrackingPolicy({ ...input, automated: true })).toBeNull()
    expect(
      resolveErrorTrackingPolicy({ ...input, automated: true, allowAutomated: true })
    ).toMatchObject({ environment: 'playwright' })
  })

  it('allows explicit local verification, but respects disable switches', () => {
    expect(
      resolveErrorTrackingPolicy({ ...input, production: false, enabled: 'true' })
    ).not.toBeNull()
    expect(resolveErrorTrackingPolicy({ ...input, enabled: 'false' })).toBeNull()
    expect(resolveErrorTrackingPolicy({ ...input, enabled: 'true', disabled: true })).toBeNull()
  })

  it.each([
    'invalid',
    'http://key@source.betterstackdata.com/12',
    'https://key@other.example/12',
    'https://key:secret@source.betterstackdata.com/12',
    'https://key@source.betterstackdata.com/12?secret=x',
  ])('fails closed for invalid or non-Better-Stack DSNs: %s', (dsn) => {
    expect(resolveErrorTrackingPolicy({ ...input, dsn })).toBeNull()
  })
})

describe('outbound error privacy', () => {
  it('retains source locations and controlled metadata, dropping arbitrary payloads', () => {
    const original = errorEvent()
    const output = createErrorFilter(policy)(original)
    expect(output).toMatchObject({
      release: 'containment-protocol@abc123',
      environment: 'playtest',
      exception: {
        values: [
          {
            type: 'TypeError',
            stacktrace: {
              frames: [
                {
                  filename: `${input.origin}/containment-protocol/assets/app.js`,
                  lineno: 12,
                  colno: 7,
                },
              ],
            },
          },
        ],
      },
    })
    expect(JSON.stringify(output)).not.toMatch(
      /private|player@example|secret-token|cookies|breadcrumbs|contexts/
    )
    expect(original.user?.email).toBe('player@example.com')
  })

  it('preserves only the fixed verification message or numeric React decoder code', () => {
    const event = errorEvent()
    event.exception!.values![0]!.value = VERIFICATION_ERROR
    expect(createErrorFilter(policy)(event)?.exception?.values?.[0]?.value).toBe(VERIFICATION_ERROR)
    event.exception!.values![0]!.value = 'Minified React error #123; private decoder parameters'
    expect(createErrorFilter(policy)(event)?.exception?.values?.[0]?.value).toBe(
      'Minified React error #123'
    )
  })

  it('drops errors without owned JavaScript source locations', () => {
    const event = errorEvent()
    event.exception!.values![0]!.stacktrace!.frames![0]!.filename =
      'https://extension.example/extension.js'
    expect(createErrorFilter(policy)(event)).toBeNull()
    event.exception!.values![0]!.stacktrace!.frames![0]!.filename = `${input.origin}/private-player-route`
    expect(createErrorFilter(policy)(event)).toBeNull()
  })

  it('bounds volume per page and keeps test reports distinct', () => {
    const filter = createErrorFilter({ ...policy, environment: 'playwright' })
    for (let i = 0; i < 20; i += 1) expect(filter(errorEvent())).not.toBeNull()
    expect(filter(errorEvent())).toBeNull()
    expect(createErrorFilter({ ...policy, environment: 'playwright' })(errorEvent())?.tags).toEqual(
      { application: 'containment-protocol', traffic: 'playwright' }
    )
  })
})

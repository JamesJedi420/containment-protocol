import type { ErrorEvent, StackFrame } from '@sentry/react'

export const VERIFICATION_ERROR = 'Containment Protocol Better Stack verification'
export const AUTOMATED_REPORTING_KEY = 'cp.errorTracking.allowAutomated'
export const DISABLE_REPORTING_KEY = 'cp.errorTracking.disabled'

export interface ErrorTrackingPolicy {
  origin: string
  release: string
  environment: 'playtest' | 'playwright'
  dsn: string
}

export function resolveErrorTrackingPolicy(input: {
  production: boolean
  enabled?: string
  dsn?: string
  origin: string
  pathname: string
  revision: string
  automated: boolean
  allowAutomated: boolean
  disabled: boolean
}): ErrorTrackingPolicy | null {
  if (input.disabled || input.enabled === 'false') return null
  const publicGame =
    input.production &&
    input.origin === 'https://jamesjedi420.github.io' &&
    input.pathname.startsWith('/containment-protocol/')
  if (input.enabled !== 'true' && !publicGame) return null
  if (input.automated && !input.allowAutomated) return null

  const dsn = input.dsn
  if (!dsn) return null
  try {
    const address = new URL(dsn)
    if (
      address.protocol !== 'https:' ||
      !address.hostname.endsWith('.betterstackdata.com') ||
      !address.username ||
      !/^\/\d+$/.test(address.pathname) ||
      address.password ||
      address.search ||
      address.hash
    )
      return null
  } catch {
    return null
  }

  return {
    origin: input.origin,
    release: `containment-protocol@${input.revision}`,
    environment: input.automated ? 'playwright' : 'playtest',
    dsn,
  }
}

function scrubFrame(frame: StackFrame, origin: string): StackFrame | null {
  if (!frame.filename) return null
  try {
    const address = new URL(frame.filename, origin)
    // Send source locations only, never page routes, query strings, source text or variables.
    if (address.origin !== origin || !/\.(?:[cm]?js|tsx?)$/.test(address.pathname)) return null
    return {
      filename: `${address.origin}${address.pathname}`,
      lineno: frame.lineno,
      colno: frame.colno,
      in_app: true,
      ...(frame.function && /^[\w.$ <>/-]{1,120}$/.test(frame.function)
        ? { function: frame.function }
        : {}),
    }
  } catch {
    return null
  }
}

/** Rebuild an allowlisted error payload rather than denylisting arbitrary game/account data. */
export function createErrorFilter(policy: ErrorTrackingPolicy) {
  let sent = 0
  return (event: ErrorEvent): ErrorEvent | null => {
    if (event.type !== undefined || sent >= 20) return null
    const exceptions = event.exception?.values?.slice(0, 5).map((exception) => ({
      type: /^(?:Error|TypeError|ReferenceError|RangeError|SyntaxError|URIError|EvalError|AggregateError)$/.test(
        exception.type ?? ''
      )
        ? exception.type
        : 'Error',
      value:
        exception.value === VERIFICATION_ERROR
          ? VERIFICATION_ERROR
          : (exception.value?.match(/^Minified React error #\d+/)?.[0] ??
            'Error message omitted for privacy'),
      stacktrace: {
        frames: (exception.stacktrace?.frames ?? [])
          .map((frame) => scrubFrame(frame, policy.origin))
          .filter((frame): frame is StackFrame => frame !== null)
          .slice(-30),
      },
      ...(exception.mechanism
        ? {
            mechanism: {
              type: /^[\w.]{1,100}$/.test(exception.mechanism.type)
                ? exception.mechanism.type
                : 'generic',
              handled: exception.mechanism.handled,
            },
          }
        : {}),
    }))
    if (!exceptions?.length || !exceptions.some((exception) => exception.stacktrace.frames.length))
      return null
    sent += 1
    return {
      type: undefined,
      event_id: event.event_id,
      timestamp: event.timestamp,
      platform: 'javascript',
      level: 'error',
      release: policy.release,
      environment: policy.environment,
      tags: { application: 'containment-protocol', traffic: policy.environment },
      exception: { values: exceptions },
    }
  }
}

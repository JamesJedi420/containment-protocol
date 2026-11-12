import * as Sentry from '@sentry/react'
import type { RootOptions } from 'react-dom/client'
import {
  AUTOMATED_REPORTING_KEY,
  DISABLE_REPORTING_KEY,
  createErrorFilter,
  resolveErrorTrackingPolicy,
} from './errorTrackingPolicy'

let rootOptions: RootOptions | undefined

function readPreference(key: string, fallback = false): boolean {
  try {
    return window.sessionStorage.getItem(key) === 'true'
  } catch {
    // Blocked storage must never prevent the game from starting.
    return fallback
  }
}

export function initializeErrorTracking(): RootOptions {
  if (rootOptions) return rootOptions
  rootOptions = {}
  const policy = resolveErrorTrackingPolicy({
    production: import.meta.env.PROD,
    enabled: import.meta.env.VITE_ERROR_TRACKING_ENABLED,
    dsn: import.meta.env.VITE_BETTERSTACK_DSN,
    origin: window.location.origin,
    pathname: window.location.pathname,
    revision: __CP_BUILD_REVISION__,
    automated: navigator.webdriver,
    allowAutomated: readPreference(AUTOMATED_REPORTING_KEY),
    disabled: readPreference(DISABLE_REPORTING_KEY, true),
  })
  if (!policy) return rootOptions

  try {
    Sentry.init({
      dsn: policy.dsn,
      release: policy.release,
      environment: policy.environment,
      defaultIntegrations: false,
      integrations: [
        Sentry.globalHandlersIntegration(),
        Sentry.browserApiErrorsIntegration(),
        Sentry.dedupeIntegration(),
      ],
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpHeaders: false,
        httpBodies: [],
        urlQueryParams: false,
        stackFrameVariables: false,
        frameContextLines: 0,
      },
      maxBreadcrumbs: 0,
      sendClientReports: false,
      tracePropagationTargets: [],
      beforeSend: createErrorFilter(policy),
      // No tracing integration or sampling option; guard against accidental manual spans too.
      ignoreSpans: [/.*/],
      beforeSendLog: () => null,
      beforeSendMetric: () => null,
      transportOptions: { fetchOptions: { credentials: 'omit', referrerPolicy: 'no-referrer' } },
    })
    const capture = Sentry.reactErrorHandler()
    const report: NonNullable<RootOptions['onUncaughtError']> = (error, info) => {
      capture(error, info)
      // Preserve console evidence for developers and Playwright after overriding React defaults.
      console.error(error)
    }
    rootOptions = { onUncaughtError: report, onCaughtError: report, onRecoverableError: report }
    return rootOptions
  } catch {
    // Optional diagnostics must not become a startup dependency.
    return rootOptions
  }
}

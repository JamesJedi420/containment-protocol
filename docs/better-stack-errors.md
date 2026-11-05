# Better Stack browser errors (SPE-3729)

The public GitHub Pages game sends a small diagnostic error payload to the
Containment Protocol application in Better Stack. The existing uptime monitor
remains independent. No account, backend, management API token, or required local
environment variable is needed to play or develop the game.

## Collection boundary

Reporting is enabled by default only in a production build on
`https://jamesjedi420.github.io/containment-protocol/`. Local development, previews,
and automated browsers do not send live reports by default. React 19 root error
hooks and global asynchronous error handlers capture exceptions. Console errors
remain available to developers and Playwright.

Outbound events are rebuilt from an allowlist: error type, same-origin JavaScript
source locations (up to 30 frames), timestamp/event ID, build revision, and the
`playtest` or `playwright` environment. Query strings, fragments, frame variables,
source context, arbitrary messages, request data, cookies, user fields, game/save
data, breadcrumbs, extra context and arbitrary tags are omitted. Numeric minified
React error codes and one fixed verification message are retained. This trades
message detail for predictable minimization; reports without owned source frames
are dropped. There is a 20-event cap per page load, in addition to SDK deduplication.

No replay, feedback, browser-session, analytics, log, metric or tracing integration
is enabled. Replay/feedback/web-vitals packages are transitive SDK dependencies,
not enabled features. The transport omits credentials and the referrer. As with
any network service, Better Stack still receives the connection's network address
and browser HTTP metadata; client filtering does not establish server retention
or deletion policy. The application dashboard displayed 90-day error retention at
setup; the account owner manages retention and billing there.

The DSN is a public ingest address and ships in browser code. Never substitute a
management API token or put one in a `VITE_` variable. Reports use the Git commit
from `GITHUB_SHA` in Actions, otherwise the local checkout HEAD. Uncommitted local
code is not a published release even if it reports its base HEAD.

## Configuration and disabling

- `VITE_ERROR_TRACKING_ENABLED=false` disables reporting at build/start time.
- `VITE_ERROR_TRACKING_ENABLED=true` explicitly enables a local verification build.
- `VITE_BETTERSTACK_DSN` optionally overrides the ingest address. Only an HTTPS
  Better Stack ingest host with a numeric application path is accepted.
- To disable future initialization in the current tab, set
  `sessionStorage.setItem('cp.errorTracking.disabled', 'true')` and reload. Remove
  that key and reload to restore the normal activation rules. No game save changes.
- Automated browsers additionally require
  `sessionStorage.setItem('cp.errorTracking.allowAutomated', 'true')` before loading
  the page. Such reports always use `environment=playwright`, distinct from players.
  The flag is a test convenience, not a security boundary.

## Verification

`npm run test:errors` uses a dedicated Vite server on port 5198. It explicitly
enables the SDK, tests disabled ordinary automation, then captures React and
global errors in a constructed fixture. All ingest requests are intercepted and
validated locally; this test cannot verify delivery to Better Stack. The existing
CI Playwright command also runs this suite. Fixtures are not production entries.

For one live synthetic verification, start Vite with
`VITE_ERROR_TRACKING_ENABLED=true`, opt a disposable automated tab in, and open
`/e2e/fixtures/error-tracking.html`. Click **Verify React exception** while observing
the ingest response. This sends only the fixed message
`Containment Protocol Better Stack verification`, tagged `playwright`. An HTTP
ingest acknowledgment establishes transport acceptance, not dashboard visibility.
Confirm the event in Better Stack's Errors view when dashboard access is available.
Do not cause a real gameplay failure just to test telemetry.

On November 5, 2026 at 08:20:43 UTC, the actual React SDK fixture received HTTP 200
from the configured ingest endpoint for event `b18638281cf240af9f700c3eb9a370b8`
(`environment=playwright`). This was a dirty implementation checkout based on
`bd85c1c2`, not a published release. The connected browser profile was not signed
into the dashboard, so event visibility there was not verified. Raw acknowledgment
is retained in the session's `betterstack-evidence/live-ingest.json` artifact.

Production stack locations refer to the emitted JavaScript bundle. This boundary
does not upload source maps or enable replay. Use the recorded release and matching
build artifacts for investigation; source-map upload needs a separately reviewed
configuration and a management token kept outside the browser.

## Dependency fallback review — 2026-11-05

Sonatype credits were unavailable; the user explicitly authorized the fallback in
`docs/dependency-review-policy.md`. Proposed direct runtime dependency:
`@sentry/react@11.10.0` (exact pin). Its React 17/18/19 and router 6/7/8 peer ranges
cover this project. Clean installation used Node 22.23.4/npm 10.9.9 and
`npm ci --ignore-scripts`.

New resolved packages:

| Package                 | Version | License    |
| ----------------------- | ------- | ---------- |
| `@sentry/react`         | 11.10.0 | MIT        |
| `@sentry/browser`       | 11.10.0 | MIT        |
| `@sentry/browser-utils` | 11.10.0 | MIT        |
| `@sentry/core`          | 11.10.0 | MIT        |
| `@sentry/feedback`      | 11.10.0 | MIT        |
| `@sentry/replay`        | 11.10.0 | MIT        |
| `@sentry/replay-canvas` | 11.10.0 | MIT        |
| `@sentry/conventions`   | 0.29.0  | MIT        |
| `web-vitals`            | 6.2.3   | Apache-2.0 |

- Registry metadata points to the official `getsentry/sentry-javascript`,
  `getsentry/sentry-conventions`, and `GoogleChrome/web-vitals` repositories.
  Lock entries retain registry HTTPS URLs and SHA-512 integrity. Clean npm install
  validates fetched bytes against those entries; registry signature presence is
  not claimed as a separate signature verification.
- The official Sentry 11.10.0 release was published October 28, 2026. Its managed
  tunnel and tracing changes are not enabled here. The exact installed SDK source
  and declarations were checked for React hooks, default integrations, data
  collection controls, transport options and lifecycle scripts. No new package
  has an install lifecycle script. The SDK's broad defaults are deliberately
  replaced by the three required error integrations.
- `npm audit --json` on baseline and proposed locks reports the same 10 moderate
  findings in ESLint/typescript-eslint/minimatch tooling, with no high/critical
  findings and no new affected package. Those baseline findings remain unresolved.
- GitHub Advisory Database exact-version queries for `@sentry/react`,
  `@sentry/browser` and `@sentry/core` at 11.10.0 returned zero matches. OSV
  `POST /v1/querybatch` queried all nine exact resolved identities listed above;
  every result had zero matches. These databases overlap; they are not independent
  proof and do not establish absence of malware or undisclosed vulnerabilities.
- MIT and Apache-2.0 permit this use subject to their notice/license obligations;
  SDK notices are included in the site's third-party notice file. This is a scoped
  engineering review, not a blanket legal clearance of the repository.

Decision: accept this exact resolved addition for the bounded error-only use.
No automatic audit fixes, unrelated upgrades, lifecycle scripts, new scan service,
or subscription purchase was used. Raw baseline/proposed audit, registry, OSV and
clean-install evidence was captured in the session's `betterstack-evidence`
artifact directory and summarized on SPE-3729 and the PR.

Official references: [Better Stack Sentry integration](https://betterstack.com/docs/errors/collecting-errors/sentry-sdk/),
[Sentry React 19 hooks](https://sentry.io/changelog/react-19-support/),
[Sentry 11.10.0 release](https://github.com/getsentry/sentry-javascript/releases/tag/11.10.0),
[Sentry options](https://docs.sentry.io/platforms/javascript/guides/react/configuration/options/).

# GitHub Pages game deployment (SPE-3502)

The public game destination is <https://jamesjedi420.github.io/containment-protocol/>.
Pages must use **GitHub Actions**, rather than publishing source from `main` `/`.
The repository owner authorized this bounded deployment repair under SPE-3502.

## Build and verification

Use Node 22 and the existing lockfile:

```sh
npm ci
npm run build:bundle -- --mode pages
npx playwright test --config e2e/pages.config.ts
```

Pages mode sets Vite's base to `/containment-protocol/` and uses hash routing, so
links such as `/containment-protocol/#/cases` survive direct entry and reload on
static hosting. Other modes retain the existing root base and browser routing.
The smoke reuses the existing Chromium harness and starts Vite preview on port 5184. It checks compiled assets, favicon, lazy navigation, back/forward, direct
links, mission assignment, week advance, report viewing and save continuity.
Failure traces and screenshots use `test-results/pages/`, separate from the
development harness output. The deployment workflow retains failure artifacts
for 14 days.

To verify the public deployment in a fresh, disposable browser context:

```powershell
$env:CP_PAGES_URL = 'https://jamesjedi420.github.io/containment-protocol/'
npx playwright test --config e2e/pages.config.ts
Remove-Item Env:CP_PAGES_URL
```

This does not access or clear the user's active browser save. Record the tested
commit, deployment run, URL, date, browser and results on SPE-3502. A configured
homepage or successful bundle alone does not establish public playability.

## Deployment and recovery

The Pages workflow runs only after the existing **Test** workflow succeeds for
a push to this repository's `main`. It checks out that exact tested SHA, builds
and smoke-tests the compiled game, then uploads only `dist/`. Deployment jobs are
serialized, use the `github-pages` environment and alone receive Pages/OIDC write
permissions. Superseded main commits are skipped before publication.

An authorized repository administrator selects **Settings → Pages → Source →
GitHub Actions**. After a failed deployment, inspect the failing job, preserve
the failure evidence and rerun the successful current-main Test workflow to
trigger a new deployment. Do not publish untested branches or source files.
If current main changes, its own Test workflow must pass before it can deploy.

The bundle command remains distinct from the advisory TypeScript build/census;
SPE-3375 retains unrelated compiler recovery. This change does not activate a
release gate, create a GitHub Release or modify licensing.

## Remaining visitor onboarding

SPE-3502 stays open until public playability and the final published **Play Now**
README link have been verified. The README update belongs in a fresh continuation
session after the deployment PR merges. Preserve the existing screenshots,
capture provenance, contributor guidance and all-rights-reserved terms. The owner
approved the existing About description, eight topics and homepage in this
continuation; retain them and independently read back saved values at closeout.

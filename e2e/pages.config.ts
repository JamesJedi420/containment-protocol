import { defineConfig } from '@playwright/test'
import baseConfig from '../playwright.config'

// Reuse the existing Chromium harness for a compiled build or the public site.
const publicURL = process.env.CP_PAGES_URL

export default defineConfig(baseConfig, {
  testDir: '.',
  testMatch: 'pages-smoke.spec.ts',
  testIgnore: [],
  outputDir: '../test-results/pages',
  use: {
    baseURL: publicURL ?? 'http://127.0.0.1:5184/containment-protocol/',
  },
  webServer: publicURL
    ? undefined
    : {
        command: 'npm run preview -- --mode pages --host 127.0.0.1 --port 5184 --strictPort',
        url: 'http://127.0.0.1:5184/containment-protocol/',
        reuseExistingServer: false,
        timeout: 120_000,
      },
})

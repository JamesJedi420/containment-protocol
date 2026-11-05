import { defineConfig } from '@playwright/test'
import base from './playwright.config'

export default defineConfig({
  ...base,
  testIgnore: [],
  testMatch: '**/error-tracking.spec.ts',
  outputDir: 'test-results/error-tracking',
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/errors' }]]
    : [['list']],
  use: { ...base.use, baseURL: 'http://127.0.0.1:5198' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5198',
    url: 'http://127.0.0.1:5198',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_ERROR_TRACKING_ENABLED: 'true',
      VITE_BETTERSTACK_DSN: 'https://test@example.betterstackdata.com/1',
    },
  },
})

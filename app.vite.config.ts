import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

function getManualChunk(id: string) {
  const normalizedId = id.replace(/\\/g, '/')

  if (normalizedId.includes('/node_modules/')) {
    if (
      normalizedId.includes('/react/') ||
      normalizedId.includes('/react-dom/') ||
      normalizedId.includes('/react-router/') ||
      normalizedId.includes('/zustand/')
    ) {
      return 'vendor-react'
    }

    if (normalizedId.includes('/lucide-react/')) {
      return 'vendor-icons'
    }

    return 'vendor-misc'
  }

  if (normalizedId.includes('/src/domain/templates/') || normalizedId.includes('/src/data/copy.ts')) {
    return 'content-catalog'
  }

  if (
    normalizedId.includes('/src/domain/sim/') ||
    normalizedId.includes('/src/domain/events/') ||
    normalizedId.includes('/src/domain/agent/') ||
    normalizedId.includes('/src/app/store/') ||
    normalizedId.includes('/src/data/startingState.ts') ||
    normalizedId.includes('/src/data/production.ts') ||
    normalizedId.includes('/src/data/training.ts')
  ) {
    return 'sim-core'
  }

  return undefined
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        manualChunks: getManualChunk,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 15000,
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:3000',
      },
    },
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['docs/**', '**/docs/**'],
    coverage: {
      exclude: ['docs/**', '**/docs/**'],
      thresholds: {
        lines: 55,
        functions: 55,
        statements: 55,
        branches: 45,
      },
    },
  },
})

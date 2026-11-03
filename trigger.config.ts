import { defineConfig } from '@trigger.dev/sdk'
import { execFileSync } from 'node:child_process'

export default defineConfig({
  project: 'proj_nqtjupmbfusgzufhnobk',
  runtime: 'node-22',
  logLevel: 'log',
  // The max compute seconds a task is allowed to run. If the task run exceeds this duration, it will be stopped.
  // You can override this on an individual task.
  // See https://trigger.dev/docs/runs/max-duration
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ['./src/trigger'],
  build: {
    extensions: [
      {
        name: 'cp-experiment-build-identity',
        onBuildStart(context) {
          const readIdentity = () => {
            try {
              const git = (args: string[]) =>
                execFileSync('git', args, {
                  cwd: context.workingDir,
                  encoding: 'utf8',
                  timeout: 5000,
                }).trim()
              return {
                commit: git(['rev-parse', 'HEAD']),
                dirty: git(['status', '--porcelain', '--untracked-files=all']) !== '',
              }
            } catch {
              // Existing smoke task remains usable; experiments fail closed without provenance.
              return null
            }
          }
          const identity = readIdentity()
          context.registerPlugin({
            name: 'cp-experiment-build-identity',
            setup(build: {
              initialOptions: { define?: Record<string, string> }
              onStart: (check: () => { errors: { text: string }[] } | undefined) => void
              onEnd: (check: () => { errors: { text: string }[] } | undefined) => void
            }) {
              build.initialOptions.define = {
                ...build.initialOptions.define,
                CP_EXPERIMENT_BUILD: JSON.stringify(identity),
              }
              // The CLI reuses this plugin during watch rebuilds. Never relabel changed
              // code with the initial clean revision; require a fresh worker session.
              const verifyIdentity = () => {
                if (JSON.stringify(readIdentity()) !== JSON.stringify(identity)) {
                  return {
                    errors: [{ text: 'Git identity changed; restart the Trigger.dev worker.' }],
                  }
                }
              }
              build.onStart(verifyIdentity)
              build.onEnd(verifyIdentity)
            },
          })
        },
      },
    ],
  },
})

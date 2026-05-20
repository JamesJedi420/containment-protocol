import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const IMPORT_VIOLATION =
  /from\s+['"][^'"]*(?:docs\/archived|incident-shell)[^'"]*['"]|import\s*\(\s*['"][^'"]*(?:docs\/archived|incident-shell)/

function collectSourceFiles(rootDir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(rootDir)) {
    const fullPath = join(rootDir, entry)
    const stats = statSync(fullPath)

    if (stats.isDirectory()) {
      collectSourceFiles(fullPath, files)
      continue
    }

    if (/\.(ts|tsx)$/.test(entry)) {
      files.push(fullPath)
    }
  }

  return files
}

describe('archived prototype hygiene (backlog #5)', () => {
  it('keeps docs/archived/incident-shell out of active src imports', () => {
    const srcRoot = join(process.cwd(), 'src')
    const violations = collectSourceFiles(srcRoot).filter((filePath) =>
      IMPORT_VIOLATION.test(readFileSync(filePath, 'utf8'))
    )

    expect(violations.map((filePath) => relative(process.cwd(), filePath))).toEqual([])
  })

  it('excludes docs/archived from vitest discovery', () => {
    const configSource = readFileSync(join(process.cwd(), 'app.vite.config.ts'), 'utf8')

    expect(configSource).toContain("'docs/**'")
    expect(configSource).toContain("'**/docs/**'")
    expect(configSource).toContain("'src/**/*.test.{ts,tsx}'")
  })

  it('excludes docs/archived from eslint lint targets', () => {
    const eslintSource = readFileSync(join(process.cwd(), 'eslint.config.js'), 'utf8')

    expect(eslintSource).toContain("'docs/archived/**'")
  })
})

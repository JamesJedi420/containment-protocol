
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Dependency boundary enforcement', () => {
  const featuresDir = path.join(__dirname, '../src/features')

  // Allow imports in projection interface files and internal feature imports
  // Only match direct feature directory imports (e.g., from '../intel' or from '../intel')
  const disallowedPattern = /from ['"]\.\.\/(?!sharedView|shared|app\/store)([a-zA-Z0-9_-]+)['"]/g

  function isProjectionInterfaceImport(importPath) {
    // Allow imports from any sibling feature's stable projection interface file:
    // ../<feature>/<SomeName>View, ../<feature>/<SomeName>View.ts, etc.
    return (
      /['"]\.\.\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+(View|IntelProjection|Projection)(\.ts)?(['";]|$)/.test(importPath)
    )
  }

  function isInternalFeatureImport(filePath, importPath) {
    // Allow any import from a file within the same feature directory
    // e.g., src/features/agents/hooks/useTabRegistry.ts importing from ../tabs or ../agentTabsModel
    const featureMatch = filePath.replace(/\\/g, '/').match(/src\/features\/([^/]+)/)
    if (!featureMatch) return false
    const feature = featureMatch[1]
    // ../tabs, ../agentTabsModel, ../tabRegistry, etc
    // Only block if import is from another feature (../<otherFeature>)
    // Allow if import is from ../<anything> that is not a feature root
    // (i.e., does not match ../<featureName>)
    // Block if import is from ../<otherFeature>
    const importMatch = importPath.match(/\.\.\/(\w+)/)
    if (!importMatch) return false
    const importTarget = importMatch[1]
    // If importTarget is the same as feature, allow
    // If importTarget is not a feature directory, allow
    // Only block if importTarget is a sibling feature directory
    const featureDirs = fs.readdirSync(path.join(featuresDir)).filter(f => fs.statSync(path.join(featuresDir, f)).isDirectory())
    if (importTarget === feature) return true
    if (!featureDirs.includes(importTarget)) return true
    return false
  }

  function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8')
    const matches = [...content.matchAll(disallowedPattern)]
    return matches
      .filter((m) =>
        !isInternalFeatureImport(filePath, m[0]) &&
        !isProjectionInterfaceImport(m[0])
      )
      .map((m) => ({ file: filePath, import: m[0] }))
  }

  function walk(dir: string): string[] {
    let results: string[] = []
    fs.readdirSync(dir).forEach((file) => {
      const fullPath = path.join(dir, file)
      if (fs.statSync(fullPath).isDirectory()) {
        results = results.concat(walk(fullPath))
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(fullPath)
      }
    })
    return results
  }

  it('should not have disallowed feature-to-feature imports', () => {
    const files = walk(featuresDir)
    const violations = files.flatMap(checkFile)
    expect(violations).toEqual([])
  })
})

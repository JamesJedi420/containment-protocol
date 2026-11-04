import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'
import {
  compareBudget,
  compareCensuses,
  compareText,
  parseDiagnostics,
  sha256,
  summarize,
} from './typecheck-census.mjs'

const project = (file) => (file.startsWith('src/') ? 'tsconfig.app.json' : undefined)
const diagnostic = 'src/a.test.ts(2,3): error TS2322: Type mismatch.\n  Missing member.\n'

test('committed baseline reconciles raw compiler output, every occurrence, summary and both run hashes', () => {
  const base = new URL('../docs/typecheck/41873280/', import.meta.url)
  const report = JSON.parse(fs.readFileSync(new URL('census.json', base), 'utf8'))
  const raw = fs.readFileSync(new URL('compiler.txt', base), 'utf8')
  const records = parseDiagnostics(raw, (file) =>
    file.startsWith('src/') ? 'tsconfig.app.json' : undefined
  )
  assert.deepEqual(records, report.diagnostics)
  assert.deepEqual(summarize(records), report.summary)
  assert.equal(report.reproducible, true)
  assert.deepEqual(report.identityDelta, [])
  assert.equal(report.runs.length, 2)
  for (const run of report.runs) {
    assert.equal(run.exitCode, 2)
    assert.equal(run.rawHash, sha256(raw))
  }
})

test('normalizes CRLF and Windows separators, retaining continuation text and coordinates', () => {
  const records = parseDiagnostics(
    diagnostic.replace('src/', 'src\\').replaceAll('\n', '\r\n'),
    project
  )
  assert.equal(records[0].file, 'src/a.test.ts')
  assert.equal(records[0].line, 2)
  assert.equal(records[0].column, 3)
  assert.equal(records[0].message, 'Type mismatch.\n  Missing member.')
  assert.equal(records[0].surface, 'test-fixture')
  assert.deepEqual(records, parseDiagnostics(diagnostic, project))
})

test('line movement preserves identity; message changes do not', () => {
  const before = parseDiagnostics(diagnostic, project)
  const moved = parseDiagnostics(diagnostic.replace('(2,3)', '(80,10)'), project)
  assert.deepEqual(compareCensuses(before, moved), [])
  assert.notEqual(
    before[0].identity,
    parseDiagnostics(diagnostic.replace('member', 'field'), project)[0].identity
  )
})

test('duplicate occurrences are preserved and multiset comparison detects count changes', () => {
  const one = parseDiagnostics(diagnostic, project)
  const two = parseDiagnostics(diagnostic + diagnostic, project)
  assert.equal(summarize(two).occurrences, 2)
  assert.equal(summarize(two).uniqueIdentities, 1)
  assert.equal(summarize(two).repeatedIdentityOccurrences, 1)
  assert.equal(summarize(two).exactDuplicateOccurrences, 1)
  assert.deepEqual(compareCensuses(two, one), [{ identity: one[0].identity, change: -1 }])
})

test('unparsed diagnostics, banners, and unknown project attribution fail closed', () => {
  for (const text of [
    'unexpected output',
    ' error TS999: malformed',
    'src/a.ts: error TS123: malformed',
  ]) {
    assert.throws(() => parseDiagnostics(text, project))
  }
  assert.throws(() => parseDiagnostics('other.ts(1,1): error TS123: bad', project), /attribute/)
  assert.throws(
    () => parseDiagnostics(`${diagnostic}  error TS123: hidden diagnostic`, project),
    /Unparsed/
  )
})

test('empty successful output and global configuration diagnostics are explicit', () => {
  assert.equal(summarize(parseDiagnostics('', project)).occurrences, 0)
  const [record] = parseDiagnostics('error TS5083: Cannot read file.\n', project)
  assert.equal(record.project, 'tsconfig.json')
  assert.equal(record.file, null)
  assert.equal(record.surface, 'configuration')
})

test('test helper directories are fixtures without misclassifying production lookalikes', () => {
  for (const file of [
    'src/test/fixtures/payloads.ts',
    'src/test/helpers/proof.ts',
    'test/setup.ts',
    'src/__tests__/helper.ts',
  ]) {
    const [record] = parseDiagnostics(
      `${file}(1,1): error TS2322: mismatch`,
      () => 'tsconfig.app.json'
    )
    assert.equal(record.surface, 'test-fixture')
  }
  const [record] = parseDiagnostics('src/testingRuntime.ts(1,1): error TS2322: mismatch', project)
  assert.equal(record.surface, 'production-source')
})

test('budget comparison reports deltas and treats growth as over budget', () => {
  const summary = { occurrences: 681, uniqueIdentities: 466, files: 178 }
  const budget = { occurrences: 681, fingerprints: 466, files: 178 }
  assert.deepEqual(compareBudget(summary, budget), {
    occurrenceDelta: 0,
    fingerprintDelta: 0,
    fileDelta: 0,
    overBudget: false,
  })
  assert.equal(compareBudget({ ...summary, occurrences: 682 }, budget).overBudget, true)
  assert.equal(compareBudget({ ...summary, uniqueIdentities: 467 }, budget).overBudget, true)
  assert.equal(compareBudget({ ...summary, occurrences: 680 }, budget).overBudget, false)
})

test('advisory budget does not exceed the committed baseline census', () => {
  const report = JSON.parse(
    fs.readFileSync(new URL('../docs/typecheck/41873280/census.json', import.meta.url), 'utf8')
  )
  const budget = JSON.parse(
    fs.readFileSync(new URL('../docs/typecheck/budget.json', import.meta.url), 'utf8')
  )
  assert.equal(budget.schemaVersion, 1)
  // The historical capture is immutable; each phase may ratchet the budget down.
  assert.ok(budget.occurrences <= report.summary.occurrences)
  assert.ok(budget.fingerprints <= report.summary.uniqueIdentities)
  assert.ok(budget.files <= report.summary.files)
  assert.match(budget.revision, /^[0-9a-f]{40}$/)
})

test('partition assigns every baseline occurrence once and binds analysis to verified compiler evidence', () => {
  const base = new URL('../docs/typecheck/', import.meta.url)
  const baseline = JSON.parse(fs.readFileSync(new URL('41873280/census.json', base), 'utf8'))
  const partition = JSON.parse(fs.readFileSync(new URL('partition.json', base), 'utf8'))
  const verification = JSON.parse(
    fs.readFileSync(new URL('verification-1108c4b9.json', base), 'utf8')
  )
  assert.equal(partition.baselineSha256, sha256(JSON.stringify(baseline)))
  assert.equal(verification.normalizedBaselineSha256, partition.baselineSha256)
  assert.equal(verification.revision, partition.analysisRevision)
  assert.equal(verification.compilerInputHash, baseline.compilerInputHash)
  assert.equal(verification.packageLockHash, baseline.packageLockHash)
  assert.equal(verification.reproducible, true)
  assert.equal(verification.workingTreeStatus, '')
  assert.equal(verification.diagnosticsMatchBaseline, true)
  assert.deepEqual(verification.runs, baseline.runs)
  assert.deepEqual(verification.summary, baseline.summary)
  assert.deepEqual(verification.identityDelta, [])
  const assigned = partition.groups.flatMap((group) => group.occurrences)
  assert.equal(new Set(partition.groups.map((group) => group.id)).size, partition.groups.length)
  assert.deepEqual(
    assigned.toSorted((a, b) => a - b),
    baseline.diagnostics.map((_, index) => index)
  )
  for (const group of partition.groups) {
    assert.ok(group.occurrences.length > 0, group.id)
    assert.ok(group.cause, `${group.id}: missing cause`)
    assert.ok(group.canonicalContract, `${group.id}: missing canonicalContract`)
    assert.ok(group.cascadeAssessment, `${group.id}: missing cascadeAssessment`)
    assert.equal(group.reconciliationOwner, 'SPE-3376')
    assert.ok(['repair-candidate', 'semantic-review'].includes(group.disposition), group.id)
    const expectedEvidence = [
      ...new Set(
        group.occurrences.map((index) => {
          const diagnostic = baseline.diagnostics[index]
          return `${diagnostic.file}:${diagnostic.line}`
        })
      ),
    ]
    assert.deepEqual(
      group.evidence.toSorted(compareText),
      expectedEvidence.toSorted(compareText),
      `${group.id}: evidence must match occurrence coordinates`
    )
  }
})

test('November reconciliation binds its clean current-main census to both raw compiler captures', () => {
  const base = new URL('../docs/typecheck/reconciliation-2026-11-03/', import.meta.url)
  const censusText = fs.readFileSync(new URL('census.json', base), 'utf8')
  const census = JSON.parse(censusText)
  const packet = JSON.parse(fs.readFileSync(new URL('reconciliation.json', base), 'utf8'))
  const raw = fs.readFileSync(new URL('compiler.txt', base), 'utf8')
  const diagnostics = parseDiagnostics(raw, (file) =>
    file.startsWith('src/') ? 'tsconfig.app.json' : undefined
  )
  assert.equal(packet.censusSha256, sha256(JSON.stringify(census)))
  assert.equal(packet.revision, census.revision)
  assert.equal(census.revision, 'ad21424a4804e22a40a6bbef10454cdc84835016')
  assert.equal(census.workingTreeStatus, '')
  assert.equal(census.nodeVersion, 'v22.23.4')
  assert.equal(census.reproducible, true)
  assert.deepEqual(census.identityDelta, [])
  assert.equal(census.runs.length, 2)
  for (const run of census.runs) {
    assert.equal(run.exitCode, 2)
    assert.equal(run.rawHash, sha256(raw))
  }
  assert.deepEqual(diagnostics, census.diagnostics)
  assert.deepEqual(summarize(diagnostics), census.summary)
  assert.deepEqual(packet.summary.current, census.summary)
  const execution = JSON.parse(fs.readFileSync(new URL('execution.json', base), 'utf8'))
  const buildLog = fs.readFileSync(new URL(execution.log, base), 'utf8').replaceAll('\r\n', '\n')
  assert.equal(execution.command, 'npm run build')
  assert.equal(execution.exitCode, 2)
  assert.equal(execution.revision, census.revision)
  assert.equal(execution.nodeVersion, census.nodeVersion)
  assert.equal(execution.compilerInputHash, census.compilerInputHash)
  assert.equal(execution.normalizedLogSha256, sha256(buildLog))
  assert.match(buildLog, /tsc -b && vite build/)
  assert.equal(execution.diagnosticLines, census.diagnostics.length)
  const firstDiagnosticOffset = buildLog.indexOf('src/')
  assert.ok(firstDiagnosticOffset >= 0, 'build log must contain the captured src/ diagnostics')
  assert.deepEqual(
    parseDiagnostics(buildLog.slice(firstDiagnosticOffset), (file) =>
      file.startsWith('src/') ? 'tsconfig.app.json' : undefined
    ),
    census.diagnostics
  )
})

test('November reconciliation assigns all current occurrences once without reviving completed owners', () => {
  const base = new URL('../docs/typecheck/', import.meta.url)
  const packet = JSON.parse(
    fs.readFileSync(new URL('reconciliation-2026-11-03/reconciliation.json', base), 'utf8')
  )
  const census = JSON.parse(
    fs.readFileSync(new URL('reconciliation-2026-11-03/census.json', base), 'utf8')
  )
  const historicalText = fs.readFileSync(new URL('41873280/census.json', base), 'utf8')
  const partitionText = fs.readFileSync(new URL('partition.json', base), 'utf8')
  const historical = JSON.parse(historicalText)
  const partition = JSON.parse(partitionText)
  assert.equal(packet.baselineSha256, sha256(JSON.stringify(historical)))
  assert.equal(packet.historicalPartitionSha256, sha256(JSON.stringify(partition)))
  assert.deepEqual(
    packet.comparisons.originalBaseline.identityDelta,
    compareCensuses(historical.diagnostics, census.diagnostics)
  )
  assert.ok(packet.comparisons.originalBaseline.identityDelta.every((row) => row.change < 0))
  const allIndices = packet.groups.flatMap((group) => group.diagnosticIndices)
  assert.deepEqual(
    allIndices.toSorted((a, b) => a - b),
    census.diagnostics.map((_, index) => index)
  )
  assert.equal(new Set(packet.groups.map((group) => group.id)).size, packet.groups.length)
  assert.equal(packet.groups.length, 187)
  assert.equal(new Set(packet.groups.map((group) => group.historicalGroupId)).size, 186)
  for (const group of packet.groups) {
    const source = partition.groups.find((row) => row.id === group.historicalGroupId)
    assert.ok(source, group.id)
    assert.equal(group.occurrenceCount, group.diagnosticIndices.length)
    assert.equal(group.disposition, source.disposition)
    assert.equal(group.historicalCanonicalContract, source.canonicalContract)
    assert.ok(group.canonicalContract, group.id)
    assert.equal(group.repairOwner, null)
    assert.equal(group.approvalState, 'proposed-not-admitted')
    assert.ok(group.proposedRepair.length > 30, group.id)
    assert.ok(group.additionalTestRequirement, group.id)
    assert.deepEqual(
      group.sourceAnchors,
      group.diagnosticIndices.map((index) => {
        const row = census.diagnostics[index]
        assert.ok(
          group.historicalOccurrenceIndices.some(
            (oldIndex) => historical.diagnostics[oldIndex].identity === row.identity
          ),
          `${group.id}: current identity must be in its historical cohort`
        )
        return `${row.file}:${row.line}:${row.column}`
      })
    )
    assert.ok(
      group.historicalOccurrenceIndices.every((index) => source.occurrences.includes(index))
    )
    for (const file of group.testCandidates) {
      assert.match(file, /\.test\.tsx?$/)
      assert.ok(fs.existsSync(new URL(`../${file}`, import.meta.url)), file)
    }
  }
  const count = (predicate) =>
    packet.groups.filter(predicate).reduce((total, group) => total + group.occurrenceCount, 0)
  assert.equal(
    count((group) => group.disposition === 'semantic-review'),
    99
  )
  assert.equal(
    count((group) => group.disposition === 'repair-candidate'),
    310
  )
  const residuals = packet.groups.filter((group) => group.priorRepairOwner)
  assert.deepEqual(
    residuals.map((group) => [group.id, group.priorRepairOwner, group.occurrenceCount]),
    [
      ['workshop-persistence-map-presence', 'SPE-3444', 6],
      ['workshop-persistence-outcome-shape', 'SPE-3444', 1],
    ]
  )
  const completedHelper = JSON.parse(
    fs.readFileSync(new URL('spe-3444-evidence.json', base), 'utf8')
  )
  assert.deepEqual(
    compareCensuses(
      completedHelper.remainingPersistenceDiagnostics,
      residuals.flatMap((group) =>
        group.diagnosticIndices.map((index) => census.diagnostics[index])
      )
    ),
    []
  )
})

test('approved canonical import cohort removes only its fourteen diagnostics and preserves runtime output', () => {
  const base = new URL('../docs/typecheck/import-repair-2026-11-03/', import.meta.url)
  const delta = JSON.parse(fs.readFileSync(new URL('delta.json', base), 'utf8'))
  const before = readRepairCapture(base, delta.before)
  const after = readRepairCapture(base, delta.after)
  assert.equal(before.workingTreeStatus, '')
  assert.equal(before.summary.occurrences, 409)
  assert.equal(after.summary.occurrences, 395)
  assert.deepEqual(compareCensuses(before.diagnostics, after.diagnostics), delta.identityDelta)
  assert.ok(delta.identityDelta.every((row) => row.change < 0))
  assert.equal(delta.removedOccurrences, 14)
  assert.equal(delta.addedOccurrences, 0)
  assert.deepEqual(
    delta.roots.map((row) => [row.issue, row.measuredRemovals]),
    [
      ['SPE-3526', 4],
      ['SPE-3527', 3],
      ['SPE-3528', 1],
      ['SPE-3529', 1],
      ['SPE-3530', 1],
      ['SPE-3531', 1],
      ['SPE-3532', 2],
      ['SPE-3533', 1],
    ]
  )
  const archiveBase = new URL('../docs/typecheck/reconciliation-2026-11-03/', import.meta.url)
  const archive = JSON.parse(fs.readFileSync(new URL('census.json', archiveBase), 'utf8'))
  const packet = JSON.parse(fs.readFileSync(new URL('reconciliation.json', archiveBase), 'utf8'))
  const removed = delta.roots.flatMap((row) => row.removedDiagnostics)
  assert.deepEqual(compareCensuses(removed, []), delta.identityDelta)
  for (const root of delta.roots) {
    const approvedGroup = packet.groups.find((group) => group.id === root.root)
    assert.ok(approvedGroup, root.root)
    const expectedIdentities = new Set(
      approvedGroup.diagnosticIndices.map((index) => archive.diagnostics[index].identity)
    )
    for (const diagnostic of root.removedDiagnostics) {
      assert.equal(diagnostic.file, root.file)
      assert.ok(
        expectedIdentities.has(diagnostic.identity),
        root.issue + ': diagnostic must belong to its own baseline root'
      )
    }
    assert.equal(root.measuredRemovals, root.removedDiagnostics.length)
    assert.equal(root.expectedRemovals, root.measuredRemovals)
    assert.ok(root.canonicalContract)
    assert.ok(root.targetedTests.length > 0)
  }
  assert.equal(delta.runtimeIdentity.files.length, 7)
  for (const entry of delta.runtimeIdentity.files) {
    assert.equal(entry.identical, true)
    assert.match(entry.beforeEmittedJavaScriptSha256, /^[0-9a-f]{64}$/)
    assert.equal(entry.beforeEmittedJavaScriptSha256, entry.afterEmittedJavaScriptSha256)
  }
  assert.equal(delta.remaining.fullGreenBuild, false)
})

function readRepairCapture(base, metadata) {
  const captureUrl = new URL(metadata.census, base)
  const census = JSON.parse(fs.readFileSync(captureUrl, 'utf8'))
  const raw = fs.readFileSync(new URL('compiler.txt', captureUrl), 'utf8')
  const records = parseDiagnostics(raw, project)
  assert.deepEqual(records, census.diagnostics)
  assert.deepEqual(summarize(records), census.summary)
  assert.equal(metadata.revision, census.revision)
  assert.equal(metadata.compilerInputHash, census.compilerInputHash)
  assert.equal(metadata.normalizedDiagnosticRecordsSha256, sha256(JSON.stringify(records)))
  assert.equal(census.nodeVersion, 'v22.23.4')
  assert.equal(census.typescriptVersion, '6.0.3')
  assert.equal(census.reproducible, true)
  assert.equal(census.runs.length, 2)
  assert.deepEqual(census.identityDelta, [])
  for (const run of census.runs) {
    assert.equal(run.exitCode, 2)
    assert.equal(run.rawHash, sha256(raw))
  }
  return census
}

function assertAnnotationCohort({
  directory,
  beforeOccurrences,
  afterOccurrences,
  expectedRoots,
  previousComparisonKey,
  runtimeFileCount,
  allowAllocationUnionMapping = false,
}) {
  const base = new URL(`../docs/typecheck/${directory}/`, import.meta.url)
  const delta = JSON.parse(fs.readFileSync(new URL('delta.json', base), 'utf8'))
  const before = readRepairCapture(base, delta.before)
  const after = readRepairCapture(base, delta.after)
  assert.equal(before.workingTreeStatus, '')
  assert.equal(before.summary.occurrences, beforeOccurrences)
  assert.equal(after.summary.occurrences, afterOccurrences)
  const fixtures = (census) => census.diagnostics.filter((row) => row.surface === 'test-fixture')
  assert.equal(fixtures(before).length, 250)
  assert.deepEqual(compareCensuses(fixtures(before), fixtures(after)), [])
  assert.deepEqual(compareCensuses(before.diagnostics, after.diagnostics), delta.identityDelta)
  assert.ok(delta.identityDelta.every((row) => row.change < 0))
  const expectedRemovalCount = beforeOccurrences - afterOccurrences
  assert.equal(delta.removedOccurrences, expectedRemovalCount)
  assert.equal(delta.addedOccurrences, 0)
  const previousComparison = delta[previousComparisonKey]
  const previous = JSON.parse(fs.readFileSync(new URL(previousComparison.census, base), 'utf8'))
  assert.deepEqual(compareCensuses(previous.diagnostics, before.diagnostics), [])
  assert.deepEqual(previousComparison.identityDelta, [])
  assert.deepEqual(
    delta.roots.map((row) => [row.issue, row.root, row.measuredRemovals]),
    expectedRoots
  )
  const archiveBase = new URL('../docs/typecheck/reconciliation-2026-11-03/', import.meta.url)
  const archive = JSON.parse(fs.readFileSync(new URL('census.json', archiveBase), 'utf8'))
  const packet = JSON.parse(fs.readFileSync(new URL('reconciliation.json', archiveBase), 'utf8'))
  const removed = delta.roots.flatMap((row) => row.removedDiagnostics)
  assert.deepEqual(compareCensuses(removed, []), delta.identityDelta)
  const coordinates = removed.map((row) => JSON.stringify([row.identity, row.line, row.column]))
  assert.equal(new Set(coordinates).size, expectedRemovalCount, 'each removal is attributed once')
  for (const root of delta.roots) {
    const group = packet.groups.find((row) => row.id === root.root)
    assert.ok(group, root.root)
    assert.equal(group.disposition, 'repair-candidate')
    if (!allowAllocationUnionMapping) assert.deepEqual(root.historicalIdentityMappings, [])
    const expected = group.diagnosticIndices.map((index) => {
      const historical = archive.diagnostics[index]
      const mapping = root.historicalIdentityMappings.find(
        (row) => row.historicalIdentity === historical.identity
      )
      if (!mapping) return historical
      assert.equal(allowAllocationUnionMapping, true)
      assert.equal(root.root, 'allocation-literal-inference')
      assert.equal(root.historicalIdentityMappings.length, 1)
      const unionMembers = (text) =>
        text.replace('action: ', '').replace(';', '').split(' | ').sort(compareText)
      assert.deepEqual(unionMembers(mapping.replacedText), unionMembers(mapping.replacementText))
      const current = before.diagnostics.find((row) => row.identity === mapping.currentIdentity)
      assert.ok(current)
      assert.equal(current.file, historical.file)
      assert.equal(current.code, historical.code)
      assert.equal(
        current.message,
        historical.message.replace(mapping.replacedText, mapping.replacementText)
      )
      return current
    })
    assert.deepEqual(compareCensuses(expected, root.removedDiagnostics), [])
    assert.ok(root.removedDiagnostics.every((row) => group.files.includes(row.file)))
    assert.equal(root.expectedRemovals, root.measuredRemovals)
    assert.equal(root.measuredRemovals, root.removedDiagnostics.length)
    assert.ok(root.canonicalContract)
    assert.ok(root.targetedTests.length > 0)
    for (const file of root.targetedTests) {
      assert.ok(fs.existsSync(new URL(`../${file}`, import.meta.url)), file)
    }
  }
  const runtimeFiles = delta.runtimeIdentity.files.map((row) => row.file).sort(compareText)
  assert.deepEqual(
    runtimeFiles,
    [...new Set(delta.roots.map((row) => row.implementationFile))].sort(compareText)
  )
  assert.equal(runtimeFiles.length, runtimeFileCount)
  assert.equal(delta.runtimeIdentity.baseRevision, before.revision)
  assert.equal(delta.runtimeIdentity.typescriptVersion, '6.0.3')
  assert.deepEqual(delta.runtimeIdentity.compilerOptions, {
    target: 'ES2022',
    module: 'ESNext',
    verbatimModuleSyntax: true,
  })
  for (const entry of delta.runtimeIdentity.files) {
    assert.equal(entry.identical, true)
    for (const field of [
      'beforeSourceSha256',
      'afterSourceSha256',
      'beforeEmittedJavaScriptSha256',
    ]) {
      assert.match(entry[field], /^[0-9a-f]{64}$/)
    }
    assert.equal(entry.beforeEmittedJavaScriptSha256, entry.afterEmittedJavaScriptSha256)
  }
  const semanticIdentities = new Set(
    packet.groups
      .filter((row) => row.disposition === 'semantic-review')
      .flatMap((row) => row.diagnosticIndices.map((index) => archive.diagnostics[index].identity))
  )
  const semantic = (census) =>
    census.diagnostics.filter((row) => semanticIdentities.has(row.identity))
  assert.equal(semantic(before).length, 99)
  assert.deepEqual(compareCensuses(semantic(before), semantic(after)), [])
  assert.equal(delta.remaining.semanticReviewOccurrences, 99)
  assert.equal(delta.remaining.occurrences, after.summary.occurrences)
  assert.equal(delta.remaining.fullGreenBuild, false)
  const execution = JSON.parse(fs.readFileSync(new URL('execution.json', base), 'utf8'))
  const build = fs
    .readFileSync(new URL(execution.transcript, base), 'utf8')
    .replaceAll('\r\n', '\n')
  const start = build.search(/^.+\(\d+,\d+\): error TS\d+:/m)
  assert.ok(start >= 0, 'literal build must contain compiler diagnostics')
  assert.equal(execution.command, 'npm run build')
  assert.equal(execution.nodeVersion, before.nodeVersion)
  assert.equal(execution.exitCode, 2)
  assert.equal(execution.viteExecuted, false)
  assert.equal(execution.normalizedTranscriptSha256, sha256(build))
  assert.equal(execution.diagnosticOccurrences, after.summary.occurrences)
  assert.equal(execution.diagnosticsMatchAfterCensus, true)
  assert.deepEqual(
    compareCensuses(parseDiagnostics(build.slice(start), project), after.diagnostics),
    []
  )
}

test('approved literal-context cohort attributes seven removals without changing runtime output', () => {
  assertAnnotationCohort({
    directory: 'literal-context-2026-11-03',
    beforeOccurrences: 395,
    afterOccurrences: 388,
    expectedRoots: [
      ['SPE-3538', 'allocation-literal-inference', 1],
      ['SPE-3539', 'grade-visibility-inference', 2],
      ['SPE-3540', 'fallout-literal-inference', 3],
      ['SPE-3541', 'candidate-potential-inference', 1],
    ],
    previousComparisonKey: 'previousImportCohortComparison',
    runtimeFileCount: 3,
    allowAllocationUnionMapping: true,
  })
})

test('approved mechanical production cohort removes exactly seven attributed diagnostics with identical runtime output', () => {
  assertAnnotationCohort({
    directory: 'mechanical-contracts-2026-11-03',
    beforeOccurrences: 388,
    afterOccurrences: 381,
    expectedRoots: [
      ['SPE-3543', 'candidate-source-disposition', 3],
      ['SPE-3544', 'eligible-case-membership', 1],
      ['SPE-3545', 'institutional-flags-index', 1],
      ['SPE-3546', 'town-tags-readonly', 1],
      ['SPE-3547', 'store-inspection-drafts', 1],
    ],
    previousComparisonKey: 'previousLiteralContextCohortComparison',
    runtimeFileCount: 4,
  })
})

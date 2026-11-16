/**
 * SPE-3758 read-only producer. Input findings are independently assessed under
 * SPE-3276; this command packages and checks them against a fresh Linear read.
 * Usage: node scripts/produce-implementation-evidence.mjs
 *   <findings.json> <feed.json> <diagnostics.json>
 */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { fetchLinearAuthority } from './export-linear-approved-work.mjs'
import {
  fetchLinearRevisionInventory,
  produceEvidenceFeed,
  readMainRevision,
  serializeEvidenceFeed,
  verifyAuthorityFindings,
  writeAtomically,
} from './implementation-evidence-feed.mjs'

function writeDiagnostics(file, diagnostics, qualifying = false) {
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        schemaVersion: 1,
        producer: 'SPE-3758',
        qualifying,
        diagnostics,
      },
      null,
      2
    ) + '\n'
  )
}

export async function runProducer({
  findingsPath,
  outputPath,
  diagnosticsPath,
  apiKey = process.env.LINEAR_API_KEY,
  projectIds = (process.env.LINEAR_PROJECT_IDS ?? '').split(',').filter(Boolean),
  request = fetch,
  revision = readMainRevision,
  clock = () => new Date().toISOString(),
  verifyFindings = verifyAuthorityFindings,
}) {
  if (
    !findingsPath ||
    !outputPath ||
    !diagnosticsPath ||
    new Set([findingsPath, outputPath, diagnosticsPath].map((file) => path.resolve(file))).size !==
      3
  )
    throw new Error('three distinct file paths required')
  try {
    const source = JSON.parse(fs.readFileSync(findingsPath, 'utf8'))
    if (
      source?.schemaVersion !== 1 ||
      source.authority !== 'SPE-3276' ||
      !Array.isArray(source.findings)
    ) {
      throw new Error('SPE-3276 findings input invalid')
    }
    const before = revision()
    const verifiedFindings = await verifyFindings({
      apiKey,
      findings: source.findings,
      request,
    })
    const { pages, asOf } = await fetchLinearAuthority({
      apiKey,
      projectIds,
      request,
      clock,
    })
    const verifiedInventory = await fetchLinearRevisionInventory({
      apiKey,
      projectIds,
      request,
    })
    const revisionVerifiedAt = clock()
    const after = revision()
    const feed = produceEvidenceFeed({
      projectIds,
      pages,
      verifiedInventory,
      retrievedAt: asOf,
      revisionVerifiedAt,
      githubRevision: before,
      githubVerifiedAt: revisionVerifiedAt,
      findings: verifiedFindings,
    })
    if (before !== after) {
      feed.diagnostics.push({ code: 'github-revision-changed' })
      feed.complete = false
    }
    if (!feed.complete) {
      writeDiagnostics(diagnosticsPath, feed.diagnostics)
      return { complete: false, diagnostics: feed.diagnostics }
    }
    writeAtomically(outputPath, serializeEvidenceFeed(feed))
    writeDiagnostics(diagnosticsPath, [], true)
    return { complete: true, count: feed.retrieval.issues.length }
  } catch (error) {
    const diagnostics = [{ code: 'source-unverified', detail: error.message }]
    writeDiagnostics(diagnosticsPath, diagnostics)
    return { complete: false, diagnostics }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [findingsPath, outputPath, diagnosticsPath] = process.argv.slice(2)
  runProducer({ findingsPath, outputPath, diagnosticsPath })
    .then((result) => {
      if (result.complete) {
        console.log('SPE-3276 feed verified for ' + result.count + ' issues')
      } else {
        console.error(
          'SPE-3276 feed non-qualifying: ' + result.diagnostics.map((item) => item.code).join(', ')
        )
        process.exitCode = 1
      }
    })
    .catch((error) => {
      console.error(error.message)
      process.exitCode = 1
    })
}

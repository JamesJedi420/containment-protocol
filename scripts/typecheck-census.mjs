import { createHash } from 'node:crypto'

export const sha256 = (value) => createHash('sha256').update(value).digest('hex')

// Code-unit ordering keeps census hashes independent of the host locale.
export function compareText(a, b) {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

function diagnosticRecord(match, projectForFile) {
  const file = match[1]?.replaceAll('\\', '/') ?? null
  const project = file ? projectForFile(file) : 'tsconfig.json'
  if (!project) throw new Error(`Cannot attribute diagnostic: ${match[0]}`)
  return {
    project,
    file,
    line: match[2] ? Number(match[2]) : null,
    column: match[3] ? Number(match[3]) : null,
    code: `TS${match[4]}`,
    message: match[5],
  }
}

function classifySurface(file) {
  if (!file) return 'configuration'
  if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(file) || /(^|\/)(__tests__|tests?)(\/)/.test(file)) {
    return 'test-fixture'
  }
  if (file.startsWith('src/')) return 'production-source'
  return 'tooling'
}

/** Preserve occurrences; identity intentionally ignores line movement. */
export function parseDiagnostics(raw, projectForFile) {
  const records = []
  let current
  for (const line of raw.replaceAll('\r\n', '\n').split('\n')) {
    if (!line.trim()) continue
    const match = /^(?:(.+)\((\d+),(\d+)\): )?error TS(\d+): (.*)$/.exec(line)
    if (match) {
      current = diagnosticRecord(match, projectForFile)
      records.push(current)
    } else if (/^\s/.test(line) && current && !/error TS\d+:/.test(line)) {
      current.message += `\n${line.trimEnd()}`
    } else {
      throw new Error(`Unparsed compiler output: ${line}`)
    }
  }
  return records.map((record) => ({
    ...record,
    identity: sha256(JSON.stringify([record.project, record.file, record.code, record.message])),
    surface: classifySurface(record.file),
  }))
}

export function compareBudget(summary, budget) {
  const occurrenceDelta = summary.occurrences - budget.occurrences
  const fingerprintDelta = summary.uniqueIdentities - budget.fingerprints
  const fileDelta = summary.files - budget.files
  return {
    occurrenceDelta,
    fingerprintDelta,
    fileDelta,
    overBudget: occurrenceDelta > 0 || fingerprintDelta > 0,
  }
}

export function summarize(records) {
  const countBy = (field) =>
    Object.fromEntries(
      [...new Set(records.map((record) => record[field]))]
        .sort(compareText)
        .map((key) => [key, records.filter((record) => record[field] === key).length])
    )
  const identities = new Set(records.map((record) => record.identity))
  return {
    occurrences: records.length,
    uniqueIdentities: identities.size,
    repeatedIdentityOccurrences: records.length - identities.size,
    exactDuplicateOccurrences:
      records.length -
      new Set(
        records.map((record) => JSON.stringify([record.identity, record.line, record.column]))
      ).size,
    files: new Set(records.map((record) => record.file).filter(Boolean)).size,
    byProject: countBy('project'),
    byCode: countBy('code'),
    bySurface: countBy('surface'),
  }
}

export function compareCensuses(before, after) {
  const counts = (records) => {
    const result = new Map()
    for (const { identity } of records) result.set(identity, (result.get(identity) ?? 0) + 1)
    return result
  }
  const oldCounts = counts(before)
  const newCounts = counts(after)
  const delta = []
  for (const identity of [...new Set([...oldCounts.keys(), ...newCounts.keys()])].sort(
    compareText
  )) {
    const change = (newCounts.get(identity) ?? 0) - (oldCounts.get(identity) ?? 0)
    if (change) delta.push({ identity, change })
  }
  return delta
}

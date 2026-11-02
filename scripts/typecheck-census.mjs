import { createHash } from 'node:crypto'

export const sha256 = (value) => createHash('sha256').update(value).digest('hex')

/** Preserve occurrences; identity intentionally ignores line movement. */
export function parseDiagnostics(raw, projectForFile) {
  const records = []
  let current
  for (const line of raw.replace(/\r\n/g, '\n').split('\n')) {
    if (!line.trim()) continue
    const match = /^(?:(.+)\((\d+),(\d+)\): )?error TS(\d+): (.*)$/.exec(line)
    if (match) {
      const file = match[1]?.replaceAll('\\', '/') ?? null
      current = {
        project: file ? projectForFile(file) : 'tsconfig.json',
        file,
        line: match[2] ? Number(match[2]) : null,
        column: match[3] ? Number(match[3]) : null,
        code: `TS${match[4]}`,
        message: match[5],
      }
      if (!current.project) throw new Error(`Cannot attribute diagnostic: ${line}`)
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
    surface:
      record.file === null
        ? 'configuration'
        : /\.(test|spec)\.[cm]?[jt]sx?$/.test(record.file)
          ? 'test-fixture'
          : record.file.startsWith('src/')
            ? 'production-source'
            : 'tooling',
  }))
}

export function summarize(records) {
  const countBy = (field) =>
    Object.fromEntries(
      [...new Set(records.map((record) => record[field]))]
        .sort()
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
  for (const identity of [...new Set([...oldCounts.keys(), ...newCounts.keys()])].sort()) {
    const change = (newCounts.get(identity) ?? 0) - (oldCounts.get(identity) ?? 0)
    if (change) delta.push({ identity, change })
  }
  return delta
}

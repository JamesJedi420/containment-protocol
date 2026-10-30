#!/usr/bin/env node
/**
 * SPE-3304 slice 1 — Academy authored-content validator.
 *
 * Definition-only: discovers JSON under academy/content, validates registered
 * kinds, stable IDs, cross-references, and statically provable prerequisite
 * cycles. Does not mutate content or campaign state.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/
const SHARED_ID_SPACE = 'academy-stable-id'
const DEFAULT_CONTENT_ROOT = path.join(process.cwd(), 'academy', 'content')

/**
 * @typedef {{
 *   id: string,
 *   idSpace: string,
 *   idPattern: RegExp,
 *   containerKinds: readonly string[],
 *   validateRecord: (record: object, ctx: ValidationContext) => void,
 * }} ContentKind
 *
 * @typedef {{
 *   diagnostics: Diagnostic[],
 *   filePath: string,
 *   relativePath: string,
 *   lineOf: (needle: string) => number,
 *   recordsByKind: Map<string, LoadedRecord[]>,
 *   recordsByIdSpace: Map<string, LoadedRecord[]>,
 *   pendingRefs: { record: object, fieldPath: string, ref: string, targetKind: string, ctx: ValidationContext }[],
 * }} ValidationContext
 *
 * @typedef {{
 *   kindId: string,
 *   id: string,
 *   filePath: string,
 *   relativePath: string,
 *   record: object,
 *   line: number,
 * }} LoadedRecord
 *
 * @typedef {{
 *   relativePath: string,
 *   line: number,
 *   rule: string,
 *   recordId: string,
 *   fieldPath: string,
 *   message: string,
 * }} Diagnostic
 */

/** @type {ContentKind[]} */
const CONTENT_KINDS = [
  {
    id: 'course',
    idSpace: SHARED_ID_SPACE,
    idPattern: DEFAULT_ID_PATTERN,
    containerKinds: ['course'],
    validateRecord(record, ctx) {
      assertStringArray(record, 'prerequisites', ctx)
      assertStringArray(record, 'moduleRefs', ctx)
      for (const ref of asStringArray(record.prerequisites)) {
        queueRef(ctx, record, 'prerequisites', ref, 'course')
      }
      for (const ref of asStringArray(record.moduleRefs)) {
        queueRef(ctx, record, 'moduleRefs', ref, 'module')
      }
    },
  },
  {
    id: 'module',
    idSpace: SHARED_ID_SPACE,
    idPattern: DEFAULT_ID_PATTERN,
    containerKinds: ['module'],
    validateRecord(record, ctx) {
      assertStringArray(record, 'prerequisites', ctx)
      if ('courseRef' in record && record.courseRef !== undefined) {
        if (typeof record.courseRef !== 'string' || record.courseRef.trim() === '') {
          addDiagnostic(ctx, {
            rule: 'malformed-record',
            recordId: String(record.id ?? 'file'),
            fieldPath: 'courseRef',
            message: 'courseRef must be a non-empty string when present',
            line: ctx.lineOf('"courseRef"'),
          })
        } else {
          queueRef(ctx, record, 'courseRef', record.courseRef, 'course')
        }
      }
      for (const ref of asStringArray(record.prerequisites)) {
        queueRef(ctx, record, 'prerequisites', ref, 'module')
      }
    },
  },
]

/** @type {Map<string, ContentKind>} */
const KIND_BY_CONTAINER = new Map()
for (const kind of CONTENT_KINDS) {
  for (const container of kind.containerKinds) {
    KIND_BY_CONTAINER.set(container, kind)
  }
}

/**
 * Register an additional content kind (extensibility seam for later slices).
 * @param {ContentKind} kind
 */
export function registerContentKind(kind) {
  CONTENT_KINDS.push(kind)
  for (const container of kind.containerKinds) {
    KIND_BY_CONTAINER.set(container, kind)
  }
}

export function listRegisteredKinds() {
  return CONTENT_KINDS.map((k) => k.id)
}

/**
 * @param {string} relativePath
 * @param {number} line
 * @param {string} rule
 * @param {string} recordId
 * @param {string} fieldPath
 * @param {string} message
 */
function formatDiagnostic(relativePath, line, rule, recordId, fieldPath, message) {
  return `${relativePath}:${line} — ${rule} — ${recordId} — ${fieldPath}: ${message}`
}

/**
 * @param {Diagnostic[]} diagnostics
 */
export function sortDiagnostics(diagnostics) {
  return [...diagnostics].sort((a, b) => {
    const pathCmp = a.relativePath.localeCompare(b.relativePath)
    if (pathCmp !== 0) return pathCmp
    if (a.line !== b.line) return a.line - b.line
    const ruleCmp = a.rule.localeCompare(b.rule)
    if (ruleCmp !== 0) return ruleCmp
    return a.recordId.localeCompare(b.recordId)
  })
}

/**
 * @param {Diagnostic[]} diagnostics
 */
export function formatDiagnostics(diagnostics) {
  return sortDiagnostics(diagnostics)
    .map((d) =>
      formatDiagnostic(d.relativePath, d.line, d.rule, d.recordId, d.fieldPath, d.message)
    )
    .join('\n')
}

/**
 * @param {string} fileText
 * @param {string} needle
 */
function lineOfNeedle(fileText, needle) {
  const idx = fileText.indexOf(needle)
  if (idx < 0) return 1
  return fileText.slice(0, idx).split(/\r?\n/).length
}

/**
 * @param {string} rootDir
 * @returns {string[]}
 */
function discoverJsonFiles(rootDir) {
  if (!fs.existsSync(rootDir)) return []
  /** @type {string[]} */
  const out = []
  const walk = (dir) => {
    const entries = fs
      .readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.isFile() && entry.name.endsWith('.json')) out.push(full)
    }
  }
  walk(rootDir)
  return out.sort((a, b) => a.localeCompare(b))
}

/**
 * @param {ValidationContext} ctx
 * @param {Omit<Diagnostic, 'relativePath'> & { relativePath?: string }} partial
 */
function addDiagnostic(ctx, partial) {
  ctx.diagnostics.push({
    relativePath: partial.relativePath ?? ctx.relativePath,
    line: partial.line,
    rule: partial.rule,
    recordId: partial.recordId,
    fieldPath: partial.fieldPath,
    message: partial.message,
  })
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function asStringArray(value) {
  return Array.isArray(value) ? value.filter((v) => typeof v === 'string') : []
}

/**
 * @param {object} record
 * @param {string} field
 * @param {ValidationContext} ctx
 */
function assertStringArray(record, field, ctx) {
  if (!(field in record) || record[field] === undefined) {
    return
  }
  if (!Array.isArray(record[field]) || record[field].some((v) => typeof v !== 'string')) {
    addDiagnostic(ctx, {
      rule: 'malformed-record',
      recordId: String(record.id ?? 'file'),
      fieldPath: field,
      message: `${field} must be an array of strings`,
      line: ctx.lineOf(`"${field}"`),
    })
  }
}

/**
 * @param {ValidationContext} ctx
 * @param {object} record
 * @param {string} fieldPath
 * @param {string} ref
 * @param {string} targetKind
 */
function queueRef(ctx, record, fieldPath, ref, targetKind) {
  ctx.pendingRefs.push({ record, fieldPath, ref, targetKind, ctx })
}

/**
 * @param {string} contentRoot
 * @param {{ relativeTo?: string }} [options]
 */
export function validateAcademyAuthoredContent(contentRoot = DEFAULT_CONTENT_ROOT, options = {}) {
  /** @type {Diagnostic[]} */
  const diagnostics = []
  /** @type {{ record: object, fieldPath: string, ref: string, targetKind: string, ctx: ValidationContext }[]} */
  const pendingRefs = []
  const relativeTo = options.relativeTo ?? process.cwd()
  const absRoot = path.resolve(contentRoot)

  if (!fs.existsSync(absRoot)) {
    return { ok: true, diagnostics: [], filesChecked: 0 }
  }

  const files = discoverJsonFiles(absRoot)
  /** @type {Map<string, LoadedRecord[]>} */
  const recordsByKind = new Map()
  /** @type {Map<string, LoadedRecord[]>} */
  const recordsByIdSpace = new Map()

  for (const filePath of files) {
    const relativePath = path.relative(relativeTo, filePath).split(path.sep).join('/')
    let text
    try {
      text = fs.readFileSync(filePath, 'utf8')
    } catch (err) {
      diagnostics.push({
        relativePath,
        line: 1,
        rule: 'malformed-json',
        recordId: 'file',
        fieldPath: '',
        message: `unable to read file: ${err instanceof Error ? err.message : String(err)}`,
      })
      continue
    }

    let parsed
    try {
      parsed = JSON.parse(text)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const match = /position\s+(\d+)/i.exec(message)
      let line = 1
      if (match) {
        const pos = Number(match[1])
        line = text.slice(0, pos).split(/\r?\n/).length
      }
      diagnostics.push({
        relativePath,
        line,
        rule: 'malformed-json',
        recordId: 'file',
        fieldPath: '',
        message: `unparseable JSON: ${message}`,
      })
      continue
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      diagnostics.push({
        relativePath,
        line: 1,
        rule: 'malformed-record',
        recordId: 'file',
        fieldPath: '',
        message: 'top-level value must be a JSON object',
      })
      continue
    }

    const containerKind = parsed.kind
    if (typeof containerKind !== 'string' || !KIND_BY_CONTAINER.has(containerKind)) {
      diagnostics.push({
        relativePath,
        line: lineOfNeedle(text, '"kind"'),
        rule: 'unknown-kind',
        recordId: 'file',
        fieldPath: 'kind',
        message: `no registered content kind claims container type ${JSON.stringify(containerKind)}`,
      })
      continue
    }

    const kind = KIND_BY_CONTAINER.get(containerKind)
    if (!Array.isArray(parsed.records)) {
      diagnostics.push({
        relativePath,
        line: lineOfNeedle(text, '"records"'),
        rule: 'malformed-record',
        recordId: 'file',
        fieldPath: 'records',
        message: 'records must be an array',
      })
      continue
    }

    for (const record of parsed.records) {
      const ctx = {
        diagnostics,
        filePath,
        relativePath,
        lineOf: (needle) => lineOfNeedle(text, needle),
        recordsByKind,
        recordsByIdSpace,
        pendingRefs,
      }

      if (!record || typeof record !== 'object' || Array.isArray(record)) {
        addDiagnostic(ctx, {
          rule: 'malformed-record',
          recordId: 'file',
          fieldPath: 'records[]',
          message: 'each record must be a JSON object',
          line: ctx.lineOf('"records"'),
        })
        continue
      }

      if (typeof record.id !== 'string' || record.id.trim() === '') {
        addDiagnostic(ctx, {
          rule: 'malformed-record',
          recordId: 'file',
          fieldPath: 'id',
          message: 'id must be a non-empty string',
          line: ctx.lineOf('"id"'),
        })
        continue
      }

      if (typeof record.displayName !== 'string' || record.displayName.trim() === '') {
        addDiagnostic(ctx, {
          rule: 'malformed-record',
          recordId: record.id,
          fieldPath: 'displayName',
          message: 'displayName must be a non-empty string',
          line: ctx.lineOf('"displayName"'),
        })
      }

      if (!kind.idPattern.test(record.id)) {
        addDiagnostic(ctx, {
          rule: 'id-grammar',
          recordId: record.id,
          fieldPath: 'id',
          message: `id ${JSON.stringify(record.id)} does not match ${kind.idPattern}`,
          line: ctx.lineOf(`"${record.id}"`),
        })
      }

      const loaded = {
        kindId: kind.id,
        id: record.id,
        filePath,
        relativePath,
        record,
        line: ctx.lineOf(`"${record.id}"`),
      }
      if (!recordsByKind.has(kind.id)) recordsByKind.set(kind.id, [])
      recordsByKind.get(kind.id).push(loaded)
      if (!recordsByIdSpace.has(kind.idSpace)) recordsByIdSpace.set(kind.idSpace, [])
      recordsByIdSpace.get(kind.idSpace).push(loaded)

      kind.validateRecord(record, ctx)
    }
  }

  // Duplicate IDs within kind and across shared ID space
  for (const [kindId, loaded] of recordsByKind) {
    const seen = new Map()
    for (const item of loaded) {
      if (seen.has(item.id)) {
        const first = seen.get(item.id)
        diagnostics.push({
          relativePath: first.relativePath,
          line: first.line,
          rule: 'duplicate-id',
          recordId: item.id,
          fieldPath: 'id',
          message: `duplicate ${kindId} id also at ${item.relativePath}:${item.line}`,
        })
        diagnostics.push({
          relativePath: item.relativePath,
          line: item.line,
          rule: 'duplicate-id',
          recordId: item.id,
          fieldPath: 'id',
          message: `duplicate ${kindId} id also at ${first.relativePath}:${first.line}`,
        })
      } else {
        seen.set(item.id, item)
      }
    }
  }

  for (const [space, loaded] of recordsByIdSpace) {
    const byId = new Map()
    for (const item of loaded) {
      if (!byId.has(item.id)) byId.set(item.id, [])
      byId.get(item.id).push(item)
    }
    for (const [id, items] of byId) {
      const kinds = new Set(items.map((i) => i.kindId))
      if (kinds.size < 2) continue
      for (const item of items) {
        const others = items
          .filter((o) => o !== item)
          .map((o) => `${o.kindId}@${o.relativePath}:${o.line}`)
          .join(', ')
        diagnostics.push({
          relativePath: item.relativePath,
          line: item.line,
          rule: 'duplicate-id',
          recordId: id,
          fieldPath: 'id',
          message: `shared id-space ${space} collision with ${others}`,
        })
      }
    }
  }

  // Resolve cross-references
  for (const pending of pendingRefs) {
    const targets = recordsByKind.get(pending.targetKind) ?? []
    if (!targets.some((t) => t.id === pending.ref)) {
      addDiagnostic(pending.ctx, {
        rule: 'dangling-reference',
        recordId: String(pending.record.id ?? 'file'),
        fieldPath: pending.fieldPath,
        message: `missing ${pending.targetKind} ${JSON.stringify(pending.ref)}`,
        line: pending.ctx.lineOf(`"${pending.ref}"`),
      })
    }
  }

  // Prerequisite cycles only (missing targets already reported as dangling-reference)
  for (const [, loaded] of recordsByKind) {
    const byId = new Map(loaded.map((item) => [item.id, item]))
    const visiting = new Set()
    const visited = new Set()
    const stack = []
    const visit = (id) => {
      if (visited.has(id)) return
      if (visiting.has(id)) {
        const cycleStart = stack.indexOf(id)
        const cycle = [...stack.slice(cycleStart), id].join(' -> ')
        const item = byId.get(id)
        if (item) {
          diagnostics.push({
            relativePath: item.relativePath,
            line: item.line,
            rule: 'impossible-prerequisite',
            recordId: id,
            fieldPath: 'prerequisites',
            message: `prerequisite cycle: ${cycle}`,
          })
        }
        return
      }
      visiting.add(id)
      stack.push(id)
      const item = byId.get(id)
      if (item) {
        for (const ref of asStringArray(item.record.prerequisites)) {
          if (byId.has(ref)) visit(ref)
        }
      }
      stack.pop()
      visiting.delete(id)
      visited.add(id)
    }
    for (const id of byId.keys()) visit(id)
  }

  const sorted = sortDiagnostics(diagnostics)
  return {
    ok: sorted.length === 0,
    diagnostics: sorted,
    filesChecked: files.length,
  }
}

function printUsage() {
  process.stderr.write(
    'Usage: node scripts/validation/academy-authored-content.mjs [--root <path>]\n'
  )
}

function main(argv) {
  let root = DEFAULT_CONTENT_ROOT
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--root') {
      const next = argv[i + 1]
      if (!next) {
        printUsage()
        return 2
      }
      root = path.resolve(next)
      i += 1
      continue
    }
    if (arg === '--help' || arg === '-h') {
      printUsage()
      return 0
    }
    printUsage()
    return 2
  }

  const result = validateAcademyAuthoredContent(root)
  const text = formatDiagnostics(result.diagnostics)
  if (text) process.stdout.write(text + '\n')
  return result.ok ? 0 : 1
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  process.exitCode = main(process.argv.slice(2))
}

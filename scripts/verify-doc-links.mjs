#!/usr/bin/env node
/**
 * SPE-3757: Documentation link and line-anchor verification.
 * Checks line-anchored path:line citations, Markdown link targets, and anchors
 * over docs/, architecture/, planning/, root *.md, and .cursor/rules/*.mdc.
 * Reports only; never rewrites. Dependency-free.
 *
 * Usage: node scripts/verify-doc-links.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const errors = []
const warnings = []

const EXEMPT_LINKS = new Set(['url']) // template placeholder

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, acc)
    else if (/\.(md|mdc)$/i.test(entry.name)) acc.push(full)
  }
  return acc
}

function collectFiles() {
  const files = []
  for (const d of ['docs', 'architecture', 'planning']) {
    files.push(...walk(path.join(root, d)))
  }
  for (const f of fs.readdirSync(root)) {
    if (f.endsWith('.md') && fs.statSync(path.join(root, f)).isFile()) {
      files.push(path.join(root, f))
    }
  }
  const rules = path.join(root, '.cursor', 'rules')
  if (fs.existsSync(rules)) {
    for (const f of fs.readdirSync(rules)) {
      if (f.endsWith('.mdc')) files.push(path.join(rules, f))
    }
  }
  return [...new Set(files)].sort()
}

function lineCount(file) {
  try {
    return fs.readFileSync(file, 'utf8').split('\n').length
  } catch {
    return 0
  }
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function extractHeadings(content) {
  const headings = []
  const counts = new Map()
  for (const line of content.split('\n')) {
    const m = line.match(/^(#{1,6})\s+(.+)$/)
    if (m) {
      let slug = slugify(m[2].trim())
      const n = (counts.get(slug) || 0) + 1
      counts.set(slug, n)
      if (n > 1) slug += `-${n - 1}`
      headings.push(slug)
    }
  }
  return new Set(headings)
}

function checkLineCitations(file, content, rel) {
  const re = /`([^`]+\.(?:ts|tsx|md|mjs|js|json)):(\d+)(?:-(\d+))?`/g
  let m
  while ((m = re.exec(content))) {
    const cited = m[1]
    const start = Number(m[2])
    const end = m[3] ? Number(m[3]) : start
    const candidates = [
      path.resolve(root, cited),
      path.resolve(root, 'src', cited),
      path.resolve(root, 'src/domain', cited),
      path.resolve(root, 'src/domain/sim', cited),
      path.resolve(root, 'test', cited),
    ]
    let resolved = candidates.find((c) => fs.existsSync(c))
    if (!resolved && !cited.includes('/')) {
      continue
    }
    if (!resolved) {
      warnings.push(`${rel}: line-citation ${cited}:${start}${m[3] ? '-' + end : ''} unresolved`)
      continue
    }
    const lc = lineCount(resolved)
    if (start > lc || end > lc || start > end) {
      warnings.push(`${rel}: line-citation ${cited}:${start}-${end} out of range (file has ${lc} lines)`)
    }
  }
}

function checkLinks(file, content, rel) {
  const re = /\[([^\]]*)\]\(([^)]+)\)/g
  let m
  while ((m = re.exec(content))) {
    let target = m[2].trim()
    if (/^(https?:|mailto:|#)/.test(target)) continue
    if (EXEMPT_LINKS.has(target)) continue
    const hashIdx = target.indexOf('#')
    const pathPart = hashIdx >= 0 ? target.slice(0, hashIdx) : target
    const anchor = hashIdx >= 0 ? target.slice(hashIdx + 1) : null
    if (!pathPart && anchor) continue
    const docDir = path.dirname(file)
    const resolved = path.resolve(docDir, pathPart)
    if (!fs.existsSync(resolved)) {
      errors.push(`${rel}: link (${target}) resolved to ${path.relative(root, resolved)} (intended ${pathPart}) missing`)
      continue
    }
    if (anchor && resolved.endsWith('.md')) {
      try {
        const headings = extractHeadings(fs.readFileSync(resolved, 'utf8'))
        if (!headings.has(anchor)) {
          warnings.push(`${rel}: anchor #${anchor} in ${path.relative(root, resolved)} not found`)
        }
      } catch {}
    }
  }
}

function main() {
  const files = collectFiles()
  for (const file of files) {
    let content
    try {
      content = fs.readFileSync(file, 'utf8')
    } catch (e) {
      errors.push(`${path.relative(root, file)}: unreadable (${e.message})`)
      continue
    }
    const rel = path.relative(root, file)
    checkLineCitations(file, content, rel)
    checkLinks(file, content, rel)
  }
  if (warnings.length) {
    console.log('WARNINGS:')
    warnings.sort().forEach((w) => console.log('  ' + w))
  }
  if (errors.length) {
    console.error('ERRORS:')
    errors.sort().forEach((e) => console.error('  ' + e))
    process.exit(1)
  }
  console.log(`OK ${files.length} files scanned`)
}

main()

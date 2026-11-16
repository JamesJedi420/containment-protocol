#!/usr/bin/env node
/**
 * SPE-3757: Documentation link and line-anchor verification.
 * Dependency-free, deterministic, reports only.
 * Covers line-anchored path:line, Markdown link targets, anchors (warning), expanded corpus.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXTENSIONS = ['.md', '.mdc'];
const LINE_CITATION_RE = /`([^`]+?):(\d+)(?:-(\d+))?`/g;
const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
const HEADING_RE = /^#{1,6}\s+(.+)$/gm;
const EXEMPT_PLACEHOLDERS = new Set(['url']);

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'coverage'].includes(entry.name)) continue;
      walk(full, acc);
    } else if (EXTENSIONS.includes(extname(entry.name))) {
      acc.push(full);
    }
  }
  return acc;
}

function slug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function getHeadings(content) {
  const counts = new Map();
  const headings = [];
  for (const m of content.matchAll(HEADING_RE)) {
    const raw = m[1].trim();
    const base = slug(raw);
    const n = (counts.get(base) || 0) + 1;
    counts.set(base, n);
    headings.push(n === 1 ? base : `${base}-${n - 1}`);
  }
  return new Set(headings);
}

function isExternal(target) {
  return /^(https?:|mailto:|#)/.test(target);
}

function isPattern(target) {
  return target.includes('*') || target.includes('**');
}

const files = [
  ...walk(join(ROOT, 'docs')),
  ...walk(join(ROOT, 'architecture')),
  ...walk(join(ROOT, 'planning')),
  ...walk(join(ROOT, '.cursor/rules')),
  ...['AGENTS.md', 'CLAUDE.md', 'README.md', 'SCHEMA_REGISTRY.md', 'SECURITY.md']
    .map(f => join(ROOT, f))
    .filter(existsSync),
];

const failures = [];
const warnings = [];

for (const file of files.sort()) {
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    failures.push(`${relative(ROOT, file)}: unreadable`);
    continue;
  }
  const lines = content.split('\n');
  const headings = getHeadings(content);
  const relFile = relative(ROOT, file);

  // Line-anchored citations
  for (const m of content.matchAll(LINE_CITATION_RE)) {
    const path = m[1];
    const start = Number(m[2]);
    const end = m[3] ? Number(m[3]) : start;
    if (isPattern(path)) continue;
    const resolved = resolve(ROOT, path);
    if (!existsSync(resolved)) {
      failures.push(`${relFile}:${m.index} -> unresolvable path ${path}`);
      continue;
    }
    const targetLines = readFileSync(resolved, 'utf8').split('\n').length;
    if (start > targetLines || end > targetLines || start > end) {
      failures.push(`${relFile} -> ${path}:${start}${m[3] ? '-' + end : ''} line out of range (file has ${targetLines})`);
    }
  }

  // Markdown links
  for (const m of content.matchAll(LINK_RE)) {
    const target = m[2].trim();
    if (isExternal(target) || EXEMPT_PLACEHOLDERS.has(target) || isPattern(target)) continue;
    const [pathPart, frag] = target.split('#');
    if (!pathPart && frag) continue; // same-page fragment
    const intended = pathPart || '.';
    const resolved = resolve(dirname(file), intended);
    if (!existsSync(resolved)) {
      failures.push(`${relFile} -> link intended '${intended}' resolved to missing '${relative(ROOT, resolved)}'`);
      continue;
    }
    if (frag && extname(resolved) === '.md') {
      const targetContent = readFileSync(resolved, 'utf8');
      const targetHeadings = getHeadings(targetContent);
      if (!targetHeadings.has(frag)) {
        warnings.push(`${relFile} -> anchor #${frag} not found in ${relative(ROOT, resolved)}`);
      }
    }
  }
}

if (warnings.length) {
  console.log('WARNINGS:');
  warnings.sort().forEach(w => console.log('  ' + w));
}
if (failures.length) {
  console.log('FAILURES:');
  failures.sort().forEach(f => console.log('  ' + f));
  process.exit(1);
}
console.log('OK doc-links');
process.exit(0);

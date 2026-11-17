#!/usr/bin/env node
/** SPE-3761 — exact direct versions and lockfile agreement; no dependency resolver. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SECTIONS = ['dependencies', 'devDependencies', 'optionalDependencies']
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const isNumeric = (value) => /^\d+$/.test(value)
const isIdentifier = (value) => /^[0-9A-Za-z-]+$/.test(value)
const isNumberIdentifier = (value) => isNumeric(value) && (value === '0' || !value.startsWith('0'))

export function isExactVersion(value) {
  if (typeof value !== 'string' || value.trim() !== value) return false
  const components = value.split('+')
  if (components.length > 2) return false
  if (components.length === 2 && !components[1].split('.').every(isIdentifier)) return false
  const release = components[0]
  const dash = release.indexOf('-')
  const core = dash < 0 ? release : release.slice(0, dash)
  const parts = core.split('.')
  if (parts.length !== 3 || !parts.every(isNumberIdentifier)) return false
  if (dash < 0) return true
  return release
    .slice(dash + 1)
    .split('.')
    .every((part) => isIdentifier(part) && (!isNumeric(part) || isNumberIdentifier(part)))
}

function checkDirectVersion(section, name, direct, locked, packages) {
  const errors = []
  const version = direct?.[name]
  if (!name || !isExactVersion(version)) {
    errors.push(`${section}.${name}: manifest must specify an exact SemVer version`)
  }
  if (
    !Object.hasOwn(direct ?? {}, name) ||
    !Object.hasOwn(locked ?? {}, name) ||
    version !== locked[name]
  ) {
    errors.push(`${section}.${name}: manifest and lockfile root versions disagree`)
  }
  const record = packages[`node_modules/${name}`]
  if (!isRecord(record) || !isExactVersion(record.version)) {
    errors.push(`${section}.${name}: missing or malformed resolved lockfile record`)
  } else if (record.version !== version) {
    errors.push(`${section}.${name}: manifest and resolved lockfile versions disagree`)
  }
  return errors
}

function checkSection(section, direct, locked, packages) {
  if ((direct !== undefined && !isRecord(direct)) || (locked !== undefined && !isRecord(locked))) {
    return [`${section} must be an object in the manifest and lockfile root`]
  }
  const names = new Set([...Object.keys(direct ?? {}), ...Object.keys(locked ?? {})])
  return [...names]
    .sort((a, b) => a.localeCompare(b, 'en'))
    .flatMap((name) => checkDirectVersion(section, name, direct, locked, packages))
}

export function checkDependencyPolicy(manifest, lockfile) {
  if (!isRecord(manifest)) return ['package.json must be an object']
  if (!isRecord(lockfile) || !isRecord(lockfile.packages)) {
    return ['package-lock.json must contain a packages object']
  }
  const root = lockfile.packages['']
  if (!isRecord(root)) return ['package-lock.json is missing its root package record']
  return SECTIONS.flatMap((section) =>
    checkSection(section, manifest[section], root[section], lockfile.packages)
  )
}

export function verifyDependencyPolicy(cwd = process.cwd()) {
  const read = (name) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(cwd, name), 'utf8'))
    } catch (error) {
      throw new Error(`${name}: ${error.message}`, { cause: error })
    }
  }
  return checkDependencyPolicy(read('package.json'), read('package-lock.json'))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const errors = verifyDependencyPolicy()
    if (errors.length) throw new Error(errors.join('\n'))
    console.log('Dependency policy passed: exact direct versions match the lockfile.')
  } catch (error) {
    console.error(`dependency-policy: ${error.message}`)
    process.exitCode = 1
  }
}

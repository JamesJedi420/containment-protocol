#!/usr/bin/env node
/**
 * SPE-3303 — standalone checker for the synthetic instruction-resolution fixtures.
 *
 * What this is: a fixture-suite validator. It checks internal consistency,
 * determinism, canonical-reference integrity, and that symbolic expectations are
 * provable from the declared atom relations.
 *
 * What this is NOT: it is not an instruction resolver, not a learning-state store,
 * not a game engine, and not an enrollment implementation. It never materialises
 * a lesson outcome. A green run means the fixture pack is well formed and
 * self-consistent, not that any implementation is correct.
 *
 * Usage:
 *   node check-instruction-resolution-fixtures.mjs [--pack <path>] [--quiet]
 *
 * Exit codes (mirrors the SPE-3304 validator convention):
 *   0 valid, 1 one or more violations, 2 invalid invocation.
 */

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_PACK = path.join(HERE, 'fixtures', 'instruction-resolution.fixtures.json')

const PACK_VERSION = '1.0.0'
const DISPOSITIONS = new Set([
  'credit_granted',
  'no_progression_change',
  'credit_capped',
  'deferred',
  'not_evaluated',
  'duplicate_suppressed',
  'rejected_unauthorized_makeup',
])
const GRANTING = new Set(['credit_granted', 'deferred', 'credit_capped'])
const NULL_PROGRESSION = new Set([
  'no_progression_change',
  'not_evaluated',
  'duplicate_suppressed',
  'rejected_unauthorized_makeup',
])
const ATTENDANCE_STATUSES = new Set(['present', 'skipped', 'excused', 'unknown'])
const ATTENDANCE_AUTHORITIES = new Set(['caller', 'none'])
const LESSON_EFFECTS = new Set(['advances', 'no_change'])
const PEER_EFFECTS = new Set(['assistance', 'interference'])
const STAT_KEYS = new Set(['combat', 'investigation', 'utility', 'social'])
const EFFICIENCY_BANDS = new Set([0, 1, 2])
const CASE_ID_PATTERN = /^ir-[0-9]{2}-[a-z0-9-]+$/
const SESSION_REF_PATTERN = /^([a-z0-9][a-z0-9-]*)#session-([0-9]+)$/
const EMISSIONS = new Set([
  'enrollment_record',
  'learning_state_snapshot',
  'faculty_quality_score',
  'disciplinary_case',
  'xp_or_level_change',
  'stat_cap_change',
  'game_engine_effect',
])
// Every case must exclude these, whatever else it excludes.
const REQUIRED_EXCLUSIONS = ['enrollment_record', 'learning_state_snapshot']

/** @type {{ rule: string, where: string, detail: string }[]} */
const violations = []

function fail(rule, where, detail) {
  violations.push({ rule, where, detail })
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== ''
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort()
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

// ---------------------------------------------------------------------------
// Symbolic expressions
// ---------------------------------------------------------------------------

/**
 * Parse "E_base + E_prep - E_peer_interfere" into a Map of coefficients.
 * Returns null when a token is not a declared atom. Numeric literals are
 * rejected outright: magnitudes are unapproved, so no constant term can exist.
 */
function parseExpression(expression, atomNames) {
  if (typeof expression !== 'string' || expression.trim() === '') return null
  const tokens = expression.replace(/([+-])/g, ' $1 ').trim().split(/\s+/)

  const coefficients = new Map()
  let sign = 1
  let expectOperand = true

  for (const token of tokens) {
    if (token === '+' || token === '-') {
      if (expectOperand) return null
      sign = token === '-' ? -1 : 1
      expectOperand = true
      continue
    }
    if (!expectOperand) return null
    if (/^[0-9]/.test(token)) return null
    if (!atomNames.has(token)) return null
    coefficients.set(token, (coefficients.get(token) ?? 0) + sign)
    expectOperand = false
  }
  if (expectOperand) return null
  return coefficients
}

function entryExpression(entry, atomNames) {
  const magnitude = entry.expect?.effectStrength
  return magnitude?.symbolic === true ? parseExpression(magnitude.expression, atomNames) : null
}

function subtract(a, b) {
  const coefficients = new Map(a)
  for (const [atom, value] of b) {
    coefficients.set(atom, (coefficients.get(atom) ?? 0) - value)
  }
  return coefficients
}

/**
 * Sufficient (not complete) non-negativity proof.
 *
 * - every negative atom coefficient must be cancellable against a positive
 *   atom coefficient that is declared >= it
 * - a leftover positive coefficient is sound only for an atom declared >= 0
 *
 * Reports "unproven" rather than "false" when it cannot discharge an obligation.
 */
function proveNonNegative(coefficients, atLeast, nonNegative) {
  if (!coefficients) return { proven: false, reason: 'unparseable expression' }

  const remaining = new Map([...coefficients].filter(([, value]) => value !== 0))
  let progressed = true
  while (progressed) {
    progressed = false
    for (const [atom, value] of [...remaining]) {
      if (value >= 0) continue
      for (const [donor, donorValue] of [...remaining]) {
        if (donor === atom || donorValue <= 0) continue
        if (!(atLeast.get(donor)?.has(atom))) continue
        const cancelled = Math.min(donorValue, -value)
        remaining.set(donor, donorValue - cancelled)
        remaining.set(atom, value + cancelled)
        progressed = true
        break
      }
      if (progressed) break
    }
  }

  const left = [...remaining].filter(([, value]) => value !== 0)
  if (left.length === 0) return { proven: true, reason: 'nonnegative after cancellation' }

  const unjustified = left.filter(([atom, value]) => value < 0 || !nonNegative.has(atom))
  if (unjustified.length === 0) {
    return { proven: true, reason: 'all remaining terms are declared non-negative' }
  }
  return {
    proven: false,
    reason: `undischarged coefficients: ${unjustified
      .sort((x, y) => x[0].localeCompare(y[0]))
      .map(([atom, value]) => `${value}*${atom}`)
      .join(', ')}`,
  }
}

// ---------------------------------------------------------------------------
// Atom relations
// ---------------------------------------------------------------------------

const RELATION_PATTERN = /^([A-Za-z_][A-Za-z0-9_]*)\s*(>=|<=|>|<|==)\s*([A-Za-z_][A-Za-z0-9_]*|[0-9]+)$/

function buildAtomModel(atoms) {
  const names = new Set(atoms.map((a) => a.atom))
  /** @type {Map<string, Set<string>>} donor >= target */
  const atLeast = new Map()
  /** @type {Set<string>} atoms proven >= 0 by their own declarations */
  const nonNegative = new Set()
  for (const name of names) atLeast.set(name, new Set())

  for (const atom of atoms) {
    for (const relation of atom.relations ?? []) {
      const match = RELATION_PATTERN.exec(relation.trim())
      if (!match) {
        fail('atom-relation-grammar', `atoms.${atom.atom}`, `unparseable relation ${JSON.stringify(relation)}`)
        continue
      }
      const [, left, op, right] = match
      if (right === '0') {
        if (op === '<' || op === '<=') {
          fail('atom-relation-negative', `atoms.${atom.atom}`, `${relation} forces a credit atom below zero`)
        } else {
          nonNegative.add(left)
        }
        continue
      }
      if (!names.has(left) || !names.has(right)) {
        fail('atom-relation-unknown', `atoms.${atom.atom}`, `${relation} references an undeclared atom`)
        continue
      }
      if (op === '>=' || op === '>') atLeast.get(left).add(right)
      else if (op === '<=' || op === '<') atLeast.get(right).add(left)
      else {
        atLeast.get(left).add(right)
        atLeast.get(right).add(left)
      }
    }
  }

  // Transitive closure.
  let changed = true
  while (changed) {
    changed = false
    for (const [donor, targets] of atLeast) {
      for (const target of [...targets]) {
        for (const further of atLeast.get(target) ?? []) {
          if (!targets.has(further)) {
            targets.add(further)
            changed = true
          }
        }
      }
    }
  }

  for (const [donor, targets] of atLeast) {
    if (targets.has(donor)) {
      fail('atom-relation-cycle', `atoms.${donor}`, 'declared relations imply a self-contradictory ordering')
    }
  }

  // Non-negativity propagates upward through the ordering: if donor >= target
  // and target >= 0, then donor >= 0 as well.
  let nonNegativeChanged = true
  while (nonNegativeChanged) {
    nonNegativeChanged = false
    for (const [donor, targets] of atLeast) {
      if (nonNegative.has(donor)) continue
      for (const target of targets) {
        if (nonNegative.has(target)) {
          nonNegative.add(donor)
          nonNegativeChanged = true
          break
        }
      }
    }
  }

  return { names, atLeast, nonNegative }
}

// ---------------------------------------------------------------------------
// Invariants
// ---------------------------------------------------------------------------

function expressionCoefficient(parsed, atom) {
  return parsed?.get(atom) ?? 0
}

function checkInvariant(name, entry, declaredLesson, atomNames) {
  const { expect, session, attendance, instructorContext, preparation, peers } = entry
  const progression = entry.progressionState ?? {}
  const capacity = declaredLesson.moduleSessionCapacity
  const where = `cases.${entry.caseId}`

  switch (name) {
    case 'credit_within_capacity': {
      if (progression.creditedSessionsBefore + expect.deltaSessions > capacity) {
        fail('invariant-credit_within_capacity', where, 'before + delta exceeds module capacity')
      }
      break
    }
    case 'no_double_credit':
    case 'excused_differs_from_skipped':
    case 'idempotent_by_outcome_ref':
      // Pack-level invariants, discharged by checkNoDoubleCredit,
      // checkExcusedVsSkipped and checkIdempotency.
      break
    case 'no_credit_without_authoritative_presence': {
      if (attendance.authority !== 'caller' && expect.deltaSessions !== 0) {
        fail('invariant-no_credit_without_authoritative_presence', where, 'credit without an authoritative present result')
      }
      break
    }
    case 'makeup_credits_original_session': {
      if (!entry.lesson.makeup) {
        fail('invariant-makeup_credits_original_session', where, 'invariant cited without a makeup block')
        break
      }
      if (expect.progression?.sessionRef !== entry.lesson.makeup.forSessionRef) {
        fail('invariant-makeup_credits_original_session', where, 'expected progression does not credit the original session reference')
      }
      break
    }
    case 'authorized_makeup_requires_authority_ref': {
      if (entry.lesson.makeup?.authorized === true && !isNonEmptyString(entry.lesson.makeup.authorizationRef)) {
        fail('invariant-authorized_makeup_requires_authority_ref', where, 'authorized makeup without an authorizationRef')
      }
      break
    }
    case 'unauthorized_makeup_grants_no_credit': {
      if (entry.lesson.makeup && entry.lesson.makeup.authorized === false) {
        if (expect.deltaSessions !== 0 || expect.progression !== null) {
          fail('invariant-unauthorized_makeup_grants_no_credit', where, 'unauthorized makeup grants credit')
        }
      }
      break
    }
    case 'no_change_lesson_emits_no_delta': {
      if (declaredLesson.sessions.some((s) => s.sessionRef === session.sessionRef && s.lessonEffect === 'no_change')) {
        if (expect.deltaSessions !== 0 || expect.progression !== null) {
          fail('invariant-no_change_lesson_emits_no_delta', where, 'no_change lesson produced a progression delta')
        }
      }
      break
    }
    case 'cap_not_exceeded': {
      if (expect.progression && expect.progression.creditedSessionsAfter > capacity) {
        fail('invariant-cap_not_exceeded', where, 'creditedSessionsAfter exceeds moduleSessionCapacity')
      }
      break
    }
    case 'credited_sessions_never_negative': {
      if (expect.deltaSessions < 0) fail('invariant-credited_sessions_never_negative', where, 'negative deltaSessions')
      if (expect.progression && expect.progression.creditedSessionsAfter < 0) {
        fail('invariant-credited_sessions_never_negative', where, 'negative creditedSessionsAfter')
      }
      break
    }
    case 'no_enrollment_inference': {
      if (entry.enrollment?.supplied === false) {
        if (!GRANTING.has(expect.disposition)) {
          fail('invariant-no_enrollment_inference', where, 'resolution stalls or rejects when enrollment is not supplied')
        }
      }
      break
    }
    case 'attendance_authority_required': {
      if (attendance.authority === 'none' && expect.disposition !== 'not_evaluated') {
        fail('invariant-attendance_authority_required', where, 'missing attendance authority did not resolve to not_evaluated')
      }
      break
    }
    case 'no_disciplinary_output': {
      if (attendance.status === 'skipped' && !expect.mustNotEmit.includes('disciplinary_case')) {
        fail('invariant-no_disciplinary_output', where, 'skipped attendance does not exclude a disciplinary output')
      }
      break
    }
    case 'instructor_effect_nonnegative': {
      const parsed = entryExpression(entry, atomNames)
      if (!parsed) break
      for (const atom of atomNames) {
        if (atom.startsWith('E_instructor_') && expressionCoefficient(parsed, atom) < 0) {
          fail('invariant-instructor_effect_nonnegative', where, `expression subtracts ${atom}`)
        }
      }
      break
    }
    case 'instructor_specialty_must_match_target_stat': {
      const parsed = entryExpression(entry, atomNames)
      if (!parsed) break
      const usesInstructor = [...atomNames].some(
        (atom) => atom.startsWith('E_instructor_') && expressionCoefficient(parsed, atom) !== 0
      )
      if (usesInstructor && instructorContext.specialty !== progression.targetStat) {
        fail(
          'invariant-instructor_specialty_must_match_target_stat',
          where,
          'instructor effect applied although specialty differs from targetStat'
        )
      }
      break
    }
    case 'peer_effect_sign_matches_declared_effect': {
      const parsed = entryExpression(entry, atomNames)
      if (!parsed) break
      for (const peer of peers ?? []) {
        const coefficient = expressionCoefficient(parsed, peer.magnitudeAtom)
        const expected = peer.effect === 'assistance' ? 1 : -1
        if (coefficient !== expected) {
          fail(
            'invariant-peer_effect_sign_matches_declared_effect',
            where,
            `peer ${peer.peerRef} (${peer.effect}) has coefficient ${coefficient} for ${peer.magnitudeAtom}`
          )
        }
      }
      break
    }
    default:
      fail('invariant-unknown', where, `invariant ${JSON.stringify(name)} is not implemented by this checker`)
  }

  // invariant-independent sanity for preparation evidence
  if (preparation?.prepared === true && !isNonEmptyString(preparation.evidenceRef)) {
    fail('preparation-evidence-required', where, 'prepared session without an evidenceRef')
  }
  if (preparation?.prepared === false && preparation.evidenceRef !== null) {
    fail('preparation-evidence-unexpected', where, 'unprepared session supplies an evidenceRef')
  }
}

function checkNoDoubleCredit(pack) {
  const seen = new Map()
  for (const entry of pack.cases) {
    if (entry.replay || entry.expect.deltaSessions <= 0) continue
    const sessionRef = entry.expect.progression?.sessionRef
    if (!sessionRef) continue
    const key = `${entry.identity.learnerRef}|${sessionRef}`
    if (seen.has(key)) {
      fail(
        'invariant-no_double_credit',
        `cases.${entry.caseId}`,
        `second session of credit for ${key} (also ${seen.get(key)})`
      )
    } else {
      seen.set(key, entry.caseId)
    }
  }
}

function checkExcusedVsSkipped(pack) {
  const skipped = pack.cases.filter((c) => c.attendance.status === 'skipped')
  const excused = pack.cases.filter((c) => c.attendance.status === 'excused')
  if (skipped.length === 0 || excused.length === 0) return
  for (const c of skipped) {
    if (c.expect.progression !== null) {
      fail('invariant-excused_differs_from_skipped', `cases.${c.caseId}`, 'skipped attendance carries a progression reference')
    }
  }
  for (const c of excused) {
    if (c.expect.progression?.status !== 'pending_makeup') {
      fail('invariant-excused_differs_from_skipped', `cases.${c.caseId}`, 'excused attendance does not defer to pending_makeup')
    }
    if (c.expect.deltaSessions !== 0) {
      fail('invariant-excused_differs_from_skipped', `cases.${c.caseId}`, 'excused attendance granted credit before a makeup')
    }
  }
}

function checkIdempotency(pack) {
  const byOutcome = new Map()
  for (const entry of pack.cases) {
    if (entry.replay) continue
    const ref = entry.attendance.outcomeRef
    if (!ref) continue
    if (!byOutcome.has(ref)) byOutcome.set(ref, [])
    byOutcome.get(ref).push(entry)
  }
  for (const [ref, entries] of byOutcome) {
    if (entries.length < 2) continue
    const ordered = [...entries].sort((a, b) => a.session.evaluationOrdinal - b.session.evaluationOrdinal)
    for (const later of ordered.slice(1)) {
      if (later.expect.deltaSessions !== 0) {
        fail(
          'invariant-idempotent_by_outcome_ref',
          `cases.${later.caseId}`,
          `re-delivered outcome ${ref} granted credit again`
        )
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Pack validation
// ---------------------------------------------------------------------------

function validatePack(pack) {
  if (!isPlainObject(pack)) {
    fail('pack-shape', 'pack', 'top level must be a JSON object')
    return
  }
  if (pack.fixtureVersion !== PACK_VERSION) {
    fail('pack-version', 'pack.fixtureVersion', `expected ${PACK_VERSION}, saw ${JSON.stringify(pack.fixtureVersion)}`)
  }
  if (!isNonEmptyString(pack.fixturePack) || !isNonEmptyString(pack.owner)) {
    fail('pack-shape', 'pack', 'fixturePack and owner must be non-empty strings')
  }

  const authority = pack.authority ?? {}
  const expectedAuthority = {
    attendance: 'caller_supplied_authoritative_result',
    enrollment: 'not_implemented_out_of_scope',
    numericEffectMagnitudes: 'unapproved',
    gradingFormula: 'unapproved',
  }
  for (const [key, value] of Object.entries(expectedAuthority)) {
    if (authority[key] !== value) {
      fail('authority-declaration', `authority.${key}`, `expected ${JSON.stringify(value)}, saw ${JSON.stringify(authority[key])}`)
    }
  }

  const idPattern = pack.canonicalSpaces?.stableId?.pattern
  if (typeof idPattern !== 'string') {
    fail('canonical-space', 'canonicalSpaces.stableId', 'missing stable-id pattern')
    return
  }
  let idRegex
  try {
    idRegex = new RegExp(idPattern)
  } catch {
    fail('canonical-space', 'canonicalSpaces.stableId.pattern', 'pattern does not compile')
    return
  }

  const declaredStats = new Set(pack.canonicalSpaces?.statKey?.allowed ?? [])
  for (const stat of STAT_KEYS) {
    if (!declaredStats.has(stat)) {
      fail('canonical-space', 'canonicalSpaces.statKey.allowed', `missing ${stat}`)
    }
  }
  const declaredBands = new Set(pack.canonicalSpaces?.efficiencyBand?.allowed ?? [])
  for (const band of EFFICIENCY_BANDS) {
    if (!declaredBands.has(band)) fail('canonical-space', 'canonicalSpaces.efficiencyBand.allowed', `missing band ${band}`)
  }

  // Atoms
  const atoms = Array.isArray(pack.atoms) ? pack.atoms : []
  if (atoms.length === 0) fail('atoms', 'atoms', 'at least one symbolic atom is required')
  const atomNames = new Set()
  for (const atom of atoms) {
    if (!isNonEmptyString(atom.atom) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(atom.atom)) {
      fail('atom-grammar', 'atoms', `invalid atom name ${JSON.stringify(atom.atom)}`)
      continue
    }
    if (atomNames.has(atom.atom)) fail('atom-duplicate', `atoms.${atom.atom}`, 'duplicate atom')
    atomNames.add(atom.atom)
    if (atom.approval !== 'unapproved_magnitude') {
      fail('atom-approval', `atoms.${atom.atom}`, 'credit atoms must declare unapproved_magnitude')
    }
    if (!Array.isArray(atom.relations) || atom.relations.length === 0) {
      fail('atom-relations', `atoms.${atom.atom}`, 'at least one ordering relation is required')
    }
  }
  const { atLeast, nonNegative } = buildAtomModel(atoms)

  // Enums
  const dispositions = new Set(pack.dispositions ?? [])
  for (const d of DISPOSITIONS) if (!dispositions.has(d)) fail('enum', 'dispositions', `missing ${d}`)
  for (const status of ATTENDANCE_STATUSES) {
    if (!(pack.attendanceStatuses ?? []).includes(status)) fail('enum', 'attendanceStatuses', `missing ${status}`)
  }
  for (const a of ATTENDANCE_AUTHORITIES) {
    if (!(pack.attendanceAuthorities ?? []).includes(a)) fail('enum', 'attendanceAuthorities', `missing ${a}`)
  }
  for (const e of LESSON_EFFECTS) {
    if (!(pack.lessonEffects ?? []).includes(e)) fail('enum', 'lessonEffects', `missing ${e}`)
  }
  const declaredEmissions = new Set(pack.disallowedEmissions ?? [])
  for (const emission of declaredEmissions) {
    if (!EMISSIONS.has(emission)) {
      fail('enum', 'disallowedEmissions', `unrecognised emission ${JSON.stringify(emission)}`)
    }
  }
  for (const emission of REQUIRED_EXCLUSIONS) {
    if (!declaredEmissions.has(emission)) fail('enum', 'disallowedEmissions', `missing ${emission}`)
  }

  const requiredClasses = pack.requiredClasses ?? []
  if (!Array.isArray(requiredClasses) || requiredClasses.length === 0) {
    fail('classes', 'requiredClasses', 'a declared class list is required')
  }
  const classes = new Set(requiredClasses)

  // Lessons
  const lessonByModule = new Map()
  const sessionEffectLookup = new Map()
  const courseRefs = new Set()
  for (const lesson of pack.lessons ?? []) {
    if (!idRegex.test(lesson.courseRef ?? '')) fail('id-grammar', 'lessons.courseRef', `invalid ${JSON.stringify(lesson.courseRef)}`)
    if (!idRegex.test(lesson.moduleRef ?? '')) fail('id-grammar', 'lessons.moduleRef', `invalid ${JSON.stringify(lesson.moduleRef)}`)
    if (lessonByModule.has(lesson.moduleRef)) fail('lesson-duplicate', `lessons.${lesson.moduleRef}`, 'duplicate module')
    if (!Array.isArray(lesson.sessions) || lesson.sessions.length === 0) {
      fail('lesson-shape', `lessons.${lesson.moduleRef}`, 'sessions must be a non-empty array')
      continue
    }
    if (lesson.moduleSessionCapacity !== lesson.sessions.length) {
      fail('lesson-capacity', `lessons.${lesson.moduleRef}`, 'moduleSessionCapacity must equal the declared session count')
    }
    lessonByModule.set(lesson.moduleRef, lesson)
    courseRefs.add(lesson.courseRef)
    const indexes = new Set()
    for (const s of lesson.sessions) {
      const match = SESSION_REF_PATTERN.exec(s.sessionRef ?? '')
      if (!match) {
        fail('session-ref-grammar', `lessons.${lesson.moduleRef}`, `invalid sessionRef ${JSON.stringify(s.sessionRef)}`)
        continue
      }
      if (match[1] !== lesson.moduleRef) {
        fail('session-ref-grammar', `lessons.${lesson.moduleRef}`, 'sessionRef module segment does not match moduleRef')
      }
      if (Number(match[2]) !== s.index) {
        fail('session-ref-grammar', `lessons.${lesson.moduleRef}`, 'sessionRef ordinal does not match index')
      }
      if (indexes.has(s.index)) fail('session-duplicate', `lessons.${lesson.moduleRef}`, `duplicate index ${s.index}`)
      indexes.add(s.index)
      if (!LESSON_EFFECTS.has(s.lessonEffect)) {
        fail('lesson-effect', `lessons.${lesson.moduleRef}`, `unknown lessonEffect ${JSON.stringify(s.lessonEffect)}`)
      }
      sessionEffectLookup.set(s.sessionRef, s.lessonEffect)
    }
  }

  // Invariant registry
  const invariantIds = new Set((pack.invariants ?? []).map((i) => i.id))
  const citedInvariants = new Set()

  // Cases
  const cases = Array.isArray(pack.cases) ? pack.cases : []
  if (cases.length < 10) fail('case-count', 'cases', `at least 10 cases required, saw ${cases.length}`)
  const caseById = new Map()
  let previousId = ''
  const seenClasses = new Set()

  for (const entry of cases) {
    const where = `cases.${entry.caseId ?? '<missing-id>'}`
    if (!isNonEmptyString(entry.caseId) || !CASE_ID_PATTERN.test(entry.caseId)) {
      fail('case-id-grammar', where, 'caseId must match ir-<two digits>-<slug>')
      continue
    }
    if (caseById.has(entry.caseId)) fail('case-id-duplicate', where, 'duplicate caseId')
    if (entry.caseId < previousId) fail('case-ordering', where, 'cases must be sorted by caseId')
    previousId = entry.caseId
    caseById.set(entry.caseId, entry)
    seenClasses.add(entry.class)

    if (!classes.has(entry.class)) fail('case-class', where, `undeclared class ${JSON.stringify(entry.class)}`)
    if (!idRegex.test(entry.identity?.learnerRef ?? '')) {
      fail('id-grammar', `${where}.identity.learnerRef`, 'learnerRef must match the canonical stable-id grammar')
    }
    if (!courseRefs.has(entry.lesson?.courseRef)) {
      fail('lesson-reference', `${where}.lesson.courseRef`, 'courseRef is not declared in lessons')
    }
    const declaredLesson = lessonByModule.get(entry.lesson?.moduleRef)
    if (!declaredLesson) {
      fail('lesson-reference', `${where}.lesson.moduleRef`, 'moduleRef is not declared in lessons')
      continue
    }
    if (declaredLesson.courseRef !== entry.lesson.courseRef) {
      fail('lesson-reference', `${where}.lesson.courseRef`, 'moduleRef belongs to a different courseRef')
    }

    // Session reference
    const sessionMatch = SESSION_REF_PATTERN.exec(entry.session?.sessionRef ?? '')
    if (!sessionMatch) {
      fail('session-ref', `${where}.session.sessionRef`, 'sessionRef must be moduleRef#session-<n>')
    } else if (sessionMatch[1] !== entry.lesson.moduleRef) {
      fail('session-ref', `${where}.session.sessionRef`, 'sessionRef must belong to the case moduleRef')
    }
    if (!sessionEffectLookup.has(entry.session?.sessionRef)) {
      fail('lesson-reference', `${where}.session.sessionRef`, 'sessionRef is not declared on the module')
    }
    if (!Number.isInteger(entry.session?.evaluationOrdinal) || entry.session.evaluationOrdinal < 1) {
      fail('session-ordinal', `${where}.session.evaluationOrdinal`, 'evaluationOrdinal must be an integer >= 1')
    }

    // Attendance
    if (!ATTENDANCE_AUTHORITIES.has(entry.attendance?.authority)) {
      fail('attendance-authority', `${where}.attendance.authority`, `unknown authority ${JSON.stringify(entry.attendance?.authority)}`)
    }
    if (!ATTENDANCE_STATUSES.has(entry.attendance?.status)) {
      fail('attendance-status', `${where}.attendance.status`, `unknown status ${JSON.stringify(entry.attendance?.status)}`)
    }
    if (entry.attendance?.authority === 'none') {
      if (entry.attendance.outcomeRef !== null) {
        fail('attendance-authority', `${where}.attendance.outcomeRef`, 'authority none must not carry an outcomeRef')
      }
    } else if (!isNonEmptyString(entry.attendance?.outcomeRef)) {
      fail('attendance-authority', `${where}.attendance.outcomeRef`, 'caller authority requires an outcomeRef')
    }

    // Makeup block
    if (entry.lesson.makeup) {
      const makeup = entry.lesson.makeup
      if (!sessionEffectLookup.has(makeup.forSessionRef)) {
        fail('makeup-reference', `${where}.lesson.makeup.forSessionRef`, 'makeup target is not a declared session of this module')
      } else if (!makeup.forSessionRef.startsWith(`${entry.lesson.moduleRef}#`)) {
        fail('makeup-reference', `${where}.lesson.makeup.forSessionRef`, 'makeup target belongs to a different module')
      }
    }

    // Instructor context
    const instructor = entry.instructorContext ?? {}
    if (instructor.assigned === false) {
      if (instructor.specialty !== null || instructor.efficiencyBand !== null) {
        fail('instructor-shape', `${where}.instructorContext`, 'unassigned instructor context must be null-valued')
      }
    } else {
      if (!STAT_KEYS.has(instructor.specialty)) {
        fail('instructor-specialty', `${where}.instructorContext.specialty`, 'specialty must be a canonical stat key')
      }
      if (!EFFICIENCY_BANDS.has(instructor.efficiencyBand)) {
        fail('instructor-band', `${where}.instructorContext.efficiencyBand`, 'efficiencyBand must be 0, 1 or 2')
      }
    }
    if (!STAT_KEYS.has(entry.progressionState?.targetStat)) {
      fail('target-stat', `${where}.progressionState.targetStat`, 'targetStat must be a canonical stat key')
    }
    if (
      !Number.isInteger(entry.progressionState?.creditedSessionsBefore) ||
      entry.progressionState.creditedSessionsBefore < 0
    ) {
      fail('progression-state', `${where}.progressionState.creditedSessionsBefore`, 'must be a non-negative integer')
    }

    // Peers
    const peerAtoms = new Set()
    for (const peer of entry.peers ?? []) {
      if (!idRegex.test(peer.peerRef ?? '')) {
        fail('id-grammar', `${where}.peers.peerRef`, 'peerRef must match the canonical stable-id grammar')
      }
      if (!PEER_EFFECTS.has(peer.effect)) {
        fail('peer-effect', `${where}.peers.effect`, `unknown effect ${JSON.stringify(peer.effect)}`)
      }
      const expectedAtom = peer.effect === 'assistance' ? 'E_peer_assist' : 'E_peer_interfere'
      if (peer.magnitudeAtom !== expectedAtom) {
        fail('peer-effect', `${where}.peers.magnitudeAtom`, `${peer.effect} must use ${expectedAtom}`)
      }
      if (peerAtoms.has(expectedAtom)) {
        fail('peer-effect', `${where}.peers`, `two peers share atom ${expectedAtom}; fixtures keep one atom per direction`)
      }
      peerAtoms.add(expectedAtom)
    }

    // Expectation
    const expect = entry.expect ?? {}
    if (!DISPOSITIONS.has(expect.disposition)) {
      fail('disposition', `${where}.expect.disposition`, `unknown disposition ${JSON.stringify(expect.disposition)}`)
    }
    if (!Number.isInteger(expect.deltaSessions) || expect.deltaSessions < 0) {
      fail('delta', `${where}.expect.deltaSessions`, 'deltaSessions must be a non-negative integer')
    }
    if (expect.disposition === 'credit_granted' && expect.deltaSessions !== 1) {
      fail('delta', `${where}.expect.deltaSessions`, 'credit_granted must grant exactly one session-equivalent')
    }
    if (expect.disposition !== 'credit_granted' && expect.deltaSessions !== 0) {
      fail('delta', `${where}.expect.deltaSessions`, `${expect.disposition} must not grant a session-equivalent`)
    }

    if (NULL_PROGRESSION.has(expect.disposition)) {
      if (expect.progression !== null) {
        fail('progression-shape', `${where}.expect.progression`, `${expect.disposition} must not return a progression reference`)
      }
    } else {
      if (!isPlainObject(expect.progression)) {
        fail('progression-shape', `${where}.expect.progression`, `${expect.disposition} requires a progression object`)
      } else {
        if (!sessionEffectLookup.has(expect.progression.sessionRef)) {
          fail('progression-shape', `${where}.expect.progression.sessionRef`, 'unresolvable progression reference')
        }
        const before = entry.progressionState.creditedSessionsBefore
        if (expect.disposition === 'credit_granted') {
          if (expect.progression.status !== 'credited') {
            fail('progression-status', `${where}.expect.progression.status`, 'credit_granted requires status credited')
          }
          if (expect.progression.creditedSessionsAfter !== before + expect.deltaSessions) {
            fail('progression-arithmetic', `${where}.expect.progression.creditedSessionsAfter`, 'must equal before + delta')
          }
        }
        if (expect.disposition === 'credit_capped') {
          if (expect.progression.status !== 'already_credited') {
            fail('progression-status', `${where}.expect.progression.status`, 'credit_capped requires status already_credited')
          }
          if (expect.progression.creditedSessionsAfter !== before) {
            fail('progression-arithmetic', `${where}.expect.progression.creditedSessionsAfter`, 'cap must not change the total')
          }
        }
        if (expect.disposition === 'deferred') {
          if (expect.progression.status !== 'pending_makeup') {
            fail('progression-status', `${where}.expect.progression.status`, 'deferred requires status pending_makeup')
          }
          if (expect.progression.creditedSessionsAfter !== before) {
            fail('progression-arithmetic', `${where}.expect.progression.creditedSessionsAfter`, 'deferral must not change the total')
          }
        }
      }
    }

    // Effect strength
    const magnitude = expect.effectStrength
    if (expect.disposition === 'credit_granted') {
      if (!isPlainObject(magnitude) || magnitude.symbolic !== true || magnitude.approval !== 'unapproved') {
        fail('magnitude', `${where}.expect.effectStrength`, 'credit_granted requires an unapproved symbolic magnitude')
      } else if (!parseExpression(magnitude.expression, atomNames)) {
        fail(
          'magnitude-expression',
          `${where}.expect.effectStrength.expression`,
          'expression must use declared atoms only, with no numeric literals'
        )
      }
    } else if (magnitude !== null) {
      fail('magnitude', `${where}.expect.effectStrength`, `${expect.disposition} must not assert an effect magnitude`)
    }

    // Emissions
    if (!Array.isArray(expect.mustNotEmit)) {
      fail('emissions', `${where}.expect.mustNotEmit`, 'mustNotEmit must be an array')
    } else {
      for (const emission of expect.mustNotEmit) {
        if (!declaredEmissions.has(emission)) {
          fail('emissions', `${where}.expect.mustNotEmit`, `emission ${JSON.stringify(emission)} is not in the pack's disallowedEmissions`)
        }
      }
      for (const required of REQUIRED_EXCLUSIONS) {
        if (!expect.mustNotEmit.includes(required)) {
          fail('emissions', `${where}.expect.mustNotEmit`, `every case must exclude ${required}`)
        }
      }
    }

    // Invariants
    for (const name of expect.invariants ?? []) {
      if (!invariantIds.has(name)) {
        fail('invariant-unknown', `${where}.expect.invariants`, `${name} is not declared in the pack registry`)
        continue
      }
      citedInvariants.add(name)
      checkInvariant(name, entry, declaredLesson, atomNames)
    }

    // Properties
    for (const property of expect.properties ?? []) {
      validateProperty(property, where, caseById, atomNames)
    }
  }

  // Required class coverage
  for (const required of requiredClasses) {
    if (!seenClasses.has(required)) {
      fail('class-coverage', 'requiredClasses', `no case covers ${required}`)
    }
  }

  // Registry hygiene: a declared invariant that no case cites is unverifiable.
  for (const id of invariantIds) {
    if (!citedInvariants.has(id)) {
      fail('invariant-uncited', `invariants.${id}`, 'declared invariant is not cited by any case')
    }
  }

  // Cross-case checks
  checkNoDoubleCredit(pack)
  checkExcusedVsSkipped(pack)
  checkIdempotency(pack)
  checkReplays(pack)
  checkPropertyProofs(pack, atomNames, atLeast, nonNegative, caseById)
}

function validateProperty(property, where, caseById, atomNames) {
  const id = property.id ?? '<missing-id>'
  if (!isNonEmptyString(id)) fail('property-id', `${where}.expect.properties`, 'property requires an id')
  if (property.kind !== 'structural' && !isNonEmptyString(property.statement)) {
    fail('property-statement', `${where}.expect.properties.${id}`, 'order property requires a statement')
  }
  if (property.kind === 'structural') {
    if (!isNonEmptyString(property.assert)) {
      fail('property-assert', `${where}.expect.properties.${id}`, 'structural property requires an assert string')
    }
    return
  }
  if (property.kind !== 'order') {
    fail('property-kind', `${where}.expect.properties.${id}`, `unknown kind ${JSON.stringify(property.kind)}`)
    return
  }
  if (!['>=', '<=', '=='].includes(property.op)) {
    fail('property-op', `${where}.expect.properties.${id}`, `unsupported op ${JSON.stringify(property.op)}`)
  }
  if (property.basis !== 'symbolic') {
    fail('property-basis', `${where}.expect.properties.${id}`, 'order properties must be symbolic')
  }
  for (const side of ['lhs', 'rhs']) {
    const ref = property[side]
    if (!isPlainObject(ref) || !isNonEmptyString(ref.case) || ref.field !== 'effectStrength') {
      fail('property-ref', `${where}.expect.properties.${id}.${side}`, 'must reference { case, field: "effectStrength" }')
      continue
    }
    if (!caseById.has(ref.case)) {
      fail('property-ref', `${where}.expect.properties.${id}.${side}.case`, `unknown case ${ref.case}`)
    }
  }
  for (const atom of property.atoms ?? []) {
    if (!atomNames.has(atom)) {
      fail('property-atom', `${where}.expect.properties.${id}.atoms`, `undeclared atom ${atom}`)
    }
  }
}

function checkPropertyProofs(pack, atomNames, atLeast, nonNegative, caseById) {
  const expressionFor = (caseId) => {
    const entry = caseById.get(caseId)
    return entry ? entryExpression(entry, atomNames) : null
  }

  for (const entry of pack.cases) {
    for (const property of entry.expect?.properties ?? []) {
      if (property.kind !== 'order') continue
      const lhs = expressionFor(property.lhs?.case)
      const rhs = expressionFor(property.rhs?.case)
      if (!lhs || !rhs) {
        fail(
          'property-proof',
          `cases.${entry.caseId}.${property.id}`,
          'order property references a case without a symbolic magnitude'
        )
        continue
      }
      const checks = []
      if (property.op === '>=') checks.push(subtract(lhs, rhs))
      else if (property.op === '<=') checks.push(subtract(rhs, lhs))
      else {
        checks.push(subtract(lhs, rhs))
        checks.push(subtract(rhs, lhs))
      }
      for (const diff of checks) {
        const proof = proveNonNegative(diff, atLeast, nonNegative)
        if (!proof.proven) {
          fail(
            'property-unproven',
            `cases.${entry.caseId}.${property.id}`,
            `cannot prove ${property.op} from atom relations (${proof.reason})`
          )
        }
      }
    }
  }
}

function checkReplays(pack) {
  const caseById = new Map(pack.cases.map((c) => [c.caseId, c]))
  const replays = pack.cases.filter((c) => c.replay)
  if (replays.length === 0) fail('replay-coverage', 'cases', 'the pack must include at least one replay case')

  for (const replay of replays) {
    const where = `cases.${replay.caseId}`
    const base = caseById.get(replay.replay?.of)
    if (!base) {
      fail('replay-reference', `${where}.replay.of`, `unknown base case ${JSON.stringify(replay.replay?.of)}`)
      continue
    }
    if (!Number.isInteger(replay.replay?.ordinal) || replay.replay.ordinal < 1) {
      fail('replay-ordinal', `${where}.replay.ordinal`, 'replay ordinal must be an integer >= 1')
    }
    if (base.class === 'replay') {
      fail('replay-reference', `${where}.replay.of`, 'a replay must reference a non-replay case')
    }

    const stripReplay = (entry) => {
      const copy = JSON.parse(JSON.stringify(entry))
      delete copy.replay
      delete copy.caseId
      delete copy.class
      return copy
    }
    if (stableStringify(stripReplay(base)) !== stableStringify(stripReplay(replay))) {
      fail('replay-divergence', where, 'replay inputs or expectation diverge from the base case')
    }
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function printUsage() {
  process.stderr.write('Usage: node check-instruction-resolution-fixtures.mjs [--pack <path>] [--quiet]\n')
}

function main(argv) {
  let packPath = DEFAULT_PACK
  let quiet = false

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--pack') {
      if (!argv[i + 1]) {
        printUsage()
        return 2
      }
      packPath = path.resolve(argv[i + 1])
      i += 1
      continue
    }
    if (arg === '--quiet') {
      quiet = true
      continue
    }
    if (arg === '--help' || arg === '-h') {
      printUsage()
      return 0
    }
    printUsage()
    return 2
  }

  let raw
  try {
    raw = fs.readFileSync(packPath, 'utf8')
  } catch (error) {
    process.stderr.write(`cannot read pack: ${error instanceof Error ? error.message : String(error)}\n`)
    return 2
  }

  let pack
  try {
    pack = JSON.parse(raw)
  } catch (error) {
    process.stdout.write(`pack — malformed-json — ${error instanceof Error ? error.message : String(error)}\n`)
    return 1
  }

  validatePack(pack)

  if (violations.length > 0) {
    const sorted = [...violations].sort(
      (a, b) => a.where.localeCompare(b.where) || a.rule.localeCompare(b.rule) || a.detail.localeCompare(b.detail)
    )
    process.stdout.write(sorted.map((v) => `${v.where} — ${v.rule} — ${v.detail}`).join('\n') + '\n')
    process.stdout.write(`FAIL ${sorted.length} violation(s)\n`)
    return 1
  }

  if (!quiet) {
    const cases = pack.cases ?? []
    const orderProperties = cases.flatMap((c) => (c.expect?.properties ?? []).filter((p) => p.kind === 'order'))
    const structuralProperties = cases.flatMap((c) => (c.expect?.properties ?? []).filter((p) => p.kind === 'structural'))
    const hash = crypto.createHash('sha256').update(stableStringify(pack)).digest('hex')
    const classes = [...new Set(cases.map((c) => c.class))].sort()

    process.stdout.write(`pack: ${pack.fixturePack} v${pack.fixtureVersion}\n`)
    process.stdout.write(`cases: ${cases.length}\n`)
    process.stdout.write(`classes: ${classes.join(', ')}\n`)
    process.stdout.write(`order properties proven: ${orderProperties.length}\n`)
    process.stdout.write(`structural properties (human-asserted): ${structuralProperties.length}\n`)
    process.stdout.write(`atoms: ${(pack.atoms ?? []).map((a) => a.atom).join(', ')}\n`)
    process.stdout.write(`effect magnitudes: symbolic, unapproved\n`)
    process.stdout.write(`content hash: sha256:${hash}\n`)
    process.stdout.write('OK\n')
  }

  return 0
}

process.exitCode = main(process.argv.slice(2))

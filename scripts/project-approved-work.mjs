/**
 * SPE-3338: read-only projection of an independently exported, complete Linear authority snapshot.
 * No repository queue text is accepted as authority. Missing/incomplete snapshots fail closed.
 * Usage: node scripts/project-approved-work.mjs <linear-snapshot.json> [--check|--write]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const WORKSTREAMS = new Set(['CP-core', 'Academy', 'shared-system', 'cross-project'])
const TERMINAL = new Set(['completed', 'canceled'])
const READY = new Set(['backlog', 'unstarted', 'started'])
const issueId = value => typeof value === 'string' && /^[A-Z]+-\d+$/.test(value)
const ordered = (a,b) => a.localeCompare(b, 'en')
const unique = list => [...new Set(list)].sort(ordered)
const invariant = (ok, message) => { if (!ok) throw new Error('authority incomplete: ' + message) }
const statusOf = issue => issue.statusType
export function projectApprovedWork(snapshot) {
  invariant(snapshot && snapshot.source === 'Linear' && snapshot.complete === true, 'requires complete Linear source')
  invariant(typeof snapshot.asOf === 'string' && Number.isFinite(Date.parse(snapshot.asOf)), 'missing snapshot timestamp')
  invariant(Array.isArray(snapshot.issues), 'missing issues')
  invariant(snapshot.workstreamCoverage === 'all-approved', 'incomplete workstream coverage')
  invariant(snapshot.relationCoverage === 'complete', 'incomplete relation coverage')
  const byId = new Map()
  for (const row of snapshot.issues) {
    invariant(row && issueId(row.id) && !byId.has(row.id), 'invalid or duplicate issue')
    invariant(row.approved === true, row.id + ' has unverified approval')
    invariant(WORKSTREAMS.has(row.workstream), row.id + ' missing approved workstream')
    invariant(typeof row.statusType === 'string' && (TERMINAL.has(row.statusType) || READY.has(row.statusType)), row.id + ' unknown lifecycle')
    invariant(Number.isInteger(row.priority) && row.priority >= 0 && row.priority <= 4, row.id + ' invalid Linear priority')
    invariant(Array.isArray(row.blockedBy) && Array.isArray(row.dependsOn), row.id + ' missing relation coverage')
    invariant([...row.blockedBy, ...row.dependsOn].every(issueId), row.id + ' invalid relations')
    invariant(['unstarted','partial','merged','current-main','superseded','missing','evidence-conflicted'].includes(row.implementationEvidence?.state), row.id + ' missing implementation evidence')
    invariant(typeof row.evidenceDrift === 'boolean', row.id + ' missing SPE-3276 classification')
    byId.set(row.id, row)
  }
  const active=[], history=[], runnable=[]
  for (const row of [...byId.values()].sort((a,b)=>ordered(a.id,b.id))) {
    const reasons=[]
    if (!TERMINAL.has(statusOf(row))) {
      if (row.evidenceDrift || row.implementationEvidence.state === 'evidence-conflicted') reasons.push('evidence-conflicted')
      for (const dep of unique([...row.blockedBy,...row.dependsOn])) {
        const prerequisite = byId.get(dep)
        invariant(prerequisite, row.id + ' references absent ' + dep)
        if (prerequisite.evidenceDrift || prerequisite.implementationEvidence.state === 'evidence-conflicted') reasons.push('dependency-evidence-conflicted:' + dep)
        if (prerequisite.statusType !== 'completed') reasons.push('dependency-not-completed:' + dep)
      }
      const record={id:row.id,workstream:row.workstream,statusType:row.statusType,priority:row.priority,blockedBy:unique(row.blockedBy),dependsOn:unique(row.dependsOn),implementationEvidence:row.implementationEvidence,readiness:reasons.length?'non-runnable':'runnable',reasons:unique(reasons)}
      active.push(record)
      if (!reasons.length) runnable.push(record)
    } else history.push({id:row.id,workstream:row.workstream,statusType:row.statusType,implementationEvidence:row.implementationEvidence})
  }
  runnable.sort((a,b)=>(a.priority===0?5:a.priority)-(b.priority===0?5:b.priority)||ordered(a.id,b.id))
  return {schemaVersion:1,source:'Linear',asOf:snapshot.asOf,workstreamCoverage:snapshot.workstreamCoverage,active,history,runnable}
}
export const serializeProjection = projection => JSON.stringify(projection,null,2)+'\n'
export function filterWorkstream(projection, workstream) {
  invariant(WORKSTREAMS.has(workstream), 'unknown workstream')
  return {...projection,active:projection.active.filter(row=>row.workstream===workstream),history:projection.history.filter(row=>row.workstream===workstream),runnable:projection.runnable.filter(row=>row.workstream===workstream)}
}
const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invoked) {
  try {
    const [input,flag='--check']=process.argv.slice(2)
    if (!input || !['--check','--write'].includes(flag)) throw new Error('usage: project-approved-work.mjs <complete-linear-snapshot.json> [--check|--write]')
    const snapshot=JSON.parse(fs.readFileSync(input,'utf8'))
    const text=serializeProjection(projectApprovedWork(snapshot))
    const output=path.resolve('planning/approved-work-projection.json')
    if (flag==='--write') {
      fs.writeFileSync(output,text)
      console.log('authoritative projection written:',output)
    } else {
      invariant(fs.existsSync(output) && fs.readFileSync(output,'utf8')===text,'projection drift: regenerate from current authoritative Linear snapshot')
      console.log('authoritative projection matches complete snapshot')
    }
  } catch(error) {console.error(error.message);process.exitCode=1}
}

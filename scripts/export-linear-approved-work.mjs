/**
 * SPE-3338 read-only Linear GraphQL ingestion. Does not decide approval or evidence drift.
 * LINEAR_API_KEY and LINEAR_PROJECT_IDS (comma-separated, explicitly approved coverage).
 * Usage: node scripts/export-linear-approved-work.mjs <spe-3276-evidence.json> [output-path]
 */
import fs from 'node:fs'
import {pathToFileURL} from 'node:url'
import {projectApprovedWork, serializeProjection} from './project-approved-work.mjs'
const error = message => { throw new Error('Linear authority unavailable: '+message) }
const WORKSTREAMS = ['CP-core','Academy','shared-system','cross-project']
const QUERY = `query ApprovedIssues($project: String!, $after: String) {
  project(id:$project) { id name issues(first:100, after:$after, includeArchived:false) {
    pageInfo {hasNextPage endCursor}
    nodes {identifier id title priority
      state {type} labels {nodes {name}}
      relations(first:100) {pageInfo {hasNextPage} nodes {type relatedIssue {identifier}}}
      inverseRelations(first:100) {pageInfo {hasNextPage} nodes {type issue {identifier}}}
    }
  }}
}`
export function normalizeLinearIssues(projectPages, evidence, asOf, coverage, fetchedProjectIds=coverage?.projectIds) {
  if(!coverage || coverage.source !== 'approved-planning' || coverage.complete !== true || !Array.isArray(coverage.issueIds) || !coverage.issueIds.length || new Set(coverage.issueIds).size!==coverage.issueIds.length || !Array.isArray(coverage.projectIds) || !coverage.projectIds.length || new Set(coverage.projectIds).size!==coverage.projectIds.length) error('missing independently verified approved-work coverage')
  if (!Array.isArray(fetchedProjectIds) || JSON.stringify([...fetchedProjectIds].sort())!==JSON.stringify([...coverage.projectIds].sort()) || projectPages.length!==fetchedProjectIds.length) error('project IDs differ from approved planning inventory')
  if (!evidence || evidence.source !== 'SPE-3276' || evidence.complete !== true || !evidence.issues || typeof evidence.issues !== 'object' || Array.isArray(evidence.issues) || Object.keys(evidence.issues).length===0) error('SPE-3276 classification coverage not attested')
  const byId=new Map()
  for (const page of projectPages) for (const row of page) {
    if (!row || !/^[A-Z]+-\d+$/.test(row.identifier) || !row.state?.type || !Array.isArray(row.labels?.nodes) || !Array.isArray(row.relations?.nodes) || !row.relations?.pageInfo || row.relations.pageInfo.hasNextPage !== false || !Array.isArray(row.inverseRelations?.nodes) || !row.inverseRelations?.pageInfo || row.inverseRelations.pageInfo.hasNextPage !== false) error('incomplete issue or relation pagination')
    const labels=row.labels.nodes.map(x=>x.name)
    const ws=WORKSTREAMS.filter(w=>labels.includes('workstream:'+w))
    // Unknown approval and ownership do not become actionable.
    if (!labels.includes('approved-work') || ws.length!==1) error(row.identifier+' missing explicit approved-work/workstream metadata')
    if (byId.has(row.identifier) && JSON.stringify(byId.get(row.identifier))!==JSON.stringify(row)) error(row.identifier+' inconsistent duplicate')
    byId.set(row.identifier,row)
  }
  if(byId.size !== coverage.issueIds.length || coverage.issueIds.some(id=>!byId.has(id))) error('Linear issue coverage differs from approved planning inventory')
  const issues=[]
  for (const row of byId.values()) {
    const record=evidence.issues[row.identifier]
    if (!record || record.verified !== true || typeof record.evidenceDrift!=='boolean' || !['unstarted','partial','merged','current-main','superseded','missing','evidence-conflicted'].includes(record.implementationEvidence?.state)) error(row.identifier+' missing verified SPE-3276 evidence classification')
    const blockedBy=[],dependsOn=[]
    // Linear uses positional direction: outgoing blocks points to a blocked target;
    // incoming blocks is owned by the actual prerequisite issue.
    for (const rel of row.relations.nodes) {
      if (!['blocks','related','duplicate','similar'].includes(rel.type) ||
          !/^[A-Z]+-\d+$/.test(rel.relatedIssue?.identifier ?? ''))
        error(row.identifier+' invalid outgoing relationship')
    }
    for (const rel of row.inverseRelations.nodes) {
      if (!['blocks','related','duplicate','similar'].includes(rel.type) ||
          !/^[A-Z]+-\d+$/.test(rel.issue?.identifier ?? ''))
        error(row.identifier+' invalid incoming relationship')
      if (rel.type === 'blocks') blockedBy.push(rel.issue.identifier)
    }
    issues.push({id:row.identifier,approved:true,workstream:WORKSTREAMS.find(w=>row.labels.nodes.some(l=>l.name==='workstream:'+w)),statusType:row.state.type,priority:row.priority,blockedBy,dependsOn,implementationEvidence:record.implementationEvidence,evidenceDrift:record.evidenceDrift})
  }
  if(Object.keys(evidence.issues).some(id=>!byId.has(id))) error('SPE-3276 evidence identifiers outside complete Linear project coverage')
  return {source:'Linear',complete:true,asOf,workstreamCoverage:'all-approved',relationCoverage:'complete',issues}
}
export async function fetchLinearAuthority({apiKey,projectIds,request=fetch,clock=()=>new Date().toISOString()}) {
  if(!apiKey || !Array.isArray(projectIds) || !projectIds.length || new Set(projectIds).size!==projectIds.length) error('missing API key or unique approved project IDs')
  const pages=[]
  for(const project of projectIds){
    const all=[];let after=null;const cursors=new Set()
    for(;;){
      const response=await request('https://api.linear.app/graphql',{method:'POST',headers:{Authorization:apiKey,'Content-Type':'application/json'},body:JSON.stringify({query:QUERY,variables:{project,after}})})
      if(!response.ok) error('Linear HTTP '+response.status)
      const body=await response.json()
      if(body.errors?.length || !body.data?.project?.issues?.pageInfo || !Array.isArray(body.data.project.issues.nodes)) error('GraphQL partial result for '+project)
      if(body.data.project.id!==project) error('project identity mismatch '+project)
      const connection=body.data.project.issues
      all.push(...connection.nodes)
      if(!connection.pageInfo.hasNextPage) break
      const next=connection.pageInfo.endCursor
      if(!next || cursors.has(next)) error('incomplete/cyclic pagination for '+project)
      cursors.add(next);after=next
    }
    pages.push(all)
  }
  return {pages,asOf:clock()}
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try{
    const [evidencePath,coveragePath,outputPath='planning/approved-work-projection.json']=process.argv.slice(2)
    if(!evidencePath || !coveragePath) error('usage: export-linear-approved-work.mjs <verified-spe-3276-evidence.json> <approved-planning-inventory.json> [output-path]')
    const evidence=JSON.parse(fs.readFileSync(evidencePath,'utf8'))
    const coverage=JSON.parse(fs.readFileSync(coveragePath,'utf8'))
    const {pages,asOf}=await fetchLinearAuthority({apiKey:process.env.LINEAR_API_KEY,projectIds:(process.env.LINEAR_PROJECT_IDS||'').split(',').filter(Boolean)})
    if(JSON.stringify([...new Set((process.env.LINEAR_PROJECT_IDS||'').split(',').filter(Boolean))].sort())!==JSON.stringify([...coverage.projectIds].sort())) error('project IDs differ from approved planning inventory')
    const snapshot=normalizeLinearIssues(pages,evidence,asOf,coverage,(process.env.LINEAR_PROJECT_IDS||'').split(',').filter(Boolean))
    const projection=projectApprovedWork(snapshot)
    // Do not write a partial output; every validation must finish first.
    fs.writeFileSync(outputPath,serializeProjection(projection))
    console.log('projected '+projection.active.length+' active, '+projection.history.length+' historical Linear issues')
  }catch(e){console.error(e.message);process.exitCode=1}
}

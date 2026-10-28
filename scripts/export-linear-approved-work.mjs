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
      relations {nodes {type relatedIssue {identifier}}}
    }
  }}
}`
export function normalizeLinearIssues(projectPages, evidence, asOf) {
  if (!evidence || evidence.source !== 'SPE-3276' || evidence.complete !== true || !evidence.issues || Array.isArray(evidence.issues)) error('SPE-3276 classification coverage not attested')
  const byId=new Map()
  for (const page of projectPages) for (const row of page) {
    if (!row || !/^[A-Z]+-\d+$/.test(row.identifier) || !row.state?.type || !Array.isArray(row.labels?.nodes) || !Array.isArray(row.relations?.nodes)) error('incomplete issue record')
    const labels=row.labels.nodes.map(x=>x.name)
    const ws=WORKSTREAMS.filter(w=>labels.includes('workstream:'+w))
    // Unknown approval and ownership do not become actionable.
    if (!labels.includes('approved-work') || ws.length!==1) error(row.identifier+' missing explicit approved-work/workstream metadata')
    if (byId.has(row.identifier) && JSON.stringify(byId.get(row.identifier))!==JSON.stringify(row)) error(row.identifier+' inconsistent duplicate')
    byId.set(row.identifier,row)
  }
  const issues=[]
  for (const row of byId.values()) {
    const record=evidence.issues[row.identifier]
    if (!record || record.verified !== true || typeof record.evidenceDrift!=='boolean' || !['unstarted','partial','merged','current-main','superseded','missing','evidence-conflicted'].includes(record.implementationEvidence?.state)) error(row.identifier+' missing verified SPE-3276 evidence classification')
    const blockedBy=[],dependsOn=[]
    for(const rel of row.relations.nodes){
      const id=rel.relatedIssue?.identifier
      if(!id || !/^[A-Z]+-\d+$/.test(id)) error(row.identifier+' unresolved relationship')
      if(rel.type==='blocks') continue
      if(rel.type==='blocked_by') blockedBy.push(id)
      else if(rel.type==='depends_on') dependsOn.push(id)
      else if(!['related','duplicate'].includes(rel.type)) error(row.identifier+' unrecognized relation type '+rel.type)
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
    const [evidencePath,outputPath='planning/approved-work-projection.json']=process.argv.slice(2)
    if(!evidencePath) error('usage: export-linear-approved-work.mjs <verified-spe-3276-evidence.json> [output-path]')
    const evidence=JSON.parse(fs.readFileSync(evidencePath,'utf8'))
    const {pages,asOf}=await fetchLinearAuthority({apiKey:process.env.LINEAR_API_KEY,projectIds:(process.env.LINEAR_PROJECT_IDS||'').split(',').filter(Boolean)})
    const snapshot=normalizeLinearIssues(pages,evidence,asOf)
    const projection=projectApprovedWork(snapshot)
    // Do not write a partial output; every validation must finish first.
    fs.writeFileSync(outputPath,serializeProjection(projection))
    console.log('projected '+projection.active.length+' active, '+projection.history.length+' historical Linear issues')
  }catch(e){console.error(e.message);process.exitCode=1}
}

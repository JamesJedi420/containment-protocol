/**
 * SPE-3338 read-only Linear GraphQL ingestion. Does not decide approval or evidence drift.
 * LINEAR_API_KEY and LINEAR_PROJECT_IDS (comma-separated retrieval boundary).
 * Existing Linear issues are approved for their recorded scope; no approval label/record is required.
 * Usage: node scripts/export-linear-approved-work.mjs <spe-3276-evidence.json> [--output output-path]
 */
import fs from 'node:fs'
import {pathToFileURL} from 'node:url'
import {projectApprovedWork, serializeProjection} from './project-approved-work.mjs'
const error = message => { throw new Error('Linear authority unavailable: '+message) }
const compareIds = (a,b) => a.localeCompare(b, 'en')
const WORKSTREAMS = ['CP-core','Academy','shared-system','cross-project']
const QUERY = `query ApprovedIssues($project: String!, $after: String) {
  project(id:$project) { id name issues(first:10, after:$after, includeArchived:true) {
    pageInfo {hasNextPage endCursor}
    nodes {identifier id updatedAt title priority
      state {type} labels(first:100) {pageInfo {hasNextPage endCursor} nodes {id name}}
      relations(first:100) {pageInfo {hasNextPage endCursor} nodes {id type relatedIssue {identifier}}}
      inverseRelations(first:100) {pageInfo {hasNextPage endCursor} nodes {id type issue {identifier}}}
    }
  }}
}`
const CONNECTION_QUERIES = {
  labels: `query IssueLabels($id: String!, $after: String!) {
    issue(id:$id) { id identifier updatedAt
      labels(first:100, after:$after) {pageInfo {hasNextPage endCursor} nodes {id name}}
    }
  }`,
  relations: `query IssueRelations($id: String!, $after: String!) {
    issue(id:$id) { id identifier updatedAt
      relations(first:100, after:$after) {pageInfo {hasNextPage endCursor} nodes {id type relatedIssue {identifier}}}
    }
  }`,
  inverseRelations: `query IssueInverseRelations($id: String!, $after: String!) {
    issue(id:$id) { id identifier updatedAt
      inverseRelations(first:100, after:$after) {pageInfo {hasNextPage endCursor} nodes {id type issue {identifier}}}
    }
  }`,
}

function validatePage(connection, context) {
  if (!Array.isArray(connection?.nodes) || typeof connection.pageInfo?.hasNextPage !== 'boolean') error('incomplete pagination for '+context)
  if (connection.pageInfo.hasNextPage && (typeof connection.pageInfo.endCursor !== 'string' || !connection.pageInfo.endCursor.trim())) error('missing pagination cursor for '+context)
  return connection
}

function validateIssue(issue) {
  if (typeof issue?.id !== 'string' || !issue.id.trim() || !/^[A-Z]+-\d+$/.test(issue.identifier ?? '') || typeof issue.updatedAt !== 'string' || !Number.isFinite(Date.parse(issue.updatedAt))) error('incomplete issue identity/revision')
}

async function collectConnection(issue, field, read) {
  const context=issue.identifier+' '+field
  const nodes=[], nodeIds=new Set(), cursors=new Set()
  let page=validatePage(issue[field],context)
  for (;;) {
    for (const node of page.nodes) {
      if (typeof node?.id !== 'string' || !node.id.trim()) error('missing node identity for '+context)
      if (nodeIds.has(node.id)) error('overlapping pagination for '+context)
      nodeIds.add(node.id);nodes.push(node)
    }
    if (!page.pageInfo.hasNextPage) return {nodes,pageInfo:page.pageInfo}
    const after=page.pageInfo.endCursor
    if (cursors.has(after)) error('cyclic pagination for '+context)
    cursors.add(after)
    const next=(await read(CONNECTION_QUERIES[field],{id:issue.id,after})).issue
    validateIssue(next)
    if (next.id !== issue.id || next.identifier !== issue.identifier) error('issue identity mismatch for '+context)
    if (next.updatedAt !== issue.updatedAt) error('issue changed during pagination for '+context)
    page=validatePage(next[field],context)
  }
}
export function normalizeLinearIssues(projectPages, evidence, asOf, coverage, fetchedProjectIds=coverage?.projectIds) {
  if (!Array.isArray(projectPages) || !projectPages.every(Array.isArray) || !Array.isArray(fetchedProjectIds) || !fetchedProjectIds.length || fetchedProjectIds.some(id=>typeof id!=='string'||!id.trim()) || new Set(fetchedProjectIds).size!==fetchedProjectIds.length || projectPages.length!==fetchedProjectIds.length) error('missing complete Linear project coverage')
  // A supplied legacy inventory remains an optional exact-set consistency check,
  // never an additional approval authority or a requirement for issue admission.
  if(coverage) {
    if(!['Linear','approved-planning'].includes(coverage.source) || coverage.complete !== true || !Array.isArray(coverage.issueIds) || new Set(coverage.issueIds).size!==coverage.issueIds.length || !Array.isArray(coverage.projectIds) || !coverage.projectIds.length || new Set(coverage.projectIds).size!==coverage.projectIds.length) error('invalid Linear coverage inventory')
    if (JSON.stringify([...fetchedProjectIds].sort(compareIds))!==JSON.stringify([...coverage.projectIds].sort(compareIds))) error('project IDs differ from Linear coverage inventory')
  }
  if (!evidence || evidence.source !== 'SPE-3276' || evidence.complete !== true || !evidence.issues || typeof evidence.issues !== 'object' || Array.isArray(evidence.issues) || Object.keys(evidence.issues).length===0) error('SPE-3276 classification coverage not attested')
  const byId=new Map()
  for (const page of projectPages) for (const row of page) {
    if (!row || !/^[A-Z]+-\d+$/.test(row.identifier) || !row.state?.type || !Array.isArray(row.labels?.nodes) || !Array.isArray(row.relations?.nodes) || !row.relations?.pageInfo || row.relations.pageInfo.hasNextPage !== false || !Array.isArray(row.inverseRelations?.nodes) || !row.inverseRelations?.pageInfo || row.inverseRelations.pageInfo.hasNextPage !== false) error('incomplete issue or relation pagination')
    if (row.labels.pageInfo?.hasNextPage !== false) error(row.identifier+' incomplete label pagination')
    const labels=row.labels.nodes.map(x=>x.name)
    const ws=WORKSTREAMS.filter(w=>labels.includes('workstream:'+w))
    // Linear issue presence establishes approval; ownership remains explicit.
    if (ws.length!==1) error(row.identifier+' missing explicit workstream metadata')
    if (byId.has(row.identifier) && JSON.stringify(byId.get(row.identifier))!==JSON.stringify(row)) error(row.identifier+' inconsistent duplicate')
    byId.set(row.identifier,row)
  }
  if(coverage && (byId.size !== coverage.issueIds.length || coverage.issueIds.some(id=>!byId.has(id)))) error('Linear issue coverage differs from supplied inventory')
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
  const read=async(query,variables)=>{
    const response=await request('https://api.linear.app/graphql',{method:'POST',headers:{Authorization:apiKey,'Content-Type':'application/json'},body:JSON.stringify({query,variables})})
    if(!response.ok) error('Linear HTTP '+response.status)
    const body=await response.json()
    if(body.errors?.length || !body.data || typeof body.data!=='object') error('GraphQL partial result')
    return body.data
  }
  for(const project of projectIds){
    const all=[];let after=null;const cursors=new Set(), issueIds=new Set()
    for(;;){
      const data=await read(QUERY,{project,after})
      if(data.project?.id!==project) error('project identity mismatch '+project)
      const connection=validatePage(data.project.issues,project)
      for (const row of connection.nodes) {
        validateIssue(row)
        if (issueIds.has(row.id)) error('overlapping issue pagination for '+project)
        issueIds.add(row.id)
        const complete={...row}
        for (const field of Object.keys(CONNECTION_QUERIES)) complete[field]=await collectConnection(row,field,read)
        all.push(complete)
      }
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
    const [evidencePath,...args]=process.argv.slice(2)
    let coveragePath,outputPath='planning/approved-work-projection.json'
    if(args[0]==='--output' && args.length===2 && args[1]) outputPath=args[1]
    else if(args.length<=2 && args.every(arg=>!arg.startsWith('--'))) [coveragePath,outputPath='planning/approved-work-projection.json']=args
    else error('usage: export-linear-approved-work.mjs <verified-spe-3276-evidence.json> [--output output-path]; legacy: <evidence> <optional-inventory> [output-path]')
    if(!evidencePath) error('verified SPE-3276 evidence file required')
    const evidence=JSON.parse(fs.readFileSync(evidencePath,'utf8'))
    const coverage=coveragePath?JSON.parse(fs.readFileSync(coveragePath,'utf8')):undefined
    const {pages,asOf}=await fetchLinearAuthority({apiKey:process.env.LINEAR_API_KEY,projectIds:(process.env.LINEAR_PROJECT_IDS||'').split(',').filter(Boolean)})
    const snapshot=normalizeLinearIssues(pages,evidence,asOf,coverage,(process.env.LINEAR_PROJECT_IDS||'').split(',').filter(Boolean))
    const projection=projectApprovedWork(snapshot)
    // Do not write a partial output; every validation must finish first.
    fs.writeFileSync(outputPath,serializeProjection(projection))
    console.log('projected '+projection.active.length+' active, '+projection.history.length+' historical Linear issues')
  }catch(e){console.error(e.message);process.exitCode=1}
}

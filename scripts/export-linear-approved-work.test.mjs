import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
import {fetchLinearAuthority,normalizeLinearIssues} from './export-linear-approved-work.mjs'
import {projectApprovedWork} from './project-approved-work.mjs'
const issue=(identifier,extra={})=>({identifier,id:identifier,title:identifier,priority:2,state:{type:'started'},labels:{pageInfo:{hasNextPage:false},nodes:[{name:'workstream:CP-core'}]},relations:{pageInfo:{hasNextPage:false},nodes:[]},inverseRelations:{pageInfo:{hasNextPage:false},nodes:[]},...extra})
const coverage=ids=>({source:'approved-planning',complete:true,projectIds:['project-1'],issueIds:ids})
const evidence=(ids)=>({source:'SPE-3276',complete:true,issues:Object.fromEntries(ids.map(id=>[id,{verified:true,evidenceDrift:false,implementationEvidence:{state:'merged'}}]))})
test('paginates all authoritative Linear pages, rejects transport and partial GraphQL errors',async()=>{
  let calls=0
  const request=async (_url,opts)=>{
    calls++
    const {variables}=JSON.parse(opts.body)
    assert.equal(variables.project,'project-1')
    return {ok:true,json:async()=>({data:{project:{id:'project-1',issues:{pageInfo:{hasNextPage:!variables.after,endCursor:variables.after?null:'next'},nodes:[issue(variables.after?'SPE-2':'SPE-1')]}}}})}
  }
  const result=await fetchLinearAuthority({apiKey:'test',projectIds:['project-1'],request,clock:()=> '2026-10-28T01:00:00Z'})
  assert.equal(calls,2)
  assert.equal(result.pages[0].length,2)
  await assert.rejects(fetchLinearAuthority({apiKey:'test',projectIds:['project-1'],request:async()=>({ok:true,json:async()=>({errors:[{message:'access denied'}],data:{project:null}})})}),/partial/)
})
test('missing workstream metadata, evidence coverage, or related identity fails closed',()=>{
 const rows=[[issue('SPE-1')]]
 const normalized=normalizeLinearIssues(rows,evidence(['SPE-1']),'2026-10-28T01:00:00Z',coverage(['SPE-1']))
 assert.equal(projectApprovedWork(normalized).active[0].statusType,'started')
 assert.throws(()=>normalizeLinearIssues([[issue('SPE-1',{labels:{pageInfo:{hasNextPage:false},nodes:[]}})]],evidence(['SPE-1']),'2026-10-28T01:00:00Z',coverage(['SPE-1'])),/metadata/)
 assert.throws(()=>normalizeLinearIssues(rows,evidence([]),'2026-10-28T01:00:00Z',coverage(['SPE-1'])),/classification/)
 assert.throws(()=>normalizeLinearIssues([[issue('SPE-1',{inverseRelations:{pageInfo:{hasNextPage:false},nodes:[{type:'blocks',issue:null}]}})]],evidence(['SPE-1']),'2026-10-28T01:00:00Z',coverage(['SPE-1'])),/relationship/)
})

test('truncated nested relation pages must fail closed',()=>{
 const row=issue('SPE-1',{relations:{pageInfo:{hasNextPage:true},nodes:[]}})
 assert.throws(()=>normalizeLinearIssues([[row]],evidence(['SPE-1']),'2026-10-28T01:00:00Z',coverage(['SPE-1'])),/relation pagination/)
})

test('an optional inventory must match the exact fetched issue set',()=>{
 assert.throws(()=>normalizeLinearIssues([[issue('SPE-1')]],evidence(['SPE-1']),'2026-10-28T01:00:00Z'),/Linear project coverage/)
 assert.throws(()=>normalizeLinearIssues([[issue('SPE-1')]],evidence(['SPE-1']),'2026-10-28T01:00:00Z',coverage(['SPE-1','SPE-2'])),/issue coverage/)
})

test('Linear presence establishes approval without an approval label or separate approval inventory',()=>{
 const rows=[[issue('SPE-1')]]
 const normalized=normalizeLinearIssues(rows,evidence(['SPE-1']),'2026-10-28T01:00:00Z',undefined,['project-1'])
 assert.equal(normalized.issues[0].approved,true)
 assert.deepEqual(projectApprovedWork(normalized).runnable.map(r=>r.id),['SPE-1'])
 const labeled=issue('SPE-1',{labels:{pageInfo:{hasNextPage:false},nodes:[{name:'approved-work'},{name:'workstream:CP-core'}]}})
 assert.deepEqual(normalizeLinearIssues([[labeled]],evidence(['SPE-1']),'2026-10-28T01:00:00Z',undefined,['project-1']),normalized)
})

test('approval without historical records preserves lifecycle, blocker and evidence restrictions',()=>{
 const rows=[[issue('SPE-1',{state:{type:'canceled'}}),issue('SPE-2',{inverseRelations:{pageInfo:{hasNextPage:false},nodes:[{type:'blocks',issue:{identifier:'SPE-1'}}]}})]]
 const records=evidence(['SPE-1','SPE-2'])
 const projection=projectApprovedWork(normalizeLinearIssues(rows,records,'2026-10-28T01:00:00Z',undefined,['project-1']))
 assert.deepEqual(projection.history.map(r=>r.id),['SPE-1'])
 assert.deepEqual(projection.runnable,[])
 assert.ok(projection.active[0].reasons.includes('dependency-not-completed:SPE-1'))
 records.issues['SPE-2'].evidenceDrift=true
 assert.ok(projectApprovedWork(normalizeLinearIssues(rows,records,'2026-10-28T01:00:00Z',undefined,['project-1'])).active[0].reasons.includes('evidence-conflicted'))
})

test('omitting an approval inventory does not waive project identity or exact evidence coverage',()=>{
 const rows=[[issue('SPE-1')]]
 for(const ids of [[],['project-1','project-1'],['project-1','project-2'],['']])assert.throws(()=>normalizeLinearIssues(rows,evidence(['SPE-1']),'2026-10-28T01:00:00Z',undefined,ids),/project coverage/)
 assert.throws(()=>normalizeLinearIssues(rows,evidence(['SPE-1','SPE-2']),'2026-10-28T01:00:00Z',undefined,['project-1']),/outside complete Linear project coverage/)
})

test('CLI exports without an approval inventory and preserves legacy positional output',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'linear-approval-cli-'))
 const input=path.join(dir,'evidence.json'),inventory=path.join(dir,'inventory.json')
 const output=path.join(dir,'output.json'),legacyOutput=path.join(dir,'legacy.json'),planning=path.join(dir,'planning'),defaultOutput=path.join(planning,'approved-work-projection.json')
 try {
  fs.writeFileSync(input,JSON.stringify(evidence(['SPE-1'])))
  fs.writeFileSync(inventory,JSON.stringify(coverage(['SPE-1'])))
  fs.mkdirSync(planning)
  const response={data:{project:{id:'project-1',issues:{pageInfo:{hasNextPage:false},nodes:[issue('SPE-1')]}}}}
  const mock='data:text/javascript,'+encodeURIComponent(`globalThis.fetch=async()=>({ok:true,json:async()=>(${JSON.stringify(response)})})`)
  const script=fileURLToPath(new URL('./export-linear-approved-work.mjs',import.meta.url))
  const run=args=>spawnSync(process.execPath,['--import',mock,script,...args],{cwd:dir,encoding:'utf8',windowsHide:true,env:{...process.env,LINEAR_API_KEY:'test',LINEAR_PROJECT_IDS:'project-1'}})
  for(const args of [[input,'--output',output],[input,inventory,legacyOutput],[input]]) {
   const result=run(args);assert.equal(result.status,0,result.stderr)
  }
  for(const file of [output,legacyOutput,defaultOutput])assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')).runnable.map(r=>r.id),['SPE-1'])
  assert.notEqual(run([input,'--output']).status,0)
  assert.notEqual(run([input,'--unknown',output]).status,0)
 } finally {
  for(const file of [input,inventory,output,legacyOutput,defaultOutput])if(fs.existsSync(file))fs.unlinkSync(file)
  if(fs.existsSync(planning))fs.rmdirSync(planning)
  fs.rmdirSync(dir)
 }
})

test('incoming blocks prevents runnable output; outgoing blocks does not block its owner',()=>{
 const a=issue('SPE-1',{inverseRelations:{pageInfo:{hasNextPage:false},nodes:[{type:'blocks',issue:{identifier:'SPE-2'}}]}})
 const b=issue('SPE-2',{relations:{pageInfo:{hasNextPage:false},nodes:[{type:'blocks',relatedIssue:{identifier:'SPE-1'}}]}})
 const projection=projectApprovedWork(normalizeLinearIssues([[a,b]],evidence(['SPE-1','SPE-2']),'2026-10-28T01:00:00Z',coverage(['SPE-1','SPE-2'])))
 assert.deepEqual(projection.active.find(x=>x.id==='SPE-1').blockedBy,['SPE-2'])
 assert.ok(projection.active.find(x=>x.id==='SPE-1').reasons.includes('dependency-not-completed:SPE-2'))
 assert.equal(projection.active.find(x=>x.id==='SPE-2').readiness,'runnable')
})
test('missing or truncated incoming connections fail closed',()=>{
 const base=issue('SPE-1')
 const missing={...base};delete missing.inverseRelations
 assert.throws(()=>normalizeLinearIssues([[missing]],evidence(['SPE-1']),'2026-10-28T01:00:00Z',coverage(['SPE-1'])),/pagination/)
 const truncated=issue('SPE-1',{inverseRelations:{pageInfo:{hasNextPage:true},nodes:[]}})
 assert.throws(()=>normalizeLinearIssues([[truncated]],evidence(['SPE-1']),'2026-10-28T01:00:00Z',coverage(['SPE-1'])),/pagination/)
})

test('malformed and empty SPE-3276 evidence fail at attestation boundary',()=>{
 for(const issues of ['complete',{},[]]){
  assert.throws(()=>normalizeLinearIssues([[issue('SPE-1')]],{source:'SPE-3276',complete:true,issues},'2026-10-28T01:00:00Z',coverage(['SPE-1'])),/classification coverage not attested/)
 }
})
test('project ID mismatch fails for direct normalization callers',()=>{
 assert.throws(()=>normalizeLinearIssues([[issue('SPE-1')]],evidence(['SPE-1']),'2026-10-28T01:00:00Z',coverage(['SPE-1']),['different-project']),/project IDs differ/)
})

test('missing or malformed pagination completion fails closed',async()=>{
 for(const pageInfo of [{},{hasNextPage:null},{hasNextPage:0},{hasNextPage:'false'}]){
  const request=async()=>({ok:true,json:async()=>({data:{project:{id:'project-1',issues:{pageInfo,nodes:[issue('SPE-1')]}}}})})
  await assert.rejects(fetchLinearAuthority({apiKey:'test',projectIds:['project-1'],request}),/incomplete pagination/)
 }
})

test('archived completed prerequisites remain in the authoritative inventory',async()=>{
 const active=issue('SPE-1',{inverseRelations:{pageInfo:{hasNextPage:false},nodes:[{type:'blocks',issue:{identifier:'SPE-2'}}]}})
 const archived=issue('SPE-2',{state:{type:'completed'},archivedAt:'2026-10-01T00:00:00Z'})
 const request=async(_url,opts)=>{
  const {query}=JSON.parse(opts.body)
  const includeArchived=/includeArchived:\s*true/.test(query)
  assert.match(query,/labels\(first:100\)\s*\{pageInfo\s*\{hasNextPage\}/)
  return {ok:true,json:async()=>({data:{project:{id:'project-1',issues:{pageInfo:{hasNextPage:false},nodes:includeArchived?[active,archived]:[active]}}}})}
 }
 const {pages,asOf}=await fetchLinearAuthority({apiKey:'test',projectIds:['project-1'],request,clock:()=> '2026-10-28T01:00:00Z'})
 const projection=projectApprovedWork(normalizeLinearIssues(pages,evidence(['SPE-1','SPE-2']),asOf,coverage(['SPE-1','SPE-2'])))
 assert.deepEqual(projection.runnable.map(row=>row.id),['SPE-1'])
 assert.deepEqual(projection.history.map(row=>row.id),['SPE-2'])
})

test('missing or incomplete label pages cannot certify workstream ownership',()=>{
 const base=issue('SPE-1')
 for(const pageInfo of [undefined,{}, {hasNextPage:true},{hasNextPage:'false'}]){
  const row={...base,labels:{nodes:base.labels.nodes,pageInfo}}
  assert.throws(()=>normalizeLinearIssues([[row]],evidence(['SPE-1']),'2026-10-28T01:00:00Z',coverage(['SPE-1'])),/incomplete label pagination/)
 }
 const ambiguous={...base,labels:{pageInfo:{hasNextPage:false},nodes:[...base.labels.nodes,{name:'workstream:Academy'}]}}
 assert.throws(()=>normalizeLinearIssues([[ambiguous]],evidence(['SPE-1']),'2026-10-28T01:00:00Z',coverage(['SPE-1'])),/metadata/)
})

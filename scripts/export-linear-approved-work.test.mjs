import test from 'node:test'
import assert from 'node:assert/strict'
import {fetchLinearAuthority,normalizeLinearIssues} from './export-linear-approved-work.mjs'
import {projectApprovedWork} from './project-approved-work.mjs'
const issue=(identifier,extra={})=>({identifier,id:identifier,title:identifier,priority:2,state:{type:'started'},labels:{nodes:[{name:'approved-work'},{name:'workstream:CP-core'}]},relations:{pageInfo:{hasNextPage:false},nodes:[]},...extra})
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
test('missing approved metadata, evidence coverage, or related identity fails closed',()=>{
 const rows=[[issue('SPE-1')]]
 const normalized=normalizeLinearIssues(rows,evidence(['SPE-1']),'2026-10-28T01:00:00Z',coverage(['SPE-1']))
 assert.equal(projectApprovedWork(normalized).active[0].statusType,'started')
 assert.throws(()=>normalizeLinearIssues([[issue('SPE-1',{labels:{nodes:[]}})]],evidence(['SPE-1']),'2026-10-28T01:00:00Z',coverage(['SPE-1'])),/metadata/)
 assert.throws(()=>normalizeLinearIssues(rows,evidence([]),'2026-10-28T01:00:00Z',coverage(['SPE-1'])),/classification/)
 assert.throws(()=>normalizeLinearIssues([[issue('SPE-1',{relations:{pageInfo:{hasNextPage:false},nodes:[{type:'blocked_by',relatedIssue:null}]}})]],evidence(['SPE-1']),'2026-10-28T01:00:00Z',coverage(['SPE-1'])),/relationship/)
})

test('truncated nested relation pages must fail closed',()=>{
 const row=issue('SPE-1',{relations:{pageInfo:{hasNextPage:true},nodes:[]}})
 assert.throws(()=>normalizeLinearIssues([[row]],evidence(['SPE-1']),'2026-10-28T01:00:00Z',coverage(['SPE-1'])),/relation pagination/)
})

test('authorized inventory must enumerate the exact approved issue set',()=>{
 assert.throws(()=>normalizeLinearIssues([[issue('SPE-1')]],evidence(['SPE-1']),'2026-10-28T01:00:00Z'),/approved-work coverage/)
 assert.throws(()=>normalizeLinearIssues([[issue('SPE-1')]],evidence(['SPE-1']),'2026-10-28T01:00:00Z',coverage(['SPE-1','SPE-2'])),/issue coverage/)
})

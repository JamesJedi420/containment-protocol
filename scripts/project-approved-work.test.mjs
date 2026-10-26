import test from 'node:test'
import assert from 'node:assert/strict'
import {projectApprovedWork,serializeProjection,filterWorkstream} from './project-approved-work.mjs'
const issue=(id,overrides={})=>({id,approved:true,workstream:'CP-core',statusType:'backlog',priority:3,blockedBy:[],dependsOn:[],implementationEvidence:{state:'unstarted'},evidenceDrift:false,...overrides})
const snapshot=issues=>({source:'Linear',complete:true,asOf:'2026-10-25T00:00:00Z',workstreamCoverage:'all-approved',relationCoverage:'complete',issues})
test('fails closed on partial authority, approval, workstream, relations and evidence',()=>{
  assert.throws(()=>projectApprovedWork({issues:[]}),/authority incomplete/)
  assert.throws(()=>projectApprovedWork(snapshot([issue('SPE-1',{approved:false})])),/approval/)
  assert.throws(()=>projectApprovedWork(snapshot([issue('SPE-1',{workstream:null})])),/workstream/)
  assert.throws(()=>projectApprovedWork(snapshot([issue('SPE-1',{dependsOn:['SPE-2']})])),/absent/)
})
test('deterministic priority and complete lifecycle separation',()=>{
  const data=snapshot([issue('SPE-2',{priority:1}),issue('SPE-1',{priority:2,statusType:'completed'}),issue('SPE-3',{priority:0})])
  const p=projectApprovedWork(data)
  assert.deepEqual(p.runnable.map(x=>x.id),['SPE-2','SPE-3'])
  assert.deepEqual(p.history.map(x=>x.id),['SPE-1'])
  assert.equal(serializeProjection(p),serializeProjection(projectApprovedWork({...data,issues:[...data.issues].reverse()})))
})
test('dependencies, blockers and SPE-3276 drift prevent running',()=>{
  const p=projectApprovedWork(snapshot([issue('SPE-1',{statusType:'started',implementationEvidence:{state:'merged'}}),issue('SPE-2',{blockedBy:['SPE-1']}),issue('SPE-3',{dependsOn:['SPE-4']}),issue('SPE-4',{statusType:'completed',evidenceDrift:true})]))
  assert.equal(p.active.find(x=>x.id==='SPE-1').statusType,'started')
  assert.equal(p.history.find(x=>x.id==='SPE-1'),undefined)
  assert.ok(p.active.find(x=>x.id==='SPE-2').reasons.includes('dependency-not-completed:SPE-1'))
  assert.ok(p.active.find(x=>x.id==='SPE-3').reasons.includes('dependency-evidence-conflicted:SPE-4'))
})
test('one shared identity, independent workstream filtered views, empty queue',()=>{
  const p=projectApprovedWork(snapshot([issue('SPE-1',{workstream:'shared-system'}),issue('SPE-2',{workstream:'Academy',dependsOn:['SPE-1']}),issue('SPE-3',{workstream:'cross-project'}),issue('SPE-4')]))
  assert.equal(p.active.length,4)
  assert.deepEqual(filterWorkstream(p,'Academy').runnable.map(x=>x.id),['SPE-2'])
  assert.equal(filterWorkstream(p,'CP-core').active.length,1)
  assert.deepEqual(projectApprovedWork(snapshot([])).runnable,[])
})

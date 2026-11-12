import assert from 'node:assert/strict'
import { inspectMutationContract, probeLinearMutationContract, mutationWriteCapability } from './linear-provider-contract.mjs'
const schema = { data: { __schema: { mutationType: { name: 'Mutation' } },
  __type: { fields: [{ name: 'issueUpdate', args: [{ name: 'id' }, { name: 'input' }] }] },
  issueInput: { inputFields: [{ name: 'updatedAt' }] } } }
assert.equal(mutationWriteCapability().enabled, false)
assert.deepEqual(inspectMutationContract(schema).enabledWriteClasses, [])
assert.equal(inspectMutationContract(schema).observed.issueUpdatePresent, true)
assert.equal(inspectMutationContract({ ...schema, errors: [{ message: 'partial error' }] }).reason, 'invalid-or-partial-introspection')
assert.equal((await probeLinearMutationContract()).reason, 'missing-trusted-authentication')
let called = 0
assert.equal((await probeLinearMutationContract({ token: 'fixture', fetchImpl: async (_, options) => {
  called++; assert.equal(options.method, 'POST')
  assert.equal(options.redirect, 'error')
  assert.equal(options.headers.Authorization, 'fixture')
  assert.equal(options.headers['Content-Type'], 'application/json')
  assert.equal(JSON.parse(options.body).query.startsWith('query SPE3432MutationContract'), true)
  return { ok: true, json: async () => schema }
} })).outcome, 'unverified')
assert.equal(called, 1)
assert.equal(mutationWriteCapability().enabled, false)
assert.equal(inspectMutationContract(schema).reason, 'schema-introspection-is-not-concurrency-proof')
assert.equal((await probeLinearMutationContract({ token: 'fixture', fetchImpl: async () => ({ ok: false }) })).reason, 'provider-http-failure')
assert.equal((await probeLinearMutationContract({ token: 'fixture', fetchImpl: async () => { throw Error('timeout') } })).reason, 'provider-response-uncertain')
console.log('SPE-3432 fail-closed read-only provider contract tests passed')

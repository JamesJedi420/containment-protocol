/** SPE-3432 read-only provider contract probe. Introspection cannot prove atomic revision semantics. */
const QUERY = `query SPE3432MutationContract {
  __schema { mutationType { name } }
  __type(name: "Mutation") {
    fields(includeDeprecated: true) {
      name
      args { name type { kind name ofType { kind name } } }
    }
  }
  issueInput: __type(name: "IssueUpdateInput") {
    inputFields { name type { kind name ofType { kind name } } }
  }
}`
const disabled = (reason) => Object.freeze({ outcome: 'unverified', enabledWriteClasses: [], reason })
export function inspectMutationContract(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result) ||
      (Array.isArray(result.errors) && result.errors.length) ||
      result.data?.__schema?.mutationType?.name !== 'Mutation' ||
      !Array.isArray(result.data?.__type?.fields)) return disabled('invalid-or-partial-introspection')
  const update = result.data.__type.fields.find((f) => f?.name === 'issueUpdate')
  return Object.freeze({
    ...disabled('schema-introspection-is-not-concurrency-proof'),
    observed: Object.freeze({
      issueUpdatePresent: Boolean(update),
      issueUpdateArguments: Object.freeze((update?.args ?? []).map((a) => a.name)),
      issueUpdateInputFields: Object.freeze((result.data.issueInput?.inputFields ?? []).map((f) => f.name)),
    }),
  })
}
/** Host-only read: never returns credentials or permits a mutation. */
export async function probeLinearMutationContract({ token, fetchImpl = fetch } = {}) {
  if (typeof token !== 'string' || !token.trim() || typeof fetchImpl !== 'function') {
    return disabled('missing-trusted-authentication')
  }
  try {
    const response = await fetchImpl('https://api.linear.app/graphql', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({ query: QUERY }), redirect: 'error',
    })
    if (!response.ok) return disabled('provider-http-failure')
    return inspectMutationContract(await response.json())
  } catch {
    return disabled('provider-response-uncertain')
  }
}
/** No writer exists here; proof of atomic concurrent mutation is prerequisite. */
export function mutationWriteCapability() {
  return Object.freeze({ enabled: false, reason: 'provider-atomic-revision-guarantee-unverified' })
}

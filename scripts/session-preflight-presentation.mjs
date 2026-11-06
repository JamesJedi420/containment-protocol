// Compatibility presentation of an evaluated result. Never parse it as authority or machine input.
function jsonBlock(value) {
  const json = JSON.stringify(value, null, 2)
  const runs = json.match(/`+/g) ?? []
  const fence = '`'.repeat(runs.reduce((length, run) => Math.max(length, run.length + 1), 3))
  return `${fence}json\n${json}\n${fence}`
}

export function renderSessionHandoff(result) {
  const sections = [
    '# Implementation session handoff',
    'Derived read-only presentation. Revalidate the machine envelope and authoritative sources before implementation. This report grants no approval, assignment or execution authority.',
    '## Readiness',
    jsonBlock({
      status: result.status,
      repository: result.repository,
      observedAt: result.observedAt,
      freshnessWindowSeconds: result.freshnessWindowSeconds,
      reasons: result.reasons,
      validationErrors: result.validationErrors,
    }),
  ]
  if (result.evidence === null) return sections.join('\n\n') + '\n'
  const labels = [
    ['handoff', 'Named implementation boundary'],
    ['linearLifecycle', 'Authoritative Linear lifecycle observation'],
    ['githubImplementation', 'Separate GitHub implementation evidence'],
    ['git', 'Repository observation'],
    ['linearMcp', 'Linear read diagnostics'],
    ['agentDesignations', 'Nonexclusive agent preference evidence'],
    ['followUps', 'Follow-up evidence classification'],
  ]
  for (const [key, label] of labels) {
    if (result.evidence[key] !== undefined)
      sections.push(`## ${label}`, jsonBlock(result.evidence[key]))
  }
  sections.push('## Sources', jsonBlock(result.sources))
  return sections.join('\n\n') + '\n'
}

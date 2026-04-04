import type { CaseTemplate } from '../models'

export type TemplateCatalogDiagnosticSeverity = 'error' | 'warning'

export interface TemplateCatalogDiagnostic {
  severity: TemplateCatalogDiagnosticSeverity
  code:
    | 'catalog_error'
    | 'entry_template_missing'
    | 'duplicate_tag_across_lists'
    | 'hard_gate_unsatisfied'
    | 'unreachable_templates'
  message: string
  templateId?: string
}

export interface TemplateCatalogDiagnosticsOptions {
  errors?: string[]
  entryTemplateIds?: string[]
  capabilitySets?: ReadonlyArray<ReadonlySet<string>>
}

export interface TemplateCatalogDiagnosticsResult {
  errors: string[]
  warnings: string[]
  diagnostics: TemplateCatalogDiagnostic[]
  reachability: {
    entryTemplateIds: string[]
    reachableTemplateIds: string[]
    unreachableTemplateIds: string[]
  }
}

function normalizeTag(value: string) {
  return value.trim().toLowerCase()
}

function normalizeTemplateIds(ids: string[] | undefined, knownIds: Set<string>) {
  if (!ids || ids.length === 0) {
    return [] as string[]
  }

  return [
    ...new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0 && knownIds.has(id))),
  ].sort((left, right) => left.localeCompare(right))
}

function buildReachability(templates: CaseTemplate[], entryTemplateIds: string[]) {
  const byId = new Map(templates.map((template) => [template.templateId, template]))
  const queue = [...entryTemplateIds]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const templateId = queue.shift()!

    if (visited.has(templateId)) {
      continue
    }

    const template = byId.get(templateId)
    if (!template) {
      continue
    }

    visited.add(templateId)

    for (const linkedId of [
      ...template.onFail.spawnTemplateIds,
      ...template.onUnresolved.spawnTemplateIds,
    ]) {
      if (!visited.has(linkedId) && byId.has(linkedId)) {
        queue.push(linkedId)
      }
    }
  }

  const reachableTemplateIds = [...visited].sort((left, right) => left.localeCompare(right))
  const unreachableTemplateIds = templates
    .map((template) => template.templateId)
    .filter((templateId) => !visited.has(templateId))
    .sort((left, right) => left.localeCompare(right))

  return {
    reachableTemplateIds,
    unreachableTemplateIds,
  }
}

export function getCaseTemplateCatalogDiagnostics(
  templates: CaseTemplate[],
  options: TemplateCatalogDiagnosticsOptions = {}
): TemplateCatalogDiagnosticsResult {
  const diagnostics: TemplateCatalogDiagnostic[] = []
  const errors = [...(options.errors ?? [])]

  for (const error of errors) {
    diagnostics.push({
      severity: 'error',
      code: 'catalog_error',
      message: error,
    })
  }

  const knownIds = new Set(templates.map((template) => template.templateId))
  const requestedEntryIds = [
    ...new Set((options.entryTemplateIds ?? []).map((id) => id.trim()).filter(Boolean)),
  ]

  for (const entryId of requestedEntryIds) {
    if (!knownIds.has(entryId)) {
      diagnostics.push({
        severity: 'warning',
        code: 'entry_template_missing',
        message: `Entry template id ${entryId} does not exist in this catalog.`,
      })
    }
  }

  const entryTemplateIds = normalizeTemplateIds(
    requestedEntryIds.length > 0
      ? requestedEntryIds
      : templates.map((template) => template.templateId),
    knownIds
  )

  for (const template of templates) {
    const buckets = [
      ['tags', template.tags],
      ['requiredTags', template.requiredTags ?? []],
      ['preferredTags', template.preferredTags ?? []],
    ] as const

    const seenByBucket = new Map<string, string[]>()

    for (const [bucketName, values] of buckets) {
      for (const rawValue of values) {
        const value = normalizeTag(rawValue)
        if (!value) {
          continue
        }

        const existing = seenByBucket.get(value) ?? []
        existing.push(bucketName)
        seenByBucket.set(value, existing)
      }
    }

    for (const [tag, bucketNames] of seenByBucket.entries()) {
      if (bucketNames.length > 1) {
        const uniqueBuckets = [...new Set(bucketNames)]
        diagnostics.push({
          severity: 'warning',
          code: 'duplicate_tag_across_lists',
          templateId: template.templateId,
          message: `Tag '${tag}' appears in multiple lists (${uniqueBuckets.join(', ')}) for template ${template.templateId}.`,
        })
      }
    }

    if (options.capabilitySets && options.capabilitySets.length > 0) {
      const required = [
        ...(template.requiredRoles ?? []).map((role) => normalizeTag(role)),
        ...(template.requiredTags ?? []).map((tag) => normalizeTag(tag)),
      ]

      if (required.length > 0) {
        const satisfiable = options.capabilitySets.some((capabilitySet) =>
          required.every((need) => capabilitySet.has(need))
        )

        if (!satisfiable) {
          diagnostics.push({
            severity: 'warning',
            code: 'hard_gate_unsatisfied',
            templateId: template.templateId,
            message: `Template ${template.templateId} has hard gates (${required.join(', ')}) that are unsatisfied by provided capability sets.`,
          })
        }
      }
    }
  }

  const reachability = buildReachability(templates, entryTemplateIds)

  if (reachability.unreachableTemplateIds.length > 0) {
    diagnostics.push({
      severity: 'warning',
      code: 'unreachable_templates',
      message: `Found ${reachability.unreachableTemplateIds.length} unreachable templates from configured entry set.`,
    })
  }

  return {
    errors,
    warnings: diagnostics
      .filter((diagnostic) => diagnostic.severity === 'warning')
      .map((diagnostic) => diagnostic.message),
    diagnostics,
    reachability: {
      entryTemplateIds,
      reachableTemplateIds: reachability.reachableTemplateIds,
      unreachableTemplateIds: reachability.unreachableTemplateIds,
    },
  }
}

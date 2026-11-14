import type {
  ContentTemplateKernel,
  TemplateBandPolicy,
  TemplateRuntimeHook,
  TemplateRuntimeOptions,
  TemplateRuntimeParameters,
} from './contentTemplateKernel'

const HOOKS = {
  'protocol-material': 'prepare-material',
  'hazard-incident': 'resolve-incident',
  'doctrine-playbook': 'apply-doctrine',
} as const

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function token(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function finiteNonnegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

export function stringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && Array.from(value).every(token)
}

function own(record: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(record, key) ? record[key] : undefined
}

function validParameters(value: unknown, hook: string): boolean {
  if (!isRecord(value) || Object.keys(value).length === 0) return false
  const allowed =
    hook === 'prepare-material'
      ? 'recognitionThreshold'
      : hook === 'resolve-incident'
        ? 'riskThresholds'
        : 'reliability'
  if (Object.keys(value).some((key) => key !== allowed)) return false
  const parameter = own(value, allowed)
  if (allowed === 'riskThresholds') {
    return (
      Array.isArray(parameter) &&
      parameter.length > 0 &&
      Array.from(parameter).every(finiteNonnegative)
    )
  }
  return finiteNonnegative(parameter) && (allowed !== 'reliability' || parameter <= 1)
}

/** Structural and caller-configured limits. No default production balancing policy. */
export function validateTemplateKernel(value: unknown, policy?: TemplateBandPolicy): string[] {
  if (!isRecord(value)) return ['Invalid template']
  const errors: string[] = []
  for (const field of ['id', 'type']) {
    if (!token(value[field])) errors.push(`Missing ${field}`)
  }
  if (!token(value.family) || !Object.hasOwn(HOOKS, value.family)) errors.push('Unknown family')
  if (
    value.presentation !== undefined &&
    (!isRecord(value.presentation) || !token(value.presentation.summary))
  ) {
    errors.push('Missing presentation.summary')
  }
  const brief = value.brief
  if (
    brief !== undefined &&
    (!isRecord(brief) ||
      ['implementationSurface', 'runtimeBehavior', 'playerResult'].some(
        (key) => !token(brief[key])
      ))
  ) {
    errors.push('Invalid authoring brief')
  }
  if (value.runtime === undefined) return errors // Preserve existing undeclared family definitions.
  const runtime = value.runtime
  if (!isRecord(runtime)) return [...errors, 'Invalid runtime declaration']
  const expected =
    token(value.family) && Object.hasOwn(HOOKS, value.family)
      ? HOOKS[value.family as keyof typeof HOOKS]
      : undefined
  if (runtime.hook !== expected) errors.push('Unknown or mismatched runtime hook')
  for (const key of ['policyRef', 'actionBand', 'powerBand']) {
    if (!token(runtime[key])) errors.push(`Invalid ${key}`)
  }
  for (const key of ['cost', 'scope', 'exceptions', 'power']) {
    if (!finiteNonnegative(runtime[key])) errors.push(`Invalid ${key}`)
  }
  if (!Number.isInteger(runtime.exceptions)) errors.push('Invalid exception count')
  if (
    !isRecord(policy) ||
    !token(policy.id) ||
    policy.id !== runtime.policyRef ||
    !isRecord(policy.actionBands) ||
    !isRecord(policy.powerBands)
  ) {
    errors.push('Missing or mismatched policy')
  } else {
    const action = token(runtime.actionBand)
      ? own(policy.actionBands, runtime.actionBand)
      : undefined
    const power = token(runtime.powerBand) ? own(policy.powerBands, runtime.powerBand) : undefined
    if (
      !isRecord(action) ||
      !['minCost', 'maxScope', 'maxExceptions'].every((key) => finiteNonnegative(action[key])) ||
      !Number.isInteger(action.maxExceptions)
    ) {
      errors.push('Unknown or invalid action band')
    } else if (
      finiteNonnegative(runtime.cost) &&
      finiteNonnegative(runtime.scope) &&
      finiteNonnegative(runtime.exceptions) &&
      (runtime.cost < (action.minCost as number) ||
        runtime.scope > (action.maxScope as number) ||
        runtime.exceptions > (action.maxExceptions as number))
    ) {
      errors.push('Action band exceeded')
    }
    if (!isRecord(power) || !finiteNonnegative(power.maxPower)) {
      errors.push('Unknown or invalid power band')
    } else if (finiteNonnegative(runtime.power) && runtime.power > power.maxPower)
      errors.push('Power band exceeded')
  }
  if (runtime.alternatives !== undefined) {
    if (!Array.isArray(runtime.alternatives)) errors.push('Invalid alternatives')
    else {
      const ids = new Set<string>()
      for (const alternative of runtime.alternatives) {
        if (!isRecord(alternative) || !token(alternative.id)) {
          errors.push('Invalid alternative')
          continue
        }
        if (ids.has(alternative.id)) errors.push('Duplicate alternative id')
        ids.add(alternative.id)
        if (
          !Array.isArray(alternative.when) ||
          alternative.when.length === 0 ||
          Array.from(alternative.when).some(
            (condition) =>
              !isRecord(condition) ||
              !token(condition.context) ||
              !(
                typeof condition.value === 'string' ||
                typeof condition.value === 'boolean' ||
                (typeof condition.value === 'number' && Number.isFinite(condition.value))
              )
          )
        ) {
          errors.push('Invalid alternative conditions')
        }
        if (!validParameters(alternative.parameters, String(runtime.hook)))
          errors.push('Invalid hook parameters')
      }
    }
  }
  return errors
}

export class TemplateValidationError extends Error {
  readonly diagnostics: readonly string[]

  constructor(diagnostics: readonly string[]) {
    super(diagnostics.join('; '))
    this.name = 'TemplateValidationError'
    this.diagnostics = [...diagnostics]
  }
}

/** Resolve data only; each declared family hook retains its existing execution semantics. */
export function resolveTemplateRuntime(
  template: ContentTemplateKernel,
  hook: TemplateRuntimeHook,
  options?: TemplateRuntimeOptions
): TemplateRuntimeParameters {
  const errors = validateTemplateKernel(template, options?.policy)
  if (errors.length) throw new TemplateValidationError(errors)
  if (HOOKS[template.family] !== hook) throw new TemplateValidationError(['Mismatched family hook'])
  const context = options?.context ?? {}
  if (
    !isRecord(context) ||
    Object.values(context).some(
      (value) =>
        !(
          typeof value === 'string' ||
          typeof value === 'boolean' ||
          (typeof value === 'number' && Number.isFinite(value))
        )
    )
  ) {
    throw new TemplateValidationError(['Invalid runtime context'])
  }
  const matches = (template.runtime?.alternatives ?? []).filter((alternative) =>
    alternative.when.every(
      (condition) =>
        Object.hasOwn(context, condition.context) && context[condition.context] === condition.value
    )
  )
  if (matches.length > 1) throw new TemplateValidationError(['Conflicting contextual alternatives'])
  const parameters = matches[0]?.parameters
  return parameters
    ? {
        ...parameters,
        ...(parameters.riskThresholds ? { riskThresholds: [...parameters.riskThresholds] } : {}),
      }
    : {}
}

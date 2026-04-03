export function cloneSearchParams(searchParams?: URLSearchParams) {
  return new URLSearchParams(searchParams)
}

export function normalizeSearchQuery(value: string | null | undefined, maxLength = 120) {
  if (!value) {
    return ''
  }

  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength)
}

export function readEnumParam<T extends string>(
  searchParams: URLSearchParams,
  key: string,
  allowed: readonly T[],
  fallback: T
) {
  const value = searchParams.get(key)
  return value && allowed.includes(value as T) ? (value as T) : fallback
}

export function readStringParam(searchParams: URLSearchParams, key: string, maxLength = 120) {
  return normalizeSearchQuery(searchParams.get(key), maxLength)
}

export function writeEnumParam<T extends string>(
  searchParams: URLSearchParams,
  key: string,
  value: T,
  fallback: T
) {
  if (value === fallback) {
    searchParams.delete(key)
    return
  }

  searchParams.set(key, value)
}

export function writeStringParam(searchParams: URLSearchParams, key: string, value: string) {
  const normalized = normalizeSearchQuery(value)

  if (!normalized) {
    searchParams.delete(key)
    return
  }

  searchParams.set(key, normalized)
}

export function toSearchString(searchParams: URLSearchParams) {
  const value = searchParams.toString()
  return value ? `?${value}` : ''
}

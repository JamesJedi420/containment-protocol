// Shared pure validation for supplied capture JSON. No provider or policy selection.
export function captureValidation(prefix) {
  const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
  const positive = (value) => Number.isSafeInteger(value) && value > 0
  const nonnegative = (value) => Number.isSafeInteger(value) && value >= 0
  const revision = (value) =>
    typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value)
  const requireValue = (condition, field) => {
    if (!condition) throw new Error(`${prefix}: invalid ${field}`)
  }
  function fields(value, names, field) {
    requireValue(
      object(value) &&
        names.every((name) => Object.hasOwn(value, name)) &&
        Object.keys(value).every((name) => names.includes(name)),
      field
    )
  }
  function timestamp(value) {
    requireValue(
      typeof value === 'string' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value),
      'timestamp'
    )
    const time = Date.parse(value)
    requireValue(
      Number.isFinite(time) &&
        new Date(`${value.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) ===
          value.slice(0, 10),
      'timestamp'
    )
    return new Date(time).toISOString()
  }
  function parseUrl(value, limit = 2048) {
    requireValue(typeof value === 'string' && value.length <= limit, 'URL')
    let url
    try {
      url = new URL(value)
    } catch {
      throw new Error(`${prefix}: invalid URL`)
    }
    requireValue(
      url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.hash,
      'URL'
    )
    return url
  }
  function reference(value, input) {
    const url = parseUrl(value),
      repoPrefix = `/${input.repository.fullName}/`
    const github =
      url.hostname === 'github.com' &&
      url.pathname.startsWith(repoPrefix) &&
      /^(?:pull\/[1-9]\d*|commit\/[a-f0-9]{40}|actions\/runs\/[1-9]\d*|blob\/[a-f0-9]{40}\/[A-Za-z0-9_./-]+)$/.test(
        url.pathname.slice(repoPrefix.length)
      )
    const linear =
      url.hostname === 'linear.app' &&
      new RegExp(String.raw`^/${input.linearWorkspace}/issue/SPE-[1-9]\d*(?:/[a-z0-9-]+)?$`).test(
        url.pathname
      )
    requireValue(
      !url.search &&
        (github || linear) &&
        !url.pathname.split('/').some((part) => part === '.' || part === '..'),
      'reference'
    )
    return url.href
  }
  function paginationLinks(link, current, pageOfUrl) {
    if (link === null) return { nextPage: null, lastPage: null }
    requireValue(typeof link === 'string' && link.length > 0 && link.length <= 16384, 'Link header')
    const relations = new Map()
    for (const item of link.split(',')) {
      const match = /^\s*<([^<>]+)>;\s*rel="(next|prev|first|last)"\s*$/.exec(item)
      requireValue(match !== null && !relations.has(match[2]), 'Link relations')
      relations.set(match[2], pageOfUrl(match[1]))
    }
    requireValue(
      (!relations.has('next') || relations.get('next') === current + 1) &&
        (!relations.has('prev') || relations.get('prev') === current - 1) &&
        (!relations.has('first') || relations.get('first') === 1) &&
        (!relations.has('last') ||
          (relations.get('last') >= (relations.get('next') ?? current) &&
            (relations.get('last') === current || relations.has('next')))),
      'page chain'
    )
    return { nextPage: relations.get('next') ?? null, lastPage: relations.get('last') ?? null }
  }
  function validatePageChain(rows) {
    for (let i = 0; i < rows.length; i++)
      requireValue(
        rows[i].number === i + 1 &&
          (i === 0 ||
            (rows[i - 1].nextPage === rows[i].number &&
              rows[i - 1].observedAt <= rows[i].observedAt)),
        'page chain'
      )
    const lastPages = new Set(rows.map((page) => page.lastPage).filter((value) => value !== null))
    const last = rows.at(-1),
      [lastPage] = lastPages
    requireValue(
      lastPages.size <= 1 &&
        (!last ||
          lastPage === undefined ||
          (last.number <= lastPage &&
            (last.nextPage !== null ? last.nextPage <= lastPage : last.number === lastPage))),
      'page chain'
    )
  }
  return {
    object,
    positive,
    nonnegative,
    revision,
    requireValue,
    fields,
    timestamp,
    parseUrl,
    reference,
    paginationLinks,
    validatePageChain,
  }
}

import { ROLE_LABELS, ROLE_COVERAGE_LABELS } from '../data/copy'

/** Reference identity and lookup only. Publication is authored, never inferred from campaign truth. */
export interface ReferenceCategory {
  id: string
  label: string
}
export interface ReferenceEntry {
  id: string
  categoryId: string
  label: string
  aliases: readonly string[]
  summary: string
  paragraphs: readonly string[]
  projection: string
  publication: 'public' | 'withheld'
  related: readonly { id: string; relation: 'related' | 'prerequisite' | 'consequence' }[]
}
export interface ReferenceSearchPolicy {
  unicode: boolean
  case: boolean
  apostrophes: boolean
  dashes: boolean
  diacritics: boolean
}
export const REFERENCE_SEARCH_POLICY: ReferenceSearchPolicy = {
  unicode: true,
  case: true,
  apostrophes: true,
  dashes: true,
  diacritics: true,
}
export const REFERENCE_CATEGORIES: readonly ReferenceCategory[] = [
  { id: 'workspace', label: 'Using the workspace' },
  { id: 'personnel', label: 'People and teams' },
  { id: 'information', label: 'Understanding information' },
]
export const REFERENCE_ENTRIES: readonly ReferenceEntry[] = [
  {
    id: 'reference.controls',
    categoryId: 'workspace',
    label: 'Controls and bindings',
    aliases: ['shortcuts', 'keyboard', 'controller', 'remapping'],
    publication: 'public',
    summary: 'Inspect your configured input bindings and change them in Settings.',
    paragraphs: [
      'Settings → Controls lets you capture, clear and reset bindings. Native buttons remain available for pointer, touch and assistive activation.',
      'The assignments below come from your current controls preferences. A configured controller binding does not mean a controller is connected.',
    ],
    projection: 'controls',
    related: [{ id: 'reference.navigation', relation: 'related' }],
  },
  {
    id: 'reference.navigation',
    categoryId: 'workspace',
    label: 'Back and forward',
    aliases: ['navigation', 'history', 'back/forward', 'workspace'],
    publication: 'public',
    summary: 'Revisit available screens without replaying campaign decisions.',
    paragraphs: [
      'Back and Forward use the screens visited in this session. They preserve route-owned filters, skip unavailable destinations and return focus to the main content.',
      'Reloading or replacing the campaign starts a new tracked history. These controls do not undo simulation actions. Closing this reference returns to the workflow that opened it.',
    ],
    projection: 'navigation',
    related: [{ id: 'reference.controls', relation: 'related' }],
  },
  {
    id: 'reference.specializations',
    categoryId: 'personnel',
    label: 'Agent specializations',
    aliases: ['agent specialisations', 'classes', 'specialists', ...Object.values(ROLE_LABELS)],
    publication: 'public',
    summary: 'Read the public specialization names used by the Agents catalogue.',
    paragraphs: [
      'Specialization labels describe agent classes. The catalogue below is shared with the Agents surface; it does not reveal any individual’s hidden capabilities or potential.',
      'Check the actual team and mission requirements when making an assignment. A specialization label alone is not an eligibility result.',
    ],
    projection: 'specializations',
    related: [{ id: 'reference.coverage', relation: 'related' }],
  },
  {
    id: 'reference.coverage',
    categoryId: 'personnel',
    label: 'Team coverage roles',
    aliases: ['team roles', 'coverage', 'composition', ...Object.values(ROLE_COVERAGE_LABELS)],
    publication: 'public',
    summary: 'Distinguish team coverage labels from individual specialization names.',
    paragraphs: [
      'Team composition and mission requirements use the canonical coverage roles below. The Teams and Cases surfaces remain the source for current readiness, blockers and assignment decisions.',
    ],
    projection: 'coverage',
    related: [
      { id: 'reference.specializations', relation: 'related' },
      { id: 'reference.information', relation: 'related' },
    ],
  },
  {
    id: 'reference.information',
    categoryId: 'information',
    label: 'Information and uncertainty',
    aliases: ['intel', 'intelligence', 'confidence', 'provenance', 'unknown'],
    publication: 'public',
    summary: 'Use each operational surface’s stated knowledge, confidence and provenance.',
    paragraphs: [
      'An estimate is not confirmed knowledge. Consult the current operational explanation and its stated uncertainty before acting.',
      'This entry offers general reading guidance. It does not supply missing facts, identify hidden entities or turn an uncertain assessment into an exact value.',
    ],
    projection: 'guidance',
    related: [{ id: 'reference.coverage', relation: 'related' }],
  },
]

/** Lookup transforms never rewrite authored display text or establish identity. */
export function normalizeReferenceSearch(value: string, policy = REFERENCE_SEARCH_POLICY): string {
  let result = policy.unicode ? value.normalize('NFC') : value
  if (policy.case) result = result.toLowerCase()
  if (policy.apostrophes) result = result.replace(/[\u2018\u2019\u02bc`]/g, "'")
  if (policy.dashes) result = result.replace(/[\u2010-\u2015\u2212]/g, '-')
  if (policy.diacritics) result = result.normalize('NFD').replace(/\p{M}/gu, '')
  if (policy.unicode) result = result.normalize('NFC')
  return result.trim().replace(/\s+/g, ' ')
}

interface IndexedReference extends ReferenceEntry {
  searchText: string
}
export interface ReferenceLibraryIndex {
  entries: readonly IndexedReference[]
  categories: readonly ReferenceCategory[]
  unavailable: boolean
  policy: ReferenceSearchPolicy
}
const validId = (id: string) => /^[a-z][a-z0-9.-]{0,95}$/.test(id)
const validText = (text: string, maximum: number) =>
  typeof text === 'string' && text.trim().length > 0 && text.length <= maximum
const compareIds = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0)

export function buildReferenceIndex(
  definitions: readonly ReferenceEntry[] = REFERENCE_ENTRIES,
  categories: readonly ReferenceCategory[] = REFERENCE_CATEGORIES,
  policy: ReferenceSearchPolicy = REFERENCE_SEARCH_POLICY
): ReferenceLibraryIndex {
  const empty = { entries: [], categories: [], unavailable: true, policy }
  if (definitions.length > 256 || categories.length > 16) return empty
  const categoryIds = new Set(categories.map((category) => category.id))
  if (
    categoryIds.size !== categories.length ||
    categories.some((category) => !validId(category.id) || !validText(category.label, 120))
  )
    return empty
  const counts = new Map<string, number>()
  for (const entry of definitions) counts.set(entry.id, (counts.get(entry.id) ?? 0) + 1)
  let unavailable = false
  const entries: IndexedReference[] = []
  for (const entry of definitions) {
    if (entry.publication !== 'public') continue
    if (
      !validId(entry.id) ||
      counts.get(entry.id) !== 1 ||
      !categoryIds.has(entry.categoryId) ||
      !validText(entry.label, 120) ||
      !validText(entry.summary, 400) ||
      entry.aliases.length > 16 ||
      entry.aliases.some((alias) => !validText(alias, 120)) ||
      entry.paragraphs.length > 6 ||
      entry.paragraphs.some((paragraph) => !validText(paragraph, 600)) ||
      entry.related.length > 16
    ) {
      unavailable = true
      continue
    }
    entries.push({
      ...entry,
      searchText: normalizeReferenceSearch(
        [entry.label, entry.summary, ...entry.aliases].join(' '),
        policy
      ),
    })
  }
  entries.sort(
    (left, right) =>
      categories.findIndex((category) => category.id === left.categoryId) -
        categories.findIndex((category) => category.id === right.categoryId) ||
      compareIds(left.id, right.id)
  )
  return {
    entries,
    categories: categories.filter((category) =>
      entries.some((entry) => entry.categoryId === category.id)
    ),
    unavailable,
    policy,
  }
}

export function searchReferenceEntries(
  index: ReferenceLibraryIndex,
  query: string,
  categoryId = ''
): readonly ReferenceEntry[] {
  const terms = normalizeReferenceSearch(query.slice(0, 160), index.policy)
    .split(' ')
    .filter(Boolean)
  return index.entries.filter(
    (entry) =>
      (!categoryId || entry.categoryId === categoryId) &&
      terms.every((term) => entry.searchText.includes(term))
  )
}

export function findReferenceEntry(
  index: ReferenceLibraryIndex,
  id: string
): ReferenceEntry | undefined {
  return index.entries.find((entry) => entry.id === id)
}

export function relatedReferenceEntries(index: ReferenceLibraryIndex, entry: ReferenceEntry) {
  const seen = new Set<string>()
  return entry.related.flatMap((link) => {
    const target = findReferenceEntry(index, link.id)
    if (!target || target.id === entry.id || seen.has(target.id)) return []
    seen.add(target.id)
    return [{ entry: target, relation: link.relation }]
  })
}

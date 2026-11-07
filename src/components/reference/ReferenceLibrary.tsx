import { useId, useLayoutEffect, useRef, useState } from 'react'
import {
  buildReferenceIndex,
  findReferenceEntry,
  relatedReferenceEntries,
  searchReferenceEntries,
} from '../../app/referenceLibrary'
import { projectReferenceEntry } from '../../app/referenceLibraryView'
import { useInputConsumer, useInputPreferences } from '../../app/inputRuntime'

const index = buildReferenceIndex()

/** Shared by the Help route and the context-preserving shell dialog. No campaign writes. */
export function ReferenceLibrary({
  initialEntryId,
  modal = false,
  active = true,
}: {
  initialEntryId?: string
  modal?: boolean
  active?: boolean
}) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [selectedId, setSelectedId] = useState(initialEntryId ?? '')
  const search = useRef<HTMLInputElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const resultButtons = useRef(new Map<string, HTMLButtonElement>())
  const returnTarget = useRef<string | null>(null)
  const { preferences } = useInputPreferences()
  const results = searchReferenceEntries(index, query, category)
  const selected = findReferenceEntry(index, selectedId)
  const projection = selected ? projectReferenceEntry(selected, preferences) : undefined
  const position = results.findIndex((entry) => entry.id === selectedId)
  const previous = position > 0 ? results[position - 1] : undefined
  const next = position < results.length - 1 ? results[position + 1] : undefined
  useInputConsumer({
    id: 'reference.previous',
    context: modal ? 'modal' : 'focused',
    available: () =>
      active && !!previous && (modal || !!root.current?.contains(document.activeElement)),
    execute: () => previous && setSelectedId(previous.id),
  })
  useInputConsumer({
    id: 'reference.next',
    context: modal ? 'modal' : 'focused',
    available: () =>
      active && !!next && (modal || !!root.current?.contains(document.activeElement)),
    execute: () => next && setSelectedId(next.id),
  })
  useLayoutEffect(() => {
    if (!active) return
    if (selectedId) heading.current?.focus()
    else if (returnTarget.current !== null) {
      ;(resultButtons.current.get(returnTarget.current) ?? search.current)?.focus()
      returnTarget.current = null
    }
  }, [selectedId, active])
  return (
    <div className="reference-library" ref={root}>
      <div className="reference-filters">
        <label htmlFor={`${id}-search`}>Search reference</label>
        <input
          ref={search}
          id={`${id}-search`}
          type="search"
          maxLength={160}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <label htmlFor={`${id}-category`}>Category</label>
        <select
          id={`${id}-category`}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">All categories</option>
          {index.categories.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
      </div>
      {index.unavailable && <p role="status">Some reference content is unavailable.</p>}
      <p role="status">
        {results.length} reference {results.length === 1 ? 'entry' : 'entries'}
      </p>
      <ul aria-label="Reference entries" className="reference-results">
        {results.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              className="btn btn-ghost"
              ref={(element) => {
                if (element) resultButtons.current.set(entry.id, element)
                else resultButtons.current.delete(entry.id)
              }}
              aria-current={selectedId === entry.id ? 'true' : undefined}
              onClick={() => {
                setSelectedId(entry.id)
                if (selectedId === entry.id) heading.current?.focus()
              }}
            >
              {entry.label}
            </button>
          </li>
        ))}
      </ul>
      {!results.length && <p>No matching entries. Try another term or category.</p>}
      {selectedId && (
        <section aria-labelledby={`${id}-detail`} className="reference-detail">
          <h3 id={`${id}-detail`} ref={heading} tabIndex={-1}>
            {selected?.label ?? 'Reference unavailable'}
          </h3>
          {selected && projection?.status === 'available' ? (
            <>
              <p>{selected.summary}</p>
              {selected.paragraphs.map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex}>{paragraph}</p>
              ))}
              <p className="text-sm">Source: {projection.sourceLabel}</p>
              <dl>
                {projection.facts.map((fact) => (
                  <div key={fact.id}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
              <nav aria-label="Related reference entries">
                <ul>
                  {relatedReferenceEntries(index, selected).map(({ entry, relation }) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setSelectedId(entry.id)}
                      >
                        {entry.label} ({relation})
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            </>
          ) : (
            <p>This reference is unavailable. No replacement rules are inferred.</p>
          )}
          <div className="reference-navigation">
            <button
              type="button"
              className="btn"
              disabled={!previous}
              onClick={() => previous && setSelectedId(previous.id)}
            >
              Previous entry
            </button>
            <button
              type="button"
              className="btn"
              disabled={!next}
              onClick={() => next && setSelectedId(next.id)}
            >
              Next entry
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                returnTarget.current = selectedId
                setSelectedId('')
              }}
            >
              Return to results
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

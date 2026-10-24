import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { createStartingState } from '../data/startingState'
import { getFrontDeskAuthoredState } from '../domain/frontDeskAuthored'
import { consumeOneShotContent, setPersistentFlag } from '../domain/flagSystem'
import { getFrontDeskBriefingView } from '../features/operations/frontDeskView'
import { hasSafeFrontDeskFallback } from '../domain/stabilityLayer'

describe('front-desk authored ownership', () => {
  it('keeps selected notice, choice and route metadata identical to the presentation', () => {
    const initial = createStartingState()
    const consumed = consumeOneShotContent(initial, 'frontdesk.tutorial.weekly-report').state
    const breach = setPersistentFlag(initial, 'containment.breach.followup_unlocked', true)
    for (const state of [initial, consumed, breach, { ...initial, week: 4 }]) {
      const before = JSON.stringify(state)
      const authored = getFrontDeskAuthoredState(state)
      const view = getFrontDeskBriefingView(state)
      expect(view.debug).toEqual(authored.debug)
      expect(view.notices.map(({ id, choices }) => ({ id, choices }))).toEqual(
        authored.notices.map(({ id, choices }) => ({ id, choices }))
      )
      expect(view.directorMessage.trim()).not.toBe('')
      expect(
        view.notices.every((notice) => notice.title.length > 0 && notice.body.length > 0)
      ).toBe(true)
      expect(hasSafeFrontDeskFallback(state)).toEqual({
        safe: true,
        reasons: [],
        directorMessageRouteId: authored.directorRouteId,
      })
      expect(JSON.stringify(state)).toBe(before)
    }
  })

  it('keeps the recovered domain import graph free of feature, app and React dependencies', () => {
    const visited = new Set<string>()
    function inspect(file: string) {
      if (visited.has(file)) return
      visited.add(file)
      const source = fs.readFileSync(file, 'utf8')
      const imports = [...source.matchAll(/(?:from\s*|import\s*\()(['"])([^'"]+)\1/g)]
      for (const [, , specifier] of imports) {
        expect(specifier, `${file}: ${specifier}`).not.toMatch(/(?:features|components|app)\//)
        expect(specifier, file).not.toMatch(/^react(?:-dom|-router)?(?:\/|$)/)
        // Follow recovered interfaces, rather than extending the general boundary validator.
        if (specifier.startsWith('./frontDesk')) {
          inspect(path.resolve(path.dirname(file), `${specifier}.ts`))
        }
      }
    }
    for (const name of ['screenRouting', 'stabilityLayer', 'frontDeskAuthored']) {
      inspect(path.resolve('src/domain', `${name}.ts`))
    }
  })
})

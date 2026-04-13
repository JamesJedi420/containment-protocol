import { createStartingState } from '../../data/startingState'
import type { GameState } from '../../domain/models'
import {
  RUN_EXPORT_KIND,
  hydrateGame,
  parseRunExport,
  stripGameTemplates,
  type PersistedGame,
} from './runTransfer'

export const GAME_SAVE_KIND = 'containment-protocol-save'
export const GAME_SAVE_VERSION = 1

export interface GameSavePayload {
  kind: typeof GAME_SAVE_KIND
  version: typeof GAME_SAVE_VERSION
  savedAt: string
  state: PersistedGame
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Explicit manual save format for the current project state.
 * Keep this small and readable: field-level normalization belongs in `hydrateGame`,
 * while future format migrations should branch from `version` here.
 */
export function createGameSavePayload(game: GameState): GameSavePayload {
  return {
    kind: GAME_SAVE_KIND,
    version: GAME_SAVE_VERSION,
    savedAt: new Date().toISOString(),
    state: stripGameTemplates(game),
  }
}

export function serializeGameSave(game: GameState) {
  return JSON.stringify(createGameSavePayload(game), null, 2)
}

export function hydrateGameSavePayload(payload: unknown, fallback = createStartingState()): GameState {
  if (isRecord(payload) && payload.kind === RUN_EXPORT_KIND && 'game' in payload) {
    return hydrateGame(payload.game, fallback)
  }

  if (!isRecord(payload) || payload.kind !== GAME_SAVE_KIND || !('state' in payload)) {
    throw new Error('Save payload is not a supported Containment Protocol save.')
  }

  if (typeof payload.version !== 'number' || payload.version > GAME_SAVE_VERSION) {
    throw new Error('Save payload version is not supported by this build.')
  }

  return hydrateGame(payload.state, fallback)
}

export function loadGameSave(raw: string, fallback = createStartingState()): GameState {
  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Save payload is not valid JSON.')
  }

  if (isRecord(parsed) && parsed.kind === RUN_EXPORT_KIND) {
    // Keep existing export/import payloads loadable while the UI migrates to the
    // dedicated save wrapper. This preserves earlier debugging/dev saves.
    return parseRunExport(raw, fallback)
  }

  return hydrateGameSavePayload(parsed, fallback)
}

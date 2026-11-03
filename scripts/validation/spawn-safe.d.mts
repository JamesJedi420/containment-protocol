import type { SpawnSyncOptionsWithStringEncoding, SpawnSyncReturns } from 'node:child_process'

export function spawnSafe(
  command: string,
  args: string[],
  options: SpawnSyncOptionsWithStringEncoding
): SpawnSyncReturns<string>

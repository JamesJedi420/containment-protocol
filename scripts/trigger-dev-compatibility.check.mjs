import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import { emitDecoratorMetadata } from '@trigger.dev/build/extensions/typescript'

async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), 'cp-trigger-compat-'))
  try {
    await run(root)
  } finally {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()))
    await rm(root, { recursive: true, force: true })
  }
}

test('Trigger.dev emits decorator metadata with the repository compiler and config parser', async () => {
  await fixture(async (root) => {
    await writeFile(
      join(root, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
        },
      })
    )
    const source = join(root, 'example.ts')
    await writeFile(
      source,
      'declare function mark(target: object): void;\n@mark\nclass Example { constructor(public value: string) {} }'
    )
    let plugin
    emitDecoratorMetadata().onBuildStart({
      workingDir: process.cwd(),
      logger: { debug() {} },
      registerPlugin(value) {
        plugin = value
      },
    })
    let onLoad
    await plugin.setup({
      onLoad(_options, callback) {
        onLoad = callback
      },
    })
    const output = await onLoad({ path: source })
    assert.match(output.contents, /__decorate/)
    assert.match(output.contents, /__metadata\("design:paramtypes"/)
  })
})

test('Trigger.dev Prisma dependency loads config with the patched merger and Zod', async () => {
  const buildRequire = createRequire(import.meta.resolve('@trigger.dev/build'))
  const { loadConfigFromFile } = await import(
    pathToFileURL(buildRequire.resolve('@prisma/config')).href
  )
  await fixture(async (root) => {
    const configFile = join(root, 'prisma.config.ts')
    await writeFile(
      configFile,
      'export default { schema: "schema.prisma", migrations: { path: "migrations" } }'
    )
    const result = await loadConfigFromFile({ configFile, configRoot: root })
    assert.equal(result.error, undefined, JSON.stringify(result.error))
    assert.equal(result.config.schema, join(root, 'schema.prisma'))
    assert.equal(result.config.migrations.path, join(root, 'migrations'))
  })
})

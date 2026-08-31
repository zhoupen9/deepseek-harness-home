/**
 * Built-bundle smoke spec (node environment, no jsdom): the tsdown artifact
 * registers the loader handoff and its factory resolves to the module exports
 * { apply, inject } without side effects. Skips when lib/client.js is not
 * built (`pnpm --filter @deepseek-ai/dsh-client-ui-files bundle`).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const PLUGIN_ID = '@deepseek-ai/dsh-client-ui-files'

interface Handoff {
  id: string
  factory: (require: (spec: string) => unknown) => Record<string, unknown>
}

type Win = { __ModuleLoader__?: { load(h: Handoff): void } }

type WindowedGlobal = { window?: Win }

function readBundle(): string | undefined {
  try {
    return readFileSync(resolve('packages/client/ui-files/lib/client.js'), 'utf8')
  } catch {
    return undefined
  }
}

describe('tsdown client artifact (smoke)', () => {
  const code = readBundle()

  function installWindow(): void {
    // The bundle addresses the browser global: `window.__ModuleLoader__`.
    ;(globalThis as unknown as WindowedGlobal).window = globalThis as unknown as Win
  }

  it.skipIf(code === undefined)('evaluates to the loader handoff with the plugin id', () => {
    installWindow()
    let handoff: Handoff | undefined
    ;(globalThis as Win).__ModuleLoader__ = { load: (h) => { handoff = h } }
    // Deliberate built-bundle fixture running in this scope.
    // oxlint-disable-next-line typescript/no-implied-eval, typescript/no-unsafe-call
    new Function(code!)()
    expect(handoff).toBeDefined()
    expect(handoff!.id).toBe(PLUGIN_ID)
    expect(typeof handoff!.factory).toBe('function')
  })

  it.skipIf(code === undefined)('factory resolves to { apply, inject } with stub externals', () => {
    installWindow()
    let handoff: Handoff | undefined
    ;(globalThis as Win).__ModuleLoader__ = { load: (h) => { handoff = h } }
    new Function(code!)()
    const exports = handoff!.factory(() => ({}))
    expect(typeof exports.apply).toBe('function')
    expect(exports.inject).toEqual(['slots', 'sessions', 'uiSession', 'uiConversation', 'locale', 'remote', 'remote.workspaceFiles'])
  })
})

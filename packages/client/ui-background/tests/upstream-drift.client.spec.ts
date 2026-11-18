/**
 * Upstream-drift guard for the pieces this profile-local plugin mirrors or
 * depends on: the theme override API, the General settings slot, the tokens
 * cleared by the override, the authenticated file route for local paths, the
 * primitives the row renders, and the bundle/profile wiring in this home.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { BACKGROUND_SETTINGS_NAMESPACE } from '../src/client/settings.ts'

/** The local DSH home root (`~/.dsh`) from this test file. */
const HOME = fileURLToPath(new URL('../../../../', import.meta.url))

/** Walk up from a directory until the harness package tree is found. */
function harnessFrom(start: string): string | undefined {
  let current = resolve(start)
  for (;;) {
    if (existsSync(join(current, 'packages/client/ui-primitives/src/index.ts'))) return current
    const parent = dirname(current)
    if (parent === current) return undefined
    current = parent
  }
}

/** Resolve the harness checkout the local dsh runs from. */
function harnessRoot(): string | undefined {
  const configured = process.env.DSH_HARNESS_DIR
  if (configured !== undefined && configured !== '') return harnessFrom(configured)
  for (const dir of (process.env.PATH ?? '').split(':')) {
    if (dir === '' || !existsSync(join(dir, 'dsh'))) continue
    const found = harnessFrom(dir)
    if (found !== undefined) return found
  }
  return undefined
}

const HARNESS = harnessRoot()
const read = (relative: string): string => readFileSync(join(HARNESS!, relative), 'utf8')
const readHome = (relative: string): string => readFileSync(join(HOME, relative), 'utf8')

describe.runIf(HARNESS !== undefined)('harness surfaces this plugin relies on', () => {
  it('keeps the theme override API and the General item slot', () => {
    const theme = read('packages/client/ui-theme/src/client/index.ts')
    expect(theme).toContain('overrideTokens(source: string')
    expect(theme).toContain("'settings.general.item'")
    const tokens = read('packages/client/ui-theme/src/styles/design-platform.css')
    expect(tokens).toContain('--dsw-alias-bg-base:')
    expect(tokens).toContain('--dsw-specific-sidebar-fill:')
    // The base layer under the image paints these two palette aliases, and the
    // palette attribute that selects the dark variant.
    expect(tokens).toContain('--dsw-alias-bg-base: var(--dsw-static-neutral-bluish-00)')
    expect(tokens).toContain('--dsw-alias-bg-base: var(--dsw-static-neutral-bluish-950)')
    expect(tokens).toContain('body[data-ds-dark-theme]')
  })

  it('keeps the authenticated file route for local paths', () => {
    const media = read('packages/api/session-controller/src/media-references.ts')
    expect(media).toContain("path: '/api/file'")
    expect(media).toContain("methods: ['GET', 'HEAD']")
    expect(read('packages/bundle/web-app/cordis.patch.yml')).toContain('- id: session-controller')
  })

  it('keeps the row primitives exported', () => {
    const primitives = read('packages/client/ui-primitives/src/index.ts')
    expect(primitives).toContain('export { Input }')
    expect(primitives).toContain('export { Switch }')
  })

  it('keeps every module the built bundle requires in the shell baseline', () => {
    const bundle = readFileSync(join(HOME, 'packages/client/ui-background/lib/client.js'), 'utf8')
    expect(bundle.startsWith('window.__ModuleLoader__.load({')).toBe(true)
    expect(bundle).toContain('id: "@zar-desktop/ui-background"')
    const platform = read('packages/client/web/src/platform.ts')
    const required = new Set([...bundle.matchAll(/require\("([^"]+)"\)/g)].map(match => match[1]))
    for (const name of required) expect(platform, name).toContain(`'${name}'`)
  })
})

describe('bundle and profile wiring in this home', () => {
  it('keeps the namespace name equal to the bundle row id', () => {
    expect(BACKGROUND_SETTINGS_NAMESPACE).toBe('ui-background')
    const patch = readHome('packages/bundles/zar-desktop/cordis.patch.yml')
    expect(patch).toContain('id: ui-background')
    expect(patch).toContain("name: '@zar-desktop/ui-background'")
  })

  it('links the package into both profiles', () => {
    for (const profile of ['web', 'desktop']) {
      const manifest = JSON.parse(readHome(`profiles/${profile}/package.json`)) as { dependencies?: Record<string, string> }
      expect(manifest.dependencies?.['@zar-desktop/ui-background'], profile)
        .toBe('link:../../packages/client/ui-background')
    }
  })

  it('declares the browser half with only baseline module requests', () => {
    const manifest = JSON.parse(readHome('packages/client/ui-background/package.json')) as {
      dsh?: { client?: { platform?: string; external?: string[] } }
    }
    expect(manifest.dsh?.client?.platform).toBe('web')
    expect(manifest.dsh?.client?.external).toBeUndefined()
  })
})

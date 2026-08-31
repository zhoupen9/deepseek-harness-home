/**
 * Behavior spec for extension → language hint derivation.
 *
 * Runs standalone with vitest (all @deepseek-ai imports are type-only and
 * erased at runtime).
 */
import { describe, expect, it } from 'vitest'
import { langFromPath } from '../src/client/files-lang.ts'

describe('langFromPath', () => {
  it('maps well-known extensions', () => {
    expect(langFromPath('src/main.ts')).toBe('ts')
    expect(langFromPath('app.py')).toBe('py')
    expect(langFromPath('run.sh')).toBe('sh')
    expect(langFromPath('README.md')).toBe('md')
    expect(langFromPath('pkg.json')).toBe('json')
    expect(langFromPath('style.css')).toBe('css')
    expect(langFromPath('cargo.toml')).toBe('toml')
  })

  it('is case-insensitive on the extension', () => {
    expect(langFromPath('Main.TS')).toBe('ts')
  })

  it('returns undefined for dotfiles with no extension', () => {
    expect(langFromPath('.gitignore')).toBeUndefined()
    expect(langFromPath('.env')).toBeUndefined()
  })

  it('returns undefined for unknown extensions', () => {
    expect(langFromPath('notes.xyz')).toBeUndefined()
    expect(langFromPath('Makefile')).toBeUndefined()
  })

  it('is safe against Object.prototype extension keys', () => {
    expect(langFromPath('foo.constructor')).toBeUndefined()
    expect(langFromPath('foo.__proto__')).toBeUndefined()
  })

  it('handles backslash separators', () => {
    expect(langFromPath('dir\\app.py')).toBe('py')
  })
})

/**
 * Behavior spec for the Edits diff syntax highlighter and extension mapping:
 * langFromPath derives a language hint for well-known code extensions, and
 * highlightLine classifies each source line into token spans whose text
 * round-trips to the original line.
 */
import { describe, expect, it } from 'vitest'
import { highlightLine } from '../src/client/edits-highlight.ts'
import { langFromPath } from '../src/client/edits-lang.ts'

describe('langFromPath', () => {
  it('maps well-known code extensions', () => {
    expect(langFromPath('src/a.ts')).toBe('typescript')
    expect(langFromPath('src/a.jsx')).toBe('typescript')
    expect(langFromPath('a.py')).toBe('python')
    expect(langFromPath('a.go')).toBe('go')
    expect(langFromPath('a.rs')).toBe('rust')
    expect(langFromPath('a.java')).toBe('java')
    expect(langFromPath('a.sh')).toBe('shell')
    expect(langFromPath('a.json')).toBe('json')
    expect(langFromPath('a.yaml')).toBe('yaml')
    expect(langFromPath('a.css')).toBe('css')
    expect(langFromPath('a.sql')).toBe('sql')
  })

  it('is case-insensitive on the extension', () => {
    expect(langFromPath('a.TSX')).toBe('typescript')
    expect(langFromPath('a.PY')).toBe('python')
  })

  it('yields undefined for non-code / unknown / dotfiles', () => {
    expect(langFromPath('Makefile')).toBeUndefined()
    expect(langFromPath('.gitignore')).toBeUndefined()
    expect(langFromPath('a.unknown')).toBeUndefined()
    expect(langFromPath('a.constructor')).toBeUndefined()
  })
})

describe('highlightLine', () => {
  it('round-trips every token back to the source line', () => {
    const samples = [
      ['const x = 42;', 'typescript'],
      ['function foo(a, b) { return a + b }', 'typescript'],
      ['let s = "hi"; // tail', 'typescript'],
      ['def foo(x):\n    return x', 'python'],
      ['echo "$HOME" > /dev/null', 'shell'],
      ['{ "key": [1, 2.5, true, null] }', 'json'],
      ['SELECT * FROM users WHERE id = 1;', 'sql'],
    ] as const
    for (const [line, lang] of samples) {
      const tokens = highlightLine(line, lang)
      expect(tokens.map(t => t.text).join('')).toBe(line)
    }
  })

  it('falls back to a single plain span for unknown or absent languages', () => {
    expect(highlightLine('const x = 1', undefined)).toEqual([{ text: 'const x = 1', kind: 'plain' }])
    expect(highlightLine('const x = 1', 'nope')).toEqual([{ text: 'const x = 1', kind: 'plain' }])
  })

  it('classifies TypeScript keywords, strings, numbers, and literals', () => {
    expect(highlightLine('const', 'typescript').map(t => t.kind)).toEqual(['keyword'])
    expect(highlightLine('"hello"', 'typescript').map(t => t.kind)).toEqual(['string'])
    expect(highlightLine('42', 'typescript').map(t => t.kind)).toEqual(['number'])
    expect(highlightLine('null', 'typescript').map(t => t.kind)).toEqual(['literal'])
  })

  it('classifies comments and function calls', () => {
    expect(highlightLine('// note', 'typescript').map(t => t.kind)).toEqual(['comment'])
    expect(highlightLine('# note', 'python').map(t => t.kind)).toEqual(['comment'])
    const kinds = highlightLine('foo(1)', 'typescript').map(t => t.kind)
    expect(kinds[0]).toBe('function')
  })

  it('classifies shell and php variables', () => {
    expect(highlightLine('$HOME', 'shell').map(t => t.kind)).toEqual(['variable'])
    expect(highlightLine('${PATH}', 'shell').map(t => t.kind)).toEqual(['variable'])
    expect(highlightLine('$value', 'php').map(t => t.kind)).toEqual(['variable'])
  })

  it('does not treat $ as a variable in the JS family', () => {
    const kinds = highlightLine('$foo', 'typescript').map(t => t.kind)
    expect(kinds).not.toContain('variable')
  })
})

/**
 * File-extension -> syntax-highlighting language hints for the Changes diff.
 * Covers the well-known code extensions the diff always highlights; the ids
 * are the spec keys ./changes-highlight.ts resolves (ts->typescript, py->python,
 * sh->shell, ...). Unknown or non-code extensions yield undefined and the
 * diff renders plain monospace - never an error.
 * @module @deepseek-ai/dsh-client-ui-changes/client
 */

/** Extension (without dot, lower-cased) -> language hint. */
const LANG_BY_EXTENSION: Readonly<Record<string, string>> = {
  // JS family (one grammar for all aliases).
  ts: 'typescript', tsx: 'typescript', mts: 'typescript', cts: 'typescript',
  js: 'typescript', jsx: 'typescript', mjs: 'typescript', cjs: 'typescript',
  // Scripting / data.
  json: 'json', jsonc: 'json',
  py: 'python',
  sh: 'shell', bash: 'shell', zsh: 'shell',
  rb: 'ruby',
  // Compiled languages.
  go: 'go', rs: 'rust', java: 'java',
  c: 'c', h: 'c',
  cc: 'cpp', cpp: 'cpp', cxx: 'cpp', hpp: 'cpp', hh: 'cpp',
  cs: 'csharp', kt: 'kotlin', kts: 'kotlin', swift: 'swift', php: 'php',
  lua: 'lua',
  // Config / markup / styles.
  yaml: 'yaml', yml: 'yaml', toml: 'toml',
  html: 'html', htm: 'html', xml: 'html', xhtml: 'html',
  css: 'css', scss: 'css', less: 'css',
  sql: 'sql',
}

/**
 * Derive a syntax-highlighting language hint from a path's file extension.
 * Pure and case-insensitive on the extension; a dotfile with no extension
 * ('.gitignore') and an unknown extension both yield undefined (plain
 * monospace in the diff - never an error).
 * @param path - the model-facing path of the changed file.
 * @returns the language hint, or undefined when the extension maps to none.
 */
export function langFromPath(path: string): string | undefined {
  const base = path.slice(Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1)
  const dot = base.lastIndexOf('.')
  // A leading dot is a dotfile (no extension), not an empty extension.
  if (dot <= 0) return undefined
  const ext = base.slice(dot + 1).toLowerCase()
  // Own-property check only: a filename whose extension is an Object.prototype
  // key ('foo.constructor', 'foo.__proto__') must map to no language.
  return Object.hasOwn(LANG_BY_EXTENSION, ext) ? LANG_BY_EXTENSION[ext] : undefined
}
